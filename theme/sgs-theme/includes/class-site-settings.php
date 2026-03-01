<?php
/**
 * SGS Theme — Site Settings
 *
 * Registers a WP Customiser section ("SGS Site Info") with controls for all
 * centralised contact and business details. This file is namespaced under
 * SGS\Theme and handles only the Customiser registration and runtime filters.
 *
 * The sgs_get_*() helper functions used in templates and block render.php
 * files live in the global namespace inside includes/template-tags.php.
 *
 * @package SGS\Theme
 *
 * @since 1.0.0
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Register Customiser section, settings, and controls for site-wide
 * contact and business details.
 *
 * @param \WP_Customize_Manager $wp_customize Customiser manager instance.
 *
 * @since 1.0.0
 */
function site_settings_customiser( \WP_Customize_Manager $wp_customize ): void {

	/* ------------------------------------------------------------------ */
	/* Section                                                              */
	/* ------------------------------------------------------------------ */

	$wp_customize->add_section(
		'sgs_site_info',
		[
			'title'       => __( 'SGS Site Info', 'sgs-theme' ),
			'description' => __( 'Centralised contact and business details used throughout the site. Edit once — updated everywhere.', 'sgs-theme' ),
			'priority'    => 30,
		]
	);

	/* ------------------------------------------------------------------ */
	/* Helper closure: register one setting + matching text control         */
	/* ------------------------------------------------------------------ */

	/**
	 * Shorthand to add a theme_mod setting and a matching control.
	 *
	 * @param string $id          Setting ID (doubles as control ID).
	 * @param string $label       Human-readable label.
	 * @param string $default     Default value.
	 * @param string $sanitize_cb Sanitise callback name.
	 * @param string $type        Input type: 'text', 'email', 'url', 'textarea'.
	 * @param string $description Optional description shown below the control.
	 */
	$add_field = function (
		string $id,
		string $label,
		string $default = '',
		string $sanitize_cb = 'sanitize_text_field',
		string $type = 'text',
		string $description = ''
	) use ( $wp_customize ): void {

		$wp_customize->add_setting(
			$id,
			[
				'default'           => $default,
				'type'              => 'theme_mod',
				'sanitize_callback' => $sanitize_cb,
				'transport'         => 'refresh',
			]
		);

		$wp_customize->add_control(
			$id,
			[
				'label'       => $label,
				'section'     => 'sgs_site_info',
				'settings'    => $id,
				'type'        => $type,
				'description' => $description,
			]
		);
	};

	/* ------------------------------------------------------------------ */
	/* Business Identity                                                    */
	/* ------------------------------------------------------------------ */

	$add_field(
		'sgs_business_name',
		__( 'Business Name', 'sgs-theme' ),
		get_bloginfo( 'name' ),
		'sanitize_text_field',
		'text',
		__( 'Used in copyright notices and anywhere the business name appears.', 'sgs-theme' )
	);

	/* ------------------------------------------------------------------ */
	/* Contact Details                                                      */
	/* ------------------------------------------------------------------ */

	$add_field(
		'sgs_phone',
		__( 'Main Phone Number', 'sgs-theme' ),
		'+44 (0) 000 000 0000',
		'sanitize_text_field',
		'text',
		__( 'Displayed as a clickable tel: link. Include the country code for international callers.', 'sgs-theme' )
	);

	$add_field(
		'sgs_email',
		__( 'Main Email Address', 'sgs-theme' ),
		'hello@example.com',
		'sanitize_email',
		'email'
	);

	$add_field(
		'sgs_whatsapp',
		__( 'WhatsApp Number (International Format)', 'sgs-theme' ),
		'',
		'sanitize_text_field',
		'text',
		__( 'E.g. +447911123456 — no spaces or dashes. Used for WhatsApp deep-links.', 'sgs-theme' )
	);

	/* ------------------------------------------------------------------ */
	/* Address                                                              */
	/* ------------------------------------------------------------------ */

	$add_field(
		'sgs_address_line1',
		__( 'Address Line 1', 'sgs-theme' ),
		'',
		'sanitize_text_field'
	);

	$add_field(
		'sgs_address_line2',
		__( 'Address Line 2', 'sgs-theme' ),
		'',
		'sanitize_text_field'
	);

	$add_field(
		'sgs_city',
		__( 'City', 'sgs-theme' ),
		'',
		'sanitize_text_field'
	);

	$add_field(
		'sgs_postcode',
		__( 'Postcode', 'sgs-theme' ),
		'',
		'sanitize_text_field'
	);

	$add_field(
		'sgs_country',
		__( 'Country', 'sgs-theme' ),
		'United Kingdom',
		'sanitize_text_field'
	);

	/* ------------------------------------------------------------------ */
	/* Social Media URLs                                                    */
	/* ------------------------------------------------------------------ */

	$add_field(
		'sgs_linkedin_url',
		__( 'LinkedIn URL', 'sgs-theme' ),
		'',
		'esc_url_raw',
		'url'
	);

	$add_field(
		'sgs_facebook_url',
		__( 'Facebook URL', 'sgs-theme' ),
		'',
		'esc_url_raw',
		'url'
	);

	$add_field(
		'sgs_instagram_url',
		__( 'Instagram URL', 'sgs-theme' ),
		'',
		'esc_url_raw',
		'url'
	);

	$add_field(
		'sgs_twitter_url',
		__( 'X / Twitter URL', 'sgs-theme' ),
		'',
		'esc_url_raw',
		'url'
	);

	/* ------------------------------------------------------------------ */
	/* Map & Copyright                                                      */
	/* ------------------------------------------------------------------ */

	$add_field(
		'sgs_google_maps_embed',
		__( 'Google Maps Embed src URL', 'sgs-theme' ),
		'',
		'esc_url_raw',
		'textarea',
		__( 'Paste the src= URL from a Google Maps embed iframe (not the full iframe tag — just the URL).', 'sgs-theme' )
	);

	$add_field(
		'sgs_copyright_text',
		__( 'Copyright Line', 'sgs-theme' ),
		'&copy; {year} {business_name}. All rights reserved.',
		'sanitize_text_field',
		'text',
		__( 'Tokens: {year} → current year, {business_name} → business name above.', 'sgs-theme' )
	);
}

add_action( 'customize_register', __NAMESPACE__ . '\site_settings_customiser' );

/**
 * Substitute the sgs_whatsapp Customiser value into any sgs/whatsapp-cta
 * block before it is rendered. This allows the WhatsApp number to be managed
 * centrally from Appearance → Customise → SGS Site Info without editing each
 * block instance individually.
 *
 * @param array $parsed_block Parsed block data (blockName, attrs, innerBlocks, …).
 *
 * @return array Possibly modified parsed block data.
 *
 * @since 1.0.0
 */
function inject_whatsapp_number( array $parsed_block ): array {
	if ( 'sgs/whatsapp-cta' !== ( $parsed_block['blockName'] ?? '' ) ) {
		return $parsed_block;
	}

	$whatsapp = sgs_get_whatsapp();
	if ( ! empty( $whatsapp ) ) {
		$parsed_block['attrs']['phoneNumber'] = $whatsapp;
	}

	return $parsed_block;
}

add_filter( 'render_block_data', __NAMESPACE__ . '\inject_whatsapp_number' );

/**
 * Substitute Customiser social media URLs into core/social-link blocks.
 *
 * The core/social-links block stores URLs statically in block markup.
 * This filter replaces them at render time with the values set in
 * Appearance → Customise → SGS Site Info, so the header social icons
 * always reflect the latest Customiser settings without editing templates.
 *
 * Only substitutes when the Customiser value is non-empty; placeholder
 * URLs (e.g. "#") are always replaced by the Customiser value if one exists.
 *
 * @param array $parsed_block Parsed block data (blockName, attrs, ...).
 *
 * @return array Possibly modified parsed block data.
 *
 * @since 1.0.0
 */
function inject_social_urls( array $parsed_block ): array {
	if ( 'core/social-link' !== ( $parsed_block['blockName'] ?? '' ) ) {
		return $parsed_block;
	}

	$service = $parsed_block['attrs']['service'] ?? '';
	if ( empty( $service ) ) {
		return $parsed_block;
	}

	// Map core/social-link service slugs to our Customiser keys.
	$service_map = [
		'linkedin'  => 'sgs_linkedin_url',
		'facebook'  => 'sgs_facebook_url',
		'instagram' => 'sgs_instagram_url',
		'twitter'   => 'sgs_twitter_url',
		'x'         => 'sgs_twitter_url', // 'x' is the newer slug for Twitter/X.
	];

	if ( ! isset( $service_map[ $service ] ) ) {
		return $parsed_block;
	}

	$customiser_url = (string) get_theme_mod( $service_map[ $service ], '' );
	if ( ! empty( $customiser_url ) ) {
		$parsed_block['attrs']['url'] = $customiser_url;
	}

	return $parsed_block;
}

add_filter( 'render_block_data', __NAMESPACE__ . '\inject_social_urls' );
