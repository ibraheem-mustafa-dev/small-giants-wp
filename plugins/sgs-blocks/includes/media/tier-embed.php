<?php
/**
 * Embeds: the URL allow-list and the lazy iframe (Spec 49 FR-49-17).
 *
 * Only YouTube (`youtube-nocookie.com`) and Vimeo (`player.vimeo.com`) are accepted, normalised to their embed form.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_media_embed_start_seconds' ) ) {
	/**
	 * A pasted start time as whole seconds: `90`, `90s`, `1m30s` or `1h2m3s`.
	 *
	 * @param mixed $raw Pasted value.
	 * @return int Seconds; 0 when blank or not a time.
	 */
	function sgs_media_embed_start_seconds( $raw ): int {
		$raw = is_string( $raw ) || is_numeric( $raw ) ? strtolower( trim( (string) $raw ) ) : '';
		if ( 1 === preg_match( '/^\d+$/', $raw ) ) {
			return (int) $raw;
		}
		if ( 1 === preg_match( '/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/', $raw, $m ) && '' !== $raw ) {
			return (int) ( $m[1] ?? 0 ) * 3600 + (int) ( $m[2] ?? 0 ) * 60 + (int) ( $m[3] ?? 0 );
		}
		return 0;
	}
}

if ( ! function_exists( 'sgs_media_normalise_embed_url' ) ) {
	/**
	 * An embed URL in its privacy-friendly embed form, or '' when the host is not allowed.
	 *
	 * YouTube `watch`, `embed`, `shorts`, `live` and `youtu.be` links are accepted; a pasted start time (`t` or `start`)
	 * is kept unless `$options['start']` sets one. Vimeo keeps its privacy hash (`h`, from the query or the
	 * `vimeo.com/ID/HASH` path), which an unlisted video needs to load.
	 *
	 * @param string $url     Pasted URL.
	 * @param array  $options Playback options ( `autoplay`, `muted`, `loop`, `controls`, `start` ); empty adds none.
	 * @return string The embed URL.
	 */
	function sgs_media_normalise_embed_url( string $url, array $options = array() ): string {
		$parts = wp_parse_url( trim( $url ) );
		$host  = strtolower( (string) ( $parts['host'] ?? '' ) );
		$path  = (string) ( $parts['path'] ?? '' );
		$query = array();
		parse_str( (string) ( $parts['query'] ?? '' ), $query );
		$provider = '';
		$video_id = '';
		$hash     = '';
		parse_str( (string) ( $parts['fragment'] ?? '' ), $fragment_query );
		$pasted_start = sgs_media_embed_start_seconds( $query['start'] ?? ( $query['t'] ?? ( $fragment_query['t'] ?? 0 ) ) );

		if ( in_array( $host, array( 'youtube-nocookie.com', 'www.youtube-nocookie.com' ), true ) && preg_match( '#^/embed/([A-Za-z0-9_-]+)#', $path, $m ) ) {
			$provider = 'youtube';
			$video_id = $m[1];
		} elseif ( in_array( $host, array( 'youtube.com', 'www.youtube.com', 'm.youtube.com' ), true ) ) {
			$candidate = (string) ( $query['v'] ?? '' );
			if ( '' === $candidate && preg_match( '#^/(?:embed|shorts|live)/([A-Za-z0-9_-]+)#', $path, $m ) ) {
				$candidate = $m[1];
			}
			if ( preg_match( '/^[A-Za-z0-9_-]+$/', $candidate ) ) {
				$provider = 'youtube';
				$video_id = $candidate;
			}
		} elseif ( 'youtu.be' === $host && preg_match( '#^/([A-Za-z0-9_-]+)#', $path, $m ) ) {
			$provider = 'youtube';
			$video_id = $m[1];
		} elseif ( 'player.vimeo.com' === $host && preg_match( '#^/video/(\d+)#', $path, $m ) ) {
			$provider = 'vimeo';
			$video_id = $m[1];
			$hash     = (string) ( $query['h'] ?? '' );
		} elseif ( in_array( $host, array( 'vimeo.com', 'www.vimeo.com' ), true ) && preg_match( '#^/(\d+)(?:/([A-Za-z0-9]+))?#', $path, $m ) ) {
			$provider = 'vimeo';
			$video_id = $m[1];
			$hash     = (string) ( $m[2] ?? ( $query['h'] ?? '' ) );
		}
		$hash = 1 === preg_match( '/^[A-Za-z0-9]+$/', $hash ) ? $hash : '';
		if ( '' === $provider ) {
			return '';
		}

		$autoplay = ! empty( $options['autoplay'] );
		$muted    = $autoplay || ! empty( $options['muted'] );
		$loop     = ! empty( $options['loop'] );
		$controls = ! array_key_exists( 'controls', $options ) || ! empty( $options['controls'] );
		$start    = max( 0, (int) ( $options['start'] ?? 0 ) );
		$start    = $start > 0 ? $start : $pasted_start;
		$args     = array();
		$fragment = '';

		if ( 'youtube' === $provider ) {
			$base = 'https://www.youtube-nocookie.com/embed/' . $video_id;
			if ( ! $options && $start > 0 ) {
				$args['start'] = $start;
			}
			if ( $options ) {
				$args['autoplay'] = $autoplay ? 1 : 0;
				$args['mute']     = $muted ? 1 : 0;
				$args['controls'] = $controls ? 1 : 0;
				$args['rel']      = 0;
				if ( $loop ) {
					$args['loop']     = 1;
					$args['playlist'] = $video_id;
				}
				if ( $start > 0 ) {
					$args['start'] = $start;
				}
			}
		} else {
			$base = 'https://player.vimeo.com/video/' . $video_id;
			if ( '' !== $hash ) {
				$args['h'] = $hash;
			}
			if ( ! $options && $start > 0 ) {
				$fragment = '#t=' . $start . 's';
			}
			if ( $options ) {
				$args['autoplay'] = $autoplay ? 1 : 0;
				$args['muted']    = $muted ? 1 : 0;
				$args['loop']     = $loop ? 1 : 0;
				$args['controls'] = $controls ? 1 : 0;
				if ( $start > 0 ) {
					$fragment = '#t=' . $start . 's';
				}
			}
		}
		return $base . ( $args ? '?' . http_build_query( $args ) : '' ) . $fragment;
	}
}

if ( ! function_exists( 'sgs_media_embed_element' ) ) {
	/**
	 * A lazy iframe for one embed sibling. It prints no width or height: CSS sizes it.
	 *
	 * @param string $url     Normalised embed URL.
	 * @param string $classes Classes.
	 * @param string $title   Accessible title, from Alt; no title attribute when empty.
	 * @param string $autoplay_url The same embed with autoplay on, or ''. It is not the `src`: a visitor who asks for
	 *                        reduced motion must not get autoplay, so the device-video module swaps it in only when
	 *                        motion is allowed (`data-sgs-autoplay-src`).
	 * @return string The iframe markup.
	 */
	function sgs_media_embed_element( string $url, string $classes, string $title, string $autoplay_url = '' ): string {
		return sprintf(
			'<iframe class="%s" src="%s" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture"%s%s allowfullscreen></iframe>',
			esc_attr( $classes ),
			esc_url( $url ),
			'' !== $title ? ' title="' . esc_attr( $title ) . '"' : '',
			'' !== $autoplay_url ? ' data-sgs-autoplay-src="' . esc_url( $autoplay_url ) . '"' : ''
		);
	}
}
