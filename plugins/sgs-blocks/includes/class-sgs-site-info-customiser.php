<?php
/**
 * SGS Site Info — Customiser controls (Decision 21, Phase 5b).
 *
 * Registers an "SGS Site Info" section inside the WordPress Customiser
 * (Appearance → Customise → SGS Site Info) with controls for the core
 * business identity fields:
 *   Business name, phone, email, WhatsApp number, address (refresh — server rendered).
 *
 * All settings use `type => 'option'` and `transport => 'refresh'` because
 * Site Info values are rendered server-side into header/footer template parts —
 * a live postMessage update is not possible without a full server round-trip.
 *
 * Writes are forwarded through {@see Sgs_Site_Info::set()} so the canonical
 * sanitiser map in that class remains the single source of truth.
 *
 * The full Site Info admin page (class-sgs-site-info-admin.php) remains active
 * alongside this Customiser section — operators may use either surface.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Site_Info_Customiser
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Site_Info_Customiser {

	/** Capability gate — matches every other SGS admin surface. */
	const CAP = 'edit_theme_options';

	/**
	 * Wire the Customiser registration hook.
	 * Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'customize_register', array( __CLASS__, 'register_controls' ), 20 );
		\add_action( 'customize_save_after', array( __CLASS__, 'sync_to_site_info' ) );
	}

	// ── Customiser registration ───────────────────────────────────────────────

	/**
	 * Add the SGS Site Info section, settings, and controls to the Customiser.
	 *
	 * @param \WP_Customize_Manager $wp_customize The Customiser manager instance.
	 */
	public static function register_controls( \WP_Customize_Manager $wp_customize ): void {

		// -- Section ----------------------------------------------------------
		$wp_customize->add_section(
			'sgs_site_info',
			array(
				'title'       => \__( 'SGS Site Info', 'sgs-blocks' ),
				'priority'    => 150,
				'capability'  => self::CAP,
				'description' => \__( 'Core business details used across your site — headers, footers, and contact blocks all read from these fields. Changes require a page refresh to preview. Full editing (social links, opening hours, custom fields) is available via SGS → Site Info.', 'sgs-blocks' ),
			)
		);

		// -- Business name ----------------------------------------------------
		// Stored under Sgs_Site_Info option as key 'business_name'.
		$wp_customize->add_setting(
			'sgs_site_info_customiser[business_name]',
			array(
				'type'              => 'option',
				'default'           => '',
				'capability'        => self::CAP,
				'sanitize_callback' => 'sanitize_text_field',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			'sgs_site_info_customiser[business_name]',
			array(
				'label'    => \__( 'Business name', 'sgs-blocks' ),
				'section'  => 'sgs_site_info',
				'type'     => 'text',
				'priority' => 10,
			)
		);

		// -- Phone ------------------------------------------------------------
		$wp_customize->add_setting(
			'sgs_site_info_customiser[phone]',
			array(
				'type'              => 'option',
				'default'           => '',
				'capability'        => self::CAP,
				'sanitize_callback' => 'sanitize_text_field',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			'sgs_site_info_customiser[phone]',
			array(
				'label'    => \__( 'Phone', 'sgs-blocks' ),
				'section'  => 'sgs_site_info',
				'type'     => 'tel',
				'priority' => 20,
			)
		);

		// -- Email ------------------------------------------------------------
		$wp_customize->add_setting(
			'sgs_site_info_customiser[email]',
			array(
				'type'              => 'option',
				'default'           => '',
				'capability'        => self::CAP,
				'sanitize_callback' => 'sanitize_email',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			'sgs_site_info_customiser[email]',
			array(
				'label'    => \__( 'Email', 'sgs-blocks' ),
				'section'  => 'sgs_site_info',
				'type'     => 'email',
				'priority' => 30,
			)
		);

		// -- WhatsApp number --------------------------------------------------
		$wp_customize->add_setting(
			'sgs_site_info_customiser[socials_whatsapp]',
			array(
				'type'              => 'option',
				'default'           => '',
				'capability'        => self::CAP,
				'sanitize_callback' => 'sanitize_text_field',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			'sgs_site_info_customiser[socials_whatsapp]',
			array(
				'label'       => \__( 'WhatsApp number', 'sgs-blocks' ),
				'description' => \__( 'International format, e.g. +441234567890', 'sgs-blocks' ),
				'section'     => 'sgs_site_info',
				'type'        => 'text',
				'priority'    => 40,
			)
		);

		// -- Address ----------------------------------------------------------
		$wp_customize->add_setting(
			'sgs_site_info_customiser[address]',
			array(
				'type'              => 'option',
				'default'           => '',
				'capability'        => self::CAP,
				'sanitize_callback' => 'sanitize_textarea_field',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			'sgs_site_info_customiser[address]',
			array(
				'label'    => \__( 'Address', 'sgs-blocks' ),
				'section'  => 'sgs_site_info',
				'type'     => 'textarea',
				'priority' => 50,
			)
		);

		// -- Full settings link -----------------------------------------------
		$wp_customize->add_setting(
			'sgs_site_info_customiser_link',
			array(
				'type'      => 'option',
				'transport' => 'refresh',
				'default'   => '',
			)
		);
		$wp_customize->add_control(
			new Sgs_Customiser_Info_Control(
				$wp_customize,
				'sgs_site_info_customiser_link',
				array(
					'label'       => \__( 'Full site info settings', 'sgs-blocks' ),
					// translators: %s: URL of the SGS Site Info admin page.
					'description' => \__( 'Edit social links, opening hours, and custom fields. <a href="%s" target="_blank">Open Site Info settings →</a>', 'sgs-blocks' ),
					'section'     => 'sgs_site_info',
					'priority'    => 60,
					'admin_url'   => \admin_url( 'admin.php?page=sgs-site-info' ),
				)
			)
		);
	}

	// ── Save pipeline ─────────────────────────────────────────────────────────

	/**
	 * Handle saves from the Customiser form. The WP Settings API fires
	 * `customize_save_after` — we hook there to forward submitted Customiser
	 * option values to {@see Sgs_Site_Info::set()}, which enforces the
	 * canonical sanitiser map.
	 *
	 * Registered via add_action in {@see self::register()}.
	 *
	 * Note: The WP Customiser stores each `type => 'option'` setting under the
	 * option key provided (e.g. `sgs_site_info_customiser[phone]`). We
	 * intercept after save and mirror the values into the canonical
	 * `sgs_site_info` store so all blocks that call `Sgs_Site_Info::get()`
	 * see the Customiser changes immediately.
	 */
	public static function sync_to_site_info(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			return;
		}

		$raw = \get_option( 'sgs_site_info_customiser', array() );
		if ( ! is_array( $raw ) ) {
			return;
		}

		$key_map = array(
			'business_name'    => 'business_name',
			'phone'            => 'phone',
			'email'            => 'email',
			'address'          => 'address',
			'socials_whatsapp' => 'socials.whatsapp',
		);

		foreach ( $key_map as $customiser_key => $site_info_key ) {
			if ( array_key_exists( $customiser_key, $raw ) ) {
				Sgs_Site_Info::set( $site_info_key, $raw[ $customiser_key ] );
			}
		}

		// Clean up the transient Customiser option once synced — the canonical
		// store is sgs_site_info; we don't need the duplicate.
		\delete_option( 'sgs_site_info_customiser' );
	}
}
