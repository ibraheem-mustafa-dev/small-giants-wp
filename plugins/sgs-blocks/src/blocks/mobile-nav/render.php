<?php
/**
 * Server-side render for the SGS Mobile Navigation block.
 *
 * Renders a seven-zone mobile drawer using the Popover API:
 * Zone 1 (Header):         Logo + close button.
 * Zone 2 (Account Tray):   Optional B2B logged-in greeting.
 * Zone 3 (Search):         Optional search bar.
 * Zone 4 (CTA):            Primary CTA, secondary CTA, contact shortcuts, WhatsApp.
 * Zone 5 (Navigation):     Server-rendered accordion menu from header nav block.
 * Zone 6 (Custom Content): InnerBlocks zone — clients drop any block here.
 * Zone 7 (Social & Trust): Social icons + optional trust tagline.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (InnerBlocks output).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-mobile-nav-renderer.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ── Security sanitisers (contract §D) — CSS-length sanitiser for box/side
// values, mirrors sgs/label + sgs/container. ──────────────────────────────
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// Box shorthand builder for the padding tiers (SGS custom object attrs —
// paddingTablet/paddingMobile). Mirrors sgs/label's $sgs_box_shorthand.
$sgs_mn_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

// ── Extract structural attributes ────────────────────────────────────────────
$variant           = $attributes['variant'] ?? 'overlay';
$accent            = $attributes['accentColour'] ?? 'accent';
$divider           = $attributes['dividerColour'] ?? 'surface-alt';
$stagger_delay     = $attributes['staggerDelay'] ?? 25;
$enable_swipe      = $attributes['enableSwipe'] ?? true;
$desktop_hamburger = $attributes['desktopHamburger'] ?? false;
$breakpoint        = $attributes['breakpoint'] ?? 1024;

// Layout panel.
$drawer_width     = $attributes['drawerWidth'] ?? 85;
$drawer_max_width = $attributes['drawerMaxWidth'] ?? 400;

// Animation panel.
$animation_preset = $attributes['animationPreset'] ?? 'spring';
$backdrop_opacity = $attributes['backdropOpacity'] ?? 60;
$backdrop_blur    = $attributes['backdropBlur'] ?? false;
$backdrop_blur_px = $attributes['backdropBlurAmount'] ?? 8;

// Resolve preset to timing values. Skip when "custom" is selected.
if ( 'custom' !== $animation_preset ) {
	$preset_map         = array(
		'snappy' => array(
			'duration' => 280,
			'easing'   => 'cubic-bezier(0.4, 0, 0.2, 1)',
			'exit'     => 200,
		),
		'smooth' => array(
			'duration' => 350,
			'easing'   => 'ease-in-out',
			'exit'     => 280,
		),
		'spring' => array(
			'duration' => 400,
			'easing'   => 'spring',
			'exit'     => 280,
		),
		'bouncy' => array(
			'duration' => 450,
			'easing'   => 'spring-bouncy',
			'exit'     => 320,
		),
		'none'   => array(
			'duration' => 0,
			'easing'   => 'linear',
			'exit'     => 0,
		),
	);
	$resolved           = $preset_map[ $animation_preset ] ?? $preset_map['spring'];
	$animation_duration = $resolved['duration'];
	$animation_easing   = $resolved['easing'];
	$exit_duration      = $resolved['exit'];
} else {
	$animation_duration = $attributes['animationDuration'] ?? 400;
	$animation_easing   = $attributes['animationEasing'] ?? 'spring';
	$exit_duration      = $attributes['exitDuration'] ?? 280;
}

// Navigation panel — typography handled by sgs_typography_css_rule() below.
$submenu_indent = $attributes['submenuIndent'] ?? 24;

// Social panel.
$social_icon_size = $attributes['socialIconSize'] ?? 44;

// ── Build CSS custom properties ───────────────────────────────────────────────
// Rule: only emit a CSS var when the value is non-empty / non-default.
$css_vars = array();

// Accent + divider — always resolve these.
$accent_resolved = sgs_colour_value( $accent );
if ( $accent_resolved ) {
	$css_vars[] = '--sgs-mn-accent:' . $accent_resolved;
}

$divider_resolved = sgs_colour_value( $divider );
if ( $divider_resolved ) {
	$css_vars[] = '--sgs-mn-divider:' . $divider_resolved;
}

// Stagger — only when changed from default (25ms).
if ( 25 !== (int) $stagger_delay ) {
	$css_vars[] = '--sgs-mn-stagger:' . absint( $stagger_delay ) . 'ms';
}

// Layout — slide variant dimensions. drawerWidth has tablet/mobile tiers so
// its base var is NOT inline (Pattern A) — it moves to the scoped <style> on
// the same .sgs-mobile-nav selector as the @media tier re-declarations.
// drawerMaxWidth has no tiers → stays inline.
if ( 400 !== (int) $drawer_max_width ) {
	$css_vars[] = '--sgs-mn-max-width:' . absint( $drawer_max_width ) . 'px';
}

// Animation — emit when changed from defaults.
if ( 400 !== (int) $animation_duration ) {
	$css_vars[] = '--sgs-mn-duration:' . absint( $animation_duration ) . 'ms';
}
if ( 280 !== (int) $exit_duration ) {
	$css_vars[] = '--sgs-mn-exit-duration:' . absint( $exit_duration ) . 'ms';
}
if ( 60 !== (int) $backdrop_opacity ) {
	// Convert 0-100 percentage to 0-1 decimal for CSS opacity value.
	$opacity_decimal = round( absint( $backdrop_opacity ) / 100, 2 );
	$css_vars[]      = '--sgs-mn-backdrop-opacity:' . $opacity_decimal;
}

// submenuIndent / socialIconSize / logoMaxWidth / closeButtonSize all have
// tablet/mobile tiers, so their base vars are NOT inline (Pattern A) — they
// move to the scoped <style> below on the same .sgs-mobile-nav selector as
// the @media tier re-declarations. The attrs are still read here so their
// values/defaults are resolved for the base-rule builder.
$logo_max_width    = $attributes['logoMaxWidth'] ?? 120;
$close_button_size = $attributes['closeButtonSize'] ?? 48;

// ── Colour overrides (only emit when non-empty) ───────────────────────────────
$colour_map = array(
	'drawerBg'               => '--sgs-mn-bg',
	'drawerText'             => '--sgs-mn-text',
	'closeButtonBg'          => '--sgs-mn-close-bg',
	'closeButtonColour'      => '--sgs-mn-close-colour',
	'ctaBg'                  => '--sgs-mn-cta-bg',
	'ctaTextColour'          => '--sgs-mn-cta-text-colour',
	'ctaBorderColour'        => '--sgs-mn-cta-border',
	'secondaryCtaBg'         => '--sgs-mn-cta2-bg',
	'secondaryCtaTextColour' => '--sgs-mn-cta2-text',
	'linkColour'             => '--sgs-mn-link-colour',
	'linkHoverColour'        => '--sgs-mn-link-hover',
	'linkActiveColour'       => '--sgs-mn-link-active',
	'sublinkColour'          => '--sgs-mn-sublink-colour',
	'sublinkHoverColour'     => '--sgs-mn-sublink-hover',
	'backdropColour'         => '--sgs-mn-backdrop',
	'focusColour'            => '--sgs-mn-focus',
);

foreach ( $colour_map as $attr_key => $css_prop ) {
	$raw = $attributes[ $attr_key ] ?? '';
	if ( '' === $raw ) {
		continue;
	}
	$resolved = sgs_colour_value( $raw );
	if ( $resolved ) {
		$css_vars[] = $css_prop . ':' . $resolved;
	}
}

// Gradient — pass through as-is (CSS gradient string, not a token slug).
$drawer_gradient = $attributes['drawerGradient'] ?? '';
if ( $drawer_gradient ) {
	// Sanitise: allow only safe CSS gradient syntax.
	// We only emit this if it starts with a known gradient function.
	if ( preg_match( '/^(linear|radial|conic)-gradient\s*\(/i', $drawer_gradient ) ) {
		$css_vars[] = '--sgs-mn-gradient:' . $drawer_gradient;
	}
}

// Backdrop blur — only emit when the feature is enabled.
if ( $backdrop_blur ) {
	$css_vars[] = '--sgs-mn-backdrop-blur:' . absint( $backdrop_blur_px ) . 'px';
}

$inline_style = implode( ';', $css_vars );

// ── WP-native color/spacing supports (skip-serialised in block.json → NOT
// auto-inlined by get_block_wrapper_attributes()). Values still land in
// $attributes['style'] — emitted scoped below via wp_style_engine_get_styles,
// exactly the sgs/label / sgs/container pattern (contract §A). ─────────────
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// Padding — WP-native style.spacing.padding object (base tier, skip-
// serialised) + SGS custom object attrs for the tablet/mobile tiers
// (contract §B: base stays the WP-native object, tiers are SGS objects).
$base_padding_obj    = is_array( $attributes['style']['spacing']['padding'] ?? null ) ? $attributes['style']['spacing']['padding'] : array();
$padding_tablet_obj  = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj  = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();

// ── Build wrapper classes ─────────────────────────────────────────────────────
$classes = array(
	'sgs-mobile-nav',
	'sgs-mobile-nav--' . sanitize_html_class( $variant ),
);

$show_dividers = $attributes['showDividers'] ?? true;
if ( ! $show_dividers ) {
	$classes[] = 'sgs-mobile-nav--no-dividers';
}

$drawer_position = $attributes['drawerPosition'] ?? 'top';
if ( 'top' !== $drawer_position ) {
	$classes[] = 'sgs-mobile-nav--pos-' . sanitize_html_class( $drawer_position );
}

// WP-native colour PRESET classes (custom hex/rgb values are emitted scoped
// below, but a preset slug relies on the standard has-*-color class + the
// theme's own .has-{slug}-color / .has-{slug}-background-color rule).
if ( '' !== $preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// ── Get block wrapper attributes ──────────────────────────────────────────────
// The id 'sgs-mobile-nav' is intentionally fixed: block.json declares
// "multiple": false (only one drawer per page) and view.js targets it by id.
$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'                  => 'sgs-mobile-nav',
		'class'               => implode( ' ', $classes ),
		'popover'             => 'manual',
		'role'                => 'dialog',
		'aria-modal'          => 'true',
		'aria-label'          => esc_attr__( 'Mobile navigation', 'sgs-blocks' ),
		'style'               => $inline_style,
		'data-variant'        => esc_attr( $variant ),
		'data-swipe'          => $enable_swipe ? 'true' : 'false',
		'data-desktop-burger' => $desktop_hamburger ? 'true' : 'false',
		'data-breakpoint'     => absint( $breakpoint ),
		'data-duration'       => absint( $animation_duration ),
		'data-exit-duration'  => absint( $exit_duration ),
		'data-easing'         => esc_attr( $animation_easing ),
	)
);

// ── Initialise the renderer ───────────────────────────────────────────────────
$renderer   = new SGS_Mobile_Nav_Renderer( $attributes );
$nav_blocks = $renderer->get_nav_blocks();

// ── Render each zone ──────────────────────────────────────────────────────────
$header_html  = $renderer->render_header();
$account_html = $renderer->render_account_tray();
$search_html  = $renderer->render_search();
$cta_html     = $renderer->render_cta_zone();
$menu_html    = $renderer->render_menu_items( $nav_blocks );
$socials_html = $renderer->render_socials_zone();
$tagline_html = $renderer->render_tagline();

// ── Typography CSS (shared helper) ────────────────────────────────────────────
// sgs_typography_css_rule() handles desktop + tablet + mobile breakpoints,
// back-compat for legacy string values, and emits nothing when attrs are unset.
// The block is "multiple": false so the fixed id is a safe unique scope.
$link_sel    = '.sgs-mobile-nav .sgs-mobile-nav__link';
$sublink_sel = '.sgs-mobile-nav .sgs-mobile-nav__sublink';

$typo_css  = sgs_typography_css_rule( $attributes, 'link', $link_sel );
$typo_css .= sgs_typography_css_rule( $attributes, 'sublink', $sublink_sel );

// ── Per-device responsive overrides (non-typography numeric attrs) ─────────────
// Pattern A (D-migration): base + tablet + mobile vars all emitted on the SAME
// .sgs-mobile-nav selector, base first then tablet then mobile, so cascade
// order does the overriding (base vars were previously inline on the element,
// which always beat the @media re-declarations; and mobile was emitted BEFORE
// tablet, so at ≤480px the tablet rule wrongly won — both fixed here).
// Device tiers (contract §B2, fixed 2026-07-10 — were previously a stray
// 768px/480px pair): Tablet = max-width:1023px, Mobile = max-width:767px.
$base_vars   = array();
$mobile_vars = array();
$tablet_vars = array();

// Shared config for numeric responsive attributes.
// Each entry: attr-key => [ CSS custom property, unit, min allowed, max allowed, default ].
// Base emits only when changed from the schema default (matches the old inline
// gating so untouched instances keep falling through to style.css defaults).
$responsive_attrs = array(
	'drawerWidth'     => array( '--sgs-mn-width', '%', 1, 100, 85 ),
	'closeButtonSize' => array( '--sgs-mn-close-size', 'px', 44, 200, 48 ),
	'socialIconSize'  => array( '--sgs-mn-social-size', 'px', 20, 200, 44 ),
	'logoMaxWidth'    => array( '--sgs-mn-logo-width', 'px', 20, 600, 120 ),
	'submenuIndent'   => array( '--sgs-mn-indent', 'px', 0, 120, 24 ),
);

$base_attr_values = array(
	'drawerWidth'     => (int) $drawer_width,
	'closeButtonSize' => (int) $close_button_size,
	'socialIconSize'  => (int) $social_icon_size,
	'logoMaxWidth'    => (int) $logo_max_width,
	'submenuIndent'   => (int) $submenu_indent,
);

foreach ( $responsive_attrs as $base => $cfg ) {
	[ $prop, $unit, $min, $max, $default ] = $cfg;

	$base_val = $base_attr_values[ $base ];
	if ( $default !== $base_val ) {
		$base_vars[] = $prop . ':' . absint( $base_val ) . $unit;
	}

	$raw_tablet = $attributes[ $base . 'Tablet' ] ?? '';
	if ( '' !== $raw_tablet ) {
		$val = (int) $raw_tablet;
		if ( $val >= $min && $val <= $max ) {
			$tablet_vars[] = $prop . ':' . $val . $unit;
		}
	}

	$raw_mobile = $attributes[ $base . 'Mobile' ] ?? '';
	if ( '' !== $raw_mobile ) {
		$val = (int) $raw_mobile;
		if ( $val >= $min && $val <= $max ) {
			$mobile_vars[] = $prop . ':' . $val . $unit;
		}
	}
}

// ── WP-native colour support, emitted scoped (contract §A) ────────────────
$color_css = '';
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
			array( 'selector' => '.sgs-mobile-nav' )
		);
		if ( ! empty( $color_scoped_styles['css'] ) ) {
			$color_css = $color_scoped_styles['css'];
		}
	}
}

// ── WP-native padding support (base) + SGS padding tiers, emitted scoped
// (contract §A/§B). Base uses the style engine (WP-native object); tiers use
// the hand-built box shorthand (SGS custom object attrs, no WP support). ──
$padding_base_css = '';
if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $base_padding_obj ) ) {
	$padding_base_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'padding' => $base_padding_obj ) ),
		array( 'selector' => '.sgs-mobile-nav' )
	);
	if ( ! empty( $padding_base_styles['css'] ) ) {
		$padding_base_css = $padding_base_styles['css'];
	}
}

$padding_tablet_val = $sgs_mn_box_shorthand( $padding_tablet_obj );
$padding_mobile_val = $sgs_mn_box_shorthand( $padding_mobile_obj );

// Build the combined <style> tag — typography rules + numeric responsive overrides
// + colour/padding supports. CSS content is constructed entirely from validated
// values, the WP style engine (pre-escaped), and hardcoded safe strings.
// Device tiers are EXACTLY max-width:1023px (tablet) / max-width:767px (mobile)
// per the no-inline migration contract §B2 — no stray breakpoints.
$mobile_style_tag = '';
$style_parts      = array();

if ( $typo_css ) {
	$style_parts[] = $typo_css;
}
if ( $color_css ) {
	$style_parts[] = $color_css;
}
if ( $padding_base_css ) {
	$style_parts[] = $padding_base_css;
}
if ( $base_vars ) {
	$style_parts[] = '.sgs-mobile-nav{' . implode( ';', $base_vars ) . '}';
}

$tablet_decls = $tablet_vars;
if ( null !== $padding_tablet_val ) {
	$tablet_decls[] = 'padding:' . $padding_tablet_val;
}
if ( $tablet_decls ) {
	$style_parts[] = '@media (max-width:1023px){.sgs-mobile-nav{' . implode( ';', $tablet_decls ) . '}}';
}

$mobile_decls = $mobile_vars;
if ( null !== $padding_mobile_val ) {
	$mobile_decls[] = 'padding:' . $padding_mobile_val;
}
if ( $mobile_decls ) {
	$style_parts[] = '@media (max-width:767px){.sgs-mobile-nav{' . implode( ';', $mobile_decls ) . '}}';
}

if ( $style_parts ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS built from sgs_typography_css_rule() (helper-escaped) + validated integers + hardcoded safe strings only.
	$mobile_style_tag = '<style>' . implode( '', $style_parts ) . '</style>';
}

// ── Output ────────────────────────────────────────────────────────────────────
?>
<?php echo $mobile_style_tag; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sprintf above. ?>
<nav <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>

	<?php echo $header_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in renderer methods. ?>

	<?php if ( $account_html ) : ?>
		<?php echo $account_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<?php endif; ?>

	<?php if ( $search_html ) : ?>
		<?php echo $search_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<?php endif; ?>

	<?php if ( $cta_html ) : ?>
		<?php echo $cta_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<?php endif; ?>

	<?php if ( $menu_html ) : ?>
		<ul class="sgs-mobile-nav__menu">
			<?php echo $menu_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</ul>
	<?php endif; ?>

	<?php if ( $content ) : ?>
		<div class="sgs-mobile-nav__custom-content">
			<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output, already safe. ?>
		</div>
	<?php endif; ?>

	<?php if ( $socials_html || $tagline_html ) : ?>
		<div class="sgs-mobile-nav__trust-zone">
			<?php echo $socials_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php echo $tagline_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
	<?php endif; ?>

</nav>
