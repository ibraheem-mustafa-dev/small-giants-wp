/**
 * The built-in button kit's colour rows for one declared button: the Background and Text rows (and a Border row when the
 * button declares no border control) under a heading with the button's label, as `SgsColourPanel` rows.
 *
 * A block with 12 or fewer base colours spreads these into its one main Colour panel (`builtinButtonColourRows` in
 * `../BuiltinButtonPanel.js`); a block over 12 leaves them in the kit's own panel (`../KitColourPanel.js`). Kept out of
 * the lazy panel chunk so a block's edit file can build the rows without loading the controls.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';

import registry from './registry.json';
import fillRow from '../colour-variants/fillRow';
import textRow from '../colour-variants/textRow';

const BASES = new Set(
	Object.values( registry.groups )
		.flat()
		.map( ( row ) => row.base )
);

/**
 * @param {Object}   args
 * @param {Object}   args.attributes    Block attributes.
 * @param {Function} args.setAttributes Block `setAttributes`.
 * @param {string}   args.prefix        The button's attribute prefix.
 * @param {string}   args.label         The button's declared label (the rows' heading).
 * @param {string[]} [args.groups]      Declared groups; omitted means the registry's default groups.
 * @return {Array} The colour rows, empty when the button declares no `colour` group.
 */
export function buttonKitColourRows( {
	attributes,
	setAttributes,
	prefix,
	label,
	groups,
} ) {
	const shown =
		Array.isArray( groups ) && groups.length
			? groups
			: registry.defaultGroups;
	if ( ! shown.includes( 'colour' ) ) {
		return [];
	}
	const has = ( group ) => shown.includes( group );
	const gradient = has( 'gradient' );
	const attr = ( base ) => {
		if ( ! BASES.has( base ) ) {
			throw new Error(
				`BuiltinButtonPanel: "${ base }" is not in button-kit/registry.json`
			);
		}
		return prefix + base;
	};
	return [
		fillRow( {
			key: `${ prefix }-background`,
			label: __( 'Background', 'sgs-blocks' ),
			heading: label,
			attrs: {
				base: attr( 'ColourBackground' ),
				hover: attr( 'ColourBackgroundHover' ),
				...( gradient
					? {
							gradient: attr( 'ColourBackgroundGradient' ),
							hoverGradient: attr( 'ColourBackgroundHoverGradient' ),
					  }
					: {} ),
			},
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: `${ prefix }-text`,
			label: __( 'Text', 'sgs-blocks' ),
			attrs: {
				base: attr( 'ColourText' ),
				hover: attr( 'ColourTextHover' ),
				...( gradient
					? {
							gradient: attr( 'ColourTextGradient' ),
							hoverGradient: attr( 'ColourTextHoverGradient' ),
					  }
					: {} ),
			},
			attributes,
			setAttributes,
		} ),
		// Border colour lives in the border control when the button declares one; otherwise it is a row here.
		! has( 'border' ) &&
			fillRow( {
				key: `${ prefix }-border`,
				label: __( 'Border', 'sgs-blocks' ),
				attrs: {
					base: attr( 'ColourBorder' ),
					hover: attr( 'ColourBorderHover' ),
					...( gradient
						? {
								gradient: attr( 'ColourBorderGradient' ),
								hoverGradient: attr( 'ColourBorderHoverGradient' ),
						  }
						: {} ),
				},
				attributes,
				setAttributes,
			} ),
	].filter( Boolean );
}
