<?php
/**
 * Server-side render for the SGS Card Grid block.
 *
 * In manual mode:     renders the items array stored in block attributes.
 * In query mode:      fetches posts via WP_Query and maps them to card layout.
 * In wc-product mode: fetches WooCommerce products via Card_Grid_Products and
 *                     renders each as an sgs/product-card in wc-product mode.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused: the grid registers with skip_inner_blocks, so its template card never renders into it.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-card-grid-products.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-card-grid-template.php';
// WooCommerce-INDEPENDENT collection engine + shared pagination markup.
// Card_Grid_Products above returns an empty array without WooCommerce, so
// this second engine is what keeps a product collection working on a bare
// WordPress install.
require_once dirname( __DIR__, 3 ) . '/includes/class-cpt-collection-query.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-grid-pagination.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-card-grid-results.php';
// Shared icon registry (sgs/icon, sgs/trust-bar) — reused for the per-item
// glyph, never a second icon system.
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
// Per-item glyph + image-fallback-tile helpers — kept in this block's own
// directory rather than growing this already-oversized render.php.
require_once __DIR__ . '/glyph-fallback.php';
// Block-wide image overlay helper (wave B round 2) — same reasoning, kept out
// of this file.
require_once __DIR__ . '/image-overlay.php';
// Card media through the shared media renderer (Spec 49 section 8.3).
require_once __DIR__ . '/render-item-media.php';

// CSS length/unit sanitiser — for free-text length values (border width,
// letter-spacing) concatenated into raw CSS declarations inside this block's
// own scoped <style> tag. Strips everything except letters, digits, dot, and
// % so a Contributor-authored malicious value can never break out of the
// declaration into a new CSS rule. Mirrors sgs/hero's proven sanitiser.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / text-transform / font-weight / font-style) —
// letters + hyphen only.
$source  = $attributes['source'] ?? 'manual';
$variant = $attributes['variant'] ?? 'card';
$items   = $attributes['items'] ?? array();
// Card title heading level — an out-of-enum stored value is otherwise
// silently coerced to the block.json default (blockjson-enum-coerces-
// invalid-to-default), so it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
// `columns` is a TIER OBJECT (Spec 35 pass 4) — read each tier via
// the normaliser, never the raw attribute (absint() on an unresolved array
// throws "Array to int conversion" and would emit e.g. `columns:0`, exactly
// the D569/D570 bug class this normaliser exists to prevent).
$columns_obj    = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns        = $columns_obj['desktop'] ?? 3;
$columns_tablet = $columns_obj['tablet'] ?? 2;
$columns_mobile = $columns_obj['mobile'] ?? 1;
// `gap` is a TIER OBJECT (Spec 35 pass 1) - read the desktop tier, never
// the raw array (a string cast downstream would emit `gap:Array`).
$gap_obj      = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap          = ( '' !== (string) ( $gap_obj['desktop'] ?? '' ) ) ? $gap_obj['desktop'] : '30';
$title_colour             = $attributes['titleColour'] ?? '';
$title_colour_gradient    = $attributes['titleColourGradient'] ?? '';
$subtitle_colour          = $attributes['subtitleColour'] ?? '';
$subtitle_colour_gradient = $attributes['subtitleColourGradient'] ?? '';
$hover_bg                 = $attributes['backgroundColourHover'] ?? '';
$hover_bg_gradient        = $attributes['backgroundColourHoverGradient'] ?? '';
$hover_text               = $attributes['textColourHover'] ?? '';
$hover_text_gradient      = $attributes['textColourHoverGradient'] ?? '';
$hover_border             = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient siblings — resolved once here, emitted via
// sgs_border_gradient_css() masked ::before further down; border-color can
// never legally hold a gradient value, so these never feed the flat
// border-colour paint above.
$hover_border_gradient    = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
$hover_scale              = $attributes['scaleHover'] ?? '';
$hover_shadow             = $attributes['cardShadowHover'] ?? '';
$hover_shadow_colour      = $attributes['cardShadowColourHover'] ?? '';
$card_background          = $attributes['cardBackground'] ?? '';
$card_background_gradient = $attributes['cardBackgroundGradient'] ?? '';
$card_border_colour       = $attributes['cardBorderColour'] ?? '';
$card_border_gradient     = sgs_css_gradient_value( $attributes['cardBorderColourGradient'] ?? '' );
$card_border_width        = $attributes['cardBorderWidth'] ?? array();
$card_radius              = $attributes['cardRadius'] ?? '';
$card_shadow              = $attributes['cardShadow'] ?? '';
$card_shadow_colour       = $attributes['cardShadowColour'] ?? '';
$query_post_type          = sanitize_key( $attributes['queryPostType'] ?? 'post' );
$query_per_page           = absint( $attributes['queryPostsPerPage'] ?? 6 );
$query_category           = absint( $attributes['queryCategory'] ?? 0 );
// Per-item glyph icon + image-fallback tile ("Shop by shape") —
// block-wide size/colour, per-item glyph slug read inside the items loop
// below. glyph-fallback.php holds the emission helpers. glyphSize is a CSS
// LENGTH string (Spec 35 C5 — a UnitControl, not a raw-px number), sanitised
// inside sgs_card_grid_glyph_css() via sgs_css_length_value().
$glyph_size            = (string) ( $attributes['glyphSize'] ?? '32px' );
$glyph_colour          = (string) ( $attributes['glyphColour'] ?? '' );
$image_fallback        = ! empty( $attributes['imageFallback'] );
$image_fallback_colour = (string) ( $attributes['imageFallbackColour'] ?? '' );
// The fallback tile's label ("Photo to come"), as sgs/product-card's noImageLabel.
$no_image_label = trim( (string) ( $attributes['noImageLabel'] ?? '' ) );

// Block-wide image overlay ("Shop by shape") — a
// colour/gradient layer painted between every card's photo and its
// glyph/title, off by default. image-overlay.php holds the emission
// helpers; $card_grid_overlay_decls is computed once here and reused both for
// the scoped CSS rule (below) and to decide, per item, whether the overlay
// <div> is rendered at all — an unset colour/gradient keeps every existing
// page byte-identical.
$overlay_colour           = (string) ( $attributes['overlayColour'] ?? '' );
$overlay_gradient         = (string) ( $attributes['overlayGradient'] ?? '' );
$overlay_opacity          = $attributes['overlayOpacity'] ?? null;
$overlay_blend_mode       = (string) ( $attributes['overlayBlendMode'] ?? 'normal' );
$card_grid_overlay_decls  = sgs_card_grid_image_overlay_decls( $overlay_colour, $overlay_gradient, $overlay_opacity, $overlay_blend_mode );
$card_grid_overlay_active = '' !== $card_grid_overlay_decls;

// ── Instance uid — a CLASS (matches the container/hero/quote convention) so
// this grid's WP-native supports + title/subtitle colours can be scoped to
// THIS instance only (multiple grids may sit on one page). Reused across all
// three render paths below (empty state / wc-product grid / manual-query grid)
// so every path shares the identical scoping hook.
$uid      = 'sgs-cg-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-card-grid';

// Card media: the `image` slot, printed card by card through the shared renderer (render-item-media.php). The
// renderer's scope class for the block-level rules is `{uid}-media`.
$sgs_cg_media_slot  = sgs_media_item_slot_for( $block, 'image' );
$sgs_cg_media_scope = $uid . '-media';

// Native block-supports CSS (colour, shadow, typography) -> $card_grid_native_css.
require __DIR__ . '/render-native-css.php';

// Card tile CSS and the native <style> tag -> $card_grid_native_css, $card_grid_native_style_tag.
require __DIR__ . '/render-card-css.php';

// Query mode: fetch posts and map to card data.
if ( 'query' === $source ) {
	$query_args = array(
		'post_type'      => $query_post_type,
		'posts_per_page' => $query_per_page,
		'post_status'    => 'publish',
		'no_found_rows'  => true,
	);

	if ( $query_category > 0 ) {
		$query_args['cat'] = $query_category;
	}

	$grid_query  = new WP_Query( $query_args );
	$query_items = array();

	foreach ( $grid_query->posts as $grid_post ) {
		// A card made from a post shows the post's featured image: its attachment id is the Source, and the renderer
		// derives the sizes and the alt text from the attachment.
		$thumb_id  = (int) get_post_thumbnail_id( $grid_post->ID );
		$thumb_alt = $thumb_id ? (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : '';

		$query_items[] = array(
			'title'    => get_the_title( $grid_post ),
			'subtitle' => wp_trim_words( get_the_excerpt( $grid_post ), 15, '…' ),
			'link'     => get_permalink( $grid_post ),
			'source'   => $thumb_id ? array(
				'desktop' => array(
					'kind' => 'image',
					'id'   => $thumb_id,
				),
			) : null,
			'alt'      => $thumb_alt,
			'badge'    => '',
		);
	}

	$items = $query_items;
	wp_reset_postdata();
}

/*
 * Card-delegating modes: render each result through the dual-mode
 * sgs/product-card rather than this block's own generic card markup.
 *
 *   'wc-product'     — query delegated to Card_Grid_Products (HPOS-safe,
 *                      WC-canonical). Returns nothing without WooCommerce.
 *   'cpt-collection' — query delegated to CPT_Collection_Query. Plain WP_Query
 *                      over a custom post type with the seven meta-driven
 *                      selection rules. NO WooCommerce dependency — this
 *                      keeps a product collection working on a
 *                      non-WooCommerce site. Removing it would delete a
 *                      working capability from every install without
 *                      WooCommerce.
 *
 * Both share this branch's wrapper classes, CSS vars and empty state, so the
 * two data sources cannot drift apart visually.
 */
if ( 'wc-product' === $source || 'cpt-collection' === $source ) {
	require __DIR__ . '/render-delegated.php';
	return;
}

if ( empty( $items ) ) {
	return '';
}

// Build class list. Reuses the shared $uid computed above (same instance
// scoping hook as the WP-native supports re-emit, wc-product branches).
$sgs_grid_uid = $uid;
$class_names  = array_merge(
	array(
		'sgs-card-grid',
		'sgs-card-grid--' . esc_attr( $variant ),
		$sgs_grid_uid,
	),
	$card_grid_preset_classes
);

// Title/subtitle font-size (CG-9): block-wide typography via the shared
// TypographyControls attr shape, scoped to this grid instance's uid so
// multiple grids on one page can differ. Only set values are emitted.
$sgs_grid_typo_css  = sgs_typography_css_rule( $attributes, 'title', '.' . $sgs_grid_uid . ' .sgs-card-grid__title', '', false, false, sgs_object_attr_keys( $block ) );
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'subtitle', '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle', '', false, false, sgs_object_attr_keys( $block ) );
// Space below the title (titleMarginBottom). Only a title followed by something
// (a subtitle) takes it; a lone title keeps style.css's :last-child reset.
// Space inside the image area, around the image (imagePadding), per device.
if ( is_array( $attributes['imagePadding'] ?? null ) && array() !== $attributes['imagePadding'] ) {
	$sgs_grid_typo_css .= sgs_emit_responsive_css(
		'.' . $sgs_grid_uid . ' .sgs-card-grid__image-wrap',
		array(
			array(
				'value'        => $attributes['imagePadding'],
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
}
// The image frame's ratio per device (imageRatio) and its fixed height per device (imageHeight), which replaces the ratio.
$sgs_grid_typo_css .= sgs_card_grid_frame_css( $attributes, '.' . $sgs_grid_uid . ' .sgs-card-grid__image-wrap' );
$sgs_grid_title_mb = sgs_css_length_value( (string) ( $attributes['titleMarginBottom'] ?? '' ) );
if ( '' !== $sgs_grid_title_mb ) {
	$sgs_grid_typo_css .= '.' . $sgs_grid_uid . ' .sgs-card-grid__title:not(:last-child){margin-bottom:' . $sgs_grid_title_mb . ';}';
}
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'noImageLabel', '.' . $sgs_grid_uid . ' .sgs-card-grid__no-image-label', '', false, false, sgs_object_attr_keys( $block ) );
// Fallback-tile initial letter and the card badge: own typography surfaces; the
// style.css defaults sit in :where() so these scoped rules win.
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'glyphInitial', '.' . $sgs_grid_uid . ' .sgs-card-grid__glyph-initial', '', false, false, sgs_object_attr_keys( $block ) );
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'badge', '.' . $sgs_grid_uid . ' .sgs-card-grid__badge', '', false, false, sgs_object_attr_keys( $block ) );
if ( '' !== (string) ( $attributes['noImageLabelColour'] ?? '' ) ) {
	$sgs_grid_typo_css .= '.' . $sgs_grid_uid . ' .sgs-card-grid__no-image-label{color:' . sgs_colour_value( (string) $attributes['noImageLabelColour'] ) . ';}';
}

// Per-item title/subtitle colour (was inline `style="color:…"` on every
// title/subtitle element — moved to a scoped rule keyed off the same uid so
// no rendered element carries an inline CSS property declaration).
// titleColourGradient/subtitleColourGradient (2026-09-03) are the sibling
// gradient attrs — gradient wins when set+valid (sgs_resolve_text_colour_or_gradient).
$sgs_grid_title_sel     = '.' . $sgs_grid_uid . ' .sgs-card-grid__title';
$sgs_grid_subtitle_sel  = '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle';
$title_colour_effective = sgs_resolve_text_colour_or_gradient( $title_colour, $title_colour_gradient );
if ( '' !== $title_colour_effective ) {
	$title_colour_decl = sgs_text_colour_decl( $title_colour_effective );
	if ( '' !== $title_colour_decl ) {
		$sgs_grid_typo_css .= "{$sgs_grid_title_sel}{{$title_colour_decl};}";
	}
	$sgs_grid_typo_css .= sgs_text_colour_gradient_fallback_rule( $sgs_grid_title_sel, $title_colour_effective );
}
$subtitle_colour_effective = sgs_resolve_text_colour_or_gradient( $subtitle_colour, $subtitle_colour_gradient );
if ( '' !== $subtitle_colour_effective ) {
	$subtitle_colour_decl = sgs_text_colour_decl( $subtitle_colour_effective );
	if ( '' !== $subtitle_colour_decl ) {
		$sgs_grid_typo_css .= "{$sgs_grid_subtitle_sel}{{$subtitle_colour_decl};}";
	}
	$sgs_grid_typo_css .= sgs_text_colour_gradient_fallback_rule( $sgs_grid_subtitle_sel, $subtitle_colour_effective );
}

$sgs_grid_typo_tag = '' !== $sgs_grid_typo_css ? '<style>' . wp_strip_all_tags( $sgs_grid_typo_css ) . '</style>' : '';

if ( $hover_scale ) {
	$class_names[] = 'sgs-has-hover-scale';
}
if ( $hover_shadow ) {
	$class_names[] = 'sgs-has-hover';
}
// A client-set image overlay replaces the overlay variant's built-in caption
// gradient, so the two never stack.
if ( $card_grid_overlay_active ) {
	$class_names[] = 'sgs-card-grid--has-image-overlay';
}

// Resolve gap via the shared helper — handles both preset slugs ("30" →
// var(--wp--preset--spacing--30)) and raw CSS lengths ("16px" → "16px").
// Back-compat: the old SelectControl only wrote bare numeric slugs, so
// existing posts are covered by the slug branch. New posts written via the
// shared ContainerWrapperControls length control may be raw lengths.
$gap_value = sgs_container_gap_value( $gap );

// Build grid CSS custom properties.
$grid_style_parts = array(
	'--sgs-card-grid-columns: ' . max( 1, absint( $columns ) ),
	'--sgs-card-grid-columns-mobile: ' . max( 1, absint( $columns_mobile ) ),
	'--sgs-card-grid-columns-tablet: ' . max( 1, absint( $columns_tablet ) ),
	'--sgs-card-grid-gap: ' . $gap_value,
);

if ( $hover_scale ) {
	$grid_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
}
if ( $hover_shadow ) {
	$grid_style_parts[] = '--sgs-hover-shadow: ' . sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
}

// Each card's picture CSS (the renderer's per-card and block-level rules) collects here and prints in the scoped
// <style> tag before the wrapper. Cards are matched to their rules by position, so a reorder reprints them.
$card_grid_per_item_css = '';

// Item-array stagger (Spec 38A FR-38A-26): the cards come from the `items` attribute, so the container's stored
// `sgsMotion.stagger` settings become one scoped delay rule per card, found by its `data-sgs-loop-i` index. Null (no
// stagger) leaves the cards untagged; the string is only non-empty where the collector never flushes (the editor preview).
$card_grid_loop_style = \SGS\Blocks\Motion\Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', $uid, $attributes, count( $items ), '.sgs-card-grid__item' );
$card_grid_loop_i     = 0;

// Build the interior HTML (card items).
ob_start();
require __DIR__ . '/render-items.php';
$card_grid_per_item_tag = $card_grid_per_item_css ? '<style>' . wp_strip_all_tags( $card_grid_per_item_css ) . '</style>' : '';

// FR-32-4a (no-inline contract): the scoped <style> tags are emitted BEFORE
// the wrapper — siblings of the block ROOT, not of the items — exactly as
// sgs/gallery and sgs/google-reviews do, so $inner_html holds
// ONLY the card items and an item's position among its siblings is its real
// position (the per-tile entrance stagger counts it). Relative order of the
// tags is preserved, and each is a `.{uid}`-scoped rule, so moving them earlier
// in the document cannot change which rule wins.
$card_grid_style_tags = $card_grid_native_style_tag . $sgs_grid_typo_tag . $card_grid_per_item_tag;
$inner_html           = ob_get_clean();

echo (string) $card_grid_loop_style . $card_grid_style_tags . SGS_Container_Wrapper::render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_style_tags is CSS passed through wp_strip_all_tags(); SGS_Container_Wrapper::render() escapes internally.
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $class_names,
		'extra_styles'  => $grid_style_parts,
		// overlayGradient / overlayColour on this block paint each tile's own
		// `.sgs-card-grid__image-overlay`; the wrapper's whole-section overlay
		// would paint a second copy over the grid, gaps included.
		'no_overlay'    => true,
	)
);

