/**
 * Google Reviews — "Card" section: the outer panel and each review card.
 *
 * Holds the ready-made "Card look" (the extended `cardStyle` enum), the outer panel's padding and
 * font, and each review card's padding, border, gap and width. Colours (panel and card background)
 * live in the one shared Colour panel (ColourPanel.js), and the outer panel's own border stays in
 * the "Layout" panel in edit.js.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { Section, Row, typographyAttrs } from './panel-kit';
import { TierBox, TierLength, BorderField, TypographyRow, typoTarget } from './panel-fields';

/** Human labels for the `cardStyle` enum. The slugs come from block.json; a slug added there needs a label here. */
export const CARD_LOOK_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Google card (matches the Google Reviews panel)', 'sgs-blocks' ), value: 'google-card' },
	{ label: __( 'Minimal quote (no boxes)', 'sgs-blocks' ), value: 'quote-minimal' },
	{ label: __( 'Boxed tile', 'sgs-blocks' ), value: 'boxed' },
	{ label: __( 'Speech bubble', 'sgs-blocks' ), value: 'bubble' },
	{ label: __( 'Wall tile (dense wall)', 'sgs-blocks' ), value: 'wall-tile' },
];

const BORDER_ATTRS = [
	'cardBorderWidth',
	'cardBorderStyle',
	'cardBorderColour',
	'cardBorderColourGradient',
	'cardBorderRadius',
];

/** Every attribute this section owns (drives "Reset all"). */
export const CARD_ATTRS = [
	'cardStyle',
	'padding',
	'cardPadding',
	...BORDER_ATTRS,
	'cardGap',
	'cardWidth',
	...typographyAttrs( [ '' ] ),
];

export default function CardPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	// The card border sits on the card background, or on the panel behind it when the card has none.
	const cardBackdrop =
		attributes.cardBackground || ( ! attributes.backgroundColourGradient && attributes.backgroundColour ) || '';

	return (
		<Section title={ __( 'Card', 'sgs-blocks' ) } attrs={ CARD_ATTRS } setAttributes={ setAttributes }>
			<Row label={ __( 'Card look', 'sgs-blocks' ) } attrs={ [ 'cardStyle' ] } { ...shared }>
				<SelectControl
					label={ __( 'Card look', 'sgs-blocks' ) }
					value={ attributes.cardStyle }
					options={ CARD_LOOK_OPTIONS }
					onChange={ ( value ) => setAttributes( { cardStyle: value } ) }
					help={ __( 'A ready-made starting style. Anything you set in the controls below paints over it.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row label={ __( 'Panel padding', 'sgs-blocks' ) } attrs={ [ 'padding' ] } { ...shared }>
				<TierBox label={ __( 'Panel padding', 'sgs-blocks' ) } attr="padding" { ...shared } />
			</Row>
			<TypographyRow
				label={ __( 'Panel font', 'sgs-blocks' ) }
				targets={ [
					typoTarget( '', __( 'Panel font', 'sgs-blocks' ), {
						showDecoration: false,
						showTransform: false,
						showLetterSpacing: false,
						showTextAlign: false,
						showTextWrap: false,
					} ),
				] }
				{ ...shared }
			/>
			<Row label={ __( 'Review card padding', 'sgs-blocks' ) } attrs={ [ 'cardPadding' ] } { ...shared }>
				<TierBox label={ __( 'Review card padding', 'sgs-blocks' ) } attr="cardPadding" { ...shared } />
			</Row>
			<Row label={ __( 'Review card border', 'sgs-blocks' ) } attrs={ BORDER_ATTRS } { ...shared }>
				<BorderField
					label={ __( 'Review card border width', 'sgs-blocks' ) }
					widthAttr="cardBorderWidth"
					styleAttr="cardBorderStyle"
					colourAttr="cardBorderColour"
					gradientAttr="cardBorderColourGradient"
					radiusAttr="cardBorderRadius"
					contrastAgainst={ cardBackdrop }
					{ ...shared }
				/>
			</Row>
			<Row label={ __( 'Review card gap', 'sgs-blocks' ) } attrs={ [ 'cardGap' ] } { ...shared }>
				<TierLength label={ __( 'Space between the parts of a card', 'sgs-blocks' ) } attr="cardGap" { ...shared } />
			</Row>
			<Row label={ __( 'Review card width', 'sgs-blocks' ) } attrs={ [ 'cardWidth' ] } { ...shared }>
				<TierLength label={ __( 'Card width (slider and wall)', 'sgs-blocks' ) } attr="cardWidth" { ...shared } />
			</Row>
		</Section>
	);
}
