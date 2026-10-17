<?php
/**
 * `video-behaviour` atom — PHP twin of
 * src/components/media/atoms/video-behaviour.js.
 *
 * ⛔ THIS IS THE FIX FOR THE LIVE DEFECT. Before this file, `media/render.php`
 * built `autoplay` / `muted` / `playsinline` independently with no guard:
 *
 *     $autoplay_attr = $video_autoplay ? ' autoplay' : '';
 *     $muted_attr    = $video_muted    ? ' muted'    : '';
 *     $inline_attr   = $video_inline   ? ' playsinline' : '';
 *
 * A browser refuses to autoplay an unmuted video, and iOS needs `playsinline`
 * or the video takes over the screen. The only place that coupling existed
 * was `media/view.js` (client-side, post-hydration) — so a no-JS visitor, or
 * anything reading the served HTML directly, got markup the browser cannot
 * play. `sgs_media_atom_video_behaviour_requires()` is the single place that
 * now resolves this, for every device tier, and `media/render.php` calls it
 * instead of resolving the three flags independently.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_video_behaviour_resolve_tier' ) ) {
	/**
	 * Per-device-tier fallback resolution for one boolean attribute family.
	 *
	 * Deliberately self-contained rather than calling `media/render.php`'s
	 * own `sgs_media_resolve_tier_bool()` — that function is declared INSIDE
	 * `media/render.php` itself (guarded by `function_exists()`), so it does
	 * not exist yet at the point this file's `require_once` chain runs (via
	 * `render-helpers.php`, well before any block's `render.php` executes).
	 * Same fallback-upward algorithm: an unset tablet/mobile override
	 * inherits the tier immediately above it, never desktop directly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $key        Desktop/base attribute key.
	 * @return array{desktop:bool,tablet:bool,mobile:bool}
	 */
	function sgs_media_atom_video_behaviour_resolve_tier( array $attributes, $key ) {
		$desktop = ! empty( $attributes[ $key ] );

		$tablet_raw = $attributes[ $key . 'Tablet' ] ?? null;
		$tablet     = null !== $tablet_raw ? (bool) $tablet_raw : $desktop;

		$mobile_raw = $attributes[ $key . 'Mobile' ] ?? null;
		$mobile     = null !== $mobile_raw ? (bool) $mobile_raw : $tablet;

		return array(
			'desktop' => $desktop,
			'tablet'  => $tablet,
			'mobile'  => $mobile,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_video_behaviour_requires' ) ) {
	/**
	 * Resolve autoplay/muted/playsinline for every device tier, enforcing
	 * `requires: { VideoAutoplay: [ 'VideoMuted', 'VideoPlaysInline' ] }' at
	 * EACH tier independently — a tablet override that sets autoplay on
	 * without also setting muted/playsinline gets the same correction the
	 * desktop tier gets.
	 *
	 * ⚠ `sgs/before-after`'s shared autoplay toggle is BLOCK-LEVEL — call
	 * this with `$prefix = ''` for that surface, matching how it is already
	 * stored (registry `reads`, `STORED_AS`). This function does not resolve
	 * blockSlug-specific storage overrides itself; the caller passes the key
	 * shape it already uses.
	 *
	 * @param array  $attributes Block attributes, passed verbatim.
	 * @param string $prefix     Surface prefix ('' for an unprefixed surface).
	 * @return array{
	 *     autoplay: array{desktop:bool,tablet:bool,mobile:bool},
	 *     muted: array{desktop:bool,tablet:bool,mobile:bool},
	 *     plays_inline: array{desktop:bool,tablet:bool,mobile:bool}
	 * }
	 */
	function sgs_media_atom_video_behaviour_requires( array $attributes, $prefix ) {
		$autoplay_key = sgs_media_element_attr( $prefix, 'VideoAutoplay' );
		$muted_key    = sgs_media_element_attr( $prefix, 'VideoMuted' );
		$inline_key   = sgs_media_element_attr( $prefix, 'VideoPlaysInline' );

		$autoplay = sgs_media_atom_video_behaviour_resolve_tier( $attributes, $autoplay_key );
		$muted    = sgs_media_atom_video_behaviour_resolve_tier( $attributes, $muted_key );
		$inline   = sgs_media_atom_video_behaviour_resolve_tier( $attributes, $inline_key );

		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			if ( $autoplay[ $tier ] ) {
				$muted[ $tier ]  = true;
				$inline[ $tier ] = true;
			}
		}

		return array(
			'autoplay'     => $autoplay,
			'muted'        => $muted,
			'plays_inline' => $inline,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_video_behaviour_css' ) ) {
	/**
	 * Playback behaviour is HTML element state (attributes/properties on
	 * `<video>`, or an iframe embed's query-string params), never a
	 * paintable CSS property. This atom emits no custom-property
	 * declarations — see the JS twin's `css()` and
	 * `assets/css/media-atoms/video-behaviour.css`.
	 *
	 * @param array  $attributes Block attributes (unused).
	 * @param string $prefix     Surface prefix (unused).
	 * @param string $block_slug Block slug (unused).
	 * @return array Always empty.
	 */
	function sgs_media_atom_video_behaviour_css( array $attributes, $prefix, $block_slug ) {
		return array();
	}
}
