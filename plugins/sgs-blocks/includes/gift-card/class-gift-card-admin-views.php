<?php
/**
 * Gift card admin markup: list and card detail (Spec 27, FR-27-GC8).
 *
 * Uses WordPress' own admin classes and no inline styles.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Renders the two screens.
 */
final class Gift_Card_Admin_Views {

	/**
	 * The searchable list with the liability total.
	 *
	 * @return void
	 */
	public static function list(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only filters on a capability-gated screen.
		$search = isset( $_GET['s'] ) ? \sanitize_text_field( \wp_unslash( $_GET['s'] ) ) : '';
		$status = isset( $_GET['status'] ) ? \sanitize_key( \wp_unslash( $_GET['status'] ) ) : '';
		$paged  = isset( $_GET['paged'] ) ? \max( 1, \absint( $_GET['paged'] ) ) : 1;
		// phpcs:enable

		$store   = Gift_Card_Services::store();
		$filters = array(
			's'      => $search,
			'status' => $status,
		);
		$total   = $store->count( $filters );
		$cards   = $store->search(
			\array_merge(
				$filters,
				array(
					'limit'  => Gift_Card_Admin::PER_PAGE,
					'offset' => ( $paged - 1 ) * Gift_Card_Admin::PER_PAGE,
				)
			)
		);
		$money   = $store->liability( \gmdate( 'Y-m-d H:i:s' ) );

		self::tabs( 'cards' );
		?>
		<div class="sgs-gift-card-admin__liability">
			<p>
				<strong><?php \esc_html_e( 'Liability (live, unexpired balances):', 'sgs-blocks' ); ?></strong> <?php echo \esc_html( Gift_Card_Money::format( $money['live'] ) ); ?>
				&middot; <?php \esc_html_e( 'held by pending orders:', 'sgs-blocks' ); ?> <?php echo \esc_html( Gift_Card_Money::format( $money['reserved'] ) ); ?>
				&middot; <?php \esc_html_e( 'expired:', 'sgs-blocks' ); ?> <?php echo \esc_html( Gift_Card_Money::format( $money['expired'] ) ); ?>
				&middot; <?php \esc_html_e( 'disabled:', 'sgs-blocks' ); ?> <?php echo \esc_html( Gift_Card_Money::format( $money['disabled'] ) ); ?>
			</p>
		</div>

		<form method="get" class="sgs-gift-card-admin__search">
			<input type="hidden" name="page" value="<?php echo \esc_attr( Gift_Card_Admin::PAGE ); ?>" />
			<label class="screen-reader-text" for="sgs-gc-search"><?php \esc_html_e( 'Search gift cards', 'sgs-blocks' ); ?></label>
			<input type="search" id="sgs-gc-search" name="s" value="<?php echo \esc_attr( $search ); ?>" placeholder="<?php \esc_attr_e( 'Last four, email, name or order number', 'sgs-blocks' ); ?>" />
			<label class="screen-reader-text" for="sgs-gc-status"><?php \esc_html_e( 'Status', 'sgs-blocks' ); ?></label>
			<select id="sgs-gc-status" name="status">
				<option value=""><?php \esc_html_e( 'Any status', 'sgs-blocks' ); ?></option>
				<?php foreach ( array( 'active', 'disabled', 'refunded' ) as $option ) : ?>
					<option value="<?php echo \esc_attr( $option ); ?>" <?php \selected( $status, $option ); ?>><?php echo \esc_html( \ucfirst( $option ) ); ?></option>
				<?php endforeach; ?>
			</select>
			<?php \submit_button( \__( 'Search', 'sgs-blocks' ), 'secondary', '', false ); ?>
		</form>

		<table class="widefat striped sgs-gift-card-admin__table">
			<thead><tr>
				<th scope="col"><?php \esc_html_e( 'Card', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Status', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Balance', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Recipient', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Order', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Expires', 'sgs-blocks' ); ?></th>
			</tr></thead>
			<tbody>
			<?php if ( array() === $cards ) : ?>
				<tr><td colspan="6"><?php \esc_html_e( 'No gift cards found.', 'sgs-blocks' ); ?></td></tr>
			<?php endif; ?>
			<?php foreach ( $cards as $card ) : ?>
				<tr>
					<td><a href="<?php echo \esc_url( Gift_Card_Admin::url( array( 'card' => (int) $card['id'] ) ) ); ?>">#<?php echo (int) $card['id']; ?> <?php echo '' !== $card['code_last4'] ? \esc_html( '…' . $card['code_last4'] ) : \esc_html__( '(code not sent yet)', 'sgs-blocks' ); ?></a></td>
					<td><?php echo \esc_html( \ucfirst( (string) $card['status'] ) ); ?></td>
					<td><?php echo \esc_html( Gift_Card_Money::format( (int) $card['balance_pence'] ) . ' / ' . Gift_Card_Money::format( (int) $card['initial_pence'] ) ); ?></td>
					<td><?php echo \esc_html( $card['recipient_name'] . ( '' !== $card['recipient_email'] ? ' <' . $card['recipient_email'] . '>' : '' ) ); ?></td>
					<td><?php echo (int) $card['purchaser_order_id'] > 0 ? '#' . (int) $card['purchaser_order_id'] : '&ndash;'; ?></td>
					<td><?php echo ! empty( $card['expires_at'] ) ? \esc_html( \substr( (string) $card['expires_at'], 0, 10 ) ) : \esc_html__( 'Never', 'sgs-blocks' ); ?></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<?php
		$pages = (int) \ceil( $total / Gift_Card_Admin::PER_PAGE );
		if ( $pages > 1 ) {
			echo '<div class="tablenav"><div class="tablenav-pages">' . \wp_kses_post(
				(string) \paginate_links(
					array(
						'base'    => \add_query_arg( 'paged', '%#%' ),
						'format'  => '',
						'current' => $paged,
						'total'   => $pages,
					)
				)
			) . '</div></div>';
		}

		self::export_form( $search, $status );
		self::issue_form();
		self::issue_order_form();
	}

	/**
	 * One card: facts, actions and the full ledger.
	 *
	 * @param int $card_id Card id.
	 * @return void
	 */
	public static function card( int $card_id ): void {
		$store = Gift_Card_Services::store();
		$card  = $store->find( $card_id );
		self::tabs( 'cards' );
		if ( null === $card ) {
			echo '<p>' . \esc_html__( 'That gift card does not exist.', 'sgs-blocks' ) . '</p>';
			return;
		}
		$ledger = $store->ledger_for_card( $card_id );
		$check  = Gift_Card_Services::ledger()->verify( $card_id );
		?>
		<p><a href="<?php echo \esc_url( Gift_Card_Admin::url() ); ?>">&larr; <?php \esc_html_e( 'All gift cards', 'sgs-blocks' ); ?></a></p>
		<h2><?php echo \esc_html( \sprintf( /* translators: %d: card id */ \__( 'Gift card #%d', 'sgs-blocks' ), $card_id ) ); ?></h2>
		<table class="widefat striped sgs-gift-card-admin__facts"><tbody>
			<?php
			self::fact( \__( 'Code', 'sgs-blocks' ), '' !== $card['code_last4'] ? '…' . $card['code_last4'] : \__( 'Not sent yet', 'sgs-blocks' ) );
			self::fact( \__( 'Status', 'sgs-blocks' ), \ucfirst( (string) $card['status'] ) );
			self::fact( \__( 'Balance', 'sgs-blocks' ), Gift_Card_Money::format( (int) $card['balance_pence'] ) . ' (' . Gift_Card_Money::format( (int) $card['reserved_pence'] ) . ' held by pending orders)' );
			self::fact( \__( 'Issued value', 'sgs-blocks' ), Gift_Card_Money::format( (int) $card['initial_pence'] ) );
			self::fact( \__( 'Expires', 'sgs-blocks' ), ! empty( $card['expires_at'] ) ? (string) $card['expires_at'] . ' UTC' : \__( 'Never', 'sgs-blocks' ) );
			self::fact( \__( 'Purchaser', 'sgs-blocks' ), (string) $card['purchaser_email'] . ( (int) $card['purchaser_order_id'] > 0 ? ' (order #' . (int) $card['purchaser_order_id'] . ')' : '' ) );
			self::fact( \__( 'Recipient', 'sgs-blocks' ), $card['recipient_name'] . ' <' . $card['recipient_email'] . '>' );
			self::fact( \__( 'Send on / delivered', 'sgs-blocks' ), (string) ( $card['send_on'] ?? '' ) . ' / ' . (string) ( $card['delivered_at'] ?? '' ) );
			self::fact( \__( 'Ledger check', 'sgs-blocks' ), $check['ok'] ? \__( 'Balance matches the ledger', 'sgs-blocks' ) : \__( 'MISMATCH: balance differs from the ledger', 'sgs-blocks' ) );
			?>
		</tbody></table>

		<h3><?php \esc_html_e( 'Actions', 'sgs-blocks' ); ?></h3>
		<?php
		self::action_form( 'adjust', $card_id, \__( 'Adjust balance', 'sgs-blocks' ), '<select name="direction"><option value="credit">' . \esc_html__( 'Add', 'sgs-blocks' ) . '</option><option value="debit">' . \esc_html__( 'Remove', 'sgs-blocks' ) . '</option></select> <input type="text" name="amount" required placeholder="10.00" aria-label="' . \esc_attr__( 'Amount in pounds', 'sgs-blocks' ) . '" /> <input type="text" name="reason" required placeholder="' . \esc_attr__( 'Reason (required)', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Reason', 'sgs-blocks' ) . '" />' );
		$flip = Gift_Card_Ledger::STATUS_ACTIVE === $card['status'] ? 'disabled' : 'active';
		self::action_form( 'status', $card_id, 'disabled' === $flip ? \__( 'Disable card', 'sgs-blocks' ) : \__( 'Enable card', 'sgs-blocks' ), '<input type="hidden" name="status" value="' . \esc_attr( $flip ) . '" /><input type="text" name="reason" placeholder="' . \esc_attr__( 'Reason', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Reason', 'sgs-blocks' ) . '" />' );
		self::action_form( 'expiry', $card_id, \__( 'Change expiry', 'sgs-blocks' ), '<input type="date" name="expires_on" aria-label="' . \esc_attr__( 'New expiry date (blank means never)', 'sgs-blocks' ) . '" /> <input type="text" name="reason" placeholder="' . \esc_attr__( 'Reason', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Reason', 'sgs-blocks' ) . '" />' );
		if ( 0 === (int) $card['reissue_count'] && null !== $card['code_hash'] ) {
			self::action_form( 'reissue', $card_id, \__( 'Reissue lost code (once)', 'sgs-blocks' ), '<span>' . \esc_html__( 'The old code stops working and the new one is emailed to the purchaser.', 'sgs-blocks' ) . '</span>' );
		}
		self::action_form( 'refund', $card_id, \__( 'Refund unused card to purchaser', 'sgs-blocks' ), '<input type="email" name="requester_email" required placeholder="' . \esc_attr__( 'Purchaser email', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Email of the person asking for the refund', 'sgs-blocks' ) . '" />' );
		?>

		<h3><?php \esc_html_e( 'Ledger (append-only)', 'sgs-blocks' ); ?></h3>
		<table class="widefat striped sgs-gift-card-admin__ledger">
			<thead><tr>
				<th scope="col"><?php \esc_html_e( 'When (UTC)', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Type', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Change', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Balance after', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Order', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'By', 'sgs-blocks' ); ?></th>
				<th scope="col"><?php \esc_html_e( 'Reason', 'sgs-blocks' ); ?></th>
			</tr></thead>
			<tbody>
			<?php foreach ( \array_reverse( $ledger ) as $row ) : ?>
				<tr>
					<td><?php echo \esc_html( (string) $row['created_at'] ); ?></td>
					<td><?php echo \esc_html( (string) $row['type'] ); ?></td>
					<td><?php echo \esc_html( Gift_Card_Money::format( (int) $row['delta_pence'] ) ); ?></td>
					<td><?php echo \esc_html( Gift_Card_Money::format( (int) $row['balance_after_pence'] ) ); ?></td>
					<td><?php echo (int) $row['order_id'] > 0 ? '#' . (int) $row['order_id'] : '&ndash;'; ?></td>
					<td><?php echo (int) $row['actor_id'] > 0 ? (int) $row['actor_id'] : \esc_html__( 'System', 'sgs-blocks' ); ?></td>
					<td><?php echo \esc_html( (string) $row['reason'] ); ?></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<?php
	}

	/**
	 * Tab links.
	 *
	 * @param string $current Current tab.
	 * @return void
	 */
	private static function tabs( string $current ): void {
		echo '<nav class="nav-tab-wrapper">';
		\printf( '<a class="nav-tab %1$s" href="%2$s">%3$s</a>', 'cards' === $current ? 'nav-tab-active' : '', \esc_url( Gift_Card_Admin::url() ), \esc_html__( 'Cards', 'sgs-blocks' ) );
		\printf( '<a class="nav-tab" href="%1$s">%2$s</a>', \esc_url( Gift_Card_Admin::url( array( 'tab' => 'settings' ) ) ), \esc_html__( 'Settings', 'sgs-blocks' ) );
		echo '</nav>';
	}

	/**
	 * A two-column fact row.
	 *
	 * @param string $label Label.
	 * @param string $value Value.
	 * @return void
	 */
	private static function fact( string $label, string $value ): void {
		echo '<tr><th scope="row">' . \esc_html( $label ) . '</th><td>' . \esc_html( $value ) . '</td></tr>';
	}

	/**
	 * A small admin-post form with its nonce.
	 *
	 * @param string $action  Action suffix.
	 * @param int    $card_id Card id.
	 * @param string $label   Button label.
	 * @param string $fields  Trusted, pre-escaped field markup.
	 * @return void
	 */
	private static function action_form( string $action, int $card_id, string $label, string $fields ): void {
		echo '<form method="post" action="' . \esc_url( \admin_url( 'admin-post.php' ) ) . '" class="sgs-gift-card-admin__action"><input type="hidden" name="action" value="sgs_gift_card_' . \esc_attr( $action ) . '" /><input type="hidden" name="card" value="' . (int) $card_id . '" />';
		\wp_nonce_field( Gift_Card_Admin_Actions::nonce_action( $action, $card_id ) );
		echo $fields . ' '; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from literals and already-escaped values above.
		\submit_button( $label, 'secondary', '', false );
		echo '</form>';
	}

	/**
	 * The CSV export button for the current filters.
	 *
	 * @param string $search Search text.
	 * @param string $status Status filter.
	 * @return void
	 */
	private static function export_form( string $search, string $status ): void {
		echo '<form method="post" action="' . \esc_url( \admin_url( 'admin-post.php' ) ) . '" class="sgs-gift-card-admin__export"><input type="hidden" name="action" value="sgs_gift_card_export" /><input type="hidden" name="s" value="' . \esc_attr( $search ) . '" /><input type="hidden" name="status_filter" value="' . \esc_attr( $status ) . '" />';
		\wp_nonce_field( Gift_Card_Admin_Actions::nonce_action( 'export', 0 ) );
		\submit_button( \__( 'Export CSV', 'sgs-blocks' ), 'secondary', '', false );
		echo '</form>';
	}

	/**
	 * Issue the cards of a paid order that WooCommerce did not confirm as paid by a gateway.
	 *
	 * @return void
	 */
	private static function issue_order_form(): void {
		echo '<h3>' . \esc_html__( 'Issue the cards on a paid order', 'sgs-blocks' ) . '</h3>';
		echo '<p class="description">' . \esc_html__( 'Cards are issued automatically when a payment is confirmed. For a bank transfer or cash on delivery, set the order to Processing once the money has arrived, then enter its number here. Does nothing twice.', 'sgs-blocks' ) . '</p>';
		self::action_form(
			'issue_order',
			0,
			\__( 'Issue cards', 'sgs-blocks' ),
			'<input type="number" min="1" name="order_id" required placeholder="' . \esc_attr__( 'Order number', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Order number', 'sgs-blocks' ) . '" />'
		);
	}

	/**
	 * The manual issue form.
	 *
	 * @return void
	 */
	private static function issue_form(): void {
		echo '<h3>' . \esc_html__( 'Issue a gift card by hand', 'sgs-blocks' ) . '</h3>';
		self::action_form(
			'issue',
			0,
			\__( 'Issue gift card', 'sgs-blocks' ),
			'<input type="text" name="amount" required placeholder="25.00" aria-label="' . \esc_attr__( 'Amount in pounds', 'sgs-blocks' ) . '" /> <input type="text" name="recipient_name" placeholder="' . \esc_attr__( 'Recipient name', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Recipient name', 'sgs-blocks' ) . '" /> <input type="email" name="recipient_email" placeholder="' . \esc_attr__( 'Recipient email (optional)', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Recipient email', 'sgs-blocks' ) . '" /> <input type="text" name="sender_name" placeholder="' . \esc_attr__( 'From', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'From', 'sgs-blocks' ) . '" /> <input type="text" name="message" placeholder="' . \esc_attr__( 'Message', 'sgs-blocks' ) . '" aria-label="' . \esc_attr__( 'Message', 'sgs-blocks' ) . '" />'
		);
	}
}
