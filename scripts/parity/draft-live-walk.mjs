// Draft-versus-live parity walker. Drives the design draft and the live site through
// the same states (tabs, steps, open panels, filters, modals) at each width and compares
// named element pairs: rendered text, box size, computed styles, motion (declared and
// running right after each action), hover end states, keyboard focus rings, scroll-in reveals,
// structure (which pairs contain each pair and share its row) and how each state was reached (click
// or URL); page-wide, every painted word, links (dead, broken, or not where the config's table says)
// and load entrances judged by paint.
// Writes report.json, report.md, draft|live side-by-side screenshots and contact.md (every
// shot with its review note). Exits 1 on a config lint problem, a difference that is not
// accepted, or a shot with no review note. The gap classes: scripts/parity/GAP-CHECKLIST.md.
//
// Usage: node scripts/parity/draft-live-walk.mjs <config.mjs> [--out dir] [--widths 1440,768,375]
//        [--states a,b] [--no-accept] [--no-review] [--lint] [--inject-live-css "css"] [--inject-live-js "js"]
//        [--headless] [--self draft|live] [--no-auto] [--dump-auto] [--lean] [--draft-cache file]
// --lean reads only what a settings writer uses (styles, boxes, hover end states, structure, scroll-ins): no load
// entrances, motion timelines, automatic check, links, reveal sweep, screenshots or focus pass (Spec 47 Solve rounds).
// --draft-cache keeps the draft side's reads per width, state list and mode in a file and reuses them: the draft does not
// change between the walks of one run.
// Runs headed unless --headless is passed. Needs NODE_EXTRA_CA_CERTS set to certifi's bundle for the Hostinger sites.
// --inject-live-css / --inject-live-js are the negative controls: they plant a known difference on the live side
// (the catch-rate benchmark, scripts/parity/benchmark.mjs, replays past gaps this way).
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DEFAULT_PROPS, PSEUDO_PROPS, resolveFinder, collectPair, collectRunning, hoverStyles } from './lib/collect.mjs';
import { PAINT_SRC } from './lib/paint.mjs';
import { SCROLL_PROPS, scrollInPass, revealSweep, hoverPass, focusPasses } from './lib/state-passes.mjs';
import { collectLinks, probeLinks, unseenLabels } from './lib/links.mjs';
import { sampleEntrances } from './lib/entrances.mjs';
import { isAccepted } from './lib/compare.mjs';
import { compareState } from './lib/compare-state.mjs';
import { writeReport, sideBySide } from './lib/report.mjs';
import { lintConfig } from './lib/lint.mjs';
import { collectStructure } from './lib/structure.mjs';
import { writeContactSheet } from './lib/review.mjs';
import { makeHelpers } from './lib/helpers.mjs';
import { sampleTimeline, collectChrome } from './lib/chrome-walk.mjs';
import { withAutoScroll, collectAutoOn, markClipped } from './lib/auto-walk.mjs';
import closeOnExit from '../lib/close-browser-on-exit.js';
import { REF_PROPS, elementPath, traceRef } from './lib/ref-trace.mjs';
import { loadDivergences } from './lib/divergences.mjs';
import { openDevtools, settleAnimations, declaredValues, DECLARED_PROPS } from './lib/devtools.mjs';

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
const widths = ( flag( '--widths' ) || ( cfg.widths || [ 1440, 768, 375 ] ).join( ',' ) ).split( ',' ).map( Number );
const onlyStates = flag( '--states' )?.split( ',' );
const accept = argv.includes( '--no-accept' ) ? [] : cfg.accept || [];
const lean = argv.includes( '--lean' );
const draftCache = flag( '--draft-cache' );
const injectCss = flag( '--inject-live-css' );
const injectJs = flag( '--inject-live-js' );
const outDir = path.resolve( flag( '--out' ) || path.join( path.dirname( cfgPath ), 'out', cfg.name ) );
fs.mkdirSync( outDir, { recursive: true } );
const tol = { box: 2, px: 0.5, ...( cfg.tolerance || {} ) };
const RESOLVE = resolveFinder.toString();
// Ref tracing (GAP-CHECKLIST.md section 16): with `refPrefix` every row names its live block and element, and the
// spacing and width a layout setting writes are measured too. The divergence ledger (section 16) accepts intended rows.
const refPrefix = cfg.refPrefix || null;
const TRACE = traceRef.toString();
const PATH = elementPath.toString();
// With refPrefix every pair reads its full CSS (the default list, its own list and the layout properties), so a tool
// writing settings sees every property a setting could fix.
const propsFor = ( p ) => ( refPrefix ? [ ...new Set( [ ...DEFAULT_PROPS, ...( p.props || [] ), ...REF_PROPS ] ) ] : p.props || DEFAULT_PROPS );
const divergences = loadDivergences( cfgPath, cfg );
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
	// Per-side roots and exclusions follow too, so both sides look for the same side's elements.
	const both = ( o ) => o && { draft: o[ self ], live: o[ self ] };
	cfg.linkRoot = both( cfg.linkRoot );
	if ( cfg.auto ) {
		cfg.auto = { ...cfg.auto, root: both( cfg.auto.root ), exclude: both( cfg.auto.exclude ) };
	}
}

// The automatic check (GAP-CHECKLIST.md section 12): every word, control and picture compared with no
// config naming it, plus a scrolled state. On with the full checks; `auto: false` or --no-auto turns it off.
const autoOn = header && ! lean && false !== cfg.auto && ! argv.includes( '--no-auto' );
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
	const onAction = header && ! lean ? async () => {
		const t = await sampleTimeline( page, tracked, side, RESOLVE );
		h.timeline = t.samples;
		return t.spent;
	} : null;
	const h = makeHelpers( page, side, { cb, RESOLVE, onAction } );
	// Ref-traced walks read through the DevTools protocol too: every pair's forced hover and its declared sizes.
	const cdp = refPrefix ? await openDevtools( page ) : null;
	await h.goto( cfg[ side ].url );
	// Load entrances (GAP-CHECKLIST.md section 15): the page reloaded and sampled as it paints in.
	const firstState = cfg.states[ 0 ]?.name;
	const entrances = header && ! lean && false !== cfg.entrances && ( ! onlyStates || onlyStates.includes( firstState ) ) ? await sampleEntrances( page, side, cfg ) : null;
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
		// Read once the state's animations finish (a state's `settle` is the floor for scripts that start one late).
		const settled = await settleAnimations( page, { floor: state.settle ?? 300 } );
		if ( onlyStates && ! onlyStates.includes( state.name ) ) {
			continue;
		}
		const snap = {};
		for ( const p of pairs ) {
			snap[ p.name ] = await page.evaluate( collectPair, [ p[ side ], propsFor( p ), RESOLVE, 'live' === side ? refPrefix : null, TRACE, PATH, PAINT_SRC, refPrefix ? PSEUDO_PROPS : null ] );
			snap[ p.name ].running = running[ p.name ];
			if ( cdp && ! snap[ p.name ].missing && ! p[ side ].textRun && ! p[ side ].group ) {
				snap[ p.name ].declared = await declaredValues( cdp, p[ side ], RESOLVE, DECLARED_PROPS );
			}
		}
		// The page's own zero point for positions (the outermost <main>), so a pair's place on the page is compared
		// without the header above it (ref-traced walks only: compare-state.mjs::flowOffsets). Read at the same scroll
		// as the pair boxes above: a sticky header that shrinks on scroll moves <main> after any scroll pass.
		const mainY = refPrefix ? await page.evaluate( () => {
			const m = document.querySelector( 'main' );
			return m ? Math.round( m.getBoundingClientRect().top + window.scrollY ) : null;
		} ) : null;
		if ( header ) {
			await collectChrome( page, side, pairs, snap, RESOLVE, h.timeline );
		}
		const finders = Object.fromEntries( pairs.filter( ( p ) => p.structure !== false ).map( ( p ) => [ p.name, p[ side ] ] ) );
		const structure = await page.evaluate( collectStructure, [ finders, RESOLVE ] );
		// Scroll-in pairs are read before anything scrolls (a full-page shot reveals them too).
		const scrollIns = pairs.filter( ( q ) => q.scrollIn && ! snap[ q.name ].missing );
		for ( const p of scrollIns ) {
			snap[ p.name ].scroll = { pre: await page.evaluate( hoverStyles, [ p[ side ], SCROLL_PROPS, RESOLVE, PAINT_SRC ] ) };
		}
		const auto = autoOn ? await collectAutoOn( page, side, cfg ) : null;
		// Links (section 14): the live side's same-origin targets are fetched once per run.
		const links = false === cfg.links || lean ? null : await collectLinks( page, side, cfg );
		if ( links && 'live' === side ) {
			await probeLinks( ctx, page, links );
		}
		// Scroll-ins first, then (full-page states) the reveal sweep, so the shot shows every revealed section.
		const y = await page.evaluate( () => window.scrollY );
		await scrollInPass( page, scrollIns, side, snap, RESOLVE );
		if ( state.fullPage && ! lean && false !== cfg.revealSweep ) {
			await revealSweep( page, y );
		} else if ( scrollIns.length ) {
			await page.evaluate( ( t ) => window.scrollTo( { top: t, behavior: 'instant' } ), y );
			await page.waitForTimeout( 600 );
		}
		const shot = lean ? null : path.join( outDir, `${ side }-${ width }-${ state.name }.png` );
		if ( shot ) {
			await page.screenshot( { path: shot, fullPage: !! state.fullPage } );
		}
		if ( auto ) {
			await markClipped( ctx, shot, auto, !! state.fullPage );
			// --dump-auto: the words and controls the automatic check compared, for diagnosing a pairing.
			if ( argv.includes( '--dump-auto' ) ) {
				fs.writeFileSync( path.join( outDir, `auto-${ side }-${ width }-${ state.name }.json` ), JSON.stringify( auto ) );
			}
		}
		await hoverPass( page, pairs, side, snap, { state, h, RESOLVE, full: header, phone: !! phone.isMobile, cdp } );
		if ( header && ! lean ) {
			await focusPasses( page, pairs, side, snap, RESOLVE, !! phone.isMobile );
		}
		states[ state.name ] = { snap, shot, log, structure, auto, links, mainY, entrances: state.name === firstState ? entrances : null, ...( settled.settled ? {} : { unsettled: settled } ) };
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
// Each link problem is reported once per run, in the first state and width that shows it.
const linksSeen = new Set();
const allLiveLinks = [];
const origins = { draft: new URL( cb( cfg.draft.url ) ).origin, live: new URL( cb( cfg.live.url ) ).origin };
const cached = draftCache && fs.existsSync( draftCache ) ? JSON.parse( fs.readFileSync( draftCache, 'utf8' ) ) : {};
const cacheKey = ( width ) => JSON.stringify( { config: cfg.name, width, states: onlyStates || null, lean, self } );
for ( const width of widths ) {
	const draft = cached[ cacheKey( width ) ] || await walkSide( browser, 'draft', width );
	if ( draftCache ) {
		cached[ cacheKey( width ) ] = draft;
		fs.writeFileSync( draftCache, JSON.stringify( cached ) );
	}
	const live = await walkSide( browser, 'live', width );
	results.errors[ width ] = { draft: draft.errors, live: live.errors };
	for ( const state of cfg.states.filter( ( s ) => draft.states[ s.name ] ) ) {
		const d = draft.states[ state.name ];
		const l = live.states[ state.name ];
		const shot = d.shot && l.shot ? path.join( outDir, `pair-${ width }-${ state.name }.png` ) : null;
		if ( shot ) {
			await sideBySide( browser, d.shot, l.shot, shot, width );
		}
		const run = { state: state.name, width, shot: shot ? path.basename( shot ) : null, pairs: {} };
		compareState( run, d, l, { state, width, cfg, accept, divergences, tol, header, autoOn, pairsFor, origins, linksSeen, allLiveLinks } );
		results.runs.push( run );
	}
}
await browser.close();
const unseen = false === cfg.links || lean || ! results.runs.length ? [] : unseenLabels( cfg, allLiveLinks, origins ).filter( ( r ) => ! linksSeen.has( r.key ) );
if ( unseen.length ) {
	const last = results.runs.at( -1 );
	last.pairs[ '(links)' ] ??= { diffs: [] };
	last.pairs[ '(links)' ].diffs.push( ...unseen.map( ( r ) => ( { ...r, accepted: isAccepted( accept, { pair: '(links)', state: last.state, width: last.width, boxMatches: true }, r )?.reason || null } ) ) );
}
const { open, accepted } = writeReport( outDir, cfg, results );
const unreviewed = argv.includes( '--no-review' ) ? 0 : writeContactSheet( outDir, cfg, results.runs );
const liveErrors = Object.values( results.errors ).flatMap( ( e ) => e.live );
console.log( `${ cfg.name }: ${ open } open, ${ accepted } accepted, ${ unreviewed } shots unreviewed, ${ liveErrors.length } live console errors. Report: ${ path.join( outDir, 'report.md' ) }, contact sheet: ${ path.join( outDir, 'contact.md' ) }` );
process.exit( open || unreviewed || liveErrors.length ? 1 : 0 );
