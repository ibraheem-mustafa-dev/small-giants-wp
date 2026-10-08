/**
 * Post Grid — Hover effects inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, RangeControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { EASING_OPTIONS } from './constants';

export default function HoverEffectsPanel( { attributes, setAttributes, set } ) {
	const {
		imageZoomHover,
		transitionDuration,
		transitionEasing,
	} = attributes;

	return (
				<ToolsPanel
					label={ __( 'Hover Effects', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							imageZoomHover: true,
							transitionDuration: '300',
							transitionEasing: 'ease',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						hasValue={ () => transitionDuration !== '300' }
						onDeselect={ () =>
							setAttributes( { transitionDuration: '300' } )
						}
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
						hasValue={ () => transitionEasing !== 'ease' }
						onDeselect={ () =>
							setAttributes( { transitionEasing: 'ease' } )
						}
					>
						<SelectControl
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							value={ transitionEasing }
							options={ EASING_OPTIONS }
							onChange={ set( 'transitionEasing' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>
	);
}
