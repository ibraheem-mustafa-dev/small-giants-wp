/**
 * Editor-canvas mirror for the gallery's caption paint.
 *
 * render.php prints the caption's text colour and fill into a scoped stylesheet; the canvas has no server render, so these
 * build the same values for the previewed device tier. Editor-only: the front
 * end carries no inline style.
 *
 * @package SGS\Blocks
 */
import {
	textPaintPreview,
	resolveTextColourPreviewStyle,
	colourVar,
} from '../../utils';

/**
 * The caption's text paint and the custom property its fill layer reads.
 *
 * A gradient wins over the flat colour for both, as render.php's
 * sgs_background_paint_decl() and sgs_resolve_text_colour_or_gradient() do.
 * The fill is a `::after` layer in editor.css (the front end draws the same
 * layer), so a gradient text colour never clips it.
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment for the figcaption.
 */
export function captionPreviewStyle( attributes, palette ) {
	const style = { ...textPaintPreview( attributes.captionColour, attributes.captionColourGradient, palette ) };
	const gradient = resolveTextColourPreviewStyle( '', attributes.captionBgColourGradient ).backgroundImage;
	const fill = gradient || colourVar( attributes.captionBgColour );
	if ( fill ) {
		style[ '--sgs-gallery-caption-fill' ] = fill;
	}
	return style;
}
