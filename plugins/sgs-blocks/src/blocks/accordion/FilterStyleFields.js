/**
 * Look settings of sgs/accordion's filter bar: the chip row (wrapping, alignment, padding), the chips' text size and
 * selected-chip shadow and shift, and the search box (fill, height, padding, text size, shadow, leading icon).
 *
 * Rendered inside FilterPanel's ToolsPanel; every field is a ToolsPanelItem that resets to the block.json default
 * (empty). Each setting is read by includes/accordion-filter.php and mirrored in FilterCanvasBar.js.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import { alignLeft, alignCenter, alignRight } from '@wordpress/icons';
import {
	BOX_UNITS,
	FlexWrapControl,
	IconPicker,
	ResponsiveLengthControl,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	SgsLengthControl,
	ShadowControl,
	TextAlignTierControl,
	normaliseResponsiveBox,
} from '../../components';
import { FontFamilyControl, ToolsPanelItem } from '../../components/primitives';
import { ToggleControl } from '@wordpress/components';
import {
	fontFamilyPickerValue,
	fontFamilyStoredValue,
	flattenPresetSetting,
} from '../../utils';
import { SgsResetItem } from '../../components/SgsResetPanel';

const OFFSET_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

const JUSTIFY_OPTIONS = [
	{
		label: __( 'Chips at the start', 'sgs-blocks' ),
		value: 'left',
		icon: alignLeft,
	},
	{
		label: __( 'Chips centred', 'sgs-blocks' ),
		value: 'center',
		icon: alignCenter,
	},
	{
		label: __( 'Chips at the end', 'sgs-blocks' ),
		value: 'right',
		icon: alignRight,
	},
];

const SEARCH_ALIGN_OPTIONS = [
	{
		label: __( 'Search box at the start', 'sgs-blocks' ),
		value: 'left',
		icon: alignLeft,
	},
	{
		label: __( 'Search box centred', 'sgs-blocks' ),
		value: 'center',
		icon: alignCenter,
	},
	{
		label: __( 'Search box at the end', 'sgs-blocks' ),
		value: 'right',
		icon: alignRight,
	},
];

/** True when a tier object carries any value. */
const hasTier = ( value ) =>
	!! value && 'object' === typeof value && Object.keys( value ).length > 0;

function TierItem( { label, attribute, attributes, setAttributes, children } ) {
	return (
		<SgsResetItem
			hasValue={ () => hasTier( attributes[ attribute ] ) }
			onDeselect={ () => setAttributes( { [ attribute ]: {} } ) }
		>
			{ children }
		</SgsResetItem>
	);
}

function ShadowItem( { label, base, colour, attributes, setAttributes } ) {
	return (
		<SgsResetItem
			hasValue={ () => !! attributes[ base ] || !! attributes[ colour ] }
			onDeselect={ () =>
				setAttributes( { [ base ]: '', [ colour ]: '' } )
			}
		>
			<ShadowControl
				label={ label }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base, colour } }
			/>
		</SgsResetItem>
	);
}

function BoxItem( { label, attribute, attributes, setAttributes } ) {
	return (
		<TierItem
			label={ label }
			attribute={ attribute }
			attributes={ attributes }
			setAttributes={ setAttributes }
		>
			<ResponsiveOverride
				value={ attributes[ attribute ] }
				onChange={ ( obj ) => setAttributes( { [ attribute ]: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl
						label={ label }
						values={
							ownValue && 'object' === typeof ownValue
								? ownValue
								: {}
						}
						units={ BOX_UNITS }
						presets
						onChange={ ( next ) =>
							setOwnValue( normaliseResponsiveBox( next ) )
						}
					/>
				) }
			</ResponsiveOverride>
		</TierItem>
	);
}

/** A font family picker that stores a theme preset slug (or a raw list), like the shared typography controls. */
function FontFamilyItem( { label, attribute, attributes, setAttributes } ) {
	const [ familiesRaw ] = useSettings( 'typography.fontFamilies' );
	const families = flattenPresetSetting( familiesRaw );
	return (
		<SgsResetItem
			hasValue={ () => !! attributes[ attribute ] }
			onDeselect={ () => setAttributes( { [ attribute ]: '' } ) }
		>
			<FontFamilyControl
				fontFamilies={ families }
				value={ fontFamilyPickerValue(
					attributes[ attribute ],
					families
				) }
				onChange={ ( val ) =>
					setAttributes( {
						[ attribute ]:
							fontFamilyStoredValue(
								val,
								families,
								attributes[ attribute ]
							) || '',
					} )
				}
			/>
		</SgsResetItem>
	);
}

/** Chip row layout, the chips' text size and the selected chip's shadow and shift. */
export function ChipLookFields( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	return (
		<>
			<TierItem
				label={ __( 'Chip row wrapping', 'sgs-blocks' ) }
				attribute="filterChipsWrap"
				{ ...shared }
			>
				<ResponsiveOverride
					label={ __( 'Chip row wrapping', 'sgs-blocks' ) }
					value={ attributes.filterChipsWrap }
					onChange={ ( obj ) =>
						setAttributes( { filterChipsWrap: obj } )
					}
				>
					{ ( { ownValue, setOwnValue } ) => (
						<FlexWrapControl
							label={ __( 'Chip row wrapping', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __(
								'One row keeps every chip on a single line and scrolls the row sideways. Wrap lets chips drop onto further rows.',
								'sgs-blocks'
							) }
							value={ ownValue }
							onChange={ setOwnValue }
						/>
					) }
				</ResponsiveOverride>
			</TierItem>
			<TierItem
				label={ __( 'Chip row alignment', 'sgs-blocks' ) }
				attribute="filterChipsJustify"
				{ ...shared }
			>
				<TextAlignTierControl
					label={ __( 'Chip row alignment', 'sgs-blocks' ) }
					value={ attributes.filterChipsJustify }
					onChange={ ( obj ) =>
						setAttributes( { filterChipsJustify: obj } )
					}
					options={ JUSTIFY_OPTIONS }
				/>
			</TierItem>
			<BoxItem
				label={ __( 'Chip row padding', 'sgs-blocks' ) }
				attribute="filterChipsPadding"
				{ ...shared }
			/>
			<TierItem
				label={ __( 'Chip text size', 'sgs-blocks' ) }
				attribute="filterChipFontSize"
				{ ...shared }
			>
				<ResponsiveLengthControl
					scale="font-size"
					label={ __( 'Chip text size', 'sgs-blocks' ) }
					value={ attributes.filterChipFontSize }
					onChange={ ( obj ) =>
						setAttributes( { filterChipFontSize: obj } )
					}
				/>
			</TierItem>
			<FontFamilyItem
				label={ __( 'Chip font', 'sgs-blocks' ) }
				attribute="filterChipFontFamily"
				{ ...shared }
			/>
			<ShadowItem
				label={ __( 'Chip shadow', 'sgs-blocks' ) }
				base="filterChipShadow"
				colour="filterChipShadowColour"
				{ ...shared }
			/>
			<ShadowItem
				label={ __( 'Selected chip shadow', 'sgs-blocks' ) }
				base="filterChipSelectedShadow"
				colour="filterChipSelectedShadowColour"
				{ ...shared }
			/>
			<SgsResetItem
				hasValue={ () => !! attributes.filterChipSelectedOffsetX }
				onDeselect={ () =>
					setAttributes( { filterChipSelectedOffsetX: '' } )
				}
			>
				<SgsLengthControl
					scale="spacing"
					label={ __( 'Selected chip shift (across)', 'sgs-blocks' ) }
					help={ __(
						'Moves the selected chip sideways. Negative moves it left.',
						'sgs-blocks'
					) }
					value={ attributes.filterChipSelectedOffsetX || '' }
					units={ OFFSET_UNITS }
					presets={ false }
					onChange={ ( val ) =>
						setAttributes( {
							filterChipSelectedOffsetX: val ?? '',
						} )
					}
				/>
			</SgsResetItem>
			<SgsResetItem
				hasValue={ () => !! attributes.filterChipSelectedOffsetY }
				onDeselect={ () =>
					setAttributes( { filterChipSelectedOffsetY: '' } )
				}
			>
				<SgsLengthControl
					scale="spacing"
					label={ __( 'Selected chip shift (down)', 'sgs-blocks' ) }
					help={ __(
						'Moves the selected chip up or down. Negative moves it up.',
						'sgs-blocks'
					) }
					value={ attributes.filterChipSelectedOffsetY || '' }
					units={ OFFSET_UNITS }
					presets={ false }
					onChange={ ( val ) =>
						setAttributes( {
							filterChipSelectedOffsetY: val ?? '',
						} )
					}
				/>
			</SgsResetItem>
		</>
	);
}

/** Search box height, padding, text size, shadow and leading icon (its fill and icon colour are ColourFields in FilterPanel). */
export function SearchLookFields( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	return (
		<>
			<TierItem
				label={ __( 'Search box maximum width', 'sgs-blocks' ) }
				attribute="filterSearchMaxWidth"
				{ ...shared }
			>
				<ResponsiveLengthControl
					scale="spacing"
					label={ __( 'Search box maximum width', 'sgs-blocks' ) }
					value={ attributes.filterSearchMaxWidth }
					onChange={ ( obj ) =>
						setAttributes( { filterSearchMaxWidth: obj } )
					}
				/>
			</TierItem>
			<TierItem
				label={ __( 'Search box alignment', 'sgs-blocks' ) }
				attribute="filterSearchAlign"
				{ ...shared }
			>
				<TextAlignTierControl
					label={ __( 'Search box alignment', 'sgs-blocks' ) }
					value={ attributes.filterSearchAlign }
					onChange={ ( obj ) =>
						setAttributes( { filterSearchAlign: obj } )
					}
					options={ SEARCH_ALIGN_OPTIONS }
				/>
			</TierItem>
			<TierItem
				label={ __( 'Search box height', 'sgs-blocks' ) }
				attribute="filterSearchHeight"
				{ ...shared }
			>
				<ResponsiveLengthControl
					scale="spacing"
					label={ __( 'Search box height', 'sgs-blocks' ) }
					value={ attributes.filterSearchHeight }
					onChange={ ( obj ) =>
						setAttributes( { filterSearchHeight: obj } )
					}
				/>
			</TierItem>
			<BoxItem
				label={ __( 'Search box padding', 'sgs-blocks' ) }
				attribute="filterSearchPadding"
				{ ...shared }
			/>
			<TierItem
				label={ __( 'Search text size', 'sgs-blocks' ) }
				attribute="filterSearchFontSize"
				{ ...shared }
			>
				<ResponsiveLengthControl
					scale="font-size"
					label={ __( 'Search text size', 'sgs-blocks' ) }
					value={ attributes.filterSearchFontSize }
					onChange={ ( obj ) =>
						setAttributes( { filterSearchFontSize: obj } )
					}
				/>
			</TierItem>
			<FontFamilyItem
				label={ __( 'Search text font', 'sgs-blocks' ) }
				attribute="filterSearchFontFamily"
				{ ...shared }
			/>
			<ShadowItem
				label={ __( 'Search box shadow', 'sgs-blocks' ) }
				base="filterSearchShadow"
				colour="filterSearchShadowColour"
				{ ...shared }
			/>
			<SgsResetItem
				hasValue={ () => !! attributes.filterSearchIcon }
				onDeselect={ () => setAttributes( { filterSearchIcon: '' } ) }
			>
				<IconPicker
					label={ __( 'Search icon', 'sgs-blocks' ) }
					sources={ [ 'lucide' ] }
					value={ {
						source: 'lucide',
						name: attributes.filterSearchIcon || '',
					} }
					onChange={ ( { name } ) =>
						setAttributes( { filterSearchIcon: name || '' } )
					}
				/>
			</SgsResetItem>
			{ !! attributes.filterSearchIcon && (
				<SgsResetItem
					hasValue={ () => !! attributes.filterSearchIconSize }
					onDeselect={ () =>
						setAttributes( { filterSearchIconSize: '' } )
					}
				>
					<SgsLengthControl
						scale="spacing"
						presets={ false }
						label={ __( 'Search icon size', 'sgs-blocks' ) }
						value={ attributes.filterSearchIconSize ?? '' }
						onChange={ ( val ) =>
							setAttributes( { filterSearchIconSize: val || '' } )
						}
					/>
				</SgsResetItem>
			) }
			{ !! attributes.filterSearchIcon && (
				<SgsResetItem
					hasValue={ () => !! attributes.filterSearchIconOffset }
					onDeselect={ () =>
						setAttributes( { filterSearchIconOffset: '' } )
					}
				>
					<SgsLengthControl
						scale="spacing"
						presets={ false }
						label={ __( 'Search icon offset', 'sgs-blocks' ) }
						help={ __(
							'Distance from the start edge of the search box to the icon. The text clears the icon by the same distance. Empty = 1rem.',
							'sgs-blocks'
						) }
						value={ attributes.filterSearchIconOffset ?? '' }
						onChange={ ( val ) =>
							setAttributes( {
								filterSearchIconOffset: val || '',
							} )
						}
					/>
				</SgsResetItem>
			) }
		</>
	);
}

/** The band: the bar drawn as a strip with its own padding, bottom line and an optional full-screen-width spread (its fill is a ColourField in FilterPanel). */
export function BandFields( { attributes, setAttributes } ) {
	const shared = { attributes, setAttributes };
	const width =
		attributes.filterBandBorderWidth &&
		'object' === typeof attributes.filterBandBorderWidth
			? attributes.filterBandBorderWidth
			: {};
	return (
		<>
			<BoxItem
				label={ __( 'Band padding', 'sgs-blocks' ) }
				attribute="filterBandPadding"
				{ ...shared }
			/>
			<SgsResetItem
				hasValue={ () =>
					Object.keys( width ).length > 0 ||
					!! attributes.filterBandBorderColour ||
					'solid' !== ( attributes.filterBandBorderStyle || 'solid' )
				}
				onDeselect={ () =>
					setAttributes( {
						filterBandBorderWidth: {},
						filterBandBorderStyle: 'solid',
						filterBandBorderColour: '',
					} )
				}
			>
				<SgsBorderControl
					label={ __( 'Band bottom line', 'sgs-blocks' ) }
					widthValues={ width }
					onWidthChange={ ( next ) =>
						setAttributes( { filterBandBorderWidth: next } )
					}
					styleValue={ attributes.filterBandBorderStyle || 'solid' }
					onStyleChange={ ( val ) =>
						setAttributes( { filterBandBorderStyle: val } )
					}
					colourLabel={ __( 'Band line colour', 'sgs-blocks' ) }
					colourValue={ attributes.filterBandBorderColour }
					onColourChange={ ( val ) =>
						setAttributes( { filterBandBorderColour: val ?? '' } )
					}
					colourLinked
				/>
			</SgsResetItem>
			<SgsResetItem
				hasValue={ () => !! attributes.filterBandFullWidth }
				onDeselect={ () =>
					setAttributes( { filterBandFullWidth: false } )
				}
			>
				<ToggleControl
					label={ __( 'Band full width', 'sgs-blocks' ) }
					help={ __(
						'Spreads the band fill and line to both edges of the screen. The search box and chips stay in the accordion width. The line is solid in this mode.',
						'sgs-blocks'
					) }
					checked={ !! attributes.filterBandFullWidth }
					onChange={ ( val ) =>
						setAttributes( { filterBandFullWidth: val } )
					}
					__nextHasNoMarginBottom
				/>
			</SgsResetItem>
		</>
	);
}
