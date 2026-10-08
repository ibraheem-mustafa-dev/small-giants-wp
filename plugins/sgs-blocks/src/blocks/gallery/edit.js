/**
 * SGS Image Gallery — block editor component.
 *
 * Provides a live image preview via the mediaItems attribute array, with
 * MediaUpload for multi-image selection, drag-to-reorder thumbnails,
 * and inspector panels covering layout, colours, hover, and carousel options.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
// Composed named panels, NOT the <ContainerWrapperControls kind="layout"> aggregator.
// The aggregator renders LayoutPanel's own Layout + Columns controls, which bind to
// the SAME attributes this block already controls — and with an incompatible option
// set: it offers Stack/Flex/Grid while this block's `layout` enum is
// Grid/Masonry/Carousel. Measured 2026-08-07: writing "flex" is accepted, stored,
// then SILENTLY reverted to "grid" on reload by WordPress's enum coercion. So we take
// the wrapper's width/spacing panels and LayoutPanel's GAP only.
// Precedent: sgs/hero and sgs/cta-section already skip the aggregator for this reason.
//
// NOT imported: ContentBandPanel. It targets the `.sgs-container__inner` band, which
// only section/layout containerKind blocks render — gallery declares no containerKind
// at all and has no such band (confirmed in render.php). Mounting it here was dead on
// arrival: every field wrote to contentBandBackground/contentBandPaddingTop* etc.,
// none of which gallery's block.json ever declared, so WordPress silently discarded
// every value a client entered. Same defect class as the ResponsiveSpacingPanel this
// file already removed (see the Spec 37 note below).
import {
	LayoutPanel,
	SeparatorsPanel,
} from '../container/components/ContainerWrapperControls';
// Spec 37 FR-37-16 object model (Spec 35 Phase 1.4, 2026-08-10). Replaces
// WidthPanel + ResponsiveSpacingPanel here — see the mount below for why.
import { ResponsiveBoxControls,
	scrimColourRow,
} from '../../components';
import { PanelBody } from '@wordpress/components';
import { useEffect, useMemo } from '@wordpress/element';
import { useSeparatorsCanvas } from '../../shared/separators/useSeparatorsCanvas';
import SgsColourPanel from '../../components/SgsColourPanel';
import {
	colourVar,
	resolveResponsiveTier,
	withStableItemKeys,
	tierBoxLonghands,
	resolveContentWidthPreview,
	contentBandPreview,
	applyGridLayoutPreview,
	usePreviewTier,
	wrapperBorderPreview,
} from '../../utils';
import { captionPreviewStyle } from './preview-style';
import useGalleryItems from './use-gallery-items';
import ImagesPanel from './components/ImagesPanel';
import LayoutSettingsPanel from './components/LayoutSettingsPanel';
import GalleryHoverEffectsPanel from './components/GalleryHoverEffectsPanel';
import GalleryContentPanel from './components/GalleryContentPanel';
import GalleryCarouselPanel from './components/GalleryCarouselPanel';
import GalleryCanvas from './components/GalleryCanvas';
import GalleryBorderControl from './components/GalleryBorderControl';

// -------------------------------------------------------------------------
// Main edit component
// -------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	const {
		mediaItems,
		layout,
		columns,
		gap,
		aspectRatio,
		enableLightbox,
		showCaptions,
		captionReveal,
		captionColour,
		captionColourGradient,
		captionColourHover,
		captionColourHoverGradient,
		captionBgColour,
		captionBgColourGradient,
		overlayColourHover,
		overlayColourHoverGradient,
		scaleHover,
		imageZoomHover,
		grayscaleHover,
		staggerDelay,
		effectHover,
		transitionDuration,
		transitionEasing,
		carouselAutoplay,
		carouselSpeed,
		carouselShowDots,
		carouselShowArrows,
		imageSize,
		dragToScroll,
		dragMomentum,
		loopCarousel,
	} = attributes;

	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );

	// Stable per-item `_key` for CSS scoping (Spec 35 Part 4) — backfilled
	// silently for items authored before this field existed. Same shape as
	// sgs/card-grid's identical mechanism. `rawMediaItems` is compared by
	// reference below, so it must NOT be a freshly-created `|| []` literal —
	// that would never equal the memoised `items` and loop `setAttributes`
	// forever.
	const rawMediaItems = mediaItems;
	const items = useMemo(
		() => withStableItemKeys( rawMediaItems || [] ),
		[ rawMediaItems ]
	);
	useEffect( () => {
		if ( items !== rawMediaItems ) {
			setAttributes( { mediaItems: items } );
		}
	}, [ items, rawMediaItems, setAttributes ] );

	const {
		handleDragStart,
		handleDrop,
		removeImage,
		toggleItemDecorative,
		updateItemCrop,
		onSelectImages,
	} = useGalleryItems( { items, setAttributes } );

	// Active device tier for the padding/margin/maxWidth/contentWidth/grid-layout
	// canvas mirror below — read from the SAME source the inspector's global
	// device toggle writes (`core/editor` getDeviceType), mirroring
	// sgs/container's edit.js and ResponsiveControl.js:103. Without this the
	// preview would always show the desktop tier while the operator edits
	// tablet/mobile.
	const previewTier = usePreviewTier();
	const [ colourPalette ] = useSettings( 'color.palette' );

	// gap is a TIER OBJECT — resolve the desktop tier (what the canvas shows)
	// before testing/using it. String() on the raw object would yield
	// "[object Object]", a non-empty string that fails the numeric test and
	// gets used verbatim as a bogus CSS value.
	const gapDesktop = resolveResponsiveTier( gap, 'desktop' )?.value;

	// columns is a TIER OBJECT (Spec 35 pass 4) — resolve each tier explicitly,
	// or the preview would emit "--sgs-columns-desktop: [object Object]" and
	// the CSS custom properties would silently fail (same D567 class as gap
	// above).
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const columnsTabletTier = resolveResponsiveTier( columns, 'tablet' )?.value || 2;
	const columnsMobileTier = resolveResponsiveTier( columns, 'mobile' )?.value || 1;

	// Wrapper inline styles — CSS custom properties for layout.
	const inlineStyles = {
		'--sgs-columns-desktop': columnsDesktop,
		'--sgs-columns-tablet': columnsTabletTier,
		'--sgs-columns-mobile': columnsMobileTier,
		// gap is now a string from the shared SpacingControl (e.g. "16px", "40").
		// Bare numeric strings (legacy format) are suffixed with px for preview.
		'--sgs-gap': /^\d+$/.test( String( gapDesktop ) ) ? gapDesktop + 'px' : gapDesktop || '16px',
		'--sgs-transition-duration': transitionDuration + 'ms',
		'--sgs-transition-easing': transitionEasing,
	};

	if ( scaleHover ) {
		inlineStyles[ '--sgs-hover-scale' ] = scaleHover;
	}
	if ( overlayColourHover ) {
		inlineStyles[ '--sgs-hover-overlay' ] = colourVar( overlayColourHover );
	}
	Object.assign( inlineStyles, wrapperBorderPreview( attributes, previewTier, colourPalette ) );
	const captionStyle = captionPreviewStyle( attributes, colourPalette );

	// ── Editor-canvas mirror: padding / margin / maxWidth / contentWidth /
	// grid layout (CHECK A editor-canvas desync fix, 2026-09-05). All 8 are
	// applied by SGS_Container_Wrapper::render() (render.php calls it with
	// kind='layout', container_queries=true) onto the OUTER wrapper element —
	// or its content band, when contentWidth creates one — but were never
	// read back here, so a client moving any of these controls saw no change
	// until publish. Mirrors sgs/container's edit.js (the reference
	// implementation this pattern was built for), adapted to this block's own
	// attribute shapes — see the per-property notes below.

	// padding/margin: Spec 37 FR-37-16 shape here is ONE attribute holding
	// {desktop,tablet,mobile}, each tier ITSELF a {top,right,bottom,left} box
	// (ResponsiveBoxControls -> BoxControl). resolveBoxTierPreview() does the
	// per-side merge, fed the three tiers pulled out of this block's single
	// object.
	const galleryPaddingObj = attributes.padding && typeof attributes.padding === 'object' ? attributes.padding : {};
	const galleryMarginObj  = attributes.margin  && typeof attributes.margin  === 'object' ? attributes.margin  : {};
	Object.assign(
		inlineStyles,
		tierBoxLonghands( galleryPaddingObj, previewTier, 'padding' ),
		tierBoxLonghands( galleryMarginObj, previewTier, 'margin' )
	);

	// maxWidth: a plain {desktop,tablet,mobile} scalar tier object — same
	// shape as sgs/container's own maxWidth, so the same resolver applies
	// unchanged.
	const previewMaxWidth = resolveResponsiveTier( attributes.maxWidth, previewTier )?.value;
	if ( previewMaxWidth ) inlineStyles.maxWidth = previewMaxWidth;

	// Grid layout preview (justifyItems/alignContent/alignItems/gridAutoRows) —
	// shared with sgs/container via applyGridLayoutPreview(). This block's own
	// `layout` attribute (grid/masonry/carousel) doubles as the value the
	// wrapper reads as its layout-mode switch: class-sgs-container-wrapper.php
	// only emits these declarations onto the OUTER element when
	// `'grid' === $layout` — masonry/carousel never match the grid/flex/stack
	// branches applyGridLayoutPreview() implements, so this call is a correct
	// no-op for those two layouts. `columns`/`attributes.gridTemplateColumns`
	// are the SAME attributes the PHP wrapper itself reads (confirmed in
	// class-sgs-container-wrapper.php) and that this block already uses above
	// for its own inner `.sgs-gallery__grid` thumbnail-track preview — reusing
	// them here does not change that existing preview, which stays driven by
	// `previewGridStyle` below.
	applyGridLayoutPreview( inlineStyles, {
		layout,
		alignItems: attributes.alignItems,
		justifyItems: attributes.justifyItems,
		alignContent: attributes.alignContent,
		gridAutoRows: attributes.gridAutoRows,
		gridTemplateColumns: attributes.gridTemplateColumns,
		columns,
	} );

	// contentWidth band (Layer 2 / `.sgs-container__inner`) — this block
	// declares no `contentBandPadding` sibling attribute, so band padding is
	// always empty; the band still exists whenever contentWidth resolves to a
	// real cap. Must run BEFORE useBlockProps(): contentBandPreview() mutates
	// `inlineStyles` in place, migrating any grid/flex declarations just
	// written above onto the band (mirrors the wrapper's own $grid_on_inner
	// re-routing), so blockProps must be built from the ALREADY-migrated
	// object.
	const galleryBandMaxWidth = resolveContentWidthPreview(
		resolveResponsiveTier( attributes.contentWidth, previewTier )?.value
	);
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: galleryBandMaxWidth,
		bandPadding: {},
		style: inlineStyles,
		layout,
	} );
	// gridTemplateRows (a plain string, grid layout only) lands where the wrapper
	// puts the grid: on the band when one exists, else on the outer element.
	if ( 'grid' === layout && 'string' === typeof attributes.gridTemplateRows && attributes.gridTemplateRows.trim() ) {
		( hasBandProps ? bandStyle : inlineStyles ).gridTemplateRows = attributes.gridTemplateRows.trim();
	}

	const blockProps = useBlockProps( {
		className: `sgs-gallery sgs-gallery--${ layout } sgs-gallery--hover-${ effectHover }`,
		style: inlineStyles,
	} );

	// Grid columns style for the editor preview.
	const previewGridStyle = {
		display: layout === 'masonry' ? 'block' : 'grid',
		gridTemplateColumns:
			layout === 'grid' || layout === 'carousel'
				? `repeat( ${ columnsDesktop }, 1fr )`
				: undefined,
		columnCount: layout === 'masonry' ? columnsDesktop : undefined,
		gap: /^\d+$/.test( String( gapDesktop ) ) ? gapDesktop + 'px' : gapDesktop || '16px',
	};

	// Separators preview: the lines sit on the grid list (`.sgs-gallery__grid`), the same
	// element render.php hands to sgs_separators_css(), and only for the grid layout. The
	// grid's gap is the same value `--sgs-gap` carries on the wrapper, so the lines sit mid-gap.
	const separatorsCanvas = useSeparatorsCanvas( {
		separators: attributes.separators,
		device: previewTier,
		active: 'grid' === layout,
		deps: [ columns, gap, items.length ],
	} );
	const gridStyle = { ...previewGridStyle, ...separatorsCanvas.style };

	return (
		<>
			{ /* D619 — ONE grouped, SGS-OWNED colour panel, rendered FIRST so
			   it sits at the top of the inspector. Replaces the inline
			   `DesignTokenPicker` rows that used to sit in the "Colours"
			   panel below (now removed — it held only these 3 rows).
			   `supports.color` sub-flags are now false so WordPress
			   generates no native colour UI to overlap with this panel.
			   `overlayColourHover` has no resting-state `overlayColour`
			   twin on this block (confirmed in block.json/render.php — it
			   is a hover-only capability), so its row carries a single
			   'hover'-keyed state rather than a normal/hover pair. */ }
			<SgsColourPanel
				rows={ [
					// The lightbox scrim's colour row (U-2 Addendum A, 2026-09-24) —
					// only shown when the lightbox exists at all; its strength/blur
					// siblings live in their own ToolsPanel further down (ScrimControls.js).
					enableLightbox && scrimColourRow( { attributes, setAttributes } ),
					{
						key: 'overlay',
						label: __( 'Hover overlay colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: overlayColourHover,
								onChange: ( val ) => setAttributes( { overlayColourHover: val ?? '' } ),
								linked: true,
								gradientValue: overlayColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { overlayColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			{ /* ============================================================
			     Inspector panels
			     ============================================================ */ }
			{ /* ── Styles tab (D537/Spec 35 THE PLACEMENT RULE) ──────────────────
			   `grid` is the block's isWrapper:true element with clusters
			   [fill, layout, animation] (cluster-member-sets.json). It has no
			   colour attrs beyond native `color.background`/`color.text`
			   (already routed via WordPress's own native colour UI) and no
			   client-facing animation controls here, so only the LAYOUT
			   family has real content — gap/align/justify (LayoutPanel),
			   padding/margin/max-width/content-width (ResponsiveBoxControls)
			   and border/radius (SgsBorderControl) collapse into ONE TIER-2
			   Layout panel rather than three separate ungrouped panels. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ true }>
					{ /* showLayout={false}: this block owns its own Layout and Columns
					     controls below — see the import comment. Gap is still wanted. */ }
					<LayoutPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						showLayout={ false }
					/>
					{ /*
					  Spec 37 FR-37-16 object model — ONE control owning padding, margin,
					  max-width and content-width across all three tiers, each on the
					  {desktop,tablet,mobile} shape.

					  Gallery declares NO supports.spacing: all box CSS flows through the
					  object model here and is emitted by SGS_Container_Wrapper under the
					  object value model, exactly as site-header-row / site-footer-row /
					  nav-menu do.
					*/ }
					<ResponsiveBoxControls attributes={ attributes } setAttributes={ setAttributes } />
					<GalleryBorderControl attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>
				{ /* Lines between the grid's items (the wrapper draws them for the grid layout). */ }
				<SeparatorsPanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			{ /* ============================================================
			     Inspector panels — Settings tab (structural + content)
			     ============================================================ */ }
			<InspectorControls>
				<ImagesPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					items={ items }
					onSelectImages={ onSelectImages }
					removeImage={ removeImage }
					handleDragStart={ handleDragStart }
					handleDrop={ handleDrop }
					toggleItemDecorative={ toggleItemDecorative }
					updateItemCrop={ updateItemCrop }
				/>

				<LayoutSettingsPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

				<GalleryHoverEffectsPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

				<GalleryContentPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

				<GalleryCarouselPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />
				{ /* Border moved to the "Layout" panel in the Styles tab above
				   (Spec 35 THE PLACEMENT RULE — border is a box-shape property
				   of the `grid` wrapper element, grouped with padding/margin/
				   max-width/gap rather than left as its own ungrouped panel). */ }
			</InspectorControls>

			<GalleryCanvas
				attributes={ attributes }
				blockProps={ blockProps }
				hasBandProps={ hasBandProps }
				bandStyle={ bandStyle }
				items={ items }
				captionStyle={ captionStyle }
				gridStyle={ gridStyle }
				separatorsCanvas={ separatorsCanvas }
				onSelectImages={ onSelectImages }
			/>
		</>
	);
}
