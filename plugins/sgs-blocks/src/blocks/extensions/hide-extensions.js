/**
 * Per-block universal-extension opt-out.
 *
 * The universal extensions (hover, block-link, click-effects, parallax,
 * custom-spacing, animation, …) inject an inspector panel onto EVERY sgs/*
 * block. For some blocks a given panel is meaningless — a logo wall
 * (sgs/brand-strip) has no use for a whole-block link, a click ripple, or
 * parallax, and its own spacing panel makes the universal one redundant.
 *
 * A block opts out declaratively in its block.json:
 *
 *   "supports": { "sgs": { "hideExtensions": ["blockLink", "clickEffects"] } }
 *
 * This is a UNIVERSAL condition, not a per-block carve-out in the extension
 * code — every extension reads the same list, and any block opts out
 * identically. Each universal extension's editor HOC calls this and returns
 * the unmodified BlockEdit (no panel) when its slug is listed.
 *
 * Recognised slugs (match the panel each extension renders):
 *   hover · blockLink · clickEffects · parallax · spacing · animation
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

export function isExtensionHidden( nameOrSettings, slug ) {
	const supports =
		nameOrSettings && 'object' === typeof nameOrSettings
			? nameOrSettings.supports
			: getBlockType( nameOrSettings )?.supports;
	const list = supports?.sgs?.hideExtensions;
	return Array.isArray( list ) && list.includes( slug );
}
