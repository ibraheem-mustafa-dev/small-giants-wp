// Spec 48 FR-48-86 done-when: every property of .claude/reports/2026-10-19-css-equivalence-audit.json with a setting or
// block-default verdict resolves through the equivalence engine. A setting row is planted as the setting the audit names
// with a measured (discovered) value; a block-default row as the block's measured default paint. Each is asked under the
// audit's own property name and, for a shorthand, under its first longhand (the value projected), so the spelling layer
// carries it to the home recorded under the shorthand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDb } from '../lib/db.mjs';
import { longhandsOf } from '../lib/css-families.mjs';
import { projectLonghand } from '../lib/css-equivalence/values.mjs';
import { consult } from '../lib/css-equivalence/index.mjs';

const db = openDb();
const audit = Object.values( JSON.parse( readFileSync( new URL( '../../../.claude/reports/2026-10-19-css-equivalence-audit.json', import.meta.url ), 'utf8' ) ) );
const { values } = JSON.parse( readFileSync( new URL( './fixtures/css-equivalence/audit-values.json', import.meta.url ), 'utf8' ) );
const rows = audit.filter( ( r ) => [ 'setting', 'block-default' ].includes( r.verdict ) );
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );

// The attribute the audit names as the property's home (`attributes.X`, or `DB: sgs/block X`), else a stand-in name.
const homeOf = ( row ) => {
	const where = row.sgs.map( ( s ) => s.where ).join( ' ' );
	return /attributes\.([A-Za-z]+)/.exec( where )?.[ 1 ] ?? /sgs\/[a-z-]+[ .]([a-z][A-Za-z]+)/.exec( where )?.[ 1 ] ?? 'auditHome';
};

test( 'the audit fixture gives a value for every setting and block-default property', () => {
	assert.equal( rows.length, 46 );
	assert.deepEqual( rows.map( ( r ) => r.property ).filter( ( p ) => ! values[ p ] ), [] );
} );

for ( const row of rows ) {
	const prop = row.property;
	const value = values[ prop ];
	const attr = homeOf( row );
	const longhand = longhandsOf( prop ).find( ( l ) => l !== prop );
	const projected = longhand ? projectLonghand( prop, value, longhand ) : undefined;
	const asks = [ [ prop, value ], ...( undefined !== projected ? [ [ longhand, projected ] ] : [] ) ];
	if ( 'setting' === row.verdict ) {
		test( `audit setting ${ prop } resolves to ${ attr } through its measured effect`, () => {
			// The default paint is measured at another value, so neither the default nor the initial-value rule decides it.
			const calibration = { elements: { '': every( { [ prop ]: 'unset-by-default' } ) }, settings: {}, discovered: { [ attr ]: { [ prop ]: { slots: [ '' ], values: { chosen: every( value ) } } } } };
			for ( const [ p, v ] of asks ) {
				const r = consult( { slot: '', prop: p, perWidth: every( v ) }, { calibration, db } );
				assert.equal( r.verdict, 'write', `${ p }: ${ v } was ${ r.verdict }: ${ r.detail }` );
				assert.deepEqual( r.writes, [ { attr, value: 'chosen', merge: 'replace' } ] );
			}
		} );
	} else {
		test( `audit block-default ${ prop } is held as the block's default paint`, () => {
			const calibration = { elements: { '': every( { [ prop ]: value } ) }, settings: {}, discovered: {} };
			for ( const [ p, v ] of asks ) {
				const r = consult( { slot: '', prop: p, perWidth: every( v ) }, { calibration, db } );
				assert.equal( r.verdict, 'held', `${ p }: ${ v } was ${ r.verdict }: ${ r.detail }` );
				assert.equal( r.reason, 'default' );
			}
		} );
	}
}
