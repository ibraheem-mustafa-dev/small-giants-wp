// Which hidden media elements does each browser download? Bean 2026-11-09, Spec 49 per-device kind design.
// A local server logs every request; each case uses its own file name. Run at 375 (cases hidden) and 1440 (positive control).
import { createRequire } from 'module';
import http from 'http';
import { writeFileSync, existsSync } from 'fs';

const roots = [ 'E:/sgs-tmp/wt-header/plugins/sgs-blocks/package.json', 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json' ];
const require = createRequire( roots.find( ( p ) => existsSync( p ) ) );
const { chromium, firefox, webkit } = require( 'playwright' );

const GIF = Buffer.from( 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64' );
const PAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
@media (max-width:767px){.hide-m{display:none}} @media (min-width:768px){.hide-d{display:none}} img,video,iframe{width:200px;height:120px;display:block}
@media (max-width:767px){img.hide-m,video.hide-m,iframe.hide-m{display:none}}
</style></head><body>
<img class="hide-m" src="/A-img-eager.gif" alt="">
<img class="hide-m" src="/B-img-lazy.gif" loading="lazy" alt="">
<div class="hide-m"><img src="/C-img-eager-in-hidden-parent.gif" alt=""></div>
<div class="hide-m"><img src="/D-img-lazy-in-hidden-parent.gif" loading="lazy" alt=""></div>
<video class="hide-m" preload="none" muted playsinline src="/E-video-preload-none.mp4"></video>
<video class="hide-m" autoplay muted loop playsinline src="/F-video-autoplay.mp4"></video>
<video class="hide-m" autoplay muted loop playsinline preload="none" src="/G-video-autoplay-preload-none.mp4"></video>
<video class="hide-m" autoplay muted loop playsinline data-src="/H-video-data-src-only.mp4"></video>
<video class="hide-m" preload="none" muted playsinline poster="/I-poster-on-hidden-video.gif" src="/I-video.mp4"></video>
<iframe class="hide-m" loading="lazy" src="/J-iframe-lazy.html" title="j"></iframe>
<iframe class="hide-m" src="/K-iframe-eager.html" title="k"></iframe>
<video autoplay muted loop playsinline poster="/L-poster-media-video.gif"><source media="(min-width:768px)" src="/L-video-source-media-desktop.mp4" type="video/mp4"></video>
<picture><source media="(min-width:768px)" srcset="/M-picture-desktop.gif"><img src="/M-picture-mobile.gif" alt=""></picture>
<picture class="hide-d"><source media="(min-width:768px)" srcset=""><img src="/O-mobile-only-EMPTY-srcset-desktop-source.gif" alt=""></picture>
<picture class="hide-d"><source media="(min-width:768px)" srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="><img src="/N-mobile-only-eager-blank-desktop-source.gif" alt=""></picture>
</body></html>`;

let hits = [];
const server = http.createServer( ( req, res ) => {
	const path = req.url.split( '?' )[ 0 ];
	if ( path === '/' ) { res.writeHead( 200, { 'content-type': 'text/html' } ); res.end( PAGE ); return; }
	hits.push( path );
	if ( path.endsWith( '.gif' ) ) { res.writeHead( 200, { 'content-type': 'image/gif' } ); res.end( GIF ); return; }
	if ( path.endsWith( '.html' ) ) { res.writeHead( 200, { 'content-type': 'text/html' } ); res.end( '<p>x</p>' ); return; }
	res.writeHead( 200, { 'content-type': 'video/mp4', 'content-length': 16 } ); res.end( Buffer.alloc( 16 ) );
} );
await new Promise( ( r ) => server.listen( 0, '127.0.0.1', r ) );
const url = `http://127.0.0.1:${ server.address().port }/`;

const engines = [
	[ 'chrome', () => chromium.launch( { channel: 'chrome' } ) ],
	[ 'firefox', () => firefox.launch() ],
	[ 'webkit', () => webkit.launch() ],
];
const cases = PAGE.match( /\/[A-O]-[A-Za-z0-9-]+\.(gif|mp4|html)/g );
const out = {};
for ( const [ name, launch ] of engines ) {
	let browser;
	try { browser = await launch(); } catch ( e ) { out[ name ] = 'LAUNCH FAILED: ' + e.message.split( '\n' )[ 0 ]; continue; }
	for ( const width of [ 375, 1440 ] ) {
		hits = [];
		const page = await browser.newPage( { viewport: { width, height: 800 } } );
		await page.goto( url, { waitUntil: 'load' } );
		await page.waitForTimeout( 3000 );
		const got = new Set( hits );
		out[ `${ name }@${ width }` ] = Object.fromEntries( [ ...new Set( cases ) ].map( ( c ) => [ c, got.has( c ) ? 'FETCHED' : '-' ] ) );
		await page.close();
	}
	await browser.close();
}
server.close();
writeFileSync( 'E:/sgs-tmp/media-qc/hidden-download-result-O.json', JSON.stringify( out, null, 1 ) );
// Compact table: one row per case, one column per run.
const runs = Object.keys( out ).filter( ( k ) => typeof out[ k ] === 'object' );
console.log( [ 'case', ...runs ].join( ' | ' ) );
for ( const c of new Set( cases ) ) console.log( [ c, ...runs.map( ( r ) => out[ r ][ c ] ) ].join( ' | ' ) );
for ( const k of Object.keys( out ) ) if ( typeof out[ k ] === 'string' ) console.log( k, out[ k ] );
