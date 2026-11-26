/**
 * The theme's shadow presets as literal shadow text, for code that cannot use a preset reference.
 *
 * A theme preset is a CSS custom property (`var(--wp--preset--shadow--<slug>)`), which paints a `box-shadow` but cannot be
 * split into layers, so a `filter: drop-shadow()` needs the preset's own literal. The page reads it from the theme's
 * settings in PHP (`helpers-shadow-filter.php::sgs_shadow_preset_literal`); the editor reads it from the block editor's
 * settings through the `wp.data` global every editor bundle shares (a module import would copy the store into each bundle
 * and break plain Node, where atoms and tests load this file). A test or a script may register its own list instead.
 *
 * @package SGS\Blocks
 */

import { functionalColoursToHex } from './colour-hex.js';
import { composeShadow } from './shadow-layers.js';

let literals = {};

/**
 * Replace the known presets.
 *
 * @param {Array<{slug: string, shadow: string}>} presets The theme's `shadow.presets`, flattened.
 */
export function registerShadowPresets( presets ) {
	literals = Object.fromEntries(
		( Array.isArray( presets ) ? presets : [] )
			.filter(
				( preset ) =>
					preset &&
					'string' === typeof preset.slug &&
					'string' === typeof preset.shadow
			)
			.map( ( preset ) => [ preset.slug, preset.shadow ] )
	);
}

/**
 * The theme's presets as the block editor holds them (an origin-keyed object: custom, then theme, then default).
 *
 * @param {string} slug Preset slug.
 * @return {string} The literal, or '' when there is no editor or no such preset.
 */
function editorPresetLiteral( slug ) {
	const settings = globalThis.wp?.data
		?.select?.( 'core/block-editor' )
		?.getSettings?.()?.__experimentalFeatures?.shadow?.presets;
	const origins = Array.isArray( settings )
		? [ settings ]
		: [ settings?.custom, settings?.theme, settings?.default ];
	for ( const list of origins ) {
		const found = ( Array.isArray( list ) ? list : [] ).find(
			( preset ) =>
				preset?.slug === slug && 'string' === typeof preset.shadow
		);
		if ( found ) {
			return found.shadow;
		}
	}
	return '';
}

/**
 * @param {string} slug Preset slug.
 * @return {string} The preset's literal shadow text, or '' when the theme has no such preset.
 */
export function shadowPresetLiteral( slug ) {
	return literals[ slug ] || editorPresetLiteral( slug );
}

/**
 * A preset's layers composed the way a stored raw shape is, with functional colours as hex (the twin of
 * `sgs_shadow_layers( $literal, null )`).
 *
 * @param {string} slug Preset slug.
 * @return {string} A `box-shadow` value, or '' when the theme has no such preset.
 */
export function shadowPresetComposed( slug ) {
	const literal = shadowPresetLiteral( slug );
	return '' === literal
		? ''
		: functionalColoursToHex( composeShadow( literal, '' ) );
}
