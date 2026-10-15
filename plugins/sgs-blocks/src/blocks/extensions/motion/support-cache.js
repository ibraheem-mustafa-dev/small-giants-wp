/**
 * Whether a block type declares the motion support (Spec 38A FR-38A-1), worked out once per block name, so the editor
 * filters that run for every block (the panels in `index.js`, the canvas preview in `canvas/with-canvas-motion.js`)
 * cost a map lookup on a block without it.
 *
 * @package SGS\Blocks
 */
import { getBlockType } from '@wordpress/blocks';
import { hasMotionSupport } from './register';

const supportByName = new Map();

/**
 * Whether a block type declares the motion support, remembered per block name once the type is registered.
 *
 * @param {string} name Block name.
 * @return {boolean} True when `supports.sgs.motion` is declared.
 */
export function blockHasMotion( name ) {
	if ( supportByName.has( name ) ) {
		return supportByName.get( name );
	}
	const type = getBlockType( name );
	const supported = hasMotionSupport( type );
	if ( type ) {
		supportByName.set( name, supported );
	}
	return supported;
}
