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
 * NO-INLINE (per-block no-inline migration contract, 2026-07-09): the
 * rendered subtree carries ZERO inline CSS property declarations. Native WP
 * supports (color / spacing / border / typography) declare
 * `__experimentalSkipSerialization` in block.json so
 * `get_block_wrapper_attributes()` never auto-inlines them; every
 * declaration is emitted instead into the block's own scoped `<style>`.
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
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 * @since 2026-07-10  no-inline migration (contract 2026-07-09)
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// Sanitisers (contract §D) — a CSS-length / CSS-keyword allowlist so an
// object-attr side/corner value or free-text keyword can never break out of
// its declaration.
// ---------------------------------------------------------------------------
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$number        = isset( $attributes['number'] ) ? absint( $attributes['number'] ) : 0;
$prefix        = isset( $attributes['prefix'] ) ? (string) $attributes['prefix'] : '';
$suffix        = isset( $attributes['suffix'] ) ? (string) $attributes['suffix'] : '';
$label         = isset( $attributes['label'] ) ? (string) $attributes['label'] : '';
$duration      = isset( $attributes['duration'] ) ? absint( $attributes['duration'] ) : 2000;
$separator     = ! empty( $attributes['separator'] );
$number_colour = $attributes['numberColour'] ?? '';
$label_colour  = $attributes['labelColour'] ?? '';
$icon          = $attributes['icon'] ?? '';
$accent_stroke = ! empty( $attributes['accentStroke'] );

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
if ( $number_colour ) {
	$scoped_css[] = "{$number_sel}{color:" . sgs_colour_value( $number_colour ) . ';}';
}
if ( $label_colour ) {
	$scoped_css[] = "{$label_sel}{color:" . sgs_colour_value( $label_colour ) . ';}';
}

// ---------------------------------------------------------------------------
// Native `typography` support (fontSize/lineHeight) — skip-serialised in
// block.json, scoped to selectors.typography (".sgs-counter__number"), NOT
// the wrapper. `textAlign` is class-based (`has-text-align-*`, applied by WP
// core automatically) — no scoped rule needed for it.
// ---------------------------------------------------------------------------
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys), base only.
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

// Border width/style/colour — WP-native scalar (base only, no tiers; no
// custom SGS border attrs exist on this block).
$border_width_val = isset( $attributes['style']['border']['width'] ) ? $sgs_css_length( $attributes['style']['border']['width'] ) : '';
$border_style_val = isset( $attributes['style']['border']['style'] ) ? $sgs_css_keyword( $attributes['style']['border']['style'] ) : '';
$border_color_val = isset( $attributes['style']['border']['color'] ) ? (string) $attributes['style']['border']['color'] : '';

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
	if ( '' !== $border_width_val ) {
		$border_args['width'] = $border_width_val;
	}
	if ( '' !== $border_style_val ) {
		$border_args['style'] = $border_style_val;
	}
	if ( '' !== $border_color_val ) {
		$border_args['color'] = $border_color_val;
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

// ---------------------------------------------------------------------------
// Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the root selector (tablet <=1023px, mobile
// <=767px) — mirrors sgs/heading + sgs/button exactly.
// ---------------------------------------------------------------------------
$padding_tablet_obj       = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj       = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj        = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj        = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

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

// CSS border-radius shorthand order is top-left top-right bottom-right
// bottom-left (NOT the box-model top/right/bottom/left order).
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
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/heading). Every value reaching $scoped_css is pre-sanitised
	// ($sgs_css_length / $sgs_css_keyword / wp_style_engine_get_styles /
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
