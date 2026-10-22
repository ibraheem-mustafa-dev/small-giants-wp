// The device safe area for Fill (FR-48-8, the `env()` part): a draft declaration such as the drawer foot's
// `padding-bottom: calc(16px + env(safe-area-inset-bottom))` asks the browser for the notch inset. A page without
// `viewport-fit=cover` in its viewport meta never gets a non-zero inset, so the draft renders only its fixed part (16px) and
// Fill writes that rendered value: the clone matches what the draft paints, and the inset stays the block's own concern
// (sgs/buybox's phone bar carries it). This module names that decision on the confirm record: which sides ask for an inset,
// the fixed part, the rendered value and whether the render shows no inset.
// Returns { sides, fixedPx, renderedPx, noInset, note } or null when the declaration names no safe-area inset.

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'css-function:env',
];

const ENV = /env\(\s*safe-area-inset-(top|right|bottom|left)\b[^)]*\)/gi;

// The sides a declaration asks the safe-area inset for.
export const safeAreaSides = ( declared ) => [ ...new Set( [ ...String( declared ?? '' ).matchAll( ENV ) ].map( ( m ) => m[ 1 ].toLowerCase() ) ) ];

// A px length term, or null.
const px = ( s ) => {
	const m = /^(-?\d*\.?\d+)px$/.exec( s.trim() );
	return m ? Number( m[ 1 ] ) : null;
};

// The value of a declaration with every safe-area inset taken as 0px, when it is a sum or a maximum of px terms
// (`calc(16px + env(...))`, `max(16px, env(...))`, `env(...)` alone); null for a form it does not evaluate.
export function fixedPart( declared ) {
	const d = String( declared ?? '' ).trim().replace( ENV, '0px' );
	const sum = /^calc\(([^()]*)\)$/i.exec( d );
	if ( sum ) {
		const terms = sum[ 1 ].split( /\s+\+\s+/ ).map( px );
		return terms.every( ( t ) => null !== t ) ? terms.reduce( ( a, b ) => a + b, 0 ) : null;
	}
	const max = /^max\(([^()]*)\)$/i.exec( d );
	if ( max ) {
		const terms = max[ 1 ].split( ',' ).map( px );
		return terms.every( ( t ) => null !== t ) ? Math.max( ...terms ) : null;
	}
	return px( d );
}

// declared: the draft's declared text for one property; rendered: what the draft paints (a px length).
export function safeAreaRead( declared, rendered ) {
	const sides = safeAreaSides( declared );
	if ( ! sides.length ) {
		return null;
	}
	const fixedPx = fixedPart( declared );
	const renderedPx = px( String( rendered ?? '' ) );
	const noInset = null !== fixedPx && null !== renderedPx && Math.abs( renderedPx - fixedPx ) <= 0.5;
	const note = noInset
		? `env(safe-area-inset-${ sides.join( '/' ) }) renders 0 in the draft (no viewport-fit=cover), so the rendered ${ renderedPx }px is written`
		: `env(safe-area-inset-${ sides.join( '/' ) }) is declared and the draft renders ${ rendered ?? 'nothing' } where its fixed part is ${ null === fixedPx ? 'not a plain length' : `${ fixedPx }px` }; the rendered value is written and the difference is named`;
	return { sides, fixedPx, renderedPx, noInset, note };
}
