/**
 * Editor-canvas mirror of what render.php scopes onto the theme toggle: the
 * button's box (padding, border, radius) and fill, the label's colour and
 * typography, the icons' colour and the per-device icon-only classes.
 *
 * @package SGS\Blocks
 */

import { resolveColourToken } from '../../components';
import { backgroundPaintPreview, typographyPreviewStyle, boxPreview, tierLengthPreview } from '../../utils';

/**
 * Effective icon-only value for each tier: a tablet or mobile value left unset
 * inherits the tier above, exactly as render.php resolves it.
 *
 * @param {Object} attributes Block attributes.
 * @return {{ base: boolean, tablet: boolean, mobile: boolean }} Effective value per tier.
 */
function iconOnlyByTier( attributes ) {
	const unset = ( value ) => null === value || undefined === value || '' === value;
	const base = !! attributes.iconOnly;
	const tablet = unset( attributes.iconOnlyTablet ) ? base : !! attributes.iconOnlyTablet;
	const mobile = unset( attributes.iconOnlyMobile ) ? tablet : !! attributes.iconOnlyMobile;
	return { base, tablet, mobile };
}

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier from usePreviewTier().
 * @param {Array}  palette    Theme colour palette.
 * @return {{ buttonStyle: Object, labelStyle: Object, iconStyle: Object, iconOnlyClasses: string[] }} Per-element styles and classes.
 */
export function themeTogglePreview( attributes, tier, palette ) {
	const textColour = resolveColourToken( attributes.textColour, palette );
	const iconColour = resolveColourToken( attributes.iconColour, palette );
	const iconOnly = iconOnlyByTier( attributes );
	// The icons themselves are drawn on the front end; the canvas shows each icon's box at the chosen size.
	const iconSize = tierLengthPreview( attributes.iconSize, tier, 'px' );

	return {
		buttonStyle: {
			...boxPreview( attributes, tier, palette ),
			...backgroundPaintPreview( attributes.backgroundColour, '', palette ),
		},
		labelStyle: {
			...typographyPreviewStyle( attributes, 'label', tier ),
			...( textColour ? { color: textColour } : {} ),
		},
		iconStyle: {
			...( iconColour ? { color: iconColour } : {} ),
			...( iconSize ? { width: iconSize, height: iconSize } : {} ),
		},
		iconOnlyClasses: [
			iconOnly.base ? 'sgs-theme-toggle--icon-only' : '',
			iconOnly.tablet ? 'sgs-theme-toggle--icon-only-tablet' : '',
			iconOnly.mobile ? 'sgs-theme-toggle--icon-only-mobile' : '',
		].filter( Boolean ),
	};
}
