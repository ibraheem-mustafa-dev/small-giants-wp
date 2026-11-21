// A block drawn one way on one device and another way on another (lib/fill-device-mode.mjs): the bag drawn as a pill on the
// desktop and as an icon on the phone (sgs/cart triggerStyle pill, triggerStyleMobile icon). Calibration measures the pill's
// border and radius settings in the pill variant only (`variants`), and the icon trigger's own radius in the icon variants; the
// block's default paint differs by mode (the icon trigger's 4px corners, the pill's 999px). Before, Fill judged the node at every
// width against the pill's paint and wrote the pill settings from the 1440 read, so the phone's outlined round capsule was lost
// (the 999px radius held as the pill's default; the border only on the pill). Now each width is judged in the mode in force there:
// the phone's radius goes to the icon trigger's own setting, and the phone's border, which no icon-mode setting holds, is a row of
// the phone's widths alone that the residual pass writes as Custom CSS for those widths only. The fixture and the settings'
// rows are the real ones (calibration-fixtures.json, the framework DB); the calibration mirrors the cart's measured paint.
// Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deviceModes, valueAtTier, modeKeys, modeGroups, notInForce } from '../lib/fill-device-mode.mjs';
import { calibrationForNode } from '../lib/paint-state.mjs';
import { resolveProperty, defaultPaint } from '../lib/fill-prop.mjs';
import { classifyRow, modeSpans } from '../lib/fill-residual-css.mjs';
import { rowValues } from '../lib/fill-regap.mjs';
import { isLadderRow } from '../lib/fill-width-ladder.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { unpairedPart } from '../lib/fill-part-pairing.mjs';
import { coveredBySetting } from '../lib/fill-held.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURES = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'calibration-fixtures.json' ), 'utf8' ) );
const BLOCK = 'sgs/cart';
const fixture = FIXTURES[ BLOCK ];
const schema = blockSchema( BLOCK );
const db = openDb();
const W = [ 375, 768, 1440 ];
const perW = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, { ...v } ] ) );
const T = '.sgs-cart__trigger';
const set = ( property, variants ) => ( { slot: T, slots: [ T ], property, state: null, forms: [], transform: null, reachedAt: W, effects: [], variants } );
// The cart's measured paint of its trigger: the icon trigger at rest (the default variant), and the pill paint state.
const ICON = { display: 'flex', 'border-radius': '4px', 'border-top-width': '0px', 'border-top-style': 'none', 'border-top-color': 'rgb(20, 20, 20)' };
const PILL = { display: 'flex', 'border-radius': '999px', 'border-top-width': '0px', 'border-top-style': 'solid', 'border-top-color': 'rgba(0, 0, 0, 0)' };
const CAL = {
	block: BLOCK,
	elements: { '': perW( { display: 'block' } ), [ T ]: perW( ICON ) },
	paintStates: { pill: { when: { equals: { triggerStyle: 'pill' } }, elements: { [ T ]: perW( PILL ) } } },
	settings: {
		pillBorderRadius: set( 'border-radius', [ 1 ] ),
		pillBorderWidth: set( 'border-width', [ 1 ] ),
		iconTriggerRadius: set( 'border-radius', [ 0, 2, 3 ] ),
	},
	discovered: {},
};
const PHONE_ICON = { attributes: { triggerStyle: 'pill', triggerStyleMobile: 'icon', displayMode: 'flyout' } };
const PILL_ONLY = { attributes: { triggerStyle: 'pill', displayMode: 'flyout' } };
const view = ( node ) => calibrationForNode( CAL, node, { fixture, schema } );
const ask = ( node, prop, value ) => {
	const cal = view( node );
	return resolveProperty( { node, block: BLOCK, prop, draft: Object.fromEntries( W.map( ( w ) => [ w, value ] ) ), baseline: ( slot, w ) => defaultPaint( cal, slot, w, prop ), slots: [ T ], calibration: cal, db, snapshot: null, log: [] } );
};

test( 'MUST FAIL: the cart\'s trigger style is a mode setting held per device, and a node drawn as a pill above the phone and an icon on it is in the pill variant at 768 and 1440 and the icon variants at 375', () => {
	assert.deepEqual( modeKeys( fixture, schema ), [ 'triggerStyle' ] );
	assert.equal( valueAtTier( PHONE_ICON.attributes, 'triggerStyle', 'mobile', schema ), 'icon' );
	assert.equal( valueAtTier( PHONE_ICON.attributes, 'triggerStyle', 'tablet', schema ), 'pill', 'an empty tablet sibling shows the desktop value' );
	assert.deepEqual( deviceModes( fixture, schema, PHONE_ICON.attributes ), { 375: [ 0, 2, 3 ], 768: [ 1 ], 1440: [ 1 ] } );
	assert.deepEqual( modeGroups( { 375: [ 0, 2, 3 ], 768: [ 1 ], 1440: [ 1 ] }, [ 375, 768, 1440 ] ), [ [ 375 ], [ 768, 1440 ] ] );
} );

test( 'negative control: a node in one mode at every device has no per-width modes, and its calibration view is the pill state\'s as before', () => {
	assert.equal( deviceModes( fixture, schema, PILL_ONLY.attributes ), null );
	const v = view( PILL_ONLY );
	assert.equal( v.modeAt, undefined );
	assert.equal( v.paintState, 'pill' );
	assert.equal( v.elements[ T ][ 375 ][ 'border-radius' ], '999px' );
	assert.equal( calibrationForNode( CAL, PHONE_ICON ).elements[ T ][ 375 ][ 'border-radius' ], '999px', 'without the fixture the node is judged as before' );
} );

test( 'MUST FAIL: the node\'s calibration view paints each width in the mode in force there: the icon trigger\'s corners at 375, the pill\'s at 768 and 1440', () => {
	const v = view( PHONE_ICON );
	assert.equal( v.elements[ T ][ 375 ][ 'border-radius' ], '4px' );
	assert.equal( v.elements[ T ][ 768 ][ 'border-radius' ], '999px' );
	assert.equal( v.elements[ T ][ 1440 ][ 'border-radius' ], '999px' );
	assert.deepEqual( v.modeAt, { 375: [ 0, 2, 3 ], 768: [ 1 ], 1440: [ 1 ] } );
	assert.deepEqual( notInForce( v, [ 375 ] ), [ 'pillBorderRadius', 'pillBorderWidth' ] );
	assert.deepEqual( notInForce( v, [ 768, 1440 ] ), [ 'iconTriggerRadius' ] );
} );

test( 'MUST FAIL: a round capsule on the phone over a pill above it is written to the icon trigger\'s own radius; the pill\'s radius is never the phone\'s', () => {
	const r = ask( PHONE_ICON, 'border-radius', '999px' );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'iconTriggerRadius', '999px' ] ] );
	assert.equal( r.modeGaps, undefined );
} );

test( 'MUST FAIL: a 1px border at every width is the pill\'s border above the phone, and the phone\'s is a row of its own width, naming the pill settings as not in force there', () => {
	const r = ask( PHONE_ICON, 'border-top-width', '1px' );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'pillBorderWidth' ] );
	assert.deepEqual( Object.keys( r.included ).map( Number ), [ 768, 1440 ] );
	assert.equal( r.modeGaps.length, 1 );
	assert.deepEqual( r.modeGaps[ 0 ].widths, [ 375 ] );
	assert.deepEqual( r.modeGaps[ 0 ].draft, { 375: '1px' } );
	assert.equal( r.modeGaps[ 0 ].gap, 'no-setting' );
} );

test( 'negative control: the same border on a node drawn as a pill at every width is the pill\'s border alone, with no row left over', () => {
	const r = ask( PILL_ONLY, 'border-top-width', '1px' );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'pillBorderWidth' ] );
	assert.equal( r.modeGaps, undefined );
	assert.equal( ask( PILL_ONLY, 'border-radius', '999px' ).status, 'equal', 'the pill already paints 999px' );
} );

test( 'MUST FAIL: the phone\'s row holds its own width only, is not the width ladder\'s, is Custom CSS (the pill border is not in force there), and its rule covers the phone\'s range alone', () => {
	const row = { node: 'n', block: BLOCK, slot: T, property: 'border-top-width', value: JSON.stringify( { 375: '1px' } ), reason: 'no-setting: no border-width setting on sgs/cart paints ".sgs-cart__trigger"', modeWidths: [ 375 ], notInForce: [ 'pillBorderRadius', 'pillBorderWidth' ] };
	const reads = { widths: Object.fromEntries( W.map( ( w ) => [ w, { t: { styles: { 'border-top-width': '1px' } } } ] ) ) };
	assert.deepEqual( rowValues( row, reads, { id: 't' } ), { 375: '1px' } );
	assert.equal( isLadderRow( row ), false );
	const calFor = () => CAL;
	assert.equal( classifyRow( row, { calFor, db } ).cls, 'residual' );
	const plain = { ...row, modeWidths: undefined, notInForce: undefined };
	assert.equal( classifyRow( plain, { calFor, db } ).cls, 'route', 'negative control: a row with every setting in force names the pill border' );
	assert.deepEqual( rowValues( plain, reads, { id: 't' } ), { 375: '1px', 768: '1px', 1440: '1px' }, 'negative control: a plain row reads every width' );
	assert.deepEqual( modeSpans( { read: W, widths: [ 375 ], values: { 375: '1px' }, series: null } ).ranges, [ { range: [ 0, 768 ], value: '1px' } ] );
	assert.deepEqual( modeSpans( { read: W, widths: [ 768, 1440 ], values: { 768: '2px', 1440: '2px' }, series: null } ).ranges, [ { range: [ 768, Infinity ], value: '2px' } ] );
} );

// On the real Eye Care records (offline Fill, run 23) the two passes after the resolver undid the phone's capsule: the part
// pairing refused iconTriggerRadius because the DB names its part `icon`, whose other settings (the icon's colour) calibration
// measured on the glyph layer, and the held pass settled the phone's border row as painted by the pill border just written.
test( 'MUST FAIL: a setting calibration measured painting the read element itself is paired there, whatever the other settings of its DB part paint', () => {
	const cal = { ...CAL, settings: { ...CAL.settings, iconColour: { ...set( 'color', [ 0, 2, 3 ] ), slot: `${ T }::after`, slots: [ `${ T }::after` ] }, iconBg: { ...set( 'background-color', [ 0, 2, 3 ] ), slot: `${ T }::after`, slots: [ `${ T }::after` ] }, iconColourGradient: { ...set( 'color', [ 0, 2, 3 ] ), slot: `${ T }::after`, slots: [ `${ T }::after` ] } } };
	assert.equal( unpairedPart( { db, block: BLOCK, cal, attr: 'iconTriggerRadius', readSlot: T, prop: 'border-radius', value: '999px' } ), null );
	assert.match( String( unpairedPart( { db, block: BLOCK, cal, attr: 'iconBg', readSlot: T, prop: 'background-color', value: 'rgb(0, 0, 0)' } ) ), /^unpaired-part/, 'negative control: a setting measured on the glyph layer stays unpaired at the trigger' );
} );

test( 'MUST FAIL: a phone-only row is never settled by a setting not in force there, though that setting was written with the same value', () => {
	const row = { slot: T, property: 'border-top-width', state: null, notInForce: [ 'pillBorderRadius', 'pillBorderWidth' ] };
	const writes = [ { attr: 'pillBorderWidth', how: 'single', after: { top: '1px', right: '1px', bottom: '1px', left: '1px' } } ];
	assert.equal( coveredBySetting( row, { 375: '1px' }, writes, CAL ), null );
	assert.match( String( coveredBySetting( { ...row, notInForce: undefined }, { 1440: '1px' }, writes, CAL ) ), /pillBorderWidth was written/, 'negative control: in force, the write covers the row' );
} );
