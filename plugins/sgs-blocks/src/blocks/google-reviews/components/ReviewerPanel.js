/**
 * Google Reviews — "Reviewer" section: who wrote each review (avatar, name, details, date, the
 * stars on the card and the small Google mark on the card).
 *
 * Reviewer colours (name, details, date, avatar initials) live in the shared Colour panel
 * (ColourPanel.js).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
import { ResponsiveBorderRadiusControl } from '../../../components';
import { Section, Row, typographyAttrs } from './panel-kit';
import { TierLength, TypographyRow, typoTarget } from './panel-fields';

export const REVIEWER_TYPOGRAPHY_PREFIXES = [ 'author', 'meta', 'date', 'avatar' ];

/** Every attribute this section owns (drives "Reset all"). */
export const REVIEWER_ATTRS = [
	'avatarSize',
	'avatarBorderRadius',
	'starSize',
	'showCardLogo',
	'cardLogoSize',
	...typographyAttrs( REVIEWER_TYPOGRAPHY_PREFIXES ),
];

export default function ReviewerPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	const radius = attributes.avatarBorderRadius;

	return (
		<Section title={ __( 'Reviewer', 'sgs-blocks' ) } attrs={ REVIEWER_ATTRS } setAttributes={ setAttributes }>
			<Row label={ __( 'Avatar size', 'sgs-blocks' ) } attrs={ [ 'avatarSize' ] } { ...shared }>
				<TierLength label={ __( 'Avatar size', 'sgs-blocks' ) } attr="avatarSize" { ...shared } />
			</Row>
			<Row label={ __( 'Avatar corners', 'sgs-blocks' ) } attrs={ [ 'avatarBorderRadius' ] } { ...shared }>
				<ResponsiveBorderRadiusControl
					label={ __( 'Avatar corners', 'sgs-blocks' ) }
					values={ {
						base: radius?.desktop ?? {},
						tablet: radius?.tablet ?? {},
						mobile: radius?.mobile ?? {},
					} }
					onChange={ ( tier, next ) => {
						const key = 'base' === tier ? 'desktop' : tier;
						setAttributes( { avatarBorderRadius: { ...radius, [ key ]: next } } );
					} }
				/>
			</Row>
			<Row label={ __( 'Star size (review cards)', 'sgs-blocks' ) } attrs={ [ 'starSize' ] } { ...shared }>
				<TierLength label={ __( 'Star size on each review card', 'sgs-blocks' ) } attr="starSize" { ...shared } />
			</Row>
			<Row
				label={ __( 'Google mark on each card', 'sgs-blocks' ) }
				attrs={ [ 'showCardLogo', 'cardLogoSize' ] }
				{ ...shared }
			>
				<ToggleControl
					label={ __( 'Show a small Google mark on each card', 'sgs-blocks' ) }
					checked={ !! attributes.showCardLogo }
					onChange={ ( value ) => setAttributes( { showCardLogo: value } ) }
				/>
				{ attributes.showCardLogo && (
					<TierLength label={ __( 'Card Google mark size', 'sgs-blocks' ) } attr="cardLogoSize" { ...shared } />
				) }
			</Row>
			<TypographyRow
				label={ __( 'Reviewer typography', 'sgs-blocks' ) }
				targets={ [
					typoTarget( 'author', __( 'Reviewer name', 'sgs-blocks' ) ),
					typoTarget( 'meta', __( 'Reviewer details', 'sgs-blocks' ) ),
					typoTarget( 'date', __( 'Review date', 'sgs-blocks' ) ),
					typoTarget( 'avatar', __( 'Avatar initials', 'sgs-blocks' ) ),
				] }
				{ ...shared }
			/>
		</Section>
	);
}
