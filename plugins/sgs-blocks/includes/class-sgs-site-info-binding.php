<?php
/**
 * Block binding source — sgs/site-info.
 *
 * Registers the `sgs/site-info` binding source so any block attribute
 * can be bound to a value from the SGS Site Info store (wp_options).
 *
 * Empty values render a friendly hint with a deep-link to the admin page
 * so operators know exactly where to enter the missing data.
 *
 * Depends on: Sgs_Site_Info class (Wave 1B — class-sgs-site-info.php).
 * The interface assumed is `Sgs_Site_Info::get( string $key ): mixed`.
 *
 * @package SGS\Blocks
 * @since   0.2.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and handles the sgs/site-info block binding source.
 */
final class Sgs_Site_Info_Binding {

	/** Admin page slug used for deep-link hints. */
	private const ADMIN_PAGE = 'sgs-site-info';

	/** Keys that carry URL values requiring a prefix. */
	private const URL_KEYS = array( 'email', 'phone' );

	/** Social channel sub-keys that get https:// prefix. */
	private const SOCIAL_PARENT = 'socials';

	/**
	 * Register the binding source on `init`.
	 * Call this from the main plugin file: Sgs_Site_Info_Binding::register();
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'register_source' ) );
	}

	/**
	 * Registers the block bindings source with WordPress core.
	 *
	 * Requires WP 6.5+. The function_exists guard ensures graceful no-op
	 * on older installs instead of a fatal error.
	 */
	public static function register_source(): void {
		if ( ! \function_exists( 'register_block_bindings_source' ) ) {
			return;
		}

		// NOTE: do NOT pass 'can_user_edit_value' — it is NOT a recognised key in
		// WP core's register_block_bindings_source() (WP 6.5–7.0). Passing it makes
		// core reject the ENTIRE registration (returns false), which is why this
		// source silently never registered and every sgs/site-info binding rendered
		// its raw placeholder text. Editability is governed by the block itself, not
		// the binding source. Proven live on sandybrown WP 7.0 (D325).
		\register_block_bindings_source(
			'sgs/site-info',
			array(
				'label'              => \__( 'SGS Site Info', 'sgs-blocks' ),
				'get_value_callback' => array( self::class, 'get_value' ),
				'uses_context'       => array(),
			)
		);
	}

	/**
	 * Returns the value for a bound attribute.
	 *
	 * Called by WordPress core at render time. The $args array always carries
	 * 'key' from the block binding definition in block markup.
	 *
	 * Dot-notation support ('socials.facebook', 'opening_hours.monday') is
	 * delegated to Sgs_Site_Info::get().
	 *
	 * @param  array<string,mixed> $args    Binding args from block markup.
	 * @param  array<string,mixed> $block   Block definition data (unused; required by WP callback signature).
	 * @param  string              $attr    Attribute name being bound (unused; required by WP callback signature).
	 * @return string                       Escaped HTML or URL string.
	 */
	public static function get_value( array $args, $block = null, string $attr = '' ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- $block is a WP_Block object (NOT array) + $attr is passed by WP core's block-bindings callback (class-wp-block-bindings-source.php); both unused here but must accept core's arg types or the callback fatals.
		$key = isset( $args['key'] ) ? (string) $args['key'] : '';

		if ( '' === $key ) {
			// The hint is OPERATOR guidance, not content. It must never reach a
			// public visitor — an unfilled field previously rendered
			// "📞 Set your phone number in SGS Site Info →" with a wp-admin
			// deep-link on live client sites. Public frontend renders empty.
			return self::is_operator_context() ? self::hint_for_key( $key ) : '';
		}

		// Delegate to Sgs_Site_Info (Wave 1B). Returns raw value; we escape here.
		$raw = \class_exists( __NAMESPACE__ . '\Sgs_Site_Info' )
			? Sgs_Site_Info::get( $key )
			: null;

		// Empty / missing — render a friendly hint to an operator/editor only;
		// a public visitor gets an empty string, never the admin-deep-link hint.
		if ( null === $raw || '' === (string) $raw ) {
			return self::is_operator_context() ? self::hint_for_key( $key ) : '';
		}

		$raw = (string) $raw;

		// URL fields: apply scheme prefix then escape as URL.
		if ( self::is_url_field( $key ) ) {
			$url = self::prefix_url_for_key( $key, $raw );
			return \esc_url( $url );
		}

		// All other fields: escape as HTML.
		return \esc_html( $raw );
	}

	/**
	 * True only when the CURRENT REQUEST is an operator/editor context that
	 * may see the admin-deep-link hint — never a public frontend visitor.
	 *
	 * `is_admin()` alone is NOT reliable here: the block editor renders bound
	 * blocks via the REST block-renderer route (`wp/v2/block-renderer/...`),
	 * where `is_admin()` is FALSE. Mirrors the frontend/editor predicate
	 * already established in class-sgs-css-registry.php (inverted), plus a
	 * capability gate matching the exact capability that gates the Site Info
	 * admin page itself (Sgs_Site_Info_Admin::CAP = 'edit_theme_options') —
	 * belt-and-braces so a hint can never surface to a user who couldn't act
	 * on it anyway. WP 6.9–7.0 floor: `wp_is_serving_rest_request()` is
	 * native (WP 6.5+) but still function_exists-guarded for safety.
	 *
	 * @return bool
	 */
	private static function is_operator_context(): bool {
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			return false;
		}
		if ( \is_admin() ) {
			return true;
		}
		if ( \function_exists( 'wp_is_serving_rest_request' ) && \wp_is_serving_rest_request() ) {
			return true;
		}
		if ( \defined( 'REST_REQUEST' ) && \REST_REQUEST ) {
			return true;
		}
		return false;
	}

	/**
	 * Returns an HTML anchor hint for a given key.
	 *
	 * The anchor deep-links to the admin page section matching the key so
	 * operators can click straight through to the correct field.
	 *
	 * @param  string $key  Dot-notation key (e.g. 'socials.facebook').
	 * @return string       Escaped anchor HTML.
	 */
	public static function hint_for_key( string $key ): string {
		$label = self::hint_label_for_key( $key );
		$url   = self::admin_deep_link( $key );

		return \sprintf(
			'<a href="%s">%s</a>',
			\esc_url( $url ),
			\esc_html( $label )
		);
	}

	/**
	 * Returns the human-readable hint label for a key.
	 *
	 * @param  string $key  Dot-notation key.
	 * @return string       Plain-text hint label (not escaped — caller escapes).
	 */
	private static function hint_label_for_key( string $key ): string {
		// Normalise: strip trailing dot segments for parent-key matching.
		$root = strpos( $key, '.' ) !== false
			? substr( $key, 0, (int) strpos( $key, '.' ) )
			: $key;

		switch ( $root ) {
			case 'phone':
				return '📞 Set your phone number in SGS Site Info →';

			case 'email':
				return '✉️ Set your email in SGS Site Info →';

			case 'address':
				return '📍 Set your address in SGS Site Info →';

			case 'opening_hours':
				return '🕐 Set opening hours in SGS Site Info →';

			case 'socials':
				// e.g. 'socials.facebook' → 'Set facebook link in SGS Site Info →'.
				$channel = self::sub_key( $key );
				if ( '' !== $channel ) {
					/* translators: %s: social channel name, e.g. "facebook" */
					return \sprintf(
						'🔗 Set %s link in SGS Site Info →',
						$channel
					);
				}
				return '🔗 Set social link in SGS Site Info →';

			case 'copyright':
				return '© Set copyright in SGS Site Info →';

			case 'tagline':
				return '💬 Set tagline in SGS Site Info →';

			default:
				return '✏️ Set in SGS Site Info →';
		}
	}



	/**
	 * Applies the correct scheme prefix for URL-type fields.
	 *
	 * Rules:
	 *   - email key  → prepend 'mailto:' unless a scheme is already present.
	 *   - phone key  → prepend 'tel:' unless a scheme is already present.
	 *   - socials.*  → prepend 'https://' unless a scheme is already present.
	 *
	 * A value "already has a scheme" when it contains '://' or starts with
	 * 'mailto:' or 'tel:'.
	 *
	 * @param  string $key    Dot-notation key.
	 * @param  string $value  Raw value from the store.
	 * @return string         Value with appropriate scheme prefix.
	 */
	public static function prefix_url_for_key( string $key, string $value ): string {
		if ( self::has_scheme( $value ) ) {
			return $value;
		}

		$root = self::root_key( $key );

		if ( 'email' === $root ) {
			return 'mailto:' . $value;
		}

		if ( 'phone' === $root ) {
			return 'tel:' . $value;
		}

		if ( self::SOCIAL_PARENT === $root ) {
			return 'https://' . $value;
		}

		// Non-URL field called by accident — return value unchanged.
		return $value;
	}



	/**
	 * Returns true when a key's value should be treated as a URL.
	 *
	 * @param  string $key  Dot-notation key.
	 * @return bool
	 */
	private static function is_url_field( string $key ): bool {
		$root = self::root_key( $key );
		return \in_array( $root, self::URL_KEYS, true )
			|| self::SOCIAL_PARENT === $root;
	}

	/**
	 * Extracts the root segment from a dot-notation key.
	 *
	 * 'socials.facebook' → 'socials'
	 * 'phone'            → 'phone'
	 *
	 * @param  string $key  Dot-notation key.
	 * @return string
	 */
	private static function root_key( string $key ): string {
		$dot = strpos( $key, '.' );
		return false !== $dot ? substr( $key, 0, $dot ) : $key;
	}

	/**
	 * Extracts the sub-key segment from a dot-notation key.
	 *
	 * 'socials.facebook' → 'facebook'
	 * 'phone'            → ''
	 *
	 * @param  string $key  Dot-notation key.
	 * @return string
	 */
	private static function sub_key( string $key ): string {
		$dot = strpos( $key, '.' );
		return false !== $dot ? substr( $key, $dot + 1 ) : '';
	}

	/**
	 * Returns the deep-link admin URL for a given key.
	 *
	 * The fragment uses the root key so the browser jumps to the correct
	 * section on the admin page.
	 *
	 * @param  string $key  Dot-notation key.
	 * @return string       Admin URL string (not escaped — caller escapes).
	 */
	private static function admin_deep_link( string $key ): string {
		$fragment = '' !== $key ? '#' . \sanitize_key( self::root_key( $key ) ) : '';

		return \admin_url( 'admin.php?page=' . self::ADMIN_PAGE . $fragment );
	}

	/**
	 * Returns true when a value already contains a URL scheme.
	 *
	 * @param  string $value  Value to inspect.
	 * @return bool
	 */
	private static function has_scheme( string $value ): bool {
		return str_contains( $value, '://' )
			|| str_starts_with( $value, 'mailto:' )
			|| str_starts_with( $value, 'tel:' );
	}
}
