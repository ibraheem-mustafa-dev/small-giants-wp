<?php
/**
 * Migration 0003 — Business Details retirement: lift Maps CID + fix WhatsApp URL.
 *
 * Closes two gaps found when retiring the theme's Business Details settings
 * page (`SGS\Theme\Business_Details`) in favour of the single Sgs_Site_Info
 * store:
 *
 * 1. Business Details' "Google Maps CID" field (`sgs_business_maps_cid`) had
 *    no Site Info equivalent until this release added `maps_cid`. Lift the
 *    legacy value across, same idempotent "only when empty" rule as 0002.
 *
 * 2. Migration 0002 lifted `sgs_business_whatsapp` — a bare PHONE NUMBER
 *    (e.g. "+447700000000", sanitised with a digits/+/spaces/hyphens/
 *    parentheses filter) — directly into `socials.whatsapp`, which Site
 *    Info's admin UI presents as a `type="url"` field and every reader
 *    (sgs/social-icons via Sgs_Site_Info::get('socials.whatsapp')) treats as
 *    a full URL to `esc_url()` into an `href`. A bare phone number is not a
 *    valid URL, so the WhatsApp icon/link silently broke on every site 0002
 *    ran on. This migration converts the legacy phone number into a proper
 *    `https://wa.me/<digits>` link and repairs `socials.whatsapp` — but only
 *    when the current value has no URL scheme, so an operator's own manual
 *    entry (or a value already fixed) is never overwritten.
 *
 * Idempotent — safe to re-trigger; only fills empty/broken values.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use SGS\Blocks\Sgs_Site_Info;

return array(
	'version' => '1.1.1',

	/**
	 * Up — lift Maps CID and repair the WhatsApp social URL.
	 */
	'up'      => static function (): void {
		if ( ! function_exists( 'sgs_migration_0003_lift_maps_cid_and_fix_whatsapp' ) ) {

			/**
			 * Lift the legacy Google Maps CID into Site Info, only when empty.
			 */
			function sgs_migration_0003_lift_maps_cid(): void {
				$legacy = get_option( 'sgs_business_maps_cid', '' );
				if ( '' === $legacy || null === $legacy ) {
					return;
				}
				$existing = Sgs_Site_Info::get( 'maps_cid', '' );
				if ( '' === $existing || null === $existing ) {
					Sgs_Site_Info::set_internal( 'maps_cid', $legacy );
				}
			}

			/**
			 * Repair `socials.whatsapp` when it holds a bare phone number
			 * (either the raw legacy option, never migrated, or the broken
			 * output migration 0002 wrote before this fix existed).
			 */
			function sgs_migration_0003_fix_whatsapp_url(): void {
				$legacy_phone = (string) get_option( 'sgs_business_whatsapp', '' );
				if ( '' === $legacy_phone ) {
					return;
				}

				$current = (string) Sgs_Site_Info::get( 'socials.whatsapp', '' );

				// A genuine URL already has a scheme — never overwrite an
				// operator's own entry or an already-correct value.
				if ( '' !== $current && 0 === strpos( $current, 'http' ) ) {
					return;
				}

				$digits = preg_replace( '/[^0-9]/', '', $legacy_phone );
				if ( '' === $digits ) {
					return;
				}

				Sgs_Site_Info::set_internal( 'socials.whatsapp', 'https://wa.me/' . $digits );
			}

			/**
			 * Migration body.
			 */
			function sgs_migration_0003_lift_maps_cid_and_fix_whatsapp(): void {
				sgs_migration_0003_lift_maps_cid();
				sgs_migration_0003_fix_whatsapp_url();
			}
		}

		sgs_migration_0003_lift_maps_cid_and_fix_whatsapp();
	},

	/**
	 * Down — not implemented (see parking P-S17-G).
	 */
	'down'    => null,
);
