/**
 * Per-block universal-extension gating — TWO mechanisms, by design (D551,
 * Phase 2.1).
 *
 * DENYLIST (legacy, still governs click-effects/parallax/animation/etc. until
 * each gets its own usage-derivation pass — see the plan at
 * `.claude/plans/go-track-1b-playful-hamster.md` Phase 2.1): every extension
 * attaches to every sgs/* block unless the block opts OUT —
 *
 *   "supports": { "sgs": { "hideExtensions": ["clickEffects"] } }
 *
 * ALLOWLIST (D551 — hover + blockLink, disconnected outright and made
 * opt-in-only because they were measured at ZERO stored usage across 194
 * canary pages and their panel/mechanism is itself flagged as a defect,
 * not merely unused): an extension attaches to NO block unless the block
 * opts IN —
 *
 *   "supports": { "sgs": { "enabledExtensions": ["hover"] } }
 *
 * As Phase 2.1 derives real usage for the remaining denylist extensions,
 * each one migrates from `isExtensionHidden` to `isExtensionEnabled` in its
 * own commit — never both checked for the same slug at once.
 *
 * Recognised denylist slugs: clickEffects · parallax · spacing · animation
 * Recognised allowlist slugs: hover · blockLink
 *
 * @param {string|Object} nameOrSettings Block name (from an editor HOC) OR the
 *                                        settings object (from a
 *                                        blocks.registerBlockType filter).
 * @param {string}        slug           Extension slug to test.
 * @return {boolean} True when the block has opted this extension out.
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';

function resolveSupports( nameOrSettings ) {
	return nameOrSettings && 'object' === typeof nameOrSettings
		? nameOrSettings.supports
		: getBlockType( nameOrSettings )?.supports;
}

export function isExtensionHidden( nameOrSettings, slug ) {
	const list = resolveSupports( nameOrSettings )?.sgs?.hideExtensions;
	return Array.isArray( list ) && list.includes( slug );
}

/**
 * Opt-in test for allowlisted extensions (D551). A block must explicitly
 * list the slug in `supports.sgs.enabledExtensions` to receive that
 * extension's attributes/controls — the inverse default of
 * `isExtensionHidden` above.
 *
 * @param {string|Object} nameOrSettings Block name or settings object.
 * @param {string}        slug           Extension slug to test.
 * @return {boolean} True when the block has opted this extension in.
 */
export function isExtensionEnabled( nameOrSettings, slug ) {
	const list = resolveSupports( nameOrSettings )?.sgs?.enabledExtensions;
	return Array.isArray( list ) && list.includes( slug );
}
