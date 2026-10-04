// The computed forms of `aspect-ratio`: "auto", "16 / 9", "1.5" (one number is "n / 1") and "auto 16 / 9".
const TOL = 0.005;

// "16 / 9" → { auto: false, w: 16, h: 9, ratio: 1.777… }; "auto" and anything unparsed → null.
export function parseRatio( v ) {
	const m = String( v ).trim().match( /^(auto\s+)?(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?$/ );
	if ( ! m ) {
		return null;
	}
	const w = Number( m[ 2 ] );
	const h = undefined === m[ 3 ] ? 1 : Number( m[ 3 ] );
	return h > 0 ? { auto: !! m[ 1 ], w, h, ratio: w / h } : null;
}

// Two values paint the same ratio when both are auto, or both are ratios with equal auto flags and ratios within 0.5%.
export function sameRatio( a, b ) {
	if ( 'auto' === String( a ).trim() || 'auto' === String( b ).trim() ) {
		return String( a ).trim() === String( b ).trim();
	}
	const x = parseRatio( a );
	const y = parseRatio( b );
	return !! x && !! y && x.auto === y.auto && Math.abs( x.ratio - y.ratio ) <= TOL * Math.max( x.ratio, y.ratio );
}

// A computed grid-template-columns ("496.562px 451.438px") as track proportions to the smallest track, rounded to two
// decimals ([ 1.1, 1 ]); null unless every track is in px.
export function trackRatios( v ) {
	const px = String( v ).trim().split( /\s+/ ).map( ( t ) => ( /^\d*\.?\d+px$/.test( t ) ? parseFloat( t ) : NaN ) );
	if ( ! px.length || px.some( ( n ) => ! ( n > 0 ) ) ) {
		return null;
	}
	const min = Math.min( ...px );
	return px.map( ( n ) => Math.round( ( n / min ) * 100 ) / 100 );
}

// Two track lists paint the same proportions when they have as many tracks and each ratio is within 1%. The tracks'
// pixel widths follow the container's width, which the children's boxes judge.
export function sameTracks( a, b ) {
	const x = trackRatios( a );
	const y = trackRatios( b );
	return !! x && !! y && x.length === y.length && x.every( ( r, i ) => Math.abs( r - y[ i ] ) <= 0.01 * Math.max( r, y[ i ] ) );
}
