/**
 * "Look" extension for WooCommerce's category chips and sort control.
 *
 * Adds settings to `woocommerce/product-filter-chips` (the chips of a category, attribute or brand filter),
 * `woocommerce/catalog-sorting` (the "Sort by" select) and `woocommerce/product-results-count` (the "Showing all 5
 * results" line) ONLY. Every default is empty or off, which changes
 * nothing; set values are painted on the frontend by includes/product-filter-look.php as scoped rules.
 *
 * Chips: `sgsChipFontWeight`, `sgsChipFontSize`, `sgsChipBorderWidth`, `sgsChipRadius`, `sgsChipPadding`, `sgsChipMinHeight`, `sgsChipPaintButtons` (print the colours picked on the block onto
 * the chip buttons, resting and chosen), and a count pill (`sgsChipCountPill`, `sgsChipCountBackground`,
 * `sgsChipCountColour`, `sgsChipCountRadius`).
 * One at a time (`sgsChipSingle`): choosing a chip clears the filter's other chosen chips.
 * Chosen chip (`sgsChipSelectedShadow`, `sgsChipSelectedShadowColour`, `sgsChipSelectedOffsetX`, `sgsChipSelectedOffsetY`) and the All chip's count (`sgsChipAllCount`).
 * Sort: `sgsSortBackground`, `sgsSortBorderColour`, `sgsSortBorderWidth`, `sgsSortBorderRadius`, `sgsSortFontWeight`, `sgsSortFontFamily`,
 * `sgsSortHeight`, `sgsSortPaddingInline`, `sgsSortShadow` (+ `sgsSortShadowColour`), the hover fill and border colour
 * (`sgsSortHoverBackground`, `sgsSortHoverBorderColour`) and the keyboard-focus border colour (`sgsSortFocusBorderColour`).
 * Results count: `sgsCountFontSize`, `sgsCountFontWeight`.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import SgsLengthControl from '../../components/SgsLengthControl';
import SgsBoxControl from '../../components/SgsBoxControl';
import ShadowControl from '../../components/ShadowControl';
import { resolveShadowPreviewComposed } from '../../utils';
import { flattenPresetSetting } from '../../utils/presetSettings';
import DesignTokenPicker, {
	resolveColourToken,
} from '../../components/DesignTokenPicker';
import './product-filter-look.scss';

const CHIPS_BLOCK = 'woocommerce/product-filter-chips';
const SORT_BLOCK = 'woocommerce/catalog-sorting';
const COUNT_BLOCK = 'woocommerce/product-results-count';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

const OFFSET_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

const WEIGHT_OPTIONS = [
	{ value: '', label: __( 'Default', 'sgs-blocks' ) },
	{ value: '400', label: __( 'Regular (400)', 'sgs-blocks' ) },
	{ value: '500', label: __( 'Medium (500)', 'sgs-blocks' ) },
	{ value: '600', label: __( 'Semi-bold (600)', 'sgs-blocks' ) },
	{ value: '700', label: __( 'Bold (700)', 'sgs-blocks' ) },
	{ value: '800', label: __( 'Extra bold (800)', 'sgs-blocks' ) },
];

/**
 * A padding box as one CSS shorthand for the editor preview (an unset side is 0), or '' when no side is set.
 *
 * @param {Object} box The {top,right,bottom,left} box.
 * @return {string} The shorthand, or ''.
 */
const boxShorthand = ( box ) => {
	const sides = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) =>
		box && 'object' === typeof box ? String( box[ side ] || '' ) : ''
	);
	return sides.some( Boolean )
		? sides.map( ( side ) => side || '0' ).join( ' ' )
		: '';
};

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsFilterLookRegistered ) {
	window.__sgsFilterLookRegistered = true;

	addFilter(
		'blocks.registerBlockType',
		'sgs/product-filter-look/attributes',
		( settings, name ) => {
			if ( CHIPS_BLOCK === name ) {
				return {
					...settings,
					attributes: {
						...settings.attributes,
						sgsChipFontWeight: { type: 'string', default: '' },
						sgsChipFontSize: { type: 'string', default: '' },
						sgsChipBorderWidth: { type: 'string', default: '' },
						sgsChipRadius: { type: 'string', default: '' },
						sgsChipPadding: { type: 'object', default: {} },
						sgsChipMinHeight: { type: 'string', default: '' },
						sgsChipPaintButtons: {
							type: 'boolean',
							default: false,
						},
						sgsChipCountPill: { type: 'boolean', default: false },
						sgsChipCountBackground: { type: 'string', default: '' },
						sgsChipCountColour: { type: 'string', default: '' },
						sgsChipCountRadius: { type: 'string', default: '' },
						sgsChipCountSize: { type: 'string', default: '' },
						sgsChipCountFontSize: { type: 'string', default: '' },
						sgsChipAllLabel: { type: 'string', default: '' },
						sgsChipAllCount: { type: 'boolean', default: false },
						sgsChipSelectedShadow: { type: 'string', default: '' },
						sgsChipSelectedShadowColour: {
							type: 'string',
							default: '',
						},
						sgsChipSelectedOffsetX: { type: 'string', default: '' },
						sgsChipSelectedOffsetY: { type: 'string', default: '' },
						sgsChipStartTerm: { type: 'string', default: '' },
						sgsChipSingle: { type: 'boolean', default: false },
					},
				};
			}
			if ( SORT_BLOCK === name ) {
				return {
					...settings,
					attributes: {
						...settings.attributes,
						sgsSortBackground: { type: 'string', default: '' },
						sgsSortBorderColour: { type: 'string', default: '' },
						sgsSortBorderWidth: { type: 'string', default: '' },
						sgsSortBorderRadius: { type: 'string', default: '' },
						sgsSortFontWeight: { type: 'string', default: '' },
						sgsSortFontFamily: { type: 'string', default: '' },
						sgsSortHeight: { type: 'string', default: '' },
						sgsSortPaddingInline: { type: 'string', default: '' },
						sgsSortShadow: { type: 'string', default: '' },
						sgsSortShadowColour: { type: 'string', default: '' },
						sgsSortHoverBackground: { type: 'string', default: '' },
						sgsSortHoverBorderColour: {
							type: 'string',
							default: '',
						},
						sgsSortFocusBorderColour: {
							type: 'string',
							default: '',
						},
					},
				};
			}
			if ( COUNT_BLOCK === name ) {
				return {
					...settings,
					attributes: {
						...settings.attributes,
						sgsCountFontSize: { type: 'string', default: '' },
						sgsCountFontWeight: { type: 'string', default: '' },
					},
				};
			}
			return settings;
		}
	);

	const colourControl = ( label, attributes, setAttributes, key, help ) => (
		<DesignTokenPicker
			linked
			clearable
			label={ label }
			help={ help }
			states={ [
				{
					key: 'normal',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes[ key ] || '',
					onChange: ( picked ) =>
						setAttributes( { [ key ]: picked || '' } ),
					linked: true,
				},
			] }
		/>
	);

	const weightControl = ( label, attributes, setAttributes, key ) => (
		<SelectControl
			label={ label }
			value={ attributes[ key ] || '' }
			options={ WEIGHT_OPTIONS }
			onChange={ ( val ) => setAttributes( { [ key ]: val } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	const withFilterLookControls = createHigherOrderComponent(
		( BlockEdit ) => ( props ) => {
			const { name, attributes, setAttributes } = props;
			const [ fontFamilies ] = useSettings( 'typography.fontFamilies' );
			if (
				CHIPS_BLOCK !== name &&
				SORT_BLOCK !== name &&
				COUNT_BLOCK !== name
			) {
				return <BlockEdit { ...props } />;
			}
			// The theme's fonts, stored by slug so the setting follows the client's theme.
			const fontOptions = flattenPresetSetting( fontFamilies )
				.filter( ( family ) => family && family.slug )
				.map( ( family ) => ( {
					value: family.slug,
					label: family.name || family.slug,
				} ) );
			const empty = __(
				'Leave empty to keep the default.',
				'sgs-blocks'
			);
			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls group="styles">
						{ CHIPS_BLOCK === name && (
							<PanelBody
								title={ __( 'Chip look', 'sgs-blocks' ) }
								initialOpen={ false }
							>
								{ weightControl(
									__( 'Chip font weight', 'sgs-blocks' ),
									attributes,
									setAttributes,
									'sgsChipFontWeight'
								) }
								<SgsLengthControl
									scale="font-size"
									label={ __(
										'Chip text size',
										'sgs-blocks'
									) }
									value={ attributes.sgsChipFontSize || '' }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipFontSize: val || '',
										} )
									}
									help={ empty }
								/>
								<SgsLengthControl
									scale="spacing"
									label={ __(
										'Chip corner radius',
										'sgs-blocks'
									) }
									value={ attributes.sgsChipRadius || '' }
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipRadius: val || '',
										} )
									}
									help={ __(
										'A radius of half the chip height or more draws a pill. Leave empty to keep the default.',
										'sgs-blocks'
									) }
								/>
								<SgsBoxControl
									label={ __( 'Chip padding', 'sgs-blocks' ) }
									values={
										attributes.sgsChipPadding &&
										'object' ===
											typeof attributes.sgsChipPadding
											? attributes.sgsChipPadding
											: {}
									}
									units={ LENGTH_UNITS }
									onChange={ ( next ) =>
										setAttributes( {
											sgsChipPadding: next || {},
										} )
									}
								/>
								<SgsLengthControl
									scale="spacing"
									label={ __(
										'Chip border width',
										'sgs-blocks'
									) }
									value={
										attributes.sgsChipBorderWidth || ''
									}
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipBorderWidth: val || '',
										} )
									}
									help={ empty }
								/>
								<SgsLengthControl
									scale="spacing"
									label={ __(
										'Chip least height',
										'sgs-blocks'
									) }
									value={ attributes.sgsChipMinHeight || '' }
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipMinHeight: val || '',
										} )
									}
									help={ __(
										'Empty sizes a chip to its content.',
										'sgs-blocks'
									) }
								/>
								<ToggleControl
									label={ __(
										'Paint the chip colours onto the buttons',
										'sgs-blocks'
									) }
									help={ __(
										'Prints this block’s chip, border and chosen-chip colours directly on each chip button. Off keeps the theme’s chip look.',
										'sgs-blocks'
									) }
									checked={
										!! attributes.sgsChipPaintButtons
									}
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipPaintButtons: !! val,
										} )
									}
									__nextHasNoMarginBottom
								/>
								<ToggleControl
									label={ __(
										'Show the count as a pill',
										'sgs-blocks'
									) }
									help={ __(
										'Needs “Display product counts” on the filter.',
										'sgs-blocks'
									) }
									checked={ !! attributes.sgsChipCountPill }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipCountPill: !! val,
										} )
									}
									__nextHasNoMarginBottom
								/>
								{ !! attributes.sgsChipCountPill && (
									<>
										{ colourControl(
											__(
												'Count pill fill',
												'sgs-blocks'
											),
											attributes,
											setAttributes,
											'sgsChipCountBackground',
											empty
										) }
										{ colourControl(
											__(
												'Count pill text colour',
												'sgs-blocks'
											),
											attributes,
											setAttributes,
											'sgsChipCountColour',
											empty
										) }
										<SgsLengthControl
											scale="spacing"
											label={ __(
												'Count pill corner radius',
												'sgs-blocks'
											) }
											value={
												attributes.sgsChipCountRadius ||
												''
											}
											units={ LENGTH_UNITS }
											onChange={ ( val ) =>
												setAttributes( {
													sgsChipCountRadius:
														val || '',
												} )
											}
											help={ __(
												'Empty makes a full pill.',
												'sgs-blocks'
											) }
										/>
										<SgsLengthControl
											scale="spacing"
											label={ __(
												'Count pill size',
												'sgs-blocks'
											) }
											value={
												attributes.sgsChipCountSize ||
												''
											}
											units={ LENGTH_UNITS }
											onChange={ ( val ) =>
												setAttributes( {
													sgsChipCountSize: val || '',
												} )
											}
											help={ __(
												'Sets the pill’s height and least width. Empty sizes it to the number.',
												'sgs-blocks'
											) }
										/>
										<SgsLengthControl
											scale="font-size"
											label={ __(
												'Count pill text size',
												'sgs-blocks'
											) }
											value={
												attributes.sgsChipCountFontSize ||
												''
											}
											onChange={ ( val ) =>
												setAttributes( {
													sgsChipCountFontSize:
														val || '',
												} )
											}
											help={ empty }
										/>
									</>
								) }
								<ShadowControl
									label={ __(
										'Chosen chip shadow',
										'sgs-blocks'
									) }
									attributes={ attributes }
									setAttributes={ setAttributes }
									attrNames={ {
										base: 'sgsChipSelectedShadow',
										colour: 'sgsChipSelectedShadowColour',
									} }
								/>
								<SgsLengthControl
									scale="spacing"
									presets={ false }
									label={ __(
										'Chosen chip shift (across)',
										'sgs-blocks'
									) }
									value={
										attributes.sgsChipSelectedOffsetX || ''
									}
									units={ OFFSET_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipSelectedOffsetX: val || '',
										} )
									}
									help={ __(
										'Moves the chosen chip sideways. Negative moves it left.',
										'sgs-blocks'
									) }
								/>
								<SgsLengthControl
									scale="spacing"
									presets={ false }
									label={ __(
										'Chosen chip shift (down)',
										'sgs-blocks'
									) }
									value={
										attributes.sgsChipSelectedOffsetY || ''
									}
									units={ OFFSET_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipSelectedOffsetY: val || '',
										} )
									}
									help={ __(
										'Moves the chosen chip up or down. Negative moves it up.',
										'sgs-blocks'
									) }
								/>
								<TextControl
									label={ __(
										'“All” chip label',
										'sgs-blocks'
									) }
									value={ attributes.sgsChipAllLabel || '' }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipAllLabel: val || '',
										} )
									}
									help={ __(
										'Adds a first chip that clears this filter. Leave empty for none.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								{ !! attributes.sgsChipAllLabel && (
									<ToggleControl
										label={ __(
											'Show a product count on the “All” chip',
											'sgs-blocks'
										) }
										help={ __(
											'The number of different products in the shop, each counted once. Follows the count pill setting above.',
											'sgs-blocks'
										) }
										checked={
											!! attributes.sgsChipAllCount
										}
										onChange={ ( val ) =>
											setAttributes( {
												sgsChipAllCount: !! val,
											} )
										}
										__nextHasNoMarginBottom
									/>
								) }
								<TextControl
									label={ __(
										'Start with this term',
										'sgs-blocks'
									) }
									value={ attributes.sgsChipStartTerm || '' }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipStartTerm: val || '',
										} )
									}
									help={ __(
										'The term’s slug (for example just-had-a-baby). A page opened with no filter chosen is sent once to the same page with this term chosen, so the address can be shared. Leave empty to open unfiltered.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<ToggleControl
									label={ __(
										'Choose one at a time',
										'sgs-blocks'
									) }
									help={ __(
										'Choosing a chip clears the filter’s other chosen chips, so a visitor picks one category at a time. Off lets a visitor choose several.',
										'sgs-blocks'
									) }
									checked={ !! attributes.sgsChipSingle }
									onChange={ ( val ) =>
										setAttributes( {
											sgsChipSingle: !! val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							</PanelBody>
						) }
						{ SORT_BLOCK === name && (
							<PanelBody
								title={ __(
									'Sort control look',
									'sgs-blocks'
								) }
								initialOpen={ false }
							>
								{ colourControl(
									__( 'Fill', 'sgs-blocks' ),
									attributes,
									setAttributes,
									'sgsSortBackground',
									empty
								) }
								{ colourControl(
									__( 'Border colour', 'sgs-blocks' ),
									attributes,
									setAttributes,
									'sgsSortBorderColour',
									empty
								) }
								<SgsLengthControl
									scale="spacing"
									label={ __( 'Border width', 'sgs-blocks' ) }
									value={
										attributes.sgsSortBorderWidth || ''
									}
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsSortBorderWidth: val || '',
										} )
									}
									help={ empty }
								/>
								<SgsLengthControl
									scale="spacing"
									label={ __(
										'Corner radius',
										'sgs-blocks'
									) }
									value={
										attributes.sgsSortBorderRadius || ''
									}
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsSortBorderRadius: val || '',
										} )
									}
									help={ empty }
								/>
								{ weightControl(
									__( 'Font weight', 'sgs-blocks' ),
									attributes,
									setAttributes,
									'sgsSortFontWeight'
								) }
								<SelectControl
									label={ __( 'Font', 'sgs-blocks' ) }
									value={ attributes.sgsSortFontFamily || '' }
									options={ [
										{
											value: '',
											label: __(
												'Default',
												'sgs-blocks'
											),
										},
										...fontOptions,
									] }
									onChange={ ( val ) =>
										setAttributes( {
											sgsSortFontFamily: val || '',
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<SgsLengthControl
									scale="spacing"
									label={ __( 'Height', 'sgs-blocks' ) }
									value={ attributes.sgsSortHeight || '' }
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsSortHeight: val || '',
										} )
									}
									help={ empty }
								/>
								<SgsLengthControl
									scale="spacing"
									label={ __(
										'Space inside, left and right',
										'sgs-blocks'
									) }
									value={
										attributes.sgsSortPaddingInline || ''
									}
									units={ LENGTH_UNITS }
									onChange={ ( val ) =>
										setAttributes( {
											sgsSortPaddingInline: val || '',
										} )
									}
									help={ empty }
								/>
								<ShadowControl
									label={ __( 'Shadow', 'sgs-blocks' ) }
									attributes={ attributes }
									setAttributes={ setAttributes }
									attrNames={ {
										base: 'sgsSortShadow',
										colour: 'sgsSortShadowColour',
									} }
								/>
								{ colourControl(
									__( 'Fill on hover', 'sgs-blocks' ),
									attributes,
									setAttributes,
									'sgsSortHoverBackground',
									empty
								) }
								{ colourControl(
									__(
										'Border colour on hover',
										'sgs-blocks'
									),
									attributes,
									setAttributes,
									'sgsSortHoverBorderColour',
									empty
								) }
								{ colourControl(
									__(
										'Border colour with keyboard focus',
										'sgs-blocks'
									),
									attributes,
									setAttributes,
									'sgsSortFocusBorderColour',
									empty
								) }
							</PanelBody>
						) }
						{ COUNT_BLOCK === name && (
							<PanelBody
								title={ __( 'Count look', 'sgs-blocks' ) }
								initialOpen={ false }
							>
								<SgsLengthControl
									scale="font-size"
									label={ __( 'Text size', 'sgs-blocks' ) }
									value={ attributes.sgsCountFontSize || '' }
									onChange={ ( val ) =>
										setAttributes( {
											sgsCountFontSize: val || '',
										} )
									}
									help={ empty }
								/>
								{ weightControl(
									__( 'Font weight', 'sgs-blocks' ),
									attributes,
									setAttributes,
									'sgsCountFontWeight'
								) }
							</PanelBody>
						) }
					</InspectorControls>
				</>
			);
		},
		'withFilterLookControls'
	);

	addFilter(
		'editor.BlockEdit',
		'sgs/product-filter-look/controls',
		withFilterLookControls
	);

	/**
	 * Editor preview: each set setting becomes a custom property plus a modifier class on the block wrapper
	 * (custom properties only: Spec 32 forbids inline declarations), read by product-filter-look.scss.
	 */
	const withFilterLookPreview = createHigherOrderComponent(
		( BlockListBlock ) => ( props ) => {
			const [ palette ] = useSettings( 'color.palette' );
			const { attributes, name, clientId } = props;
			const startTerm =
				CHIPS_BLOCK === name && attributes
					? String( attributes.sgsChipStartTerm || '' )
					: '';
			// The start term shows as the chosen chip on the canvas: the chip whose text slugifies to it is marked
			// (the stylesheet paints the mark with the chosen-chip colours). The canvas may be an iframe.
			useEffect( () => {
				const roots = [
					document,
					...Array.from( document.querySelectorAll( 'iframe' ) )
						.map( ( f ) => f.contentDocument )
						.filter( Boolean ),
				];
				roots.forEach( ( doc ) => {
					const block = doc.getElementById( `block-${ clientId }` );
					if ( ! block ) {
						return;
					}
					block
						.querySelectorAll(
							'.wc-block-product-filter-chips__item'
						)
						.forEach( ( chip ) => {
							const slug = (
								chip.getAttribute( 'value' ) ||
								chip.textContent ||
								''
							)
								.trim()
								.toLowerCase()
								.replace( /[^a-z0-9]+/g, '-' )
								.replace( /^-|-$/g, '' );
							if ( startTerm && slug === startTerm ) {
								chip.setAttribute(
									'data-sgs-start-term',
									'true'
								);
							} else {
								chip.removeAttribute( 'data-sgs-start-term' );
							}
						} );
				} );
			} );
			if (
				( CHIPS_BLOCK !== name &&
					SORT_BLOCK !== name &&
					COUNT_BLOCK !== name ) ||
				! attributes
			) {
				return <BlockListBlock { ...props } />;
			}
			const colour = ( ...values ) => {
				const raw = values.find( Boolean );
				return raw ? resolveColourToken( raw, palette ) : '';
			};
			let rows;
			if ( CHIPS_BLOCK === name ) {
				const paint = true === attributes.sgsChipPaintButtons;
				const pill = true === attributes.sgsChipCountPill;
				rows = [
					[ 'chip-weight', attributes.sgsChipFontWeight ],
					[ 'chip-font-size', attributes.sgsChipFontSize ],
					[ 'chip-border-width', attributes.sgsChipBorderWidth ],
					[ 'chip-radius', attributes.sgsChipRadius ],
					[
						'chip-padding',
						boxShorthand( attributes.sgsChipPadding ),
					],
					[ 'chip-min-height', attributes.sgsChipMinHeight ],
					[
						'chip-fill',
						paint &&
							colour(
								attributes.customChipBackground,
								attributes.chipBackground
							),
					],
					[
						'chip-edge',
						paint &&
							colour(
								attributes.customChipBorder,
								attributes.chipBorder
							),
					],
					[
						'chip-text',
						paint &&
							colour(
								attributes.customChipText,
								attributes.chipText
							),
					],
					[
						'chip-chosen-fill',
						paint &&
							colour(
								attributes.customSelectedChipBackground,
								attributes.selectedChipBackground
							),
					],
					[
						'chip-chosen-edge',
						paint &&
							colour(
								attributes.customSelectedChipBorder,
								attributes.selectedChipBorder
							),
					],
					[
						'chip-chosen-text',
						paint &&
							colour(
								attributes.customSelectedChipText,
								attributes.selectedChipText
							),
					],
					[ 'count-pill', pill && 'on' ],
					[
						'count-fill',
						pill && colour( attributes.sgsChipCountBackground ),
					],
					[
						'count-text',
						pill && colour( attributes.sgsChipCountColour ),
					],
					[ 'count-size', pill && attributes.sgsChipCountSize ],
					[
						'count-font-size',
						pill && attributes.sgsChipCountFontSize,
					],
					[ 'all', attributes.sgsChipAllLabel && 'on' ],
					[
						'chip-chosen-shadow',
						resolveShadowPreviewComposed(
							attributes.sgsChipSelectedShadow,
							attributes.sgsChipSelectedShadowColour
						),
					],
					[
						'chip-chosen-shift',
						( attributes.sgsChipSelectedOffsetX ||
							attributes.sgsChipSelectedOffsetY ) &&
							`${ attributes.sgsChipSelectedOffsetX || '0' } ${
								attributes.sgsChipSelectedOffsetY || '0'
							}`,
					],
				];
			} else if ( COUNT_BLOCK === name ) {
				rows = [
					[ 'count-line-font-size', attributes.sgsCountFontSize ],
					[ 'count-line-weight', attributes.sgsCountFontWeight ],
				];
			} else {
				rows = [
					[ 'sort-fill', colour( attributes.sgsSortBackground ) ],
					[ 'sort-border-width', attributes.sgsSortBorderWidth ],
					[ 'sort-edge', colour( attributes.sgsSortBorderColour ) ],
					[ 'sort-radius', attributes.sgsSortBorderRadius ],
					[ 'sort-weight', attributes.sgsSortFontWeight ],
					[
						'sort-font',
						attributes.sgsSortFontFamily &&
							`var(--wp--preset--font-family--${ attributes.sgsSortFontFamily })`,
					],
					[ 'sort-height', attributes.sgsSortHeight ],
					[ 'sort-padding-inline', attributes.sgsSortPaddingInline ],
					[
						'sort-shadow',
						resolveShadowPreviewComposed(
							attributes.sgsSortShadow,
							attributes.sgsSortShadowColour
						),
					],
				];
			}
			const style = {};
			const classes = [];
			rows.forEach( ( [ key, value ] ) => {
				if ( value ) {
					classes.push( `sgs-filter-look-preview--${ key }` );
					style[ `--sgs-fl-${ key }` ] = value;
				}
			} );
			if ( CHIPS_BLOCK === name && attributes.sgsChipAllLabel ) {
				style[ '--sgs-fl-all-label' ] = JSON.stringify(
					String( attributes.sgsChipAllLabel ) +
						( attributes.sgsChipAllCount ? ' (n)' : '' )
				);
			}
			if ( CHIPS_BLOCK === name && attributes.sgsChipCountRadius ) {
				style[ '--sgs-fl-count-radius' ] =
					attributes.sgsChipCountRadius;
			}
			if ( ! classes.length ) {
				return <BlockListBlock { ...props } />;
			}
			const wrapperProps = {
				...( props.wrapperProps || {} ),
				className: [ props.wrapperProps?.className, ...classes ]
					.filter( Boolean )
					.join( ' ' ),
				style: { ...( props.wrapperProps?.style || {} ), ...style },
			};
			return (
				<BlockListBlock { ...props } wrapperProps={ wrapperProps } />
			);
		},
		'withFilterLookPreview'
	);

	addFilter(
		'editor.BlockListBlock',
		'sgs/product-filter-look/preview',
		withFilterLookPreview
	);
} // end guard: window.__sgsFilterLookRegistered
