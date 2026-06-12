<?php
/**
 * SGS Stock Notify — admin meta-box renderer.
 *
 * Renders the "Back-in-stock requests" read-only table on the WooCommerce
 * product edit screen. Called exclusively from Stock_Notify::render_meta_box().
 *
 * Security: the meta-box is only registered when the current user has
 * `manage_woocommerce` (enforced in Stock_Notify::register_meta_box()).
 * This file performs a second capability check as a defence-in-depth measure.
 *
 * No IP addresses are stored — only email + unix timestamp per entry.
 *
 * @package SGS\Blocks
 * @since   1.18.0 (FR-30-10 Spec 30 Step 10)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Render the stock-notify meta-box body for a given product.
 *
 * @param int $product_id WooCommerce product post ID.
 */
function sgs_stock_notify_render_meta_box( int $product_id ): void {

	// Defence-in-depth capability check.
	if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce-registered capability.
		return;
	}

	// -- Load raw data -------------------------------------------------------
	$raw  = \get_post_meta( $product_id, Stock_Notify::META_KEY, true );
	$list = array();

	if ( \is_string( $raw ) && '' !== $raw ) {
		$decoded = \json_decode( $raw, true );
		if ( \is_array( $decoded ) ) {
			$list = $decoded;
		}
	}

	if ( empty( $list ) ) {
		echo '<p>' . \esc_html__( 'No back-in-stock requests recorded yet.', 'sgs-blocks' ) . '</p>';
		return;
	}

	// -- Sort newest first ---------------------------------------------------
	\usort(
		$list,
		static function ( array $a, array $b ): int {
			return (int) ( $b['ts'] ?? 0 ) - (int) ( $a['ts'] ?? 0 );
		}
	);

	$date_format = \get_option( 'date_format' ) . ' ' . \get_option( 'time_format' );
	$total       = \count( $list );
	?>
	<style>
		#sgs-stock-notify table { border-collapse: collapse; width: 100%; }
		#sgs-stock-notify th,
		#sgs-stock-notify td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #dcdcdc; font-size: 13px; }
		#sgs-stock-notify th { background: #f9f9f9; font-weight: 600; }
		#sgs-stock-notify tr:last-child td { border-bottom: none; }
		#sgs-stock-notify .sgs-sn-note { margin-top: 8px; color: #666; font-size: 12px; }
	</style>
	<table>
		<thead>
			<tr>
				<th><?php \esc_html_e( 'Email', 'sgs-blocks' ); ?></th>
				<th><?php \esc_html_e( 'Date', 'sgs-blocks' ); ?></th>
			</tr>
		</thead>
		<tbody>
		<?php foreach ( $list as $entry ) : ?>
			<?php
			$entry_email = \esc_html( (string) ( $entry['email'] ?? '' ) );
			$entry_ts    = (int) ( $entry['ts'] ?? 0 );
			$entry_date  = $entry_ts > 0
				? \esc_html( \date_i18n( $date_format, $entry_ts ) )
				: \esc_html__( 'Unknown', 'sgs-blocks' );
			?>
			<tr>
				<td><?php echo $entry_email; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- value is esc_html() above. ?></td>
				<td><?php echo $entry_date; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- value is esc_html( date_i18n() ) above. ?></td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<p class="sgs-sn-note">
		<?php
		\printf(
			/* translators: %d: number of subscribers recorded. */
			\esc_html( \_n( '%d subscriber recorded.', '%d subscribers recorded.', $total, 'sgs-blocks' ) ),
			(int) $total
		);
		?>
		<?php if ( $total >= Stock_Notify::MAX_SUBSCRIBERS ) : ?>
			<?php \esc_html_e( 'Cap reached — new subscribers are no longer stored until existing entries are cleared.', 'sgs-blocks' ); ?>
		<?php endif; ?>
	</p>
	<?php
}