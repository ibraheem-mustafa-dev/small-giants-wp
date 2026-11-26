/**
 * The one place a composed shadow becomes declarations, in either mode every SGS shadow can draw in. PHP twin:
 * `includes/helpers-shadow-filter.php` (`sgs_shadow_decl_map`, `sgs_shadow_value_to_drop_shadow`), both pinned to
 * `tests/shared/shadow-output-cases.json`.
 *
 * - Box mode: `box-shadow` plus its forced-colours fallback.
 * - Follow-the-shape mode: `filter: drop-shadow()`, one per layer, for a surface that a mask or clip cuts into a shape (a
 *   box-shadow would be clipped with the box). The caller prints it on a node outside the clipped one. A filter has no
 *   spread and no inset, so the control hides both in this mode, and it chains layers one after another, so a layered
 *   shadow looks a little different from the same layers as a box-shadow.
 *
 * Pure: no WordPress imports, so atoms and tests load it in plain Node.
 *
 * @package SGS\Blocks
 */

import { formatLength, parseLayer, splitTop } from './shadow-layers.js';
import { shadowPresetComposed } from './shadow-presets.js';

const PRESET_REF = /^var\(--wp--preset--shadow--([a-z0-9-]+)\)$/;

/**
 * @param {string}   composed        Value from `composeShadow()`; a bare preset reference is resolved to its layers.
 * @param {Function} [resolvePreset] `( slug ) => composed layers`, '' when the theme has no such preset. Defaults to the
 *                                   registered theme presets (`shadow-presets.js`).
 * @return {string} Filter value such as `drop-shadow(0px 4px 12px #000) drop-shadow(...)`, or '' when nothing can draw.
 */
export function dropShadow( composed, resolvePreset = shadowPresetComposed ) {
	let text = composed.trim();
	if ( '' === text || 'none' === text ) {
		return '';
	}
	const preset = PRESET_REF.exec( text );
	if ( preset ) {
		text = resolvePreset( preset[ 1 ] ).trim();
		if ( '' === text || 'none' === text || PRESET_REF.test( text ) ) {
			return '';
		}
	}
	const filters = [];
	for ( const layer of splitTop( text, ',' ) ) {
		const fields = parseLayer( layer );
		if ( ! fields || fields.inset || null === fields.colour ) {
			continue;
		}
		filters.push(
			`drop-shadow(${ formatLength( fields.x ) } ${ formatLength(
				fields.y
			) } ${ formatLength( fields.blur ) } ${ fields.colour })`
		);
	}
	return filters.join( ' ' );
}

/**
 * @return {string} The nested forced-colours rule a box shadow's declaration list carries. Twin: `sgs_shadow_forced_colours_decl()`.
 */
export function shadowForcedColoursDecl() {
	return '@media (forced-colors:active){&:not(:focus-visible){outline:1px solid CanvasText;outline-offset:-1px}}';
}

/**
 * The declarations one composed shadow prints.
 *
 * @param {string}   composed                Value from `composeShadow()`.
 * @param {Object}   [options]
 * @param {boolean}  [options.followShape]   Print `filter: drop-shadow()` instead of `box-shadow`.
 * @param {Function} [options.resolvePreset] See `dropShadow()`.
 * @return {Object} Property to value (`box-shadow`, `@forced-colors`, `filter`); empty when nothing draws.
 */
export function shadowDeclMap(
	composed,
	{ followShape = false, resolvePreset } = {}
) {
	if ( '' === composed ) {
		return {};
	}
	if ( followShape ) {
		const filter =
			'none' === composed
				? 'none'
				: dropShadow( composed, resolvePreset );
		return '' === filter ? {} : { filter };
	}
	const out = { 'box-shadow': composed };
	if ( 'none' !== composed ) {
		out[ '@forced-colors' ] = shadowForcedColoursDecl();
	}
	return out;
}
