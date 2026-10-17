// Entrance start (Spec 38A): a block with an entrance that the draft shows at rest while live still
// holds it hidden is one whose draft plays its entrance on page load, where live waits for the block to scroll into
// view (About, 2026-10-04: the credential column at 375 sat below the fold, opacity 1 on the draft and 0 live).

// The rest values a played entrance leaves, per property.
const SHOWN = {
	opacity: ( v ) => 1 === Number( v ),
	translate: ( v ) => 'none' === v || /^0px( 0px)?$/.test( String( v ) ),
	transform: ( v ) => 'none' === v,
};
// The live values a waiting entrance holds.
const HIDDEN = {
	opacity: ( v ) => 0 === Number( v ),
	translate: ( v ) => ! SHOWN.translate( v ),
	transform: ( v ) => ! SHOWN.transform( v ),
};

// The shortest first viewport the walker measures (a phone); an element whose top edge sits at or below it, at scrollY 0,
// is a below-the-fold element.
export const FIRST_VIEWPORT_HEIGHT = 812;

// The live element's rect at scrollY 0 for each width a group was measured at: { [width]: { y, h } }. `y` is the
// document offset the walker's snapshot box records (viewport offset plus scrollY). Empty when no run holds a live box.
export function groupRects( report, g ) {
	const rects = {};
	for ( const run of report?.runs || [] ) {
		const box = run.pairs?.[ g.pair ]?.live?.box;
		if ( box && Number.isFinite( box.y ) ) {
			rects[ run.width ] = { y: box.y, h: box.h };
		}
	}
	return rects;
}

// True only when the element starts inside the first viewport at EVERY measured width; no rect means unknown, so false.
const inFirstViewport = ( rects ) => {
	const all = Object.values( rects || {} );
	return all.length > 0 && all.every( ( r ) => Number.isFinite( r?.y ) && r.y < ( r.vh ?? FIRST_VIEWPORT_HEIGHT ) );
};

// g: a writable group (lib/solve-rows.mjs::writableGroups); node: its tree node; perWidth: the draft values; rects: the
// live element's rect per width at scrollY 0 (`groupRects`; defaults to g.rects). The cloning route writes no motion
// between Spec 38A M6.6 and M7 (the only motion attribute is `sgsMotion`, written by the M7 route), so this always
// returns null: no attribute is written for an entrance that the draft shows at rest and live holds hidden.
export function entranceStart( g, node, perWidth, rects = g.rects ) {
	void g; void node; void perWidth; void rects;
	return null;
}
