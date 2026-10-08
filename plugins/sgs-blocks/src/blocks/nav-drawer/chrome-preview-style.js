/**
 * Editor-canvas mirrors for the nav drawer's top row, close box and shell.
 *
 * `includes/nav-drawer-chrome-css.php` prints the row's height, gap, padding and
 * fill, the free slot's type and colour, the built-in button look and the close
 * box into the drawer's scoped stylesheet; the canvas is hand-built markup that
 * stylesheet never reaches, so these build the same values at the previewed
 * device tier. Editor-only: the front end carries no inline style.
 *
 * @package SGS\Blocks
 */
import {
	backgroundPaintPreview,
	textPaintPreview,
	borderPaintPreview,
	borderBoxPreview,
	borderRadiusLonghands,
	boxLonghands,
	tierBoxLonghands,
	tierLengthPreview,
	typographyPreviewStyle,
	wrapperBorderPreview,
} from '../../utils';
import { resolveColourToken } from '../../components';

/**
 * The chrome row: min-height, gap, padding and fill.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment.
 */
export function chromeRowStyle( attributes, tier, palette ) {
	const style = backgroundPaintPreview( attributes.chromeRowBg, attributes.chromeRowBgGradient, palette );
	const minHeight = tierLengthPreview( attributes.chromeRowHeight, tier );
	const gap = tierLengthPreview( attributes.chromeRowGap, tier );
	const padding = tierBoxLonghands( attributes.chromeRowPadding, tier, 'padding' );
	if ( minHeight ) {
		style.minHeight = minHeight;
	}
	if ( gap ) {
		style.gap = gap;
	}
	Object.assign( style, padding );
	return style;
}

/**
 * The built-in button look the slot takes when its type is `button`
 * (the twin of sgs_button_element_style_css() for the `chromeButton` prefix).
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment.
 */
function chromeButtonStyle( attributes, palette ) {
	const style = backgroundPaintPreview( attributes.chromeButtonColourBackground, attributes.chromeButtonColourBackgroundGradient, palette );
	Object.assign( style, textPaintPreview( attributes.chromeButtonColourText, attributes.chromeButtonColourTextGradient, palette ) );
	const border = resolveColourToken( attributes.chromeButtonColourBorder, palette );
	if ( border ) {
		style.borderColor = border;
	}
	Object.assign(
		style,
		borderBoxPreview( attributes.chromeButtonBorderWidth, attributes.chromeButtonBorderStyle ),
		borderRadiusLonghands( attributes.chromeButtonBorderRadius )
	);
	Object.assign( style, boxLonghands( attributes.chromeButtonPadding, 'padding' ) );
	return style;
}

/**
 * The free slot's own style: its typography, then the button look for a button
 * or the text colour for every other type.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment.
 */
export function chromeSlotStyle( attributes, tier, palette ) {
	const style = typographyPreviewStyle( attributes, 'chromeSlot', tier );
	if ( 'button' === attributes.chromeSlotType ) {
		return { ...style, ...chromeButtonStyle( attributes, palette ) };
	}
	return { ...style, ...textPaintPreview( attributes.chromeSlotColour, attributes.chromeSlotColourGradient, palette ) };
}

/**
 * The drawer shell's border and corner radius.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment.
 */
export function shellBorderStyle( attributes, tier, palette ) {
	return wrapperBorderPreview( attributes, tier, palette );
}

/**
 * The close box's own border, set on the preview × (the box border is one box
 * for every device, as the SgsBorderControl family stores it).
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment.
 */
export function closeBorderStyle( attributes, palette ) {
	const style = borderBoxPreview( attributes.closeBorderWidth, attributes.closeBorderStyle );
	if ( style.borderStyle ) {
		Object.assign( style, borderPaintPreview( attributes.closeBorderColour, '', palette ) );
	}
	return style;
}
