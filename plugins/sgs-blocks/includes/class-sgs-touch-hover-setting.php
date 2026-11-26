<?php
/**
 * SGS Touch Hover — the site-wide "Hover effects on touch screens" setting (Spec 38A FR-38A-17).
 *
 * Appearance → Customise → SGS Interaction → "Hover effects on touch screens":
 *   - "Show while pressed" (`press`, the default, nothing stored): a touch shows the hover look at once, it stays while
 *     the finger is on the element and ends when the finger lifts, slides off or starts a scroll.
 *   - "Show on tap" (`tap`): the browser's own sticky hover; a tap shows the look until the visitor taps elsewhere.
 *   - "Off on touch screens" (`desktop`): no hover look while the page is touched.
 *
 * The choice is printed as `data-sgs-touch-hover="<mode>"` on `<html>` for the two overrides (nothing for the default).
 * `assets/js/touch-input.js` reads it: the default sets `.sgs-touch-input` on `<html>` and `.sgs-pressed` on the pressed
 * chain, "Off on touch screens" sets only `.sgs-touch-input`, "Show on tap" sets neither. Every hover rule carries a
 * guarded mouse half and a pressed touch half (includes/helpers-hover-state.php, scripts/hover-guard/transform.js).
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

	const OPTION_KEY         = 'sgs_touch_hover';
	const SHOW_WHILE_PRESSED = 'press';
	const SHOW_ON_TAP        = 'tap';
	const DESKTOP_ONLY       = 'desktop';

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
				'default'           => self::SHOW_WHILE_PRESSED,
				'capability'        => 'edit_theme_options',
				'sanitize_callback' => array( __CLASS__, 'sanitise_mode' ),
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			self::OPTION_KEY,
			array(
				'label'       => \__( 'Hover effects on touch screens', 'sgs-blocks' ),
				'description' => \__( 'Show while pressed: touching an item shows its hover look until the finger lifts, slides off or scrolls. Show on tap: the look stays until the visitor taps elsewhere. Off on touch screens: hover looks never show on touch.', 'sgs-blocks' ),
				'section'     => 'sgs_interaction',
				'type'        => 'select',
				'choices'     => array(
					self::SHOW_WHILE_PRESSED => \__( 'Show while pressed', 'sgs-blocks' ),
					self::SHOW_ON_TAP        => \__( 'Show on tap', 'sgs-blocks' ),
					self::DESKTOP_ONLY       => \__( 'Off on touch screens', 'sgs-blocks' ),
				),
			)
		);
	}

	/**
	 * Only the three known modes are valid; anything else falls back to the default.
	 *
	 * @param mixed $value Submitted value.
	 * @return string
	 */
	public static function sanitise_mode( $value ): string {
		return \in_array( $value, array( self::SHOW_ON_TAP, self::DESKTOP_ONLY ), true ) ? (string) $value : self::SHOW_WHILE_PRESSED;
	}

	/**
	 * Print `data-sgs-touch-hover="<mode>"` on `<html>` when the site chose an override.
	 *
	 * @param string $output The `<html>` attributes built so far.
	 * @return string
	 */
	public static function filter_html_attributes( $output ): string {
		$output = (string) $output;
		$mode   = self::sanitise_mode( \get_option( self::OPTION_KEY, self::SHOW_WHILE_PRESSED ) );
		if ( self::SHOW_WHILE_PRESSED === $mode ) {
			return $output;
		}
		return $output . ' data-sgs-touch-hover="' . \esc_attr( $mode ) . '"';
	}
}
