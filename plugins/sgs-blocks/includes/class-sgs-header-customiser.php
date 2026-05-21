<?php
/**
 * SGS Header — Customiser controls (Decision 21, Phase 5b).
 *
 * Registers an "SGS Header" section inside the WordPress Customiser
 * (Appearance → Customise → SGS Header) with controls for:
 *   Visual: background colour, text colour, link colour, max-width (postMessage).
 *   Structural: sticky behaviour toggle (postMessage).
 *   Conditional: default header pattern slug, rules management link (refresh).
 *
 * All settings use `type => 'option'` so values write to individual
 * `wp_options` rows rather than `theme_mod`. `postMessage` transport for
 * colours/spacing; `refresh` for conditional/structural settings.
 *
 * The companion `Sgs_Header_Renderer` reads these options and outputs
 * inline CSS custom properties on `wp_head`.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Customiser
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Header_Customiser {

	// ── Option keys (individual wp_options rows) ─────────────────────────────

	const OPT_BG_COLOUR   = 'sgs_header_bg_colour';
	const OPT_TEXT_COLOUR = 'sgs_header_text_colour';
	const OPT_LINK_COLOUR = 'sgs_header_link_colour';
	const OPT_MAX_WIDTH   = 'sgs_header_max_width';
	const OPT_STICKY      = 'sgs_header_sticky_enabled';

	// ── Defaults ─────────────────────────────────────────────────────────────

	const DEFAULT_BG_COLOUR   = '#ffffff';
	const DEFAULT_TEXT_COLOUR = '#1A202C';
	const DEFAULT_LINK_COLOUR = '#1F7A7A';
	const DEFAULT_MAX_WIDTH   = '1200px';
	const DEFAULT_STICKY      = false;

	/**
	 * Wire the Customiser registration hook.
	 * Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'customize_register', array( __CLASS__, 'register_controls' ), 20 );
		\add_action( 'customize_preview_init', array( __CLASS__, 'enqueue_preview_script' ) );
	}

	// ── Customiser registration ───────────────────────────────────────────────

	/**
	 * Add the SGS Header section, settings, and controls to the Customiser.
	 *
	 * @param \WP_Customize_Manager $wp_customize The Customiser manager instance.
	 */
	public static function register_controls( \WP_Customize_Manager $wp_customize ): void {

		// -- Section ----------------------------------------------------------
		$wp_customize->add_section(
			'sgs_header',
			array(
				'title'       => \__( 'SGS Header', 'sgs-blocks' ),
				'priority'    => 130,
				'capability'  => 'edit_theme_options',
				'description' => \__( 'Header background, text colours, and layout settings. Colour changes preview live. Conditional rules (show different headers per page type) are managed via the Header Rules admin page.', 'sgs-blocks' ),
			)
		);

		// -- Background colour ------------------------------------------------
		$wp_customize->add_setting(
			self::OPT_BG_COLOUR,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_BG_COLOUR,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_colour' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				self::OPT_BG_COLOUR,
				array(
					'label'    => \__( 'Header background colour', 'sgs-blocks' ),
					'section'  => 'sgs_header',
					'priority' => 10,
				)
			)
		);

		// -- Text colour ------------------------------------------------------
		$wp_customize->add_setting(
			self::OPT_TEXT_COLOUR,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_TEXT_COLOUR,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_colour' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				self::OPT_TEXT_COLOUR,
				array(
					'label'    => \__( 'Header text colour', 'sgs-blocks' ),
					'section'  => 'sgs_header',
					'priority' => 20,
				)
			)
		);

		// -- Link colour ------------------------------------------------------
		$wp_customize->add_setting(
			self::OPT_LINK_COLOUR,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_LINK_COLOUR,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_colour' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				self::OPT_LINK_COLOUR,
				array(
					'label'    => \__( 'Header link colour', 'sgs-blocks' ),
					'section'  => 'sgs_header',
					'priority' => 30,
				)
			)
		);

		// -- Max width --------------------------------------------------------
		$wp_customize->add_setting(
			self::OPT_MAX_WIDTH,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_MAX_WIDTH,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_css_size' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			self::OPT_MAX_WIDTH,
			array(
				'label'       => \__( 'Header max-width', 'sgs-blocks' ),
				'description' => \__( 'CSS size value, e.g. 1200px or 80rem. Controls the inner content width of the header.', 'sgs-blocks' ),
				'section'     => 'sgs_header',
				'type'        => 'text',
				'priority'    => 40,
			)
		);

		// -- Sticky behaviour -------------------------------------------------
		// Sticky is a class-toggle on the header element — postMessage can
		// handle this safely (JS adds/removes the class in the preview iframe).
		$wp_customize->add_setting(
			self::OPT_STICKY,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_STICKY,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_checkbox' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			self::OPT_STICKY,
			array(
				'label'       => \__( 'Enable sticky header', 'sgs-blocks' ),
				'description' => \__( 'Header stays pinned to the top of the viewport on scroll.', 'sgs-blocks' ),
				'section'     => 'sgs_header',
				'type'        => 'checkbox',
				'priority'    => 50,
			)
		);

		// -- Conditional rules info link (refresh — server logic) -------------
		// We expose a custom control pointing operators to the Header Rules page
		// rather than duplicating the rules UI inline.
		$wp_customize->add_setting(
			'sgs_header_rules_info',
			array(
				'type'      => 'option',
				'transport' => 'refresh',
				'default'   => '',
			)
		);
		$wp_customize->add_control(
			new Sgs_Customiser_Info_Control(
				$wp_customize,
				'sgs_header_rules_info',
				array(
					'label'       => \__( 'Conditional header rules', 'sgs-blocks' ),
					// translators: %s: URL of the Header Rules admin page.
					'description' => \__( 'Show different headers on different pages. <a href="%s" target="_blank">Manage header rules →</a>', 'sgs-blocks' ),
					'section'     => 'sgs_header',
					'priority'    => 60,
					'admin_url'   => \admin_url( 'admin.php?page=sgs-header-rules' ),
				)
			)
		);
	}

	// ── Customiser preview script ─────────────────────────────────────────────

	/**
	 * Enqueue the live-preview JS inside the Customiser preview frame.
	 * Only runs when the Customiser is active — zero frontend cost otherwise.
	 */
	public static function enqueue_preview_script(): void {
		\wp_enqueue_script(
			'sgs-customiser-preview',
			\plugins_url( 'assets/js/customiser-preview.js', \dirname( __DIR__ ) . '/sgs-blocks.php' ),
			array( 'customize-preview' ),
			SGS_BLOCKS_VERSION,
			true
		);
	}

	// ── Sanitisers ───────────────────────────────────────────────────────────

	/**
	 * Sanitise a hex colour. Falls back to empty string when value is invalid.
	 *
	 * @param mixed $value Raw colour value.
	 * @return string Valid hex colour or empty string.
	 */
	public static function sanitise_colour( $value ): string {
		$sanitised = \sanitize_hex_color( (string) $value );
		return $sanitised ?? '';
	}

	/**
	 * Sanitise a CSS size value (px, rem, %, em, vw). Rejects anything
	 * not matching a simple numeric + unit pattern to prevent CSS injection.
	 *
	 * @param mixed $value Raw value.
	 * @return string Sanitised CSS size or the default.
	 */
	public static function sanitise_css_size( $value ): string {
		$cleaned = \sanitize_text_field( (string) $value );
		if ( 1 === preg_match( '/^\d+(\.\d+)?(px|rem|em|%|vw|vh)$/', $cleaned ) ) {
			return $cleaned;
		}
		return self::DEFAULT_MAX_WIDTH;
	}

	/**
	 * Sanitise a checkbox / boolean Customiser setting.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	public static function sanitise_checkbox( $value ): bool {
		return (bool) $value;
	}
}
