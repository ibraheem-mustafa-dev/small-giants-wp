// markClipped reads a clipped control's edge from the shot in a browser page. MUST FAIL: a shot the browser cannot
// decode (a full page tens of thousands of pixels tall; indus-foods about at 375, 1155x60309, 2026-11-01) threw out of
// the walk and lost the whole surface; it now leaves that shot's clip check unread, named, and the controls uncut.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { markClipped } from '../lib/auto-walk.mjs';

const shot = () => {
	const f = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'clip-' ) ), 'shot.png' );
	fs.writeFileSync( f, Buffer.from( [ 137, 80, 78, 71 ] ) );
	return f;
};
const auto = () => ( { dpr: 1, vh: 900, scrollX: 0, scrollY: 0, controls: [ { type: 'input:range', client: { t: 10, b: 30, l: 0, r: 100 }, clip: { t: 0, b: 200, l: 0, r: 100, bg: 'rgb(255, 255, 255)' } } ] } );
const ctx = ( evaluate ) => {
	const closed = [];
	return { closed, newPage: async () => ( { evaluate, close: async () => closed.push( true ) } ) };
};

test( 'markClipped: an undecodable shot leaves the clip check unread and named, never throws', async () => {
	const a = auto();
	const c = ctx( async () => {
		throw new Error( 'page.evaluate: EncodingError: The source image cannot be decoded.' );
	} );
	await assert.doesNotReject( () => markClipped( c, shot(), a, true ) );
	assert.equal( a.controls[ 0 ].cut, undefined );
	assert.match( a.clipUnread, /cannot be decoded/ );
	assert.equal( c.closed.length, 1 );
} );

test( 'NEGATIVE: a decodable shot still marks the cut side', async () => {
	const a = auto();
	await markClipped( ctx( async () => [ true, false ] ), shot(), a, true );
	assert.equal( a.controls[ 0 ].cut, 'right' );
	assert.equal( a.clipUnread, undefined );
} );
