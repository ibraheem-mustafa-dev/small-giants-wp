// A draft that loads a CDN script renders from a local copy of it: a `mirror` entry answers that one URL from disk, every
// other URL beyond the draft's origin stays blocked (lib/fill-read.mjs::routeDraft, fill.mjs::parseMirrors). The "CDN" here
// is a second local server on another port, so it is genuinely a different origin that would load if it were allowed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { parseMirrors } from '../fill.mjs';

const NODES = skeletonNodes( [ { name: 'sgs/text', draftRef: 'p.x', attributes: {} } ] );
const tmp = ( prefix ) => fs.mkdtempSync( path.join( os.tmpdir(), prefix ) );

test( 'MUST FAIL: a script on another origin is blocked, answered from its mirror when one is named, and a second mirror is honoured too', async () => {
	const cdnDir = tmp( 'fill-mirror-cdn-' );
	fs.writeFileSync( path.join( cdnDir, 'lib.js' ), "document.querySelector('p.x').textContent = 'from the cdn script';" );
	fs.writeFileSync( path.join( cdnDir, 'other.js' ), "document.querySelector('p.x').textContent = 'from the other cdn script';" );
	const cdn = await serveDraft( cdnDir );
	const local = tmp( 'fill-mirror-local-' );
	const LIB = `${ cdn.url }lib.js`;
	const OTHER = `${ cdn.url }other.js`;
	fs.writeFileSync( path.join( local, 'index.html' ), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><p class="x">original</p><script src="${ LIB }"></script><script src="${ OTHER }"></script></body></html>` );
	const draft = await serveDraft( local );
	const mirrors = tmp( 'fill-mirror-files-' );
	const lib = path.join( mirrors, 'lib.js' );
	fs.writeFileSync( lib, "document.querySelector('p.x').textContent = 'from the mirrored script';" );
	const other = path.join( mirrors, 'other.js' );
	fs.writeFileSync( other, "document.querySelector('p.x').textContent = 'from an unmirrored script';" );
	const words = async ( mirror ) => ( await readDraft( { url: draft.url, nodes: NODES, sweep: false, mirror } ) ).widths[ 1440 ][ '0:' ].words;
	try {
		assert.equal( await words( {} ), 'original', 'the other origin would answer, but is blocked' );
		assert.equal( await words( { [ LIB ]: lib } ), 'from the mirrored script', 'the mirrored URL is served from disk, the other still blocked' );
		assert.equal( await words( { [ LIB ]: lib, [ OTHER ]: other } ), 'from an unmirrored script', 'a second mirror entry is honoured too' );
	} finally {
		await draft.close();
		await cdn.close();
	}
} );

test( 'parseMirrors reads --mirror <url> <file> pairs, repeatable, as absolute paths, and refuses a lone url', () => {
	const m = parseMirrors( [ '--client', 'x', '--mirror', 'https://a/x.js', 'one.js', '--mirror', 'https://b/y.js', 'two.js' ] );
	assert.deepEqual( Object.keys( m ), [ 'https://a/x.js', 'https://b/y.js' ] );
	assert.ok( path.isAbsolute( m[ 'https://a/x.js' ] ) && m[ 'https://a/x.js' ].endsWith( 'one.js' ) );
	assert.deepEqual( parseMirrors( [ '--client', 'x' ] ), {} );
	assert.throws( () => parseMirrors( [ '--mirror', 'https://a/x.js' ] ), /takes a url and a file/ );
} );
