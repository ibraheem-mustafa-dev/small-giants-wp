// Proves three calibration-to-Fill gaps closed (Track R lane R12c):
// 1. A block's own paint of an inherited property (a button's `line-height: 1.2`) is read by calibration
//    (lib/calibrate-read.mjs::readInstancesInPage, `_own:<prop>` beside `_fs`) and Fill's baseline prefers it over the
//    parent's value (lib/fill-resolve-state.mjs::baselineFn), so a draft line height equal to the parent's is written.
// 2. Two elements of one node writing one setting with different values make a conflict row, never a silent overwrite
//    (lib/fill-resolve-element.mjs::ownerKeeps); the element the setting sits on wins over a value carried from another.
// 3. A state instance's look is recorded as values (lib/calibrate-instances.mjs::stateLook), so a default hover equal
//    to the fixture's resting colour is still held.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { readInstancesInPage } from '../lib/calibrate-read.mjs';
import { READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, INHERITED, OWN_INHERITED, READ_KEY } from '../lib/calibrate-props.mjs';
import { slotFor } from '../lib/calibrate.mjs';
import { baselineFn, ownPaint } from '../lib/fill-resolve-state.mjs';
import { ownerKeeps, recordOwner, clashes } from '../lib/fill-resolve-element.mjs';
import { stateLook } from '../lib/calibrate-instances.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

// A body line height of 1.55 over a block whose own rule sets 1.2 on its root; its label inherits the root's; a second
// element sets only a larger font size, so it carries the parent's ratio and paints no line height of its own.
const HTML = `<style>
	body { font-size: 16px; line-height: 1.55; color: rgb(10, 20, 30); }
	.sgs-b { display: inline-flex; font-size: 17px; line-height: 1.2; }
	.sgs-t { font-size: 20px; }
</style>
<div class="cr-ref-cal-0 sgs-b"><span class="sgs-b__label">Register</span></div>
<div class="cr-ref-cal-1 sgs-b"><span class="sgs-b__label">Register</span></div>
<p class="cr-ref-cal-2 sgs-t">Text</p>`;

test( 'MUST FAIL (Register label 20.4px against 26.35px): the reader records a block\'s own paint of an inherited property on default instances only', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const [ def, marked, text ] = await page.evaluate( readInstancesInPage, [ 3, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, undefined, OWN_INHERITED, [ 0, 2 ] ] );
		assert.equal( def[ '' ][ '_own:line-height' ], '20.4px', 'the root sets its own line height' );
		assert.equal( def[ '' ][ '_fs' ], '17px' );
		assert.equal( def[ '' ][ '_own:font-size' ], '17px' );
		assert.equal( def[ '' ][ '_own:color' ], undefined, 'an inherited colour is not the block\'s own' );
		assert.equal( def[ '.sgs-b__label' ][ '_own:line-height' ], undefined, 'the label inherits the root\'s' );
		assert.equal( text[ '' ][ '_own:line-height' ], undefined, 'a ratio carried to a larger font size is inherited, not own' );
		assert.equal( text[ '' ][ '_own:font-size' ], '20px' );
		assert.ok( ! Object.keys( marked[ '' ] ).some( ( k ) => k.startsWith( '_own:' ) ), 'a marked instance carries no own key the slot finder could take as a change' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: the read key covers the own-paint list, so every cache read without it re-measures', () => {
	const old = createHash( 'md5' ).update( JSON.stringify( [ READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, INHERITED ] ) ).digest( 'hex' ).slice( 0, 12 );
	assert.notEqual( READ_KEY, old );
	assert.deepEqual( OWN_INHERITED, INHERITED );
} );

// A node under a parent showing the draft's 26.35px (17px x 1.55). The own reading is cache/button.json's
// (discovered.inheritStyle: font-size 17px, line-height 20.4px on the root, the block's `line-height: 1.2`).
function state() {
	return {
		page: () => ( { own: () => false, value: () => undefined } ),
		flat: [ { attributes: {} }, { attributes: {} } ],
		nodes: [ { index: 0, parent: null }, { index: 1, parent: 0 } ],
		shown: new Map( [ [ '0|line-height', { 768: '26.35px' } ], [ '0|font-size', { 768: '17px' } ] ] ),
	};
}
const BUTTON = { elements: { '': { 768: { '_own:line-height': '20.4px', _fs: '17px' } } } };

test( 'MUST FAIL (cr-ref-header-15 judged equal at 768): the baseline of an inherited property is the block\'s own paint where calibration recorded one', () => {
	const st = state();
	const rec = st.nodes[ 1 ];
	assert.equal( baselineFn( st, rec, BUTTON, 'line-height', () => 17 )( '', 768 ), '20.4px' );
	assert.equal( baselineFn( st, rec, BUTTON, 'line-height', () => 15 )( '', 768 ), '18px', 'carried as its ratio to the element\'s own font size' );
	assert.equal( ownPaint( BUTTON, '', 768, 'line-height' ), '20.4px', 'no font size given: the recorded value' );
	// Where the element inherits (no own reading), the parent's value as before.
	assert.equal( baselineFn( st, rec, BUTTON, 'line-height', () => 17 )( '.sgs-button__label', 768 ), '26.35px' );
	assert.equal( baselineFn( st, rec, { elements: {} }, 'line-height', () => 17 )( '', 768 ), '26.35px' );
} );

// Two targets of one node: the root (`''`, display block, its gap paints nothing) and the inner element the gap
// setting sits on. Both carry their column-gap to the one `gap` setting.
const GAP = '.sgs-container__inner';
function gapState() {
	return { flat: [ { attributes: {} } ], out: { unmapped: [] } };
}
const write = ( st, target, prop, value ) => {
	const rec = { index: 0, name: 'sgs/x' };
	const w = { attr: 'gap', value };
	const keep = ownerKeeps( st, rec, 'r', { slot: target }, prop, w, GAP );
	if ( keep ) {
		st.flat[ 0 ].attributes.gap = value;
		recordOwner( st, rec, { slot: target }, prop, 'gap', target === GAP );
	}
	return keep;
};

test( 'MUST FAIL (cr-ref-header-1 gap overwritten at 375): two elements writing one setting differently make a conflict row naming both', () => {
	// Carried first, then the element the setting sits on: the second replaces it and the first is named.
	const a = gapState();
	assert.equal( write( a, '', 'column-gap', { mobile: '0px', desktop: '12px' } ), true );
	assert.equal( write( a, '', 'row-gap', { mobile: '0px', desktop: '12px' } ), true, 'the same value again leaves column-gap its writer' );
	assert.equal( write( a, GAP, 'column-gap', { mobile: '12px', desktop: '12px' } ), true );
	assert.deepEqual( a.flat[ 0 ].attributes.gap, { mobile: '12px', desktop: '12px' } );
	assert.equal( a.out.unmapped.length, 1 );
	assert.match( a.out.unmapped[ 0 ].reason, /^conflict: gap \(one setting, two elements\): column-gap \{"mobile":"0px","desktop":"12px"\} read on the root differs from column-gap \{"mobile":"12px","desktop":"12px"\} read on \.sgs-container__inner at mobile; the setting keeps the value of the element it sits on$/ );
	// The other order: the carried value is refused, the setting keeps the inner element's.
	const b = gapState();
	assert.equal( write( b, GAP, 'column-gap', { mobile: '12px', desktop: '12px' } ), true );
	assert.equal( write( b, '', 'row-gap', { mobile: '0px', desktop: '12px' } ), false );
	assert.deepEqual( b.flat[ 0 ].attributes.gap, { mobile: '12px', desktop: '12px' } );
	assert.equal( b.out.unmapped[ 0 ].slot, '' );
	// Two carried values: the first stays, the second is the row.
	const c = gapState();
	assert.equal( write( c, '', 'column-gap', { mobile: '0px' } ), true );
	assert.equal( write( c, '.sgs-other', 'column-gap', { mobile: '8px' } ), false );
	assert.match( c.out.unmapped[ 0 ].reason, /keeps the first value$/ );
	// Agreeing values, or the same element writing again, are no conflict.
	const d = gapState();
	write( d, '', 'column-gap', { mobile: '12px' } );
	assert.equal( write( d, GAP, 'row-gap', { mobile: '12px', desktop: '4px' } ), true );
	assert.equal( write( d, GAP, 'column-gap', { mobile: '6px' } ), true );
	assert.equal( d.out.unmapped.length, 0 );
	assert.deepEqual( clashes( { tablet: { top: '1px' } }, { tablet: { top: '2px', left: '0px' } } ), [ 'tablet.top' ] );
	assert.deepEqual( clashes( '4px', '6px' ), [ 'every tier' ] );
} );

test( 'MUST FAIL (nav link hover equal to the fixture\'s resting colour): a state instance\'s look is recorded as values', () => {
	const PRIMARY = 'rgb(10, 126, 168)';
	const MARK = 'rgb(19, 87, 155)';
	const rest = { 375: { '': { color: PRIMARY, 'background-color': 'rgba(0, 0, 0, 0)' } } };
	const hover = { 375: { '': { color: PRIMARY, 'background-color': MARK } } };
	// The change-based reading sees the marker only: the default hover colour equals the resting one.
	const s = slotFor( { css_property: 'background-color', tier_shape: 'scalar' }, { expect: { 375: MARK } }, rest, hover );
	assert.ok( ! ( s.effects || [] ).includes( '|color' ) );
	const look = stateLook( hover, [ '' ], [ 'background-color' ] );
	assert.deepEqual( look[ '' ].color, { 375: PRIMARY } );
	assert.equal( look[ '' ][ 'background-color' ], undefined, 'the setting\'s own marker is not its look' );
} );
