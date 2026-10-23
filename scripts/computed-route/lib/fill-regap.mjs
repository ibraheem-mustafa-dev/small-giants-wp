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
// (lib/fill-prop.mjs::resolveProperty), with no baseline, so every width given is judged. Returns its result.
export function reresolve( { rec, node, target, slot, prop, draft, ctx, state = null, resolver = resolveProperty } ) {
	const calibration = ctx.calFor?.( rec.name ) ?? null;
	const fontPx = Object.fromEntries( WIDTHS.map( ( w ) => [ w, parseFloat( ctx.reads.widths?.[ w ]?.[ target.id ]?.styles?.[ 'font-size' ] ) ] ).filter( ( [ , v ] ) => v ) );
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

