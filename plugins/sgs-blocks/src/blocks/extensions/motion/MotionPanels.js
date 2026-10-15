/**
 * The motion panels of one block (Spec 38A §5): every panel registered through `panel-slots.js`, in order, in the
 * Styles tab. Each panel receives the block's name and client id, its declared parts, the motion value and the layer
 * operations, so no panel reads or writes the attribute itself.
 *
 * @package
 */

import { memo, useMemo } from '@wordpress/element';
import { InspectorControls } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { getMotionPanels } from './panel-slots';
import { useMotionLayers } from './layers/use-motion-layers';
import { delegateConfig, elementsForSourceMode, heldTargets } from './delegate-parts';

/**
 * @param {Object}           props
 * @param {string}           props.blockName     The block's name.
 * @param {string}           props.clientId      The block's client id.
 * @param {Object|undefined} props.motion        The block's motion value.
 * @param {Function}         props.setAttributes The block's `setAttributes`.
 * @param {*}                props.delegateValue The value of the attribute that switches the block's source mode, so a
 *                                               mode that prints its items as another block offers only the parts
 *                                               that reach them (`supports.sgs.motionDelegate`), plus any part that
 *                                               still holds a layer, marked as not shown in that mode.
 * @return {Element|null} The panels, or null when none is registered.
 */
function MotionPanels( { blockName, clientId, motion, setAttributes, delegateValue } ) {
	// Only which targets hold a layer reaches the memo, so editing a layer's values re-renders no panel.
	const held = heldTargets( motion ).sort().join( ' ' );
	const elements = useMemo( () => {
		const supportsSgs = getBlockType( blockName )?.supports?.sgs;
		const config = delegateConfig( supportsSgs );
		return config
			? elementsForSourceMode(
					supportsSgs,
					{ [ config.attribute ]: delegateValue },
					held ? held.split( ' ' ) : []
			  )
			: supportsSgs?.elements ?? null;
	}, [ blockName, delegateValue, held ] );
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
