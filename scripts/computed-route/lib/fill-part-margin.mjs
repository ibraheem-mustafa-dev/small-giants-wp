// A margin the draft states on one of a block's parts only at some read widths (Spec 48 FR-48-50). The residual pass refuses a
// layout property the draft states at some widths only (lib/fill-residual-css.mjs), and no setting of the block paints a margin on
// a part below its root. Where the part is the only visible in-flow element the block draws at a width (the block's other draft
// elements are hidden there, and so are its child blocks), a margin on it moves the block's whole box by the same amount, which
// is what the block's own `margin` setting on its root does: the row is asked of the root's margin through the same resolver
// (lib/fill-regap.mjs::reresolve), so the value is formatted, tiered and checked as in the first pass, written only at the
// devices the draft states it at. A margin the draft states at every read width is the residual pass's, as before.
// Returns { writes, unmapped (the rows left), answered (lib/fill-regap.mjs::answer), notes }.
import { WIDTHS, rowTarget, rowValues, reresolve, commit, perNode, regroup, answer } from './fill-regap.mjs';
import { visibleChildren } from './fill-width-ladder.mjs';

const SIDE_MARGIN = /^margin-(top|right|bottom|left)$/;
const NO_SETTING = /^no-setting\b/;

// Whether a draft element is drawn in the flow at a width.
const shown = ( reads, target, w ) => {
	const r = reads.widths?.[ w ]?.[ target.id ];
	return !! r && ! r.missing && !! r.rect && r.rect.w > 0 && r.rect.h > 0 && false !== r.inFlow;
};

// Whether another element of the block is the part's own margin box at a width: the part sits inside it with no room of its own
// beside it (the block's root element, a nav holding only its toggle). `px` is the part's margin on `side` at that width.
// side: [ leading edge key (x or y; none for a trailing side), length key ].
const SIDES = { 'margin-left': [ 'x', 'w' ], 'margin-right': [ null, 'w' ], 'margin-top': [ 'y', 'h' ], 'margin-bottom': [ null, 'h' ] };
const sameBox = ( reads, part, other, w, side, px ) => {
	const a = reads.widths?.[ w ]?.[ part.id ]?.rect;
	const b = reads.widths?.[ w ]?.[ other.id ]?.rect;
	const [ lead, len ] = SIDES[ side ] ?? [];
	if ( ! a || ! b || ! len ) {
		return false;
	}
	const box = { ...a, [ len ]: a[ len ] + px, ...( lead ? { [ lead ]: a[ lead ] - px } : {} ) };
	return [ 'x', 'y', 'w', 'h' ].every( ( k ) => Math.abs( box[ k ] - b[ k ] ) <= 1 );
};

// The widths at which `target` is the only visible in-flow element of the node's block: shown itself, no other element of
// the node outside its own subtree shown unless it is the part's own margin box (a pseudo layer belongs to its element), and no
// child block shown. `margin` is { side, px: { width: pixels } } of the row.
export function soleWidths( { nodes, reads }, rec, target, margin = null ) {
	const own = target.slot ?? '';
	const others = rec.targets.filter( ( t ) => t.id !== target.id && ! ( t.slot ?? '' ).includes( '::' ) && ! ( t.slot ?? '' ).startsWith( `${ own } >` ) && ! ( t.slot ?? '' ).startsWith( `${ own }::` ) );
	return WIDTHS.filter( ( w ) => shown( reads, target, w ) && ! others.some( ( t ) => shown( reads, t, w ) && ! ( margin && sameBox( reads, target, t, w, margin.side, margin.px[ w ] ?? 0 ) ) ) && ! visibleChildren( { nodes, reads }, rec, w ) );
}

export function partMarginWrites( { nodes, flat, refOf, reads, db, unmapped, calFor = () => null, snapshot = null, resolver } ) {
	const out = { writes: [], unmapped: [], answered: [], notes: [] };
	const ctx = { reads, db, calFor, snapshot };
	for ( const row of perNode( unmapped ) ) {
		const hit = SIDE_MARGIN.test( row.property ?? '' ) && NO_SETTING.test( row.reason ?? '' ) && ! row.state && '' !== ( row.slot ?? '' ) ? rowTarget( { nodes, flat, refOf }, row ) : null;
		const root = hit?.rec.targets.find( ( t ) => '' === ( t.slot ?? '' ) );
		const widths = hit ? WIDTHS.filter( ( w ) => shown( reads, hit.target, w ) ) : [];
		// A margin at every read width is the residual pass's; one at none has nothing to write.
		if ( ! root || ! widths.length || widths.length === WIDTHS.length ) {
			out.unmapped.push( row );
			continue;
		}
		const { rec, target } = hit;
		const all = rowValues( row, reads, target );
		const sole = soleWidths( { nodes, reads }, rec, target, { side: row.property, px: Object.fromEntries( widths.map( ( w ) => [ w, parseFloat( all[ w ] ) || 0 ] ) ) } );
		const apart = widths.filter( ( w ) => ! sole.includes( w ) );
		if ( apart.length ) {
			out.unmapped.push( row );
			continue;
		}
		const draft = Object.fromEntries( widths.filter( ( w ) => undefined !== all[ w ] ).map( ( w ) => [ w, all[ w ] ] ) );
		if ( Object.keys( draft ).length !== widths.length ) {
			out.unmapped.push( row );
			continue;
		}
		const node = flat[ rec.index ];
		const res = reresolve( { rec, node, target: root, fallback: target, slot: '', prop: row.property, draft, ctx, resolver } );
		if ( 'written' !== res.status ) {
			out.unmapped.push( { ...row, reason: `${ row.reason }; part-margin: the part is the block's only visible element at ${ widths.join( ', ' ) }, but the block's own margin does not take ${ row.property } ${ Object.values( draft ).join( ' / ' ) } (${ res.status }${ res.gap ? `: ${ res.gap }` : '' })` } );
			continue;
		}
		commit( out, { rec, node, row, prop: row.property, res, how: 'part-margin', note: `${ target.slot } is the block's only visible element at ${ widths.join( ', ' ) }, so its margin is the block's own` } );
		out.notes.push( `${ row.node } ${ rec.name } (${ target.slot }) ${ row.property }: the only visible element of the block at ${ widths.join( ', ' ) }; written as the block's own margin at those devices` );
		out.answered.push( answer( row, widths ) );
	}
	out.unmapped = regroup( out.unmapped );
	return out;
}
