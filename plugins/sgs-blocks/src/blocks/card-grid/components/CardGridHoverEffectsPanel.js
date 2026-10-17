/**
 * Card Grid — Hover Effects panel: scale, grayscale, transition duration and easing.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, RangeControl, ToggleControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { EASING_OPTIONS } from './card-grid-options';

export default function CardGridHoverEffectsPanel( { attributes, setAttributes } ) {
	const {
		transitionDuration,
		transitionEasing,
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
								transitionDuration: '300',
								transitionEasing: 'ease-in-out',
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
						<ToolsPanelItem
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							hasValue={ () => transitionDuration !== '300' }
							onDeselect={ () => setAttributes( { transitionDuration: '300' } ) }
						>
							<RangeControl
								label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
								value={ parseInt( transitionDuration, 10 ) || 300 }
								onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
								min={ 100 }
								max={ 1000 }
								step={ 50 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							hasValue={ () => transitionEasing !== 'ease-in-out' }
							onDeselect={ () => setAttributes( { transitionEasing: 'ease-in-out' } ) }
						>
							<SelectControl
								label={ __( 'Transition easing', 'sgs-blocks' ) }
								value={ transitionEasing }
								options={ EASING_OPTIONS }
								onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
	);
}
