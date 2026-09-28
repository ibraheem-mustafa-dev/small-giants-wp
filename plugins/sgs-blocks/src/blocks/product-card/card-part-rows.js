/**
 * Colour rows for sgs/product-card's card parts that the main colour list in
 * edit.js doesn't build: the card's hover border colour, the RRP colour, the
 * photo's fill, the no-photo label, the colour dots' ring and the wishlist
 * heart's ring.
 * Both apply in typed and bound modes (includes/product-card-card-parts.php
 * emits them from the shared, pre-branch section of render.php).
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute setter.
 * @return {Object[]} SgsColourPanel rows.
 */
export function cardPartColourRows( attributes, setAttributes ) {
	const { borderColourHover, rrpColour, mediaBackgroundColour, noImageLabelColour, swatchBorderColour, wishlistBorderColour } = attributes;

	return [
		{
			key: 'cardBorderHover',
			label: __( 'Card border colour on hover', 'sgs-blocks' ),
			states: [
				{
					key: 'hover',
					label: __( 'Hover', 'sgs-blocks' ),
					value: borderColourHover,
					onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'rrp',
			label: __( 'RRP colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: rrpColour,
					onChange: ( val ) => setAttributes( { rrpColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'mediaBackground',
			label: __( 'Photo background colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: mediaBackgroundColour,
					onChange: ( val ) => setAttributes( { mediaBackgroundColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'noImageLabel',
			label: __( 'No-photo label colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: noImageLabelColour,
					onChange: ( val ) => setAttributes( { noImageLabelColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'swatchBorder',
			label: __( 'Colour dot ring colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: swatchBorderColour,
					onChange: ( val ) => setAttributes( { swatchBorderColour: val ?? '' } ),
					linked: true,
				},
			],
		},
		{
			key: 'wishlistBorder',
			label: __( 'Wishlist heart ring colour', 'sgs-blocks' ),
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: wishlistBorderColour,
					onChange: ( val ) => setAttributes( { wishlistBorderColour: val ?? '' } ),
					linked: true,
				},
			],
		},
	];
}
