/**
 * The sgs/form button shape in the editor canvas: border, radius, text colour, padding and
 * resting shadow of the Submit, Next or Previous preview button. The twin of
 * includes/helpers-button-style.php::sgs_button_element_style_css() (border, radius, padding, text
 * colour) and includes/helpers-form-submit-motion.php::sgs_form_submit_motion_css() (shadow).
 *
 * @package SGS\Blocks
 */

import { resolveColourToken } from '../../components';
import { sgsBorderPreview } from '../../utils/border-preview';
import { resolveShadowPreviewComposed } from '../../utils/tokens';

/**
 * The inline style a button's shape settings add to its canvas preview button.
 *
 * @param {Object}  attributes             Block attributes.
 * @param {string}  prefix                 Button attribute prefix: 'submit', 'next' or 'prev'.
 * @param {Array}   palette                The live colour palette.
 * @param {string}  tier                   Previewed device tier.
 * @param {Object}  [options]
 * @param {boolean} [options.full=true]    Also read the text colour, padding and shadow (Submit has its own previews of those).
 * @return {Object} React style fragment; {} when nothing is set.
 */
export function formButtonShapePreviewStyle( attributes, prefix, palette, tier, { full = true } = {} ) {
	const style = sgsBorderPreview(
		{
			widthValues: attributes[ `${ prefix }BorderWidth` ],
			styleValue: attributes[ `${ prefix }BorderStyle` ],
			colourValue: attributes[ `${ prefix }ColourBorder` ],
			radiusValues: attributes[ `${ prefix }BorderRadius` ],
		},
		tier,
		palette
	);
	if ( ! full ) {
		return style;
	}
	const colour = resolveColourToken( attributes[ `${ prefix }ColourText` ], palette );
	if ( colour ) {
		style.color = colour;
	}
	const padding = attributes[ `${ prefix }Padding` ];
	if ( padding && 'object' === typeof padding && Object.values( padding ).some( Boolean ) ) {
		style.padding = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) => padding[ side ] || '0' ).join( ' ' );
	}
	const boxShadow = resolveShadowPreviewComposed(
		attributes[ `${ prefix }Shadow` ],
		resolveColourToken( attributes[ `${ prefix }ShadowColour` ], palette )
	);
	if ( boxShadow ) {
		style.boxShadow = boxShadow;
	}
	return style;
}
