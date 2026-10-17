/**
 * Per-block universal-extension gating, two mechanisms.
 *
 * DENYLIST: an extension attaches to every sgs/* block unless the block opts
 * OUT with
 *
 *   "supports": { "sgs": { "hideExtensions": ["<slug>"] } }
 *
 * ALLOWLIST: an extension attaches to NO block unless the block opts IN with
 *
 *   "supports": { "sgs": { "enabledExtensions": ["blockLink"] } }
 *
 * A slug is governed by one mechanism, never both.
 *
 * Recognised allowlist slugs: blockLink · childSizing
 * No denylist slug is currently recognised.
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
