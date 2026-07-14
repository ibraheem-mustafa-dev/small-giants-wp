<?php
/**
 * SGS Site Info — admin settings page (FR-S4-3, Spec 17 Wave 2).
 *
 * Renders an Appearance > SGS Site Info screen that lets non-coder operators
 * edit the business data stored in {@see Sgs_Site_Info}. Uses the WordPress
 * Settings API (register_setting / add_settings_section / add_settings_field)
 * and routes every save through {@see Sgs_Site_Info::set()} so the public
 * sanitiser map remains the single source of truth.
 *
 * Capability: edit_theme_options. Nonce verification is handled by the
 * Settings API on options.php; direct POST attempts are validated again here
 * before delegating to the store. Logo control deep-links to the Site Editor
 * (no new media uploader). Custom fields enforce both client and server-side
 * key allowlist (lower-snake_case) and denylist (reserved option keys).
 *
 * Field renderers live in {@see Sgs_Site_Info_Admin_Fields} to keep both
 * files under the 300-line file-length budget.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Site_Info_Admin
 *
 * Hook wiring, Settings API registration, save pipeline, reset handler, and
 * page shell. Renderer methods are delegated to Sgs_Site_Info_Admin_Fields.
 */
final class Sgs_Site_Info_Admin {

	/** Page slug — used in URLs and as the do_settings_sections() argument. */
	const PAGE_SLUG = 'sgs-site-info';

	/** Settings option group passed to settings_fields() in the form. */
	const OPTION_GROUP = 'sgs_site_info_settings';

	/** Capability gate for both the menu and the save handler. */
	const CAP = 'edit_theme_options';

	/** Action name for the Reset to Empty admin-post handler. */
	const RESET_ACTION = 'sgs_site_info_reset';

	/**
	 * Wire WP hooks. Idempotent — safe to call from sgs-blocks.php bootstrap.
	 * Deprecated-block notice hooks are delegated to Sgs_Site_Info_Admin_Notices.
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		\add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		\add_action( 'admin_post_' . self::RESET_ACTION, array( __CLASS__, 'handle_reset' ) );
		\add_action( 'admin_enqueue_scripts', array( __CLASS__, 'maybe_enqueue_assets' ) );
		Sgs_Site_Info_Admin_Notices::register();
	}

	/**
	 * Register the page under the SGS top-level menu (FR-S5-1). Slug resolves
	 * at admin.php?page=sgs-site-info. Parent menu is registered by
	 * {@see Sgs_Admin_Menu::add_menu()} at admin_menu priority 5; this method
	 * runs at the default priority 10, so the parent exists by the time
	 * add_submenu_page is called.
	 */
	public static function add_menu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'SGS Site Info', 'sgs-blocks' ),
			\__( 'Site Info', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Register the composite option and the sections + fields. The store is
	 * posted as one array so the Settings API can round-trip the whole form
	 * to options.php; per-key sanitisation is delegated to Sgs_Site_Info::set().
	 */
	public static function register_settings(): void {
		\register_setting(
			self::OPTION_GROUP,
			Sgs_Site_Info::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitise_submission' ),
				'default'           => array(),
				// FR-S4-3 W1: keep phone/email/address out of the REST options
				// surface that WP 6.1+ exposes by default. Operators read this
				// option via Sgs_Site_Info::get(), never via /wp/v2/settings.
				'show_in_rest'      => false,
			)
		);

		$fields = 'SGS\\Blocks\\Sgs_Site_Info_Admin_Fields';

		// Identity / Logo (deep-link only — no uploader).
		\add_settings_section( 'sgs_site_info_identity', \__( 'Identity', 'sgs-blocks' ), array( $fields, 'render_identity_section' ), self::PAGE_SLUG );

		// Contact.
		\add_settings_section( 'sgs_site_info_contact', \__( 'Contact', 'sgs-blocks' ), array( $fields, 'render_contact_section' ), self::PAGE_SLUG );
		$contact = array(
			'phone'         => array( \__( 'Phone', 'sgs-blocks' ), 'tel' ),
			'email'         => array( \__( 'Email', 'sgs-blocks' ), 'email' ),
			'support_email' => array( \__( 'Support email', 'sgs-blocks' ), 'email' ),
		);
		foreach ( $contact as $key => $meta ) {
			\add_settings_field(
				'sgs_site_info_' . $key,
				$meta[0],
				array( $fields, 'render_input_field' ),
				self::PAGE_SLUG,
				'sgs_site_info_contact',
				array(
					'label_for' => 'sgs_site_info_' . $key,
					'key'       => $key,
					'type'      => $meta[1],
				)
			);
		}
		\add_settings_field(
			'sgs_site_info_address',
			\__( 'Address', 'sgs-blocks' ),
			array( $fields, 'render_address_field' ),
			self::PAGE_SLUG,
			'sgs_site_info_contact',
			array(
				'label_for' => 'sgs_site_info_address',
				'key'       => 'address',
			)
		);

		// Socials.
		\add_settings_section( 'sgs_site_info_socials', \__( 'Social media', 'sgs-blocks' ), array( $fields, 'render_socials_section' ), self::PAGE_SLUG );
		$social_labels = self::social_platform_labels();
		foreach ( array_keys( $social_labels ) as $platform ) {
			\add_settings_field(
				'sgs_site_info_socials_' . $platform,
				$social_labels[ $platform ],
				array( $fields, 'render_input_field' ),
				self::PAGE_SLUG,
				'sgs_site_info_socials',
				array(
					'label_for' => 'sgs_site_info_socials_' . $platform,
					'key'       => 'socials.' . $platform,
					'type'      => 'url',
				)
			);
		}

		// Opening hours.
		\add_settings_section( 'sgs_site_info_hours', \__( 'Opening hours', 'sgs-blocks' ), array( $fields, 'render_hours_section' ), self::PAGE_SLUG );
		$days = array(
			'mon' => \__( 'Monday', 'sgs-blocks' ),
			'tue' => \__( 'Tuesday', 'sgs-blocks' ),
			'wed' => \__( 'Wednesday', 'sgs-blocks' ),
			'thu' => \__( 'Thursday', 'sgs-blocks' ),
			'fri' => \__( 'Friday', 'sgs-blocks' ),
			'sat' => \__( 'Saturday', 'sgs-blocks' ),
			'sun' => \__( 'Sunday', 'sgs-blocks' ),
		);
		foreach ( $days as $slug => $label ) {
			\add_settings_field(
				'sgs_site_info_hours_' . $slug,
				$label,
				array( $fields, 'render_input_field' ),
				self::PAGE_SLUG,
				'sgs_site_info_hours',
				array(
					'label_for'   => 'sgs_site_info_hours_' . $slug,
					'key'         => 'opening_hours.' . $slug,
					'type'        => 'text',
					'placeholder' => \__( 'e.g. 09:00–17:30 or Closed', 'sgs-blocks' ),
				)
			);
		}

		// Copyright + tagline.
		\add_settings_section( 'sgs_site_info_copyright', \__( 'Copyright', 'sgs-blocks' ), array( $fields, 'render_copyright_section' ), self::PAGE_SLUG );
		\add_settings_field(
			'sgs_site_info_copyright',
			\__( 'Copyright line', 'sgs-blocks' ),
			array( $fields, 'render_input_field' ),
			self::PAGE_SLUG,
			'sgs_site_info_copyright',
			array(
				'label_for'   => 'sgs_site_info_copyright',
				'key'         => 'copyright',
				'type'        => 'text',
				'placeholder' => \__( 'e.g. © 2026 Acme Ltd', 'sgs-blocks' ),
			)
		);
		\add_settings_field(
			'sgs_site_info_tagline',
			\__( 'Tagline', 'sgs-blocks' ),
			array( $fields, 'render_input_field' ),
			self::PAGE_SLUG,
			'sgs_site_info_copyright',
			array(
				'label_for' => 'sgs_site_info_tagline',
				'key'       => 'tagline',
				'type'      => 'text',
			)
		);

		// Custom fields.
		\add_settings_section( 'sgs_site_info_custom', \__( 'Custom fields', 'sgs-blocks' ), array( $fields, 'render_custom_section' ), self::PAGE_SLUG );
		\add_settings_field(
			'sgs_site_info_custom_fields',
			\__( 'Custom key / value pairs', 'sgs-blocks' ),
			array( $fields, 'render_custom_fields' ),
			self::PAGE_SLUG,
			'sgs_site_info_custom'
		);
	}

	// -------------------------------------------------------------------------
	// Save pipeline
	// -------------------------------------------------------------------------

	/**
	 * Settings API sanitiser. Receives the whole posted store and forwards each
	 * leaf through Sgs_Site_Info::set(), which enforces capability, key
	 * allowlist, reserved-key denylist, and per-key sanitisation. Returns the
	 * freshly loaded snapshot so options.php persists exactly what the public
	 * API wrote.
	 *
	 * @param  mixed $raw Submitted form payload.
	 * @return array      Sanitised store snapshot.
	 */
	public static function sanitise_submission( $raw ): array {
		if ( ! \current_user_can( self::CAP ) ) {
			return Sgs_Site_Info::all();
		}
		if ( ! \is_array( $raw ) ) {
			return Sgs_Site_Info::all();
		}

		// 1. Flat well-known scalar keys.
		foreach ( array( 'phone', 'email', 'support_email', 'address', 'copyright', 'tagline', 'vat_number', 'registered_office' ) as $key ) {
			if ( \array_key_exists( $key, $raw ) ) {
				Sgs_Site_Info::set( $key, $raw[ $key ] );
			}
		}

		// 2. Dot-notation groups.
		$groups = array(
			'socials'       => array( 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'google' ),
			'opening_hours' => array( 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' ),
		);
		foreach ( $groups as $group => $sub_keys ) {
			if ( ! isset( $raw[ $group ] ) || ! \is_array( $raw[ $group ] ) ) {
				continue;
			}
			foreach ( $sub_keys as $sub ) {
				if ( \array_key_exists( $sub, $raw[ $group ] ) ) {
					Sgs_Site_Info::set( "{$group}.{$sub}", $raw[ $group ][ $sub ] );
				}
			}
		}

		// 3. Custom key/value rows.
		if ( isset( $raw['custom'] ) && \is_array( $raw['custom'] ) ) {
			foreach ( $raw['custom'] as $row ) {
				if ( ! \is_array( $row ) || ! isset( $row['key'] ) ) {
					continue;
				}
				$key = (string) $row['key'];
				if ( '' === $key ) {
					continue;
				}
				if ( ! self::is_valid_custom_key( $key ) ) {
					\add_settings_error(
						Sgs_Site_Info::OPTION_KEY,
						'sgs_site_info_invalid_key',
						\sprintf(
							/* translators: %s: rejected key. */
							\__( 'Custom field key %s rejected — keys must use lower-case letters, numbers, and underscores only, and must not be reserved.', 'sgs-blocks' ),
							'<code>' . \esc_html( $key ) . '</code>'
						)
					);
					continue;
				}
				Sgs_Site_Info::set( $key, $row['value'] ?? '' );
			}
		}

		return Sgs_Site_Info::all();
	}

	/**
	 * Server-side allowlist for custom-field keys. Mirrors the client pattern
	 * so a tampered POST cannot smuggle in a reserved option name or a key
	 * with HTML / script payload. Also used by the field renderer to filter
	 * which existing rows are surfaced for editing.
	 *
	 * @param  string $key Candidate key.
	 * @return bool        True when safe to forward to Sgs_Site_Info::set().
	 */
	public static function is_valid_custom_key( string $key ): bool {
		if ( '' === $key ) {
			return false;
		}
		if ( 1 !== \preg_match( '/^[a-z0-9_]+$/', $key ) ) {
			return false;
		}
		$reserved = array(
			'sgs_framework_version',
			'sgs_migrations_completed',
			'sgs_seeding_armed_at',
			'sgs_legacy_theme_mods_backup',
			'sgs_site_info_schema_version',
		);
		return ! \in_array( $key, $reserved, true );
	}

	/**
	 * Handle the Reset to Empty admin-post submission. Nonce + capability
	 * gated; on success, wipes the store and redirects back to the page.
	 */
	public static function handle_reset(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to reset site info.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::RESET_ACTION );
		Sgs_Site_Info::reset();
		\wp_safe_redirect(
			\add_query_arg(
				array(
					'page'       => self::PAGE_SLUG,
					'sgs-status' => 'reset',
				),
				\admin_url( 'admin.php' )
			)
		);
		exit;
	}

	// -------------------------------------------------------------------------
	// Page shell
	// -------------------------------------------------------------------------

	/**
	 * Render the page wrapper, settings form, and Reset to Empty form.
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$status = isset( $_GET['sgs-status'] ) ? \sanitize_key( \wp_unslash( $_GET['sgs-status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html( \get_admin_page_title() ) . '</h1>';
		echo '<p>' . \esc_html__( 'Edit the business data used across your site — headers, footers, contact blocks, and form notifications all read from these fields.', 'sgs-blocks' ) . '</p>';

		if ( 'reset' === $status ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Site Info reset to empty.', 'sgs-blocks' ) . '</p></div>';
		}

		\settings_errors( Sgs_Site_Info::OPTION_KEY );

		echo '<form method="post" action="options.php">';
		\settings_fields( self::OPTION_GROUP );
		\do_settings_sections( self::PAGE_SLUG );
		\submit_button( \__( 'Save changes', 'sgs-blocks' ) );
		echo '</form>';

		echo '<hr />';
		echo '<h2>' . \esc_html__( 'Reset', 'sgs-blocks' ) . '</h2>';
		echo '<p>' . \esc_html__( 'Wipe every Site Info value. This cannot be undone.', 'sgs-blocks' ) . '</p>';
		printf(
			'<form method="post" action="%s" onsubmit="return confirm(%s);">',
			\esc_url( \admin_url( 'admin-post.php' ) ),
			"'" . \esc_js( \__( 'Reset all Site Info values? This cannot be undone.', 'sgs-blocks' ) ) . "'"
		);
		printf( '<input type="hidden" name="action" value="%s" />', \esc_attr( self::RESET_ACTION ) );
		\wp_nonce_field( self::RESET_ACTION );
		\submit_button( \__( 'Reset to empty', 'sgs-blocks' ), 'delete', 'submit', false );
		echo '</form>';

		echo '</div>';
	}

	// -------------------------------------------------------------------------
	// W2 — Translatable social-platform labels
	// -------------------------------------------------------------------------

	/**
	 * Return the social-platform label map. Each label is wrapped in __() so
	 * non-English sites can translate them via the sgs-blocks text domain.
	 * The map is the single source of truth for which platforms render in the
	 * Socials section AND for which sub-keys the sanitiser accepts.
	 *
	 * @return array<string,string> Platform slug => translated label.
	 */
	public static function social_platform_labels(): array {
		return array(
			'facebook'  => \__( 'Facebook', 'sgs-blocks' ),
			'instagram' => \__( 'Instagram', 'sgs-blocks' ),
			'twitter'   => \__( 'Twitter / X', 'sgs-blocks' ),
			'linkedin'  => \__( 'LinkedIn', 'sgs-blocks' ),
			'youtube'   => \__( 'YouTube', 'sgs-blocks' ),
			'tiktok'    => \__( 'TikTok', 'sgs-blocks' ),
			'whatsapp'  => \__( 'WhatsApp', 'sgs-blocks' ),
			'google'    => \__( 'Google (Business Profile / reviews)', 'sgs-blocks' ),
		);
	}

	// -------------------------------------------------------------------------
	// W3 — Custom-fields repeater assets (Add Row / Remove Row JS + CSS)
	// -------------------------------------------------------------------------

	/**
	 * Enqueue the repeater JS + CSS on this admin page only. Hook suffix for
	 * sub-pages of a custom top-level menu follows the pattern
	 * {toplevel-slug}_page_{submenu-slug} — here `sgs_page_sgs-site-info`.
	 *
	 * @param string $hook Current admin page hook suffix.
	 */
	public static function maybe_enqueue_assets( string $hook ): void {
		if ( Sgs_Admin_Menu::MENU_SLUG . '_page_' . self::PAGE_SLUG !== $hook ) {
			return;
		}
		$version = defined( 'SGS_BLOCKS_VERSION' ) ? \SGS_BLOCKS_VERSION : '0.1.1';
		$base    = defined( 'SGS_BLOCKS_URL' ) ? \SGS_BLOCKS_URL : \plugins_url( '/', dirname( __DIR__ ) . '/sgs-blocks.php' );
		\wp_enqueue_script(
			'sgs-site-info-custom-fields',
			$base . 'assets/admin/site-info-custom-fields.js',
			array(),
			$version,
			true
		);
		\wp_enqueue_style(
			'sgs-site-info-custom-fields',
			$base . 'assets/admin/site-info-custom-fields.css',
			array(),
			$version
		);
	}
}
