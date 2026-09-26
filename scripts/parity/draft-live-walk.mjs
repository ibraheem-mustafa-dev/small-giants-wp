// Draft-versus-live parity walker. Drives the design draft and the live site through
// the same states (tabs, steps, open panels, filters, modals) at each width and compares
// named element pairs: rendered text, box size, computed styles, motion (declared and
// running right after each action) and hover end states. Writes report.json, report.md
// and draft|live side-by-side screenshots. Exits 1 when any difference is not accepted.
//
// Usage: node scripts/parity/draft-live-walk.mjs <config.mjs> [--out dir] [--widths 1440,768,375]
//        [--states a,b] [--no-accept] [--inject-live-css "css"]
// Needs NODE_EXTRA_CA_CERTS set to certifi's bundle for the Hostinger sites.
// --inject-live-css is the negative control: it plants a known difference on the live side.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DEFAULT_PROPS, HOVER_PROPS, resolveFinder, collectPair, collectRunning, centreOf, hoverStyles } from './lib/collect.mjs';
import { comparePair, isAccepted } from './lib/compare.mjs';
import { writeReport, sideBySide } from './lib/report.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );

const argv = process.argv.slice( 2 );
const flag = ( name ) => {
	const i = argv.indexOf( name );
	return i === -1 ? null : argv[ i + 1 ];
};
const cfgPath = path.resolve( argv[ 0 ] || '' );
if ( ! argv[ 0 ] || ! fs.existsSync( cfgPath ) ) {
	console.error( 'Usage: node draft-live-walk.mjs <config.mjs> [--out dir] [--widths 1440,768,375] [--states a,b] [--no-accept] [--inject-live-css "css"]' );
	process.exit( 2 );
}
const cfg = ( await import( pathToFileURL( cfgPath ).href ) ).default;
const widths = ( flag( '--widths' ) || ( cfg.widths || [ 1440, 768, 375 ] ).join( ',' ) ).split( ',' ).map( Number );
const onlyStates = flag( '--states' )?.split( ',' );
const accept = argv.includes( '--no-accept' ) ? [] : cfg.accept || [];
const injectCss = flag( '--inject-live-css' );
const outDir = path.resolve( flag( '--out' ) || path.join( path.dirname( cfgPath ), 'out', cfg.name ) );
fs.mkdirSync( outDir, { recursive: true } );
const tol = { box: 2, px: 0.5, ...( cfg.tolerance || {} ) };
const RESOLVE = resolveFinder.toString();
const cb = ( url ) => url.replace( '{cb}', String( Date.now() ) );

// Helpers handed to a config's open() and state actions.
function helpers( page, side ) {
	const h = {
		page, side,
		wait: ( ms ) => page.waitForTimeout( ms ),
		goto: async ( url ) => {
			await page.goto( cb( url ), { waitUntil: 'networkidle' } );
			await page.waitForTimeout( 500 );
		},
		// Clicks the smallest visible element whose rendered text matches the regex source.
		clickText: async ( src, opts = {} ) => {
			const ok = await page.evaluate( ( [ finder, res ] ) => {
				// eslint-disable-next-line no-new-func
				const el = new Function( `return (${ res });` )()( finder );
				if ( el ) {
					el.click();
				}
				return !! el;
			}, [ { text: src, tag: opts.tag || 'a,button,[role=button],[role=tab],label,summary,h3,span,div', within: opts.within, nth: opts.nth }, RESOLVE ] );
			if ( ! ok && ! opts.optional ) {
				throw new Error( `${ side }: nothing visible matches /${ src }/` );
			}
			await page.waitForTimeout( opts.wait ?? 700 );
		},
		click: async ( selector, opts = {} ) => {
			await page.evaluate( ( [ sel, res ] ) => {
				// eslint-disable-next-line no-new-func
				const el = new Function( `return (${ res });` )()( sel );
				if ( ! el ) {
					throw new Error( 'no visible ' + sel );
				}
				el.click();
			}, [ selector, RESOLVE ] );
			await page.waitForTimeout( opts.wait ?? 700 );
		},
		waitFor: ( selector ) => page.waitForSelector( selector, { state: 'visible', timeout: 15000 } ),
	};
	return h;
}

const pairsFor = ( state ) => cfg.pairs.filter( ( p ) => ! p.states || p.states.includes( state.name ) );

async function walkSide( browser, side, width ) {
	const ctx = await browser.newContext( { viewport: { width, height: width < 500 ? 812 : 900 } } );
	if ( side === 'live' && injectCss ) {
		await ctx.addInitScript( ( css ) => document.addEventListener( 'DOMContentLoaded', () => {
			const s = document.createElement( 'style' );
			s.textContent = css;
			document.head.appendChild( s );
		} ), injectCss );
	}
	const page = await ctx.newPage();
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	page.on( 'console', ( m ) => m.type() === 'error' && errors.push( m.text() ) );
	const h = helpers( page, side );
	await h.goto( cfg[ side ].url );
	if ( cfg[ side ].open ) {
		await cfg[ side ].open( h );
	}
	const states = {};
	for ( const state of cfg.states ) {
		if ( state[ side ] ) {
			await state[ side ]( h );
		}
		const pairs = pairsFor( state );
		await page.waitForTimeout( 60 );
		const running = {};
		for ( const p of pairs ) {
			running[ p.name ] = await page.evaluate( collectRunning, [ p[ side ], RESOLVE ] );
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
		const shot = path.join( outDir, `${ side }-${ width }-${ state.name }.png` );
		await page.screenshot( { path: shot, fullPage: !! state.fullPage } );
		for ( const p of pairs.filter( ( q ) => q.hover ) ) {
			const at = await page.evaluate( centreOf, [ p[ side ], RESOLVE ] );
			if ( ! at || snap[ p.name ].missing ) {
				continue;
			}
			await page.mouse.move( at.x, at.y );
			await page.waitForTimeout( p.hoverWait ?? 800 );
			snap[ p.name ].hover = await page.evaluate( hoverStyles, [ p[ side ], p.hoverProps || HOVER_PROPS, RESOLVE ] );
			await page.mouse.move( 1, 1 );
			await page.waitForTimeout( 400 );
		}
		states[ state.name ] = { snap, shot };
	}
	await ctx.close();
	return { states, errors };
}

const browser = await chromium.launch();
const results = { config: cfg.name, when: new Date().toISOString(), injectCss, runs: [], errors: {} };
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
		for ( const p of pairsFor( state ) ) {
			const diffs = comparePair( p, d.snap[ p.name ], l.snap[ p.name ], { ...tol, ...( p.tolerance || {} ) } );
			for ( const diff of diffs ) {
				const a = isAccepted( accept, { pair: p.name, state: state.name, width }, diff );
				diff.accepted = a ? a.reason : null;
			}
			run.pairs[ p.name ] = { draft: d.snap[ p.name ], live: l.snap[ p.name ], diffs };
		}
		results.runs.push( run );
	}
}
await browser.close();
const { open, accepted } = writeReport( outDir, cfg, results );
const liveErrors = Object.values( results.errors ).flatMap( ( e ) => e.live );
console.log( `${ cfg.name }: ${ open } open, ${ accepted } accepted, ${ liveErrors.length } live console errors. Report: ${ path.join( outDir, 'report.md' ) }` );
process.exit( open || liveErrors.length ? 1 : 0 );
