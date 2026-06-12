<?php
/**
 * SGS Turnstile — Cloudflare Turnstile helper + settings page.
 *
 * Provides a reusable helper for:
 *  - Registering a settings page to store site/secret key pairs.
 *  - Enqueueing the Turnstile challenge script when rendering a widget.
 *  - Returning the widget HTML fragment.
 *  - Verifying a Turnstile token server-side via the siteverify API.
 *
 * When no keys are configured, verify() returns true (graceful skip) and
 * widget_html() returns '' — the rate-limit in the calling class remains the
 * defence-in-depth guard.
 *
 * @package SGS\Blocks
 * @since   1.18.0 (FR-30-10 Spec 30 Step 10)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Turnstile
 *
 * Reusable Cloudflare Turnstile integration. Stateless — all methods are static.
 */
final class Turnstile {

	/** wp_options key for the Cloudflare Turnstile site key. */
	const OPTION_SITE_KEY   = 'sgs_turnstile_site_key';

	/** wp_options key for the Cloudflare Turnstile secret key. */
	const OPTION_SECRET_KEY = 'sgs_turnstile_secret_key';

	/** Admin settings page slug. */
	const PAGE_SLUG = 'sgs-turnstile';

	/** Settings group key for register_setting. */
	const GROUP_KEY = 'sgs_turnstile_group';

	/** Cloudflare siteverify endpoint. */
	const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

	/** Cloudflare Turnstile script URL. */
	const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

	// -- Registration -------------------------------------------------------

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu_page' ) );
		\add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
	}

	// -- Admin settings page ------------------------------------------------

	/**
	 * Register the SGS Turnstile settings page under Settings.
	 */
	public static function add_menu_page(): void {
		\add_options_page(
			\__( 'SGS Turnstile', 'sgs-blocks' ),
			\__( 'SGS Turnstile', 'sgs-blocks' ),
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Register the two Turnstile option keys.
	 */
	public static function register_settings(): void {
		\register_setting(
			self::GROUP_KEY,
			self::OPTION_SITE_KEY,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);

		\register_setting(
			self::GROUP_KEY,
			self::OPTION_SECRET_KEY,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
	}

	/**
	 * Render the settings page HTML.
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo \esc_html( \get_admin_page_title() ); ?></h1>

			<p class="description">
				<?php \esc_html_e( 'Get free keys at dash.cloudflare.com &#x2192; Turnstile. Leave blank to disable bot protection (a rate-limit still applies).', 'sgs-blocks' ); ?>
			</p>

			<form action="options.php" method="post">
				<?php \settings_fields( self::GROUP_KEY ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">
							<label for="sgs_turnstile_site_key">
								<?php \esc_html_e( 'Site key', 'sgs-blocks' ); ?>
							</label>
						</th>
						<td>
							<input
								type="text"
								id="sgs_turnstile_site_key"
								name="<?php echo \esc_attr( self::OPTION_SITE_KEY ); ?>"
								value="<?php echo \esc_attr( self::site_key() ); ?>"
								class="regular-text"
								autocomplete="off"
							/>
						</td>
					</tr>
					<tr>
						<th scope="row">
							<label for="sgs_turnstile_secret_key">
								<?php \esc_html_e( 'Secret key', 'sgs-blocks' ); ?>
							</label>
						</th>
						<td>
							<input
								type="password"
								id="sgs_turnstile_secret_key"
								name="<?php echo \esc_attr( self::OPTION_SECRET_KEY ); ?>"
								value="<?php echo \esc_attr( self::secret_key() ); ?>"
								class="regular-text"
								autocomplete="new-password"
							/>
						</td>
					</tr>
				</table>
				<?php \submit_button(); ?>
			</form>
		</div>
		<?php
	}

	// -- Public helpers -----------------------------------------------------

	/**
	 * Returns true only when both keys are configured (non-empty).
	 *
	 * @return bool
	 */
	public static function is_configured(): bool {
		return '' !== self::site_key() && '' !== self::secret_key();
	}

	/**
	 * Return the configured site key (trimmed).
	 *
	 * @return string
	 */
	public static function site_key(): string {
		return \trim( (string) \get_option( self::OPTION_SITE_KEY, '' ) );
	}

	/**
	 * Return the configured secret key (trimmed).
	 *
	 * @return string
	 */
	public static function secret_key(): string {
		return \trim( (string) \get_option( self::OPTION_SECRET_KEY, '' ) );
	}

	/**
	 * Enqueue the Cloudflare Turnstile challenge script with async + defer.
	 *
	 * Only call this when actually rendering a widget AND is_configured() is true.
	 */
	public static function enqueue_script(): void {
		if ( ! self::is_configured() ) {
			return;
		}

		\wp_enqueue_script(
			'cf-turnstile',
			self::SCRIPT_URL,
			array(),
			null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- external Cloudflare script; no version pinning.
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);

		\wp_script_add_data( 'cf-turnstile', 'async', true );
	}

	/**
	 * Return the Turnstile widget HTML fragment.
	 *
	 * Returns an empty string when Turnstile is not configured (graceful skip).
	 *
	 * @return string
	 */
	public static function widget_html(): string {
		if ( ! self::is_configured() ) {
			return '';
		}

		return '<div class="cf-turnstile" data-sitekey="' . \esc_attr( self::site_key() ) . '"></div>';
	}

	/**
	 * Verify a Turnstile token via the Cloudflare siteverify API.
	 *
	 * Returns true when Turnstile is NOT configured (graceful skip — the
	 * calling class's rate-limit is the defence-in-depth guard). Returns
	 * false on WP_Error, empty token while configured, or when the API
	 * returns success=false.
	 *
	 * @param string $token     The cf-turnstile-response token from the form.
	 * @param string $remote_ip Optional client IP address passed to the API.
	 * @return bool
	 */
	public static function verify( string $token, string $remote_ip = '' ): bool {
		if ( ! self::is_configured() ) {
			// Graceful skip — rate-limit is the defence-in-depth guard.
			return true;
		}

		if ( '' === $token ) {
			return false;
		}

		$body = array(
			'secret'   => self::secret_key(),
			'response' => $token,
		);

		if ( '' !== $remote_ip ) {
			$body['remoteip'] = $remote_ip;
		}

		$response = \wp_remote_post(
			self::VERIFY_URL,
			array(
				'body'    => $body,
				'timeout' => 5,
			)
		);

		if ( \is_wp_error( $response ) ) {
			return false;
		}

		$decoded = \json_decode( \wp_remote_retrieve_body( $response ), true );

		return isset( $decoded['success'] ) ? (bool) $decoded['success'] : false;
	}
}
