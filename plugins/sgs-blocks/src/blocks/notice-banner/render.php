<?php
/**
 * Server-side render for sgs/notice-banner.
 *
 * Dynamic render (save.js returns null; deprecated.js v2/v1 round-trip older
 * static instances). The icon is the variant's ideal default (Lucide) unless the
 * operator picks an override via the shared IconPicker (any of the four sources).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (sgs/text child carrying the notice message).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// FR-22-6: $text is no longer rendered here — the text content slot is now
// an InnerBlocks child (sgs/text), emitted via $content below.
// Retained in block.json for deprecated.js back-compat only. R-22-14: no fallback.
$variant     = $attributes['variant'] ?? 'info';
$dismissible = ! empty( $attributes['dismissible'] );
$icon_source = $attributes['iconSource'] ?? '';
$icon_name   = $attributes['iconName'] ?? '';

// Show the icon? New posts use the explicit showIcon toggle. Backwards-compat:
// older posts hid the icon with the legacy icon='none' value.
$legacy_icon = $attributes['icon'] ?? '';
$show_icon   = ! empty( $attributes['showIcon'] ) && 'none' !== $legacy_icon;

// Ideal default icon per variant (Lucide). Keep in sync with edit.js.
$variant_default = array(
	'info'    => 'info',
	'success' => 'circle-check',
	'warning' => 'triangle-alert',
	'error'   => 'circle-x',
	'accent'  => 'sparkles',
);

// Resolve the icon: an explicit override wins, else the variant's default.
if ( $icon_source && $icon_name ) {
	$resolved_source = $icon_source;
	$resolved_name   = $icon_name;
} else {
	$resolved_source = 'lucide';
	$resolved_name   = $variant_default[ $variant ] ?? 'info';
}

// Build the icon markup from the resolved source.
$icon_html = '';
if ( $show_icon ) {
	switch ( $resolved_source ) {
		case 'emoji':
			$icon_html = esc_html( $resolved_name );
			break;
		case 'dashicon':
			$slug      = preg_replace( '/[^a-z0-9-]/', '', strtolower( $resolved_name ) );
			$icon_html = '<span class="dashicons dashicons-' . esc_attr( $slug ) . '"></span>';
			wp_enqueue_style( 'dashicons' );
			break;
		case 'wp-icon':
			$icon_html = sgs_get_wp_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $resolved_name ) ) );
			break;
		case 'lucide':
		default:
			$icon_html = sgs_get_lucide_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $resolved_name ) ) );
			break;
	}
}

$dismiss_icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// FR-22-6: text colour + size are now carried on the sgs/text child block's
// own attrs and rendered by that block's render.php. No wrapper-level text
// style injection needed here — $content carries the already-rendered child.

// Wrapper class — SGS-BEM root + variant modifier + dismissible modifier.
$wrapper_classes = array( 'sgs-notice-banner', 'sgs-notice-banner--' . sanitize_html_class( $variant ) );
if ( $dismissible ) {
	$wrapper_classes[] = 'sgs-notice-banner--dismissible';
}
$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => implode( ' ', $wrapper_classes ) ) );

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> role="note">
	<?php if ( $icon_html ) : ?>
		<span class="sgs-notice-banner__icon" aria-hidden="true"><?php echo $icon_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from first-party icon maps; dashicon slug + emoji escaped above. ?></span>
	<?php endif; ?>
	<?php
		// FR-22-6: render the sgs/text child block emitted by the converter.
		// R-22-14: no scalar $text fallback — back-compat is editor-side only (deprecated.js v3).
		echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output.
	?>
	<?php if ( $dismissible ) : ?>
		<button type="button" class="sgs-notice-banner__dismiss" aria-label="<?php esc_attr_e( 'Dismiss', 'sgs-blocks' ); ?>">
			<?php echo $dismiss_icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</button>
	<?php endif; ?>
</div>
<?php
