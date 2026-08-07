<?php
/**
 * SGS Button Presets — Customiser setting bound to the `wp_global_styles` user layer.
 *
 * WHY NOT A `theme_mod` (decision recorded 2026-08-07)
 * ---------------------------------------------------
 * Bean removed the original reason for this choice: `push-theme-snapshot.py` only runs
 * while a site is in development, so a snapshot push clobbering a live client's edit is
 * not a real hazard and is not worth engineering around. The decision still lands on
 * `wp_global_styles`, but on two different and simpler grounds:
 *
 *   1. ZERO PUBLISHED-CSS EMITTER. `settings.custom.buttonPresets` is already rendered
 *      by WordPress itself as `--wp--custom--button-presets--{preset}--{role}` inside
 *      `<style id="global-styles-inline-css">`. Storing here means the SAVED state needs
 *      no `wp_head` hook, no stylesheet of our own, and therefore no new surface that
 *      could ever emit an inline style. A `theme_mod` would store fine but would then
 *      need a bespoke `:root{}` emitter written and maintained — MORE code, not less.
 *   2. EDITOR-CANVAS PARITY. The block editor renders its canvas from global styles. A
 *      value stored here shows up in the editor automatically; a `theme_mod` would not
 *      reach the canvas at all without a second, separate mechanism. "Client experience
 *      is primary" — a client who recolours the main button in the Customiser must see
 *      that colour when they next open a page in the editor.
 *
 * The honest cost, recorded rather than engineered around: this is now a THIRD write
 * direction. The normal flow is draft -> repo (`sites/<client>/theme-snapshot.json`) ->
 * site (`push-theme-snapshot.py`). A Customiser edit writes site-side only, so during a
 * development window the repo snapshot and the live site CAN diverge. `push-theme-snapshot.py`
 * already surfaces exactly that as `DRIFT WARNING (CLOBBERED)` naming both values, because
 * it reads the same `wp_global_styles` layer this setting writes. Nothing silently vanishes.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Customiser;

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( '\\WP_Customize_Setting' ) ) {
	return;
}

/**
 * A single preset/role colour token, persisted into the user global-styles post.
 */
class Button_Preset_Setting extends \WP_Customize_Setting {

	/**
	 * Setting type. Custom, so core's option/theme_mod handling is bypassed and
	 * `value()` / `update()` below own persistence entirely.
	 *
	 * @var string
	 */
	public $type = 'sgs_global_styles';

	/**
	 * Preset slug (primary | secondary | outline).
	 *
	 * @var string
	 */
	public $preset = '';

	/**
	 * Role slug (text | background | border | hover-text | hover-background | hover-border).
	 *
	 * @var string
	 */
	public $role = '';

	/**
	 * Return the current effective value (user layer over theme layer).
	 *
	 * @return string
	 */
	public function value() {
		return effective_value( $this->preset, $this->role );
	}

	/**
	 * Persist the value into `wp_global_styles`.
	 *
	 * An empty string DELETES the key rather than writing `""`, so "unset" genuinely
	 * falls back to the theme layer instead of overriding it with an empty value that
	 * would resolve to an invalid custom property.
	 *
	 * @param mixed $value Sanitised value.
	 * @return bool True when the post was updated.
	 */
	public function update( $value ) {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return false;
		}

		// `get_user_global_styles_post_id()` is the public accessor (verified against
		// WP 7.0.3 core on the canary, `class-wp-theme-json-resolver.php:678`). It calls
		// `get_user_data_from_wp_global_styles( wp_get_theme(), true )` internally, so it
		// CREATES the user global-styles post if the site has never had one — meaning a
		// fresh client site can be customised without first touching the Site Editor.
		// (There is no `get_user_global_styles_post()` returning a WP_Post; assuming one
		// exists is a fatal, which is why this was checked against core rather than
		// written from memory.)
		$post_id = \WP_Theme_JSON_Resolver::get_user_global_styles_post_id();

		if ( ! $post_id ) {
			return false;
		}

		$post = \get_post( $post_id );

		if ( ! $post instanceof \WP_Post ) {
			return false;
		}

		$data = json_decode( $post->post_content, true );

		if ( ! is_array( $data ) ) {
			$data = array();
		}

		if ( empty( $data['version'] ) ) {
			$data['version'] = \WP_Theme_JSON::LATEST_SCHEMA;
		}

		if ( ! isset( $data['settings'] ) || ! is_array( $data['settings'] ) ) {
			$data['settings'] = array();
		}
		if ( ! isset( $data['settings']['custom'] ) || ! is_array( $data['settings']['custom'] ) ) {
			$data['settings']['custom'] = array();
		}
		if ( ! isset( $data['settings']['custom']['buttonPresets'] ) || ! is_array( $data['settings']['custom']['buttonPresets'] ) ) {
			$data['settings']['custom']['buttonPresets'] = array();
		}
		if ( ! isset( $data['settings']['custom']['buttonPresets'][ $this->preset ] ) || ! is_array( $data['settings']['custom']['buttonPresets'][ $this->preset ] ) ) {
			$data['settings']['custom']['buttonPresets'][ $this->preset ] = array();
		}

		if ( '' === $value ) {
			unset( $data['settings']['custom']['buttonPresets'][ $this->preset ][ $this->role ] );
		} else {
			$data['settings']['custom']['buttonPresets'][ $this->preset ][ $this->role ] = $value;
		}

		$updated = \wp_update_post(
			array(
				'ID'           => $post->ID,
				'post_content' => \wp_json_encode( $data ),
			),
			true
		);

		if ( \is_wp_error( $updated ) ) {
			return false;
		}

		// Global styles are heavily cached; without this the next request still serves
		// the old `--wp--custom--*` values and the change would appear not to have saved.
		\WP_Theme_JSON_Resolver::clean_cached_data();

		return true;
	}
}
