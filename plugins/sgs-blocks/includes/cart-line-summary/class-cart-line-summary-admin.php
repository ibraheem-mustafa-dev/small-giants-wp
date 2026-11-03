<?php
/**
 * Cart line summary — "Shop wording" settings page.
 *
 * WooCommerce > Shop wording. A plain accessible form for the five wording
 * fields a client edits without code: the two lead words, the label
 * separator and the two add-to-bag toast sentences. The attribute renames and
 * size band stay as they are stored (the CLI seeder writes them); a save here
 * merges onto them and never drops them. Every value passes through the same
 * normaliser the CLI uses, so the two writers cannot sanitise differently.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Cart_Line_Summary_Admin
 */
final class Cart_Line_Summary_Admin {

	/** Capability gate — matches WooCommerce's own settings screens. */
	const CAP = 'manage_woocommerce';

	/** Admin-post.php action for the save form. */
	const SAVE_ACTION = 'sgs_cart_line_summary_save';

	/** The admin page's own slug. */
	const PAGE_SLUG = 'sgs-shop-wording';

	/** Wire WP hooks. Called once from load.php, admin context only. */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu_page' ) );
		\add_action( 'admin_post_' . self::SAVE_ACTION, array( __CLASS__, 'handle_save' ) );
	}

	/** Register the submenu page under WooCommerce. */
	public static function add_menu_page(): void {
		\add_submenu_page(
			'woocommerce',
			\__( 'Shop wording', 'sgs-blocks' ),
			\__( 'Shop wording', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * The editable fields: key => label, help text.
	 *
	 * @return array<string,array{0:string,1:string}>
	 */
	private static function fields(): array {
		return array(
			'leadWithAddons'    => array(
				\__( 'Bag line lead (with add-ons)', 'sgs-blocks' ),
				\__( 'Opens the first line of a bag item that carries add-ons.', 'sgs-blocks' ),
			),
			'leadWithoutAddons' => array(
				\__( 'Bag line lead (without add-ons)', 'sgs-blocks' ),
				\__( 'Opens the line of a configurable item that has no add-ons.', 'sgs-blocks' ),
			),
			'labelSeparator'    => array(
				\__( 'Label separator', 'sgs-blocks' ),
				\__( 'Printed between an attribute label and its value. ": " gives "Colour: Ivory"; a single space gives "Colour Ivory". Up to 5 characters.', 'sgs-blocks' ),
			),
			'addedToBag'        => array(
				\__( 'Added-to-bag message', 'sgs-blocks' ),
				\__( 'The sentence the pop-up shows after an item is added.', 'sgs-blocks' ),
			),
			'addedWithAddons'   => array(
				\__( 'Added-to-bag message (with add-ons)', 'sgs-blocks' ),
				\__( 'Shown instead when the added item carries add-ons. Leave empty to use the message above.', 'sgs-blocks' ),
			),
		);
	}

	/** Render the settings page. */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to manage shop wording.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$saved   = isset( $_GET['sgs-status'] ) && 'saved' === \sanitize_key( \wp_unslash( $_GET['sgs-status'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$wording = sgs_cart_line_summary_wording();
		?>
		<div class="wrap">
			<h1><?php \esc_html_e( 'Shop wording', 'sgs-blocks' ); ?></h1>
			<?php if ( $saved ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php \esc_html_e( 'Shop wording saved.', 'sgs-blocks' ); ?></p></div>
			<?php endif; ?>
			<form method="post" action="<?php echo \esc_url( \admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="<?php echo \esc_attr( self::SAVE_ACTION ); ?>" />
				<?php \wp_nonce_field( self::SAVE_ACTION ); ?>
				<table class="form-table" role="presentation">
					<?php foreach ( self::fields() as $key => $meta ) : ?>
						<tr>
							<th scope="row"><label for="sgs-wording-<?php echo \esc_attr( $key ); ?>"><?php echo \esc_html( $meta[0] ); ?></label></th>
							<td>
								<input type="text" class="regular-text" id="sgs-wording-<?php echo \esc_attr( $key ); ?>" name="wording[<?php echo \esc_attr( $key ); ?>]" value="<?php echo \esc_attr( (string) $wording[ $key ] ); ?>" aria-describedby="sgs-wording-<?php echo \esc_attr( $key ); ?>-help" />
								<p class="description" id="sgs-wording-<?php echo \esc_attr( $key ); ?>-help"><?php echo \esc_html( $meta[1] ); ?></p>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>
				<?php \submit_button( \__( 'Save shop wording', 'sgs-blocks' ) ); ?>
			</form>
		</div>
		<?php
	}

	/** Save handler: capability, nonce, merge, normalise, store. */
	public static function handle_save(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to manage shop wording.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::SAVE_ACTION );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified via check_admin_referer() above.
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitised in sgs_cart_line_summary_wording_normalise().
		$posted = isset( $_POST['wording'] ) && \is_array( $_POST['wording'] ) ? \wp_unslash( $_POST['wording'] ) : array();
		$merged = sgs_cart_line_summary_wording();
		foreach ( \array_keys( self::fields() ) as $key ) {
			if ( isset( $posted[ $key ] ) && \is_scalar( $posted[ $key ] ) ) {
				$merged[ $key ] = (string) $posted[ $key ];
			}
		}

		\update_option( SGS_CART_LINE_SUMMARY_OPTION, sgs_cart_line_summary_wording_normalise( $merged ), false );

		\wp_safe_redirect(
			\add_query_arg(
				array(
					'page'       => self::PAGE_SLUG,
					'sgs-status' => 'saved',
				),
				\admin_url( 'admin.php' )
			)
		);
		exit;
	}
}
