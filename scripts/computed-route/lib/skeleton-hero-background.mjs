// A picture the draft lays behind a hero's content is the hero's background, never its split media. The draft builds it as
// an absolutely placed layer (often a wrapper sized past the hero for a parallax move) that covers the hero's whole box and
// holds no words, with the hero's content stacked over it; a picture the draft sets beside the content sits in a column
// narrower than the hero. Pure: reads the inventory's boxes and positions at the hero's reference width.

// Whether `picture` sits under an absolutely placed element that covers `hero`'s whole box and holds no words.
// m: the inventory model (byKey, words), desc: an element's descendants. The boxes are read at the hero's widest shown width.
export function behindContent( { hero, picture, m, desc } ) {
	const w = [ 1440, 768, 375 ].find( ( x ) => hero?.visible?.[ x ] ) ?? null;
	const box = ( x ) => ( null === w ? null : x?.box?.[ w ] ?? null );
	const area = box( hero );
	if ( ! area ) {
		return false;
	}
	for ( let up = picture; up && up !== hero; up = m.byKey[ up.parentKey ] ) {
		const b = box( up );
		if ( 'absolute' === up.position?.[ w ] && b && b.w >= area.w - 1 && b.h >= area.h - 1 && ! desc( up ).some( ( k ) => m.words( k ) ) ) {
			return true;
		}
	}
	return false;
}

// The side of a hero its content block is anchored to, when the draft places that block absolutely against the hero's own box:
// 'bottom' where the block ends at the hero's bottom edge and starts below its top edge, 'top' for the reverse, null otherwise
// (in flow, filling the hero, floating inside it, or disagreeing between widths). The content block is the outermost
// descendant holding every worded element that is not media. An in-flow block is placed by the hero's own alignment, which
// Fill reads; an absolute one is placed against the box and no setting of the hero reads that, so the skeleton decides it.
// m, desc, isMedia as for behindContent. The boxes (page coordinates) and positions are read at every width the hero and the
// block are both shown at, to one pixel.
export function contentAnchor( { hero, m, desc, isMedia } ) {
	const leaves = desc( hero ).filter( ( k ) => m.words( k ) && ! isMedia( k ) );
	if ( ! leaves.length ) {
		return null;
	}
	const holds = ( x ) => leaves.every( ( k ) => k === x || desc( x ).includes( k ) );
	const column = desc( hero ).filter( ( x ) => ! isMedia( x ) && holds( x ) ).sort( ( a, b ) => a.depth - b.depth )[ 0 ];
	if ( ! column ) {
		return null;
	}
	const widths = [ 375, 768, 1440 ].filter( ( w ) => hero.visible?.[ w ] && column.visible?.[ w ] );
	const sides = widths.map( ( w ) => {
		const h = hero.box?.[ w ];
		const c = column.box?.[ w ];
		if ( 'absolute' !== column.position?.[ w ] || ! h || ! c ) {
			return null;
		}
		const below = h.y + h.h - ( c.y + c.h );
		const above = c.y - h.y;
		return Math.abs( below ) <= 1 && above > 1 ? 'bottom' : Math.abs( above ) <= 1 && below > 1 ? 'top' : null;
	} );
	return sides.length && sides.every( ( x ) => x && x === sides[ 0 ] ) ? sides[ 0 ] : null;
}

