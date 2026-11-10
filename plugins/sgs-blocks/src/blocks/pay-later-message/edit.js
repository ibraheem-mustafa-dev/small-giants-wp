/**
 * Pay later message: editor component. Stripe draws the real message on the front end from
 * the live cart total; the editor shows a stand-in line and the inspector settings.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { SgsColourPanel, textRow } from '../../components';
import { colourVar } from '../../utils';

export default function Edit( { attributes, setAttributes } ) {
	const { method, countryCode, logoColour, fontSize, textColour } =
		attributes;
	const colour = colourVar( textColour );
	return (
		<div
			{ ...useBlockProps( {
				className: 'sgs-pay-later',
				style: {
					color: colour || undefined,
					fontSize: fontSize ? `${ fontSize }px` : undefined,
				},
			} ) }
		>
			<InspectorControls>
				<PanelBody title={ __( 'Message', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Payment method', 'sgs-blocks' ) }
						value={ method }
						options={ [
							{ value: 'klarna', label: 'Klarna' },
							{
								value: 'afterpay_clearpay',
								label: 'Afterpay / Clearpay',
							},
							{ value: 'affirm', label: 'Affirm' },
						] }
						onChange={ ( value ) =>
							setAttributes( { method: value } )
						}
						help={ __(
							'Shown only when this method is enabled in the Stripe plugin.',
							'sgs-blocks'
						) }
					/>
					<TextControl
						label={ __( 'Country (two letters)', 'sgs-blocks' ) }
						value={ countryCode }
						maxLength={ 2 }
						onChange={ ( value ) =>
							setAttributes( { countryCode: value } )
						}
						help={ __(
							'Empty uses the shopper’s shipping country, then the shop’s base country.',
							'sgs-blocks'
						) }
					/>
					<SelectControl
						label={ __( 'Logo colour', 'sgs-blocks' ) }
						value={ logoColour }
						options={ [
							{
								value: 'black',
								label: __( 'Black', 'sgs-blocks' ),
							},
							{
								value: 'white',
								label: __( 'White', 'sgs-blocks' ),
							},
							{
								value: 'color',
								label: __( 'Brand colour', 'sgs-blocks' ),
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { logoColour: value } )
						}
					/>
					<RangeControl
						label={ __(
							'Text size (px, 0 = default)',
							'sgs-blocks'
						) }
						value={ fontSize }
						min={ 0 }
						max={ 24 }
						step={ 0.5 }
						onChange={ ( value ) =>
							setAttributes( { fontSize: value || 0 } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsColourPanel
						rows={ [
							textRow( {
								key: 'payLaterText',
								label: __( 'Text', 'sgs-blocks' ),
								attrs: { base: 'textColour' },
								attributes,
								setAttributes,
							} ),
						] }
					/>
				</PanelBody>
			</InspectorControls>
			<span>
				{ __(
					'Pay later message: Stripe shows the instalment terms here from the cart total.',
					'sgs-blocks'
				) }
			</span>
		</div>
	);
}
