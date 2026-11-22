// Part-look's verify and compare say what they did not compare (shop investigation F-17, the checks MERGED section 8 lists as green while
// comparing nothing): lib/part-look-verify.mjs::verifySurface counts every part with settings it did not compare (no locator, no draft
// element, no live selector, no live element, no look read on both sides) as not verified, so a verify with unpaired parts never reads as
// a full match; the report leads with them (lib/part-look-report.mjs); and a size the draft states in another unit than px is reported
// with that reason, never as "the draft shows no element" (lib/fill-part-look.mjs::buildLook, lib/part-look-compare.mjs). Planted rows,
// reads and live reads: no browser, no site.
// Run: SGS_NO_SITE=1 node --test tests/part-look-not-verified.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import test from 'node:test';
import { READ_PROPS, buildLook } from '../lib/fill-part-look.mjs';
import { compareSettings } from '../lib/part-look-compare.mjs';
import { reportMarkdown } from '../lib/part-look-report.mjs';
import { verifySurface } from '../lib/part-look-verify.mjs';
import { strictFailuresOf } from '../part-look.mjs';

const BASE = Object.fromEntries( READ_PROPS.map( ( p ) => [ p, /-width$|^margin|^padding|radius$|-gap$/.test( p ) ? '0px' : '' ] ) );
Object.assign( BASE, { color: 'rgb(58, 42, 34)', 'background-color': 'rgba(0, 0, 0, 0)', 'font-size': '16px', 'line-height': '24px', 'letter-spacing': 'normal', 'font-style': 'normal', 'text-transform': 'none', 'text-decoration-line': 'none', 'text-align': 'start', 'box-shadow': 'none', display: 'block', 'border-top-style': 'none', 'border-right-style': 'none', 'border-bottom-style': 'none', 'border-left-style': 'none' } );
const el = ( styles = {} ) => ( { key: 'k', tag: 'div', text: 'x', styles: { ...BASE, ...styles } } );
const all = ( styles ) => ( { 1440: [ el( styles ) ], 768: [ el( styles ) ], 375: [ el( styles ) ] } );
const row = ( attr, property, part, extra = {} ) => ( { attr_name: attr, attr_type: 'string', css_property: property, css_element: part, css_state: null, css_tier: null, is_responsive: 0, tier_shape: null, enum_values: null, default_value: null, ...extra } );

// Five parts with a colour setting each: a is read and compared, b has no draft element, c no locator, d no live selector, e no live element.
const ROWS = [ 'a', 'b', 'c', 'd', 'e' ].map( ( p ) => row( `${ p }Colour`, 'color', p ) );
const LOCATORS = { anchors: {}, parts: Object.fromEntries( [ 'a', 'b', 'd', 'e' ].map( ( p ) => [ p, { from: 'page', match: {} } ] ) ) };
const READS = { a: all( {} ), d: all( {} ), e: all( {} ) };
const inputs = ( rows = ROWS, locators = LOCATORS, reads = READS ) => ( { block: 'sgs/cart', rows, names: rows.map( ( r ) => r.attr_name ), locators, reads } );
const verify = async ( { rows, locators, reads, live, selectors, selectorsNone = {} } ) => {
	const buildInputs = inputs( rows, locators, reads );
	return verifySurface( { buildInputs, built: buildLook( buildInputs ), readLive: async () => ( { reads: live, shown: {} } ), patch: async () => {}, readSaved: async () => ( {} ), selectors, selectorsNone } );
};

test( 'MUST FAIL: a verify that compared one part of five is not a full match, and names each part it did not compare with why', async () => {
	const v = await verify( { live: { a: all( {} ) }, selectors: { a: '.a', e: '.e' }, selectorsNone: { d: 'the block names no element' } } );
	assert.equal( v.counts.differs, 0, 'every pair it compared matches' );
	assert.equal( v.allMatch, false );
	assert.equal( v.counts.notVerified, 4 );
	assert.equal( v.counts.partsWithSettings, 5 );
	assert.deepEqual( Object.keys( v.notVerified ).sort(), [ 'b', 'c', 'd', 'e' ] );
	assert.match( v.notVerified.b, /unpaired/ );
	assert.match( v.notVerified.c, /no locator/ );
	assert.match( v.notVerified.d, /no live selector: the block names no element/ );
	assert.match( v.notVerified.e, /\.e shows no element on the live page/ );
} );

test( 'MUST FAIL: a part read in the draft and on the live page at no common width is not verified', async () => {
	const rows = [ row( 'aColour', 'color', 'a' ) ];
	const v = await verify( { rows, locators: { anchors: {}, parts: { a: { from: 'page', match: {} } } }, reads: { a: { 1440: [ el( {} ) ] } }, live: { a: { 375: [ el( {} ) ] } }, selectors: { a: '.a' } } );
	assert.equal( v.allMatch, false );
	assert.match( v.notVerified.a, /no look of the part was read on both/ );
} );

test( 'negative control: a verify that compared every part with settings and found them equal is a full match', async () => {
	const rows = [ row( 'aColour', 'color', 'a' ) ];
	const v = await verify( { rows, locators: { anchors: {}, parts: { a: { from: 'page', match: {} } } }, reads: { a: all( {} ) }, live: { a: all( {} ) }, selectors: { a: '.a' } } );
	assert.equal( v.allMatch, true );
	assert.deepEqual( v.notVerified, {} );
	const differs = await verify( { rows, locators: { anchors: {}, parts: { a: { from: 'page', match: {} } } }, reads: { a: all( {} ) }, live: { a: all( { color: 'rgb(255, 0, 0)' } ) }, selectors: { a: '.a' } } );
	assert.equal( differs.allMatch, false, 'a pair that differs is no full match either' );
} );

const surface = ( verifyResult ) => ( { surface: 'checkout', block: 'woocommerce/checkout', draftFile: 'x', rowsPaired: { parts: { paired: 1, withSettings: 5 }, tableRows: { paired: 0, present: 0 } }, build: { writes: [], unpaired: [], noLocator: [], conflicts: [], noSetting: [] }, verify: verifyResult } );
const md = ( v ) => reportMarkdown( { client: 'c', site: 's', compare: false, generated: 'now', surfaces: { checkout: surface( v ) }, totals: {} } );

test( 'MUST FAIL: the report leads its verify section with the parts not verified, before the count of matching pairs', async () => {
	const text = md( await verify( { live: { a: all( {} ) }, selectors: { a: '.a', e: '.e' }, selectorsNone: { d: 'none' } } ) );
	const lead = text.indexOf( 'Not a full match: 4 of 5 parts with settings not verified' );
	assert.ok( lead > 0, 'the verify section says it is not a full match' );
	assert.ok( lead < text.indexOf( 'Compared 1' ), 'it leads, before the matching pairs' );
	assert.match( text, /### Not verified\n\n- b: the draft has no element for the part \(unpaired\)/ );
} );

test( 'negative control: a full match says so and lists nothing as not verified', async () => {
	const rows = [ row( 'aColour', 'color', 'a' ) ];
	const text = md( await verify( { rows, locators: { anchors: {}, parts: { a: { from: 'page', match: {} } } }, reads: { a: all( {} ) }, live: { a: all( {} ) }, selectors: { a: '.a' } } ) );
	assert.match( text, /Every part with settings was compared and matches\./ );
	assert.doesNotMatch( text, /### Not verified/ );
} );

test( 'MUST FAIL: a size the draft states in another unit than px is reported with that reason, in the build and in the compare', () => {
	const rows = [ row( 'aWidth', 'width', 'a', { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1 } ) ];
	const built = buildLook( inputs( rows, { anchors: {}, parts: { a: { from: 'page', match: {} } } }, { a: all( { width: '600px', 'decl:width': '50%' } ) } ) );
	assert.equal( built.settings.aWidth.code, 'unreadable' );
	assert.match( built.settings.aWidth.reason, /states width as 50% at 1440/ );
	const cmp = compareSettings( { writes: built.writes, settings: built.settings, saved: { aWidth: { desktop: '600px' } }, lookAttrs: [ 'aWidth' ] } );
	assert.match( cmp.handSetOnly[ 0 ].reason, /states width as 50%/ );
	assert.doesNotMatch( cmp.handSetOnly[ 0 ].reason, /shows no element/ );
	const capRows = [ row( 'aMaxWidth', 'max-width', 'a', { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1 } ) ];
	const cap = buildLook( inputs( capRows, { anchors: {}, parts: { a: { from: 'page', match: {} } } }, { a: all( { 'max-width': '100vw', 'decl:max-width': '100vw' } ) } ) );
	assert.match( cap.settings.aMaxWidth.reason, /states max-width as 100vw at 1440/, 'a viewport cap with no declared width names the cap' );
	const corner = '10px 20px';
	const colour = buildLook( inputs( [ row( 'aRadius', 'border-radius', 'a' ) ], { anchors: {}, parts: { a: { from: 'page', match: {} } } }, { a: all( { 'border-top-left-radius': corner, 'border-top-right-radius': corner, 'border-bottom-right-radius': corner, 'border-bottom-left-radius': corner } ) } ) );
	assert.equal( colour.settings.aRadius.code, 'unreadable' );
	assert.match( colour.settings.aRadius.reason, /the draft's border-radius at 1440 is not a value the route reads/, 'an elliptical corner is no radius the setting reads, and is not called absent' );
} );

test( 'negative control: a part the draft draws only on narrower devices is still written there, and one it never draws is unpaired', () => {
	const rows = [ row( 'aWidth', 'width', 'a', { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1 } ) ];
	const loc = { anchors: {}, parts: { a: { from: 'page', match: {} } } };
	const narrow = buildLook( inputs( rows, loc, { a: { 375: [ el( { width: '40px', 'decl:width': '40px' } ) ] } } ) );
	assert.deepEqual( narrow.writes[ 0 ].value, { mobile: '40px' } );
	const narrowUnstated = buildLook( inputs( rows, loc, { a: { 375: [ el( { width: '40px' } ) ] } } ) );
	assert.equal( narrowUnstated.settings.aWidth.code, 'absent', 'a part drawn only on a phone, stating no size, is absent at 1440, not unreadable' );
	const never = buildLook( inputs( rows, loc, {} ) );
	assert.equal( never.settings.aWidth.code, 'unpaired' );
} );

test( 'MUST FAIL: a verify that compared nothing, with no part with settings, is no full match', async () => {
	const v = await verify( { rows: [], locators: { anchors: {}, parts: {} }, reads: {}, live: {}, selectors: {} } );
	assert.equal( v.counts.partsWithSettings, 0 );
	assert.equal( v.allMatch, false, 'no vacuous truth' );
} );

test( 'MUST FAIL: --strict fails each verified surface that is not a full match, with its counts', async () => {
	const partial = await verify( { live: { a: all( {} ) }, selectors: { a: '.a', e: '.e' }, selectorsNone: { d: 'none' } } );
	const lines = strictFailuresOf( { checkout: { surface: 'checkout', verify: partial } } );
	assert.deepEqual( lines, [ 'checkout: not a full match (4 of 5 parts with settings not verified, 0 pairs still differ, 16 pairs compared)' ] );
} );

test( 'negative control: --strict passes a full match and a surface read without a verify', async () => {
	const rows = [ row( 'aColour', 'color', 'a' ) ];
	const full = await verify( { rows, locators: { anchors: {}, parts: { a: { from: 'page', match: {} } } }, reads: { a: all( {} ) }, live: { a: all( {} ) }, selectors: { a: '.a' } } );
	assert.deepEqual( strictFailuresOf( { cart: { surface: 'cart', verify: full }, shop: { surface: 'shop' } } ), [] );
} );
