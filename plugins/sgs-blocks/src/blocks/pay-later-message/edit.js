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
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';
import { colourVar } from '../../utils';

export default function Edit( { attributes, setAttributes } ) {
	const { method, countryCode, logoColour, fontSize, textColour } =
		attributes;
	const colour = colourVar( textColour );
	const methodLabel =
		{
			klarna: 'Klarna',
			afterpay_clearpay: 'Afterpay / Clearpay',
			affirm: 'Affirm',
		}[ method ] || method;
	const logoLabel = {
		black: __( 'black logo', 'sgs-blocks' ),
		white: __( 'white logo', 'sgs-blocks' ),
		color: __( 'colour logo', 'sgs-blocks' ),
	}[ logoColour ];
	return (
		<div
			{ ...useBlockProps( {
				className: `sgs-pay-later sgs-pay-later--logo-${ logoColour }`,
				'data-method': method,
				'data-country': countryCode || undefined,
				style: {
					color: colour || undefined,
					fontSize: fontSize ? `${ fontSize }px` : undefined,
				},
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
					<ToggleGroupControl
						__next40pxDefaultSize
						isBlock
						label={ __( 'Logo colour', 'sgs-blocks' ) }
						value={ logoColour }
						onChange={ ( value ) =>
							setAttributes( { logoColour: value } )
						}
					>
						<ToggleGroupControlOption
							value="black"
							label={ __( 'Black', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="white"
							label={ __( 'White', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="color"
							label={ __( 'Colour', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>
					<RangeControl
						__next40pxDefaultSize
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
				{ methodLabel }
				{ countryCode ? ` (${ countryCode.toUpperCase() })` : '' }
				{ ' · ' }
				{ logoLabel }
				{ ' · ' }
				{ __(
					'Stripe shows the instalment terms here from the cart total.',
					'sgs-blocks'
				) }
			</span>
		</div>
	);
}
