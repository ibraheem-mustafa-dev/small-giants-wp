// Clone coverage plan Phase 1 (steps 1.1 and 1.2), lib/capabilities.mjs: the capability inventory is derived from its
// sources (the framework DB read-only, the code, the construct registry, the web platform's data packages), so a new
// setting, role or tag becomes a new entry without anyone listing it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventory, settingKind, snapshotKeyPaths, mergeInventory, allEntries } from '../lib/capabilities.mjs';
import { fixtureDb, BASE_ROWS } from './fixtures/framework-db.mjs';

const ids = ( inv, section ) => inv.sections[ section ].entries.map( ( e ) => e.id );
const plant = ( extra ) => ( { ...BASE_ROWS, block_attributes: [ ...BASE_ROWS.block_attributes, ...extra ] } );

test( 'POSITIVE: block settings group by role and kind; core attributes are not framework capabilities', () => {
	const inv = buildInventory( { dbFile: fixtureDb( BASE_ROWS ) } );
	assert.equal( inv.sections[ 'block-setting' ].status, 'ok' );
	assert.deepEqual( ids( inv, 'block-setting' ), [ 'block-setting:colour:styling', 'block-setting:content:string', 'block-setting:layout:mode', 'block-setting:motion:motion' ] );
	const motion = inv.sections[ 'block-setting' ].entries.find( ( e ) => 'block-setting:motion:motion' === e.id );
	assert.equal( motion.motion, true );
	assert.deepEqual( motion.examples, [ 'sgs/hero.sgsMotion' ] );
} );

test( 'POSITIVE: fx effects and motion presets come from the DB, presets grouped by panel and family', () => {
	const inv = buildInventory( { dbFile: fixtureDb( BASE_ROWS ) } );
	assert.deepEqual( ids( inv, 'fx' ), [ 'fx:tilt' ] );
	assert.deepEqual( inv.sections[ 'motion-preset' ].entries.map( ( e ) => [ e.id, e.count ] ), [ [ 'motion-preset:entrance:fade', 2 ] ] );
} );

test( 'MUST FAIL (control 1): a planted block setting with a new role becomes a new inventory entry', () => {
	const before = new Set( ids( buildInventory( { dbFile: fixtureDb( BASE_ROWS ) } ), 'block-setting' ) );
	const after = ids( buildInventory( { dbFile: fixtureDb( plant( [ { block_slug: 'sgs/hero', attr_name: 'autoplaySpeed', attr_type: 'number', role: 'carousel' } ] ) ) } ), 'block-setting' );
	assert.deepEqual( after.filter( ( id ) => ! before.has( id ) ), [ 'block-setting:carousel:number' ] );
} );

test( 'setting kinds: motion beats styling, an anim: pseudo-property is motion, an empty enum is not a mode', () => {
	assert.equal( settingKind( { attr_name: 'x', role: 'motion', css_property: 'transform' } ), 'motion' );
	assert.equal( settingKind( { attr_name: 'x', role: 'timing', css_property: 'anim:duration' } ), 'motion' );
	assert.equal( settingKind( { attr_name: 'x', role: 'spacing', css_property: 'padding' } ), 'styling' );
	assert.equal( settingKind( { attr_name: 'x', role: 'layout', attr_type: 'string', enum_values: '[]' } ), 'string' );
} );

test( 'POSITIVE: without the DB the DB sections are marked absent and the code and draft sections still build', () => {
	const inv = buildInventory( { dbFile: null } );
	assert.equal( inv.sections[ 'block-setting' ].status, 'absent' );
	assert.deepEqual( inv.sections.fx.entries, [] );
	for ( const s of [ 'sgs-support', 'template', 'part', 'post-type', 'html', 'css-at', 'css-group', 'construct' ] ) {
		assert.ok( inv.sections[ s ].entries.length > 0, `${ s } has entries` );
	}
	assert.ok( ids( inv, 'post-type' ).includes( 'post-type:sgs_header' ) );
	assert.ok( ids( inv, 'html' ).includes( 'html:dialog' ) );
	assert.ok( ids( inv, 'css-at' ).includes( 'css-at:container' ) );
	assert.ok( ids( inv, 'construct' ).includes( 'construct:sc-for' ) );
	assert.ok( ! ids( inv, 'sgs-support' ).some( ( id ) => id.includes( '_comment' ) ), 'annotation keys are not capabilities' );
} );

test( 'MUST FAIL (control 2): a planted draft tag becomes a new inventory entry', () => {
	const inv = buildInventory( { dbFile: null, tags: [ 'div', 'sgs-planted-element' ] } );
	assert.deepEqual( ids( inv, 'html' ), [ 'html:div', 'html:sgs-planted-element' ] );
} );

test( 'a write without the DB keeps the committed DB sections; a write with it replaces them', () => {
	const withDb = buildInventory( { dbFile: fixtureDb( BASE_ROWS ) } );
	const kept = mergeInventory( buildInventory( { dbFile: null } ), withDb );
	assert.deepEqual( kept.sections[ 'block-setting' ], withDb.sections[ 'block-setting' ] );
	const replaced = mergeInventory( buildInventory( { dbFile: fixtureDb( plant( [ { block_slug: 'sgs/tabs', attr_name: 'x', attr_type: 'boolean', role: 'behaviour' } ] ) ) } ), withDb );
	assert.ok( ids( replaced, 'block-setting' ).includes( 'block-setting:behaviour:boolean' ) );
} );

test( 'theme-snapshot keys: three levels under settings, two elsewhere, keys only', () => {
	const paths = snapshotKeyPaths( [ { settings: { color: { palette: [ { slug: 'client-red' } ] }, custom: { duration: { fast: '200ms' } } }, styles: { blocks: { 'core/button': {} } } } ] ).map( ( e ) => e.id );
	assert.deepEqual( paths, [ 'snapshot-key:settings.color', 'snapshot-key:settings.color.palette', 'snapshot-key:settings.custom', 'snapshot-key:settings.custom.duration', 'snapshot-key:styles.blocks' ] );
} );

test( 'every inventory ID is unique and carries its section as its prefix', () => {
	const all = allEntries( buildInventory( { dbFile: fixtureDb( BASE_ROWS ) } ) );
	assert.equal( new Set( all.map( ( e ) => e.id ) ).size, all.length );
	all.forEach( ( e ) => assert.ok( e.id.startsWith( `${ e.section }:` ), e.id ) );
} );

// Step 1.6: a small stand-in for each draft-side data package, so each section's MUST FAIL plant is exact.
const C = ( status = {} ) => ( { __compat: { status: { deprecated: false, ...status } } } );
const BCD = {
	css: { 'at-rules': { media: { __compat: {}, 'prefers-color-scheme': C(), 'device-width': C( { deprecated: true } ), media_features: C() } }, types: { length: { __compat: {}, em: C(), viewport_percentage_units_dynamic: { __compat: { description: '<code>dvh</code>, <code>dvw</code> units' } } } } },
	html: { global_attributes: { __compat: {}, popover: C(), data_attributes: C() }, elements: { __compat: {}, div: C(), marquee: C( { deprecated: true } ), img: { ...C(), loading: C(), aspect_ratio_computed_from_attributes: C() }, input: { ...C(), type_date: C() }, iframe: { ...C(), 'cross-origin-top-navigation': { __compat: { description: 'cross-origin top-navigation requires user activation' } } } } },
	svg: { elements: { __compat: {}, path: C(), animate: C() } },
};
const CSS = { properties: { 'grid-template-columns': { groups: [ 'CSS Grid Layout' ] } }, atRules: { '@container': {} }, selectors: { ':hover': { status: 'standard' }, '::before': { status: 'standard' }, '::-moz-thing': { status: 'nonstandard' }, 'Child combinator': { status: 'standard' } }, functions: { 'clamp()': { status: 'standard' }, 'translate()': { status: 'standard' } }, units: { px: {} } };
const OEMBED = [ { provider_name: 'YouTube', provider_url: 'https://www.youtube.com/' }, { provider_name: 'Broken', provider_url: 'not a url' } ];
const ARIA = { roles: new Map( [ [ 'tab', { abstract: false } ], [ 'widget', { abstract: true } ] ] ), aria: new Map( [ [ 'aria-expanded', {} ] ] ) };
const ATTRS = { '*': [ 'popover', 'itemprop' ], img: [ 'loading', 'alt' ], input: [ 'value' ] };
const draft = ( over = {} ) => buildInventory( { dbFile: null, bcd: BCD, css: CSS, oembed: OEMBED, aria: ARIA, attributes: ATTRS, tags: [ 'div', 'marquee' ], ...over } );

test( 'POSITIVE (1.6): every draft-side section is derived from its data package, with deprecated flags', () => {
	const inv = draft();
	assert.deepEqual( ids( inv, 'css-media-feature' ), [ 'css-media-feature:device-width', 'css-media-feature:prefers-color-scheme' ] );
	assert.equal( inv.sections[ 'css-media-feature' ].entries[ 0 ].deprecated, true );
	assert.deepEqual( ids( inv, 'html-attr' ), [ 'html-attr:global.data', 'html-attr:global.itemprop', 'html-attr:global.popover', 'html-attr:img.alt', 'html-attr:img.loading', 'html-attr:input.value' ] );
	assert.deepEqual( ids( inv, 'input-type' ), [ 'input-type:date' ] );
	assert.deepEqual( ids( inv, 'svg' ), [ 'svg:animate', 'svg:path' ] );
	assert.equal( inv.sections.svg.entries[ 0 ].motion, true );
	assert.deepEqual( ids( inv, 'embed' ), [ 'embed:youtube.com' ] );
	assert.deepEqual( ids( inv, 'css-pseudo-class' ), [ 'css-pseudo-class:hover' ] );
	assert.deepEqual( ids( inv, 'css-pseudo-element' ), [ 'css-pseudo-element:-moz-thing', 'css-pseudo-element:before' ] );
	assert.equal( inv.sections[ 'css-pseudo-element' ].entries[ 0 ].deprecated, true );
	assert.deepEqual( ids( inv, 'css-function' ), [ 'css-function:clamp', 'css-function:translate' ] );
	assert.deepEqual( ids( inv, 'css-unit' ), [ 'css-unit:dvh', 'css-unit:dvw', 'css-unit:em', 'css-unit:percent', 'css-unit:px' ] );
	assert.deepEqual( ids( inv, 'aria-role' ), [ 'aria-role:tab' ] );
	assert.deepEqual( ids( inv, 'aria-attr' ), [ 'aria-attr:aria-expanded' ] );
	assert.deepEqual( inv.sections.html.entries.map( ( e ) => [ e.id, !! e.deprecated ] ), [ [ 'html:div', false ], [ 'html:marquee', true ] ] );
} );

test( 'MUST FAIL (1.6): a planted entry in each draft-side source becomes a new inventory entry', () => {
	const before = new Set( allEntries( draft() ).map( ( e ) => e.id ) );
	const bcd = structuredClone( BCD );
	bcd.css[ 'at-rules' ].media[ 'prefers-planted' ] = C();
	bcd.html.global_attributes.plantedattr = C();
	bcd.html.elements.input.type_planted = C();
	bcd.svg.elements.plantedShape = C();
	const css = structuredClone( CSS );
	css.selectors[ ':planted' ] = { status: 'standard' };
	css.functions[ 'planted()' ] = { status: 'standard' };
	css.units.plu = {};
	const attributes = { ...ATTRS, video: [ 'plantedattr2' ] };
	const added = allEntries( draft( { bcd, css, attributes, oembed: [ ...OEMBED, { provider_name: 'Planted', provider_url: 'https://planted.example/' } ], aria: { roles: new Map( [ ...ARIA.roles, [ 'planted', { abstract: false } ] ] ), aria: ARIA.aria } } ) ).map( ( e ) => e.id ).filter( ( id ) => ! before.has( id ) ).sort();
	assert.deepEqual( added, [ 'aria-role:planted', 'css-function:planted', 'css-media-feature:prefers-planted', 'css-pseudo-class:planted', 'css-unit:plu', 'embed:planted.example', 'html-attr:global.plantedattr', 'html-attr:video.plantedattr2', 'input-type:planted', 'svg:plantedShape' ] );
} );
