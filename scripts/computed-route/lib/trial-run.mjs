// Try before write, one round (Spec 47 route-accuracy R6): opens a logged-in admin session and the live page of a
// surface's site, and tries each candidate write of a round there (lib/trial.mjs judges, lib/trial-page.mjs acts in
// the page). Used by solve.mjs between a write round and the rebuild, and by the replay CLI trial.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { uidsIn, mapUids, ruleDiff, selfCheck, untriable, withWrite, judgeTrial, savedBlock } from './trial.mjs';
import { readEnv, adminSession, renderBlock, styleOf, rootClassOf, rulesInPage, parseInPage, cssOf, applyTrialInPage, undoTrialInPage, measureInPage, scopeInPage } from './trial-page.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const BLOCKS_DIR = path.join( REPO, 'plugins/sgs-blocks/src/blocks' );
const RESOLVE = resolveFinder.toString();

// Draft boxes per width from a run's draft caches (draft-cache-<width>.json in the run folder): { [width]: { [pair]:
// { box } } } in the first state.
export function draftBoxes( runDir, widths ) {
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

// The raw content a surface builds into: a post by id (any type), or the active theme's template or template part by
// slug (a block template is the post a template surface's uid hashes come from). target: surfaces.json's target.
async function savedContent( session, target ) {
	if ( target.postId ) {
		return postContent( session, target.postId );
	}
	const theme = JSON.parse( ( await session.api( '/wp-json/wp/v2/themes?status=active&_fields=stylesheet' ) ).body )[ 0 ]?.stylesheet;
	const [ base, slug ] = target.templatePart ? [ 'template-parts', target.templatePart ] : [ 'templates', target.template ];
	const r = await session.api( `/wp-json/wp/v2/${ base }/${ theme }//${ slug }?context=edit&_fields=content` );
	if ( 200 !== r.status ) {
		throw new Error( `${ base } ${ theme }//${ slug } is not readable (${ r.status })` );
	}
	return JSON.parse( r.body ).content?.raw || '';
}

// A post's raw content by id, whatever its type: pages, posts, then every other REST post type.
async function postContent( session, id ) {
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

// The walker's device profile (scripts/parity/draft-live-walk.mjs::walkSide): a full-mode config runs a width below
// 500px as a phone (touch, mobile user agent), every width at 812px high below 500 and 900 above.
export const isPhoneWidth = ( walkerCfg, w ) => 'basic' !== walkerCfg.mode && w < 500;
export const viewportOf = ( w ) => ( { width: w, height: w < 500 ? 812 : 900 } );

// A pair's box rounded for trial.json: { x, w, h }.
const slim = ( p ) => ( p?.box ? { x: Math.round( p.box.x * 10 ) / 10, w: Math.round( p.box.w * 10 ) / 10, h: Math.round( p.box.h * 10 ) / 10 } : null );

// pageOf( width ): the live page of that width's device profile; the uid, rule and self-check reads use the widest.
async function tryOne( { cand, attrs, session, pageOf, finders, widths, draft } ) {
	const live = pageOf( widths[ widths.length - 1 ] );
	const why = untriable( cand.block, BLOCKS_DIR );
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
	const before = {};
	const after = {};
	const blockX = {};
	const scoped = new Set();
	let restored = true;
	for ( const w of widths ) {
		const page = pageOf( w );
		await page.setViewportSize( viewportOf( w ) );
		await page.waitForTimeout( 150 );
		// What a write on the block can move, read on this width's own page (a phone page can show other parts).
		const scope = await page.evaluate( scopeInPage, [ RESOLVE, finders, sel ] );
		scope.forEach( ( n ) => scoped.add( n ) );
		const pick = Object.fromEntries( scope.map( ( n ) => [ n, finders[ n ] ] ) );
		const m0 = await page.evaluate( measureInPage, [ RESOLVE, pick, sel ] );
		await page.evaluate( applyTrialInPage, [ css, removed ] );
		const m1 = await page.evaluate( measureInPage, [ RESOLVE, pick, sel ] );
		await page.evaluate( undoTrialInPage );
		const m2 = await page.evaluate( measureInPage, [ RESOLVE, pick, sel ] );
		restored = restored && JSON.stringify( m0 ) === JSON.stringify( m2 );
		before[ w ] = m0.pairs;
		after[ w ] = m1.pairs;
		const both = scope.filter( ( n ) => m0.pairs[ n ] && draft[ w ]?.[ n ] );
		blockX[ w ] = { live: minX( m0.pairs, both ), draft: minX( draft[ w ] || {}, both ) };
	}
	const v = judgeTrial( { before, after, draft, blockX } );
	const pairs = v.pairs.map( ( p ) => ( { ...p, boxBefore: slim( before[ p.width ][ p.pair ] ), boxAfter: slim( after[ p.width ][ p.pair ] ), boxDraft: slim( draft[ p.width ]?.[ p.pair ] ) } ) );
	return { verdict: v.verdict, delta: v.delta, sumTol: v.sumTol, worse: v.worse, scope: scoped.size, added: added.length, removed: removed.length, restored, pairs };
}

// Opens the trial for a surface's site: { envFile, envKey } names the secrets, walkerCfg is the surface's walker config
// already retargeted to that site (its live url, pair finders and mode), target the surface's build target (a postId,
// template or templatePart). Logs in once. round( cands, draft, widths ) re-reads the saved attributes and reloads the
// live page in each device profile it needs (both changed with the last build), tries each candidate and returns
// [ { ref, block, attr, group, ms, verdict, ... } ]; close() ends it.
export async function openTrial( { envFile, envKey, walkerCfg, target, log = console.log } ) {
	const env = readEnv( path.join( REPO, envFile ) );
	const finders = Object.fromEntries( walkerCfg.pairs.filter( ( p ) => p?.name && p.live && 'function' !== typeof p.live ).map( ( p ) => [ p.name, p.live ] ) );
	const { chromium, devices } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED, args: [ '--hide-scrollbars' ] } );
	try {
		const session = await adminSession( await browser.newContext(), env, envKey );
		const ctxs = { desktop: await browser.newContext( { viewport: viewportOf( 1440 ) } ), phone: await browser.newContext( { ...devices[ 'iPhone 13' ], viewport: viewportOf( 375 ) } ) };
		return {
			async round( cands, draft, widths ) {
				const raw = await savedContent( session, target );
				const kindOf = ( w ) => ( isPhoneWidth( walkerCfg, w ) ? 'phone' : 'desktop' );
				const pages = {};
				const results = [];
				try {
					for ( const kind of new Set( widths.map( kindOf ) ) ) {
						pages[ kind ] = await ctxs[ kind ].newPage();
						await pages[ kind ].goto( walkerCfg.live.url.replace( '{cb}', String( Date.now() ) ), { waitUntil: 'networkidle', timeout: 90000 } );
						await pages[ kind ].addStyleTag( { content: '*,*::before,*::after{transition:none!important;animation:none!important}' } );
					}
					const pageOf = ( w ) => pages[ kindOf( w ) ];
					for ( const cand of cands ) {
						const t0 = Date.now();
						const saved = savedBlock( raw, cand.ref );
						const r = saved ? await tryOne( { cand, attrs: saved.attributes, session, pageOf, finders, widths, draft } ).catch( ( e ) => ( { verdict: 'error', why: e.message } ) ) : { verdict: 'needs-rebuild', why: 'no saved block carries this ref' };
						results.push( { ref: cand.ref, block: cand.block, attr: cand.attr, group: cand.group, ms: Date.now() - t0, ...r } );
						log( `  trial ${ cand.ref } ${ cand.attr }: ${ r.verdict }${ r.why ? ` (${ r.why })` : '' }${ null != r.delta ? ` delta ${ r.delta }` : '' }` );
					}
				} finally {
					await Promise.all( Object.values( pages ).map( ( p ) => p.close() ) );
				}
				return results;
			},
			close: () => browser.close(),
		};
	} catch ( e ) {
		await browser.close();
		throw e;
	}
}
