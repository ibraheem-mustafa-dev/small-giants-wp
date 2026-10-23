// Wires calibration's recorded values into their readers (Track R lane R12d):
// 1. A state setting's calibration entry stores its state look as values (lib/calibrate.mjs::slotFor, mergeSetting), and
//    lib/fill-state.mjs::defaultStateLook compares the draft's resting look against them, so a block's default hover
//    equal to the fixture's resting colour is still held.
// 2. lib/fill-held.mjs's inherited check prefers the block's own recorded paint, as Fill's baseline does: an element
//    whose own stylesheet sets the property is not held as inherited from its parent.
// 3. lib/fill-prop.mjs::notPainted treats a gap on a box that lays out no flex or grid items, or on a container rendering
//    fewer than two children, as painting nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { slotFor, mergeSetting } from '../lib/calibrate.mjs';
import { fillStates, defaultStateLook } from '../lib/fill-state.mjs';
import { notPainted, gapPaintsNothing } from '../lib/fill-prop.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const PRIMARY = 'rgb(10, 126, 168)';
const INK = 'rgb(30, 42, 60)';
const MARK = 'rgb(19, 87, 155)';
const at = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
const perWidth = ( els ) => Object.fromEntries( W.map( ( w ) => [ w, els ] ) );

test( 'MUST FAIL: a state setting\'s calibration entry stores its state look as values, folded across markers', () => {
	const rest = perWidth( { '': { color: PRIMARY, 'background-color': 'rgba(0, 0, 0, 0)' } } );
	const hover = perWidth( { '': { color: PRIMARY, 'background-color': MARK } } );
	const row = { attr_name: 'colourBackgroundHover', css_property: 'background-color', css_state: 'hover', tier_shape: 'scalar' };
	const s = slotFor( row, { expect: at( MARK ) }, rest, hover );
	assert.deepEqual( s.look, { '': { color: at( PRIMARY ) } }, 'the default hover colour equals the resting one, yet it is recorded' );
	assert.equal( slotFor( { ...row, css_state: null }, { expect: at( MARK ) }, rest, hover ).look, undefined, 'a resting setting records no state look' );
	const entry = mergeSetting( undefined, s, { state: 'hover' } );
	assert.deepEqual( entry.look, s.look );
	const second = mergeSetting( entry, { ...s, look: { '': { color: { 375: INK }, 'outline-color': { 375: INK } } } }, { state: 'hover' } );
	assert.deepEqual( second.look[ '' ].color, at( PRIMARY ), 'the earlier marker\'s value stands' );
	assert.deepEqual( second.look[ '' ][ 'outline-color' ], { 375: INK }, 'a property only the later reading holds is added' );
	const third = mergeSetting( second, { ...s, look: { '': { 'outline-color': { 768: MARK } } } }, { state: 'hover' } );
	assert.deepEqual( third.look[ '' ][ 'outline-color' ], { 375: INK, 768: MARK }, 'a width only the later reading holds is added' );
	assert.equal( 'look' in mergeSetting( undefined, { ...s, look: undefined } ), false );
} );

// A link block whose own hover turns its text primary, over a fixture whose text already rests primary: no reading
// changes the colour, so no effect names it; only the recorded look shows it.
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], property, state: null, forms: [ 'hex', 'slug' ], transform: null, reachedAt: W, effects: [], variants: [ 0 ], ...extra } );
const linkCal = ( { governed = true } = {} ) => ( { elements: { '': {} }, settings: {
	colourText: setting( 'color' ),
	...( governed ? { colourTextHover: setting( 'color', { state: 'hover', look: { '': { 'background-color': at( 'rgba(0, 0, 0, 0)' ) } } } ) } : {} ),
	colourBackgroundHover: setting( 'background-color', { state: 'hover', look: { '': { color: at( PRIMARY ) } } } ),
} } );
const reads = ( colour ) => ( {
	widths: Object.fromEntries( W.map( ( w ) => [ w, { t: { tag: 'a', styles: { color: colour, 'background-color': 'rgba(0, 0, 0, 0)' } } } ] ) ),
	states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { t: [] } } ] ) ),
} );
const holdRun = ( cal, colour ) => {
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const r = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: 't', slot: '' } ] } ], reads: reads( colour ), calFor: () => cal, db, snapshot } );
	return r.writes.filter( ( w ) => 'fill-state-hold' === w.how ).map( ( w ) => w.attr );
};

test( 'MUST FAIL (nav link hover equal to the fixture\'s resting colour): a default hover the draft does not have is held from the recorded look', () => {
	assert.deepEqual( [ ...( defaultStateLook( linkCal(), 'hover', { color: at( INK ) } )[ '' ] || [] ) ], [ 'color' ] );
	assert.deepEqual( holdRun( linkCal(), INK ), [ 'colourTextHover' ], 'the draft\'s ink link does not turn primary on hover' );
	// Controls: a draft resting at the block's hover colour shows no change; with no hover setting of colour the block has no
	// colour rule there to hold; and with no draft resting look given, nothing is compared.
	assert.deepEqual( holdRun( linkCal(), PRIMARY ), [] );
	assert.equal( defaultStateLook( linkCal( { governed: false } ), 'hover', { color: at( INK ) } )[ '' ], undefined );
	assert.equal( defaultStateLook( linkCal(), 'hover' )[ '' ], undefined );
	assert.equal( defaultStateLook( linkCal(), 'focus', { color: at( INK ) } )[ '' ], undefined, 'another state\'s look is not this one\'s' );
} );

// The fill-held harness: the draft's reads as fixtures, the real framework DB.
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'background-color': 'rgba(0, 0, 0, 0)' };
const snap = ( styles, words = '' ) => ( { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words, href: null } );
const containerCal = ( own ) => ( { block: 'sgs/container', elements: { '': Object.fromEntries( W.map( ( w ) => [ w, { ...DEFAULT, ...own } ] ) ) }, settings: {}, discovered: {} } );
function settleInner( own ) {
	const sk = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
		{ name: 'sgs/container', draftRef: '.row', attributes: {}, innerBlocks: [ { name: 'sgs/button', draftRef: '.b', attributes: { text: 'Go' } } ] },
	] } ];
	const spec = { '0:': snap( { 'font-size': '19px' } ), '1:': snap( { 'font-size': '19px' } ), '2:': snap( { 'font-size': '19px' }, 'Go' ) };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, Object.fromEntries( Object.entries( spec ).map( ( [ id, s ] ) => [ id, s ] ) ) ] ) );
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const cals = { 'sgs/container': containerCal( own ), 'sgs/button': { block: 'sgs/button', elements: { '': {} }, settings: {}, discovered: {} } };
	const r = fillTree( { tree, nodes: skeletonNodes( sk ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot, rawSnapshot: { settings: {} }, calFor: ( b ) => cals[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	const row = { node: refOf( tree[ 0 ].innerBlocks[ 0 ] ), block: 'sgs/container', slot: '', property: 'font-size', value: '19px', reason: 'no-setting: sgs/container has no setting for font-size' };
	return r.settleHeld( { unmapped: [ row ], writes: r.writes } );
}

test( 'MUST FAIL: an inherited row on a block whose own stylesheet sets the property is not held as inherited from its parent', () => {
	const own = settleInner( { '_own:font-size': '19px', _fs: '19px' } );
	assert.equal( own.alreadyHeld.length, 0, 'the element shows its own 19px, not its parent\'s' );
	assert.equal( own.unmapped.length, 1 );
	// Control: the same row on an element that inherits is held as inherited.
	assert.deepEqual( settleInner( {} ).alreadyHeld.map( ( h ) => h.heldReason ), [ 'inherited' ] );
} );

test( 'MUST FAIL: a gap on a box laying out no flex or grid items, or on a container with fewer than two children, paints nothing', () => {
	const styles = { 'column-gap': '12px', 'row-gap': '12px', gap: '12px' };
	for ( const prop of [ 'gap', 'row-gap', 'column-gap' ] ) {
		assert.equal( notPainted( prop, styles, { layoutDisplay: 'block', layoutChildren: 3 } ), true, `${ prop } on a block box` );
		assert.equal( notPainted( prop, styles, { layoutDisplay: 'flex', layoutChildren: 1 } ), true, `${ prop } on a one-child flex row` );
		assert.equal( notPainted( prop, styles, { layoutDisplay: 'flex', layoutChildren: 0 } ), true, `${ prop } on an empty flex row` );
		// Control: a two-child flex row's gap paints, so it is written.
		assert.equal( notPainted( prop, styles, { layoutDisplay: 'flex', layoutChildren: 2 } ), false, `${ prop } on a two-child flex row` );
		assert.equal( notPainted( prop, styles, { layoutDisplay: 'inline-grid', layoutChildren: 4 } ), false );
	}
	assert.match( gapPaintsNothing( 'gap', styles, { layoutDisplay: 'block' } ), /lays out no flex or grid items/ );
	assert.match( gapPaintsNothing( 'gap', styles, { layoutDisplay: 'inline-flex', layoutChildren: 1 } ), /rendering 1 child,/ );
	// A one-child grid whose template lists two tracks across the gap's axis still sizes them with the gap.
	assert.equal( notPainted( 'column-gap', { 'grid-template-columns': '[a] 100px repeat(2, 1fr)' }, { layoutDisplay: 'grid', layoutChildren: 1 } ), false );
	assert.equal( notPainted( 'column-gap', { 'grid-template-columns': '300px' }, { layoutDisplay: 'grid', layoutChildren: 1 } ), true );
	// A multi-column box's column gap separates its columns.
	assert.equal( notPainted( 'column-gap', { 'column-count': '2' }, { layoutDisplay: 'block' } ), false );
	assert.equal( notPainted( 'row-gap', { 'column-count': '2' }, { layoutDisplay: 'block' } ), true );
	// A reading without the layout element's display or child count is never judged.
	assert.equal( notPainted( 'gap', { display: 'block' } ), false );
	assert.equal( notPainted( 'gap', styles, { layoutDisplay: 'flex' } ), false );
} );
