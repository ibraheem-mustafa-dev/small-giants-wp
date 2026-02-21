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
import DesignTokenPicker from '../../components/DesignTokenPicker';
import ResponsiveControl from '../../components/ResponsiveControl';
import { colourVar } from '../../utils';

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
		columnsTablet,
		columnsMobile,
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
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverScale,
		hoverShadow,
		hoverImageZoom,
		transitionDuration,
		transitionEasing,
		carouselAutoplay,
		carouselSpeed,
		carouselShowDots,
		carouselShowArrows,
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

	// Wrapper inline styles.
	const inlineStyles = {
		'--sgs-columns-desktop': columns,
		'--sgs-columns-tablet':  columnsTablet,
		'--sgs-columns-mobile':  columnsMobile,
		'--sgs-gap':             gap + 'px',
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
			: `repeat( ${ columns }, 1fr )`,
		columnCount:         'masonry' === layout ? columns : undefined,
		gap:                 gap + 'px',
	};

	return (
		<>
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
					/>
					<RangeControl
						label={ __( 'Posts per page', 'sgs-blocks' ) }
						value={ postsPerPage }
						onChange={ set( 'postsPerPage' ) }
						min={ 1 }
						max={ 24 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Order by', 'sgs-blocks' ) }
						value={ orderBy }
						options={ ORDER_BY_OPTIONS }
						onChange={ set( 'orderBy' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Order', 'sgs-blocks' ) }
						value={ order }
						options={ ORDER_OPTIONS }
						onChange={ set( 'order' ) }
						__nextHasNoMarginBottom
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
						value={ parseInt( gap, 10 ) || 30 }
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
						/>
					) }
					<ToggleControl
						label={ __( 'Show title', 'sgs-blocks' ) }
						checked={ showTitle }
						onChange={ set( 'showTitle' ) }
						__nextHasNoMarginBottom
					/>
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
						/>
					) }
					<ToggleControl
						label={ __( 'Show date', 'sgs-blocks' ) }
						checked={ showDate }
						onChange={ set( 'showDate' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show author', 'sgs-blocks' ) }
						checked={ showAuthor }
						onChange={ set( 'showAuthor' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show category', 'sgs-blocks' ) }
						checked={ showCategory }
						onChange={ set( 'showCategory' ) }
						__nextHasNoMarginBottom
					/>
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
						/>
					) }
				</PanelBody>

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
						/>
					) }
				</PanelBody>

				{ /* Panel 6: Colours */ }
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Card background', 'sgs-blocks' ) }
						value={ cardBgColour }
						onChange={ set( 'cardBgColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						value={ titleColour }
						onChange={ set( 'titleColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Excerpt colour', 'sgs-blocks' ) }
						value={ excerptColour }
						onChange={ set( 'excerptColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Meta colour (date / author)', 'sgs-blocks' ) }
						value={ metaColour }
						onChange={ set( 'metaColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Category badge text colour', 'sgs-blocks' ) }
						value={ categoryBadgeColour }
						onChange={ set( 'categoryBadgeColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Category badge background', 'sgs-blocks' ) }
						value={ categoryBadgeBgColour }
						onChange={ set( 'categoryBadgeBgColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Read more colour', 'sgs-blocks' ) }
						value={ readMoreColour }
						onChange={ set( 'readMoreColour' ) }
					/>
				</PanelBody>

				{ /* Panel 7: Hover Effects */ }
				<PanelBody title={ __( 'Hover Effects', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Hover background colour', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ set( 'hoverBackgroundColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover text colour', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ set( 'hoverTextColour' ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover border colour', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ set( 'hoverBorderColour' ) }
					/>
					<RangeControl
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						value={ parseFloat( hoverScale ) || 1 }
						onChange={ ( val ) => setAttributes( { hoverScale: String( val ) } ) }
						min={ 1 }
						max={ 1.1 }
						step={ 0.01 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover shadow', 'sgs-blocks' ) }
						value={ hoverShadow }
						options={ SHADOW_OPTIONS }
						onChange={ set( 'hoverShadow' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Image zoom on hover', 'sgs-blocks' ) }
						checked={ hoverImageZoom }
						onChange={ set( 'hoverImageZoom' ) }
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
							/>
						) }
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
