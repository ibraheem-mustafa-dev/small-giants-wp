// Proves the calibration reader (lib/calibrate-read.mjs::readInstancesInPage) sees what the audit found it missing:
// elements past the 81st, ::before/::after layers, ::placeholder, and a panel the instance controls through
// aria-controls that lives outside it (a cart dialog moved to <body>). Runs in a local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { slotFor, WIDTHS } from '../lib/calibrate.mjs';
import { readInstancesInPage, openToggle, markTargetInPage, markOpenedTarget, missedReason, readAll, editorNoticeOnlyInPage, missingDependencyReason } from '../lib/calibrate-read.mjs';
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

test( 'MUST FAIL (account hover read at the root centre): a named target that matches nothing is reported missing, never the root', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<nav class="cr-ref-cal-0"><a class="sgs-x__item" href="#">Home</a></nav>` );
		const miss = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__menu-link' ] );
		assert.deepEqual( miss, { visible: false, toggle: false, missing: true } );
		assert.equal( await page.evaluate( () => document.querySelectorAll( '[data-cr-target]' ).length ), 0, 'nothing is marked, so nothing is hovered' );
		const hit = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] );
		assert.equal( hit.visible, true, 'control: a selector that matches marks its element' );
		const root = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, null ] );
		assert.equal( root.visible, true, 'control: no selector targets the root' );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-target]' )?.className ), 'cr-ref-cal-0' );
	} finally {
		await browser.close();
	}
	assert.match( missedReason( [ '375px: no element matches .sgs-x__menu-link', '768px: no element matches .sgs-x__menu-link' ] ), /^no element in the instance matches \.sgs-x__menu-link: the block\.json element needs/ );
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

test( 'MUST FAIL (iconColourHover dead on one site only): a hover target under a fixed banner is moved clear of it before the mouse hovers', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		// Instance 1 sits fully inside the viewport, under a fixed footer banner, so scrollIntoViewIfNeeded leaves it there.
		const cal = `<style>body{margin:0}.cr-ref-cal-1:hover{color:rgb(19, 87, 155)}#banner{position:fixed;left:0;right:0;bottom:0;height:120px;background:#fff}</style>
			<div class="cr-ref-cal-0">default</div><div style="height:calc(100vh - 80px)"></div><div class="cr-ref-cal-1" style="height:30px">marked</div><div style="height:2000px"></div><div id="banner">banner</div>`;
		await page.context().route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: cal } ) );
		const hover = { trigger: 'hover', target: null, row: { css_state: 'hover' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ { isDefault: true }, hover ] );
		for ( const w of WIDTHS ) {
			assert.equal( reads[ w ][ 1 ][ '' ].color, 'rgb(19, 87, 155)', `the hover read at ${ w }px` );
		}
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

// sgs/nav-bar-menu itemColourOpen (includes/nav-menu-css.php): the item link's colour while its own panel trigger is
// aria-expanded="true"; the fixture renders every trigger shut, and a burger whose drawer sits outside the instance
// comes first.
const OPEN_ITEM = `<style>.cr-ref-cal-1 .sgs-x__item:has(> [aria-expanded="true"]) > .sgs-x__link{color:rgb(19, 87, 155)}</style>
	<div class="cr-ref-cal-0"><button aria-controls="d0" aria-expanded="false">Menu</button><div class="sgs-x__item"><a class="sgs-x__link" href="#" aria-controls="p0" aria-expanded="false">Shop</a><div id="p0" hidden>panel</div></div></div>
	<div class="cr-ref-cal-1"><button id="b1" aria-controls="d1" aria-expanded="false">Menu</button><div class="sgs-x__item"><a class="sgs-x__link" href="#" aria-controls="p1" aria-expanded="false">Shop</a><div id="p1" hidden>panel</div></div></div>
	<div id="d0" hidden>drawer</div><div id="d1" hidden>drawer</div>`;

test( 'MUST FAIL (itemColourOpen dead): an open-state instance is read with its own panel trigger open, never the burger\'s drawer', async () => {
	const { chromium } = await import( 'playwright' );
	const { triggerFor } = await import( '../lib/calibrate.mjs' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		await page.context().route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: OPEN_ITEM } ) );
		const open = { trigger: triggerFor( 'open' ), target: null, row: { css_state: 'open' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ { isDefault: true }, open ] );
		for ( const w of WIDTHS ) {
			const link = Object.entries( reads[ w ][ 1 ] ).find( ( [ k ] ) => k.endsWith( '.sgs-x__link' ) );
			assert.equal( link?.[ 1 ].color, 'rgb(19, 87, 155)', `the open read at ${ w }px` );
			assert.notEqual( reads[ w ][ 0 ][ Object.keys( reads[ w ][ 0 ] ).find( ( k ) => k.endsWith( '.sgs-x__link' ) ) ].color, 'rgb(19, 87, 155)', 'the default instance stays shut' );
		}
	} finally {
		await browser.close();
	}
} );

// sgs/nav-drawer-menu rows (includes/nav-drawer-menu-items.php): <details><summary> with no aria-controls or
// aria-expanded; the open look keys on details[open].
const DRAWER_ROW = ( openAttr ) => `<li class="sgs-x__row"><details class="sgs-x__accordion"${ openAttr }><summary class="sgs-x__summary">Shop</summary><ul><li>Sunglasses</li></ul></details></li>`;
const OPEN_COLOUR = 'rgb(19, 87, 155)';
const openFixture = ( inner1 ) => `<style>.cr-ref-cal-1 details[open] > summary,.cr-ref-cal-1 [aria-expanded="true"]{color:${ OPEN_COLOUR }}</style>
	<div class="cr-ref-cal-0">${ DRAWER_ROW( '' ) }</div><div class="cr-ref-cal-1">${ inner1 }</div>`;

async function readOpen( body ) {
	const { chromium } = await import( 'playwright' );
	const { triggerFor } = await import( '../lib/calibrate.mjs' );
	const { markOpenToggleInPage, openOwnToggle } = await import( '../lib/calibrate-open.mjs' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		await page.context().route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body } ) );
		const open = { trigger: triggerFor( 'open' ), target: null, row: { css_state: 'open' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ { isDefault: true }, open ] );
		// The same open and close the reader runs, on a fresh page, to see what it leaves behind.
		await page.goto( 'http://cal.test/calibration' );
		const mark = await page.evaluate( markOpenToggleInPage, [ 'cr-ref-cal-', 1 ] );
		const close = mark.toggle ? await openOwnToggle( page, openToggle ) : null;
		close && await close();
		const after = await page.evaluate( () => ( { details: [ ...document.querySelectorAll( 'details' ) ].map( ( d ) => d.open ), aria: [ ...document.querySelectorAll( '[aria-expanded]' ) ].map( ( b ) => b.getAttribute( 'aria-expanded' ) ), panelHidden: document.getElementById( 'p1' )?.hidden } ) );
		return { reads, after };
	} finally {
		await browser.close();
	}
}
const summaryColour = ( r ) => Object.entries( r ).find( ( [ k ] ) => k.endsWith( '.sgs-x__summary' ) )?.[ 1 ].color;

test( 'MUST FAIL (drawer itemColourOpen read at rest): a details-only instance is opened by its summary and closed again afterwards', async () => {
	const { reads, after } = await readOpen( openFixture( DRAWER_ROW( '' ) ) );
	for ( const w of WIDTHS ) {
		assert.equal( summaryColour( reads[ w ][ 1 ] ), OPEN_COLOUR, `the open read at ${ w }px` );
	}
	assert.deepEqual( after.details, [ false, false ], 'the details is shut again after the read' );
} );

test( 'MUST FAIL (details[open] invisible): an instance saved open is read as it is, with no closed toggle opened beside it', async () => {
	const inner = DRAWER_ROW( ' open' ) + '<button class="sgs-x__other" aria-controls="p1" aria-expanded="false">More</button><div id="p1" hidden>panel</div>';
	const { reads } = await readOpen( openFixture( inner ) );
	for ( const w of WIDTHS ) {
		assert.equal( summaryColour( reads[ w ][ 1 ] ), OPEN_COLOUR, `the expanded read at ${ w }px` );
	}
	const { chromium } = await import( 'playwright' );
	const { markOpenToggleInPage } = await import( '../lib/calibrate-open.mjs' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( openFixture( inner ) );
		assert.deepEqual( await page.evaluate( markOpenToggleInPage, [ 'cr-ref-cal-', 1 ] ), { expanded: true } );
		assert.equal( await page.locator( '[data-cr-toggle]' ).count(), 0, 'nothing is marked for opening' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (a rest read counted as measured): an instance with no disclosure is a reported miss', async () => {
	const { reads } = await readOpen( openFixture( '<a class="sgs-x__summary" href="#">Shop</a>' ) );
	assert.deepEqual( reads.hoverMissed, [ 1 ] );
	assert.match( missedReason( reads.hoverWhy[ 1 ] ), /no disclosure to open/ );
} );

test( 'MUST FAIL (forced aria-expanded left behind): a toggle whose handler never opens is forced open for the read, then set back', async () => {
	const dead = '<button class="sgs-x__summary" aria-controls="p1" aria-expanded="false">Shop</button><div id="p1" hidden>panel</div>';
	const { reads, after } = await readOpen( openFixture( dead ) );
	for ( const w of WIDTHS ) {
		assert.equal( summaryColour( reads[ w ][ 1 ] ), OPEN_COLOUR, `the forced read at ${ w }px` );
	}
	assert.deepEqual( after.aria, [ 'false' ], 'aria-expanded is false again' );
} );

test( 'MUST FAIL (Escape does not close a details): a toggle whose handler opens it and ignores Escape is clicked shut', async () => {
	const sticky = `<button class="sgs-x__summary" id="t1" aria-controls="p1" aria-expanded="false">Shop</button><div id="p1" hidden>panel</div>
		<script>t1.addEventListener( 'click', () => { const o = 'true' === t1.getAttribute( 'aria-expanded' ); t1.setAttribute( 'aria-expanded', String( ! o ) ); p1.hidden = o; } );</script>`;
	const { reads, after } = await readOpen( openFixture( sticky ) );
	for ( const w of WIDTHS ) {
		assert.equal( summaryColour( reads[ w ][ 1 ] ), OPEN_COLOUR, `the open read at ${ w }px` );
	}
	assert.deepEqual( after.aria, [ 'false' ] );
	assert.equal( after.panelHidden, true, 'the panel is shut, not just its attribute' );
} );

test( 'MUST FAIL (forced details left open): a summary whose click is cancelled is forced open for the read, then shut', async () => {
	const stuck = '<details class="sgs-x__accordion"><summary class="sgs-x__summary" onclick="event.preventDefault()">Shop</summary><ul><li>Sunglasses</li></ul></details>';
	const { reads, after } = await readOpen( openFixture( stuck ) );
	for ( const w of WIDTHS ) {
		assert.equal( summaryColour( reads[ w ][ 1 ] ), OPEN_COLOUR, `the forced read at ${ w }px` );
	}
	assert.deepEqual( after.details, [ false, false ] );
} );

test( 'MUST FAIL (wishlist rows never read): a pass with a settle selector waits for it before reading, so content a script builds after load is read', async () => {
	const fs = await import( 'node:fs' );
	const os = await import( 'node:os' );
	const path = await import( 'node:path' );
	const { chromium } = await import( 'playwright' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cal-settle-' ) );
	const file = path.join( dir, 'p.html' );
	fs.writeFileSync( file, '<div class="cr-ref-cal-0"><p>rest</p></div><script>setTimeout(()=>{const s=document.createElement("span");s.className="sgs-x__late";s.textContent="row";document.querySelector(".cr-ref-cal-0").append(s);},1500)</script>' );
	const url = 'file:///' + file.split( path.sep ).join( '/' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		const has = ( r ) => Object.keys( r[ 1440 ]?.[ 0 ] || {} ).some( ( k ) => k.includes( 'late' ) );
		const early = await readAll( page, url, [ { isDefault: true } ] );
		assert.equal( has( early ), false, 'control: without a settle selector the read comes before the row' );
		const settled = await readAll( page, url, [ { isDefault: true } ], { settle: '.sgs-x__late' } );
		assert.equal( has( settled ), true, 'the settled read includes the row' );
	} finally {
		await browser.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL (wishlist sgsHideOnDesktop read dead at random): a pass with settleGone waits until no element matches it, so a block its script unhides is read shown', async () => {
	const fs = await import( 'node:fs' );
	const os = await import( 'node:os' );
	const path = await import( 'node:path' );
	const { chromium } = await import( 'playwright' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cal-gone-' ) );
	const file = path.join( dir, 'p.html' );
	fs.writeFileSync( file, '<div class="cr-ref-cal-0 sgs-x" hidden><p>rest</p></div><script>setTimeout(()=>{document.querySelector(".sgs-x").hidden=false;},1500)</script>' );
	const url = 'file:///' + file.split( path.sep ).join( '/' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		const display = ( r ) => r[ 1440 ]?.[ 0 ]?.[ '' ]?.display;
		assert.equal( display( await readAll( page, url, [ { isDefault: true } ] ) ), 'none', 'control: read before the script unhides it' );
		assert.equal( display( await readAll( page, url, [ { isDefault: true } ], { settleGone: '.sgs-x[hidden]' } ) ), 'block' );
	} finally {
		await browser.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL (cart checkout hover missed on a slow mirror): an opened panel whose target fills in after a slow fetch is waited for, not read as hidden', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		// The panel opens at once, its footer shows 1.5s later (a cart panel waits for the basket fetch).
		await page.setContent( `<div class="cr-ref-cal-0"><button aria-controls="p" aria-expanded="false" data-cr-toggle onclick="setTimeout(()=>document.querySelector('.sgs-x__checkout').hidden=false,1500)">Bag</button>
			<div id="p"><a class="sgs-x__checkout" href="#" hidden>Checkout</a></div></div>` );
		await openToggle( page );
		const mark = await markOpenedTarget( page, [ 'cr-ref-cal-', 0, '.sgs-x__checkout', null ] );
		assert.equal( mark.visible, true, 'the target is read once it shows' );
		const never = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__absent', null ] );
		assert.equal( never.missing, true );
		const gone = await markOpenedTarget( page, [ 'cr-ref-cal-', 0, '.sgs-x__absent', null ], 300 );
		assert.equal( gone.missing, true, 'a selector that matches nothing returns at once' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (account on a mirror without WooCommerce): instances holding only an editor notice are named as a missing dependency', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<div class="cr-ref-cal-0 sgs-account"><p class="sgs-account__editor-notice">sgs/account needs  WooCommerce active.</p></div><div class="cr-ref-cal-1 sgs-account"><p class="sgs-account__editor-notice">sgs/account needs WooCommerce active.</p></div>` );
		const text = await page.evaluate( editorNoticeOnlyInPage, [ 'cr-ref-cal-', 2 ] );
		assert.equal( text, 'sgs/account needs WooCommerce active.' );
		assert.equal( missingDependencyReason( 'sgs/account', 'local-indus', text ), 'sgs/account rendered only its editor notice on local-indus (sgs/account needs WooCommerce active.): a dependency is missing there; calibrate it on a mirror that has it' );
		await page.setContent( `<div class="cr-ref-cal-0 sgs-account__editor-notice">root is the notice</div>` );
		assert.equal( await page.evaluate( editorNoticeOnlyInPage, [ 'cr-ref-cal-', 1 ] ), 'root is the notice' );
	} finally {
		await browser.close();
	}
} );

test( 'control: a block rendering real content, an empty root, or content beside a notice is not a missing dependency', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		const check = async ( html ) => { await page.setContent( html ); return page.evaluate( editorNoticeOnlyInPage, [ 'cr-ref-cal-', 1 ] ); };
		assert.equal( await check( '<div class="cr-ref-cal-0"><nav class="sgs-account__nav">Orders</nav></div>' ), null );
		assert.equal( await check( '<div class="cr-ref-cal-0"></div>' ), null );
		assert.equal( await check( '<div class="cr-ref-cal-0"><p class="sgs-x__editor-notice">n</p><nav>Orders</nav></div>' ), null );
		assert.equal( missingDependencyReason( 'b', 's', null ), null );
	} finally {
		await browser.close();
	}
} );
