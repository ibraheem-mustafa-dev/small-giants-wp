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
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-10):
 * the rendered `<nav>` root and every descendant carry ZERO inline CSS
 * property declarations. Every declared WP styling support
 * (`color`/`typography`/`spacing`/`__experimentalBorder`) carries
 * `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines them; this file reads
 * the resolved values from `$attributes['style'][...]` (still populated by
 * WP) and emits them into the block's OWN scoped `.{uid}` <style> tag via
 * the stable core API `wp_style_engine_get_styles()` — exactly how WP core
 * outputs `layout` support (mirrors sgs/label + sgs/media).
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

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

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
// NOTE (2026-07-10, no-inline migration): this attr was renamed style -> tocStyle.
// The old name "style" collided with WP core's reserved `attributes.style`
// object (used by the color/spacing/border/typography supports below) — a
// string value here ("card"/"minimal"/"flush") vs. an object there caused
// each to clobber the other. This is very likely the root cause of the
// block's prior "broken" status. Renamed across block.json/render.php/edit.js.
$toc_style         = $attributes['tocStyle'] ?? 'card';
// Fallbacks match block.json defaults so the scoped colour rules always emit
// (matches the pre-migration behaviour where inline styles were always emitted).
$title_colour  = $attributes['titleColour'] ?? 'text';
$link_colour   = $attributes['linkColour'] ?? 'text-muted';
$active_colour = $attributes['activeLinkColour'] ?? 'primary';

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

$style_typography = ( isset( $attributes['style']['typography'] ) && is_array( $attributes['style']['typography'] ) ) ? $attributes['style']['typography'] : array();
$typography_args  = array();
if ( ! empty( $style_typography['fontSize'] ) ) {
	$typography_args['fontSize'] = $style_typography['fontSize'];
}
if ( ! empty( $style_typography['lineHeight'] ) ) {
	$typography_args['lineHeight'] = $style_typography['lineHeight'];
}

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
if ( $typography_args ) {
	$root_style_args['typography'] = $typography_args;
}

if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $root_style_args ) ) {
	$root_out = wp_style_engine_get_styles(
		$root_style_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $root_out['css'] ) ) {
		$scoped_css[] = $root_out['css'];
	}
}

// --- Responsive padding/margin tiers — SGS custom box objects, hand-built
// shorthand, scoped @media on the SAME selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). Mirrors sgs/label + sgs/quote. ---
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

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

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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
}

// --- Custom design-token colour attrs (title / link / active-link) — SGS
// DesignTokenPicker attrs, not WP-native supports. Resolved via the shared
// sgs_colour_value() helper (handles slug → var(--wp--preset--color--X),
// raw CSS colours, and var() passthrough identically to sgs/label). Emitted
// scoped, never inline. Active rule emitted AFTER the base link rule so it
// wins the tie on equal specificity by source order. ---
if ( $title_colour ) {
	$scoped_css[] = "{$title_sel}{color:" . sgs_colour_value( $title_colour ) . ';}';
}
if ( $link_colour ) {
	$scoped_css[] = "{$link_sel}{color:" . sgs_colour_value( $link_colour ) . ';}';
}
if ( $active_colour ) {
	$scoped_css[] = "{$active_sel}{color:" . sgs_colour_value( $active_colour ) . ';}';
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

if ( $scoped_css ) :
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
	// leaving CSS combinators like `>` intact (contract §D). Every value
	// reaching $scoped_css is pre-sanitised ($sgs_css_length / esc_attr /
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
