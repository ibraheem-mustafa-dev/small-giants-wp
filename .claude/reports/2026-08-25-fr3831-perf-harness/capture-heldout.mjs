/**
 * Capture a HELD-OUT frame — and a DPR-2 pair — to test whether the 0.66% generalises.
 *
 * WHY
 * ---
 * The adversarial council's fourth finding: "the fix was selected and graded on the same single
 * frame". cs-sweep.mjs chose the winning configuration by comparing against one live capture,
 * and Gate B then scored that same configuration against that same capture. Circular. The 0.66%
 * is therefore one sample, on one frame, at one DPR, and cannot be read as a generalisation.
 *
 * This script captures fresh pairs at a NEW u_time the rig was never tuned against, and at DPR 2
 * as well as DPR 1. NOTHING about the rig's configuration is changed — that is the entire point.
 * If the number holds on a frame nobody selected for, it means something. If it does not, that
 * is the finding.
 *
 * Grain is a fixed +/-4/255 in SCREEN space and the glow uses screen-space derivatives, so both
 * are resolution-dependent. There is a real chance DPR 2 does not hold, and reporting that
 * honestly is worth more than not looking.
 *
 * Usage:  node perf/capture-heldout.mjs
 * Writes: perf/heldout-{live,rig}-dpr{1,2}.png  +  perf/heldout-meta.json
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.resolve( HERE, '..' );

const MIME = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8', '.glsl': 'text/plain; charset=utf-8',
	'.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json',
};

function startServer() {
	const server = http.createServer( ( req, res ) => {
		const rel = decodeURIComponent( req.url.split( '?' )[ 0 ] ).replace( /^\/+/, '' );
		const file = path.resolve( ROOT, rel );
		if ( ! file.startsWith( ROOT ) ) { res.writeHead( 403 ); res.end(); return; }
		fs.readFile( file, ( err, buf ) => {
			if ( err ) { res.writeHead( 404 ); res.end(); return; }
			res.writeHead( 200, { 'Content-Type': MIME[ path.extname( file ) ] || 'application/octet-stream' } );
			res.end( buf );
		} );
	} );
	return new Promise( ( r ) => server.listen( 0, '127.0.0.1', () => r( { server, port: server.address().port } ) ) );
}

const { server, port } = await startServer();
const base = `http://127.0.0.1:${ port }/`;

// Real GPU, and deliberately WITHOUT --ignore-gpu-blocklist: Gate B used that flag and the
// council flagged it as bypassing the gate Stripe uses to decide who sees the effect at all.
const browser = await chromium.launch( {
	headless: false,
	args: [ '--use-angle=default', '--enable-gpu', '--enable-webgl' ],
} );

const priorT = fs.existsSync( path.join( ROOT, 'gateb-time.txt' ) )
	? parseFloat( fs.readFileSync( path.join( ROOT, 'gateb-time.txt' ), 'utf8' ) )
	: null;

const meta = { generated: new Date().toISOString(), priorGateBTime: priorT, captures: [] };

for ( const dpr of [ 1, 2 ] ) {
	console.log( `\n=== DPR ${ dpr } ===` );
	const ctx = await browser.newContext( {
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: dpr,
	} );

	// ── 1. LIVE stripe.com, frozen at whatever u_time it happens to be at ────────────────
	const lp = await ctx.newPage();
	await lp.addInitScript( () => {
		window.__t = null;
		window.__ln = new Map();
		window.__paletteUrls = [];
		for ( const P of [ window.WebGL2RenderingContext, window.WebGLRenderingContext ]
			.filter( Boolean ).map( ( c ) => c.prototype ) ) {
			const g = P.getUniformLocation;
			P.getUniformLocation = function ( pr, n ) {
				const l = g.call( this, pr, n );
				if ( l ) window.__ln.set( l, n );
				return l;
			};
			const o = P.uniform1f;
			P.uniform1f = function ( l, v ) {
				if ( window.__ln.get( l ) === 'u_time' ) window.__t = v;
				return o.call( this, l, v );
			};
		}
	} );
	lp.on( 'request', ( r ) => {
		const u = r.url();
		if ( /images\.(ctfassets|stripeassets)|palette/i.test( u ) ) {
			lp.evaluate( () => 0 ).catch( () => {} );
		}
	} );

	await lp.goto( 'https://stripe.com/gb', { waitUntil: 'load', timeout: 90000 } );
	await lp.waitForTimeout( 9000 );
	// Freeze rAF so the screenshot corresponds to the recorded u_time. Comparing two animated
	// canvases at different moments compares nothing.
	await lp.evaluate( () => { window.requestAnimationFrame = () => 0; } );
	await lp.waitForTimeout( 400 );

	const t = await lp.evaluate( () => window.__t );
	const canvasInfo = await lp.evaluate( () => {
		const c = document.querySelector( 'canvas' );
		return c ? { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight } : null;
	} );
	if ( t === null || t === undefined ) {
		console.log( '  !! u_time never captured — the hero may not have initialised. Skipping DPR', dpr );
		await ctx.close();
		continue;
	}
	const livePath = path.join( HERE, `heldout-live-dpr${ dpr }.png` );
	await lp.screenshot( { path: livePath } );
	console.log( `  live u_time = ${ t }   canvas ${ canvasInfo ? canvasInfo.w + 'x' + canvasInfo.h : '?' }` );

	// ── 2. The RIG at the SAME u_time, same DPR, configuration untouched ─────────────────
	const mp = await ctx.newPage();
	await mp.goto( `${ base }index.html?static&pal=palette-a&t=${ t }`, { waitUntil: 'load', timeout: 60000 } );
	await mp.waitForFunction( () => window.__ready === true, { timeout: 30000 } );
	await mp.evaluate( () => { if ( window.__stop ) window.__stop(); } );
	await mp.waitForTimeout( 400 );
	const rigPath = path.join( HERE, `heldout-rig-dpr${ dpr }.png` );
	await mp.screenshot( { path: rigPath } );

	const rigCanvas = await mp.evaluate( () => {
		const c = document.querySelector( 'canvas' );
		return { w: c.width, h: c.height };
	} );
	const cap = await mp.evaluate( () => window.__capability );

	meta.captures.push( {
		dpr,
		uTime: t,
		differsFromGateB: priorT === null ? null : t !== priorT,
		live: path.basename( livePath ),
		rig: path.basename( rigPath ),
		liveCanvas: canvasInfo,
		rigCanvas,
		rigCapability: cap,
	} );
	console.log( `  rig canvas ${ rigCanvas.w }x${ rigCanvas.h }   capability=${ cap && cap.supported }` );

	await ctx.close();
}

await browser.close();
server.close();

fs.writeFileSync( path.join( HERE, 'heldout-meta.json' ), JSON.stringify( meta, null, 2 ) );
console.log( '\nwritten: perf/heldout-meta.json' );
for ( const c of meta.captures ) {
	console.log( `  DPR ${ c.dpr }  u_time ${ c.uTime }  ` +
		( c.differsFromGateB === false ? '*** SAME as Gate B — NOT held out ***' : 'differs from Gate B: ' + c.differsFromGateB ) );
}
