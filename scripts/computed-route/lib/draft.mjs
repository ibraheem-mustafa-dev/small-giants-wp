// Serves a draft that exists only as local files (Fill step 1, FR-47-4): a static server on 127.0.0.1 at an ephemeral
// port, so the browser reads the draft as a real page with relative assets, directory indexes and correct content types.
// Nothing outside the folder is ever served, and close() leaves no port held.
import fs from 'fs';
import http from 'http';
import path from 'path';

const TEXT = 'charset=utf-8';
const TYPES = {
	'.html': `text/html; ${ TEXT }`, '.htm': `text/html; ${ TEXT }`, '.css': `text/css; ${ TEXT }`,
	'.js': `text/javascript; ${ TEXT }`, '.mjs': `text/javascript; ${ TEXT }`, '.json': `application/json; ${ TEXT }`,
	'.map': `application/json; ${ TEXT }`, '.txt': `text/plain; ${ TEXT }`, '.xml': `application/xml; ${ TEXT }`,
	'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
	'.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
	'.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
	'.wav': 'audio/wav', '.pdf': 'application/pdf', '.wasm': 'application/wasm',
};

// The Content-Type for a file name; an unknown extension is application/octet-stream.
export const contentType = ( file ) => TYPES[ path.extname( file ).toLowerCase() ] || 'application/octet-stream';

const inside = ( root, file ) => file === root || file.startsWith( root + path.sep );

// Maps a request path to a file under `root` (a real path). Returns { file } for a file or directory entry that exists
// and lies inside root, { redirect } for a directory requested without its trailing slash, or { status } (400 for a bad
// escape, 403 for a path leaving root, 404 for nothing there). `index` names a file a folder without index.html serves.
export function resolveRequest( root, urlPath, index ) {
	let decoded;
	try {
		decoded = decodeURIComponent( urlPath.split( /[?#]/ )[ 0 ] );
	} catch {
		return { status: 400 };
	}
	if ( decoded.includes( '\0' ) ) {
		return { status: 400 };
	}
	const slashed = decoded.replace( /\\/g, '/' );
	const target = path.resolve( root, `.${ slashed.startsWith( '/' ) ? '' : '/' }${ slashed }` );
	if ( ! inside( root, target ) ) {
		return { status: 403 };
	}
	let real;
	try {
		real = fs.realpathSync( target );
	} catch {
		return { status: 404 };
	}
	// A symlink resolving outside the folder is a missing file, not a way out.
	if ( ! inside( root, real ) ) {
		return { status: 404 };
	}
	if ( ! fs.statSync( real ).isDirectory() ) {
		return { file: real };
	}
	if ( ! decoded.endsWith( '/' ) ) {
		return { redirect: `${ decoded }/` };
	}
	for ( const name of [ 'index.html', index ].filter( Boolean ) ) {
		const f = path.join( real, name );
		if ( fs.existsSync( f ) && fs.statSync( f ).isFile() && inside( root, fs.realpathSync( f ) ) ) {
			return { file: fs.realpathSync( f ) };
		}
	}
	return { status: 404 };
}

// One Range header against a file size: { start, end } or null when it cannot be satisfied.
function byteRange( header, size ) {
	const m = /^bytes=(\d*)-(\d*)$/.exec( String( header ).trim() );
	if ( ! m || ( '' === m[ 1 ] && '' === m[ 2 ] ) ) {
		return null;
	}
	const start = '' === m[ 1 ] ? Math.max( 0, size - Number( m[ 2 ] ) ) : Number( m[ 1 ] );
	const end = '' === m[ 1 ] || '' === m[ 2 ] ? size - 1 : Math.min( Number( m[ 2 ] ), size - 1 );
	return start > end || start >= size ? null : { start, end };
}

function respond( root, index, req, res ) {
	if ( ! [ 'GET', 'HEAD' ].includes( req.method ) ) {
		res.writeHead( 405, { Allow: 'GET, HEAD' } ).end();
		return;
	}
	const hit = resolveRequest( root, req.url || '/', index );
	if ( hit.status ) {
		res.writeHead( hit.status ).end();
		return;
	}
	if ( hit.redirect ) {
		res.writeHead( 301, { Location: hit.redirect } ).end();
		return;
	}
	const size = fs.statSync( hit.file ).size;
	const headers = { 'Content-Type': contentType( hit.file ), 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
	const range = req.headers.range ? byteRange( req.headers.range, size ) : undefined;
	if ( null === range ) {
		res.writeHead( 416, { 'Content-Range': `bytes */${ size }` } ).end();
		return;
	}
	const [ status, start, end ] = range ? [ 206, range.start, range.end ] : [ 200, 0, size - 1 ];
	res.writeHead( status, { ...headers, 'Content-Length': String( size ? end - start + 1 : 0 ), ...( range ? { 'Content-Range': `bytes ${ start }-${ end }/${ size }` } : {} ) } );
	if ( 'HEAD' === req.method || ! size ) {
		res.end();
		return;
	}
	fs.createReadStream( hit.file, { start, end } ).on( 'error', () => res.destroy() ).pipe( res );
}

// Serves `folder` on 127.0.0.1 at an ephemeral port. `index` names the file a folder without an index.html serves at its
// root (a handoff whose page is "Home.dc.html"). Returns { url, port, close }: url ends in a slash; close() ends every
// connection and resolves once the port is free, and may be called again.
export async function serveDraft( folder, { index = null, host = '127.0.0.1' } = {} ) {
	const root = fs.existsSync( folder ) && fs.statSync( folder ).isDirectory() ? fs.realpathSync( folder ) : null;
	if ( ! root ) {
		throw new Error( `${ folder } is not a directory` );
	}
	const server = http.createServer( ( req, res ) => respond( root, index, req, res ) );
	await new Promise( ( done, fail ) => server.once( 'error', fail ).listen( 0, host, done ) );
	const { port } = server.address();
	let closing = null;
	const close = () => {
		closing ||= new Promise( ( done ) => {
			server.close( () => done() );
			server.closeAllConnections();
		} );
		return closing;
	};
	return { url: `http://${ host }:${ port }/`, port, close };
}
