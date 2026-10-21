/**
 * Card Grid — Card grid canvas: the template-card canvas for product and collection modes, or the manual card grid.
 */

import { __ } from '@wordpress/i18n';
import { useMergeRefs } from '@wordpress/compose';
import { useSettings } from '@wordpress/block-editor';
import { IconPreview } from '../../../components';
import {
	colourVar,
	focalPointToObjectPosition,
	BandWrap,
} from '../../../utils';
import { glyphSizePx } from '../../../utils/font-size-preset';
import ProductTemplateCanvas from './ProductTemplateCanvas';

/**
 * A card's image, video or empty placeholder for the canvas.
 *
 * @param {Object} item           Card item.
 * @param {Object} itemMediaStyle Style object for the media element.
 * @return {JSX.Element} The media element.
 */
function renderMedia( item, itemMediaStyle ) {
	if ( ! item.media?.url ) {
		return <span className="sgs-card-grid__image-placeholder" />;
	}
	if ( item.media.type === 'video' ) {
		return (
			// eslint-disable-next-line jsx-a11y/media-has-caption
			<video
				src={ item.media.url }
				className="sgs-card-grid__image sgs-card-grid__media"
				style={ itemMediaStyle }
				muted
				loop
				playsInline
			/>
		);
	}
	return (
		<img
			src={ item.media.url }
			alt={ item.media.alt || '' }
			className="sgs-card-grid__image sgs-card-grid__media"
			style={ itemMediaStyle }
		/>
	);
}

export default function CardGridCanvas( {
	attributes,
	clientId,
	sep,
	isWcProductMode,
	isCptCollectionMode,
	blockProps,
	pageButtonPreviewCss,
	wrapper,
	gridStyle,
	items,
	cardPreview,
	titleStyle,
	subtitleStyle,
	HeadingTag,
} ) {
	const [ fontSizes ] = useSettings( 'typography.fontSizes' );
	const {
		variant,
		glyphSize,
		glyphColour,
		imageFallback,
		imageFallbackColour,
		noImageLabel,
		noImageLabelColour,
		overlayColour,
		overlayGradient,
		overlayOpacity,
		overlayBlendMode,
		// The settings that pick, page and describe a products-mode grid's products, named one by one: what the canvas
		// sends to POST /sgs/v1/card-grid-items, which runs the page's own queries and returns its pagination and
		// empty-state message (Card_Grid_Items_Rest, Card_Grid_Results).
		source,
		pagination,
		contentType,
		selectionRule,
		count,
		handpickedIds,
		categoryTerm,
		emptyMessage,
		productSource,
		productCollection,
		productLimit,
		productCategories,
		productTags,
		productFeatured,
		productOnSale,
		productInStock,
		productIds,
		productEmptyMessage,
	} = attributes;
	// The separators preview draws on the element whose children are the cards: the band when there is one, else the root.
	const rootRef = useMergeRefs( [
		blockProps.ref,
		wrapper.hasBandProps ? null : sep.ref,
	] );
	const query = {
		source,
		pagination,
		contentType,
		selectionRule,
		count,
		handpickedIds,
		categoryTerm,
		emptyMessage,
		productSource,
		productCollection,
		productLimit,
		productCategories,
		productTags,
		productFeatured,
		productOnSale,
		productInStock,
		productIds,
		productEmptyMessage,
	};

	return (
		<>
			{ /* Card-delegating modes (WooCommerce products / CPT collection): each product rendered as the grid's
			     template card, the products from the same server queries the page runs. */ }
			{ isWcProductMode || isCptCollectionMode ? (
				<>
					{ pageButtonPreviewCss && (
						<style>{ pageButtonPreviewCss }</style>
					) }
					<ProductTemplateCanvas
						query={ query }
						clientId={ clientId }
						blockProps={ blockProps }
						gridStyle={ gridStyle }
						sep={ sep }
					/>
				</>
			) : (
				<div
					{ ...blockProps }
					ref={ rootRef }
					style={ {
						...blockProps.style,
						...wrapper.style,
						...gridStyle,
						...( wrapper.hasBandProps ? {} : sep.style ),
					} }
				>
					<BandWrap
						hasBandProps={ wrapper.hasBandProps }
						bandStyle={
							wrapper.hasBandProps
								? { ...wrapper.bandStyle, ...sep.style }
								: wrapper.bandStyle
						}
						bandRef={ wrapper.hasBandProps ? sep.ref : undefined }
					>
						{ items.length === 0 && (
							<p className="sgs-card-grid__placeholder">
								{ __(
									'Add items in the sidebar to build your grid.',
									'sgs-blocks'
								) }
							</p>
						) }
						{ items.map( ( item ) => {
							const itemMediaStyle = {
								objectFit: item.objectFit || 'cover',
								objectPosition:
									'cover' === ( item.objectFit || 'cover' )
										? focalPointToObjectPosition(
												item.focalPoint || {
													x: 0.5,
													y: 0.5,
												}
										  )
										: undefined,
							};
							// Glyph + image-fallback tile preview — mirrors render.php's
							// item_use_fallback/item_glyph_slug logic so the canvas
							// matches the frontend.
							const hasMedia = !! item.media?.url;
							const useFallback = !! imageFallback && ! hasMedia;
							const wrapClassName = [
								'sgs-card-grid__image-wrap',
								useFallback
									? 'sgs-card-grid__image-wrap--fallback'
									: '',
							]
								.filter( Boolean )
								.join( ' ' );
							const wrapStyle = useFallback
								? {
										backgroundColor:
											colourVar( imageFallbackColour ) ||
											undefined,
								  }
								: undefined;
							const glyphColourValue =
								colourVar( glyphColour ) || undefined;
							// IconPreview's `size` prop is a unitless px number
							// (width/height); the initial-letter span below keeps
							// the raw CSS-length string, which `fontSize` accepts
							// directly.
							const glyphPx = glyphSizePx( glyphSize, fontSizes );
							// Image overlay preview — same rule as render.php: only over a real
							// photo, and only when a colour or gradient is set.
							const overlayPaint =
								overlayGradient || colourVar( overlayColour );
							const overlayOpacityValue =
								'' !== overlayOpacity &&
								null !== overlayOpacity &&
								undefined !== overlayOpacity &&
								! Number.isNaN( Number( overlayOpacity ) )
									? Math.max(
											0,
											Math.min(
												100,
												Number( overlayOpacity )
											)
									  ) / 100
									: undefined;
							const overlayStyle =
								hasMedia && overlayPaint
									? {
											background: overlayPaint,
											opacity: overlayOpacityValue,
											mixBlendMode:
												overlayBlendMode &&
												'normal' !== overlayBlendMode
													? overlayBlendMode
													: undefined,
									  }
									: null;
							// Mirrors render.php: an uploaded image glyph wins over the Lucide
							// slug; in the overlay variant the glyph sits in the caption.
							const glyphInCaption = variant === 'overlay';
							let glyphNode = null;
							if ( item.glyphImage?.url ) {
								glyphNode = (
									<span
										className="sgs-card-grid__glyph sgs-card-grid__glyph--image"
										aria-hidden="true"
										style={ {
											width: glyphSize || '32px',
											height: glyphSize || '32px',
										} }
									>
										<img
											src={ item.glyphImage.url }
											alt=""
										/>
									</span>
								);
							} else if ( item.glyph ) {
								glyphNode = (
									<span
										className="sgs-card-grid__glyph"
										aria-hidden="true"
										style={ { color: glyphColourValue } }
									>
										<IconPreview
											source="lucide"
											name={ item.glyph }
											size={ glyphPx }
										/>
									</span>
								);
							}
							// Mirrors render.php: a text-only card renders no image area.
							const needsWrap =
								hasMedia ||
								useFallback ||
								!! item.glyphImage?.url ||
								!! item.glyph ||
								variant === 'overlay';
							return (
								<div
									key={ item._key }
									className="sgs-card-grid__item"
									style={ cardPreview.itemStyle }
								>
									{ needsWrap && (
										<div
											className={ wrapClassName }
											style={ {
												...wrapStyle,
												...cardPreview.imageWrapStyle,
											} }
										>
											{ renderMedia(
												item,
												itemMediaStyle
											) }
											{ overlayStyle && (
												<span
													className="sgs-card-grid__image-overlay"
													aria-hidden="true"
													style={ overlayStyle }
												/>
											) }
											{ useFallback && noImageLabel && (
												<span
													className="sgs-card-grid__no-image-label"
													style={ {
														...cardPreview.noImageLabelTypography,
														color:
															colourVar(
																noImageLabelColour
															) || undefined,
													} }
												>
													{ noImageLabel }
												</span>
											) }
											{ glyphNode && ! glyphInCaption
												? glyphNode
												: ! glyphNode &&
												  useFallback &&
												  item.title && (
														<span
															className="sgs-card-grid__glyph-initial"
															aria-hidden="true"
															style={ {
																color: glyphColourValue,
																fontSize:
																	glyphSize ||
																	'32px',
																...cardPreview.glyphInitialTypography,
															} }
														>
															{ item.title
																.trim()
																.charAt( 0 )
																.toUpperCase() }
														</span>
												  ) }
											{ variant === 'overlay' && (
												<div
													className="sgs-card-grid__overlay"
													style={
														cardPreview.bodyStyle
													}
												>
													{ glyphInCaption &&
														glyphNode }
													{ item.title && (
														<span
															className="sgs-card-grid__title"
															style={ {
																...cardPreview.titleTypography,
																...( item.subtitle
																	? {
																			marginBottom:
																				cardPreview.titleMarginBottom,
																	  }
																	: {} ),
																...titleStyle,
															} }
														>
															{ item.title }
														</span>
													) }
													{ item.subtitle && (
														<span
															className="sgs-card-grid__subtitle"
															style={ {
																...cardPreview.subtitleTypography,
																...subtitleStyle,
															} }
														>
															{ item.subtitle }
														</span>
													) }
												</div>
											) }
										</div>
									) }
									{ variant === 'card' && (
										<div
											className="sgs-card-grid__body"
											style={ cardPreview.bodyStyle }
										>
											{ item.title && (
												<HeadingTag
													className="sgs-card-grid__title"
													style={ {
														...cardPreview.titleTypography,
														...( item.subtitle ||
														( item.badge &&
															item.badgeVariant )
															? {
																	marginBottom:
																		cardPreview.titleMarginBottom,
															  }
															: {} ),
														...titleStyle,
													} }
												>
													{ item.title }
												</HeadingTag>
											) }
											{ item.subtitle && (
												<p
													className="sgs-card-grid__subtitle"
													style={ {
														...cardPreview.subtitleTypography,
														...subtitleStyle,
													} }
												>
													{ item.subtitle }
												</p>
											) }
											{ item.badge &&
												item.badgeVariant && (
													<span
														className={ `sgs-card-grid__badge sgs-card-grid__badge--${ item.badgeVariant }` }
														style={
															cardPreview.badgeTypography
														}
													>
														{ item.badge }
													</span>
												) }
										</div>
									) }
								</div>
							);
						} ) }
					</BandWrap>
				</div>
			) }
		</>
	);
}
