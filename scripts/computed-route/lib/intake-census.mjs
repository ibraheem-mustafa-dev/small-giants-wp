// Construct census (Spec 48 FR-48-24, R-47-4, R-48-3). The static pass lists every construct a draft uses, the code
// that never runs included: template constructs from the runtime's own stamped template
// (lib/intake-census-template.mjs) and logic constructs from the syntax tree (lib/intake-census-logic.mjs). Each row is
// { id, kind, draftId, component, detail, source, unreached }; runCensus joins the rows to the construct registry
// (lib/intake-registry.mjs) and passes only when every kind found has an entry, no `unknown` construct exists, and
// every reader returns a non-empty result for each construct of its kind. A reader that throws is a gap row and fails.
// The runtime pass (lib/intake-census-runtime.mjs) adds its sightings with mergeSightings and decides `unreached` with
// markUnreached (applyRuntime); runCensus runs it when given `runtime`.
// METHOD.md §4's regex counts (regexCounts) are a cross-check only; a disagreement is a gap row, never a census row.
import { draftSources, templateRows } from './intake-census-template.mjs';
import { logicRows, scriptRows } from './intake-census-logic.mjs';
import { loadRegistry, readerFor } from './intake-registry.mjs';

export { draftSources };

// The detail that tells two constructs of one kind on one element apart.
const DISCRIMINATOR = {
	binding: ( d ) => `${ d.where }=${ d.expression }`,
	'style-hover': ( d ) => d.pseudo,
	'data-hook': ( d ) => d.name,
	handler: ( d ) => `${ d.wiring }:${ d.event }`,
	transition: ( d ) => `${ d.via }:${ d.selector ?? '' }:${ d.property ?? '' }`,
	keyframes: ( d ) => `${ d.via }:${ d.selector ?? d.name ?? '' }:${ d.property ?? '' }`,
	'helmet-font': ( d ) => `${ d.via }:${ d.href ?? d.family }`,
	link: ( d ) => d.href,
	unknown: ( d ) => d.why,
};

// A row's identity, the same for the static and the runtime pass: `<kind>@<draftId>[/<discriminator>]`.
export const rowId = ( r ) => `${ r.kind }@${ r.draftId }${ DISCRIMINATOR[ r.kind ] ? `/${ DISCRIMINATOR[ r.kind ]( r.detail ) }` : '' }`;

// Sets row.id on every row; a repeated identity gets `~2`, `~3`… in document order.
export function assignIds( rows ) {
	const seen = new Map();
	for ( const r of rows ) {
		const base = rowId( r );
		const n = ( seen.get( base ) || 0 ) + 1;
		seen.set( base, n );
		r.id = 1 === n ? base : `${ base }~${ n }`;
	}
	return rows;
}

// Adds runtime sightings ({ kind, draftId, component, detail }, optionally the `id` of the row it saw) to the static
// rows: a sighting whose id a static row holds makes that row `both`; any other becomes a `runtime` row. Sightings
// without an id get one from assignIds. Returns the merged rows (the inputs are not changed).
export function mergeSightings( rows, sightings ) {
	const out = rows.map( ( r ) => ( { ...r } ) );
	const byId = new Map( out.map( ( r ) => [ r.id, r ] ) );
	const all = sightings.map( ( x ) => ( { ...x } ) );
	assignIds( all.filter( ( x ) => ! x.id ) );
	for ( const s of all ) {
		const hit = byId.get( s.id );
		if ( hit ) {
			hit.source = 'static' === hit.source ? 'both' : hit.source;
		} else {
			const row = { ...s, source: 'runtime', unreached: null };
			out.push( row );
			byId.set( row.id, row );
		}
	}
	return out;
}

// Decides `unreached` for the kinds the runtime pass traces: a static-only row of one of those kinds is unreached
// (a possible draft defect, FR-48-34); every other row of those kinds is reached. Other kinds stay null.
export function markUnreached( rows, { kinds } ) {
	const traced = new Set( kinds );
	return rows.map( ( r ) => ( traced.has( r.kind ) ? { ...r, unreached: 'static' === r.source } : r ) );
}

// The census rows with a runtime pass applied (runtimeCensus's result): its sightings merged once per row, `unreached`
// decided for the kinds it traces, and a row the trace could not decide (a trace gap) left `unreached: null` with
// `traceGap` naming why (R-48-3).
export function applyRuntime( rows, runtime ) {
	const once = new Map();
	for ( const s of runtime.sightings ) {
		const key = s.id || `${ s.kind }@${ s.draftId }`;
		if ( ! once.has( key ) ) {
			once.set( key, { ...( s.id ? { id: s.id } : {} ), kind: s.kind, draftId: s.draftId, component: s.component, detail: s.detail } );
		}
	}
	const gapOf = new Map( runtime.traceGaps.map( ( g ) => [ g.id, g.error ] ) );
	return markUnreached( mergeSightings( rows, [ ...once.values() ] ), { kinds: runtime.kinds } )
		.map( ( r ) => ( gapOf.has( r.id ) && r.unreached ? { ...r, unreached: null, traceGap: gapOf.get( r.id ) } : r ) );
}

// METHOD.md §4's occurrence counts over one text (a cross-check only, never the census).
export function regexCounts( text ) {
	const n = ( re ) => ( text.match( re ) || [] ).length;
	return {
		waapi: n( /\.animate\(/g ),
		transition: n( /transition\s*:/g ),
		pseudo: n( /\sstyle-[a-z-]+=/g ),
		keyframes: n( /@keyframes/g ),
		animation: n( /animation\s*:/g ),
		media: n( /@media/g ),
		addEventListener: n( /addEventListener\(/g ),
		observer: n( /\b(?:Intersection|Resize|Mutation)Observer\b/g ),
		timer: n( /\b(?:setInterval|setTimeout|requestAnimationFrame)\b/g ),
		matchMedia: n( /\bmatchMedia\b/g ),
		ref: n( /\sref=/g ),
		dataAttr: n( /\sdata-(?!dc-|sc-)[a-z0-9-]+=/g ),
		querySelector: n( /querySelector(?:All)?\(/g ),
		scIf: n( /<sc-if\b/g ),
		scFor: n( /<sc-for\b/g ),
		dcImport: n( /<dc-import\b/g ),
	};
}

// Category → [regex count key, text part ('template'|'code'), census row filter]. Code = the logic plus its helmet
// script files.
const CROSS = {
	waapi: [ 'waapi', 'code', ( r ) => 'waapi' === r.kind ],
	timer: [ 'timer', 'code', ( r ) => 'timer' === r.kind ],
	observer: [ 'observer', 'code', ( r ) => 'observer' === r.kind ],
	addEventListener: [ 'addEventListener', 'code', ( r ) => 'handler' === r.kind && 'addEventListener' === r.detail.wiring ],
	'style-hover': [ 'pseudo', 'template', ( r ) => 'style-hover' === r.kind ],
	transition: [ 'transition', 'template', ( r ) => 'transition' === r.kind && ! r.draftId.includes( ':js:' ) && 'transition' === r.detail.property ],
	keyframes: [ 'keyframes', 'template', ( r ) => 'keyframes' === r.kind && '@keyframes' === r.detail.via ],
	animation: [ 'animation', 'template', ( r ) => 'keyframes' === r.kind && ! r.draftId.includes( ':js:' ) && 'animation' === r.detail.property ],
	ref: [ 'ref', 'template', ( r ) => 'ref' === r.kind ],
	'data-hook': [ 'dataAttr', 'template', ( r ) => 'data-hook' === r.kind ],
	'sc-if': [ 'scIf', 'template', ( r ) => 'sc-if' === r.kind ],
	'sc-for': [ 'scFor', 'template', ( r ) => 'sc-for' === r.kind ],
	'dc-import': [ 'dcImport', 'template', ( r ) => 'dc-import' === r.kind ],
};

// Per draft and category: { component, category, regex, census }, and a gap row for each disagreement.
export function crossCheck( sources, rows ) {
	const table = [];
	const gaps = [];
	for ( const s of sources ) {
		const files = new Set( [ s.component, ...s.scripts.filter( ( x ) => x.file ).map( ( x ) => x.file ) ] );
		const parts = { template: regexCounts( s.template ), code: regexCounts( [ s.logic, ...s.scripts.map( ( x ) => x.text || '' ) ].join( '\n' ) ) };
		for ( const [ category, [ key, part, pick ] ] of Object.entries( CROSS ) ) {
			const census = rows.filter( ( r ) => files.has( r.component ) && ( 'code' === part ? r.draftId.includes( ':js:' ) : ! r.draftId.includes( ':js:' ) ) && pick( r ) ).length;
			const regex = parts[ part ][ key ];
			table.push( { component: s.component, category, regex, census } );
			if ( regex !== census ) {
				gaps.push( { construct: category, draftId: s.component, error: `METHOD.md §4 regex count ${ regex }, census ${ census } (cross-check disagreement)` } );
			}
		}
	}
	return { table, gaps };
}

// The static pass: { rows, gaps, sources, counts, blocked }. Renders the drafts once in the sandbox (draftSources), parses each
// draft's logic and each helmet script file once (a file loaded by several drafts is read once).
export async function staticCensus( { folder, entry, harPath = null, sandbox = null, timeout = 60000 } ) {
	const sources = await draftSources( { folder, entry, harPath, sandbox, timeout } );
	const rows = [];
	const gaps = [];
	const scriptsDone = new Set();
	for ( const s of sources ) {
		const logic = logicRows( s );
		const handlerOf = ( expression ) => {
			const v = logic.model.valueOf.get( expression );
			return { method: v?.method || ( logic.model.members.has( expression ) ? expression : null ), value: v?.type ?? null };
		};
		rows.push( ...templateRows( s, { handlerOf } ), ...logic.rows );
		gaps.push( ...logic.gaps );
		for ( const sc of s.scripts ) {
			if ( sc.error ) {
				gaps.push( { construct: 'helmet-script', draftId: `${ s.component }:${ sc.src }`, error: sc.error } );
			} else if ( ! scriptsDone.has( sc.file ) ) {
				scriptsDone.add( sc.file );
				const r = scriptRows( { component: sc.file, text: sc.text } );
				rows.push( ...r.rows );
				gaps.push( ...r.gaps );
			}
		}
	}
	rows.forEach( ( r ) => Object.assign( r, { source: 'static', unreached: null } ) );
	assignIds( rows );
	const cross = crossCheck( sources, rows );
	gaps.push( ...cross.gaps );
	return { rows, gaps, sources, counts: cross.table, blocked: sources.blocked || [] };
}

const isEmpty = ( v ) => null == v || '' === v || ( Array.isArray( v ) && ! v.length ) || ( 'object' === typeof v && ! Array.isArray( v ) && ! Object.keys( v ).length );

// The census: joins the static rows (or `census`, an earlier staticCensus result) to the registry and runs each
// reader on each construct of its kind. `readers` ({ kind: fn }) overrides a registry reader; `root` is where reader
// modules resolve (readerFor). `runtime` ({ visits, widths, harPath, harness }) adds the runtime pass
// (lib/intake-census-runtime.mjs): rows then carry source static|runtime|both and `unreached`, and a visit that fails
// is a problem. Returns { rows, gaps, problems, pass, sources, counts, runtime, blocked } (`blocked`: the static pass's aborted requests): each row carries `reader`
// ('<module>#<fn>') or `gap` (the registry's reason, or the reader's error).
export async function runCensus( { folder, entry, registry = null, root, readers = {}, harPath = null, sandbox = null, census = null, timeout = 60000, runtime = null } ) {
	const reg = registry || loadRegistry();
	const base = census || await staticCensus( { folder, entry, harPath, sandbox, timeout } );
	const gaps = [ ...base.gaps ];
	const problems = [];
	let run = null;
	let rows = base.rows.map( ( r ) => ( { ...r } ) );
	if ( runtime ) {
		const { runtimeCensus } = await import( './intake-census-runtime.mjs' );
		run = await runtimeCensus( { folder, entry, timeout, ...runtime, harPath: runtime.harPath ?? harPath, census: base } );
		rows = applyRuntime( rows, run );
		gaps.push( ...run.gaps );
		run.gaps.filter( ( g ) => 'runtime-visit' === g.construct ).forEach( ( g ) => problems.push( `runtime visit ${ g.draftId } failed: ${ g.error }` ) );
	}
	const kinds = [ ...new Set( rows.map( ( r ) => r.kind ) ) ];
	for ( const kind of kinds ) {
		const of = rows.filter( ( r ) => r.kind === kind );
		if ( 'unknown' === kind ) {
			of.forEach( ( r ) => problems.push( `unknown construct at ${ r.draftId }: ${ r.detail.why }${ r.detail.text ? ` (${ r.detail.text })` : '' }` ) );
			continue;
		}
		const entry = reg[ kind ];
		if ( ! entry ) {
			problems.push( `unread kind ${ kind }: no registry entry (${ of.length } construct${ 1 === of.length ? '' : 's' }, first ${ of[ 0 ].draftId })` );
			continue;
		}
		if ( entry.gap ) {
			of.forEach( ( r ) => ( r.gap = entry.gap ) );
			continue;
		}
		const name = `${ entry.module }#${ entry.fn }`;
		let fn = readers[ kind ];
		if ( ! fn ) {
			try {
				fn = await readerFor( entry, { root } );
			} catch ( e ) {
				problems.push( `reader for ${ kind } (${ name }) cannot load: ${ e.message }` );
				of.forEach( ( r ) => {
					r.gap = e.message;
					gaps.push( { construct: kind, draftId: r.draftId, error: e.message } );
				} );
				continue;
			}
		}
		for ( const r of of ) {
			let result;
			try {
				result = await fn( r, { rows: base.rows, sources: base.sources } );
			} catch ( e ) {
				const error = e?.message || String( e );
				r.gap = error;
				gaps.push( { construct: kind, draftId: r.draftId, error } );
				problems.push( `reader ${ name } threw on ${ kind } ${ r.draftId }: ${ error }` );
				continue;
			}
			r.reader = name;
			if ( isEmpty( result ) ) {
				problems.push( `empty reader ${ kind } ${ r.draftId } (${ name })` );
			}
		}
	}
	return { rows, gaps, problems, pass: ! problems.length, sources: base.sources, counts: base.counts, runtime: run, blocked: base.blocked || [] };
}
