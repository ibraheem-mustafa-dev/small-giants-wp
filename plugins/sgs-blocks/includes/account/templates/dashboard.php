<?php
/**
 * SGS Account Dashboard template — replaces WooCommerce's own
 * `myaccount/dashboard.php` ONLY while an `sgs/account` block is rendering
 * (swapped in by `Account_Dashboard::maybe_swap_dashboard_template()`).
 *
 * Loaded via `wc_get_template()`, which `extract()`s its `$args` into this
 * scope before `include`-ing it — `$current_user` (a `WP_User`, passed by
 * WooCommerce's own `woocommerce_account_content()`) is therefore already
 * defined here, same as in core's template.
 *
 * No inline `style="…"` (Spec 32): every dynamic value below is plain text
 * or a data attribute; all painting is done by the block's own scoped
 * `<style>` (render.php) + style.css.
 *
 * @var \WP_User $current_user Current logged-in user.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/account/helpers-account-defaults.php';

$attrs = is_array( \SGS\Blocks\Account_Endpoints::$active ) ? \SGS\Blocks\Account_Endpoints::$active : array();

$user       = isset( $current_user ) && $current_user instanceof \WP_User ? $current_user : wp_get_current_user();
$first_name = trim( (string) $user->first_name );
$name       = '' !== $first_name ? $first_name : $user->display_name;

$greeting_template = (string) ( $attrs['greeting'] ?? 'Hello, {name}' );
$greeting          = str_replace( '{name}', esc_html( $name ), esc_html( $greeting_template ) );

?>
<h2 class="sgs-account__heading sgs-account__greeting"><?php echo wp_kses_post( $greeting ); ?></h2>

<?php if ( ! empty( $attrs['showLatestOrder'] ) || ! isset( $attrs['showLatestOrder'] ) ) : ?>
	<?php
	$orders = function_exists( 'wc_get_orders' ) ? wc_get_orders(
		array(
			'customer' => get_current_user_id(),
			'limit'    => 1,
			'orderby'  => 'date',
			'order'    => 'DESC',
		)
	) : array();
	$order  = ! empty( $orders ) ? $orders[0] : null;
	?>
	<?php if ( $order instanceof \WC_Order ) : ?>
		<?php
		$status      = $order->get_status();
		$step        = sgs_account_map_order_status_to_step( $status );
		$step_order  = sgs_account_step_order();
		$step_labels = wp_parse_args( is_array( $attrs['statusStepLabels'] ?? null ) ? $attrs['statusStepLabels'] : array(), sgs_account_default_status_step_labels() );
		$step_index  = '' !== $step ? array_search( $step, $step_order, true ) : false;
		$track_url   = apply_filters( 'sgs_account_order_tracking_url', '', $order );
		?>
		<div class="sgs-account__card sgs-account__latest-order">
			<h3 class="sgs-account__card-title"><?php echo esc_html( (string) ( $attrs['latestOrderHeading'] ?? __( 'Your latest order', 'sgs-blocks' ) ) ); ?></h3>
			<p class="sgs-account__order-meta">
				<?php
				printf(
					/* translators: 1: order number, 2: order date. */
					esc_html__( 'Order #%1$s — %2$s', 'sgs-blocks' ),
					esc_html( $order->get_order_number() ),
					esc_html( wc_format_datetime( $order->get_date_created() ) )
				);
				?>
			</p>
			<p class="sgs-account__order-total"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></p>

			<?php
			$items = array_slice( $order->get_items(), 0, 4 );
			if ( $items ) :
				?>
				<div class="sgs-account__order-thumbs">
					<?php foreach ( $items as $item ) :
						$product = $item->get_product();
						if ( ! $product ) {
							continue;
						}
						echo wp_kses_post( $product->get_image( 'thumbnail', array( 'alt' => '' ) ) );
					endforeach;
					?>
				</div>
			<?php endif; ?>

			<p class="sgs-account__chip"><?php echo esc_html( wc_get_order_status_name( $status ) ); ?></p>

			<?php if ( false !== $step_index ) : ?>
				<ol class="sgs-account__progress" aria-label="<?php esc_attr_e( 'Order progress', 'sgs-blocks' ); ?>">
					<?php foreach ( $step_order as $i => $key ) : ?>
						<li class="sgs-account__progress-step<?php echo $i <= $step_index ? ' sgs-account__progress-step--done' : ''; ?>"<?php echo $i === $step_index ? ' aria-current="step"' : ''; ?>>
							<?php echo esc_html( $step_labels[ $key ] ?? $key ); ?>
						</li>
					<?php endforeach; ?>
				</ol>
			<?php endif; ?>

			<p class="sgs-account__order-actions">
				<a class="sgs-account__order-link" href="<?php echo esc_url( $order->get_view_order_url() ); ?>"><?php echo esc_html( (string) ( $attrs['viewOrderLabel'] ?? __( 'View order', 'sgs-blocks' ) ) ); ?></a>
				<?php if ( $track_url ) : ?>
					<a class="sgs-account__order-link sgs-account__order-track" href="<?php echo esc_url( $track_url ); ?>"><?php echo esc_html( (string) ( $attrs['parcelTrackingLabel'] ?? __( 'Track parcel', 'sgs-blocks' ) ) ); ?></a>
				<?php endif; ?>
			</p>
		</div>
	<?php else : ?>
		<p class="sgs-account__no-orders">
			<?php echo esc_html( (string) ( $attrs['noOrdersText'] ?? __( "You haven't placed an order yet.", 'sgs-blocks' ) ) ); ?>
			<a href="<?php echo esc_url( function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/' ) ); ?>">
				<?php echo esc_html( (string) ( $attrs['shopLinkLabel'] ?? __( 'Start shopping', 'sgs-blocks' ) ) ); ?>
			</a>
		</p>
	<?php endif; ?>
<?php endif; ?>

<?php if ( ! empty( $attrs['showQuickCards'] ) || ! isset( $attrs['showQuickCards'] ) ) : ?>
	<?php
	$menu_items       = function_exists( 'wc_get_account_menu_items' ) ? wc_get_account_menu_items() : array();
	$never_hide       = sgs_account_never_hide();
	$descriptions     = wp_parse_args( is_array( $attrs['cardDescriptions'] ?? null ) ? $attrs['cardDescriptions'] : array(), sgs_account_default_card_descriptions() );
	?>
	<?php if ( $menu_items ) : ?>
		<div class="sgs-account__quick-cards">
			<?php foreach ( $menu_items as $endpoint => $label ) :
				if ( in_array( $endpoint, $never_hide, true ) ) {
					continue;
				}
				?>
				<a class="sgs-account__card sgs-account__quick-card" href="<?php echo esc_url( wc_get_account_endpoint_url( $endpoint ) ); ?>">
					<span class="sgs-account__card-title"><?php echo esc_html( $label ); ?></span>
					<?php if ( ! empty( $descriptions[ $endpoint ] ) ) : ?>
						<span class="sgs-account__card-desc"><?php echo esc_html( $descriptions[ $endpoint ] ); ?></span>
					<?php endif; ?>
				</a>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
<?php endif; ?>

<?php
/**
 * My Account dashboard — fired for parity with WooCommerce's own template,
 * so a plugin hooking here still runs inside the block.
 *
 * @since 2.6.0
 */
do_action( 'woocommerce_account_dashboard' );
do_action( 'woocommerce_before_my_account' );
do_action( 'woocommerce_after_my_account' );
