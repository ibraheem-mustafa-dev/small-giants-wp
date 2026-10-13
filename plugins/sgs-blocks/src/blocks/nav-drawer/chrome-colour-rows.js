/**
 * Nav drawer top-row colour rows (Spec 36 FR-36-6): the row ground, the logo
 * box, the free slot (button fill and text, or the heading/label/text colour),
 * the Google rating and the close button. edit.js adds them to the drawer's
 * one Styles-tab SgsColourPanel (Spec 35 PART O §1 field 4(a) and 9e); the
 * "Top row" panel itself sits on the Settings tab, where a nested Styles fill
 * never renders. A row whose element is not shown is omitted.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { fillRow, textRow } from '../../components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Array} Colour rows for SgsColourPanel.
 */
export default function chromeColourRows( { attributes, setAttributes } ) {
	const slotType = attributes.chromeSlotType || '';
	const hasLogo = !! ( attributes.chromeLogoUrl || attributes.chromeLogoUrlTablet || attributes.chromeLogoUrlMobile );
	const isButton = 'button' === slotType;
	const isTextSlot = '' !== slotType && ! isButton && 'icons' !== slotType;

	return [
		fillRow( {
			key: 'chromeRowBg',
			heading: __( 'Top row', 'sgs-blocks' ),
			label: __( 'Top row background', 'sgs-blocks' ),
			attrs: { base: 'chromeRowBg', gradient: 'chromeRowBgGradient' },
			attributes,
			setAttributes,
		} ),
		hasLogo &&
			fillRow( {
				key: 'chromeLogoBoxBg',
				label: __( 'Logo box background', 'sgs-blocks' ),
				attrs: { base: 'chromeLogoBoxBg', gradient: 'chromeLogoBoxBgGradient' },
				attributes,
				setAttributes,
			} ),
		isButton &&
			fillRow( {
				key: 'chromeButtonFill',
				label: __( 'Button background', 'sgs-blocks' ),
				attrs: {
					base: 'chromeButtonColourBackground',
					hover: 'chromeButtonColourBackgroundHover',
					gradient: 'chromeButtonColourBackgroundGradient',
				},
				attributes,
				setAttributes,
			} ),
		isButton &&
			textRow( {
				key: 'chromeButtonText',
				label: __( 'Button text', 'sgs-blocks' ),
				attrs: {
					base: 'chromeButtonColourText',
					hover: 'chromeButtonColourTextHover',
					gradient: 'chromeButtonColourTextGradient',
					hoverGradient: 'chromeButtonColourTextHoverGradient',
				},
				attributes,
				setAttributes,
			} ),
		isTextSlot &&
			textRow( {
				key: 'chromeSlotColour',
				label: __( 'Extra item colour', 'sgs-blocks' ),
				attrs: { base: 'chromeSlotColour', gradient: 'chromeSlotColourGradient' },
				attributes,
				setAttributes,
			} ),
		!! attributes.chromeRating &&
			textRow( {
				key: 'chromeRatingColour',
				label: __( 'Rating and caption colour', 'sgs-blocks' ),
				attrs: { base: 'chromeRatingColour' },
				attributes,
				setAttributes,
			} ),
		fillRow( {
			key: 'closeBg',
			label: __( 'Close button background', 'sgs-blocks' ),
			attrs: {
				base: 'closeBg',
				hover: 'closeBgHover',
				gradient: 'closeBgGradient',
				hoverGradient: 'closeBgHoverGradient',
			},
			attributes,
			setAttributes,
		} ),
	];
}
