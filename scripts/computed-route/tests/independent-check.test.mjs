// Proves sites/eye-care-ward-end/build/qa/independent-check.mjs::readPage does not count text that is hidden for
// everyone as painted (PA-4: screen-reader-only text counted as a found block, 9 Contact rows). Runs in a local
// headless Chromium; no site. Importing the module must not run the check (its main body is guarded).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CHECK = pathToFileURL( path.join( REPO, 'sites/eye-care-ward-end/build/qa/independent-check.mjs' ) ).href;

const HTML = `<style>
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px); clip-path: inset(50%); margin: -1px; }
	.parked { position: absolute; left: -9999px; top: 0; width: 200px; }
</style>
<main>
	<p id="shown">Visit our practice today</p>
	<span class="sr">Opening times for screen readers</span>
	<a class="parked" href="#c">Skip to the contact form</a>
	<p>Opening times for screen readers</p>
</main>`;

const ITEMS = [
	{ ref: 'shown', block: 'sgs/text', own: 'visit our practice today', texts: [], field: null },
	{ ref: 'sr', block: 'sgs/text', own: 'opening times for screen readers', texts: [], field: null },
	{ ref: 'parked', block: 'sgs/text', own: 'skip to the contact form', texts: [], field: null },
];

test( 'importing independent-check.mjs does not run the check', async () => {
	const mod = await import( CHECK );
	assert.equal( typeof mod.readPage, 'function' );
	assert.equal( typeof mod.compare, 'function' );
} );

test( 'MUST FAIL (PA-4): screen-reader-only text and a skip link parked at -9999px are not found; painted text is', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const rows = await page.evaluate( readPage, ITEMS );
		const byRef = Object.fromEntries( rows.map( ( r ) => [ r.ref, r ] ) );
		assert.equal( byRef.shown.found, true, 'painted text is found' );
		// "Opening times for screen readers" also appears in a painted paragraph: the item must resolve to that one, never the clipped span.
		assert.equal( byRef.sr.found, true );
		assert.ok( byRef.sr.box.w > 2 && byRef.sr.box.h > 2, 'the match is the painted paragraph, not the 1px clipped box' );
		assert.equal( byRef.parked.found, false, 'text parked off the left edge is not painted' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (PA-4): text that exists only in a screen-reader-only box is not found', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML.replace( '<p>Opening times for screen readers</p>', '' ) );
		const rows = await page.evaluate( readPage, ITEMS );
		assert.equal( rows.find( ( r ) => 'sr' === r.ref ).found, false );
		assert.equal( rows.find( ( r ) => 'shown' === r.ref ).found, true );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (Lenses eyebrow, 2026-10-07): text repeated in a trust bar outside main resolves to the page block in main', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 375, height: 700 } } );
		// The trust bar sits beside the header in the site's block wrapper, before <main> in document order.
		await page.setContent( `<div class="wp-site-blocks"><div class="trust-bar" style="display:flex;gap:8px;font-size:14px;white-space:nowrap">
				<span>100% genuine</span><span id="badge" style="margin-left:150px">Prescription lenses</span></div>
			<header><nav>Menu</nav></header>
			<main><p id="eyebrow" style="font-size:12.5px;margin:0">Prescription lenses</p></main></div>` );
		const rows = await page.evaluate( readPage, [ { ref: 'eyebrow', block: 'sgs/text', own: 'prescription lenses', texts: [], field: null } ] );
		assert.equal( rows[ 0 ].found, true );
		assert.equal( rows[ 0 ].font.size, 12.5, 'the match is the eyebrow in main, not the trust bar badge' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (Lenses button, 2026-10-07): a block whose own text another block\'s text starts with resolves to the exact match, not the earlier container of the words', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 768, height: 700 } } );
		await page.setContent( `<main><h3 style="margin:0">Choose a frame and tap Add my prescription.</h3>
			<a id="btn" href="/shop/" style="display:inline-block;width:180px;padding:12px 0">Choose a frame</a></main>` );
		const rows = await page.evaluate( readPage, [ { ref: 'btn', block: 'sgs/button', own: 'choose a frame', texts: [], field: null } ] );
		assert.equal( rows[ 0 ].found, true );
		assert.equal( Math.round( rows[ 0 ].box.w ), 180, 'the match is the button, not the step title that starts with its words' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (Lenses gap, 2026-10-08): a block with no gap and a flex gap of 0px paint alike; a real gap still differs', async () => {
	const { compare } = await import( CHECK );
	const row = ( gap ) => ( { ref: 'r', found: true, box: { x: 0, y: 0, w: 100, h: 40 }, inset: { top: 0, right: 0, bottom: 0, left: 0 }, ground: null, border: null, gap } );
	assert.deepEqual( compare( row( null ), row( '0px 0px' ), 375 ), [], 'block flow (null) and a zero flex gap are the same paint' );
	assert.deepEqual( compare( row( '0px 0px' ), row( null ), 375 ), [], 'either side may be the block-flow one' );
	const real = compare( row( null ), row( '16px 16px' ), 375 );
	assert.equal( real.length, 1 );
	assert.equal( real[ 0 ].prop, 'gap' );
	assert.equal( compare( row( '0px 16px' ), row( null ), 375 ).length, 1, 'a one-axis gap is still a gap' );
} );

// Contact, 2026-10-08: the draft's hours are "Hours" + "Mon–Sat 9.30–17.30<br>Collections by arrangement" in one div. A
// <br> separates words as a line break does; painted() ran "17.30" into "Collections", so the line was never found and
// the hours container fell back to its label, which pushed the "Hours" label onto a social card holding "hours".
test( 'MUST FAIL (Contact hours, 2026-10-08): a <br> separates words, so text after it is found', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 768, height: 700 } } );
		await page.setContent( `<main><div id="hrs"><div>Hours</div>Mon–Sat 9.30–17.30<br>Collections by arrangement</div>
			<a href="#g" style="display:block;border:1px solid #ccc;padding:18px">Google reviews &amp; hours</a></main>` );
		const rows = await page.evaluate( readPage, [
			{ ref: 'box', block: 'sgs/container', own: null, texts: [ 'hours', 'collections by arrangement' ], field: null },
			{ ref: 'label', block: 'sgs/text', own: 'hours', texts: [], field: null },
		] );
		assert.equal( rows[ 0 ].found, true );
		assert.ok( rows[ 0 ].box.h > 30, 'the container is the whole hours block, not its label' );
		assert.equal( rows[ 1 ].border, null, 'the label is the Hours label, not the bordered card' );
	} finally {
		await browser.close();
	}
} );

// A container's painted inset is measured to its rendered text; a skip link parked at -9999px inside it is text no one
// sees (Contact page containers read padding-left -9979px).
test( 'MUST FAIL (Contact page inset, 2026-10-08): text parked off the page does not count in a container\'s inset', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 768, height: 700 } } );
		await page.setContent( `<main><div style="padding:0 20px"><a href="#f" style="position:absolute;left:-9999px">Skip to the form</a>
			<p>Hello there</p><p>Second line</p></div></main>` );
		const rows = await page.evaluate( readPage, [ { ref: 'c', block: 'sgs/container', own: null, texts: [ 'hello there', 'second line' ], field: null } ] );
		assert.equal( rows[ 0 ].inset.left, 20 );
	} finally {
		await browser.close();
	}
} );

// Contact social cards, 2026-10-08: the draft's card is <a><span>Instagram</span>@eyecare.birmingham</a>; the card block
// claims the <a>, so the handle block's own words exist only as bare text inside a claimed element. They are measured
// as their own text run (the walker's paint.mjs::textRun), never reported as not found.
test( 'MUST FAIL (Contact cards, 2026-10-08): own words that are bare text inside a claimed element are measured as a text run', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 768, height: 700 } } );
		await page.setContent( `<main><a href="#ig" style="display:flex;flex-direction:column;width:300px;padding:16px;border:1px solid #ccc;font-size:14px"><span>Instagram</span>@eyecare.birmingham</a></main>` );
		const rows = await page.evaluate( readPage, [
			{ ref: 'card', block: 'sgs/container', own: null, texts: [ 'instagram', 'eyecare birmingham' ], field: null },
			{ ref: 'handle', block: 'sgs/text', own: 'eyecare birmingham', texts: [], field: null },
		] );
		assert.equal( rows[ 0 ].found, true );
		assert.equal( rows[ 1 ].found, true, 'the handle is measured as its own words' );
		assert.ok( rows[ 1 ].box.w < 300 && rows[ 1 ].box.h < 30, 'its box is the words, not the card' );
		assert.equal( rows[ 1 ].font.size, 14 );
	} finally {
		await browser.close();
	}
} );

test( 'a text run against an element compares where the words paint and their type, not the element\'s box or inset', async () => {
	const { compare } = await import( CHECK );
	const font = { size: 14, weight: '400', lineHeight: 21, letterSpacing: 'normal', color: 'rgb(20, 20, 20)', transform: 'none' };
	const run = { ref: 'h', found: true, run: true, box: { x: 10, y: 100, w: 120, h: 17 }, textBox: { x: 10, y: 100, w: 120, h: 17 }, inset: { top: 0, right: 0, bottom: 0, left: 0 }, ground: null, border: null, gap: null, font };
	const el = { ref: 'h', found: true, box: { x: 10, y: 98, w: 300, h: 21 }, textBox: { x: 10, y: 100, w: 120, h: 17 }, inset: { top: 2, right: 180, bottom: 2, left: 0 }, ground: null, border: null, gap: null, font };
	assert.deepEqual( compare( run, el, 768 ), [] );
	assert.deepEqual( compare( run, { ...el, textBox: { ...el.textBox, y: 120 } }, 768 ).map( ( x ) => x.prop ), [ 'text.y' ], 'negative control: moved words still differ' );
} );
