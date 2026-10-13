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

// The template keys (`<component>/<tpl>`) whose own animation loops a translate for ever, from intake.json's re-derived
// motion inventory (`inventory.animations.records`, FR-48-25): the mechanism of a marquee track, read from the record, never
// from a name.
export const loopingKeys = ( animations ) => new Set( ( animations?.records || [] ).filter( ( a ) => 'infinite' === String( a.iterations ) && a.element?.template_tpl_id && ( a.properties || [] ).some( ( p ) => 'transform' === p.property && /translate/.test( `${ p.from ?? '' } ${ p.to ?? '' } ${ p.formula ?? '' }` ) ) ).map( ( a ) => `${ a.element.dc }/${ a.element.template_tpl_id }` ) );

// o: { client, db, repo?, skeletons (intake.json's `skeletons`: { <slug>: { id, kind, name } }), motion? (loopingKeys), picks? ({ surface: { key:
// decision } }), useBuilt? (false proposes
// even a surface the client built, to measure the rules on it) }.
// Returns { surfaces: { <slug>: { kind, name, built, rows, counts, problems, skeleton } }, missing: [slug] }; throws when
// the decisions data is not sound (lib/skeleton-facts.mjs::decisionsProblems), as the intake run refuses it.
export function rerunSkeletons( { client, db, repo = REPO, skeletons, motion = new Set(), picks = {}, useBuilt = true } ) {
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
	const surfaces = Object.entries( skeletons ).map( ( [ slug, x ] ) => ( { slug, id: x.id, kind: x.kind, name: x.name } ) );
	const out = {};
	const missing = [];
	for ( const s of surfaces ) {
		const file = path.join( dir, `${ s.slug }.json` );
		if ( ! fs.existsSync( file ) ) {
			missing.push( s.slug );
			continue;
		}
		const inventory = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		const b = built[ s.id ] || built[ s.slug ] || null;
		const r = proposeSkeleton( { inventory, facts, surface: s.slug, surfaceKind: s.kind, surfaceName: s.name, built: b, motion, clientDecisions, picks: picks[ s.slug ] || {}, db } );
		out[ s.slug ] = { kind: s.kind, name: s.name, built: b, rows: r.proposal.rows, counts: r.proposal.counts, problems: r.problems, skeleton: r.skeleton, entry: entryOf( s.slug, skeletons[ s.slug ], r, inventory ) };
	}
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
	const run = rerunSkeletons( { client, db, repo, skeletons: intake.skeletons, motion: loopingKeys( intake.inventory?.animations ) } );
	const entries = Object.keys( intake.skeletons ).map( ( slug ) => run.surfaces[ slug ]?.entry || { surface: slug, ...intake.skeletons[ slug ] } );
	const c = collapseSkeletons( entries );
	return { intake: { ...intake, skeletons: c.skeletons }, missing: run.missing, before: c.before, after: c.after };
}
