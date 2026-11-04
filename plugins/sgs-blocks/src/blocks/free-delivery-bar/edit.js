/**
 * SGS Free-delivery Bar: editor.
 *
 * The card depends on the shop's shipping settings and the visitor's basket, so the canvas previews through
 * `ServerSideRender` (a basket at 60% of the threshold). The inspector holds the words, the fill timing, the colours,
 * the message typography, the track geometry and the card chrome (border, corners, shadow, padding).
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import ServerSideRender from '../../components/ServerSideRender';
import {
	BOX_UNITS,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	SgsColourPanel,
	SgsLengthControl,
	ShadowControl,
	SsrPreviewGuard,
	TypographyControls,
	fillRow,
	normaliseResponsiveBox,
	shadowAttrKeys,
	textRow,
} from '../../components';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

// Per-device boxes: [attribute, label].
const BOXES = [
	[ 'padding', __( 'Card padding', 'sgs-blocks' ) ],
	[ 'margin', __( 'Card margin', 'sgs-blocks' ) ],
	[ 'freeDeliveryBarMargin', __( 'Bar margin', 'sgs-blocks' ) ],
];

const TEXT_TARGETS = [
	{
		key: 'freeDeliveryText',
		prefix: 'freeDeliveryText',
		label: __( 'Message', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
	},
];

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( {
		className: 'sgs-free-delivery-bar-editor',
	} );
	const freeDeliveryBarContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	const colourRows = [
		fillRow( {
			key: 'background',
			label: __( 'Card background', 'sgs-blocks' ),
			attrs: {
				base: 'backgroundColour',
				gradient: 'backgroundColourGradient',
			},
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'message',
			label: __( 'Message', 'sgs-blocks' ),
			attrs: { base: 'freeDeliveryTextColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'track',
			label: __( 'Bar track', 'sgs-blocks' ),
			attrs: { base: 'freeDeliveryTrackColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'fill',
			label: __( 'Bar fill', 'sgs-blocks' ),
			attrs: { base: 'freeDeliveryFillColour' },
			attributes,
			setAttributes,
		} ),
	];

	return (
		<>
			<InspectorControls group="color">
				<SgsColourPanel rows={ colourRows } />
			</InspectorControls>
			<InspectorControls>
				<PanelBody title={ __( 'Free delivery', 'sgs-blocks' ) }>
					<TextControl
						label={ __(
							'Threshold override (optional)',
							'sgs-blocks'
						) }
						help={ __(
							"Leave blank to use the WooCommerce free-shipping method's minimum order amount for this store. With neither, the block prints nothing.",
							'sgs-blocks'
						) }
						type="number"
						value={ attributes.freeDeliveryThresholdOverride ?? '' }
						onChange={ ( val ) =>
							setAttributes( {
								freeDeliveryThresholdOverride: val ?? '',
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Message', 'sgs-blocks' ) }
						help={
							/* translators: %s is a literal "%s" the amount replaces. */ __(
								'%s is replaced with the amount still to spend, in the store’s currency.',
								'sgs-blocks'
							)
						}
						value={ attributes.freeDeliveryMessage ?? '' }
						onChange={ ( val ) =>
							setAttributes( { freeDeliveryMessage: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Success message', 'sgs-blocks' ) }
						value={ attributes.freeDeliverySuccessMessage ?? '' }
						onChange={ ( val ) =>
							setAttributes( {
								freeDeliverySuccessMessage: val ?? '',
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __(
							'Bar name for screen readers',
							'sgs-blocks'
						) }
						value={ attributes.freeDeliveryLabel ?? '' }
						onChange={ ( val ) =>
							setAttributes( { freeDeliveryLabel: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Behaviour and motion', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Hide while the basket is empty',
							'sgs-blocks'
						) }
						checked={ !! attributes.freeDeliveryHideWhenEmpty }
						onChange={ ( val ) =>
							setAttributes( { freeDeliveryHideWhenEmpty: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Fill time (seconds)', 'sgs-blocks' ) }
						help={ __(
							'How long the bar takes to grow to its new level. Visitors who ask for less motion see no animation.',
							'sgs-blocks'
						) }
						value={ attributes.freeDeliveryFillDuration ?? 0.6 }
						min={ 0 }
						max={ 3 }
						step={ 0.1 }
						onChange={ ( val ) =>
							setAttributes( {
								freeDeliveryFillDuration: val ?? 0.6,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Fill style', 'sgs-blocks' ) }
						value={ attributes.freeDeliveryFillEasing || 'smooth' }
						options={ [
							{
								label: __(
									'Smooth (quick start, gentle finish)',
									'sgs-blocks'
								),
								value: 'smooth',
							},
							{
								label: __( 'Gentle', 'sgs-blocks' ),
								value: 'ease',
							},
							{
								label: __( 'Slow at both ends', 'sgs-blocks' ),
								value: 'ease-in-out',
							},
							{
								label: __( 'Steady', 'sgs-blocks' ),
								value: 'linear',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { freeDeliveryFillEasing: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Message text', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ TEXT_TARGETS }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Bar and card sizes', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Bar height', 'sgs-blocks' ) }
						value={ attributes.freeDeliveryTrackHeight }
						onChange={ ( obj ) =>
							setAttributes( { freeDeliveryTrackHeight: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Bar height', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue : '6px'
								}
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Bar corners', 'sgs-blocks' ) }
						value={ attributes.freeDeliveryTrackRadius || '' }
						placeholder="999px"
						units={ LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( {
								freeDeliveryTrackRadius: val || '',
							} )
						}
					/>
					{ BOXES.map( ( [ attr, label ] ) => (
						<ResponsiveOverride
							key={ attr }
							label={ label }
							value={ attributes[ attr ] }
							onChange={ ( obj ) =>
								setAttributes( { [ attr ]: obj } )
							}
						>
							{ ( { ownValue, setOwnValue } ) => (
								<SgsBoxControl
									label={ label }
									hideLabelFromVision
									values={
										ownValue && 'object' === typeof ownValue
											? ownValue
											: {}
									}
									units={ BOX_UNITS }
									presets
									onChange={ ( next ) =>
										setOwnValue(
											normaliseResponsiveBox( next )
										)
									}
								/>
							) }
						</ResponsiveOverride>
					) ) }
				</PanelBody>

				<PanelBody
					title={ __( 'Card border and shadow', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { borderWidth: next } )
						}
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { borderStyle: val } )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourLinked={ true }
						contrastAgainst={ freeDeliveryBarContrastAgainst }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.borderColour,
								onChange: ( val ) =>
									setAttributes( {
										borderColour: val ?? '',
									} ),
								linked: true,
								gradientValue: attributes.borderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										borderColourGradient: val ?? '',
									} ),
							},
						] }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( {
								borderRadius: {
									...attributes.borderRadius,
									[ key ]: next,
								},
							} );
						} }
					/>
					<ShadowControl
						label={ __( 'Card shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'boxShadow' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender
						block="sgs/free-delivery-bar"
						attributes={ attributes }
					/>
				</SsrPreviewGuard>
			</div>
		</>
	);
}
