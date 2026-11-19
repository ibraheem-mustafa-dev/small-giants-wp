// FR-48-23: how the recorder stores a response body in the replay HAR (lib/intake-record.mjs::bodyContent). Pure: no
// network, no browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyContent } from '../lib/intake-record.mjs';

// The first bytes of a woff2 file and a few bytes above 0x7F that are not valid UTF-8 sequences.
const FONT = Buffer.from( [ 0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00, 0xff, 0xfe, 0x80, 0xc3, 0x28, 0xa0, 0xa1, 0xf8 ] );

test( 'MUST FAIL: a binary body served with a text content type is stored in base64 and comes back byte for byte', () => {
	const got = bodyContent( 'text/html; charset=utf-8', FONT );
	assert.equal( got.encoding, 'base64' );
	assert.deepEqual( Buffer.from( got.text, 'base64' ), FONT );
} );

test( 'negative control: real text with a text content type stays text, non-ASCII included', () => {
	const css = Buffer.from( '@font-face{font-family:"Caveat";src:url(a.woff2)} /* café £ ✦ */', 'utf8' );
	assert.deepEqual( bodyContent( 'text/css; charset=utf-8', css ), { text: css.toString( 'utf8' ) } );
	assert.deepEqual( bodyContent( 'application/javascript', Buffer.from( 'let a = 1;' ) ), { text: 'let a = 1;' } );
	assert.deepEqual( bodyContent( 'application/json', Buffer.from( '{"a":"é"}' ) ), { text: '{"a":"é"}' } );
} );

test( 'negative control: a body with a binary content type is base64 even when its bytes happen to be valid UTF-8', () => {
	const body = Buffer.from( 'plain ascii bytes' );
	const got = bodyContent( 'font/woff2', body );
	assert.equal( got.encoding, 'base64' );
	assert.deepEqual( Buffer.from( got.text, 'base64' ), body );
	assert.equal( bodyContent( 'application/octet-stream', body ).encoding, 'base64' );
} );

test( 'an empty text body is text', () => {
	assert.deepEqual( bodyContent( 'text/css', Buffer.alloc( 0 ) ), { text: '' } );
} );
