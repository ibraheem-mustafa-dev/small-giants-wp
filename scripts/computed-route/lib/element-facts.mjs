// Reads of an inventory element's computed values for the skeleton rules (Spec 48 section 3.4). The inventory's browser read
// records, at each width an element renders (lib/skeleton-inventory.mjs `resolved`, RESOLVED), the computed value of the
// properties a rule compares with a number: the inherited text properties, sizes, corner radii and padding. A draft that
// writes `clamp(22px, 2.2vw, 26px)`, `var(--space)` or `calc()` is judged by what that resolves to, and a text property the
// element inherits is its own. An inventory read before the values were recorded has none, so a rule falls back to the value
// the element declares (lib/skeleton-rules.mjs::declared).

// A computed length in px, or null (`auto`, `normal`, a keyword, an expression).
export const pxOf = ( v ) => {
	const n = /^(-?[\d.]+)px$/.exec( String( v ?? '' ).trim() );
	return n ? Number( n[ 1 ] ) : null;
};

// The widths the element renders at, ascending.
export const renderedWidths = ( e ) => Object.keys( e?.visible || {} ).filter( ( w ) => true === e.visible[ w ] ).map( Number ).sort( ( a, b ) => a - b );

// The widths the element renders at that the browser read computed values for, ascending.
export const resolvedWidths = ( e ) => renderedWidths( e ).filter( ( w ) => e.resolved?.[ w ] );

// Whether `test( values, width )` holds at every width the element renders, over its computed values at that width
// (`values` is the browser's { property: value } read). An element with no computed read at any width is judged by
// `declared()`, the value it declares (the rule's own reading before the values were recorded).
export function everyWidth( e, test, declared ) {
	const widths = resolvedWidths( e );
	return widths.length ? widths.every( ( w ) => test( e.resolved[ w ], w ) ) : !! declared();
}

// Whether `test( values, width )` holds at one or more of the widths it renders, with the same fallback.
export function someWidth( e, test, declared ) {
	const widths = resolvedWidths( e );
	return widths.length ? widths.some( ( w ) => test( e.resolved[ w ], w ) ) : !! declared();
}

// The content the draft's code injected into the element at one width (lib/skeleton-inventory.mjs::injectedContent:
// { tag, viewBox, source }), or null.
export const injectedAt = ( e, w ) => e?.injected?.[ w ] ?? null;
