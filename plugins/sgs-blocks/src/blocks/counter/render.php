<?php
/**
 * Server-side render for sgs/counter.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/counter {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-counter` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check.
 *
 * BOX-GROUP: padding / margin / border-radius are box objects. Base =
 * WP-native `style.spacing.*` / `style.border.radius` (scoped via
 * `wp_style_engine_get_styles()`, matching sgs/heading + sgs/button);
 * tiers = `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile`/
 * `borderRadiusTablet`/`borderRadiusMobile` object attrs (scoped
 * `@media` 1023/767). Border-width/style/colour stay WP-native scalar
 * (base only, no tiers) — also routed through the style engine.
 *
 * The `numberColour`/`labelColour` SGS scalar attrs and the native
 * `typography` support (fontSize/lineHeight) are scoped to the NUMBER
 * element (`.sgs-counter__number`), matching block.json's declared
 * `selectors.typography` — WP's own `get_block_wrapper_attributes()` would
 * otherwise (incorrectly) inline them onto the outer wrapper.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// Sanitisers (contract §D) — a CSS-length / CSS-keyword allowlist so an
// object-attr side/corner value or free-text keyword can never break out of
// its declaration.
// ---------------------------------------------------------------------------
$number        = isset( $attributes['number'] ) ? absint( $attributes['number'] ) : 0;
$prefix        = isset( $attributes['prefix'] ) ? (string) $attributes['prefix'] : '';
$suffix        = isset( $attributes['suffix'] ) ? (string) $attributes['suffix'] : '';
$label         = isset( $attributes['label'] ) ? (string) $attributes['label'] : '';
$duration      = isset( $attributes['duration'] ) ? absint( $attributes['duration'] ) : 2000;
$separator     = ! empty( $attributes['separator'] );
$number_colour = $attributes['numberColour'] ?? '';
// D636 — sibling-attribute shape, mirrors sgs/container's shipped
// backgroundOverlayColour/overlayGradient.
$number_colour_gradient = $attributes['numberColourGradient'] ?? '';
$label_colour           = $attributes['labelColour'] ?? '';
$label_colour_gradient  = $attributes['labelColourGradient'] ?? '';
$icon                   = $attributes['icon'] ?? '';
$accent_stroke          = ! empty( $attributes['accentStroke'] );

// Content-hash uid (Pattern A) — stable across fragment-cached renders (same
// attrs -> same id on every request), matching sgs/heading + sgs/button, so
// base+tier scoped rules below target a fixed selector rather than a
// per-request wp_unique_id() counter.
$uid = 'sgs-cnt-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

$root_sel   = '.' . $uid . '.wp-block-sgs-counter';
$number_sel = '.' . $uid . ' .sgs-counter__number';
$label_sel  = '.' . $uid . ' .sgs-counter__label';

require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
$typo_css = sgs_typography_css_rule( $attributes, 'label', $label_sel );

// Guarded declaration — render.php is included per block render, so an unguarded
// top-level function fatals on the 2nd counter on a page ("Cannot redeclare").
if ( ! function_exists( 'sgs_format_counter_number' ) ) {
	/**
	 * Format a number with thousand separators using en-GB locale.
	 *
	 * Parity with save.js formatNumber().
	 *
	 * @param int  $num       The number to format.
	 * @param bool $separator Whether to add thousand separators.
	 * @return string Formatted number string.
	 */
	function sgs_format_counter_number( int $num, bool $separator ): string {
		if ( $separator ) {
			return number_format_i18n( $num );
		}
		return (string) $num;
	}
}

$formatted_number = sgs_format_counter_number( $number, $separator );

$scoped_css = array();

// ---------------------------------------------------------------------------
// Number / label custom colour (SGS scalar attrs) — scoped, NOT inline.
// ---------------------------------------------------------------------------
// D636 — sibling gradient attribute wins when set+valid.
$number_colour_effective = sgs_resolve_text_colour_or_gradient( $number_colour, $number_colour_gradient );
if ( '' !== $number_colour_effective ) {
	$number_colour_decl = sgs_text_colour_decl( $number_colour_effective );
	if ( '' !== $number_colour_decl ) {
		$scoped_css[] = "{$number_sel}{{$number_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $number_sel, $number_colour_effective );
}
$label_colour_effective = sgs_resolve_text_colour_or_gradient( $label_colour, $label_colour_gradient );
if ( '' !== $label_colour_effective ) {
	$label_colour_decl = sgs_text_colour_decl( $label_colour_effective );
	if ( '' !== $label_colour_decl ) {
		$scoped_css[] = "{$label_sel}{{$label_colour_decl};}";
	}
	// MANDATORY companion, not optional: a gradient reaches the browser as
	// background-clip:text, and without this @supports fallback a browser
	// lacking that support gets a bare `color:` holding a gradient string,
	// which it drops silently. No-op for a flat colour.
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $label_sel, $label_colour_effective );
}

// ---------------------------------------------------------------------------
// Native `typography` support (fontSize/lineHeight) — skip-serialised in
// block.json, scoped to selectors.typography (".sgs-counter__number"), NOT
// the wrapper. `textAlign` is class-based (`has-text-align-*`, applied by WP
// core automatically) — no scoped rule needed for it.
// ---------------------------------------------------------------------------

$typography_args = array();
if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
	$typography_args['fontSize'] = $attributes['style']['typography']['fontSize'];
}
if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
	$typography_args['lineHeight'] = $attributes['style']['typography']['lineHeight'];
}
if ( ! empty( $typography_args ) ) {
	$native_typo_styles = wp_style_engine_get_styles(
		array( 'typography' => $typography_args ),
		array( 'selector' => $number_sel )
	);
	if ( ! empty( $native_typo_styles['css'] ) ) {
		$scoped_css[] = $native_typo_styles['css'];
	}
}

// ---------------------------------------------------------------------------
// Native `color` / `spacing` / `__experimentalBorder` supports (root-scoped)
// — all skip-serialised in block.json; $attributes['style'] is still
// populated by the editor, so emit scoped via the stable core style engine
// (mirrors sgs/heading + sgs/button exactly).
// ---------------------------------------------------------------------------
$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$base_padding_obj = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys), base only.

// Border width/style/colour — WP-native scalar (base only, no tiers; no
// custom SGS border attrs exist on this block).

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

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

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

if ( ! empty( $base_style_engine_args ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		$base_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// ---------------------------------------------------------------------------
// Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the root selector (tablet <=1023px, mobile
// <=767px) — mirrors sgs/heading + sgs/button exactly.
// ---------------------------------------------------------------------------
$padding_tablet_obj       = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj       = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj        = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj        = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

// CSS border-radius shorthand order is top-left top-right bottom-right
// bottom-left (NOT the box-model top/right/bottom/left order).
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );
$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

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

// Label typography (shared TypographyControls helper — already scoped).
if ( '' !== $typo_css ) {
	$scoped_css[] = $typo_css;
}

// ---------------------------------------------------------------------------
// Wrapper class + attributes — BEM root + uid + optional modifier + preset
// colour classes. No 'style' key passed — the root carries ZERO inline
// property declarations; everything is in the scoped <style> above.
// ---------------------------------------------------------------------------
$wrapper_classes = array( 'sgs-counter', $uid );
if ( $accent_stroke ) {
	$wrapper_classes[] = 'sgs-counter--accent-stroke';
}
// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (they set the colour from the theme palette).
if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$wrapper_args  = array(
	'class' => implode( ' ', $wrapper_classes ),
);
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Full text for SR only (parity with save.js fullText).
$full_text = $prefix . $formatted_number . $suffix . ' ' . $label;

?>
<?php
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
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
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
?>
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/heading). Every value reaching $scoped_css is pre-sanitised
	// (sgs_css_length_value() / sgs_css_keyword_sanitise() / wp_style_engine_get_styles /
	// sgs_colour_value / sgs_typography_css_rule), so no un-sanitised value
	// survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( $icon ) : ?>
		<span class="sgs-counter__icon-placeholder" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
	<?php endif; ?>
	<span class="sgs-sr-only"><?php echo esc_html( $full_text ); ?></span>
	<span class="sgs-counter__number" data-target="<?php echo esc_attr( (string) $number ); ?>" data-duration="<?php echo esc_attr( (string) $duration ); ?>" data-separator="<?php echo esc_attr( $separator ? 'true' : 'false' ); ?>"<?php echo $prefix ? ' data-prefix="' . esc_attr( $prefix ) . '"' : ''; ?><?php echo $suffix ? ' data-suffix="' . esc_attr( $suffix ) . '"' : ''; ?> aria-hidden="true">
	<?php
		echo esc_html( $prefix . $formatted_number . $suffix );
	?>
	</span>
	<p class="sgs-counter__label" aria-hidden="true"><?php echo wp_kses_post( $label ); ?></p>
</div>
<?php
