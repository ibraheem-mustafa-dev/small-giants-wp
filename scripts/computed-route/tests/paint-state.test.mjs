// A block's paint states (calibration-fixtures.json `paintStates`, lib/paint-state.mjs): a node that renders in another
// way than the block's default instance is judged against that way's default paint. The Indus rings are empty Floating
// layers, inert as drawn (pointer-events none, the stylesheet's rule for a layer holding no blocks), while the default
// instance holds blocks and takes pointer events; judged against it, every ring's pointer-events row read as a missing
// setting though the page already matched. Calibration measures each state once (lib/calibrate-instances.mjs), keeps it
// out of the merged default paint, and keys the paint file on it (calibrate.mjs::paintKeyOf).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { matchesPaintState, calibrationForNode } from '../lib/paint-state.mjs';
import { planInstances, buildTree } from '../lib/calibrate.mjs';
import { paintKeyOf, statePaint, missingPaintStates } from '../calibrate.mjs';
import { withInnerRootAliases } from '../solve.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const BLOCK = 'sgs/decorative-image';
const BASE = { display: 'block', position: 'absolute', 'pointer-events': 'auto' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const EMPTY_WHEN = { inner: false, lacks: [ 'decorMedia', 'imageUrl' ] };
const cal = ( withStates ) => ( {
	block: BLOCK,
	elements: { '': tiers( BASE ) },
	settings: {},
	discovered: {},
	...( withStates ? { paintStates: { empty: { when: EMPTY_WHEN, elements: { '': tiers( { ...BASE, 'pointer-events': 'none' } ) } } } } : {} ),
} );

function pointerRows( withStates, inner = [] ) {
	const skeleton = [ { name: BLOCK, draftRef: '.ring', attributes: {}, innerBlocks: inner } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'ps' );
	const styles = { display: 'block', position: 'absolute', 'pointer-events': 'none' };
	const snap = { styles, pseudo: {}, rect: { x: 0, y: 0, w: 340, h: 340 }, inFlow: false, words: '', href: null };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': snap } ] ) );
	const declared = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { 'pointer-events': 'none' } } ] ) );
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( b === BLOCK ? cal( withStates ) : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return out.unmapped.filter( ( u ) => 'pointer-events' === u.property );
}

test( 'MUST FAIL: an empty layer drawn inert is judged against the empty paint state, so no pointer-events row is raised', () => {
	assert.deepEqual( pointerRows( true ), [] );
	assert.equal( pointerRows( false ).length, 1, 'control: judged against the default instance, the same row is raised' );
} );

test( 'a layer holding blocks is not the empty state, so it is judged against the default paint', () => {
	const inner = [ { name: 'sgs/text', attributes: { text: 'x' } } ];
	assert.equal( pointerRows( true, inner ).length, 1 );
} );

test( 'a paint state matches on inner blocks and on attributes set or unset', () => {
	assert.equal( matchesPaintState( EMPTY_WHEN, { attributes: {}, innerBlocks: [] } ), true );
	assert.equal( matchesPaintState( EMPTY_WHEN, { attributes: { decorMedia: { url: 'a.jpg' } }, innerBlocks: [] } ), false );
	assert.equal( matchesPaintState( EMPTY_WHEN, { attributes: { decorMedia: null, imageUrl: '' }, innerBlocks: [] } ), true, 'null and empty are unset' );
	assert.equal( matchesPaintState( EMPTY_WHEN, { attributes: {}, innerBlocks: [ {} ] } ), false );
	const image = { inner: false, has: [ 'decorMedia', 'imageUrl' ] };
	assert.equal( matchesPaintState( image, { attributes: { imageUrl: 'a.jpg' }, innerBlocks: [] } ), true );
	assert.equal( matchesPaintState( image, { attributes: {}, innerBlocks: [] } ), false );
	assert.equal( matchesPaintState( {}, { attributes: {} } ), true, 'an empty condition matches every node' );
} );

test( 'the node view lays the state over the default paint once, and a node no state matches keeps the calibration', () => {
	const c = cal( true );
	const empty = calibrationForNode( c, { attributes: {}, innerBlocks: [] } );
	assert.equal( empty.elements[ '' ][ 1440 ][ 'pointer-events' ], 'none' );
	assert.equal( empty.paintState, 'empty' );
	assert.equal( calibrationForNode( c, { attributes: {}, innerBlocks: [] } ), empty, 'one view per state' );
	assert.equal( calibrationForNode( c, { attributes: {}, innerBlocks: [ {} ] } ), c );
	assert.equal( calibrationForNode( cal( false ), { attributes: {}, innerBlocks: [] } ).paintState, undefined );
	assert.equal( calibrationForNode( null, {} ), null );
} );

test( 'calibration plans one paint-only instance per state, with its own attributes and inner blocks', () => {
	const fixture = {
		attributes: { decorMedia: { url: 'a.jpg' } },
		inner: [ { name: 'sgs/text', attributes: { text: 'x' } } ],
		paintStates: [ { name: 'empty', when: EMPTY_WHEN, attributes: { decorMedia: null, height: { desktop: '120px' } }, inner: [] } ],
	};
	const { instances } = planInstances( BLOCK, { rows: [], schema: {}, snapshot: {}, fixture } );
	const ps = instances.filter( ( i ) => i.paintState );
	assert.deepEqual( ps.map( ( i ) => [ i.key, i.attrs, i.inner, i.paintState ] ), [ [ 'paint-empty', { height: { desktop: '120px' } }, [], { name: 'empty', when: EMPTY_WHEN } ] ] );
	assert.ok( ! ps[ 0 ].isDefault && ! ps[ 0 ].row, 'kept out of the merged default paint and never read as a setting' );
	const tree = buildTree( BLOCK, fixture, ps );
	assert.deepEqual( tree[ 0 ].innerBlocks.at( -1 ).innerBlocks, [], 'the state builds with its own (empty) inner blocks' );
	const def = buildTree( BLOCK, fixture, instances.filter( ( i ) => i.isDefault ) );
	assert.equal( def[ 0 ].innerBlocks.at( -1 ).innerBlocks.length, 1, 'control: the default instance keeps the fixture inner blocks' );
} );

test( 'the paint key changes with a block\'s paint states and is unchanged for a block without them', () => {
	assert.equal( paintKeyOf( 'a', 'b', {} ), 'a-b' );
	assert.equal( paintKeyOf( 'a', 'b', null ), 'a-b' );
	const one = paintKeyOf( 'a', 'b', { paintStates: [ { name: 'empty' } ] } );
	assert.match( one, /^a-b-[0-9a-f]{8}$/ );
	assert.notEqual( one, paintKeyOf( 'a', 'b', { paintStates: [ { name: 'image' } ] } ) );
} );

test( 'MUST FAIL: a state that keeps only its render-shape properties leaves the default\'s other properties in place', () => {
	const base = { block: BLOCK, elements: { '': { 1440: { 'pointer-events': 'auto', 'border-top-width': '0px', width: '200px' } } }, settings: {}, discovered: {},
		paintStates: { empty: { when: EMPTY_WHEN, elements: { '': { 1440: { 'pointer-events': 'none' } } } } } };
	const view = calibrationForNode( base, { attributes: {}, innerBlocks: [] } );
	assert.deepEqual( view.elements[ '' ][ 1440 ], { 'pointer-events': 'none', 'border-top-width': '0px', width: '200px' }, 'merged property by property, not replaced whole' );
} );

test( 'MUST FAIL: a state naming its properties keeps only those, so the border and size it was drawn with never read as resting paint', () => {
	const read = { '': { 1440: { 'pointer-events': 'none', 'user-select': 'none', 'border-top-width': '2px', width: '120px', _tag: 'span' } } };
	assert.deepEqual( statePaint( read, [ 'pointer-events', 'user-select' ] ), { '': { 1440: { 'pointer-events': 'none', 'user-select': 'none' } } } );
	assert.equal( statePaint( read, undefined ), read, 'a state with no props keeps its whole paint (the image-only layer, drawn with no extra settings)' );
	const fixture = { attributes: {}, inner: [], paintStates: [ { name: 'empty', when: EMPTY_WHEN, props: [ 'pointer-events' ], attributes: {}, inner: [] } ] };
	const ps = planInstances( BLOCK, { rows: [], schema: {}, snapshot: {}, fixture } ).instances.find( ( i ) => i.paintState );
	assert.deepEqual( ps.paintState.props, [ 'pointer-events' ], 'the planned instance carries the props' );
} );

test( 'MUST FAIL: a declared state the run did not measure is named, so its paint is not written under a key that claims it', () => {
	const fixture = { paintStates: [ { name: 'empty' }, { name: 'image' } ] };
	assert.deepEqual( missingPaintStates( fixture, { image: {} } ), [ 'empty' ] );
	assert.deepEqual( missingPaintStates( fixture, { empty: {}, image: {} } ), [] );
	assert.deepEqual( missingPaintStates( {}, {} ), [], 'a block with no states misses none' );
} );

test( 'the solver\'s inner-root aliases reach a paint state\'s elements', () => {
	const cal = { elements: { '.sgs-thing': { 1440: { 'pointer-events': 'auto' } } }, settings: {}, paintStates: { empty: { when: {}, elements: { '.sgs-thing': { 1440: { 'pointer-events': 'none' } } } } } };
	const out = withInnerRootAliases( cal, 'sgs/thing' );
	assert.deepEqual( out.paintStates.empty.elements[ '' ], { 1440: { 'pointer-events': 'none' } } );
	assert.deepEqual( out.elements[ '' ], { 1440: { 'pointer-events': 'auto' } } );
} );
