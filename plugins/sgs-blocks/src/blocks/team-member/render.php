<?php
/**
 * Server-side render for the SGS Team Member block.
 *
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (LOCKED per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09): sgs/team-member is CONTENT-kind (box +
 * width only) — it never used the shared wrapper's grid/section/background/
 * overlay/SVG/shape machinery, so SGS_Container_Wrapper was dead weight.
 * Converter CSS routing keys on block_attributes by block_slug (block.json-
 * derived), NOT on wraps_block/container_kind (walker-invisible), so dropping
 * the wrapper does not affect cloning. Same proven block-private pattern as
 * sgs/quote + sgs/button + sgs/heading + sgs/text (D294).
 *
 * The root <div> IS the block root, built via get_block_wrapper_attributes().
 * The rendered subtree carries ZERO inline CSS property declarations —
 * every declaration (base padding/margin/border/radius, the WP color/
 * typography supports, tablet/mobile box tiers, contentWidth/maxWidth, and
 * the per-element nameColour/roleColour) is emitted into the block's OWN
 * scoped `.{uid}` <style> tag. WP styling supports (color/typography/
 * spacing/__experimentalBorder) all declare `__experimentalSkipSerialization`
 * in block.json so get_block_wrapper_attributes() never auto-inlines them.
 *
 * Hover transition/scale/shadow custom properties (--sgs-*) stay on the root
 * as VAR-ONLY inline style (no real CSS property declarations) — the static
 * hover rules in style.css read them; this mirrors WP core's own `layout`
 * gap-value custom-property pattern and is exempt from the no-inline
 * prohibition (contract: "Overrides = CSS custom-property VALUES, never
 * inline declarations").
 *
 * Social links are driven by the socialLinks scalar attribute (array of
 * {platform, url} objects) — NOT InnerBlocks. This block is a pure typed leaf:
 * save returns null, render.php never reads $content.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused — pure leaf block.
 * @var \WP_Block $block      Block instance.
 *
 * @since 2026-05-xx  Initial — sgs/team-member block.
 * @since 2026-06-04  WS-4 composite-mirror: outer wrapper via SGS_Container_Wrapper (kind='content').
 * @since 2026-07-10  100% no-inline + 100% box-group migration: box families →
 *                    objects; dropped SGS_Container_Wrapper (block-private is
 *                    more robust for no-inline, matches sgs/quote); the root
 *                    <div> carries the scoped uid class; nameColour/
 *                    roleColour convert from inline style to scoped rules.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ---------------------------------------------------------------------------
// 1. Media / photo — prefer memberMedia, fall back to legacy photo.
// ---------------------------------------------------------------------------
$member_media = $attributes['memberMedia'] ?? null;
$photo        = $attributes['photo'] ?? null;

if ( empty( $member_media['url'] ) && ! empty( $photo['url'] ) ) {
	$member_media = array(
		'url'  => $photo['url'],
		'type' => 'image',
		'id'   => ! empty( $photo['id'] ) ? absint( $photo['id'] ) : 0,
		'alt'  => $photo['alt'] ?? '',
		'mime' => 'image/jpeg',
	);
}

// Schema.org needs a plain image URL.
$schema_image_url = '';
if ( ! empty( $member_media['url'] ) ) {
	$schema_image_url = $member_media['url'];
} elseif ( ! empty( $photo['url'] ) ) {
	$schema_image_url = $photo['url'];
}

// ---------------------------------------------------------------------------
// 2. Box-object interface contract §1 + security §D sanitisers (copied from
// sgs/quote — same 3 closures, same guarantees).
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/quote + sgs/button + sgs/container + sgs/heading.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style). Strips everything except letters + hyphen,
// so ;{}():digits can never break out of the declaration into a new CSS rule.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// CSS-value sanitiser for composite free-text values — strips only the
// characters that let a value break out of its declaration into a new CSS
// rule ( ; { } < > \ ), leaving valid syntax intact. Unused by team-member
// today (no free-text box-shadow attr) but kept for parity with the other
// migrated content-kind blocks + future-proofing.
$sgs_css_safe_value = static function ( $value ) {
	return preg_replace( '/[;{}<>\\\\]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 3. Scalar content / layout attributes.
// ---------------------------------------------------------------------------
$name              = $attributes['name'] ?? '';
$sgs_role          = $attributes['role'] ?? '';
$bio               = $attributes['bio'] ?? '';
$name_colour       = $attributes['nameColour'] ?? '';
$role_colour       = $attributes['roleColour'] ?? 'text-muted';
$card_style        = $attributes['cardStyle'] ?? 'elevated';
$photo_shape       = $attributes['photoShape'] ?? 'circle';
$hover_scale       = $attributes['hoverScale'] ?? '';
$hover_shadow      = $attributes['hoverShadow'] ?? '';
$hover_img_zoom    = (bool) ( $attributes['hoverImageZoom'] ?? false );
$hover_grayscale   = (bool) ( $attributes['hoverGrayscale'] ?? false );
$hover_overlay     = (bool) ( $attributes['hoverOverlay'] ?? false );
$display_mode      = $attributes['displayMode'] ?? 'full';
$is_compact        = 'compact' === $display_mode;
$block_link        = $attributes['blockLink'] ?? '';
$block_link_target = (bool) ( $attributes['blockLinkTarget'] ?? false );
$social_links      = is_array( $attributes['socialLinks'] ?? null ) ? $attributes['socialLinks'] : array();

// ---------------------------------------------------------------------------
// 4. Root-level box/visual attributes (own visual styling — scoped, not
// inline). Width family stays KEPT-SCALAR (contract §C: single-value
// families stay scalar); box families (padding/margin) are objects.
// ---------------------------------------------------------------------------
$content_width = $attributes['contentWidth'] ?? '';
$max_width     = $attributes['maxWidth'] ?? '';

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

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

// Base border — WP-native style.border.* (width/style/color/radius), all
// skip-serialised. Unlike sgs/quote (custom borderWidth + native radius
// only), team-member declares FULL native __experimentalBorder support, so
// everything lives under $attributes['style']['border'].
$style_border       = isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ? $attributes['style']['border'] : array();
$border_width_raw   = isset( $style_border['width'] ) ? $sgs_css_length( $style_border['width'] ) : '';
$border_style_raw   = isset( $style_border['style'] ) ? $sgs_css_keyword( $style_border['style'] ) : '';
$border_color_raw   = isset( $style_border['color'] ) && is_string( $style_border['color'] ) ? $style_border['color'] : '';
$preset_border_slug = isset( $attributes['borderColor'] ) ? sanitize_html_class( $attributes['borderColor'] ) : '';

$base_border_radius = null;
if ( isset( $style_border['radius'] ) ) {
	$radius_raw = $style_border['radius'];
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

// WP `color`/`typography` support values (skip-serialised → NOT auto-inlined).
$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$style_font_size = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';

// Native text-align support — WP core does NOT reliably apply the
// has-text-align-* class for a DYNAMIC block via get_block_wrapper_attributes()
// (STOP-44 pattern), so it is added explicitly.
$text_align          = $attributes['textAlign'] ?? '';
$allowed_text_aligns = array( 'left', 'center', 'right', 'justify' );
$has_text_align      = in_array( $text_align, $allowed_text_aligns, true );

// ---------------------------------------------------------------------------
// 5. Wrapper classes (unchanged behaviour — card style / compact / hover
// feature classes — the CSS rules in style.css key off these).
// ---------------------------------------------------------------------------
$sgs_classes = array(
	'sgs-team-member',
	'sgs-team-member--' . esc_attr( $card_style ),
);

if ( $is_compact ) {
	$sgs_classes[] = 'sgs-team-member--compact';
}
if ( $hover_img_zoom ) {
	$sgs_classes[] = 'sgs-has-img-zoom';
}
if ( $hover_grayscale ) {
	$sgs_classes[] = 'sgs-has-grayscale';
}
if ( $hover_overlay ) {
	$sgs_classes[] = 'sgs-has-hover-overlay';
}

// ---------------------------------------------------------------------------
// 6. Wrapper inline styles — VAR-ONLY (transition duration/easing + hover
// scale/shadow custom properties). No real CSS property is declared here;
// the static rules in style.css read these vars.
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = sgs_transition_vars( $attributes );

$allowed_scales = array( '1.02', '1.05', '1.1' );
if ( $hover_scale && in_array( $hover_scale, $allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}

$allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );
if ( $hover_shadow && in_array( $hover_shadow, $allowed_shadows, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
	$sgs_classes[]        = 'sgs-has-hover';
}

// ---------------------------------------------------------------------------
// 7. Photo HTML.
// ---------------------------------------------------------------------------
$photo_html = '';
$photo_img  = '';
if ( ! empty( $member_media['url'] ) ) {
	$media_for_render = $member_media;
	if ( empty( $media_for_render['alt'] ) ) {
		$media_for_render['alt'] = $name;
	}
	$photo_img = sgs_render_media( $media_for_render, 'sgs/team-member' );
}

if ( '' !== $photo_img ) {
	if ( $hover_overlay && ! $is_compact ) {
		$photo_html = sprintf(
			'<div class="sgs-team-member__photo sgs-team-member__photo--%s sgs-team-member__photo--has-overlay" tabindex="0" role="img" aria-label="%s">%s<div class="sgs-team-member__overlay" aria-hidden="true"><div class="sgs-team-member__overlay-bio">%s</div></div></div>',
			esc_attr( $photo_shape ),
			esc_attr( $name ),
			$photo_img,
			wp_kses_post( $bio )
		);
	} else {
		$photo_html = sprintf(
			'<div class="sgs-team-member__photo sgs-team-member__photo--%s">%s</div>',
			esc_attr( $photo_shape ),
			$photo_img
		);
	}
}

// ---------------------------------------------------------------------------
// 8. Name / role / bio HTML. NO inline style any more (contract §A) — the
// nameColour/roleColour declarations move to the scoped <style> below,
// keyed on the element's class inside the root scope.
// ---------------------------------------------------------------------------
$name_html = $name ? sprintf( '<h3 class="sgs-team-member__name">%s</h3>', wp_kses_post( $name ) ) : '';
$role_html = $sgs_role ? sprintf( '<p class="sgs-team-member__role">%s</p>', wp_kses_post( $sgs_role ) ) : '';
$bio_html  = ( $bio && ! $is_compact ) ? sprintf( '<p class="sgs-team-member__bio">%s</p>', wp_kses_post( $bio ) ) : '';

// ---------------------------------------------------------------------------
// 9. Social links — rendered as nested elements from the socialLinks scalar
// attr. NOT from $content (pure leaf block). Hidden in Compact mode.
// Platform -> Lucide icon name mapping (mirrors sgs/social-icons render.php).
// ---------------------------------------------------------------------------
$social_html = '';
if ( ! $is_compact && ! empty( $social_links ) ) {
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

	$items_html = '';
	foreach ( $social_links as $link ) {
		$url = $link['url'] ?? '';
		if ( empty( $url ) ) {
			continue;
		}
		$platform  = $link['platform'] ?? 'website';
		$icon_name = $platform_icons[ $platform ] ?? 'link';
		$label     = $platform_labels[ $platform ] ?? ucfirst( $platform );
		$href      = 'email' === $platform ? 'mailto:' . esc_attr( $url ) : esc_url( $url );
		$icon_svg  = sgs_get_lucide_icon( $icon_name );

		$items_html .= sprintf(
			'<a href="%s" class="sgs-team-member__social-link" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a>',
			$href,
			esc_attr( $label ),
			$icon_svg
		);
	}

	if ( '' !== $items_html ) {
		$social_html = sprintf( '<div class="sgs-team-member__social">%s</div>', $items_html );
	}
}

// ---------------------------------------------------------------------------
// 10. Schema.org/Person — sameAs URLs from socialLinks scalar attr.
// ---------------------------------------------------------------------------
$schema_same_as = array();
foreach ( $social_links as $link ) {
	$link_url = $link['url'] ?? '';
	if ( '' !== $link_url ) {
		$safe_url = esc_url_raw( $link_url );
		if ( '' !== $safe_url ) {
			$schema_same_as[] = $safe_url;
		}
	}
}

$schema_html = '';
if ( $name ) {
	$schema = array(
		'@context' => 'https://schema.org',
		'@type'    => 'Person',
		'name'     => $name,
	);
	if ( $sgs_role ) {
		$schema['jobTitle'] = $sgs_role;
	}
	if ( $bio ) {
		$schema['description'] = wp_strip_all_tags( $bio );
	}
	if ( $schema_image_url ) {
		$schema['image'] = $schema_image_url;
	}
	if ( ! empty( $schema_same_as ) ) {
		$schema['sameAs'] = 1 === count( $schema_same_as ) ? $schema_same_as[0] : array_values( $schema_same_as );
	}
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
	);
}

// ---------------------------------------------------------------------------
// 11. Resolve scope id. Uid is a CLASS (contract §B3) — the element's single
// `id` attribute stays free for the anchor.
// ---------------------------------------------------------------------------
$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-team-member-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-team-member';

// ---------------------------------------------------------------------------
// 12. Build the root's scoped box/visual/typography declarations.
// ---------------------------------------------------------------------------
$scoped_css = array();

// --- Base border-width/style/color + radius + spacing + colour + typography
// supports — skip-serialised, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---
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

	$border_args = array();
	if ( null !== $base_border_radius ) {
		$border_args['radius'] = $base_border_radius;
	}
	if ( '' !== $border_width_raw ) {
		$border_args['width'] = $border_width_raw;
	}
	if ( '' !== $border_style_raw ) {
		$border_args['style'] = $border_style_raw;
	}
	if ( '' !== $border_color_raw ) {
		$border_args['color'] = sgs_colour_value( $border_color_raw );
	}
	if ( ! empty( $border_args ) ) {
		$base_style_engine_args['border'] = $border_args;
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

	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
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

// --- contentWidth / maxWidth (kept-scalar family, contract §C). ---
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-inline:auto;}";
	}
}
if ( $content_width ) {
	$cw_safe = $sgs_css_length( $content_width );
	if ( '' !== $cw_safe ) {
		$scoped_css[] = "{$root_sel}{width:{$cw_safe};}";
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

// --- Name / role scoped colour rules (converted from inline `style="color:…"`
// — contract §A: no inline property declarations on descendants). ---
if ( $name_colour ) {
	$scoped_css[] = $root_sel . ' .sgs-team-member__name{color:' . sgs_colour_value( $name_colour ) . ';}';
}
if ( $role_colour ) {
	$scoped_css[] = $root_sel . ' .sgs-team-member__role{color:' . sgs_colour_value( $role_colour ) . ';}';
}

// ---------------------------------------------------------------------------
// 13. Build interior HTML.
// ---------------------------------------------------------------------------
$sgs_inner_html = sprintf(
	'%s<div class="sgs-team-member__content">%s%s%s</div>%s%s',
	$photo_html,
	$name_html,
	$role_html,
	$bio_html,
	$social_html,
	$schema_html
);

// ---------------------------------------------------------------------------
// 14. Build the root element's classes + attributes. Contract §B3: no extra
// wrapper — the root <div> carries get_block_wrapper_attributes(), the
// block class `wp-block-sgs-team-member` (added automatically), the scoped
// uid CLASS, the card/hover feature classes, the anchor `id`, and the
// preset colour / text-align classes re-added manually (the color/
// typography supports are skip-serialised so WP no longer auto-adds them).
// ---------------------------------------------------------------------------
$root_classes = $sgs_classes;

if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}
if ( '' !== $preset_border_slug ) {
	$root_classes[] = 'has-border-color';
	$root_classes[] = 'has-' . $preset_border_slug . '-border-color';
}
if ( $has_text_align ) {
	$root_classes[] = 'has-text-align-' . $text_align;
}

$root_attr_args = array(
	'class' => implode( ' ', array_merge( array( $uid ), $root_classes ) ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
if ( ! empty( $sgs_wrapper_styles ) ) {
	$root_attr_args['style'] = implode( ';', $sgs_wrapper_styles ) . ';';
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 15. Render.
// ---------------------------------------------------------------------------
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_inner_html built with esc_*/wp_kses()/wp_json_encode(); $wrapper_attrs from get_block_wrapper_attributes(); $scoped_css pre-sanitised below.
$sgs_card_html  = '';
$sgs_card_html .= $scoped_css ? ( '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>' ) : '';
$sgs_card_html .= '<div ' . $wrapper_attrs . '>' . $sgs_inner_html . '</div>';

// Block link — wraps the entire card in an <a> tag.
if ( $block_link ) {
	$sgs_block_target = $block_link_target ? ' target="_blank" rel="noopener noreferrer"' : '';
	echo '<a href="' . esc_url( $block_link ) . '" class="sgs-block-link-wrapper"' . $sgs_block_target . '>'
		. $sgs_card_html
		. '</a>';
} else {
	echo $sgs_card_html;
}
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
