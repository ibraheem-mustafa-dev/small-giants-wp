#!/usr/bin/env node
// Phase 2 site run (Spec 48, plan 2026-10-23-cloning-tool-completion, Phase 2 step 4 and 5): every surface of one client
// through inventory, skeleton propose, Fill, the build's dry run, the build, the applier and the parity walk, with one status
// line per surface. A failed surface is logged and the run goes on. The draft folder is served once, from a process of its own
// (lib/draft.mjs::serveDraftApart, so a surface proposed on this thread never stalls another's draft load), and each page surface opens at
// its hash route.
// A surface's inventory root and opener come from its intake skeleton record: a surface that exists only while a draft state
// holds (record `root.viaState`) takes the inventory intake saved with that state open
// (build/intake/inventories/<intakeSurface>.json) and Fill opens the same state (lib/fill-open.mjs); any other surface is read
// live at the tag of the record's root element, at its route. A form opens on its page (entry `draftRoute`) and its live address
// is that page's; a `contentOnly` post surface is skipped unless `--with-content` is passed.
// Template copies (FR-48-56, lib/template-copies.mjs): the run is two passes, every surface's inventory, propose and Fill
// first, then the builds and walks, because a template several pages share takes the shell all their Filled trees have.
// Between the passes each copy's tree is written to trees/template/<slug>.json: a `copy.from: 'pages'` surface from the
// shell its pages share (it reads no draft), a `'fill'` surface (the single-post template at its first post, a WooCommerce
// page's template at that page, a `template` row) from its own Fill, a shop row (`'whole'`) from its whole Filled tree, and
// a `'page'` surface (404, search, archive) from the page copy's shell. Each builds through `wp-build-page.js --template` and
// is recorded as the site build records its own copies; a page whose template has a shell builds only what sits below it.
// A built header, footer or drawer (a page-map layout row) becomes its area's active layout, whatever the pointer named
// before (lib/site-run-layout.mjs, FR-48-55); a run whose `--only` leaves it out changes no pointer.
//   node scripts/computed-route/site-run.mjs <client> --site <target> [--only a,b]
//        [--stages inventory,propose,fill,build,apply,walk[,verify]] [--jobs 3] [--widths 1440,768,375] [--live-base <url>] [--with-content]
//        [--fresh-draft] [--no-copies] [--strict]
// --site is the only site the run reads or writes (prepareSite): every surfaces.json entry moves onto it, its address is the live
// address (--live-base overrides it), and a protected site, a site with other post ids than the surfaces' and a scratch copy
// (`local-mediatest*`) in a main checkout are refused before any stage. The run stops before any stage, naming the file and how to
// get it, when sites/<client>/build/intake/facts.json (the propose and fill stages read it) or intake/inventories/ (the inventory
// stage, for a state-driven or form surface) is missing: both are gitignored, so a fresh worktree has neither.
// A stage that did not run (left out of --stages, a WooCommerce page's own, a template copy's apply, a surface skipped) is recorded
// { ok: true, skipped: <reason> } and printed `skip`. The process exits 1 when any stage failed; --strict also exits 1 when any
// stage did not run, and lists them. --no-copies adds no template copy to an --only run: a page under a shell builds from the shell
// already recorded, and fails with a message when none is. A run whose --stages leaves out fill builds and applies the surface's
// newest Fill (fillOutDir), so a timed-out build is retried with --stages build,apply.
// The apply stage (apply.mjs for that surface with --write, run one at a time like a build: it writes the site's database and the
// shared verify.json) sets the existing block settings the Fill and build cannot see, from the draft's runtime, on a local
// mirror (a page or post surface only: a template copy and a Hostinger target are skipped with a note; a template copy's tree instead takes
// the rules that read only the draft element, lib/site-run-template-apply.mjs, before it is written). Its failure stops the
// surface like any stage; the stage result names the ops written and lists any no-setting row naming a setting the block has
// (apply-gate's `unresolved`): a look the clone cannot place is listed there and never fails the stage or the applier.
// The run ledger (lib/run-ledger.mjs): every surface's stages append what they did with each draft look to
// sites/<client>/build/qa/ledger/<surface>/<Fill stamp>/run.jsonl (the skeleton's drops, Fill's records and silent drops, the
// build's saved markup against Fill's writes in built.json beside it, the applier's plan); --stages ...,verify adds the verify
// stage after apply, tools/clone-ledger.mjs on the built page with that file, writing ledger.json and LEDGER.md beside it.
// The walk stage reuses the draft side an earlier run kept (sites/<client>/build/qa/parity/draft-cache/<surface>.json, keyed by the
// draft's files, the walker's code and the config's draft side: lib/site-run-walk.mjs); --fresh-draft walks the draft afresh.
// Output: sites/<client>/build/qa/site-run/<stamp>/status.json (rewritten after every stage) and <surface>.<stage>.log.
// Fill and walks run <jobs> at a time; builds run one at a time (they write the site's database).
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { assertDraftPage, serveDraftApart } from './lib/draft.mjs';
import { readInventory } from './lib/skeleton-inventory.mjs';
import { handoffRecords } from './lib/skeleton-reveal.mjs';
import { inventoryBranches } from './lib/skeleton-data-branches.mjs';
import { permalinkOf } from './lib/fill-route.mjs';
import { skeletonPaths, inventoryStrips, proposeSurface } from './skeleton.mjs';
import { allowMissingPaintArg, allowMissingPaintArgs } from './lib/paint-gate.mjs';
import { routeHash, withRoute } from './lib/fill-open.mjs';
import { isStatePage, stateRouteHash } from './lib/state-route.mjs';
import { savedInventoryOf, servedInventoryOf } from './lib/skeleton-saved-inventory.mjs';
import { openRunSession, readEnv } from './lib/wp-run-session.mjs';
import { isContentOnlySurface, isUnwalkedWooPage, wooContentRole } from './lib/site-build-plan.mjs';
import { walkChecked } from './lib/site-check-openers.mjs';
import { failureClass, failureCounts } from './lib/failure-class.mjs';
import { walkArgs } from './lib/site-run-walk.mjs';
import { openerRow, openersUnrecorded } from './lib/site-run-opener-row.mjs';
import { rowKey, treeHash } from './lib/site-build-map.mjs';
import { buildThenMarkPost, deleteTestOrdersPhp, markPost, markTree, templateRecordPhp, testOrderPhp } from './lib/site-build-apply.mjs';
import { draftProductSlugs, liveFactsPhp, readLiveFacts, templateAddresses, livePrimeFor } from './lib/template-live-address.mjs';
import { wpCommand, wpEvalRunner } from './lib/calibration-refs.mjs';
import { pointAfterBuild } from './lib/site-run-layout.mjs';
import { removeStaleTemplates } from './lib/site-run-stale-templates.mjs';
import { writeFlowTree } from './lib/site-run-flow-tree.mjs';
import { writeSolveTree } from './lib/site-run-solve-tree.mjs';
import { TOP_N, writeRanking } from './lib/site-run-rank.mjs';
import { buildRank } from './lib/site-run-order.mjs';
import { builtTreeHash } from './lib/site-run-tree-mark.mjs';
import { flowProductIdsFor } from './lib/site-build-flow-product.mjs';
import { assertScratchRunPlace, assertUnprotected, readTargets, secretsPath, siteUrl, surfacesOnSite, targetOf } from './lib/site-targets.mjs';
import { WHOLE_TREE, commonChain, contentUnder, copyFile, copyTree, readShell, splitShell, writeCopy } from './lib/template-copies.mjs';
import { inventoryRootFor, partsOf, writePart } from './lib/template-frame.mjs';
import { applyTemplateRules } from './lib/site-run-template-apply.mjs';
import { openRunLedger, runLedgerFileOfFill } from './lib/run-ledger.mjs';
import { applyRunRows, buildRunRows } from './lib/run-ledger-build.mjs';
import { ledgerTargets } from './lib/ledger-pairs.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { summaryRows } from './lib/apply-summary.mjs';
import { pageMapStaleProblem, PAGE_MAP_STAGES } from './lib/page-map-fresh.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const ALL_STAGES = [ 'inventory', 'propose', 'fill', 'build', 'apply', 'walk' ];
// The stages a run takes only when --stages names them: verify (tools/clone-ledger.mjs reads the built page against the draft
// and the run ledger file, after apply).
const ASKED_STAGES = [ 'verify' ];

// The names in a --stages list that are not stages: a misspelt one would otherwise leave its stage out without a word.
export const unknownStages = ( stages ) => stages.filter( ( s ) => ! ALL_STAGES.includes( s ) && ! ASKED_STAGES.includes( s ) );

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const stamp = () => new Date().toISOString().replace( /\.\d+Z$/, '' ).replace( /:/g, '-' );

// Runs a command, writes its output to `logFile` and resolves with { code, tail } (the last lines).
function run( cmd, args, { logFile, env = {}, cwd = REPO } ) {
	return new Promise( ( resolve ) => {
		const out = fs.createWriteStream( logFile );
		const child = spawn( cmd, args, { cwd, env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
		child.stdout.pipe( out, { end: false } );
		child.stderr.pipe( out, { end: false } );
		child.on( 'close', ( code ) => {
			out.end();
			const lines = fs.readFileSync( logFile, 'utf8' ).trimEnd().split( /\r?\n/ );
			resolve( { code, tail: lines.slice( -4 ).join( ' | ' ).slice( 0, 600 ) } );
		} );
	} );
}

// The apply stage's result, read from the applier's log: the ops planned, the rows by status (from its summary table) and the
// gate's count. A look the clone cannot place (a no-setting row naming a setting the block has, the gate's `unresolved`) is
// listed in the result and never stops the surface: verify and the walk still run, and no-setting-review.json names each row
// (Bean 2026-11-20); a no-effect or unchecked write is reported the same way.
export function applyDetail( logFile, fallback ) {
	const log = fs.existsSync( logFile ) ? fs.readFileSync( logFile, 'utf8' ) : '';
	const ops = /^[^\s:]+: (\d+) ops, (\d+) rows$/m.exec( log );
	const gate = /no-setting rows: (\d+) confirmed, (\d+) unjudged, (\d+) unresolved/.exec( log );
	if ( ! ops && ! gate ) {
		return fallback;
	}
	const rows = summaryRows( log );
	const total = ( status ) => rows.reduce( ( a, r ) => a + r[ status ], 0 );
	const unresolved = Number( gate?.[ 3 ] ?? 0 );
	const detail = `${ ops ? `${ ops[ 1 ] } ops` : 'no ops' }${ gate ? `, ${ gate[ 1 ] } no-setting, ${ unresolved } unresolved` : '' }, ${ total( 'no-effect' ) } no-effect, ${ total( 'unchecked' ) } unchecked`;
	// The applier's own listing (`unresolved: <surface> <block> <prop>: <why>`), so the run report names each look without the
	// review file, which the next surface's apply overwrites.
	const listed = [ ...log.matchAll( /^unresolved: (.+)$/gm ) ].map( ( m ) => m[ 1 ].trim() );
	return unresolved ? `${ detail }; ${ unresolved } look(s) the clone could not place, listed not failed${ listed.length ? `: ${ listed.join( ' | ' ) }` : ' (no-setting-review.json)' }` : detail;
}

// A mutex: tasks passed to `exclusive` run one after another.
const queue = { tail: Promise.resolve() };
const exclusive = ( task ) => {
	const result = queue.tail.then( task );
	queue.tail = result.catch( () => {} );
	return result;
};

// The walker's browser: headless, or visible with SGS_HEADED=1 as the other host tools take it (a Hostinger test site
// answers a headless browser with a 403 bot challenge, so a walk of one with `--live-base` and SGS_LIVE_ORIGIN needs it).
const headlessFlag = ( env = process.env ) => ( env.SGS_HEADED && '0' !== env.SGS_HEADED ? [] : [ '--headless' ] );

// The row kinds a surface keyed by slug or route can name: a page, the WooCommerce shop page (`shop`) and the single-product
// template (`product`, every product uses it).
const PAGE_LIKE = [ 'page', 'shop', 'product' ];

// Where one surface is read: the draft route it opens at, the page-map row whose permalink is its live address, and why it is
// skipped (a content-only post surface runs only with `--with-content`). The route is the entry's `draftRoute` (a form's
// page, a post's route), else its page row's route, else its intake record's route. A post surface (`contentOnly`) and the
// single-post template (`fromPost`) are read at the post row's address; a form is read on its page, the page row carrying
// its `draftRoute`; any other surface at the page row its key names. `routing` (intake.json `routing`) names the adapter: a
// state-page draft is reached by state, so the hash is that state route (lib/state-route.mjs); a page-file draft is reached
// by the file the surface's `draftIndex` names, so it takes no hash.
export function surfaceReach( { key, entry, skel, rows, withContent = false, routing = null } ) {
	const routeName = ( r ) => String( r ?? '' ).replace( /^#?\/?/, '' );
	const postSlug = entry.fromPost ?? ( entry.contentOnly ? key : null );
	// A template copy Filled on its own is read at the row playing it (`copy.row`, a row key).
	const byRow = 'fill' === entry.copy?.from ? rows.find( ( r ) => rowKey( r ) === entry.copy.row ) : null;
	const own = byRow ?? ( postSlug ? rows.find( ( r ) => 'post' === r.postType && r.slug === postSlug ) : rows.find( ( r ) => PAGE_LIKE.includes( r.postType ) && ( r.slug === key || r.route === key ) ) );
	const named = entry.draftRoute && ! postSlug ? rows.find( ( r ) => 'page' === r.postType && r.route === routeName( entry.draftRoute ) ) : null;
	const row = own ?? named ?? null;
	// A surface the manifest marks `noDraft` (one of WooCommerce's own pages the draft has no page for) has nothing to read.
	const skip = entry.noDraft ?? ( isContentOnlySurface( entry ) && ! withContent ? 'content-only post surface: pass --with-content to read its post content' : null );
	// A state-page draft ignores a route hash: its route is the state fragment Fill, the inventory read and the walker set on the loaded draft.
	const at = ( r ) => ( 'files' === routing?.adapter ? '' : isStatePage( routing ) ? ( stateRouteHash( r ) ? `#${ stateRouteHash( r ) }` : '' ) : routeHash( r ) ?? '' );
	const hash = entry.draftRoute ? at( entry.draftRoute ) : own && [ 'page', 'template' ].includes( own.postType ) ? ( 'home' !== own.route ? at( own.route ) : '' ) : at( skel?.route );
	return { row, hash, skip };
}

// The live address of a row: a page or post's permalink; a `template` row's template where WordPress shows it (the search
// results for any query, the not-found page for an address nothing holds, the order confirmation at the run's test order,
// `shown`: template slug -> address), or null when the run has none. A shop or product row shows its template at the address the
// live site answered (lib/template-live-address.mjs::templateAddresses): the shop page, a product the draft names.
export function liveAddress( row, rows, shown = {} ) {
	if ( [ 'shop', 'product' ].includes( row?.postType ) ) {
		return shown[ row.template ] ?? null;
	}
	if ( 'template' !== row?.postType ) {
		return row ? permalinkOf( row, rows ) : '/';
	}
	return { search: '/?s=sgs', 404: '/sgs-no-such-page/', ...shown }[ row.template ] ?? null;
}

// Whether the run reads the order confirmation, which shows only at an order's received page.
export const needsTestOrder = ( surfaces, keys ) => keys.some( ( k ) => 'order-confirmation' === surfaces[ k ]?.target?.template && 'fill' === surfaces[ k ]?.copy?.from );

// The path and query of the received page a test order reply names ({ url }), or null for a reply with no url.
export const orderAddress = ( reply ) => ( reply?.url ? ( ( u ) => `${ u.pathname }${ u.search }` )( new URL( reply.url ) ) : null );

// The surfaces a run covers: the named ones, plus each template copy a named page's content sits in (its shell decides what
// the page's post holds) and, with the page copy, the copies built from its shell. `copies: false` (--no-copies) adds none: a
// page then builds from the shell already recorded.
export function runKeys( surfaces, only, { copies = true } = {} ) {
	const keys = Object.keys( surfaces ).filter( ( k ) => ! only || only.includes( k ) );
	if ( ! only || ! copies ) {
		return keys;
	}
	const add = ( k ) => k && Object.hasOwn( surfaces, k ) && ! keys.includes( k ) && keys.push( k );
	[ ...keys ].forEach( ( k ) => surfaces[ k ].shell && add( `template-${ surfaces[ k ].shell }` ) );
	keys.includes( 'template-page' ) && Object.keys( surfaces ).filter( ( k ) => 'page' === surfaces[ k ].copy?.from ).forEach( add );
	return keys;
}

// The copy trees from the pass's Filled trees (`filled`: surface key -> tree): { slug: { tree, shell } } for every
// template surface in `keys`. A 'pages' copy takes the shell its pages share, each page's own shell from this run or as
// the copy last recorded it; 'page' copies take the page copy's shell; `buildDir` holds the recorded shells.
export function copyTrees( { surfaces, keys, filled, buildDir } ) {
	const out = {};
	const shellOf = ( slug ) => out[ slug ]?.shell ?? readShell( buildDir, slug );
	const order = [ 'whole', 'fill', 'pages', 'page' ];
	const mine = keys.filter( ( k ) => surfaces[ k ].copy && surfaces[ k ].target?.template ).sort( ( a, b ) => order.indexOf( surfaces[ a ].copy.from ) - order.indexOf( surfaces[ b ].copy.from ) );
	for ( const key of mine ) {
		const e = surfaces[ key ];
		const slug = e.target.template;
		const from = e.copy.from;
		if ( 'whole' === from || 'fill' === from ) {
			if ( filled[ key ] ) {
				out[ slug ] = 'whole' === from || WHOLE_TREE.includes( slug ) ? { tree: copyTree( { slug, whole: filled[ key ] } ), shell: null } : ( ( chain ) => ( { tree: copyTree( { slug, chain } ), shell: { chain, from: key } } ) )( splitShell( filled[ key ] ).chain );
			}
		} else if ( 'pages' === from ) {
			const had = readShell( buildDir, slug )?.surfaces || {};
			const each = Object.fromEntries( e.copy.surfaces.map( ( k ) => [ k, filled[ k ] ? splitShell( filled[ k ] ).chain : had[ k ] ] ).filter( ( [ , c ] ) => c ) );
			if ( Object.keys( each ).length ) {
				const chain = commonChain( Object.values( each ) );
				out[ slug ] = { tree: copyTree( { slug, chain } ), shell: { chain, surfaces: each } };
			}
		} else if ( 'page' === from && shellOf( 'page' ) ) {
			out[ slug ] = { tree: copyTree( { slug, chain: shellOf( 'page' ).chain } ), shell: null };
		}
	}
	return out;
}

// The folder a surface's later stages read its Fill from (`fillRoot`: sites/<client>/build/qa/fill/<surface>). A run that Fills
// writes a new stamped folder (`fresh`); a run whose --stages leaves Fill out (a build retried with --stages build,apply) reads
// the newest stamped folder holding a filled.tree.json, so the build takes the Fill an earlier run wrote. Null when there is none:
// the build then fails naming the missing tree.
export function fillOutDir( { fillRoot, fills, fresh, exists = fs.existsSync, list = ( d ) => ( fs.existsSync( d ) ? fs.readdirSync( d ) : [] ) } ) {
	if ( fills ) {
		return path.join( fillRoot, fresh );
	}
	const done = list( fillRoot ).filter( ( d ) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test( d ) && exists( path.join( fillRoot, d, 'filled.tree.json' ) ) ).sort();
	return done.length ? path.join( fillRoot, done.at( -1 ) ) : null;
}

// The gate chain's command line for one ranked surface (after `node`): its Solve report, the client, the site and --tree, the tree
// the surface's build used this run (`built`: surface key -> repo-relative tree file). Null when nothing was built for it this run:
// a newer Fill whose build failed, or an older one, would tie the walk's rows to blocks the live page does not hold.
export function gateChainArgs( { surface, gateDir, client, site, built } ) {
	const tree = built.get( surface );
	return tree ? [ 'scripts/computed-route/gate-chain.mjs', path.join( gateDir, 'solve-report.json' ), '--client', client, '--site', site, '--tree', tree ] : null;
}

// One stage's record in status.json: { ok, seconds, detail?, failureClass? }; a stage that failed carries its class (`failureClass`:
// the error's own, else classed from the message, lib/failure-class.mjs); a stage that did not run is { ok: true, skipped: <reason>, seconds: 0 }
// (it did not fail, and it did not run). A stage that has nothing to do by design (`na`: a template copy has no post of its own to
// apply, WooCommerce keeps its own page's content) also carries `notApplicable: true`, which --strict does not count as a gap.
export function stageRecord( { ok, ms = 0, detail = null, skipped = null, na = false, failureClass: own = null } ) {
	return skipped
		? { ok: true, skipped, seconds: 0, ...( na ? { notApplicable: true } : {} ), ...( detail ? { detail } : {} ) }
		: { ok, seconds: Math.round( ms / 1000 ), ...( detail ? { detail } : {} ), ...( ok ? {} : { failureClass: failureClass( detail, own ) } ) };
}

// The printed line of a stage: `ok`, `FAIL` or `skip`, the surface, the stage, its seconds and its detail or skip reason.
export function stageLine( key, stage, record ) {
	const label = record.skipped ? 'skip' : record.ok ? 'ok  ' : 'FAIL';
	const why = record.skipped ?? record.detail;
	return `${ label } ${ key } ${ stage } ${ record.seconds }s${ why ? ` - ${ why }` : '' }`;
}

// The stages of a status object that failed or did not run, as "<surface> <stage>: <why>" lines: { failed, skipped }. A stage
// recorded not applicable is neither.
export function stageProblems( status ) {
	const out = { failed: [], skipped: [] };
	for ( const [ key, stages ] of Object.entries( status ) ) {
		for ( const [ stage, r ] of Object.entries( stages ) ) {
			r.skipped && ! r.notApplicable && out.skipped.push( `${ key } ${ stage }: ${ r.skipped }` );
			! r.ok && out.failed.push( `${ key } ${ stage }: ${ r.detail ?? 'failed' }` );
		}
	}
	return out;
}

// The stages WooCommerce's own cart or checkout page never runs: WooCommerce renders the page's content itself, so a proposal,
// Fill, build, apply or walk of it is one nothing uses. Its layout is the template-<slug> surface, which proposes, Fills, builds
// and walks itself (a proposal of the page ran checks on a proposal nothing used and failed Mama's cart and checkout).
export const WOO_PAGE_STAGES = [ 'propose', 'fill', 'build', 'apply', 'walk' ];

// The stage runner of each surface (`stages`: the run's --stages; `note`: the run's status writer), as ( key, wooPage ) =>
// ( stage, fn ) => whether the surface goes on. A stage not asked for counts as passed; a stage of WooCommerce's own page
// (`wooPage`: its role) in WOO_PAGE_STAGES is recorded not applicable, and its walk then stops; a failed stage stops the surface.
export function surfaceStepper( { stages, note } ) {
	return ( key, wooPage ) => async ( stage, fn ) => {
		if ( ! stages.includes( stage ) ) {
			note( key, stage, true, 0, null, 'not in --stages' );
			return true;
		}
		if ( wooPage && WOO_PAGE_STAGES.includes( stage ) ) {
			note( key, stage, true, 0, null, `WooCommerce's own ${ wooPage } page keeps WooCommerce's content (its layout is the template-<slug> surface)`, true );
			return 'walk' !== stage;
		}
		const t = Date.now();
		try {
			const r = await fn();
			note( key, stage, true, Date.now() - t, r );
			return true;
		} catch ( e ) {
			note( key, stage, false, Date.now() - t, String( e.message || e ).slice( 0, 600 ), null, false, e.failureClass );
			return false;
		}
	};
}

// The end of WooCommerce's own page after its inventory (`step`: its surfaceStepper runner): each later stage is recorded not
// applicable, and nothing after the inventory runs, so no later code reads a proposal or Fill the page never made.
export async function endWooPage( step ) {
	for ( const stage of WOO_PAGE_STAGES ) {
		await step( stage, async () => {
			throw new Error( `WooCommerce's own page ran its ${ stage }` );
		} );
	}
}

// The propose stage's result line. A proposal problem (a part no block fits, a handoff record no mechanism matches) is
// reported and the surface goes on with the proposal as it stands (Spec 48 section 8: a clone goes through by default);
// with --strict (`strict`) it fails the stage.
export function proposeDetail( r, { strict = false } = {} ) {
	const counts = `${ r.proposal.counts.skeletonNodes } nodes, ${ r.proposal.counts.low } low`;
	if ( ! r.problems.length ) {
		return counts;
	}
	const said = `${ r.problems.length } proposal problem${ 1 === r.problems.length ? '' : 's' }: ${ r.problems.join( '; ' ) }`.slice( 0, 500 );
	if ( strict ) {
		throw new Error( said );
	}
	return `${ counts }; ${ said }`;
}

// The process exit code of a finished run: 1 when any stage failed, and with --strict (`strict`) when any stage did not run.
export function runExit( status, { strict = false } = {} ) {
	const { failed, skipped } = stageProblems( status );
	return failed.length || ( strict && skipped.length ) ? 1 : 0;
}

// What the run reads that a fresh worktree lacks (sites/<client>/build/intake/facts.json and inventories/ are gitignored): the
// propose and fill stages read facts.json, and the inventory stage reads inventories/ for a state-driven or form surface. One
// message per missing path, naming it and how to get it; a surface that reads no draft (a copy, a content-only post without
// --with-content, a surface with no draft) needs neither. `exists` is for tests.
export function intakeInputsMissing( { client, build, stages, surfaces, keys, intake, withContent = false, exists = fs.existsSync } ) {
	const reads = keys.filter( ( k ) => ! [ 'pages', 'page' ].includes( surfaces[ k ].copy?.from ) && ! surfaces[ k ].noDraft && ! ( isContentOnlySurface( surfaces[ k ] ) && ! withContent ) );
	const out = [];
	const at = ( ...p ) => path.join( build, 'intake', ...p );
	if ( reads.length && [ 'propose', 'fill' ].some( ( s ) => stages.includes( s ) ) && ! exists( at( 'facts.json' ) ) ) {
		out.push( `sites/${ client }/build/intake/facts.json is missing, and the ${ [ 'propose', 'fill' ].filter( ( s ) => stages.includes( s ) ).join( ' and ' ) } stage reads it (it is gitignored, so a fresh worktree has none): copy it from the checkout that holds it (cp <that checkout>/sites/${ client }/build/intake/facts.json sites/${ client }/build/intake/) or write it with node scripts/computed-route/intake.mjs --facts ${ client }` );
	}
	const fromSaved = reads.filter( ( k ) => ( ( skel ) => skel?.root?.viaState || 'form' === skel?.kind )( intake?.skeletons?.[ surfaces[ k ].intakeSurface ] ) );
	if ( fromSaved.length && stages.includes( 'inventory' ) && ! exists( at( 'inventories' ) ) ) {
		out.push( `sites/${ client }/build/intake/inventories/ is missing, and the inventory stage reads it for ${ fromSaved.slice( 0, 3 ).join( ', ' ) }${ fromSaved.length > 3 ? ` and ${ fromSaved.length - 3 } more` : '' } (it is gitignored, so a fresh worktree has none): copy it from the checkout that holds it (cp -r <that checkout>/sites/${ client }/build/intake/inventories sites/${ client }/build/intake/) or write it with node scripts/computed-route/intake.mjs ${ client }` );
	}
	return out;
}

// What a run on `site` reads and writes, before any stage: the named site is the only one. It must be a target and not protected,
// a scratch copy runs only from a worktree, and every surface entry moves onto the site (a site with other post ids throws).
// Returns { surfaces, base, target }: the retargeted manifest, the live address of every page read or built (the site's own,
// unless `liveOverride` is given) and the site's target.
export function prepareSite( { site, surfaces, targets, repo, liveOverride = null } ) {
	const target = targetOf( site, targets );
	assertUnprotected( site, targets );
	assertScratchRunPlace( site, repo );
	return {
		surfaces: surfacesOnSite( surfaces, site, targets ),
		base: liveOverride ? liveOverride.replace( /\/+$/, '' ) : siteUrl( target, repo ),
		target,
	};
}

export async function main( argv ) {
	const client = argv[ 0 ];
	const flag = ( n, d = null ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : d );
	const site = flag( '--site' );
	if ( ! client || ! site ) {
		throw new Error( 'usage: site-run.mjs <client> --site <target> [--only a,b] [--stages inventory,propose,fill,build,apply,walk[,verify]] [--jobs 3] [--widths 1440,768,375] [--live-base <url>] [--with-content] [--fresh-draft] [--no-copies] [--strict] [--allow-missing-paint sgs/a,sgs/b]' );
	}
	const stages = ( flag( '--stages' ) || ALL_STAGES.join( ',' ) ).split( ',' );
	if ( unknownStages( stages ).length ) {
		throw new Error( `--stages names ${ unknownStages( stages ).join( ', ' ) }, which ${ 1 === unknownStages( stages ).length ? 'is' : 'are' } not a stage (${ ALL_STAGES.join( ', ' ) })` );
	}
	const only = flag( '--only' ) ? flag( '--only' ).split( ',' ) : null;
	const jobs = Number( flag( '--jobs', '3' ) );
	const widths = flag( '--widths', '1440,768,375' );
	const liveOverride = flag( '--live-base' );
	const withContent = argv.includes( '--with-content' );
	// --fresh-draft: the walk reads the draft afresh instead of reusing the draft side an earlier run kept (lib/site-run-walk.mjs).
	const freshDraft = argv.includes( '--fresh-draft' );
	const build = path.join( REPO, 'sites', client, 'build' );
	const { surfaces, base, target } = prepareSite( { site, surfaces: readJson( path.join( build, 'surfaces.json' ) ), targets: readTargets(), repo: REPO, liveOverride } );
	const rows = readJson( path.join( build, 'page-map.json' ) );
	const intake = readJson( path.join( build, 'intake', 'intake.json' ) );
	const withCopies = ! argv.includes( '--no-copies' );
	const strict = argv.includes( '--strict' );
	// --allow-missing-paint <blocks> (lib/paint-gate.mjs): passed to propose, fill and apply, each of which prints the blocks it used without default paint.
	const allowMissingPaint = allowMissingPaintArg( argv );
	allowMissingPaint.length && console.log( `site-run: --allow-missing-paint ${ allowMissingPaint.join( ',' ) }: a stage whose tree uses one of these without default paint prints it in its log, and Fill's report lists it` );
	const keys = runKeys( surfaces, only, { copies: withCopies } );
	// A page map older than the reader that builds it runs the stages that read it on missing openers and flows: stop, naming the regenerating command.
	const staleMap = stages.some( ( s ) => PAGE_MAP_STAGES.includes( s ) ) ? pageMapStaleProblem( { repo: REPO, client } ) : '';
	if ( staleMap ) {
		throw new Error( staleMap );
	}
	// A run that would carry on with worse proposals for want of a gitignored intake file stops here, before any stage.
	const missingInputs = intakeInputsMissing( { client, build, stages, surfaces, keys, intake, withContent } );
	if ( missingInputs.length ) {
		throw new Error( missingInputs.join( '\n' ) );
	}
	const dir = path.join( build, 'qa', 'site-run', stamp() );
	fs.mkdirSync( dir, { recursive: true } );
	const status = {};
	// The tree each surface's build used this run (gateChainArgs).
	const builtTrees = new Map();
	const save = () => fs.writeFileSync( path.join( dir, 'status.json' ), `${ JSON.stringify( status, null, 2 ) }\n` );
	// `skipped`: why the stage did not run (it is recorded ok, with the reason, and printed `skip`); `na`: it has nothing to do by design.
	const note = ( key, stage, ok, ms, detail, skipped = null, na = false, failureClass = null ) => {
		const record = stageRecord( { ok, ms, detail, skipped, na, failureClass } );
		( status[ key ] ||= {} )[ stage ] = record;
		save();
		console.log( stageLine( key, stage, record ) );
	};
	// A marker the run could not write (lib/site-build-apply.mjs::markPost, ::markTree) is a line in the run's output, never a failed stage.
	const markerNote = ( key ) => ( said ) => console.log( `${ key } note: ${ said }` );
	// One draft server per draft file, serving that file as its index (a page-file draft has one file per page; a hash or
	// state-page draft names one entry file for every surface).
	const servers = new Map();
	const serverFor = ( entry ) => {
		const id = `${ entry.draftDir }|${ entry.draftIndex }`;
		servers.has( id ) || servers.set( id, serveDraftApart( assertDraftPage( path.join( REPO, entry.draftDir ), entry.draftIndex ), { index: entry.draftIndex } ) );
		return servers.get( id );
	};
	const certs = process.env.NODE_EXTRA_CA_CERTS || 'C:\\Users\\Bean\\AppData\\Roaming\\Python\\Python313\\site-packages\\certifi\\cacert.pem';

	const stepper = surfaceStepper( { stages, note } );
	const execFor = ( key ) => async ( stage, cmd, args, env ) => {
		const r = await run( cmd, args, { logFile: path.join( dir, `${ key }.${ stage }.log` ), env } );
		if ( 0 !== r.code ) {
			throw new Error( `exit ${ r.code }: ${ r.tail }` );
		}
		return r.tail.split( ' | ' ).pop();
	};

	// Pass 1: inventory, propose and Fill. Resolves with what pass 2 needs, or null when the surface stopped.
	async function prepare( key ) {
		const entry = surfaces[ key ];
		// A copy from its pages' shell or the page copy's reads no draft: it is made between the passes.
		if ( [ 'pages', 'page' ].includes( entry.copy?.from ) ) {
			return { key, entry, row: null };
		}
		const skel = intake.skeletons?.[ entry.intakeSurface ];
		const kind = skel?.kind;
		const { row, hash, skip } = surfaceReach( { key, entry, skel, rows, withContent, routing: intake.routing ?? null } );
		if ( skip ) {
			note( key, 'run', true, 0, null, skip, !! entry.noDraft );
			return null;
		}
		const draftUrl = `${ ( await serverFor( entry ) ).url }${ hash }`;
		// WooCommerce's own cart and checkout pages keep WooCommerce's content (lib/site-build-plan.mjs::keepsWooContent): they
		// end after their inventory (endWooPage), never proposed, Filled or built over; a template copy read at one of them is.
		// The account page is Filled like any page.
		const wooPage = isUnwalkedWooPage( entry.target, row ) ? wooContentRole( row ) : null;
		// A modal or flow has no page of its own: it is read at a page that opens it (lib/site-run-opener-row.mjs).
		const address = liveAddress( openerRow( entry, rows ) ?? row, rows, shown );
		const liveUrl = `${ base }${ address ?? '/' }`;
		// A stage not run in the status, so --strict and the clone verdict see it (a console line alone would let the run pass).
		openersUnrecorded( entry, rows ) && note( key, 'openers', true, 0, null, 'read at the home page, where it is not placed: the intake page map records no opener on any row (an intake taken before openers were recorded); run intake again' );
		// A checkout walk starts with a product in the basket: WooCommerce sends an empty basket's checkout to the basket.
		const livePrime = livePrimeFor( entry.target?.template ?? row?.template, liveFacts );
		const step = stepper( key, wooPage );
		const exec = execFor( key );
		if ( ! entry.intakeSurface || ! skel ) {
			return note( key, 'inventory', false, 0, 'no intake surface: no handoff record matched' );
		}
		const p = skeletonPaths( { client, surface: key } );
		// The run ledger file (lib/run-ledger.mjs): one per surface and Fill stamp, the Fill folder this run writes or, with fill
		// left out of --stages, the newest Fill the later stages read. Each stage appends what it did with each draft look.
		const fillRoot = path.join( build, 'qa', 'fill', key );
		const out = fillOutDir( { fillRoot, fills: stages.includes( 'fill' ), fresh: stamp() } ) ?? path.join( fillRoot, stamp() );
		const ledger = openRunLedger( runLedgerFileOfFill( out ) );
		const saved = path.join( build, 'intake', 'inventories', `${ entry.intakeSurface }.json` );
		// A state-driven surface and a form (read on its page, with no root selector of its own) take the inventory intake saved.
		const stateOnly = !! skel.root?.viaState;
		const fromSaved = stateOnly || 'form' === kind;
		const root = fromSaved ? null : ( inventoryRootFor( { repo: REPO, client, entry, skel } ) ?? skel.root?.tag );
		if ( ! root && ! ( fromSaved && fs.existsSync( saved ) ) && ! fs.existsSync( p.inventory ) ) {
			return note( key, 'inventory', false, 0, fromSaved ? `no saved intake inventory for the ${ stateOnly ? 'state-driven ' : '' }${ kind } surface (${ path.relative( REPO, saved ) })` : `the intake record names no root element for a ${ kind } surface` );
		}
		if ( ! await step( 'inventory', async () => {
			if ( fromSaved ) {
				const entryDraft = ( intake.inventory?.animations?.drafts || [] ).find( ( d ) => d.file === path.basename( entry.draftIndex ) ) || intake.inventory?.animations?.drafts?.[ 0 ];
				const inv = stateOnly ? servedInventoryOf( readJson( saved ), entryDraft?.dc ?? null ) : savedInventoryOf( { repo: REPO, client, surface: key, surfaces, intake } );
				fs.mkdirSync( path.dirname( p.inventory ), { recursive: true } );
				fs.writeFileSync( p.inventory, `${ JSON.stringify( inv, null, 2 ) }
` );
				return `${ inv.elements.length } elements (intake's inventory${ stateOnly ? ' with the state open' : '' }, in the served key space)`;
			}
			// A page's closed states (an accordion's answer, a form's later step) are read too (lib/skeleton-reveal.mjs).
			const inv = await readInventory( { url: draftUrl, root, shotsDir: p.shots, strips: inventoryStrips( { client, surface: key } ), reveal: 'page' === kind ? { records: handoffRecords( { repo: REPO, client } ) } : null, branches: 'page' === kind ? inventoryBranches( { repo: REPO, client, surface: key } ) : null } );
			fs.mkdirSync( path.dirname( p.inventory ), { recursive: true } );
			fs.writeFileSync( p.inventory, `${ JSON.stringify( inv, null, 2 ) }
` );
			return `${ inv.elements.length } elements`;
		} ) ) {
			return;
		}
		if ( wooPage ) {
			return void await endWooPage( step );
		}
		if ( ! await step( 'propose', async () => {
			const r = proposeSurface( { client, surface: key, allowMissingPaint, site, runLedger: ledger } );
			return proposeDetail( r, { strict } );
		} ) ) {
			return;
		}
		let walkUrl = draftUrl;
		if ( ! await step( 'fill', async () => {
			const tail = await exec( 'fill', 'node', [ 'scripts/computed-route/fill.mjs', '--client', client, '--surface', key,
				'--skeleton', path.relative( REPO, p.skeleton ), '--draft-url', draftUrl, '--live-url', liveUrl, ...( livePrime ? [ '--live-prime', JSON.stringify( livePrime ) ] : [] ), '--site', site, '--allow-external', '--out', path.relative( REPO, out ), '--run-ledger', ledger.file, ...allowMissingPaintArgs( allowMissingPaint ) ] );
			// A state that never rendered is an opener failure, not a Fill that happened to run.
			const opened = path.join( out, 'opener.json' );
			const o = fs.existsSync( opened ) ? readJson( opened ) : null;
			if ( o && ! o.widthsOpen.length ) {
				throw new Error( `opener failure: ${ o.refused.map( ( r ) => r.reason ).join( '; ' ).slice( 0, 400 ) }` );
			}
			walkUrl = o?.route ? withRoute( draftUrl, o.route, intake.routing ?? null ) : draftUrl;
			return o ? `${ tail } (state "${ o.state }" open at ${ o.widthsOpen.join( ', ' ) }px)` : tail;
		} ) ) {
			return;
		}
		const parity = path.join( build, 'qa', 'parity' );
		fs.mkdirSync( parity, { recursive: true } );
		// A WooCommerce page surface (basket, checkout) is walked through its template copy and names no walker file.
		for ( const f of [ entry.walker, entry.walkerFull ].filter( Boolean ) ) {
			const src = path.join( out, path.basename( f ) );
			if ( fs.existsSync( src ) ) {
				fs.writeFileSync( path.join( parity, path.basename( f ) ), fs.readFileSync( src, 'utf8' ).replace( '"../../../divergences.json"', '"../divergences.json"' ) );
			}
		}
		const filledFile = path.join( out, 'filled.tree.json' );
		return { key, entry, row, wooPage, step, exec, out, walkUrl, address, ledger, skeletonFile: p.skeleton, filled: fs.existsSync( filledFile ) ? readJson( filledFile ) : null };
	}

	// Pass 2: the build (one at a time: builds write the site's database) and the walk. A template copy builds the tree made
	// between the passes and is recorded as the site build's own; a page under a template with a shell builds what sits
	// below that shell; every other surface builds its Filled tree.
	async function finish( ctx ) {
		const { key, entry } = ctx;
		const step = ctx.step || stepper( key, null );
		const exec = ctx.exec || execFor( key );
		const slug = entry.target?.template;
		let tree;
		// The build's tree is made only when the run builds: a run without build (an inventory, propose or Fill run) never fails
		// on the tree it would have built, now that a run without fill reads the surface's newest Fill (fillOutDir).
		if ( ! stages.includes( 'build' ) ) {
			tree = null;
		} else if ( slug ) {
			if ( ! copies[ slug ] ) {
				return note( key, 'build', false, 0, `no ${ slug } copy was made: ${ { pages: 'none of its pages has a Filled tree', page: 'the page copy has no recorded shell', fill: 'its Fill wrote no tree', whole: 'its Fill wrote no tree' }[ entry.copy?.from ] || 'it names no copy source' }` );
			}
			tree = path.relative( REPO, copyFile( build, slug ) );
		} else if ( ! ctx.filled ) {
			tree = path.relative( REPO, path.join( ctx.out, 'filled.tree.json' ) );
		} else if ( entry.shell ) {
			const recorded = copies[ entry.shell ]?.shell?.chain ?? readShell( build, entry.shell )?.chain;
			if ( ! recorded && ! withCopies ) {
				return note( key, 'build', false, 0, `--no-copies: no ${ entry.shell } shell is recorded for this page to build under (sites/${ client }/build/trees/template): run the template-${ entry.shell } surface with it, or drop --no-copies` );
			}
			const chain = recorded ?? [];
			try {
				const file = path.join( ctx.out, 'content.tree.json' );
				fs.writeFileSync( file, `${ JSON.stringify( contentUnder( ctx.filled, chain ), null, 2 ) }\n` );
				tree = path.relative( REPO, file );
			} catch ( e ) {
				return note( key, 'build', false, 0, `${ e.message }: its post would repeat the ${ entry.shell } copy's shell; run the copy's surface (template-${ entry.shell }) with this page` );
			}
		} else {
			tree = path.relative( REPO, path.join( ctx.out, 'filled.tree.json' ) );
		}
		const builder = [ 'scripts/wp-build-page.js', '--env-file', secretsPath( entry.envFile, REPO ), '--env-key', entry.envKey, '--tree', tree, ...( slug ? [ '--template', slug ] : [ '--post-id', String( entry.target.postId ) ] ) ];
		if ( ! await step( 'build', () => exclusive( async () => {
			await exec( 'dry', 'node', [ ...builder, '--dry-run' ] );
			// A template's own parts (lib/template-frame.mjs::partsOf: the page's own top bar) are built first, as wp_template_part.
			for ( const part of slug ? partsOf( ctx.filled ) : [] ) {
				await exec( 'build', 'node', [ ...builder.slice( 0, 5 ), '--tree', path.relative( REPO, writePart( build, part ) ), '--template-part', part.slug ] );
			}
			// A surface's own tree saves what it built for the run ledger's build rows (a template copy's tree is no surface's).
			const builtFile = ! slug && ctx.ledger ? path.join( path.dirname( ctx.ledger.file ), 'built.json' ) : null;
			builtFile && fs.mkdirSync( path.dirname( builtFile ), { recursive: true } );
			builtFile && builder.push( '--save-built', builtFile );
			// The post gets the site build's content marker (lib/site-build-apply.mjs), so a rebuild stops only for a person's edit.
			const said = await buildThenMarkPost( { build: () => exec( 'build', 'node', builder ), postId: slug ? null : entry.target.postId, runPhp, note: markerNote( key ) } );
			builtFile && fs.existsSync( builtFile ) && ctx.ledger.append( buildLedgerRows( { key, ctx, tree: readJson( path.join( REPO, tree ) ), builtFile } ) );
			// Recorded as the site build records its own copies, so a later site build sees it as built from this tree.
			slug && recordTemplate( slug, treeHash( readJson( path.join( REPO, tree ) ) ) );
			// A choice flow's built tree is kept for the site build (lib/site-run-flow-tree.mjs::writeFlowTree).
			const flowTree = writeFlowTree( { buildDir: build, entry, tree: readJson( path.join( REPO, tree ) ) } );
			flowTree && console.log( `${ key } flow tree: ${ path.relative( REPO, flowTree ) }` );
			// A built header, footer or drawer becomes the site's active one (lib/site-run-layout.mjs).
			const pointed = slug ? null : pointAfterBuild( { entry, rows, wp } );
			pointed && console.log( `${ key } ${ pointed }` );
			return pointed ? `${ said }; ${ pointed }` : said;
		} ) ) ) {
			return;
		}
		// The tree the gate chain reads for this surface: the copy a template built, else the Fill this build took (the whole Filled tree,
		// its shell's nodes included).
		builtTrees.set( key, slug ? tree : path.relative( REPO, path.join( ctx.out, 'filled.tree.json' ) ) );
		// The tree this build used, kept where surfaces.json names the surface's tree, so Solve repairs what was built. A run
		// without the build stage (inventory and propose, as the foundation's paint step runs) built nothing and keeps nothing.
		const solved = tree ? writeSolveTree( { buildDir: build, entry, builtFile: path.join( REPO, tree ) } ) : null;
		solved && console.log( `${ key } solve tree: ${ path.relative( REPO, solved ) }` );
		// The tree the site build plans this post from is that file (a flow's, the one writeFlowTree kept), so its hash, as the site build
		// computes it, is recorded as the post's built tree: a later site build finds nothing to rebuild and keeps the Filled build and
		// the applier's patches (lib/site-run-tree-mark.mjs::builtTreeHash, lib/site-build-apply.mjs::markTree).
		const builtHash = tree && ! slug ? builtTreeHash( { buildDir: build, entry, builtFile: path.join( REPO, tree ), rows, flowIds: () => flowProductIdsFor( { repo: REPO, client, site, rows } ).ids } ) : null;
		builtHash && markTree( { postId: entry.target.postId, hash: builtHash, runPhp, note: markerNote( key ) } );
		// The applier: set what Fill and the build cannot, from the draft's runtime. It stops the surface like a failed build.
		if ( ! await applyStage( { ctx, entry, key, slug, step, exec } ) ) {
			return;
		}
		// The verify stage (asked for with --stages ...,verify): the live page against the draft, joined to the run ledger file.
		if ( stages.includes( 'verify' ) && ! await verifyStage( { ctx, key, slug, step } ) ) {
			return;
		}
		if ( [ 'pages', 'page' ].includes( entry.copy?.from ) || ( slug && entry.copy && null === ctx.address ) ) {
			return note( key, 'walk', true, 0, null, 'pages' === entry.copy?.from ? `walked with its pages (${ entry.copy.surfaces.join( ', ' ) })` : 'page' === entry.copy?.from ? 'no draft surface plays it' : `the ${ slug } template shows only at a WooCommerce endpoint`, true );
		}
		const parity = path.join( build, 'qa', 'parity' );
		// A walk whose live element is absent fails instead of passing (lib/site-check-openers.mjs::walkAbsent).
		await step( 'walk', async () => walkChecked( path.join( parity, 'out', key, 'report.json' ), await exec( 'walk', 'node', walkArgs( { build, key, parity, walkerFull: entry.walkerFull, draftDir: path.join( REPO, entry.draftDir ), widths, headless: headlessFlag(), fresh: freshDraft } ), { SGS_DRAFT_URL: ctx.walkUrl, SGS_LIVE_ORIGIN: new URL( base ).origin, NODE_EXTRA_CA_CERTS: certs } ).catch( ( e ) => {
			// The walker exits 1 for open differences; the report is what counts.
			if ( fs.existsSync( path.join( parity, 'out', key, 'report.json' ) ) ) {
				return `report written (${ String( e.message ).slice( 0, 200 ) })`;
			}
			throw e;
		} ) ) );
	}

	// The apply stage of one surface: apply.mjs --surfaces <key> --write. A template copy has no post of its own and a non-local
	// target is not a mirror, so each is skipped with a note. Returns false when the stage failed.
	async function applyStage( { ctx, entry, key, slug, step, exec } ) {
		if ( ! stages.includes( 'apply' ) ) {
			note( key, 'apply', true, 0, null, 'not in --stages' );
			return true;
		}
		if ( slug || ! entry.target?.postId || ! /^local-/.test( site ) ) {
			note( key, 'apply', true, 0, null, slug ? 'a template copy has no post of its own' : ! entry.target?.postId ? 'no post behind this surface' : `${ site } is not a local mirror`, !! slug || ! entry.target?.postId );
			return true;
		}
		return step( 'apply', () => exclusive( async () => {
			const origin = new URL( ( await serverFor( entry ) ).url ).origin;
			const said = await exec( 'apply', 'node', [ 'scripts/computed-route/apply.mjs', client, '--surfaces', key, '--draft', origin, '--site', site, '--write', ...allowMissingPaintArgs( allowMissingPaint ) ] );
			// The applier patches the post's content after the build, so the marker is stored again over the content the run leaves.
			markPost( { postId: entry.target.postId, runPhp, note: markerNote( key ) } );
			// The applier's plan, as the run ledger's apply rows.
			const planFile = path.join( build, 'qa', 'apply', `${ key }.plan.json` );
			ctx.ledger && fs.existsSync( planFile ) && ctx.ledger.append( applyRunRows( { plan: readJson( planFile ), planFile: path.relative( build, planFile ).split( path.sep ).join( '/' ) } ) );
			return applyDetail( path.join( dir, `${ key }.apply.log` ), said );
		} ) );
	}

	// The build rows of one surface (lib/run-ledger-build.mjs): each Fill write against what the build saved.
	function buildLedgerRows( { key, ctx, tree, builtFile } ) {
		const report = readJson( path.join( ctx.out, 'fill-report.json' ) );
		const keys = new Map( ledgerTargets( readJson( ctx.skeletonFile ), key ).map( ( t ) => [ `${ t.ref }|${ t.slot }`, t.draftKey ] ) );
		return buildRunRows( { surface: key, writes: report.writes, filled: tree, saved: readJson( builtFile ).saved, savedFile: path.relative( build, builtFile ).split( path.sep ).join( '/' ), draftKeyOf: ( node, slot ) => keys.get( `${ node }|${ slot || '' }` ) ?? keys.get( `${ node }|` ) ?? null, schemaOf: blockSchema } );
	}

	// The verify stage of one surface: tools/clone-ledger.mjs on the built page, reading the run ledger file. A template copy
	// and a surface whose run wrote no run file are skipped with a note.
	async function verifyStage( { ctx, key, slug, step } ) {
		if ( slug || ! ctx.ledger?.file || ! fs.existsSync( ctx.ledger.file ) ) {
			note( key, 'verify', true, 0, null, slug ? 'a template copy is verified through its pages' : 'no run ledger file for this surface', !! slug );
			return true;
		}
		const exec = ctx.exec || execFor( key );
		return step( 'verify', async () => exec( 'verify', 'node', [ 'scripts/computed-route/tools/clone-ledger.mjs', client, '--surface', key, '--site', site, '--records', build, '--fill', ctx.out, '--run', ctx.ledger.file, '--out', path.dirname( ctx.ledger.file ) ] ) );
	}

	// The site's wp-cli for recording template copies and setting the active layouts (a local mirror's runs in WSL,
	// calibration-targets.json `pluginDir`).
	const runPhp = wpEvalRunner( target, site, REPO );
	const wp = wpCommand( target, site, REPO );
	const recordTemplate = ( slug, hash ) => runPhp( templateRecordPhp( slug, hash ) );
	// A saved copy the clone wrote that no surface builds now would serve a page ahead of its own content (lib/site-run-stale-templates.mjs).
	if ( stages.includes( 'build' ) && withCopies ) {
		removeStaleTemplates( { runPhp, wp, rows, surfaces } );
	}

	const pool = async ( list, fn ) => {
		const pending = [ ...list ];
		const results = [];
		await Promise.all( Array.from( { length: jobs }, async () => {
			while ( pending.length ) {
				const item = pending.shift();
				const key = item?.key ?? item;
				try {
					results.push( await fn( item ) );
				} catch ( e ) {
					note( key, 'run', false, 0, String( e.message || e ).slice( 0, 400 ) );
				}
			}
		} ) );
		return results;
	};
	// The order confirmation is read at a real order: one test order (pending, so no email) for the run, deleted at its end.
	const shown = {};
	// The shop templates' live addresses and the checkout walk's basket product, asked of the live site once (read-only).
	let liveFacts = null;
	if ( keys.some( ( k ) => [ 'single-product', 'archive-product', 'checkout' ].includes( surfaces[ k ]?.target?.template ) ) ) {
		try {
			liveFacts = readLiveFacts( runPhp( liveFactsPhp( { productSlugs: draftProductSlugs( keys.map( ( k ) => intake.skeletons?.[ surfaces[ k ].intakeSurface ]?.route ) ) } ) ) );
		} catch ( e ) {
			// No answer: the shop templates have no address (their walk is skipped with its note) and the checkout walks unprimed.
			liveFacts = readLiveFacts( '' );
			console.log( `live shop: the query failed (${ String( e.message || e ).slice( 0, 200 ) })` );
		}
		Object.assign( shown, templateAddresses( liveFacts ) );
		console.log( `live shop: shop ${ liveFacts.shop ?? 'none' }, product ${ liveFacts.product ?? 'none' }, basket product ${ liveFacts.basket?.fields?.[ 'add-to-cart' ] ?? 'none' }` );
	}
	// Every template copy's tree, made between the passes (finish builds from it).
	let copies = {};
	if ( needsTestOrder( surfaces, keys ) ) {
		const reply = JSON.parse( String( runPhp( testOrderPhp() ) ).trim().split( /\r?\n/ ).pop() );
		shown[ 'order-confirmation' ] = orderAddress( reply );
		console.log( reply.error ? `test order: none (${ reply.error }); the order confirmation is not read` : `test order ${ reply.id }: ${ shown[ 'order-confirmation' ] }` );
	}
	try {
		const ready = ( await pool( keys, prepare ) ).filter( Boolean );
		// Between the passes: every template copy's tree, from this run's Filled trees and the shells recorded before.
		const filled = Object.fromEntries( ready.filter( ( c ) => c.filled ).map( ( c ) => [ c.key, c.filled ] ) );
		copies = copyTrees( { surfaces, keys, filled, buildDir: build } );
		// A template copy has no post for the apply stage, so the rules that read only the draft element (the heading level) run on its tree here.
		const origins = Object.assign( {}, ...fs.readdirSync( build ).filter( ( f ) => f.endsWith( '.origin.json' ) ).map( ( f ) => readJson( path.join( build, f ) ) ) );
		for ( const [ slug, c ] of Object.entries( copies ) ) {
			const applied = applyTemplateRules( { tree: c.tree, origins } );
			applied.writes.length && console.log( `copy ${ slug }: ${ applied.writes.length } apply rule write${ 1 === applied.writes.length ? '' : 's' } (${ [ ...new Set( applied.writes.map( ( w ) => w.attr ) ) ].join( ', ' ) })` );
			writeCopy( build, slug, c.tree, c.shell );
			console.log( `copy ${ slug }: ${ path.relative( REPO, copyFile( build, slug ) ) }${ c.shell ? ` (shell of ${ c.shell.chain.length } wrapper${ 1 === c.shell.chain.length ? '' : 's' })` : '' }` );
		}
		// One logged-in browser for every build of the run (lib/wp-run-session.mjs): each wp-build-page.js child attaches through
		// SGS_CDP_URL instead of launching and logging in on its own.
		const withEnv = keys.map( ( k ) => surfaces[ k ] ).find( ( e ) => e?.envFile && e?.envKey );
		const session = stages.includes( 'build' ) && withEnv ? await openRunSession( site, readEnv( withEnv.envFile, withEnv.envKey ) ) : null;
		// The template copies build first, so a page never shows its content-only post inside the theme's generic template; then the
		// header, footer, drawer, menus, forms, modals and flows pages link by reference (lib/site-run-order.mjs).
		const rank = ( c ) => buildRank( { entry: c.entry, kind: intake.skeletons?.[ c.entry.intakeSurface ]?.kind, buildDir: build } );
		await pool( ready.sort( ( a, b ) => rank( a ) - rank( b ) ), finish );
		session && await session.close();
	} finally {
		Object.hasOwn( shown, 'order-confirmation' ) && console.log( `test orders deleted: ${ String( runPhp( deleteTestOrdersPhp() ) ).trim().split( /\r?\n/ ).pop() }` );
		await Promise.all( [ ...servers.values() ].map( async ( x ) => ( await x ).close() ) );
	}
	// PF11: the run ends by ranking every page's open walker rows (lib/site-run-rank.mjs), then the gate chain turns the ranked top rows into gaps.json and the framework backlog merges the F rows.
	if ( stages.includes( 'walk' ) ) {
		const ranking = writeRanking( { runDir: dir, parityOut: path.join( build, 'qa', 'parity', 'out' ), surfaces: keys, limit: TOP_N } );
		console.log( `ranking: ${ ranking.total } open rows in ${ ranking.causes } causes, top ${ ranking.ranked.length } written to ${ ranking.file }` );
		for ( const s of ranking.surfaces ) {
			const args = gateChainArgs( { surface: s, gateDir: path.join( dir, 'gate', s ), client, site, built: builtTrees } );
			if ( ! args ) {
				note( s, 'gate-chain', false, 0, 'no tree was built for it in this run, so its rows cannot be tied to the blocks the live page holds' );
				continue;
			}
			const r = await run( 'node', args, { logFile: path.join( dir, `${ s }.gate-chain.log` ), env: { SGS_LIVE_ORIGIN: new URL( base ).origin } } );
			note( s, 'gate-chain', 0 === r.code, 0, r.tail );
		}
		const fb = await run( 'node', [ 'scripts/computed-route/framework-backlog.mjs' ], { logFile: path.join( dir, 'framework-backlog.log' ) } );
		note( 'run', 'framework-backlog', 0 === fb.code, 0, fb.tail );
		const cl = await run( 'node', [ 'scripts/computed-route/custom-css-log.mjs', '--client', client, '--check' ], { logFile: path.join( dir, 'custom-css-log.log' ) } );
		note( 'run', 'custom-css-log', 0 === cl.code, 0, cl.tail );
	}
	const failed = Object.entries( status ).filter( ( [ , s ] ) => Object.values( s ).some( ( x ) => ! x.ok ) );
	const problems = stageProblems( status );
	console.log( `site run ${ client }: ${ keys.length } surfaces, ${ failed.length } with a failed stage, ${ problems.skipped.length } stages not run. ${ path.join( dir, 'status.json' ) }` );
	// --strict: a stage that did not run counts as a failure of the run, and the run lists each one.
	strict && problems.skipped.forEach( ( l ) => console.log( `strict: not run: ${ l }` ) );
	problems.failed.forEach( ( l ) => console.log( `failed: ${ l }` ) );
	const classes = Object.entries( failureCounts( status ) );
	classes.length && console.log( `failure classes: ${ classes.map( ( [ c, n ] ) => `${ c } ${ n }` ).join( ', ' ) }` );
	return runExit( status, { strict } );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).then( ( code ) => {
		process.exitCode = code;
	}, ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
