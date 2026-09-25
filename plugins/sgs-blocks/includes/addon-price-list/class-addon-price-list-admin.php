<?php
/**
 * SGS Add-on price list — WooCommerce settings page (Spec 43 FR-43-17).
 *
 * WooCommerce > Add-on prices. A plain accessible form: each group (key,
 * label) with a table of options (key, label, price) and Add option / Add
 * group / Remove buttons. Nonce + capability checked on save via
 * admin-post.php; the option is the only price authority (FR-43-18) so this
 * page is the one place a price is ever typed in.
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Addon_Price_List_Admin
 */
final class Addon_Price_List_Admin {

	/** Capability gate — matches WooCommerce's own settings screens. */
	const CAP = 'manage_woocommerce';

	/** Admin-post.php action for the save form. */
	const SAVE_ACTION = 'sgs_addon_price_list_save';

	/** The admin page's own slug (add_submenu_page + script-enqueue guard). */
	const PAGE_SLUG = 'sgs-addon-price-list';

	/** Wire WP hooks. Called once from load.php, admin context only. */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu_page' ) );
		\add_action( 'admin_post_' . self::SAVE_ACTION, array( __CLASS__, 'handle_save' ) );
		\add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/** Register the submenu page under WooCommerce. */
	public static function add_menu_page(): void {
		\add_submenu_page(
			'woocommerce',
			\__( 'Add-on prices', 'sgs-blocks' ),
			\__( 'Add-on prices', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Enqueue the row-add/remove JS, only on this page.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 */
	public static function enqueue_assets( string $hook_suffix ): void {
		if ( false === \strpos( $hook_suffix, self::PAGE_SLUG ) ) {
			return;
		}
		$js_file = SGS_BLOCKS_PATH . 'assets/js/addon-price-list-admin.js';
		if ( \file_exists( $js_file ) ) {
			\wp_enqueue_script(
				'sgs-addon-price-list-admin',
				SGS_BLOCKS_URL . 'assets/js/addon-price-list-admin.js',
				array(),
				(string) \filemtime( $js_file ),
				true
			);
		}
	}

	/** Render the settings page. */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to manage add-on prices.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$status = isset( $_GET['sgs-status'] ) ? \sanitize_key( \wp_unslash( $_GET['sgs-status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$error  = isset( $_GET['sgs-error'] ) ? \sanitize_text_field( \wp_unslash( $_GET['sgs-error'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$groups = sgs_addon_price_list();

		echo '<div class="wrap"><h1>' . \esc_html__( 'Add-on prices', 'sgs-blocks' ) . '</h1>';
		echo '<p>' . \esc_html__( 'One site-wide list of add-on groups (e.g. lens type, thickness, finish). A priced add-on step in a Choice Flow names one group; the price shown to shoppers and charged at checkout always comes from here, never from the block.', 'sgs-blocks' ) . '</p>';

		if ( 'saved' === $status ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Add-on prices saved.', 'sgs-blocks' ) . '</p></div>';
		}
		if ( '' !== $error ) {
			echo '<div class="notice notice-error is-dismissible"><p>' . \esc_html( $error ) . '</p></div>';
		}

		echo '<form method="post" action="' . \esc_url( \admin_url( 'admin-post.php' ) ) . '" id="sgs-addon-price-list-form">';
		\wp_nonce_field( self::SAVE_ACTION );
		echo '<input type="hidden" name="action" value="' . \esc_attr( self::SAVE_ACTION ) . '" />';
		echo '<div id="sgs-addon-groups">';
		foreach ( $groups as $g_index => $group ) {
			self::render_group_row( $g_index, $group );
		}
		echo '</div>';
		echo '<p><button type="button" class="button" id="sgs-addon-add-group">' . \esc_html__( 'Add group', 'sgs-blocks' ) . '</button></p>';
		echo '<template id="sgs-addon-group-template">';
		self::render_group_row(
			'__INDEX__',
			array(
				'key'     => '',
				'label'   => '',
				'options' => array(),
			)
		);
		echo '</template>';
		echo '<template id="sgs-addon-option-template">';
		self::render_option_row(
			'__GINDEX__',
			'__OINDEX__',
			array(
				'key'   => '',
				'label' => '',
				'price' => 0,
			)
		);
		echo '</template>';
		\submit_button( \__( 'Save add-on prices', 'sgs-blocks' ) );
		echo '</form></div>';
	}

	/**
	 * Render one group's fieldset (key, label, options table).
	 *
	 * @param int|string $g_index Group index (or the __INDEX__ placeholder for the JS template).
	 * @param array      $group   Group data.
	 */
	private static function render_group_row( $g_index, array $group ): void {
		$key   = (string) ( $group['key'] ?? '' );
		$label = (string) ( $group['label'] ?? '' );

		echo '<fieldset class="sgs-addon-group" style="border:1px solid #ccd0d4;padding:1em;margin-bottom:1em;">';
		echo '<p><label>' . \esc_html__( 'Group key', 'sgs-blocks' ) . ' <input type="text" name="groups[' . \esc_attr( (string) $g_index ) . '][key]" value="' . \esc_attr( $key ) . '" pattern="[a-z0-9_-]+" /></label> ';
		echo '<label>' . \esc_html__( 'Group label', 'sgs-blocks' ) . ' <input type="text" name="groups[' . \esc_attr( (string) $g_index ) . '][label]" value="' . \esc_attr( $label ) . '" /></label> ';
		echo '<button type="button" class="button-link-delete sgs-addon-remove-group">' . \esc_html__( 'Remove group', 'sgs-blocks' ) . '</button></p>';

		echo '<table class="widefat striped sgs-addon-options"><thead><tr>';
		echo '<th>' . \esc_html__( 'Option key', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Option label', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Price', 'sgs-blocks' ) . '</th>';
		echo '<th></th></tr></thead><tbody>';
		foreach ( (array) $group['options'] as $o_index => $option ) {
			self::render_option_row( $g_index, $o_index, $option );
		}
		echo '</tbody></table>';
		echo '<p><button type="button" class="button sgs-addon-add-option">' . \esc_html__( 'Add option', 'sgs-blocks' ) . '</button></p>';
		echo '</fieldset>';
	}

	/**
	 * Render one option row.
	 *
	 * @param int|string $g_index Group index (or placeholder).
	 * @param int|string $o_index Option index (or placeholder).
	 * @param array      $option  Option data.
	 */
	private static function render_option_row( $g_index, $o_index, array $option ): void {
		$key   = (string) ( $option['key'] ?? '' );
		$label = (string) ( $option['label'] ?? '' );
		$price = (string) ( $option['price'] ?? '' );

		echo '<tr>';
		echo '<td><input type="text" name="groups[' . \esc_attr( (string) $g_index ) . '][options][' . \esc_attr( (string) $o_index ) . '][key]" value="' . \esc_attr( $key ) . '" pattern="[a-z0-9_-]+" /></td>';
		echo '<td><input type="text" name="groups[' . \esc_attr( (string) $g_index ) . '][options][' . \esc_attr( (string) $o_index ) . '][label]" value="' . \esc_attr( $label ) . '" /></td>';
		echo '<td><input type="text" inputmode="decimal" name="groups[' . \esc_attr( (string) $g_index ) . '][options][' . \esc_attr( (string) $o_index ) . '][price]" value="' . \esc_attr( $price ) . '" /></td>';
		echo '<td><button type="button" class="button-link-delete sgs-addon-remove-option">' . \esc_html__( 'Remove', 'sgs-blocks' ) . '</button></td>';
		echo '</tr>';
	}

	/** Handle the save form submission. */
	public static function handle_save(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to manage add-on prices.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::SAVE_ACTION );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified via check_admin_referer() above.
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- every scalar is sanitized below, in sgs_addon_price_list_normalise().
		$raw_groups = isset( $_POST['groups'] ) && \is_array( $_POST['groups'] ) ? \wp_unslash( $_POST['groups'] ) : array();
		$normalised = sgs_addon_price_list_normalise( self::sanitise_posted_groups( $raw_groups ) );

		\update_option( SGS_ADDON_PRICE_LIST_OPTION, $normalised, false );

		self::redirect_back( array( 'sgs-status' => 'saved' ) );
	}

	/**
	 * Coerce the raw $_POST['groups'] structure (still with unsanitised
	 * strings) into the plain array shape sgs_addon_price_list_normalise()
	 * expects. Every scalar is cast to string here; sanitisation itself
	 * happens inside the shared normaliser so the admin form and the CLI
	 * seeder can never sanitise differently.
	 *
	 * @param array $raw_groups Raw POSTed groups.
	 * @return array
	 */
	private static function sanitise_posted_groups( array $raw_groups ): array {
		$out = array();
		foreach ( $raw_groups as $group ) {
			if ( ! \is_array( $group ) ) {
				continue;
			}
			$options = array();
			if ( isset( $group['options'] ) && \is_array( $group['options'] ) ) {
				foreach ( $group['options'] as $option ) {
					if ( ! \is_array( $option ) ) {
						continue;
					}
					$options[] = array(
						'key'   => (string) ( $option['key'] ?? '' ),
						'label' => (string) ( $option['label'] ?? '' ),
						'price' => (string) ( $option['price'] ?? '' ),
					);
				}
			}
			$out[] = array(
				'key'     => (string) ( $group['key'] ?? '' ),
				'label'   => (string) ( $group['label'] ?? '' ),
				'options' => $options,
			);
		}
		return $out;
	}

	/**
	 * Redirect back to this settings page with the given query args.
	 *
	 * @param array<string,string> $args Query args to attach.
	 */
	private static function redirect_back( array $args ): void {
		$url = \add_query_arg(
			\array_merge( array( 'page' => self::PAGE_SLUG ), $args ),
			\admin_url( 'admin.php' )
		);
		\wp_safe_redirect( $url );
		exit;
	}
}
