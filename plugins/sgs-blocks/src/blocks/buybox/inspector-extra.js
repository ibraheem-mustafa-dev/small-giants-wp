import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, TextControl, RangeControl, SelectControl } from '@wordpress/components';
import { fillRow, textRow, SgsLengthControl, ResponsiveControl } from '../../components';
import { patchTier } from '../../utils';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

const THUMB_BORDER_UNITS = [
	{ value: 'px', label: 'px', default: 1 },
	{ value: 'rem', label: 'rem', default: 0.0625 },
];

const STICKY_OFFSET_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
];

/**
 * Extra inspector panels for sgs/buybox — sticky column, RRP saving pill,
 * and stock-status indicator. Split out of edit.js (already at the 250-line
 * cap per project rule) so this block's growing settings surface doesn't
 * keep pushing that file further over.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} Three PanelBody sections for the default InspectorControls group.
 */
export function BuyboxExtraPanels( { attributes, setAttributes } ) {
	const {
		stickyEnabled,
		stackBelow,
		photoEntrance,
		stickyOffset,
		rrpMetaKey,
		rrpSavingFormat,
		showStockStatus,
		extrasBeforeCount,
		thumbsPerRow,
		thumbGap,
		thumbStripOffset,
		thumbRadius,
		thumbBorderWidth,
		thumbSelectedScale,
	} = attributes;

	return (
		<>
			<PanelBody
				title={ __( 'Photo entrance', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SelectControl
					label={ __( 'Main photo entrance', 'sgs-blocks' ) }
					help={ __( 'Plays once when the page loads. Off for visitors who prefer reduced motion. Timing and distance follow the theme entrance settings.', 'sgs-blocks' ) }
					value={ photoEntrance || 'none' }
					options={ [
						{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
						{ label: __( 'Fade in', 'sgs-blocks' ), value: 'fade' },
						{ label: __( 'Rise and fade in', 'sgs-blocks' ), value: 'rise' },
					] }
					onChange={ ( val ) => setAttributes( { photoEntrance: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
			<PanelBody
				title={ __( 'Sticky column', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SelectControl
					label={ __( 'Side by side from', 'sgs-blocks' ) }
					help={ __( 'Below this width the gallery sits above the details.', 'sgs-blocks' ) }
					value={ stackBelow || 'mobile' }
					options={ [
						{ label: __( 'Tablet and up (768px)', 'sgs-blocks' ), value: 'mobile' },
						{ label: __( 'Desktop only (1024px)', 'sgs-blocks' ), value: 'tablet' },
					] }
					onChange={ ( val ) => setAttributes( { stackBelow: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ToggleControl
					label={ __( 'Stick while scrolling', 'sgs-blocks' ) }
					checked={ !! stickyEnabled }
					onChange={ ( val ) =>
						setAttributes( { stickyEnabled: val } )
					}
					help={ __(
						'Keeps the price, pickers and add-to-cart button in view while the shopper scrolls a long product description below. Automatically off on phone-width screens (below 768px).',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				{ stickyEnabled && (
					<SgsLengthControl
						label={ __( 'Top offset', 'sgs-blocks' ) }
						value={ stickyOffset }
						units={ STICKY_OFFSET_UNITS }
						onChange={ ( val ) =>
							setAttributes( { stickyOffset: val ?? '' } )
						}
						help={ __(
							'Extra gap below the site header (which is already accounted for automatically). Empty sits flush against the header.',
							'sgs-blocks'
						) }
					/>
				) }
			</PanelBody>

			<PanelBody
				title={ __( 'RRP saving pill', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'RRP meta key', 'sgs-blocks' ) }
					value={ rrpMetaKey }
					onChange={ ( val ) =>
						setAttributes( { rrpMetaKey: val } )
					}
					placeholder={ __( 'e.g. _sgs_rrp', 'sgs-blocks' ) }
					help={ __(
						'Post-meta key holding the recommended retail price as a plain number (e.g. "171.00"). Empty turns the pill off. Set this to whatever key your product import uses to store RRP.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ '' !== rrpMetaKey && (
					<>
						<ToggleGroupControl
							label={ __( 'Saving wording', 'sgs-blocks' ) }
							value={ rrpSavingFormat || 'amount' }
							onChange={ ( val ) =>
								setAttributes( { rrpSavingFormat: val } )
							}
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption
								value="amount"
								label={ __( 'Amount', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="percentage"
								label={ __( 'Percentage', 'sgs-blocks' ) }
							/>
						</ToggleGroupControl>
						<p
							className="components-base-control__help"
							style={ { marginTop: '-8px' } }
						>
							{ __(
								'"Save £32" or "Save 19%" — only shown when the RRP is above the current price for the default variation.',
								'sgs-blocks'
							) }
						</p>
					</>
				) }
			</PanelBody>

			<PanelBody
				title={ __( 'Stock status', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __( 'Show in-stock / low-stock indicator', 'sgs-blocks' ) }
					checked={ !! showStockStatus }
					onChange={ ( val ) =>
						setAttributes( { showStockStatus: val } )
					}
					help={ __(
						'On: always shows a coloured dot + label (in stock, low stock, or out of stock). Off keeps the current behaviour — a line shown only when out of stock. Reflects the default variation only; it does not update if the shopper picks a different option.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Gallery thumbnails', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ResponsiveControl label={ __( 'Thumbnails per row (0 = fixed size)', 'sgs-blocks' ) }>
					{ ( bp ) => (
						<RangeControl
							label={ __( 'Thumbnails per row (0 = fixed size)', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'0 keeps the fixed-size, scrolling strip on this device. 1 to 8 lays the thumbnails out as that many equal square columns across the gallery width, wrapping onto more rows. A thumbnail never goes below 48px. An unset tablet or mobile value follows the next larger device.',
								'sgs-blocks'
							) }
							value={ thumbsPerRow?.[ bp ] ?? 0 }
							min={ 0 }
							max={ 8 }
							step={ 1 }
							onChange={ ( val ) =>
								patchTier( attributes, setAttributes, 'thumbsPerRow', bp, val ?? 0 )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveControl>
				<SgsLengthControl
					label={ __( 'Thumbnail gap', 'sgs-blocks' ) }
					value={ thumbGap }
					units={ THUMB_BORDER_UNITS }
					onChange={ ( val ) =>
						setAttributes( { thumbGap: val ?? '' } )
					}
					help={ __(
						'Space between thumbnails. Empty keeps the default 0.5rem.',
						'sgs-blocks'
					) }
				/>
				<SgsLengthControl
					label={ __( 'Thumbnail corner radius', 'sgs-blocks' ) }
					value={ thumbRadius }
					units={ THUMB_BORDER_UNITS }
					onChange={ ( val ) =>
						setAttributes( { thumbRadius: val ?? '' } )
					}
					help={ __(
						'Rounding of every thumbnail corner. 0 is square. Empty follows the main image's radius.',
						'sgs-blocks'
					) }
				/>
				<SgsLengthControl
					label={ __( 'Space above thumbnails', 'sgs-blocks' ) }
					value={ thumbStripOffset }
					units={ THUMB_BORDER_UNITS }
					onChange={ ( val ) =>
						setAttributes( { thumbStripOffset: val ?? '' } )
					}
					help={ __(
						'Space between the main image and the thumbnail strip. Empty keeps the default 0.75rem.',
						'sgs-blocks'
					) }
				/>
				<SgsLengthControl
					label={ __( 'Border width', 'sgs-blocks' ) }
					value={ thumbBorderWidth }
					units={ THUMB_BORDER_UNITS }
					onChange={ ( val ) =>
						setAttributes( { thumbBorderWidth: val ?? '' } )
					}
					help={ __(
						'Width of the border around every thumbnail. Empty keeps the default 2px. Border colours are in the Colours panel.',
						'sgs-blocks'
					) }
				/>
				<RangeControl
					label={ __( 'Selected thumbnail scale (%)', 'sgs-blocks' ) }
					help={ __(
						'105 gently enlarges the selected thumbnail. 100 turns the enlargement off; the selected thumbnail is then shown by its border colour alone, so keep the two border colours clearly different.',
						'sgs-blocks'
					) }
					value={ thumbSelectedScale ?? 105 }
					min={ 90 }
					max={ 120 }
					onChange={ ( val ) =>
						setAttributes( { thumbSelectedScale: val ?? 105 } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Extras placement', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<RangeControl
					label={ __( 'Blocks above the price', 'sgs-blocks' ) }
					help={ __(
						"The first N blocks in this box's extra area show above the price; the rest show below the add-to-cart button.",
						'sgs-blocks'
					) }
					value={ extrasBeforeCount || 0 }
					min={ 0 }
					max={ 10 }
					onChange={ ( val ) =>
						setAttributes( { extrasBeforeCount: val ?? 0 } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</>
	);
}

/**
 * Extra SgsColourPanel rows for the RRP pill + stock-status colours. Returned
 * separately (not rendered here) so edit.js can concatenate them onto its own
 * `colourRows` array and keep every colour control in the ONE panel (D609/D622).
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {Array<Object>} Row descriptors for SgsColourPanel.
 */
export function getBuyboxExtraColourRows( { attributes, setAttributes } ) {
	return [
		fillRow( {
			key: 'rrp-pill-background',
			label: __( 'RRP pill background', 'sgs-blocks' ),
			attrs: { base: 'rrpPillBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'rrp-pill-text',
			label: __( 'RRP pill text', 'sgs-blocks' ),
			attrs: { base: 'rrpPillTextColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stock-in-stock',
			label: __( 'In-stock label', 'sgs-blocks' ),
			attrs: { base: 'stockInStockColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stock-low-stock',
			label: __( 'Low-stock label', 'sgs-blocks' ),
			attrs: { base: 'stockLowStockColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stock-out-of-stock',
			label: __( 'Out-of-stock label', 'sgs-blocks' ),
			attrs: { base: 'stockOutOfStockColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'picker-label',
			label: __( 'Picker label', 'sgs-blocks' ),
			attrs: { base: 'pickerLabelColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'add-to-cart-background',
			label: __( 'Add to cart background', 'sgs-blocks' ),
			attrs: { base: 'addToCartBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'add-to-cart-border',
			label: __( 'Add to cart border', 'sgs-blocks' ),
			attrs: { base: 'addToCartBorderColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'thumb-border',
			label: __( 'Thumbnail border', 'sgs-blocks' ),
			attrs: { base: 'thumbBorderColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'thumb-selected-border',
			label: __( 'Selected thumbnail border', 'sgs-blocks' ),
			attrs: { base: 'thumbSelectedBorderColour' },
			attributes,
			setAttributes,
		} ),
	];
}
