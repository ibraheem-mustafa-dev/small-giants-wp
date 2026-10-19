// Declared values for Fill (Spec 48 FR-48-8, code first): what the draft's code sets on each target, beyond Fill's own
// property list. readDraft reads every author-declared longhand from Chrome's matched styles
// (scripts/parity/lib/devtools.mjs::declaredValues with every name); this module picks the ones Fill must also judge
// (`extraProps`) and reads their rendered values in the page (`readExtras`), so a property the draft authors is read
// from its code and confirmed by its render, never dropped because it is not on the list.

// A CSS-wide keyword states the property's default (an implied longhand of a shorthand reads `initial`): nothing to
// write unless the block overrides it, which the block's calibrated default shows.
export const CSS_WIDE = /^(?:initial|inherit|unset|revert|revert-layer)$/i;
// Motion timings belong to the motion writer (lib/fill-motion.mjs), which reads them from the animation inventory.
const MOTION = /^(?:transition|animation)(?:-|$)/;

// The properties whose rendered value is a used value (CSSOM's resolved value: the laid-out size or offset), so a
// rendered pixel figure is never the draft's intent: they are written only from a declared value the code states.
export const USED_VALUE = [ 'width', 'height', 'top', 'right', 'bottom', 'left', 'grid-template-columns', 'grid-template-rows' ];

// The declared properties of one target that Fill does not read already: { prop: declared } (motion timings and
// CSS-wide keywords left out). `read` is Fill's own list (lib/fill-read.mjs::PROPS).
export function extraProps( declared, read ) {
	return Object.fromEntries( Object.entries( declared || {} ).filter( ( [ p, v ] ) => ! read.includes( p ) && ! MOTION.test( p ) && ! CSS_WIDE.test( String( v ).trim() ) ) );
}

// In-page: the rendered value of each extra property of each job's element: { id: { prop: value } }.
function computedOf( [ list, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const out = {};
	for ( const { id, finder, props } of list ) {
		const el = resolve( finder );
		if ( el ) {
			const cs = getComputedStyle( el );
			out[ id ] = Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
		}
	}
	return out;
}

// The rendered values of every target's extra properties at the page's current width. jobs: [{ id, finder }];
// extras: { id: { prop: declared } }. Returns { id: { prop: rendered } }.
export async function readExtras( page, jobs, extras, resolveSrc ) {
	const list = jobs.filter( ( j ) => Object.keys( extras[ j.id ] || {} ).length ).map( ( j ) => ( { id: j.id, finder: j.finder, props: Object.keys( extras[ j.id ] ) } ) );
	return list.length ? page.evaluate( computedOf, [ list, resolveSrc ] ) : {};
}

// The draft value Fill judges for a used-value property: the declared value where the code states a plain length or
// percentage, never the rendered pixels; null when the code states none at that width (a keyword, a calc, a variable).
export function usedValueDraft( declared ) {
	const v = String( declared ?? '' ).trim();
	return /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%|rem|em|vh|vw)$/.test( v ) || '0' === v ? v : null;
}
