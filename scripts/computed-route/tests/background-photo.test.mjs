// B5, Spec 48 FR-48-39: an element that paints one picture as its CSS background (no <img>) is read (snap.bgImg), its address is
// looked up in the upload map (lib/fill-media.mjs::pictureEntry) and written to the block's picture setting as the attachment
// (an image setting `{ url, id }`, or a block's image trio); a gradient setting never takes a url, and the draft preview
// server's own address is never written. Each test fails against the code before this change (only <img> was read, the measured
// url() was written as it stood).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { mediaDecisions, imageSlots, pictureEntry } from '../lib/fill-media.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const db = openDb();
const MAP = { sites: { 'acme-test': { files: [ { asset: 'sites/acme/handoff/assets/photo-love.jpg', id: 77, url: 'https://acme.test/wp-content/uploads/photo-love.jpg' } ] } } };
const ORIGIN = 'http://127.0.0.1:59003';
const media = { map: MAP, site: 'acme-test', origin: ORIGIN };
const PREVIEW = `url("${ ORIGIN }/assets/photo-love.jpg")`;
const snapshot = { palette: [], spacing: [], fontSizes: [] };

test( 'pictureEntry: a preview-server address names its upload; an unmapped file, a gradient and another origin name none', () => {
	assert.equal( pictureEntry( `${ ORIGIN }/assets/photo-love.jpg`, media ).id, 77 );
	assert.equal( pictureEntry( 'assets/photo-love.jpg', media ).id, 77 );
	assert.equal( pictureEntry( `${ ORIGIN }/assets/other.jpg`, media ), null );
	assert.equal( pictureEntry( 'linear-gradient(red, blue)', media ), null );
	assert.equal( pictureEntry( 'https://elsewhere.test/assets/photo-love.jpg', media ), null );
	const twice = { ...media, map: { sites: { 'acme-test': { files: [ ...MAP.sites[ 'acme-test' ].files, { asset: 'sites/acme2/assets/photo-love.jpg', id: 78, url: 'https://acme.test/wp-content/uploads/photo-love-2.jpg' } ] } } } };
	assert.equal( pictureEntry( 'assets/photo-love.jpg', twice ), null, 'two attachments for one file name no picture' );
} );

const containerCal = { settings: { backgroundImage: { slot: '', property: 'background-image' } } };

test( 'MUST FAIL: a container\'s background photo is written as the uploaded attachment, never the preview server\'s address', () => {
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'background-image', perWidth: { 1440: PREVIEW } }, { db, snapshot, calibration: containerCal, media } );
	assert.deepEqual( r.writes, [ { attr: 'backgroundImage', value: { url: 'https://acme.test/wp-content/uploads/photo-love.jpg', id: 77 }, merge: 'replace' } ] );
	assert.doesNotMatch( JSON.stringify( r ), /127\.0\.0\.1/ );
} );

test( 'NEGATIVE: a photo the upload map lacks, or a run with no media map, writes nothing and names the gap', () => {
	for ( const ctxMedia of [ { map: MAP, site: 'acme-test', origin: 'http://127.0.0.1:1' }, { map: null, site: 'acme-test', origin: ORIGIN }, null ] ) {
		const r = resolve( { block: 'sgs/container', slot: '', prop: 'background-image', perWidth: { 1440: PREVIEW } }, { db, snapshot, calibration: containerCal, media: ctxMedia } );
		assert.equal( r.writes, undefined );
		assert.match( r.detail, /no file in the media map/ );
	}
} );

test( 'MUST FAIL: a gradient setting never takes a picture', () => {
	const attr = 'backgroundColourGradient';
	const r = resolve( { block: 'sgs/brand-strip', slot: '', prop: 'background-image', perWidth: { 1440: PREVIEW } }, { db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: 'background-image' } } }, media } );
	assert.equal( r.writes, undefined, 'the picture is not written to the gradient setting' );
	assert.match( r.detail || '', /holds a gradient/ );
} );

test( 'NEGATIVE: a real gradient still reaches its gradient setting', () => {
	const attr = 'backgroundColourGradient';
	const g = 'linear-gradient(135deg, rgb(255, 0, 0), rgb(0, 0, 255))';
	const r = resolve( { block: 'sgs/brand-strip', slot: '', prop: 'background-image', perWidth: { 1440: g } }, { db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: 'background-image' } } }, media } );
	assert.equal( r.writes?.[ 0 ]?.value, g );
} );

const SCHEMA = { imageUrl: { type: 'string' }, imageId: { type: 'integer' }, imageAlt: { type: 'string' } };
const SLOTS = imageSlots( db, 'sgs/media', SCHEMA );

test( 'a background photo is the picture of a block holding one image trio', () => {
	const r = mediaDecisions( { slots: SLOTS, schema: SCHEMA, img: { tag: 'background', src: `${ ORIGIN }/assets/photo-love.jpg`, alt: null, caption: null }, media } );
	assert.deepEqual( Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) ), { imageUrl: 'https://acme.test/wp-content/uploads/photo-love.jpg', imageId: 77 } );
	assert.equal( r.checks[ 0 ].id, 77 );
	assert.equal( r.unmapped.length, 0 );
} );

test( 'NEGATIVE: a block with no image setting is no gap for a background photo (its background-image setting takes it); an unmapped photo is a named gap', () => {
	const none = mediaDecisions( { slots: [], schema: {}, img: { tag: 'background', src: `${ ORIGIN }/assets/photo-love.jpg`, alt: null, caption: null }, media } );
	assert.deepEqual( [ none.writes, none.unmapped ], [ [], [] ] );
	const lost = mediaDecisions( { slots: SLOTS, schema: SCHEMA, img: { tag: 'background', src: `${ ORIGIN }/assets/other.jpg`, alt: null, caption: null }, media } );
	assert.deepEqual( lost.writes, [] );
	assert.match( lost.unmapped[ 0 ].reason, /not in the media map/ );
} );

// The page read: an element painting one url() background is a picture; a gradient, an <img> holder and a plain box are not.
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } main { padding: 8px } img { display: block }
.card { width: 200px; height: 100px; background-image: url("assets/photo-love.jpg"); background-size: cover }
.grad { width: 200px; height: 100px; background-image: linear-gradient(red, blue) }
.layers { width: 200px; height: 100px; background-image: url("assets/photo-love.jpg"), url("assets/photo-love.jpg") }
.holder { width: 200px; height: 100px; background-image: url("assets/photo-love.jpg") }
.plain { width: 200px; height: 100px }
</style></head><body><main>
<div class="card"></div><div class="grad"></div><div class="layers"></div><div class="holder"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="10" height="10"></div><div class="plain"></div>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [ '.card', '.grad', '.layers', '.holder', '.plain' ].map( ( draftRef ) => ( { name: 'sgs/container', draftRef, attributes: {} } ) ) } ];
let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'bg-photo-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const bg = ( id ) => read.widths[ 1440 ][ id ].bgImg;

test( 'MUST FAIL: an element painting one url() background reads as a picture with the address the page resolved', () => {
	assert.equal( bg( '1:' ).tag, 'background' );
	assert.equal( bg( '1:' ).src, `${ served.url.replace( /\/$/, '' ) }/assets/photo-love.jpg` );
} );

test( 'NEGATIVE: a gradient, several layers, an <img> holder and a plain box read no background picture', () => {
	assert.equal( bg( '2:' ), null );
	assert.equal( bg( '3:' ), null );
	assert.equal( bg( '4:' ), null, 'an element holding an <img> reads the <img>, not its background' );
	assert.equal( bg( '5:' ), null );
} );

// Through fillTree: a card whose photo is its CSS background, on a block holding one image trio, ends with the attachment in
// the picture setting and its `background-image` row settled by it (not an UNMAPPED row for a setting the block lacks).
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const CAL = { 'sgs/media': { block: 'sgs/media', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...BASE } ] ) ) }, settings: {}, discovered: {} } };
function fillCard( bgImg ) {
	const sk = [ { name: 'sgs/media', draftRef: '.card', attributes: {} } ];
	const s = { styles: { ...BASE, 'background-image': PREVIEW }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 100 }, inFlow: true, words: '', href: null, bgImg };
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': s } ] ) );
	return { tree, ...fillTree( { tree, nodes: skeletonNodes( sk ), reads: { widths, declared: {}, sweep: {}, origin: ORIGIN }, db, snapshot, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: ORIGIN, media: { map: MAP, site: 'acme-test' } } ) };
}

test( 'MUST FAIL: a CSS background photo reaches the block\'s picture setting and its background-image row is settled, not left as a gap', () => {
	const r = fillCard( { tag: 'background', src: `${ ORIGIN }/assets/photo-love.jpg`, alt: null, caption: null } );
	assert.equal( r.tree[ 0 ].attributes.imageUrl, 'https://acme.test/wp-content/uploads/photo-love.jpg' );
	assert.equal( r.tree[ 0 ].attributes.imageId, 77 );
	assert.ok( r.settled.some( ( x ) => 'background-image' === x.property && 'row-held' === x.reason ), JSON.stringify( r.settled.map( ( x ) => [ x.property, x.reason ] ) ) );
	assert.equal( r.unmapped.filter( ( u ) => 'background-image' === u.property ).length, 0 );
	assert.doesNotMatch( JSON.stringify( r.tree ), /127\.0\.0\.1/ );
} );

test( 'NEGATIVE: with no background picture read, nothing is placed and the row is not settled by a picture', () => {
	const r = fillCard( null );
	assert.equal( r.tree[ 0 ].attributes.imageUrl, undefined );
	assert.ok( ! r.settled.some( ( x ) => 'background-image' === x.property && 'row-held' === x.reason ) );
} );
