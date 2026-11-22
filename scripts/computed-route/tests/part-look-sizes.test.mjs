// Part-look's stated sizes (shop investigation F-15, lib/fill-part-look.mjs::statedSize): a min-height setting takes the draft's declared
// height (a pay button drawn `height:66px`), a max-width setting whose draft max-width is a viewport cap takes the declared width
// (`width:440px;max-width:100vw`, 100% where the width is the whole viewport), a width setting takes the element's track of a two-track
// grid whose declared columns hold a fraction (`1.35fr 1fr`, measured in the page), and a button's browser padding (1px 6px) the draft
// never states is not written. Planted rows and readings, and one planted page for the in-page reads: no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-sizes.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { READ_PROPS, buildLook, findPartsInPage } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const BASE = Object.fromEntries( READ_PROPS.map( ( p ) => [ p, /-width$|^margin|^padding|radius$|-gap$/.test( p ) ? '0px' : '' ] ) );
const el = ( styles = {} ) => ( { key: 'k', tag: 'div', text: 'x', styles: { ...BASE, ...styles } } );
const at = ( byWidth ) => Object.fromEntries( Object.entries( byWidth ).map( ( [ w, styles ] ) => [ w, [ el( styles ) ] ] ) );
const all = ( styles ) => at( { 1440: styles, 768: styles, 375: styles } );
const row = ( attr, property, part, extra = {} ) => ( { attr_name: attr, attr_type: 'object', css_property: property, css_element: part, css_state: null, css_tier: null, is_responsive: 1, tier_shape: 'tier_object', enum_values: null, default_value: null, ...extra } );
const run = ( rows, reads ) => buildLook( { block: 'woocommerce/checkout', rows, names: rows.map( ( r ) => r.attr_name ), locators: { anchors: {}, parts: Object.fromEntries( rows.map( ( r ) => [ r.css_element, { from: 'page', match: {} } ] ) ) }, reads } );
const writeOf = ( out, attr ) => out.writes.find( ( w ) => w.attr === attr );

test( 'MUST FAIL: a min-height setting takes the height the draft declares when it declares no min-height', () => {
	const out = run( [ row( 'aButtonMinHeight', 'min-height', 'button' ) ], { button: all( { height: '66px', 'min-height': '0px', 'decl:height': '66px' } ) } );
	assert.deepEqual( writeOf( out, 'aButtonMinHeight' ).value, { desktop: '66px' } );
} );

test( 'negative control: a declared min-height wins over the height, and a height in another unit is no size the setting reads', () => {
	const own = run( [ row( 'aButtonMinHeight', 'min-height', 'button' ) ], { button: all( { height: '66px', 'min-height': '56px', 'decl:min-height': '56px', 'decl:height': '66px' } ) } );
	assert.deepEqual( writeOf( own, 'aButtonMinHeight' ).value, { desktop: '56px' } );
	const em = run( [ row( 'aButtonMinHeight', 'min-height', 'button' ) ], { button: all( { height: '48px', 'decl:height': '3em' } ) } );
	assert.equal( writeOf( em, 'aButtonMinHeight' ), undefined );
	const none = run( [ row( 'aButtonMinHeight', 'min-height', 'button' ) ], { button: all( { height: '66px' } ) } );
	assert.equal( none.settings.aButtonMinHeight.code, 'undeclared' );
} );

test( 'MUST FAIL: a max-width setting whose draft max-width is a viewport cap takes the declared width, and 100% where the width is the whole viewport', () => {
	const wide = { 'max-width': '100vw', 'decl:max-width': '100vw', 'decl:width': '440px', width: '440px' };
	const out = run( [ row( 'panelMaxWidth', 'max-width', 'panel' ) ], { panel: at( { 1440: wide, 768: wide, 375: { ...wide, 'decl:width': '100vw', width: '375px' } } ) } );
	assert.deepEqual( writeOf( out, 'panelMaxWidth' ).value, { desktop: '440px', mobile: '100%' } );
} );

test( 'negative control: a max-width in pixels is read as it is, and a viewport cap with no declared width is no px size', () => {
	const px = run( [ row( 'panelMaxWidth', 'max-width', 'panel' ) ], { panel: all( { 'max-width': '480px', 'decl:max-width': '480px', 'decl:width': '440px' } ) } );
	assert.deepEqual( writeOf( px, 'panelMaxWidth' ).value, { desktop: '480px' } );
	const capped = run( [ row( 'panelMaxWidth', 'max-width', 'panel' ) ], { panel: all( { 'max-width': '100vw', 'decl:max-width': '100vw' } ) } );
	assert.equal( writeOf( capped, 'panelMaxWidth' ), undefined );
} );

test( 'MUST FAIL: a width setting takes the element\'s track of a two-track fraction grid where the grid has two columns', () => {
	const out = run( [ row( 'sgsSidebarWidth', 'width', 'sidebar' ) ], { sidebar: at( { 1440: { width: '477px', 'track:width': '477px' }, 768: { width: '700px', 'track:width': '' }, 375: { width: '343px', 'track:width': '' } } ) } );
	assert.deepEqual( writeOf( out, 'sgsSidebarWidth' ).value, { desktop: '477px' } );
} );

test( 'negative control: a width with no declaration and no track stays the layout\'s', () => {
	const out = run( [ row( 'sgsSidebarWidth', 'width', 'sidebar' ) ], { sidebar: all( { width: '477px', 'track:width': '' } ) } );
	assert.equal( out.settings.sgsSidebarWidth.code, 'undeclared' );
} );

const pad = ( t, r ) => ( { 'padding-top': t, 'padding-right': r, 'padding-bottom': t, 'padding-left': r } );
test( 'MUST FAIL: a button\'s browser padding (1px 6px) the draft never states is not written', () => {
	const out = run( [ row( 'aPadding', 'padding', 'button', { attr_type: 'object', tier_shape: 'tier_object' } ) ], { button: all( pad( '1px', '6px' ) ) } );
	assert.equal( writeOf( out, 'aPadding' ), undefined );
} );

test( 'negative control: the same padding the draft states is written, and an undeclared padding of another size is too', () => {
	const stated = run( [ row( 'aPadding', 'padding', 'button' ) ], { button: all( { ...pad( '1px', '6px' ), 'decl:padding-top': '1px' } ) } );
	assert.deepEqual( writeOf( stated, 'aPadding' ).value, { desktop: { top: '1px', right: '6px', bottom: '1px', left: '6px' } } );
	const other = run( [ row( 'aPadding', 'padding', 'button' ) ], { button: all( pad( '12px', '24px' ) ) } );
	assert.deepEqual( writeOf( other, 'aPadding' ).value, { desktop: { top: '12px', right: '24px', bottom: '12px', left: '24px' } } );
} );

// The in-page reads: the track of a two-column grid whose declared columns hold a fraction, and the declared padding sides.
let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1200, height: 800 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

async function readSide( cols ) {
	await page.setContent( `<!doctype html><body style="margin:0"><main style="display:grid;width:1100px;grid-template-columns:${ cols }"><section style="height:20px"></section><aside style="height:20px"></aside></main><button style="padding:8px 14px">A</button><button>B</button></body>` );
	return page.evaluate( findPartsInPage, { spec: { anchors: {}, parts: { side: { from: 'page', match: { tag: [ 'aside' ] } }, buttons: { from: 'page', match: { tag: [ 'button' ] } } } }, names: [ 'side', 'buttons' ], props: READ_PROPS, pages: {} } );
}

test( 'MUST FAIL: the page read measures the element\'s track of a two-column fraction grid and the padding sides the draft states', async () => {
	const found = await readSide( '1.35fr 1fr' );
	assert.equal( found.side[ 0 ].styles[ 'track:width' ], '468.1px' );
	assert.deepEqual( found.buttons.map( ( b ) => b.styles[ 'decl:padding-top' ] ), [ '8px', '' ] );
} );

test( 'negative control: fixed columns, one column or no grid give no track', async () => {
	assert.equal( ( await readSide( '600px 500px' ) ).side[ 0 ].styles[ 'track:width' ], '' );
	assert.equal( ( await readSide( '1fr' ) ).side[ 0 ].styles[ 'track:width' ], '' );
} );

test( 'MUST FAIL: equal fractions, a fixed track beside a fluid one and the larger fraction\'s column give no track', async () => {
	assert.equal( ( await readSide( '1fr 1fr' ) ).side[ 0 ].styles[ 'track:width' ], '', 'two equal columns are no sidebar' );
	assert.equal( ( await readSide( '80px 1fr' ) ).side[ 0 ].styles[ 'track:width' ], '', 'a fluid content column beside a fixed one states no width' );
	assert.equal( ( await readSide( '1fr 1.35fr' ) ).side[ 0 ].styles[ 'track:width' ], '', 'the larger fraction is the main column, not the side one' );
	assert.equal( ( await readSide( '2fr 1fr 1fr' ) ).side[ 0 ].styles[ 'track:width' ], '', 'three columns are no sidebar split' );
} );

test( 'MUST FAIL: a height of 100% is no min-height the draft states, and 100% passes through only to a max-width setting', () => {
	const tall = run( [ row( 'aButtonMinHeight', 'min-height', 'button' ) ], { button: all( { height: '66px', 'decl:height': '100%' } ) } );
	assert.equal( writeOf( tall, 'aButtonMinHeight' ), undefined );
	const wide = run( [ row( 'aWidth', 'width', 'box' ) ], { box: all( { width: '440px', 'track:width': '100%' } ) } );
	assert.equal( writeOf( wide, 'aWidth' ), undefined );
} );

// F-21: the space between cards a stack draws with its gap (Mama's basket lines: a flex column with `gap:16px`) is the space below each
// copy, which the cart's sgsItemGap paints as margin-bottom.
async function readStack( parent, cards = 2, own = '' ) {
	const card = `<article style="height:40px;${ own }"><span>a</span><b>b</b></article>`;
	await page.setContent( `<!doctype html><body style="margin:0"><div style="${ parent }">${ card.repeat( cards ) }<p>after</p></div></body>` );
	return page.evaluate( findPartsInPage, { spec: { anchors: {}, parts: { card: { from: 'page', match: { tag: [ 'article' ] } } } }, names: [ 'card' ], props: READ_PROPS, pages: {} } );
}

test( 'MUST FAIL: a copy in a column stack reads the stack\'s gap, and a margin-bottom setting takes it as the space below the copy', async () => {
	const found = await readStack( 'display:flex;flex-direction:column;gap:16px' );
	// Every copy reads it, the last one too (the instances must agree).
	assert.deepEqual( found.card.map( ( c ) => c.styles[ 'stack:gap' ] ), [ '16px', '16px' ] );
	assert.equal( ( await readStack( 'display:grid;row-gap:12px' ) ).card[ 0 ].styles[ 'stack:gap' ], '12px' );
	const out = run( [ row( 'itemGap', 'margin-bottom', 'card', { attr_type: 'string', is_responsive: 0, tier_shape: null } ) ], { card: all( { 'stack:gap': '16px' } ) } );
	assert.equal( writeOf( out, 'itemGap' ).value, '16px' );
} );

test( 'negative control: a row of copies, a lone copy and a copy with its own margin take no stack gap', async () => {
	assert.equal( ( await readStack( 'display:flex;gap:16px' ) ).card[ 0 ].styles[ 'stack:gap' ], '' );
	assert.equal( ( await readStack( 'display:flex;flex-direction:column;gap:16px', 1 ) ).card[ 0 ].styles[ 'stack:gap' ], '' );
	assert.equal( ( await readStack( 'display:grid;grid-template-columns:1fr 1fr;row-gap:12px' ) ).card[ 0 ].styles[ 'stack:gap' ], '' );
	const own = run( [ row( 'itemGap', 'margin-bottom', 'card', { attr_type: 'string', is_responsive: 0, tier_shape: null } ) ], { card: all( { 'stack:gap': '16px', 'margin-bottom': '8px' } ) } );
	assert.equal( writeOf( own, 'itemGap' ).value, '8px' );
} );
