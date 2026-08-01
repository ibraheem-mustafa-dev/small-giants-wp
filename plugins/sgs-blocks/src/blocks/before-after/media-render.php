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

		if ( '' === trim( $url ) && $id <= 0 ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		if ( $id > 0 ) {
			$markup = wp_get_attachment_image(
				$id,
				'full',
				false,
				array(
					'class'    => $classes,
					'alt'      => $alt,
					'loading'  => 'lazy',
					'decoding' => 'async',
				)
			);
			if ( '' !== $markup ) {
				return array(
					'html'        => $markup,
					'has_content' => true,
				);
			}
		}

		if ( '' === trim( $url ) ) {
			return array(
				'html'        => '',
				'has_content' => false,
			);
		}

		return array(
			'html'        => sprintf(
				'<img class="%1$s" src="%2$s" alt="%3$s" loading="lazy" decoding="async" />',
				esc_attr( $classes ),
				esc_url( $url ),
				esc_attr( $alt )
			),
			'has_content' => true,
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
	 * @return array{ html: string, has_content: bool, media_type: string }
	 */
	function sgs_before_after_resolve_media( array $attributes, string $modifier ): array {
		$prefix     = 'before' === $modifier ? 'before' : 'after';
		$type_raw   = $attributes[ $prefix . 'MediaType' ] ?? 'image';
		$media_type = in_array( $type_raw, array( 'image', 'video', 'svg' ), true ) ? $type_raw : 'image';
		$classes    = 'wp-block-sgs-before-after__img wp-block-sgs-before-after__img--' . $modifier;

		$result = match ( $media_type ) {
			'video' => sgs_before_after_resolve_video( $attributes, $modifier, $classes ),
			'svg'   => sgs_before_after_resolve_svg( $attributes, $modifier, $classes ),
			default => sgs_before_after_resolve_image( $attributes, $modifier, $classes ),
		};

		$result['media_type'] = $media_type;
		return $result;
	}
}
