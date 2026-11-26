import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	ToggleControl,
	TextControl,
	SelectControl,
} from '@wordpress/components';

import SgsFreeTextField from '../../components/SgsFreeTextField';
import { SgsBoxControl } from '../../components';
const HAIRLINE_SIDES = [ 'top', 'bottom' ];
const STOCK_LINE_POSITION_OPTIONS = [
	{ value: 'below', label: __( 'Below the pickers (today)', 'sgs-blocks' ) },
	{ value: 'above', label: __( 'Above the pickers', 'sgs-blocks' ) },
];

/**
 * Settings-tab (default InspectorControls group) extra panels for
 * sgs/buybox: the RRP price display and the in-stock wording override. Split from inspector-extra.js/edit.js — both already at
 * or past this block's 250-line JS budget (a new file rather than growing either further).
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} PanelBody sections for the default InspectorControls group.
 */
export function BuyboxExtraSettingsPanels2( { attributes, setAttributes } ) {
	const {
		rrpMetaKey,
		rrpShowPrice,
		rrpSavingPrefix,
		stockInStockLabel,
		stockLinePosition,
		stockLineHairline,
		stockLineHairlineMargin,
		showStockStatus,
	} = attributes;

	return (
		<>

			{ '' !== rrpMetaKey && (
				<PanelBody
					title={ __( 'RRP price display', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Show the struck-through RRP',
							'sgs-blocks'
						) }
						checked={ !! rrpShowPrice }
						onChange={ ( val ) =>
							setAttributes( { rrpShowPrice: val } )
						}
						help={ __(
							'Shows "RRP <amount>" beside the price, amount struck through, whenever the saving pill applies.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Saving wording', 'sgs-blocks' ) }
						value={ rrpSavingPrefix ?? 'Save' }
						onChange={ ( val ) =>
							setAttributes( { rrpSavingPrefix: val } )
						}
						help={ __(
							'The words before the amount in the saving pill, e.g. "You save" gives "You save £32".',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			) }


			<PanelBody
				title={ __( 'Stock wording', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SgsFreeTextField
					type="rich"
					label={ __( 'In-stock label', 'sgs-blocks' ) }
					value={ stockInStockLabel || '' }
					onChange={ ( val ) =>
						setAttributes( { stockInStockLabel: val } )
					}
					help={ __(
						'Replaces the in-stock label text only, e.g. "In stock — dispatched next working day". Empty = WooCommerce\'s own text. Low-stock and out-of-stock wording are unchanged.',
						'sgs-blocks'
					) }
				/>
				<SelectControl
					label={ __( 'Stock line position', 'sgs-blocks' ) }
					value={ stockLinePosition || 'below' }
					options={ STOCK_LINE_POSITION_OPTIONS }
					onChange={ ( val ) =>
						setAttributes( { stockLinePosition: val } )
					}
					help={ __(
						'Above moves the stock line between the price row and the pickers.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ 'above' === ( stockLinePosition || 'below' ) && (
					<ToggleControl
						label={ __(
							'Hairline above the stock line',
							'sgs-blocks'
						) }
						checked={ !! stockLineHairline }
						onChange={ ( val ) =>
							setAttributes( { stockLineHairline: val } )
						}
						help={ __(
							'Adds a 1px rule, in the border colour, between the price row and the stock line.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				) }
				{ 'above' === ( stockLinePosition || 'below' ) &&
					!! stockLineHairline && (
						<SgsBoxControl
							label={ __( 'Hairline spacing', 'sgs-blocks' ) }
							values={ stockLineHairlineMargin ?? {} }
							sides={ HAIRLINE_SIDES }
							presets
							onChange={ ( next ) =>
								setAttributes( {
									stockLineHairlineMargin: next,
								} )
							}
						/>
					) }
				<ToggleControl
					label={ __(
						'Show in-stock / low-stock indicator',
						'sgs-blocks'
					) }
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
