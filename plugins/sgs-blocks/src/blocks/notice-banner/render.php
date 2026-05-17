<?php
/**
 * Server-side render for sgs/notice-banner.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/notice-banner {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-notice-banner` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-15  P-PHASE8-2 render.php audit
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$icon        = $attributes['icon'] ?? 'info';
$text        = $attributes['text'] ?? '';
$variant     = $attributes['variant'] ?? 'info';
$text_colour = $attributes['textColour'] ?? '';
$text_size   = $attributes['textFontSize'] ?? '';
$dismissible = ! empty( $attributes['dismissible'] );

/**
 * Lucide-style SVG icons for each notice variant.
 * All icons: 20x20, stroke-based, aria-hidden.
 */
$variant_icons = array(
	'info'    => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="8" x2="12" y2="8.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
	'success' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	'warning' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
	'error'   => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
	'accent'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="8" x2="12" y2="8.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
);

$dismiss_icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// Wrapper CSS custom properties (parity with save.js textStyle).
$text_style_parts = array();
if ( $text_colour ) {
	$text_style_parts[] = 'color:' . sgs_colour_value( $text_colour );
}
if ( $text_size ) {
	$text_style_parts[] = 'font-size:' . sgs_font_size_value( $text_size );
}
$text_style_attr = $text_style_parts ? ' style="' . esc_attr( implode( ';', $text_style_parts ) ) . '"' : '';

// Wrapper class — preserves SGS-BEM root + variant modifier + dismissible modifier.
$wrapper_classes = array( 'sgs-notice-banner', 'sgs-notice-banner--' . sanitize_html_class( $variant ) );
if ( $dismissible ) {
	$wrapper_classes[] = 'sgs-notice-banner--dismissible';
}

$wrapper_args  = array(
	'class' => implode( ' ', $wrapper_classes ),
);
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Use the variant SVG icon; fall back to the explicit icon selector if needed.
$icon_key = 'none' === $icon ? 'none' : ( $icon ? $icon : $variant );
$icon_svg = isset( $variant_icons[ $icon_key ] ) ? $variant_icons[ $icon_key ] : ( isset( $variant_icons[ $icon ] ) ? $variant_icons[ $icon ] : '' );

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> role="note">
	<?php if ( $icon_svg ) : ?>
		<span class="sgs-notice-banner__icon"><?php echo $icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
	<?php endif; ?>
	<p class="sgs-notice-banner__text"<?php echo $text_style_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo wp_kses_post( $text ); ?></p>
	<?php if ( $dismissible ) : ?>
		<button type="button" class="sgs-notice-banner__dismiss" aria-label="<?php esc_attr_e( 'Dismiss', 'sgs-blocks' ); ?>">
			<?php echo $dismiss_icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</button>
	<?php endif; ?>
</div>
<?php
