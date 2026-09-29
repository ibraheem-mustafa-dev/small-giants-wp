// Draft-versus-live parity walker. Drives the design draft and the live site through
// the same states (tabs, steps, open panels, filters, modals) at each width and compares
// named element pairs: rendered text, box size, computed styles, motion (declared and
// running right after each action), hover end states, scroll-in reveals, structure (which
// pairs contain each pair and share its row) and how each state was reached (click or URL).
// Writes report.json, report.md, draft|live side-by-side screenshots and contact.md (every
// shot with its review note). Exits 1 on a config lint problem, a difference that is not
// accepted, or a shot with no review note. The gap classes: scripts/parity/GAP-CHECKLIST.md.
//
// Usage: node scripts/parity/draft-live-walk.mjs <config.mjs> [--out dir] [--widths 1440,768,375]
//        [--states a,b] [--no-accept] [--no-review] [--lint] [--inject-live-css "css"] [--inject-live-js "js"]
//        [--headless] [--self draft|live] [--no-auto] [--dump-auto]
// Runs headed unless --headless is passed. Needs NODE_EXTRA_CA_CERTS set to certifi's bundle for the Hostinger sites.
// --inject-live-css / --inject-live-js are the negative controls: they plant a known difference on the live side
// (the catch-rate benchmark, scripts/parity/benchmark.mjs, replays past gaps this way).
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DEFAULT_PROPS, HOVER_PROPS, resolveFinder, collectPair, collectRunning, centreOf, hoverStyles } from './lib/collect.mjs';
import { comparePair, compareScroll, isAccepted } from './lib/compare.mjs';
import { writeReport, sideBySide } from './lib/report.mjs';
import { lintConfig } from './lib/lint.mjs';
import { collectStructure, compareStructure, driveDiffs } from './lib/structure.mjs';
import { writeContactSheet } from './lib/review.mjs';
import { makeHelpers, anchorOffset } from './lib/helpers.mjs';
import { sampleTimeline, collectChrome, hoverChrome, compareChrome } from './lib/chrome-walk.mjs';
import { withAutoScroll, collectAutoOn, markClipped, autoPair } from './lib/auto-walk.mjs';
import closeOnExit from '../lib/close-browser-on-exit.js';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium, devices } = await import( pathToFileURL( path.join( HERE, '../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );

const argv = process.argv.slice( 2 );
const flag = ( name ) => {
	const i = argv.indexOf( name );
	return i === -1 ? null : argv[ i + 1 ];
};
const cfgPath = path.resolve( argv[ 0 ] || '' );
if ( ! argv[ 0 ] || ! fs.existsSync( cfgPath ) ) {
	console.error( 'Usage: node draft-live-walk.mjs <config.mjs> [--out dir] [--widths 1440,768,375] [--states a,b] [--no-accept] [--no-review] [--lint] [--inject-live-css "css"]' );
	process.exit( 2 );
}
const cfg = ( await import( pathToFileURL( cfgPath ).href ) ).default;
const problems = lintConfig( cfg );
if ( problems.length || argv.includes( '--lint' ) ) {
	console.log( problems.length ? `${ cfg.name }: config lint failed:\n- ${ problems.join( '\n- ' ) }` : `${ cfg.name }: config lint passed.` );
	process.exit( problems.length ? 1 : 0 );
}
const SCROLL_PROPS = [ 'opacity', 'transform', 'translate', 'scale', 'filter' ];
const widths = ( flag( '--widths' ) || ( cfg.widths || [ 1440, 768, 375 ] ).join( ',' ) ).split( ',' ).map( Number );
const onlyStates = flag( '--states' )?.split( ',' );
const accept = argv.includes( '--no-accept' ) ? [] : cfg.accept || [];
const injectCss = flag( '--inject-live-css' );
const injectJs = flag( '--inject-live-js' );
const outDir = path.resolve( flag( '--out' ) || path.join( path.dirname( cfgPath ), 'out', cfg.name ) );
fs.mkdirSync( outDir, { recursive: true } );
const tol = { box: 2, px: 0.5, ...( cfg.tolerance || {} ) };
const RESOLVE = resolveFinder.toString();
const cb = ( url ) => url.replace( '{cb}', String( Date.now() ) );
// The full checks (GAP-CHECKLIST.md section 11: motion timelines, painted grounds, inventories, hover
// effects, phone widths) run on every page; `mode: 'basic'` turns them off for a quick look.
const header = 'basic' !== cfg.mode;
// --self draft|live points both sides at one side (a negative-control baseline: every check must read 0).
const self = flag( '--self' );
if ( self ) {
	cfg.draft = cfg.live = cfg[ self ];
	cfg.states.forEach( ( st ) => ( st.draft = st.live = st[ self ] ) );
	cfg.pairs.forEach( ( pr ) => ( pr.draft = pr.live = pr[ self ] ) );
}

// The automatic check (GAP-CHECKLIST.md section 12): every word, control and picture compared with no
// config naming it, plus a scrolled state. On with the full checks; `auto: false` or --no-auto turns it off.
const autoOn = header && false !== cfg.auto && ! argv.includes( '--no-auto' );
if ( autoOn ) {
	withAutoScroll( cfg );
}

const pairsFor = ( state ) => cfg.pairs.filter( ( p ) => ! p.states || p.states.includes( state.name ) );

async function walkSide( browser, side, width ) {
	// A narrow width runs as a phone (touch, mobile user agent): a site can hide or swap
	// header parts by device, not by width, and a 375px desktop window never shows it.
	const phone = header && width < 500 ? devices[ 'iPhone 13' ] : {};
	const ctx = await browser.newContext( { ...phone, viewport: { width, height: width < 500 ? 812 : 900 } } );
	if ( side === 'live' && injectCss ) {
		await ctx.addInitScript( ( css ) => document.addEventListener( 'DOMContentLoaded', () => {
			const s = document.createElement( 'style' );
			s.textContent = css;
			document.head.appendChild( s );
		} ), injectCss );
	}
	if ( side === 'live' && injectJs ) {
		// Runs before any page script, so it can reset a setting or strip an attribute the page reads.
		await ctx.addInitScript( injectJs );
	}
	const page = await ctx.newPage();
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	page.on( 'console', ( m ) => m.type() === 'error' && errors.push( m.location()?.url ? `${ m.text() } (${ m.location().url })` : m.text() ) );
	let tracked = [];
	const onAction = header ? async () => {
		const t = await sampleTimeline( page, tracked, side, RESOLVE );
		h.timeline = t.samples;
		return t.spent;
	} : null;
	const h = makeHelpers( page, side, { cb, RESOLVE, onAction } );
	await h.goto( cfg[ side ].url );
	if ( cfg[ side ].open ) {
		await cfg[ side ].open( h );
	}
	const states = {};
	for ( const state of cfg.states ) {
		h.log = [];
		h.timeline = null;
		tracked = pairsFor( state );
		if ( state[ side ] ) {
			await state[ side ]( h );
		}
		const log = h.log;
		const pairs = pairsFor( state );
		await page.waitForTimeout( 60 );
		const running = {};
		for ( const p of pairs ) {
			// A filter that reloads the page can still be navigating here: wait for the new page and read again.
			running[ p.name ] = await page.evaluate( collectRunning, [ p[ side ], RESOLVE ] ).catch( async () => {
				await page.waitForLoadState( 'networkidle' ).catch( () => {} );
				return page.evaluate( collectRunning, [ p[ side ], RESOLVE ] );
			} );
		}
		await page.waitForTimeout( state.settle ?? 900 );
		if ( onlyStates && ! onlyStates.includes( state.name ) ) {
			continue;
		}
		const snap = {};
		for ( const p of pairs ) {
			snap[ p.name ] = await page.evaluate( collectPair, [ p[ side ], p.props || DEFAULT_PROPS, RESOLVE ] );
			snap[ p.name ].running = running[ p.name ];
		}
		if ( header ) {
			await collectChrome( page, side, pairs, snap, RESOLVE, h.timeline );
		}
		const finders = Object.fromEntries( pairs.filter( ( p ) => p.structure !== false ).map( ( p ) => [ p.name, p[ side ] ] ) );
		const structure = await page.evaluate( collectStructure, [ finders, RESOLVE ] );
		// Scroll-in pairs are read before anything scrolls (a full-page shot reveals them too).
		const scrollIns = pairs.filter( ( q ) => q.scrollIn && ! snap[ q.name ].missing );
		for ( const p of scrollIns ) {
			snap[ p.name ].scroll = { pre: await page.evaluate( hoverStyles, [ p[ side ], SCROLL_PROPS, RESOLVE ] ) };
		}
		const auto = autoOn ? await collectAutoOn( page, side, cfg ) : null;
		const shot = path.join( outDir, `${ side }-${ width }-${ state.name }.png` );
		await page.screenshot( { path: shot, fullPage: !! state.fullPage } );
		if ( auto ) {
			await markClipped( ctx, shot, auto, !! state.fullPage );
			// --dump-auto: the words and controls the automatic check compared, for diagnosing a pairing.
			if ( argv.includes( '--dump-auto' ) ) {
				fs.writeFileSync( path.join( outDir, `auto-${ side }-${ width }-${ state.name }.json` ), JSON.stringify( auto ) );
			}
		}
		for ( const p of scrollIns ) {
			await page.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
			await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
			await page.waitForTimeout( 60 );
			snap[ p.name ].scroll.running = await page.evaluate( collectRunning, [ p[ side ], RESOLVE ] );
			await page.waitForTimeout( p.scrollWait ?? 1500 );
			snap[ p.name ].scroll.post = await page.evaluate( hoverStyles, [ p[ side ], SCROLL_PROPS, RESOLVE ] );
		}
		// A phone has no hover (Bean 2026-09-28): hover end states are compared at desktop and tablet widths only.
		for ( const p of pairs.filter( ( q ) => q.hover && ! phone.isMobile ) ) {
			if ( snap[ p.name ].missing ) {
				continue;
			}
			if ( header ) {
				// Re-runs the state's action when an earlier hover closed what this pair lives in.
				const reach = state[ side ] ? async () => {
					h.log = [];
					await state[ side ]( h );
				} : null;
				snap[ p.name ].hoverChrome = await hoverChrome( page, p, side, RESOLVE, centreOf, reach, p.hoverWait ?? 800, snap[ p.name ].box );
				if ( snap[ p.name ].hoverChrome.unreached ) {
					continue;
				}
			} else {
				const at = await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
				if ( ! at ) {
					continue;
				}
				await page.mouse.move( at.x, at.y );
				await page.waitForTimeout( p.hoverWait ?? 800 );
			}
			snap[ p.name ].hover = await page.evaluate( hoverStyles, [ p[ side ], p.hoverProps || HOVER_PROPS, RESOLVE ] );
			await page.mouse.move( 1, 1 );
			await page.waitForTimeout( 400 );
		}
		states[ state.name ] = { snap, shot, log, structure, auto };
		if ( state.autoScrolled ) {
			await page.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
		}
	}
	await ctx.close();
	return { states, errors };
}

// Headed by default: the Hostinger sites answer a headless browser with a 403 bot challenge.
// Cloud sessions reach the sites through an HTTPS proxy whose certificate Chromium must trust:
// PARITY_PROXY_SPKI (the proxy CA's SPKI hash) trusts that one key and routes through HTTPS_PROXY;
// PARITY_CHROMIUM points at the installed browser. Unset (a local run), nothing changes.
const cloudProxy = process.env.PARITY_PROXY_SPKI && process.env.HTTPS_PROXY;
closeOnExit.closeBrowserOnExit();
const browser = await chromium.launch( {
	headless: argv.includes( '--headless' ),
	args: [ '--hide-scrollbars', ...closeOnExit.browserOwnerArgs(), ...( cloudProxy ? [ '--ignore-certificate-errors-spki-list=' + process.env.PARITY_PROXY_SPKI ] : [] ) ],
	...( cloudProxy ? { proxy: { server: process.env.HTTPS_PROXY } } : {} ),
	...( process.env.PARITY_CHROMIUM ? { executablePath: process.env.PARITY_CHROMIUM } : {} ),
} );
const results = { config: cfg.name, when: new Date().toISOString(), injectCss, injectJs, runs: [], errors: {} };
for ( const width of widths ) {
	const draft = await walkSide( browser, 'draft', width );
	const live = await walkSide( browser, 'live', width );
	results.errors[ width ] = { draft: draft.errors, live: live.errors };
	for ( const state of cfg.states.filter( ( s ) => draft.states[ s.name ] ) ) {
		const d = draft.states[ state.name ];
		const l = live.states[ state.name ];
		const shot = path.join( outDir, `pair-${ width }-${ state.name }.png` );
		await sideBySide( browser, d.shot, l.shot, shot, width );
		const run = { state: state.name, width, shot: path.basename( shot ), pairs: {} };
		// Box differences are judged first: a notPainted accept holds only while every
		// box difference on the pair is itself accepted (a 44px touch target, say).
		const judge = ( name, diffs ) => {
			const ctx = { pair: name, state: state.name, width, boxMatches: false };
			const boxes = diffs.filter( ( x ) => 'box' === x.kind );
			for ( const diff of boxes ) {
				diff.accepted = isAccepted( accept, ctx, diff )?.reason || null;
			}
			ctx.boxMatches = boxes.every( ( x ) => x.accepted );
			for ( const diff of diffs.filter( ( x ) => 'box' !== x.kind ) ) {
				diff.accepted = isAccepted( accept, ctx, diff )?.reason || null;
			}
			return diffs;
		};
		run.pairs[ '(state)' ] = { draft: d.log, live: l.log, diffs: judge( '(state)', driveDiffs( d.log, l.log ) ) };
		for ( const p of pairsFor( state ) ) {
			const diffs = [
				...comparePair( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) } ),
				...compareStructure( p.name, d.structure, l.structure ),
				...compareScroll( d.snap[ p.name ].scroll, l.snap[ p.name ].scroll ),
				...anchorOffset( p, d.snap, l.snap, { ...tol, ...( p.tolerance || {} ) } ),
			];
			const all = header ? compareChrome( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) }, diffs ) : diffs;
			run.pairs[ p.name ] = { draft: d.snap[ p.name ], live: l.snap[ p.name ], diffs: judge( p.name, all ) };
		}
		if ( autoOn ) {
			const a = autoPair( d.auto, l.auto, cfg );
			run.pairs[ '(auto)' ] = { words: a.words, diffs: judge( '(auto)', a.diffs ) };
		}
		results.runs.push( run );
	}
}
await browser.close();
const { open, accepted } = writeReport( outDir, cfg, results );
const unreviewed = argv.includes( '--no-review' ) ? 0 : writeContactSheet( outDir, cfg, results.runs );
const liveErrors = Object.values( results.errors ).flatMap( ( e ) => e.live );
console.log( `${ cfg.name }: ${ open } open, ${ accepted } accepted, ${ unreviewed } shots unreviewed, ${ liveErrors.length } live console errors. Report: ${ path.join( outDir, 'report.md' ) }, contact sheet: ${ path.join( outDir, 'contact.md' ) }` );
process.exit( open || unreviewed || liveErrors.length ? 1 : 0 );
