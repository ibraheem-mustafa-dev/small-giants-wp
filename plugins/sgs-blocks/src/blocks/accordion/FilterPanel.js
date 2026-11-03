/**
 * Inspector panel for sgs/accordion's filter (search box, topic chips, live count, empty message).
 *
 * The filter is a mode: while "Show search and filters" is off, none of its other controls show; turning it on reveals
 * them all. Every field has a reset and shows its changed dot (ToolsPanel).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, TextareaControl, ToggleControl } from '@wordpress/components';
import { DesignTokenPicker, SgsLengthControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

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
		<ToolsPanelItem
			label={ label }
			hasValue={ () => JSON.stringify( attributes[ attribute ] ?? fallback ) !== JSON.stringify( fallback ) }
			onDeselect={ () => setAttributes( { [ attribute ]: fallback } ) }
			isShownByDefault
		>
			{ children }
		</ToolsPanelItem>
	);
}

function ColourField( { label, attribute, attributes, setAttributes } ) {
	return (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => '' !== ( attributes[ attribute ] ?? '' ) }
			onDeselect={ () => setAttributes( { [ attribute ]: '' } ) }
			isShownByDefault
		>
			<DesignTokenPicker
				label={ label }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: attributes[ attribute ] ?? '',
						onChange: ( val ) => setAttributes( { [ attribute ]: val ?? '' } ),
					},
				] }
			/>
		</ToolsPanelItem>
	);
}

export default function FilterPanel( { attributes, setAttributes } ) {
	const { filterEnabled, filterSearch, filterChips } = attributes;
	const link = attributes.filterEmptyLink && 'object' === typeof attributes.filterEmptyLink ? attributes.filterEmptyLink : {};
	const shared = { attributes, setAttributes };
	const resetAll = () =>
		setAttributes( {
			...FILTER_DEFAULTS,
			filterChipColour: '',
			filterChipBackground: '',
			filterChipBorderColour: '',
			filterChipRadius: '',
			filterChipColourPressed: '',
			filterChipBackgroundPressed: '',
			filterCountColour: '',
		} );

	return (
		<PanelBody title={ __( 'Search & filters', 'sgs-blocks' ) } initialOpen={ false }>
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
				<ToolsPanel label={ __( 'Filter settings', 'sgs-blocks' ) } resetAll={ resetAll }>
					<Field label={ __( 'Search box', 'sgs-blocks' ) } attribute="filterSearch" { ...shared }>
						<ToggleControl
							label={ __( 'Show the search box', 'sgs-blocks' ) }
							checked={ false !== filterSearch }
							onChange={ ( val ) => setAttributes( { filterSearch: val } ) }
							__nextHasNoMarginBottom
						/>
					</Field>
					{ false !== filterSearch && (
						<>
							<Field label={ __( 'Search label', 'sgs-blocks' ) } attribute="filterSearchLabel" { ...shared }>
								<TextControl
									label={ __( 'Search label (read by screen readers)', 'sgs-blocks' ) }
									value={ attributes.filterSearchLabel ?? '' }
									onChange={ ( val ) => setAttributes( { filterSearchLabel: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<Field label={ __( 'Search placeholder', 'sgs-blocks' ) } attribute="filterSearchPlaceholder" { ...shared }>
								<TextControl
									label={ __( 'Search placeholder', 'sgs-blocks' ) }
									value={ attributes.filterSearchPlaceholder ?? '' }
									onChange={ ( val ) => setAttributes( { filterSearchPlaceholder: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
						</>
					) }
					<Field label={ __( 'Topic chips', 'sgs-blocks' ) } attribute="filterChips" { ...shared }>
						<ToggleControl
							label={ __( 'Show topic chips', 'sgs-blocks' ) }
							checked={ false !== filterChips }
							onChange={ ( val ) => setAttributes( { filterChips: val } ) }
							__nextHasNoMarginBottom
						/>
					</Field>
					{ false !== filterChips && (
						<>
							<Field label={ __( 'Chip group label', 'sgs-blocks' ) } attribute="filterChipsLabel" { ...shared }>
								<TextControl
									label={ __( 'Chip group label (read by screen readers)', 'sgs-blocks' ) }
									value={ attributes.filterChipsLabel ?? '' }
									onChange={ ( val ) => setAttributes( { filterChipsLabel: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<Field label={ __( 'All chip label', 'sgs-blocks' ) } attribute="filterAllLabel" { ...shared }>
								<TextControl
									label={ __( 'All chip label', 'sgs-blocks' ) }
									value={ attributes.filterAllLabel ?? '' }
									onChange={ ( val ) => setAttributes( { filterAllLabel: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</Field>
							<ColourField label={ __( 'Chip text colour', 'sgs-blocks' ) } attribute="filterChipColour" { ...shared } />
							<ColourField label={ __( 'Chip background', 'sgs-blocks' ) } attribute="filterChipBackground" { ...shared } />
							<ColourField label={ __( 'Chip border colour', 'sgs-blocks' ) } attribute="filterChipBorderColour" { ...shared } />
							<ColourField label={ __( 'Selected chip text colour', 'sgs-blocks' ) } attribute="filterChipColourPressed" { ...shared } />
							<ColourField label={ __( 'Selected chip background', 'sgs-blocks' ) } attribute="filterChipBackgroundPressed" { ...shared } />
							<ToolsPanelItem
								label={ __( 'Chip corner radius', 'sgs-blocks' ) }
								hasValue={ () => '' !== ( attributes.filterChipRadius ?? '' ) }
								onDeselect={ () => setAttributes( { filterChipRadius: '' } ) }
								isShownByDefault
							>
								<SgsLengthControl
									presets
									label={ __( 'Chip corner radius', 'sgs-blocks' ) }
									value={ attributes.filterChipRadius ?? '' }
									onChange={ ( val ) => setAttributes( { filterChipRadius: val } ) }
								/>
							</ToolsPanelItem>
						</>
					) }
					<Field label={ __( 'Count wording', 'sgs-blocks' ) } attribute="filterCountTemplate" { ...shared }>
						<TextControl
							label={ __( 'Count wording', 'sgs-blocks' ) }
							help={ __( '{count} becomes the number shown.', 'sgs-blocks' ) }
							value={ attributes.filterCountTemplate ?? '' }
							onChange={ ( val ) => setAttributes( { filterCountTemplate: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</Field>
					<Field label={ __( 'Count wording for one', 'sgs-blocks' ) } attribute="filterCountSingular" { ...shared }>
						<TextControl
							label={ __( 'Count wording for one', 'sgs-blocks' ) }
							value={ attributes.filterCountSingular ?? '' }
							onChange={ ( val ) => setAttributes( { filterCountSingular: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</Field>
					<ColourField label={ __( 'Count colour', 'sgs-blocks' ) } attribute="filterCountColour" { ...shared } />
					<Field label={ __( 'Nothing-found message', 'sgs-blocks' ) } attribute="filterEmptyMessage" { ...shared }>
						<TextareaControl
							label={ __( 'Nothing-found message', 'sgs-blocks' ) }
							help={ __( 'Shown when nothing matches. Empty shows a neutral message.', 'sgs-blocks' ) }
							value={ attributes.filterEmptyMessage ?? '' }
							onChange={ ( val ) => setAttributes( { filterEmptyMessage: val } ) }
							__nextHasNoMarginBottom
						/>
					</Field>
					<Field label={ __( 'Nothing-found link', 'sgs-blocks' ) } attribute="filterEmptyLink" { ...shared }>
						<TextControl
							label={ __( 'Link text', 'sgs-blocks' ) }
							value={ link.label ?? '' }
							onChange={ ( val ) => setAttributes( { filterEmptyLink: { ...link, label: val } } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<TextControl
							label={ __( 'Link address', 'sgs-blocks' ) }
							type="url"
							value={ link.url ?? '' }
							onChange={ ( val ) => setAttributes( { filterEmptyLink: { ...link, url: val } } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</Field>
				</ToolsPanel>
			) }
		</PanelBody>
	);
}
