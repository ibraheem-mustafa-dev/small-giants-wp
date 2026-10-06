// R-47-5 per property (lib/fill-prop.mjs): a tier is written only where it differs from what the node shows there, a value
// written at a wider tier carries down to the narrower ones, a computed leftover that paints nothing is not a design value,
// and every write is the resolver's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canon, notPainted, defaultPaint, tiersDiffering, knownPaths, resolveProperty, INHERITED, TIER_WIDTHS } from '../lib/fill-prop.mjs';
import { INHERITED as CALIBRATION_INHERITED } from '../lib/calibrate-props.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ], ...extra } );

test( 'MUST FAIL: a draft value equal to the baseline at every tier writes nothing; a value that differs only at the widest tier writes that tier alone', () => {
	const base = () => '16px';
	assert.deepEqual( tiersDiffering( 'font-size', { 1440: '16px', 768: '16px', 375: '16px' }, base ), {} );
	assert.deepEqual( tiersDiffering( 'font-size', { 1440: '20px', 768: '20px', 375: '20px' }, base ), { 1440: '20px' }, 'tablet and mobile show the desktop value' );
	assert.deepEqual( tiersDiffering( 'font-size', { 1440: '16.4px', 768: '15.6px', 375: '16px' }, base ), {}, 'within 0.5px is the same' );
} );

test( 'a narrower tier that returns to the default is written when a wider tier wrote something else (it would otherwise show the wider value)', () => {
	const base = () => '0px';
	assert.deepEqual( tiersDiffering( 'margin-top', { 1440: '30px', 768: '30px', 375: '0px' }, base ), { 1440: '30px', 375: '0px' } );
	assert.deepEqual( tiersDiffering( 'margin-top', { 1440: '0px', 768: '0px', 375: '12px' }, base ), { 375: '12px' } );
	assert.deepEqual( tiersDiffering( 'margin-top', { 768: '8px' }, base ), { 768: '8px' }, 'a missing tier is skipped, not defaulted' );
	assert.deepEqual( TIER_WIDTHS, [ 1440, 768, 375 ] );
} );

test( 'the baseline can differ per tier: a stylesheet that is 16px on a phone and 24px above is equal where it matches', () => {
	const base = ( w ) => ( w < 768 ? '16px' : '24px' );
	assert.deepEqual( tiersDiffering( 'padding-top', { 1440: '24px', 768: '24px', 375: '16px' }, base ), {} );
	assert.deepEqual( tiersDiffering( 'padding-top', { 1440: '24px', 768: '24px', 375: '24px' }, base ), { 375: '24px' } );
} );

test( 'an undefined baseline never equals a value: nothing is known to be the default', () => {
	assert.deepEqual( tiersDiffering( 'font-weight', { 1440: '400' }, () => undefined ), { 1440: '400' } );
} );

test( 'canon: normal spacing is 0, start is left, auto min-height is 0, nothing else changes', () => {
	assert.equal( canon( 'letter-spacing', 'normal' ), '0px' );
	assert.equal( canon( 'row-gap', 'normal' ), '0px' );
	assert.equal( canon( 'text-align', 'start' ), 'left' );
	assert.equal( canon( 'min-height', 'auto' ), '0px' );
	assert.equal( canon( 'line-height', 'normal' ), 'normal' );
	assert.equal( canon( 'font-size', undefined ), undefined );
	assert.deepEqual( tiersDiffering( 'letter-spacing', { 1440: 'normal' }, () => '0px' ), {} );
	assert.deepEqual( tiersDiffering( 'text-align', { 1440: 'start' }, () => 'left' ), {} );
} );

test( 'MUST FAIL: a leftover that paints nothing (outline, border colour with no width, a decoration with no line) is not a design value', () => {
	assert.equal( notPainted( 'outline-color', { 'outline-style': 'none', 'outline-width': '0px' } ), true );
	assert.equal( notPainted( 'outline-color', { 'outline-style': 'solid', 'outline-width': '2px' } ), false );
	assert.equal( notPainted( 'border-left-color', { 'border-left-width': '0px' } ), true );
	assert.equal( notPainted( 'border-left-color', { 'border-left-width': '3px' } ), false );
	assert.equal( notPainted( 'border-top-color', {} ), false, 'unread width: assume it paints' );
	assert.equal( notPainted( 'text-decoration-color', { 'text-decoration-line': 'none' } ), true );
	assert.equal( notPainted( 'text-underline-offset', {} ), true );
	assert.equal( notPainted( 'text-decoration-thickness', { 'text-decoration-line': 'underline' } ), false );
	assert.equal( notPainted( 'transition-delay', { 'transition-duration': '0s' } ), true );
	assert.equal( notPainted( 'transition-delay', { 'transition-duration': '0.2s' } ), false );
	assert.equal( notPainted( 'color', { 'text-decoration-line': 'none' } ), false, 'an ordinary property is never skipped' );
} );

test( 'the inherited list is calibration\'s own, and defaultPaint reads 1920 as 1440, matches slots loosely and turns normal gaps into 0px', () => {
	assert.deepEqual( INHERITED, CALIBRATION_INHERITED );
	const cal = { elements: { '': { 1440: { 'row-gap': 'normal', 'padding-top': '4px' } }, '.sgs-x__a > p:nth-of-type(2)': { 1440: { 'padding-top': '9px' } } } };
	assert.equal( defaultPaint( cal, '', 1920, 'padding-top' ), '4px' );
	assert.equal( defaultPaint( cal, '', 1440, 'row-gap' ), '0px' );
	assert.equal( defaultPaint( cal, '.sgs-x__a > p:nth-of-type(1)', 1440, 'padding-top' ), '9px', 'a different :nth-of-type index is the same element' );
	assert.equal( defaultPaint( cal, '.nope', 1440, 'padding-top' ), undefined );
	assert.equal( defaultPaint( null, '', 1440, 'padding-top' ), undefined );
	assert.deepEqual( knownPaths( { elements: { '': {} }, settings: { a: { slots: [ '.x' ], reaches: [ '.y' ] }, b: { slot: '.z' } } } ), [ '', '.x', '.y', '.z' ] );
} );

const call = ( over ) => resolveProperty( { node: { attributes: {} }, block: 'sgs/container', prop: 'gap', draft: { 1440: '24px', 768: '24px', 375: '24px' }, baseline: () => '0px', slots: [ '' ], calibration: { elements: { '': {}, '.sgs-container__inner': {} }, settings: { gap: setting( 'gap', { slots: [ '.sgs-container__inner' ], reaches: [] } ) } }, db, snapshot, log: [], ...over } );

test( 'resolveProperty: a draft equal to the baseline is equal, a differing one is written through the resolver at the slot a setting paints', () => {
	assert.equal( call( { draft: { 1440: '0px', 768: '0px', 375: '0px' } } ).status, 'equal' );
	const r = call( { slots: [ '', '.sgs-container__inner' ] } );
	assert.equal( r.status, 'written' );
	assert.equal( r.slot, '.sgs-container__inner', 'the root has no gap setting; the inner element does' );
	assert.deepEqual( r.writes, [ { attr: 'gap', value: { desktop: '24px' }, merge: 'deep' } ] );
	assert.deepEqual( r.included, { 1440: '24px' } );
	assert.equal( r.how, 'tiers' );
} );

test( 'a draft that equals the default at the slot that paints it is equal, even when the first slot differs', () => {
	const r = call( { slots: [ '', '.sgs-container__inner' ], baseline: ( slot ) => ( '' === slot ? '0px' : '24px' ) } );
	assert.equal( r.status, 'equal' );
} );

test( 'no slot with a setting is a gap with the resolver\'s reason, an unknown path is unmapped-element, an uncalibrated block is uncalibrated', () => {
	const none = call( { prop: 'text-shadow', draft: { 1440: '1px 1px 0 red' }, baseline: () => 'none' } );
	assert.deepEqual( [ none.status, none.gap ], [ 'gap', 'no-setting' ] );
	const unknown = call( { slots: [ '.sgs-container__missing' ] } );
	assert.deepEqual( [ unknown.status, unknown.gap ], [ 'gap', 'unmapped-element' ] );
	assert.match( unknown.detail, /not a calibrated element/ );
	const un = call( { calibration: null } );
	assert.deepEqual( [ un.status, un.gap ], [ 'gap', 'uncalibrated' ] );
} );

test( 'a setting that holds one value for every width needs the draft to hold it at every width, else it is a shape gap', () => {
	const cal = { elements: { '': {} }, settings: { backgroundColour: setting( 'background-color', { forms: [ 'hex' ] } ) } };
	const same = resolveProperty( { node: { attributes: {} }, block: 'sgs/container', prop: 'background-color', draft: { 1440: 'rgb(255, 0, 0)', 768: 'rgb(255, 0, 0)', 375: 'rgb(255, 0, 0)' }, baseline: () => 'rgba(0, 0, 0, 0)', slots: [ '' ], calibration: cal, db, snapshot, log: [] } );
	assert.deepEqual( [ same.status, same.how, same.writes[ 0 ].value ], [ 'written', 'single', '#FF0000' ] );
	const differs = resolveProperty( { node: { attributes: {} }, block: 'sgs/container', prop: 'background-color', draft: { 1440: 'rgb(255, 0, 0)', 768: 'rgb(255, 0, 0)', 375: 'rgb(0, 0, 255)' }, baseline: () => 'rgba(0, 0, 0, 0)', slots: [ '' ], calibration: cal, db, snapshot, log: [] } );
	assert.deepEqual( [ differs.status, differs.gap ], [ 'gap', 'shape' ] );
} );

test( 'token snaps are logged only for the call whose write is kept', () => {
	const log = [];
	const cal = { elements: { '': {} }, settings: { backgroundColour: setting( 'background-color', { forms: [ 'hex' ] } ) } };
	resolveProperty( { node: { attributes: {} }, block: 'sgs/container', prop: 'background-color', draft: { 1440: 'rgb(255, 0, 0)', 768: 'rgb(255, 0, 0)', 375: 'rgb(255, 0, 0)' }, baseline: () => 'rgba(0, 0, 0, 0)', slots: [ '' ], calibration: cal, db, snapshot, log } );
	assert.equal( log.length, 3, 'one per tier of the final call, none from the first probe' );
} );
