<?php
/**
 * Server-side render for the SGS Breadcrumbs block.
 *
 * Auto-generates breadcrumbs from the current page hierarchy.
 *
 * BLOCK-PRIVATE, NO-INLINE (LOCKED per-block no-inline migration contract
 * §A/§B/§B3, 2026-07-09): sgs/breadcrumbs is CONTENT-kind (box + width only,
 * single-root <nav>) — it never used any shared wrapper/grid/section machinery,
 * so it renders fully block-private, the same proven pattern as sgs/quote +
 * sgs/heading + sgs/button + sgs/text.
 *
 * The <nav> IS the block root (single semantic element, no wrapper div, §B3),
 * built via get_block_wrapper_attributes(). The rendered subtree carries ZERO
 * inline CSS property declarations — every declaration (base padding/margin,
 * WP color/typography supports, AND the SGS link/separator/current colour
 * custom-property values) is emitted into the block's OWN scoped `.{uid}`
 * <style> tag. WP styling supports (color/typography/spacing) all declare
 * `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines them.
 *
 * The scoped uid is a CLASS (`sgs-bcr-{md5}`, container/heading/quote-style),
 * never an `id`, so the element's single `id` attribute stays free for the
 * anchor (ToC target).
 *
 * BOX-GROUP (contract §B): padding/margin are box objects. Base padding/margin
 * = WP-native style.spacing.* objects (emitted scoped via
 * wp_style_engine_get_styles); tiers = paddingTablet/paddingMobile/
 * marginTablet/marginMobile object attrs (scoped @media 1023/767). No border
 * support on this block.
 *
 * @since 2026-07-10  100% no-inline + 100% box-group migration: dropped the
 *                    inline `style` attribute (custom-property values now
 *                    scoped, not inline); spacing/color/typography supports
 *                    skip-serialised; padding/margin tier attrs added.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Box-object interface contract §1 + security §D sanitisers.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side value can never break out of its
// declaration. Mirrors sgs/button + sgs/container + sgs/heading + sgs/quote.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$separator        = $attributes['separator'] ?? '/';
$show_home        = $attributes['showHome'] ?? true;
$home_label       = $attributes['homeLabel'] ?? 'Home';
$link_colour      = $attributes['linkColour'] ?? 'text-muted';
$separator_colour = $attributes['separatorColour'] ?? 'text-muted';
$current_colour   = $attributes['currentColour'] ?? 'text';
$anchor           = $attributes['anchor'] ?? '';

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

// Responsive spacing tiers — SGS object attrs { top, right, bottom, left }.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color`/`typography` support values (skip-serialised → NOT auto-inlined).
// Custom hex/rgb → emitted scoped via the style engine; preset SLUGS → the
// standard has-* classes re-added manually in step 6.
$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$style_font_size = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';

// ---------------------------------------------------------------------------
// 3. Resolve scope id. Uid is a CLASS (contract §B3) — the element's single
// `id` attribute stays free for the anchor (ToC target).
// ---------------------------------------------------------------------------

$uid      = 'sgs-bcr-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid;

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly. Nothing below is ever written to an inline `style`
// attribute — every declaration lands in the block's own scoped <style> tag.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- SGS link/separator/current colour custom properties — previously an
// inline `style="--sgs-breadcrumbs-*:…"` attribute; now a scoped declaration
// on the root selector. style.css already consumes these same custom-property
// names via var(…, fallback), so no change needed there. ---
$colour_var_decls   = array();
$colour_var_decls[] = '--sgs-breadcrumbs-link-colour:' . sgs_colour_value( $link_colour );
$colour_var_decls[] = '--sgs-breadcrumbs-separator-colour:' . sgs_colour_value( $separator_colour );
$colour_var_decls[] = '--sgs-breadcrumbs-current-colour:' . sgs_colour_value( $current_colour );
$scoped_css[]       = "{$root_sel}{" . implode( ';', $colour_var_decls ) . ';}';

// --- Base spacing (padding/margin) + WP colour/typography supports — skip-
// serialised, emitted scoped via the stable core style engine (exactly how
// WP core outputs `layout` support). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( '' !== $style_color_gradient ) {
		$color_args['gradient'] = $style_color_gradient;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( '' !== $style_font_size ) {
		$base_style_engine_args['typography'] = array( 'fontSize' => $style_font_size );
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
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

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 5. Build the root element's classes + attributes.
//
// Contract §B3: NO wrapper <div>. The <nav> IS the block root. It carries
// get_block_wrapper_attributes() (which auto-adds `wp-block-sgs-breadcrumbs`),
// the pre-existing BEM root class `sgs-breadcrumbs` (consumed by style.css'
// descendant selectors — unchanged), the scoped uid CLASS, and the anchor `id`
// (ToC). NO 'style' key is passed — the root carries ZERO inline property
// declarations (contract §A); everything is in the scoped <style> above.
// ---------------------------------------------------------------------------

$root_classes = array( 'sgs-breadcrumbs', $uid );

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (they set the colour from the theme palette).
if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$root_attr_args = array(
	'class' => implode( ' ', $root_classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attributes = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 6. Build the breadcrumb trail.
// ---------------------------------------------------------------------------

$crumbs = array();

// Home.
if ( $show_home ) {
	$crumbs[] = array(
		'label' => esc_html( $home_label ),
		'url'   => esc_url( home_url( '/' ) ),
	);
}

// Build hierarchy based on context.
if ( is_singular() ) {
	$post = get_queried_object();

	if ( $post ) {
		// Post type archive link.
		$post_type = get_post_type_object( $post->post_type );
		if ( $post_type && $post_type->has_archive ) {
			$crumbs[] = array(
				'label' => esc_html( $post_type->labels->name ),
				'url'   => esc_url( get_post_type_archive_link( $post->post_type ) ),
			);
		}

		// Categories for posts.
		if ( 'post' === $post->post_type ) {
			$categories = get_the_category( $post->ID );
			if ( ! empty( $categories ) ) {
				$cat      = $categories[0];
				$crumbs[] = array(
					'label' => esc_html( $cat->name ),
					'url'   => esc_url( get_category_link( $cat->term_id ) ),
				);
			}
		}

		// Page ancestors.
		if ( $post->post_parent ) {
			$ancestors = array_reverse( get_post_ancestors( $post->ID ) );
			foreach ( $ancestors as $ancestor_id ) {
				$crumbs[] = array(
					'label' => esc_html( get_the_title( $ancestor_id ) ),
					'url'   => esc_url( get_permalink( $ancestor_id ) ),
				);
			}
		}

		// Current page (no link).
		$crumbs[] = array(
			'label' => esc_html( get_the_title( $post->ID ) ),
			'url'   => '',
		);
	}
} elseif ( is_archive() ) {
	$crumbs[] = array(
		'label' => esc_html( get_the_archive_title() ),
		'url'   => '',
	);
} elseif ( is_search() ) {
	$crumbs[] = array(
		'label' => sprintf(
			/* translators: %s: search query */
			__( 'Search: "%s"', 'sgs-blocks' ),
			get_search_query()
		),
		'url'   => '',
	);
} elseif ( is_404() ) {
	$crumbs[] = array(
		'label' => __( 'Page not found', 'sgs-blocks' ),
		'url'   => '',
	);
}

if ( empty( $crumbs ) ) {
	return;
}

$sep_html = sprintf( '<span class="sgs-breadcrumbs__separator" aria-hidden="true">%s</span>', esc_html( $separator ) );

$items_html = '';
$last_index = count( $crumbs ) - 1;

foreach ( $crumbs as $i => $crumb ) {
	$is_last = ( $i === $last_index );

	if ( $is_last ) {
		$items_html .= sprintf(
			'<li class="sgs-breadcrumbs__item sgs-breadcrumbs__item--current" aria-current="page">%s</li>',
			$crumb['label']
		);
	} else {
		$items_html .= sprintf(
			'<li class="sgs-breadcrumbs__item"><a href="%s">%s</a>%s</li>',
			$crumb['url'],
			$crumb['label'],
			$sep_html
		);
	}
}

// Schema.org BreadcrumbList.
$schema_items = array();
foreach ( $crumbs as $i => $crumb ) {
	$schema_items[] = array(
		'@type'    => 'ListItem',
		'position' => $i + 1,
		'name'     => wp_strip_all_tags( $crumb['label'] ),
		'item'     => $crumb['url'] ?: null,
	);
}

$schema = array(
	'@context'        => 'https://schema.org',
	'@type'           => 'BreadcrumbList',
	'itemListElement' => $schema_items,
);

// ---------------------------------------------------------------------------
// 7. Render. wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
// leaving CSS combinators intact (contract §D — matches SGS_Container_Wrapper
// + sgs/heading + sgs/quote). Every value reaching $scoped_css is
// pre-sanitised ($sgs_css_length / wp_style_engine_get_styles /
// sgs_colour_value), so no un-sanitised value survives here.
// ---------------------------------------------------------------------------

if ( $scoped_css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( implode( '', $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

printf(
	'<nav %s aria-label="%s"><ol class="sgs-breadcrumbs__list">%s</ol><script type="application/ld+json">%s</script></nav>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	esc_attr__( 'Breadcrumbs', 'sgs-blocks' ),
	$items_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_json_encode( $schema, JSON_UNESCAPED_SLASHES )
);
