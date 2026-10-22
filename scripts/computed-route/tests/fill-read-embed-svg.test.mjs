// The page read's embed, SVG and nested-image signals (lib/fill-read.mjs, snap.embed, snap.svg, snap.img), read from a real
// served draft in a real browser, then judged by the writers (lib/fill-map.mjs, lib/fill-icon.mjs, lib/fill-media.mjs).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { mapDecisions } from '../lib/fill-map.mjs';
import { iconDecisions } from '../lib/fill-icon.mjs';
import { nestedImage } from '../lib/fill-media.mjs';

const SVG = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 120 40%27%3E%3Crect width=%27120%27 height=%2740%27 fill=%27red%27/%3E%3C/svg%3E';
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } .ico { color: #123456; width: 24px; height: 24px; display: block }
.ico path { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round }
.ico .solid { fill: #ff0000; stroke: none }
iframe { display: block; width: 100%; height: 320px; border: 0; filter: grayscale(.35) contrast(1.05) }
@media (min-width: 1000px) { iframe { height: 210px } }
.media { width: 200px }
</style></head><body>
<a class="link" href="/x"><svg class="ico" viewBox="0 0 24 24"><path d="M4 12h16"/><circle class="solid" cx="12" cy="12" r="3"/></svg></a>
<iframe class="map" title="map" src="https://www.google.com/maps?q=1+High+Street&z=14&output=embed"></iframe>
<div class="media"><div class="inner"><img alt="A loaf" src="${ SVG }" width="60" height="20"></div></div>
<div class="drawer" style="background:#123428"><div class="scroll" style="overflow-y:auto;height:50px;scrollbar-width:thin;scrollbar-color:rgba(231,215,104,.75) transparent"><p style="height:200px">x</p></div></div>
</body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'body', attributes: {}, innerBlocks: [
	{ name: 'sgs/icon', draftRef: 'a.link', attributes: {} },
	{ name: 'sgs/business-info', draftRef: 'iframe.map', attributes: { displayType: 'map' } },
	{ name: 'sgs/media', draftRef: '.media', attributes: {}, innerBlocks: [] },
	{ name: 'sgs/nav-drawer', draftRef: '.drawer', attributes: {} },
] } ];

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-embed-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const at = ( w, id ) => read.widths[ w ][ id ];

test( 'MUST FAIL: the page read carries the SVG with the CSS paint written onto each drawing element', () => {
	const { markup } = at( 1440, '1:' ).svg;
	assert.match( markup, /<path [^>]*stroke="currentColor"/ );
	assert.match( markup, /stroke-width="1\.5px"/ );
	assert.match( markup, /<circle [^>]*fill="rgb\(255, 0, 0\)"/ );
	const r = iconDecisions( { svg: at( 1440, '1:' ).svg, schema: { iconSource: {}, iconSvg: {}, iconFill: {} } } );
	assert.equal( r.writes.find( ( w ) => 'iconSource' === w.attr )?.value, 'custom' );
	assert.doesNotMatch( r.writes.find( ( w ) => 'iconSvg' === w.attr ).value, /class=/ );
} );

test( 'MUST FAIL: the page read carries the map iframe\'s address, filter and height at each width', () => {
	assert.equal( at( 1440, '2:' ).embed.h, 210 );
	assert.equal( at( 375, '2:' ).embed.h, 320 );
	assert.match( at( 1440, '2:' ).embed.filter, /grayscale\(0\.35\) contrast\(1\.05\)/ );
	const embeds = Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, at( w, '2:' ).embed ] ) );
	const r = mapDecisions( { schema: { mapHeight: {}, mapZoom: {}, mapFilter: {} }, embeds } );
	assert.deepEqual( r.writes.find( ( w ) => 'mapHeight' === w.attr ).value, { desktop: '210px', tablet: '320px' } );
	assert.equal( r.writes.find( ( w ) => 'mapZoom' === w.attr ).value, 14 );
} );

test( 'MUST FAIL: a nested image (inside wrapper elements) is read and found by nestedImage', () => {
	const img = at( 1440, '3:' ).img;
	assert.equal( img.alt, 'A loaf' );
	assert.equal( nestedImage( { '': at( 1440, '3:' ) } ).alt, 'A loaf' );
} );

test( 'MUST FAIL: the page read carries the scroller\'s scrollbar colours, width and the ground it sits on (a descendant scroller is found)', () => {
	const sb = at( 1440, '4:' ).scrollbar;
	assert.equal( sb.color, 'rgba(231, 215, 104, 0.75) rgba(0, 0, 0, 0)' );
	assert.equal( sb.width, 'thin' );
	assert.equal( sb.ground, 'rgb(18, 52, 40)' );
	assert.equal( at( 1440, '1:' ).scrollbar, null, 'an element with no scroller of its own colour reads none' );
} );
