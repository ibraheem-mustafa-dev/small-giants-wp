/**
 * Card Grid — Grid Settings panel: variant, aspect ratio, image height, image padding and hover effect.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import { ResponsiveOverride, SgsBoxControl, BOX_UNITS, normaliseResponsiveBox, SgsLengthControl } from '../../../components';
import { VARIANT_OPTIONS, ASPECT_RATIO_OPTIONS, HOVER_OPTIONS } from './card-grid-options';

export default function GridSettingsPanel( { attributes, setAttributes } ) {
	const {
		variant,
		aspectRatio,
		effectHover,
	} = attributes;

	return (
				<PanelBody
					title={ __( 'Grid Settings', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Responsive columns (desktop/tablet/mobile) are provided by the
					     ContainerWrapperControls LayoutPanel above when layout=grid.
					     Duplicate direct controls removed (Rule 3, Step 7b). */ }
					<SelectControl
						label={ __( 'Aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { aspectRatio: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ResponsiveOverride
						label={ __( 'Image height', 'sgs-blocks' ) }
						value={ attributes.imageHeight }
						onChange={ ( obj ) => setAttributes( { imageHeight: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Image height', 'sgs-blocks' ) }
								hideLabelFromVision
								help={ __( 'A fixed height for every image area, instead of the aspect ratio (e.g. a row of logos). Empty keeps the aspect ratio.', 'sgs-blocks' ) }
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.imagePadding }
						onChange={ ( obj ) => setAttributes( { imagePadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Image padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effectHover: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
	);
}
