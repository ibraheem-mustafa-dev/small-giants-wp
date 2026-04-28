<?php
/**
 * Block Defaults — REST API, option storage, editor injection, and admin page.
 *
 * Stores per-block attribute defaults in wp_options under 'sgs_block_defaults'.
 * Injects stored defaults into the editor via window.sgsBlockDefaults so the
 * JS extension can seed new block instances without an extra REST call.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Manages site-wide block attribute defaults for all SGS blocks.
 *
 * Flow: editor user clicks "Save as Default" → REST POST → update_option.
 * On next editor load: get_option → inject via wp_add_inline_script →
 * JS reads window.sgsBlockDefaults → blocks.registerBlockType filter seeds defaults.
 */
class Block_Defaults {

	const OPTION_KEY = 'sgs_block_defaults';

	/**
	 * Register all hooks.
	 */
	public static function register(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'inject_defaults_script' ), 20 );
		add_action( 'admin_menu', array( __CLASS__, 'add_admin_page' ) );
	}

	// ── REST API ──────────────────────────────────────────────────────────────

	/**
	 * Register REST routes for reading, saving, and resetting block defaults.
	 */
	public static function register_rest_routes(): void {
		// GET /sgs-blocks/v1/defaults — all saved defaults.
		register_rest_route(
			'sgs-blocks/v1',
			'/defaults',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_all_defaults' ),
				'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
			)
		);

		// POST /sgs-blocks/v1/defaults — save defaults (block name in body, avoids slash-in-path issue).
		register_rest_route(
			'sgs-blocks/v1',
			'/defaults',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'save_block_defaults' ),
				'permission_callback' => static fn() => current_user_can( 'edit_theme_options' ),
				'args'                => array(
					'block'      => array(
						'required'          => true,
						'validate_callback' => static fn( $v ) => is_string( $v ) && (bool) preg_match( '/^[a-z0-9\-\/]+$/', $v ),
						'sanitize_callback' => 'sanitize_text_field',
					),
					'attributes' => array(
						'required'          => true,
						'validate_callback' => static fn( $v ) => is_array( $v ),
					),
				),
			)
		);

		// DELETE /sgs-blocks/v1/defaults — reset defaults for one block (block name in body).
		register_rest_route(
			'sgs-blocks/v1',
			'/defaults',
			array(
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => array( __CLASS__, 'reset_block_defaults' ),
				'permission_callback' => static fn() => current_user_can( 'edit_theme_options' ),
				'args'                => array(
					'block' => array(
						'required'          => true,
						'validate_callback' => static fn( $v ) => is_string( $v ) && (bool) preg_match( '/^[a-z0-9\-\/]+$/', $v ),
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Return all saved block defaults.
	 *
	 * @param \WP_REST_Request $request REST request (unused — no params needed).
	 * @return \WP_REST_Response
	 */
	public static function get_all_defaults( \WP_REST_Request $request ): \WP_REST_Response {
		unset( $request ); // No params needed for this read-all endpoint.
		return new \WP_REST_Response( self::get_stored_defaults(), 200 );
	}

	/**
	 * Save defaults for a single block type.
	 *
	 * @param \WP_REST_Request $request REST request containing block name and attributes.
	 * @return \WP_REST_Response
	 */
	public static function save_block_defaults( \WP_REST_Request $request ): \WP_REST_Response {
		$block      = $request->get_param( 'block' );
		$attributes = $request->get_param( 'attributes' );
		$defaults   = self::get_stored_defaults();

		// Strip internal WP attributes that should never be persisted as defaults.
		foreach ( array( 'lock', 'className', 'style', 'metadata' ) as $key ) {
			unset( $attributes[ $key ] );
		}

		$defaults[ $block ] = self::sanitise_attributes( $attributes );
		update_option( self::OPTION_KEY, $defaults, false );

		return new \WP_REST_Response(
			array(
				'success' => true,
				'block'   => $block,
			),
			200
		);
	}

	/**
	 * Reset (delete) saved defaults for a single block type.
	 *
	 * @param \WP_REST_Request $request REST request containing the block name.
	 * @return \WP_REST_Response
	 */
	public static function reset_block_defaults( \WP_REST_Request $request ): \WP_REST_Response {
		$block    = $request->get_param( 'block' );
		$defaults = self::get_stored_defaults();

		if ( isset( $defaults[ $block ] ) ) {
			unset( $defaults[ $block ] );
			update_option( self::OPTION_KEY, $defaults, false );
		}

		return new \WP_REST_Response(
			array(
				'success' => true,
				'block'   => $block,
			),
			200
		);
	}

	// ── Editor injection ──────────────────────────────────────────────────────

	/**
	 * Output window.sgsBlockDefaults before the extensions bundle so the
	 * blocks.registerBlockType filter can read it synchronously on editor boot.
	 */
	public static function inject_defaults_script(): void {
		if ( ! wp_script_is( 'sgs-block-extensions', 'enqueued' ) ) {
			return;
		}

		$defaults = self::get_stored_defaults();
		if ( empty( $defaults ) ) {
			return;
		}

		$json = wp_json_encode( $defaults, JSON_HEX_TAG | JSON_HEX_AMP );
		wp_add_inline_script(
			'sgs-block-extensions',
			'window.sgsBlockDefaults = ' . $json . ';',
			'before'
		);
	}

	// ── Admin page ────────────────────────────────────────────────────────────

	/**
	 * Register the admin settings page under Settings > SGS Block Defaults.
	 */
	public static function add_admin_page(): void {
		add_options_page(
			__( 'SGS Block Defaults', 'sgs-blocks' ),
			__( 'SGS Block Defaults', 'sgs-blocks' ),
			'edit_theme_options',
			'sgs-block-defaults',
			array( __CLASS__, 'render_admin_page' )
		);
	}

	/**
	 * Render the admin settings page.
	 */
	public static function render_admin_page(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return;
		}

		// Handle inline reset action.
		if (
			isset( $_POST['sgs_reset_block'], $_POST['_wpnonce'] ) &&
			wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), 'sgs_reset_block_default' )
		) {
			$block    = sanitize_text_field( wp_unslash( $_POST['sgs_reset_block'] ) );
			$defaults = self::get_stored_defaults();
			unset( $defaults[ $block ] );
			update_option( self::OPTION_KEY, $defaults, false );
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Block default reset.', 'sgs-blocks' ) . '</p></div>';
		}

		// Handle reset-all action.
		if (
			isset( $_POST['sgs_reset_all'], $_POST['_wpnonce'] ) &&
			wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), 'sgs_reset_block_default' )
		) {
			delete_option( self::OPTION_KEY );
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'All block defaults reset.', 'sgs-blocks' ) . '</p></div>';
		}

		$defaults = self::get_stored_defaults();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'SGS Block Defaults', 'sgs-blocks' ); ?></h1>
			<p><?php esc_html_e( 'Saved defaults for SGS blocks. To update a default, select the block in the editor, configure it, then click "Save as Default" in the Advanced panel. To remove a default and restore block.json values, click Reset.', 'sgs-blocks' ); ?></p>

			<?php if ( empty( $defaults ) ) : ?>
				<p><em><?php esc_html_e( 'No block defaults saved yet.', 'sgs-blocks' ); ?></em></p>
			<?php else : ?>
				<form method="post">
					<?php wp_nonce_field( 'sgs_reset_block_default' ); ?>
					<table class="wp-list-table widefat fixed striped">
						<thead>
							<tr>
								<th><?php esc_html_e( 'Block', 'sgs-blocks' ); ?></th>
								<th><?php esc_html_e( 'Saved attributes', 'sgs-blocks' ); ?></th>
								<th><?php esc_html_e( 'Actions', 'sgs-blocks' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $defaults as $block_name => $attrs ) : ?>
								<tr>
									<td><code><?php echo esc_html( $block_name ); ?></code></td>
									<td><?php echo esc_html( count( $attrs ) ); ?> <?php esc_html_e( 'attribute(s)', 'sgs-blocks' ); ?></td>
									<td>
										<button
											type="submit"
											name="sgs_reset_block"
											value="<?php echo esc_attr( $block_name ); ?>"
											class="button button-secondary"
											onclick="return confirm('<?php esc_attr_e( 'Reset this block to its original defaults?', 'sgs-blocks' ); ?>')"
										>
											<?php esc_html_e( 'Reset', 'sgs-blocks' ); ?>
										</button>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<p style="margin-top:1.5em;">
						<button
							type="submit"
							name="sgs_reset_all"
							value="1"
							class="button button-link-delete"
							onclick="return confirm('<?php esc_attr_e( 'Reset ALL block defaults? This cannot be undone.', 'sgs-blocks' ); ?>')"
						>
							<?php esc_html_e( 'Reset all defaults', 'sgs-blocks' ); ?>
						</button>
					</p>
				</form>
			<?php endif; ?>
		</div>
		<?php
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	/**
	 * Read saved defaults from wp_options.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private static function get_stored_defaults(): array {
		$value = get_option( self::OPTION_KEY, array() );
		return is_array( $value ) ? $value : array();
	}

	/**
	 * Recursively sanitise attribute values — only scalar types and arrays pass.
	 * Rejects objects (which could carry class instances or closures).
	 *
	 * @param mixed $value Raw attribute value from REST request.
	 * @return mixed Sanitised value, or null for unacceptable types.
	 */
	private static function sanitise_attributes( $value ) {
		if ( is_array( $value ) ) {
			return array_map( array( __CLASS__, 'sanitise_attributes' ), $value );
		}

		if ( is_string( $value ) ) {
			return wp_kses_post( $value );
		}

		if ( is_int( $value ) || is_float( $value ) || is_bool( $value ) || is_null( $value ) ) {
			return $value;
		}

		return null;
	}
}
