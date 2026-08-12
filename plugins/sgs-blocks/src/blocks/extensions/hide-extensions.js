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

/**
 * Native-style-support keys that trigger WordPress's own native "Styles" tab
 * (via core's auto-generated panels, independent of anything a block's own
 * `InspectorControls` renders). `__experimentalSkipSerialization` is excluded
 * from the truthy check — it only changes markup emission, not whether core
 * renders the native control.
 */
const NATIVE_STYLE_SUPPORT_KEYS = [
	'color',
	'__experimentalBorder',
	'typography',
	'spacing',
	'shadow',
];

function hasTruthySupport( value ) {
	if ( value && 'object' === typeof value ) {
		return Object.entries( value ).some(
			( [ key, v ] ) =>
				'__experimentalSkipSerialization' !== key && hasTruthySupport( v )
		);
	}
	return Boolean( value );
}

/**
 * True only when a block declares NONE of the native style-affecting
 * supports (colour/border/typography/spacing/shadow). Only an eligible block
 * may use the SGS three-tab inspector bar (`SgsInspectorTabs`) — a block that
 * still has any native support switched on keeps its native Settings/Styles
 * tabs untouched, because WordPress would render its own native Styles tab
 * regardless of what the SGS bar does (D4, `go-track-1b-playful-hamster.md`,
 * corrected via /qc-council 2026-08-12 after `sgs/icon`'s native `color` +
 * `spacing` supports falsified the original "zero native supports" pilot
 * claim).
 *
 * @param {string|Object} nameOrSettings Block name or settings object.
 * @return {boolean} True when the block may use the SGS tab bar.
 */
export function isTabBarEligible( nameOrSettings ) {
	const supports = resolveSupports( nameOrSettings );
	return ! NATIVE_STYLE_SUPPORT_KEYS.some( ( key ) =>
		hasTruthySupport( supports?.[ key ] )
	);
}
