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
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-mobile-nav-renderer.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

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
	$preset_map = array(
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

// Navigation panel.
$link_font_size        = $attributes['linkFontSize'] ?? 'medium';
$link_font_size_mobile = $attributes['linkFontSizeMobile'] ?? '';
$link_font_weight      = $attributes['linkFontWeight'] ?? '600';
$sublink_font_size     = $attributes['sublinkFontSize'] ?? 'small';
$sublink_font_size_mob = $attributes['sublinkFontSizeMobile'] ?? '';
$submenu_indent        = $attributes['submenuIndent'] ?? 24;

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

// Layout — slide variant dimensions.
if ( 85 !== (int) $drawer_width ) {
	$css_vars[] = '--sgs-mn-width:' . absint( $drawer_width ) . '%';
}
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

// Navigation typography.
if ( 'medium' !== $link_font_size && $link_font_size ) {
	$css_vars[] = '--sgs-mn-link-size:' . sgs_font_size_value( sanitize_html_class( $link_font_size ) );
}
if ( $link_font_weight && '600' !== $link_font_weight ) {
	$css_vars[] = '--sgs-mn-link-weight:' . absint( $link_font_weight );
}
if ( 'small' !== $sublink_font_size && $sublink_font_size ) {
	$css_vars[] = '--sgs-mn-sublink-size:' . sgs_font_size_value( sanitize_html_class( $sublink_font_size ) );
}
if ( 24 !== (int) $submenu_indent ) {
	$css_vars[] = '--sgs-mn-indent:' . absint( $submenu_indent ) . 'px';
}

// Social icon size.
if ( 44 !== (int) $social_icon_size ) {
	$css_vars[] = '--sgs-mn-social-size:' . absint( $social_icon_size ) . 'px';
}

// Logo width (header panel — resolved in renderer but CSS var set here).
$logo_max_width = $attributes['logoMaxWidth'] ?? 120;
if ( 120 !== (int) $logo_max_width ) {
	$css_vars[] = '--sgs-mn-logo-width:' . absint( $logo_max_width ) . 'px';
}

// Close button size.
$close_button_size = $attributes['closeButtonSize'] ?? 48;
if ( 48 !== (int) $close_button_size ) {
	$css_vars[] = '--sgs-mn-close-size:' . absint( $close_button_size ) . 'px';
}

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

// ── Get block wrapper attributes ──────────────────────────────────────────────
$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'                  => 'sgs-mobile-nav',
		'class'               => implode( ' ', $classes ),
		'popover'             => 'manual',
		'role'                => 'dialog',
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

// ── Per-device font-size overrides ────────────────────────────────────────────
// Only emit a <style> block when at least one mobile override is set.
$mobile_style_tag = '';
$mobile_vars      = array();

if ( $link_font_size_mobile ) {
	$mobile_vars[] = '--sgs-mn-link-size-mobile:' . sgs_font_size_value( sanitize_html_class( $link_font_size_mobile ) );
}
if ( $sublink_font_size_mob ) {
	$mobile_vars[] = '--sgs-mn-sublink-size-mobile:' . sgs_font_size_value( sanitize_html_class( $sublink_font_size_mob ) );
}

if ( $mobile_vars ) {
	$mobile_style_tag = sprintf(
		'<style>@media (max-width:767px){#sgs-mobile-nav{%s}}</style>',
		esc_html( implode( ';', $mobile_vars ) )
	);
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
