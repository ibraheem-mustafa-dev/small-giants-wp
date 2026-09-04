<?php
/**
 * Server-side render for sgs/gallery.
 *
 * Outputs a responsive image gallery supporting grid, masonry, and carousel
 * layouts. When the lightbox is enabled, image items are rendered as buttons
 * with Interactivity API data attributes. The full lightbox modal is always
 * included in the markup (display:none) so the Interactivity API can manage
 * its open/closed state without DOM insertion.
 *
 * @package SGS\Blocks
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      The WP_Block instance.
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __FILE__, 4 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __FILE__, 4 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/unit sanitiser — for free-text attrs concatenated into raw CSS
// declarations inside this block's scoped <style> tag. Strips everything
// except letters, digits, dot, and % so a value can never break out of the
// declaration into a new CSS rule. Mirrors sgs/hero's proven sanitiser.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style) — letters + hyphen only.
// CSS aspect-ratio sanitiser — the aspectRatio attr stores values like
// "1/1", "4/3", "16/9". Allows digits, dot, and "/" only.
$sgs_css_ratio = static function ( $value ) {
	return preg_replace( '/[^0-9.\/]/', '', (string) $value );
};

// -------------------------------------------------------------------------
// Normalise attributes with safe defaults.
// -------------------------------------------------------------------------
$images          = (array) ( $attributes['mediaItems'] ?? [] );
$layout          = sanitize_key( $attributes['layout'] ?? 'grid' );
// `columns` is a TIER OBJECT (Spec 35 pass 4, 2026-08-11) — read each tier via
// the normaliser, never the raw attribute (absint() on an unresolved array
// throws "Array to int conversion" and would emit e.g. `columns:0`, the
// D569/D570 bug class this normaliser exists to prevent).
$columns_obj     = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns         = absint( $columns_obj['desktop'] ?? 3 );
$columns_tablet  = absint( $columns_obj['tablet'] ?? 2 );
$columns_mobile  = absint( $columns_obj['mobile'] ?? 1 );
// gap is stored as a string (e.g. "16", "24px", or a WP spacing slug like "40").
// The shared ContainerWrapperControls Gap control writes slug/raw-CSS strings;
// the old own RangeControl wrote bare numeric strings like "16".
// sgs_container_gap_value() handles slug ("40") and raw-CSS ("16px") natively.
// Back-compat: a bare numeric string (old format) → append "px" before resolving.
// `gap` is a TIER OBJECT (Spec 35 pass 1, 2026-08-10). Casting the array to string
// would emit "Array to string conversion" every render plus literal `gap:Array`.
$gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap_raw = (string) ( $gap_obj['desktop'] ?? '' );
if ( '' === $gap_raw ) {
	$gap_raw = '16';
}
if ( preg_match( '/^\d+$/', $gap_raw ) ) {
	$gap_raw = $gap_raw . 'px';
}
$gap = sgs_container_gap_value( $gap_raw );
if ( '' === $gap ) {
	$gap = '16px';
}
$aspect_ratio    = sanitize_text_field( $attributes['aspectRatio'] ?? '1/1' );
$enable_lightbox = (bool) ( $attributes['enableLightbox'] ?? true );
$show_captions   = (bool) ( $attributes['showCaptions'] ?? false );
$caption_reveal  = (bool) ( $attributes['captionReveal'] ?? false );
$image_size      = sanitize_key( $attributes['imageSize'] ?? 'large' );

$hover_scale     = sanitize_text_field( $attributes['scaleHover'] ?? '' );
$hover_img_zoom  = (bool) ( $attributes['imageZoomHover'] ?? true );
$hover_effect    = sanitize_key( $attributes['effectHover'] ?? 'zoom' );
$hover_grayscale = (bool) ( $attributes['grayscaleHover'] ?? false );
$hover_shadow    = sanitize_key( $attributes['shadowHover'] ?? '' );
$stagger_delay   = absint( $attributes['staggerDelay'] ?? 0 );
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

$carousel_autoplay    = (bool) ( $attributes['carouselAutoplay'] ?? false );
$carousel_speed       = absint( $attributes['carouselSpeed'] ?? 5000 );
$carousel_show_dots   = (bool) ( $attributes['carouselShowDots'] ?? true );
$carousel_show_arrows = (bool) ( $attributes['carouselShowArrows'] ?? true );

// Draggable + Inertia roster opt-in (Spec 38 FR-38-13). Carousel-only — the
// grid/masonry layouts have nothing to drag-scroll. `data-sgs-fx="draggable"`
// is the same grammar every Tier G effect uses (§11.2); the shared runtime
// (shared/effects/gsap/fx-draggable.js) structurally verifies the element is
// a real native horizontal scroller before doing anything with it, so this
// is safe to emit even if a future layout change made carousel non-scrolling.
$drag_to_scroll = (bool) ( $attributes['dragToScroll'] ?? false );
$drag_momentum  = (bool) ( $attributes['dragMomentum'] ?? true );

// Infinite loop (Spec 38 §11 loop FR). A SEPARATE marker from
// `data-sgs-fx="draggable"` above — Bean's ruling that looping is an
// independent control, not a value of the shared `fx` grammar, and both can
// be present on the SAME element at once (a single `data-sgs-fx` attribute
// could never express that). `shared/effects/fx-carousel-loop.js` reads
// this; it never touches `gsap/fx-draggable.js`.
$loop_carousel = (bool) ( $attributes['loopCarousel'] ?? false );

$grid_fx_attr = '';
if ( 'carousel' === $layout && $drag_to_scroll ) {
	$grid_fx_attr = ' data-sgs-fx="draggable"';
	if ( ! $drag_momentum ) {
		$grid_fx_attr .= ' data-sgs-fx-momentum="false"';
	}
}
if ( 'carousel' === $layout && $loop_carousel ) {
	$grid_fx_attr .= ' data-sgs-loop="1"';
}

// Colour attributes — fallbacks match block.json defaults so inline CSS vars
// are always emitted even when the attribute is absent from stored post content.
$caption_colour       = $attributes['captionColour']      ?? 'text-inverse';
$caption_bg_colour    = $attributes['captionBgColour']    ?? 'primary-dark';
$hover_overlay_colour = $attributes['overlayColourHover'] ?? 'primary-dark';

// -------------------------------------------------------------------------
// Build inline CSS custom properties.
// -------------------------------------------------------------------------
$inline_styles_parts = array_merge(
	array(
		'--sgs-columns-desktop:' . $columns,
		'--sgs-columns-tablet:'  . $columns_tablet,
		'--sgs-columns-mobile:'  . $columns_mobile,
		'--sgs-gap:'             . $gap,
	),
	sgs_transition_vars( $attributes )
);

if ( $hover_scale ) {
	$inline_styles_parts[] = '--sgs-hover-scale:' . esc_attr( $hover_scale );
}
if ( $hover_shadow ) {
	$inline_styles_parts[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
}
if ( $stagger_delay > 0 ) {
	$inline_styles_parts[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
}
// Always emit colour CSS vars — fallbacks are set above so these are never empty.
// overlayColourHover paints an EXISTING .sgs-gallery__img-wrap::after (the
// hover fade layer) with no text sharing that selector, so its gradient
// sibling is a simple sibling custom property (2026-09-04) — style.css gains
// one new background-image:var(...,none) line next to the existing
// background:var(--sgs-hover-overlay,...) declaration.
$inline_styles_parts = array_merge(
	$inline_styles_parts,
	sgs_custom_property_gradient_decls(
		'sgs-hover-overlay',
		(string) $hover_overlay_colour,
		(string) ( $attributes['overlayColourHoverGradient'] ?? '' )
	)
);
// captionColour/captionBgColour moved OFF this custom-property mechanism
// 2026-09-04 — see the scoped rule near $root_sel below (they share
// .sgs-gallery__caption, which a text gradient's background-clip:text would
// otherwise clip).

$inline_styles = implode( ';', $inline_styles_parts ) . ';';

// -------------------------------------------------------------------------
// Build image context data for Interactivity API store.
// Each entry stores only the data the lightbox needs — no full markup.
// -------------------------------------------------------------------------
$context_images = [];
foreach ( $images as $img ) {
	$img_id   = absint( $img['id'] ?? 0 );
	$img_type = isset( $img['type'] ) ? sanitize_key( $img['type'] ) : 'image';
	$full_url = '';

	if ( $img_id && 'image' === $img_type ) {
		// Prefer the attachment's full-size URL from WordPress metadata.
		$full_src = wp_get_attachment_image_src( $img_id, 'full' );
		$full_url = $full_src ? esc_url( $full_src[0] ) : '';
	}

	// Fall back to the stored fullUrl / url if the attachment no longer exists,
	// or if this item is a video (always use the direct file URL).
	if ( ! $full_url && ! empty( $img['fullUrl'] ) ) {
		$full_url = esc_url( $img['fullUrl'] );
	}
	if ( ! $full_url && ! empty( $img['url'] ) ) {
		$full_url = esc_url( $img['url'] );
	}

	// Decorative items get an empty alt here too — otherwise the lightbox's
	// Interactivity-API context (data-wp-bind--alt) leaks the real alt text
	// even though the thumbnail's own alt/aria-hidden is already correct.
	$context_img_decorative = ! empty( $img['decorative'] );

	$context_images[] = [
		'fullUrl' => $full_url,
		'alt'     => $context_img_decorative ? '' : esc_attr( wp_strip_all_tags( $img['alt'] ?? '' ) ),
		'caption' => esc_html( wp_strip_all_tags( $img['caption'] ?? '' ) ),
		'type'    => $img_type,
	];
}

$context_data = wp_json_encode( [
	'lightboxOpen'  => false,
	'currentIndex'  => 0,
	'images'        => $context_images,
] );

// -------------------------------------------------------------------------
// NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Spacing (padding/margin) is already handled scoped by the wrapper
// itself; color + border are re-emitted here into the gallery's OWN scoped
// <style> (composite caveat — never via wrapper `extra_styles`, which
// inlines). Mirrors sgs/hero.
// -------------------------------------------------------------------------
$uid      = 'sgs-gallery-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-gallery';

$gallery_responsive_css = '';

// Caption: captionColour (text) / captionBgColour (fill) share
// .sgs-gallery__caption, which is already `position:absolute` (style.css) —
// HAND-BUILT ::after, not sgs_block_background_layer_css() (that helper's
// own position:relative would override the caption's absolute positioning,
// the same trap sgs/cart's badge/panel already document).
$sgs_gallery_caption_sel      = $root_sel . ' .sgs-gallery__caption';
$sgs_gallery_caption_bg_grad  = (string) ( $attributes['captionBgColourGradient'] ?? '' );
$sgs_gallery_caption_bg_paint = sgs_background_paint_decl( (string) $caption_bg_colour, $sgs_gallery_caption_bg_grad );
if ( '' !== $sgs_gallery_caption_bg_paint ) {
	$gallery_responsive_css .= $sgs_gallery_caption_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;' . $sgs_gallery_caption_bg_paint . ';}';
}
$sgs_gallery_caption_grad      = (string) ( $attributes['captionColourGradient'] ?? '' );
$sgs_gallery_caption_effective = sgs_resolve_text_colour_or_gradient( (string) $caption_colour, $sgs_gallery_caption_grad );
if ( '' !== $sgs_gallery_caption_effective ) {
	$sgs_gallery_caption_decl = sgs_text_colour_decl( $sgs_gallery_caption_effective );
	if ( '' !== $sgs_gallery_caption_decl ) {
		$gallery_responsive_css .= $sgs_gallery_caption_sel . '{' . $sgs_gallery_caption_decl . ';}';
	}
	$gallery_responsive_css .= sgs_text_colour_gradient_fallback_rule( $sgs_gallery_caption_sel, $sgs_gallery_caption_effective );
}

// -------------------------------------------------------------------------
// Media-element atom layer (rule 37-media-no-handroll fix) — grid-thumbnail
// object-fit only. `class_exists()` guards a class the plugin loader always
// registers; kept for the same "never fatal if load order changes" reason
// `sgs/before-after` and `sgs/hero` guard it. Classes are added to the SAME
// <img> already carrying `sgs-gallery__img` (built via wp_get_attachment_image()
// below) — `.sgs-media-el` is the shared marker the generated
// assets/css/media-atoms/object-fit.css rule targets, `$sgs_gallery_media_scope`
// is the per-instance scope the atom's custom-property value below is set on.
// The `.sgs-gallery__lightbox-img` (style.css, `object-fit:contain`) does NOT
// get these classes — that element is deliberately excluded, see style.css.
$sgs_gallery_media_scope   = '';
$sgs_gallery_media_classes = array();
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_gallery_media_scope   = SGS_Media_Element::scope_class( $uid, 'sgs' );
	$sgs_gallery_media_classes = SGS_Media_Element::element_classes( $sgs_gallery_media_scope );
}
$sgs_gallery_img_class = implode( ' ', array_filter( array_merge( array( 'sgs-gallery__img' ), $sgs_gallery_media_classes ) ) );

// -------------------------------------------------------------------------
// Responsive gap tiers (gapTablet / gapMobile).
//
// WHY this lives here and not in SGS_Container_Wrapper: the wrapper DOES read
// gapTablet/gapMobile and emit `@media (max-width:1023px|767px){…{gap:…}}`,
// but it scopes those rules to the wrapper's own element — `.sgs-container-<uid>`
// (or its `>.sgs-container__inner` band). Neither is a grid in this block: the
// gallery's grid is the CHILD `.sgs-gallery__grid`, and style.css drives its
// gap off `var(--sgs-gap)` (style.css:40-42 grid/masonry, :94-98 carousel
// track sizing, :60/:66 masonry column-gap + item margin). So the wrapper's
// `gap:` declaration lands on a non-grid ancestor and is inert — which is why
// a client setting tablet/mobile spacing saw no change.
//
// The fix overrides the SAME custom property the block already consumes,
// rather than fighting for the `gap` declaration on the wrong element. One
// property re-point covers all three layouts (grid, masonry, carousel) at
// once, because every one of them reads `--sgs-gap`.
//
// Cascade: the wrapper emits the BASE `--sgs-gap` as a scoped
// `.sgs-container-<uid>{--sgs-gap:…}` rule (specificity 0,1,0 — extra_styles
// are scoped, never inlined, per Spec 32 FR-32-4 / D345 Facet B). $root_sel is
// `.sgs-gallery-<uid>.wp-block-sgs-gallery` (specificity 0,2,0), so these tier
// rules win on SPECIFICITY and are independent of stylesheet source order.
// Breakpoints are the project device-tier standard 1024/768 — identical to
// class-sgs-container-wrapper.php:1296-1301. These are stylesheet rules in the
// block's own scoped <style>, never inline (Spec 32).
$sgs_gallery_gap_tier = static function ( $value ) {
	$value = (string) $value;
	if ( '' === $value ) {
		return '';
	}
	// Back-compat, mirroring the base gap above: a bare numeric string is the
	// old own-RangeControl format and means pixels; a slug or raw CSS length
	// passes straight through to sgs_container_gap_value().
	if ( preg_match( '/^\d+$/', $value ) ) {
		$value .= 'px';
	}
	return sgs_container_gap_value( $value );
};

$gap_tablet = $sgs_gallery_gap_tier( $gap_obj['tablet'] ?? '' );
$gap_mobile = $sgs_gallery_gap_tier( $gap_obj['mobile'] ?? '' );

if ( '' !== $gap_tablet ) {
	$gallery_responsive_css .= '@media (max-width:1023px){' . $root_sel . '{--sgs-gap:' . $gap_tablet . '}}';
}
if ( '' !== $gap_mobile ) {
	$gallery_responsive_css .= '@media (max-width:767px){' . $root_sel . '{--sgs-gap:' . $gap_mobile . '}}';
}

// -------------------------------------------------------------------------
// Explicit image-controls crop (Spec 35 capability-routing doctrine, Part 9,
// mechanism (c)). block.json declares `imageControlsExplicit:true` so the
// universal render_block guessing-filter (includes/image-controls.php) bails
// out for this block. Block-wide only (one crop setting for every grid
// item — per-item cropping is an explicit non-goal, the array `mediaItems`
// attribute has no per-item position/fit fields). Selector targets every
// grid-item `<img>` uniformly via `.sgs-gallery__img`. Deliberately excludes
// `.sgs-gallery__lightbox-img` (style.css, `object-fit:contain`) — a
// separate, natural-size element per the block census, never scoped by this
// selector.
//
// object-fit split out (rule 37-media-no-handroll fix): `sgsObjectFit` is now
// read by the media-element atom below, not here — pass a copy with it
// cleared so this call only ever emits `object-position` (its `sgsObjectFit`
// half would otherwise duplicate the atom's `var(--sgs-media-object-fit)`
// declaration on the SAME element with higher specificity, silently making
// the atom's value dead the moment an operator set one). Object-position has
// no atom coverage yet (`focal-point`, not in scope for this fix) and stays
// on this explicit mechanism unchanged.
$gallery_responsive_css .= sgs_media_position_css(
	array_merge( $attributes, array( 'sgsObjectFit' => '' ) ),
	'sgs',
	$root_sel . ' .sgs-gallery__img'
);

// Media-element atom layer — object-fit only (rule 37-media-no-handroll fix).
// Reads the SAME `sgsObjectFit` attribute the block already stores (see the
// block.json `_comment_mediaElements`); emits `.{scope}{--sgs-media-object-fit:…}`
// which assets/css/media-atoms/object-fit.css's `.sgs-media-el` rule consumes.
// No value set -> no declaration -> that stylesheet's own `cover` fallback
// applies, matching the removed style.css default exactly (style.css).
if ( class_exists( 'SGS_Media_Element' ) ) {
	$gallery_responsive_css .= SGS_Media_Element::style(
		$attributes,
		'sgs',
		'sgs/gallery',
		$uid,
		array( 'object-fit' )
	);
}

$gallery_style_engine_args = array();

$gallery_color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$gallery_color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$gallery_color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$gallery_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $gallery_color_args ) ) {
	$gallery_style_engine_args['color'] = $gallery_color_args;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

if ( ! empty( $gallery_style_engine_args ) ) {
	$gallery_scoped_styles = wp_style_engine_get_styles(
		$gallery_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $gallery_scoped_styles['css'] ) ) {
		$gallery_responsive_css .= $gallery_scoped_styles['css'];
	}
}

// -------------------------------------------------------------------------
// Wrapper class and data attributes.
// -------------------------------------------------------------------------
$gallery_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$gallery_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$wrapper_classes = implode( ' ', array_filter( [
	'sgs-gallery',
	'sgs-gallery--' . $layout,
	'sgs-gallery--hover-' . $hover_effect,
	$enable_lightbox ? 'sgs-gallery--lightbox-enabled' : '',
	$hover_img_zoom  ? 'sgs-gallery--zoom'             : '',
	$hover_shadow    ? 'sgs-has-hover'                 : '',
	$hover_grayscale ? 'sgs-has-grayscale'             : '',
	$stagger_delay   ? 'sgs-has-stagger'               : '',
	( $show_captions && $caption_reveal ) ? 'sgs-gallery--caption-reveal' : '',
	$uid,
	// Skip-serialised `color` support also stops WP auto-adding the standard
	// has-*-color / has-*-background-color classes onto the wrapper — re-add
	// them manually (mirrors sgs/hero) so preset palette colours still resolve.
	'' !== $gallery_preset_text_slug ? 'has-text-color' : '',
	'' !== $gallery_preset_text_slug ? 'has-' . $gallery_preset_text_slug . '-color' : '',
	'' !== $gallery_preset_bg_slug   ? 'has-background' : '',
	'' !== $gallery_preset_bg_slug   ? 'has-' . $gallery_preset_bg_slug . '-background-color' : '',
] ) );

// Build extra_attrs — Interactivity API data-* attrs (view.js reads these).
$extra_attrs = array();
if ( $enable_lightbox ) {
	$extra_attrs['data-wp-interactive'] = 'sgs/gallery';
	$extra_attrs['data-wp-context']     = $context_data;
}
// Carousel autoplay/speed — only the carousel layout has anything to
// autoplay; other layouts never read these. view.js (initCarousel) reads
// galleryEl.dataset.autoplay as the literal string 'true'/'false' and
// dataset.speed as an integer-ms string, so match those shapes exactly.
if ( 'carousel' === $layout ) {
	$extra_attrs['data-autoplay'] = $carousel_autoplay ? 'true' : 'false';
	$extra_attrs['data-speed']    = (string) $carousel_speed;
}

// Build interior HTML via output buffer.
ob_start();
?>

	<?php /* ----------------------------------------------------------------
	       Gallery grid / masonry / carousel inner track
	       ---------------------------------------------------------------- */ ?>
	<div class="sgs-gallery__grid"<?php echo $grid_fx_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $grid_fx_attr is built entirely from literal strings above, no dynamic value. ?>>

		<?php
		if ( empty( $images ) ) :
			?>
			<div class="sgs-gallery__empty" role="status">
				<svg class="sgs-gallery__empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
					<polyline points="21 15 16 10 5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<p class="sgs-gallery__empty-heading"><?php esc_html_e( 'No images yet', 'sgs-blocks' ); ?></p>
				<p class="sgs-gallery__empty-text"><?php esc_html_e( 'Add images via the editor sidebar to populate this gallery.', 'sgs-blocks' ); ?></p>
			</div>
			<?php
		else :
			foreach ( $images as $index => $img ) :
				$img_id         = absint( $img['id'] ?? 0 );
				$img_type       = isset( $img['type'] ) ? sanitize_key( $img['type'] ) : 'image';
				// Item 18 (2026-09-02, decorative-image-aria) — per-item field on the
				// mediaItems repeater (Spec 00 field-level naming). When set, the image
				// is purely decorative: alt is blanked and aria-hidden="true" is added
				// so assistive tech skips it entirely (WCAG 2.1 AA 1.1.1), instead of a
				// client either writing meaningless alt text or leaving it blank and
				// hoping.
				$img_decorative = ! empty( $img['decorative'] );
				$img_alt        = $img_decorative ? '' : esc_attr( wp_strip_all_tags( $img['alt'] ?? '' ) );
				$img_caption    = $show_captions ? esc_html( wp_strip_all_tags( $img['caption'] ?? '' ) ) : '';

				// Build the unified media-slot shape for sgs_render_media().
				$item_media = array(
					'url'  => $img['url'] ?? '',
					'type' => $img_type,
					'id'   => $img_id,
					'alt'  => $img_decorative ? '' : ( $img['alt'] ?? '' ),
					'mime' => $img['mime'] ?? '',
				);
				$item_html = sgs_render_media( $item_media, 'sgs/gallery' );
				if ( $img_decorative ) {
					// sgs_render_media() has no aria-hidden param (shared helper — out of
					// scope to change here). Its output always opens with a literal
					// `<img ` or `<video ` tag (helpers-media.php), so a single anchored
					// replacement on the OPENING tag only is safe.
					$item_html = preg_replace( '/^<(img|video)\s/', '<$1 aria-hidden="true" ', $item_html, 1 );
				}

				// Determine the aspect-ratio and stagger delay for this item. Both
				// are CSS custom-PROPERTY VALUES (never a raw property
				// declaration) — style.css reads --sgs-item-aspect via a scoped
				// `aspect-ratio: var(...)` rule. VARIES per item (FR-32-4, D345),
				// so it cannot be a single scoped rule on the block root; emitted
				// into a `:nth-child(N)` scoped rule instead (same mechanism as
				// sgs/social-icons' / sgs/card-grid's per-item values) — every
				// image renders `.sgs-gallery__item` unconditionally, so position
				// is stable. $sgs_css_ratio allows digits, dot, and the "/" the
				// aspect-ratio grammar needs (e.g. "16/9"). No `style` attribute
				// is ever written on the item (FR-32-1 forbids a bare `style=""`).
				$item_style_decls = array();
				if ( $aspect_ratio ) {
					$item_style_decls[] = '--sgs-item-aspect:' . $sgs_css_ratio( $aspect_ratio );
				}
				if ( $stagger_delay > 0 ) {
					$item_style_decls[] = '--sgs-item-index:' . absint( $index );
				}
				if ( ! empty( $item_style_decls ) ) {
					$gallery_responsive_css .= $root_sel . ' .sgs-gallery__item:nth-child(' . ( absint( $index ) + 1 ) . '){' . implode( ';', $item_style_decls ) . ';}';
				}

				// Spec 35 Part 4 — per-item crop, keyed by the item's OWN
				// stable `_key`, never `:nth-child`/array index (unlike the
				// aspect-ratio/stagger rule just above, which is genuinely
				// POSITION-bound and safe with nth-child — crop is IDENTITY-
				// bound: reordering must keep each photo's own crop, not the
				// crop that happened to sit at that grid position). Additive
				// override of the block-wide sgs_media_position_css() call
				// below; only emits when this item sets a non-default value.
				$gallery_item_key        = ! empty( $img['_key'] ) ? (string) $img['_key'] : 'idx-' . absint( $index );
				$gallery_responsive_css .= sgs_media_position_css(
					array(
						'objectPosition' => $img['focalPoint'] ?? null,
						'objectFit'      => $img['objectFit'] ?? '',
					),
					'',
					$root_sel . ' [data-gallery-item-key="' . esc_attr( $gallery_item_key ) . '"] img, '
						. $root_sel . ' [data-gallery-item-key="' . esc_attr( $gallery_item_key ) . '"] video'
				);

				// Determine full-size URL for lightbox data attribute.
				$full_url = '';
				if ( $img_id ) {
					$full_src = wp_get_attachment_image_src( $img_id, 'full' );
					$full_url = $full_src ? esc_url( $full_src[0] ) : '';
				}
				if ( ! $full_url && ! empty( $img['fullUrl'] ) ) {
					$full_url = esc_url( $img['fullUrl'] );
				}

				if ( $enable_lightbox ) :
					// Each item is a button — clicking opens the lightbox at this index.
					?>
					<figure
						class="sgs-gallery__item"
						data-gallery-item-key="<?php echo esc_attr( $gallery_item_key ); ?>"
					>
						<button
							type="button"
							class="sgs-gallery__item-btn"
							aria-label="<?php
								/* translators: %s: image alt text */
								printf( esc_attr__( 'View %s in lightbox', 'sgs-blocks' ), $img_alt ?: esc_attr__( 'image', 'sgs-blocks' ) );
							?>"
							data-wp-on--click="actions.openLightbox"
							data-wp-context="<?php echo esc_attr( wp_json_encode( array( 'currentIndex' => $index ) ) ); ?>"
						>
							<div class="sgs-gallery__img-wrap">
								<?php
								if ( 'image' === $img_type && $img_id ) {
									// Prefer wp_get_attachment_image() for images with attachment IDs —
									// it emits srcset, the requested size, and lazy-loading natively.
									echo wp_get_attachment_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_get_attachment_image() is safe.
										$img_id,
										$image_size,
										false,
										array_merge(
											array(
												'class'   => $sgs_gallery_img_class,
												'loading' => $index < 4 ? 'eager' : 'lazy',
											),
											// Item 18 (decorative-image-aria): overriding 'alt' here beats
											// wp_get_attachment_image()'s own default (the attachment's
											// stored _wp_attachment_image_alt meta), and 'aria-hidden'
											// passes straight through as an extra attribute.
											$img_decorative ? array( 'alt' => '', 'aria-hidden' => 'true' ) : array()
										)
									);
								} else {
									// Video items, or images without an attachment ID, render via the
									// shared media-slot helper — emits <img> or <video> as needed. Pre-
									// existing gap, unchanged by this fix: sgs_render_media() does not
									// receive `sgs-gallery__img` (or the new media-element marker) either,
									// so this path never carried the object-fit rule.
									echo $item_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — sgs_render_media() escapes internally.
								}
								?>
							</div>
						</button>
						<?php if ( 'overlay-slide' === $hover_effect && ( $img_alt || $img_caption ) ) : ?>
							<div class="sgs-gallery__overlay">
								<?php echo $img_caption ? $img_caption : $img_alt; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already escaped above. ?>
							</div>
						<?php endif; ?>
						<?php if ( $show_captions && $img_caption ) : ?>
							<figcaption class="sgs-gallery__caption">
								<?php echo $img_caption; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already esc_html() above. ?>
							</figcaption>
						<?php endif; ?>
					</figure>
					<?php

				else :
					// No lightbox — plain figure with a link to the full image.
					?>
					<figure
						class="sgs-gallery__item"
						data-gallery-item-key="<?php echo esc_attr( $gallery_item_key ); ?>"
					>
						<div class="sgs-gallery__img-wrap">
							<?php
							if ( 'image' === $img_type && $img_id ) {
								echo wp_get_attachment_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — wp_get_attachment_image() is safe.
									$img_id,
									$image_size,
									false,
									array_merge(
										array(
											'class'   => $sgs_gallery_img_class,
											'loading' => $index < 4 ? 'eager' : 'lazy',
										),
										// Item 18 (decorative-image-aria) — see the lightbox branch above
										// for the rationale (same override, no-lightbox path).
										$img_decorative ? array( 'alt' => '', 'aria-hidden' => 'true' ) : array()
									)
								);
							} else {
								// Pre-existing gap, unchanged by this fix — see the lightbox branch
								// above.
								echo $item_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — sgs_render_media() escapes internally.
							}
							?>
						</div>
						<?php if ( 'overlay-slide' === $hover_effect && ( $img_alt || $img_caption ) ) : ?>
							<div class="sgs-gallery__overlay">
								<?php echo $img_caption ? $img_caption : $img_alt; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already escaped above. ?>
							</div>
						<?php endif; ?>
						<?php if ( $show_captions && $img_caption ) : ?>
							<figcaption class="sgs-gallery__caption">
								<?php echo $img_caption; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — already esc_html() above. ?>
							</figcaption>
						<?php endif; ?>
					</figure>
					<?php

				endif;

			endforeach;
		endif;
		?>

	</div>
	<?php /* end .sgs-gallery__grid */ ?>

	<?php /* ----------------------------------------------------------------
	       Carousel controls (prev/next arrows + dots)
	       Only rendered when layout = carousel.
	       ---------------------------------------------------------------- */ ?>
	<?php if ( 'carousel' === $layout ) : ?>

		<?php if ( $carousel_show_arrows ) : ?>
			<button
				type="button"
				class="sgs-gallery__carousel-prev"
				aria-label="<?php esc_attr_e( 'Previous image', 'sgs-blocks' ); ?>"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button
				type="button"
				class="sgs-gallery__carousel-next"
				aria-label="<?php esc_attr_e( 'Next image', 'sgs-blocks' ); ?>"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		<?php endif; ?>

		<?php if ( $carousel_show_dots ) : ?>
			<div
				class="sgs-gallery__carousel-dots"
				role="tablist"
				aria-label="<?php esc_attr_e( 'Gallery navigation', 'sgs-blocks' ); ?>"
			></div>
		<?php endif; ?>

	<?php endif; ?>

	<?php /* ----------------------------------------------------------------
	       Lightbox modal — always in DOM, opened via dialog.showModal().
	       Only rendered when enableLightbox is true.
	       ---------------------------------------------------------------- */ ?>
	<?php if ( $enable_lightbox ) : ?>

		<?php
		/* A NATIVE <dialog>, opened with showModal() — NOT a <div> with a big
		   z-index (D806). Measured live on canary 2242: the lightbox is sealed
		   inside `div.entry-content.wp-block-post-content`, which carries
		   `position:relative; z-index:1` on EVERY page, so `z-index:100000`
		   here lost to the sticky site header's `z-index:100` in the ROOT
		   stacking context. elementFromPoint over the open lightbox returned
		   `a.sgs-nav-menu__link`. No number could have won that fight and no
		   container-scoped fix could either — only the top layer escapes an
		   ancestor stacking context. Mirrors sgs/modal, which already does
		   this, and inherits the UA focus trap + Escape for free.
		   `role`/`aria-modal` are deliberately ABSENT: showModal() supplies
		   both, and authoring them on a native dialog is redundant. */
		?>
		<dialog
			class="sgs-gallery__lightbox"
			aria-label="<?php esc_attr_e( 'Image lightbox', 'sgs-blocks' ); ?>"
			data-wp-class--sgs-gallery__lightbox--open="state.isLightboxOpen"
			data-wp-on--close="actions.closeLightbox"
			data-wp-on-window--keydown="callbacks.onKeydown"
		>
			<button
				type="button"
				class="sgs-gallery__lightbox-close"
				aria-label="<?php esc_attr_e( 'Close lightbox', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.closeLightbox"
			>
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					<line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				</svg>
			</button>

			<button
				type="button"
				class="sgs-gallery__lightbox-prev"
				aria-label="<?php esc_attr_e( 'Previous image', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.prevImage"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			<div class="sgs-gallery__lightbox-body">
				<img
					class="sgs-gallery__lightbox-img"
					data-wp-bind--src="state.currentFullUrl"
					data-wp-bind--alt="state.currentAlt"
					src=""
					alt=""
				/>
				<p
					class="sgs-gallery__lightbox-caption"
					data-wp-text="state.currentCaption"
				></p>
			</div>

			<button
				type="button"
				class="sgs-gallery__lightbox-next"
				aria-label="<?php esc_attr_e( 'Next image', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.nextImage"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
					<polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			<p class="sgs-gallery__lightbox-counter" data-wp-text="state.counterText"></p>

		</dialog>

	<?php endif; ?>

<?php
$inner_html = ob_get_clean();

// Output the gallery's own scoped <style> (color/border no-inline re-emit).
// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving

// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$gallery_responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$gallery_responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$gallery_responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$gallery_responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$gallery_responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$gallery_responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// CSS combinators like `>` intact. Every value reaching $gallery_responsive_css
// is pre-sanitised (sgs_css_length_value() / sgs_css_keyword_sanitise() / wp_style_engine_get_styles),
// so no un-sanitised value survives to here.
if ( $gallery_responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $gallery_responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $gallery_responsive_css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'              => 'div',
		'extra_classes'    => explode( ' ', $wrapper_classes ),
		'extra_styles'     => array( $inline_styles ),
		'extra_attrs'      => $extra_attrs,
		// Spec 37 FR-37-16 (Spec 35 Phase 1.4, 2026-08-10): padding / margin /
		// max-width / content-width are stored as the {desktop,tablet,mobile}
		// object model, and sgs_emit_responsive_css() owns their responsive CSS.
		//
		// Safe for this block's OTHER responsive attrs: the flag only diverts a
		// value that is actually array-shaped. gap ("16") and the
		// gridTemplateColumns* family are flat strings here, so every is_array()
		// guard in the wrapper leaves them on the legacy scalar path unchanged —
		// the wrapper's own comment states that flipping this flag "never breaks
		// an un-migrated instance's columns".
		'container_queries' => true,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
