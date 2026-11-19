// The part-look verify pass (lib/part-look-verify.mjs) and the visibility switches (lib/fill-part-look.mjs::buildLook) on planted
// rows, readings and a fake live page: no browser, no site (run-tests.mjs sets SGS_NO_SITE).
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-verify.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { READ_PROPS, buildLook } from '../lib/fill-part-look.mjs';
import { compareParts, liveSelectorsFor, seedOf, verifySurface } from '../lib/part-look-verify.mjs';
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
	const own = liveSelectorsFor( { parts: [ 'panel-heading', 'scrim', 'missing' ], blockKey: null, table: TABLE, map: LIVE_MAP, elements: { scrim: {}, 'panel-heading': { selector: '.x' } }, short: 'cart' } );
	assert.deepEqual( own.selectors, { 'panel-heading': '.x', scrim: '.sgs-cart__scrim' } );
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
