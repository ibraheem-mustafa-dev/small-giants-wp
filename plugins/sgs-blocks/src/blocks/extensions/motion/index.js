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
import { MOTION_ATTRIBUTE_NAME } from './register';
import { blockHasMotion } from './support-cache';
import MotionPanels from './MotionPanels';
import './motion-panels.scss';
import './layers/stamp-ambient-float';
import './canvas/with-canvas-motion';
import './EntrancePanel';

export { blockHasMotion };

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
