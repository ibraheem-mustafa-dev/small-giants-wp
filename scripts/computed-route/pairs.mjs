#!/usr/bin/env node
// Block pairing command (plan .claude/plans/2026-10-04-spec47-full-coverage.md).
//   node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface about
// Opens the surface's draft (its walker config's draft url and navigation) and live page at 1440, collects every
// painted word with the element painting it (scripts/parity/lib/auto-collect.mjs, tagEls), pairs the words with the
// walker's own matcher (auto-compare.mjs::matchWords), and pairs each live block (cr-ref-<surface>-<n>) with the
// smallest draft element holding its words' twins (lib/pairs.mjs). Doubtful pairings are left out with their reason.
// A kept draft finder is re-checked at 375 and 768 (it must still hold the block's first and last matched words).
// Writes sites/<client>/build/qa/parity/<walker>.full.mjs and sites/<client>/build/qa/pairs/<surface>.json.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { collectAuto } from '../parity/lib/auto-collect.mjs';
import { matchWords } from '../parity/lib/auto-compare.mjs';
import { AUTO_EXCLUDE } from '../parity/lib/auto-walk.mjs';
import { makeHelpers } from '../parity/lib/helpers.mjs';
import { resolveFinder } from '../parity/lib/collect.mjs';
import { wordsByBlock, twinsByBlock, judgePairing, configText } from './lib/pairs.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

// In-page: the words (tagged with their elements) of the page, as the walker's automatic check collects them.
function collectTagged( page, side, cfg ) {
	const exclude = [ ...AUTO_EXCLUDE, ...( cfg.auto?.exclude?.[ side ] || [] ) ];
	return page.evaluate( ( [ fn, rootSel, ex ] ) => {
		// eslint-disable-next-line no-new-func
		const collect = new Function( `return (${ fn });` )();
		// eslint-disable-next-line no-new-func
		const excludeEls = ex.filter( ( e ) => e && e.js ).map( ( e ) => new Function( 'root', `return (${ e.js })(root);` )( document ) ).filter( Boolean );
		const root = rootSel ? document.querySelector( rootSel ) : null;
		return collect( [ { root, modal: null, excludeEls, tagEls: true }, ex.filter( ( e ) => 'string' === typeof e ), 4000 ] ).words;
	}, [ collectAuto.toString(), cfg.auto?.root?.[ side ] || null, exclude ] );
}

// In-page (live): the cr-ref classes around each tagged word, innermost first, and each block's box.
function liveBlocks( page, prefix ) {
	return page.evaluate( ( pre ) => {
		const refOf = ( el ) => [ ...el.classList ].find( ( c ) => c.startsWith( pre ) );
		const refsAround = ( el ) => {
			const out = [];
			for ( let a = el; a; a = a.parentElement ) {
				const r = refOf( a );
				r && out.push( r );
			}
			return out;
		};
		const boxes = {};
		document.querySelectorAll( `[class*="${ pre }"]` ).forEach( ( el ) => {
			const r = refOf( el );
			const b = el.getBoundingClientRect();
			r && ! boxes[ r ] && b.width > 0 && ( boxes[ r ] = { w: Math.round( b.width ), h: Math.round( b.height ) } );
		} );
		return { refs: window.__crEls.map( refsAround ), boxes };
	}, prefix );
}

// In-page (draft): for each block, the smallest element holding its twins' elements, as a CSS path from <body>, its
// box, and every tagged word element inside it.
function draftPartners( page, wanted, wordEls ) {
	return page.evaluate( ( [ want, wEls ] ) => {
		const els = window.__crEls;
		const lca = ( list ) => list.reduce( ( a, b ) => {
			let x = a;
			while ( x && ! x.contains( b ) ) {
				x = x.parentElement;
			}
			return x;
		} );
		const pathOf = ( el ) => {
			const steps = [];
			for ( let a = el; a && a !== document.body; a = a.parentElement ) {
				steps.unshift( `${ a.tagName.toLowerCase() }:nth-child(${ [ ...a.parentElement.children ].indexOf( a ) + 1 })` );
			}
			return [ 'body', ...steps ].join( ' > ' );
		};
		const out = {};
		for ( const [ ref, idx ] of Object.entries( want ) ) {
			const p = lca( [ ...new Set( idx ) ].map( ( i ) => els[ i ] ) );
			if ( ! p || p === document.body || p === document.documentElement ) {
				out[ ref ] = null;
				continue;
			}
			const b = p.getBoundingClientRect();
			out[ ref ] = { path: pathOf( p ), box: { w: Math.round( b.width ), h: Math.round( b.height ) }, inside: wEls.map( ( e, j ) => ( p.contains( els[ e ] ) ? j : -1 ) ).filter( ( j ) => j >= 0 ) };
		}
		return out;
	}, [ wanted, wordEls ] );
}

async function openDraft( browser, cfg, width ) {
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	const RESOLVE = resolveFinder.toString();
	const h = makeHelpers( page, 'draft', { cb: ( u ) => u.replace( '{cb}', String( Date.now() ) ), RESOLVE, onAction: null } );
	h.log = [];
	await page.goto( cfg.draft.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( () => {} );
	await page.waitForTimeout( 1500 );
	if ( cfg.draft.open ) {
		await cfg.draft.open( h );
	}
	// Every scroll reveal fires before anything is read.
	await page.evaluate( async () => {
		for ( let y = 0; y < document.body.scrollHeight; y += 600 ) {
			window.scrollTo( 0, y );
			await new Promise( ( r ) => setTimeout( r, 120 ) );
		}
		window.scrollTo( 0, 0 );
	} );
	await page.waitForTimeout( 1500 );
	return page;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const s = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) )[ surface ];
	const handPath = path.join( buildDir, s.walker );
	const cfg = ( await import( pathToFileURL( handPath ).href ) ).default;
	const prefix = `${ cfg.refPrefix || 'cr-ref-' }${ surface }-`;
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch( { headless: true } );
	const draft = await openDraft( browser, cfg, 1440 );
	const live = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await live.goto( cfg.live.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( () => {} );
	await live.waitForTimeout( 2500 );
	const dWords = await collectTagged( draft, 'draft', cfg );
	const lWords = await collectTagged( live, 'live', cfg );
	const { refs: liveRefs, boxes } = await liveBlocks( live, prefix );
	const matches = matchWords( dWords, lWords ) || [];
	const lRefsOfWord = lWords.map( ( w ) => liveRefs[ w.e ] || [] );
	const twins = twinsByBlock( matches, wordsByBlock( lRefsOfWord ) );
	const liveRefsOfDraft = new Map( matches.map( ( [ d, l ] ) => [ d, lRefsOfWord[ l ] ] ) );
	const wanted = Object.fromEntries( [ ...twins ].filter( ( [ , t ] ) => t.draft.length ).map( ( [ ref, t ] ) => [ ref, t.draft.map( ( j ) => dWords[ j ].e ) ] ) );
	const partners = await draftPartners( draft, wanted, dWords.map( ( w ) => w.e ) );
	const kept = [];
	const left = [];
	for ( const [ ref, t ] of twins ) {
		const partner = partners[ ref ];
		const verdict = partner ? judgePairing( { ref, ...t, liveBox: boxes[ ref ] || { w: 0, h: 0 } }, partner, liveRefsOfDraft ) : { ok: false, why: t.draft.length ? 'no draft element holds its words' : 'no matched words' };
		( verdict.ok ? kept : left ).push( { ref, draft: partner?.path || null, why: verdict.why, words: t.live.length, matched: t.draft.length, first: t.draft.length ? dWords[ Math.min( ...t.draft ) ].t : null, last: t.draft.length ? dWords[ Math.max( ...t.draft ) ].t : null } );
	}
	// A kept finder must hold the block's first and last matched words at 375 and 768 too.
	for ( const width of [ 375, 768 ] ) {
		const page = await openDraft( browser, cfg, width );
		const texts = await page.evaluate( ( paths ) => paths.map( ( p ) => document.querySelector( p )?.textContent.toLowerCase() ?? null ), kept.map( ( k ) => k.draft ) );
		await page.close();
		for ( let i = kept.length - 1; i >= 0; i-- ) {
			const t = texts[ i ];
			if ( null === t || ! t.includes( kept[ i ].first ) || ! t.includes( kept[ i ].last ) ) {
				left.push( { ...kept[ i ], why: `its draft element at ${ width } does not hold the same words` } );
				kept.splice( i, 1 );
			}
		}
	}
	await browser.close();
	const all = Object.keys( boxes ).filter( ( r ) => r.startsWith( prefix ) );
	const unworded = all.filter( ( r ) => ! twins.has( r ) ).map( ( ref ) => ( { ref, why: 'no painted words (an image, an icon or an empty wrapper)' } ) );
	const handFile = path.basename( s.walker );
	const fullFile = handFile.replace( /\.mjs$/, '.full.mjs' );
	fs.writeFileSync( path.join( path.dirname( handPath ), fullFile ), configText( handFile, surface, kept ) );
	fs.mkdirSync( path.join( buildDir, 'qa', 'pairs' ), { recursive: true } );
	const report = { surface, when: new Date().toISOString(), blocks: all.length, kept: kept.length, left: [ ...left, ...unworded ], keptPairs: kept };
	fs.writeFileSync( path.join( buildDir, 'qa', 'pairs', `${ surface }.json` ), JSON.stringify( report, null, 1 ) );
	console.log( JSON.stringify( { surface, blocks: all.length, kept: kept.length, left: report.left.length, config: path.join( path.dirname( s.walker ), fullFile ) } ) );
}
