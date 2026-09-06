/**
 * Shared editor-canvas mirror of the padding/margin box-object preview —
 * extracted 2026-08-26 from `sgs/container`'s `edit.js` (the ONLY block that
 * had built this mirror — `boxShorthand()`/`resolveBoxTierPreview()`,
 * previously local + unexported at lines ~117-155) into ONE shared module so
 * every other block carrying padding/margin box-object attrs can show the
 * same live preview instead of a flat, non-moving canvas for a setting that
 * IS painting on the published page. Measured live on the canary 2026-08-26:
 * `sgs/trust-bar` and `sgs/multi-button` both showed 0px padding/0px margin
 * on canvas against a live 120px/80px page — this module + its per-block
 * wiring closes that gap (contract: `.claude/plans/2026-07-09-box-object-
 * interface-contract.md` §5, "editor preview must match the frontend scoped
 * output").
 *
 * `boxShorthand()` and `resolveBoxTierPreview()` are copied VERBATIM from
 * `sgs/container`'s edit.js — same implementation, same docblocks, unchanged
 * logic — so this extraction cannot itself introduce a behavioural drift for
 * container's own regression baseline.
 *
 * ⛔ Keep this in step with the PHP path (`class-sgs-container-wrapper.php`).
 * If they disagree, the editor lies about what the page will look like —
 * which is the failure this mirror exists to prevent.
 */

/**
 * Box-object interface contract §1: build an editor-preview shorthand from a
 * 4-side box object — mirrors the pattern already used across every other
 * block's edit.js (e.g. icon-list/edit.js) and render.php's own hand-built
 * shorthand, so the canvas preview matches the frontend.
 *
 * @param {Object|undefined} box  {top,right,bottom,left}, each an already
 *                                 unit-bearing CSS length string or absent.
 * @return {string|undefined} A 4-value CSS shorthand, or undefined when no
 *                             side is set.
 */
export function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const keys = [ 'top', 'right', 'bottom', 'left' ];
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * padding/margin are NOT tier objects on this block — they are a flat trio of
 * OWNED box attrs (`padding`/`paddingTablet`/`paddingMobile`, each its own
 * {top,right,bottom,left}), the pre-tier-object shape (Spec 35 / D555). The
 * frontend emits the base box through the style engine, then a tablet/mobile
 * `@media` rule for EACH side that tier explicitly sets — an unset side at a
 * narrower tier keeps whatever the wider tier declared (ordinary CSS cascade,
 * both `max-width` queries can be simultaneously true). This mirrors that:
 * merge tablet's declared sides over base, then mobile's over that.
 *
 * @param {Object|undefined} base   Desktop/base box.
 * @param {Object|undefined} tablet Tablet box (only declared sides override).
 * @param {Object|undefined} mobile Mobile box (only declared sides override).
 * @param {string}           tier   Active preview tier.
 * @return {Object} Merged box for the active tier.
 */
export function resolveBoxTierPreview( base, tablet, mobile, tier ) {
	const merged = { ...( base && typeof base === 'object' ? base : {} ) };
	if ( tier === 'tablet' || tier === 'mobile' ) {
		const t = tablet && typeof tablet === 'object' ? tablet : {};
		[ 'top', 'right', 'bottom', 'left' ].forEach( ( key ) => {
			if ( t[ key ] ) merged[ key ] = t[ key ];
		} );
	}
	if ( tier === 'mobile' ) {
		const m = mobile && typeof mobile === 'object' ? mobile : {};
		[ 'top', 'right', 'bottom', 'left' ].forEach( ( key ) => {
			if ( m[ key ] ) merged[ key ] = m[ key ];
		} );
	}
	return merged;
}

/**
 * Convenience wrapper for a block's canvas `style` object — resolves BOTH
 * padding and margin for the active preview tier and returns only the keys
 * that actually have something to paint (mirrors `boxShorthand()`'s own
 * `undefined`-when-empty contract, so a caller can spread the result straight
 * into its style object without an extra `if` per property).
 *
 * ⚠ The BASE tier's SOURCE differs per calling block — this function takes it
 * as an explicit argument rather than hard-coding either source, because:
 *  - `sgs/container` stores base in its OWN attrs (`attributes.padding` /
 *    `attributes.margin` — the pre-Spec-35 owned-box shape).
 *  - Every other adopting block (`sgs/multi-button`, `sgs/physics-canvas`,
 *    `sgs/site-footer`, `sgs/site-header`, `sgs/trust-bar`) stores base in the
 *    WP-NATIVE `attributes.style.spacing.padding` / `….margin` object (the
 *    `supports.spacing` panel), with only the tablet/mobile OVERRIDE tiers as
 *    block-private `paddingTablet`/`paddingMobile`/`marginTablet`/
 *    `marginMobile` attrs.
 * Pass whichever box each block actually reads as `basePadding`/`baseMargin`
 * — never assume one shape here.
 *
 * @param {Object} boxes             Base + tier boxes for both properties.
 * @param {Object} [boxes.basePadding]   Desktop/base padding box.
 * @param {Object} [boxes.paddingTablet] Tablet padding override box.
 * @param {Object} [boxes.paddingMobile] Mobile padding override box.
 * @param {Object} [boxes.baseMargin]    Desktop/base margin box.
 * @param {Object} [boxes.marginTablet]  Tablet margin override box.
 * @param {Object} [boxes.marginMobile]  Mobile margin override box.
 * @param {string} tier               Active preview tier ('desktop'|'tablet'|'mobile').
 * @return {{padding?: string, margin?: string}} Only the keys that resolved
 *                   to a real shorthand — omit a key entirely when unset, so
 *                   the caller can spread this straight into its style object.
 */
export function spacingPreview(
	{ basePadding, paddingTablet, paddingMobile, baseMargin, marginTablet, marginMobile },
	tier
) {
	const result = {};

	const padding = boxShorthand(
		resolveBoxTierPreview( basePadding, paddingTablet, paddingMobile, tier )
	);
	if ( padding ) result.padding = padding;

	const margin = boxShorthand(
		resolveBoxTierPreview( baseMargin, marginTablet, marginMobile, tier )
	);
	if ( margin ) result.margin = margin;

	return result;
}
