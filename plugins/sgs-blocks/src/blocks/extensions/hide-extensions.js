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
 * Recognised allowlist slugs: hover · blockLink · childSizing
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

/**
 * FLAG test — a capability a block declares as a single truthy
 * `supports.sgs.<flag>` rather than as a list member (roster rule_mode
 * "flag"; `imageControls` and `blockLinkAutoUrl` use it). A flag says
 * something about the block itself ("this block supplies its own link
 * destination"), so it reads as one property rather than an entry in a
 * shared opt-in list.
 *
 * @param {string|Object} nameOrSettings Block name or settings object.
 * @param {string}        flag           Flag name under `supports.sgs`.
 * @return {boolean} True when the block declares the flag truthy.
 */
export function isExtensionFlagged( nameOrSettings, flag ) {
	return !! resolveSupports( nameOrSettings )?.sgs?.[ flag ];
}
