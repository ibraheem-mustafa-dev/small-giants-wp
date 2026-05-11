<?php
/**
 * Trustpilot Sync — Admin settings page.
 *
 * Settings -> SGS Trustpilot Sync. Mirrors the SGS\Blocks\Forms\Form_Admin
 * shape (add_options_page + register_setting + do_settings_sections), and
 * adds a Sync-now button, last-sync display, and activity log.
 *
 * @package SGS\Blocks\Trustpilot
 */

namespace SGS\Blocks\Trustpilot;

defined( 'ABSPATH' ) || exit;

class Trustpilot_Settings {

	const PAGE_SLUG  = 'sgs-trustpilot-sync';
	const GROUP_KEY  = 'sgs_trustpilot_sync_group';
	const ASSET_HANDLE = 'sgs-trustpilot-sync-admin';

	public static function register(): void {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_assets' ) );
	}

	public static function add_menu_page(): void {
		add_options_page(
			__( 'SGS Trustpilot Sync', 'sgs-blocks' ),
			__( 'SGS Trustpilot Sync', 'sgs-blocks' ),
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	public static function register_settings(): void {
		register_setting(
			self::GROUP_KEY,
			Trustpilot_Sync::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( Trustpilot_Sync::class, 'sanitise_settings' ),
				'default'           => Trustpilot_Sync::defaults(),
			)
		);

		add_settings_section(
			'sgs_trustpilot_source',
			__( 'Trustpilot business', 'sgs-blocks' ),
			array( __CLASS__, 'render_source_section' ),
			self::PAGE_SLUG
		);

		add_settings_field(
			'business_url',
			__( 'Business URL', 'sgs-blocks' ),
			array( __CLASS__, 'render_business_url_field' ),
			self::PAGE_SLUG,
			'sgs_trustpilot_source'
		);

		add_settings_field(
			'auto_sync',
			__( 'Auto-sync', 'sgs-blocks' ),
			array( __CLASS__, 'render_auto_sync_field' ),
			self::PAGE_SLUG,
			'sgs_trustpilot_source'
		);

		add_settings_section(
			'sgs_trustpilot_browser',
			__( 'Browser endpoint', 'sgs-blocks' ),
			array( __CLASS__, 'render_browser_section' ),
			self::PAGE_SLUG
		);

		add_settings_field(
			'browser_provider',
			__( 'Provider', 'sgs-blocks' ),
			array( __CLASS__, 'render_browser_provider_field' ),
			self::PAGE_SLUG,
			'sgs_trustpilot_browser'
		);

		add_settings_field(
			'custom_endpoint',
			__( 'Custom endpoint URL', 'sgs-blocks' ),
			array( __CLASS__, 'render_custom_endpoint_field' ),
			self::PAGE_SLUG,
			'sgs_trustpilot_browser'
		);

		add_settings_field(
			'custom_token',
			__( 'Custom endpoint API key', 'sgs-blocks' ),
			array( __CLASS__, 'render_custom_token_field' ),
			self::PAGE_SLUG,
			'sgs_trustpilot_browser'
		);
	}

	/**
	 * Enqueue the Sync-now JS only on this settings page.
	 */
	public static function enqueue_admin_assets( string $hook ): void {
		if ( 'settings_page_' . self::PAGE_SLUG !== $hook ) {
			return;
		}

		wp_enqueue_script(
			self::ASSET_HANDLE,
			SGS_BLOCKS_URL . 'assets/admin/trustpilot-sync.js',
			array( 'wp-api-fetch' ),
			SGS_BLOCKS_VERSION,
			true
		);

		wp_localize_script(
			self::ASSET_HANDLE,
			'sgsTrustpilotSync',
			array(
				'restRoot' => esc_url_raw( rest_url( Trustpilot_REST::NAMESPACE_KEY . Trustpilot_REST::ROUTE ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'strings'  => array(
					'syncing'      => __( 'Syncing...', 'sgs-blocks' ),
					'syncNow'      => __( 'Sync now', 'sgs-blocks' ),
					'success'      => __( 'Sync complete.', 'sgs-blocks' ),
					'error'        => __( 'Sync failed.', 'sgs-blocks' ),
					'networkError' => __( 'Network error contacting WordPress.', 'sgs-blocks' ),
				),
			)
		);
	}

	public static function render_source_section(): void {
		echo '<p>' . esc_html__( 'Configure the Trustpilot business this site syncs from. The sgs/trustpilot-reviews block in synced data-source mode reads from the same option (wp_options[sgs_trustpilot_data]).', 'sgs-blocks' ) . '</p>';
		echo '<p><strong>' . esc_html__( 'Setup checklist:', 'sgs-blocks' ) . '</strong></p>';
		echo '<ol style="margin-left:1.5rem;">';
		echo '<li>' . esc_html__( 'Enter your Trustpilot review URL (the same URL you visit in a browser to see your reviews).', 'sgs-blocks' ) . '</li>';
		echo '<li>' . esc_html__( 'Choose Weekly auto-sync (or Daily if reviews change very frequently).', 'sgs-blocks' ) . '</li>';
		echo '<li>' . esc_html__( 'Configure a Browser endpoint below (Browserless free tier works).', 'sgs-blocks' ) . '</li>';
		echo '<li>' . esc_html__( 'Click Save Changes, then Sync now to populate the first batch of reviews.', 'sgs-blocks' ) . '</li>';
		echo '<li>' . esc_html__( 'Add the SGS Trustpilot Reviews block anywhere and set Data source to Synced.', 'sgs-blocks' ) . '</li>';
		echo '</ol>';
	}

	public static function render_browser_section(): void {
		echo '<p>' . esc_html__( 'Trustpilot blocks server-side fetches (HTTP 403). A headless-browser endpoint renders the page for us.', 'sgs-blocks' ) . '</p>';
		printf(
			'<p>%1$s <a href="https://www.browserless.io/sign-up" target="_blank" rel="noopener">%2$s</a> %3$s</p>',
			esc_html__( 'Sign up for free at', 'sgs-blocks' ),
			esc_html__( 'browserless.io/sign-up', 'sgs-blocks' ),
			esc_html__( '(6 hours/month free, no credit card). On the dashboard pick "REST APIs" and copy the API key.', 'sgs-blocks' )
		);
	}

	public static function render_business_url_field(): void {
		$settings = Trustpilot_Sync::get_settings();
		printf(
			'<input type="url" name="%1$s[business_url]" value="%2$s" class="regular-text" placeholder="%3$s" />',
			esc_attr( Trustpilot_Sync::OPTION_KEY ),
			esc_attr( $settings['business_url'] ),
			esc_attr__( 'https://uk.trustpilot.com/review/example.com', 'sgs-blocks' )
		);
		echo '<p class="description">' . esc_html__( 'Full Trustpilot review URL. Must contain /review/.', 'sgs-blocks' ) . '</p>';
	}

	public static function render_auto_sync_field(): void {
		$settings = Trustpilot_Sync::get_settings();
		$current  = $settings['auto_sync'];
		$options  = array(
			'off'    => __( 'Off', 'sgs-blocks' ),
			'weekly' => __( 'Weekly', 'sgs-blocks' ),
			'daily'  => __( 'Daily', 'sgs-blocks' ),
		);
		foreach ( $options as $value => $label ) {
			printf(
				'<label style="margin-right:1rem;"><input type="radio" name="%1$s[auto_sync]" value="%2$s" %3$s /> %4$s</label>',
				esc_attr( Trustpilot_Sync::OPTION_KEY ),
				esc_attr( $value ),
				checked( $current, $value, false ),
				esc_html( $label )
			);
		}
		echo '<p class="description">' . esc_html__( 'Weekly is recommended. The sync also runs whenever you click Sync now.', 'sgs-blocks' ) . '</p>';
	}

	public static function render_browser_provider_field(): void {
		$settings = Trustpilot_Sync::get_settings();
		$current  = $settings['browser_provider'];
		?>
		<label style="display:block;margin-bottom:0.5rem;">
			<input type="radio" name="<?php echo esc_attr( Trustpilot_Sync::OPTION_KEY ); ?>[browser_provider]" value="sgs" <?php checked( $current, 'sgs' ); ?> />
			<?php esc_html_e( 'Use SGS shared service', 'sgs-blocks' ); ?>
			<em style="color:#646970;">(<?php esc_html_e( 'not yet provisioned — falls back to direct fetch', 'sgs-blocks' ); ?>)</em>
		</label>
		<label style="display:block;">
			<input type="radio" name="<?php echo esc_attr( Trustpilot_Sync::OPTION_KEY ); ?>[browser_provider]" value="custom" <?php checked( $current, 'custom' ); ?> />
			<?php esc_html_e( 'Use my own Browserless instance', 'sgs-blocks' ); ?>
		</label>
		<?php
	}

	public static function render_custom_endpoint_field(): void {
		$settings = Trustpilot_Sync::get_settings();
		printf(
			'<input type="url" name="%1$s[custom_endpoint]" value="%2$s" class="regular-text" placeholder="%3$s" />',
			esc_attr( Trustpilot_Sync::OPTION_KEY ),
			esc_attr( $settings['custom_endpoint'] ),
			esc_attr__( 'https://production-sfo.browserless.io/content', 'sgs-blocks' )
		);
		echo '<p class="description">' . esc_html__( 'Full Browserless /content endpoint URL.', 'sgs-blocks' ) . '</p>';
	}

	public static function render_custom_token_field(): void {
		$settings = Trustpilot_Sync::get_settings();
		$mask     = '' !== $settings['custom_token'] ? str_repeat( "\xE2\x80\xA2", 16 ) : '';
		printf(
			'<input type="password" name="%1$s[custom_token]" value="%2$s" class="regular-text" autocomplete="new-password" />',
			esc_attr( Trustpilot_Sync::OPTION_KEY ),
			esc_attr( $mask )
		);
		echo '<p class="description">' . esc_html__( 'Stored encrypted via AES-256-CBC keyed off wp_salt. Sent as Authorization: Bearer.', 'sgs-blocks' ) . '</p>';
	}

	public static function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings = Trustpilot_Sync::get_settings();
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP_KEY );
				do_settings_sections( self::PAGE_SLUG );
				submit_button();
				?>
			</form>

			<hr>

			<h2><?php esc_html_e( 'Manual sync', 'sgs-blocks' ); ?></h2>
			<p>
				<button type="button" class="button button-primary" id="sgs-trustpilot-sync-now">
					<?php esc_html_e( 'Sync now', 'sgs-blocks' ); ?>
				</button>
				<span id="sgs-trustpilot-sync-status" style="margin-left:1rem;"></span>
			</p>
			<p class="description">
				<?php
				if ( ! empty( $settings['last_sync_time'] ) ) {
					$status_label = 'success' === $settings['last_sync_status']
						? __( 'success', 'sgs-blocks' )
						: __( 'failed', 'sgs-blocks' );
					printf(
						/* translators: 1: status, 2: human-readable time, 3: message */
						esc_html__( 'Last sync: %1$s, %2$s ago. %3$s', 'sgs-blocks' ),
						esc_html( $status_label ),
						esc_html( human_time_diff( $settings['last_sync_time'], time() ) ),
						esc_html( $settings['last_sync_message'] )
					);
				} else {
					esc_html_e( 'No sync has run yet.', 'sgs-blocks' );
				}
				?>
			</p>

			<h2><?php esc_html_e( 'Recent sync activity', 'sgs-blocks' ); ?></h2>
			<?php self::render_log_table(); ?>
		</div>
		<?php
	}

	private static function render_log_table(): void {
		$log = Trustpilot_Sync::get_log();

		if ( empty( $log ) ) {
			echo '<p>' . esc_html__( 'No sync activity yet.', 'sgs-blocks' ) . '</p>';
			return;
		}

		echo '<table class="widefat fixed striped" style="max-width:900px;">';
		echo '<thead><tr>';
		echo '<th style="width:200px;">' . esc_html__( 'When', 'sgs-blocks' ) . '</th>';
		echo '<th style="width:100px;">' . esc_html__( 'Status', 'sgs-blocks' ) . '</th>';
		echo '<th>' . esc_html__( 'Message', 'sgs-blocks' ) . '</th>';
		echo '</tr></thead><tbody>';

		foreach ( $log as $entry ) {
			$status_class = 'success' === ( $entry['status'] ?? '' ) ? 'color:#1e7e34;' : 'color:#b32d2e;';
			printf(
				'<tr><td>%1$s</td><td style="%2$s">%3$s</td><td>%4$s</td></tr>',
				esc_html( gmdate( 'Y-m-d H:i:s', (int) ( $entry['time'] ?? 0 ) ) . ' UTC' ),
				esc_attr( $status_class ),
				esc_html( $entry['status'] ?? '' ),
				esc_html( $entry['message'] ?? '' )
			);
		}

		echo '</tbody></table>';
	}
}
