import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * SGS Cart — the mini-cart footer's two actions: how "View cart" looks (an outlined
 * button or an underlined text link) and whether Checkout and View cart sit side by
 * side or stacked, Checkout full width with View cart centred under it.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 */
export default function PanelButtonsControls( { attributes, setAttributes, hasPanel } ) {
	if ( ! hasPanel ) {
		return null;
	}
	return (
		<PanelBody title={ __( 'Mini-cart buttons', 'sgs-blocks' ) } initialOpen={ false }>
			{ false !== attributes.panelShowViewCart && (
				<ToggleGroupControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					label={ __( '"View cart" looks like', 'sgs-blocks' ) }
					value={ attributes.panelViewStyle || 'outline' }
					onChange={ ( val ) => setAttributes( { panelViewStyle: val } ) }
				>
					<ToggleGroupControlOption value="outline" label={ __( 'Button', 'sgs-blocks' ) } />
					<ToggleGroupControlOption value="text-link" label={ __( 'Text link', 'sgs-blocks' ) } />
				</ToggleGroupControl>
			) }
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Checkout and "View cart" sit', 'sgs-blocks' ) }
				help={ __( 'Stacked puts Checkout full width on top with "View cart" centred under it, in that order for keyboard and screen reader users too.', 'sgs-blocks' ) }
				value={ attributes.panelActionsLayout || 'row' }
				onChange={ ( val ) => setAttributes( { panelActionsLayout: val } ) }
			>
				<ToggleGroupControlOption value="row" label={ __( 'Side by side', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="stacked" label={ __( 'Stacked', 'sgs-blocks' ) } />
			</ToggleGroupControl>
		</PanelBody>
	);
}
