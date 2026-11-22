/**
 * SGS Cart — the drawer's extra looks (styles tab): the text Remove link, the stepper's number, the empty basket's
 * placement, text line and link, the gift box and its fields, and the upsell row. Colours are rows in the colour panel
 * (panelColourRows.js). Printed by includes/helpers-cart-panel-css.php::sgs_cart_panel_css and
 * includes/helpers-cart-panel-items-css.php::sgs_cart_drawer_extras_css.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import {
	ResponsiveBoxControl,
	ResponsiveOverride,
	SgsBorderControl,
	SgsLengthControl,
	TypographyControls,
} from '../../components';

const target = ( prefix, label, fields ) => ( {
	key: prefix,
	prefix,
	label,
	showStyle: false,
	showLineHeight: false,
	showWeight: false,
	...fields,
} );

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    The block's current attributes.
 * @param {Function} props.setAttributes The block's attribute setter.
 * @param {boolean}  props.hasPanel      Whether displayMode is flyout|drawer.
 * @return {Element|null} The panels, or null in link mode (no panel is built).
 */
export default function PanelDrawerLookControls( {
	attributes,
	setAttributes,
	hasPanel,
} ) {
	if ( ! hasPanel ) {
		return null;
	}
	const box = ( attr, label ) => (
		<ResponsiveBoxControl
			key={ attr }
			label={ label }
			presets
			values={ {
				base: attributes[ attr ]?.desktop ?? {},
				tablet: attributes[ attr ]?.tablet ?? {},
				mobile: attributes[ attr ]?.mobile ?? {},
			} }
			onChange={ ( tier, next ) => {
				const key = 'base' === tier ? 'desktop' : tier;
				setAttributes( {
					[ attr ]: {
						...( attributes[ attr ] || {} ),
						[ key ]: next,
					},
				} );
			} }
		/>
	);
	const radius = ( attr, label ) => (
		<SgsLengthControl
			key={ attr }
			presets={ false }
			label={ label }
			value={ attributes[ attr ] || '' }
			onChange={ ( val ) => setAttributes( { [ attr ]: val || '' } ) }
		/>
	);
	const removeText = 'text' === attributes.itemRemoveStyle;
	const stepper =
		'stepper' === attributes.itemQtyStyle &&
		false !== attributes.itemShowQty;

	return (
		<>
			{ ( removeText || stepper ) && (
				<PanelBody
					title={ __(
						'Mini-cart Remove link and stepper number',
						'sgs-blocks'
					) }
					initialOpen={ false }
				>
					{ removeText && (
						<>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								targets={ [
									target(
										'itemRemove',
										__( 'Remove link', 'sgs-blocks' ),
										{
											showLineHeight: true,
											showDecoration: true,
										}
									),
								] }
							/>
							{ box(
								'itemRemovePadding',
								__( 'Remove link padding', 'sgs-blocks' )
							) }
						</>
					) }
					{ stepper && (
						<ResponsiveOverride
							label={ __( 'Stepper number width', 'sgs-blocks' ) }
							value={ attributes.itemQtyNumberWidth }
							onChange={ ( obj ) =>
								setAttributes( { itemQtyNumberWidth: obj } )
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
									label={ __(
										'Stepper number width',
										'sgs-blocks'
									) }
									hideLabelFromVision
									value={ ownValue || '' }
									placeholder={
										inherited ? effectiveValue : '3ch'
									}
									onChange={ ( val ) =>
										setOwnValue( val || '' )
									}
								/>
							) }
						</ResponsiveOverride>
					) }
				</PanelBody>
			) }

			<PanelBody
				title={ __( 'Mini-cart empty basket look', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SelectControl
					label={ __( 'Where the empty basket sits', 'sgs-blocks' ) }
					value={ attributes.panelEmptyPlacement || '' }
					options={ [
						{ label: __( 'At the top', 'sgs-blocks' ), value: '' },
						{
							label: __( 'Centred in the panel', 'sgs-blocks' ),
							value: 'center',
						},
					] }
					onChange={ ( val ) =>
						setAttributes( { panelEmptyPlacement: val } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					targets={ [
						target(
							'emptyBody',
							__( 'Line of text', 'sgs-blocks' ),
							{ showLineHeight: true }
						),
						target( 'emptyLink', __( 'Text link', 'sgs-blocks' ), {
							showWeight: true,
						} ),
					] }
				/>
				<ResponsiveOverride
					label={ __( 'Line of text width (maximum)', 'sgs-blocks' ) }
					value={ attributes.emptyBodyMaxWidth }
					onChange={ ( obj ) =>
						setAttributes( { emptyBodyMaxWidth: obj } )
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
							label={ __(
								'Line of text width (maximum)',
								'sgs-blocks'
							) }
							hideLabelFromVision
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '100%' }
							onChange={ ( val ) => setOwnValue( val || '' ) }
						/>
					) }
				</ResponsiveOverride>
				{ box(
					'emptyLinkPadding',
					__( 'Text link padding', 'sgs-blocks' )
				) }
			</PanelBody>

			{ attributes.panelGiftShow && (
				<PanelBody
					title={ __( 'Mini-cart gift box look', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ attributes.giftBoxBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { giftBoxBorderWidth: next } )
						}
						styleValue={ attributes.giftBoxBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { giftBoxBorderStyle: val } )
						}
						colourValue={ attributes.giftBoxBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( { giftBoxBorderColour: val ?? '' } )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourLinked
					/>
					{ radius(
						'giftBoxRadius',
						__( 'Gift box corners', 'sgs-blocks' )
					) }
					{ box(
						'giftBoxPadding',
						__( 'Gift box padding', 'sgs-blocks' )
					) }
					{ box(
						'giftBoxMargin',
						__( 'Gift box margin', 'sgs-blocks' )
					) }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							target( 'giftLabel', __( 'Label', 'sgs-blocks' ), {
								showWeight: true,
							} ),
							target(
								'giftHelp',
								__( 'Helper line', 'sgs-blocks' ),
								{}
							),
							target(
								'giftMessage',
								__( 'Note field', 'sgs-blocks' ),
								{ showLineHeight: true, showFontFamily: true }
							),
						] }
					/>
					<SgsBorderControl
						widthValues={ attributes.giftFieldBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { giftFieldBorderWidth: next } )
						}
						styleValue={ attributes.giftFieldBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { giftFieldBorderStyle: val } )
						}
						colourValue={ attributes.giftFieldBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( {
								giftFieldBorderColour: val ?? '',
							} )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourLinked
					/>
					{ radius(
						'giftFieldRadius',
						__( 'Field corners', 'sgs-blocks' )
					) }
					{ box(
						'giftFieldPadding',
						__( 'Field padding', 'sgs-blocks' )
					) }
				</PanelBody>
			) }

			{ Number( attributes.upsellProductId ) > 0 && (
				<PanelBody
					title={ __( 'Mini-cart upsell row look', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ radius(
						'upsellRadius',
						__( 'Row corners', 'sgs-blocks' )
					) }
					{ box(
						'upsellPadding',
						__( 'Row padding', 'sgs-blocks' )
					) }
					{ false !== attributes.upsellShowImage && (
						<ResponsiveOverride
							label={ __( 'Picture size', 'sgs-blocks' ) }
							value={ attributes.upsellImageSize }
							onChange={ ( obj ) =>
								setAttributes( { upsellImageSize: obj } )
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
									label={ __( 'Picture size', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ ownValue || '' }
									placeholder={
										inherited ? effectiveValue : '56px'
									}
									onChange={ ( val ) =>
										setOwnValue( val || '' )
									}
								/>
							) }
						</ResponsiveOverride>
					) }
					{ false !== attributes.upsellShowImage &&
						radius(
							'upsellImageRadius',
							__( 'Picture corners', 'sgs-blocks' )
						) }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							target(
								'upsellTitle',
								__( 'Heading', 'sgs-blocks' ),
								{ showWeight: true }
							),
							target(
								'upsellText',
								__( 'Line under the heading', 'sgs-blocks' ),
								{}
							),
							target(
								'upsellButton',
								__( 'Button', 'sgs-blocks' ),
								{ showWeight: true }
							),
						] }
					/>
					<SgsBorderControl
						widthValues={ attributes.upsellButtonBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { upsellButtonBorderWidth: next } )
						}
						styleValue={ attributes.upsellButtonBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { upsellButtonBorderStyle: val } )
						}
						colourValue={ attributes.upsellButtonBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( {
								upsellButtonBorderColour: val ?? '',
							} )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourLinked
					/>
					{ radius(
						'upsellButtonRadius',
						__( 'Button corners', 'sgs-blocks' )
					) }
					{ box(
						'upsellButtonPadding',
						__( 'Button padding', 'sgs-blocks' )
					) }
				</PanelBody>
			) }
		</>
	);
}
