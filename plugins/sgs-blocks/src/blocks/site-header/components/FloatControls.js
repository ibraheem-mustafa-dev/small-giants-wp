/**
 * sgs/site-header — floating ("pill") header controls + canvas preview.
 *
 * Kept in its own file because `edit.js` is already far past the project's
 * 250-line ceiling; this mounts from there in two lines and owns everything
 * else about the feature on the editor side.
 *
 * NO new device switcher (inspector-scan rule 25): the on/off state rides the
 * existing `ResponsiveTriStateControl` and the inset rides the existing
 * `ResponsiveOverride` + `SgsBoxControl` tier-of-boxes pair, exactly as the
 * block's padding and band padding already do.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl, Notice } from '@wordpress/components';
import {
	ResponsiveTriStateControl,
	ResponsiveOverride,
	SgsBoxControl,
	SgsLengthControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../../components';
import { ToolsPanelItem } from '../../../components/primitives';
import { INSET_SIDES, isFloatOnAtAnyTier } from '../float-preview';

/** Breakpoint choices for the collapse opt-out — the project's device tiers. */
const COLLAPSE_BREAKPOINTS = [
	{ value: 768, label: __( 'Below tablet width (768px)', 'sgs-blocks' ) },
	{ value: 1024, label: __( 'Below desktop width (1024px)', 'sgs-blocks' ) },
];

/**
 * The four ToolsPanelItems, returned as a fragment so `edit.js` can drop them
 * straight into its existing "Header behaviour" ToolsPanel.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The controls.
 */
export default function FloatControls( { attributes, setAttributes } ) {
	const {
		headerFloat,
		headerFloatInset,
		headerFloatCollapse,
		backdropBlur,
	} = attributes;
	const isFloating = isFloatOnAtAnyTier( headerFloat );
	const collapse = headerFloatCollapse || {};

	return (
		<>
			<ToolsPanelItem
				label={ __( 'Float as a pill', 'sgs-blocks' ) }
				hasValue={ () => Object.keys( headerFloat || {} ).length > 0 }
				onDeselect={ () => setAttributes( { headerFloat: {} } ) }
			>
				<ResponsiveTriStateControl
					label={ __( 'Float as a pill', 'sgs-blocks' ) }
					help={ __(
						'Detaches the header from the edges of the screen so it reads as a card hovering over the page, with a small gap at the top and down each side. It stays pinned while the visitor scrolls, so turning this on also makes the header sticky.',
						'sgs-blocks'
					) }
					value={ headerFloat }
					onChange={ ( value ) => setAttributes( { headerFloat: value } ) }
					defaultValue="off"
				/>
			</ToolsPanelItem>

			{ /* Everything below only has something to decide once the header
			     actually floats — the same conditional-render pattern Shrink and
			     Contrast safety already use on this panel. */ }
			{ isFloating && (
				<ToolsPanelItem
					label={ __( 'Gap around the pill', 'sgs-blocks' ) }
					hasValue={ () => Object.keys( headerFloatInset || {} ).length > 0 }
					onDeselect={ () => setAttributes( { headerFloatInset: {} } ) }
				>
					<ResponsiveOverride
						value={ headerFloatInset }
						onChange={ ( obj ) => setAttributes( { headerFloatInset: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Gap around the pill', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								sides={ INSET_SIDES }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<Notice status="info" isDismissible={ false }>
						<p style={ { margin: 0 } }>
							{ __(
								'Use rem or em rather than px, so the gap grows with the visitor’s own text size. The pill’s width comes from “Header width”, and its rounded corners and shadow from the Border and Shadow panels — there is no separate set of controls for them here.',
								'sgs-blocks'
							) }
						</p>
					</Notice>
				</ToolsPanelItem>
			) }

			{ isFloating && (
				<ToolsPanelItem
					label={ __( 'Background blur', 'sgs-blocks' ) }
					hasValue={ () => !! backdropBlur }
					onDeselect={ () => setAttributes( { backdropBlur: '' } ) }
				>
					<SgsLengthControl
						label={ __( 'Background blur', 'sgs-blocks' ) }
						help={ __(
							'Blurs whatever sits behind the header, the way frosted glass does. This is what makes a see-through pill readable without a shadow or a border. Leave empty for none.',
							'sgs-blocks'
						) }
						value={ backdropBlur || '' }
						onChange={ ( value ) => setAttributes( { backdropBlur: value || '' } ) }
						units={ [ { value: 'px', label: 'px' } ] }
						presets={ false }
					/>
				</ToolsPanelItem>
			) }

			{ /* ONE toggle and ONE number, deliberately — not three per-device
			     switches. The pill is meant to persist on a phone; this is the
			     single opt-out for a client who wants a plain bar there. */ }
			{ isFloating && (
				<ToolsPanelItem
					label={ __( 'Full width on small screens', 'sgs-blocks' ) }
					hasValue={ () => !! collapse.enabled }
					onDeselect={ () =>
						setAttributes( {
							headerFloatCollapse: { enabled: false, breakpoint: collapse.breakpoint || 768 },
						} )
					}
				>
					<ToggleControl
						label={ __( 'Full width on small screens', 'sgs-blocks' ) }
						help={ __(
							'Off by default: the pill keeps its gap and rounded corners on a phone. Turn this on to drop the gap and go edge-to-edge below the width you pick.',
							'sgs-blocks'
						) }
						checked={ !! collapse.enabled }
						onChange={ ( enabled ) =>
							setAttributes( {
								headerFloatCollapse: {
									enabled,
									breakpoint: collapse.breakpoint || 768,
								},
							} )
						}
						__nextHasNoMarginBottom
					/>
					{ collapse.enabled && (
						<SelectControl
							label={ __( 'Go full width below', 'sgs-blocks' ) }
							value={ String( collapse.breakpoint || 768 ) }
							options={ COLLAPSE_BREAKPOINTS.map( ( option ) => ( {
								value: String( option.value ),
								label: option.label,
							} ) ) }
							onChange={ ( value ) =>
								setAttributes( {
									headerFloatCollapse: {
										enabled: true,
										breakpoint: parseInt( value, 10 ) || 768,
									},
								} )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) }
				</ToolsPanelItem>
			) }
		</>
	);
}
