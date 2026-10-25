// A picture's own name (lib/fill-read-collect.mjs::collectMany `imageName`): the aria-label of a role="img" element, a
// roleless img, svg or picture, or a textless, roleless element whose one element child is such a picture (a custom-element
// logo whose script has not given it a role); never an aria-hidden element, one with a click handler, a list, section or
// video. lib/fill-link-attrs.mjs::linkAttrDecisions writes it to the block's image-alt setting. Real case: a
// draft logo `<x-logo aria-label="Brand Ltd">` inside the home link; its name was read as a link label with no setting.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } x-logo, .pic, .lnk, .btn, .txt, .gal, .cls, .hid, .lst, .vid, .ico, .two, .wrd, .rol, .lnp { display: block; width: 120px; height: 30px }
</style></head><body>
<a href="/" aria-label="Brand home"><x-logo class="cus" aria-label="Brand Ltd"><svg viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10"/></svg></x-logo></a>
<div class="pic" role="img" aria-label="Brand mark"></div>
<a class="lnk" href="/x" aria-label="Go somewhere"></a>
<button class="btn" aria-label="Open menu"></button>
<div class="txt" aria-label="Words">Some words</div>
<section class="gal" aria-label="Gallery"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""></section>
<div class="cls" aria-label="Close" onclick="void 0"><svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg></div>
<div aria-hidden="true"><span class="hid" aria-label="Decor"><svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg></span></div>
<ul class="lst" aria-label="Partners"><li><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""></li></ul>
<video class="vid" aria-label="Intro"></video>
<svg class="ico" viewBox="0 0 10 10" aria-label="Badge"><rect width="10" height="10"/></svg>
<div class="two" aria-label="Pair"><svg viewBox="0 0 10 10"></svg><span></span></div>
<x-logo class="emp" aria-label="Empty"></x-logo>
<div class="wrd" aria-label="Captioned"><svg viewBox="0 0 10 10"></svg>Our story</div>
<div class="rol" role="button" aria-label="Menu"><svg viewBox="0 0 10 10"></svg></div>
<a class="lnp" aria-label="Anchor"><svg viewBox="0 0 10 10"></svg></a>
</body></html>`;

const TREE = [ '.cus', '.pic', '.lnk', '.btn', '.txt', '.gal', '.cls', '.hid', '.lst', '.vid', '.ico', '.two', '.emp', '.wrd', '.rol', '.lnp' ].map( ( draftRef ) => ( { name: 'sgs/responsive-logo', draftRef, attributes: {} } ) );

let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-read-image-name-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );

const name = ( i ) => read.widths[ 1440 ][ `${ i }:` ].imageName;

test( 'MUST FAIL: a roleless textless picture and a role="img" element carry their own aria-label as the picture\'s name', () => {
	assert.equal( name( 0 ), 'Brand Ltd' );
	assert.equal( name( 1 ), 'Brand mark' );
} );

test( 'MUST FAIL: a labelled section of images, a clickable close, an aria-hidden element, a list, a video, an element painting more than a picture, a control role and an anchor carry no image name', () => {
	for ( const i of [ 5, 6, 7, 8, 9, 11, 12, 13, 14, 15 ] ) {
		assert.equal( name( i ), null, TREE[ i ].draftRef );
	}
	assert.equal( name( 10 ), 'Badge', 'a labelled svg is a picture (positive control)' );
} );

test( 'a link, a button and an element with words are never a picture: no image name', () => {
	assert.equal( name( 2 ), null );
	assert.equal( name( 3 ), null );
	assert.equal( name( 4 ), null );
	assert.equal( read.widths[ 1440 ][ '2:' ].ariaLabel, 'Go somewhere', 'the link label still reads as a link label' );
} );
