import { createRequire } from 'module';
import http from 'http';
import { writeFileSync, existsSync } from 'fs';
const roots = [ 'E:/sgs-tmp/wt-header/plugins/sgs-blocks/package.json', 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json' ];
const require = createRequire( roots.find( ( p ) => existsSync( p ) ) );
const { chromium, firefox, webkit } = require( 'playwright' );
const GIF = Buffer.from( 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64' );
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
// Big visible photo = real gif scaled; server returns 1x1 gif for all, CSS sizes it.
const PAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0} .box{width:100%;height:400px;display:block} .box img,.box video{width:100%;height:400px;object-fit:cover;display:block}
@media (max-width:767px){.d{display:none}} @media (min-width:768px){.m{display:none}}
.sp{height:1500px}
</style></head><body>
<!-- P: picture, desktop slot=blank data GIF (desktop shows video), mobile img eager high; and a desktop-video sibling -->
<div class="box"><picture class="m"><source media="(min-width:768px)" srcset="${BLANK}"><img id="p-img" src="/P-mobile-photo.gif" fetchpriority="high" alt="x" width="400" height="400"></picture>
<video class="d" id="v-fill" muted loop playsinline data-src-desktop="/Q-desktop-video.mp4" data-src-mobile="/R-mobile-video.mp4"></video></div>
<div class="sp"></div>
<!-- S: lazy iframe hidden at 375, below fold -->
<iframe id="ifr" class="d" loading="lazy" src="/S-iframe-lazy.html" title="s" style="width:200px;height:100px"></iframe>
<!-- T: picture with two real sources to track resize -->
<picture><source media="(min-width:768px)" srcset="/T-desktop.gif"><img src="/T-mobile.gif" alt="" width="50" height="50"></picture>
<script>
const v=document.getElementById('v-fill');const mq=matchMedia('(min-width:768px)');
function pick(){const s=mq.matches?v.dataset.srcDesktop:v.dataset.srcMobile;if(v.getAttribute('src')!==s){v.setAttribute('src',s);v.load();}}
pick();mq.addEventListener('change',pick);
window.__lcp=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp.push({url:e.url.slice(0,60),el:e.element&&e.element.id,size:e.size,t:Math.round(e.startTime)})}).observe({type:'largest-contentful-paint',buffered:true});
</script></body></html>`;
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
const engines = [ [ 'chrome', () => chromium.launch( { channel: 'chrome' } ) ], [ 'firefox', () => firefox.launch() ], [ 'webkit', () => webkit.launch() ] ];
const out = {};
for ( const [ name, launch ] of engines ) {
	let b; try { b = await launch(); } catch ( e ) { out[ name ] = 'LAUNCH FAILED'; continue; }
	const r = {};
	// 1440 load: LCP + fetches
	for ( const w of [ 1440, 375 ] ) {
		hits = [];
		const p = await b.newPage( { viewport: { width: w, height: 800 } } );
		await p.goto( url, { waitUntil: 'load' } ); await p.waitForTimeout( 2500 );
		r[ 'load@' + w ] = { fetched: [ ...new Set( hits ) ].sort(), lcp: await p.evaluate( () => window.__lcp ), videoSrc: await p.evaluate( () => document.getElementById( 'v-fill' ).getAttribute( 'src' ) ) };
		// resize across breakpoint
		hits = [];
		await p.setViewportSize( { width: w === 1440 ? 375 : 1440, height: 800 } ); await p.waitForTimeout( 2000 );
		r[ 'resize-from-' + w ] = { fetched: [ ...new Set( hits ) ].sort(), videoSrc: await p.evaluate( () => document.getElementById( 'v-fill' ).getAttribute( 'src' ) ), pImgCurrent: await p.evaluate( () => document.getElementById( 'p-img' ).currentSrc.slice( 0, 40 ) ) };
		// lazy iframe: now at the other width, scroll to it
		hits = [];
		await p.evaluate( () => document.getElementById( 'ifr' ).scrollIntoView() ); await p.waitForTimeout( 2000 );
		r[ 'iframe-scroll-after-resize-from-' + w ] = { iframeFetched: hits.includes( '/S-iframe-lazy.html' ), viewport: w === 1440 ? 375 : 1440 };
		await p.close();
	}
	// WebKit lazy iframe hidden at 375, then reveal at 1440 without reload, scroll
	{
		hits = [];
		const p = await b.newPage( { viewport: { width: 375, height: 800 } } );
		await p.goto( url, { waitUntil: 'load' } ); await p.evaluate( () => window.scrollTo( 0, 99999 ) ); await p.waitForTimeout( 1500 );
		r[ 'iframe-hidden-scrolled-to-bottom@375' ] = hits.includes( '/S-iframe-lazy.html' );
		await p.close();
	}
	out[ name ] = r;
}
server.close();
writeFileSync( 'E:/sgs-tmp/media-qc/qc-download-result.json', JSON.stringify( out, null, 1 ) );
console.log( JSON.stringify( out, null, 1 ) );
