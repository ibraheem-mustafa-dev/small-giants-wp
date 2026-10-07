// Proves Spec 47 §5's gap typing: when an inherited setting paints a slot and a descendant's own rule overrides the
// value, calibration records that descendant in `overriddenBy`, so the route types the row as a hardcode and not as a
// missing setting. Only an inherited property can be overridden by inheritance, so a non-inherited one records nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { slotFor, mergeSetting, WIDTHS, MARKER_RGB } from '../lib/calibrate.mjs';

const BLACK = 'rgb(0, 0, 0)';
const RED = 'rgb(200, 0, 0)';
const colourRow = { attr_name: 'textColour', css_property: 'color', tier_shape: null, css_state: null };
const colourMarker = { label: 'hex', attrs: { textColour: '#13579b' }, expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, MARKER_RGB ] ) ) };

// One reading per width from a { path: colour } map.
const atWidths = ( map ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( Object.entries( map ).map( ( [ p, c ] ) => [ p, { color: c } ] ) ) ] ) );

test( 'MUST FAIL TO TYPE AS A GAP: a descendant carrying its own rule is recorded in overriddenBy', () => {
	const def = atWidths( { '': BLACK, 'sgs-card__title': BLACK, 'sgs-card__body': BLACK, 'sgs-card__price': RED } );
	// The marker reaches the root and two descendants; the price keeps its own rule's colour at every width.
	const mark = atWidths( { '': MARKER_RGB, 'sgs-card__title': MARKER_RGB, 'sgs-card__body': MARKER_RGB, 'sgs-card__price': RED } );
	const s = slotFor( colourRow, colourMarker, def, mark );
	assert.equal( s.slot, '' );
	assert.deepEqual( s.reaches.slice().sort(), [ '', 'sgs-card__body', 'sgs-card__title' ] );
	assert.deepEqual( s.overriddenBy, [ 'sgs-card__price' ] );
} );

test( 'only the topmost element of a blocked subtree is the overriding one', () => {
	const def = atWidths( { '': BLACK, 'sgs-card__title': BLACK, 'sgs-card__price': RED, 'sgs-card__price > sgs-card__unit': RED } );
	const mark = atWidths( { '': MARKER_RGB, 'sgs-card__title': MARKER_RGB, 'sgs-card__price': RED, 'sgs-card__price > sgs-card__unit': RED } );
	// The unit inherits the price's own rule, so it carries no rule of its own and is not named.
	assert.deepEqual( slotFor( colourRow, colourMarker, def, mark ).overriddenBy, [ 'sgs-card__price' ] );
} );

test( 'a descendant that already computes the marker value by default is not an override', () => {
	const def = atWidths( { '': BLACK, 'sgs-card__title': BLACK, 'sgs-card__badge': MARKER_RGB } );
	const mark = atWidths( { '': MARKER_RGB, 'sgs-card__title': MARKER_RGB, 'sgs-card__badge': MARKER_RGB } );
	const s = slotFor( colourRow, colourMarker, def, mark );
	assert.ok( ! Object.hasOwn( s, 'overriddenBy' ) );
} );

test( 'a slot deeper than the root scopes overriddenBy to its own descendants', () => {
	const row = { attr_name: 'bodyColour', css_property: 'color', tier_shape: null, css_state: null };
	const def = atWidths( { '': BLACK, 'sgs-card__body': BLACK, 'sgs-card__body > sgs-card__note': RED, 'sgs-card__aside': RED } );
	const mark = atWidths( { '': BLACK, 'sgs-card__body': MARKER_RGB, 'sgs-card__body > sgs-card__note': RED, 'sgs-card__aside': RED } );
	const s = slotFor( row, { ...colourMarker, attrs: { bodyColour: '#13579b' } }, def, mark );
	assert.equal( s.slot, 'sgs-card__body' );
	// The aside is a sibling of the slot, never an element the slot's value could reach.
	assert.deepEqual( s.overriddenBy, [ 'sgs-card__body > sgs-card__note' ] );
} );

test( 'MUST FAIL TO RECORD: a non-inherited property records no overriddenBy', () => {
	const row = { attr_name: 'ground', css_property: 'background-color', tier_shape: null, css_state: null };
	const bg = ( map ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( Object.entries( map ).map( ( [ p, c ] ) => [ p, { 'background-color': c } ] ) ) ] ) );
	const def = bg( { '': 'rgba(0, 0, 0, 0)', 'sgs-card__title': 'rgba(0, 0, 0, 0)', 'sgs-card__price': RED } );
	const mark = bg( { '': MARKER_RGB, 'sgs-card__title': 'rgba(0, 0, 0, 0)', 'sgs-card__price': RED } );
	const s = slotFor( row, { label: 'hex', attrs: { ground: '#13579b' }, expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, MARKER_RGB ] ) ) }, def, mark );
	assert.equal( s.reaches, undefined );
	assert.ok( ! Object.hasOwn( s, 'overriddenBy' ) );
} );

test( 'a pseudo-element layer is never named as an overriding child', () => {
	const def = atWidths( { '': BLACK, 'sgs-card__title': BLACK } );
	def[ 1440 ][ 'sgs-card__title::before' ] = { content: '"x"' };
	const mark = atWidths( { '': MARKER_RGB, 'sgs-card__title': MARKER_RGB } );
	mark[ 1440 ][ 'sgs-card__title::before' ] = { content: '"x"' };
	const s = slotFor( colourRow, colourMarker, def, mark );
	assert.ok( ! Object.hasOwn( s, 'overriddenBy' ) );
} );

test( 'mergeSetting unions overriddenBy across a setting markers and omits it when empty', () => {
	const ctx = { state: null, form: 'hex', variant: 0 };
	const one = mergeSetting( undefined, { slot: '', slots: [ '' ], reaches: [ '' ], property: 'color', transform: null, reachedAt: WIDTHS, effects: [], overriddenBy: [ 'a' ] }, ctx );
	assert.deepEqual( one.overriddenBy, [ 'a' ] );
	const two = mergeSetting( one, { slot: '', slots: [ '' ], reaches: [ '' ], property: 'color', transform: null, reachedAt: WIDTHS, effects: [], overriddenBy: [ 'b' ] }, { ...ctx, form: 'slug' } );
	assert.deepEqual( two.overriddenBy, [ 'a', 'b' ] );
	assert.deepEqual( two.forms, [ 'hex', 'slug' ] );
	const none = mergeSetting( undefined, { slot: '', slots: [ '' ], property: 'color', transform: null, reachedAt: WIDTHS, effects: [] }, ctx );
	assert.ok( ! Object.hasOwn( none, 'overriddenBy' ) );
	assert.ok( ! Object.hasOwn( none, 'reaches' ) );
} );

test( 'MUST FAIL ON REVERT: a container-query tier keeps its containerTier flag through the merge into the cache', () => {
	const ctx = { state: null, form: null, variant: 0 };
	const tier = mergeSetting( undefined, { slot: '', slots: [ '' ], property: 'gap', transform: null, reachedAt: [ 375, 1440 ], effects: [], containerTier: true }, ctx );
	assert.equal( tier.containerTier, true );
	assert.equal( mergeSetting( tier, { slot: '', slots: [ '' ], property: 'gap', transform: null, reachedAt: [ 375, 1440 ], effects: [] }, ctx ).containerTier, true );
	assert.equal( 'containerTier' in mergeSetting( undefined, { slot: '', slots: [ '' ], property: 'gap', transform: null, reachedAt: WIDTHS, effects: [] }, ctx ), false );
} );
