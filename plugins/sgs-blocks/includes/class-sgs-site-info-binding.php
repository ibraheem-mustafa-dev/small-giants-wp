<?php
/**
 * Block binding source — sgs/site-info.
 *
 * Registers the `sgs/site-info` binding source so any block attribute
 * can be bound to a value from the SGS Site Info store (wp_options).
 *
 * A text attribute bound to an empty value renders a friendly hint with a
 * deep-link to the admin page for an operator (never a visitor); a link
 * attribute gets the value's full link, or '' (never the hint).
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

	/** Social channel sub-keys that get https:// prefix. */
	private const SOCIAL_PARENT = 'socials';

	/** Socials whose value may be a bare handle, and the profile URL a handle completes. */
	private const HANDLE_URLS = array(
		'instagram' => 'https://www.instagram.com/',
		'tiktok'    => 'https://www.tiktok.com/@',
		'twitter'   => 'https://x.com/',
	);

	/**
	 * Register the binding source on `init`.
	 * Call this from the main plugin file: Sgs_Site_Info_Binding::register();
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'register_source' ) );
		\add_action( 'enqueue_block_editor_assets', array( self::class, 'enqueue_editor_script' ) );
		\add_action( 'enqueue_block_editor_assets', array( self::class, 'publish_editor_data' ) );
	}

	/**
	 * Publishes the site-level logo (FR-36-22 tiers 2 and 3) to the editor on
	 * `window.sgsBlocksData.siteLogo`, the channel the other editor blocks already
	 * read, so `sgs/responsive-logo` can say which logo it is showing.
	 *
	 * Shape: `{ id: int, url: string, source: 'site-info' | 'wordpress' | '' }`.
	 * `source` is '' (and `url` empty) when neither tier resolves to an image.
	 */
	public static function publish_editor_data(): void {
		$site_info_id = Sgs_Site_Info_Logo::get_id();
		$id           = $site_info_id > 0 ? $site_info_id : Sgs_Site_Info_Logo::resolve_id();
		$url          = $id > 0 ? (string) \wp_get_attachment_url( $id ) : '';
		$source       = '';
		if ( '' !== $url ) {
			$source = $site_info_id > 0 ? 'site-info' : 'wordpress';
		}

		\wp_add_inline_script(
			'wp-blocks',
			'window.sgsBlocksData = window.sgsBlocksData || {};' .
			'window.sgsBlocksData.siteLogo = ' . \wp_json_encode(
				array(
					'id'     => '' === $url ? 0 : $id,
					'url'    => \esc_url_raw( $url ),
					'source' => $source,
				),
				JSON_HEX_TAG | JSON_HEX_AMP
			) . ';' .
			'window.sgsBlocksData.siteInfo = ' . \wp_json_encode( self::editor_site_info(), JSON_HEX_TAG | JSON_HEX_AMP ) . ';' .
			'window.sgsBlocksData.siteInfoHours = ' . \wp_json_encode( self::editor_hours(), JSON_HEX_TAG | JSON_HEX_AMP ) . ';',
			'before'
		);
	}

	/**
	 * The opening-hours line an icon-list item shows and the link it makes, for the editor preview
	 * (`window.sgsBlocksData.siteInfoHours`). Same text sgs/icon-list prints, from the shared formatter.
	 *
	 * @return array{text:string,link:string} Both '' for a user who cannot edit posts or when no hours are set.
	 */
	public static function editor_hours(): array {
		if ( ! \current_user_can( 'edit_posts' ) ) {
			return array( 'text' => '', 'link' => '' );
		}
		require_once __DIR__ . '/helpers-site-info-items.php';
		return array(
			'text' => \sgs_site_info_hours_text(),
			'link' => \esc_url_raw( self::link_for_key( 'socials.google' ) ),
		);
	}

	/** Site Info keys the editor shows on bound blocks and icons: contact first, then every social. */
	public const EDITOR_KEYS = array(
		'phone',
		'email',
		'address',
		'socials.whatsapp',
		'socials.facebook',
		'socials.instagram',
		'socials.twitter',
		'socials.linkedin',
		'socials.youtube',
		'socials.tiktok',
		'socials.google',
	);

	/**
	 * What the editor needs about each contact and social key: its plain value, the link it makes and whether it
	 * is filled. Only for a user who can edit posts (they already see these values on the pages they edit); the
	 * editor reads it as `window.sgsBlocksData.siteInfo` and it refreshes when the editor reloads.
	 *
	 * @return array<string,array{value:string,link:string,filled:bool}>
	 */
	public static function editor_site_info(): array {
		if ( ! \current_user_can( 'edit_posts' ) ) {
			return array();
		}
		$out = array();
		foreach ( self::EDITOR_KEYS as $key ) {
			$value       = self::raw_value( $key );
			$link        = self::link_for_key( $key );
			$out[ $key ] = array(
				'value'  => $value,
				'link'   => \esc_url_raw( $link ),
				'filled' => '' !== $link,
			);
		}
		return $out;
	}

	/**
	 * Enqueues the JS half of this source's registration (C15-2/C15-3).
	 *
	 * Loads `build/bindings/index.js`, which calls
	 * `registerBlockBindingsSource( { name: 'sgs/site-info', … } )` — the
	 * `name` there MUST stay byte-identical to the PHP registration's first
	 * argument in `register_source()` above, or the two never pair up and
	 * core's editor UI can never populate a picker for this source even
	 * though the PHP side keeps rendering the frontend correctly.
	 *
	 * Deliberately does NOT enqueue against `includes/class-sgs-blocks.php`'s
	 * shared `enqueue_editor_extensions()` bundle — that file is owned by a
	 * different part of the build, and this source's JS is small enough to
	 * ship as its own bundle rather than growing a shared one.
	 */
	public static function enqueue_editor_script(): void {
		$asset_file = SGS_BLOCKS_PATH . 'build/bindings/index.asset.php';

		if ( ! \file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		\wp_enqueue_script(
			'sgs-block-bindings',
			SGS_BLOCKS_URL . 'build/bindings/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
	}

	/**
	 * Registers the block bindings source with WordPress core.
	 *
	 * Requires WP 6.5+ (plugin floor is 6.9 — always available).
	 */
	public static function register_source(): void {
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
	 * The bound ATTRIBUTE decides the shape: a link attribute (`url`, or a name ending `Url`) gets the key's
	 * value as a full link, or '' when the key is empty, never the admin hint (it would become an href); any
	 * other attribute gets the plain value, or the hint for an operator when the key is empty.
	 *
	 * @param  array<string,mixed> $args    Binding args from block markup.
	 * @param  mixed               $block   The WP_Block (unused; required by the callback signature).
	 * @param  string              $attr    Attribute name being bound.
	 * @return string                       Escaped HTML or URL string.
	 */
	public static function get_value( array $args, $block = null, string $attr = '' ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundBeforeLastUsed -- $block is a WP_Block object (NOT array) passed by WP core's block-bindings callback (class-wp-block-bindings-source.php); unused here but the signature must accept it or the callback fatals.
		$key     = isset( $args['key'] ) ? (string) $args['key'] : '';
		$is_link = self::is_link_attribute( $attr );

		if ( $is_link ) {
			return \esc_url( self::link_for_key( $key ) );
		}

		$raw = '' === $key ? '' : self::raw_value( $key );

		if ( '' === $raw ) {
			// The hint is OPERATOR guidance, not content: a public visitor gets an empty string.
			return self::is_operator_context() ? self::hint_for_key( $key ) : '';
		}

		return 'address' === self::root_key( $key ) ? self::escape_keeping_line_breaks( $raw ) : \esc_html( $raw );
	}

	/**
	 * A text value escaped for HTML, except that `<br>` line breaks (the address is stored with them) stay real
	 * line breaks. Every other tag, and a `<br>` carrying attributes, is escaped like any other text.
	 *
	 * @param  string $text Stored value.
	 * @return string       Escaped HTML.
	 */
	private static function escape_keeping_line_breaks( string $text ): string {
		return (string) \preg_replace( '#&lt;br\s*/?&gt;#i', '<br>', \esc_html( $text ) );
	}

	/**
	 * The full link a Site Info key makes: the value with its scheme or URL form (`prefix_url_for_key`),
	 * the logo's image URL, or '' when the key is empty or makes no usable link.
	 *
	 * @param  string $key Dot-notation key.
	 * @return string      Unescaped URL, or ''.
	 */
	public static function link_for_key( string $key ): string {
		if ( '' === $key ) {
			return '';
		}
		if ( 'logo' === self::root_key( $key ) ) {
			// Stored as an attachment ID; get_id() re-validates it, so a deleted image reads as empty.
			return \class_exists( __NAMESPACE__ . '\Sgs_Site_Info_Logo' )
				? (string) \wp_get_attachment_url( Sgs_Site_Info_Logo::get_id() )
				: '';
		}
		if ( 'address' === $key ) {
			return self::maps_link( self::raw_value( 'maps_cid' ), self::raw_value( 'address' ), self::raw_value( 'maps_url' ) );
		}
		$raw = self::raw_value( $key );
		return '' === $raw ? '' : self::prefix_url_for_key( $key, $raw );
	}

	/**
	 * True when a bound attribute holds a link: `url`, or any attribute name ending `Url`
	 * (linkUrl, imageUrl, logoUrl …).
	 *
	 * @param  string $attr Attribute name.
	 * @return bool
	 */
	public static function is_link_attribute( string $attr ): bool {
		return 'url' === $attr || ( \strlen( $attr ) > 3 && \str_ends_with( $attr, 'Url' ) );
	}

	/**
	 * A Site Info value as a trimmed string ('' when unset).
	 *
	 * @param  string $key Dot-notation key.
	 * @return string
	 */
	private static function raw_value( string $key ): string {
		$raw = \class_exists( __NAMESPACE__ . '\Sgs_Site_Info' ) ? Sgs_Site_Info::get( $key ) : null;
		return \is_scalar( $raw ) ? \trim( (string) $raw ) : '';
	}

	/**
	 * A Google Maps link: the Maps URL when Site Info holds one, else the place's CID, else a search for the address.
	 *
	 * @param  string $cid     Maps CID ('' when unset); used only when it is all digits, else the address search stands in.
	 * @param  string $address Stored address (may hold `<br>` line breaks).
	 * @param  string $url     Stored Maps link ('' when unset).
	 * @return string          Unescaped URL, or '' when both are empty.
	 */
	private static function maps_link( string $cid, string $address, string $url = '' ): string {
		if ( '' !== $url ) {
			return $url;
		}
		$cid = \trim( $cid );
		if ( 1 === \preg_match( '/^[0-9]+$/', $cid ) ) {
			return 'https://maps.google.com/?cid=' . $cid;
		}
		// Line breaks become commas; tags go; runs of spaces and of commas collapse to one.
		$text = \wp_strip_all_tags( (string) \preg_replace( '/<br\s*\/?>|[\r\n]+/i', ',', $address ) );
		$text = (string) \preg_replace( '/\s+/', ' ', $text );
		$text = (string) \preg_replace( '/\s*(,\s*)+/', ', ', $text );
		$text = \trim( $text, ', ' );
		return '' === $text ? '' : 'https://www.google.com/maps/search/?api=1&query=' . \rawurlencode( $text );
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
	 * on it anyway. `wp_is_serving_rest_request()` is native since WP 6.5,
	 * always available at the plugin's 6.7 floor.
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
		if ( \wp_is_serving_rest_request() ) {
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

			case 'logo':
				return '🖼️ Set your logo in SGS Site Info →';

			default:
				return '✏️ Set in SGS Site Info →';
		}
	}



	/**
	 * The link form of a stored value, by key. Returns '' when the value makes no usable link.
	 *
	 *   - email / support_email → `mailto:` + the address ('' unless `is_email()` accepts it).
	 *   - phone                 → `tel:` + digits and a leading + ('' when no digits remain); an international number
	 *                             (+ or 00) drops its "(0)" trunk group and writes 00 as +.
	 *   - socials.whatsapp      → `https://wa.me/<digits>` from a number, a wa.me or api.whatsapp.com URL.
	 *   - socials.instagram / tiktok / twitter → a bare handle (`@name` or `name`) becomes the profile URL.
	 *   - other socials         → `https://` added when the value has no scheme; a scheme other than http or https
	 *                             gives ''.
	 *   - any other key         → the value unchanged.
	 *
	 * The caller escapes the result with `esc_url()`, whose protocol allowlist drops `javascript:` and `data:`.
	 *
	 * @param  string $key    Dot-notation key.
	 * @param  string $value  Raw value from the store.
	 * @return string         Unescaped link, or ''.
	 */
	public static function prefix_url_for_key( string $key, string $value ): string {
		// Control characters (CR/LF header splitting, NUL) never belong in a link.
		$value = \trim( (string) \preg_replace( '/[\x00-\x1F\x7F]+/', '', $value ) );
		if ( '' === $value ) {
			return '';
		}

		$root = self::root_key( $key );

		if ( 'email' === $root || 'support_email' === $root ) {
			$address = (string) \preg_replace( '/^mailto:/i', '', $value );
			return false !== \is_email( $address ) ? 'mailto:' . $address : '';
		}

		if ( 'phone' === $root ) {
			// The store keeps the display form ("0121 729 8233"); a tel: link takes digits and a leading + only.
			$number = \trim( (string) \preg_replace( '/^tel:/i', '', $value ) );
			if ( 1 === \preg_match( '/^(\+|00)/', $number ) ) {
				// International: the trunk "(0)" is not dialled from abroad, and 00 is the "+" prefix.
				$number = (string) \preg_replace( '/\(\s*0\s*\)/', '', $number );
				$number = (string) \preg_replace( '/^00/', '+', $number );
			}
			$digits = (string) \preg_replace( '/[^0-9+]/', '', $number );
			return '' === \trim( $digits, '+' ) ? '' : 'tel:' . $digits;
		}

		if ( self::SOCIAL_PARENT !== $root ) {
			return $value;
		}

		$channel = self::sub_key( $key );

		if ( 'whatsapp' === $channel ) {
			// A number, or a wa.me / api.whatsapp.com link: wa.me takes the international digits only.
			if ( \preg_match( '#^(?:https?://)?(?:www\.)?(?:wa\.me/|api\.whatsapp\.com/send/?\?phone=)\+?([0-9]+)#i', $value, $m ) ) {
				return 'https://wa.me/' . $m[1];
			}
			if ( '' !== self::scheme_of( $value ) ) {
				return self::is_web_scheme( $value ) ? $value : '';
			}
			$digits = (string) \preg_replace( '/[^0-9]/', '', $value );
			return '' === $digits ? '' : 'https://wa.me/' . $digits;
		}

		if ( '' !== self::scheme_of( $value ) ) {
			// A social link is a web address: any other scheme (javascript:, data:, mailto: ...) makes no link.
			return self::is_web_scheme( $value ) ? $value : '';
		}

		if ( isset( self::HANDLE_URLS[ $channel ] ) && \preg_match( '/^@?([A-Za-z0-9_.]+)$/', $value, $m ) ) {
			return self::HANDLE_URLS[ $channel ] . $m[1];
		}

		return 'https://' . \ltrim( $value, '/' );
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
	 * The lower-cased scheme a value starts with (`javascript` for `JaVaScRiPt:alert(1)`), or '' when it has none.
	 * `host.tld:8080/x` is a host and port, not a scheme.
	 *
	 * @param  string $value  Value to inspect.
	 * @return string
	 */
	private static function scheme_of( string $value ): string {
		if ( 1 !== \preg_match( '/^([a-z][a-z0-9+.\-]*):/i', $value, $m ) ) {
			return '';
		}
		if ( \str_contains( $m[1], '.' ) && 1 === \preg_match( '/^[^:]+:[0-9]+(?:[\/?#]|$)/', $value ) ) {
			return '';
		}
		return \strtolower( $m[1] );
	}

	/**
	 * True when a value's scheme is http or https.
	 *
	 * @param  string $value  Value with a scheme.
	 * @return bool
	 */
	private static function is_web_scheme( string $value ): bool {
		return \in_array( self::scheme_of( $value ), array( 'http', 'https' ), true );
	}
}
