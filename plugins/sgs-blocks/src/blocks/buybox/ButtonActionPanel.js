import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';

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
	const { addToCartAction, addToCartModalId } = attributes;

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Button action', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Button action', 'sgs-blocks' ) }
					value={ addToCartAction || 'cart' }
					options={ [
						{ value: 'cart', label: __( 'Add to cart', 'sgs-blocks' ) },
						{ value: 'modal', label: __( 'Open a popup', 'sgs-blocks' ) },
					] }
					onChange={ ( val ) => setAttributes( { addToCartAction: val } ) }
					help={ __(
						'Open a popup keeps the label above but opens a modal instead of adding to the cart directly — use this when the modal holds a choice-flow that finishes the purchase.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ 'modal' === addToCartAction && (
					<TextControl
						label={ __( 'Popup to open', 'sgs-blocks' ) }
						value={ addToCartModalId || '' }
						onChange={ ( val ) => setAttributes( { addToCartModalId: val } ) }
						help={ __(
							'The HTML anchor set on the sgs/modal block to open — set it on that block\'s Advanced panel, "HTML anchor" field.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
