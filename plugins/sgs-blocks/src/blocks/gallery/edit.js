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
// file already removed (see the Spec 37 note below) — removed 2026-08-11, Track 1b.
import {
	LayoutPanel,
} from '../container/components/ContainerWrapperControls';
// Spec 37 FR-37-16 object model (Spec 35 Phase 1.4, 2026-08-10). Replaces
// WidthPanel + ResponsiveSpacingPanel here — see the mount below for why.
import { ResponsiveBoxControls } from '../../components';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	RadioControl,
	Spinner,
} from '@wordpress/components';
import { useRef } from '@wordpress/element';
import DesignTokenPicker from '../../components/DesignTokenPicker';
import MediaGalleryPicker from '../../components/MediaGalleryPicker';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import { colourVar, resolveResponsiveTier } from '../../utils';

// -------------------------------------------------------------------------
// Static option arrays (defined outside component to avoid re-creation)
// -------------------------------------------------------------------------

const LAYOUT_OPTIONS = [
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'Masonry', 'sgs-blocks' ), value: 'masonry' },
	{ label: __( 'Carousel', 'sgs-blocks' ), value: 'carousel' },
];

const ASPECT_RATIO_OPTIONS = [
	{ label: __( 'Square (1:1)', 'sgs-blocks' ), value: '1/1' },
	{ label: __( '4:3', 'sgs-blocks' ), value: '4/3' },
	{ label: __( '3:2', 'sgs-blocks' ), value: '3/2' },
	{ label: __( '16:9', 'sgs-blocks' ), value: '16/9' },
	{ label: __( '16:10', 'sgs-blocks' ), value: '16/10' },
	{ label: __( 'Natural (no crop)', 'sgs-blocks' ), value: '' },
];

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
} ) {
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
			/>
			<button
				type="button"
				className="sgs-gallery-editor__thumb-remove"
				onClick={ () => onRemove( index ) }
				aria-label={ __( 'Remove image', 'sgs-blocks' ) }
			>
				&times;
			</button>
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

	const items = mediaItems || [];

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
			{ /* ============================================================
			     Inspector panels
			     ============================================================ */ }
			<InspectorControls>
				<PanelBody title={ __( 'Container / Wrapper', 'sgs-blocks' ) }>
					{ /* showLayout={false}: this block owns its own Layout and Columns
					     controls below — see the import comment. Gap is still wanted. */ }
					<LayoutPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						showLayout={ false }
					/>
				</PanelBody>
				{ /*
				  Spec 37 FR-37-16 object model — ONE panel owning padding, margin,
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
									key={ image.id || index }
									image={ image }
									index={ index }
									onRemove={ removeImage }
									onDragStart={ handleDragStart }
									onDragOver={ () => {} }
									onDrop={ handleDrop }
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
							/>
						) }
					</ResponsiveOverride>
					<SelectControl
						label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ set( 'aspectRatio' ) }
						__nextHasNoMarginBottom
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
					/>
				</PanelBody>

				{ /* Panel 4: Colours */ }
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Caption text colour', 'sgs-blocks' ) }
						value={ captionColour }
						onChange={ set( 'captionColour' ) }
					/>
					<DesignTokenPicker
						label={ __(
							'Caption background colour',
							'sgs-blocks'
						) }
						value={ captionBgColour }
						onChange={ set( 'captionBgColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover overlay colour', 'sgs-blocks' ) }
						value={ overlayColourHover }
						onChange={ set( 'overlayColourHover' ) }
					/>
				</PanelBody>

				{ /* Panel 5: Hover Effects */ }
				<PanelBody
					title={ __( 'Hover Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ set( 'effectHover' ) }
						__nextHasNoMarginBottom
					/>
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
					/>
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
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ EASING_OPTIONS }
						onChange={ set( 'transitionEasing' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Panel 6: Carousel (conditional — only when layout = carousel) */ }
				{ 'carousel' === layout && (
					<PanelBody
						title={ __( 'Carousel', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<ToggleControl
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							checked={ carouselShowArrows }
							onChange={ set( 'carouselShowArrows' ) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Show dots', 'sgs-blocks' ) }
							checked={ carouselShowDots }
							onChange={ set( 'carouselShowDots' ) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							checked={ carouselAutoplay }
							onChange={ set( 'carouselAutoplay' ) }
							__nextHasNoMarginBottom
						/>
						{ carouselAutoplay && (
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
							/>
						) }
						{ /*
						 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13).
						 * Desktop-only click-and-drag upgrade over the CSS
						 * scroll-snap this layout already renders — touch
						 * keeps its native scroll either way, so this never
						 * needs its own "touch" caveat in the help text.
						 */ }
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
						{ dragToScroll && (
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
						) }
						{ /*
						 * Infinite loop (Spec 38 §11 loop FR). Deliberately its
						 * OWN toggle, not gated behind "Drag to scroll" —
						 * Bean's ruling: looping is an independent control,
						 * combinable with drag or used entirely on its own
						 * (native swipe/scrollbar/keyboard still loop with
						 * drag off). Default off, same as drag.
						 */ }
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
					</PanelBody>
				) }
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
							const wrapStyle = aspectRatio
								? {
										aspectRatio,
										objectFit: 'cover',
										width: '100%',
										display: 'block',
								  }
								: { width: '100%', display: 'block' };
							return (
								<figure
									key={ item.id || index }
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
