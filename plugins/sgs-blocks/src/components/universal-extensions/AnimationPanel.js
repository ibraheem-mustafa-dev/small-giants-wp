/**
 * AnimationPanel — shared Inspector panel for scroll-triggered animation.
 *
 * Renders the animation type, delay, duration, and easing controls. This
 * component is a convenience wrapper around the controls already provided
 * globally by src/blocks/extensions/animation.js (which registers them on all
 * sgs/* blocks via addFilter('editor.BlockEdit')). Use this panel directly
 * inside a block's edit.js when you want the controls at a specific inspector
 * position rather than appended to the end.
 *
 * NOTE: animation.js already wires these controls to every sgs/* block globally
 * (except the denylist: tab, accordion-item, form-step, form-review, form-field-*).
 * Only import this component if you need custom placement.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import AnimationControl from '../AnimationControl';

/**
 * AnimationPanel component.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes callback.
 * @return {JSX.Element} Inspector panel.
 */
export default function AnimationPanel( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Animation', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<AnimationControl
					animation={ attributes.sgsAnimation }
					animationDelay={ attributes.sgsAnimationDelay }
					animationDuration={ attributes.sgsAnimationDuration }
					animationEasing={ attributes.sgsAnimationEasing }
					onChangeAnimation={ ( val ) =>
						setAttributes( { sgsAnimation: val } )
					}
					onChangeDelay={ ( val ) =>
						setAttributes( { sgsAnimationDelay: val } )
					}
					onChangeDuration={ ( val ) =>
						setAttributes( { sgsAnimationDuration: val } )
					}
					onChangeEasing={ ( val ) =>
						setAttributes( { sgsAnimationEasing: val } )
					}
				/>
			</PanelBody>
		</InspectorControls>
	);
}
