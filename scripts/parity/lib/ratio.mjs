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
