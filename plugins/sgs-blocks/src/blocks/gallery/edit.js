/**
 * SGS Image Gallery — block editor component.
 *
 * Provides a live image preview via the images attribute array, with
 * MediaUpload for multi-image selection, drag-to-reorder thumbnails,
 * and inspector panels covering layout, colours, hover, and carousel options.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	RadioControl,
	Button,
	Spinner,
} from '@wordpress/components';
import { useRef } from '@wordpress/element';
import DesignTokenPicker from '../../components/DesignTokenPicker';
import ResponsiveControl from '../../components/ResponsiveControl';
import { colourVar } from '../../utils';

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

// -------------------------------------------------------------------------
// Drag-to-reorder thumbnail strip
// -------------------------------------------------------------------------

/**
 * A single draggable thumbnail in the image picker strip.
 *
 * @param {Object}   props
 * @param {Object}   props.image    Image data object.
 * @param {number}   props.index    Position in the images array.
 * @param {Function} props.onRemove Called when the remove button is clicked.
 * @param {Function} props.onDragStart Called when drag begins.
 * @param {Function} props.onDragOver Called when dragged over this item.
 * @param {Function} props.onDrop Called when dropped on this item.
 */
function GalleryThumbnail( { image, index, onRemove, onDragStart, onDragOver, onDrop } ) {
	return (
		<div
			className="sgs-gallery-editor__thumb"
			draggable
			onDragStart={ () => onDragStart( index ) }
			onDragOver={ ( e ) => { e.preventDefault(); onDragOver( index ); } }
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

export default function Edit( { attributes, setAttributes } ) {
	const {
		images,
		layout,
		columns,
		columnsTablet,
		columnsMobile,
		gap,
		aspectRatio,
		enableLightbox,
		showCaptions,
		captionColour,
		captionBgColour,
		hoverOverlayColour,
		hoverScale,
		hoverImageZoom,
		transitionDuration,
		transitionEasing,
		carouselAutoplay,
		carouselSpeed,
		carouselShowDots,
		carouselShowArrows,
		imageSize,
	} = attributes;

	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );

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
		const newImages = [ ...images ];
		const [ moved ] = newImages.splice( sourceIndex, 1 );
		newImages.splice( targetIndex, 0, moved );
		setAttributes( { images: newImages } );
		dragSourceIndex.current = null;
	};

	/**
	 * Remove a single image from the gallery.
	 *
	 * @param {number} index Index to remove.
	 */
	const removeImage = ( index ) => {
		const newImages = images.filter( ( _, i ) => i !== index );
		setAttributes( { images: newImages } );
	};

	/**
	 * Handle image selection from MediaUpload.
	 * Maps WordPress media objects to our compact image data structure.
	 *
	 * @param {Object[]} selectedMedia Array of WP media objects.
	 */
	const onSelectImages = ( selectedMedia ) => {
		const mapped = selectedMedia.map( ( media ) => ( {
			id:      media.id,
			url:     media.sizes?.[ imageSize ]?.url || media.sizes?.large?.url || media.url,
			fullUrl: media.sizes?.full?.url || media.url,
			alt:     media.alt || '',
			caption: media.caption || '',
			width:   media.width  || 0,
			height:  media.height || 0,
		} ) );
		setAttributes( { images: mapped } );
	};

	// Wrapper inline styles — CSS custom properties for layout.
	const inlineStyles = {
		'--sgs-columns-desktop': columns,
		'--sgs-columns-tablet':  columnsTablet,
		'--sgs-columns-mobile':  columnsMobile,
		'--sgs-gap':             gap + 'px',
		'--sgs-transition-duration': transitionDuration + 'ms',
		'--sgs-transition-easing':   transitionEasing,
	};

	if ( hoverScale ) {
		inlineStyles[ '--sgs-hover-scale' ] = hoverScale;
	}
	if ( hoverOverlayColour ) {
		inlineStyles[ '--sgs-hover-overlay' ] = colourVar( hoverOverlayColour );
	}
	if ( captionColour ) {
		inlineStyles[ '--sgs-caption-colour' ] = colourVar( captionColour );
	}
	if ( captionBgColour ) {
		inlineStyles[ '--sgs-caption-bg' ] = colourVar( captionBgColour );
	}

	const blockProps = useBlockProps( {
		className: `sgs-gallery sgs-gallery--${ layout }`,
		style:     inlineStyles,
	} );

	// Grid columns style for the editor preview.
	const previewGridStyle = {
		display:             layout === 'masonry' ? 'block' : 'grid',
		gridTemplateColumns: layout === 'grid' || layout === 'carousel'
			? `repeat( ${ columns }, 1fr )`
			: undefined,
		columnCount:         layout === 'masonry' ? columns : undefined,
		gap:                 gap + 'px',
	};

	return (
		<>
			{ /* ============================================================
			     Inspector panels
			     ============================================================ */ }
			<InspectorControls>

				{ /* Panel 1: Images */ }
				<PanelBody title={ __( 'Images', 'sgs-blocks' ) } initialOpen={ true }>
					<p className="sgs-gallery-editor__panel-note">
						{ __( 'Select multiple images from the Media Library. Drag thumbnails to reorder.', 'sgs-blocks' ) }
					</p>

					{ images.length > 0 && (
						<div
							className="sgs-gallery-editor__thumbs"
							role="list"
							aria-label={ __( 'Gallery images', 'sgs-blocks' ) }
						>
							{ images.map( ( image, index ) => (
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

					<MediaUploadCheck>
						<MediaUpload
							onSelect={ onSelectImages }
							allowedTypes={ [ 'image' ] }
							multiple={ true }
							gallery={ true }
							value={ images.map( ( img ) => img.id ) }
							render={ ( { open } ) => (
								<Button
									onClick={ open }
									variant="secondary"
									className="sgs-gallery-editor__media-btn"
								>
									{ images.length > 0
										? __( 'Edit gallery', 'sgs-blocks' )
										: __( 'Add images', 'sgs-blocks' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>

					{ images.length > 0 && (
						<p className="sgs-gallery-editor__panel-note" style={ { marginTop: '8px' } }>
							{ images.length }{ ' ' }{ images.length === 1
								? __( 'image selected', 'sgs-blocks' )
								: __( 'images selected', 'sgs-blocks' ) }
						</p>
					) }
				</PanelBody>

				{ /* Panel 2: Layout */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<RadioControl
						label={ __( 'Layout', 'sgs-blocks' ) }
						selected={ layout }
						options={ LAYOUT_OPTIONS }
						onChange={ set( 'layout' ) }
					/>
					<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<RangeControl
								label={ __( 'Columns', 'sgs-blocks' ) }
								hideLabelFromVision
								value={
									breakpoint === 'desktop' ? columns
										: breakpoint === 'tablet' ? columnsTablet
										: columnsMobile
								}
								onChange={ ( val ) => {
									if ( breakpoint === 'desktop' ) {
										setAttributes( { columns: val } );
									} else if ( breakpoint === 'tablet' ) {
										setAttributes( { columnsTablet: val } );
									} else {
										setAttributes( { columnsMobile: val } );
									}
								} }
								min={ 1 }
								max={ 6 }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveControl>
					<RangeControl
						label={ __( 'Gap (px)', 'sgs-blocks' ) }
						value={ parseInt( gap, 10 ) || 16 }
						onChange={ ( val ) => setAttributes( { gap: String( val ) } ) }
						min={ 0 }
						max={ 80 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ set( 'aspectRatio' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Panel 3: Content */ }
				<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Enable lightbox', 'sgs-blocks' ) }
						checked={ enableLightbox }
						onChange={ set( 'enableLightbox' ) }
						help={ __( 'Open images in a full-screen lightbox on click.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show captions', 'sgs-blocks' ) }
						checked={ showCaptions }
						onChange={ set( 'showCaptions' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Image size', 'sgs-blocks' ) }
						value={ imageSize }
						options={ IMAGE_SIZE_OPTIONS }
						onChange={ set( 'imageSize' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Panel 4: Colours */ }
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Caption text colour', 'sgs-blocks' ) }
						value={ captionColour }
						onChange={ set( 'captionColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Caption background colour', 'sgs-blocks' ) }
						value={ captionBgColour }
						onChange={ set( 'captionBgColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover overlay colour', 'sgs-blocks' ) }
						value={ hoverOverlayColour }
						onChange={ set( 'hoverOverlayColour' ) }
					/>
				</PanelBody>

				{ /* Panel 5: Hover Effects */ }
				<PanelBody title={ __( 'Hover Effects', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Hover scale (card)', 'sgs-blocks' ) }
						value={ parseFloat( hoverScale ) || 1 }
						onChange={ ( val ) => setAttributes( { hoverScale: String( val ) } ) }
						min={ 1 }
						max={ 1.1 }
						step={ 0.01 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
						checked={ hoverImageZoom }
						onChange={ set( 'hoverImageZoom' ) }
						help={ __( 'Zooms the image inside the card on hover.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( transitionDuration, 10 ) || 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
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
					<PanelBody title={ __( 'Carousel', 'sgs-blocks' ) } initialOpen={ false }>
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
								label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
								value={ carouselSpeed }
								onChange={ set( 'carouselSpeed' ) }
								min={ 1000 }
								max={ 10000 }
								step={ 500 }
								__nextHasNoMarginBottom
							/>
						) }
					</PanelBody>
				) }

			</InspectorControls>

			{ /* ============================================================
			     Live preview canvas
			     ============================================================ */ }
			<div { ...blockProps }>
				{ images.length === 0 && (
					<div className="sgs-gallery-editor__placeholder">
						<p>{ __( 'No images selected. Use the "Images" panel in the sidebar to add photos.', 'sgs-blocks' ) }</p>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectImages }
								allowedTypes={ [ 'image' ] }
								multiple={ true }
								gallery={ true }
								value={ [] }
								render={ ( { open } ) => (
									<Button
										onClick={ open }
										variant="primary"
										className="sgs-gallery-editor__media-btn"
									>
										{ __( 'Add images', 'sgs-blocks' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					</div>
				) }

				{ images.length > 0 && (
					<div
						className="sgs-gallery__grid"
						style={ previewGridStyle }
					>
						{ images.map( ( image, index ) => (
							<figure
								key={ image.id || index }
								className="sgs-gallery__item"
								style={ aspectRatio ? { '--sgs-aspect-ratio': aspectRatio } : {} }
							>
								<div className="sgs-gallery__img-wrap">
									<img
										src={ image.url }
										alt={ image.alt || '' }
										className="sgs-gallery__img"
										loading="lazy"
										style={ aspectRatio
											? { aspectRatio, objectFit: 'cover', width: '100%', display: 'block' }
											: { width: '100%', display: 'block' }
										}
									/>
								</div>
								{ showCaptions && image.caption && (
									<figcaption className="sgs-gallery__caption">
										{ image.caption }
									</figcaption>
								) }
							</figure>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
