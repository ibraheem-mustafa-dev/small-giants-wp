import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { TypographyControls } from '../../components';

const VIEW_TARGETS = [
	{
		key: 'panelView',
		prefix: 'panelView',
		label: __( 'View cart text', 'sgs-blocks' ),
		showStyle: false,
		showLineHeight: false,
		showLetterSpacing: true,
		showTransform: true,
	},
];

/**
 * SGS Cart — the "View cart" button or link's text style. Its colours are rows in the colour
 * panel (panelColourRows.js); printed by includes/helpers-cart-panel-css.php.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 */
export default function PanelButtonsDesign( { attributes, setAttributes, hasPanel } ) {
	if ( ! hasPanel || false === attributes.panelShowViewCart ) {
		return null;
	}
	return (
		<PanelBody title={ __( 'Mini-cart "View cart" text', 'sgs-blocks' ) } initialOpen={ false }>
			<TypographyControls attributes={ attributes } setAttributes={ setAttributes } targets={ VIEW_TARGETS } />
		</PanelBody>
	);
}
