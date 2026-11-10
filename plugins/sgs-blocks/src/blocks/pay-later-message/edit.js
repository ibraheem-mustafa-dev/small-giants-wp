/**
 * Pay later message: editor component. Stripe draws the real message on the front end from
 * the live cart total; the editor shows a stand-in line and the inspector settings.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { method, countryCode } = attributes;
	const methodLabel =
		{
			klarna: 'Klarna',
			afterpay_clearpay: 'Afterpay / Clearpay',
			affirm: 'Affirm',
		}[ method ] || method;
	return (
		<div
			{ ...useBlockProps( {
				className: 'sgs-pay-later',
			} ) }
		>
			<InspectorControls>
				<PanelBody title={ __( 'Message', 'sgs-blocks' ) }>
					<SelectControl
						__next40pxDefaultSize
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
						__next40pxDefaultSize
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
				</PanelBody>
			</InspectorControls>
			<span>
				{ methodLabel }
				{ countryCode ? ` (${ countryCode.toUpperCase() })` : '' }
				{ ' · ' }
				{ __(
					'Stripe shows the instalment terms here from the cart total.',
					'sgs-blocks'
				) }
			</span>
		</div>
	);
}
