/**
 * SGS Order Items: editor.
 *
 * The block prints a real order that exists only on the order-confirmation page, so the canvas previews through
 * `ServerSideRender` with a sample order (two items, one with chosen options, and every totals row). The inspector
 * holds what to show, the wording of each totals row, the text, the thumbnail, the item dividers and the spacing.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import ServerSideRender from '../../components/ServerSideRender';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';
import {
	BOX_UNITS,
	MediaElementPanel,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	ResponsiveBoxControls,
	SgsColourPanel,
	SgsLengthControl,
	SsrPreviewGuard,
	TypographyControls,
	normaliseResponsiveBox,
	textRow,
} from '../../components';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

const THUMB_ATOMS = [ 'object-fit', 'sizing', 'shape' ];

const TEXT_TARGETS = [
	{
		key: 'itemName',
		prefix: 'itemName',
		label: __( 'Item name', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
	},
	{
		key: 'itemMeta',
		prefix: 'itemMeta',
		label: __( 'Options line', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
	},
	{
		key: 'itemPrice',
		prefix: 'itemPrice',
		label: __( 'Item price', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
	},
	{
		key: 'totals',
		prefix: 'totals',
		label: __( 'Totals rows', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
	},
	{
		key: 'total',
		prefix: 'total',
		label: __( 'Total row', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
		showFontFamily: true,
	},
];

// Per-device boxes edited in the row-spacing panel: [attribute, label]. The block's own padding and margin are the
// shared Spacing panel.
const BOXES = [
	[ 'rowPadding', __( 'Item row padding', 'sgs-blocks' ) ],
	[ 'totalsPadding', __( 'Totals padding', 'sgs-blocks' ) ],
];

const ROW_ALIGN = [
	{ value: '', label: __( 'Default (centred)', 'sgs-blocks' ) },
	{ value: 'start', label: __( 'Top', 'sgs-blocks' ) },
	{ value: 'center', label: __( 'Middle', 'sgs-blocks' ) },
	{ value: 'end', label: __( 'Bottom', 'sgs-blocks' ) },
];

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( {
		className: 'sgs-order-items-editor',
	} );

	const colourRows = [
		textRow( {
			key: 'itemName',
			label: __( 'Item name', 'sgs-blocks' ),
			attrs: { base: 'itemNameColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'itemMeta',
			label: __( 'Options line', 'sgs-blocks' ),
			attrs: { base: 'itemMetaColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'itemPrice',
			label: __( 'Item price', 'sgs-blocks' ),
			attrs: { base: 'itemPriceColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'totals',
			label: __( 'Totals rows', 'sgs-blocks' ),
			attrs: { base: 'totalsColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'total',
			label: __( 'Total row', 'sgs-blocks' ),
			attrs: { base: 'totalColour' },
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
				<PanelBody initialOpen title={ __( 'Item lines to show', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Item pictures', 'sgs-blocks' ) }
						checked={ false !== attributes.showThumbnail }
						onChange={ ( val ) =>
							setAttributes( { showThumbnail: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __(
							'Chosen options under each name',
							'sgs-blocks'
						) }
						checked={ false !== attributes.showMeta }
						onChange={ ( val ) =>
							setAttributes( { showMeta: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Totals rows to show', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Subtotal row', 'sgs-blocks' ) }
						checked={ false !== attributes.showSubtotal }
						onChange={ ( val ) =>
							setAttributes( { showSubtotal: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Delivery row', 'sgs-blocks' ) }
						checked={ false !== attributes.showDelivery }
						onChange={ ( val ) =>
							setAttributes( { showDelivery: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Delivery method name', 'sgs-blocks' ) }
						checked={ false !== attributes.showDeliveryMethod }
						onChange={ ( val ) =>
							setAttributes( { showDeliveryMethod: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Discount row', 'sgs-blocks' ) }
						checked={ false !== attributes.showDiscount }
						onChange={ ( val ) =>
							setAttributes( { showDiscount: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Gift card payment row', 'sgs-blocks' ) }
						checked={ false !== attributes.showGiftCard }
						onChange={ ( val ) =>
							setAttributes( { showGiftCard: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Total row', 'sgs-blocks' ) }
						checked={ false !== attributes.showTotal }
						onChange={ ( val ) =>
							setAttributes( { showTotal: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Row names', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Subtotal row name', 'sgs-blocks' ) }
						value={ attributes.subtotalLabel ?? '' }
						onChange={ ( val ) =>
							setAttributes( { subtotalLabel: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Delivery row name', 'sgs-blocks' ) }
						value={ attributes.deliveryLabel ?? '' }
						onChange={ ( val ) =>
							setAttributes( { deliveryLabel: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Discount row name', 'sgs-blocks' ) }
						value={ attributes.discountLabel ?? '' }
						onChange={ ( val ) =>
							setAttributes( { discountLabel: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Gift card row name', 'sgs-blocks' ) }
						value={ attributes.giftCardLabel ?? '' }
						onChange={ ( val ) =>
							setAttributes( { giftCardLabel: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Total row name', 'sgs-blocks' ) }
						help={ __(
							'For example "Total" or "Paid".',
							'sgs-blocks'
						) }
						value={ attributes.totalLabel ?? '' }
						onChange={ ( val ) =>
							setAttributes( { totalLabel: val ?? '' } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ TEXT_TARGETS }
					/>
				</PanelBody>

				{ /* The item picture's media slot sits directly in this default group (`inGroup`), so its panels keep their place on
				     first select; `label` names the slot in each panel title. */ }
				<MediaElementPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix="thumb"
					blockSlug="sgs/order-items"
					blockName="sgs/order-items"
					context="item"
					atoms={ THUMB_ATOMS }
					label={ __( 'Item pictures', 'sgs-blocks' ) }
					inGroup="settings"
				/>

				<PanelBody
					title={ __( 'Item dividers', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ attributes.rowBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { rowBorderWidth: next } )
						}
						styleValue={ attributes.rowBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { rowBorderStyle: val } )
						}
						colourLabel={ __( 'Divider colour', 'sgs-blocks' ) }
						colourLinked={ true }
						colourValue={ attributes.rowBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( { rowBorderColour: val ?? '' } )
						}
					/>
					<SelectControl
						label={ __( 'Row alignment', 'sgs-blocks' ) }
						help={ __(
							'Lines up each row’s picture, words and price.',
							'sgs-blocks'
						) }
						value={ attributes.rowAlign ?? '' }
						options={ ROW_ALIGN }
						onChange={ ( val ) =>
							setAttributes( { rowAlign: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Totals border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ attributes.totalsBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { totalsBorderWidth: next } )
						}
						styleValue={ attributes.totalsBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { totalsBorderStyle: val ?? '' } )
						}
						colourLabel={ __(
							'Totals border colour',
							'sgs-blocks'
						) }
						colourLinked={ true }
						colourValue={ attributes.totalsBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( { totalsBorderColour: val ?? '' } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Row spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Space between items', 'sgs-blocks' ) }
						value={ attributes.rowGap }
						onChange={ ( obj ) => setAttributes( { rowGap: obj } ) }
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
									'Space between items',
									'sgs-blocks'
								) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue : '1rem'
								}
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
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
									defaults={ spacingDefaultsFor(
										'sgs/order-items',
										attr
									) }
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
				<ResponsiveBoxControls
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<SsrPreviewGuard>
					<ServerSideRender
						block="sgs/order-items"
						attributes={ attributes }
					/>
				</SsrPreviewGuard>
			</div>
		</>
	);
}
