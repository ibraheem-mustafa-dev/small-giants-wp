import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { fillRow, textRow, SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

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
		stickyOffset,
		rrpMetaKey,
		rrpSavingFormat,
		showStockStatus,
	} = attributes;

	return (
		<>
			<PanelBody
				title={ __( 'Sticky column', 'sgs-blocks' ) }
				initialOpen={ false }
			>
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
	];
}
