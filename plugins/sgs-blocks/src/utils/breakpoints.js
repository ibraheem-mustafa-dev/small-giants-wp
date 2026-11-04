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
 * Ready-made `matchMedia` conditions built from SGS_BREAKPOINTS (mirror of PHP SGS_Breakpoints::query()). One named
 * export per condition so a bundle carries only the ones it reads. The fractional pair matches the stylesheet gates
 * `max-width: 767.98px`, so a fractional viewport reads as the same tier in script and in CSS.
 */
export const QUERY_TABLET = `(max-width: ${ SGS_BREAKPOINTS.TABLET_MAX }px)`;
export const QUERY_MOBILE = `(max-width: ${ SGS_BREAKPOINTS.MOBILE_MAX }px)`;
export const QUERY_TABLET_UP = `(min-width: ${ SGS_BREAKPOINTS.MOBILE_MAX + 1 }px)`;
export const QUERY_DESKTOP = `(min-width: ${ SGS_BREAKPOINTS.TABLET_MAX + 1 }px)`;
export const QUERY_MOBILE_FRACTIONAL = `(max-width: ${ SGS_BREAKPOINTS.MOBILE_MAX }.98px)`;
export const QUERY_TABLET_ONLY_FRACTIONAL = `(min-width: ${ SGS_BREAKPOINTS.MOBILE_MAX + 1 }px) and (max-width: ${ SGS_BREAKPOINTS.TABLET_MAX }.98px)`;

/**
 * The bare media condition for a single width edge at a width the caller computed: a per-instance collapse point, a
 * custom-px tier (mirror of PHP SGS_Breakpoints::query_width()). A number is taken as px; a string is used as given.
 *
 * @param {string}        edge  'max' or 'min'.
 * @param {number|string} width Width.
 * @return {string} e.g. '(min-width:900px)'; '' for an unknown edge or an empty width.
 */
export const queryWidth = ( edge, width ) =>
	( 'max' !== edge && 'min' !== edge ) || '' === String( width )
		? ''
		: `(${ edge }-width:${ 'number' === typeof width ? `${ width }px` : width })`;

/**
 * The at-rule prefix (no opening brace) for a single width edge (mirror of PHP SGS_Breakpoints::media_width()).
 *
 * @param {string}        edge  'max' or 'min'.
 * @param {number|string} width Width.
 * @return {string} e.g. '@media(max-width:1023px)'.
 */
export const mediaWidth = ( edge, width ) => {
	const query = queryWidth( edge, width );
	return query ? `@media${ query }` : '';
};

/** The at-rule prefixes for the two device tiers (mirror of PHP SGS_Breakpoints::media( 'tablet' | 'mobile' )). */
export const MEDIA_TABLET = `@media(max-width:${ SGS_BREAKPOINTS.TABLET_MAX }px)`;
export const MEDIA_MOBILE = `@media(max-width:${ SGS_BREAKPOINTS.MOBILE_MAX }px)`;
