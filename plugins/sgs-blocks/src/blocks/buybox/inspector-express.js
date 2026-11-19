import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';

/**
 * Settings-tab panel for sgs/buybox: when the Apple Pay and Google Pay buttons' scripts load.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} A PanelBody for the default InspectorControls group.
 */
export function BuyboxExpressLoadPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Apple Pay and Google Pay speed', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SelectControl
				label={ __( 'Load the Apple Pay and Google Pay buttons', 'sgs-blocks' ) }
				value={ attributes.expressLoad || 'page' }
				options={ [
					{ value: 'page', label: __( 'When the page opens', 'sgs-blocks' ) },
					{ value: 'interaction', label: __( 'When the shopper first scrolls, taps or types', 'sgs-blocks' ) },
				] }
				onChange={ ( val ) => setAttributes( { expressLoad: val } ) }
				help={ __(
					'Waiting for the first scroll, tap or key press keeps the payment provider’s heavy scripts out of the page’s first load, so Google PageSpeed scores the page higher. The trade-off: the wallet buttons appear a moment after the shopper’s first move. Shown only where the payment plugin prints the buttons.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
