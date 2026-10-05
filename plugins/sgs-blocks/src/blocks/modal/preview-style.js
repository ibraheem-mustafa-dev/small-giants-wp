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

/**
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style fragment for the dialog stand-in.
 */
export function dialogPreviewStyle( attributes, palette ) {
	const style = {};
	if ( attributes.modalBackground || attributes.modalBackgroundGradient ) {
		Object.assign( style, backgroundPaintPreview( attributes.modalBackground, attributes.modalBackgroundGradient, palette ) );
	}
	const width = String( attributes.dialogWidth ?? '' ).trim();
	if ( /^\d+(\.\d+)?$/.test( width ) ) {
		const unit = [ 'px', '%', 'em', 'rem', 'vw' ].includes( attributes.dialogWidthUnit ) ? attributes.dialogWidthUnit : 'px';
		style.width = `${ width }${ unit }`;
		style.maxWidth = 'calc(100vw - 2rem)';
	}
	Object.assign( style, sgsBorderPreview( { widthValues: attributes.borderWidth, styleValue: attributes.borderStyle, colourValue: attributes.borderColour, colourGradientValue: attributes.borderColourGradient }, 'desktop', palette ) );
	const shadow = composeShadow( attributes.dialogShadow, attributes.dialogShadowColour );
	if ( shadow ) {
		style.boxShadow = shadow;
	}
	return style;
}
