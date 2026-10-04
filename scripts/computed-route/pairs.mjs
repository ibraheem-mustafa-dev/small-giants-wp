#!/usr/bin/env node
// Block pairing command (plan .claude/plans/2026-10-04-spec47-full-coverage.md).
//   node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface about
// Opens the surface's draft (its walker config's draft url and navigation) and live page at 1440, collects every
// painted word with the element painting it (scripts/parity/lib/auto-collect.mjs, tagEls), pairs the words with the
// walker's own matcher (auto-compare.mjs::matchWords), and pairs each live block (cr-ref-<surface>-<n>) with the
// smallest draft element holding its words' twins (lib/pairs.mjs; the in-page collectors are lib/pairs-page.mjs).
// A repeated draft word takes the occurrence nearest the block's sure words, or its parent block's partner; a block
// whose draft text has no element of its own is paired as a text run. Doubtful pairings are left out with their reason.
// A kept draft finder is re-checked at 375 and 768 (it must still hold the block's first and last matched words).
// Writes sites/<client>/build/qa/parity/<surface>.full.mjs and sites/<client>/build/qa/pairs/<surface>.json.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { matchWords } from '../parity/lib/auto-compare.mjs';
import { waitOutHostCheck } from '../parity/lib/helpers.mjs';
import { wordsByBlock, twinsByBlock, twinPlan, parentRef, wordMatch, choosePartner, reconcileHandPairs, configText } from './lib/pairs.mjs';
import { collectTagged, liveBlocks, draftChains, handElements, openDraft } from './lib/pairs-page.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

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
	// SGS_HEADED=1 runs headed (Hostinger's edge challenges a headless browser under load); scrollbars hidden as the walker hides them,
	// or a headed window lays the page out about 15px narrower than its viewport.
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars' ] } );
	const draft = await openDraft( browser, cfg, 1440 );
	const live = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await live.goto( cfg.live.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } ).catch( () => {} );
	await live.waitForTimeout( 2500 );
	await waitOutHostCheck( live );
	const dWords = await collectTagged( draft, 'draft', cfg );
	const lWords = await collectTagged( live, 'live', cfg );
	const { refs: liveRefs, boxes } = await liveBlocks( live, prefix );
	const matches = matchWords( dWords, lWords ) || [];
	const lRefsOfWord = lWords.map( ( w ) => liveRefs[ w.e ] || [] );
	const twins = twinsByBlock( matches, wordsByBlock( lRefsOfWord ) );
	const liveRefsOfDraft = new Map( matches.map( ( [ d, l ] ) => [ d, lRefsOfWord[ l ] ] ) );
	const wordEls = dWords.map( ( w ) => w.e );
	// Pass 1: blocks with at least one sure (unrepeated) draft word; pass 2: blocks of repeated words only, anchored on
	// their parent block's partner.
	const plans = new Map( [ ...twins ].filter( ( [ , t ] ) => t.draft.length ).map( ( [ ref, t ] ) => [ ref, twinPlan( t.draft, dWords ) ] ) );
	const match = Object.fromEntries( [ ...twins ].map( ( [ ref, t ] ) => [ ref, wordMatch( t.draft.map( ( j ) => dWords[ j ].t ) ) ] ) );
	const results = {};
	const decide = ( chains ) => {
		for ( const [ ref, chain ] of Object.entries( chains ) ) {
			const block = { ref, ...twins.get( ref ), liveBox: boxes[ ref ] || { w: 0, h: 0 } };
			results[ ref ] = chain ? choosePartner( chain, block, liveRefsOfDraft ) : { partner: null, verdict: { ok: false, why: 'no draft element holds its words' } };
		}
	};
	decide( await draftChains( draft, Object.fromEntries( [ ...plans ].filter( ( [ , p ] ) => p.sure.length ).map( ( [ ref, p ] ) => [ ref, { ...p, anchor: null } ] ) ), wordEls, match ) );
	const second = [ ...plans ].filter( ( [ , p ] ) => ! p.sure.length ).map( ( [ ref, p ] ) => [ ref, { ...p, anchor: results[ parentRef( ref, lRefsOfWord ) ]?.partner?.path || null } ] );
	decide( await draftChains( draft, Object.fromEntries( second ), wordEls, match ) );
	const kept = [];
	const left = [];
	for ( const [ ref, t ] of twins ) {
		const { partner, verdict } = results[ ref ] || { partner: null, verdict: { ok: false, why: 'no matched words' } };
		const textRun = partner?.textRun ? { ...partner.textRun, match: match[ ref ] } : null;
		( verdict.ok ? kept : left ).push( { ref, draft: partner?.path || null, ...( textRun ? { textRun } : {} ), why: verdict.why, words: t.live.length, matched: t.draft.length, first: t.draft.length ? dWords[ Math.min( ...t.draft ) ].t : null, last: t.draft.length ? dWords[ Math.max( ...t.draft ) ].t : null } );
	}
	// Hand pairs measuring a kept block's draft element on an element inside the block move to the block root, and
	// the generated pair they then duplicate is dropped (lib/pairs.mjs::reconcileHandPairs).
	const handPairs = ( cfg.pairs || [] ).filter( ( p ) => p && p.name );
	const serial = ( f ) => ( 'function' === typeof f ? null : f );
	const hDraft = await handElements( draft, handPairs.map( ( p ) => serial( p.draft ) ), 'draft', prefix );
	const hLive = await handElements( live, handPairs.map( ( p ) => serial( p.live ) ), 'live', prefix );
	const { retarget, duplicate } = reconcileHandPairs( handPairs.map( ( p, i ) => ( { name: p.name, draft: hDraft[ i ], liveRef: hLive[ i ]?.liveRef || null, liveIsRoot: !! hLive[ i ]?.liveIsRoot } ) ), kept.filter( ( k ) => ! k.textRun ) );
	for ( let i = kept.length - 1; i >= 0; i-- ) {
		duplicate.has( kept[ i ].ref ) && kept.splice( i, 1 );
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
	// Named after the surface: two surfaces can share one hand config (a page and the form post it embeds).
	const fullFile = `${ surface }.full.mjs`;
	fs.writeFileSync( path.join( path.dirname( handPath ), fullFile ), configText( handFile, surface, kept, retarget ) );
	fs.mkdirSync( path.join( buildDir, 'qa', 'pairs' ), { recursive: true } );
	const report = { surface, when: new Date().toISOString(), blocks: all.length, kept: kept.length, coveredByHand: [ ...duplicate ], retargeted: Object.fromEntries( retarget ), left: [ ...left, ...unworded ], keptPairs: kept };
	fs.writeFileSync( path.join( buildDir, 'qa', 'pairs', `${ surface }.json` ), JSON.stringify( report, null, 1 ) );
	console.log( JSON.stringify( { surface, blocks: all.length, kept: kept.length, left: report.left.length, config: path.join( path.dirname( s.walker ), fullFile ) } ) );
}
