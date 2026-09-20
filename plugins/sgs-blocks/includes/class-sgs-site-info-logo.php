<?php
/**
 * SGS Site Info — the `logo` key's sanitiser and resolver (FR-36-22).
 *
 * Owns every read and write rule for the site logo: what a valid value is, what
 * the stored ID resolves to at read time, and the order of the site-level tiers.
 * Every consumer (the block render, the block-bindings source, the admin picker,
 * the Organization JSON-LD emitter) reads the logo through this class so there is
 * one resolution order and no parallel copy of it.
 *
 * {@see Sgs_Site_Info} holds the store itself and registers self::sanitise() as
 * the `logo` key's sanitiser.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-site-info.php';

/**
 * Class Sgs_Site_Info_Logo
 *
 * Public static API for the Site Info `logo` key.
 */
final class Sgs_Site_Info_Logo {

	/** The Site Info key this class owns. */
	const KEY = 'logo';

	/**
	 * Sanitise the `logo` key — an image attachment ID, or '' to clear it.
	 *
	 * Anything that is not a positive integer naming an existing image
	 * attachment is stored as '' (the "unset" state used by every other key).
	 *
	 * @param  mixed $raw Raw submitted value.
	 * @return int|string Attachment ID, or '' when invalid or empty.
	 */
	public static function sanitise( $raw ) {
		$id = self::to_attachment_id( $raw );
		return ( $id > 0 && self::is_usable_attachment( $id ) ) ? $id : '';
	}

	/**
	 * The site logo's attachment ID from the `logo` key (logo chain tier 2).
	 *
	 * Validated on every read, not only on save: an attachment deleted after it
	 * was chosen, or one that is not an image, yields 0 so the caller falls
	 * through to the next tier instead of rendering a broken logo.
	 *
	 * @return int Attachment ID, or 0 when unset or no longer a usable image.
	 */
	public static function get_id(): int {
		$id = self::to_attachment_id( Sgs_Site_Info::get( self::KEY, 0 ) );
		return ( $id > 0 && self::is_usable_attachment( $id ) ) ? $id : 0;
	}

	/**
	 * Resolve the site-level logo attachment ID: Site Info `logo` first, then
	 * WordPress core's `custom_logo` theme mod (FR-36-22 tiers 2 and 3).
	 *
	 * The block's own per-device image (tier 1) is decided by the block and is
	 * deliberately not consulted here.
	 *
	 * @return int Attachment ID, or 0 when neither tier is set.
	 */
	public static function resolve_id(): int {
		$id = self::get_id();
		if ( $id > 0 ) {
			return $id;
		}
		return \absint( \get_theme_mod( 'custom_logo', 0 ) );
	}

	/**
	 * Cast a stored or submitted value to an attachment ID: a positive integer, else 0.
	 * Negative numbers are rejected rather than folded positive by absint().
	 *
	 * @param  mixed $raw Raw value.
	 * @return int
	 */
	private static function to_attachment_id( $raw ): int {
		return ( \is_numeric( $raw ) && (int) $raw > 0 ) ? \absint( $raw ) : 0;
	}

	/**
	 * Whether an attachment ID is an image that resolves to a URL.
	 *
	 * @param  int $id Attachment ID.
	 * @return bool
	 */
	private static function is_usable_attachment( int $id ): bool {
		return \wp_attachment_is_image( $id ) && '' !== (string) \wp_get_attachment_url( $id );
	}
}
