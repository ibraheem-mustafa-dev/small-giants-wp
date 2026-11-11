/**
 * Card Grid — Grid Settings panel: variant and image padding. The image ratio, height, fit, radius and shape are the adopted media panels (edit.js).
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import { ResponsiveOverride, SgsBoxControl, BOX_UNITS, normaliseResponsiveBox } from '../../../components';
import { VARIANT_OPTIONS } from './card-grid-options';

export default function GridSettingsPanel( { attributes, setAttributes } ) {
	const { variant } = attributes;

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
				</PanelBody>
	);
}
