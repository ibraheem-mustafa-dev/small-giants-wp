/**
 * Card Grid — Hover Effects panel: scale (grey to colour is the image part's Hover state).
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';

import SgsResetPanel from '../../../components/SgsResetPanel';

export default function CardGridHoverEffectsPanel( {
	attributes,
	setAttributes,
} ) {
	const { scaleHover } = attributes;

	return (
		<PanelBody
			title={ __( 'Hover Effects', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SgsResetPanel
				title={ __( 'Hover Effects', 'sgs-blocks' ) }
				items={ [
					{
						hasValue: () => !! scaleHover,
						onDeselect: () => setAttributes( { scaleHover: '' } ),
					},
				] }
				resetAll={ () =>
					setAttributes( {
						scaleHover: '',
					} )
				}
				bare
			>
				<RangeControl
					label={ __( 'Hover scale', 'sgs-blocks' ) }
					value={ parseFloat( scaleHover ) || 1 }
					onChange={ ( val ) =>
						setAttributes( { scaleHover: String( val ) } )
					}
					min={ 1 }
					max={ 1.1 }
					step={ 0.01 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</SgsResetPanel>
		</PanelBody>
	);
}
