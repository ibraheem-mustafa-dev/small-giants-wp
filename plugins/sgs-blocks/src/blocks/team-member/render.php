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
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check.
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
 * @since 2026-07-10  100% no-inline + 100% box-group migration (block-private,
 *                    matches sgs/quote).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ---------------------------------------------------------------------------
// 1. Media / photo — single `photo` attr plus responsive tiers photoTablet/
// photoMobile. PHP renders once for every device, so the tablet/mobile
// overrides are expressed as <picture><source media> alternates below
// (step 7) — the exact pattern already proven live on sgs/responsive-logo —
// rather than picked server-side.
// ---------------------------------------------------------------------------
$photo        = $attributes['photo'] ?? null;
$photo_tablet = $attributes['photoTablet'] ?? null;
$photo_mobile = $attributes['photoMobile'] ?? null;

// Decorative photo (WCAG 2.1 AA 1.1.1) — an explicit editorial "this picture
// carries no information", for the edge case of a placeholder/silhouette
// graphic before a real photo is uploaded. A team photo is almost always
// informative content (it identifies the person), so this defaults false;
// when true it renders with an empty alt AND aria-hidden on the photo
// wrapper, so a screen reader skips it entirely. Same shape as
// sgs/timeline's milestoneMediaDecorative (render.php:152).
$photo_decorative = ! empty( $attributes['photoDecorative'] );

// Schema.org needs a plain image URL (desktop tier only).
$schema_image_url = ! empty( $photo['url'] ) ? $photo['url'] : '';

// ---------------------------------------------------------------------------
// 2. Box-object interface contract §1 + security §D sanitisers (copied from
// sgs/quote — same 3 closures, same guarantees).
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/quote + sgs/button + sgs/container + sgs/heading.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style). Strips everything except letters + hyphen,
// so ;{}():digits can never break out of the declaration into a new CSS rule.
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
$name = $attributes['name'] ?? '';
// Name heading level — an out-of-enum stored value is otherwise silently
// coerced to the block.json default (blockjson-enum-coerces-invalid-to-
// default), so it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
$sgs_role               = $attributes['role'] ?? '';
$bio                    = $attributes['bio'] ?? '';
$name_colour            = $attributes['nameColour'] ?? '';
$name_colour_gradient   = $attributes['nameColourGradient'] ?? '';
$role_colour            = $attributes['roleColour'] ?? 'text-muted';
$role_colour_gradient   = $attributes['roleColourGradient'] ?? '';
$card_style             = $attributes['cardStyle'] ?? 'elevated';
$photo_shape            = $attributes['photoShape'] ?? 'circle';
$hover_scale            = $attributes['scaleHover'] ?? '';
$hover_shadow           = $attributes['shadowHover'] ?? '';
$hover_shadow_colour    = $attributes['shadowHoverColour'] ?? '';
$card_shadow            = $attributes['cardShadow'] ?? '';
$card_shadow_colour     = $attributes['cardShadowColour'] ?? '';
$hover_img_zoom         = (bool) ( $attributes['imageZoomHover'] ?? false );
$hover_grayscale        = (bool) ( $attributes['grayscaleHover'] ?? false );
$hover_overlay          = (bool) ( $attributes['overlayHover'] ?? false );
$display_mode           = $attributes['displayMode'] ?? 'full';
$is_compact             = 'compact' === $display_mode;
$social_links           = is_array( $attributes['socialLinks'] ?? null ) ? $attributes['socialLinks'] : array();

// ---------------------------------------------------------------------------
// 4. Root-level box/visual attributes (own visual styling — scoped, not
// inline). Width family stays KEPT-SCALAR (contract §C: single-value
// families stay scalar); box families (padding/margin) are objects.
// ---------------------------------------------------------------------------
$max_width = $attributes['maxWidth'] ?? '';

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
$border_width_raw   = isset( $style_border['width'] ) ? sgs_css_length_value( $style_border['width'] ) : '';
$border_style_raw   = isset( $style_border['style'] ) ? sgs_css_keyword_sanitise( $style_border['style'] ) : '';
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
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? sgs_css_length_value( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// Native style.color.text/background/gradient reads + the textColor/backgroundColor
// preset-slug reads are REMOVED here (2026-08-23) — block.json's `supports.color`
// sub-flags (background/text/gradients) are now all FALSE, so WordPress no longer
// registers those attributes or renders its own competing colour panel in the Styles
// tab. Background + text colour (flat-or-gradient, base + hover) are now owned
// entirely by the block-private backgroundColour*/textColour* attrs, emitted via the
// shared colour-variant helpers at step 12 below (same proven pattern as
// sgs/product-card + sgs/accordion-item + sgs/quote, commit `2eebbe55`). Capability
// MOVES rather than disappearing — the client also gains hover states it never had.
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
// 6. Root custom-property VALUES (transition duration/easing + hover
// scale/shadow/card-shadow). No real CSS property is declared here; the
// static rules in style.css read these vars. Collected now, emitted into the
// scoped `.{uid}` <style> rule at step 12 below (post-D345 contract — see
// file header) once $root_sel exists, NOT as an inline style attribute.
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = sgs_transition_vars( $attributes );

$allowed_scales = array( '1.02', '1.05', '1.1' );
if ( $hover_scale && in_array( $hover_scale, $allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}

// sgs_shadow_value_composed() composes the SHAPE-only attr (D621/D622
// colour-panel split) with the separate colour attr — accepts a preset slug
// (self-contained) OR a raw ShadowControl shape.
$safe_hover_shadow = sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
if ( '' !== $safe_hover_shadow ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:' . $safe_hover_shadow;
	$sgs_classes[]        = 'sgs-has-hover';
}

// FR-35-5 — the card has a RESTING-state shadow attr alongside the hover-only
// one, so shadowHover is STATE_OK not STATE_WITHOUT_BASE. An empty control
// means the card inherits the theme token (custom-property FALLBACK at
// style.css, never a baked default). Var-only inline declaration (same
// exempt pattern as the hover vars above) mirrors card-grid's
// --sgs-card-shadow (render.php:209) but scoped to this block's own root
// rather than a nested repeater item, since team-member's card IS the root.
if ( '' !== $card_shadow ) {
	$sgs_wrapper_styles[] = '--sgs-card-shadow:' . sgs_shadow_value_composed( $card_shadow, $card_shadow_colour );
}

// ---------------------------------------------------------------------------
// 7. Photo HTML.
// ---------------------------------------------------------------------------
$photo_html = '';
$photo_img  = '';
if ( ! empty( $photo['url'] ) ) {
	$media_for_render = $photo;
	if ( $photo_decorative ) {
		$media_for_render['alt'] = '';
	} elseif ( empty( $media_for_render['alt'] ) ) {
		$media_for_render['alt'] = $name;
	}
	$photo_base_img = sgs_render_media( $media_for_render, 'sgs/team-member' );

	// Responsive tiers — PHP renders once for every device, so tablet/mobile
	// overrides are expressed as <picture><source media> alternates (same
	// pattern as sgs/responsive-logo render.php): the browser picks the first
	// matching <source>, falling through to the base desktop <img> when no
	// tier override is set. Order matters — narrowest breakpoint first.
	$photo_tablet_url = ! empty( $photo_tablet['url'] ) ? $photo_tablet['url'] : '';
	$photo_mobile_url = ! empty( $photo_mobile['url'] ) ? $photo_mobile['url'] : '';

	if ( '' !== $photo_tablet_url || '' !== $photo_mobile_url ) {
		$photo_sources = '';
		if ( '' !== $photo_mobile_url ) {
			$photo_sources .= sprintf( '<source media="(max-width:767px)" srcset="%s">', esc_url( $photo_mobile_url ) );
		}
		if ( '' !== $photo_tablet_url ) {
			$photo_sources .= sprintf( '<source media="(max-width:1023px)" srcset="%s">', esc_url( $photo_tablet_url ) );
		}
		$photo_img = '<picture class="sgs-team-member__photo-picture">' . $photo_sources . $photo_base_img . '</picture>';
	} else {
		$photo_img = $photo_base_img;
	}
}

if ( '' !== $photo_img ) {
	if ( $hover_overlay && ! $is_compact ) {
		if ( $photo_decorative ) {
			// Decorative + overlay: drop role="img"/aria-label (nothing left to
			// name) and hide the whole photo wrapper from assistive tech instead.
			$photo_html = sprintf(
				'<div class="sgs-team-member__photo sgs-team-member__photo--%s sgs-team-member__photo--has-overlay" aria-hidden="true">%s<div class="sgs-team-member__overlay" aria-hidden="true"><div class="sgs-team-member__overlay-bio">%s</div></div></div>',
				esc_attr( $photo_shape ),
				$photo_img,
				wp_kses_post( $bio )
			);
		} else {
			$photo_html = sprintf(
				'<div class="sgs-team-member__photo sgs-team-member__photo--%s sgs-team-member__photo--has-overlay" tabindex="0" role="img" aria-label="%s">%s<div class="sgs-team-member__overlay" aria-hidden="true"><div class="sgs-team-member__overlay-bio">%s</div></div></div>',
				esc_attr( $photo_shape ),
				esc_attr( $name ),
				$photo_img,
				wp_kses_post( $bio )
			);
		}
	} else {
		$photo_html = sprintf(
			'<div class="sgs-team-member__photo sgs-team-member__photo--%s"%s>%s</div>',
			esc_attr( $photo_shape ),
			$photo_decorative ? ' aria-hidden="true"' : '',
			$photo_img
		);
	}
}

// ---------------------------------------------------------------------------
// 8. Name / role / bio HTML. NO inline style any more (contract §A) — the
// nameColour/roleColour declarations move to the scoped <style> below,
// keyed on the element's class inside the root scope.
// ---------------------------------------------------------------------------
$name_html = $name ? sprintf( '<%1$s class="sgs-team-member__name">%2$s</%1$s>', esc_attr( $heading_level ), wp_kses_post( $name ) ) : '';
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
		$icon_svg  = sgs_get_lucide_icon( $icon_name );

		// Shared SgsLinkControl object shape { url, opensInNewTab, rel } (Spec 35
		// Task 2.1) resolved via sgs_link_attributes(). opensInNewTab defaults to
		// true (matches this block's prior hardcoded target="_blank") when unset.
		$social_link_url_raw = 'email' === $platform ? 'mailto:' . $url : $url;
		$social_link_attrs   = sgs_link_attributes(
			array(
				'url'           => $social_link_url_raw,
				'opensInNewTab' => ! isset( $link['opensInNewTab'] ) || (bool) $link['opensInNewTab'],
				'rel'           => $link['rel'] ?? '',
			)
		);

		$items_html .= sprintf(
			'<a%s class="sgs-team-member__social-link" aria-label="%s">%s</a>',
			$social_link_attrs,
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
		// One shared encoder (FR-30-9): JSON_UNESCAPED_SLASHES disabled PHP's default
		// `\/` guard with no JSON_HEX_TAG to replace it, so a `</script>` in a name,
		// role or sameAs URL could close this tag. Sgs_Schema adds JSON_HEX_TAG.
		\SGS\Blocks\Sgs_Schema::encode_jsonld( $schema )
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

// Per-instance CSS custom-property VALUES (transition/hover/card-shadow,
// collected at step 6 above) → a scoped `.uid{…}` rule in the block's own
// <style>, NOT an inline `style="--var:…"` attribute on the root (post-D345
// contract — see file header). Declared first so the values are present for
// the style.css rules that consume them via var().
if ( ! empty( $sgs_wrapper_styles ) ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $sgs_wrapper_styles ) . '}';
}

// --- Base border-width/style/color + radius + spacing + colour + typography
// supports — skip-serialised, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---

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
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by default —
// never fall through to the browser's initial medium (~3px) border-width.
if ( '' !== $border_style_raw && '' !== $border_width_raw ) {
	$border_args['style'] = $border_style_raw;
}
if ( '' !== $border_color_raw ) {
	$border_args['color'] = sgs_colour_value( $border_color_raw );
}
if ( ! empty( $border_args ) ) {
	$base_style_engine_args['border'] = $border_args;
}

// $color_args (native style.color.text/background/gradient) is REMOVED here — see
// the step-4 comment above. Background/text colour are now emitted separately at
// step 12b below via the shared colour-variant helpers.

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

// --- 12b. Background + text colour (block-private, replaces the native
// style.color.background/text/gradient support removed at step 4) — same
// proven pattern as sgs/product-card + sgs/accordion-item + sgs/quote
// (commit `2eebbe55`). Both land on the SAME root element (the card IS the
// root, contract §B3), so the background paints on a `::after` layer via
// sgs_block_background_layer_css() rather than the root itself — otherwise
// a text gradient's `background-clip:text` on the root would clip or
// overwrite the background paint (both use `background-image`). ---
$sgs_tm_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
$sgs_tm_bg_css   = sgs_block_background_layer_css(
	$root_sel,
	$sgs_tm_bg_decls['normal'][0] ?? '',
	$sgs_tm_bg_decls['hover'][0] ?? ''
);
if ( '' !== $sgs_tm_bg_css ) {
	$scoped_css[] = $sgs_tm_bg_css;
}

$sgs_tm_text_decls = sgs_text_decls(
	$attributes,
	array(
		'base'           => 'textColour',
		'hover'          => 'textColourHover',
		'gradient'       => 'textColourGradient',
		'hover_gradient' => 'textColourHoverGradient',
	)
);
if ( $sgs_tm_text_decls['normal'] || $sgs_tm_text_decls['hover'] ) {
	$scoped_css[] = sgs_emit_state_colour_css( $root_sel, $sgs_tm_text_decls['normal'], $sgs_tm_text_decls['hover'] );
}
// Gradient companion rule — MUST accompany every sgs_text_decls() call:
// that façade emits a bare `color:` declaration even when the resolved
// value is a gradient string, which is invalid CSS the browser silently
// drops without this rule (`check-text-gradient-companion.js`).
$sgs_tm_text_normal_resolved = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
$sgs_tm_text_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
$sgs_tm_text_fallback_css    = sgs_text_colour_gradient_fallback_rule( $root_sel, $sgs_tm_text_normal_resolved );
if ( '' !== $sgs_tm_text_fallback_css ) {
	$scoped_css[] = $sgs_tm_text_fallback_css;
}
if ( '' !== $sgs_tm_text_hover_resolved && $sgs_tm_text_hover_resolved !== $sgs_tm_text_normal_resolved ) {
	$sgs_tm_text_hover_fallback_css = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $sgs_tm_text_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $sgs_tm_text_hover_resolved );
	if ( '' !== $sgs_tm_text_hover_fallback_css ) {
		$scoped_css[] = $sgs_tm_text_hover_fallback_css;
	}
}

// --- maxWidth (kept-scalar family, contract §C). ---
if ( $max_width ) {
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-inline:auto;}";
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

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
$name_colour_sel       = $root_sel . ' .sgs-team-member__name';
$role_colour_sel       = $root_sel . ' .sgs-team-member__role';
$name_colour_effective = sgs_resolve_text_colour_or_gradient( $name_colour, $name_colour_gradient );
if ( '' !== $name_colour_effective ) {
	$name_colour_decl = sgs_text_colour_decl( $name_colour_effective );
	if ( '' !== $name_colour_decl ) {
		$scoped_css[] = "{$name_colour_sel}{{$name_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $name_colour_sel, $name_colour_effective );
}
if ( '' !== ( $attributes['nameColourHover'] ?? '' ) ) {
	$scoped_css[] = sgs_hover_state_rules( "{$name_colour_sel}", "color:" . sgs_colour_value( $attributes['nameColourHover'] ), ':focus-visible' );
}
$role_colour_effective = sgs_resolve_text_colour_or_gradient( $role_colour, $role_colour_gradient );
if ( '' !== $role_colour_effective ) {
	$role_colour_decl = sgs_text_colour_decl( $role_colour_effective );
	if ( '' !== $role_colour_decl ) {
		$scoped_css[] = "{$role_colour_sel}{{$role_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $role_colour_sel, $role_colour_effective );
}
if ( '' !== ( $attributes['roleColourHover'] ?? '' ) ) {
	$scoped_css[] = sgs_hover_state_rules( "{$role_colour_sel}", "color:" . sgs_colour_value( $attributes['roleColourHover'] ), ':focus-visible' );
}

// --- Photo object-position (Spec 35 capability-routing doctrine mechanism
// (c), Part 9) — explicit call to the shared helper with this block's OWN
// known selector, since supports.sgs.imageControlsExplicit=true opts this
// block out of the guessing render_block filter (includes/image-controls.php).
// Returns '' when unset.
// ⛔ object-fit is CLEARED from this call (37-media-no-handroll fix,
// CORRECTED 2026-09-03 via /qc-council — mirrors sgs/gallery's identical
// fix): sgsObjectFit is now owned exclusively by the media-atom layer below,
// which reads the SAME attribute (bridged via mediaElements prefix "sgs").
// Without this clear, any team-member instance saved BEFORE this fix with a
// real sgsObjectFit value would have this call emit a literal
// `object-fit:<value>;` on the identical selector the atom also paints,
// silently overriding the atom's CSS-custom-property rule for existing
// content — a live double-emission bug, not just a duplicate control. ---
$photo_position_css = sgs_media_position_css(
	array_merge( $attributes, array( 'sgsObjectFit' => '' ) ),
	'sgs',
	$root_sel . ' .sgs-team-member__photo img'
);
if ( '' !== $photo_position_css ) {
	$scoped_css[] = $photo_position_css;
}

// --- Photo object-fit (37-media-no-handroll remediation, 2026-09-03,
// CORRECTED same day via /qc-council) — the crop MODE is bridged onto the
// SAME pre-existing sgsObjectFit attribute the legacy image-controls
// extension already exposes an 'Object fit' dropdown for (block.json
// supports.sgs.mediaElements, prefix "sgs") — NOT a new attribute, so no
// second control was added. style.css no longer hardcodes object-fit:cover;
// the shared `.sgs-media-el{object-fit:var(--sgs-media-object-fit,cover)}`
// atom stylesheet paints the identical default. sgs_render_media() (called
// at step 7 to build $photo_base_img, folded into $photo_html) takes no
// class argument, so the marker classes (`sgs-media-el` + the per-instance
// scope class) are injected into the already-built $photo_html string here,
// once $uid exists — same closure-not-top-level-function shape as
// sgs/testimonial's $sgs_media_el_classes (render.php, same date;
// feedback_no_top_level_function_in_per_render_php.md).
if ( '' !== $photo_html && class_exists( 'SGS_Media_Element' ) ) {
	$sgs_tm_scope_class = SGS_Media_Element::scope_class( $uid, 'sgs' );
	$sgs_tm_marker_cls  = implode( ' ', SGS_Media_Element::element_classes( $sgs_tm_scope_class ) );
	$photo_html         = preg_replace( '/class="sgs-media /', 'class="' . $sgs_tm_marker_cls . ' sgs-media ', $photo_html, 1 );

	$sgs_tm_fit_css = SGS_Media_Element::style( $attributes, 'sgs', 'sgs/team-member', $uid, array( 'object-fit' ) );
	if ( '' !== $sgs_tm_fit_css ) {
		$scoped_css[] = $sgs_tm_fit_css;
	}
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
// preset border / text-align classes re-added manually (the border/
// typography supports are skip-serialised so WP no longer auto-adds them).
// The preset text-colour/background-colour classes (`has-text-color` /
// `has-{slug}-color` / `has-background` / `has-{slug}-background-color`)
// are REMOVED — `supports.color.text`/`.background` are now FALSE, so
// WordPress no longer registers `textColor`/`backgroundColor` and this
// branch became unreachable (same fix shape as the sgs/quote precedent,
// commit `2eebbe55`). Background/text colour render via the scoped
// `.{uid}` rule built at step 12b instead.
// ---------------------------------------------------------------------------
$root_classes = $sgs_classes;

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
// No inline `style` attribute: the --sgs-* custom-property VALUES collected
// at step 6 are emitted into the scoped `.{uid}` rule at step 12 instead
// (post-D345 contract — see file header).
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 15. Render.
// ---------------------------------------------------------------------------

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
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
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

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_inner_html built with esc_*/wp_kses()/wp_json_encode(); $wrapper_attrs from get_block_wrapper_attributes(); $scoped_css pre-sanitised below.
$sgs_card_html  = '';
$sgs_card_html .= $scoped_css ? ( '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>' ) : '';
$sgs_card_html .= '<div ' . $wrapper_attrs . '>' . $sgs_inner_html . '</div>';

// Block-link is handled universally by the sgsBlockLink extension
// (includes/hover-effects.php, render_block filter) — it injects a
// stretched-link overlay as this root's last child, so no per-block wrap
// belongs here. This block's own blockLink/blockLinkTarget attrs (which had
// no edit.js control and were therefore unreachable) were removed.
echo $sgs_card_html;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
