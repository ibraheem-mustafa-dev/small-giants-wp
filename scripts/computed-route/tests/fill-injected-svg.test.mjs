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
	blocks: [ { slug: 'sgs/container', title: 'Container', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/responsive-logo', title: 'Logo', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/text', title: 'Text', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/container', attr_name: 'anchor', attr_type: 'string', role: 'content' },
		{ block_slug: 'sgs/container', attr_name: 'bgSvgContent', attr_type: 'string', role: 'svg' },
		{ block_slug: 'sgs/responsive-logo', attr_name: 'alignWide', attr_type: 'boolean', role: 'layout' },
		{ block_slug: 'sgs/container', attr_name: 'bgSvgOpacity', attr_type: 'number', role: 'visual' },
		{ block_slug: 'sgs/responsive-logo', attr_name: 'inlineSvg', attr_type: 'boolean', role: 'boolean-visibility' },
		{ block_slug: 'sgs/responsive-logo', attr_name: 'linkToHome', attr_type: 'boolean', role: 'boolean-visibility' },
	],
} ) );
const FOLDER = fs.mkdtempSync( path.join( os.tmpdir(), 'injected-svg-' ) );
fs.mkdirSync( path.join( FOLDER, 'assets' ) );
fs.writeFileSync( path.join( FOLDER, 'assets', 'hero-desktop.svg' ), '<?xml version="1.0"?>\n<!-- editor -->\n<svg viewBox="0 0 2100 1000"><metadata>m</metadata><g id="sunrays_spin"/></svg>' );
const at = ( src ) => ( src ? { tag: 'svg', viewBox: '0 0 1 1', source: src } : null );
const HERO = { key: 'Site/321#0', parentKey: 'Site/316#0', tag: 'div', injected: { 375: at( 'assets/hero-mobile.svg' ), 768: at( 'assets/hero-tablet.svg' ), 1440: at( 'assets/hero-desktop.svg' ) } };
const SECTION = { key: 'Site/316#0', parentKey: null, tag: 'section' };
const LOGO = { key: 'Site/43#0', parentKey: null, tag: 'brand-mark', injected: { 375: at( 'assets/logo.svg' ), 768: at( 'assets/logo.svg' ), 1440: at( 'assets/logo.svg' ) } };
const node = ( index, name, tpl ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '', finder: { tpl } } ] } );
const run = ( nodes, elements ) => {
	const flat = nodes.map( ( n ) => ( { name: n.name, attributes: {}, ref: `r${ n.index }` } ) );
	const out = injectedSvgWrites( { nodes, flat, refOf: ( x ) => x.ref, inventory: { elements }, db: DB, draftFolder: FOLDER } );
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
