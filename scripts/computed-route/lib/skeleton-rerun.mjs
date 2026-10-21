// The skeleton step again, offline (Spec 48 FR-48-6): every surface proposed afresh from the inventories the last intake
// run saved (sites/<client>/build/intake/inventories/<surface>.json, written by lib/intake-skeletons.mjs::proposeSkeletons'
// `inventoriesDir`), with today's rules, standing decisions and framework database. No browser opens, so a rule change
// is measured against a whole client in seconds. Surface ids, kinds and names come from intake.json's `skeletons` (the
// roots the run read) and built posts from the client's built-surfaces.json, as in the intake run.
import fs from 'fs';
import path from 'path';
import { proposeSkeleton } from './skeleton-propose.mjs';
import { loadFacts, decisionsProblems, REPO } from './skeleton-facts.mjs';
import { readDecisions, skeletonDir } from './skeleton-finalise.mjs';
import { rowsOf, summaryOf } from './intake-skeletons.mjs';
import { collapseSkeletons } from './intake-run-collapse.mjs';
import { templateKey } from './fact-key.mjs';
import { proposalContext } from './skeleton-context.mjs';
import { assertCurrent } from './freshness.mjs';
import { fingerprintsOf } from './identity.mjs';

// The template keys (`<component>/<tpl>`) whose own animation loops a translate for ever, from intake.json's re-derived
// motion inventory (`inventory.animations.records`, FR-48-25): the mechanism of a marquee track, read from the record, never
// from a name. A record names its element by `template_tpl_id`, or, for a strip built in code and bound into the template
// through a hole, by the `nearest_tpl_id` of the element holding that hole; that host counts only because its record is
// a translate transform with an infinite iteration, so an element merely near an animation is never a track.
const tplIds = ( v ) => ( null == v ? [] : [].concat( v ) );
const translatesForEver = ( a ) => 'infinite' === String( a.iterations ) && ( a.properties || [] ).some( ( p ) => 'transform' === p.property && /translate/.test( `${ p.from ?? '' } ${ p.to ?? '' } ${ p.formula ?? '' }` ) );
export const loopingKeys = ( animations ) => new Set( ( animations?.records || [] ).filter( translatesForEver ).flatMap( ( a ) => [ ...tplIds( a.element?.template_tpl_id ), ...tplIds( a.element?.nearest_tpl_id ) ].map( ( tpl ) => templateKey( { dc: a.element.dc, tpl } ) ) ) );

// The breakpoints in the client's saved intake.json: the width thresholds the proposals collapse at when the caller does not pass its own.
const savedBreakpoints = ( repo, client ) => {
	const file = path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).breakpoints || [] : [];
};

// o: { client, db, repo?, skeletons (intake.json's `skeletons`: { <slug>: { id, kind, name } }), motion? (loopingKeys), picks? ({ surface: { key:
// decision } }), useBuilt? (false proposes even a surface the client built, to measure the rules on it), breakpoints? (intake.json's
// `breakpoints`; the saved file's by default), propose? (the proposer; proposeSkeleton by default) }. Each surface is proposed with the context `skeleton.mjs propose` passes
// (lib/skeleton-context.mjs::proposalContext): its handoff states, the thresholds, and the calibration keys and settings.
// Returns { surfaces: { <slug>: { kind, name, built, rows, counts, problems, skeleton } }, missing: [slug] }; throws when
// the decisions data is not sound (lib/skeleton-facts.mjs::decisionsProblems), as the intake run refuses it.
export function rerunSkeletons( { client, db, repo = REPO, skeletons, motion = new Set(), picks = {}, useBuilt = true, breakpoints = savedBreakpoints( repo, client ), propose = proposeSkeleton } ) {
	const dir = path.join( repo, 'sites', client, 'build', 'intake', 'inventories' );
	const builtFile = path.join( repo, 'sites', client, 'build', 'skeleton', 'built-surfaces.json' );
	const built = useBuilt && fs.existsSync( builtFile ) ? JSON.parse( fs.readFileSync( builtFile, 'utf8' ) ).surfaces || {} : {};
	const decisionsFile = path.join( skeletonDir( repo, client ), 'decisions.json' );
	const clientDecisions = fs.existsSync( decisionsFile ) ? readDecisions( decisionsFile ) : {};
	const facts = loadFacts( { db, client, repo, siteName: clientDecisions.siteName || null } );
	const bad = decisionsProblems( facts );
	if ( bad.length ) {
		throw new Error( `the decisions data is not sound: ${ bad.join( '; ' ) }` );
	}
	// A surface the run failed to read (a gap, no inventory) is never refilled from an older run's saved inventory: it keeps
	// its failed entry and is listed as missing.
	const read = ( x ) => ! x.gap && null != x.inventory;
	const surfaces = Object.entries( skeletons ).filter( ( [ , x ] ) => read( x ) ).map( ( [ slug, x ] ) => ( { slug, id: x.id, kind: x.kind, name: x.name } ) );
	const out = {};
	const missing = [];
	const handoffRoot = path.join( repo, 'sites', client, 'handoff' );
	const unchecked = [];
	for ( const s of surfaces ) {
		const file = path.join( dir, `${ s.slug }.json` );
		if ( ! fs.existsSync( file ) ) {
			missing.push( s.slug );
			continue;
		}
		const inventory = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		assertCurrent( inventory, handoffRoot, { label: `${ client } inventory ${ s.slug }`, warn: () => unchecked.push( s.slug ) } );
		const b = built[ s.id ] || built[ s.slug ] || null;
		const ctx = proposalContext( { repo, client, slug: s.slug, id: s.id, breakpoints } );
		const r = propose( { inventory, facts, surface: s.slug, surfaceKind: s.kind, surfaceName: s.name, built: b, motion, clientDecisions, picks: picks[ s.slug ] || {}, ...ctx, db } );
		out[ s.slug ] = { kind: s.kind, name: s.name, built: b, rows: r.proposal.rows, counts: r.proposal.counts, problems: r.problems, skeleton: r.skeleton, entry: entryOf( s.slug, skeletons[ s.slug ], r, inventory ), fingerprints: fingerprintsOf( inventory ) };
	}
	Object.entries( skeletons ).filter( ( [ , x ] ) => ! read( x ) ).forEach( ( [ slug ] ) => missing.push( slug ) );
	unchecked.length && console.warn( `freshness: ${ unchecked.length } saved inventor${ 1 === unchecked.length ? 'y has' : 'ies have' } no sources (written before the route recorded them); currency is not checked` );
	return { surfaces: out, missing };
}

// One surface's entry in the shape the intake run writes (lib/intake-skeletons.mjs::proposeSkeletons), keeping the root
// and opener the run recorded.
const entryOf = ( slug, was, r, inventory ) => ( {
	surface: slug, id: was.id, kind: was.kind, name: was.name, route: was.route ?? null, ...( was.root ? { root: was.root } : {} ), ...( was.opened ? { opened: was.opened } : {} ),
	inventory: summaryOf( inventory ), rows: rowsOf( slug, r.proposal, inventory ), counts: r.proposal.counts, problems: r.problems,
} );

// intake.json with its `skeletons` proposed again offline and collapsed as the intake run collapses them. A surface
// whose inventory was not saved keeps its old entry and is listed in `missing`. Returns { intake, missing, before, after }.
export function refreshIntakeSkeletons( { intake, client, db, repo = REPO } ) {
	const run = rerunSkeletons( { client, db, repo, skeletons: intake.skeletons, motion: loopingKeys( intake.inventory?.animations ), breakpoints: intake.breakpoints || [] } );
	const entries = Object.keys( intake.skeletons ).map( ( slug ) => run.surfaces[ slug ]?.entry || { surface: slug, ...intake.skeletons[ slug ] } );
	const c = collapseSkeletons( entries );
	return { intake: { ...intake, skeletons: c.skeletons }, missing: run.missing, before: c.before, after: c.after };
}
