<?php
/**
 * Server-side render for the SGS Countdown Timer block.
 *
 * BLOCK-PRIVATE, NO-INLINE (LOCKED per-block no-inline migration contract
 * §A/§B/§B2, 2026-07-09): the rendered subtree carries ZERO inline CSS
 * property declarations. WP styling supports (color/typography/spacing/
 * __experimentalBorder) all declare `__experimentalSkipSerialization` in
 * block.json so get_block_wrapper_attributes() never auto-inlines them;
 * every declaration is emitted into the block's OWN scoped `.{uid}` <style>
 * tag via the stable core `wp_style_engine_get_styles()` API — exactly how
 * WP core outputs `layout` support (mirrors sgs/quote + sgs/media).
 *
 * The `--sgs-countdown-number-colour` / `--sgs-countdown-label-colour`
 * declarations are CSS custom-property VALUES (not property declarations),
 * so they stay as an inline `style="--x:y"` attribute per contract §A.
 *
 * BOX-GROUP (contract §B): base padding/margin/border-radius/border-width/
 * border-style/border-colour are all WP-native `style.spacing.*` /
 * `style.border.*` objects (already object-shaped) — emitted scoped via the
 * style engine (mirrors sgs/media's whole-border-group pattern). Tiers
 * (Tablet/Mobile) are SGS custom object attrs (paddingTablet/paddingMobile/
 * marginTablet/marginMobile/borderRadiusTablet/borderRadiusMobile), each
 * routed through the same style-engine call per @media tier.
 *
 * The wrapper `<div class="sgs-countdown">` is a genuine composite root
 * (multiple digit-unit children), not a single-semantic-element block, so it
 * KEEPS its wrapper (contract §B3). Because `anchor` support is declared,
 * the scoped uid is a CLASS (never an `id`) so it never collides with the
 * anchor id (contract §B3 / mirrors sgs/quote).
 *
 * @since 2026-05-16  Initial.
 * @since 2026-07-10  No-inline migration (skip-serialised supports + scoped
 *                    `.{uid}` <style> + box-object tiers).
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
// 1. Security (contract §D). All free-text keyword attrs below (cardStyle,
// digitStyle, textAlign) are validated via strict in_array() allowlists —
// never concatenated raw into CSS. The box-object attrs (padding/margin/
// border) are handed wholesale to the core wp_style_engine_get_styles() API,
// which is the same trusted sanitisation path WP core uses for the `layout`
// support — no additional keyword/length sanitiser is needed in this file.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$target_date     = $attributes['targetDate'] ?? '';
$evergreen_mode  = $attributes['evergreenMode'] ?? false;
$evergreen_hours = $attributes['evergreenHours'] ?? 24;
$evergreen_mins  = $attributes['evergreenMinutes'] ?? 0;
$expired_message = $attributes['expiredMessage'] ?? 'This offer has expired.';
$show_days       = $attributes['showDays'] ?? true;
$show_hours      = $attributes['showHours'] ?? true;
$show_minutes    = $attributes['showMinutes'] ?? true;
$show_seconds    = $attributes['showSeconds'] ?? true;
$number_colour   = $attributes['numberColour'] ?? 'primary';
$label_colour    = $attributes['labelColour'] ?? 'text-muted';
$card_style_raw  = $attributes['cardStyle'] ?? 'elevated';
$digit_style_raw = $attributes['digitStyle'] ?? 'simple';

$allowed_card_styles  = array( 'flat', 'bordered', 'elevated', 'filled' );
$card_style           = in_array( $card_style_raw, $allowed_card_styles, true ) ? $card_style_raw : 'elevated';
$allowed_digit_styles = array( 'simple', 'flip' );
$digit_style          = in_array( $digit_style_raw, $allowed_digit_styles, true ) ? $digit_style_raw : 'simple';

// ---------------------------------------------------------------------------
// 3. Calculate initial server-side values for fixed target dates.
// ---------------------------------------------------------------------------

$initial    = array( 'days' => 0, 'hours' => 0, 'minutes' => 0, 'seconds' => 0 );
$server_ts  = 0;
$is_expired = false;

if ( ! $evergreen_mode && $target_date ) {
	try {
		$tz     = wp_timezone();
		$target = new \DateTime( $target_date, $tz );
		$now    = new \DateTime( 'now', $tz );

		$server_ts = $target->getTimestamp();

		if ( $target <= $now ) {
			$is_expired = true;
		} else {
			$total_seconds      = $target->getTimestamp() - $now->getTimestamp();
			$initial['days']    = (int) floor( $total_seconds / 86400 );
			$remaining          = $total_seconds % 86400;
			$initial['hours']   = (int) floor( $remaining / 3600 );
			$remaining         %= 3600;
			$initial['minutes'] = (int) floor( $remaining / 60 );
			$initial['seconds'] = $remaining % 60;
		}
	} catch ( \Exception $e ) {
		// Invalid date — fall back to zeros, JS handles it.
	}
}

// ---------------------------------------------------------------------------
// 4. Base box-object attrs — WP-native style.spacing.*/style.border.* objects
// (skip-serialised → NOT auto-inlined); tiers — SGS custom object attrs.
// ---------------------------------------------------------------------------

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $side => $val ) {
		if ( is_string( $val ) && '' !== $val ) {
			$base_padding_obj[ $side ] = $val;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $side => $val ) {
		if ( is_string( $val ) && '' !== $val ) {
			$base_margin_obj[ $side ] = $val;
		}
	}
}

$padding_tablet_obj      = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj      = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj       = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj       = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// Whole native border group (colour/width/style/radius) — read wholesale, like
// sgs/media, because __experimentalBorder carries all four under one object.
$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

// WP `color` support values (skip-serialised).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// WP `typography` support values (skip-serialised).
$style_font_size = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';
$preset_size_slug = isset( $attributes['fontSize'] ) ? sanitize_html_class( $attributes['fontSize'] ) : '';
$text_align_raw   = isset( $attributes['textAlign'] ) ? (string) $attributes['textAlign'] : '';
$allowed_aligns   = array( 'left', 'center', 'right', 'justify' );
$text_align       = in_array( $text_align_raw, $allowed_aligns, true ) ? $text_align_raw : '';

// ---------------------------------------------------------------------------
// 5. Scoped CSS assembly. uid is a CLASS — anchor support is declared, so the
// element's own `id` attribute stays free for the anchor.
// ---------------------------------------------------------------------------

$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-cd-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-countdown-timer';

$scoped_css = array();

// --- Base spacing/border/colour/typography — one style-engine call, scoped. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_args['spacing'] = $base_spacing;
	}

	if ( ! empty( $native_border ) ) {
		$base_args['border'] = $native_border;
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$base_args['color'] = $color_args;
	}

	if ( '' !== $style_font_size ) {
		$base_args['typography'] = array( 'fontSize' => $style_font_size );
	}

	if ( ! empty( $base_args ) ) {
		$base_out = wp_style_engine_get_styles( $base_args, array( 'selector' => $root_sel ) );
		if ( ! empty( $base_out['css'] ) ) {
			$scoped_css[] = $base_out['css'];
		}
	}
}

// --- text-align — scoped declaration (custom attr keyword, WP core support
// value; not native inline-serialised). ---
if ( '' !== $text_align ) {
	$scoped_css[] = "{$root_sel}{text-align:{$text_align};}";
}

// --- Responsive tiers — padding/margin/border-radius, each routed through the
// same style-engine call, wrapped in the block's own scoped @media (contract
// §B2: tablet max-width:1023px, mobile max-width:767px). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$tablet_args = array();
	if ( ! empty( $padding_tablet_obj ) || ! empty( $margin_tablet_obj ) ) {
		$tablet_spacing = array();
		if ( ! empty( $padding_tablet_obj ) ) {
			$tablet_spacing['padding'] = $padding_tablet_obj;
		}
		if ( ! empty( $margin_tablet_obj ) ) {
			$tablet_spacing['margin'] = $margin_tablet_obj;
		}
		$tablet_args['spacing'] = $tablet_spacing;
	}
	if ( ! empty( $border_radius_tablet_obj ) ) {
		$tablet_args['border'] = array( 'radius' => $border_radius_tablet_obj );
	}
	if ( ! empty( $tablet_args ) ) {
		$tablet_out = wp_style_engine_get_styles( $tablet_args, array( 'selector' => $root_sel ) );
		if ( ! empty( $tablet_out['css'] ) ) {
			$scoped_css[] = '@media(max-width:1023px){' . $tablet_out['css'] . '}';
		}
	}

	$mobile_args = array();
	if ( ! empty( $padding_mobile_obj ) || ! empty( $margin_mobile_obj ) ) {
		$mobile_spacing = array();
		if ( ! empty( $padding_mobile_obj ) ) {
			$mobile_spacing['padding'] = $padding_mobile_obj;
		}
		if ( ! empty( $margin_mobile_obj ) ) {
			$mobile_spacing['margin'] = $margin_mobile_obj;
		}
		$mobile_args['spacing'] = $mobile_spacing;
	}
	if ( ! empty( $border_radius_mobile_obj ) ) {
		$mobile_args['border'] = array( 'radius' => $border_radius_mobile_obj );
	}
	if ( ! empty( $mobile_args ) ) {
		$mobile_out = wp_style_engine_get_styles( $mobile_args, array( 'selector' => $root_sel ) );
		if ( ! empty( $mobile_out['css'] ) ) {
			$scoped_css[] = '@media(max-width:767px){' . $mobile_out['css'] . '}';
		}
	}
}

// ---------------------------------------------------------------------------
// 6. Build the root element's classes + attributes.
//
// The custom-property style ("--sgs-countdown-number-colour"/"--sgs-countdown-
// label-colour") carries VALUES, not property declarations — allowed under
// contract §A. No other 'style' key is passed; every real declaration lives
// in the scoped <style> above.
// ---------------------------------------------------------------------------

$classes = array(
	'sgs-countdown',
	$uid,
	'sgs-countdown--' . esc_attr( $card_style ),
	'sgs-countdown--digit-' . esc_attr( $digit_style ),
);

if ( $is_expired ) {
	$classes[] = 'sgs-countdown--ended';
}

if ( '' !== $preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $preset_bg_slug . '-background-color';
}
if ( '' !== $preset_size_slug ) {
	$classes[] = 'has-' . $preset_size_slug . '-font-size';
}

$root_attr_args = array(
	'class' => implode( ' ', $classes ),
	'style' => '--sgs-countdown-number-colour:' . esc_attr( sgs_colour_value( $number_colour ) ) . ';--sgs-countdown-label-colour:' . esc_attr( sgs_colour_value( $label_colour ) ) . ';',
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}

$wrapper_attributes = get_block_wrapper_attributes( $root_attr_args );

// Data attributes for JS.
$data_attrs = '';
if ( $evergreen_mode ) {
	$total_seconds = ( (int) $evergreen_hours * 3600 ) + ( (int) $evergreen_mins * 60 );
	$data_attrs   .= ' data-evergreen="' . esc_attr( $total_seconds ) . '"';
} elseif ( $target_date ) {
	$data_attrs .= ' data-target="' . esc_attr( $target_date ) . '"';
}
if ( $server_ts ) {
	$data_attrs .= ' data-server-ts="' . esc_attr( $server_ts ) . '"';
}
$data_attrs .= ' data-expired-message="' . esc_attr( $expired_message ) . '"';
$data_attrs .= ' data-digit-style="' . esc_attr( $digit_style ) . '"';

$units = array();
if ( $show_days ) {
	$units[] = array( 'class' => 'days', 'label' => __( 'Days', 'sgs-blocks' ) );
}
if ( $show_hours ) {
	$units[] = array( 'class' => 'hours', 'label' => __( 'Hours', 'sgs-blocks' ) );
}
if ( $show_minutes ) {
	$units[] = array( 'class' => 'minutes', 'label' => __( 'Minutes', 'sgs-blocks' ) );
}
if ( $show_seconds ) {
	$units[] = array( 'class' => 'seconds', 'label' => __( 'Seconds', 'sgs-blocks' ) );
}

$grid_hidden    = $is_expired ? ' hidden' : '';
$expired_hidden = $is_expired ? '' : ' hidden aria-hidden="true"';

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via wp_style_engine_get_styles/sanitisers above; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo $data_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> role="timer" aria-live="polite" aria-atomic="true">
	<div class="sgs-countdown__grid"<?php echo $grid_hidden; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php foreach ( $units as $unit ) : ?>
			<div class="sgs-countdown__unit">
				<span class="sgs-countdown__number sgs-countdown__<?php echo esc_attr( $unit['class'] ); ?>"><?php echo esc_html( str_pad( (string) ( $initial[ $unit['class'] ] ?? 0 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
				<span class="sgs-countdown__label"><?php echo esc_html( $unit['label'] ); ?></span>
			</div>
		<?php endforeach; ?>
	</div>
	<div class="sgs-countdown__expired"<?php echo $expired_hidden; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( $expired_message ); ?></div>
</div>
