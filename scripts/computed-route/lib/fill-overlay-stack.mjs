// The layers a block took in as its own overlay (lib/skeleton-overlay-layer.mjs; Bean, 2026-11-21), stacked into one read.
//
// In the draft each layer is an element of its own, drawn in document order; the block has one overlay setting, painted at
// one element (the overlay's calibrated slot), whose CSS value is a comma-separated stack with the top layer first. The
// skeleton names the top layer as the slot's draft element (`draftSlots[ slot ]`) and every layer, in drawing order, in
// `draftOverlay.layers`; the lower layers are read as targets of their own (OVERLAY_LAYER_SLOT, lib/fill-skeleton.mjs). This
// pass, made on the draft reads before Fill resolves anything (fill.mjs, beside sumAbsorbedPadding), writes the stacked value
// into the slot's read at every width and in the 16px sweep, drops the slot's declared form of the property (the stack is no
// value the code declares) and removes the lower layers' reads and targets, so the generic resolver writes the stack to the
// overlay setting and the width ladder (lib/fill-width-ladder.mjs) takes a width the one-value setting cannot hold.
// Mutates `reads` and the records' targets; returns one line per node stacked.
import { OVERLAY_LAYER_SLOT } from './fill-skeleton.mjs';

const SHORTHAND = { 'background-image': [ 'background' ], 'background-color': [ 'background' ] };
const painted = ( v ) => null != v && '' !== String( v ).trim() && 'none' !== String( v ).trim();

// The value of the stack from each layer's value in drawing order: the top (last drawn) first, layers painting nothing left out.
export const stackOf = ( values ) => [ ...values ].reverse().filter( painted ).map( ( v ) => String( v ).trim() ).join( ', ' );

export function stackOverlayLayers( reads, nodes ) {
	const lines = [];
	for ( const rec of nodes ) {
		const o = rec.node?.draftOverlay;
		if ( ! o?.slot || ! Array.isArray( o.layers ) || o.layers.length < 2 || ! rec.targets.some( ( t ) => t.slot === o.slot ) ) {
			continue;
		}
		const prop = o.property || 'background-image';
		const partId = `${ rec.index }:${ o.slot }`;
		const ids = o.layers.map( ( f, i ) => ( i === o.layers.length - 1 ? partId : `${ rec.index }:${ OVERLAY_LAYER_SLOT }${ i }` ) );
		for ( const w of Object.keys( reads?.widths || {} ) ) {
			const part = reads.widths[ w ]?.[ partId ]?.styles;
			if ( part ) {
				part[ prop ] = stackOf( ids.map( ( id ) => reads.widths[ w ]?.[ id ]?.styles?.[ prop ] ) ) || 'none';
			}
			const declared = reads.declared?.[ w ]?.[ partId ];
			declared && [ prop, ...( SHORTHAND[ prop ] || [] ) ].forEach( ( n ) => delete declared[ n ] );
			ids.slice( 0, -1 ).forEach( ( id ) => {
				delete reads.widths[ w ]?.[ id ];
				reads.declared?.[ w ] && delete reads.declared[ w ][ id ];
			} );
		}
		const series = ids.map( ( id ) => reads.sweep?.[ id ]?.[ prop ] );
		if ( Array.isArray( series.at( -1 ) ) ) {
			const byWidth = series.map( ( s ) => new Map( ( s || [] ).map( ( x ) => [ x.width, x.value ] ) ) );
			reads.sweep[ partId ][ prop ] = series.at( -1 ).map( ( s ) => ( { ...s, value: stackOf( byWidth.map( ( m ) => m.get( s.width ) ) ) || 'none' } ) );
		}
		ids.slice( 0, -1 ).forEach( ( id ) => reads.sweep && delete reads.sweep[ id ] );
		rec.targets = rec.targets.filter( ( t ) => ! t.slot.startsWith( OVERLAY_LAYER_SLOT ) );
		lines.push( `node ${ rec.index }: ${ prop } read at "${ o.slot }" as the stack of ${ o.layers.length } layers, top first (${ [ ...o.layers ].reverse().map( ( f ) => f.tpl ?? JSON.stringify( f ) ).join( ', ' ) })` );
	}
	return lines;
}
