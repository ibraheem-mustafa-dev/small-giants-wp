<?php
/**
 * Google Fonts consent — the Font Library's "Connect to Google Fonts" prompt is pre-answered.
 *
 * How core gates it (WordPress 7.1, packages/global-styles-ui font-library/font-collection):
 * only the collection whose slug is exactly `google-fonts` asks, and the answer lives in the
 * BROWSER, not the database: `window.localStorage['wp-font-library-google-fonts-permission']`
 * must equal the string "true". The prompt's button writes "true"; the "Revoke access" action
 * writes "false". There is no PHP filter, user meta or preference for it.
 *
 * Privacy position (same source): granting it lets the EDITOR's browser fetch the catalogue
 * previews and, on install, the chosen woff2 files from Google; those files are then uploaded to
 * the site (wp-content/uploads/fonts) and served from the site's own domain. Visitors never
 * contact Google. The prompt's own wording says the same.
 *
 * So this class prints a tiny inline script on admin screens for users who can manage fonts:
 * when the key has NEVER been set it becomes "true". An explicit "false" (someone pressed Revoke)
 * is respected. Turn the default off per site with the `sgs_google_fonts_consent_default` option
 * (`wp option update sgs_google_fonts_consent_default 0`) or the filter of the same name.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Grants the Font Library's Google Fonts permission by default in the editor.
 */
class Google_Fonts_Consent {

	const STORAGE_KEY = 'wp-font-library-google-fonts-permission';
	const HANDLE      = 'sgs-google-fonts-consent';

	/**
	 * Wire hooks.
	 */
	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Whether the default is on for this site.
	 *
	 * @return bool
	 */
	public static function default_granted(): bool {
		return (bool) apply_filters( 'sgs_google_fonts_consent_default', (bool) get_option( 'sgs_google_fonts_consent_default', true ) );
	}

	/**
	 * The inline script. Sets the key only when it has never been set.
	 *
	 * @return string
	 */
	public static function script(): string {
		$key = wp_json_encode( self::STORAGE_KEY );
		return 'try{if(null===window.localStorage.getItem(' . $key . ')){window.localStorage.setItem(' . $key . ',"true");}}catch(e){}';
	}

	/**
	 * Print the script in the head of admin screens (the Site Editor, post editor and Fonts page
	 * all mount the Font Library after it runs).
	 *
	 * @return void
	 */
	public function enqueue(): void {
		if ( ! current_user_can( 'edit_theme_options' ) || ! self::default_granted() ) {
			return;
		}
		wp_register_script( self::HANDLE, false, array(), SGS_BLOCKS_VERSION, false );
		wp_enqueue_script( self::HANDLE );
		wp_add_inline_script( self::HANDLE, self::script() );
	}
}
