/**
 * Responsive class name helpers.
 */

/**
 * FR-S9-6 shared breakpoint source (mirror of PHP SGS_Breakpoints, R-31-1).
 * The single source of truth for device-tier widths on the editor side. Never
 * hardcode a second 768/1024 or 1023/767 pair in a block.
 */
export const SGS_BREAKPOINTS = {
	TABLET_MAX: 1023,
	MOBILE_MAX: 767,
};

/** Canonical tier order — MUST match the PHP canonicaliser (uid stability). */
export const RESPONSIVE_TIERS = [ 'desktop', 'tablet', 'mobile' ];

/** Canonical box-side order — MUST match the PHP side order. */
export const BOX_SIDES = [ 'top', 'right', 'bottom', 'left' ];

/**
 * Build a `{desktop,tablet,mobile}` object in CANONICAL key order.
 *
 * Key order is written here (not re-sorted in PHP) so re-saving identical
 * content produces byte-identical JSON and therefore the same wrapper uid
 * (FR-S9-6 canonicalisation contract, STOP-NO-KSORT). Always route object-model
 * writes through this helper so the order can never drift.
 *
 * @param {Object} obj  Partial or full tier object (any key order / missing tiers).
 * @return {Object} New object with keys in desktop→tablet→mobile order.
 */
export function makeResponsive( obj = {} ) {
	const out = {};
	RESPONSIVE_TIERS.forEach( ( tier ) => {
		if ( obj[ tier ] !== undefined ) {
			out[ tier ] = obj[ tier ];
		}
	} );
	return out;
}

/**
 * Build a box side object `{top,right,bottom,left}` in CANONICAL side order.
 * Omits sides that are undefined/'' so per-side inheritance stays exact.
 *
 * @param {Object} sides Partial side object (any key order).
 * @return {Object} New object with sides in canonical order, blanks dropped.
 */
export function makeBoxSides( sides = {} ) {
	const out = {};
	BOX_SIDES.forEach( ( side ) => {
		if ( sides[ side ] !== undefined && sides[ side ] !== '' ) {
			out[ side ] = sides[ side ];
		}
	} );
	return out;
}

/**
 * Resolve the EFFECTIVE value of a responsive object at a tier (editor preview /
 * inherited-indicator). Mirrors the PHP cascade: `tier ?? tier_above ?? desktop`.
 * `desktop` is always concrete; a blank/absent tier inherits upward.
 *
 * @param {Object} obj      Responsive object `{desktop,tablet,mobile}`.
 * @param {string} tier     'desktop' | 'tablet' | 'mobile'.
 * @return {{value: *, inherited: boolean}} Effective value + whether it is
 *         inherited (i.e. this tier has no own value).
 */
export function resolveResponsiveTier( obj = {}, tier = 'desktop' ) {
	const own = obj?.[ tier ];
	const hasOwn = own !== undefined && own !== null && own !== '';
	if ( tier === 'mobile' ) {
		if ( hasOwn ) {
			return { value: own, inherited: false };
		}
		const tab = resolveResponsiveTier( obj, 'tablet' );
		return { value: tab.value, inherited: true };
	}
	if ( tier === 'tablet' ) {
		if ( hasOwn ) {
			return { value: own, inherited: false };
		}
		return { value: obj?.desktop ?? '', inherited: true };
	}
	// desktop — always concrete (its own value, never inherited).
	return { value: hasOwn ? own : '', inherited: false };
}

export function responsiveClasses( attributes ) {
	const classes = [];

	if ( attributes.sgsHideOnMobile ) {
		classes.push( 'sgs-hide-mobile' );
	}
	if ( attributes.sgsHideOnTablet ) {
		classes.push( 'sgs-hide-tablet' );
	}
	if ( attributes.sgsHideOnDesktop ) {
		classes.push( 'sgs-hide-desktop' );
	}

	return classes.join( ' ' );
}

export function gridColumnClasses( desktop, tablet, mobile ) {
	return [
		`sgs-cols-${ desktop }`,
		tablet && `sgs-cols-tablet-${ tablet }`,
		mobile && `sgs-cols-mobile-${ mobile }`,
	]
		.filter( Boolean )
		.join( ' ' );
}
