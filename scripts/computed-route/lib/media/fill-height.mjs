// Spec 49 §11 rows 2 and 3, and §7.2's Fill: when a draft media element's height is the layout's, not the file's.
// A pure module; nothing in the live route calls it until Stage B's switch-over.
//
// Read shape (`e`): { declared: { height, 'aspect-ratio' }, box: { w, h }, natural: { w, h } | null,
//   parent: { display, alignItems, definiteHeight: boolean } }.
// Returns { fill, inertHeight, reason }:
//   fill           write Height Fill ("Match its space")
//   inertHeight    `height:100%` of an indefinite parent computes to auto in the draft, so no Height is written (the file keeps its own size)
const GRID_OR_FLEX = [ 'flex', 'inline-flex', 'grid', 'inline-grid' ];
const STRETCHES = [ 'stretch', 'normal', '', undefined ];

/**
 * @param {Object} e Element read.
 * @return {{fill:boolean, inertHeight:boolean, reason:string}} Verdict.
 */
export function heightFill( e ) {
	const declared = String( e?.declared?.height ?? '' ).trim();
	const parent = e?.parent || {};
	if ( '100%' === declared ) {
		return parent.definiteHeight
			? { fill: true, inertHeight: false, reason: 'height:100% of a definite parent' }
			: { fill: false, inertHeight: true, reason: 'height:100% of an indefinite parent' };
	}
	if ( declared || e?.declared?.[ 'aspect-ratio' ] ) {
		return { fill: false, inertHeight: false, reason: 'the draft declares its own height or ratio' };
	}
	const natural = e?.natural;
	const box = e?.box;
	if ( ! natural || ! box || ! ( natural.w > 0 ) || ! ( box.w > 0 ) ) {
		return { fill: false, inertHeight: false, reason: 'no natural size to compare the frame with' };
	}
	const ownHeight = ( natural.h / natural.w ) * box.w;
	const stretched = GRID_OR_FLEX.includes( parent.display ) && STRETCHES.includes( parent.alignItems ) && box.h > ownHeight * 1.02;
	return stretched
		? { fill: true, inertHeight: false, reason: `a stretched ${ parent.display } row gives the frame ${ Math.round( box.h ) }px; the file's own height there is ${ Math.round( ownHeight ) }px` }
		: { fill: false, inertHeight: false, reason: "the frame is the file's own height" };
}
