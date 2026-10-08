/**
 * Gallery live preview canvas: the placeholder or thumbnail grid, inside the content band when one exists.
 */
import { __ } from '@wordpress/i18n';
import MediaGalleryPicker from '../../../components/MediaGalleryPicker';
import { focalPointToObjectPosition } from '../../../utils';
import { resolveGalleryMedia } from '../resolve-gallery-media';

export default function GalleryCanvas( {
	attributes,
	blockProps,
	hasBandProps,
	bandStyle,
	items,
	captionStyle,
	gridStyle,
	separatorsCanvas,
	onSelectImages,
} ) {
	const {
		imageSize,
		aspectRatio,
		showCaptions,
		layout,
		carouselShowArrows,
		carouselShowDots,
	} = attributes;
	// Carousel controls canvas mirror (CHECK A) — render.php emits real
	// `.sgs-gallery__carousel-prev`/`-next` buttons + a `.sgs-gallery__carousel-dots`
	// container as SIBLINGS of `.sgs-gallery__grid`, gated on carouselShowArrows/
	// carouselShowDots respectively (only when layout === 'carousel'). The dots
	// container is empty on the frontend (view.js populates it at runtime) — a
	// fixed small number of placeholder dots is enough to prove the toggle adds/
	// removes the element; it does not need to track the real slide count.
	const carouselControlsPreview = 'carousel' === layout ? (
		<>
			{ carouselShowArrows && (
				<>
					<button
						type="button"
						className="sgs-gallery__carousel-prev"
						aria-label={ __( 'Previous image', 'sgs-blocks' ) }
						tabIndex={ -1 }
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
							<polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
					<button
						type="button"
						className="sgs-gallery__carousel-next"
						aria-label={ __( 'Next image', 'sgs-blocks' ) }
						tabIndex={ -1 }
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
							<polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				</>
			) }
			{ carouselShowDots && (
				<div
					className="sgs-gallery__carousel-dots"
					role="tablist"
					aria-label={ __( 'Gallery navigation', 'sgs-blocks' ) }
				>
					{ [ 0, 1, 2, 3 ].map( ( dotIndex ) => (
						<span
							key={ dotIndex }
							className={ 'sgs-gallery__dot' + ( 0 === dotIndex ? ' sgs-gallery__dot--active' : '' ) }
							aria-hidden="true"
						/>
					) ) }
				</div>
			) }
		</>
	) : null;

	return (
		<>
			{ /* ============================================================
			     Live preview canvas
			     ============================================================ */ }
			{ /* Content band (Layer 2 / `.sgs-container__inner`) — mirrors
			   sgs/container's edit.js: when contentWidth resolves to a real
			   cap (or, on a block that has one, band padding is set), the
			   frontend renders a capped inner band around the block's content
			   rather than applying the cap to the full-bleed outer wrapper.
			   `hasBandProps`/`bandStyle` are computed above via the shared
			   `contentBandPreview()` util so this canvas matches. */ }
			{ hasBandProps ? (
				<div { ...blockProps }>
					<div className="sgs-container__inner" style={ bandStyle }>
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
								ref={ separatorsCanvas.ref }
								className="sgs-gallery__grid"
								style={ gridStyle }
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
												<figcaption className="sgs-gallery__caption" style={ captionStyle }>
													{ item.caption }
												</figcaption>
											) }
										</figure>
									);
								} ) }
							</div>
						) }
						{ carouselControlsPreview }
					</div>
				</div>
			) : (
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
						ref={ separatorsCanvas.ref }
						className="sgs-gallery__grid"
						style={ gridStyle }
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
										<figcaption className="sgs-gallery__caption" style={ captionStyle }>
											{ item.caption }
										</figcaption>
									) }
								</figure>
							);
						} ) }
					</div>
				) }
				{ carouselControlsPreview }
			</div>
		) }
		</>
	);
}
