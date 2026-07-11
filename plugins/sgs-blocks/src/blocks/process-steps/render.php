<?php
/**
 * Server-side render for sgs/process-steps.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/process-steps {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-process-steps` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-10):
 * the rendered `<div>` root AND every descendant (each step + its number/
 * icon/title/description) carry ZERO inline CSS property declarations. Every
 * WP styling support this block declares (`spacing` / `color` /
 * `__experimentalBorder` / `typography` / `shadow`) carries
 * `__experimentalSkipSerialization: true` so get_block_wrapper_attributes()
 * never auto-inlines it. Everything is emitted into the block's OWN scoped
 * `.{uid}` <style> tag via `wp_style_engine_get_styles()` (exactly how WP
 * core outputs `layout` support) or hand-built shorthand for the SGS box
 * objects. The root's `style="--sgs-hover-bg:…"` custom-property VALUES stay
 * inline — a `--var: value` is a value, not a declaration (contract §A).
 *
 * BLOCK-PRIVATE, COMPOSITE-KEEPS-WRAPPER (contract §B3): this block never used
 * `SGS_Container_Wrapper` — it hand-rolls its own root `<div>` — and genuinely
 * wraps an ARRAY of step children (`supports.sgs.arrayContentLift`), so the
 * wrapper div is load-bearing and stays.
 *
 * BOX-GROUP (contract §B): root `padding`/`margin` → WP-native
 * `style.spacing.*` object (skip-serialised, emitted scoped) + SGS tier
 * object attrs `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile`.
 * `borderRadius` stays WP-native `style.border.radius` (skip-serialised,
 * base only — this block never had a per-corner design, matches sgs/heading
 * + sgs/quote). `borderWidth` is a new SGS custom object attr `{top,right,
 * bottom,left}` (base only, no WP-native width support — matches
 * sgs/heading/sgs/quote exactly); `borderStyle`/`borderColour` are new SGS
 * scalar attrs. Per-step number/title/description colours stay scalar
 * (single-value families, contract §C) but move from inline `style="…"` to
 * scoped descendant rules.
 *
 * @since 2026-05-15  Static-to-dynamic conversion
 * @since 2026-07-10  100% no-inline + box-group migration (D297 rollout).
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
// 1. Security sanitisers (contract §D) — mirrors sgs/heading + sgs/quote.
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$steps                   = isset( $attributes['steps'] ) && is_array( $attributes['steps'] ) ? $attributes['steps'] : array();
$connector_style         = $attributes['connectorStyle'] ?? 'line';
$number_style            = $attributes['numberStyle'] ?? 'circle';
$number_colour           = $attributes['numberColour'] ?? '';
$number_background       = $attributes['numberBackground'] ?? '';
$title_colour            = $attributes['titleColour'] ?? '';
$description_colour      = $attributes['descriptionColour'] ?? '';
$hover_background_colour = $attributes['backgroundColourHover'] ?? '';
$hover_text_colour       = $attributes['textColourHover'] ?? '';
$hover_border_colour     = $attributes['borderColourHover'] ?? '';
$hover_effect            = $attributes['effectHover'] ?? 'none';
$transition_duration     = $attributes['transitionDuration'] ?? '';
$transition_easing       = $attributes['transitionEasing'] ?? '';

// Border — SGS custom attrs (base only, no WP-native width/colour/style
// support — matches sgs/heading + sgs/quote). Border-radius stays WP-native.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width     = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour         = $attributes['borderColour'] ?? '';

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

// WP `color` / `typography` / `shadow` support values (skip-serialised in
// block.json → NOT auto-inlined). Passed wholesale to the style engine below
// — the engine safely ignores any sub-key it doesn't recognise.
$style_color_args      = isset( $attributes['style']['color'] ) && is_array( $attributes['style']['color'] ) ? $attributes['style']['color'] : array();
$style_typography_args = isset( $attributes['style']['typography'] ) && is_array( $attributes['style']['typography'] ) ? $attributes['style']['typography'] : array();
$style_shadow          = isset( $attributes['style']['shadow'] ) ? (string) $attributes['style']['shadow'] : '';
$preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// 3. uid + root selector. uid is a CLASS (contract §B3 — this block declares
// `supports.anchor`, so the root `id` must stay free for the ToC anchor).
// ---------------------------------------------------------------------------

$uid      = 'sgs-proc-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-process-steps';

// Wrapper class array (parity with save.js className).
$wrapper_classes   = array( 'sgs-process-steps', $uid );
$wrapper_classes[] = 'sgs-process-steps--connector-' . esc_attr( $connector_style );
$wrapper_classes[] = 'sgs-process-steps--number-' . esc_attr( $number_style );
if ( $hover_effect && 'none' !== $hover_effect ) {
	$wrapper_classes[] = 'sgs-process-steps--hover-' . esc_attr( $hover_effect );
}
if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// Wrapper CSS custom-property VALUES (parity with save.js wrapperStyle) — a
// `--var: value` is a value, not a declaration (contract §A), so this stays
// inline. Every real property declaration below moves to the scoped <style>.
$wrapper_style_parts = array();
if ( $hover_background_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}
if ( '' !== $transition_duration && null !== $transition_duration ) {
	$wrapper_style_parts[] = '--sgs-transition-duration:' . intval( $transition_duration ) . 'ms';
}
if ( $transition_easing ) {
	$wrapper_style_parts[] = '--sgs-transition-easing:' . esc_attr( $transition_easing );
}
$wrapper_style = $wrapper_style_parts ? implode( ';', $wrapper_style_parts ) : '';

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);
if ( $wrapper_style ) {
	$wrapper_args['style'] = $wrapper_style;
}
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly — root box/border/colour/typography/shadow +
// responsive tiers + per-step number/title/description colours.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Root border-style / border-colour / border-width (SGS custom, scoped). ---
$root_border_decls = array();
if ( 'none' !== $border_style ) {
	if ( $has_border_width ) {
		$bwt                  = '' !== $border_width_top ? $border_width_top : '0';
		$bwr                  = '' !== $border_width_right ? $border_width_right : '0';
		$bwb                  = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl                  = '' !== $border_width_left ? $border_width_left : '0';
		$root_border_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$root_border_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$root_border_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
}
if ( $root_border_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_border_decls ) . ';}';
}

// --- Base spacing (padding/margin), border-radius, WP colour + typography +
// shadow supports — skip-serialised, emitted scoped via the stable core style
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

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}

	if ( ! empty( $style_color_args ) ) {
		$base_style_engine_args['color'] = $style_color_args;
	}

	if ( ! empty( $style_typography_args ) ) {
		$base_style_engine_args['typography'] = $style_typography_args;
	}

	if ( '' !== $style_shadow ) {
		$base_style_engine_args['shadow'] = $style_shadow;
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
// scoped @media on the SAME root selector (contract §B2: tablet
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

// --- Per-step number/title/description colours — SGS scalar attrs, single
// declaration each, now scoped descendant rules instead of inline style="…"
// on every repeated step element (contract §A). ---
$num_scope   = $root_sel . ' .sgs-process-steps__number';
$title_scope = $root_sel . ' .sgs-process-steps__title';
$desc_scope  = $root_sel . ' .sgs-process-steps__description';

$num_decls = array();
if ( $number_colour ) {
	$num_decls[] = 'color:' . sgs_colour_value( $number_colour );
}
if ( $number_background ) {
	$num_decls[] = 'background-color:' . sgs_colour_value( $number_background );
}
if ( $num_decls ) {
	$scoped_css[] = "{$num_scope}{" . implode( ';', $num_decls ) . ';}';
}

if ( $title_colour ) {
	$scoped_css[] = "{$title_scope}{color:" . sgs_colour_value( $title_colour ) . ';}';
}

if ( $description_colour ) {
	$scoped_css[] = "{$desc_scope}{color:" . sgs_colour_value( $description_colour ) . ';}';
}

// ---------------------------------------------------------------------------
// 5. Render.
// ---------------------------------------------------------------------------

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	foreach ( $steps as $index => $step ) :
		$step        = is_array( $step ) ? $step : array();
		$icon        = isset( $step['icon'] ) ? (string) $step['icon'] : '';
		$number      = isset( $step['number'] ) ? (string) $step['number'] : (string) ( $index + 1 );
		$step_title  = isset( $step['title'] ) ? (string) $step['title'] : '';
		$description = isset( $step['description'] ) ? (string) $step['description'] : '';
		?>
		<div class="sgs-process-steps__step">
			<?php if ( $icon ) : ?>
				<span class="sgs-process-steps__icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
			<?php endif; ?>
			<?php if ( 'none' !== $number_style ) : ?>
				<span class="sgs-process-steps__number" aria-hidden="true"><?php echo esc_html( $number ); ?></span>
			<?php endif; ?>
			<h3 class="sgs-process-steps__title"><?php echo esc_html( $step_title ); ?></h3>
			<?php if ( $description ) : ?>
				<p class="sgs-process-steps__description"><?php echo esc_html( $description ); ?></p>
			<?php endif; ?>
		</div>
	<?php endforeach; ?>
</div>
