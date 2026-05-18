<?php
/**
 * SGS Floating UI — Customiser controls (Replaces retired sgs/back-to-top + sgs/reading-progress blocks).
 *
 * Registers an "SGS Floating UI" section inside the WordPress Customiser
 * (Appearance → Customise → SGS Floating UI) with 7 controls:
 *   Back to Top: enabled, background colour, icon colour, position.
 *   Reading Progress: enabled, colour, height.
 *
 * All settings use `type => 'option'` so values write to `wp_options['sgs_floating_ui_*']`
 * rather than `theme_mod`. `postMessage` transport is used for live preview without
 * a full page reload — the companion `customise-preview.js` handles DOM updates.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Floating_UI_Customiser
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Floating_UI_Customiser {

	// ── Option keys (individual wp_options rows) ─────────────────────────────

	const OPT_BTT_ENABLED  = 'sgs_floating_ui_back_to_top_enabled';
	const OPT_BTT_BG       = 'sgs_floating_ui_back_to_top_bg_colour';
	const OPT_BTT_ICON     = 'sgs_floating_ui_back_to_top_icon_colour';
	const OPT_BTT_POSITION = 'sgs_floating_ui_back_to_top_position';
	const OPT_RP_ENABLED   = 'sgs_floating_ui_reading_progress_enabled';
	const OPT_RP_COLOUR    = 'sgs_floating_ui_reading_progress_colour';
	const OPT_RP_HEIGHT    = 'sgs_floating_ui_reading_progress_height';

	// ── Defaults ─────────────────────────────────────────────────────────────

	const DEFAULT_BTT_BG       = '#0F7E80';
	const DEFAULT_BTT_ICON     = '#FFFFFF';
	const DEFAULT_BTT_POSITION = 'right';
	const DEFAULT_RP_COLOUR    = '#0F7E80';
	const DEFAULT_RP_HEIGHT    = 4;

	/**
	 * Wire the Customiser registration hook.
	 * Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'customize_register', array( __CLASS__, 'register_controls' ) );
		\add_action( 'customize_preview_init', array( __CLASS__, 'enqueue_preview_script' ) );
	}

	// ── Customiser registration ───────────────────────────────────────────────

	/**
	 * Add the SGS Floating UI section, settings, and controls to the Customiser.
	 *
	 * @param \WP_Customize_Manager $wp_customize The Customiser manager instance.
	 */
	public static function register_controls( \WP_Customize_Manager $wp_customize ): void {

		// -- Section ----------------------------------------------------------
		$wp_customize->add_section(
			'sgs_floating_ui',
			array(
				'title'       => \__( 'SGS Floating UI', 'sgs-blocks' ),
				'priority'    => 160,
				'capability'  => 'edit_theme_options',
				'description' => \__( 'Back to top button and reading progress bar. Replaces the retired sgs/back-to-top and sgs/reading-progress blocks. Aim for at least 4.5:1 colour contrast against the page background.', 'sgs-blocks' ),
			)
		);

		// -- Back to Top: enabled ---------------------------------------------
		$wp_customize->add_setting(
			self::OPT_BTT_ENABLED,
			array(
				'type'              => 'option',
				'default'           => false,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_checkbox' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			self::OPT_BTT_ENABLED,
			array(
				'label'    => \__( 'Enable back to top button', 'sgs-blocks' ),
				'section'  => 'sgs_floating_ui',
				'type'     => 'checkbox',
				'priority' => 10,
			)
		);

		// -- Back to Top: background colour -----------------------------------
		$wp_customize->add_setting(
			self::OPT_BTT_BG,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_BTT_BG,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_colour' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				self::OPT_BTT_BG,
				array(
					'label'    => \__( 'Back to top — background colour', 'sgs-blocks' ),
					'section'  => 'sgs_floating_ui',
					'priority' => 20,
				)
			)
		);

		// -- Back to Top: icon colour -----------------------------------------
		$wp_customize->add_setting(
			self::OPT_BTT_ICON,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_BTT_ICON,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_colour' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				self::OPT_BTT_ICON,
				array(
					'label'    => \__( 'Back to top — icon colour', 'sgs-blocks' ),
					'section'  => 'sgs_floating_ui',
					'priority' => 30,
				)
			)
		);

		// -- Back to Top: position --------------------------------------------
		$wp_customize->add_setting(
			self::OPT_BTT_POSITION,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_BTT_POSITION,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_position' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			self::OPT_BTT_POSITION,
			array(
				'label'    => \__( 'Back to top — position', 'sgs-blocks' ),
				'section'  => 'sgs_floating_ui',
				'type'     => 'select',
				'priority' => 40,
				'choices'  => array(
					'right' => \__( 'Bottom right', 'sgs-blocks' ),
					'left'  => \__( 'Bottom left', 'sgs-blocks' ),
				),
			)
		);

		// -- Reading Progress: enabled ----------------------------------------
		$wp_customize->add_setting(
			self::OPT_RP_ENABLED,
			array(
				'type'              => 'option',
				'default'           => false,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_checkbox' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			self::OPT_RP_ENABLED,
			array(
				'label'    => \__( 'Enable reading progress bar', 'sgs-blocks' ),
				'section'  => 'sgs_floating_ui',
				'type'     => 'checkbox',
				'priority' => 50,
			)
		);

		// -- Reading Progress: colour -----------------------------------------
		$wp_customize->add_setting(
			self::OPT_RP_COLOUR,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_RP_COLOUR,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_colour' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				self::OPT_RP_COLOUR,
				array(
					'label'    => \__( 'Reading progress — bar colour', 'sgs-blocks' ),
					'section'  => 'sgs_floating_ui',
					'priority' => 60,
				)
			)
		);

		// -- Reading Progress: height -----------------------------------------
		$wp_customize->add_setting(
			self::OPT_RP_HEIGHT,
			array(
				'type'              => 'option',
				'default'           => self::DEFAULT_RP_HEIGHT,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_height' ),
				'transport'         => 'postMessage',
			)
		);
		$wp_customize->add_control(
			self::OPT_RP_HEIGHT,
			array(
				'label'       => \__( 'Reading progress — bar height (px)', 'sgs-blocks' ),
				'section'     => 'sgs_floating_ui',
				'type'        => 'number',
				'priority'    => 70,
				'input_attrs' => array(
					'min'  => 2,
					'max'  => 8,
					'step' => 1,
				),
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
			'sgs-floating-ui-customise-preview',
			\plugins_url( 'assets/floating-ui/customise-preview.js', \dirname( __DIR__ ) . '/sgs-blocks.php' ),
			array( 'customize-preview' ),
			SGS_BLOCKS_VERSION,
			true
		);
	}

	// ── Sanitisers ───────────────────────────────────────────────────────────

	/**
	 * Sanitise a checkbox / boolean Customiser setting.
	 *
	 * @param mixed $value Raw value from the Customiser.
	 * @return bool
	 */
	public static function sanitise_checkbox( $value ): bool {
		return (bool) $value;
	}

	/**
	 * Sanitise a hex colour. Falls back to empty string (WP core behaviour for
	 * {@see sanitize_hex_color()}) when the value is invalid.
	 *
	 * @param mixed $value Raw colour value.
	 * @return string Valid hex colour or empty string.
	 */
	public static function sanitise_colour( $value ): string {
		$sanitised = \sanitize_hex_color( (string) $value );
		return $sanitised ?? '';
	}

	/**
	 * Sanitise the back-to-top position — whitelist only.
	 *
	 * @param mixed $value Raw value.
	 * @return string 'right' | 'left'
	 */
	public static function sanitise_position( $value ): string {
		return \in_array( $value, array( 'left', 'right' ), true ) ? (string) $value : self::DEFAULT_BTT_POSITION;
	}

	/**
	 * Sanitise the reading-progress bar height — clamp to 2-8 px.
	 *
	 * @param mixed $value Raw value.
	 * @return int Integer in the range [2, 8].
	 */
	public static function sanitise_height( $value ): int {
		return max( 2, min( 8, \absint( $value ) ) );
	}
}
