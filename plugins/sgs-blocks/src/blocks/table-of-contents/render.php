<?php
/**
 * Table of Contents — server-side render.
 *
 * Parses the current post content to detect headings
 * and renders a navigable nested list.
 *
 * Uses WordPress's block parser for reliable heading extraction
 * rather than raw regex on post_content.
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Uses wp_style_engine_get_styles() to build the scoped output — exactly how WP core outputs `layout` support (mirrors sgs/label + sgs/media).
 *
 * BOX-GROUP (contract §B): base padding/margin/border-radius are the
 * WP-native `style.spacing.padding` / `style.spacing.margin` /
 * `style.border.radius` objects (already object-shaped by WP core). Tiers
 * are SGS custom object attrs — `paddingTablet`/`paddingMobile`/
 * `marginTablet`/`marginMobile` `{top,right,bottom,left}` and
 * `borderRadiusTablet`/`borderRadiusMobile` `{topLeft,topRight,
 * bottomLeft,bottomRight}` — mirroring sgs/media's proven tier pattern.
 * `borderWidth` stays WP-native (colour/width/style/radius read as one
 * group from `style.border`), base only, no tiers — mirrors sgs/quote's
 * precedent (no operator-facing responsive border-width need; WP's own
 * native border support has no tier concept either).
 *
 * ANCHOR-SAFE (contract §B3): this block deals with heading-anchor `id`s
 * (the `href="#slug"` targets below point at OTHER blocks' ids). The
 * internal CSS-scope token is therefore a CLASS (`.{uid}`), never an `id` —
 * it can never collide with a heading anchor or with this block's own
 * native `supports.anchor` id (which WP core applies automatically from
 * `$attributes['anchor']`; this file never writes an `id` itself).
 *
 * @since 2026-05-16  Initial dynamic render.
 * @since 2026-07-10  No-inline migration (scoped output, box-object tiers).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    (unused — no inner blocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/media).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract behaviour + content attributes with defaults.
// ---------------------------------------------------------------------------

$heading_levels    = $attributes['headingLevels'] ?? array( 2, 3, 4 );
$toc_title         = $attributes['title'] ?? __( 'Table of Contents', 'sgs-blocks' );
$collapsible       = ! empty( $attributes['collapsible'] );
$default_collapsed = ! empty( $attributes['defaultCollapsed'] );
$smooth_scroll     = ! empty( $attributes['smoothScroll'] );
$scroll_offset     = (int) ( $attributes['scrollOffset'] ?? 0 );
$scroll_spy        = ! empty( $attributes['scrollSpy'] );
$list_style        = $attributes['listStyle'] ?? 'numbered';
// Must NOT be named "style" — that name collides with WP core's reserved
// `attributes.style` object (used by the color/spacing/border/typography
// supports below); a string value here ("card"/"minimal"/"flush") vs. an
// object there would clobber one another.
$toc_style         = $attributes['tocStyle'] ?? 'card';
// Fallbacks match block.json defaults so the scoped colour rules always emit
// (matches the pre-migration behaviour where inline styles were always emitted).
$title_colour  = $attributes['titleColour'] ?? 'text';
$title_colour_gradient = $attributes['titleColourGradient'] ?? '';
$link_colour   = $attributes['linkColour'] ?? 'text-muted';
$link_colour_gradient  = $attributes['linkColourGradient'] ?? '';
$active_colour = $attributes['activeLinkColour'] ?? 'primary';
$active_colour_gradient = $attributes['activeLinkColourGradient'] ?? '';

// ---------------------------------------------------------------------------
// 3. Parse headings from post content.
// ---------------------------------------------------------------------------

$post = get_post();
if ( ! $post ) {
	return;
}

$post_content = $post->post_content;
if ( empty( $post_content ) ) {
	return;
}

// Use WordPress block parser for reliable heading extraction.
$blocks     = parse_blocks( $post_content );
$headings   = array();
$used_slugs = array();

/**
 * Recursively extract headings from parsed blocks.
 *
 * @param array $blocks      Parsed block array.
 * @param array &$headings   Collected headings.
 * @param array &$used_slugs Slugs already used (for deduplication).
 * @param array $levels      Heading levels to include.
 */
if ( ! function_exists( 'sgs_toc_extract_headings' ) ) :
	function sgs_toc_extract_headings( array $blocks, array &$headings, array &$used_slugs, array $levels ): void {
		foreach ( $blocks as $block ) {
			$block_name     = $block['blockName'] ?? '';
			$is_sgs_heading = ( 'sgs/heading' === $block_name );
			if ( 'core/heading' === $block_name || $is_sgs_heading ) {
				// core/heading stores a numeric level; sgs/heading stores an 'h2'–'h6' string.
				$level = $is_sgs_heading
				? (int) ltrim( (string) ( $block['attrs']['level'] ?? 'h2' ), 'h' )
				: (int) ( $block['attrs']['level'] ?? 2 );

				if ( ! in_array( $level, $levels, true ) ) {
					continue;
				}

				// sgs/heading is dynamic (text lives in the `content` attr); core/heading is static (innerHTML).
				$text = wp_strip_all_tags( $is_sgs_heading ? ( $block['attrs']['content'] ?? '' ) : ( $block['innerHTML'] ?? '' ) );
				$text = trim( $text );

				if ( empty( $text ) ) {
					continue;
				}

				// Check for sgs-toc-ignore class.
				if ( isset( $block['attrs']['className'] ) && str_contains( $block['attrs']['className'], 'sgs-toc-ignore' ) ) {
					continue;
				}

				// Use explicit anchor if set, otherwise generate from text.
				if ( ! empty( $block['attrs']['anchor'] ) ) {
					$slug = $block['attrs']['anchor'];
				} else {
					$slug = sanitize_title( $text );
				}

				if ( empty( $slug ) ) {
					continue;
				}

				// Deduplicate slugs.
				$original = $slug;
				$counter  = 2;
				while ( in_array( $slug, $used_slugs, true ) ) {
					$slug = $original . '-' . $counter;
					++$counter;
				}
				$used_slugs[] = $slug;

				$headings[] = array(
					'level' => $level,
					'text'  => $text,
					'id'    => $slug,
				);
			}

			// Recurse into inner blocks (headings inside groups, columns, etc.).
			if ( ! empty( $block['innerBlocks'] ) ) {
				sgs_toc_extract_headings( $block['innerBlocks'], $headings, $used_slugs, $levels );
			}
		}
	}
endif;

sgs_toc_extract_headings( $blocks, $headings, $used_slugs, $heading_levels );

if ( empty( $headings ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly. uid is a CLASS (anchor-safe — contract §B3): this
// block's own scoped selector must never collide with a heading anchor id
// or with this block's own native `anchor` support id.
// ---------------------------------------------------------------------------

$uid       = 'sgs-toc-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel  = '.' . $uid . '.wp-block-sgs-table-of-contents';
$title_sel = $root_sel . ' .sgs-toc__title';
$link_sel  = $root_sel . ' .sgs-toc__link';
$active_sel = $root_sel . ' .sgs-toc__link.sgs-toc__link--active';

$scoped_css = array();

// --- Root native supports (colour text/background, spacing padding/margin,
// border colour/width/style/radius, typography fontSize/lineHeight) — ALL
// skip-serialised in block.json, read here from $attributes['style'] and
// emitted in ONE combined call via the stable core style engine. ---
$style_color = ( isset( $attributes['style']['color'] ) && is_array( $attributes['style']['color'] ) ) ? $attributes['style']['color'] : array();
$color_args  = array();
if ( ! empty( $style_color['text'] ) ) {
	$color_args['text'] = $style_color['text'];
}
if ( ! empty( $style_color['background'] ) ) {
	$color_args['background'] = $style_color['background'];
}

$style_spacing = ( isset( $attributes['style']['spacing'] ) && is_array( $attributes['style']['spacing'] ) ) ? $attributes['style']['spacing'] : array();
$spacing_args  = array();
if ( ! empty( $style_spacing['padding'] ) ) {
	$spacing_args['padding'] = $style_spacing['padding'];
}
if ( ! empty( $style_spacing['margin'] ) ) {
	$spacing_args['margin'] = $style_spacing['margin'];
}

// Native border group (colour/width/style/radius) — base only, via the
// stable core style-engine API (matches sgs/media + sgs/quote's proven
// pattern: WP core's own sanitisation, never hand-rolled).
$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

$root_style_args = array();
if ( $color_args ) {
	$root_style_args['color'] = $color_args;
}
if ( $spacing_args ) {
	$root_style_args['spacing'] = $spacing_args;
}
if ( $native_border ) {
	$root_style_args['border'] = $native_border;
}

if ( ! empty( $root_style_args ) ) {
	$root_out = wp_style_engine_get_styles(
		$root_style_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $root_out['css'] ) ) {
		$scoped_css[] = $root_out['css'];
	}
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize + lineHeight only) with the framework's own
// helper, which also now offers fontWeight/fontStyle.
$scoped_css[] = sgs_typography_css_rule( $attributes, '', $root_sel );

// --- Responsive padding/margin tiers — SGS custom box objects, hand-built
// shorthand, scoped @media on the SAME selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). Mirrors sgs/label + sgs/quote. ---
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// --- Responsive border-radius tiers — SGS custom 4-CORNER object attrs,
// routed through the same stable core style-engine API (mirrors sgs/media's
// proven borderRadiusTablet/borderRadiusMobile pattern). ---
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

if ( ! empty( $border_radius_tablet_obj ) ) {
	$radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $radius_tab_out['css'] . '}';
	}
}
if ( ! empty( $border_radius_mobile_obj ) ) {
	$radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $radius_mob_out['css'] . '}';
	}
}

// --- Custom design-token colour attrs (title / link / active-link) — SGS
// DesignTokenPicker attrs, not WP-native supports. Resolved via the shared
// sgs_colour_value() helper (handles slug → var(--wp--preset--color--X),
// raw CSS colours, and var() passthrough identically to sgs/label). Emitted
// scoped, never inline. Active rule emitted AFTER the base link rule so it
// wins the tie on equal specificity by source order. ---
$title_colour_effective = sgs_resolve_text_colour_or_gradient( $title_colour, $title_colour_gradient );
if ( '' !== $title_colour_effective ) {
	$title_colour_decl = sgs_text_colour_decl( $title_colour_effective );
	if ( '' !== $title_colour_decl ) {
		$scoped_css[] = "{$title_sel}{{$title_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $title_sel, $title_colour_effective );
}
$link_colour_effective = sgs_resolve_text_colour_or_gradient( $link_colour, $link_colour_gradient );
if ( '' !== $link_colour_effective ) {
	$link_colour_decl = sgs_text_colour_decl( $link_colour_effective );
	if ( '' !== $link_colour_decl ) {
		$scoped_css[] = "{$link_sel}{{$link_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $link_sel, $link_colour_effective );
}
$active_colour_effective = sgs_resolve_text_colour_or_gradient( $active_colour, $active_colour_gradient );
if ( '' !== $active_colour_effective ) {
	$active_colour_decl = sgs_text_colour_decl( $active_colour_effective );
	if ( '' !== $active_colour_decl ) {
		$scoped_css[] = "{$active_sel}{{$active_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $active_sel, $active_colour_effective );
}

// ---------------------------------------------------------------------------
// 5. Build the root element's classes + attributes. uid is a CLASS. NO
// 'style' key is passed to get_block_wrapper_attributes() — the root and
// every descendant carry ZERO inline property declarations (contract §A);
// every declaration lives in the scoped <style> above. Scroll-spy active
// colouring is CSS-class-driven (view.js toggles `.sgs-toc__link--active`
// only — no runtime inline style, see view.js).
// ---------------------------------------------------------------------------

$classes = array(
	'sgs-toc',
	'sgs-toc--' . esc_attr( $toc_style ),
	'sgs-toc--' . esc_attr( $list_style ),
	$uid,
);

$wrapper = get_block_wrapper_attributes(
	array(
		'class'              => implode( ' ', $classes ),
		'data-smooth-scroll' => $smooth_scroll ? 'true' : 'false',
		'data-scroll-offset' => (string) $scroll_offset,
		'data-scroll-spy'    => $scroll_spy ? 'true' : 'false',
		'aria-label'         => esc_attr( $toc_title ),
	)
);

$list_tag = 'numbered' === $list_style ? 'ol' : 'ul';

// Use <details>/<summary> for collapsible (progressive enhancement).
$open_attr = $default_collapsed ? '' : ' open';


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
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( $scoped_css ) :
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
	// leaving CSS combinators like `>` intact (contract §D). Every value
	// reaching $scoped_css is pre-sanitised (sgs_css_length_value() / esc_attr /
	// sgs_colour_value / wp_style_engine_get_styles), so no un-sanitised
	// value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<?php

ob_start();

if ( $collapsible ) {
	printf( '<nav %s>', $wrapper ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	printf( '<details%s>', $open_attr );
	printf(
		'<summary class="sgs-toc__title">%s</summary>',
		esc_html( $toc_title )
	);
} else {
	printf( '<nav %s>', $wrapper ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	if ( $toc_title ) {
		printf(
			'<p class="sgs-toc__title">%s</p>',
			esc_html( $toc_title )
		);
	}
}

printf( '<%s class="sgs-toc__list">', $list_tag );

foreach ( $headings as $heading ) {
	printf(
		'<li class="sgs-toc__item sgs-toc__item--h%d"><a class="sgs-toc__link" href="#%s">%s</a></li>',
		$heading['level'],
		esc_attr( $heading['id'] ),
		esc_html( $heading['text'] )
	);
}

printf( '</%s>', $list_tag );

if ( $collapsible ) {
	echo '</details>';
}

echo '</nav>';

echo ob_get_clean();
