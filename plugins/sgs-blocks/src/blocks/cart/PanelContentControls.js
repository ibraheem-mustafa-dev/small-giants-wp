import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';

/**
 * SGS Cart — what the mini-cart panel shows: the heading count, the item
 * row's parts, the notes and where the free-delivery bar sits.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    The block's current attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 * @param {boolean}  root0.hasPanel      Whether displayMode is flyout|drawer.
 */
export default function PanelContentControls( { attributes, setAttributes, hasPanel } ) {
	if ( ! hasPanel ) {
		return null;
	}
	const toggle = ( attr, label, help, fallback ) => (
		<ToggleControl
			label={ label }
			help={ help }
			checked={ attributes[ attr ] ?? fallback }
			onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
			__nextHasNoMarginBottom
		/>
	);
	const text = ( attr, label, help ) => (
		<TextControl
			label={ label }
			help={ help }
			value={ attributes[ attr ] ?? '' }
			onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
	const isTextRemove = 'text' === ( attributes.itemRemoveStyle || 'icon' );
	const showsAddOptions = true === attributes.itemShowAddOptions;

	return (
		<PanelBody title={ __( 'Mini-cart contents', 'sgs-blocks' ) } initialOpen={ false }>
			{ toggle( 'panelShowCount', __( 'Show the item count after the heading', 'sgs-blocks' ), __( 'For example "Bag (2)".', 'sgs-blocks' ), false ) }
			{ toggle( 'itemShowQty', __( 'Show a quantity box on each item', 'sgs-blocks' ), undefined, true ) }
			{ toggle( 'itemShowSaveForLater', __( 'Show "Save for later" on each item', 'sgs-blocks' ), undefined, true ) }
			{ toggle(
				'itemShowAddOptions',
				__( 'Invite the shopper to finish configuring an item', 'sgs-blocks' ),
				__( 'Shows a link on any item that still has priced extras to choose. It hides itself as soon as that item has them, and goes to the item\'s own product page.', 'sgs-blocks' ),
				false
			) }
			{ showsAddOptions &&
				text(
					'itemAddOptionsLabel',
					__( 'That link\'s text', 'sgs-blocks' ),
					__( 'For example "Add my prescription" or "Choose a finish". Leave empty to hide it.', 'sgs-blocks' )
				) }
			<SelectControl
				label={ __( 'Remove button', 'sgs-blocks' ) }
				value={ attributes.itemRemoveStyle || 'icon' }
				options={ [
					{ label: __( 'A × beside the item', 'sgs-blocks' ), value: 'icon' },
					{ label: __( 'A text link under the item', 'sgs-blocks' ), value: 'text' },
				] }
				onChange={ ( val ) => setAttributes( { itemRemoveStyle: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ isTextRemove && text( 'itemRemoveLabel', __( 'Remove link text', 'sgs-blocks' ) ) }
			{ toggle( 'panelShowViewCart', __( 'Show the "View cart" button', 'sgs-blocks' ), undefined, true ) }
			{ text( 'panelTaxNote', __( 'Note under the subtotal', 'sgs-blocks' ), __( 'Leave empty to hide it.', 'sgs-blocks' ) ) }
			{ text(
				'panelInstalmentsNote',
				__( 'Note under Checkout', 'sgs-blocks' ),
				__( 'For example "Or 3 payments of %s with Klarna". %s becomes the cart total divided by the number below. Leave empty to hide it.', 'sgs-blocks' )
			) }
			{ !! attributes.panelInstalmentsNote && (
				<RangeControl
					label={ __( 'Number of payments', 'sgs-blocks' ) }
					value={ attributes.panelInstalmentsCount ?? 3 }
					min={ 1 }
					max={ 12 }
					onChange={ ( val ) => setAttributes( { panelInstalmentsCount: val ?? 3 } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			<SelectControl
				label={ __( 'Free-delivery bar position', 'sgs-blocks' ) }
				value={ attributes.freeDeliveryPlacement || 'above-items' }
				options={ [
					{ label: __( 'Above the items', 'sgs-blocks' ), value: 'above-items' },
					{ label: __( 'Under the subtotal', 'sgs-blocks' ), value: 'footer' },
				] }
				onChange={ ( val ) => setAttributes( { freeDeliveryPlacement: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<RangeControl
				label={ __( 'Free-delivery bar fill time (seconds)', 'sgs-blocks' ) }
				help={ __( 'How long the bar takes to grow to its new level.', 'sgs-blocks' ) }
				value={ attributes.freeDeliveryFillDuration ?? 0.6 }
				min={ 0 }
				max={ 3 }
				step={ 0.1 }
				onChange={ ( val ) => setAttributes( { freeDeliveryFillDuration: val ?? 0.6 } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Free-delivery bar fill style', 'sgs-blocks' ) }
				value={ attributes.freeDeliveryFillEasing || 'smooth' }
				options={ [
					{ label: __( 'Smooth (quick start, gentle finish)', 'sgs-blocks' ), value: 'smooth' },
					{ label: __( 'Gentle', 'sgs-blocks' ), value: 'ease' },
					{ label: __( 'Slow at both ends', 'sgs-blocks' ), value: 'ease-in-out' },
					{ label: __( 'Steady', 'sgs-blocks' ), value: 'linear' },
				] }
				onChange={ ( val ) => setAttributes( { freeDeliveryFillEasing: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ toggle( 'freeDeliveryHideWhenEmpty', __( 'Hide the free-delivery bar while the cart is empty', 'sgs-blocks' ), undefined, false ) }
		</PanelBody>
	);
}
