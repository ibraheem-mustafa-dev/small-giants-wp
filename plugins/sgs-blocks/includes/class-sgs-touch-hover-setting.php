<?php
/**
 * SGS Touch Hover — the site-wide "Hover effects on touch screens" setting.
 *
 * Appearance → Customise → SGS Interaction → "Hover effects on touch screens":
 *   - "Show on tap" (default): a tap on a touch screen shows the hover look (colours and motion) and tapping
 *     elsewhere clears it, the browser's own sticky-hover behaviour.
 *   - "Desktop only": hover looks stay off while the page is being touched.
 *
 * The choice is printed as `data-sgs-touch-hover="desktop"` on `<html>` (nothing is printed for the default).
 * `assets/js/touch-input.js` reads it and sets `.sgs-touch-input` on `<html>` only for "Desktop only"; every hover rule
 * is guarded by `:where(:root:not(.sgs-touch-input))` (includes/helpers-hover-state.php).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Touch_Hover_Setting
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Touch_Hover_Setting {

	const OPTION_KEY   = 'sgs_touch_hover';
	const SHOW_ON_TAP  = 'tap';
	const DESKTOP_ONLY = 'desktop';

	/**
	 * Wire the Customiser registration and the `<html>` attribute.
	 */
	public static function register(): void {
		\add_action( 'customize_register', array( __CLASS__, 'register_controls' ) );
		\add_filter( 'language_attributes', array( __CLASS__, 'filter_html_attributes' ) );
	}

	/**
	 * Add the section, setting and control.
	 *
	 * @param \WP_Customize_Manager $wp_customize The Customiser manager instance.
	 */
	public static function register_controls( \WP_Customize_Manager $wp_customize ): void {
		$wp_customize->add_section(
			'sgs_interaction',
			array(
				'title'       => \__( 'SGS Interaction', 'sgs-blocks' ),
				'priority'    => 161,
				'capability'  => 'edit_theme_options',
				'description' => \__( 'How hover effects behave on touch screens.', 'sgs-blocks' ),
			)
		);

		$wp_customize->add_setting(
			self::OPTION_KEY,
			array(
				'type'              => 'option',
				'default'           => self::SHOW_ON_TAP,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_mode' ),
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			self::OPTION_KEY,
			array(
				'label'       => \__( 'Hover effects on touch screens', 'sgs-blocks' ),
				'description' => \__( 'Show on tap: tapping an item shows its hover colours and motion until the visitor taps elsewhere. Desktop only: hover effects never show on touch.', 'sgs-blocks' ),
				'section'     => 'sgs_interaction',
				'type'        => 'select',
				'choices'     => array(
					self::SHOW_ON_TAP  => \__( 'Show on tap', 'sgs-blocks' ),
					self::DESKTOP_ONLY => \__( 'Desktop only', 'sgs-blocks' ),
				),
			)
		);
	}

	/**
	 * Only the two known modes are valid; anything else falls back to the default.
	 *
	 * @param mixed $value Submitted value.
	 * @return string
	 */
	public static function sanitise_mode( $value ): string {
		return self::DESKTOP_ONLY === $value ? self::DESKTOP_ONLY : self::SHOW_ON_TAP;
	}

	/**
	 * Print `data-sgs-touch-hover="desktop"` on `<html>` when the site chose "Desktop only".
	 *
	 * @param string $output The `<html>` attributes built so far.
	 * @return string
	 */
	public static function filter_html_attributes( $output ): string {
		$output = (string) $output;
		if ( self::DESKTOP_ONLY !== self::sanitise_mode( \get_option( self::OPTION_KEY, self::SHOW_ON_TAP ) ) ) {
			return $output;
		}
		return $output . ' data-sgs-touch-hover="' . \esc_attr( self::DESKTOP_ONLY ) . '"';
	}
}
