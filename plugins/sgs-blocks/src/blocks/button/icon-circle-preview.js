/**
 * The filled circle behind a button's icon in the editor canvas: the twin of
 * includes/helpers-button-icon-circle.php::sgs_button_icon_circle_css(). Hover cannot show on a
 * static canvas element, so the canvas previews the resting fill and the diameter.
 *
 * @package SGS\Blocks
 */

import { resolveColourToken } from '../../components';
import { tierValueOf } from '../../utils';

export const ICON_CIRCLE_DEFAULT_DIAMETER = 'calc(var(--sgs-btn-icon-size, 1em) * 1.8)';

/**
 * The circle diameter at a device tier.
 *
 * @param {Object} shapeSize `iconShapeSize` tier object ({desktop,tablet,mobile}).
 * @param {string} tier      'desktop' | 'tablet' | 'mobile'.
 * @return {string} A CSS length: the set diameter in px, else 1.8 times the icon size.
 */
export function iconCircleDiameter( shapeSize, tier ) {
	const value = parseInt( tierValueOf( shapeSize, tier ), 10 );
	return value > 0 ? `${ value }px` : ICON_CIRCLE_DEFAULT_DIAMETER;
}

/**
 * The inline style the circle adds to the canvas icon placeholder.
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    The live colour palette.
 * @param {string} tier       The previewed device tier.
 * @return {Object} Style properties, or an empty object when neither fill is set.
 */
export function iconCirclePreviewStyle( attributes, palette, tier ) {
	const { iconBackground, iconBackgroundHover, iconShapeSize } = attributes;
	if ( ! iconBackground && ! iconBackgroundHover ) {
		return {};
	}
	const diameter = iconCircleDiameter( iconShapeSize, tier );
	const style = {
		justifyContent: 'center',
		flex: 'none',
		boxSizing: 'border-box',
		borderRadius: '50%',
		width: diameter,
		height: diameter,
	};
	const fill = iconBackground ? resolveColourToken( iconBackground, palette ) : '';
	if ( fill ) {
		style.backgroundColor = fill;
	}
	return style;
}
