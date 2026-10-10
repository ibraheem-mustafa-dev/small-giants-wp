#!/usr/bin/env node
// Try-before-write replay (Spec 47 route-accuracy R6).
//   node scripts/computed-route/trial.mjs --client <slug> --surface <s> --run <solve run dir> [--round 1]
//     [--site <calibration target>] [--widths 375,768,1440] [--out <dir>]
// Takes one round's writes from a Solve run's solve-report.json and tries each (one setting on one block) in the open
// live page of --site (default the surface's own site) before anything is saved: the block rendered with the
// attributes saved on the surface's post (read over REST: the uid hashes exactly those) and with the write (core /wp/v2/block-renderer), the self-check (the current render reproduces the
// live uid and its CSS), the CSS difference applied on the live uid, the pairs in and after the block measured at every
// width against the run's draft cache, the change undone (lib/trial.mjs, lib/trial-page.mjs). Writes, into --out
// (default <run>/trial-round-<n>): trial.json, trial.md and writes-kept.json ({ writes, wrong: [] }, the writes the
// trial kept, in solve-report form so answer-sheet.mjs --solve scores them). Nothing on any site is changed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder } from '../parity/lib/collect.mjs';
import { retargetLive } from '../parity/lib/helpers.mjs';
import { uidsIn, mapUids, ruleDiff, selfCheck, untriable, withWrite, judgeTrial, savedBlock } from './lib/trial.mjs';
import { readEnv, adminSession, renderBlock, styleOf, rootClassOf, rulesInPage, parseInPage, cssOf, applyTrialInPage, undoTrialInPage, measureInPage, scopeInPage } from './lib/trial-page.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const RESOLVE = resolveFinder.toString();

// The last write of each setting on each block in a round: [ { ref, block, attr, after, group, ... } ].
export function candidatesOf( writes, round ) {
	const last = new Map();
	for ( const w of writes.filter( ( x ) => x.round === round ) ) {
		last.set( `${ w.ref }|${ w.attr }`, w );
	}
	return [ ...last.values() ];
}

// Draft boxes per width from a run's draft cache: { [width]: { [pair]: { box } } } in the first state.
function draftBoxes( runDir, widths ) {
	const out = {};
	for ( const w of widths ) {
		const f = path.join( runDir, `draft-cache-${ w }.json` );
		if ( ! fs.existsSync( f ) ) {
			continue;
		}
		const entry = Object.values( JSON.parse( fs.readFileSync( f, 'utf8' ) ) )[ 0 ];
		const state = Object.keys( entry.states )[ 0 ];
		out[ w ] = Object.fromEntries( Object.entries( entry.states[ state ].snap ).filter( ( [ , s ] ) => s?.box ).map( ( [ n, s ] ) => [ n, { box: s.box } ] ) );
	}
	return out;
}

// A post's raw content by id, whatever its type: pages, posts, then every other REST post type.
async function savedContent( session, id ) {
	const types = JSON.parse( ( await session.api( '/wp-json/wp/v2/types' ) ).body );
	const bases = [ 'pages', 'posts', ...Object.values( types ).map( ( t ) => t.rest_base ).filter( ( b ) => b && ! [ 'pages', 'posts' ].includes( b ) ) ];
	for ( const b of bases ) {
		const r = await session.api( `/wp-json/wp/v2/${ b }/${ id }?context=edit&_fields=content` );
		if ( 200 === r.status ) {
			return JSON.parse( r.body ).content?.raw || '';
		}
	}
	throw new Error( `post ${ id } is not readable through any REST post type` );
}

const minX = ( pairs, names ) => Math.min( ...names.map( ( n ) => pairs[ n ]?.box?.x ).filter( ( x ) => null != x ) );

async function tryOne( { cand, attrs, session, live, finders, widths, draft } ) {
	const why = untriable( cand.block, path.join( REPO, 'plugins/sgs-blocks/src/blocks' ) );
	if ( why ) {
		return { verdict: 'needs-rebuild', why };
	}
	const [ a, b ] = [ await renderBlock( session, cand.block, attrs ), await renderBlock( session, cand.block, withWrite( attrs, cand ) ) ];
	if ( 200 !== a.status || 200 !== b.status ) {
		return { verdict: 'needs-rebuild', why: `the block renderer answered ${ a.status }/${ b.status }` };
	}
	const sel = `.${ cand.ref }`;
	const liveUids = uidsIn( await live.evaluate( ( s ) => document.querySelector( s )?.className || '', sel ) );
	const aUids = uidsIn( rootClassOf( a.html ) );
	const bUids = uidsIn( rootClassOf( b.html ) );
	const liveRules = ( await Promise.all( liveUids.map( ( u ) => live.evaluate( rulesInPage, u ) ) ) ).flat();
	const aRules = ( await live.evaluate( parseInPage, styleOf( a.html ) ) ).filter( ( r ) => aUids.some( ( u ) => r.includes( u ) ) );
	const check = selfCheck( { liveUids, renderUids: aUids, liveRules, renderRules: aRules } );
	if ( ! check.ok ) {
		return { verdict: 'needs-rebuild', why: `self-check: ${ check.why }` };
	}
	const strip = ( c ) => c.split( /\s+/ ).filter( ( x ) => x && ! uidsIn( x ).length ).sort().join( ' ' );
	if ( strip( rootClassOf( a.html ) ) !== strip( rootClassOf( b.html ) ) ) {
		return { verdict: 'needs-rebuild', why: 'the write changes the block\'s classes (markup), which a CSS trial cannot apply' };
	}
	const all = await live.evaluate( parseInPage, styleOf( a.html ) );
	const bAll = await live.evaluate( parseInPage, mapUids( styleOf( b.html ), bUids, aUids ) );
	const { added, removed } = ruleDiff( all, bAll );
	if ( ! added.length && ! removed.length ) {
		return { verdict: 'no-css', why: 'the write renders the same CSS' };
	}
	const css = mapUids( added.map( cssOf ).join( '\n' ), aUids, liveUids );
	const scope = await live.evaluate( scopeInPage, [ RESOLVE, finders, sel ] );
	const pick = ( m ) => Object.fromEntries( scope.map( ( n ) => [ n, finders[ n ] ] ) );
	const before = {};
	const after = {};
	const blockX = {};
	let restored = true;
	for ( const w of widths ) {
		await live.setViewportSize( { width: w, height: 900 } );
		await live.waitForTimeout( 150 );
		const m0 = await live.evaluate( measureInPage, [ RESOLVE, pick(), sel ] );
		await live.evaluate( applyTrialInPage, [ css, removed ] );
		const m1 = await live.evaluate( measureInPage, [ RESOLVE, pick(), sel ] );
		await live.evaluate( undoTrialInPage );
		const m2 = await live.evaluate( measureInPage, [ RESOLVE, pick(), sel ] );
		restored = restored && JSON.stringify( m0 ) === JSON.stringify( m2 );
		before[ w ] = m0.pairs;
		after[ w ] = m1.pairs;
		blockX[ w ] = { live: minX( m0.pairs, scope ), draft: minX( draft[ w ] || {}, scope ) };
	}
	const v = judgeTrial( { before, after, draft, blockX } );
	return { verdict: v.verdict, delta: v.delta, worse: v.worse, scope: scope.length, added: added.length, removed: removed.length, restored };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	const runDir = path.resolve( REPO, flag( '--run' ) || '' );
	const round = Number( flag( '--round' ) || 1 );
	const widths = ( flag( '--widths' ) || '375,768,1440' ).split( ',' ).map( Number );
	const outDir = path.resolve( REPO, flag( '--out' ) || path.join( runDir, `trial-round-${ round }` ) );
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const s = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) )[ surface ];
	const target = flag( '--site' ) ? JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) )[ flag( '--site' ) ] : { envFile: s.envFile, envKey: s.envKey };
	const env = readEnv( path.join( REPO, target.envFile ) );
	const origin = env[ `WP_URL_${ target.envKey }` ].replace( /\/+$/, '' );
	const cfg = retargetLive( ( await import( pathToFileURL( path.join( buildDir, s.walkerFull || s.walker ) ).href ) ).default, origin );
	const finders = Object.fromEntries( cfg.pairs.filter( ( p ) => p?.name && p.live && 'function' !== typeof p.live ).map( ( p ) => [ p.name, p.live ] ) );
	const report = JSON.parse( fs.readFileSync( path.join( runDir, 'solve-report.json' ), 'utf8' ) );
	const cands = candidatesOf( report.writes || [], round );
	const draft = draftBoxes( runDir, widths );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch( { headless: true } );
	const results = [];
	try {
		const ctx = await browser.newContext();
		const session = await adminSession( ctx, env, target.envKey );
		const raw = await savedContent( session, s.target.postId );
		const live = await ( await browser.newContext() ).newPage( { viewport: { width: widths[ 0 ], height: 900 } } );
		await live.goto( cfg.live.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } );
		await live.addStyleTag( { content: '*,*::before,*::after{transition:none!important;animation:none!important}' } );
		for ( const cand of cands ) {
			const t0 = Date.now();
			const saved = savedBlock( raw, cand.ref );
			const r = saved ? await tryOne( { cand, attrs: saved.attributes, session, live, finders, widths, draft } ).catch( ( e ) => ( { verdict: 'error', why: e.message } ) ) : { verdict: 'needs-rebuild', why: 'no saved block on the post carries this ref' };
			results.push( { ref: cand.ref, block: cand.block, attr: cand.attr, group: cand.group, ms: Date.now() - t0, ...r } );
			console.log( `${ cand.ref } ${ cand.attr }: ${ r.verdict }${ r.why ? ` (${ r.why })` : '' }${ null != r.delta ? ` delta ${ r.delta }` : '' }` );
		}
	} finally {
		await browser.close();
	}
	fs.mkdirSync( outDir, { recursive: true } );
	const kept = new Set( results.filter( ( r ) => [ 'keep', 'no-box-change', 'needs-rebuild', 'error' ].includes( r.verdict ) ).map( ( r ) => `${ r.ref }|${ r.attr }` ) );
	// A write the trial could not judge (no box moved, a rebuild needed, an error) is kept: the rebuild and walk decide it,
// as before. Only a reject is dropped.
	const writesKept = ( report.writes || [] ).filter( ( w ) => w.round !== round || kept.has( `${ w.ref }|${ w.attr }` ) );
	fs.writeFileSync( path.join( outDir, 'trial.json' ), JSON.stringify( { run: path.relative( REPO, runDir ), round, widths, results }, null, 1 ) );
	fs.writeFileSync( path.join( outDir, 'writes-kept.json' ), JSON.stringify( { writes: writesKept, wrong: [] }, null, 1 ) );
	const count = ( v ) => results.filter( ( r ) => r.verdict === v ).length;
	fs.writeFileSync( path.join( outDir, 'trial.md' ), [ `# Trial: ${ surface } round ${ round }`, '', `${ results.length } writes: keep ${ count( 'keep' ) }, reject ${ count( 'reject' ) }, no box change ${ count( 'no-box-change' ) }, needs a rebuild ${ count( 'needs-rebuild' ) }, same CSS ${ count( 'no-css' ) }, error ${ count( 'error' ) }.`, '', '| Ref | Setting | Verdict | Delta px | Worse | Why |', '|---|---|---|---|---|---|', ...results.map( ( r ) => `| ${ r.ref } | ${ r.attr } | ${ r.verdict } | ${ r.delta ?? '' } | ${ ( r.worse || [] ).map( ( x ) => `${ x.pair }@${ x.width } +${ x.by }` ).join( ', ' ) } | ${ r.why || '' } |` ), '' ].join( '\n' ) );
	console.log( `trial ${ surface }: keep ${ count( 'keep' ) }, reject ${ count( 'reject' ) }, no box change ${ count( 'no-box-change' ) }, rebuild ${ count( 'needs-rebuild' ) }, same CSS ${ count( 'no-css' ) }, error ${ count( 'error' ) }. ${ path.relative( REPO, outDir ) }` );
}
