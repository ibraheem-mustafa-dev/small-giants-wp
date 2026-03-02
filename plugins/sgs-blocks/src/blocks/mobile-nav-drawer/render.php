<?php
/**
 * Server-side render for the SGS Mobile Nav Drawer block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (serialised inner blocks).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$close_icon      = $attributes['closeIcon'] ?? 'x';
$close_icon_size = (int) ( $attributes['closeIconSize'] ?? 24 );
$close_aria      = $attributes['closeAriaLabel'] ?? __( 'Close navigation menu', 'sgs-blocks' );
$position        = $attributes['position'] ?? 'right';

$close_svg = sgs_get_lucide_icon( $close_icon );

// Override SVG dimensions if not default.
if ( 24 !== $close_icon_size ) {
	$close_svg = preg_replace(
		'/width="24" height="24"/',
		sprintf( 'width="%d" height="%d"', $close_icon_size, $close_icon_size ),
		$close_svg,
		1
	);
}

$drawer_class = sprintf(
	'sgs-mobile-nav-drawer sgs-mobile-nav-drawer--%s',
	esc_attr( $position )
);
?>
<div class="sgs-mobile-nav-drawer__backdrop"></div>
<nav class="<?php echo esc_attr( $drawer_class ); ?>" aria-label="<?php esc_attr_e( 'Mobile navigation', 'sgs-blocks' ); ?>" aria-hidden="true">
	<div class="sgs-mobile-nav-drawer__header">
		<button class="sgs-mobile-nav-drawer__close" aria-label="<?php echo esc_attr( $close_aria ); ?>" type="button">
			<?php echo $close_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from trusted lucide-icons.php ?>
		</button>
	</div>
	<div class="sgs-mobile-nav-drawer__content">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner block content. ?>
	</div>
</nav>
