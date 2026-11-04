/**
 * Post Grid — editor card preview (one React card per post).
 */
import { __ } from '@wordpress/i18n';
import { resolveColourToken } from '../../../components';
import { colourVar, resolveTextColourPreviewStyle, typographyPreviewStyle, isCssGradient, tierBoxLonghands } from '../../../utils';
import { cardGradientPreview } from '../preview-style';

import AuthoredText from '../../../components/AuthoredText';
// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Format a date string as "D MMM YYYY" for the editor preview.
 *
 * @param {string} dateString ISO date string.
 * @return {string} Formatted date.
 */
function formatDate( dateString, phpFormat = '' ) {
	if ( ! dateString ) {
		return '';
	}
	const d = new Date( dateString );
	if ( phpFormat ) {
		const mon = d.toLocaleDateString( 'en-GB', { month: 'short' } );
		const full = d.toLocaleDateString( 'en-GB', { month: 'long' } );
		const pad = ( n ) => String( n ).padStart( 2, '0' );
		const map = { j: d.getDate(), d: pad( d.getDate() ), n: d.getMonth() + 1, m: pad( d.getMonth() + 1 ), M: mon, F: full, Y: d.getFullYear(), y: pad( d.getFullYear() % 100 ) };
		return phpFormat.replace( /\\?(.)/g, ( all, ch ) => ( all.length > 1 ? ch : ( ch in map ? map[ ch ] : ch ) ) );
	}
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
		dateFormat,
		showAuthor,
		showCategory,
		metaLayout,
		categoryPadding,
		categoryRadius,
		contentPadding,
		metaMargin,
		titleMargin,
		excerptMargin,
		readMoreMargin,
		showReadMore,
		readMoreText,
		aspectRatio,
		imageHeight,
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
		imageSize,
		excerptLength,
	} = attributes;

	const featuredImage = post?._embedded?.[ 'wp:featuredmedia' ]?.[ 0 ];
	// The size render.php asks for, falling back to the original file as it does.
	const imageUrl      = featuredImage?.media_details?.sizes?.[ imageSize || 'medium_large' ]?.source_url || featuredImage?.source_url;
	// wp_trim_words(): the first N words, with an ellipsis only when words were cut.
	const excerptWords  = ( post?.excerpt?.rendered || '' ).replace( /(<([^>]+)>)/gi, '' ).trim().split( /\s+/ ).filter( Boolean );
	const excerptMax    = excerptLength || 20;
	const excerptText   = excerptWords.slice( 0, excerptMax ).join( ' ' ) + ( excerptWords.length > excerptMax ? '…' : '' );
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

	// metaLayout 'inline' wraps the flat/minimal category label and the meta line in one flex row, as render_card() does.
	const isInlineLabel = showCategory && firstCat && ( cardStyle === 'flat' || cardStyle === 'minimal' );
	const metaInline    = 'inline' === metaLayout && isInlineLabel;
	const categoryShape = {
		...tierBoxLonghands( categoryPadding, tier, 'padding' ),
		...( categoryRadius ? { borderRadius: categoryRadius } : {} ),
	};
	const metaNode      = ( showDate || showAuthor ) && (
		<div className="sgs-post-grid__meta" style={ { ...metaStyle, ...( metaInline ? {} : tierBoxLonghands( metaMargin, tier, 'margin' ) ), ...typographyPreviewStyle( attributes, 'meta', tier ) } }>
			{ showDate && (
				<time>{ formatDate( post?.date, dateFormat ) }</time>
			) }
			{ showAuthor && authorName && (
				<span className="sgs-post-grid__author">
					{ authorName }
				</span>
			) }
		</div>
	);
	const categoryNode  = isInlineLabel && (
		<span className="sgs-post-grid__category sgs-post-grid__category-badge" style={ { ...badgeStyle, ...categoryShape, ...typographyPreviewStyle( attributes, 'category', tier ) } }>
			{ firstCat.name }
		</span>
	);

	const imageHeightPx = ( 'mobile' === tier ? imageHeight?.mobile || imageHeight?.tablet || imageHeight?.desktop : 'tablet' === tier ? imageHeight?.tablet || imageHeight?.desktop : imageHeight?.desktop ) || '';

	return (
		<article
			className={ `sgs-post-grid__card sgs-post-grid__card--${ cardStyle }` }
			style={ { ...( cardBg ? { '--sgs-card-bg': cardBg } : {} ), ...cardGradientPreview( attributes.cardBgColourGradient ) } }
		>
			{ showImage && featuredImage && (
				<div className="sgs-post-grid__image-link">
					<div
						className="sgs-post-grid__image"
						style={ imageHeightPx ? { height: imageHeightPx, aspectRatio: 'auto' } : ( aspectRatio ? { aspectRatio } : {} ) }
					>
						<img
							src={ imageUrl }
							alt={ imageDecorative ? '' : ( featuredImage.alt_text || '' ) }
							className="sgs-post-grid__img"
							aria-hidden={ imageDecorative || undefined }
						/>
					</div>

					{ showCategory && firstCat && ( cardStyle === 'card' || isOverlay ) && (
						<span className="sgs-post-grid__badge sgs-post-grid__category-badge" style={ { ...badgeFillStyle, ...typographyPreviewStyle( attributes, 'badge', tier ) } }>
							{ firstCat.name }
						</span>
					) }
				</div>
			) }

			<div className="sgs-post-grid__content" style={ tierBoxLonghands( contentPadding, tier, 'padding' ) }>
				{ metaInline ? (
					<div className="sgs-post-grid__meta-row" style={ tierBoxLonghands( metaMargin, tier, 'margin' ) }>
						{ categoryNode }
						{ metaNode }
					</div>
				) : (
					<>
						{ metaNode }
						{ categoryNode }
					</>
				) }

				{ showTitle && (
					<h3 className="sgs-post-grid__title" style={ { ...tierBoxLonghands( titleMargin, tier, 'margin' ), ...typographyPreviewStyle( attributes, 'title', tier ) } }>
						<a href={ post?.link || '#' } style={ titleStyle }>
							{ post?.title?.rendered || __( 'Post title', 'sgs-blocks' ) }
						</a>
					</h3>
				) }

				{ showExcerpt && (
					<p className="sgs-post-grid__excerpt" style={ { ...excStyle, ...tierBoxLonghands( excerptMargin, tier, 'margin' ), ...typographyPreviewStyle( attributes, 'excerpt', tier ) } }>
						{ excerptText || __( 'Post excerpt\u2026', 'sgs-blocks' ) }
					</p>
				) }

				{ showReadMore && (
					<span className="sgs-post-grid__readmore" style={ { ...rmStyle, ...tierBoxLonghands( readMoreMargin, tier, 'margin' ), ...typographyPreviewStyle( attributes, 'readMore', tier ) } }>
						<AuthoredText value={ readMoreText || __( 'Read more', 'sgs-blocks' ) } />{ ' ' }
						<span aria-hidden="true">&rarr;</span>
					</span>
				) }
			</div>
		</article>
	);
}
