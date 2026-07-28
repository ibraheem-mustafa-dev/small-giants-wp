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
 * @param {Object} obj Partial or full tier object (any key order / missing tiers).
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
 * Canonical tier-resolver for tri-state enums and scalar values.
 *
 * Implements the contract: desktop coerces inherit to default, tablet/mobile
 * inherit upward (tablet from desktop, mobile from tablet).
 *
 * Supported value shapes:
 *   - Tri-state enum: { desktop: 'on'|'off', tablet: 'inherit'|'on'|'off', mobile: 'inherit'|'on'|'off' }
 *   - Scalar/null:    { desktop: <value>, tablet: <value|null>, mobile: <value|null> }
 *   - Non-object:     coerces to defaultValue (D328 defence)
 *
 * @param {Object} value        Responsive object or non-object.
 * @param {string} tier         'desktop' | 'tablet' | 'mobile'.
 * @param {*}      defaultValue Value when desktop inherits or is missing.
 * @return {{value: *, inherited: boolean}} Effective value + inheritance flag.
 */
export function resolveTier( value, tier = 'desktop', defaultValue ) {
	// Defend against non-object/junk input (D328).
	if ( typeof value !== 'object' || value === null ) {
		return { value: defaultValue, inherited: true };
	}

	// Determine if a value marks inheritance: 'inherit', null, or undefined.
	const isInherit = ( v ) => v === 'inherit' || v === null || v === undefined;

	if ( tier === 'desktop' ) {
		// Desktop: coerce inherit to defaultValue deterministically (§6b guard).
		const own = value.desktop;
		if ( isInherit( own ) ) {
			return { value: defaultValue, inherited: true };
		}
		return { value: own, inherited: false };
	}

	if ( tier === 'tablet' ) {
		// Tablet: own value, or inherit from desktop.
		const own = value.tablet;
		if ( isInherit( own ) ) {
			const desktopResult = resolveTier( value, 'desktop', defaultValue );
			return { value: desktopResult.value, inherited: true };
		}
		return { value: own, inherited: false };
	}

	if ( tier === 'mobile' ) {
		// Mobile: own value, or inherit from tablet.
		const own = value.mobile;
		if ( isInherit( own ) ) {
			const tabletResult = resolveTier( value, 'tablet', defaultValue );
			return { value: tabletResult.value, inherited: true };
		}
		return { value: own, inherited: false };
	}

	// Unknown tier, fallback to defaultValue with inherited.
	return { value: defaultValue, inherited: true };
}

/**
 * Legacy wrapper over resolveTier (scalar/null-marker family).
 *
 * Maintains the original semantics: empty string marks absence and inherits
 * upward. Resolves the EFFECTIVE value of a responsive object at a tier
 * (editor preview / inherited-indicator).
 *
 * @param {Object} obj  Responsive object `{desktop,tablet,mobile}`.
 * @param {string} tier 'desktop' | 'tablet' | 'mobile'.
 * @return {{value: *, inherited: boolean}} Effective value + whether inherited.
 */
export function resolveResponsiveTier( obj = {}, tier = 'desktop' ) {
	// Map the legacy '' (empty-string) convention to null for the canonical resolver.
	const normalized = {};
	RESPONSIVE_TIERS.forEach( ( t ) => {
		const val = obj[ t ];
		normalized[ t ] = val === '' ? null : val;
	} );

	// Use the canonical resolver with '' as the default (preserving legacy behaviour).
	return resolveTier( normalized, tier, '' );
}

/**
 * Emit scoped per-tier CSS rules (base + tablet + mobile) for a tri-state
 * ('inherit'|'on'|'off') responsive behaviour attribute, resolved via
 * resolveTier(). A tier's rule is emitted ONLY when its resolved state
 * differs from the tier immediately above it (minimal output) — an
 * all-inherit value emits a single base rule and nothing else, and a tier
 * whose resolved CSS text is empty emits no rule at all (even if the state
 * differs from the tier above).
 *
 * Identical semantics/output string to `sgs_emit_tier_rules()`
 * (includes/helpers-responsive.php) — this is the editor-preview mirror so
 * frontend render and editor preview never disagree (Spec 35 design gate
 * §4, 2026-07-28). Rules are scoped to the caller-supplied uidSelector —
 * e.g. '#sgs-abc123' or '.sgs-header--abc123' — NEVER a body class.
 * Breakpoints come from SGS_BREAKPOINTS (768/1024 device-tier standard,
 * emitted as max-width 1023px/767px) — never hardcoded here.
 *
 * ⚠ D386: this helper emits whatever CSS text the caller passes in
 * cssOn/cssOff verbatim. Callers MUST NOT pass declarations containing
 * absolute/per-instance sizes destined for a SHARED, state-only stylesheet —
 * a value that varies per block instance must be scoped to that instance's
 * own selector (this helper's whole purpose), never baked into shared CSS
 * text reused across instances.
 *
 * @param {string} uidSelector  Fully-formed, already-safe CSS selector (caller-owned uid scope).
 * @param {*}      value        Tri-state responsive object `{desktop,tablet,mobile}` (or non-object/junk — D328 defence via resolveTier()).
 * @param {string} cssOn        CSS declarations (no selector/braces) to emit when the resolved state is 'on'.
 * @param {string} cssOff       CSS declarations to emit when the resolved state is 'off'. Default '' (nothing emitted for 'off').
 * @param {string} defaultValue State used when desktop inherits/is missing (§6b guard). Default 'off' (DEFAULT_OFF).
 * @return {string} CSS text (no <style> wrapper); '' when nothing resolves to non-empty declarations.
 */
export function emitTierRules(
	uidSelector,
	value,
	cssOn,
	cssOff = '',
	defaultValue = 'off'
) {
	const cssForState = ( state ) => ( state === 'on' ? cssOn : cssOff );

	const desktop = resolveTier( value, 'desktop', defaultValue );
	const tablet = resolveTier( value, 'tablet', defaultValue );
	const mobile = resolveTier( value, 'mobile', defaultValue );

	let css = '';

	const desktopCss = cssForState( desktop.value );
	if ( desktopCss !== '' ) {
		css += `${ uidSelector }{${ desktopCss }}`;
	}

	if ( tablet.value !== desktop.value ) {
		const tabletCss = cssForState( tablet.value );
		if ( tabletCss !== '' ) {
			css += `@media (max-width:${ SGS_BREAKPOINTS.TABLET_MAX }px){${ uidSelector }{${ tabletCss }}}`;
		}
	}

	if ( mobile.value !== tablet.value ) {
		const mobileCss = cssForState( mobile.value );
		if ( mobileCss !== '' ) {
			css += `@media (max-width:${ SGS_BREAKPOINTS.MOBILE_MAX }px){${ uidSelector }{${ mobileCss }}}`;
		}
	}

	return css;
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

// `gridColumnClasses()` was REMOVED 2026-07-23 along with the `sgs-cols-*` CSS it
// fed. It had zero callers and was not re-exported from utils/index.js, so it was
// already dead — but it was a live trap: it minted class names whose stylesheet
// rules no longer exist, so any future caller would have got silent no-ops.
//
// Per-tier column counts are emitted server-side as scoped rules at the grid
// selector (class-sgs-container-wrapper.php, QB-2), which follows the grid onto
// `.sgs-container__inner` when container queries force it there. A class on the
// wrapper structurally cannot address a grid on the inner — that was the FR-37-11
// bug. Do not reintroduce a class-based column shorthand.
