// The part-look verify pass (lib/part-look-verify.mjs) and the visibility switches (lib/fill-part-look.mjs::buildLook) on planted
// rows, readings and a fake live page: no browser, no site (run-tests.mjs sets SGS_NO_SITE).
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-verify.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { READ_PROPS, buildLook } from '../lib/fill-part-look.mjs';
import * as VERIFY from '../lib/part-look-verify.mjs';
import { blockElementsOf, compareParts, liveSelectorsFor, seedOf, verifySurface } from '../lib/part-look-verify.mjs';
import { REPO } from '../lib/part-look-run.mjs';
import { reportMarkdown } from '../lib/part-look-report.mjs';
import { runPartLook } from '../part-look.mjs';

const json = ( f ) => JSON.parse( fs.readFileSync( new URL( f, import.meta.url ), 'utf8' ) );
const SWITCHES = json( '../data/part-look-switches.json' );
const TABLE = json( '../../../plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json' );
const LIVE_MAP = json( '../data/part-live-selectors.json' );

const BASE = Object.fromEntries( READ_PROPS.map( ( p ) => [ p, /-width$|^margin|^padding|radius$|-gap$/.test( p ) ? '0px' : '' ] ) );
Object.assign( BASE, { color: 'rgb(58, 42, 34)', 'background-color': 'rgba(0, 0, 0, 0)', 'font-family': '"Young Serif", serif', 'font-size': '19px', 'font-weight': '400', 'font-style': 'normal', 'line-height': '22.8px', 'letter-spacing': 'normal', 'text-transform': 'none', 'text-decoration-line': 'none', 'text-align': 'start', 'box-shadow': 'none', display: 'block', 'flex-direction': 'row', 'border-top-style': 'none', 'border-right-style': 'none', 'border-bottom-style': 'none', 'border-left-style': 'none', 'border-top-color': 'rgb(0, 0, 0)' } );
const el = ( styles = {}, text = 'x' ) => ( { key: 'k', tag: 'div', text, styles: { ...BASE, ...styles } } );
const at = ( styles, widths = [ 1440, 768, 375 ] ) => Object.fromEntries( widths.map( ( w ) => [ w, [ el( styles ) ] ] ) );
const row = ( attr, property, part, extra = {} ) => ( { attr_name: attr, attr_type: 'string', role: null, css_property: property, css_element: part, css_state: null, css_tier: null, is_responsive: 0, tier_shape: null, enum_values: null, default_value: null, ...extra } );
const sw = ( attr, property, part, extra = {} ) => row( attr, property, part, { attr_type: 'boolean', role: 'boolean-visibility', ...extra } );
const LOC = ( parts ) => ( { anchors: {}, parts } );
const lookup = ( parts ) => Object.fromEntries( parts.map( ( p ) => [ p, { from: 'page', match: {} } ] ) );

// ---- visibility switches ----------------------------------------------------------------------------------------------

const SW_LOC = LOC( { 'line-item': { from: 'page', match: {} }, 'line-item-header': { from: 'page', match: {}, neighbours: [ 'line-item' ] } } );
const hideRun = ( reads, extra = {} ) => buildLook( { block: 'woocommerce/cart', rows: [ sw( 'hideHeader', 'display', 'line-item-header' ) ], names: [], locators: SW_LOC, reads, switches: SWITCHES, ...extra } );

test( 'a visibility switch is written when the draft draws no such part and the part\'s neighbours are found', () => {
	const out = hideRun( { 'line-item': at( {} ) } );
	assert.deepEqual( out.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'hideHeader', true ] ] );
	assert.equal( out.settings.hideHeader.code, 'hidden' );
} );

test( 'negative control: a draft that draws the part keeps it', () => {
	const out = hideRun( { 'line-item': at( {} ), 'line-item-header': at( {} ) } );
	assert.equal( out.writes.length, 0 );
	assert.equal( out.settings.hideHeader.code, 'drawn' );
} );

test( 'negative control: where the neighbours are not found nothing is hidden', () => {
	const out = hideRun( {} );
	assert.equal( out.writes.length, 0 );
	assert.equal( out.settings.hideHeader.code, 'neighboursNotFound' );
	const noNeighbours = buildLook( { block: 'woocommerce/cart', rows: [ sw( 'hideHeader', 'display', 'line-item-header' ) ], names: [], locators: LOC( { 'line-item-header': { from: 'page', match: {} } } ), reads: { 'line-item': at( {} ) }, switches: SWITCHES } );
	assert.equal( noNeighbours.writes.length, 0 );
} );

test( 'which value hides comes from the switches data, never from the setting\'s name', () => {
	const out = hideRun( { 'line-item': at( {} ) }, { switches: { roles: { 'boolean-visibility': { display: { hideWhen: false } } } } } );
	assert.equal( out.writes[ 0 ].value, false );
	const gap = hideRun( { 'line-item': at( {} ) }, { switches: { roles: {} } } );
	assert.equal( gap.writes.length, 0 );
	assert.equal( gap.settings.hideHeader.code, 'switchDirection' );
} );

test( 'a visual switch the data says is set when the part is drawn is written only when it is drawn', () => {
	const rows = [ sw( 'wrapsButton', 'background-color', 'card', { role: 'visual' } ) ];
	const loc = LOC( { card: { from: 'page', match: {}, neighbours: [ 'button' ] }, button: { from: 'page', match: {} } } );
	const drawn = buildLook( { block: 'woocommerce/cart', rows, names: [], locators: loc, reads: { card: at( {} ), button: at( {} ) }, switches: SWITCHES } );
	assert.equal( drawn.writes[ 0 ].value, true );
	const alone = buildLook( { block: 'woocommerce/cart', rows, names: [], locators: loc, reads: { card: at( {} ) }, switches: SWITCHES } );
	assert.equal( alone.writes.length, 0 );
	assert.equal( alone.settings.wrapsButton.code, 'notDrawn' );
} );

// ---- live selectors, comparison, verify ---------------------------------------------------------------------------------

test( 'a part is found on the live page through its look-table row, the row the data names, or the block\'s own element', () => {
	const r = liveSelectorsFor( { parts: [ 'item-image', 'line-item-name', 'step', 'nothing' ], blockKey: 'cart', table: TABLE, map: LIVE_MAP } );
	assert.equal( r.selectors[ 'item-image' ], TABLE.rows.item_image.cart );
	assert.equal( r.selectors[ 'line-item-name' ], TABLE.rows.item_name.cart );
	assert.match( r.none.step, /no cart selector/ );
	assert.match( r.none.nothing, /no row/ );
	const own = liveSelectorsFor( { parts: [ 'panel-heading', 'missing' ], blockKey: null, table: TABLE, map: LIVE_MAP, elements: { 'panel-heading': { selector: '.x' } }, short: 'cart' } );
	assert.deepEqual( own.selectors, { 'panel-heading': '.x' } );
	assert.match( own.none.missing, /no element/ );
} );

test( 'every row the live selector data names is a row of the look table', () => {
	for ( const rowId of Object.values( LIVE_MAP.parts ) ) {
		assert.ok( TABLE.rows[ rowId ], `${ rowId } is not a look-table row` );
	}
} );

test( 'the comparison matches a draft value with a live one, ignores font fallbacks and a start alignment, and lists the rest', () => {
	const draft = { p: at( { 'text-align': 'start', 'font-family': '"Young Serif", serif', color: 'rgb(58, 42, 34)', 'text-transform': 'none' } ) };
	const live = { p: at( { 'text-align': 'left', 'font-family': '"Young Serif", Georgia, serif', color: 'rgb(168, 64, 79)', 'text-transform': 'uppercase' } ) };
	const c = compareParts( { draftReads: draft, liveReads: live } );
	assert.deepEqual( c.differs.map( ( d ) => d.property ).sort(), [ 'color', 'text-transform' ] );
	assert.ok( c.matched.has( 'p|text-align' ) );
	assert.ok( c.matched.has( 'p|font-family' ) );
	assert.equal( c.differs.find( ( d ) => 'text-transform' === d.property ).live[ 1440 ], 'uppercase' );
} );

// A fake live page whose text-transform follows a saved attribute, standing in for the scratch copy.
function fake( { saved = {}, effect = true } ) {
	const state = { saved: { ...saved }, patches: [] };
	return {
		state,
		readLive: async () => ( { reads: { heading: at( { 'text-transform': effect && 'none' === state.saved.hTransform ? 'none' : 'uppercase' } ) }, shown: {} } ),
		patch: async ( { set, unset } ) => {
			state.patches.push( { set, unset } );
			Object.assign( state.saved, set );
			unset.forEach( ( a ) => delete state.saved[ a ] );
		},
		readSaved: async () => ( { ...state.saved } ),
	};
}
const inputs = ( extra = {} ) => ( {
	block: 'woocommerce/cart', rows: [ row( 'hTransform', 'text-transform', 'heading' ) ], names: [ 'hTransform' ], locators: LOC( lookup( [ 'heading' ] ) ),
	reads: { heading: at( { 'text-transform': 'none' } ) }, snapshot: null, ...extra,
} );

test( 'a property that differs live and that a setting holds is written, even when the draft value is the CSS initial', async () => {
	const f = fake( {} );
	const bi = inputs();
	const built = buildLook( bi );
	assert.equal( built.writes.length, 0 );
	const v = await verifySurface( { buildInputs: bi, built, ...f } );
	assert.deepEqual( f.state.patches[ 0 ].set, { hTransform: 'none' } );
	assert.deepEqual( v.kept, [ 'hTransform' ] );
	assert.equal( v.stillDiffers.length, 0 );
} );

test( 'a write that changes nothing is taken back and listed', async () => {
	const f = fake( { effect: false } );
	const bi = inputs();
	const v = await verifySurface( { buildInputs: bi, built: buildLook( bi ), ...f } );
	assert.equal( v.takenBack.length, 1 );
	assert.equal( f.state.saved.hTransform, undefined );
	assert.match( v.stillDiffers[ 0 ].why, /taken back/ );
} );

test( 'a taken-back write restores the value the setting held before', async () => {
	const f = fake( { saved: { hTransform: 'capitalize' }, effect: false } );
	const bi = inputs();
	await verifySurface( { buildInputs: bi, built: buildLook( bi ), ...f } );
	assert.equal( f.state.saved.hTransform, 'capitalize' );
} );

test( 'a differing property no setting of the part holds stays in the table with its live value and joins the no-setting rows', async () => {
	const f = fake( {} );
	f.readLive = async () => ( { reads: { heading: at( { 'text-transform': 'none', 'font-style': 'italic' } ) }, shown: {} } );
	const bi = inputs( { rows: [ row( 'hColour', 'color', 'heading' ) ], names: [], reads: { heading: at( { 'text-transform': 'none' } ) } } );
	const built = { ...buildLook( bi ), noSetting: [ { part: 'heading', property: 'font-style', draft: { 1440: 'normal' } }, { part: 'heading', property: 'text-transform', draft: { 1440: 'none' } } ] };
	const v = await verifySurface( { buildInputs: bi, built, ...f } );
	assert.equal( v.stillDiffers.find( ( d ) => 'font-style' === d.property ).why, 'no setting of the part holds this look' );
	assert.equal( v.noSetting.length, 1 );
	assert.equal( v.noSetting[ 0 ].property, 'font-style' );
	assert.equal( v.noSetting[ 0 ].live[ 1440 ], 'italic' );
	assert.equal( v.droppedNoSetting, 1 );
	assert.equal( f.state.patches.length, 0 );
} );

test( 'two parts one live selector finds are one row of the still-differs table', async () => {
	const f = fake( {} );
	f.readLive = async () => ( { reads: { a: at( { color: 'rgb(1, 2, 3)' } ), b: at( { color: 'rgb(1, 2, 3)' } ) }, shown: {} } );
	const bi = { block: 'woocommerce/cart', rows: [], names: [], locators: LOC( lookup( [ 'a', 'b' ] ) ), reads: { a: at( {} ), b: at( {} ) }, snapshot: null };
	const v = await verifySurface( { buildInputs: bi, built: buildLook( bi ), selectors: { a: '.same', b: '.same' }, ...f } );
	assert.equal( v.stillDiffers.length, 1 );
	assert.equal( v.stillDiffers[ 0 ].part, 'a / b' );
} );

test( 'a switch that is written while the part still shows on the page is reported', async () => {
	const f = fake( {} );
	f.readLive = async () => ( { reads: {}, shown: { 'line-item-header': 1 } } );
	const bi = { block: 'woocommerce/cart', rows: [ sw( 'hideHeader', 'display', 'line-item-header' ) ], names: [], locators: SW_LOC, reads: { 'line-item': at( {} ) }, switches: SWITCHES };
	const v = await verifySurface( { buildInputs: bi, built: buildLook( bi ), ...f } );
	assert.match( v.stillDiffers[ 0 ].why, /still shows/ );
} );

test( 'the seed\'s product is the last JSON line of its output', () => {
	const text = 'Warning: x\n{"product":{"path":"/p/","addFields":{"a":"1"}}}\n';
	assert.deepEqual( seedOf( text ), { path: '/p/', addFields: { a: '1' } } );
	assert.throws( () => seedOf( 'no json' ), /no product path/ );
} );

test( 'negative control: verify and write without a scratch copy are refused before anything is read', async () => {
	await assert.rejects( runPartLook( { client: 'nobody', verify: true } ), /--verify needs --site/ );
	await assert.rejects( runPartLook( { client: 'nobody', verify: true, site: 'local-mamas' } ), /not a scratch copy/ );
	await assert.rejects( runPartLook( { client: 'nobody', verify: true, site: 'mamas-test' } ), /not a scratch copy/ );
} );

test( 'a setting that already holds the draft\'s value while the page shows another is not written again and says so', async () => {
	const f = fake( { saved: { hTransform: 'none' }, effect: false } );
	const bi = inputs();
	const v = await verifySurface( { buildInputs: bi, built: buildLook( bi ), ...f } );
	assert.equal( f.state.patches.length, 0 );
	assert.deepEqual( v.noEffect, [ 'hTransform' ] );
	assert.match( v.stillDiffers[ 0 ].why, /already holds the draft's value/ );
} );

test( 'a draft line height of normal is the same look as a live ratio of the font\'s own range, and not as a 1.4', () => {
	const draft = { p: at( { 'line-height': 'normal' } ) };
	const px = ( ratio ) => `${ ratio * 19 }px`;
	assert.equal( compareParts( { draftReads: draft, liveReads: { p: at( { 'line-height': px( 1.188 ) } ) } } ).differs.length, 0 );
	assert.equal( compareParts( { draftReads: draft, liveReads: { p: at( { 'line-height': px( 1.4 ) } ) } } ).differs.length, 1 );
} );

// ---- a part with no selector, the basket drawer, a surface that compared nothing ------------------------------------------

test( 'MUST FAIL: a block.json element with no selector has no live selector and is listed as not verified with the reason', () => {
	const elements = { freeDeliveryTrack: {}, wrapper: { isWrapper: true }, scrim: {}, 'panel-heading': { selector: '.x' }, padded: { selector: '  .y  ' } };
	const r = liveSelectorsFor( { parts: [ 'freeDeliveryTrack', 'wrapper', 'scrim', 'panel-heading', 'padded' ], blockKey: null, table: TABLE, map: LIVE_MAP, elements, short: 'cart', block: 'sgs/other' } );
	assert.deepEqual( r.selectors, { 'panel-heading': '.x', padded: '.y' }, 'only the elements that declare a selector are read' );
	for ( const part of [ 'freeDeliveryTrack', 'wrapper', 'scrim' ] ) {
		assert.match( r.none[ part ], /declares no selector/, `${ part } is listed as not verified` );
	}
	// negative control: the route's own data names a selector for a part whose element declares none, and it is read
	const named = liveSelectorsFor( { parts: [ 'scrim' ], blockKey: null, table: TABLE, map: { blocks: { 'sgs/other': { scrim: '.sgs-scrim' } } }, elements, short: 'cart', block: 'sgs/other' } );
	assert.deepEqual( named.selectors, { scrim: '.sgs-scrim' } );
	assert.deepEqual( named.none, {} );
} );

// The text the sgs/cart block prints its classes from: its render code, the shared panel and scrim helpers and the scripts that build the rows.
const CART_SOURCES = ( () => {
	const plugin = ( ...p ) => fs.readFileSync( new URL( [ '../../../plugins/sgs-blocks', ...p ].join( '/' ), import.meta.url ), 'utf8' );
	const blockDir = [ 'src', 'blocks', 'cart' ];
	return [ 'render.php', 'render-scoped-css.php', 'panel-render.js', 'item-row-template.js', 'free-delivery.js', 'view.js' ].map( ( f ) => plugin( ...blockDir, f ) )
		.concat( [ 'helpers-cart-panel.php', 'helpers-cart-panel-extras.php', 'helpers-scrim.php' ].map( ( f ) => plugin( 'includes', f ) ) ).join( '\n' );
} )();
const printed = ( cls ) => new RegExp( `(?<![\\w-])${ cls }(?![\\w-])` ).test( CART_SOURCES );

test( 'MUST FAIL: every element of sgs/cart has a live selector and each class in it is one the block\'s render code prints', () => {
	const elements = blockElementsOf( REPO, 'cart' );
	const parts = Object.keys( elements );
	assert.ok( parts.length > 30, 'the cart block declares its elements' );
	const r = liveSelectorsFor( { parts, blockKey: null, table: TABLE, map: LIVE_MAP, elements, short: 'cart', block: 'sgs/cart' } );
	assert.deepEqual( r.none, {}, 'no element of sgs/cart is left without a selector' );
	for ( const [ part, selector ] of Object.entries( r.selectors ) ) {
		const classes = selector.match( /\.[A-Za-z][\w-]*/g ) || [];
		assert.ok( classes.length, `${ part }: ${ selector } names a class` );
		for ( const c of classes ) {
			assert.ok( printed( c.slice( 1 ) ), `${ part }: the class ${ c } is not printed by the cart block` );
		}
	}
} );

test( 'negative control: the class check refuses a class the cart block never prints', () => {
	assert.equal( printed( 'sgs-cart__free-delivery-track' ), true );
	assert.equal( printed( 'sgs-cart__freeDeliveryTrack' ), false );
} );

// A fake Playwright page for the basket drawer: `:visible` finds the visible trigger only, a click on a hidden one cannot happen, and the panel
// opens (or does not) when the visible trigger is clicked.
function fakeBasketPage( { opens = true, clickFails = false } = {} ) {
	const state = { clicked: [], waited: [] };
	const trigger = ( name, visible ) => ( {
		first: () => trigger( name, visible ),
		click: async () => {
			if ( ! visible ) {
				throw new Error( 'element is not visible' );
			}
			if ( clickFails ) {
				throw new Error( 'click timed out' );
			}
			state.clicked.push( name );
		},
	} );
	return {
		state,
		locator: ( selector ) => ( /:visible/.test( selector ) ? trigger( 'visible', true ) : trigger( 'hidden', false ) ),
		waitForSelector: async ( selector ) => {
			state.waited.push( selector );
			if ( ! opens || ! state.clicked.length || ! /dialog\.sgs-cart__panel\[open\]/.test( selector ) ) {
				throw new Error( 'timeout waiting for the selector' );
			}
		},
	};
}

test( 'MUST FAIL: the basket drawer is opened through the first visible trigger and the read needs the panel open', async () => {
	const page = fakeBasketPage();
	await VERIFY.openBasketDrawer( page );
	assert.deepEqual( page.state.clicked, [ 'visible' ], 'the visible trigger was clicked, not the first one in the markup' );
	assert.ok( page.state.waited.some( ( s ) => /dialog\.sgs-cart__panel\[open\]/.test( s ) ), 'the open panel was waited for' );
} );

test( 'MUST FAIL: a basket drawer that does not open, or a click that fails, fails the read with an error that says so', async () => {
	await assert.rejects( VERIFY.openBasketDrawer( fakeBasketPage( { opens: false } ) ), /basket panel did not open/ );
	await assert.rejects( VERIFY.openBasketDrawer( fakeBasketPage( { clickFails: true } ) ), /basket trigger could not be clicked/ );
} );

// A fake browser launcher around fakeBasketPage: the page answers the loads and reads readLiveSurface makes with one shown element.
function fakeChromium( options ) {
	const pages = [];
	return {
		pages,
		launch: async () => ( {
			newContext: async () => ( {
				newPage: async () => {
					const inner = fakeBasketPage( options );
					pages.push( inner );
					return {
						locator: inner.locator,
						waitForSelector: async ( selector ) => ( /dialog\.sgs-cart__panel/.test( selector ) ? inner.waitForSelector( selector ) : undefined ),
						goto: async () => {},
						waitForLoadState: async () => {},
						waitForTimeout: async () => {},
						evaluate: async ( fn, args ) => ( args?.selectors ? { heading: { matched: 1, instances: [ { key: 'k', tag: 'h2', text: 'x', styles: {} } ] } } : undefined ),
					};
				},
				close: async () => {},
			} ),
			close: async () => {},
		} ),
	};
}

test( 'MUST FAIL: the header read opens the basket panel and stops with an error when it stays shut; a read that needs no panel never clicks', async () => {
	const args = { base: 'http://x', pagePath: '/p/', selectors: { heading: 'h2' }, props: [ 'color' ] };
	const shut = fakeChromium( { opens: false } );
	await assert.rejects( VERIFY.readLiveSurface( { ...args, openDrawer: true, chromium: shut } ), /basket panel did not open/ );
	const open = fakeChromium( {} );
	const read = await VERIFY.readLiveSurface( { ...args, openDrawer: true, chromium: open } );
	assert.deepEqual( Object.keys( read.reads ), [ 'heading' ] );
	assert.ok( open.pages.every( ( p ) => 1 === p.state.clicked.length ), 'the visible trigger was clicked once at every width' );
	const plain = fakeChromium( {} );
	await VERIFY.readLiveSurface( { ...args, chromium: plain } );
	assert.ok( plain.pages.every( ( p ) => 0 === p.state.clicked.length ), 'negative control: a surface that is not the header clicks nothing' );
} );

test( 'MUST FAIL: a surface whose draft located parts but whose live read compared nothing fails, with the parts and why', async () => {
	const f = fake( {} );
	f.readLive = async () => ( { reads: {}, shown: { heading: 0 } } );
	const bi = inputs();
	const v = await verifySurface( { buildInputs: bi, built: buildLook( bi ), selectorsNone: { footer: 'the block.json element of this part declares no selector' }, ...f } );
	assert.equal( v.counts.compared, 0 );
	assert.equal( v.failures.length, 1 );
	assert.match( v.failures[ 0 ], /draft located 1 part/ );
	assert.match( v.failures[ 0 ], /heading/ );
	assert.match( v.failures[ 0 ], /footer: the block\.json element of this part declares no selector/ );
} );

test( 'negative control: a surface that compared pairs, or whose draft located no part, has no failure', async () => {
	const f = fake( {} );
	const bi = inputs();
	const compared = await verifySurface( { buildInputs: bi, built: buildLook( bi ), ...f } );
	assert.ok( compared.counts.compared > 0 );
	assert.deepEqual( compared.failures, [] );
	const none = inputs( { reads: {} } );
	const g = fake( {} );
	g.readLive = async () => ( { reads: {}, shown: {} } );
	const nothing = await verifySurface( { buildInputs: none, built: buildLook( none ), ...g } );
	assert.equal( nothing.counts.compared, 0 );
	assert.deepEqual( nothing.failures, [] );
} );

test( 'the report names a failed verify, and says nothing when none failed', () => {
	const args = { client: 'x', site: 'local-x', compare: false, generated: 'now', surfaces: {}, totals: {} };
	assert.match( reportMarkdown( { ...args, failures: [ 'header: the draft located 2 parts and the live read compared no pair' ] } ), /## Verify failed\n\n- header: the draft located 2 parts/ );
	assert.doesNotMatch( reportMarkdown( { ...args, failures: [] } ), /Verify failed/ );
} );

// ---- sgs/account and sgs/product-card: every element declares the class its render code prints -------------------------------

// Every .php and .js file under the given plugin folders, as one text (the block's own folder, its includes, the blocks it prints markup of).
const printedBy = ( ...dirs ) => {
	const root = new URL( '../../../plugins/sgs-blocks/', import.meta.url );
	const walk = ( dir ) => fs.readdirSync( new URL( `${ dir }/`, root ), { withFileTypes: true } ).flatMap( ( e ) => ( e.isDirectory()
		? walk( `${ dir }/${ e.name }` )
		: ( /\.(php|js)$/.test( e.name ) && ! /\.min\.js$/.test( e.name ) ? [ fs.readFileSync( new URL( `${ dir }/${ e.name }`, root ), 'utf8' ) ] : [] ) ) );
	return dirs.flatMap( walk ).join( '\n' );
};
const ACCOUNT_SOURCES = printedBy( 'src/blocks/account', 'includes/account' );
const PRODUCT_CARD_SOURCES = ( () => {
	const fs2 = ( f ) => fs.readFileSync( new URL( `../../../plugins/sgs-blocks/includes/${ f }`, import.meta.url ), 'utf8' );
	const includes = fs.readdirSync( new URL( '../../../plugins/sgs-blocks/includes/', import.meta.url ) ).filter( ( f ) => /^product-card.*\.php$/.test( f ) ).map( fs2 );
	// the option-picker pill the card holds is printed by the sgs/option-picker block
	return [ printedBy( 'src/blocks/product-card', 'src/blocks/option-picker' ), ...includes ].join( '\n' );
} )();
const printsClass = ( text, cls ) => new RegExp( `(?<![\\w-])${ cls }(?![\\w-])` ).test( text );
// A class a helper builds from the root class it is handed: includes/helpers-value-ladder.php::sgs_value_ladder_markup prints the class made of the root and '__saving',
// and the card passes `product-card__value-ladder` (render.php).
const printsBuilt = ( cls ) => 'product-card__value-ladder__saving' === cls
	&& printsClass( PRODUCT_CARD_SOURCES, 'product-card__value-ladder' )
	&& /\$wrapper_class \) \. '__saving"/.test( fs.readFileSync( new URL( '../../../plugins/sgs-blocks/includes/helpers-value-ladder.php', import.meta.url ), 'utf8' ) );
const classesOf = ( selector ) => ( selector.match( /\.[A-Za-z][\w-]*/g ) || [] ).map( ( c ) => c.slice( 1 ) );
const liveFor = ( block, short ) => {
	const elements = blockElementsOf( REPO, short );
	return { elements, ...liveSelectorsFor( { parts: Object.keys( elements ), blockKey: null, table: TABLE, map: LIVE_MAP, elements, short, block } ) };
};

// The parts this change declares in block.json (sgs/account) and the classes its render code prints for each; the rest of the block's selectors
// name WooCommerce's own classes, which no SGS code prints.
const ACCOUNT_ADDED = { heading: '.sgs-account__heading', chip: '.sgs-account__chip', trackDone: '.sgs-account__progress-step--done' };

test( 'MUST FAIL: every element of sgs/account has a live selector, except the active-item bar that is a pseudo-element', () => {
	const r = liveFor( 'sgs/account', 'account' );
	assert.ok( Object.keys( r.elements ).length > 80, 'the account block declares its elements' );
	assert.deepEqual( Object.keys( r.none ), [ 'menuIndicator' ], 'only the bar, which is ::after of the active menu link and carries no class, has no selector' );
	assert.match( ACCOUNT_SOURCES, /is-active > a::after/, 'the bar is printed as a pseudo-element of the active link (includes/account/helpers-account-look-css.php)' );
	assert.equal( r.selectors.menuActive, LIVE_MAP.blocks[ 'sgs/account' ].menuActive, 'the active item is named by the route data: the nav shows only when signed in' );
} );

test( 'MUST FAIL: the sgs/account elements declared here name classes the account code prints', () => {
	const r = liveFor( 'sgs/account', 'account' );
	for ( const [ part, selector ] of Object.entries( ACCOUNT_ADDED ) ) {
		assert.equal( r.elements[ part ]?.selector, selector, `${ part } declares ${ selector } in block.json` );
		for ( const c of classesOf( selector ) ) {
			assert.ok( printsClass( ACCOUNT_SOURCES, c ), `${ part }: the class ${ c } is not printed by the account block` );
		}
	}
} );

test( 'MUST FAIL: every element of sgs/product-card has a live selector and each class in it is one the card prints', () => {
	const r = liveFor( 'sgs/product-card', 'product-card' );
	assert.ok( Object.keys( r.elements ).length > 30, 'the product card declares its elements' );
	assert.deepEqual( r.none, {}, 'no element of sgs/product-card is left without a selector' );
	assert.equal( r.selectors.box, LIVE_MAP.blocks[ 'sgs/product-card' ].box, 'the card root is a wrapper element: the route data names it' );
	assert.equal( r.selectors.wishlist, LIVE_MAP.blocks[ 'sgs/product-card' ].wishlist, 'the wishlist heart is named by the route data: a block.json selector would drop its base transition (generate-motion-base-transitions.py)' );
	assert.equal( r.elements.wishlist.selector, undefined, 'the wishlist element declares no block.json selector' );
	for ( const [ part, selector ] of Object.entries( r.selectors ) ) {
		const classes = classesOf( selector );
		assert.ok( classes.length, `${ part }: ${ selector } names a class` );
		for ( const c of classes ) {
			assert.ok( printsClass( PRODUCT_CARD_SOURCES, c ) || printsBuilt( c ), `${ part }: the class ${ c } is not printed by the product card` );
		}
	}
} );

test( 'negative control: the class check refuses a class the account and card code never print', () => {
	assert.equal( printsClass( ACCOUNT_SOURCES, 'sgs-account__progress-step--done' ), true );
	assert.equal( printsClass( ACCOUNT_SOURCES, 'sgs-account__trackDone' ), false );
	assert.equal( printsClass( PRODUCT_CARD_SOURCES, 'sgs-product-card__title' ), true );
	assert.equal( printsClass( PRODUCT_CARD_SOURCES, 'sgs-product-card__priceNote' ), false );
	assert.equal( printsClass( PRODUCT_CARD_SOURCES, 'sgs-option-picker__pill' ), true );
} );
