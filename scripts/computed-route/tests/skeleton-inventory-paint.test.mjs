// The inventory records what a box paints at each width (lib/skeleton-inventory.mjs::PAINT_INITIAL) and the draft's own
// `data-*` marks, so paint a stylesheet rule or a width query gives is seen where the style attribute says nothing
// (lib/skeleton-paint-conservation.mjs::paintsBox). A real browser reads a planted draft; no site, no draft server.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readInventory, RESOLVED, PAINT_INITIAL, NOT_DRAFT_DATA } from '../lib/skeleton-inventory.mjs';
import { paintsBox } from '../lib/skeleton-paint-conservation.mjs';

const HTML = `<!doctype html><html><head><style>
body { margin: 0 }
.card { background: rgb(245, 194, 200); border-bottom: 2px solid rgb(58, 42, 34); box-shadow: 4px 4px 0 rgb(0, 0, 0); max-width: 640px }
.plain { color: rgb(1, 2, 3) }
@media ( max-width: 480px ) { .phone { background-image: linear-gradient( red, blue ) } }
.centre { text-align: center }
.row { display: flex; gap: 8px }
@media ( max-width: 480px ) { .row { display: block } }
</style></head><body>
<div class="sc-host" data-sc-name="Root" data-dc-tpl="">
	<div data-dc-tpl="9"><main data-dc-tpl="1">
		<div data-dc-tpl="2" class="card" data-reveal="" data-tilt="6" data-sgs-skeleton-root="x">Card</div>
		<div data-dc-tpl="3" class="plain">Plain</div>
		<div data-dc-tpl="4" class="phone">Phone only</div>
		<div data-dc-tpl="5" class="centre"><p data-dc-tpl="6">Centred words</p></div>
		<div data-dc-tpl="7" class="row"><span data-dc-tpl="8">One</span><span data-dc-tpl="10">Two</span></div>
	</main></div>
</div></body></html>`;

let browser;
let inv;
before( async () => {
	browser = await chromium.launch( { headless: true } );
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( HTML );
	await page.evaluate( () => {
		window.__dcAnnotatedTemplate = () => '';
		window.__dcRootName = () => 'Root';
	} );
	inv = await readInventory( { page, root: 'main', settle: async () => {} } );
	await page.close();
} );
after( async () => {
	await browser?.close();
} );
const el = ( tpl ) => inv.elements.find( ( e ) => e.tpl === tpl || String( e.tpl ) === String( tpl ) );

test( 'a painted box records its paint at every width, and only the paint it has', () => {
	const card = el( 2 );
	for ( const w of [ 375, 768, 1440 ] ) {
		const r = card.resolved[ w ];
		assert.equal( r[ 'background-color' ], 'rgb(245, 194, 200)' );
		assert.equal( r[ 'border-bottom-width' ], '2px' );
		assert.match( r[ 'box-shadow' ], /4px 4px 0px/ );
		assert.equal( r[ 'max-width' ], '640px' );
		assert.ok( ! ( 'border-top-width' in r ) && ! ( 'background-image' in r ), 'a paint property at its initial value is not recorded' );
		assert.ok( RESOLVED.every( ( n ) => n in r ), 'the dense values are all there' );
	}
	assert.deepEqual( Object.keys( paintsBox( card ) ).sort(), [ 'background', 'border', 'max-width', 'shadow' ] );
} );

test( 'a box that paints nothing records no paint property (negative control)', () => {
	const plain = el( 3 );
	assert.ok( Object.keys( PAINT_INITIAL ).every( ( n ) => ! ( n in plain.resolved[ 1440 ] ) ) );
	assert.deepEqual( paintsBox( plain ), {} );
} );

test( 'paint a width query gives is recorded at that width only: the style attribute alone would miss it (MUST FAIL without the paint read)', () => {
	const phone = el( 4 );
	assert.match( phone.resolved[ 375 ][ 'background-image' ], /linear-gradient/ );
	assert.ok( ! ( 'background-image' in phone.resolved[ 768 ] ) && ! ( 'background-image' in phone.resolved[ 1440 ] ) );
	assert.deepEqual( paintsBox( phone ), { background: [ 375 ] } );
	assert.equal( phone.attrs.style, undefined, 'the element has no style attribute at all' );
} );

test( 'text alignment is recorded for every element, so an inherited centre counts on the element that sets it', () => {
	const wrap = el( 5 );
	const words = el( 6 );
	assert.equal( wrap.resolved[ 1440 ][ 'text-align' ], 'center' );
	assert.equal( words.resolved[ 1440 ][ 'text-align' ], 'center' );
	assert.deepEqual( paintsBox( wrap, { parent: el( 1 ) } ), { 'text-centre': [ 375, 768, 1440 ] } );
	assert.deepEqual( paintsBox( words, { parent: wrap } ), {} );
} );

test( 'the draft\'s own data marks are kept; the runtime\'s stamps and the route\'s are not', () => {
	assert.deepEqual( el( 2 ).data, { reveal: '', tilt: '6' } );
	assert.equal( el( 3 ).data, undefined, 'an element with no mark of the draft\'s carries no data field' );
	assert.ok( NOT_DRAFT_DATA.test( 'data-dc-tpl' ) && NOT_DRAFT_DATA.test( 'data-sc-name' ) && NOT_DRAFT_DATA.test( 'data-sgs-skeleton-root' ) && NOT_DRAFT_DATA.test( 'data-inv-i' ) && ! NOT_DRAFT_DATA.test( 'data-reveal' ) );
} );

test( 'display is recorded at each width, and a box lays its children out only where it is flex or grid (MUST FAIL where the 1440 display stands for every width)', () => {
	const row = el( 7 );
	assert.deepEqual( row.displayAt, { 375: 'block', 768: 'flex', 1440: 'flex' } );
	assert.equal( row.display, 'flex', 'the 1440 display stays as it was for every other reader' );
	assert.deepEqual( paintsBox( row, { children: 2 } ), { layout: [ 768, 1440 ] } );
	// Negative control: a saved inventory without per-width display keeps the one display at every width.
	const { displayAt, ...saved } = row;
	assert.deepEqual( paintsBox( saved, { children: 2 } ), { layout: [ 375, 768, 1440 ] } );
} );
