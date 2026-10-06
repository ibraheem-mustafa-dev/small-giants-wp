// Spacing ownership (FR-47-4 step 3). Who owns the space between a parent's children is decided per tier from what
// rendered, never from the draft's CSS: a gap is the distance between consecutive children's border boxes. When every
// gap along an axis is equal the parent owns it (its gap setting holds that value and the children carry no margin on
// that axis); otherwise the parent's gap is 0 and each child takes its own margin.

// Equal means within this many px (the spread of the gaps).
export const EQUAL_PX = 0.5;

const round2 = ( n ) => Math.round( n * 100 ) / 100;
const MARGINS = { 'row-gap': [ 'margin-top', 'margin-bottom' ], 'column-gap': [ 'margin-left', 'margin-right' ] };

// A box that rendered and takes part in flow: not hidden at this tier, not zero-sized, not absolute or fixed.
const flows = ( r ) => !! r && false !== r.inFlow && ( r.w > 0 || r.h > 0 );

// Children grouped into bands along the block direction (a line of a wrapped row, a row of a grid, one box of a stack):
// a box joins the current band while it overlaps it vertically.
function bands( rects ) {
	const sorted = [ ...rects ].sort( ( a, b ) => a.y - b.y || a.x - b.x );
	const out = [];
	for ( const r of sorted ) {
		const cur = out.at( -1 );
		if ( cur && r.y < cur.bottom - EQUAL_PX ) {
			cur.members.push( r );
			cur.bottom = Math.max( cur.bottom, r.y + r.h );
		} else {
			out.push( { members: [ r ], top: r.y, bottom: r.y + r.h } );
		}
	}
	return out;
}

// One axis's decision from its gaps, or null when the axis has none.
function decide( prop, gaps ) {
	if ( ! gaps.length ) {
		return null;
	}
	const spread = Math.max( ...gaps ) - Math.min( ...gaps );
	const mean = gaps.reduce( ( a, b ) => a + b, 0 ) / gaps.length;
	// A negative gap (boxes overlapping through negative margins) can never be a parent's gap.
	const parent = spread <= EQUAL_PX + 1e-9 && mean >= 0;
	return { prop, owner: parent ? 'parent' : 'children', value: parent ? `${ round2( mean ) }px` : '0px', gaps, margins: MARGINS[ prop ] };
}

// rects: the parent's children's border boxes at one tier, in tree order: { x, y, w, h, inFlow? } for a rendered child,
// null for one not rendered at this tier. unmeasured: how many children have no draft element to measure (the list is
// partial, so nothing is decided). Returns { owner, count, decisions }: owner is 'none' (fewer than two children
// render, no gap exists), 'unknown', 'parent', 'children' or 'mixed' (one axis each, in a wrapped or grid layout);
// decisions holds one entry per axis that has gaps: { prop: 'row-gap' (between lines) | 'column-gap' (within a line),
// owner, value (the parent's gap setting: the gap, or 0px when the children own it), gaps (px, each), margins (the sides
// a child would take) }.
export function spacingOwnership( rects, { unmeasured = 0 } = {} ) {
	const shown = rects.filter( flows );
	if ( unmeasured > 0 ) {
		return { owner: 'unknown', count: shown.length, decisions: [] };
	}
	if ( shown.length < 2 ) {
		return { owner: 'none', count: shown.length, decisions: [] };
	}
	const rows = bands( shown );
	const inline = rows.flatMap( ( b ) => {
		const xs = [ ...b.members ].sort( ( p, q ) => p.x - q.x );
		return xs.slice( 1 ).map( ( r, i ) => round2( r.x - ( xs[ i ].x + xs[ i ].w ) ) );
	} );
	const block = rows.slice( 1 ).map( ( b, i ) => round2( b.top - rows[ i ].bottom ) );
	const decisions = [ decide( 'column-gap', inline ), decide( 'row-gap', block ) ].filter( Boolean );
	if ( ! decisions.length ) {
		return { owner: 'none', count: shown.length, decisions };
	}
	const owners = new Set( decisions.map( ( d ) => d.owner ) );
	return { owner: 1 === owners.size ? [ ...owners ][ 0 ] : 'mixed', count: shown.length, decisions };
}

// The decision for one gap property (row-gap or column-gap) of an ownership result, or null.
export const decisionFor = ( ownership, prop ) => ownership?.decisions.find( ( d ) => d.prop === prop ) || null;
