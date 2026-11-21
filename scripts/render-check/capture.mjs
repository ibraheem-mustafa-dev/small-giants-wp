// The render check's browser pass, run by render-check.py on the two copies of a run (side a: before, side b: after).
//
//   node capture.mjs <config.json>
//
// mode "hash": each state once at 1440 on both sides. Proves the state was reached (its assert selectors visible,
// its assertText shown, no failed action) and records, by hash, every same-origin response the page loaded (the
// server's HTML, stylesheets, scripts, fonts, pictures and the page's own API calls), with the copy's address, asset
// versions and nonces normalised out, plus every width a stylesheet switches at. Writes <out>/<side>.json.
// mode "dom": the listed state@width jobs on both sides. Records every element's key, text, box and computed style
// at rest with animations finished and fonts ready, then under forced hover and forced focus on one element of each
// interactive kind; with `shots`, a full-page screenshot and a crop per named probe. Writes <out>/<side>/<job>.json.
// Exit 0 when every job ran (an unreached state is data, not an exit), 1 on a broken config.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recordTree, settle, scrollThrough, breakpoints, probeTargets } from './lib/page.mjs';
import { blockNoisy, makeViewer } from './lib/session.mjs';
import { normaliser } from './lib/normalise.mjs';
import { runActions } from './lib/actions.mjs';
import { probeClip } from './lib/clip.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const cfg = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const PROPS = JSON.parse( fs.readFileSync( path.join( HERE, 'lib/props.json' ), 'utf8' ) );
const PROBE_CAP = 30;
const TEXTY = /html|css|javascript|json|text|svg|xml/;
const DROP_PARAMS = new Set( [ 'ver', '_wpnonce', 'nonce', '_', 'v' ] );
fs.mkdirSync( cfg.out, { recursive: true } );

function requestKey( req, norm ) {
	const u = new URL( req.url() );
	const q = [ ...u.searchParams.entries() ].filter( ( [ k ] ) => ! DROP_PARAMS.has( k ) ).sort().map( ( [ k, v ] ) => k + '=' + norm( v ) );
	const body = req.postData();
	const bodyHash = body ? '#' + crypto.createHash( 'sha1' ).update( norm( body ) ).digest( 'hex' ).slice( 0, 12 ) : '';
	return req.method() + ' ' + u.pathname.replace( /-[0-9a-f]{16,}(?=\.|\/|$)/g, '-H' ) + ( q.length ? '?' + q.join( '&' ) : '' ) + bodyHash;
}

const browser = await chromium.launch( { args: [ '--hide-scrollbars' ] } );

// Viewers per side, made on first use. A viewer whose making threw (a sign-in click that timed out on a busy machine), or
// whose sign-in left neither a cookie nor the sign-in page's error after 60 s, is made once more before every state that
// uses it is reported unreached. A sign-in the page refused is a real failure and is not retried.
const viewers = {};
function viewer( side, st ) {
	const auth = st.auth || 'guest';
	const id = side + '|' + auth + '|' + ( st.basket ? 1 : 0 );
	if ( auth === 'guest' && ! st.basket ) {
		return Promise.resolve( { state: undefined, error: null } );
	}
	if ( ! viewers[ id ] ) {
		const make = () => makeViewer( browser, { origin: cfg.sides[ side ].origin, auth, basket: !! st.basket, user: cfg.customer.user, pwd: cfg.customer.pwd, product: cfg.product } );
		viewers[ id ] = make().then( ( v ) => ( v.error && ( v.error.includes( ' threw: ' ) || v.error.includes( 'no sign-in error' ) ) ? make() : v ) );
	}
	return viewers[ id ];
}

async function visibleAny( page, sel ) {
	return page.evaluate( ( s ) => [ ...document.querySelectorAll( s ) ].some( ( e ) => {
		const r = e.getBoundingClientRect();
		const cs = getComputedStyle( e );
		return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
	} ), sel );
}

// WooCommerce's loading placeholders (the grey bars its blocks draw until the basket arrives). A state is read only once
// none is shown: the coupon box, for one, appears before the order summary has loaded, so a state proved only by its
// own control could otherwise be read half-loaded on both sides and pass. Placeholders inside the payment areas are
// left out: the check blocks the payment providers' scripts (lib/session.mjs::blockNoisy), so those areas wait on both
// sides for good and are compared as placeholders.
const LOADING = [
	'.wc-block-components-skeleton__element, .wc-block-components-loading-mask',
	'.wc-block-components-express-payment, .wc-block-components-skeleton--checkout-payment, .wp-block-woocommerce-checkout-payment-block, .wp-block-woocommerce-checkout-express-payment-block, .wp-block-woocommerce-cart-express-payment-block',
];
// The placeholders shown outside the payment areas, by class (an empty list when the page has finished loading).
function loadingShown( [ sel, payment ] ) {
	return [ ...document.querySelectorAll( sel ) ]
		.filter( ( e ) => ! e.closest( payment ) && e.getClientRects().length && getComputedStyle( e ).visibility !== 'hidden' )
		.map( ( e ) => e.className );
}

// Load a state and bring it to rest; returns the list of reasons it was not reached (empty when reached).
async function openState( page, st, origin, w ) {
	const fails = [];
	const resp = await page.goto( origin + st.path, { waitUntil: 'load', timeout: 60000 } );
	const status = resp ? resp.status() : 0;
	if ( ! resp || ( status >= 400 && status !== st.allowStatus ) ) {
		fails.push( 'status ' + status );
	}
	for ( const s of st.assert || [] ) {
		await page.waitForSelector( s, { state: 'attached', timeout: 15000 } ).catch( () => {} );
	}
	await page.waitForLoadState( 'networkidle', { timeout: 15000 } ).catch( () => {} );
	for ( const t of st.assertText || [] ) {
		await page.waitForFunction( ( x ) => document.body.innerText.includes( x ), t, { timeout: 15000 } ).catch( () => {} );
	}
	for ( let i = 0; i < 60 && ( await page.evaluate( loadingShown, LOADING ).catch( () => [] ) ).length; i++ ) {
		await page.waitForTimeout( 250 );
	}
	await page.evaluate( scrollThrough );
	await page.waitForTimeout( 400 );
	const acted = await runActions( page, st.actions );
	fails.push( ...acted.fails );
	if ( acted.absent ) {
		return { fails, status, absent: acted.absent };
	}
	await page.mouse.move( 0, 0 );
	await page.evaluate( settle );
	for ( const s of [ ...( st.assert || [] ), ...( ( st.assertAt || {} )[ w ] || [] ) ] ) {
		if ( ! await visibleAny( page, s ) ) {
			fails.push( 'not shown: ' + s );
		}
	}
	for ( const s of st.assertAbsent || [] ) {
		if ( await visibleAny( page, s ) ) {
			fails.push( 'shown but should not be: ' + s );
		}
	}
	const loading = await page.evaluate( loadingShown, LOADING );
	if ( loading.length ) {
		fails.push( 'still loading: ' + [ ...new Set( loading ) ].join( ', ' ) + ' shown' );
	}
	for ( const t of st.assertText || [] ) {
		if ( ! await page.evaluate( ( x ) => document.body.innerText.includes( x ), t ) ) {
			fails.push( 'text not shown: ' + t );
		}
	}
	return { fails, status, absent: null };
}

async function newContext( st, side, w ) {
	const v = await viewer( side, st );
	if ( v.error ) {
		return { error: v.error };
	}
	const ctx = await browser.newContext( { viewport: { width: w, height: 900 }, reducedMotion: cfg.motion || 'no-preference', storageState: v.state } );
	await blockNoisy( ctx );
	return { ctx };
}

// Every same-origin picture the page references (img src and srcset, source srcset, video poster, CSS backgrounds),
// so pictures are hashed by what the page asks for, not by which sizes the browser happened to request before capture.
function pictureUrls() {
	const out = new Set();
	const add = ( u ) => {
		if ( u ) {
			try {
				const abs = new URL( u, location.href );
				if ( abs.origin === location.origin ) {
					out.add( abs.href );
				}
			} catch ( e ) {
				// Not an address.
			}
		}
	};
	const srcset = ( v ) => ( v || '' ).split( ',' ).forEach( ( c ) => add( c.trim().split( /\s+/ )[ 0 ] ) );
	document.querySelectorAll( 'img, source, video' ).forEach( ( e ) => {
		add( e.getAttribute( 'src' ) );
		add( e.getAttribute( 'poster' ) );
		srcset( e.getAttribute( 'srcset' ) );
	} );
	document.querySelectorAll( 'body *' ).forEach( ( e ) => {
		const bg = getComputedStyle( e ).backgroundImage;
		for ( const m of bg.matchAll( /url\("?([^")]+)"?\)/g ) ) {
			add( m[ 1 ] );
		}
	} );
	return [ ...out ];
}

const PICTURE = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i;

async function hashBody( status, type, body, norm ) {
	const data = TEXTY.test( type ) ? norm( body.toString( 'utf8' ) ) : body;
	return status + ':' + crypto.createHash( 'sha1' ).update( data ).digest( 'hex' ).slice( 0, 16 );
}

// A load that threw (a timeout on a busy machine, a script that navigated mid-step) is tried once more in a fresh
// context before it counts: unreached means the state could not be made (a failed sign-in, an empty basket), not that
// one load was slow.
const threw = ( fails ) => ( fails || [] ).some( ( f ) => f.startsWith( 'threw:' ) );

async function hashJob( st, side ) {
	const first = await hashJobOnce( st, side );
	return threw( first.fails ) ? hashJobOnce( st, side ) : first;
}

async function domJob( job, side ) {
	const first = await domJobOnce( job, side );
	return threw( first.fails ) ? domJobOnce( job, side ) : first;
}

async function hashJobOnce( st, side ) {
	const { origin, port } = cfg.sides[ side ];
	const norm = normaliser( port );
	const w = st.hashWidth || 1440;
	const { ctx, error } = await newContext( st, side, w );
	if ( error ) {
		return { reached: false, fails: [ error ] };
	}
	const page = await ctx.newPage();
	const pending = [];
	let documentBody = '';
	page.on( 'response', ( r ) => {
		const req = r.request();
		if ( ! req.url().startsWith( origin ) || ( r.status() >= 300 && r.status() < 400 ) || PICTURE.test( new URL( req.url() ).pathname ) ) {
			return;
		}
		pending.push( ( async () => {
			let body = null;
			try {
				body = await r.body();
			} catch ( e ) {
				body = null;
			}
			// A body the browser already let go of: fetch a GET again (the same file); a POST cannot be repeated.
			if ( ( ! body || ! body.length ) && req.method() === 'GET' ) {
				const again = await ctx.request.get( req.url() ).catch( () => null );
				body = again ? await again.body() : null;
			}
			if ( ! body ) {
				return [ requestKey( req, norm ), 'unreadable' ];
			}
			if ( req.resourceType() === 'document' && req.frame() === page.mainFrame() ) {
				documentBody = norm( body.toString( 'utf8' ) );
			}
			return [ requestKey( req, norm ), await hashBody( r.status(), r.headers()[ 'content-type' ] || '', body, norm ) ];
		} )() );
	} );
	let out;
	try {
		const { fails, status, absent } = await openState( page, st, origin, w );
		const bps = await page.evaluate( breakpoints );
		const responses = {};
		for ( const [ k, h ] of await Promise.all( pending ) ) {
			( responses[ k ] = responses[ k ] || [] ).push( h );
		}
		// A block that redraws after load (the basket refreshing its lines) can be caught mid-redraw: settle, then take
		// the union of two readings half a second apart.
		await page.waitForLoadState( 'networkidle', { timeout: 5000 } ).catch( () => {} );
		const urls = new Set( await page.evaluate( pictureUrls ) );
		await page.waitForTimeout( 500 );
		( await page.evaluate( pictureUrls ) ).forEach( ( u ) => urls.add( u ) );
		for ( const u of urls ) {
			const res = await ctx.request.get( u ).catch( () => null );
			const k = 'GET ' + new URL( u ).pathname;
			responses[ k ] = [ res ? await hashBody( res.status(), res.headers()[ 'content-type' ] || '', await res.body(), norm ) : 'unreadable' ];
		}
		// A file fetched twice counts once (load order is not the render); an unreadable copy beside a readable one is
		// the same file the browser had already let go of.
		for ( const k of Object.keys( responses ) ) {
			const set = [ ...new Set( responses[ k ] ) ];
			responses[ k ] = ( set.length > 1 ? set.filter( ( h ) => h !== 'unreadable' ) : set ).sort();
		}
		fs.mkdirSync( path.join( cfg.out, 'html', side ), { recursive: true } );
		fs.writeFileSync( path.join( cfg.out, 'html', side, st.name + '.html' ), documentBody );
		out = { reached: ! fails.length, fails, status, absent, url: norm( page.url() ), responses, breakpoints: bps };
	} catch ( e ) {
		out = { reached: false, fails: [ 'threw: ' + String( e ).split( '\n' )[ 0 ].slice( 0, 200 ) ] };
	}
	await ctx.close();
	return out;
}

async function domJobOnce( job, side ) {
	const st = cfg.states.find( ( s ) => s.name === job.state );
	const name = job.state + '@' + job.width;
	const dir = path.join( cfg.out, side );
	fs.mkdirSync( path.join( dir, 'probes' ), { recursive: true } );
	const { ctx, error } = await newContext( st, side, job.width );
	if ( error ) {
		return { name, fails: [ error ] };
	}
	const page = await ctx.newPage();
	let fails = [];
	try {
		let absent;
		( { fails, absent } = await openState( page, st, cfg.sides[ side ].origin, job.width ) );
		if ( absent ) {
			await ctx.close();
			return { name, fails, absent };
		}
		const data = await page.evaluate( recordTree, [ null, PROPS ] );
		data.props = PROPS;
		data.probes = [];
		if ( job.shots ) {
			// A full-page screenshot resizes the window for a moment, which moves fixed parts and can trigger
			// scroll- and size-driven ones (a sticky basket bar): fixed parts outside an open dialog are hidden for
			// the screenshot, so the pixel comparison covers the page itself. Their readings are already recorded.
			await page.evaluate( () => {
				for ( const e of document.querySelectorAll( 'body *' ) ) {
					if ( getComputedStyle( e ).position === 'fixed' && ! e.closest( 'dialog[open]' ) ) {
						e.setAttribute( 'data-rc-fixed', '' );
					}
				}
				document.querySelectorAll( 'img[loading="lazy"]' ).forEach( ( i ) => ( i.loading = 'eager' ) );
				const s = document.createElement( 'style' );
				s.id = 'rc-fixed';
				s.textContent = '[data-rc-fixed]{visibility:hidden!important}';
				document.head.append( s );
			} );
			// Every picture finishes loading and decoding (up to 5 s) before the screenshot.
			await page.evaluate( () => Promise.race( [
				Promise.all( [ ...document.images ].map( ( i ) => ( i.complete ? Promise.resolve() : new Promise( ( r ) => i.addEventListener( 'load', r, { once: true } ) ) ).then( () => i.decode().catch( () => {} ) ) ) ),
				new Promise( ( r ) => setTimeout( r, 5000 ) ),
			] ) );
			// The boxes of elements an endless animation moves, left out of the pixel comparison (rc_compare.py::masks).
			data.endless = await page.evaluate( () => document.getAnimations()
				.filter( ( a ) => a.effect && a.effect.target && a.effect.getComputedTiming().iterations === Infinity )
				.map( ( a ) => {
					const r = a.effect.target.getBoundingClientRect();
					return [ r.x + scrollX, r.y + scrollY, r.width, r.height ];
				} )
				.filter( ( b ) => b[ 2 ] > 0 && b[ 3 ] > 0 ) );
			await page.screenshot( { path: path.join( dir, name + '.png' ), fullPage: true, animations: 'disabled' } );
			await page.evaluate( () => {
				document.getElementById( 'rc-fixed' )?.remove();
				document.querySelectorAll( '[data-rc-fixed]' ).forEach( ( e ) => e.removeAttribute( 'data-rc-fixed' ) );
			} );
		}
		const keys = await page.evaluate( probeTargets, PROBE_CAP );
		const cdp = await ctx.newCDPSession( page );
		await cdp.send( 'DOM.enable' );
		await cdp.send( 'CSS.enable' );
		for ( let i = 0; i < keys.length; i++ ) {
			const { root } = await cdp.send( 'DOM.getDocument', { depth: 0 } );
			const { nodeId } = await cdp.send( 'DOM.querySelector', { nodeId: root.nodeId, selector: `[data-rc-probe="${ i }"]` } );
			if ( ! nodeId ) {
				continue;
			}
			for ( const [ kind, classes ] of [ [ 'hover', [ 'hover' ] ], [ 'focus', [ 'focus', 'focus-visible' ] ] ] ) {
				await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: classes } );
				await page.evaluate( settle );
				const rec = await page.evaluate( recordTree, [ `[data-rc-probe="${ i }"]`, PROPS ] );
				data.probes.push( { key: keys[ i ], i, kind, els: rec.els, styles: rec.styles } );
				if ( job.shots && ( job.probeShots || [] ).includes( keys[ i ] + '|' + kind ) ) {
					const el = page.locator( `[data-rc-probe="${ i }"]` );
					await el.scrollIntoViewIfNeeded().catch( () => {} );
					const box = await el.boundingBox();
					// The probe picture is a crop of the viewport for the report's pair, never the reading itself: an element
					// that cannot scroll into view (an open menu or drawer locks the page's scroll) has no crop, and the
					// state is still compared by its readings.
					const clip = box && probeClip( box, page.viewportSize() );
					if ( clip ) {
						await page.screenshot( { path: path.join( dir, 'probes', `${ name }-${ i }-${ kind }.png` ), clip, animations: 'disabled' } )
							.catch( ( e ) => ( data.shotNotes = data.shotNotes || [] ).push( `probe ${ i } ${ kind }: ${ String( e ).split( '\n' )[ 0 ].slice( 0, 160 ) }` ) );
					}
				}
				await cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] } );
			}
		}
		data.fails = fails;
		fs.writeFileSync( path.join( dir, name + '.json' ), JSON.stringify( data ) );
	} catch ( e ) {
		fails.push( 'threw: ' + String( e ).split( '\n' )[ 0 ].slice( 0, 200 ) );
	}
	await ctx.close();
	return { name, fails };
}

async function pool( tasks, n ) {
	const results = new Array( tasks.length );
	let next = 0;
	await Promise.all( Array.from( { length: n }, async () => {
		while ( next < tasks.length ) {
			const i = next++;
			results[ i ] = await tasks[ i ]();
		}
	} ) );
	return results;
}

const sides = Object.keys( cfg.sides );
const t0 = Date.now();
if ( cfg.mode === 'hash' ) {
	const tasks = [];
	for ( const st of cfg.states ) {
		for ( const side of sides ) {
			tasks.push( async () => [ side, st.name, await hashJob( st, side ) ] );
		}
	}
	const res = await pool( tasks, cfg.jobs || 6 );
	for ( const side of sides ) {
		const states = {};
		res.filter( ( r ) => r[ 0 ] === side ).forEach( ( [ , n, r ] ) => ( states[ n ] = r ) );
		fs.writeFileSync( path.join( cfg.out, side + '.json' ), JSON.stringify( { states }, null, 1 ) );
	}
	console.log( `hash pass: ${ res.length } loads in ${ Math.round( ( Date.now() - t0 ) / 1000 ) } s, ${ res.filter( ( r ) => ! r[ 2 ].reached ).length } unreached` );
} else if ( cfg.mode === 'dom' ) {
	const tasks = [];
	for ( const job of cfg.domJobs ) {
		for ( const side of sides ) {
			tasks.push( async () => [ side, await domJob( job, side ) ] );
		}
	}
	const res = await pool( tasks, cfg.jobs || 6 );
	const fails = {};
	const absent = {};
	res.forEach( ( [ side, r ] ) => {
		fails[ side + '|' + r.name ] = r.fails;
		if ( r.absent ) {
			absent[ side + '|' + r.name ] = r.absent;
		}
	} );
	fs.writeFileSync( path.join( cfg.out, '_absent.json' ), JSON.stringify( absent, null, 1 ) );
	fs.writeFileSync( path.join( cfg.out, '_fails.json' ), JSON.stringify( fails, null, 1 ) );
	console.log( `dom pass: ${ res.length } captures in ${ Math.round( ( Date.now() - t0 ) / 1000 ) } s, ${ res.filter( ( r ) => r[ 1 ].fails.length ).length } with failures` );
} else {
	console.error( 'capture.mjs: mode must be hash or dom' );
	await browser.close();
	process.exit( 1 );
}
await browser.close();
