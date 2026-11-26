/**
 * Inspector panel for sgs/accordion's filter (search box, topic chips, live count, empty message).
 *
 * The filter is a mode: while "Show search and filters" is off, none of its other controls show; turning it on reveals
 * them all. Every field has a reset and shows its changed dot (ToolsPanel).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	LinkPopoverField,
	SgsLengthControl,
} from '../../components';
import { ToolsPanel } from '../../components/primitives';
import { LINK_SOURCES_NO_TOP } from '../../shared/link-source-options';
import {
	BandFields,
	ChipLookFields,
	SearchLookFields,
} from './FilterStyleFields';
import SgsResetPanel, { SgsResetItem } from '../../components/SgsResetPanel';

/** Defaults mirror block.json; the reset of a field writes its default back. */
export const FILTER_DEFAULTS = {
	filterSearch: true,
	filterSearchLabel: 'Search',
	filterSearchPlaceholder: 'Search',
	filterChips: true,
	filterChipsLabel: 'Filter by topic',
	filterAllLabel: 'All',
	filterCountTemplate: '{count} answers',
	filterCountSingular: '{count} answer',
	filterEmptyMessage: '',
	filterEmptyLink: {},
};

function Field( { label, attribute, attributes, setAttributes, children } ) {
	const fallback = FILTER_DEFAULTS[ attribute ];
	return (
		<SgsResetItem
			hasValue={ () =>
				JSON.stringify( attributes[ attribute ] ?? fallback ) !==
				JSON.stringify( fallback )
			}
			onDeselect={ () => setAttributes( { [ attribute ]: fallback } ) }
		>
			{ children }
		</SgsResetItem>
	);
}

function ColourField( { label, attribute, attributes, setAttributes } ) {
	return (
		<SgsResetItem
			hasValue={ () => '' !== ( attributes[ attribute ] ?? '' ) }
			onDeselect={ () => setAttributes( { [ attribute ]: '' } ) }
		>
			<DesignTokenPicker
				label={ label }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: attributes[ attribute ] ?? '',
						onChange: ( val ) =>
							setAttributes( { [ attribute ]: val ?? '' } ),
					},
				] }
			/>
		</SgsResetItem>
	);
}

export default function FilterPanel( { attributes, setAttributes } ) {
	const { filterEnabled, filterSearch, filterChips } = attributes;
	const link =
		attributes.filterEmptyLink &&
		'object' === typeof attributes.filterEmptyLink
			? attributes.filterEmptyLink
			: {};
	const shared = { attributes, setAttributes };
	const resetAll = () =>
		setAttributes( {
			...FILTER_DEFAULTS,
			filterBandBackground: '',
			filterBandPadding: {},
			filterBandBorderWidth: {},
			filterBandBorderStyle: 'solid',
			filterBandBorderColour: '',
			filterBandFullWidth: false,
			filterChipColour: '',
			filterChipBackground: '',
			filterChipBorderColour: '',
			filterChipRadius: '',
			filterChipColourPressed: '',
			filterChipBackgroundPressed: '',
			filterCountColour: '',
			filterChipFontSize: {},
			filterChipFontFamily: '',
			filterSearchFontFamily: '',
			filterSearchIconOffset: '',
			filterChipShadow: '',
			filterChipShadowColour: '',
			filterChipSelectedShadow: '',
			filterChipSelectedShadowColour: '',
			filterChipSelectedOffsetX: '',
			filterChipSelectedOffsetY: '',
			filterChipsWrap: {},
			filterChipsJustify: {},
			filterChipsPadding: {},
			filterSearchBackground: '',
			filterSearchMaxWidth: {},
			filterSearchAlign: {},
			filterSearchHeight: {},
			filterSearchPadding: {},
			filterSearchFontSize: {},
			filterSearchShadow: '',
			filterSearchShadowColour: '',
			filterSearchIcon: '',
			filterSearchIconColour: '',
			filterSearchIconSize: '',
		} );

	return (
		<PanelBody
			title={ __( 'Search & filters', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __( 'Show search and filters', 'sgs-blocks' ) }
				help={ __(
					'Adds a search box and topic chips above the items. Give each item a Category to make the chips.',
					'sgs-blocks'
				) }
				checked={ !! filterEnabled }
				onChange={ ( val ) => setAttributes( { filterEnabled: val } ) }
				__nextHasNoMarginBottom
			/>
			{ filterEnabled && (
				<SgsResetPanel
					title={ __( 'Filter settings', 'sgs-blocks' ) }
					items={ [] }
					resetAll={ resetAll }
					nested
				>
					<ColourField
						label={ __( 'Band fill', 'sgs-blocks' ) }
						attribute="filterBandBackground"
						{ ...shared }
					/>
					<BandFields { ...shared } />
					<Field
						label={ __( 'Search box', 'sgs-blocks' ) }
						attribute="filterSearch"
						{ ...shared }
					>
						<ToggleControl
							label={ __( 'Show the search box', 'sgs-blocks' ) }
							checked={ false !== filterSearch }
							onChange={ ( val ) =>
								setAttributes( { filterSearch: val } )
							}
							__nextHasNoMarginBottom
						/>
					</Field>
					{ false !== filterSearch && (
						<>
							<Field
								label={ __( 'Search label', 'sgs-blocks' ) }
								attribute="filterSearchLabel"
								{ ...shared }
							>
								<TextControl
									label={ __(
										'Search label (read by screen readers)',
										'sgs-blocks'
									) }
									value={ attributes.filterSearchLabel ?? '' }
									onChange={ ( val ) =>
										setAttributes( {
											filterSearchLabel: val,
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<Field
								label={ __(
									'Search placeholder',
									'sgs-blocks'
								) }
								attribute="filterSearchPlaceholder"
								{ ...shared }
							>
								<TextControl
									label={ __(
										'Search placeholder',
										'sgs-blocks'
									) }
									value={
										attributes.filterSearchPlaceholder ?? ''
									}
									onChange={ ( val ) =>
										setAttributes( {
											filterSearchPlaceholder: val,
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<ColourField
								label={ __( 'Search box fill', 'sgs-blocks' ) }
								attribute="filterSearchBackground"
								{ ...shared }
							/>
							<SearchLookFields { ...shared } />
							{ !! attributes.filterSearchIcon && (
								<ColourField
									label={ __(
										'Search icon colour',
										'sgs-blocks'
									) }
									attribute="filterSearchIconColour"
									{ ...shared }
								/>
							) }
						</>
					) }
					<Field
						label={ __( 'Topic chips', 'sgs-blocks' ) }
						attribute="filterChips"
						{ ...shared }
					>
						<ToggleControl
							label={ __( 'Show topic chips', 'sgs-blocks' ) }
							checked={ false !== filterChips }
							onChange={ ( val ) =>
								setAttributes( { filterChips: val } )
							}
							__nextHasNoMarginBottom
						/>
					</Field>
					{ false !== filterChips && (
						<>
							<Field
								label={ __( 'Chip group label', 'sgs-blocks' ) }
								attribute="filterChipsLabel"
								{ ...shared }
							>
								<TextControl
									label={ __(
										'Chip group label (read by screen readers)',
										'sgs-blocks'
									) }
									value={ attributes.filterChipsLabel ?? '' }
									onChange={ ( val ) =>
										setAttributes( {
											filterChipsLabel: val,
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<Field
								label={ __( 'All chip label', 'sgs-blocks' ) }
								attribute="filterAllLabel"
								{ ...shared }
							>
								<TextControl
									label={ __(
										'All chip label',
										'sgs-blocks'
									) }
									value={ attributes.filterAllLabel ?? '' }
									onChange={ ( val ) =>
										setAttributes( { filterAllLabel: val } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<ColourField
								label={ __( 'Chip text colour', 'sgs-blocks' ) }
								attribute="filterChipColour"
								{ ...shared }
							/>
							<ColourField
								label={ __( 'Chip background', 'sgs-blocks' ) }
								attribute="filterChipBackground"
								{ ...shared }
							/>
							<ColourField
								label={ __(
									'Chip border colour',
									'sgs-blocks'
								) }
								attribute="filterChipBorderColour"
								{ ...shared }
							/>
							<ColourField
								label={ __(
									'Selected chip text colour',
									'sgs-blocks'
								) }
								attribute="filterChipColourPressed"
								{ ...shared }
							/>
							<ColourField
								label={ __(
									'Selected chip background',
									'sgs-blocks'
								) }
								attribute="filterChipBackgroundPressed"
								{ ...shared }
							/>
							<ChipLookFields { ...shared } />
							<SgsResetItem
								hasValue={ () =>
									'' !== ( attributes.filterChipRadius ?? '' )
								}
								onDeselect={ () =>
									setAttributes( { filterChipRadius: '' } )
								}
							>
								<SgsLengthControl
									presets
									label={ __(
										'Chip corner radius',
										'sgs-blocks'
									) }
									value={ attributes.filterChipRadius ?? '' }
									onChange={ ( val ) =>
										setAttributes( {
											filterChipRadius: val,
										} )
									}
								/>
							</SgsResetItem>
						</>
					) }
					<Field
						label={ __( 'Count wording', 'sgs-blocks' ) }
						attribute="filterCountTemplate"
						{ ...shared }
					>
						<TextControl
							label={ __( 'Count wording', 'sgs-blocks' ) }
							help={ __(
								'{count} becomes the number shown.',
								'sgs-blocks'
							) }
							value={ attributes.filterCountTemplate ?? '' }
							onChange={ ( val ) =>
								setAttributes( { filterCountTemplate: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</Field>
					<Field
						label={ __( 'Count wording for one', 'sgs-blocks' ) }
						attribute="filterCountSingular"
						{ ...shared }
					>
						<TextControl
							label={ __(
								'Count wording for one',
								'sgs-blocks'
							) }
							value={ attributes.filterCountSingular ?? '' }
							onChange={ ( val ) =>
								setAttributes( { filterCountSingular: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</Field>
					<ColourField
						label={ __( 'Count colour', 'sgs-blocks' ) }
						attribute="filterCountColour"
						{ ...shared }
					/>
					<Field
						label={ __( 'Nothing-found message', 'sgs-blocks' ) }
						attribute="filterEmptyMessage"
						{ ...shared }
					>
						<TextareaControl
							label={ __(
								'Nothing-found message',
								'sgs-blocks'
							) }
							help={ __(
								'Shown when nothing matches. Empty shows a neutral message.',
								'sgs-blocks'
							) }
							value={ attributes.filterEmptyMessage ?? '' }
							onChange={ ( val ) =>
								setAttributes( { filterEmptyMessage: val } )
							}
							__nextHasNoMarginBottom
						/>
					</Field>
					<Field
						label={ __( 'Nothing-found link', 'sgs-blocks' ) }
						attribute="filterEmptyLink"
						{ ...shared }
					>
						<TextControl
							label={ __( 'Link text', 'sgs-blocks' ) }
							value={ link.label ?? '' }
							onChange={ ( val ) =>
								setAttributes( {
									filterEmptyLink: { ...link, label: val },
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<LinkPopoverField
							searchOnly
							label={ __( 'Link address', 'sgs-blocks' ) }
							value={ link.url ?? '' }
							onChange={ ( val, extra ) =>
								setAttributes( {
									filterEmptyLink: {
										...link,
										url: val ?? '',
										...( extra
											? { source: extra.linkSource }
											: {} ),
									},
								} )
							}
							linkSource={ link.source ?? '' }
							linkSources={ LINK_SOURCES_NO_TOP }
						/>
					</Field>
				</SgsResetPanel>
			) }
		</PanelBody>
	);
}
