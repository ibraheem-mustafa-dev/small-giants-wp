// Spacing ownership (Spec 48 §3.4 step 3). Who owns the space between a parent's children is decided per tier, from the
// draft's code first: a flex or grid parent that declares a gap on an axis owns that axis at the declared value, and the
// render confirms it (every rendered gap at least the declared one when the axis is distributed by a `space-*`
// justify-content, otherwise every rendered gap within EQUAL_PX of it). Without a declared gap, or when the render does
// not confirm it, the rendered gaps decide (a gap is the distance between consecutive children's border boxes): when
// every gap along an axis is equal the parent owns it (its gap setting holds that value and the children carry no margin
// on that axis); otherwise the parent's gap is 0 and each child takes its own margin. A declared gap the render does not
// confirm is reported on the decision (`disagree`).

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

const LAYOUTS = new Set( [ 'flex', 'inline-flex', 'grid', 'inline-grid' ] );
const DISTRIBUTED = /^space-(between|around|evenly)$/;
const px = ( v ) => ( /^-?[\d.]+px$/.test( String( v ?? '' ).trim() ) ? parseFloat( v ) : null );

// The axis `justify-content` distributes: the main axis of a flex parent (inline for a row, block for a column), the
// inline axis of a grid.
function justifiedAxis( declared ) {
	const column = /^column/.test( String( declared[ 'flex-direction' ] || '' ) ) && /flex/.test( String( declared.display ) );
	return column ? 'row-gap' : 'column-gap';
}

// The gap a flex or grid parent declares on one axis, in px, or null when it declares none (`normal`, no layout, or a
// value that is not a plain length).
export function declaredGap( declared, prop ) {
	if ( ! declared || ! LAYOUTS.has( String( declared.display || '' ).trim() ) ) {
		return null;
	}
	const v = px( declared[ prop ] );
	return null !== v && v > 0 ? v : null;
}

// One axis's decision from its rendered gaps, or null when the axis has none.
function decideRendered( prop, gaps ) {
	const spread = Math.max( ...gaps ) - Math.min( ...gaps );
	const mean = gaps.reduce( ( a, b ) => a + b, 0 ) / gaps.length;
	// A negative gap (boxes overlapping through negative margins) can never be a parent's gap.
	const parent = spread <= EQUAL_PX + 1e-9 && mean >= 0;
	return { prop, owner: parent ? 'parent' : 'children', value: parent ? `${ round2( mean ) }px` : '0px', gaps, margins: MARGINS[ prop ], source: 'rendered' };
}

// One axis's decision: the declared gap when the render confirms it, else the rendered gaps; null when the axis has none.
function decide( prop, gaps, declared ) {
	if ( ! gaps.length ) {
		return null;
	}
	const want = declaredGap( declared, prop );
	if ( null === want ) {
		return decideRendered( prop, gaps );
	}
	const distributed = justifiedAxis( declared ) === prop && DISTRIBUTED.test( String( declared[ 'justify-content' ] || '' ).trim() );
	const confirmed = distributed ? gaps.every( ( g ) => g >= want - EQUAL_PX ) : gaps.every( ( g ) => Math.abs( g - want ) <= EQUAL_PX + 1e-9 );
	if ( confirmed ) {
		return { prop, owner: 'parent', value: `${ round2( want ) }px`, gaps, margins: MARGINS[ prop ], source: 'declared', ...( distributed ? { distributed: String( declared[ 'justify-content' ] ).trim() } : {} ) };
	}
	return { ...decideRendered( prop, gaps ), disagree: { declared: `${ round2( want ) }px`, ...( distributed ? { distributed: String( declared[ 'justify-content' ] ).trim() } : {} ) } };
}

// rects: the parent's children's border boxes at one tier, in tree order: { x, y, w, h, inFlow? } for a rendered child,
// null for one not rendered at this tier. unmeasured: how many children have no draft element to measure (the list is
// partial, so nothing is decided). declared: the longhands the draft's code declares on the parent at this tier
// (`display`, `column-gap`, `row-gap`, `justify-content`, `flex-direction`), or null. Returns { owner, count,
// decisions }: owner is 'none' (fewer than two children render, no gap exists), 'unknown', 'parent', 'children' or
// 'mixed' (one axis each, in a wrapped or grid layout); decisions holds one entry per axis that has gaps: { prop:
// 'row-gap' (between lines) | 'column-gap' (within a line), owner, value (the parent's gap setting: the gap, or 0px when
// the children own it), gaps (px, each), margins (the sides a child would take), source ('declared' | 'rendered'),
// distributed? (the `space-*` justify-content that spreads the axis), disagree? ({ declared, distributed? }: the
// declared gap the render did not confirm) }.
export function spacingOwnership( rects, { unmeasured = 0, declared = null } = {} ) {
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
	const decisions = [ decide( 'column-gap', inline, declared ), decide( 'row-gap', block, declared ) ].filter( Boolean );
	if ( ! decisions.length ) {
		return { owner: 'none', count: shown.length, decisions };
	}
	const owners = new Set( decisions.map( ( d ) => d.owner ) );
	return { owner: 1 === owners.size ? [ ...owners ][ 0 ] : 'mixed', count: shown.length, decisions };
}

// The decision for one gap property (row-gap or column-gap) of an ownership result, or null.
export const decisionFor = ( ownership, prop ) => ownership?.decisions.find( ( d ) => d.prop === prop ) || null;
