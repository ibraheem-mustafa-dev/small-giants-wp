<?php
/**
 * Per-slot media resolver for sgs/before-after.
 *
 * Split out of render.php (already over this codebase's 300-line PHP file
 * guideline before this feature) rather than added to it. Loaded via
 * `require_once __DIR__ . '/media-render.php'` — a SIBLING file inside this
 * block's own directory, so `--webpack-copy-php` carries it to `build/` the
 * same way it already carries render.php.
 *
 * Named functions (not closures) are safe here — unlike render.php, this
 * file is pulled in via `require_once`, so PHP only ever declares each
 * function once per request regardless of how many sgs/before-after
 * instances are on the page. The `function_exists()` guards are the same
 * defensive pattern already used elsewhere in this plugin's helper files
 * (e.g. `sgs_render_media()` in includes/helpers-media.php).
 *
 * MIRRORS sgs/media's mediaType FORK (image / video / svg), applied per
 * comparison SLOT rather than block-wide — the before side and the after
 * side each resolve independently via {prefix}MediaType.
 *
 * VIDEO SCOPE — DELIBERATE, DOCUMENTED LIMITATION: direct file sources only
 * (WP media-library upload, or a direct .mp4/.webm/.ogg/.mov URL). YouTube
 * and Vimeo embeds are NOT supported for this block. A before/after
 * comparison needs both sides' playback position kept in sync
 * (view.js `bootVideoSyncLayer`); a cross-origin `<iframe>` embed can only be
 * driven via that platform's own JS player SDK, which is an external
 * CDN-hosted script — exactly what the Spec 38 three-tier motion doctrine
 * (Tier V / Tier G / Tier H, closed list) exists to keep out. Rather than
 * ship a YouTube/Vimeo path that can drift out of sync with no fix available
 * within that doctrine, this resolver treats a YouTube/Vimeo URL as EMPTY
 * (no content for that slot) so the block's own no-JS-safe gate in
 * render.php reports it honestly instead of rendering a silently-broken
 * comparison.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_before_after_is_youtube_or_vimeo' ) ) {
	/**
	 * Detect a YouTube/Vimeo URL — the one source kind this block's video
	 * slot deliberately does not support (see file docblock).
	 *
	 * @param string $url Candidate URL.
	 * @return bool True when the URL is a YouTube or Vimeo link.
	 */
	function sgs_before_after_is_youtube_or_vimeo( string $url ): bool {
		if ( '' === $url ) {
			return false;
		}
		return (bool) preg_match( '#(?:youtube\.com/|youtu\.be/|vimeo\.com/)#i', $url );
	}
}

if ( ! function_exists( 'sgs_before_after_resolve_image' ) ) {
	/**
	 * Resolve one comparison slot as an image.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $modifier   'before' | 'after'.
	 * @param string $classes    Space-separated CSS classes for the element.
	 * @return array{ html: string, has_content: bool }
	 */
	function sgs_before_after_resolve_image( array $attributes, string $modifier, string $classes ): array {
		$prefix = 'before' === $modifier ? 'before' : 'after';
		$id     = isset( $attributes[ $prefix . 'ImageId' ] ) ? (int) $attributes[ $prefix . 'ImageId' ] : 0;
		$url    = isset( $attributes[ $prefix . 'ImageUrl' ] ) ? (string) $attributes[ $prefix . 'ImageUrl' ] : '';
		$alt    = isset( $attributes[ $prefix . 'ImageAlt' ] ) ? (string) $attributes[ $prefix . 'ImageAlt' ] : '';

		// Decorative slot (D918/S8 {element}Decorative convention). WordPress
		// already stores the real alt text on the ATTACHMENT/attribute, which
		// is where it belongs — this is the operator saying "ignore that, this
		// picture carries no information". It renders with an empty alt AND
		// aria-hidden, so a screen reader skips it entirely instead of
		// announcing a filename. Block-level per SLOT, mirroring how
		// milestoneMediaDecorative is per-block on sgs/timeline — a client
		// uses a comparison slot either as content or as decoration, not one
		// way on desktop and another on a tier.
		$decorative = ! empty( $attributes[ $prefix . 'ImageDecorative' ] );
		if ( $decorative ) {
			$alt = '';
		}

		if ( '' === trim( $url ) && $id <= 0 ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		// ART-DIRECTION TIERS (2026-08-07) — the IMAGE pair. The VIDEO half of
		// this block already carries per-device playback tiers (d8cdcf8b); this
		// closes the source side, in the same {base}/{base}Tablet/{base}Mobile
		// shape sgs/media and sgs/hero use.
		//
		// The tier siblings are emitted HERE, next to the base image, because
		// both must live inside the same comparison slot — the divider clips one
		// wrap against the other, so a tier image rendered outside its wrap
		// would not be clipped and would break the comparison.
		// ⚠ The tier keys are spelled as WHOLE literal suffixes concatenated onto
		// $prefix (`$prefix . 'ImageIdTablet'`), NOT built in three parts
		// (`$prefix . 'ImageId' . $tier`). Both work at runtime; only this shape
		// is legible to `check-dead-controls.js`, whose dynamic-prefix resolver
		// reads `$attributes[ $var . 'Literal' ]` and cannot follow a key whose
		// tail is another variable. Written the first way, all 8 of these attrs
		// were reported as fully dead — a false positive, but one that would have
		// had to be argued away in a baseline file forever. Keeping the code
		// gate-legible is cheaper than annotating why the gate is wrong.
		$tier_candidates = array(
			'tablet' => array(
				'id'  => $attributes[ $prefix . 'ImageIdTablet' ] ?? null,
				'url' => $attributes[ $prefix . 'ImageUrlTablet' ] ?? '',
			),
			'mobile' => array(
				'id'  => $attributes[ $prefix . 'ImageIdMobile' ] ?? null,
				'url' => $attributes[ $prefix . 'ImageUrlMobile' ] ?? '',
			),
		);

		$tiers = array();
		foreach ( $tier_candidates as $tier_key => $candidate ) {
			$tier_id  = (int) ( $candidate['id'] ?? 0 );
			$tier_url = (string) ( $candidate['url'] ?? '' );
			if ( '' === trim( $tier_url ) && $tier_id <= 0 ) {
				continue;
			}
			$tiers[ $tier_key ] = array(
				'id'  => $tier_id,
				'url' => $tier_url,
			);
		}

		/**
		 * Emit one <img> for a slot, by attachment ID when available and by raw
		 * URL otherwise — the same ID-wins-URL-falls-back rule the base image
		 * uses, kept in one place so base and tiers cannot drift apart.
		 *
		 * @param int    $img_id  Attachment ID (0 = external/unknown).
		 * @param string $img_url Raw URL fallback.
		 * @param string $img_cls Full class attribute for this <img>.
		 * @return string HTML, or '' when neither source resolves.
		 */
		$emit_img = static function ( int $img_id, string $img_url, string $img_cls ) use ( $alt, $decorative ): string {
			if ( $img_id > 0 ) {
				$img_attrs = array(
					'class'    => $img_cls,
					'alt'      => $alt,
					'loading'  => 'lazy',
					'decoding' => 'async',
				);
				if ( $decorative ) {
					$img_attrs['aria-hidden'] = 'true';
				}
				$markup = wp_get_attachment_image( $img_id, 'full', false, $img_attrs );
				if ( '' !== $markup ) {
					return $markup;
				}
			}
			if ( '' === trim( $img_url ) ) {
				return '';
			}
			return sprintf(
				'<img class="%1$s" src="%2$s" alt="%3$s" loading="lazy" decoding="async"%4$s />',
				esc_attr( $img_cls ),
				esc_url( $img_url ),
				esc_attr( $alt ),
				$decorative ? ' aria-hidden="true"' : ''
			);
		};

		$base_cls  = empty( $tiers )
			? $classes
			: $classes . ' wp-block-sgs-before-after__img--' . $modifier . '-desktop';
		$base_html = $emit_img( $id, $url, $base_cls );

		if ( '' === $base_html ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		$html          = $base_html;
		$emitted_tiers = array();
		foreach ( $tiers as $tier_key => $tier_media ) {
			$tier_html = $emit_img(
				$tier_media['id'],
				$tier_media['url'],
				$classes . ' wp-block-sgs-before-after__img--' . $modifier . '-' . $tier_key
			);
			if ( '' === $tier_html ) {
				continue;
			}
			$html           .= $tier_html;
			$emitted_tiers[] = $tier_key;
		}

		return array(
			'html'        => $html,
			'has_content' => true,
			// Reported back so render.php can scope the breakpoint toggles to
			// its own $uid — the resolver has no access to that scope token, and
			// an unscoped rule would hide images in every other instance.
			'tiers'       => $emitted_tiers,
		);
	}
}

if ( ! function_exists( 'sgs_before_after_resolve_video' ) ) {
	/**
	 * Resolve one comparison slot as a direct-file video. See file docblock
	 * for why YouTube/Vimeo are deliberately excluded.
	 *
	 * No `autoplay`/`controls` attribute is emitted — playback is entirely
	 * driven by view.js's shared play/pause toggle so both slots' videos stay
	 * frame-synced; a no-JS visitor sees the first frame of each video as a
	 * still image via the same CSS-only clip-path split every other media
	 * type gets.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $modifier   'before' | 'after'.
	 * @param string $classes    Space-separated CSS classes for the element.
	 * @return array{ html: string, has_content: bool }
	 */
	function sgs_before_after_resolve_video( array $attributes, string $modifier, string $classes ): array {
		$prefix = 'before' === $modifier ? 'before' : 'after';
		$id     = isset( $attributes[ $prefix . 'VideoId' ] ) ? (int) $attributes[ $prefix . 'VideoId' ] : 0;
		$url    = isset( $attributes[ $prefix . 'VideoUrl' ] ) ? (string) $attributes[ $prefix . 'VideoUrl' ] : '';
		$alt    = isset( $attributes[ $prefix . 'VideoAlt' ] ) ? (string) $attributes[ $prefix . 'VideoAlt' ] : '';

		$resolved_url = '';
		$mime         = '';

		if ( $id > 0 ) {
			$attachment_url = wp_get_attachment_url( $id );
			if ( $attachment_url ) {
				$resolved_url = $attachment_url;
				$mime_raw     = get_post_mime_type( $id );
				if ( $mime_raw && str_starts_with( $mime_raw, 'video/' ) ) {
					$mime = $mime_raw;
				}
			}
		}

		if ( '' === $resolved_url && '' !== trim( $url ) ) {
			$resolved_url = trim( $url );
		}

		if ( '' === $resolved_url ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		// Deliberate unsupported-source gate — see file docblock.
		if ( sgs_before_after_is_youtube_or_vimeo( $resolved_url ) ) {
			return array(
				'html'        => '<!-- sgs/before-after: YouTube/Vimeo not supported for the ' . esc_attr( $modifier ) . ' slot (cannot be kept in sync) -->',
				'has_content' => false,
			);
		}

		if ( '' === $mime ) {
			$ext  = strtolower( pathinfo( (string) wp_parse_url( $resolved_url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
			$mime = match ( $ext ) {
				'webm'  => 'video/webm',
				'ogg', 'ogv' => 'video/ogg',
				'mov'   => 'video/quicktime',
				default => 'video/mp4',
			};
		}

		$aria = '' !== trim( $alt ) ? $alt : ( 'before' === $modifier ? __( 'Before video', 'sgs-blocks' ) : __( 'After video', 'sgs-blocks' ) );

		return array(
			'html'        => sprintf(
				'<video class="%1$s" muted loop playsinline preload="metadata" aria-label="%2$s" data-sgs-before-after-video data-sgs-before-after-video-side="%3$s"><source src="%4$s" type="%5$s"></video>',
				esc_attr( $classes . ' wp-block-sgs-before-after__video' ),
				esc_attr( $aria ),
				esc_attr( $modifier ),
				esc_url( $resolved_url ),
				esc_attr( $mime )
			),
			'has_content' => true,
		);
	}
}

if ( ! function_exists( 'sgs_before_after_resolve_svg' ) ) {
	/**
	 * Resolve one comparison slot as sanitised inline SVG. Reuses the SHARED
	 * `sgs_svg_kses_allowed_tags()` allowlist (includes/helpers-svg-kses.php,
	 * already loaded by render.php via render-helpers.php) rather than a
	 * second hand-rolled allowlist — one SVG sanitisation policy for the
	 * whole plugin.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $modifier   'before' | 'after'.
	 * @param string $classes    Space-separated CSS classes for the element.
	 * @return array{ html: string, has_content: bool }
	 */
	function sgs_before_after_resolve_svg( array $attributes, string $modifier, string $classes ): array {
		$prefix      = 'before' === $modifier ? 'before' : 'after';
		$svg_content = isset( $attributes[ $prefix . 'SvgContent' ] ) ? (string) $attributes[ $prefix . 'SvgContent' ] : '';

		if ( '' === trim( $svg_content ) ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		$sanitised = function_exists( 'sgs_svg_kses_allowed_tags' )
			? wp_kses( $svg_content, sgs_svg_kses_allowed_tags() )
			: wp_kses_post( $svg_content ); // Defensive fallback — should never trigger; render-helpers.php always loads the helper first.

		if ( '' === trim( $sanitised ) ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		return array(
			'html'        => sprintf(
				'<div class="%1$s" aria-hidden="true">%2$s</div>',
				esc_attr( $classes . ' wp-block-sgs-before-after__svg' ),
				$sanitised // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised via wp_kses() with the shared SVG allowlist immediately above.
			),
			'has_content' => true,
		);
	}
}

if ( ! function_exists( 'sgs_before_after_resolve_media' ) ) {
	/**
	 * Resolve one comparison slot ('before' or 'after') to render-ready HTML,
	 * dispatching on that slot's own `{prefix}MediaType`.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $modifier   'before' | 'after'.
	 * @param string $uid        Block instance uid (Wave 5b — scopes the
	 *                           media-atom layer's object-fit/focal-point
	 *                           custom properties independently per slot).
	 * @return array{ html: string, has_content: bool, media_type: string }
	 */
	function sgs_before_after_resolve_media( array $attributes, string $modifier, string $uid = '' ): array {
		$prefix     = 'before' === $modifier ? 'before' : 'after';
		$type_raw   = $attributes[ $prefix . 'MediaType' ] ?? 'image';
		$media_type = in_array( $type_raw, array( 'image', 'video', 'svg' ), true ) ? $type_raw : 'image';
		$classes    = 'wp-block-sgs-before-after__img wp-block-sgs-before-after__img--' . $modifier;

		// object-fit/focal-point atoms are image+video scope only (registry.js
		// `types`) — svg's inline geometry doesn't take object-fit, so the
		// marker is added only for the two types that can use it.
		if ( '' !== $uid && 'svg' !== $media_type && function_exists( 'sgs_media_element_scope_class' ) ) {
			$sgs_bap_scope = sgs_media_element_scope_class( $uid, $prefix );
			if ( '' !== $sgs_bap_scope ) {
				$classes .= ' sgs-media-el ' . $sgs_bap_scope;
			}
		}

		$result = match ( $media_type ) {
			'video' => sgs_before_after_resolve_video( $attributes, $modifier, $classes ),
			'svg'   => sgs_before_after_resolve_svg( $attributes, $modifier, $classes ),
			default => sgs_before_after_resolve_image( $attributes, $modifier, $classes ),
		};

		$result['media_type'] = $media_type;
		return $result;
	}
}
