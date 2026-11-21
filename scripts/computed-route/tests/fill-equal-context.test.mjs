// A calibrated default stands as a node's baseline only in the context calibration measured it in (mechanism A of the
// 2026-11-20 fault census; lib/fill-resolve-state.mjs::contextBaseline, lib/equal-context.mjs::contextDiffs). Before this a
// draft value equal to the default was settled `equal` wherever the node sat, so a node holding a setting that paints the
// property otherwise, a node in a block's flow measured as a flex item, or an out-of-flow node measured in flow kept a value
// the draft does not have.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { recordDisplay } from '../lib/fill-resolve-state.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const PAINT = { _parentDisplay: 'block', _position: 'static', display: 'block', opacity: '1', top: 'auto', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const calFor = ( paint = {}, discovered = {} ) => ( {
	block: 'sgs/container',
	elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...PAINT, ...paint } ] ) ) },
	settings: {},
	discovered,
} );

// A parent block measured in a block's flow (its own calibration) holding one child container; `child` is the child's read styles, `position` its read position, and
// `attrs` the child's settings, `declared` the child's declared values (an inset is a used value read only where declared).
function run( { cal = calFor(), child = {}, position = 'static', attrs = {}, declared = {}, parent = {} } = {} ) {
	const skeleton = [ { name: 'sgs/text', draftRef: '.a', attributes: {}, innerBlocks: [ { name: 'sgs/container', draftRef: '.b', attributes: { ...attrs } } ] } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const read = ( st, pos = 'static' ) => ( { styles: { ...PAINT, ...st }, position: pos, layoutDisplay: st.display || 'block', pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': read( parent ), '1:': read( child, position ) } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '1:': declared } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( block ) => ( 'sgs/text' === block ? { ...calFor(), block } : cal ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const childRow = ( out, property ) => out.settled.find( ( r ) => 'equal' === r.reason && r.property === property && r.node.endsWith( '-1' ) );
// The child's property is no longer settled equal: it is written, or a row says no setting holds it.
const asked = ( out, property ) => out.writes.some( ( w ) => w.node.endsWith( '-1' ) && w.prop === property ) || out.unmapped.some( ( u ) => u.node.endsWith( '-1' ) && u.property === property );

const TAG = { tagName: { display: { slots: [ '' ], values: { span: { 375: 'inline', 768: 'inline', 1440: 'inline' } } } } };

test( 'MUST FAIL before the fix: a held setting calibration read painting the property otherwise is the baseline, not the default', () => {
	// The child holds tagName span, which calibration read painting display inline; the draft's block equals the default only.
	const out = run( { cal: calFor( {}, TAG ), attrs: { tagName: 'span' } } );
	assert.equal( childRow( out, 'display' ), undefined, 'display block is not equal to what a span shows' );
	assert.ok( asked( out, 'display' ) );
	// The draft's inline equals what the held setting paints: equal, named after it.
	const inline = run( { cal: calFor( {}, TAG ), attrs: { tagName: 'span' }, child: { display: 'inline' } } );
	assert.equal( childRow( inline, 'display' )?.baseline, 'held-setting' );
} );

test( 'a held setting calibration never read, or the block default, leaves the calibrated default standing (negative controls)', () => {
	assert.equal( childRow( run( { cal: calFor( {}, TAG ), attrs: { tagName: 'section' } } ), 'display' )?.baseline, 'calibrated-default' );
	assert.equal( childRow( run( { cal: calFor( {}, TAG ) } ), 'display' )?.baseline, 'calibrated-default' );
	// Another property the setting does not paint is untouched.
	assert.equal( childRow( run( { cal: calFor( {}, TAG ), attrs: { tagName: 'span' } } ), 'opacity' )?.baseline, 'calibrated-default' );
} );

test( 'a slot the node reads no element at (an alternate slot calibration found the layout on) keeps the calibrated default', () => {
	const cal = calFor( {}, { layout: { display: { slots: [ '.sgs-container__inner' ], values: {} } } } );
	cal.elements[ '.sgs-container__inner' ] = Object.fromEntries( THREE.map( ( w ) => [ w, { ...PAINT, display: 'flex' } ] ) );
	const row = childRow( run( { cal, child: { display: 'flex' } } ), 'display' );
	assert.equal( row?.baseline, 'calibrated-default' );
} );

test( 'MUST FAIL before the fix: a display measured blockified as a flex item is no baseline for a node in a block\'s flow', () => {
	// The block declares an inline-level flex box: measured as a flex item it reads flex, which a node in a block's flow does not
	// show, so the draft's flex is asked again.
	const out = run( { cal: calFor( { _parentDisplay: 'flex', display: 'flex' } ), child: { display: 'flex' } } );
	assert.equal( childRow( out, 'display' ), undefined );
	assert.ok( asked( out, 'display' ) );
	// Negative control: measured in a block's flow, as the node sits, the default stands.
	assert.equal( childRow( run( { cal: calFor( { display: 'flex' } ), child: { display: 'flex' } } ), 'display' )?.baseline, 'calibrated-default' );
	// The parent's context is the display the clone shows: a flex display its block cannot hold leaves it in a block's flow.
	assert.ok( asked( run( { cal: calFor( { _parentDisplay: 'flex', display: 'flex' } ), child: { display: 'flex' }, parent: { display: 'flex' } } ), 'display' ) );
	// The initial display measured blockified (lib/fill-prop.mjs::inOwnContext's case) gets the same answer.
	assert.ok( asked( run( { cal: calFor( { _parentDisplay: 'flex' } ) } ), 'display' ) );
} );

test( 'MUST FAIL before the fix: an inset measured in flow is no baseline for an out-of-flow node', () => {
	const cal = calFor( { _position: 'relative', top: '0px' } );
	const out = run( { cal, child: { top: '0px' }, position: 'absolute', declared: { top: '0px' } } );
	assert.equal( childRow( out, 'top' ), undefined );
	assert.ok( asked( out, 'top' ) );
	// Negative control: the node in flow too.
	assert.equal( childRow( run( { cal, child: { top: '0px' }, position: 'relative', declared: { top: '0px' } } ), 'top' )?.baseline, 'calibrated-default' );
} );

test( 'recordDisplay keeps the display the clone shows: what the caller names, else the default paint of the block', () => {
	const st = {};
	const rec = { index: 3 };
	const cal = calFor();
	recordDisplay( st, rec, cal, '', { 375: 'flex', 1440: 'flex' }, ( w ) => ( 1440 === w ? 'block' : undefined ) );
	// Judged equal to a default of block at 1440 (an equivalent spelling of the draft's flex): the clone shows block; at 375
	// nothing is named, so the default paint.
	assert.deepEqual( st.cloneDisplay.get( '3|' ), { 375: 'block', 1440: 'block' } );
	recordDisplay( st, rec, cal, '', { 768: 'grid' }, ( w ) => ( 768 === w ? 'grid' : undefined ) );
	assert.deepEqual( st.cloneDisplay.get( '3|' ), { 768: 'grid' } );
	recordDisplay( st, rec, cal, '', { 768: 'grid' } );
	assert.deepEqual( st.cloneDisplay.get( '3|' ), { 768: 'block' }, 'a display no setting holds: the default paint' );
} );
