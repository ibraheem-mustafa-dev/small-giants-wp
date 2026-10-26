/**
 * sgs/modal — the dialog's paint on the editor canvas. The canvas never opens
 * the real <dialog>; its content area stands in for the dialog box, so it
 * carries the dialog's background, width, border and shadow as render.php's
 * `.sgs-modal__dialog` rules paint them.
 *
 * @package SGS\Blocks
 */

import { backgroundPaintPreview, sgsBorderPreview } from '../../utils';
import { composeShadow } from '../../utils/shadow-layers';
import { cssLengthValue } from '../../utils/css-length';
import { resolveTier } from '../../utils/responsive';

/**
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette.
 * @param {string} tier       Previewed tier from `usePreviewTier()`.
 * @return {Object} Style fragment for the dialog stand-in.
 */
export function dialogPreviewStyle( attributes, palette, tier = 'desktop' ) {
	const style = {};
	if ( attributes.modalBackground || attributes.modalBackgroundGradient ) {
		Object.assign( style, backgroundPaintPreview( attributes.modalBackground, attributes.modalBackgroundGradient, palette ) );
	}
	const width = cssLengthValue( resolveTier( attributes.dialogWidth, tier, '' ).value ?? '' );
	if ( width ) {
		style.width = width;
		style.maxWidth = 'calc(100vw - 2rem)';
	}
	Object.assign( style, sgsBorderPreview( { widthValues: attributes.borderWidth, styleValue: attributes.borderStyle, colourValue: attributes.borderColour, colourGradientValue: attributes.borderColourGradient }, 'desktop', palette ) );
	const shadow = composeShadow( attributes.dialogShadow, attributes.dialogShadowColour );
	if ( shadow ) {
		style.boxShadow = shadow;
	}
	return style;
}
