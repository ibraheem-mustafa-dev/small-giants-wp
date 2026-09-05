/**
 * SGS Post Grid — block editor component.
 *
 * Provides a live post preview via useEntityRecords (no ServerSideRender
 * round-trips) and 8 inspector panels covering every attribute.
 *
 * ⛔ `templateMode` (the container-family allowed-children preset) was
 * declared in block.json but REMOVED (was never wired): this block has no
 * InnerBlocks slot at all — its content is a live query of WP posts/pages
 * rendered as React `PreviewCard`s, not a child-block tree an operator
 * populates. There is nothing for an "allowed children" restriction to
 * apply to. Do not re-add templateMode without first adding a genuine
 * InnerBlocks slot.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	RadioControl,
	Spinner,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import SgsColourPanel from '../../components/SgsColourPanel';
import ShadowControl from '../../components/ShadowControl';
import SgsBooleanField from '../../components/SgsBooleanField';
import SgsMultiSelectField from '../../components/SgsMultiSelectField';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import {
	colourVar,
	resolveResponsiveTier,
	resolveTextColourPreviewStyle,
	resolveShadowPreviewComposed,
} from '../../utils';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { MEDIA_SIZING_RATIO_OPTIONS,
	SgsBorderControl,
	resolveColourToken,
	DesignTokenPicker,
	TypographyControls,
} from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import MediaElementPanel from '../../components/MediaElementPanel';

// -------------------------------------------------------------------------
// Static option arrays (defined outside component to avoid re-creation)
// -------------------------------------------------------------------------

const LAYOUT_OPTIONS = [
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
	{ label: __( 'List', 'sgs-blocks' ), value: 'list' },
	{ label: __( 'Masonry', 'sgs-blocks' ), value: 'masonry' },
	{ label: __( 'Carousel', 'sgs-blocks' ), value: 'carousel' },
];

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
];

const PAGINATION_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Standard (page numbers)', 'sgs-blocks' ), value: 'standard' },
	{ label: __( 'Load More button', 'sgs-blocks' ), value: 'load-more' },
	{ label: __( 'Infinite scroll', 'sgs-blocks' ), value: 'infinite' },
];

const ORDER_BY_OPTIONS = [
	{ label: __( 'Date', 'sgs-blocks' ), value: 'date' },
	{ label: __( 'Title', 'sgs-blocks' ), value: 'title' },
	{ label: __( 'Last modified', 'sgs-blocks' ), value: 'modified' },
	{ label: __( 'Random', 'sgs-blocks' ), value: 'rand' },
	{ label: __( 'Comment count', 'sgs-blocks' ), value: 'comment_count' },
];

const ORDER_OPTIONS = [
	{ label: __( 'Descending (newest first)', 'sgs-blocks' ), value: 'desc' },
	{ label: __( 'Ascending (oldest first)', 'sgs-blocks' ), value: 'asc' },
];

// C19 ratio-mode adoption (2026-08-27) — reuses MediaSizingPanel's shared
// six-value ratio list (spaced format, "16 / 9" etc.) rather than this
// block's own hand-rolled set (which included a "Default" empty-string
// option and unspaced ratios not shared with any other block). render.php
// now whitelists against this exact six-value set, falling back to this
// block's own existing default ('16/10') for anything outside it — so an
// existing ''/`16/10`/`3/2` stored value keeps rendering exactly as before
// rather than breaking.
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

const FILTER_TAXONOMY_OPTIONS = [
	{ label: __( 'Category', 'sgs-blocks' ), value: 'category' },
	{ label: __( 'Tag', 'sgs-blocks' ), value: 'post_tag' },
];

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
function PreviewCard( { post, attributes, palette } ) {
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
		categoryBadgeBgColour,
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

	// categoryBadgeBgColour is a FLAT fill colour with no gradient sibling
	// (block.json — only categoryBadgeColour, the TEXT colour, has one) and
	// only paints `.sgs-post-grid__badge` (card/overlay cardStyle) — style.css
	// gives `.sgs-post-grid__category` (flat/minimal) no background-color rule
	// at all, so the plain category label must not receive this style.
	const badgeBg = categoryBadgeBgColour ? resolveColourToken( categoryBadgeBgColour, palette ) : undefined;
	const badgeFillStyle = badgeBg ? { ...badgeStyle, backgroundColor: badgeBg } : badgeStyle;

	const isOverlay = cardStyle === 'overlay';

	return (
		<article
			className={ `sgs-post-grid__card sgs-post-grid__card--${ cardStyle }` }
			style={ cardBg ? { '--sgs-card-bg': cardBg } : {} }
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
						<span className="sgs-post-grid__badge" style={ badgeFillStyle }>
							{ firstCat.name }
						</span>
					) }
				</div>
			) }

			<div className="sgs-post-grid__content">
				{ ( showDate || showAuthor ) && (
					<div className="sgs-post-grid__meta" style={ metaStyle }>
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
					<span className="sgs-post-grid__category" style={ badgeStyle }>
						{ firstCat.name }
					</span>
				) }

				{ showTitle && (
					<h3 className="sgs-post-grid__title">
						<a href={ post?.link || '#' } style={ titleStyle }>
							{ post?.title?.rendered || __( 'Post title', 'sgs-blocks' ) }
						</a>
					</h3>
				) }

				{ showExcerpt && (
					<p className="sgs-post-grid__excerpt" style={ excStyle }>
						{ post?.excerpt?.rendered
							? post.excerpt.rendered.replace( /(<([^>]+)>)/gi, '' ).slice( 0, 120 ) + '\u2026'
							: __( 'Post excerpt\u2026', 'sgs-blocks' ) }
					</p>
				) }

				{ showReadMore && (
					<span className="sgs-post-grid__readmore" style={ rmStyle }>
						{ readMoreText || __( 'Read more', 'sgs-blocks' ) }{ ' ' }
						<span aria-hidden="true">&rarr;</span>
					</span>
				) }
			</div>
		</article>
	);
}

// -------------------------------------------------------------------------
// Main edit component
// -------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	// categoryBadgeBgColour canvas mirror (CHECK A) — resolveColourToken needs
	// the live theme palette to turn a stored slug into a real CSS colour.
	const [ colourPalette ] = useSettings( 'color.palette' );

	const {
		postType,
		postsPerPage,
		orderBy,
		order,
		categories,
		tags,
		excludeCurrent,
		offset,
		layout,
		cardStyle,
		columns,
		gap,
		aspectRatio,
		imageSize,
		showImage,
		imageDecorative,
		showTitle,
		showExcerpt,
		excerptLength,
		showDate,
		showAuthor,
		showCategory,
		showReadMore,
		readMoreText,
		pagination,
		showFilters,
		filterTaxonomy,
		titleColour,
		titleColourGradient,
		excerptColour,
		excerptColourGradient,
		metaColour,
		metaColourGradient,
		categoryBadgeColour,
		categoryBadgeColourGradient,
		categoryBadgeBgColour,
		readMoreColour,
		readMoreColourGradient,
		cardBgColour,
		cardBgColourGradient,
		backgroundColourHover,
		textColourHover,
		textColourHoverGradient,
		borderColourHover,
		scaleHover,
		shadow,
		shadowColour,
		shadowHover,
		shadowHoverColour,
		imageZoomHover,
		transitionDuration,
		transitionEasing,
		carouselAutoplay,
		carouselSpeed,
		carouselShowDots,
		carouselShowArrows,
		dragToScroll,
		dragMomentum,
		loopCarousel,
	} = attributes;

	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );

	// Live post preview via Entity Records — no server round-trip needed.
	const queryArgs = {
		per_page:   postsPerPage,
		orderby:    orderBy,
		order,
		_embed:     true,
	};
	if ( categories?.length ) {
		queryArgs.categories = categories;
	}
	if ( tags?.length ) {
		queryArgs.tags = tags;
	}

	const { records: posts, isResolving } = useEntityRecords(
		'postType',
		postType,
		queryArgs
	);

	// Load available categories/tags for FormTokenField suggestions.
	const allCategories = useSelect( ( select ) => {
		return select( 'core' ).getEntityRecords( 'taxonomy', 'category', {
			per_page: 100,
			hide_empty: false,
		} );
	}, [] );

	const allTags = useSelect( ( select ) => {
		return select( 'core' ).getEntityRecords( 'taxonomy', 'post_tag', {
			per_page: 100,
			hide_empty: false,
		} );
	}, [] );

	const catSuggestions = ( allCategories || [] ).map( ( c ) => c.name );
	const tagSuggestions = ( allTags || [] ).map( ( t ) => t.name );

	/**
	 * Convert category names chosen in FormTokenField back to IDs.
	 *
	 * @param {string[]} names Array of category name strings.
	 */
	const onCategoriesChange = ( names ) => {
		const ids = names.map( ( name ) => {
			const found = ( allCategories || [] ).find( ( c ) => c.name === name );
			return found ? found.id : null;
		} ).filter( Boolean );
		setAttributes( { categories: ids } );
	};

	/**
	 * Convert tag names chosen in FormTokenField back to IDs.
	 *
	 * @param {string[]} names Array of tag name strings.
	 */
	const onTagsChange = ( names ) => {
		const ids = names.map( ( name ) => {
			const found = ( allTags || [] ).find( ( t ) => t.name === name );
			return found ? found.id : null;
		} ).filter( Boolean );
		setAttributes( { tags: ids } );
	};

	// Resolve selected category/tag names for FormTokenField display.
	const selectedCatNames = ( categories || [] ).map( ( id ) => {
		const found = ( allCategories || [] ).find( ( c ) => c.id === id );
		return found ? found.name : String( id );
	} );

	const selectedTagNames = ( tags || [] ).map( ( id ) => {
		const found = ( allTags || [] ).find( ( t ) => t.id === id );
		return found ? found.name : String( id );
	} );

	// columns is a TIER OBJECT (Spec 35 pass 4) — resolve each tier explicitly,
	// or the preview would emit "--sgs-columns-desktop: [object Object]" and
	// the CSS custom properties would silently fail (D567 class).
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const columnsTabletTier = resolveResponsiveTier( columns, 'tablet' )?.value || 2;
	const columnsMobileTier = resolveResponsiveTier( columns, 'mobile' )?.value || 1;

	// Editor-canvas parity for post-grid's resting card shadow. render.php
	// composes shape (`shadow`) + colour (`shadowColour`) via
	// sgs_shadow_value_composed() into ONE `--sgs-card-shadow` custom property
	// on the block wrapper, inherited by every `.sgs-post-grid__card` child —
	// it is NOT computed per card, so it belongs on the block root style here,
	// not inside PreviewCard. An unset shadow leaves style.css's own
	// `--sgs-card-shadow` default (line 30) untouched, matching render.php.
	const shadowPreview = resolveShadowPreviewComposed( shadow, shadowColour );

	// Wrapper inline styles.
	// gap is now a raw CSS string (e.g. "30px") set by ContainerWrapperControls.
	const inlineStyles = {
		'--sgs-columns-desktop': columnsDesktop,
		'--sgs-columns-tablet':  columnsTabletTier,
		'--sgs-columns-mobile':  columnsMobileTier,
		'--sgs-gap':             gap || '30px',
		...( shadowPreview ? { '--sgs-card-shadow': shadowPreview } : {} ),
	};

	const blockProps = useBlockProps( {
		className: `sgs-post-grid sgs-post-grid--${ layout }`,
		style:     inlineStyles,
	} );

	// -----------------------------------------------------------------------
	// Preview grid layout class for editor.
	// -----------------------------------------------------------------------
	const previewGridStyle = {
		display:             'grid',
		gridTemplateColumns: 'masonry' === layout
			? undefined
			: `repeat( ${ columnsDesktop }, 1fr )`,
		columnCount:         'masonry' === layout ? columnsDesktop : undefined,
		gap:                 gap || '30px',
	};

	return (
		<>
			{ /* D619/D621 — ONE grouped, SGS-OWNED colour panel, mounted FIRST so
			   it sits at the top of the Styles tab. Replaces the old scattered
			   "Colours" ToolsPanel (Panel 6) + the colour rows that used to live
			   in "Hover Effects" (Panel 7).
			   Row shape verified against render.php + class-post-grid-rest.php
			   card_vars_decls() + style.css (2026-08-15):
			   - cardBgColour/backgroundColourHover pair into ONE row (normal +
			     hover) — normal drives the card's --sgs-card-bg; hover is
			     emitted as a real scoped declaration by
			     sgs_emit_state_colour_css() (2026-08-19), not a var.
			     background-color only.
			   - titleColour/excerptColour/metaColour/readMoreColour/
			     categoryBadgeColour/categoryBadgeBgColour are each single-state
			     (normal only) — there is no per-element hover counterpart for
			     any of them.
			   - textColourHover is its OWN hover-only row: ONE attribute drives
			     `color` on FOUR different elements at once on :hover (title
			     link, excerpt, meta, read-more) — it does not pair 1:1 with any
			     single normal-state colour attribute, so it cannot be folded
			     into any of the four rows above without losing that it's a
			     single shared override.
			   - borderColourHover is its OWN hover-only row: drives
			     `border-color` (card/overlay/flat variants) + `border-top-color`
			     (minimal variant) on hover — one colour VALUE fanning out to
			     several declarations, same as textColourHover, but it has no
			     resting/normal border-colour attribute to pair with (this block
			     has no static border-colour attr — hover-only, matching the
			     block.json note on the "card" element). Verified: NEITHER
			     hover attr also touches `background-color`/`box-shadow` as the
			     DB census suggested.
			   - shadowColour/shadowHoverColour share ONE row (normal +
			     hover), same shape as sgs/card-grid's 'card-shadow' row —
			     shadowColour added 2026-08-20 alongside the new resting
			     `shadow` shape attribute to close a STATE_WITHOUT_BASE
			     conformance gap (client could style the hover shadow but not
			     the resting one). Pairs with the shape attributes (shadow +
			     shadowHover, both in the non-colour Hover Effects panel below
			     via ShadowControl); render.php composes shape + colour via
			     sgs_shadow_value_composed() for each state independently. An
			     unset shadow leaves the cardStyle preset's own shadow
			     unchanged (see style.css `--sgs-card-shadow` default). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'title',
						label: __( 'Title colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								gradientValue: titleColourGradient,
								onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'meta',
						label: __( 'Meta colour (date / author)', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: metaColour,
								onChange: ( val ) => setAttributes( { metaColour: val ?? '' } ),
								gradientValue: metaColourGradient,
								onGradientChange: ( val ) => setAttributes( { metaColourGradient: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'category-badge-text',
						label: __( 'Category badge text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: categoryBadgeColour,
								onChange: ( val ) => setAttributes( { categoryBadgeColour: val ?? '' } ),
								gradientValue: categoryBadgeColourGradient,
								onGradientChange: ( val ) => setAttributes( { categoryBadgeColourGradient: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'category-badge-bg',
						label: __( 'Category badge background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: categoryBadgeBgColour,
								onChange: ( val ) => setAttributes( { categoryBadgeBgColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'text-hover',
						label: __( 'Text hover colour (title / excerpt / meta / read more)', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			{ /* ============================================================
			     Inspector panels
			     ============================================================ */ }
			<InspectorControls>

				{ /* Panel 1: Query */ }
				<PanelBody title={ __( 'Query', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Post type', 'sgs-blocks' ) }
						value={ postType }
						options={ [
							{ label: __( 'Posts', 'sgs-blocks' ), value: 'post' },
							{ label: __( 'Pages', 'sgs-blocks' ), value: 'page' },
						] }
						onChange={ set( 'postType' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Posts per page', 'sgs-blocks' ) }
						value={ postsPerPage }
						onChange={ set( 'postsPerPage' ) }
						min={ 1 }
						max={ 24 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Order by', 'sgs-blocks' ) }
						value={ orderBy }
						options={ ORDER_BY_OPTIONS }
						onChange={ set( 'orderBy' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Order', 'sgs-blocks' ) }
						value={ order }
						options={ ORDER_OPTIONS }
						onChange={ set( 'order' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsMultiSelectField
						label={ __( 'Categories', 'sgs-blocks' ) }
						value={ selectedCatNames }
						suggestions={ catSuggestions }
						onChange={ onCategoriesChange }
					/>
					<SgsMultiSelectField
						label={ __( 'Tags', 'sgs-blocks' ) }
						value={ selectedTagNames }
						suggestions={ tagSuggestions }
						onChange={ onTagsChange }
					/>
					<RangeControl
						label={ __( 'Offset', 'sgs-blocks' ) }
						value={ offset }
						onChange={ set( 'offset' ) }
						min={ 0 }
						max={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Exclude current post', 'sgs-blocks' ) }
						checked={ excludeCurrent }
						onChange={ set( 'excludeCurrent' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* Panel 2: Layout */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
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
						  Those siblings are no longer declared by block.json
						  (D338 silent-discard), and a raw number written to
						  `columns` itself coerces the object-typed attr to
						  its default, dropping the whole setting (D563 bug
						  class).
					*/ }
					<ResponsiveOverride
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( obj ) => setAttributes( { columns: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => {
							return (
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
							);
						} }
					</ResponsiveOverride>
					{ /* Gap is provided by the shared ContainerWrapperControls panel below. */ }
				</PanelBody>

				{ /* Panel 3: Content */ }
				<ToolsPanel
					label={ __( 'Content', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							showImage: true,
							imageSize: 'medium_large',
							imageDecorative: false,
							aspectRatio: '16 / 9',
							imageZoomHover: true,
							showTitle: true,
							showExcerpt: true,
							excerptLength: 20,
							showDate: true,
							showAuthor: false,
							showCategory: true,
							showReadMore: true,
							readMoreText: 'Read more',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Show image', 'sgs-blocks' ) }
						hasValue={ () =>
							showImage !== true || imageZoomHover !== true
						}
						onDeselect={ () =>
							setAttributes( {
								showImage: true,
								imageZoomHover: true,
							} )
						}
						isShownByDefault
					>
						<SgsBooleanField
							label={ __( 'Show image', 'sgs-blocks' ) }
							checked={ showImage }
							onChange={ set( 'showImage' ) }
						>
							{ showImage && (
								<>
									{ /* Consolidated in from the "Layout" panel — CO-2 /
									     THE PLACEMENT RULE TIER 1 names "Post image" a
									     declared element; aspect ratio is image-owned. */ }
									<SelectControl
										label={ __( 'Image aspect ratio', 'sgs-blocks' ) }
										value={ aspectRatio }
										options={ ASPECT_RATIO_OPTIONS }
										onChange={ set( 'aspectRatio' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<SelectControl
										label={ __( 'Image size', 'sgs-blocks' ) }
										value={ imageSize }
										options={ IMAGE_SIZE_OPTIONS }
										onChange={ set( 'imageSize' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* 37-media-no-handroll: object-fit for the featured-image <img>
									     (sgs-post-grid__img), one media-atom control covering both the
									     grid-mode and list-mode selectors in style.css — same element,
									     rendered once per card by Post_Grid_REST::render_card(). */ }
									<MediaElementPanel
										attributes={ attributes }
										setAttributes={ setAttributes }
										prefix=""
										blockSlug="sgs/post-grid"
										insertion="element"
										atoms={ [ 'object-fit' ] }
										mediaType="image"
										scope="element"
									/>
									<ToggleControl
										label={ __( 'Featured images are decorative', 'sgs-blocks' ) }
										help={ __(
											'Hides every post’s featured image from screen readers across this whole grid. Turn on only if the images add no information beyond the post title — posts are queried dynamically, so this applies to all cards, not one at a time.',
											'sgs-blocks'
										) }
										checked={ imageDecorative }
										onChange={ set( 'imageDecorative' ) }
										__nextHasNoMarginBottom
									/>
									{ /* Consolidated in from the "Hover Effects" panel —
									     same TIER 1 reason; image zoom on hover is
									     image-owned. */ }
									<ToggleControl
										label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
										checked={ imageZoomHover }
										onChange={ set( 'imageZoomHover' ) }
										__nextHasNoMarginBottom
									/>
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show title', 'sgs-blocks' ) }
						hasValue={ () => showTitle !== true }
						onDeselect={ () => setAttributes( { showTitle: true } ) }
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Show title', 'sgs-blocks' ) }
							checked={ showTitle }
							onChange={ set( 'showTitle' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show excerpt', 'sgs-blocks' ) }
						hasValue={ () =>
							showExcerpt !== true || excerptLength !== 20
						}
						onDeselect={ () =>
							setAttributes( {
								showExcerpt: true,
								excerptLength: 20,
							} )
						}
						isShownByDefault
					>
						<SgsBooleanField
							label={ __( 'Show excerpt', 'sgs-blocks' ) }
							checked={ showExcerpt }
							onChange={ set( 'showExcerpt' ) }
						>
							{ showExcerpt && (
								<>
									<RangeControl
										label={ __( 'Excerpt length (words)', 'sgs-blocks' ) }
										value={ excerptLength }
										onChange={ set( 'excerptLength' ) }
										min={ 5 }
										max={ 80 }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* Moved in from the shared SgsColourPanel (D622 —
									     an element-scoped colour belongs in its own
									     element's TIER 1 panel; "post excerpt" is a
									     declared element whose attrMap claims
									     excerptColour). */ }
									<DesignTokenPicker
										label={ __( 'Excerpt colour', 'sgs-blocks' ) }
										states={ [
											{
												key: 'normal',
												label: __( 'Normal', 'sgs-blocks' ),
												value: excerptColour,
												onChange: ( val ) =>
													setAttributes( { excerptColour: val ?? '' } ),
												linked: true,
												gradientValue: excerptColourGradient,
												onGradientChange: ( val ) =>
													setAttributes( { excerptColourGradient: val ?? '' } ),
											},
										] }
									/>
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show date', 'sgs-blocks' ) }
						hasValue={ () => showDate !== true }
						onDeselect={ () => setAttributes( { showDate: true } ) }
					>
						<ToggleControl
							label={ __( 'Show date', 'sgs-blocks' ) }
							checked={ showDate }
							onChange={ set( 'showDate' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show author', 'sgs-blocks' ) }
						hasValue={ () => showAuthor !== false }
						onDeselect={ () => setAttributes( { showAuthor: false } ) }
					>
						<ToggleControl
							label={ __( 'Show author', 'sgs-blocks' ) }
							checked={ showAuthor }
							onChange={ set( 'showAuthor' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show category', 'sgs-blocks' ) }
						hasValue={ () => showCategory !== true }
						onDeselect={ () => setAttributes( { showCategory: true } ) }
					>
						<ToggleControl
							label={ __( 'Show category', 'sgs-blocks' ) }
							checked={ showCategory }
							onChange={ set( 'showCategory' ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show read more', 'sgs-blocks' ) }
						hasValue={ () =>
							showReadMore !== true ||
							readMoreText !== 'Read more'
						}
						onDeselect={ () =>
							setAttributes( {
								showReadMore: true,
								readMoreText: 'Read more',
							} )
						}
					>
						<SgsBooleanField
							label={ __( 'Show read more', 'sgs-blocks' ) }
							checked={ showReadMore }
							onChange={ set( 'showReadMore' ) }
						>
							{ showReadMore && (
								<>
									<TextControl
										label={ __( 'Read more text', 'sgs-blocks' ) }
										value={ readMoreText }
										onChange={ set( 'readMoreText' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* Moved in from the shared SgsColourPanel (D622). */ }
									<DesignTokenPicker
										label={ __( 'Read more colour', 'sgs-blocks' ) }
										states={ [
											{
												key: 'normal',
												label: __( 'Normal', 'sgs-blocks' ),
												value: readMoreColour,
												onChange: ( val ) =>
													setAttributes( { readMoreColour: val ?? '' } ),
												linked: true,
												gradientValue: readMoreColourGradient,
												onGradientChange: ( val ) =>
													setAttributes( { readMoreColourGradient: val ?? '' } ),
											},
										] }
									/>
								</>
							) }
						</SgsBooleanField>
					</ToolsPanelItem>
				</ToolsPanel>

				{ /* Panel 4: Card Style */ }
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ false }>
					<RadioControl
						label={ __( 'Style', 'sgs-blocks' ) }
						selected={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ set( 'cardStyle' ) }
					/>
					{ /* Moved in from the shared SgsColourPanel (D622 — an
					     element-scoped colour belongs in its own element's
					     TIER 1 panel; "post card" is a declared element whose
					     attrMap claims cardBgColour/backgroundColourHover/
					     borderColourHover). */ }
					<DesignTokenPicker
						label={ __( 'Card background colour', 'sgs-blocks' ) }
						gradientCapable={ true }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardBgColour,
								onChange: ( val ) => setAttributes( { cardBgColour: val ?? '' } ),
								gradientValue: cardBgColourGradient,
								onGradientChange: ( val ) => setAttributes( { cardBgColourGradient: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Card border hover colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					{ /* Consolidated in from the "Hover Effects" panel — CO-2 /
					     THE PLACEMENT RULE TIER 1 names "Post card" a declared
					     element; scale + shadow (base & hover) are card-owned. */ }
					<RangeControl
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						value={ parseFloat( scaleHover ) || 1 }
						onChange={ ( val ) => setAttributes( { scaleHover: String( val ) } ) }
						min={ 1 }
						max={ 1.1 }
						step={ 0.01 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadow',
							colour: 'shadowColour',
						} }
					/>
					<ShadowControl
						label={ __( 'Hover shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadowHover',
							colour: 'shadowHoverColour',
						} }
					/>
				</PanelBody>

				{ /* Panel 5: Pagination & Filters */ }
				<PanelBody title={ __( 'Pagination & Filters', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Pagination', 'sgs-blocks' ) }
						value={ pagination }
						options={ PAGINATION_OPTIONS }
						onChange={ set( 'pagination' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show filter buttons', 'sgs-blocks' ) }
						checked={ showFilters }
						onChange={ set( 'showFilters' ) }
						__nextHasNoMarginBottom
					/>
					{ showFilters && (
						<SelectControl
							label={ __( 'Filter taxonomy', 'sgs-blocks' ) }
							value={ filterTaxonomy }
							options={ FILTER_TAXONOMY_OPTIONS }
							onChange={ set( 'filterTaxonomy' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				{ /* Panel 6: Hover Effects — colours moved to the top-level
				   SgsColourPanel (D619/D621). This ToolsPanel holds the
				   non-colour hover behaviours PLUS the resting shadow shape
				   (shadow/shadowColour, added 2026-08-20 to close a
				   STATE_WITHOUT_BASE gap — mirrors the shadowHover pair,
				   ordered rest-then-hover so the reading order matches the
				   render.php/style.css cascade). */ }
				<ToolsPanel
					label={ __( 'Hover Effects', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							imageZoomHover: true,
							transitionDuration: '300',
							transitionEasing: 'ease',
						} )
					}
				>
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
							onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
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
				</ToolsPanel>

				{ /* Panel: Container wrapper (WS-4 mirror) */ }
				{ /* showLayout={false}: this block owns its own Layout control
				     above (Grid / List / Masonry / Carousel). The shared one
				     writes stack/flex/grid into the same `layout` attr, so
				     "list"/"masonry"/"carousel" were unreachable from it and a
				     "flex"/"stack" write was silently coerced back to "grid" by
				     WordPress. render.php:539 already unsets `layout` before
				     handing attributes to the wrapper for the same collision —
				     this closes the editor half. Same fix as sgs/gallery. */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
					showLayout={ false }
				/>

				{ /* Panel 8: Carousel (conditional) — converted to ToolsPanel (S7 pilot, 2026-09-02, item 03). */ }
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
									label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
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
						 * Draggable + Inertia opt-in (Spec 38 FR-38-13),
						 * mirroring sgs/gallery. Desktop-only click-and-drag
						 * layered over the CSS scroll-snap this layout already
						 * renders — touch keeps its native scroll either way,
						 * so no "touch" caveat belongs in the help text.
						 */ }
						<ToolsPanelItem
							label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
							hasValue={ () => dragToScroll !== false }
							onDeselect={ () => setAttributes( { dragToScroll: false } ) }
						>
							<ToggleControl
								label={ __( 'Drag to scroll (desktop)', 'sgs-blocks' ) }
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
									'Scrolling or dragging past the last post continues into the first, and back again — never a dead end.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }

			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* Typography — replaces the old WP-native supports.typography
				    (fontSize/lineHeight only, targeted at .sgs-post-grid__title via
				    block.json selectors.typography) with the shared TypographyControls
				    component + sgs_typography_css_rule() render.php helper (D971/D972
				    full-replacement track). Prefix "title" since the native support's
				    actual target was the post title, not the block root — defaults
				    also now expose weight/style, which native typography never offered
				    here. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="title"
					/>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
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
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ============================================================
			     Live preview canvas
			     ============================================================ */ }
			<div { ...blockProps }>
				{ isResolving && (
					<div className="sgs-post-grid-editor__loading">
						<Spinner />
						<span>{ __( 'Loading posts\u2026', 'sgs-blocks' ) }</span>
					</div>
				) }

				{ ! isResolving && ( ! posts || posts.length === 0 ) && (
					<div className="sgs-post-grid-editor__placeholder">
						<p>{ __( 'No posts found. Adjust the Query settings in the sidebar.', 'sgs-blocks' ) }</p>
					</div>
				) }

				{ ! isResolving && posts && posts.length > 0 && (
					<div
						className="sgs-post-grid__inner"
						style={ previewGridStyle }
					>
						{ posts.map( ( post ) => (
							<PreviewCard
								key={ post.id }
								post={ post }
								attributes={ attributes }
								palette={ colourPalette }
							/>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
