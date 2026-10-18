/**
 * Card Grid — Hover Effects panel: scale and grayscale.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';

export default function CardGridHoverEffectsPanel( { attributes, setAttributes } ) {
	const {
		scaleHover,
		grayscaleHover,
	} = attributes;

	return (
				<PanelBody
					title={ __( 'Hover Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Hover Effects', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								scaleHover: '',
								grayscaleHover: false,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Hover scale', 'sgs-blocks' ) }
							hasValue={ () => !! scaleHover }
							onDeselect={ () => setAttributes( { scaleHover: '' } ) }
							isShownByDefault
						>
							<RangeControl
								label={ __( 'Hover scale', 'sgs-blocks' ) }
								value={ parseFloat( scaleHover ) || 1 }
								onChange={ ( val ) => setAttributes( { scaleHover: String( val ) } ) }
								min={ 1 }
								max={ 1.1 }
								step={ 0.01 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
							hasValue={ () => grayscaleHover !== false }
							onDeselect={ () => setAttributes( { grayscaleHover: false } ) }
						>
							<ToggleControl
								label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
								help={ __( 'Desaturates the card image at rest; restores full colour on hover.', 'sgs-blocks' ) }
								checked={ grayscaleHover }
								onChange={ ( val ) => setAttributes( { grayscaleHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
	);
}
