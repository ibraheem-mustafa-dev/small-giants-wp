// Whether a pair compares like with like. A block that groups other blocks (a multi-button's buttons) can be paired with the draft's
// first button: the button's resting look is then read against the group's root, and the difference belongs to the button's own
// block, not the group. The draft element is a part of the live block when the live root's words hold the draft's and more, and the
// draft's box is the smaller.
const words = ( s ) => String( s ?? '' ).toLowerCase().match( /[a-z0-9]{2,}/g ) ?? [];
const area = ( b ) => ( b?.w ?? 0 ) * ( b?.h ?? 0 );

// Returns the reason the draft element is a part of the live block, or null when the pair is like for like (or cannot be judged).
export function partOfLive( draft, live ) {
	const d = words( draft?.text );
	const l = words( live?.text );
	if ( ! d.length || l.length <= d.length || ! area( draft?.box ) || ! area( live?.box ) ) {
		return null;
	}
	const held = new Set( l );
	if ( ! d.every( ( w ) => held.has( w ) ) || area( draft.box ) >= 0.85 * area( live.box ) ) {
		return null;
	}
	return `the draft element (${ Math.round( draft.box.w ) }x${ Math.round( draft.box.h ) }, ${ d.length } words) is a part of the live block (${ Math.round( live.box.w ) }x${ Math.round( live.box.h ) }, ${ l.length } words)`;
}
