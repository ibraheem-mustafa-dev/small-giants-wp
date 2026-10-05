/**
 * Editor-canvas mirror of the section-kind wrapper's own-surface settings on
 * the OUTER element: min-height, box shadow, the tablet and mobile background
 * images and the surface tone class.
 *
 * @package SGS\Blocks
 */

import { backgroundPreview, tierBackgroundImageUrl } from './background-preview';
import { tierValueOf } from './responsive';
import { wrapperToneClass } from './surface-preview';
import { resolveShadowPreviewComposed } from './tokens';

/**
 * @param {Object} attributes     Block attributes.
 * @param {string} tier           Previewed device tier from usePreviewTier().
 * @param {Array}  palette        Theme colour palette.
 * @param {Array}  gradientPresets Theme gradient presets.
 * @return {{ style: Object, className: string }} Outer style fragment and class names.
 */
export function sectionPreview( attributes, tier, palette, gradientPresets ) {
	const style = {};

	const minHeight = tierValueOf( attributes.minHeight, tier );
	if ( minHeight ) {
		style.minHeight = minHeight;
	}
	const shadow = resolveShadowPreviewComposed( attributes.shadow, attributes.shadowColour );
	if ( shadow ) {
		style.boxShadow = shadow;
	}

	// Tablet and mobile background images paint at their own device tier; a mobile
	// preview falls back to the tablet image, as the front end's cascading media queries do.
	const tierImageUrl = tierBackgroundImageUrl( null, attributes.backgroundImageTablet, attributes.backgroundImageMobile, tier );
	let className = wrapperToneClass( { ...attributes, surfaceTone: attributes.surfaceTone }, palette, gradientPresets );
	if ( tierImageUrl ) {
		const tierBackground = backgroundPreview(
			{
				backgroundImage: { url: tierImageUrl },
				backgroundSize: attributes.backgroundSize,
				backgroundPosition: attributes.backgroundPosition,
				backgroundRepeat: attributes.backgroundRepeat,
			},
			palette,
			gradientPresets
		);
		Object.assign( style, tierBackground.style );
		className = [ className, tierBackground.className ].filter( Boolean ).join( ' ' );
	}

	return { style, className };
}
