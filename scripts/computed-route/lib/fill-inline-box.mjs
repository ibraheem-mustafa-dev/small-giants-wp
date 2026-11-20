// An inline-level draft box (display inline-block, inline-flex or inline-grid) against a block that paints block-level (Spec 48
// FR-48-8, Fill's dimension pass). The draft's box shrinks to its content and its parent's `text-align` places it; a block that
// paints block-level and has no `display` setting takes the parent's whole width, so a heading underlined by its own border
// ran across the page where the draft's underline is the text's width. The box's width is the keyword `fit-content` where the
// block's width setting prints one, and a box the draft shows centred in its parent is centred with automatic side margins:
// read from the rendered boxes (the box's centre against its parent's), never from a wrapper's `text-align`, which a block
// that dissolved the wrapper no longer has. Nothing is written when the draft declares a width, the block's own paint is
// inline-level already, or the centring cannot be held (a block with no way to centre it would sit at the left edge, which
// is no nearer the draft than the full-width box).
import { defaultPaint } from './resolve.mjs';
import { WIDTHS, rowValues, rectAt, reresolve, commit } from './fill-regap.mjs';

export const INLINE_LEVEL = /^(?:inline-block|inline-flex|inline-grid|inline-table)$/;
const BLOCK_LEVEL = /^(?:block|flex|grid|flow-root|table)$/;
const NO_WIDTH = new Set( [ '', 'auto', 'fit-content', 'max-content', 'min-content' ] );
const CENTRE_TOLERANCE = 1.5;
const MIN_OFFSET = 2;

// The nearest ancestor node with a measured box (a node with no draft element is read through).
function parentTarget( { nodes, rec } ) {
	for ( let i = rec.parent; null !== i && undefined !== i; i = nodes[ i ].parent ) {
		const t = nodes[ i ].targets.find( ( x ) => '' === ( x.slot ?? '' ) );
		if ( t ) {
			return t;
		}
	}
	return null;
}

// Returns { answered: widths } (written, or already how the block paints), { raise: reason } or null (not this rule's row).
// ctx: { reads, db, calFor, snapshot }; hit: lib/fill-regap.mjs::rowTarget's { rec, target }.
export function inlineBox( { row, hit, nodes, flat, ctx, out, resolver } ) {
	const { rec, target } = hit;
	const { reads } = ctx;
	if ( ! rec || ! target || '' !== ( row.slot ?? '' ) || row.state ) {
		return null;
	}
	const given = rowValues( row, reads, target );
	const widths = WIDTHS.filter( ( w ) => INLINE_LEVEL.test( String( given[ w ] ?? '' ).trim() ) && rectAt( reads, target, w ) );
	if ( ! widths.length ) {
		return null;
	}
	const cal = ctx.calFor( rec.name );
	const paint = defaultPaint( cal, '', 'display' );
	const blockLevel = widths.filter( ( w ) => BLOCK_LEVEL.test( String( paint[ w ] ?? '' ).trim() ) );
	if ( blockLevel.length !== widths.length ) {
		return { raise: `inline-box: the block's own display is ${ widths.map( ( w ) => paint[ w ] ?? 'unknown' ).join( ' / ' ) }, so whether it shrinks to its content as the draft's box does is not proven` };
	}
	const declared = widths.filter( ( w ) => ! NO_WIDTH.has( String( reads.declared?.[ w ]?.[ target.id ]?.width ?? '' ).trim() ) );
	if ( declared.length ) {
		return { raise: `inline-box: the draft declares a width (${ declared.map( ( w ) => reads.declared[ w ][ target.id ].width ).join( ' / ' ) }) on its inline box, which the width settings carry` };
	}
	const node = flat[ rec.index ];
	const parent = parentTarget( { nodes, rec } );
	const centred = widths.filter( ( w ) => {
		const r = rectAt( reads, target, w );
		const p = parent ? rectAt( reads, parent, w ) : null;
		return p && Number.isFinite( r.x ) && Number.isFinite( p.x ) && Math.abs( ( r.x + r.w / 2 ) - ( p.x + p.w / 2 ) ) <= CENTRE_TOLERANCE && r.x - p.x > MIN_OFFSET;
	} );
	const ask = ( prop, widthsFor, value ) => reresolve( { rec, node, target, slot: '', prop, draft: Object.fromEntries( widthsFor.map( ( w ) => [ w, value ] ) ), ctx, resolver } );
	const held = ( res ) => 'written' === res.status || 'equal' === res.status;
	const sides = centred.length ? [ 'margin-left', 'margin-right' ].map( ( prop ) => ( { prop, res: ask( prop, centred, 'auto' ) } ) ) : [];
	const lost = sides.find( ( s ) => ! held( s.res ) );
	if ( lost ) {
		return { raise: `inline-box: the draft centres its box at ${ centred.join( ', ' ) } and ${ rec.name } holds no ${ lost.prop } auto (${ lost.res.gap ?? 'gap' }: ${ lost.res.detail ?? '' }), so the shrunk box would sit at the left edge; a framework setting is needed` };
	}
	const size = ask( 'width', widths, 'fit-content' );
	if ( ! held( size ) ) {
		return { raise: `inline-box: ${ rec.name } has no width setting that prints fit-content (${ size.gap ?? 'gap' }: ${ size.detail ?? '' }), so the box keeps the block's full width` };
	}
	[ { prop: 'width', res: size }, ...sides ].forEach( ( { prop, res } ) => 'written' === res.status && commit( out, { rec, node, row, prop, res, how: 'dimension', note: `the draft's ${ row.value } box shrinks to its content` } ) );
	out.notes.push( `${ row.node } ${ rec.name } display ${ row.value }: width fit-content${ centred.length ? ` and automatic side margins at ${ centred.join( ', ' ) } (the draft centres the box in its parent)` : '' }` );
	return { answered: widths };
}
