// Proves calibration reaches the shared viewport scrim (plugins/sgs-blocks/includes/helpers-scrim.php::sgs_scrim_render):
// the scrim is printed at wp_footer as a child of <body> carrying `<uid>-scrim`, outside the block's root, so the reader
// keys it `@scrim` (its tint layer `@scrim::before`); and the per-device tint strength and blur radius get markers.
// Runs in a local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor, slotFor, WIDTHS } from '../lib/calibrate.mjs';
import { readInstancesInPage } from '../lib/calibrate-read.mjs';
import { READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';
import { blockSchema } from '../lib/resolve.mjs';

const SNAPSHOT = { palette: [], spacing: [], fontSizes: [] };

// The scrim helper's own rule shape: blur on the scrim, the tint on its ::before with its own opacity.
const HTML = `<style>
	.sgs-nav-drawer-1a2b3c4d-scrim { position: fixed; inset: 0; opacity: 0; backdrop-filter: blur(7px); transition: opacity 250ms ease; }
	.sgs-nav-drawer-1a2b3c4d-scrim::before { content: ""; position: absolute; inset: 0; background: rgb(19, 87, 155); opacity: 0.37; }
	.sgs-nav-drawer-99999999-scrim { backdrop-filter: blur(1px); }
</style>
<div class="cr-ref-cal-0 sgs-nav-drawer sgs-nav-drawer-1a2b3c4d"><p class="sgs-nav-drawer__item">Home</p></div>
<div class="sgs-scrim sgs-nav-drawer-99999999-scrim" aria-hidden="true"></div>
<div class="sgs-scrim sgs-nav-drawer-1a2b3c4d-scrim" aria-hidden="true"></div>`;

test( 'MUST FAIL (dead: body-level scrim): the reader keys the instance\'s own scrim @scrim and its tint layer @scrim::before', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const [ els ] = await page.evaluate( readInstancesInPage, [ 1, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS ] );
		assert.equal( els[ '@scrim' ]?.[ 'backdrop-filter' ], 'blur(7px)', 'the blur is read on the instance\'s own scrim, not another instance\'s' );
		assert.equal( els[ '@scrim' ]?.[ 'transition-duration' ], '0.25s' );
		assert.equal( els[ '@scrim::before' ]?.opacity, '0.37' );
		assert.equal( els[ '@scrim::before' ]?.[ 'background-color' ], 'rgb(19, 87, 155)' );
		assert.ok( ! Object.keys( els ).some( ( k ) => k.startsWith( '@companion' ) ), 'the scrim is not also read as a companion' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (noMarker: per-device scrim settings): tint strength and blur radius get one value per tier', () => {
	const schema = blockSchema( 'sgs/nav-drawer' );
	const [ op ] = markersFor( { attr_name: 'scrimOpacity', css_property: 'opacity', tier_shape: 'tier_object' }, schema, SNAPSHOT );
	assert.deepEqual( op?.attrs, { scrimOpacity: { desktop: 0.37, tablet: 0.23, mobile: 0.07 } } );
	assert.deepEqual( op?.expect, { 1440: '0.37', 768: '0.23', 375: '0.07' } );
	const [ blur ] = markersFor( { attr_name: 'scrimBlur', css_property: 'backdrop-filter', tier_shape: 'tier_object' }, schema, SNAPSHOT );
	assert.deepEqual( blur?.attrs, { scrimBlur: { desktop: '37px', tablet: '23px', mobile: '7px' } } );
	assert.deepEqual( blur?.expect, { 1440: 'blur(37px)', 768: 'blur(23px)', 375: 'blur(7px)' } );
	// A per-device opacity still marks a flat opacity setting the old way.
	const [ flat ] = markersFor( { attr_name: 'scrimOpacity', css_property: 'opacity', tier_shape: null }, { scrimOpacity: { type: 'number' } }, SNAPSHOT );
	assert.equal( flat?.label, 'number' );
} );

test( 'a scrim blur marker read on @scrim is that setting\'s slot at every width', () => {
	const row = { attr_name: 'scrimBlur', css_property: 'backdrop-filter', tier_shape: 'tier_object' };
	const [ marker ] = markersFor( row, blockSchema( 'sgs/nav-drawer' ), SNAPSHOT );
	const px = { 1440: 37, 768: 23, 375: 7 };
	const def = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '@scrim': { 'backdrop-filter': 'none' } } ] ) );
	const mark = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '@scrim': { 'backdrop-filter': `blur(${ px[ w ] }px)` } } ] ) );
	const s = slotFor( row, marker, def, mark );
	assert.equal( s.slot, '@scrim' );
	assert.deepEqual( s.reachedAt, [ ...WIDTHS ].sort( ( a, b ) => a - b ) );
	assert.equal( s.oneWidth, false );
} );
