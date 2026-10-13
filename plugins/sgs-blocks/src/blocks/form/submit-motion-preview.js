/**
 * The sgs/form submit button's shadow and lift in the editor canvas: the twin of
 * includes/helpers-form-submit-motion.php::sgs_form_submit_motion_css().
 *
 * The resting shadow is an inline style on the canvas preview button; the hover rule (a lift) is a
 * scoped stylesheet rule. A hover shadow cannot show on a static canvas element, so the canvas
 * previews the resting shadow and the lift only.
 *
 * @package SGS\Blocks
 */

import { resolveColourToken } from '../../components';
import { resolveShadowPreviewComposed } from '../../utils/tokens';
import { hoverLiftPreviewRule } from '../../utils/hover-lift';

/**
 * The inline style the resting submit shadow adds to the canvas preview button.
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    The live colour palette.
 * @return {Object} `{ boxShadow }`, or an empty object when no shadow is set.
 */
export function submitShadowPreviewStyle( attributes, palette ) {
	const boxShadow = resolveShadowPreviewComposed(
		attributes.submitShadow,
		resolveColourToken( attributes.submitShadowColour, palette )
	);
	return boxShadow ? { boxShadow } : {};
}

/**
 * The scoped hover rule for the submit button's lift.
 *
 * @param {string} selector Selector for the canvas preview button (no `:hover` suffix).
 * @param {Object} attributes Block attributes.
 * @return {string} The rule, or '' when there is no lift.
 */
export function submitLiftPreviewRule( selector, attributes ) {
	return hoverLiftPreviewRule( selector, attributes.submitLiftHover );
}
