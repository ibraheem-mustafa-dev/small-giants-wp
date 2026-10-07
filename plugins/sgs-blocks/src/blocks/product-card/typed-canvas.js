/**
 * SGS Product Card — typed-mode editor canvas mirror.
 *
 * Typed mode is the built-in element editor, so its canvas is hand-built JSX
 * rather than the server render. This module builds the styles and the
 * overlay / rating / swatch / attribute-tag elements that
 * includes/product-card-builtin-render.php, render.php and
 * includes/product-card-card-parts.php paint, at the previewed device tier.
 * Bound (live-product) mode renders through ServerSideRender and needs none of it.
 *
 * @package SGS\Blocks
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	backgroundPaintPreview,
	borderPaintPreview,
	boxShorthand,
	resolveTier,
	sgsLengthPreview,
	typographyPreviewStyle,
	textPaintPreview,
	borderRadiusPreview,
	isCssGradient,
	sgsBorderPreview,
} from '../../utils';
import { resolveColourToken } from '../../components';

const CSS_LENGTH = /^(?:[\d.]+(?:%|px|em|rem|vw|vh|ch|ex|fr|cm|mm|in|pt|pc)|calc\([\d.\s+\-*/%a-z()]+\))$/i;
const ASPECTS = [ '16 / 9', '21 / 9', '4 / 3', '1 / 1', '4 / 5', '3 / 4', '9 / 16' ];

const colour = ( value ) => resolveColourToken( value ) || undefined;
const boxOf = ( box ) => boxShorthand( box && 'object' === typeof box ? box : undefined );

// sgs_label_box_css_rule(): padding, radius, background and the full-width switch.
function labelBox( padding, radius, background, fullWidth ) {
	return {
		padding: boxOf( padding ),
		borderRadius: sgsLengthPreview( radius ),
		backgroundColor: colour( background ),
		...( fullWidth ? { display: 'block', width: '100%' } : {} ),
	};
}

function textColour( flat, gradient ) {
	return textPaintPreview( flat, gradient );
}

/**
 * @param {Object} attrs Block attributes.
 * @param {string} tier 'desktop' | 'tablet' | 'mobile'.
 * @return {Object} Style objects and class names per canvas element.
 */
export function typedCardPreview( attrs, tier ) {
	const aspectOk = ASPECTS.includes( attrs.imageAspectRatio );
	const maxWidth = resolveTier( attrs.maxWidth, tier ).value;
	const rowSpace = String( attrs.priceRowSpaceAbove || '' ).trim();
	const swatchSize = Math.min( 40, Math.abs( parseInt( attrs.swatchSize, 10 ) || 0 ) );
	const swatchGrow = Math.min( 200, Math.abs( parseInt( attrs.swatchHoverGrow, 10 ) || 0 ) );
	const cardMaxWidth = String( attrs.cardMaxWidth || '' );


	return {
		rootClasses: [
			false === attrs.showShadow ? 'product-card--flat' : '',
			aspectOk ? 'product-card--image-ratio' : '',
		].filter( Boolean ),
		aspectOk,
		root: {
			...borderRadiusPreview( attrs.borderRadius, tier, { wholeTier: true } ),
			...( maxWidth ? { maxWidth } : {} ),
			'--sgs-product-card-max-width': CSS_LENGTH.test( cardMaxWidth ) ? cardMaxWidth : undefined,
			'--sgs-product-card-image-aspect': aspectOk ? attrs.imageAspectRatio : undefined,
			'--sgs-pc-swatch-size': swatchSize > 0 ? `${ swatchSize }px` : undefined,
			'--sgs-pc-swatch-hover-scale': swatchGrow > 100 ? ( swatchGrow / 100 ).toFixed( 2 ) : undefined,
		},
		body: { padding: boxOf( attrs.cardPadding ) },
		media: attrs.mediaBackgroundColour ? { background: colour( attrs.mediaBackgroundColour ) } : {},
		title: { ...typographyPreviewStyle( attrs, 'title', tier ), ...textColour( attrs.titleColour, attrs.titleColourGradient ) },
		desc: { ...typographyPreviewStyle( attrs, 'desc', tier ), ...textColour( attrs.descColour, attrs.descColourGradient ) },
		price: { ...typographyPreviewStyle( attrs, 'price', tier ), ...textColour( attrs.priceColour, attrs.priceColourGradient ) },
		priceNote: { ...typographyPreviewStyle( attrs, 'priceNote', tier ), ...textColour( attrs.priceNoteColour, attrs.priceNoteColourGradient ) },
		priceRow: /^\d+(\.\d+)?(px|em|rem)$/.test( rowSpace ) ? { paddingTop: rowSpace } : {},
		pill: typographyPreviewStyle( attrs, 'pill', tier ),
		tag: {
			...typographyPreviewStyle( attrs, 'tag', tier ),
			...labelBox( attrs.tagPadding, attrs.tagBorderRadius, attrs.tagBackgroundColour, attrs.tagFullWidth ),
			...( isCssGradient( attrs.tagBackgroundColourGradient ) ? backgroundPaintPreview( '', attrs.tagBackgroundColourGradient ) : {} ),
			...textColour( attrs.tagTextColour, attrs.tagTextColourGradient ),
		},
		brand: {
			...typographyPreviewStyle( attrs, 'brand', tier ),
			padding: boxOf( attrs.brandPadding ),
			color: colour( attrs.brandColour ),
		},
		savingBadge: {
			...typographyPreviewStyle( attrs, 'savingBadge', tier ),
			...labelBox( attrs.savingBadgePadding, attrs.savingBadgeBorderRadius, attrs.savingBadgeBackgroundColour, false ),
			color: colour( attrs.savingBadgeTextColour ),
		},
		attributeTag: {
			...typographyPreviewStyle( attrs, 'attributeTag', tier ),
			...labelBox( attrs.attributeTagPadding, attrs.attributeTagBorderRadius, attrs.attributeTagBackgroundColour, false ),
			color: colour( attrs.attributeTagTextColour ),
			// The chip's stylesheet gives no width, so the border paints only beside a chosen width.
			...sgsBorderPreview( { widthValues: attrs.attributeTagBorderWidth, colourValue: attrs.attributeTagBorderColour }, tier ),
		},
		rating: { color: colour( attrs.ratingColour ) },
		ratingRow: typographyPreviewStyle( attrs, 'rating', tier ),
		ratingStars: { ...typographyPreviewStyle( attrs, 'ratingStars', tier ), color: colour( attrs.ratingColour ) },
		swatch: { borderColor: colour( attrs.swatchBorderColour ) },
		swatchMore: typographyPreviewStyle( attrs, 'swatchMore', tier ),
		// The picker forwards its settings to sgs/option-picker as the same custom properties.
		picker: {
			'--sgs-op-bg': colour( attrs.pickerPillBgColour ),
			'--sgs-op-bg-gradient': isCssGradient( attrs.pickerPillBgColourGradient ) ? attrs.pickerPillBgColourGradient : undefined,
			'--sgs-op-text': colour( attrs.pickerPillTextColour ),
			'--sgs-op-border': colour( attrs.pickerPillBorderColour ),
			'--sgs-op-sel-bg': colour( attrs.pickerPillSelectedBgColour ),
			'--sgs-op-sel-text': colour( attrs.pickerPillSelectedTextColour ),
			'--sgs-op-sel-border': colour( attrs.pickerPillSelectedBorderColour ),
			'--sgs-op-pill-radius': attrs.pickerPillBorderRadius || undefined,
			'--sgs-op-sel-pill-radius': attrs.pickerPillSelectedBorderRadius || undefined,
		},
		pickerClasses: [
			[ 'soft', 'solid' ].includes( attrs.pickerColourPreset ) ? `sgs-option-picker--${ attrs.pickerColourPreset }` : '',
			true === attrs.pickerShowSelectedTick ? '' : 'sgs-option-picker--no-tick',
		].filter( Boolean ),
		pillText: isCssGradient( attrs.pickerPillTextColourGradient )
			? textPaintPreview( '', attrs.pickerPillTextColourGradient )
			: {},
		// The CTA's three gradient siblings (sgs_button_element_style_css()).
		ctaGradients: {
			...( isCssGradient( attrs.ctaColourBackgroundGradient ) ? backgroundPaintPreview( '', attrs.ctaColourBackgroundGradient ) : {} ),
			...( isCssGradient( attrs.ctaColourTextGradient ) ? textPaintPreview( '', attrs.ctaColourTextGradient ) : {} ),
			...borderPaintPreview( '', attrs.ctaColourBorderGradient ),
		},
	};
}

/**
 * Brand wordmark and saving badge over the image (sgs_product_card_brand_markup,
 * _saving_badge_markup).
 *
 * This canvas is typed mode only, and a brand LOGO is live product data: it is
 * resolved per render by includes/product-card-live-fill.php, so a typed card
 * has no logo to draw and always shows the typed brand name. `brandUseLogo`
 * therefore has nothing to mirror here by design - it is not a desynced
 * attribute.
 */
export function TypedMediaOverlays( { attributes: attrs, styles } ) {
	const brand = attrs.showBrandOverlay ? String( attrs.brandName || '' ).trim() : '';
	const saving = attrs.showSavingBadge ? String( attrs.savingLabel || '' ).trim() : '';
	const positions = [ 'top-left', 'top-right', 'bottom-left', 'bottom-right' ];
	const position = positions.includes( attrs.savingBadgePosition ) ? attrs.savingBadgePosition : 'bottom-left';
	return (
		<>
			{ brand && <span className="sgs-product-card__brand" style={ styles.brand }>{ brand }</span> }
			{ saving && (
				<span
					className={ `sgs-product-card__saving-badge sgs-product-card__saving-badge--${ position }` }
					style={ styles.savingBadge }
				>
					{ saving }
				</span>
			) }
		</>
	);
}

/** Star row and review count (sgs_product_card_rating_markup). */
export function TypedRating( { attributes: attrs, styles } ) {
	if ( ! attrs.showRating ) {
		return null;
	}
	const count = Math.max( 0, parseInt( attrs.reviewCount, 10 ) || 0 );
	if ( 0 === count ) {
		const none = String( attrs.noReviewsText || '' ).trim();
		return none ? (
			<div className="sgs-product-card__rating sgs-product-card__rating--empty">
				<span className="sgs-product-card__rating-empty-text">{ none }</span>
			</div>
		) : null;
	}
	const value = Math.max( 0, Math.min( 5, Number( attrs.ratingValue ) || 0 ) );
	return (
		<div className="sgs-product-card__rating" style={ styles.ratingRow }>
			<span className="sgs-product-card__rating-stars" aria-hidden="true" style={ styles.ratingStars }>
				{ '★'.repeat( 5 ) }
			</span>
			<span className="sgs-product-card__rating-text" style={ styles.rating }>
				{ `${ value.toFixed( 1 ) } ` }
				{ sprintf( _n( '(%d review)', '(%d reviews)', count, 'sgs-blocks' ), count ) }
			</span>
		</div>
	);
}

/**
 * Colour dots capped at swatchMaxVisible, then a "+N" pill — the editor-canvas
 * mirror of includes/product-card-swatches.php::sgs_product_card_swatches_markup.
 *
 * The server renders a dot as a real <button> only when the dot knows its own
 * WooCommerce attribute term, which means all three of a term slug, a label and
 * a resolved `_sgsSwatchTaxonomy`. That taxonomy is set only by
 * includes/product-card-live-fill.php, and only when `colourSwatches` is empty
 * — so a swatch an operator typed here always has a synthetic key, never a
 * taxonomy, and is decorative on the frontend too. Decorative <span> is
 * therefore the matching mirror; a live-mode card previews through
 * ServerSideRender and shows the real buttons.
 */
export function TypedSwatches( { attributes: attrs, styles } ) {
	const items = Array.isArray( attrs.colourSwatches ) ? attrs.colourSwatches : [];
	const max = Math.max( 1, parseInt( attrs.swatchMaxVisible, 10 ) || 4 );
	const visible = items.slice( 0, max ).filter( ( item ) => /^#[0-9a-f]{3,6}$/i.test( String( item?.colour || '' ) ) );
	if ( ! visible.length ) {
		return null;
	}
	const hidden = Math.max( 0, items.length - Math.min( items.length, max ) );
	return (
		<div className="sgs-product-card__swatches">
			{ visible.map( ( item, index ) => (
				<span
					key={ index }
					className="sgs-product-card__swatch"
					title={ item.label || undefined }
					style={ { '--sgs-pc-swatch-bg': item.colour, ...styles.swatch } }
				/>
			) ) }
			{ hidden > 0 && (
				<span
					className="sgs-product-card__swatch-more"
					style={ styles.swatchMore }
					aria-label={ sprintf( __( '+%d more colours', 'sgs-blocks' ), hidden ) }
				>
					{ `+${ hidden }` }
				</span>
			) }
		</div>
	);
}

/** The text of the attribute tag beside the title, or '' when it does not show. */
export function attributeTagText( attrs ) {
	if ( ! attrs.showAttributeTag ) {
		return '';
	}
	const term = String( attrs.attributeTagTerm || '' ).trim();
	const bySource = 'tag' === attrs.attributeTagSource ? true : '' !== String( attrs.attributeTagTaxonomy || '' ).trim();
	if ( ! term || ! bySource ) {
		return '';
	}
	const custom = String( attrs.attributeTagText || '' ).trim();
	return custom || term.replace( /[-_]/g, ' ' ).replace( /\b\w/g, ( c ) => c.toUpperCase() );
}
