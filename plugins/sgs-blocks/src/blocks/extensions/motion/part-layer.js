/**
 * Whether a block's motion holds an Entrance base layer on a part (Spec 38A FR-38A-53, unit M5.17).
 *
 * The cart, nav bar and accordion editors hide the old flat control (count pop, burger morph speed, icon rotation)
 * when the part holds a layer, since the layer then decides. The read of the motion attribute lives here, in motion
 * code, so the block edit files never name it.
 *
 * @package
 */

import { MOTION_ATTRIBUTE_NAME } from './register';

/**
 * Whether the part holds an entrance base layer.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} part       Part key.
 * @return {boolean} True when the part has a layer.
 */
export function partHasEntranceLayer( attributes, part ) {
	return !! attributes?.[ MOTION_ATTRIBUTE_NAME ]?.elements?.[ part ]
		?.entrance?.base;
}
