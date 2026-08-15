/**
 * SGS Post Grid — block editor component.
 *
 * Provides a live post preview via useEntityRecords (no ServerSideRender
 * round-trips) and 8 inspector panels covering every attribute.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	RadioControl,
	FormTokenField,
	Spinner,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import SgsColourPanel from '../../components/SgsColourPanel';
import ResponsiveOverride from '../../components/ResponsiveOverride';
import { colourVar, resolveResponsiveTier } from '../../utils';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

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

const ASPECT_RATIO_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( '16:9', 'sgs-blocks' ), value: '16/9' },
	{ label: __( '16:10', 'sgs-blocks' ), value: '16/10' },
	{ label: __( '4:3', 'sgs-blocks' ), value: '4/3' },
	{ label: __( '1:1 (square)', 'sgs-blocks' ), value: '1/1' },
	{ label: __( '3:2', 'sgs-blocks' ), value: '3/2' },
];

const IMAGE_SIZE_OPTIONS = [
	{ label: __( 'Thumbnail (150×150)', 'sgs-blocks' ), value: 'thumbnail' },
	{ label: __( 'Medium (300×300)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Medium large (768w)', 'sgs-blocks' ), value: 'medium_large' },
	{ label: __( 'Large (1024×1024)', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'Full size', 'sgs-blocks' ), value: 'full' },
];

const SHADOW_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Subtle', 'sgs-blocks' ), value: '0 4px 12px rgba(0,0,0,0.1)' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: '0 8px 24px rgba(0,0,0,0.15)' },
	{ label: __( 'Strong', 'sgs-blocks' ), value: '0 12px 40px rgba(0,0,0,0.25)' },
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
function PreviewCard( { post, attributes } ) {
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
		excerptColour,
		metaColour,
		readMoreColour,
		cardBgColour,
	} = attributes;

	const featuredImage = post?._embedded?.[ 'wp:featuredmedia' ]?.[ 0 ];
	const authorName    = post?._embedded?.author?.[ 0 ]?.name || '';
	const categories    = post?._embedded?.[ 'wp:term' ]?.[ 0 ] || [];
	const firstCat      = categories[ 0 ];

	const cardBg     = cardBgColour ? colourVar( cardBgColour ) : undefined;
	const titleStyle = titleColour  ? { color: colourVar( titleColour )   } : {};
	const excStyle   = excerptColour ? { color: colourVar( excerptColour ) } : {};
	const metaStyle  = metaColour   ? { color: colourVar( metaColour )    } : {};
	const rmStyle    = readMoreColour ? { color: colourVar( readMoreColour ) } : {};

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
							alt={ featuredImage.alt_text || '' }
							className="sgs-post-grid__img"
						/>
					</div>

					{ showCategory && firstCat && ( cardStyle === 'card' || isOverlay ) && (
						<span className="sgs-post-grid__badge">
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
					<span className="sgs-post-grid__category">
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
		excerptColour,
		metaColour,
		categoryBadgeColour,
		categoryBadgeBgColour,
		readMoreColour,
		cardBgColour,
		backgroundColourHover,
		textColourHover,
		borderColourHover,
		scaleHover,
		shadowHover,
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

	// Wrapper inline styles.
	// gap is now a raw CSS string (e.g. "30px") set by ContainerWrapperControls.
	const inlineStyles = {
		'--sgs-columns-desktop': columnsDesktop,
		'--sgs-columns-tablet':  columnsTabletTier,
		'--sgs-columns-mobile':  columnsMobileTier,
		'--sgs-gap':             gap || '30px',
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
			     hover) — both drive the card's --sgs-card-bg / --sgs-hover-bg,
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
			     DB census suggested — box-shadow is driven separately by the
			     unrelated `shadowHover` attribute (kept in the non-colour Hover
			     Effects panel below). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'card-bg',
						label: __( 'Card background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: cardBgColour,
								onChange: ( val ) => setAttributes( { cardBgColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'title',
						label: __( 'Title colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'excerpt',
						label: __( 'Excerpt colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: excerptColour,
								onChange: ( val ) => setAttributes( { excerptColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'meta',
						label: __( 'Meta colour (date / author)', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: metaColour,
								onChange: ( val ) => setAttributes( { metaColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'category-badge-text',
						label: __( 'Category badge text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: categoryBadgeColour,
								onChange: ( val ) => setAttributes( { categoryBadgeColour: val ?? '' } ),
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
						key: 'read-more',
						label: __( 'Read more colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: readMoreColour,
								onChange: ( val ) => setAttributes( { readMoreColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'text-hover',
						label: __( 'Text hover colour (title / excerpt / meta / read more)', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'border-hover',
						label: __( 'Border hover colour', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
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
					<FormTokenField
						label={ __( 'Categories', 'sgs-blocks' ) }
						value={ selectedCatNames }
						suggestions={ catSuggestions }
						onChange={ onCategoriesChange }
						__nextHasNoMarginBottom
					/>
					<FormTokenField
						label={ __( 'Tags', 'sgs-blocks' ) }
						value={ selectedTagNames }
						suggestions={ tagSuggestions }
						onChange={ onTagsChange }
						__nextHasNoMarginBottom
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
				<ToolsPanel
					label={ __( 'Content', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							showImage: true,
							imageSize: 'medium_large',
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
						hasValue={ () => showImage !== true }
						onDeselect={ () => setAttributes( { showImage: true } ) }
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Show image', 'sgs-blocks' ) }
							checked={ showImage }
							onChange={ set( 'showImage' ) }
							__nextHasNoMarginBottom
						/>
						{ showImage && (
							<SelectControl
								label={ __( 'Image size', 'sgs-blocks' ) }
								value={ imageSize }
								options={ IMAGE_SIZE_OPTIONS }
								onChange={ set( 'imageSize' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
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
						<ToggleControl
							label={ __( 'Show excerpt', 'sgs-blocks' ) }
							checked={ showExcerpt }
							onChange={ set( 'showExcerpt' ) }
							__nextHasNoMarginBottom
						/>
						{ showExcerpt && (
							<RangeControl
								label={ __( 'Excerpt length (words)', 'sgs-blocks' ) }
								value={ excerptLength }
								onChange={ set( 'excerptLength' ) }
								min={ 5 }
								max={ 80 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
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
						<ToggleControl
							label={ __( 'Show read more', 'sgs-blocks' ) }
							checked={ showReadMore }
							onChange={ set( 'showReadMore' ) }
							__nextHasNoMarginBottom
						/>
						{ showReadMore && (
							<TextControl
								label={ __( 'Read more text', 'sgs-blocks' ) }
								value={ readMoreText }
								onChange={ set( 'readMoreText' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
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
				   SgsColourPanel (D619/D621). This ToolsPanel now holds only
				   the non-colour hover behaviours. */ }
				<ToolsPanel
					label={ __( 'Hover Effects', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							scaleHover: '',
							shadowHover: '',
							imageZoomHover: true,
							transitionDuration: '300',
							transitionEasing: 'ease',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						hasValue={ () => !! scaleHover && scaleHover !== '' }
						onDeselect={ () => setAttributes( { scaleHover: '' } ) }
					>
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
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Hover shadow', 'sgs-blocks' ) }
						hasValue={ () => !! shadowHover }
						onDeselect={ () => setAttributes( { shadowHover: '' } ) }
					>
						<SelectControl
							label={ __( 'Hover shadow', 'sgs-blocks' ) }
							value={ shadowHover }
							options={ SHADOW_OPTIONS }
							onChange={ set( 'shadowHover' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
						hasValue={ () => imageZoomHover !== true }
						onDeselect={ () =>
							setAttributes( { imageZoomHover: true } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
							checked={ imageZoomHover }
							onChange={ set( 'imageZoomHover' ) }
							__nextHasNoMarginBottom
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

				{ /* Panel 8: Carousel (conditional) */ }
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
								__next40pxDefaultSize
							/>
						) }
						{ /*
						 * Draggable + Inertia opt-in (Spec 38 FR-38-13),
						 * mirroring sgs/gallery. Desktop-only click-and-drag
						 * layered over the CSS scroll-snap this layout already
						 * renders — touch keeps its native scroll either way,
						 * so no "touch" caveat belongs in the help text.
						 */ }
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
								'Scrolling or dragging past the last post continues into the first, and back again — never a dead end.',
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
							/>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
