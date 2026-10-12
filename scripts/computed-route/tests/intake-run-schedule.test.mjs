// Spec 48 FR-48-17 / FR-48-28, lib/intake-run-stages.mjs::STAGE_NEEDS and lib/intake-run-worker.mjs: stages run side by
// side start only after the earlier stages whose context fields they read. The detector reads each stage's source (and
// the inventory stage's inventoryStage, which receives the context) for `ctx.<field>` reads and writes, maps each read
// field to the stage that writes it (the worker writes `routing` for the routing stage; `blocked` and `gaps` are the
// worker's own, gathered as stages are applied, so reading them needs '*'), and requires that stage in the reader's
// needs. A planted stage that reads the census without needing it is caught (MUST FAIL).
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, STAGE_NEEDS, SLOT_STAGES } from '../lib/intake-run-stages.mjs';
import { inventoryStage } from '../lib/intake-inventory.mjs';

// The source a stage runs with the context: its own function, plus inventoryStage when it hands the context on.
const sourceOf = ( fn ) => {
	const own = String( fn );
	return /\binventoryStage\s*\(\s*job\s*,\s*ctx\s*\)/.test( own ) ? `${ own }\n${ String( inventoryStage ) }` : own;
};
const WORKER_FIELDS = new Set( [ 'blocked', 'gaps' ] );

// Problems with `needs` for `stages` ([ [ name, fn ] ]): an unknown or later stage named, or a context field read whose
// writer stage is not needed.
function needsProblems( stages, needs ) {
	const problems = [];
	const names = stages.map( ( [ n ] ) => n );
	const writer = new Map( [ [ 'routing', 'routing' ] ] );
	for ( const [ name, fn ] of stages ) {
		for ( const m of sourceOf( fn ).matchAll( /\bctx\.([A-Za-z_]\w*)\s*=(?!=)/g ) ) {
			if ( writer.has( m[ 1 ] ) && writer.get( m[ 1 ] ) !== name ) {
				problems.push( `${ m[ 1 ] } is written by ${ writer.get( m[ 1 ] ) } and ${ name }` );
			}
			writer.set( m[ 1 ], name );
		}
	}
	for ( const [ i, [ name, fn ] ] of stages.entries() ) {
		const want = needs[ name ];
		if ( ! want ) {
			problems.push( `${ name }: no STAGE_NEEDS entry` );
			continue;
		}
		want.filter( ( n ) => '*' !== n && names.indexOf( n ) < 0 ).forEach( ( n ) => problems.push( `${ name }: needs unknown stage ${ n }` ) );
		want.filter( ( n ) => names.indexOf( n ) >= i ).forEach( ( n ) => problems.push( `${ name }: needs ${ n }, which is not earlier` ) );
		if ( want.includes( '*' ) ) {
			continue;
		}
		const reads = new Set( [ ...sourceOf( fn ).matchAll( /\bctx\.([A-Za-z_]\w*)\b(?!\s*=(?!=))/g ) ].map( ( m ) => m[ 1 ] ) );
		for ( const f of reads ) {
			if ( WORKER_FIELDS.has( f ) ) {
				problems.push( `${ name }: reads ctx.${ f }, which the worker gathers as stages are applied, so it needs '*'` );
				continue;
			}
			const w = writer.get( f );
			if ( ! w ) {
				problems.push( `${ name }: reads ctx.${ f }, which no stage writes` );
			} else if ( w !== name && ! want.includes( w ) ) {
				problems.push( `${ name }: reads ctx.${ f } (written by ${ w }) without needing ${ w }` );
			}
		}
	}
	return problems;
}

test( 'MUST FAIL: every stage needs the earlier stages whose context fields it reads, and only earlier stages', () => {
	assert.deepEqual( needsProblems( STAGES, STAGE_NEEDS ), [] );
	assert.deepEqual( Object.keys( STAGE_NEEDS ), STAGES.map( ( [ n ] ) => n ) );
	assert.ok( SLOT_STAGES.every( ( n ) => n in STAGE_NEEDS ) );
} );

test( 'MUST FAIL: a stage reading the census without needing it, a need on a later stage and a worker field are caught', () => {
	const planted = [ ...STAGES, [ 'planted', ( job, ctx ) => ctx.censusFull.rows.length + ctx.blocked.length ] ];
	const problems = needsProblems( planted, { ...STAGE_NEEDS, planted: [ 'replay' ] } );
	assert.ok( problems.some( ( p ) => /planted: reads ctx\.censusFull \(written by census\) without needing census/.test( p ) ), problems.join( '\n' ) );
	assert.ok( problems.some( ( p ) => /planted: reads ctx\.blocked/.test( p ) ) );
	assert.ok( needsProblems( STAGES, { ...STAGE_NEEDS, census: [ 'skeletons' ] } ).some( ( p ) => /census: needs skeletons, which is not earlier/.test( p ) ) );
	const noInventoryNeed = needsProblems( STAGES, { ...STAGE_NEEDS, inventory: [ 'routing', 'census' ] } );
	assert.ok( noInventoryNeed.some( ( p ) => /inventory: reads ctx\.notDefects \(written by draft defects\)/.test( p ) ), 'the inventory stage\'s inventoryStage reads were not followed' );
} );
