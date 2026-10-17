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
