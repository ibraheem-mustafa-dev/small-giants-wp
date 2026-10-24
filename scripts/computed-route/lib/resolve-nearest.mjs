// The tie rule for settings that all paint one property on one element (lib/resolve.mjs::resolve). Calibration lists every
// element a setting's marker changed (its `slots`, and the elements its inherited value reached, `reaches`), so a setting
// on an ancestor (a button width a bar's percentage follows, a nav colour a bar inherits) ties with the setting on the
// element itself or on its nearest ancestor. The setting whose own element (calibration's `slot`, its home) is the read
// element, or the nearest ancestor of it, is the one that paints it: a value set further up reaches the element only
// through the nearer one. The tie breaks only when every tied setting's home is the element or one of its ancestors and
// one home is deeper than every other setting's; any other tie stays ambiguous.

// Whether the element at path `home` is the element at `slot` or one of its ancestors (paths are calibration's
// `.a > .b > .c` element paths from the block root ''); an undefined home (an uncalibrated setting) encloses nothing.
export function encloses( home, slot ) {
	return home === slot || '' === home || slot.startsWith( `${ home } ` );
}

const depth = ( p ) => ( '' === p ? 0 : p.split( /\s*>\s*|\s+/ ).length );

// The tied rows whose home is nearest the read element (lib/resolve.mjs::resolve still refuses two settings there), or
// null when no row's home can be compared. rows: the tied rows (attr_name, tier_shape); homeOf: row -> its calibrated home path,
// undefined when calibration has none; slot: the read element.
export function nearestHome( rows, homeOf, slot ) {
	const homes = rows.map( ( r ) => homeOf( r ) );
	if ( homes.some( ( h ) => ! encloses( h, slot ) ) ) {
		return null;
	}
	const deepest = Math.max( ...homes.map( depth ) );
	const at = rows.filter( ( r, i ) => depth( homes[ i ] ) === deepest );
	return at;
}
