/**
 * The motion panels of one block (Spec 38A §5): every panel registered through `panel-slots.js`, in order, in the
 * Styles tab. Each panel receives the block's name and client id, its declared parts, the motion value and the layer
 * operations, so no panel reads or writes the attribute itself.
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { InspectorControls } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { getMotionPanels } from './panel-slots';
import { useMotionLayers } from './layers/use-motion-layers';

/**
 * @param {Object}           props
 * @param {string}           props.blockName     The block's name.
 * @param {string}           props.clientId      The block's client id.
 * @param {Object|undefined} props.motion        The block's motion value.
 * @param {Function}         props.setAttributes The block's `setAttributes`.
 * @return {Element|null} The panels, or null when none is registered.
 */
function MotionPanels( { blockName, clientId, motion, setAttributes } ) {
	const elements = getBlockType( blockName )?.supports?.sgs?.elements ?? null;
	const layers = useMotionLayers( motion, setAttributes, elements );
	const panels = getMotionPanels();
	if ( ! panels.length ) {
		return null;
	}
	return (
		<InspectorControls group="styles">
			{ panels.map( ( { id, Component } ) => (
				<Component
					key={ id }
					blockName={ blockName }
					clientId={ clientId }
					elements={ elements }
					motion={ motion }
					layers={ layers }
				/>
			) ) }
		</InspectorControls>
	);
}

export default memo( MotionPanels );
