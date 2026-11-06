<?php
/**
 * Intrinsic image dimensions for the `width` and `height` attributes of a printed `<img>`.
 *
 * The browser reserves an image's box from those two attributes before the file arrives, so a block that prints an
 * image from a URL looks its size up here instead of leaving the box to collapse and grow. Sizes are real, never
 * guessed: an attachment's own metadata first, then the file's header on disk, and an SVG's viewBox. A remote URL is
 * never fetched; it gets no attributes.
 *
 * @package SGS\Blocks
 */

if ( ! function_exists( 'sgs_image_intrinsic_size' ) ) {
	/**
	 * The intrinsic size of the image a URL points at.
	 *
	 * @param string $url Image URL (an attachment, a resized copy of one, or any file under wp-content).
	 * @return array{0:int,1:int}|null Width and height in px, or null when no real size can be read.
	 */
	function sgs_image_intrinsic_size( string $url ): ?array {
		$url = trim( $url );
		if ( '' === $url ) {
			return null;
		}

		$key    = 'sgs_imgdim_' . md5( $url );
		$cached = get_transient( $key );
		if ( is_array( $cached ) ) {
			return 2 === count( $cached ) && (int) $cached[0] >= 1 && (int) $cached[1] >= 1 ? array( (int) $cached[0], (int) $cached[1] ) : null;
		}

		$size = sgs_image_intrinsic_size_lookup( $url );
		if ( null !== $size && ( $size[0] < 1 || $size[1] < 1 ) ) {
			$size = null;
		}
		set_transient( $key, null === $size ? array() : $size, null === $size ? HOUR_IN_SECONDS : DAY_IN_SECONDS );
		return $size;
	}
}

if ( ! function_exists( 'sgs_image_intrinsic_size_lookup' ) ) {
	/**
	 * Uncached lookup behind sgs_image_intrinsic_size().
	 *
	 * @param string $url Image URL.
	 * @return array{0:int,1:int}|null
	 */
	function sgs_image_intrinsic_size_lookup( string $url ): ?array {
		$path = sgs_image_url_to_path( $url );
		$ext  = strtolower( pathinfo( (string) wp_parse_url( $url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );

		if ( 'svg' === $ext ) {
			return null !== $path ? sgs_image_svg_size( $path ) : null;
		}

		// A media-library file: the metadata knows the size of this exact file, resized copies included.
		$id = absint( attachment_url_to_postid( $url ) );
		if ( $id > 0 ) {
			$meta = wp_get_attachment_metadata( $id );
			if ( is_array( $meta ) ) {
				$file = wp_basename( (string) wp_parse_url( $url, PHP_URL_PATH ) );
				foreach ( (array) ( $meta['sizes'] ?? array() ) as $copy ) {
					if ( isset( $copy['file'], $copy['width'], $copy['height'] ) && $copy['file'] === $file ) {
						return array( (int) $copy['width'], (int) $copy['height'] );
					}
				}
				if ( ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ) {
					return array( (int) $meta['width'], (int) $meta['height'] );
				}
			}
		}

		// Not an attachment (or no metadata): read the file's own header.
		if ( null !== $path ) {
			$info = wp_getimagesize( $path );
			if ( is_array( $info ) && ! empty( $info[0] ) && ! empty( $info[1] ) ) {
				return array( (int) $info[0], (int) $info[1] );
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_image_url_to_path' ) ) {
	/**
	 * The file path of a URL under this site's wp-content folder (uploads, plugins, themes).
	 *
	 * @param string $url Image URL.
	 * @return string|null Real path inside WP_CONTENT_DIR, or null for any other URL.
	 */
	function sgs_image_url_to_path( string $url ): ?string {
		$base = trailingslashit( content_url() );
		if ( 0 !== strpos( $url, $base ) ) {
			return null;
		}
		$relative = rawurldecode( (string) strtok( substr( $url, strlen( $base ) ), '?#' ) );
		$real     = realpath( trailingslashit( WP_CONTENT_DIR ) . $relative );
		$root     = realpath( WP_CONTENT_DIR );
		if ( false === $real || false === $root || 0 !== strpos( $real, $root . DIRECTORY_SEPARATOR ) || ! is_file( $real ) ) {
			return null;
		}
		return $real;
	}
}

if ( ! function_exists( 'sgs_image_svg_size' ) ) {
	/**
	 * An SVG file's size from its viewBox, else its root width and height in plain pixels.
	 *
	 * @param string $path SVG file path.
	 * @return array{0:int,1:int}|null Null when the root declares neither.
	 */
	function sgs_image_svg_size( string $path ): ?array {
		$head = (string) file_get_contents( $path, false, null, 0, 4096 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
		if ( ! preg_match( '/<svg\b[^>]*>/i', $head, $root ) ) {
			return null;
		}
		$number = '(\d+(?:\.\d+)?)';
		if ( preg_match( '/\bviewBox\s*=\s*["\']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+' . $number . '[\s,]+' . $number . '\s*["\']/i', $root[0], $m ) && (float) $m[1] > 0 && (float) $m[2] > 0 ) {
			return sgs_image_svg_rounded_pair( (float) $m[1], (float) $m[2] );
		}
		if ( preg_match( '/\bwidth\s*=\s*["\']' . $number . '(?:px)?["\']/i', $root[0], $w ) && preg_match( '/\bheight\s*=\s*["\']' . $number . '(?:px)?["\']/i', $root[0], $h ) && (float) $w[1] > 0 && (float) $h[1] > 0 ) {
			return sgs_image_svg_rounded_pair( (float) $w[1], (float) $h[1] );
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_image_svg_rounded_pair' ) ) {
	/**
	 * A width and height rounded to whole pixels, or null when either rounds below 1 (a 0.2px SVG has no usable box).
	 *
	 * @param float $width  Width.
	 * @param float $height Height.
	 * @return array{0:int,1:int}|null
	 */
	function sgs_image_svg_rounded_pair( float $width, float $height ): ?array {
		$w = (int) round( $width );
		$h = (int) round( $height );
		return $w >= 1 && $h >= 1 ? array( $w, $h ) : null;
	}
}

if ( ! function_exists( 'sgs_image_size_attrs' ) ) {
	/**
	 * The ` width="N" height="M"` attribute string for an image URL, or '' when no real size is known.
	 *
	 * @param string $url Image URL.
	 * @return string Attribute string with a leading space, safe to print.
	 */
	function sgs_image_size_attrs( string $url ): string {
		$size = sgs_image_intrinsic_size( $url );
		return null === $size ? '' : sprintf( ' width="%d" height="%d"', $size[0], $size[1] );
	}
}
