// A draft element that carries a scroll-reveal mark gets the framework's token entrance on its block; an unmarked one gets
// none, and a block that already holds a root entrance keeps it (lib/fill-reveal-marks.mjs, FR-48-102).
import test from 'node:test';
import assert from 'node:assert/strict';
import { revealMarkWrites, isRevealed, REVEAL_PRESET } from '../lib/fill-reveal-marks.mjs';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';

const db = openDb();
const mdb = motionDb( db );
const schema = loadMotionSchema();

const inventory = { elements: [ { key: 'Root/10#0', data: { reveal: '1' } }, { key: 'Root/11#0', data: {} }, { key: 'Root/12#0', data: { 'screen-label': 'Home' } } ] };
function run( specs, inv = inventory ) {
	const flat = specs.map( ( s, i ) => ( { name: s.name, attributes: s.attributes || {}, innerBlocks: [], ref: `r${ i }` } ) );
	const nodes = specs.map( ( s, index ) => ( { index, name: s.name, parent: null, node: { draftRef: { tpl: s.tpl } }, children: [], targets: [] } ) );
	return { flat, ...revealMarkWrites( { nodes, flat, refOf: ( n ) => n.ref, inventory: inv, mdb, schema } ) };
}

test( 'the reveal mark names: data-reveal is one, a screen label and an empty data object are not', () => {
	assert.equal( isRevealed( { reveal: '1' } ), true );
	assert.equal( isRevealed( { 'screen-label': 'Home' } ), false );
	assert.equal( isRevealed( {} ), false );
	assert.equal( isRevealed( undefined ), false );
} );

test( 'MUST FAIL: a block whose draft element carries a reveal mark gets the scroll entrance from the token preset', () => {
	const r = run( [ { name: 'sgs/container', tpl: 'Root/10#0' } ] );
	const base = r.flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base;
	assert.equal( base.preset, REVEAL_PRESET );
	assert.equal( base.trigger, 'scroll' );
	assert.equal( base.values.duration, 'token:entrance.duration', 'the client\'s entrance tokens, not literals' );
	assert.equal( base.values.from.translateY, 'token:entrance.distance' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.node, w.attr, w.how ] ), [ [ 'r0', 'sgsMotion', 'reveal-mark' ] ] );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'negative: an unmarked block, one whose data holds another mark and one with no element key get no entrance', () => {
	const r = run( [ { name: 'sgs/container', tpl: 'Root/11#0' }, { name: 'sgs/container', tpl: 'Root/12#0' }, { name: 'sgs/container', tpl: null }, { name: 'sgs/container', tpl: 'Root/99#0' } ] );
	assert.deepEqual( r.flat.map( ( n ) => n.attributes.sgsMotion ), [ undefined, undefined, undefined, undefined ] );
	assert.deepEqual( r.writes, [] );
	assert.deepEqual( run( [ { name: 'sgs/container', tpl: 'Root/10#0' } ], null ).writes, [], 'no inventory, nothing written' );
} );

test( 'a marked block that already holds a root entrance keeps it, and one holding only a hover layer gains the entrance beside it', () => {
	const own = { v: 1, elements: { root: { entrance: { base: { trigger: 'load', values: { from: { opacity: 0 }, to: { opacity: 1 }, duration: 300 } } } } } };
	const kept = run( [ { name: 'sgs/container', tpl: 'Root/10#0', attributes: { sgsMotion: own } } ] );
	assert.deepEqual( kept.flat[ 0 ].attributes.sgsMotion, own );
	assert.equal( kept.writes.length, 0 );
	assert.match( kept.notes[ 0 ], /already holds a root entrance/ );
	const hover = { v: 1, elements: { root: { hover: { state: { trigger: 'hover', values: { translateY: -4, duration: 200 } } } } } };
	const both = run( [ { name: 'sgs/container', tpl: 'Root/10#0', attributes: { sgsMotion: hover } } ] );
	assert.deepEqual( both.flat[ 0 ].attributes.sgsMotion.elements.root.hover, hover.elements.root.hover );
	assert.equal( both.flat[ 0 ].attributes.sgsMotion.elements.root.entrance.base.preset, REVEAL_PRESET );
} );

test( 'a marked block with no motion target is reported, not written', () => {
	const r = run( [ { name: 'sgs/not-a-block', tpl: 'Root/10#0' } ] );
	assert.equal( r.writes.length, 0 );
	assert.match( r.unmapped[ 0 ].reason, /no motion target/ );
} );
