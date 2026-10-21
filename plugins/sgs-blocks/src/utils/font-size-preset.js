/**
 * A glyph size stored on the font-size scale (a CSS length, or `var(--wp--preset--font-size--{slug})`) as a pixel
 * number, for an editor preview that takes px (IconPreview). The page resolves the var() in CSS; a canvas component
 * that needs a number looks the preset up in the theme's font sizes.
 *
 * @package
 */

import { flattenPresetSetting } from './presetSettings';

const FONT_SIZE_PRESET_RE = /^var\(--wp--preset--font-size--([a-z0-9-]+)\)$/;
const LENGTH_RE = /^(\d*\.?\d+)\s*(px|rem|em)?$/i;

/**
 * @param {*}            value         Stored size: '24px', '1.5rem', a font-size preset var, or empty.
 * @param {Array|Object} fontSizes     `useSettings( 'typography.fontSizes' )` (a flat list or an origin-keyed object).
 * @param {number}       [fallback=32] Returned when the value is empty or not a plain length (a fluid clamp(), a keyword).
 * @return {number} Whole pixels (rem and em count 16px).
 */
export function glyphSizePx( value, fontSizes, fallback = 32 ) {
	let raw = 'string' === typeof value ? value.trim() : value;
	const slug = FONT_SIZE_PRESET_RE.exec( String( raw ?? '' ) )?.[ 1 ];
	if ( slug ) {
		raw = flattenPresetSetting( fontSizes ).find(
			( size ) => size.slug === slug
		)?.size;
	}
	const match = LENGTH_RE.exec( String( raw ?? '' ).trim() );
	if ( ! match ) {
		return fallback;
	}
	const unit = ( match[ 2 ] || 'px' ).toLowerCase();
	const px = Math.round(
		parseFloat( match[ 1 ] ) * ( 'px' === unit ? 1 : 16 )
	);
	return px > 0 ? px : fallback;
}
