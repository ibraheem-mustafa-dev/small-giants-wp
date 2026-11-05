import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	ToggleControl,
	SelectControl,
	RangeControl,
	Button,
} from '@wordpress/components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import MediaPicker from '../../components/MediaPicker';
import { IconPicker, IconPreview, SgsColourPanel, fillRow, textRow,
	SgsBorderControl,
	ShadowControl,
	TypographyControls,
	resolveColourToken,
	ResponsiveOverride,
	BOX_UNITS,
	normaliseResponsiveBox,
	SgsBoxControl,
	SgsLengthControl,
	SgsGapControl,
	AlignItemsTierControl,
} from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import {
	resolveResponsiveTier,
	textPaintPreview,
	backgroundPaintPreview,
	sgsBorderPreview,
	typographyPreviewCss,
	usePreviewTier,
	BandWrap,
	wrapperPreview,
	RADIUS_STYLE_KEYS,
	tierBoxShorthand,
	tierLengthPreview,
	tierValueOf,
	resolveShadowPreviewComposed,
} from '../../utils';

import SgsFreeTextField from '../../components/SgsFreeTextField';
import AuthoredText from '../../components/AuthoredText';
// Wrapper declarations that belong to the field root (the border and radius), not to
// the tile grid element the shared wrapper lays out.
const ROOT_BORDER_KEYS = [ 'borderWidth', 'borderStyle', 'borderColor', 'borderImage', ...RADIUS_STYLE_KEYS ];

// A tile's description is one line of copy; the render cuts it at the same length.
const DESCRIPTION_MAX_LENGTH = 140;

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

const TILE_ALIGN_OPTIONS = [
	{ label: __( 'Left / top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right / bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const SELECTED_STYLE_OPTIONS = [
	{ label: __( 'Checkmark', 'sgs-blocks' ), value: 'checkmark' },
	{ label: __( 'Border', 'sgs-blocks' ), value: 'border' },
	{ label: __( 'Background', 'sgs-blocks' ), value: 'background' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		fieldName,
		label,
		helpText,
		required,
		width,
		tiles,
		multiSelect,
		selectedStyle,
		columns,
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
		tileLabelColour,
		tileDescriptionColour,
	} = attributes;

	// Contrast check for border — warn if border fails WCAG contrast against
	// the block's own background. When there's no background set or a gradient
	// is active, skip the check entirely.
	const formFieldTilesContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	// A tile's border is judged against the tile's own fill, falling back to the field's fill behind it.
	const formFieldTilesTileContrastAgainst = attributes.tileBackgroundColour || formFieldTilesContrastAgainst;


	// columns is a TIER OBJECT (Spec 35 pass 4) — this control only ever edits
	// the desktop tier (there is no per-tier UI here); resolve it for both the
	// RangeControl value and the inline grid-template-columns preview, or a
	// raw setAttributes({ columns: val }) would coerce the whole object-typed
	// attr to its block.json default (D563 bug class).
	const previewTier = usePreviewTier();
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const columnsAtTier = resolveResponsiveTier( columns, previewTier )?.value || 3;
	const setColumnsDesktop = ( val ) =>
		setAttributes( { columns: { ...( columns && typeof columns === 'object' ? columns : {} ), desktop: val } } );

	const className = [
		'sgs-form-field',
		'sgs-form-field--tiles',
		`sgs-form-field--${ width }`,
		`sgs-form-field--tiles-style-${ selectedStyle || 'checkmark' }`,
	].join( ' ' );

	// CHECK A finding: textColour/textColourGradient are written by the
	// "Text colour" row above and consumed by render.php on `$sgs_ft_sel`
	// (`.{uid}.sgs-form-field--tiles` — the SAME root element `blockProps`
	// renders onto), but nothing applied them to the canvas. `color` is a
	// naturally-inheriting CSS property, so setting it on this root also
	// covers the tile labels below, which set no colour of their own.
	const [ colourPalette ] = useSettings( 'color.palette' );
	const wrapper = wrapperPreview( attributes, previewTier, colourPalette );
	const tilesStyle = { ...wrapper.style };
	ROOT_BORDER_KEYS.forEach( ( key ) => delete tilesStyle[ key ] );
	if ( ! tilesStyle.gridTemplateColumns && 'flex' !== attributes.layout && 'stack' !== attributes.layout ) {
		tilesStyle.gridTemplateColumns = `repeat(${ columnsAtTier }, 1fr)`;
	}
	const rootStyle = {
		...backgroundPaintPreview( backgroundColour, backgroundColourGradient, colourPalette ),
		...textPaintPreview( textColour, textColourGradient, colourPalette ),
		...sgsBorderPreview( { widthValues: attributes.borderWidth, styleValue: attributes.borderStyle, colourValue: attributes.borderColour, colourGradientValue: attributes.borderColourGradient, radiusValues: attributes.borderRadius }, previewTier, colourPalette ),
	};

	const blockProps = useBlockProps( { className, style: rootStyle } );

	// The tile label and description typography reach the canvas as one scoped rule each (the tiles are
	// array data, painted by this block's own preview below); the colours ride on the spans.
	const tileTextPreviewCss = [
		typographyPreviewCss( attributes, 'tileLabel', `#block-${ clientId } .sgs-form-tile__label`, previewTier ),
		typographyPreviewCss( attributes, 'tileDescription', `#block-${ clientId } .sgs-form-tile__description`, previewTier ),
	].filter( Boolean ).join( '' );
	// Each tile's own surface (background, border, radius, padding, inner gap, alignment) on the canvas. The first
	// tile previews the selected state, so it keeps the stylesheet's selected border.
	const tileSurface = ( selected ) => {
		const style = {
			...backgroundPaintPreview( attributes.tileBackgroundColour, '', colourPalette ),
			...sgsBorderPreview(
				{
					widthValues: attributes.tileBorderWidth,
					styleValue: attributes.tileBorderStyle,
					colourValue: attributes.tileBorderColour,
					radiusValues: attributes.tileRadius,
				},
				previewTier,
				colourPalette,
				{ defaultBorder: true }
			),
		};
		if ( selected ) {
			delete style.borderStyle;
			delete style.borderWidth;
			delete style.borderColor;
			const selectedFill = resolveColourToken( attributes.tileSelectedBackgroundColour, colourPalette );
			if ( selectedFill ) {
				style.backgroundColor = selectedFill;
			}
			const selectedBorder = resolveColourToken( attributes.tileSelectedBorderColour, colourPalette );
			if ( selectedBorder ) {
				style.borderColor = selectedBorder;
			}
			if ( attributes.tileSelectedBorderWidth ) {
				style.borderStyle = style.borderStyle || 'solid';
				style.borderWidth = attributes.tileSelectedBorderWidth;
			}
			const offsetX = attributes.tileSelectedOffset?.x;
			const offsetY = attributes.tileSelectedOffset?.y;
			if ( offsetX || offsetY ) {
				style.transform = `translate(${ offsetX || '0' }, ${ offsetY || '0' })`;
			}
			const selectedShadow = resolveShadowPreviewComposed( attributes.tileSelectedShadow, attributes.tileSelectedShadowColour );
			if ( selectedShadow ) {
				style.boxShadow = selectedShadow;
			}
		}
		const padding = tierBoxShorthand( attributes.tilePadding, previewTier );
		if ( padding ) {
			style.padding = padding;
		}
		const gap = tierLengthPreview( attributes.tileInnerGap, previewTier );
		if ( gap ) {
			style.gap = gap;
		}
		const align = tierValueOf( attributes.tileAlign, previewTier );
		if ( align ) {
			style.alignItems = align;
		}
		return style;
	};
	// The tile(s) named by defaultValue (one value, or a comma list on a multi-select field) show chosen; with no
	// default, or one that matches no tile, the first tile previews the chosen state so its settings stay visible.
	const defaultValues = String( attributes.defaultValue || '' ).split( ',' ).map( ( v ) => v.trim() ).filter( Boolean );
	const defaultedIndexes = tiles
		.map( ( tile, index ) => ( defaultValues.includes( String( tile.value || '' ) ) ? index : -1 ) )
		.filter( ( index ) => index >= 0 )
		.slice( 0, multiSelect ? undefined : 1 );
	const chosenIndexes = defaultedIndexes.length ? defaultedIndexes : [ 0 ];
	const tileLabelPaint = textPaintPreview( tileLabelColour, '', colourPalette );
	const tileDescriptionPaint = textPaintPreview( tileDescriptionColour, '', colourPalette );

	const updateTile = ( index, key, value ) => {
		const newTiles = [ ...tiles ];
		newTiles[ index ] = { ...newTiles[ index ], [ key ]: value };
		setAttributes( { tiles: newTiles } );
	};

	const removeTile = ( index ) => {
		const newTiles = tiles.filter( ( _, i ) => i !== index );
		setAttributes( { tiles: newTiles } );
	};

	const addTile = () => {
		const newTiles = [
			...tiles,
			{
				value: `tile-${ tiles.length + 1 }`,
				label: `Tile ${ tiles.length + 1 }`,
				icon: '',
			},
		];
		setAttributes( { tiles: newTiles } );
	};

	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'tileBackground',
						label: __( 'Tile background colour', 'sgs-blocks' ),
						attrs: { base: 'tileBackgroundColour' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'tileLabel',
						label: __( 'Tile label colour', 'sgs-blocks' ),
						attrs: { base: 'tileLabelColour' },
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'tileSelectedBackground',
						label: __( 'Chosen tile fill', 'sgs-blocks' ),
						attrs: { base: 'tileSelectedBackgroundColour' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'tileSelectedBorder',
						label: __( 'Chosen tile border colour', 'sgs-blocks' ),
						attrs: { base: 'tileSelectedBorderColour' },
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'tileDescription',
						label: __( 'Tile description colour', 'sgs-blocks' ),
						attrs: { base: 'tileDescriptionColour' },
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				{ /* Outer PanelBody removed 2026-08-13 — it duplicated this
				   ToolsPanel's own "Field settings" title with no
				   initialOpen, so the client saw the same words twice for
				   no collapse benefit (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Field settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								fieldName: '',
								label: '',
								helpText: '',
								required: false,
								multiSelect: false,
								columns: { desktop: 3, tablet: 2, mobile: 1 },
								width: 'full',
								selectedStyle: 'checkmark',
								defaultValue: '',
								tileSelectedShadow: '',
								tileSelectedShadowColour: '',
								tileSelectedBorderWidth: '',
								tileSelectedOffset: {},
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Field name', 'sgs-blocks' ) }
							hasValue={ () => !! fieldName }
							onDeselect={ () => setAttributes( { fieldName: '' } ) }
						>
							<TextControl
								label={ __( 'Field name', 'sgs-blocks' ) }
								value={ fieldName }
								onChange={ ( val ) =>
									setAttributes( { fieldName: val } )
								}
								help={ __(
									'Machine name used in submission data',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Label', 'sgs-blocks' ) }
							hasValue={ () => !! label }
							onDeselect={ () => setAttributes( { label: '' } ) }
							isShownByDefault
						>
							<SgsFreeTextField type="rich" noLink
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ label }
								onChange={ ( val ) => setAttributes( { label: val } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Help text', 'sgs-blocks' ) }
							hasValue={ () => !! helpText }
							onDeselect={ () => setAttributes( { helpText: '' } ) }
						>
							<TextControl
								label={ __( 'Help text', 'sgs-blocks' ) }
								value={ helpText }
								onChange={ ( val ) =>
									setAttributes( { helpText: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Required', 'sgs-blocks' ) }
							hasValue={ () => required !== false }
							onDeselect={ () => setAttributes( { required: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Required', 'sgs-blocks' ) }
								checked={ required }
								onChange={ ( val ) =>
									setAttributes( { required: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Allow multiple selection', 'sgs-blocks' ) }
							hasValue={ () => multiSelect !== false }
							onDeselect={ () => setAttributes( { multiSelect: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Allow multiple selection', 'sgs-blocks' ) }
								checked={ multiSelect }
								onChange={ ( val ) =>
									setAttributes( { multiSelect: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Columns', 'sgs-blocks' ) }
							hasValue={ () => columnsDesktop !== 3 }
							onDeselect={ () => setColumnsDesktop( 3 ) }
						>
							<RangeControl
								label={ __( 'Columns', 'sgs-blocks' ) }
								value={ columnsDesktop }
								onChange={ ( val ) =>
									setColumnsDesktop( val )
								}
								min={ 2 }
								max={ 4 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Width', 'sgs-blocks' ) }
							hasValue={ () => width !== 'full' }
							onDeselect={ () => setAttributes( { width: 'full' } ) }
						>
							<SelectControl
								label={ __( 'Width', 'sgs-blocks' ) }
								value={ width }
								options={ WIDTH_OPTIONS }
								onChange={ ( val ) => setAttributes( { width: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Selected tile style', 'sgs-blocks' ) }
							hasValue={ () => selectedStyle !== 'checkmark' }
							onDeselect={ () =>
								setAttributes( { selectedStyle: 'checkmark' } )
							}
						>
							<SelectControl
								label={ __( 'Selected tile style', 'sgs-blocks' ) }
								value={ selectedStyle }
								options={ SELECTED_STYLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { selectedStyle: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Starts chosen', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.defaultValue }
							onDeselect={ () => setAttributes( { defaultValue: '' } ) }
						>
							<TextControl
								label={ __( 'Starts chosen', 'sgs-blocks' ) }
								value={ attributes.defaultValue || '' }
								onChange={ ( val ) => setAttributes( { defaultValue: val } ) }
								help={ __( 'The value of the tile to start chosen. Separate several values with commas on a multi-select field.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Chosen tile border width', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.tileSelectedBorderWidth }
							onDeselect={ () => setAttributes( { tileSelectedBorderWidth: '' } ) }
						>
							<SgsLengthControl
								label={ __( 'Chosen tile border width', 'sgs-blocks' ) }
								value={ attributes.tileSelectedBorderWidth || '' }
								max={ 12 }
								onChange={ ( val ) => setAttributes( { tileSelectedBorderWidth: val || '' } ) }
								help={ __( 'Empty keeps 3px for the checkmark and border styles.', 'sgs-blocks' ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Chosen tile offset', 'sgs-blocks' ) }
							hasValue={ () => !! ( attributes.tileSelectedOffset?.x || attributes.tileSelectedOffset?.y ) }
							onDeselect={ () => setAttributes( { tileSelectedOffset: {} } ) }
						>
							<SgsLengthControl
								label={ __( 'Chosen tile moves right by', 'sgs-blocks' ) }
								value={ attributes.tileSelectedOffset?.x || '' }
								negative
								max={ 40 }
								onChange={ ( val ) => setAttributes( { tileSelectedOffset: { ...attributes.tileSelectedOffset, x: val || '' } } ) }
								help={ __( 'A negative length moves it left.', 'sgs-blocks' ) }
							/>
							<SgsLengthControl
								label={ __( 'Chosen tile moves down by', 'sgs-blocks' ) }
								value={ attributes.tileSelectedOffset?.y || '' }
								negative
								max={ 40 }
								onChange={ ( val ) => setAttributes( { tileSelectedOffset: { ...attributes.tileSelectedOffset, y: val || '' } } ) }
								help={ __( 'A negative length moves it up.', 'sgs-blocks' ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Chosen tile shadow', 'sgs-blocks' ) }
							hasValue={ () => !! attributes.tileSelectedShadow }
							onDeselect={ () => setAttributes( { tileSelectedShadow: '', tileSelectedShadowColour: '' } ) }
						>
							<ShadowControl
								label={ __( 'Chosen tile shadow', 'sgs-blocks' ) }
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ { base: 'tileSelectedShadow', colour: 'tileSelectedShadowColour' } }
							/>
						</ToolsPanelItem>
					</ToolsPanel>

				{ /* Container wrapper (WS-4 mirror) */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
				/>

				<PanelBody
					title={ __( 'Tiles', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ tiles.map( ( tile, index ) => (
						<div
							key={ index }
							style={ {
								marginBottom: '12px',
								paddingBottom: '12px',
								borderBottom: '1px solid #ddd',
							} }
						>
							<TextControl
								label={ __( 'Value', 'sgs-blocks' ) }
								value={ tile.value || '' }
								onChange={ ( val ) =>
									updateTile( index, 'value', val )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ tile.label || '' }
								onChange={ ( val ) =>
									updateTile( index, 'label', val )
								}
								style={ { marginTop: '8px' } }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextareaControl
								label={ __( 'Description', 'sgs-blocks' ) }
								value={ tile.description || '' }
								onChange={ ( val ) =>
									updateTile( index, 'description', Array.from( val ).slice( 0, DESCRIPTION_MAX_LENGTH ).join( '' ) )
								}
								maxLength={ DESCRIPTION_MAX_LENGTH }
								help={ __(
									'Optional. One line shown under the tile label. Leave blank for none.',
									'sgs-blocks'
								) }
								rows={ 2 }
								__nextHasNoMarginBottom
							/>
							<IconPicker
								label={ __( 'Icon', 'sgs-blocks' ) }
								/* render.php draws a Lucide icon or prints an emoji; it has no other source. */
								sources={ [ 'lucide', 'emoji' ] }
								value={ {
									source: tile.iconSource || 'emoji',
									name: tile.icon || '',
								} }
								onChange={ ( { source, name } ) => {
									const newTiles = [ ...tiles ];
									newTiles[ index ] = {
										...newTiles[ index ],
										icon: name,
										iconSource: source,
									};
									setAttributes( { tiles: newTiles } );
								} }
							/>
							{ /* render.php prints tile.image as the tile's decorative <img>; the stored value is the image URL. */ }
							<MediaPicker
								value={ tile.image ? { url: tile.image, type: 'image', id: 0, alt: '', mime: 'image/jpeg' } : null }
								allowedTypes={ [ 'image' ] }
								onChange={ ( media ) => updateTile( index, 'image', media ? media.url : '' ) }
								label={ __( 'Select image', 'sgs-blocks' ) }
								instructionsImage={ __( 'Optional. Shown inside the tile.', 'sgs-blocks' ) }
							/>
							<Button
								isDestructive
								isSmall
								onClick={ () => removeTile( index ) }
								style={ { marginTop: '8px' } }
							>
								{ __( 'Remove', 'sgs-blocks' ) }
							</Button>
						</div>
					) ) }
					<Button isPrimary onClick={ addTile }>
						{ __( 'Add Tile', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ formFieldTilesContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls>
				<PanelBody title={ __( 'Tile surface', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.tileBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { tileBorderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.tileBorderStyle }
						onStyleChange={ ( val ) => setAttributes( { tileBorderStyle: val } ) }
						colourLabel={ __( 'Tile border colour', 'sgs-blocks' ) }
						colourValue={ attributes.tileBorderColour }
						onColourChange={ ( val ) => setAttributes( { tileBorderColour: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ formFieldTilesTileContrastAgainst }
						radiusValues={ {
							base: attributes.tileRadius?.desktop ?? {},
							tablet: attributes.tileRadius?.tablet ?? {},
							mobile: attributes.tileRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { tileRadius: { ...attributes.tileRadius, [ key ]: next } } );
						} }
					/>
					<ResponsiveOverride
						value={ attributes.tilePadding }
						onChange={ ( obj ) => setAttributes( { tilePadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Tile padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						label={ __( 'Gap between label and description', 'sgs-blocks' ) }
						value={ attributes.tileInnerGap }
						onChange={ ( obj ) => setAttributes( { tileInnerGap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsGapControl
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>
					<AlignItemsTierControl
						label={ __( 'Tile content alignment', 'sgs-blocks' ) }
						value={ attributes.tileAlign }
						options={ TILE_ALIGN_OPTIONS }
						onChange={ ( obj ) => setAttributes( { tileAlign: obj } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Tile text', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'tileLabel',
								label: __( 'Tile label', 'sgs-blocks' ),
								prefix: 'tileLabel',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextStroke: true,
							},
							{
								key: 'tileDescription',
								label: __( 'Tile description', 'sgs-blocks' ),
								prefix: 'tileDescription',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextStroke: true,
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ tileTextPreviewCss && <style>{ tileTextPreviewCss }</style> }
				{ label && (
					<label className="sgs-form-field__label">
						<AuthoredText value={ label } />
						{ required && (
							<span className="sgs-form-field__required">
								*
							</span>
						) }
					</label>
				) }
				<div className="sgs-form-tiles" style={ tilesStyle }>
					<BandWrap hasBandProps={ wrapper.hasBandProps } bandStyle={ wrapper.bandStyle }>
						{ tiles.map( ( tile, index ) => (
							<label
								key={ index }
								className={ [
									'sgs-form-tile',
									chosenIndexes.includes( index ) ? 'sgs-form-tile--selected' : '',
								].filter( Boolean ).join( ' ' ) }
								style={ tileSurface( chosenIndexes.includes( index ) ) }
							>
								<input
									className="sgs-form-tile__input"
									type={ multiSelect ? 'checkbox' : 'radio' }
									name={ `preview-${ fieldName }` }
									value={ tile.value || '' }
									checked={ chosenIndexes.includes( index ) }
									readOnly
									disabled
								/>
								{ tile.icon && (
									<span className="sgs-form-tile__icon" aria-hidden="true">
										<IconPreview
											source={ tile.iconSource || 'emoji' }
											name={ tile.icon }
											size={ 32 }
										/>
									</span>
								) }
								<span className="sgs-form-tile__label" style={ tileLabelPaint }>{ tile.label || '' }</span>
								{ tile.description && (
									<span className="sgs-form-tile__description" style={ tileDescriptionPaint }>
										{ Array.from( tile.description ).slice( 0, DESCRIPTION_MAX_LENGTH ).join( '' ) }
									</span>
								) }
								<span className="sgs-form-tile__check" aria-hidden="true"></span>
							</label>
						) ) }
					</BandWrap>
				</div>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
