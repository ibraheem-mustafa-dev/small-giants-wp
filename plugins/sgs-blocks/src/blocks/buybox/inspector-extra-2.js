import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, TextControl, RangeControl } from '@wordpress/components';

/**
 * Settings-tab (default InspectorControls group) extra panels for
 * sgs/buybox, Eye Care Wave C — the picker's second caption line, RRP price
 * display, extras placed above the add-to-cart button, and the in-stock
 * wording override. Split from inspector-extra.js/edit.js — both already at
 * or past this block's 250-line JS budget (option-picker's own
 * sub-label-panel.js is the precedent for this exact move: a new file rather
 * than growing either further).
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} PanelBody sections for the default InspectorControls group.
 */
export function BuyboxExtraSettingsPanels2( { attributes, setAttributes } ) {
	const {
		pickerSubLabelMetaKey,
		rrpMetaKey,
		rrpShowPrice,
		rrpSavingPrefix,
		extrasBeforeCartCount,
		stockInStockLabel,
	} = attributes;

	return (
		<>
			<PanelBody
				title={ __( 'Picker second line', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'Term-meta key', 'sgs-blocks' ) }
					value={ pickerSubLabelMetaKey || '' }
					onChange={ ( val ) =>
						setAttributes( { pickerSubLabelMetaKey: val } )
					}
					placeholder="_sgs_size_measure"
					help={ __(
						'Shows a second caption line under every option, e.g. "_sgs_size_measure" for a frame size\'s eye/bridge/temple measurement. Empty = no second line. Forwarded to every picker on this box.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>

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
				title={ __( 'Extras above the add-to-cart button', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<RangeControl
					label={ __( 'Blocks above the add-to-cart button', 'sgs-blocks' ) }
					help={ __(
						'After the blocks shown above the price, the next N extra-area blocks show between the pickers and the add-to-cart button; the rest stay below it.',
						'sgs-blocks'
					) }
					value={ extrasBeforeCartCount || 0 }
					min={ 0 }
					max={ 10 }
					onChange={ ( val ) =>
						setAttributes( { extrasBeforeCartCount: val ?? 0 } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Stock wording', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'In-stock label', 'sgs-blocks' ) }
					value={ stockInStockLabel || '' }
					onChange={ ( val ) =>
						setAttributes( { stockInStockLabel: val } )
					}
					help={ __(
						'Replaces the in-stock label text only, e.g. "In stock — dispatched next working day". Empty = WooCommerce\'s own text. Low-stock and out-of-stock wording are unchanged.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</>
	);
}
