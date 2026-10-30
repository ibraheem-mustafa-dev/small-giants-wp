// The proposal step, offline (Spec 48 FR-48-6): every surface proposed from the inventories an intake run saved
// (sites/<client>/build/intake/inventories/<surface>.json, written by lib/intake-skeletons.mjs::proposeSkeletons'
// `inventoriesDir`), with today's rules, standing decisions and framework database. No browser opens, so a rule change
// is measured against a whole client in seconds. This is the one proposal path: the intake run's `proposals` stage (after the
// facts stage has rewritten facts.json, which the proposals read) and `--rerun-skeletons` both call it. Surface ids, kinds
// and names come from intake.json's `skeletons` (the roots the run read).
import fs from 'fs';
import path from 'path';
import { proposeSkeleton } from './skeleton-propose.mjs';
import { loadFacts, decisionsProblems, REPO } from './skeleton-facts.mjs';
import { readDecisions, skeletonDir } from './skeleton-finalise.mjs';
import { rowsOf, summaryOf } from './intake-skeletons.mjs';
import { collapseSkeletons } from './intake-run-collapse.mjs';
import { templateKey } from './fact-key.mjs';
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { proposalContext } from './skeleton-context.mjs';
import { assertCurrent, sourcesOf } from './freshness.mjs';
import { fingerprintsOf } from './identity.mjs';

// The template keys (`<component>/<tpl>`) whose own animation loops a translate for ever, from intake.json's re-derived
// motion inventory (`inventory.animations.records`, FR-48-25): the mechanism of a marquee track, read from the record, never
// from a name. A record names its element by `template_tpl_id`; only a record with no `template_tpl_id` (a strip built in
// code and bound into the template through a hole) is named by the `nearest_tpl_id` of the element holding that hole, and
// a template record's own `nearest_tpl_id` never adds a key. A record counts only when it is a translate transform with an
// infinite iteration that runs one way, so an element merely near an animation is never a track: a track never turns
// back, so an alternating direction or a translate that ends where it starts (a float or bob) is not one.
const tplIds = ( v ) => ( null == v ? [] : [].concat( v ) );
const oneWay = ( a, p ) => ! /^alternate/.test( String( a.direction ?? '' ) ) && ( null != p.formula || String( p.from ?? '' ).replace( /\s+/g, '' ) !== String( p.to ?? '' ).replace( /\s+/g, '' ) );
const translatesForEver = ( a ) => 'infinite' === String( a.iterations ) && ( a.properties || [] ).some( ( p ) => 'transform' === p.property && /translate/.test( `${ p.from ?? '' } ${ p.to ?? '' } ${ p.formula ?? '' }` ) && oneWay( a, p ) );
export const loopingKeys = ( animations ) => new Set( ( animations?.records || [] ).filter( translatesForEver ).flatMap( ( a ) => ( null == a.element?.template_tpl_id ? tplIds( a.element?.nearest_tpl_id ) : tplIds( a.element.template_tpl_id ) ).map( ( tpl ) => templateKey( { dc: a.element.dc, tpl } ) ) ) );

// The template keys (`<component>/<tpl>`) of the scroll tracks the draft's script drives as a carousel (a timer that steps the
// track, pointer drag, prev and next controls: lib/motion-behaviour-settings.mjs::carouselOf recognises them as the testimonial
// slider's settings), from intake.json's re-derived motion inventory. A record names its track by `template_tpl_id`, else by the
// nearest template element.
export const carouselKeys = ( animations ) => {
	const records = animations?.records || [];
	return new Set( records.filter( ( r ) => recogniseBehaviour( r, { records } )?.blocks?.[ 'sgs/testimonial-slider' ] ).flatMap( ( r ) => ( null == r.element?.template_tpl_id ? tplIds( r.element?.nearest_tpl_id ) : tplIds( r.element.template_tpl_id ) ).map( ( tpl ) => templateKey( { dc: r.element.dc, tpl } ) ) ) );
};

// The breakpoints in the client's saved intake.json: the width thresholds the proposals collapse at when the caller does not pass its own.
const savedBreakpoints = ( repo, client ) => {
	const file = path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).breakpoints || [] : [];
};
// The page map in the client's saved intake.json: which surface is a choice flow or a block-owned part (lib/skeleton-surface-role.mjs).
const savedPageMap = ( repo, client ) => {
	const file = path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).pageMap || [] : [];
};

// o: { client, db, repo?, skeletons (intake.json's `skeletons`: { <slug>: { id, kind, name } }), motion? (loopingKeys), picks? ({ surface: { key:
// decision } }), breakpoints? (intake.json's
// `breakpoints`; the saved file's by default), pageMap? (intake.json's `pageMap`; the saved file's by default), routing? (intake.json's
// `routing`, the draft-link context's; the saved file's by default), carousels? (carouselKeys of the motion inventory), inventoriesDir?
// (the saved inventories; the client's by default), codeRepo? (where the framework's block.json files are read; `repo` by default), propose? (the proposer; proposeSkeleton by default) }. Each surface is proposed with the
// context `skeleton.mjs propose` passes (lib/skeleton-context.mjs::proposalContext): its handoff states, the thresholds, the calibration
// keys and settings, the carried ids, the commerce region and the loops (rows, brands, carousels).
// Returns { surfaces: { <slug>: { kind, name, rows, counts, problems, skeleton, entry, fingerprints } }, missing: [slug], failed: [{ slug, error }], absorbed: { <slug>: { into (the header surface's slug), root (the strip's root key) } } }; throws when
// the decisions data is not sound (lib/skeleton-facts.mjs::decisionsProblems), as the intake run refuses it. A surface whose
// proposal throws (its fact record stale, say) keeps an entry with its inventory summary, no rows and `proposalGap`, and is listed
// in `failed`: its saved inventory is intact, so the next run proposes it again.
export function rerunSkeletons( { client, db, repo = REPO, codeRepo = repo, skeletons, motion = new Set(), carousels = new Set(), picks = {}, breakpoints = savedBreakpoints( repo, client ), pageMap = savedPageMap( repo, client ), routing = null, inventoriesDir = null, propose = proposeSkeleton } ) {
	const dir = inventoriesDir || path.join( repo, 'sites', client, 'build', 'intake', 'inventories' );
	const decisionsFile = path.join( skeletonDir( repo, client ), 'decisions.json' );
	const clientDecisions = fs.existsSync( decisionsFile ) ? readDecisions( decisionsFile ) : {};
	const facts = loadFacts( { db, client, repo, codeRepo, siteName: clientDecisions.siteName || null } );
	const bad = decisionsProblems( facts );
	if ( bad.length ) {
		throw new Error( `the decisions data is not sound: ${ bad.join( '; ' ) }` );
	}
	// A surface the run failed to read (a gap, no inventory) is never refilled from an older run's saved inventory: it keeps
	// its failed entry and is listed as missing.
	const read = ( x ) => ! x.gap && null != x.inventory;
	const surfaces = Object.entries( skeletons ).filter( ( [ , x ] ) => read( x ) ).map( ( [ slug, x ] ) => ( { slug, id: x.id, kind: x.kind, name: x.name, route: x.route ?? null } ) );
	const out = {};
	const missing = [];
	const failed = [];
	const handoffRoot = path.join( repo, 'sites', client, 'handoff' );
	// The export is hashed once per run, not once per surface.
	const current = sourcesOf( handoffRoot );
	// A header or footer surface is proposed first: the strips it reads beside itself (rules.headerSlots, rules.footerSlots) are its rows, so a global
	// surface whose root is one of them is that header's, never a surface of its own.
	const absorbedKeys = new Map();
	const absorbed = {};
	for ( const s of [ ...surfaces ].sort( ( a, b ) => Number( ! [ 'header', 'footer' ].includes( a.kind ) ) - Number( ! [ 'header', 'footer' ].includes( b.kind ) ) ) ) {
		const file = path.join( dir, `${ s.slug }.json` );
		if ( ! fs.existsSync( file ) ) {
			missing.push( s.slug );
			continue;
		}
		const inventory = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		// A proposal is built only from an inventory that still describes the export: one with no sources is refused too.
		assertCurrent( inventory, handoffRoot, { label: `${ client } inventory ${ s.slug }`, requireSources: true, current } );
		if ( 'global' === s.kind && absorbedKeys.has( inventory.checks?.rootKey ) ) {
			absorbed[ s.slug ] = { into: absorbedKeys.get( inventory.checks.rootKey ), root: inventory.checks.rootKey };
			continue;
		}
		let r;
		try {
			const ctx = proposalContext( { repo, client, slug: s.slug, id: s.id, route: s.route, breakpoints, routing, pageMap, carousels, rootComponent: inventory.checks?.rootName || null } );
			r = propose( { inventory, facts, surface: s.slug, surfaceKind: s.kind, surfaceName: s.name, motion, clientDecisions, picks: picks[ s.slug ] || {}, ...ctx, db, pageMap, surfaceId: s.id, surfaceRoute: s.route } );
		} catch ( e ) {
			const error = e.message.split( '\n' )[ 0 ];
			failed.push( { slug: s.slug, error } );
			out[ s.slug ] = { kind: s.kind, name: s.name, rows: [], counts: null, problems: [], skeleton: [], entry: { ...entryOf( s.slug, skeletons[ s.slug ], { proposal: { counts: null, rows: [] }, problems: [] }, inventory ), proposalGap: error }, fingerprints: fingerprintsOf( inventory ) };
			continue;
		}
		r.proposal.stripRoots?.forEach( ( k ) => absorbedKeys.set( k, s.slug ) );
		out[ s.slug ] = { kind: s.kind, name: s.name, rows: r.proposal.rows, counts: r.proposal.counts, problems: r.problems, skeleton: r.skeleton, entry: entryOf( s.slug, skeletons[ s.slug ], r, inventory ), fingerprints: fingerprintsOf( inventory ) };
	}
	Object.entries( skeletons ).filter( ( [ , x ] ) => ! read( x ) ).forEach( ( [ slug ] ) => missing.push( slug ) );
	const ordered = Object.fromEntries( Object.keys( skeletons ).filter( ( k ) => out[ k ] ).map( ( k ) => [ k, out[ k ] ] ) );
	return { surfaces: ordered, missing, failed, absorbed };
}

// One surface's entry in the shape the intake run writes (lib/intake-skeletons.mjs::proposeSkeletons), keeping the root
// and opener the run recorded.
const entryOf = ( slug, was, r, inventory ) => ( {
	surface: slug, id: was.id, kind: was.kind, name: was.name, route: was.route ?? null, ...( was.root ? { root: was.root } : {} ), ...( was.opened ? { opened: was.opened } : {} ),
	inventory: summaryOf( inventory ), rows: rowsOf( slug, r.proposal, inventory ), counts: r.proposal.counts, problems: r.problems,
} );

// intake.json with its `skeletons` proposed again offline and collapsed as the intake run collapses them. A surface
// whose inventory was not saved keeps its old entry and is listed in `missing`; one whose proposal threw is listed in `failed`.
// `intake` carries the run's own routing, page map, breakpoints and motion inventory. Returns { intake, missing, failed, before, after, withinSurfaces }.
export function refreshIntakeSkeletons( { intake, client, db, repo = REPO, codeRepo = repo, inventoriesDir = null, propose } ) {
	const run = rerunSkeletons( { client, db, repo, codeRepo, inventoriesDir, propose, skeletons: intake.skeletons, motion: loopingKeys( intake.inventory?.animations ), carousels: carouselKeys( intake.inventory?.animations ), breakpoints: intake.breakpoints || [], pageMap: intake.pageMap || [], routing: intake.routing?.adapter ? intake.routing : null } );
	const entries = Object.keys( intake.skeletons ).filter( ( slug ) => ! run.absorbed[ slug ] ).map( ( slug ) => run.surfaces[ slug ]?.entry || { surface: slug, ...intake.skeletons[ slug ] } );
	const c = collapseSkeletons( entries );
	return { intake: { ...intake, skeletons: c.skeletons }, missing: run.missing, failed: run.failed, before: c.before, after: c.after, withinSurfaces: c.withinSurfaces };
}
