import { __ } from '@wordpress/i18n';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { SgsBorderControl, ShadowControl } from '../../components';
import { TierBox } from './card-panel-controls';
import { TierLengthItem } from './card-device-controls';

/** Attributes the year ring controls own; the Year ring panel resets them. */
const DATE_RING_ATTRS = {
	dateRingBackgroundColour: '',
	dateRingBackgroundColourGradient: '',
	dateRingPadding: {},
	dateRingBorderRadius: {},
	dateRingBorderWidth: {},
	dateRingBorderStyle: 'solid',
	dateRingBorderColour: '',
	dateRingBorderColourGradient: '',
	dateRingShadow: '',
	dateRingShadowColour: '',
	dateRingSize: {},
};

const hasKeys = ( value ) =>
	!! value && 'object' === typeof value && Object.keys( value ).length > 0;

/**
 * The colour row for the year ring background, appended to the timeline's colour panel while the timeline is
 * horizontal.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute writer.
 * @return {Array} Rows for `SgsColourPanel`.
 */
export function dateRingColourRows( attributes, setAttributes ) {
	if ( 'horizontal' !== attributes.orientation ) {
		return [];
	}
	return [
		{
			key: 'dateRingBackground',
			label: __( 'Year ring background', 'sgs-blocks' ),
			gradientCapable: true,
			states: [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes.dateRingBackgroundColour,
					onChange: ( val ) =>
						setAttributes( {
							dateRingBackgroundColour: val ?? '',
						} ),
					linked: true,
					gradientValue: attributes.dateRingBackgroundColourGradient,
					onGradientChange: ( val ) =>
						setAttributes( {
							dateRingBackgroundColourGradient: val ?? '',
						} ),
				},
			],
		},
	];
}

/**
 * The year ring of a horizontal timeline: the box drawn around each entry's date (size, padding, border, corners,
 * shadow).
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute writer.
 * @return {JSX.Element|null} The panel, or null for a vertical timeline.
 */
export default function DateRingControls( { attributes, setAttributes } ) {
	if ( 'horizontal' !== attributes.orientation ) {
		return null;
	}
	const radius = attributes.dateRingBorderRadius || {};
	const contrastAgainst =
		attributes.dateRingBackgroundColour &&
		! attributes.dateRingBackgroundColourGradient
			? attributes.dateRingBackgroundColour
			: '';
	return (
		<ToolsPanel
			label={ __( 'Year ring', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( DATE_RING_ATTRS ) }
		>
			<TierLengthItem
				name="dateRingSize"
				label={ __( 'Ring size', 'sgs-blocks' ) }
				help={ __(
					'Makes the year a square marker of this width and height, centred on the connecting line, with the dot hidden (768px and up). Use a corner radius of 50% for a circle. Empty leaves the year where it is, sized by its text.',
					'sgs-blocks'
				) }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
			<ToolsPanelItem
				label={ __( 'Ring padding', 'sgs-blocks' ) }
				hasValue={ () => hasKeys( attributes.dateRingPadding ) }
				onDeselect={ () => setAttributes( { dateRingPadding: {} } ) }
			>
				<TierBox
					label={ __( 'Ring padding', 'sgs-blocks' ) }
					value={ attributes.dateRingPadding }
					onChange={ ( obj ) =>
						setAttributes( { dateRingPadding: obj } )
					}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={ __( 'Ring border and corners', 'sgs-blocks' ) }
				hasValue={ () =>
					hasKeys( attributes.dateRingBorderWidth ) ||
					!! attributes.dateRingBorderColour ||
					!! attributes.dateRingBorderColourGradient ||
					hasKeys( radius )
				}
				onDeselect={ () =>
					setAttributes( {
						dateRingBorderWidth: {},
						dateRingBorderStyle: 'solid',
						dateRingBorderColour: '',
						dateRingBorderColourGradient: '',
						dateRingBorderRadius: {},
					} )
				}
				isShownByDefault
			>
				<SgsBorderControl
					widthValues={ attributes.dateRingBorderWidth ?? {} }
					onWidthChange={ ( next ) =>
						setAttributes( { dateRingBorderWidth: next } )
					}
					widthPresets={ [ '10', '20', '30' ] }
					styleValue={ attributes.dateRingBorderStyle }
					onStyleChange={ ( val ) =>
						setAttributes( { dateRingBorderStyle: val } )
					}
					colourLabel={ __( 'Ring border colour', 'sgs-blocks' ) }
					colourValue={ attributes.dateRingBorderColour }
					onColourChange={ ( val ) =>
						setAttributes( { dateRingBorderColour: val ?? '' } )
					}
					colourGradientValue={
						attributes.dateRingBorderColourGradient
					}
					onColourGradientChange={ ( val ) =>
						setAttributes( {
							dateRingBorderColourGradient: val ?? '',
						} )
					}
					colourLinked
					contrastAgainst={ contrastAgainst }
					radiusLabel={ __( 'Ring corner radius', 'sgs-blocks' ) }
					radiusValues={ {
						base: radius.desktop ?? {},
						tablet: radius.tablet ?? {},
						mobile: radius.mobile ?? {},
					} }
					onRadiusChange={ ( tier, next ) =>
						setAttributes( {
							dateRingBorderRadius: {
								...radius,
								[ 'base' === tier ? 'desktop' : tier ]: next,
							},
						} )
					}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				label={ __( 'Ring shadow', 'sgs-blocks' ) }
				hasValue={ () => !! attributes.dateRingShadow }
				onDeselect={ () =>
					setAttributes( {
						dateRingShadow: '',
						dateRingShadowColour: '',
					} )
				}
			>
				<ShadowControl
					label={ __( 'Ring shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ {
						base: 'dateRingShadow',
						colour: 'dateRingShadowColour',
					} }
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
