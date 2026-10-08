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
import { Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import SgsColourPanel from '../../components/SgsColourPanel';
import {
	resolveResponsiveTier,
	resolveShadowPreviewComposed,
	typographyPreviewStyle,
	usePreviewTier, isCssGradient,
} from '../../utils';
import { useSeparatorsCanvas } from '../../shared/separators/useSeparatorsCanvas';
import { postGridWrapperPreview } from './preview-style';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { resolveColourToken } from '../../components';
import PreviewCard from './components/PreviewCard';
import QueryPanel from './components/QueryPanel';
import LayoutPanel from './components/LayoutPanel';
import ContentPanel from './components/ContentPanel';
import CardStylePanel from './components/CardStylePanel';
import PaginationFiltersPanel from './components/PaginationFiltersPanel';
import HoverEffectsPanel from './components/HoverEffectsPanel';
import CarouselPanel from './components/CarouselPanel';
import TypographyPanel from './components/TypographyPanel';
import BorderPanel from './components/BorderPanel';

// -------------------------------------------------------------------------
// Main edit component
// -------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes, clientId } ) {
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
		layout,
		columns,
		gap,
		pagination,
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
		cardBgColourGradient,
		backgroundColourHover,
		textColourHover,
		textColourHoverGradient,
		shadow,
		shadowColour,
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

	/*
	 * categoryBadgeBgColourHover(Gradient) canvas mirror (CHECK A, 2026-09-06).
	 * class-post-grid-rest.php:328-334 already emits both hover-sibling CSS
	 * custom properties (--sgs-pg-badge-bg-hover/-gradient), consumed by
	 * style.css:325-329's real `.sgs-post-grid__badge:hover,:focus-visible`
	 * rule — the editor canvas never showed it because nothing outside the
	 * control read either Hover attr. categoryBadgeBgColour is a single
	 * block-level value (identical for every card in this grid, per
	 * PreviewCard's own comment above), so ONE scoped rule covers every
	 * card's badge.
	 *
	 * `!important` is required because PreviewCard's badgeFillStyle sets the
	 * SAME background-color as a literal inline `style` prop on the same
	 * element — an inline declaration always out-ranks an external
	 * stylesheet rule for the same property regardless of `:hover` matching,
	 * so without it this rule would parse correctly and still never paint
	 * whenever a resting badge colour is also set (the common case).
	 *
	 * categoryBadgeColourHover (text colour) applies to both `.sgs-post-grid__badge`
	 * (card/overlay cardStyle) and `.sgs-post-grid__category` (flat/minimal cardStyle)
	 * on hover. Same `!important` gate: without it, an inline style on the resting
	 * text colour would shadow the hover rule.
	 */
	const postGridPreviewScope = `sgs-post-grid-preview-${ clientId }`;
	const categoryBadgeBgHoverDecl =
		isCssGradient( categoryBadgeBgColourHoverGradient )
			? `background-image:${ categoryBadgeBgColourHoverGradient } !important;background-color:transparent !important;`
			: categoryBadgeBgColourHover
				? `background-color:${ resolveColourToken( categoryBadgeBgColourHover, colourPalette ) } !important;`
				: '';
	const categoryBadgeTextHoverDecl = categoryBadgeColourHover
		? `color:${ resolveColourToken( categoryBadgeColourHover, colourPalette ) } !important;`
		: '';
	const postGridHoverPreviewCss = [
		categoryBadgeBgHoverDecl
			? `.${ postGridPreviewScope } .sgs-post-grid__badge:hover,.${ postGridPreviewScope } .sgs-post-grid__badge:focus-visible{${ categoryBadgeBgHoverDecl }}`
			: '',
		categoryBadgeTextHoverDecl
			? `.${ postGridPreviewScope } .sgs-post-grid__badge:hover,.${ postGridPreviewScope } .sgs-post-grid__badge:focus-visible,.${ postGridPreviewScope } .sgs-post-grid__category:hover,.${ postGridPreviewScope } .sgs-post-grid__category:focus-visible{${ categoryBadgeTextHoverDecl }}`
			: ''
	].filter( Boolean ).join( '' );

	const previewTier = usePreviewTier();
	const { rootStyle, bandStyle, hasBandProps } = postGridWrapperPreview( attributes, previewTier, colourPalette );
	const separatorsCanvas = useSeparatorsCanvas( {
		separators: attributes.separators,
		device: previewTier,
		active: 'grid' === layout,
		deps: [ columnsDesktop, gap, posts?.length ],
	} );
	const blockProps = useBlockProps( {
		className: `sgs-post-grid sgs-post-grid--${ layout } ${ postGridPreviewScope }`,
		style:     { ...inlineStyles, ...rootStyle },
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
		...separatorsCanvas.style,
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
			   - shadowColour/shadowColourHover share ONE row (normal +
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
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: categoryBadgeColourHover,
								onChange: ( val ) => setAttributes( { categoryBadgeColourHover: val ?? '' } ),
							},
						],
					},
					{
						key: 'category-badge-bg',
						label: __( 'Category badge background', 'sgs-blocks' ),
						gradientCapable: true,
						// Resting + hover background, flat + gradient siblings.
						// categoryBadgeBgColour/categoryBadgeBgColourGradient
						// pair the resting state (normal); categoryBadgeBgColourHover/
						// categoryBadgeBgColourHoverGradient pair the hover state.
						// Both states follow the same 2-form pattern (colour + gradient).
						// Gradient wins if present; mirrors render.php logic via
						// sgs_custom_property_gradient_decls().
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: categoryBadgeBgColour,
								onChange: ( val ) => setAttributes( { categoryBadgeBgColour: val ?? '' } ),
								gradientValue: categoryBadgeBgColourGradient,
								onGradientChange: ( val ) => setAttributes( { categoryBadgeBgColourGradient: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: categoryBadgeBgColourHover,
								onChange: ( val ) => setAttributes( { categoryBadgeBgColourHover: val ?? '' } ),
								gradientValue: categoryBadgeBgColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { categoryBadgeBgColourHoverGradient: val ?? '' } ),
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
					{
						key: 'excerpt',
						label: __( 'Excerpt colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: excerptColour,
								onChange: ( val ) => setAttributes( { excerptColour: val ?? '' } ),
								linked: true,
								gradientValue: excerptColourGradient,
								onGradientChange: ( val ) => setAttributes( { excerptColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'read-more',
						label: __( 'Read more colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: readMoreColour,
								onChange: ( val ) => setAttributes( { readMoreColour: val ?? '' } ),
								linked: true,
								gradientValue: readMoreColourGradient,
								onGradientChange: ( val ) => setAttributes( { readMoreColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'card-bg',
						label: __( 'Card background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
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
						],
					},
				] }
			/>
			{ /* ============================================================
			     Inspector panels
			     ============================================================ */ }
			<InspectorControls>

				{ /* Panel 1: Query */ }
				<QueryPanel attributes={ attributes } set={ set } catSuggestions={ catSuggestions } tagSuggestions={ tagSuggestions } selectedCatNames={ selectedCatNames } selectedTagNames={ selectedTagNames } onCategoriesChange={ onCategoriesChange } onTagsChange={ onTagsChange } />

				{ /* Panel 2: Layout */ }
				<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

				{ /* Panel 3: Content */ }
				<ContentPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

				{ /* Panel 4: Card Style */ }
				<CardStylePanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

				{ /* Panel 5: Pagination & Filters */ }
				<PaginationFiltersPanel attributes={ attributes } set={ set } />

				{ /* Panel 6: Hover Effects — colours moved to the top-level
				   SgsColourPanel (D619/D621). This ToolsPanel holds the
				   non-colour hover behaviours PLUS the resting shadow shape
				   (shadow/shadowColour, added 2026-08-20 to close a
				   STATE_WITHOUT_BASE gap — mirrors the shadowHover pair,
				   ordered rest-then-hover so the reading order matches the
				   render.php/style.css cascade). */ }
				<HoverEffectsPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />

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
					<CarouselPanel attributes={ attributes } setAttributes={ setAttributes } set={ set } />
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
				<TypographyPanel attributes={ attributes } setAttributes={ setAttributes } />
				<BorderPanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			{ /* ============================================================
			     Live preview canvas
			     ============================================================ */ }
			<div { ...blockProps }>
				{ postGridHoverPreviewCss && <style>{ postGridHoverPreviewCss }</style> }
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
						className={ hasBandProps ? 'sgs-container__inner' : undefined }
						style={ hasBandProps ? bandStyle : undefined }
					>
					<div
						ref={ separatorsCanvas.ref }
						className="sgs-post-grid__inner"
						style={ previewGridStyle }
					>
						{ posts.map( ( post ) => (
							<PreviewCard
								key={ post.id }
								post={ post }
								attributes={ attributes }
								palette={ colourPalette }
								tier={ previewTier }
							/>
						) ) }
					</div>
					</div>
				) }

				{ /* Pagination controls are built outside the canvas on the front end
				     (includes/class-grid-pagination.php), so a static, non-interactive
				     sample wears the same classes and the client's typography shows. */ }
				{ 'standard' === pagination && (
					<div className="sgs-post-grid__pagination" aria-hidden="true">
						{ [ 1, 2, 3 ].map( ( n ) => (
							<span
								key={ n }
								className={ 1 === n ? 'sgs-post-grid__page-btn sgs-post-grid__page-btn--current' : 'sgs-post-grid__page-btn' }
								style={ typographyPreviewStyle( attributes, 'pageButton', previewTier ) }
							>
								{ n }
							</span>
						) ) }
					</div>
				) }
				{ 'load-more' === pagination && (
					<div className="sgs-post-grid__load-more-wrap" aria-hidden="true">
						<span
							className="sgs-post-grid__load-more"
							style={ typographyPreviewStyle( attributes, 'loadMore', previewTier ) }
						>
							{ __( 'Load more', 'sgs-blocks' ) }
						</span>
					</div>
				) }
			</div>
		</>
	);
}
