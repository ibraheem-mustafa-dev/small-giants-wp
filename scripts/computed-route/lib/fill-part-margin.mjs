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

// Whether another element of the block is the box the part's margin lies in at a width, so it is not another element the part
// sits beside: it holds the part's whole margin box and starts or ends where that margin box does on the margin's side (the block's
// root element, a nav holding the toggle, drawn exactly as the margin box or stretched wider by a grid track or a flex line). A
// margin on the part's leading or trailing edge moves everything after it in the flow the same way a margin on that box does, and
// nothing precedes it, so the two give one layout. `px` is the part's margin on `side` at that width.
// side: [ axis: x or y, length key: w or h, whether the margin is on the leading edge ].
const SIDES = { 'margin-left': [ 'x', 'w', true ], 'margin-right': [ 'x', 'w', false ], 'margin-top': [ 'y', 'h', true ], 'margin-bottom': [ 'y', 'h', false ] };
const holdsMarginBox = ( reads, part, other, w, side, px ) => {
	const a = reads.widths?.[ w ]?.[ part.id ]?.rect;
	const b = reads.widths?.[ w ]?.[ other.id ]?.rect;
	const [ axis, len, leading ] = SIDES[ side ] ?? [];
	if ( ! a || ! b || ! axis ) {
		return false;
	}
	const [ cross, crossLen ] = 'x' === axis ? [ 'y', 'h' ] : [ 'x', 'w' ];
	const lo = leading ? a[ axis ] - px : a[ axis ];
	const hi = leading ? a[ axis ] + a[ len ] : a[ axis ] + a[ len ] + px;
	const edge = leading ? [ b[ axis ], lo ] : [ b[ axis ] + b[ len ], hi ];
	return Math.abs( edge[ 0 ] - edge[ 1 ] ) <= 1 && b[ axis ] <= lo + 1 && b[ axis ] + b[ len ] >= hi - 1 && b[ cross ] <= a[ cross ] + 1 && b[ cross ] + b[ crossLen ] >= a[ cross ] + a[ crossLen ] - 1;
};

// The widths at which `target` is the only visible in-flow element of the node's block: shown itself, no other element of
// the node outside its own subtree shown unless it is the box the part's margin lies in (a pseudo layer belongs to its element), and no
// child block shown. `margin` is { side, px: { width: pixels } } of the row.
export function soleWidths( { nodes, reads }, rec, target, margin = null ) {
	const own = target.slot ?? '';
	const others = rec.targets.filter( ( t ) => t.id !== target.id && ! ( t.slot ?? '' ).includes( '::' ) && ! ( t.slot ?? '' ).startsWith( `${ own } >` ) && ! ( t.slot ?? '' ).startsWith( `${ own }::` ) );
	return WIDTHS.filter( ( w ) => shown( reads, target, w ) && ! others.some( ( t ) => shown( reads, t, w ) && ! ( margin && holdsMarginBox( reads, target, t, w, margin.side, margin.px[ w ] ?? 0 ) ) ) && ! visibleChildren( { nodes, reads }, rec, w ) );
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
			out.unmapped.push( { ...row, reason: `${ row.reason }; part-margin: the part is not the block's only visible element at ${ apart.join( ', ' ) } (another element of the block or a child block is shown there)` } );
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
