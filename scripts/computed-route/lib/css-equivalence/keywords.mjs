// Layer 2 of the equivalence engine (Spec 48 FR-48-86), alignment keywords: `flex-start` and `start`, and `flex-end` and
// `end`, align an item to the same edge wherever the axis they align along is not reversed (CSS Box Alignment 3 §4.3,
// §5.1). In a grid container the `flex-*` values behave as `start` and `end`. In a flex container a cross-axis value
// (align-items, align-content) differs only under `flex-wrap: wrap-reverse`, which swaps cross-start and cross-end, and a
// main-axis value (justify-content) only under a `*-reverse` flex-direction, which swaps main-start and main-end; where the
// context that decides it is unread, the two stay different. ctx: { display, 'flex-wrap', 'flex-direction' } of the
// element the value is declared on, each a computed value.
const CROSS = [ 'align-items', 'align-content' ];
const MAIN = [ 'justify-content' ];
const FLEX_SIDE = { 'flex-start': 'start', 'flex-end': 'end' };

// The keyword an alignment value paints as in its context: `start` or `end` for a `flex-*` value where the two agree,
// else the value itself.
export function alignmentCanon( prop, value, ctx = {} ) {
	const v = String( value ?? '' ).trim().toLowerCase();
	const side = FLEX_SIDE[ v ];
	if ( ! side || ! [ ...CROSS, ...MAIN ].includes( prop ) ) {
		return v;
	}
	const display = String( ctx.display ?? '' ).trim();
	if ( /(?:^|-)grid$/.test( display ) ) {
		return side;
	}
	if ( ! /(?:^|-)flex$/.test( display ) ) {
		return v;
	}
	const axis = CROSS.includes( prop ) ? ctx[ 'flex-wrap' ] : ctx[ 'flex-direction' ];
	if ( undefined === axis || null === axis || '' === String( axis ).trim() ) {
		return v;
	}
	const reversed = CROSS.includes( prop ) ? 'wrap-reverse' === String( axis ).trim() : /-reverse$/.test( String( axis ).trim() );
	return reversed ? v : side;
}

// Whether two alignment values of `prop` align to the same edge in the context ctx.
export const sameAlignment = ( prop, a, b, ctx = {} ) => alignmentCanon( prop, a, ctx ) === alignmentCanon( prop, b, ctx );
