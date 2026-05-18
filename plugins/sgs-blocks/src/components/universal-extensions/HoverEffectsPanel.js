/**
 * HoverEffectsPanel — shared Inspector panel for universal hover effects.
 *
 * Renders the hover colour, scale, shadow, image-zoom, transition duration, and
 * easing controls. This component is a convenience wrapper around the controls
 * already provided globally by src/blocks/extensions/hover-effects.js (which
 * registers them on all blocks via addFilter('editor.BlockEdit')). Use this panel
 * directly inside a block's edit.js when you want the controls at a specific
 * inspector position rather than appended to the end.
 *
 * NOTE: hover-effects.js already wires these controls to every block globally.
 * Only import this component if you need custom placement.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import DesignTokenPicker from '../DesignTokenPicker';

const SCALE_PRESET_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle (1.02)', 'sgs-blocks' ), value: '1.02' },
	{ label: __( 'Medium (1.05)', 'sgs-blocks' ), value: '1.05' },
	{ label: __( 'Strong (1.1)', 'sgs-blocks' ), value: '1.1' },
];

const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'sm' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'md' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'lg' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const DURATION_OPTIONS = [
	{ label: __( 'Instant (60ms)', 'sgs-blocks' ), value: 'instant' },
	{ label: __( 'Fast (150ms)', 'sgs-blocks' ), value: 'fast' },
	{ label: __( 'Medium (300ms)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Slow (500ms)', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Extra slow (800ms)', 'sgs-blocks' ), value: 'extra-slow' },
];

const EASING_OPTIONS = [
	{ label: __( 'Default (Material)', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Spring (bouncy)', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

/**
 * HoverEffectsPanel component.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes callback.
 * @return {JSX.Element} Inspector panel.
 */
export default function HoverEffectsPanel( { attributes, setAttributes } ) {
	const {
		sgsHoverBgColour,
		sgsHoverTextColour,
		sgsHoverBorderColour,
		sgsHoverScale,
		sgsHoverScalePreset,
		sgsHoverShadow,
		sgsHoverDuration,
		sgsHoverEasing,
		sgsHoverImageZoom,
	} = attributes;

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Hover Effects', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<DesignTokenPicker
					label={ __( 'Hover background', 'sgs-blocks' ) }
					value={ sgsHoverBgColour }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverBgColour: val || '' } )
					}
				/>
				<DesignTokenPicker
					label={ __( 'Hover text colour', 'sgs-blocks' ) }
					value={ sgsHoverTextColour }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverTextColour: val || '' } )
					}
				/>
				<DesignTokenPicker
					label={ __( 'Hover border colour', 'sgs-blocks' ) }
					value={ sgsHoverBorderColour }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverBorderColour: val || '' } )
					}
				/>
				<SelectControl
					label={ __( 'Hover scale preset', 'sgs-blocks' ) }
					value={ sgsHoverScalePreset || '' }
					options={ SCALE_PRESET_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverScalePreset: val } )
					}
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Hover scale (fine, %)', 'sgs-blocks' ) }
					help={ __( '0 = no scale. 105 = 5% larger. Overrides preset above.', 'sgs-blocks' ) }
					value={ sgsHoverScale || 0 }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverScale: val } )
					}
					min={ 0 }
					max={ 120 }
					step={ 1 }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Hover shadow', 'sgs-blocks' ) }
					value={ sgsHoverShadow || '' }
					options={ SHADOW_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverShadow: val } )
					}
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Zoom image on hover', 'sgs-blocks' ) }
					help={ __( 'Gently scales any image inside the block when hovered.', 'sgs-blocks' ) }
					checked={ !! sgsHoverImageZoom }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverImageZoom: val } )
					}
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Transition duration', 'sgs-blocks' ) }
					value={ sgsHoverDuration || 'medium' }
					options={ DURATION_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverDuration: val } )
					}
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Transition easing', 'sgs-blocks' ) }
					value={ sgsHoverEasing || 'default' }
					options={ EASING_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { sgsHoverEasing: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</InspectorControls>
	);
}
