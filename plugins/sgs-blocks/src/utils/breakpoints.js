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
