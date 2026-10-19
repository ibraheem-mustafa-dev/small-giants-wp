// The inventory, re-derived (Spec 48 FR-48-25, Spec 48A FR-48A-7): intake's own animations.json and surfaces.json
// equivalents, built by handoff-schema/METHOD.md §0 to §8 from the census (lib/intake-census.mjs), validated against
// the master schemas, with every counted occurrence mapped to record IDs (`occurrences`), timer- and frame-written
// styles sampled per width (lib/intake-inventory-sample.mjs), FR-48-29's prop variants (lib/intake-props.mjs), and
// Claude Design's copies diffed against it (lib/intake-inventory-diff.mjs). `readInventory` is the construct
// registry's reader for the motion, trigger and hook kinds: it returns the record IDs a census construct maps to.
import fs from 'fs';
import path from 'path';
import { loadAjv, schemaProblems, readJson, sha256, MASTER_SCHEMAS } from './handoff.mjs';
import { staticCensus } from './intake-census.mjs';
import { codeModel, offsetOf } from './intake-inventory-code.mjs';
import { stateWriters } from './intake-inventory-keys.mjs';
import { animationRecords } from './intake-inventory-anim.mjs';
import { surfaceRecords } from './intake-inventory-surfaces.mjs';
import { propVariants } from './intake-props.mjs';
import { sampleTargets, sampleWriters } from './intake-inventory-sample.mjs';
import { diffInventory } from './intake-inventory-diff.mjs';

export const EFFECT_KINDS = [ 'waapi', 'transition', 'keyframes', 'style-hover' ];
export const TRIGGER_KINDS = [ 'timer', 'observer', 'handler', 'ref', 'data-hook' ];
const isCode = ( r ) => r.draftId.includes( ':js:' );

// The census widened to every page of a one-file-per-page draft (FR-26 adapter 3): the census follows imports from the
// entry only, so each other route file gets its own static pass and its components are added once. Returns
// { rows, sources, gaps, blocked }.
export async function inventoryCensus( { folder, entry, routing = null, census, harPath = null, timeout = 60000 } ) {
	const out = { rows: [ ...census.rows ], sources: [ ...census.sources ], gaps: [], blocked: [] };
	if ( 'files' !== routing?.adapter ) {
		return out;
	}
	for ( const r of routing.routes.filter( ( x ) => ! out.sources.some( ( s ) => s.file === x.key ) ) ) {
		try {
			const c = await staticCensus( { folder, entry: r.key, harPath, timeout } );
			const known = new Set( out.sources.map( ( s ) => s.component ) );
			out.sources.push( ...c.sources.filter( ( s ) => ! known.has( s.component ) ) );
			out.rows.push( ...c.rows.filter( ( x ) => ! known.has( x.component ) && ! ( isCode( x ) && known.has( x.draftId.split( ':js:' )[ 0 ] ) ) ) );
			out.gaps.push( ...c.gaps );
			out.blocked.push( ...( c.blocked || [] ) );
		} catch ( e ) {
			out.gaps.push( { construct: 'inventory-census', draftId: r.key, error: `the static pass on this page failed: ${ e.message.split( '\n' )[ 0 ] }` } );
		}
	}
	return out;
}

// Every counted occurrence (METHOD.md §4) and the record IDs it maps to: effects (Web Animations calls, transitions,
// keyframes and animation declarations, pseudo rules, JS writers), triggers (timers, observers, listeners, template
// handlers), hooks (refs, data-* hooks) and sc-ifs. A trigger or hook that drives no effect record maps to the surface
// it sits on (`role: 'context'`, with why).
export function occurrences( census, model, anim, surf ) {
	const out = [];
	const meta = [ ...anim.meta ];
	const ownerOf = ( comp ) => surf.componentSurface.get( comp ) ?? surf.componentSurface.get( model.scriptOwner.get( comp ) );
	for ( const r of census.rows.filter( ( x ) => EFFECT_KINDS.includes( x.kind ) ) ) {
		out.push( { occurrence: r.id, kind: r.kind, role: 'effect', recordIds: anim.census.get( r.id ) || [] } );
	}
	anim.sites.forEach( ( s ) => out.push( { occurrence: s.key, kind: 'js-writer', role: 'effect', recordIds: [ s.recordId ] } ) );
	for ( const r of census.rows.filter( ( x ) => TRIGGER_KINDS.includes( x.kind ) ) ) {
		const comp = isCode( r ) ? r.draftId.split( ':js:' )[ 0 ] : r.component;
		let ids = [];
		if ( isCode( r ) ) {
			const p = model.progs.get( comp );
			const at = p ? `${ comp }@${ offsetOf( p, r.draftId ) }` : null;
			ids = meta.filter( ( [ , m ] ) => m.via.includes( at ) ).map( ( [ id ] ) => id );
		} else if ( 'handler' === r.kind ) {
			ids = meta.filter( ( [ , m ] ) => r.detail.method && m.members.includes( `${ comp }:${ r.detail.method }` ) ).map( ( [ id ] ) => id );
			const keys = stateWriters( model.progs.get( comp ) ).get( r.detail.method ) || [];
			ids.push( ...[ ...keys ].flatMap( ( k ) => surf.keySurfaces.get( `${ comp }:${ k }` ) || [] ) );
		} else {
			ids = meta.filter( ( [ , m ] ) => m.tpl.includes( r.draftId ) ).map( ( [ id ] ) => id );
		}
		ids = [ ...new Set( ids ) ];
		out.push( ids.length ? { occurrence: r.id, kind: r.kind, role: 'trigger', recordIds: ids }
			: { occurrence: r.id, kind: r.kind, role: 'context', recordIds: [ ownerOf( comp ) ].filter( Boolean ), why: `drives no effect record; it sits on ${ comp }'s surface` } );
	}
	for ( const r of census.rows.filter( ( x ) => 'sc-if' === x.kind ) ) {
		out.push( { occurrence: r.id, kind: 'sc-if', role: 'surface', recordIds: [ surf.scIf.get( r.id ) ].filter( Boolean ) } );
	}
	return out;
}

// The two inventories of a census, without sampling or files: the shared core of buildInventory and readInventory.
export function inventoryCore( census, { routing = null, notDefects = [], props = [], pageRows = null } = {} ) {
	const model = codeModel( census );
	const anim = animationRecords( census, { notDefects } );
	const surf = surfaceRecords( census, { model, anim, routing, props, pageRows } );
	return { model, anim, surf, occurrences: occurrences( census, model, anim, surf ) };
}

// A trigger kind with at least this many occurrences, every one of them `context`, is a failed trigger mapping rather
// than a draft whose triggers drive nothing: in the reference exports and the test fixture every kind with three or
// more occurrences has at least one linked trigger (as few as 1 observer of 5, 10 timers of 29), and fewer than three
// is too few to tell the two apart.
export const CONTEXT_ONLY_MIN = 3;

// Problems: an occurrence that maps to no record, a record ID a count or an occurrence names that does not exist. With
// `census` (and `jsWriters`, the number of JS writer sites), also: a census row of a counted kind (EFFECT_KINDS,
// TRIGGER_KINDS, sc-if) with no occurrence, an occurrence count that differs from those rows plus the writer sites,
// and a trigger kind whose CONTEXT_ONLY_MIN or more occurrences all map to `context` while the inventory holds a
// record a trigger could drive (an animation, or a surface state set by state keys).
export function reconcile( inv, { census = null, jsWriters = null } = {} ) {
	const ids = new Set( [ ...inv.animations.records.map( ( r ) => r.id ), ...inv.surfaces.records.map( ( r ) => r.id ) ] );
	const problems = [];
	if ( census ) {
		const counted = census.rows.filter( ( r ) => EFFECT_KINDS.includes( r.kind ) || TRIGGER_KINDS.includes( r.kind ) || 'sc-if' === r.kind );
		const seen = new Set( inv.occurrences.map( ( o ) => o.occurrence ) );
		counted.filter( ( r ) => ! seen.has( r.id ) ).forEach( ( r ) => problems.push( `census row ${ r.id } (${ r.kind }) has no occurrence` ) );
		const writers = inv.occurrences.filter( ( o ) => 'js-writer' === o.kind ).length;
		const expected = counted.length + ( jsWriters ?? writers );
		if ( inv.occurrences.length !== expected ) {
			problems.push( `${ inv.occurrences.length } occurrences against ${ counted.length } counted census rows and ${ jsWriters ?? writers } JS writer sites` );
		}
		const drivable = inv.animations.records.length > 0 || inv.surfaces.records.some( ( r ) => r.states.some( ( s ) => Object.keys( s.state_keys || {} ).length ) );
		for ( const kind of TRIGGER_KINDS ) {
			const of = inv.occurrences.filter( ( o ) => o.kind === kind );
			if ( drivable && of.length >= CONTEXT_ONLY_MIN && of.every( ( o ) => 'context' === o.role ) ) {
				problems.push( `all ${ of.length } ${ kind } occurrences map only to their surface (role context): the trigger mapping linked none of them` );
			}
		}
	}
	for ( const o of inv.occurrences ) {
		if ( ! o.recordIds.length ) {
			problems.push( `occurrence ${ o.occurrence } (${ o.kind }) maps to no record` );
		}
		o.recordIds.filter( ( id ) => ! ids.has( id ) ).forEach( ( id ) => problems.push( `occurrence ${ o.occurrence } names ${ id }, which no record has` ) );
	}
	for ( const [ cat, c ] of Object.entries( inv.animations.counts ) ) {
		c.record_ids.filter( ( id ) => ! ids.has( id ) ).forEach( ( id ) => problems.push( `count ${ cat } names ${ id }, which no record has` ) );
	}
	for ( const [ cat, c ] of Object.entries( { routes: inv.surfaces.counts.routes, toggling_sc_ifs: inv.surfaces.counts.toggling_sc_ifs } ) ) {
		Object.entries( c.covered_by ).filter( ( [ , id ] ) => ! ids.has( id ) ).forEach( ( [ k, id ] ) => problems.push( `count ${ cat } covers ${ k } with ${ id }, which no record has` ) );
	}
	return problems;
}

// Schema problems of both inventories against the master schemas (handoff-schema/*.schema.json), prefixed per file.
export function validateInventory( inv, { schemas = MASTER_SCHEMAS } = {} ) {
	const ajv = loadAjv();
	return [
		...schemaProblems( ajv, path.join( schemas, 'animations.schema.json' ), inv.animations ).map( ( p ) => `animations: ${ p }` ),
		...schemaProblems( ajv, path.join( schemas, 'surfaces.schema.json' ), inv.surfaces ).map( ( p ) => `surfaces: ${ p }` ),
	];
}

// The unsampled inventory of a census, built once: { head, census, pv, core }. `folder` (the export) gives the hashes,
// the project and the drafts' data-props. withSamples turns it into the inventory.
export function inventoryBase( { census, folder, routing = null, pageRows = null, notDefects = [], generated = new Date().toISOString().slice( 0, 10 ) } ) {
	const manifest = readJson( path.join( folder, 'MANIFEST.json' ) ).data || {};
	const pv = propVariants( { folder, census } );
	const core = inventoryCore( census, { routing, notDefects, props: pv.props, pageRows } );
	const hash = ( f ) => sha256( fs.readFileSync( path.join( folder, f ) ) );
	const head = { schema_version: '1.0', project: manifest.project ?? path.basename( path.dirname( folder ) ), generated, runtime_sha256: hash( 'support.js' ) };
	return { head, drafts: census.sources.map( ( s ) => ( { dc: s.component, file: s.file, sha256: hash( s.file ) } ) ), pv, core };
}

// The inventory of an inventoryBase with `samples` (from sampleWriters) attached: { animations, surfaces (both in the
// master schemas' shape), occurrences, propVariants, samples, problems (schema and reconciliation), gaps, meta }. A
// sampled record's trace says so.
export function withSamples( { head, drafts, pv, core }, samples = [] ) {
	const sampled = new Set( samples.map( ( s ) => s.recordId ) );
	const records = core.anim.records.map( ( r ) => ( sampled.has( r.id ) ? { ...r, trace: { observed: 'yes', phases: [ ...new Set( samples.filter( ( s ) => s.recordId === r.id ).map( ( s ) => `sampled:${ s.width }` ) ) ], note: 'sampled under the harness clock (inventory.samples)' } } : r ) );
	const inv = {
		animations: { ...head, drafts, records, counts: core.anim.counts, unresolved: core.anim.unresolved },
		surfaces: { ...head, records: core.surf.records, counts: core.surf.counts, unresolved: core.surf.unresolved },
		occurrences: core.occurrences, propVariants: pv.props, samples,
	};
	const problems = [ ...validateInventory( inv ), ...reconcile( inv, { census: core.model.census, jsWriters: core.anim.sites.length } ) ];
	return { ...inv, problems, gaps: pv.gaps, meta: core.anim.meta };
}

// The inventory of a census in one call (inventoryBase, then withSamples).
export function buildInventory( { samples = [], ...rest } ) {
	return withSamples( inventoryBase( rest ), samples );
}

// Claude Design's animations.json and surfaces.json from the export: { animations, surfaces } (null with `<k>Error`
// when unreadable).
export function readTheirs( folder ) {
	const out = {};
	for ( const k of [ 'animations', 'surfaces' ] ) {
		const r = readJson( path.join( folder, `${ k }.json` ) );
		out[ k ] = r.data ?? null;
		if ( r.error ) {
			out[ `${ k }Error` ] = r.error;
		}
	}
	return out;
}

// The construct registry's reader for the motion, trigger and hook kinds (FR-48-24): the occurrence of a census row,
// { recordIds, role, why? }, from the inventory of the census it reads (built once per pair of census rows and sources
// lists). A row the inventory does not map returns null, which the census reports as an empty reader.
const cores = new WeakMap();
export function readInventory( row, ctx ) {
	if ( ! cores.has( ctx.rows ) ) {
		cores.set( ctx.rows, new WeakMap() );
	}
	const bySources = cores.get( ctx.rows );
	if ( ! bySources.has( ctx.sources ) ) {
		bySources.set( ctx.sources, new Map( inventoryCore( { rows: ctx.rows, sources: ctx.sources } ).occurrences.map( ( o ) => [ o.occurrence, o ] ) ) );
	}
	const o = bySources.get( ctx.sources ).get( row.id );
	return o?.recordIds.length ? { recordIds: o.recordIds, role: o.role, ...( o.why ? { why: o.why } : {} ) } : null;
}

// The intake stage (lib/intake-run-stages.mjs, after the draft defects): the census widened to every page, timer and
// frame writers sampled on the entry page at each width, the inventory built and validated, and Claude Design's copies
// diffed. Returns the stage parts { inventory: { animations, surfaces, diff, occurrences, propVariants, samples }, gaps,
// blocked, note }.
export async function inventoryStage( job, ctx ) {
	const census = await inventoryCensus( { folder: job.folder, entry: job.entry, routing: ctx.routing, census: ctx.censusFull, harPath: job.harPath } );
	const gaps = [ ...census.gaps ];
	const base = inventoryBase( { census, folder: job.folder, routing: ctx.routing, pageRows: ctx.pageMap ?? null, notDefects: ctx.notDefects || [] } );
	const sampled = await sampleWriters( { folder: job.folder, index: job.entry, harPath: job.harPath, targets: sampleTargets( base.core.anim.records, base.core.anim.meta ), widths: job.widths } );
	gaps.push( ...sampled.gaps );
	const inv = withSamples( base, sampled.samples );
	gaps.push( ...inv.gaps, ...inv.problems.map( ( p ) => ( { construct: 'inventory', draftId: job.entry, error: p } ) ) );
	const diff = diffInventory( inv, readTheirs( job.folder ) );
	const kinds = {};
	inv.animations.records.forEach( ( r ) => ( kinds[ r.id.split( '-' )[ 0 ] ] = ( kinds[ r.id.split( '-' )[ 0 ] ] || 0 ) + 1 ) );
	return {
		inventory: { animations: inv.animations, surfaces: inv.surfaces, diff, occurrences: inv.occurrences, propVariants: inv.propVariants, samples: inv.samples },
		gaps, blocked: census.blocked,
		note: `${ inv.animations.records.length } animation records (${ Object.entries( kinds ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) }), ${ inv.surfaces.records.length } surfaces, ${ inv.occurrences.length } occurrences, ${ inv.samples.length } samples, ${ diff.length } diff rows, ${ inv.problems.length } problems`,
	};
}
