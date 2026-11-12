<?php
/**
 * Loading and priority for one media slot (Spec 49 section 7.7).
 *
 * `resolve()` answers, per slot, whether its image loads eagerly, whether it takes the page's one
 * `fetchpriority="high"`, and what it claimed. First match wins:
 *   1. Inside a hidden surface: lazy, claims nothing.
 *   2. No page around it (REST, or the motion renderer not armed): lazy, never high.
 *   3. Load priority "first": eager, a lead candidate. "later": lazy.
 *   4. Above the fold (`Sgs_Motion_Fold::is_above_fold` with the page's `Sgs_Fold_Scan::section_count`): eager, at most
 *      `sgs_eager_image_limit` (16) per page.
 *   5. Otherwise lazy.
 * The lead is the first eager image that is not a `logo`, `layer` or `brand-strip` and has at least
 * `wp_min_priority_img_pixels` (50,000) square pixels. One lead per page, taken through a per-request claim.
 * A slot with different images per device is one image: the caller resolves it once.
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

use SGS\Blocks\Motion\Sgs_Fold_Scan;
use SGS\Blocks\Motion\Sgs_Motion_Fold;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

defined( 'ABSPATH' ) || exit;

/**
 * Per-request loading resolver.
 */
final class SGS_Media_Priority {

	/** Roles that are eager when above the fold but never lead. */
	private const NON_LEAD_ROLES = array( 'logo', 'layer', 'brand-strip' );

	/** WordPress's `wp_min_priority_img_pixels` default. */
	private const MIN_LEAD_PIXELS = 50000;

	/** Default for the `sgs_eager_image_limit` filter. */
	private const EAGER_LIMIT = 16;

	/**
	 * Eager images granted so far this request.
	 *
	 * @var int
	 */
	private static $eager_count = 0;

	/**
	 * Whether this request's `fetchpriority="high"` has been claimed.
	 *
	 * @var bool
	 */
	private static $lead_claimed = false;

	/**
	 * Section counts already read, by post ID.
	 *
	 * @var array<int,int>
	 */
	private static $section_counts = array();

	/**
	 * The eager limit, read once per request.
	 *
	 * @var int|null
	 */
	private static $limit = null;

	/**
	 * Resolve one slot's loading.
	 *
	 * `$context` keys: `hidden` (bool, inside a hidden surface), `load` ('first', 'later' or '' for automatic),
	 * `role` (string; 'logo', 'layer' and 'brand-strip' never lead), `width` and `height` (the image's pixel size).
	 * `$facts` keys, each read from the request when absent: `rest` (bool), `armed` (bool), `fold` (bool, the slot sits
	 * above the fold), or `tree` (parsed blocks) with `path` and `post_id` to compute it.
	 *
	 * @param array<string,mixed> $context The slot.
	 * @param array<string,mixed> $facts   The page facts.
	 * @return array{loading:string,fetchpriority:string,claims:array{eager:bool,lead:bool}}
	 */
	public static function resolve( array $context, array $facts = array() ): array {
		$lazy = array(
			'loading'       => 'lazy',
			'fetchpriority' => 'auto',
			'claims'        => array(
				'eager' => false,
				'lead'  => false,
			),
		);

		if ( ! empty( $context['hidden'] ) ) {
			return $lazy;
		}
		if ( self::is_rest( $facts ) || ! self::is_armed( $facts ) ) {
			return $lazy;
		}

		$load = (string) ( $context['load'] ?? '' );
		if ( 'later' === $load ) {
			return $lazy;
		}
		if ( 'first' !== $load ) {
			if ( ! self::above_fold( $facts ) || self::$eager_count >= self::eager_limit() ) {
				return $lazy;
			}
		}

		++self::$eager_count;
		$lead = self::claim_lead( $context );
		return array(
			'loading'       => 'eager',
			'fetchpriority' => $lead ? 'high' : 'auto',
			'claims'        => array(
				'eager' => true,
				'lead'  => $lead,
			),
		);
	}

	/**
	 * Clear the per-request state (tests, and a long-running worker between requests).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$eager_count    = 0;
		self::$lead_claimed   = false;
		self::$section_counts = array();
		self::$limit          = null;
	}

	/**
	 * Take the page's one `fetchpriority="high"` if this image may lead and nobody has.
	 *
	 * @param array<string,mixed> $context The slot.
	 * @return bool Whether this image took it.
	 */
	private static function claim_lead( array $context ): bool {
		if ( self::$lead_claimed || in_array( (string) ( $context['role'] ?? '' ), self::NON_LEAD_ROLES, true ) ) {
			return false;
		}
		$pixels = (int) ( $context['width'] ?? 0 ) * (int) ( $context['height'] ?? 0 );
		$floor  = (int) apply_filters( 'wp_min_priority_img_pixels', self::MIN_LEAD_PIXELS, $context );
		if ( $pixels < $floor ) {
			return false;
		}
		self::$lead_claimed = true;
		return true;
	}

	/**
	 * Whether the slot sits above the fold: the pure function over the armed tree, else the renderer's own frame.
	 *
	 * @param array<string,mixed> $facts The page facts.
	 * @return bool
	 */
	private static function above_fold( array $facts ): bool {
		if ( isset( $facts['fold'] ) ) {
			return (bool) $facts['fold'];
		}
		if ( isset( $facts['tree'], $facts['path'] ) && is_array( $facts['tree'] ) && is_array( $facts['path'] ) ) {
			$post_id = (int) ( $facts['post_id'] ?? 0 );
			if ( ! isset( self::$section_counts[ $post_id ] ) ) {
				self::$section_counts[ $post_id ] = $post_id > 0
					? Sgs_Fold_Scan::section_count( $post_id )
					: Sgs_Motion_Fold::FOLD_SECTIONS;
			}
			return Sgs_Motion_Fold::is_above_fold( $facts['tree'], $facts['path'], self::$section_counts[ $post_id ] );
		}
		return Sgs_Motion_Renderer::in_above_fold();
	}

	/**
	 * Whether the request is a REST render (the editor's block renderer): no page around the block.
	 *
	 * @param array<string,mixed> $facts The page facts.
	 * @return bool
	 */
	private static function is_rest( array $facts ): bool {
		if ( isset( $facts['rest'] ) ) {
			return (bool) $facts['rest'];
		}
		return defined( 'REST_REQUEST' ) && REST_REQUEST;
	}

	/**
	 * Whether the motion renderer is armed on the main content: an explicit `armed` fact wins, else the renderer's
	 * own armed state.
	 *
	 * @param array<string,mixed> $facts The page facts.
	 * @return bool
	 */
	private static function is_armed( array $facts ): bool {
		if ( isset( $facts['armed'] ) ) {
			return (bool) $facts['armed'];
		}
		return class_exists( Sgs_Motion_Renderer::class ) && Sgs_Motion_Renderer::is_armed();
	}

	/**
	 * The page's eager image cap, read once per request.
	 *
	 * @return int
	 */
	private static function eager_limit(): int {
		if ( null === self::$limit ) {
			self::$limit = (int) apply_filters( 'sgs_eager_image_limit', self::EAGER_LIMIT );
		}
		return self::$limit;
	}
}
