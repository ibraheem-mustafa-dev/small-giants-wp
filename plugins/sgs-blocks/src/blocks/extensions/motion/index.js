/**
 * Motion model editor entry (Spec 38A). Imported once from `../index.js`; later units add their imports here.
 *
 * One `editor.BlockEdit` filter mounts the motion panels (`MotionPanels.js`) in the Styles tab of a selected block
 * whose type declares `supports.sgs.motion`. Whether a block type declares it is worked out once per block name, and
 * the panels receive only the motion value, so typing in a block (FR-38A-29) re-renders no motion panel and a block
 * without the support renders exactly as before.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { hasMotionSupport, MOTION_ATTRIBUTE_NAME } from './register';
import MotionPanels from './MotionPanels';
import './motion-panels.scss';
import './layers/stamp-ambient-float';

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

const withMotionPanels = createHigherOrderComponent(
	( BlockEdit ) =>
		function MotionBlockEdit( props ) {
			if ( ! props.isSelected || ! blockHasMotion( props.name ) ) {
				return <BlockEdit { ...props } />;
			}
			return (
				<>
					<BlockEdit { ...props } />
					<MotionPanels
						blockName={ props.name }
						clientId={ props.clientId }
						motion={ props.attributes[ MOTION_ATTRIBUTE_NAME ] }
						setAttributes={ props.setAttributes }
					/>
				</>
			);
		},
	'withMotionPanels'
);

addFilter( 'editor.BlockEdit', 'sgs/motion-panels', withMotionPanels );
