import { __ } from '@wordpress/i18n';
import ServerSideRender from '../../components/ServerSideRender';
import { useEffect, useMemo } from '@wordpress/element';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	Button,
} from '@wordpress/components';
import {
	SgsColourPanel,
	SsrPreviewGuard,
	ResponsiveControl,
	TypographyControls,
	ShadowControl,
	LinkPopoverField,
	SgsBorderControl,
	ResponsiveOverride,
	BOX_UNITS,
	normaliseResponsiveBox,
	SgsBoxControl,
	SgsSeparatorControl,
	SgsLengthControl,
	MediaGalleryPicker,
	textRow,
} from '../../components';
import MediaSlotField from '../../components/media/MediaSlotField.js';
import FitField from '../../components/media/FitField.js';
import MediaElementPanel from '../../components/MediaElementPanel';
import { LOGO_SLOT, applySlotPatch, emptyLogoItem, itemToSlotAttrs, itemUrl, resolveLogoItem } from './item-model';
import metadata from './block.json';
import { LINK_SOURCES_ALL } from '../../shared/link-source-options';
import { withStableItemKeys } from '../../utils';
import {
	ToolsPanel,
	ToolsPanelItem,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';
import { SourcePanel, BrandTextStylePanel } from './source-controls';

import SgsFreeTextField from '../../components/SgsFreeTextField';
const LOGO_ENTRY = metadata.supports.sgs.mediaElements.find( ( e ) => 'logo' === e.prefix );
// Source, Alt and Decorative are each logo's own; the rest are the strip's.
const BLOCK_ATOMS = LOGO_ENTRY.atoms.filter( ( id ) => ! [ 'source', 'meaning' ].includes( id ) );

const IMAGE_EFFECT_OPTIONS = [
	{ label: __( 'None (full colour)', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Sepia', 'sgs-blocks' ), value: 'sepia' },
];

function LogoEditor( { logo, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...logo, [ key ]: value } );
	};
	const slotAttrs = itemToSlotAttrs( logo );
	const setSlot = ( patch ) => onChange( applySlotPatch( logo, patch ) );

	return (
		<div
			style={ {
				borderBottom: '1px solid #ddd',
				paddingBottom: '12px',
				marginBottom: '12px',
			} }
		>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }
				{ logo.alt ? ` — ${ logo.alt }` : '' }
			</p>

			{ /* The item's picture, alt text, Decorative flag and own fit: the shared media fields, the item's settings
			   shown to them as `logo*` attributes (item-model.js). A logo is never cropped by default: the strip's Fit
			   is Show all and an item may override it. */ }
			<MediaSlotField
				attributes={ slotAttrs }
				setAttributes={ setSlot }
				prefix={ LOGO_SLOT.prefix }
				slot={ LOGO_SLOT }
				label={ __( 'Logo', 'sgs-blocks' ) }
			/>
			{ !! itemUrl( logo ) && (
				<FitField
					attributes={ slotAttrs }
					setAttributes={ setSlot }
					prefix={ LOGO_SLOT.prefix }
					slot={ LOGO_SLOT }
				/>
			) }

			<TextControl
				label={ __( 'Name / label (optional)', 'sgs-blocks' ) }
				help={ __(
					'Shown as a caption under the logo when "Show logo names" is on.',
					'sgs-blocks'
				) }
				value={ logo.name || '' }
				onChange={ ( val ) => update( 'name', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			{ /* Spec 35 §2 LINK standard (promoted from `sgs/button`'s
			   Bean-approved popover 2026-08-13) — replaces the old
			   `SgsLinkControl` inline mount. `logo.linkTarget` is a
			   boolean-shaped enum ('_self'/'_blank' only), so
			   targetMode="boolean" matches the declared schema exactly. */ }
			<LinkPopoverField
				label={ __( 'Link (optional)', 'sgs-blocks' ) }
				help={ __(
					'Search your site or paste a URL to make this logo clickable.',
					'sgs-blocks'
				) }
				value={ {
					url: logo.linkUrl || '',
					linkTarget: logo.linkTarget || '_self',
					rel: logo.linkRel || '',
					linkSource: logo.linkUrlSource || '',
				} }
				linkSources={ LINK_SOURCES_ALL }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...logo };
					if ( undefined !== next.url ) {
						patch.linkUrl = next.url;
					}
					if ( undefined !== next.linkSource ) {
						patch.linkUrlSource = next.linkSource;
					}
					if ( undefined !== next.linkTarget ) {
						patch.linkTarget = next.linkTarget;
					}
					if ( undefined !== next.rel ) {
						patch.linkRel = next.rel;
					}
					onChange( patch );
				} }
			/>

			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove logo', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		logos: rawLogos,
		source,
		brandDisplay,
		brandTextColour,
		brandTextColourGradient,
		brandTextColourHover,
		imageEffect,
		maxHeight,
		columns,
		showNames,
		nameColour,
		nameColourGradient,
		logoGap,
		tilePadding,
		tileRadius,
		tileBackgroundColour,
		tileBackgroundColourGradient,
		tileBorderWidth,
		tileBorderColour,
		tileBorderColourGradient,
		tileShadow,
		itemBackgroundColourHover,
		itemBorderColourHover,
		itemBorderColourHoverGradient,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		nameColourHover,
	} = attributes;
	// A marquee effect layer on the root makes the strip one marquee row.
	const isScrolling = (
		attributes.sgsMotion?.elements?.root?.effects ?? []
	).some( ( layer ) => layer?.effect === 'marquee' );

	// Stable per-item `_key` for CSS scoping (Spec 35 Part 4) — backfilled
	// silently for items authored before this field existed. useMemo keeps
	// the generated keys stable within a render even before the effect
	// below persists them; the effect fires at most once per real backfill
	// (withStableItemKeys returns the SAME reference when nothing changed).
	const logos = useMemo( () => withStableItemKeys( rawLogos ), [ rawLogos ] );
	useEffect( () => {
		if ( logos !== rawLogos ) {
			setAttributes( { logos } );
		}
	}, [ logos, rawLogos, setAttributes ] );

	const updateLogo = ( index, updated ) => {
		const next = [ ...logos ];
		next[ index ] = updated;
		setAttributes( { logos: next } );
	};

	const removeLogo = ( index ) => {
		setAttributes( {
			logos: logos.filter( ( _, i ) => i !== index ),
		} );
	};

	// Bulk add: the library modal selects many images at once and each becomes one
	// logo item, appended after the existing logos (multiple="add" never replaces them).
	const addLogos = ( items ) => {
		if ( items.length ) {
			setAttributes( { logos: [ ...logos, ...items ] } );
		}
	};

	const addLogo = () => {
		setAttributes( { logos: [ ...logos, emptyLogoItem() ] } );
	};

	// Contrast check for border colour against the brand strip's own background.
	// When the background has a gradient sibling, skip the check (flat colour would be inaccurate).
	const brandStripContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	const blockProps = useBlockProps();

	return (
		<>
			{ /* D609/D618 uniformity rollout — ONE grouped, SGS-owned colour
			   panel, rendered FIRST. Replaces the scattered DesignTokenPicker
			   rows previously inline inside the Styles-tab "Tile colours"
			   StateToggleControl and the Caption panel below. Hover pairs:
			   tileBackgroundColour⇆itemBackgroundColourHover,
			   tileBorderColour⇆itemBorderColourHover,
			   nameColour⇆nameColourHover. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'rootBackground',
						label: __(
							'Block background colour (root)',
							'sgs-blocks'
						),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) =>
									setAttributes( {
										backgroundColour: val ?? '',
									} ),
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										backgroundColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) =>
									setAttributes( {
										backgroundColourHover: val ?? '',
									} ),
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										backgroundColourHoverGradient:
											val ?? '',
									} ),
							},
						],
					},
					{
						key: 'rootText',
						label: __( 'Block text colour (root)', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										textColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) =>
									setAttributes( {
										textColourHover: val ?? '',
									} ),
								linked: true,
								onGradientChange: ( val ) =>
									setAttributes( {
										textColourHoverGradient: val ?? '',
									} ),
								gradientValue: textColourHoverGradient,
							},
						],
					},
					{
						key: 'tileBackground',
						label: __( 'Tile background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tileBackgroundColour,
								onChange: ( val ) =>
									setAttributes( {
										tileBackgroundColour: val,
									} ),
								gradientValue: tileBackgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										tileBackgroundColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: itemBackgroundColourHover,
								onChange: ( val ) =>
									setAttributes( {
										itemBackgroundColourHover: val,
									} ),
							},
						],
					},
					{
						key: 'tileBorder',
						label: __( 'Tile border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tileBorderColour,
								onChange: ( val ) =>
									setAttributes( { tileBorderColour: val } ),
								gradientValue: tileBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										tileBorderColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: itemBorderColourHover,
								onChange: ( val ) =>
									setAttributes( {
										itemBorderColourHover: val,
									} ),
								gradientValue: itemBorderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										itemBorderColourHoverGradient:
											val ?? '',
									} ),
							},
						],
					},
					{
						key: 'caption',
						label: __( 'Caption colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: nameColour,
								onChange: ( val ) =>
									setAttributes( { nameColour: val } ),
								gradientValue: nameColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										nameColourGradient: val ?? '',
									} ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: nameColourHover,
								onChange: ( val ) =>
									setAttributes( { nameColourHover: val } ),
							},
						],
					},
					textRow( {
						key: 'title-colour',
						label: __( 'Title colour', 'sgs-blocks' ),
						attrs: {
							base: 'titleColour',
							hover: 'titleColourHover',
							gradient: 'titleColourGradient',
							hoverGradient: 'titleColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					...( 'logos' !== ( brandDisplay || 'logos' )
						? [
								{
									key: 'brandText',
									label: __(
										'Brand text colour (no-logo fallback)',
										'sgs-blocks'
									),
									gradientCapable: true,
									states: [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: brandTextColour,
											onChange: ( val ) =>
												setAttributes( {
													brandTextColour: val ?? '',
												} ),
											gradientValue:
												brandTextColourGradient,
											onGradientChange: ( val ) =>
												setAttributes( {
													brandTextColourGradient:
														val ?? '',
												} ),
										},
										{
											key: 'hover',
											label: __( 'Hover', 'sgs-blocks' ),
											value: brandTextColourHover,
											onChange: ( val ) =>
												setAttributes( {
													brandTextColourHover:
														val ?? '',
												} ),
										},
									],
								},
						  ]
						: [] ),
				] }
			/>
			{ /* ── SETTINGS tab — behaviour / configuration ── */ }
			<InspectorControls>
				<SourcePanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>

				{ /* The lines between brands. A marquee strip is one row, so it offers the
				   between-columns line only. */ }
				<PanelBody
					title={ __( 'Separators', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsSeparatorControl
						value={ attributes.separators }
						onChange={ ( next ) =>
							setAttributes( { separators: next } )
						}
						axes={
							isScrolling ? [ 'column' ] : [ 'row', 'column' ]
						}
					/>
				</PanelBody>

				{ /* Manual-entry UI only makes sense for the manual source —
				   hidden (not merely disabled) once Product brands is picked
				   so there is no dead "Add logo" affordance for a list the
				   query already fills. */ }
				{ 'manual' === ( source || 'manual' ) && (
					<PanelBody
						title={ __( 'Logos', 'sgs-blocks' ) }
						initialOpen={ true }
					>
						{ logos.map( ( logo, index ) => (
							<LogoEditor
								key={ logo._key || index }
								logo={ logo }
								index={ index }
								onChange={ ( updated ) =>
									updateLogo( index, updated )
								}
								onRemove={ () => removeLogo( index ) }
							/>
						) ) }
						<MediaGalleryPicker
							value={ [] }
							onChange={ addLogos }
							resolveItem={ resolveLogoItem }
							allowedTypes={ [ 'image' ] }
							multiple="add"
							addLabel={ __(
								'Add logos from the library',
								'sgs-blocks'
							) }
						/>{ ' ' }
						<Button variant="secondary" onClick={ addLogo }>
							{ __( 'Add empty logo', 'sgs-blocks' ) }
						</Button>
					</PanelBody>
				) }

				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* columns is a TIER OBJECT {desktop,tablet,mobile} (D777/S2 fix,
					   2026-09-04) — was 3 flat scalar attrs. Kept on the existing
					   <ResponsiveControl> (global-tier switcher, not
					   <ResponsiveOverride>'s inherit model) because each tier
					   always carries its own concrete baked-in default (8/4/6)
					   and a DIFFERENT max per tier — the shape here never had
					   inheritance semantics, so introducing them would be new
					   behaviour, not a faithful migration. */ }
					<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
						{ ( bp ) => {
							const cols = {
								desktop: {
									tier: 'desktop',
									value: columns?.desktop ?? 8,
									max: 12,
								},
								tablet: {
									tier: 'tablet',
									value: columns?.tablet ?? 4,
									max: 10,
								},
								mobile: {
									tier: 'mobile',
									value: columns?.mobile ?? 2,
									max: 6,
								},
							}[ bp ];
							return (
								<RangeControl
									label={ __( 'Columns', 'sgs-blocks' ) }
									hideLabelFromVision
									help={ __(
										'How many logos fill the width on this device. Tiles resize to fit exactly this many.',
										'sgs-blocks'
									) }
									value={ cols.value }
									onChange={ ( val ) =>
										setAttributes( {
											columns: {
												...columns,
												[ cols.tier ]: val,
											},
										} )
									}
									min={ 1 }
									max={ cols.max }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>
					<RangeControl
						label={ __( 'Logo max height cap (px)', 'sgs-blocks' ) }
						help={ __(
							'Tiles size to fit the columns above and grow with the screen; this caps how big a logo gets so it never pixelates on wide screens.',
							'sgs-blocks'
						) }
						value={ maxHeight }
						onChange={ ( val ) =>
							setAttributes( { maxHeight: val } )
						}
						min={ 12 }
						max={ 260 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleGroupControl
						label={ __( 'Logo layout', 'sgs-blocks' ) }
						help={ __(
							'Tiles: square tiles that grow with the strip. Row: every brand in a slim slot like a text brand (minimum width, padding and divider from the text settings), the logo no taller than the cap above.',
							'sgs-blocks'
						) }
						value={ attributes.logoLayout || 'tiles' }
						onChange={ ( val ) =>
							setAttributes( { logoLayout: val || 'tiles' } )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="tiles"
							label={ __( 'Tiles', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="row"
							label={ __( 'Row', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>
					{ 'row' === attributes.logoLayout && (
						<>
							<RangeControl
								label={ __(
									'Logo max width (px)',
									'sgs-blocks'
								) }
								help={ __(
									'0 lets a logo be as wide as its slot.',
									'sgs-blocks'
								) }
								value={ attributes.logoMaxWidth ?? 0 }
								onChange={ ( val ) =>
									setAttributes( { logoMaxWidth: val ?? 0 } )
								}
								min={ 0 }
								max={ 400 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<RangeControl
								label={ __(
									'Resting opacity (%)',
									'sgs-blocks'
								) }
								help={ __(
									'Each brand rises to full strength on hover or keyboard focus.',
									'sgs-blocks'
								) }
								value={ attributes.logoOpacity ?? 100 }
								onChange={ ( val ) =>
									setAttributes( { logoOpacity: val ?? 100 } )
								}
								min={ 0 }
								max={ 100 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { borderWidth: next } )
						}
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { borderStyle: val } )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) =>
							setAttributes( { borderColour: val ?? '' } )
						}
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) =>
							setAttributes( { borderColourGradient: val ?? '' } )
						}
						colourLinked={ true }
						contrastAgainst={ brandStripContrastAgainst }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								borderRadius: {
									...attributes.borderRadius,
									[ key ]: next,
								},
							} );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* The settings every logo shares (Spec 49 §10.4: Fit, Shape, Radius, Colour): the adopted panels on the logo slot,
			   without the Source and Alt rows, which each logo's own card holds. Shape is the tile's. A strip with no Fit
			   of its own shows each whole logo (render.php), so the panel shows that. */ }
			<MediaElementPanel
				attributes={ {
					...attributes,
					logoSource: { desktop: { kind: 'image' } },
					logoFit: attributes.logoFit ?? { desktop: 'contain' },
				} }
				setAttributes={ setAttributes }
				prefix="logo"
				blockSlug="sgs/brand-strip"
				blockName="sgs/brand-strip"
				atoms={ BLOCK_ATOMS }
				kinds={ LOGO_ENTRY.kinds }
				context={ LOGO_ENTRY.context }
			/>

			{ /* ── STYLES tab — appearance, grouped by block element ── */ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Tile', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							tilePadding: '0px',
							tileRadius: 16,
							tileShadow: '',
							logoGap: '10px',
							tileBackgroundColour: '',
							tileBorderWidth: 0,
							tileBorderColour: '',
							tileBorderColourGradient: '',
							itemBackgroundColourHover: '',
							itemBorderColourHover: '',
							itemBorderColourHoverGradient: '',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Tile padding', 'sgs-blocks' ) }
						hasValue={ () => '0px' !== tilePadding }
						onDeselect={ () =>
							setAttributes( { tilePadding: '0px' } )
						}
					>
						<SgsLengthControl
							presets
							label={ __( 'Tile padding', 'sgs-blocks' ) }
							value={ tilePadding }
							onChange={ ( val ) =>
								setAttributes( { tilePadding: val } )
							}
						/>
						<p className="components-base-control__help">
							{ __(
								'Space between the logo and the tile edge. Choose a custom 0 so the logo fills the tile edge-to-edge.',
								'sgs-blocks'
							) }
						</p>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Tile corner radius', 'sgs-blocks' ) }
						hasValue={ () => tileRadius !== 16 }
						onDeselect={ () => setAttributes( { tileRadius: 16 } ) }
					>
						<RangeControl
							label={ __(
								'Tile corner radius (px)',
								'sgs-blocks'
							) }
							value={ tileRadius }
							onChange={ ( val ) =>
								setAttributes( { tileRadius: val } )
							}
							min={ 0 }
							max={ 100 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Tile shadow', 'sgs-blocks' ) }
						hasValue={ () => !! tileShadow }
						onDeselect={ () => setAttributes( { tileShadow: '' } ) }
					>
						<ShadowControl
							label={ __( 'Tile shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'tileShadow',
								colour: 'tileShadowColour',
								hover: 'tileShadowHover',
								hoverColour: 'tileShadowColourHover',
							} }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Gap between logos', 'sgs-blocks' ) }
						hasValue={ () => '10px' !== logoGap }
						onDeselect={ () =>
							setAttributes( { logoGap: '10px' } )
						}
					>
						<SgsLengthControl
							presets
							label={ __( 'Gap between logos', 'sgs-blocks' ) }
							value={ logoGap }
							onChange={ ( val ) =>
								setAttributes( { logoGap: val } )
							}
						/>
					</ToolsPanelItem>

					{ /* Border width — a non-colour numeric control, kept here
					   (the colour rows themselves moved into the shared
					   SgsColourPanel at the top of the inspector, D609/D618). */ }
					<ToolsPanelItem
						label={ __( 'Tile border width', 'sgs-blocks' ) }
						hasValue={ () => tileBorderWidth !== 0 }
						onDeselect={ () =>
							setAttributes( { tileBorderWidth: 0 } )
						}
						isShownByDefault
					>
						<RangeControl
							label={ __( 'Border width (px)', 'sgs-blocks' ) }
							help={ __(
								'Static border shown on every tile at rest.',
								'sgs-blocks'
							) }
							value={ tileBorderWidth }
							onChange={ ( val ) =>
								setAttributes( { tileBorderWidth: val } )
							}
							min={ 0 }
							max={ 10 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				<PanelBody
					title={ __( 'Logo image', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Image effect', 'sgs-blocks' ) }
						help={ __(
							'Apply sepia to logos, full colour on hover. For grey to colour, use the Hover state of the logo in the Motion panel.',
							'sgs-blocks'
						) }
						value={ imageEffect }
						options={ IMAGE_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { imageEffect: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Title', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsFreeTextField type="rich"
						label={ __( 'Title text', 'sgs-blocks' ) }
						help={ __(
							'Printed above the strip. Leave empty to show no title.',
							'sgs-blocks'
						) }
						value={ attributes.title || '' }
						onChange={ ( val ) => setAttributes( { title: val } ) }
					/>
					<TypographyControls
						fontSizePresets
						showFontFamily
						showTextAlign
						showTextWrap
						showTextStroke
						showTextColumns
						showWritingMode
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="title"
						showDecoration
						showTransform
						showLetterSpacing
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Caption', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show logo names', 'sgs-blocks' ) }
						help={ __(
							'Display each logo’s name as a caption underneath its tile.',
							'sgs-blocks'
						) }
						checked={ showNames }
						onChange={ ( val ) =>
							setAttributes( { showNames: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ showNames && (
						<>
							<TypographyControls
								fontSizePresets
								showFontFamily
								showTextAlign
								showTextWrap
								showTextStroke
								showTextColumns
								showWritingMode
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="name"
								showDecoration
								showTransform
								showLetterSpacing
							/>
						</>
					) }
				</PanelBody>

				<BrandTextStylePanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>

				<PanelBody
					title={ __( 'Strip spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) =>
							setAttributes( { padding: obj } )
						}
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={
									ownValue && typeof ownValue === 'object'
										? ownValue
										: {}
								}
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) =>
									setOwnValue(
										normaliseResponsiveBox( next )
									)
								}
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={
									ownValue && typeof ownValue === 'object'
										? ownValue
										: {}
								}
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) =>
									setOwnValue(
										normaliseResponsiveBox( next )
									)
								}
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Product-brands source starts with an empty `logos[]` (the
					   query supplies the real list server-side) — only show the
					   "add logos" empty state for the manual source. */ }
				{ logos.length === 0 && 'product-brands' !== source ? (
					<p className="sgs-brand-strip__empty">
						{ __(
							'Add logos in the sidebar panel.',
							'sgs-blocks'
						) }
					</p>
				) : (
					<SsrPreviewGuard>
						<ServerSideRender
							block="sgs/brand-strip"
							attributes={ attributes }
						/>
					</SsrPreviewGuard>
				) }
			</div>
		</>
	);
}
