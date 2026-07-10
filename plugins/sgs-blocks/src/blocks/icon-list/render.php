<?php
/**
 * Server-side render for the SGS Icon List block.
 *
 * Outputs inline SVG icons via sgs_get_lucide_icon(), eliminating brittle
 * CSS content/Unicode rendering that breaks on some platforms.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-09):
 * the rendered `<ul>` root AND every `<li>`/icon-span/text-span descendant
 * carry ZERO inline CSS property declarations. Every declaration is emitted
 * into the block's OWN scoped `.{uid}` <style> tag. The `color`/`typography`/
 * `spacing`/`__experimentalBorder` WP supports declare
 * `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines them. The `--sgs-icon-
 * list-gap` custom property on the root is a VALUE, not a declaration, so it
 * stays on the element per the contract.
 *
 * BLOCK-PRIVATE (this is a leaf composite — an arrayContentLift list of
 * icon+text items rendered from a single `items` attribute, not a genuine
 * section/layout composite) — no SGS_Container_Wrapper involved, mirrors
 * sgs/label.
 *
 * BOX-GROUP (contract §B): `padding`/`margin` are WP-native
 * `style.spacing.*` objects (skip-serialised → scoped via
 * wp_style_engine_get_styles); tiers = paddingTablet/paddingMobile/
 * marginTablet/marginMobile SGS object attrs. `borderRadius` is the
 * WP-native `style.border.radius` object (skip-serialised, scoped); tiers =
 * borderRadiusTablet/borderRadiusMobile SGS object attrs. `borderWidth` has
 * no WP-native per-side support in this block's `__experimentalBorder`
 * config (radius only), so it is an SGS custom object attr `{top,right,
 * bottom,left}` (base only, matches sgs/quote's pattern), paired with the
 * scalar `borderColour`/`borderStyle` attrs.
 *
 * Per-item icon/text colour (iconColour/textColour) previously wrote an
 * identical `style="color:…"` attribute onto EVERY `<li>`'s icon/text span
 * (not truly per-item — same value repeated across the array). These now
 * emit ONCE into the scoped `<style>` targeting `.{uid} .sgs-icon-list__icon`
 * / `.{uid} .sgs-icon-list__text`, never inline on the repeated elements.
 *
 * @since 2026-05-?? Initial icon-list render.
 * @since 2026-07-10 No-inline migration (box-object attrs + scoped output).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values and a CSS-keyword sanitiser for free-text properties (mirrors
// sgs/label + sgs/quote).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Legacy editor slug → Lucide name (items authored before the visual picker).
// ---------------------------------------------------------------------------

$icon_map = array(
	'check'       => 'check',
	'star-filled' => 'star',
	'arrow-right' => 'arrow-right',
	'shipping'    => 'truck',
	'shield'      => 'shield',
	'payment'     => 'credit-card',
	'globe'       => 'globe',
	'people'      => 'users',
);

/**
 * Render the inner markup for an icon from any of the four sources.
 * Decorative — the caller wraps it in an aria-hidden span.
 *
 * @param string $source lucide | wp-icon | dashicon | emoji.
 * @param string $name   Icon identifier for that source.
 * @return string Inner icon markup.
 */
$render_icon = static function ( $source, $name ) {
	switch ( $source ) {
		case 'emoji':
			return esc_html( $name );
		case 'dashicon':
			$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) );
			return '<span class="dashicons dashicons-' . esc_attr( $slug ) . '"></span>';
		case 'wp-icon':
			return sgs_get_wp_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) );
		case 'lucide':
		default:
			return sgs_get_lucide_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) );
	}
};

// ---------------------------------------------------------------------------
// 3. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$items          = $attributes['items'] ?? array();
$default_icon   = $attributes['icon'] ?? 'check';
$default_source = $attributes['defaultIconSource'] ?? 'lucide';
$icon_colour    = $attributes['iconColour'] ?? '';
$icon_size      = $attributes['iconSize'] ?? 'medium';
$dividers       = ! empty( $attributes['dividers'] );
$text_colour    = $attributes['textColour'] ?? '';
$gap            = $attributes['gap'] ?? '20';

// Validate icon size — only allow known sizes.
$allowed_icon_sizes = array( 'small', 'medium', 'large', 'xlarge' );
if ( ! in_array( $icon_size, $allowed_icon_sizes, true ) ) {
	$icon_size = 'medium';
}

// Sanitise gap to digits only — it is used as a spacing preset slug (e.g. "20", "30").
$gap_slug = preg_replace( '/[^0-9]/', '', $gap );

// ---------------------------------------------------------------------------
// 4. Box-object attrs — padding/margin (WP-native style.spacing.*, base) +
// SGS tier objects; border-radius (WP-native style.border.radius, base) +
// SGS tier objects; border-width (SGS custom object, base only).
// ---------------------------------------------------------------------------

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

$padding_tablet_obj      = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj      = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj       = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj       = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Skip-serialised
// → emitted scoped via the style engine below.
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// Border-width — SGS custom OBJECT attr { top, right, bottom, left }, base
// only (no tiers — matches the pre-existing base-only contract, sgs/quote
// pattern). Paired with scalar borderColour/borderStyle attrs.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width     = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style           = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour          = $attributes['borderColour'] ?? '';

// WP `color`/`typography` support values (skip-serialised → NOT auto-inlined).
$style_color_text   = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg     = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug   = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug     = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$style_font_size    = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';
$style_line_height  = isset( $attributes['style']['typography']['lineHeight'] ) ? (string) $attributes['style']['typography']['lineHeight'] : '';

// ---------------------------------------------------------------------------
// 5. Scoped CSS assembly. uid is a CLASS (this block has anchor support — the
// element's `id` attribute stays free for the anchor/ToC target, matching
// sgs/quote/sgs/container).
// ---------------------------------------------------------------------------

$uid      = 'sgs-ilist-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-icon-list';
$icon_sel = $root_sel . ' .sgs-icon-list__icon';
$text_sel = $root_sel . ' .sgs-icon-list__text';

$scoped_css = array();

// --- Per-item icon/text colour — emitted ONCE, scoped, never inline on the
// repeated <li> elements. ---
if ( $icon_colour ) {
	$scoped_css[] = "{$icon_sel}{color:" . sgs_colour_value( $icon_colour ) . ';}';
}
if ( $text_colour ) {
	$scoped_css[] = "{$text_sel}{color:" . sgs_colour_value( $text_colour ) . ';}';
}

// --- WP typography support (fontSize/lineHeight) — scoped onto the text
// selector (matches the block's declared `selectors.typography`). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
	}
	if ( '' !== $style_line_height ) {
		$typography_args['lineHeight'] = $style_line_height;
	}
	if ( ! empty( $typography_args ) ) {
		$typography_scoped_styles = wp_style_engine_get_styles(
			array( 'typography' => $typography_args ),
			array( 'selector' => $text_sel )
		);
		if ( ! empty( $typography_scoped_styles['css'] ) ) {
			$scoped_css[] = $typography_scoped_styles['css'];
		}
	}
}

// --- WP colour support (text/background, skip-serialised) — scoped onto the
// root. Preset SLUGS get the standard has-* classes re-added manually below;
// custom hex/rgb values are emitted here via the style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$color_scoped_styles = wp_style_engine_get_styles(
			array( 'color' => $color_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $color_scoped_styles['css'] ) ) {
			$scoped_css[] = $color_scoped_styles['css'];
		}
	}
}

// --- Base spacing (padding/margin) + border-radius — WP-native style.*
// objects, skip-serialised, emitted scoped via the stable core style engine
// (exactly how WP core outputs `layout` support). ---
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

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
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

// --- Border width/style/colour (SGS custom, base only) — hand-built,
// scoped. ---
if ( 'none' !== $border_style ) {
	$border_decls = array();
	if ( $has_border_width ) {
		$bwt             = '' !== $border_width_top ? $border_width_top : '0';
		$bwr             = '' !== $border_width_right ? $border_width_right : '0';
		$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl             = '' !== $border_width_left ? $border_width_left : '0';
		$border_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$border_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$border_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
	$scoped_css[] = "{$root_sel}{" . implode( ';', $border_decls ) . ';}';
}

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the SAME root selector (contract §B2: tablet
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

$sgs_corner_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );
$radius_tab_val  = $sgs_corner_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = $sgs_corner_shorthand( $border_radius_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_decls[] = "border-radius:{$radius_tab_val}";
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
if ( null !== $radius_mob_val ) {
	$mobile_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 6. Build the root element's classes + attributes.
//
// uid is a CLASS (contract §B3 anchor-bearing rule) — the element's `id`
// attribute stays free for the anchor. is-style-* / align* classes are
// merged in automatically by get_block_wrapper_attributes() via the block's
// className attribute. The ONLY style passed is the `--sgs-icon-list-gap`
// custom-property VALUE (allowed, not a declaration) — the root carries NO
// CSS property declarations (contract §A).
// ---------------------------------------------------------------------------

$wrapper_classes = 'sgs-icon-list sgs-icon-list--icon-' . esc_attr( $icon_size ) . ' ' . $uid;
if ( $dividers ) {
	$wrapper_classes .= ' sgs-icon-list--dividers';
}
if ( '' !== $preset_text_slug ) {
	$wrapper_classes .= ' has-text-color has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes .= ' has-background has-' . $preset_bg_slug . '-background-color';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => $wrapper_classes,
		'style' => $gap_slug ? '--sgs-icon-list-gap: var(--wp--preset--spacing--' . $gap_slug . ');' : '',
	)
);

// Enqueue Dashicons on the frontend if any item (or the default) uses that source.
$uses_dashicon = 'dashicon' === $default_source;
foreach ( $items as $maybe_dashicon ) {
	if ( ( $maybe_dashicon['iconSource'] ?? '' ) === 'dashicon' ) {
		$uses_dashicon = true;
		break;
	}
}
if ( $uses_dashicon ) {
	wp_enqueue_style( 'dashicons' );
}

// ---------------------------------------------------------------------------
// 7. Build each item's markup. NO inline style on the icon/text spans — the
// shared colour rules live in the scoped <style> above (step 5).
// ---------------------------------------------------------------------------

$items_html = '';
foreach ( $items as $item ) {
	// Resolve the item's icon source + name (migrating legacy {icon: slug} items).
	if ( ! empty( $item['iconSource'] ) ) {
		$item_source = $item['iconSource'];
		$item_name   = $item['iconName'] ?? $default_icon;
	} elseif ( ! empty( $item['icon'] ) ) {
		$item_source = 'lucide';
		$item_name   = $icon_map[ $item['icon'] ] ?? $item['icon'];
	} else {
		$item_source = $default_source;
		$item_name   = $default_icon;
	}
	$svg       = $render_icon( $item_source, $item_name );
	$item_text = $item['text'] ?? '';
	$item_url  = isset( $item['url'] ) ? esc_url( $item['url'] ) : '';

	// Wrap text in <a> when a per-item URL is provided.
	if ( $item_url ) {
		$text_content = sprintf(
			'<a href="%s" class="sgs-icon-list__item-link"%s>%s</a>',
			$item_url,
			! empty( $item['newTab'] ) ? ' target="_blank" rel="noopener noreferrer"' : '',
			wp_kses_post( $item_text )
		);
	} else {
		$text_content = wp_kses_post( $item_text );
	}

	$items_html .= sprintf(
		'<li class="sgs-icon-list__item"><span class="sgs-icon-list__icon" aria-hidden="true">%s</span><span class="sgs-icon-list__text">%s</span></li>',
		$svg,
		$text_content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	);
}

// ---------------------------------------------------------------------------
// 8. Render.
// ---------------------------------------------------------------------------

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $items_html built with esc_url/wp_kses_post above; $scoped_css pre-sanitised ($sgs_css_length/$sgs_css_keyword/allowlists/wp_style_engine_get_styles/sgs_colour_value) + wrapped in wp_strip_all_tags.
if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}
printf(
	'<ul %s>%s</ul>',
	$wrapper_attributes,
	$items_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
