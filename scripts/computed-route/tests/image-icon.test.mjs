// A4 leftover, Spec 48 FR-48-39 (icons) and Track S1's label icons (lib/skeleton-model.mjs::isLabelIcon): a link or button that
// draws its icon as an <img> beside its words is one `sgs/button` whose icon is an inline SVG or a Lucide name. Fill writes the
// icon from the draft's SVG file (lib/fill-icon.mjs::imageIconDecisions); a raster image or a missing file is a named UNMAPPED
// row, never a silent drop. Each test fails against the code before this change (an <img> icon on a button was dropped: the
// block has no image setting, so the media pass took the control for a wrapper).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { imageIconDecisions } from '../lib/fill-icon.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const db = openDb();
const ORIGIN = 'http://127.0.0.1:59003';
const MARK = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#0B2B17" d="M2 2h20v20H2z"/></svg>';
const folder = fs.mkdtempSync( path.join( os.tmpdir(), 'img-icon-' ) );
fs.mkdirSync( path.join( folder, 'assets' ) );
fs.writeFileSync( path.join( folder, 'assets', 'mark.svg' ), MARK );
fs.writeFileSync( path.join( folder, 'assets', 'photo.png' ), 'x' );
fs.writeFileSync( path.join( path.dirname( folder ), 'outside.svg' ), MARK );
const schema = blockSchema( 'sgs/button' );
const run = ( img, over = {} ) => imageIconDecisions( { img, words: 'Message me', schema, folder, origin: ORIGIN, ...over } );
const val = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;

test( 'MUST FAIL: an SVG file the button draws as an <img> is written as its inline icon', () => {
	const r = run( { tag: 'a', src: `${ ORIGIN }/assets/mark.svg`, alt: '' } );
	assert.equal( val( r, 'iconSource' ), undefined, 'a button holds the icon as iconSvg, with no source setting' );
	assert.match( val( r, 'iconSvg' ), /^<svg\b[^>]*>.*<path\b/s );
	assert.doesNotMatch( val( r, 'iconSvg' ), /<\?xml/ );
	assert.ok( r.unmapped.every( ( u ) => 'icon image' !== u.property ), 'the file was read and written, so no icon-image row' );
	assert.ok( r.notes.some( ( n ) => /assets\/mark\.svg/.test( n ) ) );
} );

test( 'NEGATIVE: a raster icon, a file the folder lacks and a path that leaves the folder are named rows and write nothing', () => {
	for ( const src of [ `${ ORIGIN }/assets/photo.png`, `${ ORIGIN }/assets/missing.svg`, `${ ORIGIN }/../outside.svg`, 'assets/%2e%2e/%2e%2e/outside.svg', 'data:image/svg+xml;base64,AAAA' ] ) {
		const r = run( { tag: 'a', src, alt: '' } );
		assert.deepEqual( r.writes, [], src );
		assert.equal( r.unmapped.length, 1, src );
		assert.equal( r.unmapped[ 0 ].property, 'icon image' );
	}
} );

test( 'NEGATIVE: an <img> that is the element itself, a background photo, a control with no words and a block with no icon setting write nothing', () => {
	const src = `${ ORIGIN }/assets/mark.svg`;
	assert.deepEqual( run( { tag: 'img', src } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( run( { tag: 'background', src } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( run( { tag: 'a', src }, { words: '  ' } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( run( { tag: 'a', src }, { schema: blockSchema( 'sgs/heading' ) } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( run( null ), { writes: [], unmapped: [], notes: [] } );
} );

// Through fillTree: the "Message me" link of a draft, an anchor holding words and one <img> icon.
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const BASE = { display: 'inline-flex', color: 'rgb(20, 20, 20)', 'font-size': '14px', 'font-weight': '500', 'line-height': '20px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const CAL = { 'sgs/button': { block: 'sgs/button', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...BASE } ] ) ) }, settings: {}, discovered: {} } };
function fillLink( img ) {
	const sk = [ { name: 'sgs/button', draftRef: 'a.msg', attributes: { label: 'Message me' } } ];
	const s = { styles: { ...BASE }, pseudo: {}, rect: { x: 0, y: 0, w: 140, h: 50 }, inFlow: true, words: 'Message me', href: 'https://wa.me/4479605978', img };
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': s } ] ) );
	return { tree, ...fillTree( { tree, nodes: skeletonNodes( sk ), reads: { widths, declared: {}, sweep: {}, origin: ORIGIN }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: ORIGIN, draftFolder: folder, media: { map: null, site: 'acme-test' } } ) };
}

test( 'MUST FAIL: Fill writes the <img> icon of a link into the button\'s icon slot', () => {
	const r = fillLink( { tag: 'a', src: `${ ORIGIN }/assets/mark.svg`, alt: '', caption: null } );
	assert.match( r.tree[ 0 ].attributes.iconSvg || '', /<path\b/ );
	assert.ok( ! r.unmapped.some( ( u ) => 'image' === u.property ), 'the icon is no image gap' );
} );

test( 'NEGATIVE: a link with no image has no icon written', () => {
	const r = fillLink( null );
	assert.equal( r.tree[ 0 ].attributes.iconSvg, undefined );
} );
