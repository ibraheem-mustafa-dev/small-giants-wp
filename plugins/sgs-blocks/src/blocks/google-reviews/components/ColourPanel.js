/**
 * Google Reviews — the block's fill and text colours, in the ONE shared Colour panel.
 *
 * `SgsColourPanel` is the standard for every fill and text colour on a block; this file only
 * lists this block's rows. Border colours are not here: they travel with their border control
 * (`BorderField` in panel-kit.js). The star, slider-arrow and write-review-button panels that
 * were already in edit.js are left as they were.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SgsColourPanel, fillRow, textRow } from '../../../components';

/** Every attribute the Colour rows below read and write. */
export const COLOUR_ATTRS = [
	'backgroundColour',
	'backgroundColourGradient',
	'cardBackground',
	'starEmptyColour',
	'sourceLabelColour',
	'scoreColour',
	'countColour',
	'authorColour',
	'metaColour',
	'dateColour',
	'avatarTextColour',
	'textColour',
	'reviewLinkColour',
	'footnoteColour',
	'seeAllColourBackground',
	'seeAllColourBackgroundHover',
	'seeAllColourBackgroundGradient',
	'seeAllColourBackgroundHoverGradient',
	'seeAllColourText',
	'seeAllColourTextHover',
	'seeAllColourTextGradient',
	'seeAllColourTextHoverGradient',
];

/** The row descriptors SgsColourPanel renders. */
export function colourRows( attributes, setAttributes ) {
	const own = { attributes, setAttributes };
	const text = ( key, label, base ) => textRow( { key, label, attrs: { base }, ...own } );
	// A gradient behind the See-all button hides which colour the text sits on, so only a flat fill is compared.
	const seeAllBackdrop =
		! attributes.seeAllColourBackgroundGradient && attributes.seeAllColourBackground
			? attributes.seeAllColourBackground
			: '';

	return [
		fillRow( {
			key: 'panel-background',
			label: __( 'Panel background', 'sgs-blocks' ),
			attrs: { base: 'backgroundColour', gradient: 'backgroundColourGradient' },
			...own,
		} ),
		fillRow( {
			key: 'card-background',
			label: __( 'Review card background', 'sgs-blocks' ),
			attrs: { base: 'cardBackground' },
			...own,
		} ),
		fillRow( {
			key: 'star-empty',
			label: __( 'Empty star', 'sgs-blocks' ),
			attrs: { base: 'starEmptyColour' },
			...own,
		} ),
		text( 'source-label', __( 'Source caption', 'sgs-blocks' ), 'sourceLabelColour' ),
		text( 'score', __( 'Rating figure', 'sgs-blocks' ), 'scoreColour' ),
		text( 'count', __( 'Review count', 'sgs-blocks' ), 'countColour' ),
		text( 'author', __( 'Reviewer name', 'sgs-blocks' ), 'authorColour' ),
		text( 'meta', __( 'Reviewer details', 'sgs-blocks' ), 'metaColour' ),
		text( 'date', __( 'Review date', 'sgs-blocks' ), 'dateColour' ),
		text( 'avatar-text', __( 'Avatar initials', 'sgs-blocks' ), 'avatarTextColour' ),
		text( 'review-text', __( 'Review text', 'sgs-blocks' ), 'textColour' ),
		text( 'review-link', __( 'Full review link', 'sgs-blocks' ), 'reviewLinkColour' ),
		text( 'footnote', __( 'Footnote', 'sgs-blocks' ), 'footnoteColour' ),
		fillRow( {
			key: 'see-all-background',
			label: __( 'See all reviews button background', 'sgs-blocks' ),
			attrs: {
				base: 'seeAllColourBackground',
				hover: 'seeAllColourBackgroundHover',
				gradient: 'seeAllColourBackgroundGradient',
				hoverGradient: 'seeAllColourBackgroundHoverGradient',
			},
			...own,
		} ),
		textRow( {
			key: 'see-all-text',
			label: __( 'See all reviews button text', 'sgs-blocks' ),
			attrs: {
				base: 'seeAllColourText',
				hover: 'seeAllColourTextHover',
				gradient: 'seeAllColourTextGradient',
				hoverGradient: 'seeAllColourTextHoverGradient',
			},
			contrastAgainst: seeAllBackdrop,
			...own,
		} ),
	];
}

/**
 * Mount BEFORE any other Styles-tab InspectorControls in edit.js: WordPress concatenates
 * same-group fills in mount order and this panel is meant to lead.
 */
export default function ColourPanel( { attributes, setAttributes } ) {
	return <SgsColourPanel rows={ colourRows( attributes, setAttributes ) } />;
}
