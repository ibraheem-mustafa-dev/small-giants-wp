// Hover shadow values for the motion cloning writer (Spec 38A §5.1): a box-shadow's parts (its colour turned to hex by lib/tokens.mjs::colourHex), so
// lib/motion-layers.mjs::hoverLayer can tell a ring or an accent line from a drop shadow.
import { lengthOf } from './motion-channels.mjs';

// A box-shadow value's single shadow as { inset, x, y, blur, spread, colour } (lengths in px, colour as written), or
// null for none, a list of several shadows or a length that is not px.
export function shadowParts( value ) {
	const s = String( value ?? '' ).trim();
	if ( '' === s || 'none' === s || /,(?![^(]*\))/.test( s ) ) {
		return null;
	}
	const fnColour = /(?:rgba?|hsla?|oklch|color)\([^)]*\)/.exec( s );
	const words = ( fnColour ? s.replace( fnColour[ 0 ], ' ' ) : s ).trim().split( /\s+/ ).filter( Boolean );
	const inset = words.includes( 'inset' );
	const rest = words.filter( ( w ) => 'inset' !== w );
	const colour = fnColour ? fnColour[ 0 ] : rest.find( ( w ) => null === lengthOf( w ) ) ?? null;
	const lengths = rest.filter( ( w ) => w !== colour ).map( lengthOf );
	if ( lengths.length < 2 || lengths.length > 4 || lengths.some( ( l ) => 'number' !== typeof l ) ) {
		return null;
	}
	const [ x, y, blur = 0, spread = 0 ] = lengths;
	return { inset, x, y, blur, spread, colour };
}
