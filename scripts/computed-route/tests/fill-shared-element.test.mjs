// A block that reads the draft element its parent reads (lib/fill-shared-element.mjs): the box look (background, border, padding,
// clip-path, shadow) is drawn once, by the parent; the child keeps its own text settings. Real case, Mama's Home 2026-11-20: the
// hero's "baked with love" tag is a decorative layer holding an sgs/text, both reading draft element Root/41#0, so both got the
// background, border, padding and notch (two nested tags, padding doubled, words wrapping). Each case has a negative control.
// Run: node tools/run-tests.mjs tests/fill-shared-element.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { BOX_LOOK, parentDrawsBox } from '../lib/fill-shared-element.mjs';
import { SETTLED } from '../lib/fill-report.mjs';

const db = openDb();
const WIDTHS = [ 375, 768, 1440 ];
const PLAIN = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'padding-top': '0px', 'padding-left': '0px', 'border-top-width': '0px', 'background-color': 'rgba(0, 0, 0, 0)', 'clip-path': 'none', opacity: '1' };
const DRAWN = { ...PLAIN, 'padding-top': '8px', 'padding-left': '14px', 'border-top-width': '2px', 'background-color': 'rgb(238, 128, 136)', 'clip-path': 'polygon(0px 0px, 100% 0px, 88% 50%, 100% 100%, 0px 100%)', 'font-size': '24px', opacity: '0.5' };
const cal = ( block ) => ( { block, elements: { '': Object.fromEntries( WIDTHS.map( ( w ) => [ w, { ...PLAIN } ] ) ), '::before': Object.fromEntries( WIDTHS.map( ( w ) => [ w, { 'background-color': 'rgba(0, 0, 0, 0)', content: 'none' } ] ) ) }, settings: {}, discovered: {}, link: {}, text: {}, presence: {} } );
const snap = ( styles ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w: 160, h: 40 }, inFlow: true, words: '', href: null } );

// A parent holding one child; `childRef` is the draft element the child reads (the parent reads '.tag').
function run( childRef, pseudo = {} ) {
	const skeleton = [ { name: 'sgs/container', draftRef: '.tag', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: childRef, attributes: { text: 'x' } } ] } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'home' );
	const target = ( i ) => nodes[ i ].targets.find( ( t ) => '' === t.slot );
	const widths = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ target( 0 ).id ]: snap( DRAWN ), [ target( 1 ).id ]: { ...snap( DRAWN ), pseudo } } ] ) );
	const reads = { widths, declared: Object.fromEntries( WIDTHS.map( ( w ) => [ w, {} ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: ( b ) => cal( b ), fixtures: null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	const childRows = ( rows, key = 'property' ) => rows.filter( ( r ) => 'sgs/text' === r.block && BOX_LOOK.test( String( r[ key ] ) ) );
	return { out, childUnmapped: childRows( out.unmapped ), childSettled: childRows( out.settled || [] ), childWrites: childRows( out.writes, 'prop' ), parentUnmapped: out.unmapped.filter( ( r ) => 'sgs/container' === r.block && BOX_LOOK.test( String( r.property ) ) ) };
}

test( 'BOX_LOOK names the box look and not the text look', () => {
	for ( const p of [ 'background-color', 'background-image', 'border-top-width', 'border-top-left-radius', 'border-radius', 'padding-left', 'clip-path', 'box-shadow', 'border-bottom-color' ] ) {
		assert.ok( BOX_LOOK.test( p ), p );
	}
	for ( const p of [ 'font-size', 'color', 'line-height', 'width', 'margin-top', 'gap', 'text-align', 'border-collapse', 'padding-box' ] ) {
		assert.equal( BOX_LOOK.test( p ), false, p );
	}
	assert.ok( SETTLED.includes( 'parent-held' ), 'the report knows the reason' );
} );

test( 'MUST FAIL WITHOUT THE RULE: a child reading its parent\'s element leaves the box look to the parent and is settled parent-held', () => {
	const r = run( '.tag' );
	assert.deepEqual( r.childUnmapped.map( ( u ) => u.property ), [], `the child reports no box property: ${ JSON.stringify( r.childUnmapped.map( ( u ) => u.property ) ) }` );
	assert.deepEqual( r.childWrites, [] );
	assert.ok( r.childSettled.length > 0 && r.childSettled.every( ( s ) => 'parent-held' === s.reason ), JSON.stringify( r.childSettled ) );
	assert.ok( r.childSettled.some( ( s ) => 'padding-top' === s.property ) );
	assert.ok( r.parentUnmapped.length > 0, 'the parent still holds the rows (this calibration has no setting for them)' );
} );

test( 'the child keeps its other settings: opacity is judged on the child as before', () => {
	const { out } = run( '.tag' );
	const own = [ ...out.unmapped, ...( out.settled || [] ), ...out.writes ].filter( ( r ) => 'sgs/text' === r.block && 'opacity' === ( r.property ?? r.prop ) );
	assert.ok( own.length > 0 && own.every( ( r ) => 'parent-held' !== r.reason ), JSON.stringify( own ) );
} );

test( 'negative control: a child reading a different element than its parent keeps its box look', () => {
	const r = run( '.other' );
	assert.equal( r.childSettled.some( ( s ) => 'parent-held' === s.reason ), false );
	assert.ok( r.childUnmapped.some( ( u ) => 'padding-top' === u.property ), JSON.stringify( r.childUnmapped.map( ( u ) => u.property ) ) );
} );

// A fake Fill state: node 0 is the parent, node 1 the child; `reads` holds the parent's snapshot unless `unread`.
const state = ( { parentFinder = '.tag', unread = false, calibrated = true } = {} ) => ( {
	nodes: [ { name: 'sgs/container', parent: null, targets: [ { id: '0:', slot: '', finder: parentFinder } ] }, { name: 'sgs/text', parent: 0, targets: [] } ],
	reads: { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, unread ? {} : { '0:': snap( DRAWN ) } ] ) ) },
	calFor: () => ( calibrated ? {} : null ),
} );
const child = ( st, slot = '', finder = '.tag' ) => ( { rec: { ...st.nodes[ 1 ], parent: 0 }, target: { id: '1:', slot, finder } } );

test( 'parentDrawsBox: true only for the root element of a node whose parent root reads the same element and was read', () => {
	const st = state();
	assert.equal( parentDrawsBox( st, child( st ).rec, child( st ).target ), true );
	assert.equal( parentDrawsBox( st, child( st, '.sgs-text__inner' ).rec, child( st, '.sgs-text__inner' ).target ), false, 'a part of the child is not the shared element' );
	assert.equal( parentDrawsBox( st, child( st, '', '.other' ).rec, child( st, '', '.other' ).target ), false, 'a different element' );
	assert.equal( parentDrawsBox( st, { ...st.nodes[ 0 ] }, { id: '0:', slot: '', finder: '.tag' } ), false, 'a node with no parent' );
	const unread = state( { unread: true } );
	assert.equal( parentDrawsBox( unread, child( unread ).rec, child( unread ).target ), false, 'a parent whose element was never read cannot draw the box' );
	const uncal = state( { calibrated: false } );
	assert.equal( parentDrawsBox( uncal, child( uncal ).rec, child( uncal ).target ), false, 'an uncalibrated parent cannot draw the box' );
	const objects = state( { parentFinder: { tpl: 'Root/41#0' } } );
	assert.equal( parentDrawsBox( objects, child( objects, '', { tpl: 'Root/41#0' } ).rec, child( objects, '', { tpl: 'Root/41#0' } ).target ), true, 'finder objects compare by value' );
} );

test( 'the shared element is the box itself: a painted layer (::before) of the child is judged as before', () => {
	const { out } = run( '.tag', { '::before': { content: '"x"', 'background-color': 'rgb(1, 2, 3)' } } );
	const rows = [ ...out.unmapped, ...( out.settled || [] ), ...out.writes ].filter( ( r ) => 'sgs/text' === r.block && '::before' === r.slot );
	assert.ok( rows.length > 0, 'the layer is read' );
	assert.equal( rows.some( ( r ) => 'parent-held' === r.reason ), false, JSON.stringify( rows.map( ( r ) => [ r.property ?? r.prop, r.reason ] ) ) );
} );
