/**
 * Google Reviews — "Buttons" section: the two pills in the header ("See all reviews" and
 * "Write a review").
 *
 * Both are the same element recipe under two attribute prefixes (`seeAll…` and `writeReview…`),
 * so one component draws both. Fill and text colours live in the shared Colour panel
 * (ColourPanel.js: "Write-review button" stays in edit.js, "See-all button" is a Colour row); the
 * border colour (Normal + Hover) travels with the border control, as it does on every block.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';
import { Section, Row, typographyAttrs, isDeclared } from './panel-kit';
import { TierBox, TierLength, BorderField, TypographyRow, typoTarget } from './panel-fields';

/** The attributes one button prefix owns that block.json declares (the gradient pair exists on some only). */
export function buttonAttrs( prefix ) {
	return [
		`${ prefix }Label`,
		`${ prefix }Url`,
		`${ prefix }BorderWidth`,
		`${ prefix }BorderStyle`,
		`${ prefix }ColourBorder`,
		`${ prefix }ColourBorderGradient`,
		`${ prefix }ColourBorderHover`,
		`${ prefix }ColourBorderHoverGradient`,
		`${ prefix }BorderRadius`,
		`${ prefix }Padding`,
		`${ prefix }MinHeight`,
		...typographyAttrs( [ prefix ] ),
	].filter( isDeclared );
}

const PREFIXES = [ 'seeAll', 'writeReview' ];

/** Every attribute this section owns (drives "Reset all"). */
export const BUTTONS_ATTRS = PREFIXES.flatMap( buttonAttrs );

/**
 * One button's fields.
 *
 * @param {Object} props
 * @param {string} props.prefix Attribute prefix: 'seeAll' or 'writeReview'.
 * @param {string} props.name   Human name shown in the row labels.
 */
function ButtonFields( { prefix, name, attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	const attr = ( suffix ) => `${ prefix }${ suffix }`;
	/* translators: %s: the button's name, e.g. "See all reviews button". */
	const t = ( pattern ) => sprintf( pattern, name );
	const has = ( suffix ) => isDeclared( attr( suffix ) );
	const backdrop = attributes[ attr( 'ColourBackground' ) ] || '';
	const borderAttrs = [ 'BorderWidth', 'BorderStyle', 'ColourBorder', 'ColourBorderGradient', 'ColourBorderHover', 'ColourBorderHoverGradient', 'BorderRadius' ]
		.filter( has )
		.map( attr );

	return (
		<>
			<Row label={ t( __( '%s: wording', 'sgs-blocks' ) ) } attrs={ [ attr( 'Label' ), ...( has( 'Url' ) ? [ attr( 'Url' ) ] : [] ) ].filter( isDeclared ) } { ...shared }>
				{ has( 'Url' ) && (
					<TextControl
						label={ t( __( '%s link (web address)', 'sgs-blocks' ) ) }
						value={ attributes[ attr( 'Url' ) ] }
						onChange={ ( value ) => setAttributes( { [ attr( 'Url' ) ]: value } ) }
						type="url"
						__next40pxDefaultSize
					/>
				) }
				<TextControl
					label={ t( __( '%s wording', 'sgs-blocks' ) ) }
					value={ attributes[ attr( 'Label' ) ] }
					onChange={ ( value ) => setAttributes( { [ attr( 'Label' ) ]: value } ) }
					help={ __( 'Leave empty to use the standard wording.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row label={ t( __( '%s: border', 'sgs-blocks' ) ) } attrs={ borderAttrs } { ...shared }>
				<BorderField
					label={ t( __( '%s border width', 'sgs-blocks' ) ) }
					widthAttr={ attr( 'BorderWidth' ) }
					styleAttr={ attr( 'BorderStyle' ) }
					colourAttr={ attr( 'ColourBorder' ) }
					gradientAttr={ has( 'ColourBorderGradient' ) ? attr( 'ColourBorderGradient' ) : undefined }
					hoverAttr={ attr( 'ColourBorderHover' ) }
					hoverGradientAttr={ has( 'ColourBorderHoverGradient' ) ? attr( 'ColourBorderHoverGradient' ) : undefined }
					radiusAttr={ attr( 'BorderRadius' ) }
					contrastAgainst={ backdrop }
					{ ...shared }
				/>
			</Row>
			<Row label={ t( __( '%s: padding', 'sgs-blocks' ) ) } attrs={ [ attr( 'Padding' ) ] } { ...shared }>
				<TierBox label={ t( __( '%s padding', 'sgs-blocks' ) ) } attr={ attr( 'Padding' ) } { ...shared } />
			</Row>
			<Row label={ t( __( '%s: minimum height', 'sgs-blocks' ) ) } attrs={ [ attr( 'MinHeight' ) ] } { ...shared }>
				<TierLength label={ t( __( '%s minimum height', 'sgs-blocks' ) ) } attr={ attr( 'MinHeight' ) } { ...shared } />
			</Row>
			<TypographyRow
				label={ t( __( '%s: typography', 'sgs-blocks' ) ) }
				targets={ [ typoTarget( prefix, t( __( '%s text', 'sgs-blocks' ) ) ) ] }
				{ ...shared }
			/>
		</>
	);
}

export default function ButtonsPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };

	return (
		<Section title={ __( 'Buttons', 'sgs-blocks' ) } attrs={ BUTTONS_ATTRS } setAttributes={ setAttributes }>
			<ButtonFields prefix="seeAll" name={ __( 'See all reviews button', 'sgs-blocks' ) } { ...shared } />
			<ButtonFields prefix="writeReview" name={ __( 'Write a review button', 'sgs-blocks' ) } { ...shared } />
		</Section>
	);
}
