<?php
/**
 * Organization + WebSite JSON-LD emitter — front page only (FR-30-9 F2).
 *
 * Emit context (LOCKED): front page only (`is_front_page()` true, not admin,
 * not feed, not JSON request, not 404). One Organization + one WebSite node.
 * Matches Yoast's front-page-only strategy; eliminates paginated-duplicate nodes
 * and the full-page-cache-across-auth-context risk.
 *
 * SEC-9 detect-and-defer: when ANY of the 7 recognised SEO plugins is active,
 * this emitter defers entirely — the SEO plugin owns site-identity schema.
 * An admin notice prompts the operator to fill the SEO plugin's Organisation
 * settings when deferring.
 *
 * Encoder: delegates to Sgs_Schema::encode_jsonld() (one encoder, zero drift).
 * NEVER use esc_attr() / esc_html() as a JSON escape — those are HTML contexts.
 *
 * Fields emitted ONLY from data that exists:
 *   Organization — name / url / logo / address (WC store address primary,
 *                  Sgs_Site_Info 'address' fallback) / hasMerchantReturnPolicy
 *                  / hasShippingService / sameAs (Sgs_Site_Info 'socials.*') /
 *                  contactPoint (Sgs_Site_Info 'phone' / 'email').
 *   WebSite      — @type / @id / name / url / publisher / alternateName (if set).
 *                  NO SearchAction.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-schema.php';
require_once __DIR__ . '/class-sgs-site-info-logo.php';

/**
 * Class Org_Website_Schema
 *
 * Builds and emits the Organization + WebSite JSON-LD script tags on the front page.
 */
final class Org_Website_Schema {

	/**
	 * Single-emit guard — prevents duplicate output if the hook fires twice.
	 *
	 * @var bool
	 */
	private static bool $emitted = false;

	/**
	 * Register the wp_head hook (priority 11, front-end only).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_head', array( __CLASS__, 'emit' ), 11 );
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_seo_plugin_notice' ) );
	}

	/**
	 * Emit Organization + WebSite JSON-LD on the front page.
	 *
	 * Gated by: front page, not admin, not feed, not JSON request, not 404,
	 * no active SEO plugin (SEC-9), site name exists.
	 *
	 * @return void
	 */
	public static function emit(): void {
		if ( self::$emitted ) {
			return;
		}
		if ( \is_admin() || \is_feed() || \wp_is_json_request() || \is_404() ) {
			return;
		}
		if ( ! \is_front_page() ) {
			return;
		}
		if ( self::seo_plugin_active() ) {
			return;
		}

		$name = \get_bloginfo( 'name' );
		if ( '' === $name ) {
			// Site name is required; omit the whole emitter rather than emit a
			// nameless Organisation node that confuses structured-data processors.
			return;
		}

		$home_url = \home_url( '/' );
		$org_id   = $home_url . '#organization';
		$site_id  = $home_url . '#website';

		// ── Organization node ─────────────────────────────────────────────────
		$org = array(
			'@context' => 'https://schema.org',
			'@type'    => 'Organization',
			'@id'      => $org_id,
			'name'     => $name,
			'url'      => $home_url,
		);

		// Logo: Site Info logo → custom logo attachment → site icon → omit.
		$logo_url = self::resolve_logo_url();
		if ( '' !== $logo_url ) {
			$org['logo'] = $logo_url;
		}

		// Address: WC store settings primary, Sgs_Site_Info 'address' fallback.
		$address = null;
		if ( \function_exists( 'WC' ) ) {
			$address = self::build_address();
		}
		if ( null === $address ) {
			$address = self::build_address_from_site_info();
			// A Site Info address rarely names its country; the store's country
			// (when WooCommerce is active) completes it.
			if ( null !== $address && \function_exists( 'WC' ) ) {
				// A parsed UK postcode names the country itself; otherwise the store's country fills it.
				$address = self::with_default_country( $address, isset( $address['postalCode'] ) ? 'GB' : self::store_country_code() );
			}
		}
		if ( null !== $address ) {
			$org['address'] = $address;

			// Upgrade Organization → LocalBusiness ONLY when a COMPLETE physical
			// address is present (a non-empty addressLocality — a bare street line
			// or a country-only stub is NOT enough). Claiming LocalBusiness without
			// a real, visitable premises is a Google structured-data policy
			// violation, so this is gated deliberately. LocalBusiness is a subtype
			// of Organization, so every field already set (logo / sameAs /
			// contactPoint) stays valid; it additionally unlocks
			// openingHoursSpecification — the "open now" / local-pack signal.
			// Specific subtypes (e.g. FoodEstablishment), geo, and structured
			// address parts are a tracked follow-up needing new Site Info fields.
			if ( isset( $address['addressLocality'] ) && '' !== $address['addressLocality'] ) {
				$org['@type'] = 'LocalBusiness';

				// openingHoursSpecification — only valid on LocalBusiness. Built
				// from the Site Info opening-hours fields; any day whose free-text
				// value doesn't parse cleanly to a single HH:MM–HH:MM range is
				// omitted (never emit guessed or contradictory hours).
				$hours = self::build_opening_hours();
				if ( ! empty( $hours ) ) {
					$org['openingHoursSpecification'] = $hours;
				}
			}
		}

		// sameAs — social profile URLs from the Site Info store.
		$same_as = self::build_same_as();
		if ( ! empty( $same_as ) ) {
			$org['sameAs'] = $same_as;
		}

		// contactPoint — phone / email from the Site Info store.
		$contact_point = self::build_contact_point();
		if ( null !== $contact_point ) {
			$org['contactPoint'] = $contact_point;
		}

		// hasMerchantReturnPolicy — reuse sgs_configurator_returns (F1 country rule).
		$returns = \get_option( 'sgs_configurator_returns' );
		if ( \is_array( $returns ) && ! empty( $returns ) ) {
			$raw_cc = (string) \get_option( 'woocommerce_default_country', '' );
			// Strip region suffix: 'GB:ENG' becomes 'GB'; empty string stays empty.
			$cc = \strtoupper( \strtok( $raw_cc, ':' ) );
			if ( \preg_match( '/^[A-Z]{2}$/', $cc ) ) {
				$returns['returnPolicyCountry'] = $cc; // runtime-only; never written back.
			}
			$org['hasMerchantReturnPolicy'] = $returns;
		}

		// hasShippingService — attach verbatim if stored.
		$shipping = \get_option( 'sgs_configurator_shipping' );
		if ( \is_array( $shipping ) && ! empty( $shipping ) ) {
			$org['hasShippingService'] = $shipping;
		}

		// ── WebSite node ──────────────────────────────────────────────────────
		$site = array(
			'@context'  => 'https://schema.org',
			'@type'     => 'WebSite',
			'@id'       => $site_id,
			'url'       => $home_url,
			'publisher' => array( '@id' => $org_id ),
		);

		// name — omit if empty.
		if ( '' !== $name ) {
			$site['name'] = $name;
		}

		// alternateName (tagline) — omit if empty.
		$tagline = \get_bloginfo( 'description' );
		if ( '' !== $tagline ) {
			$site['alternateName'] = $tagline;
		}

		// NO SearchAction (contract F2: explicitly excluded).

		// Emit both nodes.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json via Sgs_Schema::encode_jsonld() HEX flags, not HTML.
		echo Sgs_Schema::script_tag( $org );
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json via Sgs_Schema::encode_jsonld() HEX flags, not HTML.
		echo Sgs_Schema::script_tag( $site );

		self::$emitted = true;
	}

	/**
	 * Show a dismissible admin notice when an SEO plugin is active and org data
	 * appears incomplete — prompts the operator to configure the SEO plugin's
	 * Organisation settings.
	 *
	 * @return void
	 */
	public static function maybe_show_seo_plugin_notice(): void {
		if ( ! \current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! self::seo_plugin_active() ) {
			return;
		}
		// Dismissible via user meta.
		$dismissed = \get_user_meta( \get_current_user_id(), 'sgs_org_seo_notice_dismissed', true );
		if ( $dismissed ) {
			return;
		}
		$message = \sprintf(
			/* translators: %s: "Organisation" schema type name. */
			\__( '<strong>SGS Schema:</strong> An SEO plugin is active — SGS is deferring the <code>%s</code> and <code>WebSite</code> structured-data nodes to it. Please configure your SEO plugin\'s Organisation/Site Identity settings to ensure these are emitted correctly.', 'sgs-blocks' ),
			'Organization'
		);
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- format string is a hardcoded literal; inner content is wp_kses()-filtered.
		\printf(
			'<div class="notice notice-info is-dismissible sgs-org-seo-notice"><p>%s</p></div>',
			\wp_kses(
				$message,
				array(
					'strong' => array(),
					'code'   => array(),
				)
			)
		);
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Whether any of the 7 recognised SEO plugins is active (SEC-9, FR-30-9 F2).
	 *
	 * Canonical constant list — drop the brittle class_exists('RankMath') per contract.
	 * Keep callers of sgs_configurator_seo_plugin_active() working; this method is the
	 * expanded version used for site-identity (Org/WebSite) deferral.
	 *
	 * @return bool
	 */
	public static function seo_plugin_active(): bool {
		return \defined( 'WPSEO_VERSION' )                      // Yoast.
			|| \defined( 'RANK_MATH_VERSION' )                  // Rank Math.
			|| \defined( 'SEOPRESS_VERSION' )                   // SEOPress.
			|| \defined( 'AIOSEO_VERSION' )                     // All in One SEO.
			|| \function_exists( 'the_seo_framework' )          // The SEO Framework.
			|| \class_exists( 'SlimSEO\\Plugin', false )        // Slim SEO.
			|| \defined( 'SQ_VERSION' );                        // Squirrly.
	}

	/**
	 * Resolve the site logo URL: the rendered logo chain's site-level tiers
	 * (Site Info `logo` → `custom_logo`) → site icon → ''.
	 *
	 * Sharing {@see Sgs_Site_Info_Logo::resolve_id()} with the Logo block is what
	 * keeps the Organization node's `logo` the same image a visitor sees; reading
	 * `custom_logo` alone contradicted every rendered logo once a Site Info logo
	 * was chosen. Public so the resolution order is directly testable.
	 *
	 * @return string URL or ''.
	 */
	public static function resolve_logo_url(): string {
		$site_logo_id = Sgs_Site_Info_Logo::resolve_id();
		if ( $site_logo_id > 0 ) {
			$url = \wp_get_attachment_image_url( $site_logo_id, 'full' );
			if ( $url ) {
				return \esc_url_raw( (string) $url );
			}
		}
		// Fallback: site icon.
		$site_icon_id = (int) \get_option( 'site_icon' );
		if ( $site_icon_id > 0 ) {
			$url = \wp_get_attachment_image_url( $site_icon_id, 'full' );
			if ( $url ) {
				return \esc_url_raw( (string) $url );
			}
		}
		return '';
	}

	/**
	 * Build a PostalAddress array from WooCommerce store options.
	 *
	 * Called only when function_exists('WC') is true. A usable address needs a
	 * street (address line 1 or 2) or a locality (city); a country or postcode
	 * on its own is not an address, so the result is null and the caller falls
	 * back to the Site Info address.
	 *
	 * @return array|null PostalAddress array, or null when there is no street and no city.
	 */
	private static function build_address(): ?array {
		$line1    = \sanitize_text_field( (string) \get_option( 'woocommerce_store_address', '' ) );
		$line2    = \sanitize_text_field( (string) \get_option( 'woocommerce_store_address_2', '' ) );
		$city     = \sanitize_text_field( (string) \get_option( 'woocommerce_store_city', '' ) );
		$postcode = \sanitize_text_field( (string) \get_option( 'woocommerce_store_postcode', '' ) );
		$country  = self::store_country_code();

		if ( '' === $line1 && '' === $line2 && '' === $city ) {
			return null;
		}

		$address = array( '@type' => 'PostalAddress' );
		if ( '' !== $line1 ) {
			$address['streetAddress'] = $line1;
		}
		if ( '' !== $line2 ) {
			// Append to streetAddress if line1 exists, otherwise use it as streetAddress.
			if ( isset( $address['streetAddress'] ) ) {
				$address['streetAddress'] .= ', ' . $line2;
			} else {
				$address['streetAddress'] = $line2;
			}
		}
		if ( '' !== $city ) {
			$address['addressLocality'] = $city;
		}
		if ( '' !== $postcode ) {
			$address['postalCode'] = $postcode;
		}
		if ( '' !== $country ) {
			$address['addressCountry'] = $country;
		}

		return $address;
	}

	/**
	 * The store's ISO-3166-1 alpha-2 country code from woocommerce_default_country.
	 *
	 * The region suffix is stripped (GB from GB:ENG).
	 *
	 * @return string Two-letter upper-case code, or '' when unset or malformed.
	 */
	private static function store_country_code(): string {
		$raw_cc  = (string) \get_option( 'woocommerce_default_country', '' );
		$country = \strtoupper( (string) \strtok( $raw_cc, ':' ) );
		return \preg_match( '/^[A-Z]{2}$/', $country ) ? $country : '';
	}

	/**
	 * Add a country to a PostalAddress that does not already carry one.
	 *
	 * @param array  $address PostalAddress array.
	 * @param string $country ISO-3166-1 alpha-2 code ('' leaves the address unchanged).
	 * @return array The address, with addressCountry set when it was missing.
	 */
	private static function with_default_country( array $address, string $country ): array {
		if ( '' !== $country && empty( $address['addressCountry'] ) ) {
			$address['addressCountry'] = $country;
		}
		return $address;
	}

	/**
	 * Build a PostalAddress fallback from the Sgs_Site_Info 'address' field.
	 *
	 * Only called when build_address() (WC store settings) resolved to null, i.e.
	 * the store settings hold neither a street nor a city.
	 * Guarded by class_exists() so the emitter never fatals when the Site
	 * Info store isn't loaded.
	 *
	 * @return array|null PostalAddress array, or null when unavailable/empty.
	 */
	private static function build_address_from_site_info(): ?array {
		if ( ! \class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ) {
			return null;
		}

		$raw = (string) Sgs_Site_Info::get( 'address', '' );
		if ( '' === $raw ) {
			return null;
		}

		// The Site Info 'address' field is multi-line (operators enter it as
		// street / town / postcode / country separated by <br>). Parse those
		// lines into structured PostalAddress parts so a complete address can
		// drive the LocalBusiness upgrade; fall back to a single streetAddress
		// line when the structure can't be confidently identified.
		return self::parse_multiline_address( $raw );
	}

	/**
	 * Parse a <br>/newline-separated address blob into a PostalAddress.
	 *
	 * A recognised UK country name (last line) is detected and stripped. The
	 * last remaining line is then read as one of:
	 * - a UK postcode on its own line (postalCode; the line before it is the
	 *   locality); or
	 * - text followed by a UK postcode, "Birmingham B8 2HQ" or
	 *   "Birmingham, B8 2HQ" (locality "Birmingham", postalCode "B8 2HQ").
	 * Postcodes are upper-cased with a single internal space. A locality is only
	 * assigned when a postcode or country was confidently identified AND a street
	 * line precedes it, so a non-UK or unstructured value never has a line
	 * guessed as its town. When no locality can be identified the whole value is
	 * kept as a single streetAddress (node stays Organization). Returns null
	 * only when the value is empty.
	 *
	 * @param string $raw Raw address value (may contain <br>).
	 * @return array|null PostalAddress array or null.
	 */
	private static function parse_multiline_address( string $raw ): ?array {
		$split = \preg_split( '/\s*(?:<br\s*\/?>|\r\n|\r|\n)\s*/i', $raw );
		$lines = array();
		foreach ( (array) $split as $line ) {
			// A line ends in a comma when the editor writes "street,<br>town,<br>country"; the comma is a separator, not part of the value.
			$clean = \trim( \sanitize_text_field( (string) $line ), " \t," );
			if ( '' !== $clean ) {
				$lines[] = $clean;
			}
		}
		if ( empty( $lines ) ) {
			return null;
		}

		$country  = '';
		$postcode = '';
		$locality = '';

		$uk_names = array( 'united kingdom', 'uk', 'u.k.', 'great britain', 'gb', 'england', 'scotland', 'wales', 'northern ireland' );

		// Country: last line, only when it is a recognised UK country name.
		if ( \count( $lines ) > 1 && \in_array( \strtolower( $lines[ \count( $lines ) - 1 ] ), $uk_names, true ) ) {
			$country = 'GB';
			\array_pop( $lines );
		}

		// Postcode: last remaining line, only when it matches the UK postcode shape,
		// either alone ("B8 2HQ") or after the town ("Birmingham B8 2HQ").
		$postcode_shape = '[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}';
		if ( \count( $lines ) > 1 ) {
			$last = $lines[ \count( $lines ) - 1 ];
			if ( \preg_match( '/^' . $postcode_shape . '$/i', $last ) ) {
				$postcode = self::normalise_uk_postcode( $last );
				\array_pop( $lines );
			} elseif ( \preg_match( '/^([^\d]*?[^\d\s,])[\s,]+(' . $postcode_shape . ')$/i', $last, $m ) ) {
				// Only digit-free text before the postcode is read as a town: '12 High Street, B1 1AA'
				// is a street line, so it falls through and is kept whole (never guess a town).
				$postcode = self::normalise_uk_postcode( $m[2] );
				$locality = \trim( $m[1], " \t," );
				\array_pop( $lines );
			}
		}

		// Locality: the last remaining line, but ONLY when a postcode/country was
		// confidently identified AND a street line precedes it (never guess a town).
		if ( '' === $locality && \count( $lines ) >= 2 && ( '' !== $postcode || '' !== $country ) ) {
			$locality = \array_pop( $lines );
		}

		$street = \implode( ', ', $lines );

		$address = array( '@type' => 'PostalAddress' );
		if ( '' !== $street ) {
			$address['streetAddress'] = $street;
		}
		if ( '' !== $locality ) {
			$address['addressLocality'] = $locality;
		}
		if ( '' !== $postcode ) {
			$address['postalCode'] = $postcode;
		}
		if ( '' !== $country ) {
			$address['addressCountry'] = $country;
		}

		// Guard: nothing but @type survived → treat as no usable address.
		if ( 1 === \count( $address ) ) {
			return null;
		}

		return $address;
	}

	/**
	 * Upper-case a UK postcode and set a single space before the inward code.
	 *
	 * @param string $postcode A string already matched as a UK postcode.
	 * @return string Normalised postcode, e.g. "B8 2HQ".
	 */
	private static function normalise_uk_postcode( string $postcode ): string {
		$compact = \strtoupper( (string) \preg_replace( '/\s+/', '', $postcode ) );
		return \substr( $compact, 0, -3 ) . ' ' . \substr( $compact, -3 );
	}

	/**
	 * Collect valid social profile URLs from the Site Info store into a
	 * sameAs array. Guarded by class_exists(); skips empty/invalid URLs.
	 *
	 * @return string[] Numeric array of absolute URLs (may be empty).
	 */
	private static function build_same_as(): array {
		if ( ! \class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ) {
			return array();
		}

		$networks = array( 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'google' );
		$urls     = array();

		foreach ( $networks as $network ) {
			$raw = (string) Sgs_Site_Info::get( "socials.{$network}", '' );
			if ( '' === $raw ) {
				continue;
			}
			$url = \esc_url_raw( $raw );
			if ( '' === $url || false === \filter_var( $url, \FILTER_VALIDATE_URL ) ) {
				continue;
			}
			$urls[] = $url;
		}

		return \array_values( $urls );
	}

	/**
	 * Build a ContactPoint node from the Site Info store's phone / email
	 * fields. Guarded by class_exists(); returns null when both are empty
	 * or invalid so the caller omits contactPoint entirely.
	 *
	 * @return array|null ContactPoint array, or null when no valid contact data.
	 */
	private static function build_contact_point(): ?array {
		if ( ! \class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ) {
			return null;
		}

		$phone     = \sanitize_text_field( (string) Sgs_Site_Info::get( 'phone', '' ) );
		$email_raw = (string) Sgs_Site_Info::get( 'email', '' );
		$email     = '' !== $email_raw ? \sanitize_email( $email_raw ) : '';
		$has_email = '' !== $email && \is_email( $email );

		if ( '' === $phone && ! $has_email ) {
			return null;
		}

		$contact_point = array(
			'@type'       => 'ContactPoint',
			'contactType' => 'customer service',
		);
		if ( '' !== $phone ) {
			$contact_point['telephone'] = $phone;
		}
		if ( $has_email ) {
			$contact_point['email'] = $email;
		}

		return $contact_point;
	}

	/**
	 * Build an openingHoursSpecification array from the Site Info opening-hours
	 * fields (mon..sun, free text). Only emitted on a LocalBusiness node.
	 *
	 * Each day's stored value is operator free text with no enforced format. Every
	 * "start - end" range in it becomes one OpeningHoursSpecification, so split hours
	 * ("9:30am - 12pm, 2:30 - 5pm") give two nodes. A day that is empty or closed
	 * emits none (the schema has no "closed" property). The range rules are the
	 * ones the open-status script uses (src/blocks/business-info/open-status-logic.js
	 * ::parseDay); keep the two in step. Guarded by class_exists().
	 *
	 * @return array<int,array<string,string>> OpeningHoursSpecification nodes (may be empty).
	 */
	private static function build_opening_hours(): array {
		if ( ! \class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ) {
			return array();
		}

		$day_map = array(
			'mon' => 'Monday',
			'tue' => 'Tuesday',
			'wed' => 'Wednesday',
			'thu' => 'Thursday',
			'fri' => 'Friday',
			'sat' => 'Saturday',
			'sun' => 'Sunday',
		);

		$specs = array();
		foreach ( $day_map as $key => $day_name ) {
			$raw = \trim( (string) Sgs_Site_Info::get( "opening_hours.{$key}", '' ) );
			if ( '' === $raw ) {
				continue;
			}

			foreach ( self::parse_day_ranges( $raw ) as $range ) {
				$specs[] = array(
					'@type'     => 'OpeningHoursSpecification',
					'dayOfWeek' => $day_name,
					'opens'     => $range[0],
					'closes'    => $range[1],
				);
			}
		}

		return $specs;
	}

	/**
	 * Parse one day's free-text hours into 24-hour "HH:MM" ranges, mirroring
	 * open-status-logic.js::parseDay: a meridiem on one end borrows to the other end
	 * when that keeps the range forward ("9-5pm" is 09:00-17:00, "9am-5" is 09:00-17:00),
	 * a bare "9-5" closes in the afternoon, "Closed" before any range empties the day,
	 * "24 hours" is the whole day, and an end at or before its start runs past midnight.
	 *
	 * @param string $text One day's stored hours.
	 * @return array<int,array{0:string,1:string}> [opens, closes] pairs in order.
	 */
	private static function parse_day_ranges( string $text ): array {
		$source = \trim( $text );
		if ( '' === $source ) {
			return array();
		}
		$closed_re = '/\b(closed|shut)\b/i';
		if ( \preg_match( '/\b(24\s*(?:hours?|hrs?|h)|open\s*24|all\s*day)\b/i', $source ) && ! \preg_match( $closed_re, $source ) ) {
			return array( array( '00:00', '23:59' ) );
		}

		$time     = '(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?';
		$range_re = '/' . $time . '\s*(?:-|\x{2013}|\x{2014}|to|until|till)\s*' . $time . '/iu';

		if ( \preg_match( $closed_re, $source, $closed, \PREG_OFFSET_CAPTURE ) && ! \preg_match( $range_re, \substr( $source, 0, $closed[0][1] ) ) ) {
			return array();
		}
		if ( ! \preg_match_all( $range_re, $source, $all, \PREG_SET_ORDER ) ) {
			return array();
		}

		$ranges = array();
		foreach ( $all as $m ) {
			$m         = \array_pad( $m, 7, '' );
			$s_mer     = self::meridiem_of( $m[3] );
			$e_mer     = self::meridiem_of( $m[6] );
			$start     = self::to_minutes( $m[1], $m[2], '' !== $s_mer ? $s_mer : $e_mer );
			if ( '' === $s_mer && '' !== $e_mer ) {
				$end_probe = self::to_minutes( $m[4], $m[5], $e_mer );
				if ( $start >= $end_probe ) {
					$s_mer = 'pm' === $e_mer ? 'am' : 'pm';
					$start = self::to_minutes( $m[1], $m[2], $s_mer );
				}
			}
			if ( '' === $e_mer && '' !== $s_mer ) {
				$e_mer = $s_mer;
				if ( self::to_minutes( $m[4], $m[5], $e_mer ) <= $start ) {
					$e_mer = 'pm';
				}
			}
			$end = self::to_minutes( $m[4], $m[5], $e_mer );
			if ( '' === $s_mer && '' === $e_mer && $end <= $start && (int) $m[4] >= 1 && (int) $m[4] <= 8 && (int) $m[1] >= 5 && (int) $m[1] <= 12 ) {
				$end = self::to_minutes( $m[4], $m[5], 'pm' );
			}
			if ( $end <= $start ) {
				$end += 1440;
			}
			if ( $start >= 1440 || $end <= $start || (int) $m[1] > 23 || (int) $m[4] > 23 ) {
				continue;
			}
			$ranges[] = array( self::clock( $start ), self::clock( $end % 1440 ) );
		}
		return $ranges;
	}

	/**
	 * Normalise a captured meridiem ("a.m.", "PM") to '', 'am' or 'pm'.
	 *
	 * @param string $raw Captured text.
	 * @return string '', 'am' or 'pm'.
	 */
	private static function meridiem_of( string $raw ): string {
		return '' === $raw ? '' : \strtolower( \str_replace( '.', '', $raw ) );
	}

	/**
	 * One clock reading as minutes after midnight, honouring am/pm.
	 *
	 * @param string $hours    Hour digits.
	 * @param string $minutes  Minute digits or ''.
	 * @param string $meridiem '', 'am' or 'pm'.
	 * @return int Minutes after midnight.
	 */
	private static function to_minutes( string $hours, string $minutes, string $meridiem ): int {
		$h = (int) $hours;
		$m = '' !== $minutes ? (int) $minutes : 0;
		if ( 'am' === $meridiem && 12 === $h ) {
			$h = 0;
		} elseif ( 'pm' === $meridiem && $h < 12 ) {
			$h += 12;
		}
		return $h * 60 + $m;
	}

	/**
	 * Minutes after midnight as "HH:MM".
	 *
	 * @param int $minutes Minutes after midnight (0-1439).
	 * @return string "HH:MM".
	 */
	private static function clock( int $minutes ): string {
		return \sprintf( '%02d:%02d', \intdiv( $minutes, 60 ) % 24, $minutes % 60 );
	}
}
