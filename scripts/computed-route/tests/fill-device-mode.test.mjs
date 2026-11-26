// A block drawn one way on one device and another way on another (lib/fill-device-mode.mjs): the bag drawn as a pill on the
// desktop and as an icon on the phone (sgs/cart triggerStyle pill, triggerStyleMobile icon). Calibration measures the pill's
// border settings in the pill variant only (`variants`), the icon trigger's background in the icon variants, and the trigger's
// one corner radius for both modes (triggerBorderRadius) in every variant; the block's default paint differs by mode (the icon
// trigger's 4px corners, the pill's 999px). Before, Fill judged the node at every width against the pill's paint and wrote the
// pill settings from the 1440 read, so the phone's outlined round capsule was lost (the 999px radius held as the pill's default;
// the border only on the pill). Now each width is judged in the mode in force there: the phone's radius goes to the shared
// trigger radius for the phone's width, and the phone's border, which no icon-mode setting holds, is a row of the phone's widths
// alone that the residual pass writes as Custom CSS for those widths only. The fixture and the settings' rows are the real ones
// (the setting record's fixtures.json, the framework DB); the calibration mirrors the cart's measured paint.
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
import { rowValues, reresolve } from '../lib/fill-regap.mjs';
import { isLadderRow, widthLadderWrites } from '../lib/fill-width-ladder.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { unpairedPart } from '../lib/fill-part-pairing.mjs';
import { coveredBySetting } from '../lib/fill-held.mjs';
import { nodeCalFor } from '../lib/fill-resolve.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURES = recordFixtures();
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
		triggerBorderRadius: set( 'border-radius', [ 0, 1, 2, 3 ] ),
		pillBorderWidth: set( 'border-width', [ 1 ] ),
		iconBg: { ...set( 'background-color', [ 0, 2, 3 ] ), slot: `${ T }::after`, slots: [ `${ T }::after` ] },
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
	assert.deepEqual( notInForce( v, [ 375 ] ), [ 'pillBorderWidth' ] );
	assert.deepEqual( notInForce( v, [ 768, 1440 ] ), [ 'iconBg' ] );
	assert.deepEqual( notInForce( v, W ), [], 'every setting is in force at one width or another' );
} );

test( 'MUST FAIL: a round capsule on the phone over a pill above it is written to the trigger\'s shared radius for the phone\'s width, with no row left over', () => {
	const r = ask( PHONE_ICON, 'border-radius', '999px' );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'triggerBorderRadius', '999px' ] ] );
	assert.deepEqual( Object.keys( r.included ).map( Number ), [ 375 ], 'the pill already paints 999px above the phone' );
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
	const row = { node: 'n', block: BLOCK, slot: T, property: 'border-top-width', value: JSON.stringify( { 375: '1px' } ), reason: 'no-setting: no border-width setting on sgs/cart paints ".sgs-cart__trigger"', modeWidths: [ 375 ], notInForce: [ 'pillBorderWidth' ] };
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
// pairing refused the icon trigger's radius because the DB named its part `icon`, whose other settings (the icon's colour)
// calibration measured on the glyph layer, and the held pass settled the phone's border row as painted by the pill border just
// written. The cart's radius is now the trigger's own setting, so the pairing case here is the pill's label colour: the DB names
// its part `pill`, whose other settings calibration measured on the trigger, while calibration measured the colour on the label.
test( 'MUST FAIL: a setting calibration measured painting the read element itself is paired there, whatever the other settings of its DB part paint', () => {
	const LABEL = `${ T } > .sgs-cart__pill-label`;
	const cal = { ...CAL, settings: { ...CAL.settings, pillBgColour: set( 'background-color', [ 1 ] ), pillTextColour: { ...set( 'color', [ 1 ] ), slot: LABEL, slots: [ LABEL ] }, iconColour: { ...set( 'color', [ 0, 2, 3 ] ), slot: `${ T }::after`, slots: [ `${ T }::after` ] }, iconColourGradient: { ...set( 'color', [ 0, 2, 3 ] ), slot: `${ T }::after`, slots: [ `${ T }::after` ] } } };
	assert.equal( unpairedPart( { db, block: BLOCK, cal, attr: 'pillTextColour', readSlot: LABEL, prop: 'color', value: 'rgb(0, 0, 0)' } ), null );
	assert.match( String( unpairedPart( { db, block: BLOCK, cal, attr: 'iconBg', readSlot: T, prop: 'background-color', value: 'rgb(0, 0, 0)' } ) ), /^unpaired-part/, 'negative control: a setting measured on the glyph layer stays unpaired at the trigger' );
} );

test( 'MUST FAIL: a phone-only row is never settled by a setting not in force there, though that setting was written with the same value', () => {
	const row = { slot: T, property: 'border-top-width', state: null, notInForce: [ 'pillBorderWidth' ] };
	const writes = [ { attr: 'pillBorderWidth', how: 'single', after: { top: '1px', right: '1px', bottom: '1px', left: '1px' } } ];
	assert.equal( coveredBySetting( row, { 375: '1px' }, writes, CAL ), null );
	assert.match( String( coveredBySetting( { ...row, notInForce: undefined }, { 1440: '1px' }, writes, CAL ) ), /pillBorderWidth was written/, 'negative control: in force, the write covers the row' );
} );

// A pass that asks the resolver again (lib/fill-regap.mjs::reresolve, run by the width ladder, the size pass and the inline-box
// pass) judges the node through its own calibration view, never the block's raw calibration: on the real Eye Care records the
// phone capsule's border style and colour went through the ladder's first rung, which read the pill's settings as in force at
// every width, so `pillBorderStyle` was written once for all three widths while the phone's icon trigger needs its own border.
const BORDER_STYLE = { ...CAL, settings: { ...CAL.settings, pillBorderStyle: set( 'border-style', [ 1 ] ) } };
const nodeCal = ( flat ) => nodeCalFor( { raw: () => BORDER_STYLE, flatOf: () => flat, fixtures: FIXTURES } );
const REC = { index: 0, name: BLOCK };
const askAgain = ( node, calFor, prop, value ) => reresolve( {
	rec: REC, node, target: { id: 't' }, slot: T, prop, draft: Object.fromEntries( W.map( ( w ) => [ w, value ] ) ),
	ctx: { db, snapshot: null, calFor, reads: { widths: Object.fromEntries( W.map( ( w ) => [ w, { t: { styles: {} } } ] ) ) } },
} );

test( 'MUST FAIL: the ladder\'s resolver call takes the node\'s per-width view, so a border style the draft states at every width is the pill\'s above the phone and a row of the phone\'s own width', () => {
	const flat = [ PHONE_ICON ];
	const r = askAgain( PHONE_ICON, nodeCal( flat ), 'border-top-style', 'dashed' );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'pillBorderStyle' ] );
	assert.equal( r.included[ 375 ], undefined, 'no pill setting is written for the phone, where the icon trigger is drawn' );
	assert.deepEqual( r.modeGaps?.map( ( g ) => g.widths ), [ [ 375 ] ] );
	assert.deepEqual( r.modeGaps[ 0 ].draft, { 375: 'dashed' } );
} );

test( 'negative control: the same border style on a node drawn as a pill at every width is written once, with no row left over', () => {
	const r = askAgain( PILL_ONLY, nodeCal( [ PILL_ONLY ] ), 'border-top-style', 'dashed' );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'pillBorderStyle' ] );
	assert.equal( r.modeGaps, undefined );
	assert.equal( JSON.stringify( r.writes ), JSON.stringify( [ { attr: 'pillBorderStyle', value: 'dashed', merge: 'replace' } ] ) );
} );

test( 'nodeCalFor: the view of a node is its per-width calibration, the block\'s own paint without a node, and a block with no fixture is judged as before', () => {
	const calFor = nodeCal( [ PHONE_ICON ] );
	assert.deepEqual( calFor( BLOCK, REC ).modeAt, { 375: [ 0, 2, 3 ], 768: [ 1 ], 1440: [ 1 ] } );
	assert.equal( calFor( BLOCK ).modeAt, undefined );
	assert.equal( calFor( BLOCK ).elements[ T ][ 375 ][ 'border-radius' ], '4px', 'no node: the default (icon) paint' );
	const bare = nodeCalFor( { raw: () => BORDER_STYLE, flatOf: () => [ PHONE_ICON ], fixtures: null } );
	assert.equal( bare( BLOCK, REC ).modeAt, undefined );
	assert.equal( bare( BLOCK, REC ).elements[ T ][ 375 ][ 'border-radius' ], '999px', 'without a fixture the node is the pill state at every width' );
	assert.equal( nodeCalFor( { raw: () => null, flatOf: () => [], fixtures: FIXTURES } )( BLOCK, REC ), null, 'an uncalibrated block has no view' );
} );

// The width ladder's first rung writes the pill's border style as one value, and the phone, drawn as the icon trigger, keeps its
// own row (the mode's widths, the settings not in force there) for the residual pass, as the main pass raises it; the pill's
// setting is never said to answer the phone.
const ladderRun = ( node ) => {
	const flat = [ { ...node, ref: 'n0' } ];
	const rec = { index: 0, name: BLOCK, parent: null, children: [], node: flat[ 0 ], targets: [ { id: '0:', index: 0, slot: '', finder: 'r' }, { id: '0:t', index: 0, slot: T, finder: 't' } ] };
	const widths = Object.fromEntries( W.map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 60, h: 40 }, layoutDisplay: 'flex', styles: {} }, '0:t': { rect: { x: 0, y: 0, w: 44, h: 44 }, layoutDisplay: 'flex', styles: { 'border-top-style': 'solid' } } } ] ) );
	const row = { node: 'n0', block: BLOCK, slot: T, property: 'border-top-style', value: 'solid', state: null, reason: `no-setting: no border-top-style setting on ${ BLOCK } paints "${ T }" (candidates: pillBorderStyle)` };
	const r = widthLadderWrites( { nodes: [ rec ], flat, refOf: ( n ) => n.ref, reads: { widths }, db, unmapped: [ row ], calFor: nodeCal( flat ), snapshot: null, scope: 'header' } );
	return { r, node: flat[ 0 ] };
};

test( 'MUST FAIL: a ladder write of the pill\'s border style leaves the phone\'s widths as a row of their own, never answered by the pill\'s setting', () => {
	const { r, node } = ladderRun( PHONE_ICON );
	assert.equal( node.attributes.pillBorderStyle, 'solid' );
	assert.deepEqual( r.answered.map( ( a ) => a.widths ), [ [ 768, 1440 ] ] );
	assert.equal( r.unmapped.length, 1 );
	assert.deepEqual( r.unmapped[ 0 ].modeWidths, [ 375 ] );
	assert.ok( r.unmapped[ 0 ].notInForce.includes( 'pillBorderStyle' ) );
	assert.deepEqual( JSON.parse( r.unmapped[ 0 ].value ), { 375: 'solid' } );
} );

test( 'negative control: the same ladder write on a node drawn as a pill at every width answers every width and leaves no row', () => {
	const { r, node } = ladderRun( PILL_ONLY );
	assert.equal( node.attributes.pillBorderStyle, 'solid' );
	assert.deepEqual( r.answered.map( ( a ) => a.widths ), [ [ 375, 768, 1440 ] ] );
	assert.deepEqual( r.unmapped, [] );
} );
