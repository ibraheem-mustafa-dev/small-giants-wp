<?php
/**
 * Server-side render for the SGS Mobile Navigation block.
 *
 * Renders a three-zone mobile drawer using the Popover API:
 * Zone 1 (Quick Actions): CTA + phone/email icons from Business Details.
 * Zone 2 (Navigation): Server-rendered accordion menu from header nav block.
 * Zone 3 (Trust): Social icons from Business Details.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-mobile-nav-renderer.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ── Extract attributes ───────────────────────────────────────────────────────
$variant       = $attributes['variant'] ?? 'overlay';
$accent        = $attributes['accentColour'] ?? 'accent';
$divider       = $attributes['dividerColour'] ?? 'accent';
$stagger_delay     = $attributes['staggerDelay'] ?? 40;
$enable_swipe      = $attributes['enableSwipe'] ?? true;
$desktop_hamburger = $attributes['desktopHamburger'] ?? false;
$breakpoint        = $attributes['breakpoint'] ?? 1024;

// ── Build CSS custom properties ──────────────────────────────────────────────
$css_vars = [];

$accent_resolved = sgs_colour_value( $accent );
if ( $accent_resolved ) {
	$css_vars[] = '--sgs-mn-accent:' . $accent_resolved;
}

$divider_resolved = sgs_colour_value( $divider );
if ( $divider_resolved ) {
	$css_vars[] = '--sgs-mn-divider:' . $divider_resolved;
}

if ( $stagger_delay !== 40 ) {
	$css_vars[] = '--sgs-mn-stagger:' . absint( $stagger_delay ) . 'ms';
}

$inline_style = implode( ';', $css_vars );

// ── Build wrapper classes ────────────────────────────────────────────────────
$classes = [
	'sgs-mobile-nav',
	'sgs-mobile-nav--' . sanitize_html_class( $variant ),
];

// ── Get block wrapper attributes (includes native supports: colour, spacing) ─
$wrapper_attrs = get_block_wrapper_attributes( [
	'id'       => 'sgs-mobile-nav',
	'class'    => implode( ' ', $classes ),
	'popover'  => 'manual',
	'role'     => 'dialog',
	'aria-label' => esc_attr__( 'Mobile navigation', 'sgs-blocks' ),
	'style'    => $inline_style,
	'data-variant'         => esc_attr( $variant ),
	'data-swipe'           => $enable_swipe ? 'true' : 'false',
	'data-desktop-burger'  => $desktop_hamburger ? 'true' : 'false',
	'data-breakpoint'      => absint( $breakpoint ),
] );

// ── Initialise the renderer ──────────────────────────────────────────────────
$renderer  = new SGS_Mobile_Nav_Renderer( $attributes );
$nav_blocks = $renderer->get_nav_blocks();

// ── Zone 1: Quick Actions (CTA + contact icons) ─────────────────────────────
$cta_html = $renderer->render_cta_zone();

// ── Search (optional) ────────────────────────────────────────────────────────
$search_html = $renderer->render_search();

// ── Account tray (optional, B2B) ─────────────────────────────────────────────
$account_html = $renderer->render_account_tray();

// ── Zone 2: Navigation (accordion menu items) ────────────────────────────────
$menu_html = $renderer->render_menu_items( $nav_blocks );

// ── Zone 3: Trust (social icons) ─────────────────────────────────────────────
$socials_html = $renderer->render_socials_zone();

// ── Close button ─────────────────────────────────────────────────────────────
$close_svg = sgs_get_lucide_icon( 'x' );
$close_btn = sprintf(
	'<button class="sgs-mobile-nav__close" type="button" aria-label="%s" popovertarget="sgs-mobile-nav" popovertargetaction="hide">%s</button>',
	esc_attr__( 'Close navigation menu', 'sgs-blocks' ),
	$close_svg
);

// ── Output ───────────────────────────────────────────────────────────────────
?>
<nav <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>

	<div class="sgs-mobile-nav__header">
		<?php echo $close_btn; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sprintf above. ?>
	</div>

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

	<?php if ( $socials_html ) : ?>
		<?php echo $socials_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<?php endif; ?>

</nav>
