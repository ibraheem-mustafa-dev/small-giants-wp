<?php
/**
 * Frontend — skip navigation output and settings page.
 *
 * @package SGS\Accessibility
 */

namespace SGS\Accessibility;

defined( 'ABSPATH' ) || exit;

/**
 * Class Frontend
 *
 * Handles the frontend skip-navigation link (injected via wp_body_open),
 * the Settings → SGS Accessibility options page, and the block editor
 * sidebar script enqueue.
 */
class Frontend {

	/**
	 * Register WordPress hooks.
	 *
	 * @return void
	 */
	public function register(): void {
		// Settings page.
		add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
		add_action( 'admin_init', [ $this, 'register_settings' ] );

		// Frontend skip link.
		add_action( 'wp_body_open', [ $this, 'output_skip_link' ] );
		add_action( 'wp_head', [ $this, 'output_skip_link_css' ] );

		// Block editor sidebar.
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_sidebar' ] );
	}

	// -------------------------------------------------------------------------
	// Settings Page
	// -------------------------------------------------------------------------

	/**
	 * Register the Settings → SGS Accessibility submenu page.
	 *
	 * @return void
	 */
	public function add_settings_page(): void {
		add_options_page(
			__( 'SGS Accessibility', 'sgs-accessibility' ),
			__( 'SGS Accessibility', 'sgs-accessibility' ),
			'manage_options',
			'sgs-a11y-settings',
			[ $this, 'render_settings_page' ]
		);
	}

	/**
	 * Register plugin settings via the Settings API.
	 *
	 * @return void
	 */
	public function register_settings(): void {
		register_setting(
			'sgs_a11y_settings_group',
			'sgs_a11y_skip_nav_enabled',
			[
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'default'           => true,
			]
		);

		register_setting(
			'sgs_a11y_settings_group',
			'sgs_a11y_skip_nav_target',
			[
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_html_class',
				'default'           => 'main-content',
			]
		);

		add_settings_section(
			'sgs_a11y_skip_nav_section',
			__( 'Skip Navigation', 'sgs-accessibility' ),
			static function (): void {
				echo '<p>' . esc_html__( 'Output a skip-to-content link at the top of every front-end page.', 'sgs-accessibility' ) . '</p>';
			},
			'sgs-a11y-settings'
		);

		add_settings_field(
			'sgs_a11y_skip_nav_enabled',
			__( 'Enable skip navigation', 'sgs-accessibility' ),
			[ $this, 'render_field_enabled' ],
			'sgs-a11y-settings',
			'sgs_a11y_skip_nav_section'
		);

		add_settings_field(
			'sgs_a11y_skip_nav_target',
			__( 'Target element ID', 'sgs-accessibility' ),
			[ $this, 'render_field_target' ],
			'sgs-a11y-settings',
			'sgs_a11y_skip_nav_section'
		);
	}

	/**
	 * Render the "enable skip nav" checkbox field.
	 *
	 * @return void
	 */
	public function render_field_enabled(): void {
		$value = (bool) get_option( 'sgs_a11y_skip_nav_enabled', true );
		?>
		<input
			type="checkbox"
			id="sgs_a11y_skip_nav_enabled"
			name="sgs_a11y_skip_nav_enabled"
			value="1"
			<?php checked( $value ); ?>
		/>
		<label for="sgs_a11y_skip_nav_enabled">
			<?php esc_html_e( 'Output skip navigation link on the frontend', 'sgs-accessibility' ); ?>
		</label>
		<?php
	}

	/**
	 * Render the target ID text field.
	 *
	 * @return void
	 */
	public function render_field_target(): void {
		$value = get_option( 'sgs_a11y_skip_nav_target', 'main-content' );
		?>
		<input
			type="text"
			id="sgs_a11y_skip_nav_target"
			name="sgs_a11y_skip_nav_target"
			value="<?php echo esc_attr( (string) $value ); ?>"
			class="regular-text"
		/>
		<p class="description">
			<?php esc_html_e( 'The id attribute of the main content element (e.g. main-content).', 'sgs-accessibility' ); ?>
		</p>
		<?php
	}

	/**
	 * Render the settings page wrapper.
	 *
	 * @return void
	 */
	public function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'SGS Accessibility Settings', 'sgs-accessibility' ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'sgs_a11y_settings_group' );
				do_settings_sections( 'sgs-a11y-settings' );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	// -------------------------------------------------------------------------
	// Frontend Skip Link
	// -------------------------------------------------------------------------

	/**
	 * Output the skip-navigation link after <body> opens.
	 *
	 * @return void
	 */
	public function output_skip_link(): void {
		if ( ! (bool) get_option( 'sgs_a11y_skip_nav_enabled', true ) ) {
			return;
		}

		$target = get_option( 'sgs_a11y_skip_nav_target', 'main-content' );
		$target = sanitize_html_class( (string) $target, 'main-content' );

		printf(
			'<a href="#%s" class="sgs-skip-link">%s</a>' . "\n",
			esc_attr( $target ),
			esc_html__( 'Skip to main content', 'sgs-accessibility' )
		);
	}

	/**
	 * Output skip-link CSS in <head> (inline — tiny, no extra HTTP request).
	 *
	 * @return void
	 */
	public function output_skip_link_css(): void {
		if ( ! (bool) get_option( 'sgs_a11y_skip_nav_enabled', true ) ) {
			return;
		}
		?>
		<style id="sgs-a11y-skip-link-css">
		.sgs-skip-link {
			position: absolute;
			top: -9999px;
			left: -9999px;
			z-index: 99999;
			padding: 8px 16px;
			background: #000;
			color: #fff;
			font-size: 14px;
			text-decoration: none;
			white-space: nowrap;
		}
		.sgs-skip-link:focus {
			top: 8px;
			left: 8px;
			outline: 3px solid #005fcc;
			outline-offset: 2px;
		}
		</style>
		<?php
	}

	// -------------------------------------------------------------------------
	// Block Editor Sidebar
	// -------------------------------------------------------------------------

	/**
	 * Enqueue the Gutenberg sidebar panel script.
	 *
	 * @return void
	 */
	public function enqueue_editor_sidebar(): void {
		wp_enqueue_script(
			'sgs-a11y-editor-sidebar',
			SGS_A11Y_URL . 'assets/editor-sidebar.js',
			[ 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-i18n' ],
			SGS_A11Y_VERSION,
			true
		);

		wp_set_script_translations( 'sgs-a11y-editor-sidebar', 'sgs-accessibility' );
	}
}
