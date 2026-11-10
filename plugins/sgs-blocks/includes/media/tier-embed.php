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

if ( ! function_exists( 'sgs_media_normalise_embed_url' ) ) {
	/**
	 * An embed URL in its privacy-friendly embed form, or '' when the host is not allowed.
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

		if ( in_array( $host, array( 'youtube-nocookie.com', 'www.youtube-nocookie.com' ), true ) && preg_match( '#^/embed/([A-Za-z0-9_-]+)#', $path, $m ) ) {
			$provider = 'youtube';
			$video_id = $m[1];
		} elseif ( in_array( $host, array( 'youtube.com', 'www.youtube.com', 'm.youtube.com' ), true ) ) {
			$candidate = (string) ( $query['v'] ?? '' );
			if ( '' === $candidate && preg_match( '#^/(?:embed|shorts)/([A-Za-z0-9_-]+)#', $path, $m ) ) {
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
		} elseif ( in_array( $host, array( 'vimeo.com', 'www.vimeo.com' ), true ) && preg_match( '#^/(\d+)#', $path, $m ) ) {
			$provider = 'vimeo';
			$video_id = $m[1];
		}
		if ( '' === $provider ) {
			return '';
		}

		$autoplay = ! empty( $options['autoplay'] );
		$muted    = $autoplay || ! empty( $options['muted'] );
		$loop     = ! empty( $options['loop'] );
		$controls = ! array_key_exists( 'controls', $options ) || ! empty( $options['controls'] );
		$start    = max( 0, (int) ( $options['start'] ?? 0 ) );
		$args     = array();
		$fragment = '';

		if ( 'youtube' === $provider ) {
			$base = 'https://www.youtube-nocookie.com/embed/' . $video_id;
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
	 * @return string The iframe markup.
	 */
	function sgs_media_embed_element( string $url, string $classes, string $title ): string {
		return sprintf(
			'<iframe class="%s" src="%s" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture"%s allowfullscreen></iframe>',
			esc_attr( $classes ),
			esc_url( $url ),
			'' !== $title ? ' title="' . esc_attr( $title ) . '"' : ''
		);
	}
}
