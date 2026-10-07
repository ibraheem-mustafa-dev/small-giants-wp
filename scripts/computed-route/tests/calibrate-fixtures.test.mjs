// Proves the calibration fixtures plan the instances, parents and variants that the audit's dead classes need (Spec 47
// FR-47-2, L5.1/L5.2/L5.6). The real recalibration is a host run; these assert the planned tree, each piece cited to
// the render source that requires it. Pure: reads the fixture file and the tracked block sources.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildTree, planInstances, preconditionsFor } from '../lib/calibrate.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const FX = JSON.parse( fs.readFileSync( path.join( HERE, '../calibration-fixtures.json' ), 'utf8' ) );
const render = ( short ) => fs.readFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', short, 'render.php' ), 'utf8' );
const blockJson = ( short ) => JSON.parse( fs.readFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', short, 'block.json' ), 'utf8' ) );
// A variant's effective attributes, as planInstances merges them.
const effective = ( block ) => ( FX[ block ].variants || [ {} ] ).map( ( v ) => ( { ...( FX[ block ].attributes || {} ), ...v } ) );
const SNAP = { palette: [ { slug: 'accent', colour: { r: 200, g: 40, b: 90, a: 1 } } ], spacing: [], fontSizes: [] };

test( 'MUST FAIL (cart PORTAL_OR_CLOSED_SURFACE, 82 rows): a flyout and a drawer variant render the panel', () => {
	assert.match( render( 'cart' ), /\$has_panel\s*=\s*\$wc_active && in_array\( \$effective_mode, array\( 'flyout', 'drawer' \)/ );
	const modes = effective( 'sgs/cart' ).map( ( a ) => a.displayMode );
	assert.ok( modes.includes( 'flyout' ), 'a flyout variant' );
	assert.ok( modes.includes( 'drawer' ), 'a drawer variant' );
	assert.ok( modes.includes( 'link' ), 'link mode stays covered' );
	assert.ok( ( blockJson( 'cart' ).attributes.displayMode.enum || [] ).every( ( m ) => modes.includes( m ) ) );
} );

test( 'MUST FAIL (product-card FIXTURE_LACKS_ELEMENT, 47 rows): trial, featured, attribute-tag and picker variants exist', () => {
	const v = effective( 'sgs/product-card' );
	const trial = v.find( ( a ) => 'trial' === a.variantStyle );
	const featured = v.find( ( a ) => 'featured' === a.variantStyle );
	assert.ok( trial?.trialTag, 'trial variant carries its tag text' );
	assert.ok( featured?.featuredTag, 'featured variant carries its tag text' );
	// The tags render in typed mode only (render.php reads trialTag / featuredTag for the typed badge).
	assert.equal( trial.sourceMode, 'typed' );
	assert.equal( featured.sourceMode, 'typed' );
	assert.ok( v.every( ( a ) => ! a.attributeTagTerm || a.attributeTagTaxonomy ), 'the attribute tag term has its taxonomy beside it' );
	assert.ok( v.some( ( a ) => true === a.showPickers ), 'a variant turns the pickers on' );
	assert.ok( [ 'variantStyle', 'trialTag', 'featuredTag', 'attributeTagTaxonomy', 'showPickers' ].every( ( k ) => k in blockJson( 'product-card' ).attributes ) );
} );

test( 'MUST FAIL (nav-bar-menu featured and detach rows): a variant features an enabled item and another turns the detaching chip on', () => {
	const v = effective( 'sgs/nav-bar-menu' );
	const featured = v.find( ( a ) => ( a.featuredItemIds || [] ).length );
	assert.ok( featured );
	assert.ok( featured.featuredItemIds.every( ( id ) => ! ( featured.disabledItemIds || [] ).includes( id ) ), 'a featured item is not also disabled (a disabled item renders as text, not a link)' );
	const detach = v.find( ( a ) => a.triggerDetach && Object.values( a.triggerDetach ).includes( 'on' ) );
	assert.ok( detach, 'triggerDetach on for some tier (render.php queues the chip only then)' );
	assert.match( render( 'nav-bar-menu' ), /sgs_resolve_on_tiers\( \$attributes\['triggerDetach'\]/ );
} );

// The display types whose render value is a <p class="sgs-business-info …"> (render.php wraps __before/__after only there).
const P_TYPES = [ 'phone', 'email', 'copyright', 'description', 'attribution' ];

test( 'the <p> set the text-around check relies on is what render.php builds', () => {
	const src = render( 'business-info' );
	for ( const t of P_TYPES ) {
		assert.ok( src.includes( `<p class="sgs-business-info sgs-business-${ t }` ), `${ t } renders a <p class="sgs-business-info …">` );
	}
	assert.ok( src.includes( '<address class="sgs-business-info sgs-business-address">' ), 'address renders an <address>' );
	assert.match( src, /0 === strpos\( \$html, '<p class="sgs-business-info ' \)/ );
} );

test( 'MUST FAIL (CR17: __before can never appear on the address variant): every variant with textBefore or textAfter is a <p> display type', () => {
	const carrying = ( FX[ 'sgs/business-info' ].variants || [] ).filter( ( v ) => 'textBefore' in v || 'textAfter' in v );
	assert.ok( carrying.length > 0, 'a variant carries the text, or __before is never calibrated' );
	for ( const v of carrying ) {
		assert.ok( P_TYPES.includes( v.displayType ), `a ${ v.displayType } variant cannot carry textBefore/textAfter` );
	}
	assert.ok( carrying.some( ( v ) => v.textBefore ) );
} );

test( 'business-info names its own chunk and plans enough instances to need chunking', () => {
	assert.equal( FX[ 'sgs/business-info' ].chunk, 100 );
} );

test( 'MUST FAIL (mega-group sgsChildSizing discovered empty): the group is built inside a mega-panel in columns style', () => {
	const fx = FX[ 'sgs/mega-group' ];
	assert.deepEqual( fx.parents.map( ( p ) => p.name ), [ 'sgs/mega-panel' ] );
	assert.equal( fx.parents[ 0 ].attributes.style, 'columns' );
	assert.equal( blockJson( 'mega-panel' ).attributes.style.default, 'columns' );
	assert.ok( blockJson( 'mega-group' ).supports.sgs.enabledExtensions.includes( 'childSizing' ) );
	const tree = buildTree( 'sgs/mega-group', fx, [ { key: 'default-v0' } ] );
	const wrapper = tree[ 0 ];
	assert.equal( wrapper.name, 'sgs/container' );
	const panel = wrapper.innerBlocks.at( -1 );
	assert.equal( panel.name, 'sgs/mega-panel' );
	assert.equal( panel.innerBlocks[ 0 ].name, 'sgs/mega-group' );
	assert.equal( panel.innerBlocks[ 0 ].attributes.className, 'cr-ref-cal-0' );
	// The discovery plan includes each Child sizing value for the group.
	const rows = [];
	const enumRows = [ { attr_name: 'sgsChildSizing', enum_values: JSON.stringify( [ 'fit', 'fill', 'fixed' ] ), tier_shape: 'tier_object', css_property: null } ];
	const { instances } = planInstances( 'sgs/mega-group', { rows, enumRows, schema: {}, snapshot: SNAP, fixture: fx } );
	assert.deepEqual( instances.filter( ( i ) => i.discover ).map( ( i ) => i.discover.value ), [ 'fit', 'fill', 'fixed' ] );
} );

test( 'MUST FAIL (L5.6 NEEDS_VARIANT_OR_TOGGLE / NEEDS_LAYOUT_MODE): variants turn on the element each setting styles', () => {
	assert.ok( effective( 'sgs/brand-strip' ).some( ( a ) => true === a.fadeEdges ), 'brand-strip fadeEdges gates fadeWidth' );
	assert.ok( render( 'brand-strip' ).includes( '$fade_edges' ) );
	assert.ok( effective( 'sgs/social-icons' ).some( ( a ) => 'filled' === a.iconStyle ), 'social-icons filled paints iconBackground' );
	assert.ok( effective( 'sgs/notice-banner' ).some( ( a ) => 'circle' === a.iconStyle ), 'notice-banner circle paints the icon circle' );
	assert.ok( blockJson( 'notice-banner' ).attributes.iconStyle.enum.includes( 'circle' ) );
	assert.ok( effective( 'sgs/site-footer' ).some( ( a ) => 'grid' === a.layout ), 'site-footer grid layout paints columns' );
} );

test( 'every fixture variant names only attributes its block declares (or an extension attribute)', () => {
	for ( const [ block, fx ] of Object.entries( FX ) ) {
		const short = block.replace( /^sgs\//, '' );
		const file = path.join( REPO, 'plugins/sgs-blocks/src/blocks', short, 'block.json' );
		if ( ! fs.existsSync( file ) ) {
			continue;
		}
		const declared = new Set( Object.keys( JSON.parse( fs.readFileSync( file, 'utf8' ) ).attributes || {} ) );
		for ( const v of fx.variants || [] ) {
			for ( const k of Object.keys( v ) ) {
				assert.ok( declared.has( k ) || /^sgs[A-Z]/.test( k ), `${ block } variant names undeclared attribute ${ k }` );
			}
		}
		// A per-setting precondition names a declared setting and declared attributes only.
		for ( const [ setting, attrs ] of Object.entries( fx.preconditions || {} ) ) {
			assert.ok( declared.has( setting ), `${ block } precondition for undeclared setting ${ setting }` );
			for ( const k of Object.keys( attrs ) ) {
				assert.ok( declared.has( k ), `${ block } precondition sets undeclared attribute ${ k }` );
			}
		}
	}
} );

test( 'MUST FAIL ON REVERT (hero splitMediaWidth dead): a fixture precondition puts the gating attribute on the setting\'s instance', () => {
	const schema = { splitMediaWidth: { type: 'object' }, splitMediaObjectFit: { type: 'string', default: 'cover' } };
	const ctx = { settingPreconditions: FX[ 'sgs/hero' ].preconditions };
	assert.deepEqual( preconditionsFor( { attr_name: 'splitMediaWidth', css_property: 'width' }, schema, { splitMediaObjectFit: 'cover' }, ctx ), { splitMediaObjectFit: 'custom' } );
	// Another setting is untouched, and an instance already holding the value gets nothing extra.
	assert.deepEqual( preconditionsFor( { attr_name: 'splitMediaHeight', css_property: 'height' }, schema, {}, ctx ), {} );
	assert.deepEqual( preconditionsFor( { attr_name: 'splitMediaWidth', css_property: 'width' }, schema, { splitMediaObjectFit: 'custom' }, ctx ), {} );
} );
