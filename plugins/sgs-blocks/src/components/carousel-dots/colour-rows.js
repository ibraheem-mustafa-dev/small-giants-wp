/**
 * The carousel dots kit's colour rows for one declared set of dots: the Dot row (Normal, Hover and Current) under a
 * heading with the dots' label, and the Dot border row, as `SgsColourPanel` rows.
 *
 * A block with 12 or fewer base colours spreads these into its one main Colour panel (`carouselDotsColourRows` in
 * `../CarouselDotsPanel.js`); a block over 12 leaves them in the kit's own panel (`../KitColourPanel.js`).
 *
 * @package
 */
import { __ } from '@wordpress/i18n';

import registry from './registry.json';
import fillRow from '../colour-variants/fillRow';

const BASES = new Set( registry.rows.map( ( row ) => row.base ) );

/**
 * @param {Object}   args
 * @param {Object}   args.attributes    Block attributes.
 * @param {Function} args.setAttributes Block `setAttributes`.
 * @param {string}   args.prefix        The dots' attribute prefix.
 * @param {string}   args.label         The dots' declared label (the rows' heading).
 * @return {Array} The two colour rows.
 */
export function dotsColourRows( { attributes, setAttributes, prefix, label } ) {
	const attr = ( base ) => {
		if ( ! BASES.has( base ) ) {
			throw new Error(
				`CarouselDotsPanel: "${ base }" is not in carousel-dots/registry.json`
			);
		}
		return prefix + base;
	};
	return [
		fillRow( {
			key: `${ prefix }-dot`,
			label: __( 'Dot', 'sgs-blocks' ),
			heading: label,
			attrs: {
				base: attr( 'Colour' ),
				hover: attr( 'ColourHover' ),
				current: attr( 'ColourActive' ),
			},
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: `${ prefix }-border`,
			label: __( 'Dot border', 'sgs-blocks' ),
			attrs: { base: attr( 'BorderColour' ) },
			attributes,
			setAttributes,
		} ),
	];
}
