/**
 * Post Grid — editor card preview (one React card per post).
 */
import { __ } from '@wordpress/i18n';
import { resolveColourToken } from '../../../components';
import { colourVar, resolveTextColourPreviewStyle, typographyPreviewStyle, isCssGradient } from '../../../utils';
import { cardGradientPreview } from '../preview-style';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Format a date string as "D MMM YYYY" for the editor preview.
 *
 * @param {string} dateString ISO date string.
 * @return {string} Formatted date.
 */
function formatDate( dateString ) {
	if ( ! dateString ) {
		return '';
	}
	const d = new Date( dateString );
	return d.toLocaleDateString( 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' } );
}

// -------------------------------------------------------------------------
// Editor card preview (React — mirrors render.php structure visually)
// -------------------------------------------------------------------------

/**
 * A single post card rendered in the editor via React.
 *
 * Mirrors the visual structure of Post_Grid_REST::render_card() output.
 * Not an exact clone — just close enough for the editor preview.
 *
 * @param {Object} props
 * @param {Object} props.post       WP post record from useEntityRecords.
 * @param {Object} props.attributes Block attributes.
 */
export default function PreviewCard( { post, attributes, palette, tier } ) {
	const {
		cardStyle,
		showImage,
		showTitle,
		showExcerpt,
		showDate,
		showAuthor,
		showCategory,
		showReadMore,
		readMoreText,
		aspectRatio,
		titleColour,
		titleColourGradient,
		excerptColour,
		excerptColourGradient,
		metaColour,
		metaColourGradient,
		categoryBadgeColour,
		categoryBadgeColourGradient,
		categoryBadgeColourHover,
		categoryBadgeBgColour,
		categoryBadgeBgColourGradient,
		categoryBadgeBgColourHover,
		categoryBadgeBgColourHoverGradient,
		readMoreColour,
		readMoreColourGradient,
		cardBgColour,
		imageDecorative,
	} = attributes;

	const featuredImage = post?._embedded?.[ 'wp:featuredmedia' ]?.[ 0 ];
	const authorName    = post?._embedded?.author?.[ 0 ]?.name || '';
	const categories    = post?._embedded?.[ 'wp:term' ]?.[ 0 ] || [];
	const firstCat      = categories[ 0 ];

	const cardBg     = cardBgColour ? colourVar( cardBgColour ) : undefined;
	const titleStyle = resolveTextColourPreviewStyle( titleColour, titleColourGradient, colourVar );
	const excStyle   = resolveTextColourPreviewStyle( excerptColour, excerptColourGradient, colourVar );
	const metaStyle  = resolveTextColourPreviewStyle( metaColour, metaColourGradient, colourVar );
	const badgeStyle = resolveTextColourPreviewStyle( categoryBadgeColour, categoryBadgeColourGradient, colourVar );
	const rmStyle    = resolveTextColourPreviewStyle( readMoreColour, readMoreColourGradient, colourVar );

	// categoryBadgeBgColour + categoryBadgeBgColourGradient form a 2-state
	// (resting + hover) x 2-form (flat + gradient) system. The resting state
	// paints `.sgs-post-grid__badge` (card/overlay cardStyle) — style.css
	// gives `.sgs-post-grid__category` (flat/minimal) no background-color rule
	// at all, so the plain category label must not receive this style.
	// Editor preview mirrors the render.php logic: emits the gradient if
	// present (as background-image), otherwise falls back to the flat colour.
	const badgeBg = isCssGradient( categoryBadgeBgColourGradient )
		? { backgroundImage: categoryBadgeBgColourGradient, backgroundColor: 'transparent' }
		: categoryBadgeBgColour ? { backgroundColor: resolveColourToken( categoryBadgeBgColour, palette ) } : {};
	const badgeFillStyle = { ...badgeStyle, ...badgeBg };

	const isOverlay = cardStyle === 'overlay';

	return (
		<article
			className={ `sgs-post-grid__card sgs-post-grid__card--${ cardStyle }` }
			style={ { ...( cardBg ? { '--sgs-card-bg': cardBg } : {} ), ...cardGradientPreview( attributes.cardBgColourGradient ) } }
		>
			{ showImage && featuredImage && (
				<div className="sgs-post-grid__image-link">
					<div
						className="sgs-post-grid__image"
						style={ aspectRatio ? { aspectRatio } : {} }
					>
						<img
							src={ featuredImage.source_url }
							alt={ imageDecorative ? '' : ( featuredImage.alt_text || '' ) }
							className="sgs-post-grid__img"
							aria-hidden={ imageDecorative || undefined }
						/>
					</div>

					{ showCategory && firstCat && ( cardStyle === 'card' || isOverlay ) && (
						<span className="sgs-post-grid__badge" style={ { ...badgeFillStyle, ...typographyPreviewStyle( attributes, 'badge', tier ) } }>
							{ firstCat.name }
						</span>
					) }
				</div>
			) }

			<div className="sgs-post-grid__content">
				{ ( showDate || showAuthor ) && (
					<div className="sgs-post-grid__meta" style={ { ...metaStyle, ...typographyPreviewStyle( attributes, 'meta', tier ) } }>
						{ showDate && (
							<time>{ formatDate( post?.date ) }</time>
						) }
						{ showAuthor && authorName && (
							<span className="sgs-post-grid__author">
								{ authorName }
							</span>
						) }
					</div>
				) }

				{ showCategory && firstCat && ( cardStyle === 'flat' || cardStyle === 'minimal' ) && (
					<span className="sgs-post-grid__category" style={ { ...badgeStyle, ...typographyPreviewStyle( attributes, 'category', tier ) } }>
						{ firstCat.name }
					</span>
				) }

				{ showTitle && (
					<h3 className="sgs-post-grid__title" style={ typographyPreviewStyle( attributes, 'title', tier ) }>
						<a href={ post?.link || '#' } style={ titleStyle }>
							{ post?.title?.rendered || __( 'Post title', 'sgs-blocks' ) }
						</a>
					</h3>
				) }

				{ showExcerpt && (
					<p className="sgs-post-grid__excerpt" style={ { ...excStyle, ...typographyPreviewStyle( attributes, 'excerpt', tier ) } }>
						{ post?.excerpt?.rendered
							? post.excerpt.rendered.replace( /(<([^>]+)>)/gi, '' ).slice( 0, 120 ) + '\u2026'
							: __( 'Post excerpt\u2026', 'sgs-blocks' ) }
					</p>
				) }

				{ showReadMore && (
					<span className="sgs-post-grid__readmore" style={ { ...rmStyle, ...typographyPreviewStyle( attributes, 'readMore', tier ) } }>
						{ readMoreText || __( 'Read more', 'sgs-blocks' ) }{ ' ' }
						<span aria-hidden="true">&rarr;</span>
					</span>
				) }
			</div>
		</article>
	);
}
