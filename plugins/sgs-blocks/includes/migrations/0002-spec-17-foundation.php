<?php
/**
 * Migration 0002 — Spec 17 Foundation: FR-S4-4 business-info lift.
 *
 * Lifts legacy `sgs_business_*` and `sgs_social_*` wp_options into the
 * central Sgs_Site_Info store. Idempotent — never overwrites operator edits
 * made after the first run. Safe under WP-CLI / WP-cron contexts where no
 * user is logged in (uses Sgs_Site_Info::set_internal() to bypass the
 * edit_theme_options capability check).
 *
 * See: .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S4 FR-S4-4
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use SGS\Blocks\Sgs_Site_Info;

return array(
	'version' => '1.1.0',

	/**
	 * Up — lift legacy business-info options into the Sgs_Site_Info store.
	 */
	'up'      => static function (): void {
		if ( ! function_exists( 'sgs_migration_0002_lift_business_info' ) ) {

			/**
			 * Set a Site Info key only when no existing value is present.
			 *
			 * Preserves operator edits made via the admin form between runs.
			 *
			 * @param string $key   Site Info dot-notation key.
			 * @param mixed  $value Raw value (will be sanitised by set_internal()).
			 */
			function sgs_migration_0002_set_if_empty( string $key, $value ): void {
				$existing = Sgs_Site_Info::get( $key, '' );
				if ( '' === $existing || null === $existing || array() === $existing ) {
					Sgs_Site_Info::set_internal( $key, $value );
				}
			}

			/**
			 * Lift body — flat keys, social URLs, address parts, opening hours.
			 */
			function sgs_migration_0002_lift_business_info(): void {
				// ── Flat keys + social URLs ─────────────────────────────────
				$map = array(
					'sgs_business_phone'     => 'phone',
					'sgs_business_email'     => 'email',
					'sgs_business_tagline'   => 'tagline',
					'sgs_business_copyright' => 'copyright',
					'sgs_business_name'      => 'copyright',
					'sgs_social_facebook'    => 'socials.facebook',
					'sgs_social_instagram'   => 'socials.instagram',
					'sgs_social_linkedin'    => 'socials.linkedin',
					'sgs_social_twitter'     => 'socials.twitter',
					'sgs_social_youtube'     => 'socials.youtube',
					'sgs_social_tiktok'      => 'socials.tiktok',
					'sgs_social_whatsapp'    => 'socials.whatsapp',
				);

				foreach ( $map as $legacy => $target ) {
					$val = get_option( $legacy, '' );
					if ( '' !== $val && null !== $val ) {
						sgs_migration_0002_set_if_empty( $target, $val );
					}
				}

				// ── Address parts — sanitise each part before joining ───────
				$parts = array_filter(
					array(
						get_option( 'sgs_business_street', '' ),
						get_option( 'sgs_business_line2', '' ),
						get_option( 'sgs_business_city', '' ),
						get_option( 'sgs_business_region', '' ),
						get_option( 'sgs_business_postcode', '' ),
						get_option( 'sgs_business_country', '' ),
					),
					static function ( $v ): bool {
						return '' !== (string) $v;
					}
				);

				if ( ! empty( $parts ) ) {
					$sanitised = array_map( 'sanitize_text_field', $parts );
					sgs_migration_0002_set_if_empty( 'address', implode( '<br>', $sanitised ) );
				}

				// ── Opening hours: monday..sunday → opening_hours.mon..sun ──
				$hours = get_option( 'sgs_business_hours', array() );
				if ( is_array( $hours ) && ! empty( $hours ) ) {
					$day_map = array(
						'monday'    => 'mon',
						'tuesday'   => 'tue',
						'wednesday' => 'wed',
						'thursday'  => 'thu',
						'friday'    => 'fri',
						'saturday'  => 'sat',
						'sunday'    => 'sun',
					);
					foreach ( $day_map as $legacy_day => $short_day ) {
						if ( isset( $hours[ $legacy_day ] ) && '' !== (string) $hours[ $legacy_day ] ) {
							sgs_migration_0002_set_if_empty(
								"opening_hours.{$short_day}",
								(string) $hours[ $legacy_day ]
							);
						}
					}
				}
			}
		}

		sgs_migration_0002_lift_business_info();
	},

	/**
	 * Down — not implemented (see parking P-S17-G).
	 */
	'down'    => null,
);
