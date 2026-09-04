/**
 * SGS Image Gallery — block editor component.
 *
 * Provides a live image preview via the mediaItems attribute array, with
 * MediaUpload for multi-image selection, drag-to-reorder thumbnails,
 * and inspector panels covering layout, colours, hover, and carousel options.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
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
} from '../container/components/ContainerWrapperControls';
// Spec 37 FR-37-16 object model (Spec 35 Phase 1.4, 2026-08-10). Replaces
// WidthPanel + ResponsiveSpacingPanel here — see the mount below for why.
import { ResponsiveBoxControls, MEDIA_SIZING_RATIO_OPTIONS,
	SgsBorderControl,
	resolveColourToken,
	ShadowControl,
} from '../../components';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	RadioControl,
	Spinner,
	ToolsPanel,
	ToolsPanelItem,
	FocalPointPicker,
} from '@wordpress/components';
import { useRef, useEffect, useMemo } from '@wordpress/element';
import SgsColourPanel from '../../components/SgsColourPanel';
import MediaGalleryPicker from '../../components/MediaGalleryPicker';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import { colourVar, resolveResponsiveTier, generateItemKey, withStableItemKeys, focalPointToObjectPosition } from '../../utils';

// -------------------------------------------------------------------------
// Static option arrays (defined outside component to avoid re-creation)
// -------------------------------------------------------------------------

const LAYOUT_OPTIONS = [
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'Masonry', 'sgs-blocks' ), value: 'masonry' },
	{ label: __( 'Carousel', 'sgs-blocks' ), value: 'carousel' },
];

// C19 ratio-mode adoption (2026-08-27) — reuses MediaSizingPanel's shared
// six-value ratio list (spaced format, "16 / 9" etc.) rather than this
// block's own hand-rolled set. render.php's char-filter sanitiser
// ($sgs_css_ratio) is untouched — it already accepts both spaced and
// unspaced values safely, so no PHP change is needed here. The dropped
// "Natural (no crop)" (value: '') option is no longer offered in the UI;
// any post already storing '' keeps rendering with no forced ratio exactly
// as before, since render.php's `if ( $aspect_ratio )` check is unchanged.
const ASPECT_RATIO_OPTIONS = MEDIA_SIZING_RATIO_OPTIONS;

const IMAGE_SIZE_OPTIONS = [
	{ label: __( 'Thumbnail (150×150)', 'sgs-blocks' ), value: 'thumbnail' },
	{ label: __( 'Medium (300×300)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Medium large (768w)', 'sgs-blocks' ), value: 'medium_large' },
	{ label: __( 'Large (1024×1024)', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'Full size', 'sgs-blocks' ), value: 'full' },
];

const EASING_OPTIONS = [
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Zoom', 'sgs-blocks' ), value: 'zoom' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Overlay Slide', 'sgs-blocks' ), value: 'overlay-slide' },
];

// -------------------------------------------------------------------------
// Drag-to-reorder thumbnail strip
// -------------------------------------------------------------------------

/**
 * A single draggable thumbnail in the image picker strip.
 *
 * @param {Object}   props
 * @param {Object}   props.image       Image data object.
 * @param {number}   props.index       Position in the images array.
 * @param {Function} props.onRemove    Called when the remove button is clicked.
 * @param {Function} props.onDragStart Called when drag begins.
 * @param {Function} props.onDragOver  Called when dragged over this item.
 * @param {Function} props.onDrop      Called when dropped on this item.
 */
function GalleryThumbnail( {
	image,
	index,
	onRemove,
	onDragStart,
	onDragOver,
	onDrop,
	onToggleDecorative,
	onUpdateCrop,
} ) {
	const fit = image.objectFit || 'cover';
	return (
		<div
			className="sgs-gallery-editor__thumb"
			draggable
			onDragStart={ () => onDragStart( index ) }
			onDragOver={ ( e ) => {
				e.preventDefault();
				onDragOver( index );
			} }
			onDrop={ () => onDrop( index ) }
			role="listitem"
		>
			<img
				src={ image.url }
				alt={ image.alt || '' }
				className="sgs-gallery-editor__thumb-img"
				style={ {
					objectFit: fit,
					objectPosition:
						'cover' === fit
							? focalPointToObjectPosition( image.focalPoint || { x: 0.5, y: 0.5 } )
							: undefined,
				} }
			/>
			<button
				type="button"
				className="sgs-gallery-editor__thumb-remove"
				onClick={ () => onRemove( index ) }
				aria-label={ __( 'Remove image', 'sgs-blocks' ) }
			>
				&times;
			</button>
			{ /* Item 18 (2026-09-02, decorative-image-aria) — per-item decorative
			     toggle. This is a REPEATER (mediaItems array), so the flag lives
			     on the item object (`decorative`), not as a top-level block
			     attribute. When true, render.php blanks this item's alt text and
			     adds aria-hidden="true" so the image is hidden from assistive
			     tech (WCAG 2.1 AA 1.1.1). This block has no per-item alt-text
			     control in the editor to disable (alt is set via the WordPress
			     Media Library, not an inline field here). */ }
			<ToggleControl
				className="sgs-gallery-editor__thumb-decorative"
				label={ __( 'Decorative — hide from screen readers', 'sgs-blocks' ) }
				checked={ !! image.decorative }
				onChange={ ( value ) => onToggleDecorative( index, value ) }
				__nextHasNoMarginBottom
			/>
			{ /* Spec 35 Part 4 — per-item crop, same shape as sgs/card-grid's
			     repeater panel. 'image' type only: object-fit on a <video>
			     thumbnail here shows a static poster frame, not a meaningful
			     crop preview, and this block's video items are rare enough
			     that a bespoke second control isn't worth the panel clutter. */ }
			{ 'image' === image.type && (
				<>
					<SelectControl
						className="sgs-gallery-editor__thumb-fit"
						label={ __( 'Image fit', 'sgs-blocks' ) }
						value={ fit }
						options={ [
							{ label: __( 'Cover (crop to fill)', 'sgs-blocks' ), value: 'cover' },
							{ label: __( 'Contain (fit within, no crop)', 'sgs-blocks' ), value: 'contain' },
						] }
						onChange={ ( val ) => onUpdateCrop( index, { objectFit: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'cover' === fit && (
						<FocalPointPicker
							label={ __( 'Focal point', 'sgs-blocks' ) }
							url={ image.url }
							value={ image.focalPoint || { x: 0.5, y: 0.5 } }
							onChange={ ( val ) => onUpdateCrop( index, { focalPoint: val } ) }
						/>
					) }
				</>
			) }
		</div>
	);
}

// -------------------------------------------------------------------------
// Main edit component
// -------------------------------------------------------------------------

/**
 * Resolve a WordPress media library object to the SGS unified media-slot shape.
 *
 * Mirrors the resolver inside src/components/MediaPicker.js. Used here because
 * gallery uses a multi-select MediaUpload (better UX for batch add) rather
 * than one MediaPicker per slot — but we still emit the media-slot shape so
 * sgs_render_media() can consume each item server-side.
 *
 * @param {Object} media      WP media object from MediaUpload onSelect.
 * @param {string} preferSize Preferred image size slug (large, medium, etc.).
 * @return {Object}            Unified media-slot shape with extra gallery fields.
 */
function resolveGalleryMedia( media, preferSize ) {
	const mime = media?.mime || media?.mime_type || '';
	const type = mime.startsWith( 'video/' ) ? 'video' : 'image';
	const url =
		type === 'image'
			? media.sizes?.[ preferSize ]?.url ||
			  media.sizes?.large?.url ||
			  media.url
			: media.url;
	return {
		id: media.id || 0,
		url,
		type,
		alt: media.alt || '',
		mime,
		caption: media.caption || '',
		fullUrl: media.sizes?.full?.url || media.url,
		width: media.width || 0,
		height: media.height || 0,
		// Spec 35 Part 4 — stable identity for per-item crop CSS scoping,
		// never array index or the WP attachment id (the id collides the
		// moment the same image is used twice in one gallery).
		_key: generateItemKey(),
		objectFit: 'cover',
		focalPoint: { x: 0.5, y: 0.5 },
	};
}

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
		captionBgColour,
		overlayColourHover,
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

	// Drag-to-reorder state.
	const dragSourceIndex = useRef( null );

	/**
	 * Handle drag-start — record which index is being moved.
	 *
	 * @param {number} index Source index.
	 */
	const handleDragStart = ( index ) => {
		dragSourceIndex.current = index;
	};

	/**
	 * Handle drop — swap the dragged image with the target position.
	 *
	 * @param {number} targetIndex Drop target index.
	 */
	const handleDrop = ( targetIndex ) => {
		const sourceIndex = dragSourceIndex.current;
		if ( sourceIndex === null || sourceIndex === targetIndex ) {
			return;
		}
		const next = [ ...items ];
		const [ moved ] = next.splice( sourceIndex, 1 );
		next.splice( targetIndex, 0, moved );
		setAttributes( { mediaItems: next } );
		dragSourceIndex.current = null;
	};

	/**
	 * Remove a single item from the gallery.
	 *
	 * @param {number} index Index to remove.
	 */
	const removeImage = ( index ) => {
		const next = items.filter( ( _, i ) => i !== index );
		setAttributes( { mediaItems: next } );
	};

	/**
	 * Toggle the per-item decorative flag (item 18, decorative-image-aria).
	 * Patches only the targeted item in the mediaItems repeater — the flag is
	 * a per-item field, not a top-level block attribute.
	 *
	 * @param {number}  index      Index of the item to update.
	 * @param {boolean} decorative New decorative value.
	 */
	const toggleItemDecorative = ( index, decorative ) => {
		const next = items.map( ( item, i ) =>
			i === index ? { ...item, decorative } : item
		);
		setAttributes( { mediaItems: next } );
	};

	/**
	 * Patch a single item's crop fields (Spec 35 Part 4).
	 *
	 * @param {number} index Index of the item to update.
	 * @param {Object} patch Partial item patch — { objectFit } and/or { focalPoint }.
	 */
	const updateItemCrop = ( index, patch ) => {
		const next = items.map( ( item, i ) =>
			i === index ? { ...item, ...patch } : item
		);
		setAttributes( { mediaItems: next } );
	};

	/**
	 * Handle a selection from MediaGalleryPicker.
	 * MediaGalleryPicker already maps each raw WP media object to the
	 * unified SGS media-slot shape (via the resolveItem prop, bound below
	 * to resolveGalleryMedia) so sgs_render_media() can render either an
	 * <img> or <video> per item — this just persists the mapped array.
	 *
	 * @param {Object[]} mappedItems Array already resolved to the SGS media-slot shape.
	 */
	const onSelectImages = ( mappedItems ) => {
		setAttributes( { mediaItems: mappedItems } );
	};

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
	if ( captionColour ) {
		inlineStyles[ '--sgs-caption-colour' ] = colourVar( captionColour );
	}
	if ( captionBgColour ) {
		inlineStyles[ '--sgs-caption-bg' ] = colourVar( captionBgColour );
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
					{
						key: 'caption-text',
						label: __( 'Caption text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: captionColour,
								onChange: ( val ) => setAttributes( { captionColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'caption-background',
						label: __( 'Caption background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: captionBgColour,
								onChange: ( val ) => setAttributes( { captionBgColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'overlay',
						label: __( 'Hover overlay colour', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: overlayColourHover,
								onChange: ( val ) => setAttributes( { overlayColourHover: val ?? '' } ),
								linked: true,
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

					  Replaces TWO panels that were both defective here:
					  * <ResponsiveSpacingPanel> rendered 16 tablet/mobile spacing controls
					    writing paddingTopTablet… — attributes NO block.json declares, so
					    WordPress silently DISCARDED every value on save. A client could set
					    tablet padding, save, and watch it vanish with no error. This was the
					    panel's last mount; it is deleted with this change.
					  * <WidthPanel> drove maxWidth/contentWidth on the flat STRING model,
					    which this block has now left.

					  Gallery therefore declares NO supports.spacing: all box CSS flows
					  through the object model here and is emitted by SGS_Container_Wrapper
					  under the object value model, exactly as site-header-row /
					  site-footer-row / nav-menu already do. One system, not two.
					*/ }
					<ResponsiveBoxControls attributes={ attributes } setAttributes={ setAttributes } />
					{ /* Border + radius — collapsed into this same Layout family panel
					   (was a standalone "Border" PanelBody further down; border is a
					   box-shape property of the same `grid` wrapper element). */ }
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
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ============================================================
			     Inspector panels — Settings tab (structural + content)
			     ============================================================ */ }
			<InspectorControls>
				{ /* Panel 1: Images */ }
				<PanelBody
					title={ __( 'Images', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<p className="sgs-gallery-editor__panel-note">
						{ __(
							'Select multiple images from the Media Library. Drag thumbnails to reorder.',
							'sgs-blocks'
						) }
					</p>

					{ items.length > 0 && (
						<div
							className="sgs-gallery-editor__thumbs"
							role="list"
							aria-label={ __( 'Gallery items', 'sgs-blocks' ) }
						>
							{ items.map( ( image, index ) => (
								<GalleryThumbnail
									key={ image._key || image.id || index }
									image={ image }
									index={ index }
									onRemove={ removeImage }
									onDragStart={ handleDragStart }
									onDragOver={ () => {} }
									onDrop={ handleDrop }
									onToggleDecorative={ toggleItemDecorative }
									onUpdateCrop={ updateItemCrop }
								/>
							) ) }
						</div>
					) }

					<MediaGalleryPicker
						value={ items }
						onChange={ onSelectImages }
						resolveItem={ ( media ) =>
							resolveGalleryMedia( media, imageSize )
						}
						allowedTypes={ [ 'image', 'video' ] }
						addLabel={ __( 'Add media', 'sgs-blocks' ) }
						editLabel={ __( 'Edit gallery', 'sgs-blocks' ) }
						buttonVariant="secondary"
						className="sgs-gallery-editor__media-btn"
					/>

					{ items.length > 0 && (
						<p
							className="sgs-gallery-editor__panel-note"
							style={ { marginTop: '8px' } }
						>
							{ items.length }{ ' ' }
							{ items.length === 1
								? __( 'item selected', 'sgs-blocks' )
								: __( 'items selected', 'sgs-blocks' ) }
						</p>
					) }
				</PanelBody>

				{ /* Panel 2: Layout */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RadioControl
						label={ __( 'Layout', 'sgs-blocks' ) }
						selected={ layout }
						options={ LAYOUT_OPTIONS }
						onChange={ set( 'layout' ) }
					/>
					{ /*
						  columns is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass 4). It must
						  therefore use ResponsiveOverride, which reads and
						  writes the object, NOT ResponsiveControl, which
						  writes one flat attr per tier.

						  ⛔ Do NOT revert this to `ResponsiveControl` + an
						  attrMap of `{desktop:'columns',
						  tablet:'columnsTablet', mobile:'columnsMobile'}`.
						  `columnsTablet`/`columnsMobile` are no longer
						  declared by block.json, and WordPress SILENTLY
						  DISCARDS an attribute a block does not declare
						  (D338) — so both tiers would save nothing. The
						  desktop branch would be worse: it would write a
						  NUMBER into an attr declared `"type":"object"`,
						  which coerces to the default and drops the whole
						  setting (D563's gap regression, same bug class).
					*/ }
					<ResponsiveOverride
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( obj ) => setAttributes( { columns: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
							<RangeControl
								label={ __( 'Columns', 'sgs-blocks' ) }
								hideLabelFromVision
								value={
									ownValue !== ''
										? ownValue
										: ( effectiveValue !== '' ? effectiveValue : ( tier === 'mobile' ? 1 : 3 ) )
								}
								onChange={ setOwnValue }
								min={ 1 }
								max={ 6 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					<SelectControl
						label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ set( 'aspectRatio' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* Panel 3: Content */ }
				<PanelBody
					title={ __( 'Content', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Enable lightbox', 'sgs-blocks' ) }
						checked={ enableLightbox }
						onChange={ set( 'enableLightbox' ) }
						help={ __(
							'Open images in a full-screen lightbox on click.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show captions', 'sgs-blocks' ) }
						checked={ showCaptions }
						onChange={ set( 'showCaptions' ) }
						__nextHasNoMarginBottom
					/>
					{ showCaptions && (
						<ToggleControl
							label={ __(
								'Reveal caption on hover',
								'sgs-blocks'
							) }
							checked={ captionReveal }
							onChange={ set( 'captionReveal' ) }
							help={ __(
								'Caption slides up into view when the user hovers the image.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					<SelectControl
						label={ __( 'Image size', 'sgs-blocks' ) }
						value={ imageSize }
						options={ IMAGE_SIZE_OPTIONS }
						onChange={ set( 'imageSize' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* Panel 4: Hover Effects */ }
				<ToolsPanel
					label={ __( 'Hover Effects', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							effectHover: 'zoom',
							scaleHover: '',
							imageZoomHover: true,
							transitionDuration: '300',
							transitionEasing: 'ease',
							grayscaleHover: false,
							staggerDelay: 60,
							shadowHover: '',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						hasValue={ () => effectHover !== 'zoom' }
						onDeselect={ () => setAttributes( { effectHover: 'zoom' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Hover effect', 'sgs-blocks' ) }
							value={ effectHover }
							options={ HOVER_EFFECT_OPTIONS }
							onChange={ set( 'effectHover' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
						hasValue={ () => imageZoomHover !== true }
						onDeselect={ () => setAttributes( { imageZoomHover: true } ) }
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
							checked={ imageZoomHover }
							onChange={ set( 'imageZoomHover' ) }
							help={ __(
								'Zooms the image inside the card on hover.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover shadow', 'sgs-blocks' ) }
						hasValue={ () => ( attributes.shadowHover ?? '' ) !== '' }
						onDeselect={ () => setAttributes( { shadowHover: '' } ) }
						isShownByDefault
					>
						<ShadowControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: 'shadowHover',
							} }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover scale (card)', 'sgs-blocks' ) }
						hasValue={ () => scaleHover !== '' }
						onDeselect={ () => setAttributes( { scaleHover: '' } ) }
					>
						<RangeControl
							label={ __( 'Hover scale (card)', 'sgs-blocks' ) }
							value={ parseFloat( scaleHover ) || 1 }
							onChange={ ( val ) =>
								setAttributes( { scaleHover: String( val ) } )
							}
							min={ 1 }
							max={ 1.1 }
							step={ 0.01 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						hasValue={ () => transitionDuration !== '300' }
						onDeselect={ () =>
							setAttributes( { transitionDuration: '300' } )
						}
					>
						<RangeControl
							label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
							value={ parseInt( transitionDuration, 10 ) || 300 }
							onChange={ ( val ) =>
								setAttributes( {
									transitionDuration: String( val ),
								} )
							}
							min={ 100 }
							max={ 1000 }
							step={ 50 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						hasValue={ () => transitionEasing !== 'ease' }
						onDeselect={ () =>
							setAttributes( { transitionEasing: 'ease' } )
						}
					>
						<SelectControl
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							value={ transitionEasing }
							options={ EASING_OPTIONS }
							onChange={ set( 'transitionEasing' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
						hasValue={ () => grayscaleHover !== false }
						onDeselect={ () =>
							setAttributes( { grayscaleHover: false } )
						}
					>
						<ToggleControl
							label={ __( 'Grayscale to colour', 'sgs-blocks' ) }
							checked={ grayscaleHover }
							onChange={ set( 'grayscaleHover' ) }
							help={ __(
								'Desaturates images at rest; restores full colour on hover.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
						hasValue={ () => staggerDelay !== 60 }
						onDeselect={ () => setAttributes( { staggerDelay: 60 } ) }
					>
						<RangeControl
							label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
							help={ __(
								'Each image is delayed by a multiple of this value on entrance.',
								'sgs-blocks'
							) }
							value={ staggerDelay }
							onChange={ set( 'staggerDelay' ) }
							min={ 0 }
							max={ 500 }
							step={ 25 }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				{ /* Panel 6: Carousel (conditional — only when layout = carousel) */ }
				{ 'carousel' === layout && (
					<ToolsPanel
						label={ __( 'Carousel', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								carouselShowArrows: true,
								carouselShowDots: true,
								carouselAutoplay: false,
								carouselSpeed: 5000,
								dragToScroll: false,
								dragMomentum: true,
								loopCarousel: false,
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							hasValue={ () => carouselShowArrows !== true }
							onDeselect={ () => setAttributes( { carouselShowArrows: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show arrows', 'sgs-blocks' ) }
								checked={ carouselShowArrows }
								onChange={ set( 'carouselShowArrows' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show dots', 'sgs-blocks' ) }
							hasValue={ () => carouselShowDots !== true }
							onDeselect={ () => setAttributes( { carouselShowDots: true } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Show dots', 'sgs-blocks' ) }
								checked={ carouselShowDots }
								onChange={ set( 'carouselShowDots' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () => carouselAutoplay !== false }
							onDeselect={ () => setAttributes( { carouselAutoplay: false } ) }
						>
							<ToggleControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								checked={ carouselAutoplay }
								onChange={ set( 'carouselAutoplay' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						{ carouselAutoplay && (
							<ToolsPanelItem
								label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
								hasValue={ () => carouselSpeed !== 5000 }
								onDeselect={ () => setAttributes( { carouselSpeed: 5000 } ) }
							>
								<RangeControl
									label={ __(
										'Autoplay speed (ms)',
										'sgs-blocks'
									) }
									value={ carouselSpeed }
									onChange={ set( 'carouselSpeed' ) }
									min={ 1000 }
									max={ 10000 }
									step={ 500 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ /*
						 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13).
						 * Desktop-only click-and-drag upgrade over the CSS
						 * scroll-snap this layout already renders — touch
						 * keeps its native scroll either way, so this never
						 * needs its own "touch" caveat in the help text.
						 */ }
						<ToolsPanelItem
							label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
							hasValue={ () => dragToScroll !== false }
							onDeselect={ () => setAttributes( { dragToScroll: false } ) }
						>
							<ToggleControl
								label={ __(
									'Drag to scroll (desktop)',
									'sgs-blocks'
								) }
								checked={ dragToScroll }
								onChange={ set( 'dragToScroll' ) }
								help={ __(
									'Lets visitors click and drag with a mouse to scroll the carousel, on top of the usual arrows, dots, swipe and scrollbar.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						{ dragToScroll && (
							<ToolsPanelItem
								label={ __( 'Momentum', 'sgs-blocks' ) }
								hasValue={ () => dragMomentum !== true }
								onDeselect={ () => setAttributes( { dragMomentum: true } ) }
							>
								<ToggleControl
									label={ __( 'Momentum', 'sgs-blocks' ) }
									checked={ dragMomentum }
									onChange={ set( 'dragMomentum' ) }
									help={ __(
										'Carousel keeps coasting briefly after the visitor releases the drag, like a real scroll flick.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>
						) }
						{ /*
						 * Infinite loop (Spec 38 §11 loop FR). Deliberately its
						 * OWN toggle, not gated behind "Drag to scroll" —
						 * Bean's ruling: looping is an independent control,
						 * combinable with drag or used entirely on its own
						 * (native swipe/scrollbar/keyboard still loop with
						 * drag off). Default off, same as drag.
						 */ }
						<ToolsPanelItem
							label={ __( 'Loop', 'sgs-blocks' ) }
							hasValue={ () => loopCarousel !== false }
							onDeselect={ () => setAttributes( { loopCarousel: false } ) }
						>
							<ToggleControl
								label={ __( 'Loop', 'sgs-blocks' ) }
								checked={ loopCarousel }
								onChange={ set( 'loopCarousel' ) }
								help={ __(
									'Scrolling or dragging past the last image continues into the first, and back again — never a dead end.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }
				{ /* Border moved to the "Layout" panel in the Styles tab above
				   (Spec 35 THE PLACEMENT RULE — border is a box-shape property
				   of the `grid` wrapper element, grouped with padding/margin/
				   max-width/gap rather than left as its own ungrouped panel). */ }
			</InspectorControls>

			{ /* ============================================================
			     Live preview canvas
			     ============================================================ */ }
			<div { ...blockProps }>
				{ items.length === 0 && (
					<div className="sgs-gallery-editor__placeholder">
						<p>
							{ __(
								'No media selected. Use the "Images" panel in the sidebar to add photos or videos.',
								'sgs-blocks'
							) }
						</p>
						<MediaGalleryPicker
							value={ [] }
							onChange={ onSelectImages }
							resolveItem={ ( media ) =>
								resolveGalleryMedia( media, imageSize )
							}
							allowedTypes={ [ 'image', 'video' ] }
							addLabel={ __( 'Add media', 'sgs-blocks' ) }
							buttonVariant="primary"
							className="sgs-gallery-editor__media-btn"
						/>
					</div>
				) }

				{ items.length > 0 && (
					<div
						className="sgs-gallery__grid"
						style={ previewGridStyle }
					>
						{ items.map( ( item, index ) => {
							const isVideo =
								item.type === 'video' ||
								( item.mime &&
									item.mime.startsWith( 'video/' ) );
							const itemFit = item.objectFit || 'cover';
							const wrapStyle = {
								...( aspectRatio ? { aspectRatio } : {} ),
								objectFit: itemFit,
								objectPosition:
									'cover' === itemFit
										? focalPointToObjectPosition( item.focalPoint || { x: 0.5, y: 0.5 } )
										: undefined,
								width: '100%',
								display: 'block',
							};
							return (
								<figure
									key={ item._key || item.id || index }
									className="sgs-gallery__item"
									style={
										aspectRatio
											? {
													'--sgs-aspect-ratio':
														aspectRatio,
											  }
											: {}
									}
								>
									<div className="sgs-gallery__img-wrap">
										{ isVideo ? (
											<video
												src={ item.url }
												className="sgs-gallery__img"
												muted
												loop
												playsInline
												style={ wrapStyle }
											/>
										) : (
											<img
												src={ item.url }
												alt={ item.alt || '' }
												className="sgs-gallery__img"
												loading="lazy"
												style={ wrapStyle }
											/>
										) }
									</div>
									{ showCaptions && item.caption && (
										<figcaption className="sgs-gallery__caption">
											{ item.caption }
										</figcaption>
									) }
								</figure>
							);
						} ) }
					</div>
				) }
			</div>
		</>
	);
}
