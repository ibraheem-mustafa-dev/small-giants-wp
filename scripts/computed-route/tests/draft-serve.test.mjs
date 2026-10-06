// L9.1 (Fill step 1, lib/draft.mjs): a local draft folder is served on 127.0.0.1 at an ephemeral port, never outside the
// folder, and the port is released on close.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import http from 'http';
import { serveDraft, contentType, resolveRequest } from '../lib/draft.mjs';

function folder( files ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'draft-serve-' ) );
	const site = path.join( root, 'site' );
	for ( const [ name, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( site, name ) ), { recursive: true } );
		fs.writeFileSync( path.join( site, name ), body );
	}
	fs.writeFileSync( path.join( root, 'secret.txt' ), 'outside the draft folder' );
	return { root, site };
}

const get = ( url, { method = 'GET', headers = {} } = {} ) => new Promise( ( done, fail ) => {
	const req = http.request( url, { method, headers, agent: false }, ( res ) => {
		const chunks = [];
		res.on( 'data', ( c ) => chunks.push( c ) );
		res.on( 'end', () => done( { status: res.statusCode, headers: res.headers, body: Buffer.concat( chunks ).toString( 'utf8' ) } ) );
	} );
	req.on( 'error', fail );
	req.end();
} );

// A raw request line, so the client cannot normalise ../ away before the server sees it.
const raw = ( port, requestPath ) => new Promise( ( done ) => {
	const sock = net.connect( port, '127.0.0.1', () => sock.write( `GET ${ requestPath } HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n` ) );
	let data = '';
	sock.on( 'data', ( c ) => ( data += c ) );
	sock.on( 'close', () => done( { status: Number( data.split( ' ' )[ 1 ] ), body: data.split( '\r\n\r\n' ).slice( 1 ).join( '\r\n\r\n' ) } ) );
} );

test( 'MUST FAIL: a request that climbs out of the draft folder is never served', async () => {
	const { site } = folder( { 'index.html': '<p>draft</p>' } );
	const s = await serveDraft( site );
	try {
		for ( const p of [ '/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/a/../../secret.txt', '/%5c..%5csecret.txt' ] ) {
			const r = await raw( s.port, p );
			assert.ok( [ 400, 403, 404 ].includes( r.status ), `${ p } answered ${ r.status }` );
			assert.ok( ! r.body.includes( 'outside the draft folder' ), `${ p } leaked the file` );
		}
	} finally {
		await s.close();
	}
} );

test( 'MUST FAIL: a symlink inside the folder pointing outside it is never followed', async ( t ) => {
	const { root, site } = folder( { 'index.html': '<p>draft</p>' } );
	try {
		fs.symlinkSync( path.join( root, 'secret.txt' ), path.join( site, 'link.txt' ) );
	} catch {
		t.skip( 'this account may not create symlinks' );
		return;
	}
	const s = await serveDraft( site );
	try {
		const r = await get( `${ s.url }link.txt` );
		assert.equal( r.status, 404 );
		assert.ok( ! r.body.includes( 'outside the draft folder' ) );
	} finally {
		await s.close();
	}
} );

test( 'an ephemeral port on 127.0.0.1: nonzero, distinct per server, the url names it', async () => {
	const { site } = folder( { 'index.html': 'x' } );
	const a = await serveDraft( site );
	const b = await serveDraft( site );
	try {
		assert.ok( a.port > 0 && b.port > 0 && a.port !== b.port );
		assert.equal( a.url, `http://127.0.0.1:${ a.port }/` );
	} finally {
		await a.close();
		await b.close();
	}
} );

test( 'directory index: / and nested directories serve index.html, a directory without its slash redirects', async () => {
	const { site } = folder( { 'index.html': 'home', 'about/index.html': 'about page', 'about/team/index.html': 'team page' } );
	const s = await serveDraft( site );
	try {
		assert.equal( ( await get( s.url ) ).body, 'home' );
		assert.equal( ( await get( `${ s.url }about/` ) ).body, 'about page' );
		assert.equal( ( await get( `${ s.url }about/team/` ) ).body, 'team page' );
		const r = await get( `${ s.url }about` );
		assert.equal( r.status, 301 );
		assert.equal( r.headers.location, '/about/' );
	} finally {
		await s.close();
	}
} );

test( 'an explicit index file serves a folder that has no index.html, and index.html still wins when present', async () => {
	const named = folder( { 'Eye Care.dc.html': 'named index', 'app.js': '1' } );
	const s = await serveDraft( named.site, { index: 'Eye Care.dc.html' } );
	try {
		assert.equal( ( await get( s.url ) ).body, 'named index' );
		assert.equal( ( await get( `${ s.url }Eye%20Care.dc.html` ) ).body, 'named index', 'a percent-encoded space in a file name resolves' );
	} finally {
		await s.close();
	}
	const both = folder( { 'index.html': 'real index', 'other.html': 'other' } );
	const t = await serveDraft( both.site, { index: 'other.html' } );
	try {
		assert.equal( ( await get( t.url ) ).body, 'real index' );
	} finally {
		await t.close();
	}
	const none = folder( { 'other.html': 'other' } );
	const u = await serveDraft( none.site );
	try {
		assert.equal( ( await get( u.url ) ).status, 404 );
	} finally {
		await u.close();
	}
} );

test( 'relative asset paths resolve against the page and carry the right content type', async () => {
	const { site } = folder( { 'index.html': '<link href="css/a.css">', 'css/a.css': 'a{}', 'js/app.js': '1', 'img/x.svg': '<svg/>', 'img/y.png': 'png', 'f/z.woff2': 'w', 'data.json': '{}', 'blob.unknownext': 'b' } );
	const s = await serveDraft( site );
	try {
		const type = async ( p ) => ( await get( `${ s.url }${ p }` ) ).headers[ 'content-type' ];
		assert.match( await type( '' ), /^text\/html; charset=utf-8$/ );
		assert.match( await type( 'css/a.css' ), /^text\/css; charset=utf-8$/ );
		assert.match( await type( 'js/app.js' ), /^text\/javascript; charset=utf-8$/ );
		assert.equal( await type( 'img/x.svg' ), 'image/svg+xml' );
		assert.equal( await type( 'img/y.png' ), 'image/png' );
		assert.equal( await type( 'f/z.woff2' ), 'font/woff2' );
		assert.match( await type( 'data.json' ), /^application\/json/ );
		assert.equal( await type( 'blob.unknownext' ), 'application/octet-stream' );
		assert.equal( ( await get( `${ s.url }css/a.css?v=3#frag` ) ).body, 'a{}', 'a query string and fragment are ignored' );
	} finally {
		await s.close();
	}
} );

test( 'missing files answer 404, HEAD has no body, other methods answer 405', async () => {
	const { site } = folder( { 'index.html': 'home' } );
	const s = await serveDraft( site );
	try {
		assert.equal( ( await get( `${ s.url }nope.css` ) ).status, 404 );
		const h = await get( s.url, { method: 'HEAD' } );
		assert.equal( h.status, 200 );
		assert.equal( h.body, '' );
		assert.equal( h.headers[ 'content-length' ], '4' );
		const p = await get( s.url, { method: 'POST' } );
		assert.equal( p.status, 405 );
		assert.equal( p.headers.allow, 'GET, HEAD' );
	} finally {
		await s.close();
	}
} );

test( 'a Range request answers 206 with the slice, an unsatisfiable one 416', async () => {
	const { site } = folder( { 'index.html': '0123456789' } );
	const s = await serveDraft( site );
	try {
		const r = await get( s.url, { headers: { Range: 'bytes=2-5' } } );
		assert.equal( r.status, 206 );
		assert.equal( r.body, '2345' );
		assert.equal( r.headers[ 'content-range' ], 'bytes 2-5/10' );
		assert.equal( ( await get( s.url, { headers: { Range: 'bytes=50-60' } } ) ).status, 416 );
	} finally {
		await s.close();
	}
} );

test( 'close releases the port at once, even with a keep-alive connection open, and is safe to call twice', async () => {
	const { site } = folder( { 'index.html': 'home' } );
	const s = await serveDraft( site );
	const port = s.port;
	const keep = net.connect( port, '127.0.0.1' );
	await new Promise( ( r ) => keep.once( 'connect', r ) );
	keep.write( 'GET / HTTP/1.1\r\nHost: x\r\nConnection: keep-alive\r\n\r\n' );
	await new Promise( ( r ) => keep.once( 'data', r ) );
	await s.close();
	await s.close();
	await assert.rejects( () => new Promise( ( res, rej ) => {
		const c = net.connect( port, '127.0.0.1', () => {
			c.destroy();
			res();
		} );
		c.on( 'error', rej );
	} ), /ECONNREFUSED/ );
	// The port can be bound again straight away: nothing holds it.
	await new Promise( ( res, rej ) => {
		const again = net.createServer().once( 'error', rej ).listen( port, '127.0.0.1', () => again.close( res ) );
	} );
	keep.destroy();
} );

test( 'a missing or non-directory draft folder fails before listening', async () => {
	await assert.rejects( () => serveDraft( path.join( os.tmpdir(), 'draft-serve-does-not-exist' ) ), /not a directory/ );
	const { root } = folder( { 'index.html': 'x' } );
	await assert.rejects( () => serveDraft( path.join( root, 'secret.txt' ) ), /not a directory/ );
} );

test( 'resolveRequest and contentType are pure: traversal and a bad escape never reach the disk', () => {
	const { site } = folder( { 'index.html': 'home' } );
	const root = fs.realpathSync( site );
	assert.equal( resolveRequest( root, '/', null ).file, path.join( root, 'index.html' ) );
	assert.equal( resolveRequest( root, '/%zz', null ).status, 400 );
	assert.equal( resolveRequest( root, '/../x', null ).status, 403 );
	assert.equal( resolveRequest( root, '/a%00b', null ).status, 400 );
	assert.equal( contentType( 'A.CSS' ), 'text/css; charset=utf-8' );
} );
