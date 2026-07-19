<?php
/**
 * Server-side render for the SGS Brand Strip block.
 *
 * Two-container architecture (Ryan Mulligan pattern):
 * PHP outputs logos once inside a .sgs-brand-strip__set wrapper.
 * view.js measures actual widths at runtime and clones the set
 * the minimum number of times needed for seamless infinite scroll.
 * CSS @keyframes handles the animation on the GPU compositor thread.
 *
 * NO-INLINE, BLOCK-PRIVATE (LOCKED per-block no-inline migration contract
 * §A/§B, 2026-07-10): the rendered root `<div>` carries ZERO inline CSS
 * property declarations — every WP-native styling support (color/spacing/
 * __experimentalBorder) declares `__experimentalSkipSerialization` in
 * block.json, and every value is emitted scoped into the block's OWN
 * `.{uid}` <style> tag via the stable core API `wp_style_engine_get_styles()`
 * (exactly how WP core outputs `layout` support). A `--var: value` custom
 * property VALUE on the root (scroll speed, logo max-height, fade width,
 * hover colours, transition duration/easing) is a VALUE, not a property
 * declaration, so it stays on the element per contract §A.
 *
 * BOX-GROUP (contract §B): padding/margin/border-radius are WP-native
 * `style.spacing.*` / `style.border.radius` objects (already object-shaped) —
 * emitted scoped, not inline. Tablet/Mobile tiers are SGS custom object attrs
 * (paddingTablet/paddingMobile/marginTablet/marginMobile/borderRadiusTablet/
 * borderRadiusMobile). Border width/style/colour are WP-native `style.border`
 * values (this block declares full __experimentalBorder support, unlike
 * sgs/quote's bespoke scalar attrs) — passed wholesale to the style engine,
 * base only (no tiers, matches the DONE checklist's border-radius-only tier
 * requirement).
 *
 * @since 2026-07-10  No-inline migration: WP supports skip-serialised +
 *                    scoped output; padding/margin/border-radius tier attrs
 *                    added; view.js animation-pause moved off inline style.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitiser (contract §D) — CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/quote + sgs/media).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$logos               = $attributes['logos'] ?? array();
$scrolling           = $attributes['scrolling'] ?? false;
$scroll_speed        = $attributes['scrollSpeed'] ?? 'medium';
$scroll_direction    = $attributes['scrollDirection'] ?? 'left';
$fade_edges          = $attributes['fadeEdges'] ?? false;
$fade_width          = $attributes['fadeWidth'] ?? 60;
$image_effect        = $attributes['imageEffect'] ?? 'none';
$max_height          = $attributes['maxHeight'] ?? 180;
$columns_desktop     = isset( $attributes['columnsDesktop'] ) ? max( 1, absint( $attributes['columnsDesktop'] ) ) : 8;
$columns_tablet      = isset( $attributes['columnsTablet'] ) ? max( 1, absint( $attributes['columnsTablet'] ) ) : 4;
$columns_mobile      = isset( $attributes['columnsMobile'] ) ? max( 1, absint( $attributes['columnsMobile'] ) ) : 2;
$show_names          = ! empty( $attributes['showNames'] );
$pause_on_hover      = ! isset( $attributes['pauseOnHover'] ) || (bool) $attributes['pauseOnHover'];
$name_colour         = $attributes['nameColour'] ?? '';
$logo_gap            = isset( $attributes['logoGap'] ) ? absint( $attributes['logoGap'] ) : 0;
$tile_padding        = isset( $attributes['tilePadding'] ) ? absint( $attributes['tilePadding'] ) : 10;
$tile_radius         = isset( $attributes['tileRadius'] ) ? absint( $attributes['tileRadius'] ) : 16;
$tile_shape_raw      = $attributes['tileShape'] ?? 'square';
$tile_shape          = in_array( $tile_shape_raw, array( 'square', 'circle', 'none' ), true ) ? $tile_shape_raw : 'square';
$logo_fit_raw        = $attributes['logoFit'] ?? 'contain';
$logo_fit            = in_array( $logo_fit_raw, array( 'contain', 'cover' ), true ) ? $logo_fit_raw : 'contain';
$tile_bg_colour      = $attributes['tileBackgroundColour'] ?? '';
$tile_border_width   = isset( $attributes['tileBorderWidth'] ) ? absint( $attributes['tileBorderWidth'] ) : 0;
$tile_border_colour  = $attributes['tileBorderColour'] ?? '';
// Raw CSS box-shadow VALUE (or theme shadow-preset slug) from the shared
// ShadowControl builder — replaces the old none/small/medium enum SelectControl
// (Spec 35 Task 2 element-first rebuild). A pre-migration legacy string such as
// "small"/"medium" (neither a raw shadow nor a real theme.json shadow preset
// slug — those are sm/md/lg/glow) falls through sgs_shadow_value() to an
// unresolvable `var(--wp--preset--shadow--small)`, which the browser simply
// ignores (initial box-shadow: none) — graceful degrade, no crash, no
// deprecation needed (D270 no-deprecations policy).
$tile_shadow         = $attributes['tileShadow'] ?? '';
$hover_bg_colour     = $attributes['backgroundColourHover'] ?? '';
$hover_text_colour   = $attributes['textColourHover'] ?? '';
$hover_border_colour = $attributes['borderColourHover'] ?? '';
$hover_effect        = $attributes['effectHover'] ?? 'none';
$transition_duration = $attributes['transitionDuration'] ?? '300';
$transition_easing   = $attributes['transitionEasing'] ?? 'ease-in-out';

// Map scroll speed to CSS animation duration.
$speed_map       = array(
	'slow'   => '60s',
	'medium' => '30s',
	'fast'   => '15s',
);
$animation_speed = $speed_map[ $scroll_speed ] ?? '25s';

// Sanitise values.
$allowed_effects     = array( 'none', 'lift', 'scale', 'glow' );
$safe_hover_effect   = in_array( $hover_effect, $allowed_effects, true ) ? $hover_effect : 'none';
$safe_direction      = in_array( $scroll_direction, array( 'left', 'right' ), true ) ? $scroll_direction : 'left';
$allowed_img_effects = array( 'none', 'grayscale', 'sepia' );
$safe_image_effect   = in_array( $image_effect, $allowed_img_effects, true ) ? $image_effect : 'none';
// tileShadow sanitisation happens at emission time via sgs_shadow_value()
// (helpers-tokens.php) — it either passes a raw CSS shadow through (normalising
// any embedded functional colour to hex) or resolves a theme shadow-preset slug
// to `var(--wp--preset--shadow--{slug})`; there is no fixed enum to validate
// against any more (see ShadowControl.js).

// ---------------------------------------------------------------------------
// 3. WP-native style groups (skip-serialised in block.json → NOT auto-inlined
// by get_block_wrapper_attributes()). Padding/margin base are already
// object-shaped ({top,right,bottom,left}); border is passed wholesale (this
// block has full native width/style/color/radius support, unlike sgs/quote's
// bespoke scalar borderWidth attr).
// ---------------------------------------------------------------------------

$native_bg      = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $padding_side => $padding_value ) {
		if ( is_string( $padding_value ) && '' !== $padding_value ) {
			$base_padding_obj[ $padding_side ] = $padding_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

$padding_tablet_obj       = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj       = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj        = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj        = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// ---------------------------------------------------------------------------
// 4. Build wrapper classes. `has-background`/`has-{slug}-background-color`
// re-added manually (skip-serialisation suppresses WP's automatic class
// addition too, not just the inline style — matches sgs/label + sgs/quote).
// ---------------------------------------------------------------------------

$has_background = ( '' !== $native_bg || '' !== $preset_bg_slug );

$classes = array( 'sgs-brand-strip' );
$classes[] = 'sgs-brand-strip--tile-' . esc_attr( $tile_shape );
if ( 'none' !== $safe_image_effect ) {
	$classes[] = 'sgs-brand-strip--effect-' . esc_attr( $safe_image_effect );
}
if ( $scrolling ) {
	$classes[] = 'sgs-brand-strip--scrolling';
}
if ( 'right' === $safe_direction ) {
	$classes[] = 'sgs-brand-strip--reverse';
}
if ( $fade_edges ) {
	$classes[] = 'sgs-brand-strip--fade';
}
if ( 'none' !== $safe_hover_effect ) {
	$classes[] = 'sgs-brand-strip--hover-' . esc_attr( $safe_hover_effect );
}
if ( ! $pause_on_hover ) {
	$classes[] = 'sgs-brand-strip--no-pause';
}
if ( $has_background ) {
	$classes[] = 'has-background';
	if ( '' !== $preset_bg_slug ) {
		$classes[] = 'has-' . $preset_bg_slug . '-background-color';
	}
}

// ---------------------------------------------------------------------------
// 5. Build CSS custom properties (VALUES, not property declarations — allowed
// inline per contract §A). Unchanged from the pre-migration behaviour.
// ---------------------------------------------------------------------------

$css_vars = array_merge(
	sgs_transition_vars( $attributes ),
	array(
		'--sgs-scroll-speed:' . esc_attr( $animation_speed ),
		'--sgs-logo-max-height:' . absint( $max_height ) . 'px',
		// Columns-per-device: tile width = strip-width / columns (container-query
		// driven in style.css), capped at the maxHeight-derived size so tiles grow
		// with the strip up to a sensible limit then stop (no giant pixelated logos).
		'--sgs-columns-desktop:' . $columns_desktop,
		'--sgs-columns-tablet:' . $columns_tablet,
		'--sgs-columns-mobile:' . $columns_mobile,
		'--sgs-tile-padding:' . $tile_padding . 'px',
		'--sgs-tile-radius:' . $tile_radius . 'px',
		// NB: named "thickness" NOT "border-width" — an inline value containing the
		// substring "border-width" is matched by WP core's border-support selector
		// `html :where([style*="border-width"]){border-style:solid}`, which then
		// paints a phantom 3px currentColor border on this root (D-2026-07-17).
		'--sgs-tile-border-thickness:' . $tile_border_width . 'px',
		'--sgs-logo-fit:' . $logo_fit,
	)
);
if ( $fade_edges ) {
	$css_vars[] = '--sgs-fade-width:' . absint( $fade_width ) . 'px';
}
if ( $hover_bg_colour ) {
	$css_vars[] = '--sgs-tile-hover-bg:' . sgs_colour_value( $hover_bg_colour );
}
if ( $hover_text_colour ) {
	$css_vars[] = '--sgs-tile-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$css_vars[] = '--sgs-tile-hover-border:' . sgs_colour_value( $hover_border_colour );
}
// Resting tile background (client tileBackgroundColour control) feeds the
// --sgs-tile-bg hook already consumed by style.css .sgs-brand-strip__item.
if ( $tile_bg_colour ) {
	$css_vars[] = '--sgs-tile-bg:' . sgs_colour_value( $tile_bg_colour );
}
// Emit ALWAYS (not only when > 0) so an explicit 0 is honoured — otherwise a 0
// value falls through to the CSS `var(--sgs-logo-gap, spacing|50)` default and
// the gap can never be closed (a reference strip with adjacent, border-separated
// tiles needs gap:0). block.json default stays 0 = tiles adjacent; raise logoGap
// to add space.
$css_vars[] = '--sgs-logo-gap:' . $logo_gap . 'px';

// ---------------------------------------------------------------------------
// 6. Scoped CSS assembly. uid is a CLASS (this block declares `anchor: true`,
// so an `id` may be present on the wrapper attrs — the scoped selector must
// never collide with it, contract §B3).
// ---------------------------------------------------------------------------

$uid      = 'sgs-brandstrip-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-brand-strip';

$scoped_css = array();

// Per-instance CSS custom-property VALUES → a scoped `.uid{…}` rule in the
// block's own <style> (consolidated to the stylesheet by the SGS CSS registry),
// NOT an inline `style="--var:…"` attribute on the root. Matches the
// fully-migrated blocks (quote, D294 — "everything lives in the scoped <style>")
// and Spec 32's intent that nothing renders inline except the sgsCustomCss
// residual. Declared first so the values are present for the base style.css
// rules that consume them via var(). Values are already sanitised at source
// (absint / esc_attr / sgs_colour_value); the scoped channel (wp_strip_all_tags)
// is NOT subject to safecss_filter_attr, so functional colours survive here.
if ( ! empty( $css_vars ) ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $css_vars ) . '}';
}

// --- Base spacing (padding/margin) + native border (width/style/colour/
// radius) + native background colour — all skip-serialised WP supports,
// emitted scoped via the stable core style engine. ---
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

	if ( ! empty( $native_border ) ) {
		$base_style_engine_args['border'] = $native_border;
	}

	if ( '' !== $native_bg ) {
		$base_style_engine_args['color'] = array( 'background' => $native_bg );
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

// --- Static tile border (distinct from the hover border colour system —
// `--sgs-tile-hover-border` above only applies `:hover`; this is the resting-
// state border). Width sanitised via absint on extraction; colour resolved
// through the shared sgs_colour_value() helper (handles hex/token/rgba
// normalisation and matches the pattern used for the hover colours). ---
if ( $tile_border_width > 0 || '' !== $tile_border_colour ) {
	$tile_border_decls = array();
	if ( $tile_border_width > 0 ) {
		$tile_border_decls[] = 'border-width:' . $tile_border_width . 'px';
		$tile_border_decls[] = 'border-style:solid';
	}
	if ( '' !== $tile_border_colour ) {
		$tile_border_decls[] = 'border-color:' . sgs_colour_value( $tile_border_colour );
	}
	if ( $tile_border_decls ) {
		$scoped_css[] = "{$root_sel} .sgs-brand-strip__item{" . implode( ';', $tile_border_decls ) . ';}';
	}
}

// --- Tile shadow (Spec 35 Task 2 — ShadowControl builder replaces the old
// none/small/medium enum). `sgs_shadow_value()` accepts either a raw CSS
// box-shadow string (the builder's normal output — colour normalised to hex
// so it survives `safecss_filter_attr()`-style stripping even though this
// channel isn't subject to it) or a bare theme shadow-preset slug picked from
// the preset row (sm/md/lg/glow), and resolves it to `var(--wp--preset--
// shadow--{slug})`. Scoped, real `box-shadow` PROPERTY declaration — never
// inline (Spec 32). Applies at rest; `.sgs-brand-strip--hover-lift` already
// overrides box-shadow on hover via its own rule in style.css, unaffected. ---
if ( '' !== $tile_shadow ) {
	$safe_tile_shadow_value = sgs_shadow_value( $tile_shadow );
	if ( '' !== $safe_tile_shadow_value ) {
		$scoped_css[] = "{$root_sel} .sgs-brand-strip__item{box-shadow:{$safe_tile_shadow_value};}";
	}
}

// --- Logo-name caption typography (shared TypographyControls contract,
// prefix 'name') -- replaces the pre-existing fixed 0.8125rem style.css
// default with a client-facing, per-tier control (base/tablet/mobile size,
// weight). Emitted only when the caption is shown (an element that never
// renders should not carry emitted CSS). ---
if ( $show_names && function_exists( 'sgs_typography_css_rule' ) ) {
	$name_typography_css = sgs_typography_css_rule( $attributes, 'name', "{$root_sel} .sgs-brand-strip__name" );
	if ( '' !== $name_typography_css ) {
		$scoped_css[] = $name_typography_css;
	}
	if ( '' !== $name_colour ) {
		$scoped_css[] = "{$root_sel} .sgs-brand-strip__name{color:" . sgs_colour_value( $name_colour ) . ';}';
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px). ---
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

// --- Border-radius tiers — SGS custom tier OBJECT attrs, routed through the
// same stable core style-engine API as the base rule above. ---
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

// ---------------------------------------------------------------------------
// 7. Build the root element's classes + attributes. NO 'style' key at all — the
// per-instance custom-property VALUES are emitted as a scoped `.uid{…}` rule in
// the block's <style> above (consolidated to the stylesheet), and every native
// support (color/spacing/border) skip-serialises (block.json), so the root
// carries ZERO inline style attribute (Spec 32 intent: nothing inline).
// ---------------------------------------------------------------------------

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', array_merge( $classes, array( $uid ) ) ),
	)
);

/*
 * Build logo items HTML (single set — JS handles cloning at runtime).
 * Each logo entry is migrated to the unified media-slot shape:
 *   { media: { url, type:'image', id, alt, mime, width, height }, alt, linkUrl }
 * Legacy entries ({ image: { url, ... }, url: linkUrl }) are read inline as a
 * safety net for posts that have not yet round-tripped through the editor.
 */
$logos_html = '';
if ( ! empty( $logos ) ) {
	$logo_index = 0;
	foreach ( $logos as $logo ) {
		$media = isset( $logo['media'] ) && is_array( $logo['media'] ) ? $logo['media'] : null;

		// Backward-compat: lift legacy { image: {...} } shape to media.
		if ( null === $media && isset( $logo['image'] ) && is_array( $logo['image'] ) ) {
			$legacy = $logo['image'];
			$media  = array(
				'url'    => $legacy['url'] ?? '',
				'type'   => 'image',
				'id'     => isset( $legacy['id'] ) ? absint( $legacy['id'] ) : 0,
				'alt'    => $logo['alt'] ?? ( $legacy['alt'] ?? '' ),
				'mime'   => '',
				'width'  => isset( $legacy['width'] ) ? absint( $legacy['width'] ) : 0,
				'height' => isset( $legacy['height'] ) ? absint( $legacy['height'] ) : 0,
			);
		}

		if ( null === $media || empty( $media['url'] ) ) {
			continue;
		}

		$logo_name   = isset( $logo['name'] ) ? sanitize_text_field( (string) $logo['name'] ) : '';
		$has_caption = $show_names && '' !== $logo_name;

		if ( $has_caption ) {
			// Caption is on-screen and carries the accessible name — the
			// image becomes decorative so screen readers announce the name
			// once, not twice.
			$media['alt'] = '';
		} elseif ( ! empty( $logo['alt'] ) ) {
			// Operator alt text overrides media alt when set.
			$media['alt'] = $logo['alt'];
		}

		$logo_html = sgs_render_media( $media, 'sgs/brand-strip' );
		if ( '' === $logo_html ) {
			continue;
		}

		$name_id = $has_caption ? $uid . '-name-' . $logo_index : '';

		// Shared SgsLinkControl object shape { url, opensInNewTab, rel } (Spec 35
		// Task 2) resolved via the shared sgs_link_attributes() render helper —
		// mirrors sgs/icon's own link handling rather than hand-rolling target/rel
		// again here. linkUrl/linkTarget/linkRel are the existing per-item storage
		// keys (unchanged), so no per-item data is stranded by the editor swap.
		$link_attrs_str = sgs_link_attributes(
			array(
				'url'           => $logo['linkUrl'] ?? '',
				'opensInNewTab' => isset( $logo['linkTarget'] ) && '_blank' === $logo['linkTarget'],
				'rel'           => $logo['linkRel'] ?? '',
			)
		);
		if ( '' !== $link_attrs_str ) {
			if ( '' !== $name_id ) {
				$link_attrs_str .= ' aria-labelledby="' . esc_attr( $name_id ) . '"';
			}
			$logo_html = '<a' . $link_attrs_str . '>' . $logo_html . '</a>';
		}

		if ( $has_caption ) {
			$logos_html .= '<div class="sgs-brand-strip__tile">';
			$logos_html .= '<div class="sgs-brand-strip__item">' . $logo_html . '</div>';
			$logos_html .= '<span id="' . esc_attr( $name_id ) . '" class="sgs-brand-strip__name">' . esc_html( $logo_name ) . '</span>';
			$logos_html .= '</div>';
		} else {
			$logos_html .= '<div class="sgs-brand-strip__item">';
			$logos_html .= $logo_html;
			$logos_html .= '</div>';
		}

		++$logo_index;
	}
}

// ---------------------------------------------------------------------------
// 8. Output. wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
// leaving CSS combinators like `>` intact (contract §D). Every value reaching
// $scoped_css is pre-sanitised ($sgs_css_length / wp_style_engine_get_styles),
// so no un-sanitised value survives here. Single set inside track — view.js
// clones as needed for infinite scroll.
// ---------------------------------------------------------------------------

if ( $scoped_css ) :
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
	<?php
endif;

printf(
	'<div %1$s><div class="sgs-brand-strip__track"><div class="sgs-brand-strip__set">%2$s</div></div></div>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$logos_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from sgs_render_media(), which escapes its own output.
);
