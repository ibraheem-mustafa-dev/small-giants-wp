// Review fixes on the write-once host rule (lib/fill-ancestor.mjs::tryHost, ::sameAsk), the checks a no-setting row records
// (lib/fill-resolve-element.mjs::checksRan) and the DB slot tie-break (lib/resolve.mjs::ownElementSetting). Run against the
// real framework DB for the host cases and a counting stub for the statement cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { sameAsk } from '../lib/fill-ancestor.mjs';
import { checksRan } from '../lib/fill-resolve-element.mjs';
import { ownElementSetting } from '../lib/resolve.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const ALL = [ 375, 768, 1024, 1440, 1920 ];
const INPUT = '.sgs-form-field__input';
const HOMES = [ 2, 3 ].map( ( n ) => `.sgs-form__inner > .sgs-form-field:nth-of-type(${ n }) > ${ INPUT }` );
const paint = ( styles ) => Object.fromEntries( THREE.map( ( w ) => [ w, { display: 'block', ...styles } ] ) );
const at = ( slots, property ) => ( { slot: slots[ 0 ], slots, property, state: null, forms: [ 'hex', 'slug' ], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const HOST = { block: 'sgs/form', elements: { '': paint( {} ), ...Object.fromEntries( HOMES.map( ( h ) => [ h, paint( { 'background-color': 'rgb(255, 255, 255)', 'min-height': '0px' } ) ] ) ) }, settings: { fieldBackground: at( HOMES, 'background-color' ), fieldMinHeight: at( HOMES, 'min-height' ) }, discovered: {} };
const FIELD = { block: 'sgs/form-field-text', elements: { '': paint( {} ), [ INPUT ]: paint( { 'background-color': 'rgba(0, 0, 0, 0)' } ) }, settings: {}, discovered: {} };
const GREY = 'rgb(240, 240, 240)';
const snap = ( styles ) => ( { styles: { display: 'block', ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null } );

// A form of fields; `looks[ i ]` is { width: styles } for field i (a width left out paints nothing there).
function run( looks, partWide ) {
	const skeleton = [ { name: 'sgs/form', draftRef: 'form', attributes: {}, innerBlocks: looks.map( ( _, i ) => ( { name: 'sgs/form-field-text', draftRef: `input${ i }`, draftSlots: { [ INPUT ]: `input${ i }` }, attributes: {} } ) ) } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fm' );
	const widths = Object.fromEntries( ALL.map( ( w ) => [ w, {
		'0:': snap( {} ),
		...Object.fromEntries( looks.flatMap( ( look, i ) => ( look[ w ] ? [ [ `${ i + 1 }:`, snap( look[ w ] ) ], [ `${ i + 1 }:${ INPUT }`, snap( look[ w ] ) ] ] : [] ) ) ),
	} ] ) );
	const reads = { widths, declared: Object.fromEntries( ALL.map( ( w ) => [ w, {} ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: ( b ) => ( 'sgs/form' === b ? HOST : FIELD ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1', partWide } );
	return { tree, out };
}
const everywhere = ( styles ) => Object.fromEntries( ALL.map( ( w ) => [ w, styles ] ) );
const rowsOf = ( out, prop ) => out.unmapped.filter( ( u ) => 'sgs/form-field-text' === u.block && prop === u.property );

test( 'MUST FAIL: a reached path the hop reports that is not a measured instance refuses the row and never aborts the run', () => {
	const hop = ( input, ctx ) => {
		assert.equal( ctx.loopBody( { paths: [ 'not-a-generated-path' ], prop: input.prop } ), null, 'the check refuses an unknown path' );
		return null;
	};
	const { tree, out } = run( [ everywhere( { 'background-color': GREY } ), everywhere( { 'background-color': GREY } ) ], { hop } );
	assert.equal( tree[ 0 ].attributes.fieldBackground, undefined );
	const rows = rowsOf( out, 'background-color' );
	assert.ok( rows.length > 0 );
	assert.ok( rows.every( ( r ) => r.checks.includes( 'ancestor' ) && /not a measured instance/.test( r.reason ) ), JSON.stringify( rows[ 0 ] ) );
} );

test( 'MUST FAIL: instances that ask at different widths are not the same ask, so no host write averages them', () => {
	const { tree, out } = run( [ { 375: { 'background-color': GREY } }, { 1440: { 'background-color': GREY } } ] );
	assert.equal( tree[ 0 ].attributes.fieldBackground, undefined, 'one instance asks only at 375 and the other only at 1440' );
	assert.ok( rowsOf( out, 'background-color' ).length > 0 );
} );

test( 'sameAsk: the same widths and the same values only', () => {
	assert.equal( sameAsk( 'background-color', { 375: GREY }, { 1440: GREY } ), false );
	assert.equal( sameAsk( 'background-color', {}, {} ), true );
	assert.equal( sameAsk( 'background-color', { 375: GREY, 1440: GREY }, { 375: GREY, 1440: GREY } ), true );
	assert.equal( sameAsk( 'background-color', { 375: GREY }, { 375: GREY, 1440: GREY } ), false );
	assert.equal( sameAsk( 'background-color', { 375: GREY }, { 375: 'rgb(1, 2, 3)' } ), false );
} );

test( 'MUST FAIL: a painted-layer row records what ran and why the calibrated-slots and ancestor checks did not', () => {
	const ran = checksRan( { layer: true, alternates: [], res: {}, eq: null } );
	assert.deepEqual( ran.checks, [ 'own-slot' ] );
	assert.ok( ran.unchecked.includes( 'ancestor' ) );
	assert.match( ran.skipped[ 'calibrated-slots' ], /layer/ );
	assert.match( ran.skipped.ancestor, /layer/ );
	const plain = checksRan( { layer: false, alternates: [], res: {}, eq: null } );
	assert.ok( plain.checks.includes( 'calibrated-slots' ) );
	assert.equal( plain.skipped, undefined );
} );

test( 'MUST FAIL: a size row the part-wide pass leaves for the dimension pass records why the ancestor check did not run', () => {
	const { out } = run( [ everywhere( { 'min-height': '52px' } ) ] );
	const rows = rowsOf( out, 'min-height' );
	assert.ok( rows.length > 0 );
	assert.ok( rows.every( ( r ) => r.unchecked.includes( 'ancestor' ) && /ancestor: not asked.*dimension pass/.test( r.reason ) && /dimension pass/.test( r.skipped?.ancestor ) ), JSON.stringify( rows[ 0 ] ) );
} );

test( 'MUST FAIL: a row the element already renders (lib/fill-held.mjs) records why the hop did not ask the enclosing blocks', () => {
	const { out } = run( [ everywhere( { 'font-style': 'italic' } ) ] );
	const rows = out.alreadyHeld.filter( ( r ) => 'sgs/form-field-text' === r.block && 'font-style' === r.property );
	assert.ok( rows.length > 0, 'a leaf that prints no text holds a font-style row' );
	assert.ok( rows.every( ( r ) => /ancestor: not asked: the element already renders/.test( r.reason ) && /already renders/.test( r.skipped?.ancestor ) ), JSON.stringify( rows[ 0 ] ) );
} );

test( 'MUST FAIL: the DB slot tie-break prepares its statements once per database, and no database means no tie-break', () => {
	let prepared = 0;
	const stub = { prepare: ( sql ) => {
		prepared++;
		return /PRAGMA/.test( sql ) ? { all: () => [ { name: 'canonical_slot' } ] } : { get: ( block, attr ) => ( 'part' === attr ? { canonical_slot: '.x' } : { canonical_slot: null } ) };
	} };
	const tied = [ { attr_name: 'part', css_element: '' }, { attr_name: 'own', css_element: 'wrapper' } ];
	for ( let i = 0; i < 5; i++ ) {
		assert.deepEqual( ownElementSetting( stub, 'b', tied ), [ tied[ 1 ] ] );
	}
	assert.ok( prepared <= 2, `${ prepared } statements prepared for 5 resolves` );
	assert.deepEqual( ownElementSetting( undefined, 'b', tied ), tied );
	assert.deepEqual( ownElementSetting( null, 'b', tied ), tied );
} );
