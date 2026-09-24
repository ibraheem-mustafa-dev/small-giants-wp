/**
 * ScrimControls: the shared inspector controls for a viewport scrim, the
 * see-through layer that dims the page behind an open drawer, dialog or panel
 * (Wave 3C U-2, family M-14). Written once for every block that declares
 * `supports.sgs.scrim`; the matching render side is `includes/helpers-scrim.php`.
 *
 * Two pieces, because colour rows belong in the block's own SgsColourPanel:
 *   - `scrimColourRow( { attributes, setAttributes } )` returns the fillRow for
 *     `scrimColour` + `scrimColourGradient`, to add to that panel's `rows`;
 *   - `<ScrimControls>` returns ToolsPanelItems for the per-device strength and
 *     blur, to mount inside the block's own ToolsPanel (add `scrimOpacity` and
 *     `scrimBlur` to its resetAll).
 *
 * The canvas does not preview the scrim: a closed drawer or panel has none
 * (the same as the modal block's backdrop).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';
import ResponsiveControl from './ResponsiveControl';
import SgsLengthControl from './SgsLengthControl';
import fillRow from './colour-variants/fillRow';
import { ToolsPanelItem } from './primitives';

/** True when a tier object holds at least one set value. */
const hasTierValue = ( obj ) =>
	!! obj &&
	[ 'desktop', 'tablet', 'mobile' ].some(
		( tier ) => obj[ tier ] !== undefined && obj[ tier ] !== null && obj[ tier ] !== ''
	);

/**
 * Copy of a tier object with one tier set, or removed when the value is empty.
 *
 * @param {Object} obj   Current tier object.
 * @param {string} tier  desktop | tablet | mobile.
 * @param {*}      value New value; undefined or '' clears the tier.
 * @return {Object} The new tier object.
 */
const withTier = ( obj, tier, value ) => {
	const next = { ...( obj || {} ) };
	if ( value === undefined || value === null || value === '' ) {
		delete next[ tier ];
	} else {
		next[ tier ] = value;
	}
	return next;
};

/**
 * The scrim's colour row for the block's SgsColourPanel.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} A fillRow descriptor.
 */
export function scrimColourRow( { attributes, setAttributes } ) {
	return fillRow( {
		key: 'scrim',
		label: __( 'Backdrop colour', 'sgs-blocks' ),
		attrs: { base: 'scrimColour', gradient: 'scrimColourGradient' },
		attributes,
		setAttributes,
	} );
}

/**
 * Per-device strength and blur for the scrim.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} ToolsPanelItems.
 */
export default function ScrimControls( { attributes, setAttributes } ) {
	const { scrimOpacity, scrimBlur } = attributes;

	return (
		<>
			<ToolsPanelItem
				label={ __( 'Backdrop strength', 'sgs-blocks' ) }
				hasValue={ () => hasTierValue( scrimOpacity ) }
				onDeselect={ () => setAttributes( { scrimOpacity: {} } ) }
			>
				<ResponsiveControl label={ __( 'Backdrop strength', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<RangeControl
							label={ __( 'Backdrop strength', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'How strongly the page behind is dimmed while this is open: 0 is none, 1 is solid. Set a different strength per device with the device toggle.',
								'sgs-blocks'
							) }
							value={
								typeof scrimOpacity?.[ breakpoint ] === 'number'
									? scrimOpacity[ breakpoint ]
									: undefined
							}
							min={ 0 }
							max={ 1 }
							step={ 0.05 }
							allowReset
							onChange={ ( value ) =>
								setAttributes( {
									scrimOpacity: withTier(
										scrimOpacity,
										breakpoint,
										typeof value === 'number' ? value : undefined
									),
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</ResponsiveControl>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={ __( 'Backdrop blur', 'sgs-blocks' ) }
				hasValue={ () => hasTierValue( scrimBlur ) }
				onDeselect={ () => setAttributes( { scrimBlur: {} } ) }
			>
				<ResponsiveControl label={ __( 'Backdrop blur', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<SgsLengthControl
							label={ __( 'Backdrop blur', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'Blurs the page behind while this is open. Blur costs the most on phones, so you can leave mobile empty. Leave empty for none.',
								'sgs-blocks'
							) }
							value={ scrimBlur?.[ breakpoint ] || '' }
							onChange={ ( value ) =>
								setAttributes( {
									scrimBlur: withTier( scrimBlur, breakpoint, value || '' ),
								} )
							}
							units={ [ { value: 'px', label: 'px' } ] }
							presets={ false }
						/>
					) }
				</ResponsiveControl>
			</ToolsPanelItem>
		</>
	);
}
