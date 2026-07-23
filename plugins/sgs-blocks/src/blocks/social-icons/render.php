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

use SGS\Blocks\Sgs_Site_Info;

$source_raw          = $attributes['source'] ?? 'manual';
$source              = in_array( $source_raw, array( 'manual', 'site-info' ), true ) ? $source_raw : 'manual';
$icon_size           = (int) ( $attributes['iconSize'] ?? 24 );
$icon_colour         = $attributes['iconColour'] ?? 'text-muted';
$hover_colour_token  = $attributes['iconColourHover'] ?? 'primary';
$colour_mode_raw     = $attributes['colourMode'] ?? 'theme';
$colour_mode         = in_array( $colour_mode_raw, array( 'theme', 'brand' ), true ) ? $colour_mode_raw : 'theme';
$style_type_raw      = $attributes['iconStyle'] ?? 'plain';
$gap_raw             = $attributes['gap'] ?? '20';
$anchor              = $attributes['anchor'] ?? '';
$open_in_new_tab     = (bool) ( $attributes['openInNewTab'] ?? true );
$rel_nofollow        = (bool) ( $attributes['relNofollow'] ?? false );

// ---------------------------------------------------------------------------
// Icon source resolution. 'manual' (default) keeps the stored `icons` repeater
// byte-identical to prior behaviour. 'site-info' pulls the same 7 networks the
// sgs/business-info 'socials' case reads from the shared Sgs_Site_Info store
// (Appearance > SGS Site Info), so header/footer/drawer instances stay in
// sync with one operator setting instead of duplicated per-block URLs.
// ---------------------------------------------------------------------------
if ( 'site-info' === $source ) {
	// Same network slugs + same escaping (Sgs_Site_Info::get()/get_esc_url())
	// as the sgs/business-info 'socials' case. No `label` key is set here — the
	// items loop below auto-generates the verb+platform accessible name
	// (sgs_social_icons_default_label()) for every item that has no explicit
	// label, so Site-Info-sourced icons get the SAME auto-generated names as
	// a manual-mode icon left blank; the actual href is re-escaped via
	// esc_url() in the render loop below exactly as it is for a manual URL.
	$site_info_networks = array( 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'google' );

	$icons = array();
	foreach ( $site_info_networks as $network_slug ) {
		$social_url = (string) Sgs_Site_Info::get( "socials.{$network_slug}", '' );
		if ( '' === $social_url ) {
			continue;
		}
		$icons[] = array(
			'platform' => $network_slug,
			'url'      => $social_url,
		);
	}
} else {
	$icons = $attributes['icons'] ?? array();
}

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
	// Lucide ships no Google brand mark; 'star' reads as the review link this
	// channel actually points at (and matches the captured Indus baseline).
	'google'    => 'star',
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
	'google'    => 'Google',
	'custom'    => 'this link',
);

// ---------------------------------------------------------------------------
// FR-36-21 MUST — accessible name auto-generated (verb + platform), operator-
// editable via the per-item `label` field. WP core omits this entirely by
// default (aria-label-less icon links) — this is the citable competitor gap.
// A per-item `label` value ALWAYS wins (full override, not a template slot);
// this map only supplies the DEFAULT when the operator leaves it blank.
// ---------------------------------------------------------------------------
$platform_verbs = array(
	'whatsapp' => 'Message us on WhatsApp',
	'email'    => 'Email us',
	'website'  => 'Visit our website',
	'google'   => 'Read our reviews on Google',
	'custom'   => 'Follow us',
);

// function_exists() guard: render.php is `require`'d fresh per block INSTANCE
// (not require_once) — a second sgs/social-icons on the same page (e.g. header
// + footer, the exact FR-36-21/FR-36-25 one-source scenario this block ships
// for) would otherwise fatal on "cannot redeclare function".
if ( ! function_exists( 'sgs_social_icons_default_label' ) ) {
	/**
	 * Build the auto-generated default accessible name for a social icon item.
	 *
	 * @param string $platform         Platform slug.
	 * @param array  $platform_labels  Slug => display-name map.
	 * @param array  $platform_verbs   Slug => full custom verb-phrase map.
	 * @return string
	 */
	function sgs_social_icons_default_label( string $platform, array $platform_labels, array $platform_verbs ): string {
		if ( isset( $platform_verbs[ $platform ] ) ) {
			return $platform_verbs[ $platform ];
		}
		$display_name = $platform_labels[ $platform ] ?? ucfirst( $platform );
		/* translators: %s: social platform name, e.g. "Instagram". */
		return sprintf( __( 'Follow us on %s', 'sgs-blocks' ), $display_name );
	}
}

// Brand colours (FR-36-21 MUST — "brand vs monochrome/theme colour"). Official
// flat brand hex per platform; used only when colourMode='brand'. Hover colour
// stays a separate, always-theme-token control regardless of colour mode.
$platform_brand_colours = array(
	'facebook'  => '#1877F2',
	'twitter'   => '#000000',
	'linkedin'  => '#0A66C2',
	'instagram' => '#E4405F',
	'youtube'   => '#FF0000',
	'tiktok'    => '#000000',
	'github'    => '#181717',
	'whatsapp'  => '#25D366',
	'email'     => '#6B7280',
	'website'   => '#6B7280',
	'pinterest' => '#E60023',
	'snapchat'  => '#FFFC00',
	'telegram'  => '#26A5E4',
	'discord'   => '#5865F2',
	'google'    => '#4285F4',
	'custom'    => '#6B7280',
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
// WCAG 2.5.8 target size: the clickable box (`.sgs-social-icons__item`) is
// floored at 44px regardless of the requested icon size, but the SVG glyph
// itself keeps rendering at the operator-chosen `iconSize` (fixed px, not a
// 100%-of-parent stretch) so a small glyph gets extra transparent padding
// instead of being blown up to fill the enlarged hit area.
$item_size    = max( 44, $icon_size + ( 'plain' === $style_type ? 0 : 16 ) );
$scoped_css[] = "{$root_sel} .sgs-social-icons__item{width:{$item_size}px;height:{$item_size}px;}";
$scoped_css[] = "{$root_sel} .sgs-social-icons__item svg{width:{$icon_size}px;height:{$icon_size}px;}";

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

// FR-36-21 MUST — open-in-new-tab default-on (operator togglable) + auto
// rel="noopener noreferrer" on external links + optional nofollow toggle.
$rel_tokens = array();
if ( $open_in_new_tab ) {
	$rel_tokens[] = 'noopener';
	$rel_tokens[] = 'noreferrer';
}
if ( $rel_nofollow ) {
	$rel_tokens[] = 'nofollow';
}
$rel_attr    = $rel_tokens ? ' rel="' . esc_attr( implode( ' ', $rel_tokens ) ) . '"' : '';
$target_attr = $open_in_new_tab ? ' target="_blank"' : '';

$items_html   = '';
$rendered_pos = 0;
foreach ( $icons as $icon_item ) {
	if ( empty( $icon_item['url'] ) ) {
		continue;
	}
	++$rendered_pos;

	$platform   = $icon_item['platform'] ?? 'website';
	$label_raw  = ! empty( $icon_item['label'] ) ? $icon_item['label'] : sgs_social_icons_default_label( $platform, $platform_labels, $platform_verbs );
	$href       = 'email' === $platform ? 'mailto:' . esc_attr( $icon_item['url'] ) : esc_url( $icon_item['url'] );
	$custom_url = '';
	if ( 'custom' === $platform ) {
		// Prefer resolving fresh from the attachment ID (survives a later media
		// library edit/regenerate); fall back to the stored URL for a custom SVG
		// not in the media library (external URL entered directly).
		$custom_icon_id = absint( $icon_item['customIconId'] ?? 0 );
		$custom_url     = $custom_icon_id ? (string) wp_get_attachment_url( $custom_icon_id ) : '';
		if ( '' === $custom_url ) {
			$custom_url = (string) ( $icon_item['customIconUrl'] ?? '' );
		}
	}

	// FR-36-21 MUST — first-class custom-SVG upload. A custom item with no
	// uploaded glyph yet falls back to the generic 'link' Lucide icon so the
	// row never renders a blank slot mid-authoring.
	if ( '' !== $custom_url ) {
		$glyph_html = sprintf( '<img src="%s" alt="" width="%d" height="%d" />', esc_url( $custom_url ), $icon_size, $icon_size );
	} else {
		$icon_name  = $platform_icons[ $platform ] ?? 'link';
		$glyph_html = sgs_get_lucide_icon( $icon_name );
	}

	// FR-36-21 MUST — decorative glyph hidden from assistive tech (Spec 36).
	// The link's accessible name comes solely from `aria-label` above; without
	// this the raw <svg>/<img> is exposed a second time, doubling the
	// announcement in some screen readers. Matches the house pattern used by
	// sgs/cart (cart/render.php:235, `<span class="sgs-cart__icon"
	// aria-hidden="true">`) and sgs/business-info (business-info/render.php:85).
	// Descendant selectors only (`.sgs-social-icons__item svg`/`img` in
	// style.css + the scoped per-instance <style> below) so the extra span
	// changes nothing visually.
	$glyph_html = sprintf( '<span class="sgs-social-icons__icon" aria-hidden="true">%s</span>', $glyph_html );

	// FR-36-21 MUST — brand vs monochrome/theme colour. Brand mode overrides
	// ONLY the resting colour per item (nth-child, no inline style, contract
	// §A); hover colour stays the single theme-token control in both modes.
	if ( 'brand' === $colour_mode ) {
		$brand_hex    = $platform_brand_colours[ $platform ] ?? $platform_brand_colours['custom'];
		$scoped_css[] = "{$root_sel} .sgs-social-icons__item:nth-child({$rendered_pos}){--sgs-social-colour:" . sgs_colour_value( $brand_hex ) . ';}';
	}

	$items_html .= sprintf(
		'<a href="%s" class="sgs-social-icons__item"%s%s aria-label="%s">%s</a>',
		$href,
		$target_attr,
		$rel_attr,
		esc_attr( $label_raw ),
		$glyph_html
	);
}

// Per-item custom-SVG <img> glyph sizing — mirrors the existing SVG glyph
// rule so an uploaded image renders at the same operator-chosen iconSize.
$scoped_css[] = "{$root_sel} .sgs-social-icons__item img{width:{$icon_size}px;height:{$icon_size}px;}";
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
