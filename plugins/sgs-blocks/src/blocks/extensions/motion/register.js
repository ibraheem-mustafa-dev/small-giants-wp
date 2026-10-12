/**
 * Motion support registration (Spec 38A, FR-38A-1).
 *
 * A block whose block.json declares `supports.sgs.motion: true` receives one object attribute that holds its whole
 * motion model. The attribute has no default (an object default reaches the editor as an empty array) and is never
 * written into saved markup.
 *
 * The attribute name is held in a constant and the definition is assembled at run time, so no object literal keyed by
 * the attribute name exists in this folder: `scripts/generate-extension-attributes.js` scans every `.js` file under
 * `src/blocks/extensions/` for such literals and mirrors them to every block on the server. It also excludes the name
 * explicitly and its `--check` fails when a literal appears. The server side registers the attribute for supporting
 * blocks only, in `includes/motion/support-registration.php`.
 *
 * Whether a block carries the support comes from the settings this filter receives. The server strips
 * `supports.sgs.motion` from a block's registered arguments when the `sgs_motion_support_enabled` filter returns
 * false, and the editor reads its block definitions from those arguments, so one switch governs both sides.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';

export const MOTION_ATTRIBUTE_NAME = 'sgsMotion';

/**
 * Whether the block settings declare the motion support.
 *
 * @param {Object} settings Block settings.
 * @return {boolean} True when `supports.sgs.motion` is truthy.
 */
export function hasMotionSupport( settings ) {
	return Boolean( settings?.supports?.sgs?.motion );
}

/**
 * Add the motion attribute to a block that declares the support.
 *
 * @param {Object} settings Block settings.
 * @return {Object} Settings, with the motion attribute added when supported.
 */
export function addMotionAttribute( settings ) {
	if ( ! hasMotionSupport( settings ) ) {
		return settings;
	}
	const definition = { type: 'object' };
	return {
		...settings,
		attributes: {
			...settings.attributes,
			[ MOTION_ATTRIBUTE_NAME ]: definition,
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/motion-support-attribute',
	addMotionAttribute
);
