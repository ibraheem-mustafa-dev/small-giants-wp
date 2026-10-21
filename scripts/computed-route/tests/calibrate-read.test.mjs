// Proves the calibration reader (lib/calibrate-read.mjs::readInstancesInPage) sees what the audit found it missing:
// elements past the 81st, ::before/::after layers, ::placeholder, and a panel the instance controls through
// aria-controls that lives outside it (a cart dialog moved to <body>). Runs in a local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { slotFor, WIDTHS } from '../lib/calibrate.mjs';
import { readInstancesInPage, openToggle, markTargetInPage, missedReason, readAll } from '../lib/calibrate-read.mjs';
import { READ_PROPS, PSEUDO_PROPS, CAL_PSEUDO_PROPS, CAL_EXTRA_PSEUDO_PROPS, TEXT_PSEUDO_PROPS } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

const HTML = `<style>
	.sgs-x__ring::after { content: ''; background-color: rgb(19, 87, 155); }
	.sgs-x__field::placeholder { color: rgb(1, 2, 3); }
	.sgs-x__panel-title { color: rgb(4, 5, 6); }
</style>
<div class="cr-ref-cal-0 sgs-x">
	<button class="sgs-x__toggle" aria-controls="panel-0" aria-expanded="false">Bag</button>
	<span class="sgs-x__ring">r</span>
	<input class="sgs-x__field" placeholder="Search">
	${ Array.from( { length: 90 }, ( _, i ) => `<i>${ i }</i>` ).join( '' ) }
	<b class="sgs-x__last">last</b>
</div>
<dialog id="panel-0" class="sgs-x__panel"><h2 class="sgs-x__panel-title">Your bag</h2></dialog>`;

test( 'MUST FAIL (dead: read cap, pseudo layer, controlled panel): the reader sees every element, layer and panel', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const [ els ] = await page.evaluate( readInstancesInPage, [ 1, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS ] );
		assert.ok( '.sgs-x__last' in els, 'an element past the 81st is read' );
		assert.equal( els[ '.sgs-x__ring::after' ]?.[ 'background-color' ], 'rgb(19, 87, 155)' );
		assert.equal( els[ '.sgs-x__field::placeholder' ]?.color, 'rgb(1, 2, 3)' );
		assert.equal( els[ '@controls > .sgs-x__panel-title' ]?.color, 'rgb(4, 5, 6)' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (nav-bar-menu "Element is not visible"): a panel toggle hidden at this width still opens its panel', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<button data-cr-toggle style="display:none" onclick="document.getElementById('p').hidden=false">menu</button><div id="p" hidden>panel</div>` );
		// The old step, a forced real click, throws on the hidden toggle.
		await assert.rejects( page.locator( '[data-cr-toggle]' ).first().click( { force: true, timeout: 2000 } ) );
		await openToggle( page );
		assert.equal( await page.locator( '#p' ).isVisible(), true );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (51 untested hover states): an opener outside the instance that controls it (aria-controls) is found and opens the hidden target', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<button id="opener" aria-controls="drawer-0" aria-expanded="false" onclick="document.getElementById('drawer-0').hidden=false;this.setAttribute('aria-expanded','true')">Menu</button>
			<nav class="cr-ref-cal-0" id="drawer-0" hidden><a class="sgs-x__item" href="#">Home</a></nav>
			<button id="other" aria-controls="drawer-9" aria-expanded="false">Another block's opener</button>` );
		const before = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] );
		assert.deepEqual( before, { visible: false, toggle: true }, 'the outside opener of this instance is the toggle' );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-toggle]' )?.id ), 'opener', 'never another instance\'s opener' );
		await openToggle( page );
		const after = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] );
		assert.equal( after.visible, true );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (triggerDetachBackgroundHover): a companion printed outside the root is targeted by its BEM prefix and shown through the fixture\'s companion class', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<style>.sgs-x__detach{display:none}.sgs-x__detach.is-detached{display:block;width:40px;height:40px}</style>
			<nav class="cr-ref-cal-0 sgs-x-0d52a6d2"><a class="sgs-x__item" href="#">Home</a></nav>
			<div class="sgs-x-0d52a6d2 sgs-x__detach"><button>chip</button></div>` );
		const without = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__detach-chip' ] );
		assert.equal( without.visible, false, 'no companion class: the companion is found and stays hidden, so the instance is reported missed' );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-target]' )?.className ), 'sgs-x-0d52a6d2 sgs-x__detach' );
		const shown = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__detach-chip', 'is-detached' ] );
		assert.equal( shown.visible, true );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-target]' )?.className ), 'sgs-x-0d52a6d2 sgs-x__detach is-detached', 'the companion, not the root, is the target' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (site-header background size/attachment read dead): the media layer ::before background-size, -position and -attachment are read and give the setting a slot on that layer', async () => {
	assert.ok( CAL_EXTRA_PSEUDO_PROPS.every( ( p ) => CAL_PSEUDO_PROPS.includes( p ) && ! PSEUDO_PROPS.includes( p ) ), 'the extras are new to the walker list' );
	assert.equal( new Set( CAL_PSEUDO_PROPS ).size, CAL_PSEUDO_PROPS.length );
	assert.ok( PSEUDO_PROPS.every( ( p ) => CAL_PSEUDO_PROPS.includes( p ) ) );
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<style>.cr-ref-cal-0::before{content:"";position:absolute;background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=);background-size:cover;background-attachment:fixed}</style><div class="cr-ref-cal-0">x</div>` );
		const [ els ] = await page.evaluate( readInstancesInPage, [ 1, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS ] );
		assert.equal( els[ '::before' ]?.[ 'background-size' ], 'cover' );
		assert.equal( els[ '::before' ]?.[ 'background-attachment' ], 'fixed' );
		const [ old ] = await page.evaluate( readInstancesInPage, [ 1, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS ] );
		assert.equal( old[ '::before' ]?.[ 'background-size' ], undefined, 'the walker list alone never reads it' );
	} finally {
		await browser.close();
	}
	// A reading that differs between the default and marked instance only in the layer's background-size yields a slot on the layer.
	const reads = ( size ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '': { 'background-size': 'auto' }, '::before': { 'background-size': size, 'background-attachment': 'scroll' } } ] ) );
	const slot = slotFor( { attr_name: 'backgroundSize', css_property: 'background-size', tier_shape: null }, { label: 'contain' }, reads( 'cover' ), reads( 'contain' ) );
	assert.equal( slot.dead, undefined );
	assert.equal( slot.slot, '::before' );
	assert.equal( slot.property, 'background-size' );
	assert.deepEqual( slotFor( { attr_name: 'backgroundSize', css_property: 'background-size', tier_shape: null }, { label: 'contain' }, reads( 'cover' ), reads( 'cover' ) ), { dead: true } );
} );

test( 'a missed state names each width\'s real failure; "stays hidden" only when every width was hidden', () => {
	assert.equal( missedReason( [ '375px: hidden', '768px: hidden', '1440px: hidden' ] ), 'the element stays hidden with its panel opened, so the state cannot be triggered' );
	const err = missedReason( [ '375px: locator.hover: Element is outside of the viewport', '768px: hidden' ] );
	assert.match( err, /^the state could not be triggered: 375px: locator\.hover: Element is outside of the viewport; 768px: hidden$/ );
	assert.equal( missedReason( [] ), 'the state could not be triggered' );
} );

test( 'MUST FAIL (stale toggle): marking a second instance leaves only its own panel toggle marked', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( [ 0, 1 ].map( ( n ) => `<div class="cr-ref-cal-${ n } sgs-x"><button class="sgs-x__toggle" aria-controls="p-${ n }" aria-expanded="false">Open</button><div id="p-${ n }" hidden><a class="sgs-x__link" href="#">Link</a></div></div>` ).join( '' ) );
		await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__link' ] );
		await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 1, '.sgs-x__link' ] );
		const marked = await page.evaluate( () => [ ...document.querySelectorAll( '[data-cr-toggle]' ) ].map( ( b ) => b.getAttribute( 'aria-controls' ) ) );
		assert.deepEqual( marked, [ 'p-1' ], 'openToggle clicks the first marked toggle, so an earlier instance\'s mark would open the wrong panel' );
	} finally {
		await browser.close();
	}
} );

// nav-bar-menu's caret-off parent with its own page (includes/nav-menu-markup.php): one link that is also its panel's
// trigger. Hover or keyboard focus opens the panel, ArrowDown enters it, and a mouse click follows the link.
const LINK_TRIGGER = `<a id="t" href="/elsewhere" aria-controls="p" aria-expanded="false" data-cr-toggle>Shop</a>
	<div id="p" hidden><a class="sgs-x__sublink" href="#">Sunglasses</a></div>
	<script>
		const t = document.getElementById( 't' );
		const open = () => { document.getElementById( 'p' ).hidden = false; t.setAttribute( 'aria-expanded', 'true' ); };
		t.addEventListener( 'focus', () => t.matches( ':focus-visible' ) && open() );
		t.addEventListener( 'keydown', ( e ) => 'ArrowDown' === e.key && ( e.preventDefault(), open() ) );
	</script>`;

test( 'MUST FAIL (nav-bar-menu 14 hover settings "no instance"): a link that is its panel\'s trigger opens the panel without leaving the page', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: route.request().url().endsWith( '/elsewhere' ) ? '<p>another page</p>' : LINK_TRIGGER } ) );
		await page.goto( 'http://cal.test/calibration' );
		await openToggle( page );
		await page.waitForTimeout( 300 );
		assert.equal( page.url(), 'http://cal.test/calibration', 'the calibration page is still loaded: a mouse click on the link would follow it, and every later instance on the page would read "no instance"' );
		assert.equal( await page.locator( '#p' ).isVisible(), true, 'the panel opened' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (a navigating trigger hides as "no instance"): once a trigger leaves the page, each later state instance names the page it went to', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		// Instance 0's own hover script follows a link; instance 1 is read after it on the same page.
		const cal = `<div class="cr-ref-cal-0" onmouseover="location.href='/elsewhere'">first</div><div class="cr-ref-cal-1">second</div>`;
		await page.context().route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: route.request().url().includes( '/elsewhere' ) ? '<p>another page</p>' : cal } ) );
		const hover = { trigger: 'hover', target: null, row: { css_state: 'hover' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ hover, hover ] );
		assert.deepEqual( reads.hoverMissed, [ 0, 1 ] );
		assert.match( missedReason( reads.hoverWhy[ 1 ] ), /an earlier trigger left the calibration page for http:\/\/cal\.test\/elsewhere/ );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (a link trigger that focus does not open): ArrowDown opens it, still without leaving the page', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		const arrowOnly = LINK_TRIGGER.replace( "t.addEventListener( 'focus', () => t.matches( ':focus-visible' ) && open() );", '' );
		assert.notEqual( arrowOnly, LINK_TRIGGER, 'the fixture lost its focus opener' );
		await page.route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: route.request().url().endsWith( '/elsewhere' ) ? '<p>another page</p>' : arrowOnly } ) );
		await page.goto( 'http://cal.test/calibration' );
		await openToggle( page );
		await page.waitForTimeout( 300 );
		assert.equal( page.url(), 'http://cal.test/calibration' );
		assert.equal( await page.locator( '#p' ).isVisible(), true, 'ArrowDown opened the panel' );
	} finally {
		await browser.close();
	}
} );
