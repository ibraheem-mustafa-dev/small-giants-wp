import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { textRow } from '../../components';
import SgsFreeTextField from '../../components/SgsFreeTextField';

/**
 * Settings-tab panel for sgs/buybox's instalments note under the add-to-cart button (instalmentsNote, instalmentsCount),
 * the twin of sgs/cart's "Note under Checkout" (PanelContentControls.js). Its type controls sit in the Typography panel
 * (prefix instalmentsLine) and its colour in the Colours panel (instalmentsColourRows below).
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} A PanelBody for the default InspectorControls group.
 */
export function BuyboxInstalmentsPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Note under the button', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SgsFreeTextField
				type="rich"
				label={ __( 'Instalments note', 'sgs-blocks' ) }
				help={
					/* translators: %s is shown literally: the shopper's amount takes its place in the note. */
					__(
						'For example "Or 3 payments of %s with Klarna". %s becomes the chosen price divided by the number below, and follows the shopper\'s choice. Leave empty to hide it.',
						'sgs-blocks'
					)
				}
				value={ attributes.instalmentsNote || '' }
				onChange={ ( val ) =>
					setAttributes( { instalmentsNote: val } )
				}
			/>
			{ !! attributes.instalmentsNote && (
				<RangeControl
					label={ __( 'Number of payments', 'sgs-blocks' ) }
					value={ attributes.instalmentsCount ?? 3 }
					min={ 1 }
					max={ 12 }
					onChange={ ( val ) =>
						setAttributes( { instalmentsCount: val ?? 3 } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}

/**
 * The note's colour row for the block's one SgsColourPanel; empty while no note is set.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {Array<Object>} Row descriptors.
 */
export function instalmentsColourRows( { attributes, setAttributes } ) {
	if ( ! attributes.instalmentsNote ) {
		return [];
	}
	return [
		textRow( {
			key: 'instalments-line',
			label: __( 'Instalments note', 'sgs-blocks' ),
			attrs: { base: 'instalmentsLineColour' },
			attributes,
			setAttributes,
		} ),
	];
}
