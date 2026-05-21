<?php
/**
 * SGS Footer — Customiser controls (Decision 21, Phase 5b).
 *
 * Registers an "SGS Footer" section inside the WordPress Customiser
 * (Appearance → Customise → SGS Footer) with controls for:
 *   Visual: background colour, text colour, link colour, max-width (postMessage).
 *   Conditional: rules management link (refresh).
 *
 * All settings use `type => 'option'` so values write to individual
 * `wp_options` rows rather than `theme_mod`. `postMessage` transport for
 * colours/spacing; `refresh` for conditional/structural settings.
 *
 * The companion `Sgs_Footer_Renderer` reads these options and outputs
 * inline CSS custom properties on `wp_head`.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Footer_Customiser
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Footer_Customiser {

	// ── Option keys (individual wp_options rows) ─────────────────────────────

	const OPT_BG_COLOUR   = 'sgs_footer_bg_colour';
	const OPT_TEXT_COLOUR = 'sgs_footer_text_colour';
	const OPT_LINK_COLOUR = 'sgs_footer_link_colour';
	const OPT_MAX_WIDTH   = 'sgs_footer_max_width';

	// ── Defaults ─────────────────────────────────────────────────────────────

	const DEFAULT_BG_COLOUR   = '#0F172A';
	const DEFAULT_TEXT_COLOUR = '#F1F5F9';
	const DEFAULT_LINK_COLOUR = '#F59E0B';
	const DEFAULT_MAX_WIDTH   = '1200px';

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
	 * Add the SGS Footer section, settings, and controls to the Customiser.
	 *
	 * @param \WP_Customize_Manager $wp_customize The Customiser manager instance.
	 */
	public static function register_controls( \WP_Customize_Manager $wp_customize ): void {

		// -- Section ----------------------------------------------------------
		$wp_customize->add_section(
			'sgs_footer',
			array(
				'title'       => \__( 'SGS Footer', 'sgs-blocks' ),
				'priority'    => 140,
				'capability'  => 'edit_theme_options',
				'description' => \__( 'Footer background, text colours, and layout settings. Colour changes preview live. Conditional rules (show different footers per page type) are managed via the Footer Rules admin page.', 'sgs-blocks' ),
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
					'label'    => \__( 'Footer background colour', 'sgs-blocks' ),
					'section'  => 'sgs_footer',
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
					'label'    => \__( 'Footer text colour', 'sgs-blocks' ),
					'section'  => 'sgs_footer',
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
					'label'    => \__( 'Footer link colour', 'sgs-blocks' ),
					'section'  => 'sgs_footer',
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
				'label'       => \__( 'Footer max-width', 'sgs-blocks' ),
				'description' => \__( 'CSS size value, e.g. 1200px or 80rem. Controls the inner content width of the footer.', 'sgs-blocks' ),
				'section'     => 'sgs_footer',
				'type'        => 'text',
				'priority'    => 40,
			)
		);

		// -- Conditional rules info link (refresh — server logic) -------------
		$wp_customize->add_setting(
			'sgs_footer_rules_info',
			array(
				'type'      => 'option',
				'transport' => 'refresh',
				'default'   => '',
			)
		);
		$wp_customize->add_control(
			new Sgs_Customiser_Info_Control(
				$wp_customize,
				'sgs_footer_rules_info',
				array(
					'label'       => \__( 'Conditional footer rules', 'sgs-blocks' ),
					// translators: %s: URL of the Footer Rules admin page.
					'description' => \__( 'Show different footers on different pages. <a href="%s" target="_blank">Manage footer rules →</a>', 'sgs-blocks' ),
					'section'     => 'sgs_footer',
					'priority'    => 50,
					'admin_url'   => \admin_url( 'admin.php?page=sgs-footer-rules' ),
				)
			)
		);
	}

	// ── Customiser preview script ─────────────────────────────────────────────

	/**
	 * Enqueue the live-preview JS inside the Customiser preview frame.
	 * Shares the single customiser-preview.js bundle with the header section.
	 * Only runs when the Customiser is active — zero frontend cost otherwise.
	 */
	public static function enqueue_preview_script(): void {
		// Script registration is handled by Sgs_Header_Customiser::enqueue_preview_script().
		// We call wp_enqueue_script here with the same handle so WP deduplicates.
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
}
