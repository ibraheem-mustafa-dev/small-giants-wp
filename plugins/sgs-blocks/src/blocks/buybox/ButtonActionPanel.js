import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';

/**
 * "Button action" panel for sgs/buybox (Spec 43 FR-43-22).
 *
 * Lets the operator send the Add to Cart button either to the cart (default)
 * or to open an sgs/modal instead — typically one holding a choice-flow that
 * asks further questions and finishes the purchase. A NEW file, not added to
 * edit.js (436 lines, already over the 250-line cap) — the main thread wires
 * it in with one import + one JSX line (see the buybox report).
 */
export default function ButtonActionPanel( { attributes, setAttributes } ) {
	const {
		addToCartAction,
		addToCartModalId,
		keepAddToCartWithFlow,
		openerBeforeAddToCart,
	} = attributes;

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Button action', 'sgs-blocks' ) }
				initialOpen
			>
				<ToggleGroupControl
					label={ __( 'Button action', 'sgs-blocks' ) }
					value={ addToCartAction || 'cart' }
					onChange={ ( val ) =>
						setAttributes( { addToCartAction: val } )
					}
					isBlock
					help={ __(
						'Open a popup keeps the label above but opens a modal instead of adding to the cart directly — use this when the modal holds a choice-flow that finishes the purchase.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					<ToggleGroupControlOption
						value="cart"
						label={ __( 'Add to cart', 'sgs-blocks' ) }
					/>
					<ToggleGroupControlOption
						value="modal"
						label={ __( 'Open a popup', 'sgs-blocks' ) }
					/>
				</ToggleGroupControl>
				{ 'modal' === addToCartAction && (
					<TextControl
						label={ __( 'Popup to open', 'sgs-blocks' ) }
						value={ addToCartModalId || '' }
						onChange={ ( val ) =>
							setAttributes( { addToCartModalId: val } )
						}
						help={ __(
							'The HTML anchor set on the sgs/modal block to open — set it on that block\'s Advanced panel, "HTML anchor" field.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
				<ToggleControl
					label={ __(
						'Keep Add to Cart beside the flow button',
						'sgs-blocks'
					) }
					checked={ !! keepAddToCartWithFlow }
					onChange={ ( val ) =>
						setAttributes( { keepAddToCartWithFlow: val } )
					}
					help={ __(
						'For a product linked to a choice flow that some buyers skip. Off: the flow button replaces Add to Cart. On: Add to Cart (and the express Buy now buttons) stay, and the flow button shows beside them. Does nothing on a product with no flow, in the guided layout, or when the button above opens a popup. A product that cannot be bought shows no flow button. The look of the flow button is set in Styles, Flow opener button; a setting left empty follows Add to Cart.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				{ keepAddToCartWithFlow && (
					<ToggleControl
						label={ __( 'Flow button first', 'sgs-blocks' ) }
						checked={ !! openerBeforeAddToCart }
						onChange={ ( val ) =>
							setAttributes( { openerBeforeAddToCart: val } )
						}
						help={ __(
							'Off: the flow button follows Add to Cart. On: it comes before Add to Cart, for screen readers and keyboards too.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
