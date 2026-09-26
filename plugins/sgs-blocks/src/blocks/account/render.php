<?php
/**
 * Server-side render for sgs/account.
 *
 * Wraps `WC_Shortcode_My_Account::output()` (verified against the installed
 * WooCommerce 11.1 source, 2026-09-26 — the shortcode class's own public
 * static `output( array $atts )` method) in the block's own scoped wrapper,
 * setting a request-scoped flag (`Account_Endpoints::$active`) for the
 * duration of that call so the menu/dashboard/endpoint hooks in
 * includes/account/*.php act ONLY on this block's own output — never on a
 * bare `[woocommerce_my_account]` shortcode elsewhere on the same site.
 *
 * NO INLINE STYLE (Spec 32): every dynamic value is a scoped `<style>` block
 * built from $scoped_css, exactly like sgs/wishlist-panel's render.php.
 *
 * No top-level function is declared in this file (a second instance on one
 * page would redeclare it and fatal) — every helper lives in
 * includes/account/*.php, each function_exists()-guarded.
 *
 * BEM: .sgs-account (root) / __wc (WooCommerce's own output) / __card /
 * __card-title / __heading / __chip / __progress / __progress-step /
 * __tracking-card / __guest-line.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused — no InnerBlocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/account/helpers-account-defaults.php';
require_once dirname( __DIR__, 3 ) . '/includes/account/helpers-account-render-css.php';
require_once dirname( __DIR__, 3 ) . '/includes/account/class-account-endpoints.php';
require_once dirname( __DIR__, 3 ) . '/includes/account/class-account-dashboard.php';

$uid      = 'sgs-account-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-account';

if ( ! class_exists( 'WooCommerce' ) ) {
	$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'sgs-account ' . $uid ) );
	?>
	<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-sanitised. ?>>
		<p class="sgs-account__editor-notice"><?php esc_html_e( 'sgs/account needs WooCommerce active to render the My Account page.', 'sgs-blocks' ); ?></p>
	</div>
	<?php
	return;
}

// Menu layout per tier — 'sidebar' | 'tabs', desktop defaults to 'sidebar',
// tablet/mobile default to 'tabs' (Bean's signed-off design, §4a).
$menu_layout_raw = sgs_responsive_normalise_object( $attributes['navLayout'] ?? null, false );
$allowed_layouts = array( 'sidebar', 'tabs' );
$menu_layout     = array(
	'desktop' => in_array( $menu_layout_raw['desktop'] ?? null, $allowed_layouts, true ) ? $menu_layout_raw['desktop'] : 'sidebar',
	'tablet'  => in_array( $menu_layout_raw['tablet'] ?? null, $allowed_layouts, true ) ? $menu_layout_raw['tablet'] : 'tabs',
	'mobile'  => in_array( $menu_layout_raw['mobile'] ?? null, $allowed_layouts, true ) ? $menu_layout_raw['mobile'] : 'tabs',
);

$auth_layout = in_array( $attributes['authLayout'] ?? '', array( 'side-by-side', 'stacked' ), true ) ? $attributes['authLayout'] : 'side-by-side';

// Menu icons — client overrides merged over the framework defaults.
$show_menu_icons = ! isset( $attributes['showMenuIcons'] ) || ! empty( $attributes['showMenuIcons'] );
$menu_icons      = wp_parse_args(
	is_array( $attributes['navIcons'] ?? null ) ? $attributes['navIcons'] : array(),
	sgs_account_default_menu_icons()
);

// -- Scoped CSS ---------------------------------------------------------
$scoped_css   = array();
$scoped_css[] = sgs_account_scoped_css( $attributes, $root_sel );
if ( $show_menu_icons ) {
	$scoped_css[] = sgs_account_menu_icon_css( $menu_icons, $root_sel );
}

// -- Render WooCommerce's own output, flag set for its full duration ----
\SGS\Blocks\Account_Endpoints::$active = $attributes;
ob_start();
if ( class_exists( 'WC_Shortcode_My_Account' ) ) {
	\WC_Shortcode_My_Account::output( array() );
}
$wc_output = ob_get_clean();
\SGS\Blocks\Account_Endpoints::$active = null;

$logged_out = ! is_user_logged_in();

$wrapper_classes = array(
	'sgs-account',
	$uid,
	'sgs-account--desktop-' . $menu_layout['desktop'],
	'sgs-account--tablet-' . $menu_layout['tablet'],
	'sgs-account--mobile-' . $menu_layout['mobile'],
);

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => implode( ' ', $wrapper_classes ) ) );

?>
<?php if ( array_filter( $scoped_css ) ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', array_filter( $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-sanitised. ?> data-auth-layout="<?php echo esc_attr( $auth_layout ); ?>">
	<div class="sgs-account__wc">
		<?php echo $wc_output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce's own already-escaped shortcode output. ?>
	</div>

	<?php if ( $logged_out && ! empty( $attributes['showOrderTracking'] ) && class_exists( 'WC_Shortcode_Order_Tracking' ) ) : ?>
		<div class="sgs-account__card sgs-account__tracking-card">
			<h2 class="sgs-account__heading"><?php echo esc_html( (string) ( $attributes['orderTrackingHeading'] ?? __( 'Track an order', 'sgs-blocks' ) ) ); ?></h2>
			<?php \WC_Shortcode_Order_Tracking::output( array() ); // Echoes its own already-escaped markup directly — no return value to print. ?>
		</div>
	<?php endif; ?>

	<?php if ( $logged_out && ( ! isset( $attributes['showGuestLine'] ) || ! empty( $attributes['showGuestLine'] ) ) ) : ?>
		<p class="sgs-account__guest-line"><?php echo esc_html( (string) ( $attributes['guestLineText'] ?? __( 'No account? You can check out as a guest.', 'sgs-blocks' ) ) ); ?></p>
	<?php endif; ?>
</div>
