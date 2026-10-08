/**
 * Card Grid — Card spacing panel and the Card Styling (resting state) preset panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import { SgsLengthControl } from '../../../components';
import { CARD_STYLE_PRESETS, CARD_STYLE_PRESET_OPTIONS } from './card-grid-options';

export default function CardSpacingStylingPanel( { attributes, setAttributes } ) {
	return (
		<>
				<PanelBody
					title={ __( 'Card spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Space below title', 'sgs-blocks' ) }
						help={ __( 'The gap between a card title and its subtitle. Empty keeps the theme spacing.', 'sgs-blocks' ) }
						value={ attributes.titleMarginBottom || '' }
						onChange={ ( val ) => setAttributes( { titleMarginBottom: val || '' } ) }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Card Styling (resting state)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { margin: '0 0 12px', fontSize: 12, color: '#757575' } }>
						{ __(
							'Leave any field empty to keep the theme default — these only override the card at rest (see also Hover effect above for the hover styling).',
							'sgs-blocks'
						) }
					</p>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value=""
						options={ CARD_STYLE_PRESET_OPTIONS }
						onChange={ ( preset ) => {
							if ( ! preset || ! CARD_STYLE_PRESETS[ preset ] ) {
								return;
							}
							setAttributes( CARD_STYLE_PRESETS[ preset ] );
						} }
						help={ __(
							'Sets background, border, radius and shadow together as a starting point — fine-tune any field below afterwards.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Border width + corner radius moved to the "Card" (item
					     element) colour panel above, Styles tab — D622. */ }
					{ /* cardShadow/cardShadowHover moved to the "Card" (item element)
					   colour panel above, Styles tab — Spec 35 THE PLACEMENT RULE
					   groups the shadow builder (shape + colour) with the rest of
					   the item's colour states rather than in this box-styling
					   panel. */ }
				</PanelBody>
		</>
	);
}
