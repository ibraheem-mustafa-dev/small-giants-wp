<?php
/**
 * Media renderer: the per-device `<picture>`, and the `<video>` with its cover picture (Spec 49 §7.1).
 *
 * A device that shows another kind, or nothing, gets a `<source>` whose srcset is a 1-pixel GIF data URI, so the
 * browser downloads nothing for it (FR-49-8).
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'SGS_MEDIA_BLANK_GIF' ) ) {
	define( 'SGS_MEDIA_BLANK_GIF', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' );
}

if ( ! function_exists( 'sgs_media_file_key' ) ) {
	/**
	 * A key that is equal for two devices showing the same file.
	 *
	 * @param array|null $file A file ( `id`, `url` ) or null for blank.
	 * @return string
	 */
	function sgs_media_file_key( ?array $file ): string {
		return null === $file ? 'blank' : (int) $file['id'] . '|' . $file['url'];
	}
}

if ( ! function_exists( 'sgs_media_img_tag' ) ) {
	/**
	 * One `<img>`: attachment-backed through `wp_get_attachment_image`, otherwise built by hand.
	 *
	 * @param array|null $file    The file ( `id`, `url`, `width`, `height` ), or null for the blank GIF.
	 * @param array      $attrs   Attributes ( `class`, `alt`, `loading`, `fetchpriority`, `sizes`, `cover_crop`: mark the
	 *                            image `data-sgs-cover-crop` so core's later `auto` is taken out of its sizes ).
	 * @return string
	 */
	function sgs_media_img_tag( ?array $file, array $attrs ): string {
		$loading = (string) ( $attrs['loading'] ?? 'lazy' );
		$base    = array(
			'class'    => (string) ( $attrs['class'] ?? '' ),
			'alt'      => null === $file ? '' : (string) ( $attrs['alt'] ?? '' ),
			'loading'  => $loading,
			'decoding' => 'async',
		);
		if ( ! empty( $attrs['fetchpriority'] ) && 'auto' !== $attrs['fetchpriority'] ) {
			$base['fetchpriority'] = (string) $attrs['fetchpriority'];
		}
		if ( ! empty( $attrs['sizes'] ) && null !== $file ) {
			$base['sizes'] = (string) $attrs['sizes'];
		}
		if ( ! empty( $attrs['cover_crop'] ) && null !== $file ) {
			$base['data-sgs-cover-crop'] = '';
		}
		if ( null !== $file && $file['id'] > 0 ) {
			$tag = wp_get_attachment_image( $file['id'], 'full', false, $base );
			if ( '' !== $tag ) {
				return $tag;
			}
		}
		$width  = null === $file ? 1 : (int) $file['width'];
		$height = null === $file ? 1 : (int) $file['height'];
		$src    = null === $file ? SGS_MEDIA_BLANK_GIF : esc_url( $file['url'] );
		$out    = '<img src="' . ( null === $file ? esc_attr( $src ) : $src ) . '"';
		foreach ( $base as $name => $value ) {
			$out .= ' ' . $name . '="' . esc_attr( $value ) . '"';
		}
		if ( $width > 0 && $height > 0 ) {
			$out .= ' width="' . $width . '" height="' . $height . '"';
		}
		return $out . ' />';
	}
}

if ( ! function_exists( 'sgs_media_source_tag' ) ) {
	/**
	 * One `<source>` of a picture.
	 *
	 * @param array|null $file  The file, or null for the blank GIF.
	 * @param string     $query The bare media condition.
	 * @param string     $sizes The `sizes` value.
	 * @return string
	 */
	function sgs_media_source_tag( ?array $file, string $query, string $sizes ): string {
		if ( null === $file ) {
			return '<source media="' . esc_attr( $query ) . '" srcset="' . esc_attr( SGS_MEDIA_BLANK_GIF ) . '" />';
		}
		$srcset = '';
		if ( $file['id'] > 0 && function_exists( 'wp_get_attachment_image_srcset' ) ) {
			$srcset = (string) wp_get_attachment_image_srcset( $file['id'], 'full' );
		}
		$out = '<source media="' . esc_attr( $query ) . '" srcset="' . esc_attr( '' !== $srcset ? $srcset : $file['url'] ) . '"';
		if ( '' !== $sizes ) {
			$out .= ' sizes="' . esc_attr( $sizes ) . '"';
		}
		if ( $file['width'] > 0 && $file['height'] > 0 ) {
			$out .= ' width="' . (int) $file['width'] . '" height="' . (int) $file['height'] . '"';
		}
		return $out . ' />';
	}
}

if ( ! function_exists( 'sgs_media_sizes_entries' ) ) {
	/**
	 * One device's `sizes` value as entries: a list of `(min-width: Npx) length` entries (a grid cell's column counts) splits
	 * at its top-level commas, widest viewport first; any other value is one entry with no start.
	 *
	 * @param string $value A device's `sizes` value without the `auto, ` prefix.
	 * @return array<int,array{0:?int,1:string}> Each `[start viewport px or null, length expression]`.
	 */
	function sgs_media_sizes_entries( string $value ): array {
		if ( ! preg_match( '/^\(min-width: \d+px\) /', $value ) && false === strpos( $value, ', ' ) ) {
			return array( array( null, $value ) );
		}
		$parts = array();
		$depth = 0;
		$start = 0;
		for ( $i = 0, $len = strlen( $value ); $i < $len; $i++ ) {
			$c = $value[ $i ];
			if ( '(' === $c ) {
				++$depth;
			} elseif ( ')' === $c ) {
				--$depth;
			} elseif ( ',' === $c && 0 === $depth ) {
				$parts[] = trim( substr( $value, $start, $i - $start ) );
				$start   = $i + 1;
			}
		}
		$parts[] = trim( substr( $value, $start ) );
		$out     = array();
		foreach ( $parts as $part ) {
			if ( preg_match( '/^\(min-width: (\d+)px\) (.+)$/', $part, $m ) ) {
				$out[] = array( (int) $m[1], $m[2] );
			} elseif ( 1 === count( $parts ) || count( $out ) === count( $parts ) - 1 ) {
				$out[] = array( null, $part );
			} else {
				// Not a column-count list (a condition of another kind): keep the value whole.
				return array( array( null, $value ) );
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_combine_sizes' ) ) {
	/**
	 * One `sizes` value for an element that several devices share: each device's own value under its viewport range.
	 *
	 * An `<img>` or `<source>` serves every device that picks its file, so its `sizes` has to describe each of them;
	 * printing only the desktop value made a phone size a grid cell as if it were the desktop's. Equal values print
	 * once. A value in WordPress's `(max-width: Wpx) 100vw, Wpx` form is rewritten as `min(Wpx, 100vw)`, because a
	 * condition cannot nest inside a condition. The `auto, ` prefix of a lazy image is kept once, in front.
	 *
	 * @param array<string,string> $by_device Device => `sizes` for each device the element serves, widest device first.
	 * @return string
	 */
	function sgs_media_combine_sizes( array $by_device ): string {
		$by_device = array_filter( array_map( 'strval', $by_device ), static fn( string $s ): bool => '' !== $s );
		if ( count( array_unique( $by_device ) ) <= 1 ) {
			return (string) reset( $by_device );
		}
		$auto  = true;
		$parts = array();
		foreach ( $by_device as $device => $value ) {
			if ( 0 !== stripos( $value, 'auto,' ) ) {
				$auto = false;
			}
			$value = trim( (string) preg_replace( '/^auto,\s*/i', '', $value ) );
			if ( preg_match( '/^\(max-width:\s*([\d.]+px)\)\s*100vw,\s*([\d.]+px)$/', $value, $m ) && $m[1] === $m[2] ) {
				$value = 'min(' . $m[1] . ', 100vw)';
			}
			$parts[ $device ] = $value;
		}
		$list   = array();
		$widest = array_key_first( $parts );
		$bounds = array(
			'desktop' => array( SGS_Breakpoints::TABLET_MAX + 1, null ),
			'tablet'  => array( SGS_Breakpoints::MOBILE_MAX + 1, SGS_Breakpoints::TABLET_MAX ),
			'mobile'  => array( 0, SGS_Breakpoints::MOBILE_MAX ),
		);
		foreach ( array_reverse( array_keys( $parts ) ) as $device ) {
			// Narrowest device first, so the widest served device ends the list with no condition.
			list( $lower, $upper ) = $bounds[ $device ] ?? array( 0, null );
			$entries               = array();
			foreach ( sgs_media_sizes_entries( $parts[ $device ] ) as list( $from, $expr ) ) {
				// A count that starts above the device's widest viewport never applies there; the first one that starts at
				// or below its narrowest viewport applies to the whole of it, so nothing narrower is printed.
				if ( null !== $from && null !== $upper && $from > $upper && $device !== $widest ) {
					continue;
				}
				$covers    = null === $from || $from <= $lower;
				$entries[] = array( $covers ? null : $from, $expr );
				if ( $covers ) {
					break;
				}
			}
			foreach ( $entries as list( $from, $expr ) ) {
				$conds  = array_filter( array( $device === $widest ? '' : sgs_media_device_query_upto( $device ), null === $from ? '' : '(min-width: ' . $from . 'px)' ) );
				$list[] = ( $conds ? implode( ' and ', $conds ) . ' ' : '' ) . $expr;
			}
		}
		return ( $auto ? 'auto, ' : '' ) . implode( ', ', $list );
	}
}

if ( ! function_exists( 'sgs_media_device_query_upto' ) ) {
	/**
	 * The media condition that is true up to and including a device's widest viewport.
	 *
	 * @param string $device `tablet` or `mobile`.
	 * @return string
	 */
	function sgs_media_device_query_upto( string $device ): string {
		return SGS_Breakpoints::query_fractional( 'mobile' === $device ? 'mobile' : 'tablet' );
	}
}

if ( ! function_exists( 'sgs_media_picture' ) ) {
	/**
	 * Images for every device that shows one: a plain `<img>` when all devices share a file, else one `<picture>`.
	 *
	 * @param array<string,array|null> $files   Device => file ( `id`, `url`, `width`, `height` ), null where the device
	 *                                          shows another kind or nothing.
	 * @param array                    $options `classes` (img), `picture_classes`, `alt`, `loading`, `fetchpriority`,
	 *                                          `sizes` (device => string), `queries` (device => media condition),
	 *                                          `force_picture`, `cover_crop` (see sgs_media_img_tag).
	 * @return string The markup, or '' when no device shows an image.
	 */
	function sgs_media_picture( array $files, array $options ): string {
		$devices = sgs_media_devices();
		$shown   = array_filter( $files );
		if ( ! $shown ) {
			return '';
		}
		$keys = array();
		foreach ( $devices as $device ) {
			$keys[ $device ] = sgs_media_file_key( $files[ $device ] ?? null );
		}
		$sizes   = (array) ( $options['sizes'] ?? array() );
		$default = $files['desktop'] ?? null;
		$img     = sgs_media_img_tag(
			$default,
			array(
				'class'         => $options['classes'] ?? '',
				'alt'           => $options['alt'] ?? '',
				'loading'       => $options['loading'] ?? 'lazy',
				'fetchpriority' => $options['fetchpriority'] ?? '',
				'sizes'         => sgs_media_combine_sizes( array_intersect_key( $sizes, array_filter( $keys, static fn( $k ): bool => $k === $keys['desktop'] ) ) ),
				'cover_crop'    => ! empty( $options['cover_crop'] ),
			)
		);
		if ( 1 === count( array_unique( $keys ) ) && empty( $options['force_picture'] ) ) {
			return $img;
		}
		// A block that places a device's file at its own width passes that condition in `queries`.
		$queries = (array) ( $options['queries'] ?? array() );
		$sources = '';
		if ( $keys['mobile'] === $keys['tablet'] && $keys['tablet'] !== $keys['desktop'] ) {
			$sources .= sgs_media_source_tag( $files['tablet'] ?? null, (string) ( $queries['tablet'] ?? SGS_Breakpoints::query_fractional( 'tablet' ) ), sgs_media_combine_sizes( array_intersect_key( $sizes, array( 'tablet' => 1, 'mobile' => 1 ) ) ) );
		} else {
			foreach ( array( 'tablet', 'mobile' ) as $device ) {
				if ( $keys[ $device ] !== $keys['desktop'] ) {
					$sources .= sgs_media_source_tag( $files[ $device ] ?? null, (string) ( $queries[ $device ] ?? sgs_media_device_query( $device ) ), (string) ( $sizes[ $device ] ?? '' ) );
				}
			}
		}
		return '<picture class="' . esc_attr( (string) ( $options['picture_classes'] ?? 'sgs-media-picture' ) ) . '">' . $sources . $img . '</picture>';
	}
}

if ( ! function_exists( 'sgs_media_video_mime' ) ) {
	/**
	 * The MIME type for a video file.
	 *
	 * @param array $source Normalised source ( `mime`, `url` ).
	 * @return string
	 */
	function sgs_media_video_mime( array $source ): string {
		if ( 0 === strpos( (string) $source['mime'], 'video/' ) ) {
			return (string) $source['mime'];
		}
		$map = array(
			'webm' => 'video/webm',
			'ogv'  => 'video/ogg',
			'mov'  => 'video/quicktime',
			'm4v'  => 'video/mp4',
		);
		$ext = strtolower( pathinfo( (string) wp_parse_url( $source['url'], PHP_URL_PATH ), PATHINFO_EXTENSION ) );
		return $map[ $ext ] ?? 'video/mp4';
	}
}

if ( ! function_exists( 'sgs_media_video' ) ) {
	/**
	 * One `<video>` for every device that shows video: one `<source media>` per distinct file and no catch-all. An
	 * autoplaying video also requires `(prefers-reduced-motion: no-preference)` in each query, so a device or visitor
	 * that matches none downloads nothing.
	 *
	 * @param array<string,array|null> $sources  Device => normalised video source, null where not shown.
	 * @param array                    $playback `sgs_media_playback()` result.
	 * @param array                    $options  `classes`, `label`, `decorative`.
	 * @return string
	 */
	function sgs_media_video( array $sources, array $playback, array $options ): string {
		$shown = array_filter( $sources );
		if ( ! $shown ) {
			return '';
		}
		$by_file = array();
		foreach ( $shown as $device => $source ) {
			$by_file[ $source['url'] ]['source']    = $source;
			$by_file[ $source['url'] ]['devices'][] = $device;
		}
		$all_devices = count( $shown ) === count( sgs_media_devices() );
		$motion      = '(prefers-reduced-motion:no-preference)';
		$out         = '';
		foreach ( $by_file as $entry ) {
			$queries = array_map( 'sgs_media_device_query', $entry['devices'] );
			if ( $all_devices && 1 === count( $by_file ) ) {
				$media = $playback['autoplay'] ? $motion : '';
			} elseif ( $playback['autoplay'] ) {
				$media = implode( ', ', array_map( static fn( string $q ): string => $q . ' and ' . $motion, $queries ) );
			} else {
				$media = implode( ', ', $queries );
			}
			$out .= '<source src="' . esc_url( $entry['source']['url'] ) . '" type="' . esc_attr( sgs_media_video_mime( $entry['source'] ) ) . '"'
				. ( '' !== $media ? ' media="' . esc_attr( $media ) . '"' : '' ) . ' />';
		}
		$first = reset( $shown );
		if ( ! empty( $first['captions']['url'] ) ) {
			$out .= '<track kind="captions" src="' . esc_url( (string) $first['captions']['url'] ) . '" label="' . esc_attr( (string) ( $first['captions']['label'] ?? '' ) ) . '" srclang="' . esc_attr( (string) ( $first['captions']['lang'] ?? 'en' ) ) . '" />';
		}
		$attrs = ' class="' . esc_attr( (string) $options['classes'] ) . '" data-sgs-device-video'
			. ( $playback['autoplay'] ? ' autoplay data-sgs-autoplay' : '' )
			. ( $playback['muted'] ? ' muted' : '' )
			. ( $playback['loop'] ? ' loop' : '' )
			. ( $playback['inline'] ? ' playsinline' : '' )
			. ( $playback['controls'] ? ' controls' : '' )
			. ' preload="' . ( $playback['lazy'] ? 'none' : 'metadata' ) . '"';
		if ( empty( $options['decorative'] ) && '' !== (string) ( $options['label'] ?? '' ) ) {
			$attrs .= ' aria-label="' . esc_attr( (string) $options['label'] ) . '"';
		} elseif ( ! empty( $options['decorative'] ) ) {
			$attrs .= ' aria-hidden="true" tabindex="-1"';
		}
		return '<video' . $attrs . '>' . $out . '</video>';
	}
}

if ( ! function_exists( 'sgs_media_pause_button' ) ) {
	/**
	 * The pause control for an autoplaying video (Spec 49 §8, Spec 38 §1: SC 2.2.2).
	 *
	 * Printed `hidden`: the view module shows it once the video is playing, so with no script, or under reduced motion
	 * (nothing autoplays), no dead control sits in the tab order. `aria-pressed` is true while the visitor has paused, and the
	 * play icon replaces the pause icon.
	 *
	 * @return string
	 */
	function sgs_media_pause_button(): string {
		return '<button type="button" class="sgs-media-pause sgs-focus--duotone" data-sgs-media-pause aria-pressed="false" hidden'
			. ' data-sgs-label-pause="' . esc_attr( esc_html__( 'Pause video', 'sgs-blocks' ) ) . '"'
			. ' data-sgs-label-play="' . esc_attr( esc_html__( 'Play video', 'sgs-blocks' ) ) . '"'
			. ' aria-label="' . esc_attr( esc_html__( 'Pause video', 'sgs-blocks' ) ) . '">'
			. '<span class="sgs-media-pause__bars" aria-hidden="true"></span><span class="sgs-media-pause__play" aria-hidden="true" hidden></span></button>';
	}
}
