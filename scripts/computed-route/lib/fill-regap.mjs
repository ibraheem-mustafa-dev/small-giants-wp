// The shared pieces of the post-passes that act on a gap row Fill's generic resolver left (lib/fill-width-ladder.mjs,
// lib/fill-dimensions.mjs): the row's node and element, the draft's per-width values for it, one re-resolution of a changed
// draft through the same resolver Fill uses (so a value is formatted, snapped to a token and checked against the setting's
// type exactly as in the first pass), and the write record.
import { resolveProperty } from './fill-prop.mjs';
import { setAttr } from './tree.mjs';

export const WIDTHS = [ 375, 768, 1440 ];
export const TIER_OF = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const NO_BASELINE = '(not painted)';

// The skeleton node and target an unmapped row names, or null.
export function rowTarget( { nodes, flat, refOf }, row ) {
	const rec = nodes.find( ( n ) => refOf( flat[ n.index ] ) === row.node );
	const target = rec?.targets.find( ( t ) => ( t.slot ?? '' ) === ( row.slot ?? '' ) );
	return rec && target ? { rec, target } : null;
}

// A row's per-width values: { 375: v, 768: v, 1440: v } for the widths the row holds ("{\"375\":\"a\"}"), every width for a
// plain value. A width the row omits takes the draft's rendered value there (reads.widths) when the row's property is a
// style Fill reads.
export function rowValues( row, reads, target ) {
	let held;
	try {
		held = JSON.parse( row.value );
	} catch {
		held = null;
	}
	const mapped = held && 'object' === typeof held && ! Array.isArray( held ) && Object.keys( held ).every( ( k ) => WIDTHS.includes( Number( k ) ) );
	const out = {};
	for ( const w of WIDTHS ) {
		const read = reads.widths?.[ w ]?.[ target.id ];
		const v = mapped ? held[ w ] : row.value;
		out[ w ] = undefined !== v ? v : read?.styles?.[ row.property ];
	}
	return Object.fromEntries( Object.entries( out ).filter( ( [ , v ] ) => undefined !== v && '' !== v ) );
}

// The draft's rendered box at a width: { w, h } or null.
export const rectAt = ( reads, target, w ) => {
	const r = reads.widths?.[ w ]?.[ target.id ]?.rect;
	return r && Number.isFinite( r.w ) ? r : null;
};

// Runs the resolver on { width: value } for `prop` on the element at `slot`. The generic resolver's own entry point
// (lib/fill-prop.mjs::resolveProperty), with no baseline, so every width given is judged. The font size an em value is read
// against is `target`'s, else `fallback`'s (the row's own element, when `target` is the written element and has no font-size
// read). Returns its result.
export function reresolve( { rec, node, target, fallback = null, slot, prop, draft, ctx, state = null, resolver = resolveProperty } ) {
	const calibration = ctx.calFor?.( rec.name ) ?? null;
	const fontOf = ( t ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, parseFloat( ctx.reads.widths?.[ w ]?.[ t.id ]?.styles?.[ 'font-size' ] ) ] ).filter( ( [ , v ] ) => v ) );
	const own = fontOf( target );
	const fontPx = Object.keys( own ).length || ! fallback ? own : fontOf( fallback );
	return resolver( { node, block: rec.name, prop, draft, baseline: () => NO_BASELINE, state, slots: [ slot ], calibration, db: ctx.db, snapshot: ctx.snapshot ?? null, log: [], fontPx, siblings: {}, fluid: null, declared: {} } );
}

// Writes a resolver result into the node and records each write; returns the number of settings changed.
export function commit( out, { rec, node, row, prop, res, how, note } ) {
	let changed = 0;
	for ( const w of res.writes ) {
		if ( JSON.stringify( w.value ) === JSON.stringify( node.attributes?.[ w.attr ] ) ) {
			continue;
		}
		const { before, after } = setAttr( node, w );
		changed++;
		out.writes.push( { node: row.node, index: rec.index, block: rec.name, slot: row.slot ?? '', prop, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how, ...( note ? { note } : {} ), ...( w.unit ? { unit: true } : {} ) } );
	}
	return changed;
}


// A row UNMAPPED raises once for several nodes (`nodes`, lib/fill-row-lift.mjs::liftChildren) as one row per node, so a
// pass reads and writes each node it names; regroup() joins the rows a pass leaves back into one row per look and reason.
const GROUP = Symbol( 'group' );
export function perNode( rows ) {
	return rows.flatMap( ( r, i ) => {
		if ( ! ( r.nodes?.length > 1 ) ) {
			return [ r ];
		}
		const { nodes, ...one } = r;
		return nodes.map( ( node ) => ( { ...one, node, [ GROUP ]: i } ) );
	} );
}
export function regroup( rows ) {
	const out = [];
	const at = new Map();
	for ( const r of rows ) {
		if ( undefined === r[ GROUP ] ) {
			out.push( r );
			continue;
		}
		const k = JSON.stringify( [ r[ GROUP ], r.reason ] );
		const { [ GROUP ]: _g, ...row } = r;
		if ( at.has( k ) ) {
			const prior = out[ at.get( k ) ];
			out[ at.get( k ) ] = { ...prior, node: row.node, nodes: [ ...prior.nodes, row.node ] };
		} else {
			at.set( k, out.length );
			out.push( { ...row, nodes: [ row.node ] } );
		}
	}
	return out.map( ( r ) => ( 1 === r.nodes?.length && undefined !== r.nodes ? ( ( { nodes, ...one } ) => one )( r ) : r ) );
}

// What a pass answered for a row: { node, block, slot, readSlot?, property, value, state, widths }, the entry
// lib/fill-report.mjs::passSettled turns into a settled row naming the pass.
export const answer = ( row, widths ) => ( { node: row.node, block: row.block, slot: row.slot ?? '', ...( row.readSlot ? { readSlot: row.readSlot } : {} ), property: row.property, value: row.value, state: row.state ?? null, widths: [ ...new Set( widths.map( Number ) ) ].sort( ( a, b ) => a - b ) } );
