/**
 * Editor-canvas mirror of the per-element styles render.php scopes onto the
 * language switch: link colour and typography, the current-language colour,
 * the separator colour, the list gap and the disclosure panel's background
 * and padding.
 *
 * @package SGS\Blocks
 */

import { resolveColourToken } from '../../components';
import {
	resolveResponsiveTier,
	sgsNormaliseLength,
	textPaintPreview,
	typographyPreviewStyle,
	tierBoxLonghands,
} from '../../utils';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier from usePreviewTier().
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style objects keyed by the element each one paints.
 */
export function languageSwitchPreview( attributes, tier, palette ) {
	const linkPaint = textPaintPreview( attributes.linkColour, attributes.linkColourGradient, palette );
	const linkStyle = {
		...typographyPreviewStyle( attributes, '', tier ),
		// With no client colour the link takes the palette text token, as render.php does.
		...( Object.keys( linkPaint ).length ? linkPaint : { color: 'var(--wp--preset--color--text)' } ),
	};

	const currentColour = resolveColourToken( attributes.currentColour, palette );
	const separatorColour = resolveColourToken( attributes.separatorColour, palette );
	const panelBackground = resolveColourToken( attributes.panelBackground, palette );
	const gapRaw = resolveResponsiveTier( attributes.gap, tier )?.value;
	const gap = sgsNormaliseLength( gapRaw );

	return {
		linkStyle,
		currentLinkStyle: { ...linkStyle, ...( currentColour ? { color: currentColour } : {} ) },
		separatorStyle: separatorColour ? { color: separatorColour } : {},
		panelStyle: {
			...( panelBackground ? { backgroundColor: panelBackground } : {} ),
			...tierBoxLonghands( attributes.panelPadding, tier, 'padding' ),
		},
		listStyle: gap ? { gap } : {},
	};
}
