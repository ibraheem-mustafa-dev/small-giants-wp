/**
 * Motion model editor entry (Spec 38A). Imported once from `../index.js`; later units add their imports here.
 *
 * One `editor.BlockEdit` filter mounts the motion panels (`MotionPanels.js`) in the Styles tab of a selected block
 * whose type declares `supports.sgs.motion`. Whether a block type declares it is worked out once per block name, and
 * the panels receive only the motion value, so typing in a block (FR-38A-29) re-renders no motion panel and a block
 * without the support renders exactly as before.
 *
 * @package
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { MOTION_ATTRIBUTE_NAME } from './register';
import { blockHasMotion } from './support-cache';
import { delegateConfig } from './delegate-parts';
import MotionPanels from './MotionPanels';
import './motion-panels.scss';
import './layers/stamp-ambient-float';
import './canvas/with-canvas-motion';
import './HoverPanel';
import './EntrancePanel';
import './EffectsPanel';
import './stories';

export { blockHasMotion };

/**
 * The value of the attribute that switches a block's source mode (`supports.sgs.motionDelegate.attribute`), or
 * undefined for a block without one, read per block name once.
 *
 * @param {string} name       Block name.
 * @param {Object} attributes The block's attributes.
 * @return {*} The attribute's value.
 */
function delegateValueOf( name, attributes ) {
	if ( ! delegateAttributeByName.has( name ) ) {
		delegateAttributeByName.set(
			name,
			delegateConfig( getBlockType( name )?.supports?.sgs )?.attribute ?? null
		);
	}
	const attribute = delegateAttributeByName.get( name );
	return attribute === null ? undefined : attributes?.[ attribute ];
}

const delegateAttributeByName = new Map();

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
						delegateValue={ delegateValueOf( props.name, props.attributes ) }
					/>
				</>
			);
		},
	'withMotionPanels'
);

addFilter( 'editor.BlockEdit', 'sgs/motion-panels', withMotionPanels );
