<?php
/**
 * Server-side render for the SGS Social Icons block.
 *
 * NO-INLINE (per-block no-inline migration contract §A): the rendered subtree
 * carries ZERO inline CSS property declarations. WP `color`/`spacing`/
 * `typography` supports declare `__experimentalSkipSerialization` in
 * block.json so get_block_wrapper_attributes() never auto-inlines them — base
 * padding/margin/text-colour/background-colour/typography are instead emitted
 * scoped via wp_style_engine_get_styles() into the block's own <style> tag,
 * mirroring sgs/heading + sgs/quote. The row `gap`, the per-icon-item colour
 * custom properties, and the per-icon-item size (previously inline
 * `style="width:...;height:..."`) all move into the same scoped stylesheet.
 *
 * @since 2026-07-10  Closed a residual gap: `typography` support was declared
 * (textAlign) without `__experimentalSkipSerialization`, so any populated
 * `style.typography` value would have auto-inlined onto the wrapper. Now
 * skip-serialised + read back and emitted scoped (same mechanism as color/
 * spacing above), so the wrapper stays inline-free regardless of which
 * typography sub-features are enabled in future.
 *
 * BOX-GROUP (contract §B): padding/margin are box objects. Base = WP-native
 * style.spacing.padding/margin (skip-serialised); tiers = paddingTablet/
 * paddingMobile/marginTablet/marginMobile object attrs, hand-built shorthand,
 * scoped @media 1023/767 (contract §B2).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused - dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$icons              = $attributes['icons'] ?? array();
$icon_size          = (int) ( $attributes['iconSize'] ?? 24 );
$icon_colour        = $attributes['iconColour'] ?? 'text-muted';
$hover_colour_token = $attributes['hoverColour'] ?? 'primary';
$style_type_raw     = $attributes['iconStyle'] ?? 'plain';
$gap_raw            = $attributes['gap'] ?? '20';
$anchor             = $attributes['anchor'] ?? '';

if ( empty( $icons ) ) {
	return;
}

// Allowlist the style variant so it can never break out of a class/selector.
$allowed_styles = array( 'plain', 'filled', 'outlined', 'pill' );
$style_type     = in_array( $style_type_raw, $allowed_styles, true ) ? $style_type_raw : 'plain';

$platform_icons = array(
	'facebook'  => 'facebook',
	'twitter'   => 'twitter',
	'linkedin'  => 'linkedin',
	'instagram' => 'instagram',
	'youtube'   => 'youtube',
	'tiktok'    => 'music',
	'github'    => 'github',
	'whatsapp'  => 'message-circle',
	'email'     => 'mail',
	'website'   => 'globe',
	'pinterest' => 'pin',
	'snapchat'  => 'ghost',
	'telegram'  => 'send',
	'discord'   => 'message-square',
);

$platform_labels = array(
	'facebook'  => 'Facebook',
	'twitter'   => 'X (Twitter)',
	'linkedin'  => 'LinkedIn',
	'instagram' => 'Instagram',
	'youtube'   => 'YouTube',
	'tiktok'    => 'TikTok',
	'github'    => 'GitHub',
	'whatsapp'  => 'WhatsApp',
	'email'     => 'Email',
	'website'   => 'Website',
	'pinterest' => 'Pinterest',
	'snapchat'  => 'Snapchat',
	'telegram'  => 'Telegram',
	'discord'   => 'Discord',
);

// ---------------------------------------------------------------------------
// Security §D sanitisers — copied verbatim from sgs/heading + sgs/container.
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// Box-object interface contract §B: base padding/margin (WP-native, skip-
// serialised) + responsive tiers (SGS custom object attrs).
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

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// WP `typography` support values (skip-serialised in block.json → NOT
// auto-inlined). Only `textAlign` is currently enabled in supports.typography
// (rendered as a `has-text-align-*` class by get_block_wrapper_attributes(),
// unaffected by skip-serialisation), but fontSize/lineHeight are read
// defensively here so the wrapper stays inline-free if either is enabled in
// future — mirrors sgs/quote's identical read of style.typography.
$style_font_size   = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';
$style_line_height = isset( $attributes['style']['typography']['lineHeight'] ) ? (string) $attributes['style']['typography']['lineHeight'] : '';

// ---------------------------------------------------------------------------
// Scoped CSS assembly — content-hash uid is a CLASS (this block has a genuine
// multi-child root: a row of <a> icon items, so the existing container div
// stays; contract §B3 only forbids adding a *useless* wrapper, not removing a
// meaningful one).
// ---------------------------------------------------------------------------

$uid      = 'sgs-soc-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid;

$scoped_css = array();

// --- Row gap + per-item colour custom properties (was inline `style=`). ---
$gap_slug_raw = $sgs_css_keyword( str_replace( array( '.', '%' ), '', (string) $gap_raw ) );
$gap_slug     = '' !== $gap_slug_raw ? $gap_slug_raw : preg_replace( '/[^0-9]/', '', (string) $gap_raw );
$gap_slug     = '' !== $gap_slug ? $gap_slug : '20';
$root_decls   = array(
	'gap:var(--wp--preset--spacing--' . $gap_slug . ')',
	'--sgs-social-colour:' . sgs_colour_value( $icon_colour ),
	'--sgs-social-hover:' . sgs_colour_value( $hover_colour_token ),
);
$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';

// --- Per-icon-item size (was inline `style="width:...px;height:...px"`). ---
$item_size    = $icon_size + ( 'plain' === $style_type ? 0 : 16 );
$scoped_css[] = "{$root_sel} .sgs-social-icons__item{width:{$item_size}px;height:{$item_size}px;}";

// --- Base spacing (padding/margin) + WP colour support — skip-serialised in
// block.json, emitted scoped via the stable core style engine (contract §B). ---
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
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
	}
	if ( '' !== $style_line_height ) {
		$typography_args['lineHeight'] = $style_line_height;
	}
	if ( ! empty( $typography_args ) ) {
		$base_style_engine_args['typography'] = $typography_args;
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

// --- Responsive padding/margin tiers — hand-built shorthand, scoped @media
// on the same wrapper selector (contract §B2: tablet 1023px, mobile 767px). ---
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
// Root element classes + attributes. NO 'style' key is passed to
// get_block_wrapper_attributes() — the root carries ZERO inline property
// declarations (contract §A); everything is in the scoped <style> above.
// ---------------------------------------------------------------------------

$root_classes = array(
	'sgs-social-icons',
	'sgs-social-icons--' . $style_type,
	$uid,
);

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
	$root_attr_args['id'] = $anchor;
}

$wrapper_attributes = get_block_wrapper_attributes( $root_attr_args );

$items_html = '';
foreach ( $icons as $icon_item ) {
	if ( empty( $icon_item['url'] ) ) {
		continue;
	}
	$platform  = $icon_item['platform'] ?? 'website';
	$label_raw = ! empty( $icon_item['label'] ) ? $icon_item['label'] : ( $platform_labels[ $platform ] ?? ucfirst( $platform ) );
	$icon_name = $platform_icons[ $platform ] ?? 'link';
	$href      = 'email' === $platform ? 'mailto:' . esc_attr( $icon_item['url'] ) : esc_url( $icon_item['url'] );
	$icon_svg  = sgs_get_lucide_icon( $icon_name );

	$items_html .= sprintf(
		'<a href="%s" class="sgs-social-icons__item" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a>',
		$href,
		esc_attr( $label_raw ),
		$icon_svg
	);
}
?>
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D). Every value reaching
	// $scoped_css is pre-sanitised ($sgs_css_length / $sgs_css_keyword /
	// allowlists / wp_style_engine_get_styles / sgs_colour_value), so no
	// un-sanitised value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<?php printf( '<div %s>%s</div>', $wrapper_attributes, $items_html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from get_block_wrapper_attributes(); $items_html built from esc_url/esc_attr'd fragments + trusted SVG. ?>
