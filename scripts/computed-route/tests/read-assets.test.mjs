// Spec 48 FR-48-7, lib/read-assets.mjs and its join in lib/fact-record.mjs::joinFacts: the files under `assets/` (intrinsic
// ratio, sha256, animation, group ids) and the assets each template element names. A small folder and a stand-in template
// replace a draft (no browser). Each MUST FAIL test names the behaviour whose removal turns it red
// (tests/fixtures/read-assets/mutations.json holds the mutations, tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readAssets, svgFacts, rasterSize, refPath } from '../lib/read-assets.mjs';
import { joinFacts, countsOf, FACTS_SCHEMA_VERSION } from '../lib/fact-record.mjs';
import { sourcesOf, assertCurrent, StaleRecordError } from '../lib/freshness.mjs';

const png = ( w, h ) => {
	const b = Buffer.alloc( 33 );
	Buffer.from( [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ] ).copy( b );
	b.writeUInt32BE( 13, 8 );
	b.write( 'IHDR', 12 );
	b.writeUInt32BE( w, 16 );
	b.writeUInt32BE( h, 20 );
	return b;
};
const jpeg = ( w, h ) => Buffer.from( [ 0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0 ] );
const webp = ( w, h ) => {
	const b = Buffer.alloc( 30 );
	b.write( 'RIFF', 0 );
	b.write( 'WEBP', 8 );
	b.write( 'VP8X', 12 );
	b.writeUIntLE( w - 1, 24, 3 );
	b.writeUIntLE( h - 1, 27, 3 );
	return b;
};
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3741.59 847.97" width="10" height="10"><g id="mountain"/><g id="sunrays_spin"/></svg>';
const SVG_ANIM = '<svg viewBox="0 0 100 50"><style>@keyframes spin{to{transform:rotate(1turn)}}</style><g id="a"><animateTransform attributeName="transform"/></g></svg>';

// Page/0 is an img by src, Page/1 a div with a background-image, Page/2 an image-slot, Page/3 a custom element mapped by its
// project script, Page/4 an img with a hole, Page/5 an img whose file is missing.
const el = ( tag, attrs = {}, decls = [] ) => ( { tag, realTag: tag, attrs, style: { static: decls, holes: [] }, pseudo: {} } );
const template = {
	order: [ 'Page/0', 'Page/1', 'Page/2', 'Page/3', 'Page/4', 'Page/5' ],
	elements: {
		'Page/0': el( 'img', { src: './assets/photo.png', alt: '' } ),
		'Page/1': el( 'div', {}, [ [ 'background-image', 'url("assets/hero%20x.jpg")' ] ] ),
		'Page/2': el( 'image-slot', { id: 's1', shape: 'rect', placeholder: 'Team photo' } ),
		'Page/3': el( 'brand-logo', { variant: 'wide' } ),
		'Page/4': el( 'img', { src: 'assets/{{ item.img }}.png' } ),
		'Page/5': el( 'img', { src: 'assets/gone.png' } ),
	},
	gaps: [],
};

function folder() {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'read-assets-' ) );
	fs.mkdirSync( path.join( dir, 'assets' ) );
	fs.writeFileSync( path.join( dir, 'assets', 'photo.png' ), png( 800, 400 ) );
	fs.writeFileSync( path.join( dir, 'assets', 'hero x.jpg' ), jpeg( 300, 200 ) );
	fs.writeFileSync( path.join( dir, 'assets', 'logo.svg' ), SVG );
	fs.writeFileSync( path.join( dir, 'assets', 'spin.svg' ), SVG_ANIM );
	fs.writeFileSync( path.join( dir, 'assets', 'orphan.webp' ), webp( 64, 32 ) );
	fs.writeFileSync( path.join( dir, 'brand-logo.js' ), "const SRC = { wide: './assets/logo.svg', tall: './assets/lost.svg' };\n" );
	return dir;
}
const withFolder = ( fn ) => {
	const dir = folder();
	try {
		return fn( dir );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
};

test( 'MUST FAIL (svg ratio): an SVG size is its viewBox, not its width and height attributes; those are read only without a viewBox', () => {
	const s = svgFacts( SVG );
	assert.deepEqual( [ s.width, s.height ], [ 3741.59, 847.97 ] );
	assert.equal( svgFacts( '<svg width="200" height="50px"></svg>' ).width, 200 );
	assert.equal( svgFacts( '<svg width="100%" height="50"></svg>' ).width, null, 'a percentage names no size' );
	assert.deepEqual( s.groups, [ 'mountain', 'sunrays_spin' ] );
} );

test( 'MUST FAIL (raster header): PNG, JPEG, WebP and GIF sizes come from the file header', () => {
	assert.deepEqual( rasterSize( png( 800, 400 ), 'png' ), { width: 800, height: 400 } );
	assert.deepEqual( rasterSize( jpeg( 300, 200 ), 'jpeg' ), { width: 300, height: 200 } );
	assert.deepEqual( rasterSize( webp( 64, 32 ), 'webp' ), { width: 64, height: 32 } );
	const gif = Buffer.alloc( 10 );
	gif.write( 'GIF89a', 0 );
	gif.writeUInt16LE( 20, 6 );
	gif.writeUInt16LE( 10, 8 );
	assert.deepEqual( rasterSize( gif, 'gif' ), { width: 20, height: 10 } );
	assert.equal( rasterSize( Buffer.from( 'not an image' ), 'png' ), null );
} );

test( 'MUST FAIL (match by src and background-image): an element holds the file its src or url() names, with ratio, kind and sha256', () => withFolder( ( dir ) => {
	const r = readAssets( { folder: dir, template } );
	const [ a ] = r.byElement[ 'Page/0' ];
	assert.deepEqual( [ a.path, a.ratio, a.kind, a.animated, a.via ], [ 'assets/photo.png', 2, 'png', false, 'attr:src' ] );
	assert.equal( a.sha256, r.files[ 'assets/photo.png' ].sha256 );
	assert.match( a.sha256, /^[0-9a-f]{64}$/ );
	const [ b ] = r.byElement[ 'Page/1' ];
	assert.deepEqual( [ b.path, b.ratio, b.kind, b.via ], [ 'assets/hero x.jpg', 1.5, 'jpeg', 'style:background-image' ] );
	assert.equal( r.byElement[ 'Page/4' ], undefined, 'a {{ }} value names no file' );
} ) );

test( 'MUST FAIL (script map and slot): a custom element takes the path its project script maps its attribute to; an image-slot keeps its placeholder as alt evidence', () => withFolder( ( dir ) => {
	const r = readAssets( { folder: dir, template } );
	assert.deepEqual( r.byElement[ 'Page/3' ].map( ( a ) => [ a.path, a.via ] ), [ [ 'assets/logo.svg', 'script:brand-logo.js' ] ] );
	assert.deepEqual( r.alt[ 'Page/2' ], { source: 'image-slot', placeholder: 'Team photo', hole: false, id: 's1' } );
	assert.equal( r.byElement[ 'Page/2' ], undefined, 'a slot with no src holds no asset' );
} ) );

test( 'MUST FAIL (missing and unused): a referenced path with no file is missing and names its element or script; a file nothing names is unused', () => withFolder( ( dir ) => {
	const r = readAssets( { folder: dir, template } );
	assert.deepEqual( r.assets.missing.map( ( m ) => [ m.path, m.by ] ).sort(), [ [ 'assets/gone.png', 'Page/5' ], [ 'assets/lost.svg', 'brand-logo.js' ] ] );
	assert.deepEqual( r.assets.unused.sort(), [ 'assets/orphan.webp', 'assets/spin.svg' ] );
	assert.equal( r.assets.files, 5 );
	assert.equal( refPath( 'https://x.test/assets/a.png' ), null );
	assert.equal( refPath( ' ./assets/a%20b.png?v=2#x ' ), 'assets/a b.png' );
} ) );

test( 'MUST FAIL (animated svg): an SVG with a keyframes style or an animate element is flagged animated; a still one is not', () => withFolder( ( dir ) => {
	const r = readAssets( { folder: dir, template } );
	assert.equal( r.files[ 'assets/spin.svg' ].animated, true );
	assert.deepEqual( r.files[ 'assets/spin.svg' ].groups, [ 'a' ] );
	assert.equal( r.files[ 'assets/logo.svg' ].animated, false );
	assert.equal( svgFacts( '<svg viewBox="0 0 1 1"><set attributeName="x"/></svg>' ).animated, true );
	assert.equal( svgFacts( '<svg viewBox="0 0 1 1"><style>.a{fill:red}</style></svg>' ).animated, false );
	assert.equal( svgFacts( '<svg viewBox="0 0 1 1"><style>@keyframes k{to{opacity:0}}</style></svg>' ).animated, true );
} ) );

test( 'MUST FAIL (join): joinFacts puts assets and alt evidence on each element, the top-level assets block and the counts in the record', () => withFolder( ( dir ) => {
	const assets = readAssets( { folder: dir, template } );
	const tpl = { ...template, elements: Object.fromEntries( Object.entries( template.elements ).map( ( [ k, v ] ) => [ k, { ...v, parentChain: [], fingerprint: { tag: v.tag, parentTags: [], textHash: '' } } ] ) ) };
	const empty = { gaps: [], byElement: {}, surfaces: {}, byTemplate: new Map(), conditions: {}, holes: {}, mounted: {}, records: 0, unjoined: [] };
	const joined = joinFacts( { client: 'fixture', sources: { files: {}, route: { commit: null } }, widths: [ 375 ], template: tpl, logic: empty, surfaces: empty, animations: empty, assets, instances: empty } );
	assert.equal( joined.schema, FACTS_SCHEMA_VERSION );
	assert.deepEqual( joined.elements[ 'Page/0' ].assets.map( ( a ) => a.path ), [ 'assets/photo.png' ] );
	assert.equal( joined.elements[ 'Page/2' ].alt.placeholder, 'Team photo' );
	assert.deepEqual( joined.elements[ 'Page/4' ].assets, [] );
	assert.deepEqual( joined.assets, assets.assets );
	assert.deepEqual( joined.counts.assets, { files: 5, elements: 3, unused: 2, missing: 2 } );
	assert.deepEqual( countsOf( joined.elements, [ 375 ], [] ).assets, { files: 0, elements: 3, unused: 0, missing: 0 }, 'countsOf without the reader result counts no files' );
} ) );

test( 'MUST FAIL (freshness): a record whose sources hold an asset is refused when the asset changes, and when a project script changes', () => withFolder( ( dir ) => {
	const sources = sourcesOf( dir, { commit: null } );
	assert.ok( 'assets/photo.png' in sources.files && 'brand-logo.js' in sources.files );
	assert.deepEqual( assertCurrent( { sources }, dir ), { checked: true } );
	fs.writeFileSync( path.join( dir, 'assets', 'photo.png' ), png( 801, 400 ) );
	assert.throws( () => assertCurrent( { sources }, dir ), ( e ) => e instanceof StaleRecordError && /assets\/photo\.png changed/.test( e.message ) );
	fs.writeFileSync( path.join( dir, 'assets', 'photo.png' ), png( 800, 400 ) );
	fs.writeFileSync( path.join( dir, 'brand-logo.js' ), '// changed\n' );
	assert.throws( () => assertCurrent( { sources }, dir ), ( e ) => /brand-logo\.js changed/.test( e.message ) );
} ) );
