/**
 * Google Reviews — "Header" section: the row above the reviews (logo, source caption, rating
 * figure, stars, review count).
 *
 * The header's colours (source caption, rating figure, review count, empty star) live in the
 * shared Colour panel (ColourPanel.js). The divider colour sits here beside its thickness, because
 * a colour paired with a non-colour sibling stays with that sibling.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';
import { DesignTokenPicker, SgsLengthControl, BOX_UNITS } from '../../../components';
import { Section, Row, typographyAttrs } from './panel-kit';
import { TierBox, TierLength, TypographyRow, typoTarget } from './panel-fields';

export const HEADER_TYPOGRAPHY_PREFIXES = [ 'sourceLabel', 'score', 'count', 'mapsLink', 'breakdownRow' ];

/** Every attribute this section owns (drives "Reset all"). */
export const HEADER_ATTRS = [
	'logoPosition',
	'sourceLabel',
	'headerGap',
	'headerPadding',
	'headerDividerWidth',
	'headerDividerColour',
	'aggregateStarSize',
	...typographyAttrs( HEADER_TYPOGRAPHY_PREFIXES ),
];

export default function HeaderPanel( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };

	return (
		<Section title={ __( 'Header', 'sgs-blocks' ) } attrs={ HEADER_ATTRS } setAttributes={ setAttributes }>
			<Row label={ __( 'Google logo position', 'sgs-blocks' ) } attrs={ [ 'logoPosition' ] } { ...shared }>
				<SelectControl
					label={ __( 'Google logo position', 'sgs-blocks' ) }
					value={ attributes.logoPosition }
					options={ [
						{ label: __( 'Before the caption (left)', 'sgs-blocks' ), value: 'leading' },
						{ label: __( 'At the end of the row (right)', 'sgs-blocks' ), value: 'trailing' },
					] }
					onChange={ ( value ) => setAttributes( { logoPosition: value } ) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row label={ __( 'Source caption', 'sgs-blocks' ) } attrs={ [ 'sourceLabel' ] } { ...shared }>
				<TextControl
					label={ __( 'Source caption', 'sgs-blocks' ) }
					value={ attributes.sourceLabel }
					onChange={ ( value ) => setAttributes( { sourceLabel: value } ) }
					help={ __( 'Small text beside the logo, for example "Google Reviews". Leave empty for none.', 'sgs-blocks' ) }
					__next40pxDefaultSize
				/>
			</Row>
			<Row label={ __( 'Star size (rating row)', 'sgs-blocks' ) } attrs={ [ 'aggregateStarSize' ] } { ...shared }>
				<TierLength label={ __( 'Star size in the rating row', 'sgs-blocks' ) } attr="aggregateStarSize" { ...shared } />
			</Row>
			<Row label={ __( 'Header gap', 'sgs-blocks' ) } attrs={ [ 'headerGap' ] } { ...shared }>
				<TierLength label={ __( 'Space between header items', 'sgs-blocks' ) } attr="headerGap" { ...shared } />
			</Row>
			<Row label={ __( 'Header padding', 'sgs-blocks' ) } attrs={ [ 'headerPadding' ] } { ...shared }>
				<TierBox label={ __( 'Header padding', 'sgs-blocks' ) } attr="headerPadding" { ...shared } />
			</Row>
			<Row
				label={ __( 'Header divider', 'sgs-blocks' ) }
				attrs={ [ 'headerDividerWidth', 'headerDividerColour' ] }
				{ ...shared }
			>
				<SgsLengthControl
					presets={ false }
					label={ __( 'Divider line thickness', 'sgs-blocks' ) }
					units={ BOX_UNITS }
					value={ attributes.headerDividerWidth || '' }
					onChange={ ( val ) => setAttributes( { headerDividerWidth: val || '' } ) }
					help={ __( 'The line between the header and the reviews. Leave empty for none.', 'sgs-blocks' ) }
				/>
				<DesignTokenPicker
					label={ __( 'Divider line colour', 'sgs-blocks' ) }
					states={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: attributes.headerDividerColour,
							onChange: ( val ) => setAttributes( { headerDividerColour: val ?? '' } ),
							linked: true,
						},
					] }
				/>
			</Row>
			<TypographyRow
				label={ __( 'Header typography', 'sgs-blocks' ) }
				targets={ [
					typoTarget( 'sourceLabel', __( 'Source caption', 'sgs-blocks' ) ),
					typoTarget( 'score', __( 'Rating figure', 'sgs-blocks' ) ),
					typoTarget( 'count', __( 'Review count', 'sgs-blocks' ) ),
					typoTarget( 'mapsLink', __( 'View on Google Maps link', 'sgs-blocks' ) ),
					typoTarget( 'breakdownRow', __( 'Rating breakdown rows', 'sgs-blocks' ) ),
				] }
				{ ...shared }
			/>
		</Section>
	);
}
