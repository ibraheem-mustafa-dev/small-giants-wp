// A picture's own name (lib/fill-read-collect.mjs::collectMany `imageName`): the aria-label of a role="img" element, or of
// a textless, roleless element with no link inside and no control of its own (a custom-element logo whose script has not
// given it a role). lib/fill-link-attrs.mjs::linkAttrDecisions writes it to the block's image-alt setting. Real case: a
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
body { margin: 0 } x-logo, .pic, .lnk, .btn, .txt { display: block; width: 120px; height: 30px }
</style></head><body>
<a href="/" aria-label="Brand home"><x-logo class="cus" aria-label="Brand Ltd"></x-logo></a>
<div class="pic" role="img" aria-label="Brand mark"></div>
<a class="lnk" href="/x" aria-label="Go somewhere"></a>
<button class="btn" aria-label="Open menu"></button>
<div class="txt" aria-label="Words">Some words</div>
</body></html>`;

const TREE = [ '.cus', '.pic', '.lnk', '.btn', '.txt' ].map( ( draftRef ) => ( { name: 'sgs/responsive-logo', draftRef, attributes: {} } ) );

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

test( 'a link, a button and an element with words are never a picture: no image name', () => {
	assert.equal( name( 2 ), null );
	assert.equal( name( 3 ), null );
	assert.equal( name( 4 ), null );
	assert.equal( read.widths[ 1440 ][ '2:' ].ariaLabel, 'Go somewhere', 'the link label still reads as a link label' );
} );
