// Layer 2 of the equivalence engine (Spec 48 FR-48-86): canonical values. Two CSS values paint the same when their
// canonical forms are equal: a timing keyword is its cubic-bezier() (CSS Easing 1 §2.1, the keyword definitions), a time is
// milliseconds, a transform list is its composed matrix (lib/css-matrix.mjs), and any other value compares through the
// parity walker's own comparison (scripts/parity/lib/compare.mjs::sameValue), so the engine never judges a value
// differently from the walker that closes the row. A shorthand's value is projected onto one of its longhands (a box
// family by its sides or corners, a keyword shorthand by the keywords its longhands' grammars list).
import { sameValue } from '../../../parity/lib/compare.mjs';
import { transformMatrix, sameMatrix } from '../css-matrix.mjs';
import { msOf } from '../motion-tokens.mjs';
import { familyOf, unfoldValue, longhandsOf, keywordsOf, initialOf } from '../css-families.mjs';

const PX_TOL = 0.5;
const TIME = /^(?:transition|animation)-(?:duration|delay)$/;
const EASING = /^(?:transition|animation)-timing-function$/;

// CSS Easing 1 §2.1: each easing keyword is a named cubic Bézier curve (linear is the identity curve).
const EASING_KEYWORDS = { linear: [ 0, 0, 1, 1 ], ease: [ 0.25, 0.1, 0.25, 1 ], 'ease-in': [ 0.42, 0, 1, 1 ], 'ease-out': [ 0, 0, 0.58, 1 ], 'ease-in-out': [ 0.42, 0, 0.58, 1 ] };

// CSS Text 4 §3.1: the `white-space` keywords that are not longhand values, as the longhand values they stand for.
const WHITE_SPACE = {
	normal: { 'white-space-collapse': 'collapse', 'text-wrap-mode': 'wrap' },
	pre: { 'white-space-collapse': 'preserve', 'text-wrap-mode': 'nowrap' },
	'pre-wrap': { 'white-space-collapse': 'preserve', 'text-wrap-mode': 'wrap' },
	'pre-line': { 'white-space-collapse': 'preserve-breaks', 'text-wrap-mode': 'wrap' },
};
const KEYWORD_SHORTHANDS = { 'white-space': WHITE_SPACE };

// The items of a comma list, commas inside a function kept.
export const listItems = ( v ) => String( v ?? '' ).split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ).filter( Boolean );

// One easing as its curve's four numbers rounded to 4 places, or the easing text itself when it is no curve (steps()).
export function easingCurve( v ) {
	const s = String( v ?? '' ).trim().toLowerCase();
	if ( EASING_KEYWORDS[ s ] ) {
		return EASING_KEYWORDS[ s ].join( ',' );
	}
	const m = /^cubic-bezier\(([^)]*)\)$/.exec( s );
	const n = m ? m[ 1 ].split( ',' ).map( ( x ) => Math.round( Number( x ) * 10000 ) / 10000 ) : null;
	return n && 4 === n.length && n.every( Number.isFinite ) ? n.join( ',' ) : s.replace( /\s+/g, '' );
}

// A value in its canonical text for `prop`: a time list in ms, an easing list as curves; any other value trimmed.
export function canonical( prop, value ) {
	if ( TIME.test( prop ) ) {
		return listItems( value ).map( ( x ) => msOf( x ) ?? x ).join( ', ' );
	}
	if ( EASING.test( prop ) ) {
		return listItems( value ).map( easingCurve ).join( ' | ' );
	}
	return String( value ?? '' ).trim();
}

// Whether two values of `prop` paint the same. A timing list compares item by item (the items pair with the element's
// transition-property list, so their order counts); a transform by its matrix.
export function sameCanonical( prop, a, b ) {
	if ( undefined === a || undefined === b || null === a || null === b ) {
		return false;
	}
	if ( TIME.test( prop ) || EASING.test( prop ) ) {
		return canonical( prop, a ) === canonical( prop, b );
	}
	if ( 'transform' === prop ) {
		const [ ma, mb ] = [ transformMatrix( a ), transformMatrix( b ) ];
		return ma && mb ? sameMatrix( ma, mb ) : String( a ).trim() === String( b ).trim();
	}
	return sameValue( prop, String( a ).trim(), String( b ).trim(), PX_TOL );
}

// Whether two per-width values agree at every width both state, with at least one shared width.
export function sameAtWidths( prop, a, b ) {
	const ws = Object.keys( a || {} ).filter( ( w ) => undefined !== b?.[ w ] && null !== b[ w ] );
	return ws.length > 0 && ws.every( ( w ) => sameCanonical( prop, a[ w ], b[ w ] ) );
}

// The value a shorthand's value gives one of its longhands, or undefined when it cannot be read. A box family splits by
// side or corner (lib/css-families.mjs::unfoldValue); a keyword shorthand reads its own keywords (CSS Text 4 for
// `white-space`) or else each token by the longhand grammar that lists it, a longhand no token names taking its initial
// value; a CSS-wide keyword is every longhand's.
export function projectLonghand( short, value, longhand ) {
	const v = String( value ?? '' ).trim();
	if ( '' === v ) {
		return undefined;
	}
	if ( /^(?:inherit|initial|unset|revert|revert-layer)$/.test( v ) ) {
		return v;
	}
	const fam = familyOf( longhand );
	if ( fam && 'mixed' !== fam.kind && fam.short === short ) {
		return unfoldValue( short, v )?.[ longhand ];
	}
	const table = KEYWORD_SHORTHANDS[ short ]?.[ v ];
	if ( table ) {
		return table[ longhand ];
	}
	const members = longhandsOf( short );
	if ( ! members.includes( longhand ) ) {
		return undefined;
	}
	const tokens = v.split( /\s+(?![^(]*\))/ );
	const owner = ( t ) => members.filter( ( m ) => keywordsOf( m ).includes( t ) );
	// Every token must belong to exactly one longhand's grammar; otherwise the value is not read here.
	if ( tokens.some( ( t ) => 1 !== owner( t ).length ) ) {
		return undefined;
	}
	return tokens.find( ( t ) => owner( t )[ 0 ] === longhand ) ?? initialOf( longhand ) ?? undefined;
}
