// The missing-features list (Spec 48 FR-48-34, DESIGN decision 7): one line per construct the draft uses that no SGS
// block or feature holds. Bean marks each `map:<block>`, `difference` or `build` (Appendix C); stage 1 builds only what
// stops a main flow (buy, contact, apply), so each row carries `mainFlow`. Rows come from two places, each rule below
// kept conservative so a construct SGS holds is never listed as missing:
//   1. Skeleton proposal rows (lib/skeleton-propose.mjs::proposeSkeleton) with `action: 'unresolved'`, or with no
//      action, no block and no candidate: no block fits that element. Removed and absorbed rows are never listed.
//   2. Census constructs (lib/intake-census.mjs) in one of two cases:
//      a. their kind's registry entry is a gap that is NOT instrument debt. A gap whose reason names a later build step
//         ("lands with", "not built", an FR or an Appendix B step) is a reader not yet written, not a missing feature.
//      b. a handler whose code implements a pointer or hover behaviour (BEHAVIOURS: its event, plus what the handler's
//         body reads or writes in the syntax tree), when the framework database holds no capability or effect named
//         by that behaviour's keywords. A matching capability or effect puts the row in `held` (with the candidates),
//         never in the list. Click, change and submit handlers are never listed here: menus, forms and toggles are
//         held by SGS blocks and reach this list only through rule 1.
//   3. Seen but unsupported (clone coverage plan Phase 1, step 1.2): every HTML element (from the skeleton rows) and
//      every construct kind (from the census) whose capability ID (`html:<tag>`, `construct:<kind>`) the clone coverage
//      map does not cover, one row per ID with its count, so nothing the draft holds is dropped silently. A gap names
//      its wave, an exclusion Bean's reason; an ID the map does not hold at all says so.
import { loadRegistry } from './intake-registry.mjs';
import { walkAst } from './intake-census-logic.mjs';
import { buildModel, codeTarget } from './intake-census-map.mjs';
import { statusOf } from './clone-coverage.mjs';

// A registry gap reason that is instrument debt (a reader to be built), not a feature SGS lacks.
export const INSTRUMENT_DEBT = /\b(?:lands with|not built|reader|Appendix B|FR-\d)/i;
const POINTER_READS = new Set( [ 'clientX', 'clientY', 'pageX', 'pageY', 'offsetX', 'offsetY', 'movementX', 'movementY', 'screenX', 'screenY', 'beta', 'gamma', 'deltaX', 'deltaY', 'touches' ] );
const MOTION_WRITES = new Set( [ 'transform', 'translate', 'rotate', 'scale', 'playbackRate', 'animationDuration', 'animationPlayState', 'updatePlaybackRate', 'animate' ] );
const POINTER_EVENTS = [ 'mousemove', 'pointermove', 'touchmove', 'deviceorientation', 'wheel' ];
const HOVER_EVENTS = [ 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'pointerenter', 'pointerleave' ];
// Behaviours by event and body evidence: `rotate`/`translate` are words the handler's string literals hold.
export const BEHAVIOURS = [
	{ id: 'pointer-tilt', line: 'tilts with the pointer', events: POINTER_EVENTS, reads: true, words: /rotate|perspective/, keywords: [ 'tilt' ] },
	{ id: 'pointer-follow', line: 'follows the pointer (a magnetic or cursor-led element)', events: POINTER_EVENTS, reads: true, words: /translate/, keywords: [ 'magnet', 'cursor' ] },
	{ id: 'pointer-tracking', line: 'reacts to the pointer position', events: POINTER_EVENTS, reads: true, keywords: [] },
	{ id: 'hover-speed', line: 'changes an animation\'s speed on hover', events: HOVER_EVENTS, writes: [ 'playbackRate', 'updatePlaybackRate', 'animationDuration', 'animationPlayState' ], keywords: [ 'marquee' ] },
	{ id: 'hover-motion', line: 'animates from code on hover', events: HOVER_EVENTS, writes: [ 'animate', 'transform', 'translate', 'rotate', 'scale' ], keywords: [] },
];
const FLOWS = [
	[ 'buy', /\b(?:basket|cart|checkout|buy|add to (?:basket|cart|bag)|purchase|payment|place order|order now)\b/i ],
	[ 'apply', /\b(?:apply|application|trade account|open an account|register|sign ?up)\b/i ],
	[ 'contact', /\b(?:contact|enquir\w*|message|get in touch|call ?back|send|submit|request a quote)\b/i ],
];
const FLOW_TAGS = new Set( [ 'form', 'button', 'input', 'select', 'textarea', 'a' ] );

// The main flow a construct sits in, or null: only an interactive element (a form, a control, a link) sits in a flow.
// A form or a submit control whose words name no flow sends a message: `contact`.
export function mainFlowOf( { tag, words = '', attrs = {}, context = '' } ) {
	if ( ! FLOW_TAGS.has( tag ) ) {
		return null;
	}
	const text = `${ words } ${ context }`;
	const hit = FLOWS.find( ( [ , rx ] ) => rx.test( text ) );
	if ( hit ) {
		return hit[ 0 ];
	}
	return 'form' === tag || 'submit' === String( attrs.type || '' ).toLowerCase() ? 'contact' : null;
}

// `<chain>/<n>#<copy>` (tplKeyOf) to `<component>:<n>`; null for another shape.
export function draftIdOfKey( key ) {
	const m = /^(.+)\/(\d+)#\d+$/.exec( String( key || '' ) );
	return m ? `${ m[ 1 ].split( '>' ).pop().replace( /[@#].*$/, '' ) }:${ m[ 2 ] }` : null;
}

const attrsOf = ( row ) => ( Array.isArray( row.attrs ) ? Object.fromEntries( row.attrs ) : row.attrs || {} );

// Rule 1: the skeleton rows no block fits.
export function skeletonMissing( skeletonRows ) {
	return skeletonRows.filter( ( r ) => ! [ 'remove', 'absorbed' ].includes( r.action ) && ( 'unresolved' === r.action || ( ! r.action && ! r.block && ! r.candidates?.length ) ) ).map( ( r ) => {
		const draftId = r.draftId || draftIdOfKey( r.key ) || r.key;
		const words = String( r.words || '' ).trim();
		return {
			rowId: `missing:${ draftId }`, draftId, construct: `element <${ r.tag }>`, from: 'skeleton', key: r.key,
			line: `<${ r.tag }>${ words ? ` "${ words.slice( 0, 60 ) }"` : '' }: no SGS block fits it`,
			mainFlow: mainFlowOf( { tag: r.tag, words, attrs: attrsOf( r ) } ), why: r.reason || 'the skeleton proposal has no block candidate for this element',
		};
	} );
}

// The body a handler row runs, found by the census's own mapper (lib/intake-census-map.mjs::codeTarget: class
// members, addEventListener locals and inline listeners, loop-item handlers through renderVals keys): the function
// body node starting at the offset it maps the row to, or null.
function handlerBody( model, row, rowsByComp ) {
	const t = codeTarget( row, model, rowsByComp );
	if ( t.gap ) {
		return null;
	}
	return model.get( t.comp ).nodes.filter( ( n ) => n.start === t.off ).sort( ( x, y ) => ( y.end - y.start ) - ( x.end - x.start ) )[ 0 ] || null;
}

// What a handler body reads and writes: { reads: Set, writes: Set, words: 'the string literals' }.
export function bodyEvidence( body ) {
	const out = { reads: new Set(), writes: new Set(), words: '' };
	walkAst( body, ( n ) => {
		if ( 'MemberExpression' === n.type && ! n.computed && n.property.name ) {
			const p = n.property.name;
			if ( POINTER_READS.has( p ) ) {
				out.reads.add( p );
			}
			if ( MOTION_WRITES.has( p ) ) {
				out.writes.add( p );
			}
		} else if ( 'StringLiteral' === n.type || 'TemplateElement' === n.type ) {
			out.words += ` ${ 'StringLiteral' === n.type ? n.value : n.value.cooked ?? n.value.raw }`;
		} else if ( 'ObjectProperty' === n.type && ! n.computed && MOTION_WRITES.has( n.key.name ?? n.key.value ) ) {
			out.writes.add( n.key.name ?? n.key.value );
		}
	} );
	return out;
}

// The behaviour a handler row implements (a BEHAVIOURS entry), or null. `source` is the row's census source; `ctx`
// ({ model, rowsByComp }) reuses a model built once for the whole census.
export function behaviourOf( source, row, ctx = null ) {
	const event = String( row.detail.event || '' ).replace( /^on/i, '' ).toLowerCase();
	const fits = BEHAVIOURS.filter( ( b ) => b.events.includes( event ) );
	if ( ! fits.length ) {
		return null;
	}
	const model = ctx?.model || buildModel( [ { scripts: [], ...source } ] );
	const body = handlerBody( model, row, ctx?.rowsByComp || new Map() );
	if ( ! body ) {
		return null;
	}
	const ev = bodyEvidence( body );
	return fits.find( ( b ) => ( ! b.reads || ev.reads.size ) && ( ! b.writes || b.writes.some( ( w ) => ev.writes.has( w ) ) ) && ( ! b.words || b.words.test( ev.words ) ) ) || null;
}

// The framework features named by a behaviour's keywords: block capabilities and fx effects (read-only queries).
export function heldBy( facts, behaviour ) {
	if ( ! facts?.q || ! behaviour.keywords.length ) {
		return [];
	}
	const out = [];
	for ( const k of behaviour.keywords ) {
		facts.q( 'SELECT DISTINCT block_slug, capability FROM block_capabilities WHERE capability LIKE ?', `%${ k }%` ).forEach( ( r ) => out.push( `${ r.block_slug } (capability ${ r.capability })` ) );
		facts.q( 'SELECT effect FROM fx_effects WHERE effect LIKE ?', `%${ k }%` ).forEach( ( r ) => out.push( `fx ${ r.effect }` ) );
	}
	return [ ...new Set( out ) ];
}

// Rule 2: the census constructs no SGS feature holds. Returns { rows, held }.
export function censusMissing( census, { facts = null, registry = loadRegistry() } = {} ) {
	const rows = [];
	const held = [];
	const source = new Map( ( census.sources || [] ).map( ( s ) => [ s.component, s ] ) );
	const ctx = { model: buildModel( census.sources || [] ), rowsByComp: new Map() };
	census.rows.forEach( ( r ) => ctx.rowsByComp.set( r.component, [ ...( ctx.rowsByComp.get( r.component ) || [] ), r ] ) );
	for ( const r of census.rows ) {
		const gap = registry[ r.kind ]?.gap;
		if ( gap && ! INSTRUMENT_DEBT.test( gap ) ) {
			rows.push( { rowId: `missing:${ r.id || r.draftId }`, draftId: r.draftId, construct: r.kind, from: 'census', censusId: r.id, line: `${ r.kind } at ${ r.draftId }: ${ gap }`, mainFlow: null, why: `the construct registry records ${ r.kind } as a feature gap: ${ gap }` } );
			continue;
		}
		if ( 'handler' !== r.kind || ! source.has( r.component ) ) {
			continue;
		}
		const b = behaviourOf( source.get( r.component ), r, ctx );
		if ( ! b ) {
			continue;
		}
		const candidates = heldBy( facts, b );
		const row = { rowId: `missing:${ r.id || r.draftId }`, draftId: r.draftId, construct: `handler ${ r.detail.event } (${ b.id })`, from: 'census', censusId: r.id, line: `${ r.component }: an element that ${ b.line } (${ r.detail.event }${ r.detail.method ? ` → ${ r.detail.method }` : '' })`, mainFlow: null };
		if ( candidates.length ) {
			held.push( { ...row, candidates, why: `the framework holds a feature named by ${ b.keywords.join( '/' ) }` } );
		} else {
			rows.push( { ...row, why: `${ b.id }: no block capability or fx effect named ${ b.keywords.length ? b.keywords.join( '/' ) : 'for it' } in the framework database` } );
		}
	}
	return { rows, held };
}

// Rule 3: the capabilities the draft uses that the coverage map does not cover (`coverage`: the loaded
// data/clone-coverage.json). One row per capability ID, in first-seen order.
export function coverageMissing( { skeletonRows = [], census = { rows: [] }, coverage } ) {
	const seen = new Map();
	const note = ( id, draftId ) => {
		const s = seen.get( id ) || { id, draftId, count: 0 };
		s.count++;
		seen.set( id, s );
	};
	skeletonRows.filter( ( r ) => r.tag && ! [ 'remove', 'absorbed' ].includes( r.action ) ).forEach( ( r ) => note( `html:${ String( r.tag ).toLowerCase() }`, r.draftId || draftIdOfKey( r.key ) || r.key ) );
	census.rows.forEach( ( r ) => note( `construct:${ r.kind }`, r.draftId || r.id ) );
	const rows = [];
	for ( const { id, draftId, count } of seen.values() ) {
		const e = coverage.entries?.[ id ];
		const status = statusOf( e );
		if ( 'covered' === status ) {
			continue;
		}
		const why = ! e ? `${ id } is not in the clone coverage map: the capability inventory does not list it`
			: 'excluded' === status ? `${ id } is excluded from cloning (Bean, ${ e.excluded.date }: ${ e.excluded.reason })`
				: `${ id } has no clone path yet (has ${ [ 'recognise', 'write', 'check' ].filter( ( k ) => e[ k ] ).join( ', ' ) || 'nothing' }; wave ${ e.wave })`;
		rows.push( { rowId: `missing:coverage:${ id }`, draftId: String( draftId ), construct: id, from: 'coverage', line: `${ id } seen ${ count } time${ 1 === count ? '' : 's' } in the draft: seen but unsupported`, mainFlow: null, count, why } );
	}
	return rows;
}

// The missing-features proposal: { rows: [ { rowId, draftId, construct, line, mainFlow, why } ], held }. Rule 3 runs
// only when `coverage` is passed (the intake stage passes the committed map). Row IDs are unique (a repeat gets `~2`, `~3`).
export function proposeMissingFeatures( { skeletonRows = [], census = { rows: [], sources: [] }, facts = null, registry, coverage = null } ) {
	const c = censusMissing( census, { facts, ...( registry ? { registry } : {} ) } );
	const seen = new Map();
	const cov = coverage ? coverageMissing( { skeletonRows, census, coverage } ) : [];
	const rows = [ ...skeletonMissing( skeletonRows ), ...c.rows, ...cov ].map( ( r ) => {
		const n = ( seen.get( r.rowId ) || 0 ) + 1;
		seen.set( r.rowId, n );
		return 1 === n ? r : { ...r, rowId: `${ r.rowId }~${ n }` };
	} );
	return { rows, held: c.held };
}
