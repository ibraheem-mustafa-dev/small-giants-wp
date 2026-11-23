/**
 * Device-tier breakpoint source for script (mirror of PHP SGS_Breakpoints, Spec 37 FR-37-16, FP-1).
 *
 * Deliberately a leaf module with no imports, so a view script can read the tier widths without pulling in the
 * editor-side helpers of ./responsive (Spec 38 FR-38-24 bundle budget).
 */

/**
 * Spec 37 FR-37-16 shared breakpoint source (mirror of PHP SGS_Breakpoints, FP-1).
 * The single source of truth for device-tier widths on the editor side. Never
 * hardcode a second 768/1024 or 1023/767 pair in a block.
 */
export const SGS_BREAKPOINTS = {
	TABLET_MAX: 1023,
	MOBILE_MAX: 767,
};

/**
 * The decimal that turns a tier's whole-pixel maximum into its upper bound in a media query (mirror of PHP
 * SGS_Breakpoints::UPPER_FRACTION). A zoomed browser or a scaled display reports a fractional viewport width
 * (767.4px) that neither a whole-pixel upper bound at 767 nor a lower bound at 768 matches, so every tier's upper bound
 * is its maximum plus this and the next tier starts at the next whole pixel: exactly one tier matches at every real
 * width. `queryWidth()` adds it in one place.
 */
export const UPPER_FRACTION = '.98';

/**
 * The bare media condition for a single width edge at a width the caller computed: a per-instance collapse point, a
 * custom-px tier (mirror of PHP SGS_Breakpoints::query_width()). A number is taken as px; a string is used as given.
 * A `max` edge at a whole-pixel width (a number or '767px') takes UPPER_FRACTION; any other width is used as given.
 *
 * @param {string}        edge  'max' or 'min'.
 * @param {number|string} width Width.
 * @return {string} e.g. '(min-width:900px)', '(max-width:767.98px)'; '' for an unknown edge or an empty width.
 */
export const queryWidth = ( edge, width ) => {
	if ( ( 'max' !== edge && 'min' !== edge ) || '' === String( width ) ) {
		return '';
	}
	let value = 'number' === typeof width ? `${ width }px` : width;
	if ( 'max' === edge && /^\d+(?:px)?$/.test( String( width ).trim() ) ) {
		value = `${ parseInt( width, 10 ) }${ UPPER_FRACTION }px`;
	}
	return `(${ edge }-width:${ value })`;
};

/**
 * Ready-made `matchMedia` conditions built from SGS_BREAKPOINTS (mirror of PHP SGS_Breakpoints::query()). One named
 * export per condition so a bundle carries only the ones it reads. Upper bounds carry UPPER_FRACTION, so a fractional
 * viewport reads as the same tier in script and in CSS.
 */
export const QUERY_TABLET = `(max-width: ${ SGS_BREAKPOINTS.TABLET_MAX }${ UPPER_FRACTION }px)`;
export const QUERY_MOBILE = `(max-width: ${ SGS_BREAKPOINTS.MOBILE_MAX }${ UPPER_FRACTION }px)`;
export const QUERY_TABLET_UP = `(min-width: ${
	SGS_BREAKPOINTS.MOBILE_MAX + 1
}px)`;
export const QUERY_DESKTOP = `(min-width: ${
	SGS_BREAKPOINTS.TABLET_MAX + 1
}px)`;
export const QUERY_TABLET_ONLY = `(min-width: ${
	SGS_BREAKPOINTS.MOBILE_MAX + 1
}px) and ${ QUERY_TABLET }`;
/** Aliases of QUERY_MOBILE and QUERY_TABLET_ONLY, kept for callers that name the fractional-width guarantee. */
export const QUERY_MOBILE_FRACTIONAL = QUERY_MOBILE;
export const QUERY_TABLET_ONLY_FRACTIONAL = QUERY_TABLET_ONLY;

/**
 * The at-rule prefix (no opening brace) for a single width edge (mirror of PHP SGS_Breakpoints::media_width()).
 *
 * @param {string}        edge  'max' or 'min'.
 * @param {number|string} width Width.
 * @return {string} e.g. '@media(max-width:1023.98px)'.
 */
export const mediaWidth = ( edge, width ) => {
	const query = queryWidth( edge, width );
	return query ? `@media${ query }` : '';
};

/** The at-rule prefixes for the two device tiers (mirror of PHP SGS_Breakpoints::media( 'tablet' | 'mobile' )). */
export const MEDIA_TABLET = `@media(max-width:${ SGS_BREAKPOINTS.TABLET_MAX }${ UPPER_FRACTION }px)`;
export const MEDIA_MOBILE = `@media(max-width:${ SGS_BREAKPOINTS.MOBILE_MAX }${ UPPER_FRACTION }px)`;
