/**
 * SGS Mega Panel — the colour rows of the Settings-tab sections (Brands
 * eyebrow, Aside divider, In the drawer). edit.js adds them to the block's one
 * Styles-tab SgsColourPanel (Spec 35 PART O §1 field 4(a) and 9e): a colour
 * panel nested in a Settings-tab section never renders, because the editor
 * mounts only the active tab's slots. A row whose element is not shown is
 * omitted.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { fillRow, textRow } from '../../components';

/**
 * @param {Object}   props                 Props.
 * @param {Object}   props.attributes      Block attributes.
 * @param {Function} props.setAttributes   Setter.
 * @param {string}   props.resolvedVariant The panel variant ('general' when unset).
 * @return {Array} Colour rows for SgsColourPanel.
 */
export default function sectionColourRows( { attributes, setAttributes, resolvedVariant } ) {
	const { asideSeparator, brandsEyebrow } = attributes;
	const sepStyle = asideSeparator?.style || 'line';

	return [
		'brands' === resolvedVariant &&
			!! brandsEyebrow &&
			textRow( {
				key: 'brandsEyebrow',
				label: __( 'Eyebrow colour', 'sgs-blocks' ),
				attrs: { base: 'brandsEyebrowColour' },
				attributes,
				setAttributes,
			} ),
		'line' === sepStyle &&
			fillRow( {
				key: 'aside-separator-colour',
				heading: __( 'Aside', 'sgs-blocks' ),
				label: __( 'Divider colour', 'sgs-blocks' ),
				get: () => asideSeparator?.colour,
				set: ( value ) =>
					setAttributes( {
						asideSeparator: { ...asideSeparator, colour: value || '' },
					} ),
			} ),
		fillRow( {
			key: 'drawerBg',
			heading: __( 'In the drawer', 'sgs-blocks' ),
			label: __( 'Drawer ground', 'sgs-blocks' ),
			attrs: { base: 'drawerBg', gradient: 'drawerBgGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'drawerLinkNumColour',
			label: __( 'Link number colour', 'sgs-blocks' ),
			attrs: { base: 'drawerLinkNumColour', gradient: 'drawerLinkNumColourGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'drawerLinkLabelColour',
			label: __( 'Link label colour', 'sgs-blocks' ),
			attrs: { base: 'drawerLinkLabelColour', gradient: 'drawerLinkLabelColourGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'drawerLinkDescColour',
			label: __( 'Link description colour', 'sgs-blocks' ),
			attrs: { base: 'drawerLinkDescColour', gradient: 'drawerLinkDescColourGradient' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'drawerLinkDivider',
			label: __( 'Link divider colour', 'sgs-blocks' ),
			attrs: { base: 'drawerLinkDivider', gradient: 'drawerLinkDividerGradient' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'drawerLinkBg',
			label: __( 'Link row background', 'sgs-blocks' ),
			attrs: {
				base: 'drawerLinkBg',
				hover: 'drawerLinkHoverBg',
				gradient: 'drawerLinkBgGradient',
				hoverGradient: 'drawerLinkHoverBgGradient',
			},
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'drawerCardBg',
			label: __( 'Card ground', 'sgs-blocks' ),
			attrs: { base: 'drawerCardBg', gradient: 'drawerCardBgGradient' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'drawerCardBorderColour',
			label: __( 'Card border colour', 'sgs-blocks' ),
			attrs: { base: 'drawerCardBorderColour', gradient: 'drawerCardBorderColourGradient' },
			attributes,
			setAttributes,
		} ),
	];
}
