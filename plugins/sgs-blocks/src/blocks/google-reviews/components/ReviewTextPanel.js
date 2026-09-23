/**
 * Google Reviews — "Review text" section: the review wording, how much of it shows, the
 * "Read the full review" link and the footnote under the reviews.
 *
 * Text colours (review text, link, footnote) live in the shared Colour panel (ColourPanel.js).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl, RangeControl, TextControl } from '@wordpress/components';
import { Section, Row, typographyAttrs } from './panel-kit';
import { TypographyRow, typoTarget } from './panel-fields';

export const REVIEW_TEXT_TYPOGRAPHY_PREFIXES = [ 'text', 'reviewLink', 'footnote' ];

/** Every attribute this section owns (drives "Reset all"). */
export const REVIEW_TEXT_ATTRS = [
	'textClamp',
	'textClampLines',
	'showReviewLink',
	'reviewLinkLabel',
	'footnote',
	...typographyAttrs( REVIEW_TEXT_TYPOGRAPHY_PREFIXES ),
];

export default function ReviewTextPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };

	return (
		<Section title={ __( 'Review text', 'sgs-blocks' ) } attrs={ REVIEW_TEXT_ATTRS } setAttributes={ setAttributes }>
			<Row
				label={ __( 'Shorten long reviews', 'sgs-blocks' ) }
				attrs={ [ 'textClamp', 'textClampLines' ] }
				{ ...shared }
			>
				<ToggleControl
					label={ __( 'Cut long reviews to a set number of lines', 'sgs-blocks' ) }
					checked={ !! attributes.textClamp }
					onChange={ ( value ) => setAttributes( { textClamp: value } ) }
				/>
				{ attributes.textClamp && (
					<RangeControl
						label={ __( 'Lines shown', 'sgs-blocks' ) }
						value={ attributes.textClampLines }
						onChange={ ( value ) => setAttributes( { textClampLines: value } ) }
						min={ 1 }
						max={ 20 }
						__next40pxDefaultSize
					/>
				) }
			</Row>
			<Row
				label={ __( '"Read the full review" link', 'sgs-blocks' ) }
				attrs={ [ 'showReviewLink', 'reviewLinkLabel' ] }
				{ ...shared }
			>
				<ToggleControl
					label={ __( 'Show a link to the full review', 'sgs-blocks' ) }
					help={ __( 'Only appears on a review that has its own link.', 'sgs-blocks' ) }
					checked={ !! attributes.showReviewLink }
					onChange={ ( value ) => setAttributes( { showReviewLink: value } ) }
				/>
				{ attributes.showReviewLink && (
					<TextControl
						label={ __( 'Link wording', 'sgs-blocks' ) }
						value={ attributes.reviewLinkLabel }
						onChange={ ( value ) => setAttributes( { reviewLinkLabel: value } ) }
						help={ __( 'Leave empty to use the standard wording.', 'sgs-blocks' ) }
						__next40pxDefaultSize
					/>
				) }
			</Row>
			<Row label={ __( 'Footnote', 'sgs-blocks' ) } attrs={ [ 'footnote' ] } { ...shared }>
				<TextControl
					label={ __( 'Footnote', 'sgs-blocks' ) }
					value={ attributes.footnote }
					onChange={ ( value ) => setAttributes( { footnote: value } ) }
					help={ __( 'A short line under the reviews, for example "Scroll for more". Leave empty for none.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</Row>
			<TypographyRow
				label={ __( 'Review text typography', 'sgs-blocks' ) }
				targets={ [
					typoTarget( 'text', __( 'Review text', 'sgs-blocks' ) ),
					typoTarget( 'reviewLink', __( 'Full review link', 'sgs-blocks' ) ),
					typoTarget( 'footnote', __( 'Footnote', 'sgs-blocks' ) ),
				] }
				{ ...shared }
			/>
		</Section>
	);
}
