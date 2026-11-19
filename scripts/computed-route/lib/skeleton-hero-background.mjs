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
