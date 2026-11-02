// A block's own interaction look the draft does not have (Spec 48 FR-48-81): calibration records it as the change every
// state reading of an element shows, and Fill holds it at the draft's resting value through the setting that holds the
// state, or names it as a `default-state` gap. Against the real framework DB, with small planted calibrations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates, defaultStateLook, interactionStates } from '../lib/fill-state.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const BORDERS = [ 'top', 'right', 'bottom', 'left' ].map( ( s ) => `border-${ s }-color` );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], property, state: null, forms: [ 'hex', 'slug' ], transform: null, reachedAt: W, effects: [], variants: [ 0 ], ...extra } );
const fx = ( path, props ) => props.map( ( p ) => `${ path }|${ p }` );

// A button whose own hover turns its label, ground and border: every hover reading of the root shows those changes.
const buttonCal = ( extra = {} ) => ( { elements: { '': {} }, settings: {
	colourText: setting( 'color' ),
	borderColour: setting( 'border-color' ),
	colourTextHover: setting( 'color', { state: 'hover', effects: fx( '', [ 'background-color', ...BORDERS, 'outline-color', 'text-decoration-color' ] ) } ),
	colourBackgroundHover: setting( 'background-color', { state: 'hover', effects: fx( '', [ 'color', ...BORDERS, 'outline-color' ] ) } ),
	borderColourHover: setting( 'border-color', { state: 'hover', effects: fx( '', [ 'color', 'background-color', 'outline-color' ] ) } ),
	...extra,
} } );

const RESTING = { color: 'rgb(255, 255, 255)', 'background-color': 'rgb(10, 126, 168)', 'outline-color': 'rgb(255, 255, 255)', 'text-decoration-color': 'rgb(255, 255, 255)', ...Object.fromEntries( BORDERS.map( ( b ) => [ b, 'rgb(7, 94, 128)' ] ) ) };
const reads = ( looks, styles = RESTING ) => ( {
	widths: Object.fromEntries( W.map( ( w ) => [ w, { t: { tag: 'a', styles } } ] ) ),
	states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { t: looks } } ] ) ),
} );
const look = ( states, declared ) => ( { states, declared, rendered: declared } );
const run = ( { cal = buttonCal(), looks = [], block = 'sgs/button', attributes = {}, targets = [ { id: 't', slot: '' } ], styles } = {} ) => {
	const tree = [ { name: block, attributes: { className: 'cr-ref-x-0', ...attributes }, innerBlocks: [] } ];
	const result = fillStates( { tree, nodes: [ { index: 0, name: block, targets } ], reads: reads( looks, styles ), calFor: () => cal, db, snapshot } );
	return { ...result, attrs: tree[ 0 ].attributes };
};
const holds = ( r ) => r.writes.filter( ( w ) => 'fill-state-hold' === w.how ).map( ( w ) => w.attr ).sort();

test( 'MUST FAIL: the block\'s own hover label and border change the draft lacks is held at the draft\'s resting value', () => {
	const r = run( { looks: [ look( [ 'hover' ], { 'background-color': 'rgb(44, 62, 80)' } ) ] } );
	assert.deepEqual( holds( r ), [ 'borderColourHover', 'colourTextHover' ] );
	assert.ok( r.attrs.colourTextHover, 'the label colour on hover is written' );
	assert.ok( r.attrs.borderColourHover, 'the border colour on hover is written' );
	assert.equal( r.writes.filter( ( w ) => 'borderColourHover' === w.attr ).length, 1, 'four border sides make one write' );
	assert.equal( r.attrs.colourText, undefined, 'the resting settings are untouched' );
} );

test( 'MUST FAIL: a held value is the draft\'s resting value, and a property the draft\'s hover declares keeps the draft value', () => {
	const r = run( { looks: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ) ] } );
	const text = r.writes.filter( ( w ) => 'colourTextHover' === w.attr );
	assert.equal( text.length, 1 );
	assert.equal( text[ 0 ].how, 'fill-state', 'the declared hover colour is the state pass\'s write' );
	assert.equal( r.writes.find( ( w ) => 'colourBackgroundHover' === w.attr ).how, 'fill-state-hold', 'the undeclared ground is held' );
	const plain = run();
	assert.notEqual( plain.attrs.colourTextHover, text[ 0 ].after, 'the hold writes the resting white, not the declared red' );
} );

test( 'a property following the colour is held with it, never a gap; one with no setting and its own value is a default-state gap', () => {
	const r = run();
	assert.ok( r.held.some( ( h ) => 'outline-color' === h.prop && /follows the element's colour/.test( h.reason ) ) );
	assert.ok( ! r.unmapped.some( ( u ) => 'outline-color' === u.property ) );
	const own = run( { styles: { ...RESTING, 'outline-color': 'rgb(1, 2, 3)' } } );
	assert.ok( own.unmapped.some( ( u ) => 'outline-color' === u.property && /^default-state: sgs\/button changes outline-color on hover/.test( u.reason ) ) );
} );

test( 'a marker\'s own side effect, in one reading only, is not the block\'s look; a lone reading\'s own property is not either', () => {
	const look = defaultStateLook( buttonCal(), 'hover' );
	assert.ok( look[ '' ].has( 'color' ) && look[ '' ].has( 'border-top-color' ) );
	assert.ok( ! look[ '' ].has( 'text-decoration-color' ), 'listed by one reading only' );
	const lone = defaultStateLook( { settings: { colourTextHover: setting( 'color', { state: 'hover' } ) } }, 'hover' );
	assert.deepEqual( lone, {}, 'a setting\'s own property is no evidence the block changes it' );
	assert.deepEqual( holds( run( { cal: { elements: { '': {} }, settings: { colourTextHover: setting( 'color', { state: 'hover' } ) } } } ) ), [] );
} );

test( 'an element the default read never saw, and a reading that shows or hides its element, are structure, never a look', () => {
	const defs = '> svg > defs';
	const cal = buttonCal( {
		gradientHover: setting( 'background-image', { slot: defs, slots: [ defs ], state: 'hover', effects: fx( defs, [ 'color', 'opacity' ] ) } ),
		gradientHover2: setting( 'stroke', { slot: defs, slots: [ defs ], state: 'hover', effects: fx( defs, [ 'color', 'opacity' ] ) } ),
	} );
	assert.equal( defaultStateLook( cal, 'hover' )[ defs ], undefined, 'absent from the default paint' );
	assert.ok( defaultStateLook( { ...cal, elements: {} }, 'hover' )[ defs ], 'negative control: with no default paint read, every element counts' );
	const shown = buttonCal( { panelHover: setting( 'opacity', { state: 'hover', effects: fx( '', [ 'display' ] ) } ) } );
	assert.ok( defaultStateLook( shown, 'hover' )[ '' ].has( 'color' ), 'the showing reading is left out of the intersection' );
	assert.ok( ! defaultStateLook( shown, 'hover' )[ '' ].has( 'display' ) );
} );

test( 'MUST FAIL: a held property resolves on the element its resting setting paints (a ground colour on an inner shape)', () => {
	const shape = '.sgs-icon__shape';
	const cal = { elements: { '': {}, [ shape ]: {} }, settings: {
		backgroundColour: setting( 'background-color', { slot: shape, slots: [ shape ] } ),
		backgroundColourHover: setting( 'background-color', { slot: shape, slots: [ shape ], state: 'hover', effects: fx( shape, [ 'color' ] ) } ),
		iconColourHover: setting( 'color', { slot: shape, slots: [ shape ], state: 'hover', effects: fx( shape, [ 'background-color' ] ) } ),
	} };
	const r = run( { block: 'sgs/icon', cal, attributes: { backgroundColour: '#0A66C2' } } );
	assert.deepEqual( holds( r ), [ 'backgroundColourHover' ] );
	assert.deepEqual( holds( run( { block: 'sgs/icon', cal } ) ), [], 'negative control: without the resting ground setting nothing places the hold' );
} );

test( 'MUST FAIL: a ground is never held without its text colour (a held brand ground under a glyph that still swaps vanishes)', () => {
	const shape = '.sgs-icon__shape';
	const cal = { elements: { '': {}, [ shape ]: {} }, settings: {
		backgroundColour: setting( 'background-color', { slot: shape, slots: [ shape ] } ),
		iconColour: setting( 'color', { slot: shape, slots: [ shape ] } ),
		backgroundColourHover: setting( 'background-color', { slot: shape, slots: [ shape ], state: 'hover', effects: fx( shape, [ 'color' ] ) } ),
		iconColourHover: setting( 'color', { slot: shape, slots: [ shape ], state: 'hover', effects: fx( shape, [ 'background-color' ] ) } ),
	} };
	const { color, ...noColour } = RESTING;
	const r = run( { block: 'sgs/icon', cal, attributes: { backgroundColour: '#0A66C2' }, styles: noColour } );
	assert.deepEqual( holds( r ), [], 'the ground alone is not held' );
	assert.ok( r.unmapped.some( ( u ) => 'background-color' === u.property && /held with color/.test( u.reason ) ) );
	assert.ok( r.unmapped.some( ( u ) => 'color' === u.property && /was not read/.test( u.reason ) ) );
	assert.deepEqual( holds( run( { block: 'sgs/icon', cal, attributes: { backgroundColour: '#0A66C2' }, styles: { ...noColour, color } } ) ), [ 'backgroundColourHover', 'iconColourHover' ], 'negative control: with the colour read both are held' );
} );

test( 'MUST FAIL: a calibrated focus look and a press look no setting holds are named default-state gaps', () => {
	const focus = run( { cal: buttonCal( { ringFocus: setting( 'outline-color', { state: 'focus', effects: fx( '', [ 'box-shadow' ] ) } ) } ), styles: { ...RESTING, 'box-shadow': 'none' } } );
	assert.ok( focus.unmapped.some( ( u ) => 'focus' === u.state && 'box-shadow' === u.property && /^default-state: .*focus-differs/.test( u.reason ) ) );
	const press = run( { cal: buttonCal( { pressActive: setting( 'transform', { state: 'active', effects: fx( '', [ 'background-color' ] ) } ) } ) } );
	assert.ok( press.unmapped.some( ( u ) => 'active' === u.state && 'background-color' === u.property && /^default-state: .*press:/.test( u.reason ) ) );
	const declared = run( { cal: buttonCal( { pressActive: setting( 'transform', { state: 'active', effects: fx( '', [ 'background-color' ] ) } ) } ), looks: [ look( [ 'active' ], { 'background-color': 'rgb(1, 1, 1)' } ) ] } );
	assert.ok( ! declared.unmapped.some( ( u ) => /^default-state/.test( u.reason ) && 'active' === u.state ), 'a press look the draft declares is the state pass\'s' );
} );

test( 'MUST FAIL: a hold never overwrites a declared look, and two parts holding one setting at different values is a gap', () => {
	const label = '.sgs-button__label';
	const cal = buttonCal();
	cal.elements[ label ] = {};
	cal.settings.colourText.slots = [ '', label ];
	const two = { widths: Object.fromEntries( W.map( ( w ) => [ w, { a: { styles: RESTING }, b: { styles: { ...RESTING, color: 'rgb(9, 9, 9)' } } } ] ) ), states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { a: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ) ] } } ] ) ) };
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const r = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: 'a', slot: '' }, { id: 'b', slot: label } ] } ], reads: two, calFor: () => cal, db, snapshot } );
	const text = r.writes.filter( ( w ) => 'colourTextHover' === w.attr );
	assert.deepEqual( text.map( ( w ) => w.how ), [ 'fill-state' ], 'the declared red stays' );
	const hold = { widths: Object.fromEntries( W.map( ( w ) => [ w, { a: { styles: RESTING }, b: { styles: { ...RESTING, color: 'rgb(9, 9, 9)' } } } ] ) ), states: {} };
	const tree2 = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const r2 = fillStates( { tree: tree2, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: 'a', slot: '' }, { id: 'b', slot: label } ] } ], reads: hold, calFor: () => cal, db, snapshot } );
	assert.equal( r2.writes.filter( ( w ) => 'colourTextHover' === w.attr ).length, 1 );
	assert.ok( r2.unmapped.some( ( u ) => /^default-state: colourTextHover already holds/.test( u.reason ) ) );
} );

test( 'MUST FAIL: a border side with no width paints nothing, so its colour is never held', () => {
	const r = run( { styles: { ...RESTING, ...Object.fromEntries( [ 'top', 'right', 'bottom', 'left' ].map( ( s ) => [ `border-${ s }-width`, '0px' ] ) ) } } );
	assert.deepEqual( holds( r ), [ 'colourBackgroundHover', 'colourTextHover' ] );
	assert.ok( holds( run() ).includes( 'borderColourHover' ), 'negative control: with a border width the colour is held' );
} );

test( 'the interaction states come from the DB vocabulary: hover, focus and press, never current or open', () => {
	const s = interactionStates( db );
	assert.ok( s.has( 'hover' ) && s.has( 'focus' ) && s.has( 'active' ) );
	assert.ok( ! s.has( 'current' ) && ! s.has( 'open' ) );
} );
