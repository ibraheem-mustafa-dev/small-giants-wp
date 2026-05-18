/**
 * DeviceVisibilityPanel — shared Inspector panel for device-based block visibility.
 *
 * Renders the three hide-on-mobile / hide-on-tablet / hide-on-desktop toggles.
 * This component is a convenience wrapper around the controls already provided
 * globally by src/blocks/extensions/responsive-visibility.js (which registers
 * them on all blocks via addFilter('editor.BlockEdit')). Use this panel directly
 * inside a block's edit.js if you want the controls in a *custom* position inside
 * the inspector rather than appended to the end.
 *
 * NOTE: The responsive-visibility extension already wires these controls to every
 * block globally. Adding this panel a second time to a specific block's edit.js
 * will show duplicate controls. Only import this component when you deliberately
 * want to move the controls to a specific position in the inspector.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, Icon } from '@wordpress/components';
import { mobile, tablet, desktop } from '@wordpress/icons';

/**
 * DeviceVisibilityPanel component.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes callback.
 * @return {JSX.Element} Inspector panel.
 */
export default function DeviceVisibilityPanel( { attributes, setAttributes } ) {
	const { sgsHideOnMobile, sgsHideOnTablet, sgsHideOnDesktop } = attributes;

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Device Visibility', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={
						<>
							<Icon icon={ mobile } size={ 16 } />{ ' ' }
							{ __( 'Hide on mobile', 'sgs-blocks' ) }
						</>
					}
					help={ __( 'Below 600px', 'sgs-blocks' ) }
					checked={ !! sgsHideOnMobile }
					onChange={ ( val ) =>
						setAttributes( { sgsHideOnMobile: val } )
					}
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={
						<>
							<Icon icon={ tablet } size={ 16 } />{ ' ' }
							{ __( 'Hide on tablet', 'sgs-blocks' ) }
						</>
					}
					help={ __( '600px to 1023px', 'sgs-blocks' ) }
					checked={ !! sgsHideOnTablet }
					onChange={ ( val ) =>
						setAttributes( { sgsHideOnTablet: val } )
					}
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={
						<>
							<Icon icon={ desktop } size={ 16 } />{ ' ' }
							{ __( 'Hide on desktop', 'sgs-blocks' ) }
						</>
					}
					help={ __( '1024px and above', 'sgs-blocks' ) }
					checked={ !! sgsHideOnDesktop }
					onChange={ ( val ) =>
						setAttributes( { sgsHideOnDesktop: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</InspectorControls>
	);
}
