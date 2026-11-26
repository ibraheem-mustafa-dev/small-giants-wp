// Spec 48 RC12: the SVG a draft's code injects (read per width by the skeleton inventory) is carried through the framework's
// own settings (lib/fill-injected-svg.mjs::injectedSvgWrites): a section's SVG content setting (role `svg` in the framework
// DB) takes the widest width's file with a named row for the narrower widths' own files; a logo block's inline SVG setting
// is turned on. The inventory entries are a real client's About hero holder and header logo as the inventory now reads them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { injectedSvgWrites, svgMarkup } from '../lib/fill-injected-svg.mjs';

const DB = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/container', title: 'Container', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/responsive-logo', title: 'Logo', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/nav-drawer', title: 'sgs/nav-drawer', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/site-header', title: 'sgs/site-header', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/site-footer', title: 'sgs/site-footer', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/media', title: 'sgs/media', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/text', title: 'Text', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/container', attr_name: 'anchor', attr_type: 'string', role: 'content' },
		{ block_slug: 'sgs/container', attr_name: 'bgSvgContent', attr_type: 'string', role: 'svg' },
		{ block_slug: 'sgs/responsive-logo', attr_name: 'alignWide', attr_type: 'boolean', role: 'layout' },
		{ block_slug: 'sgs/container', attr_name: 'bgSvgOpacity', attr_type: 'number', role: 'visual' },
		{ block_slug: 'sgs/responsive-logo', attr_name: 'inlineSvg', attr_type: 'boolean', role: 'boolean-visibility' },
		{ block_slug: 'sgs/responsive-logo', attr_name: 'linkToHome', attr_type: 'boolean', role: 'boolean-visibility' },
		// The real DB's other SVG-named switches (a text shadow on the SVG background or picture), which never print an SVG inline.
		{ block_slug: 'sgs/container', attr_name: 'bgSvgTextShadow', attr_type: 'boolean', role: 'behaviour' },
		{ block_slug: 'sgs/nav-drawer', attr_name: 'backgroundSvgTextShadow', attr_type: 'boolean', role: 'behaviour' },
		{ block_slug: 'sgs/nav-drawer', attr_name: 'chromeLogoInlineSvg', attr_type: 'boolean', role: 'behaviour' },
		{ block_slug: 'sgs/site-header', attr_name: 'backgroundSvgTextShadow', attr_type: 'boolean', role: 'behaviour' },
		{ block_slug: 'sgs/site-footer', attr_name: 'backgroundSvgTextShadow', attr_type: 'boolean', role: 'behaviour' },
		{ block_slug: 'sgs/media', attr_name: 'svgTextShadow', attr_type: 'boolean', role: 'behaviour' },
	],
} ) );
const FOLDER = fs.mkdtempSync( path.join( os.tmpdir(), 'injected-svg-' ) );
fs.mkdirSync( path.join( FOLDER, 'assets' ) );
fs.writeFileSync( path.join( FOLDER, 'assets', 'hero-desktop.svg' ), '<?xml version="1.0"?>\n<!-- editor -->\n<svg viewBox="0 0 2100 1000"><metadata>m</metadata><g id="sunrays_spin"/></svg>' );
const at = ( src ) => ( src ? { tag: 'svg', viewBox: '0 0 1 1', source: src } : null );
const BOX = ( w, h ) => ( { 375: { x: 0, y: 0, w, h }, 768: { x: 0, y: 0, w, h }, 1440: { x: 0, y: 0, w, h } } );
const HERO = { key: 'Site/321#0', parentKey: 'Site/316#0', tag: 'div', box: BOX( 1440, 700 ), injected: { 375: at( 'assets/hero-mobile.svg' ), 768: at( 'assets/hero-tablet.svg' ), 1440: at( 'assets/hero-desktop.svg' ) } };
const SECTION = { key: 'Site/316#0', parentKey: null, tag: 'section', box: BOX( 1440, 720 ) };
const LOGO = { key: 'Site/43#0', parentKey: null, tag: 'brand-mark', injected: { 375: at( 'assets/logo.svg' ), 768: at( 'assets/logo.svg' ), 1440: at( 'assets/logo.svg' ) } };
const node = ( index, name, tpl ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl } } ] } );
const run = ( nodes, elements, logoOwned = false ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = injectedSvgWrites( { nodes, flat, refOf: ( x ) => x.ref, inventory: { elements }, db: DB, draftFolder: FOLDER, logoOwned } );
	return { out, flat };
};

test( 'MUST FAIL: a holder\'s injected SVG is its section\'s SVG content (the widest file, a named row for the other widths), and a logo\'s turns its inline SVG on', () => {
	const { out, flat } = run( [ node( 0, 'sgs/container', 'Site/316#0' ), node( 1, 'sgs/responsive-logo', 'Site/43#0' ) ], [ SECTION, HERO, LOGO ] );
	assert.equal( flat[ 0 ].attributes.bgSvgContent, '<svg viewBox="0 0 2100 1000"><g id="sunrays_spin"/></svg>' );
	assert.equal( flat[ 1 ].attributes.inlineSvg, true );
	assert.deepEqual( out.unmapped.map( ( u ) => u.value ), [ '768: assets/hero-tablet.svg, 375: assets/hero-mobile.svg' ] );
	assert.match( out.unmapped[ 0 ].reason, /holds one SVG for every width; the draft swaps to assets\/hero-tablet\.svg at 768px and assets\/hero-mobile\.svg at 375px/ );
} );

test( 'negative control: an element with no injected SVG writes nothing; a block with no SVG setting, or no block at all, is a named row', () => {
	assert.deepEqual( run( [ node( 0, 'sgs/container', 'Site/316#0' ) ], [ SECTION ] ).out, { writes: [], unmapped: [], notes: [] } );
	const plain = run( [ node( 0, 'sgs/text', 'Site/43#0' ) ], [ LOGO ] );
	assert.deepEqual( plain.flat[ 0 ].attributes, {} );
	assert.match( plain.out.unmapped[ 0 ].reason, /sgs\/text has no SVG content or inline SVG setting/ );
	const none = run( [], [ LOGO ] );
	assert.match( none.out.unmapped[ 0 ].reason, /no block of this surface holds that element/ );
	assert.equal( svgMarkup( '<?xml x?><svg><!-- c --><metadata>a</metadata><path/></svg>' ), '<svg><path/></svg>' );
} );

test( 'MUST FAIL: only a switch that prints the SVG inline is turned on; the SVG text-shadow switches of the real DB never are', () => {
	for ( const block of [ 'sgs/site-header', 'sgs/site-footer', 'sgs/media' ] ) {
		const { out, flat } = run( [ node( 0, block, 'Site/43#0' ) ], [ LOGO ] );
		assert.deepEqual( flat[ 0 ].attributes, {}, block );
		assert.match( out.unmapped[ 0 ].reason, new RegExp( `${ block.replace( '/', '\\/' ) } has no SVG content or inline SVG setting` ) );
	}
	const drawer = run( [ node( 0, 'sgs/nav-drawer', 'Site/43#0' ) ], [ LOGO ] );
	assert.deepEqual( drawer.flat[ 0 ].attributes, { chromeLogoInlineSvg: true }, 'the drawer\'s logo switch, not its background text shadow' );
} );

test( 'MUST FAIL: with build/logo-svgparts.json the logo\'s inline switch is the apply stage\'s, so Fill leaves it with a note', () => {
	for ( const block of [ 'sgs/responsive-logo', 'sgs/nav-drawer' ] ) {
		const { out, flat } = run( [ node( 0, block, 'Site/43#0' ) ], [ LOGO ], true );
		assert.deepEqual( flat[ 0 ].attributes, {}, block );
		assert.match( out.notes[ 0 ], /left to the apply stage, which writes it with the logo's parts from build\/logo-svgparts\.json/ );
	}
	const section = run( [ node( 0, 'sgs/container', 'Site/316#0' ) ], [ SECTION, HERO ], true );
	assert.ok( section.flat[ 0 ].attributes.bgSvgContent, 'a section\'s SVG background is still Fill\'s' );
} );

test( 'MUST FAIL: an SVG injected into a small part deep inside a block is a named row, never the block\'s background', () => {
	const ICON = { key: 'Site/330#0', parentKey: 'Site/321#0', tag: 'span', box: BOX( 24, 24 ), injected: { 1440: at( 'assets/hero-desktop.svg' ) } };
	const { out, flat } = run( [ node( 0, 'sgs/container', 'Site/316#0' ) ], [ SECTION, { ...HERO, injected: null }, ICON ] );
	assert.deepEqual( flat[ 0 ].attributes, {} );
	assert.match( out.unmapped[ 0 ].reason, /a part inside sgs\/container's element Site\/316#0 that does not cover it/ );
	const unread = run( [ node( 0, 'sgs/container', 'Site/316#0' ) ], [ { ...SECTION, box: null }, HERO ] );
	assert.deepEqual( unread.flat[ 0 ].attributes, {}, 'with no box read the holder is not taken as covering the block' );
} );
