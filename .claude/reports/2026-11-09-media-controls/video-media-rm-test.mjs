// Does <video><source media="(prefers-reduced-motion: no-preference) and (min-width:768px)"> skip the download
// for reduced-motion visitors and phones, with autoplay printed in HTML? Bean 2026-11-09, Spec 49 per-device design.
import { createRequire } from 'module';
import http from 'http';
import { existsSync } from 'fs';

const roots = [ 'E:/sgs-tmp/wt-header/plugins/sgs-blocks/package.json', 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json' ];
const require = createRequire( roots.find( ( p ) => existsSync( p ) ) );
const { chromium, firefox, webkit } = require( 'playwright' );

const PAGE = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<video autoplay muted loop playsinline style="width:300px;height:200px"><source media="(prefers-reduced-motion: no-preference) and (min-width:768px)" src="/V-desktop-motion-ok.mp4" type="video/mp4"></video>`;
let hits = [];
const server = http.createServer( ( req, res ) => {
	if ( req.url === '/' ) { res.writeHead( 200, { 'content-type': 'text/html' } ); res.end( PAGE ); return; }
	if ( req.url.endsWith( '.mp4' ) ) hits.push( req.url ); res.writeHead( 200, { 'content-type': 'video/mp4', 'content-length': 16 } ); res.end( Buffer.alloc( 16 ) );
} );
await new Promise( ( r ) => server.listen( 0, '127.0.0.1', r ) );
const url = `http://127.0.0.1:${ server.address().port }/`;
const rows = [];
for ( const [ name, launch ] of [ [ 'chrome', () => chromium.launch( { channel: 'chrome' } ) ], [ 'firefox', () => firefox.launch() ], [ 'webkit', () => webkit.launch() ] ] ) {
	const browser = await launch();
	for ( const [ width, rm ] of [ [ 1440, 'no-preference' ], [ 1440, 'reduce' ], [ 375, 'no-preference' ] ] ) {
		hits = [];
		const ctx = await browser.newContext( { viewport: { width, height: 800 }, reducedMotion: rm } );
		const page = await ctx.newPage();
		await page.goto( url );
		await page.waitForTimeout( 2000 );
		const mq = await page.evaluate( () => matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
		rows.push( `${ name } ${ width } ${ rm } (mq reduce=${ mq }): ${ hits.length ? 'FETCHED' : 'no download' }` );
		await ctx.close();
	}
	await browser.close();
}
server.close();
console.log( rows.join( '\n' ) );
