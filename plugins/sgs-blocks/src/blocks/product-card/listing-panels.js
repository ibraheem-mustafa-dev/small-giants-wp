/**
 * Inspector panels for the listing-card settings of sgs/product-card:
 * what a connected product's card shows (description, button, wishlist
 * heart, RRP saving, colour dots) and the card's image shape and shadow.
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { MEDIA_SIZING_RATIO_OPTIONS } from '../../components';

/**
 * Connected-product panel: which elements a live card shows and where its
 * RRP and colour dots come from.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingContentPanel( { attributes, setAttributes } ) {
	const {
		showDescription,
		showCta,
		showWishlist,
		rrpMetaKey,
		rrpSavingFormat,
		swatchAttribute,
	} = attributes;

	return (
		<PanelBody
			title={ __( 'Listing card', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __( 'Show description', 'sgs-blocks' ) }
				help={ __(
					'The product’s short description under the title.',
					'sgs-blocks'
				) }
				checked={ showDescription !== false }
				onChange={ ( v ) => setAttributes( { showDescription: v } ) }
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Show button', 'sgs-blocks' ) }
				help={ __(
					'Off for shop grids: the image and title still link to the product.',
					'sgs-blocks'
				) }
				checked={ showCta !== false }
				onChange={ ( v ) => setAttributes( { showCta: v } ) }
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Show wishlist heart', 'sgs-blocks' ) }
				help={ __(
					'A heart on the image that saves the product in the visitor’s browser.',
					'sgs-blocks'
				) }
				checked={ !! showWishlist }
				onChange={ ( v ) => setAttributes( { showWishlist: v } ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'RRP field (meta key)', 'sgs-blocks' ) }
				help={ __(
					'The product field holding the recommended retail price, e.g. _sgs_rrp. When the RRP is above the price it shows struck through, and an empty saving badge reads the saving.',
					'sgs-blocks'
				) }
				value={ rrpMetaKey || '' }
				onChange={ ( v ) => setAttributes( { rrpMetaKey: v } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{ '' !== ( rrpMetaKey || '' ) && (
				<SelectControl
					label={ __( 'Saving wording', 'sgs-blocks' ) }
					value={ rrpSavingFormat || 'amount' }
					options={ [
						{
							label: __( 'Amount (Save £32)', 'sgs-blocks' ),
							value: 'amount',
						},
						{
							label: __( 'Percentage (Save 19%)', 'sgs-blocks' ),
							value: 'percentage',
						},
					] }
					onChange={ ( v ) => setAttributes( { rrpSavingFormat: v } ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) }
			<TextControl
				label={ __( 'Colour dots from attribute', 'sgs-blocks' ) }
				help={ __(
					'The variation attribute whose colours show as dots, e.g. pa_colour. Empty = the first attribute with colours set. Typed swatches win when present.',
					'sgs-blocks'
				) }
				value={ swatchAttribute || '' }
				onChange={ ( v ) => setAttributes( { swatchAttribute: v } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}

/**
 * Styles panel: the image box shape and the resting shadow.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingShapePanel( { attributes, setAttributes } ) {
	const { imageAspectRatio, showShadow } = attributes;

	return (
		<PanelBody
			title={ __( 'Image shape & shadow', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SelectControl
				label={ __( 'Image shape', 'sgs-blocks' ) }
				help={ __(
					'Fixed height uses the Image height setting; a ratio follows the card’s width.',
					'sgs-blocks'
				) }
				value={ imageAspectRatio || '' }
				options={ [
					{ label: __( 'Fixed height', 'sgs-blocks' ), value: '' },
					...MEDIA_SIZING_RATIO_OPTIONS,
				] }
				onChange={ ( v ) => setAttributes( { imageAspectRatio: v } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Resting shadow', 'sgs-blocks' ) }
				help={ __(
					'Off = border only. The hover lift keeps its shadow.',
					'sgs-blocks'
				) }
				checked={ showShadow !== false }
				onChange={ ( v ) => setAttributes( { showShadow: v } ) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
