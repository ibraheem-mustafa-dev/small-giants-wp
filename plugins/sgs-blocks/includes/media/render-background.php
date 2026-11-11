<?php
/**
 * Media renderer: the background branch (Spec 49 §7.8, §7.9, §10.3).
 *
 * A background is a slot in one real element, `.sgs-bg-media`, printed as the section's first layer:
 *
 *   <div class="sgs-bg-media">  picture | tile layer | video stack | inline SVG, one sibling per kind
 *   <span class="sgs-bg-overlay">
 *
 * Each device resolves its own kind and file (FR-49-9); the shown files download and the others print the blank
 * source (`render-picture.php`). Only a tiled or Pinned image paints with CSS, as `background-image` on the element
 * itself; every other photo is an `<img>` the browser's preload scanner finds. A tiled or Pinned image that is the
 * page's lead is a CSS background the scanner cannot see, so it prints a `<link rel="preload" as="image">` per device
 * instead (§14.4 WP-8).
 *
 * `sgs_media_render_background()` is C2 for a slot whose context is `background`; `SGS_Container_Wrapper` calls the two
 * halves (`sgs_bg_media_html()` before it knows its scope class, `sgs_bg_media_css()` once it does).
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/render-sources.php';
require_once __DIR__ . '/render-picture.php';
require_once __DIR__ . '/render-chrome.php';
require_once __DIR__ . '/tier-svg.php';
require_once __DIR__ . '/media-values.php';
require_once dirname( __DIR__ ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_bg_media_capability' ) ) {
	/**
	 * The declared background capability (`background-capability.json`): the class names and kinds this renderer prints.
	 *
	 * @return array<string,mixed>
	 */
	function sgs_bg_media_capability(): array {
		static $cap = null;
		if ( null === $cap ) {
			$json = json_decode( (string) file_get_contents( __DIR__ . '/background-capability.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a plugin file.
			$cap  = is_array( $json['background'] ?? null ) ? $json['background'] : array(
				'element_class' => 'sgs-bg-media',
				'overlay_class' => 'sgs-bg-overlay',
				'kinds'         => array( 'image', 'video', 'svg' ),
			);
		}
		return $cap;
	}
}

if ( ! function_exists( 'sgs_bg_media_slot' ) ) {
	/**
	 * The slot every adopted block declares for its background (prefix `background`, context `background`).
	 *
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_bg_media_slot(): array {
		return array(
			'prefix'  => 'background',
			'kinds'   => array_map( 'strval', (array) ( sgs_bg_media_capability()['kinds'] ?? array() ) ),
			'context' => 'background',
		);
	}
}

if ( ! function_exists( 'sgs_bg_media_file_url' ) ) {
	/**
	 * The one URL a CSS-painted image uses: the attachment's full file, else the stored URL.
	 *
	 * @param array $file Normalised image source.
	 * @return string An escaped URL safe inside `url()`, or ''.
	 */
	function sgs_bg_media_file_url( array $file ): string {
		$url = '';
		if ( (int) $file['id'] > 0 && function_exists( 'wp_get_attachment_image_url' ) ) {
			$url = (string) wp_get_attachment_image_url( (int) $file['id'], 'full' );
		}
		return sgs_media_url( '' !== $url ? $url : (string) $file['url'] );
	}
}

if ( ! function_exists( 'sgs_bg_media_plan' ) ) {
	/**
	 * What each device shows and how it is painted, from the stored values alone (no request state).
	 *
	 * `paint` per device is `image` (an `<img>`), `css` (a tiled or Pinned image painted on the element), `video`, `svg`
	 * or `none`; `fit` is the Fit in force there.
	 *
	 * @param array $slot  The background slot.
	 * @param array $attrs Block attributes.
	 * @return array{sources:array,paint:array<string,string>,fit:array<string,string>,pinned:bool,decorative:bool,kinds:string[]}
	 */
	function sgs_bg_media_plan( array $slot, array $attrs ): array {
		$sources = sgs_media_resolve_sources( $slot, $attrs );
		$pinned  = true === sgs_media_scalar( $attrs, $slot, 'Pinned' );
		$fit     = array();
		$paint   = array();
		$kinds   = array();
		foreach ( sgs_media_devices() as $device ) {
			$source = $sources[ $device ];
			$value  = sgs_media_resolved( $attrs, $slot, 'Fit', $device );
			$fit[ $device ] = is_string( $value ) && '' !== $value ? $value : 'cover';
			if ( null === $source ) {
				$paint[ $device ] = 'none';
				continue;
			}
			$kinds[ $source['kind'] ] = true;
			if ( 'image' === $source['kind'] ) {
				$paint[ $device ] = ( $pinned || 'tile' === $fit[ $device ] ) ? 'css' : 'image';
			} else {
				$paint[ $device ] = $source['kind'];
			}
		}
		$decorative = array_key_exists( sgs_media_key( $slot, 'Decorative' ), $attrs ) ? (bool) $attrs[ sgs_media_key( $slot, 'Decorative' ) ] : true;
		return array(
			'sources'    => $sources,
			'paint'      => $paint,
			'fit'        => $fit,
			'pinned'     => $pinned && in_array( 'css', $paint, true ),
			'decorative' => $decorative,
			'kinds'      => array_keys( $kinds ),
		);
	}
}

if ( ! function_exists( 'sgs_bg_media_siblings' ) ) {
	/**
	 * The devices that show each printed sibling, by its class.
	 *
	 * @param array $plan The plan.
	 * @return array<string,string[]> Sibling class => devices.
	 */
	function sgs_bg_media_siblings( array $plan ): array {
		$out  = array();
		$svgs = array();
		foreach ( sgs_media_devices() as $device ) {
			$paint = $plan['paint'][ $device ];
			if ( 'image' === $paint ) {
				$out['sgs-media-sib--image'][] = $device;
			} elseif ( 'video' === $paint ) {
				$out['sgs-media-sib--video'][] = $device;
			} elseif ( 'svg' === $paint ) {
				$svgs[ md5( $plan['sources'][ $device ]['markup'] ) ][] = $device;
			}
		}
		$n = 0;
		foreach ( $svgs as $devices ) {
			++$n;
			$out[ 'sgs-media-sib--svg-' . $n ] = $devices;
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_bg_media_preload_links' ) ) {
	/**
	 * One preload link per distinct CSS-painted file of the page's lead background (§14.4 WP-8), each for its devices.
	 *
	 * `imagesrcset` names the one file the stylesheet requests (with its width), so the preload and the paint share a
	 * request instead of racing two candidates.
	 *
	 * @param array $plan The plan.
	 * @return string The link tags.
	 */
	function sgs_bg_media_preload_links( array $plan ): string {
		$by_file = array();
		foreach ( sgs_media_devices() as $device ) {
			if ( 'css' !== $plan['paint'][ $device ] ) {
				continue;
			}
			$file = $plan['sources'][ $device ];
			$url  = sgs_bg_media_file_url( $file );
			if ( '' === $url ) {
				continue;
			}
			$by_file[ $url ]['file']      = $file;
			$by_file[ $url ]['devices'][] = $device;
		}
		$out = '';
		foreach ( $by_file as $url => $entry ) {
			$query = implode( ', ', array_map( 'sgs_media_device_query', $entry['devices'] ) );
			$width = (int) $entry['file']['width'];
			$out  .= '<link rel="preload" as="image" href="' . esc_url( $url ) . '"'
				. ' imagesrcset="' . esc_attr( $url . ( $width > 0 ? ' ' . $width . 'w' : '' ) ) . '" imagesizes="100vw"'
				. ' media="' . esc_attr( $query ) . '" fetchpriority="high" />';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_bg_media_html' ) ) {
	/**
	 * The background element, and the preload links of a lead that no element carries.
	 *
	 * Returns an empty `html` when no device shows anything. `lead` is true when this slot took the page's
	 * `fetchpriority="high"`; call once per slot, the claim is per request.
	 *
	 * @param array $slot    The background slot.
	 * @param array $attrs   Block attributes.
	 * @param array $context `in_editor`, `hidden` (inside a hidden surface), `extra_class`, `lottie` (a Lottie layer sits on the part).
	 * @return array{html:string,preload:string,lead:bool,plan:array,has_image:bool,has_video:bool,has_svg:bool,first_image:?array}
	 */
	function sgs_bg_media_html( array $slot, array $attrs, array $context = array() ): array {
		$plan   = sgs_bg_media_plan( $slot, $attrs );
		$result = array(
			'html'        => '',
			'preload'     => '',
			'lead'        => false,
			'plan'        => $plan,
			'has_image'   => false,
			'has_video'   => false,
			'has_svg'     => false,
			'first_image' => null,
		);
		if ( ! array_filter( $plan['sources'] ) ) {
			return $result;
		}
		$cap       = sgs_bg_media_capability();
		$devices   = sgs_media_devices();
		$playback  = sgs_media_playback( $slot, $attrs );
		$alt       = (string) ( $attrs[ sgs_media_key( $slot, 'Alt' ) ] ?? '' );
		$decorative = $plan['decorative'];
		$alt_of    = static function ( array $source ) use ( $decorative, $alt ): string {
			return $decorative ? '' : ( '' !== $source['alt'] ? $source['alt'] : $alt );
		};

		$images = array();
		$videos = array();
		$svgs   = array();
		foreach ( $devices as $device ) {
			$source            = $plan['sources'][ $device ];
			$images[ $device ] = null;
			$videos[ $device ] = null;
			if ( null === $source ) {
				continue;
			}
			if ( 'image' === $source['kind'] && 'image' === $plan['paint'][ $device ] ) {
				$images[ $device ] = $source;
			} elseif ( 'video' === $source['kind'] ) {
				$videos[ $device ] = $source;
			} elseif ( 'svg' === $source['kind'] ) {
				$key                       = md5( $source['markup'] );
				$svgs[ $key ]['source']    = $source;
				$svgs[ $key ]['devices'][] = $device;
			}
		}
		$image_files = array_filter( $images );
		$video_files = array_filter( $videos );
		foreach ( $plan['sources'] as $source ) {
			if ( $source && 'image' === $source['kind'] && null === $result['first_image'] ) {
				$result['first_image'] = $source;
			}
		}

		// Loading, resolved once for the slot: the first image (element or CSS) or the video's cover sets the size.
		$loading  = 'lazy';
		$fetch    = '';
		$lead     = false;
		$measured = $result['first_image'] ?? ( $video_files ? reset( $video_files )['poster'] : null );
		// With no motion renderer around the block (a bare render) there is no page to lead: lazy, never high (§7.7 rule 2).
		if ( ( $result['first_image'] || $video_files ) && class_exists( 'SGS_Media_Priority' ) && class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Renderer' ) ) {
			$load     = (string) ( $attrs[ sgs_media_key( $slot, 'Loading' ) ] ?? 'auto' );
			$resolved = SGS_Media_Priority::resolve(
				array(
					'hidden' => ! empty( $context['hidden'] ),
					'load'   => in_array( $load, array( 'first', 'later' ), true ) ? $load : '',
					'role'   => 'background',
					'width'  => (int) ( $measured['width'] ?? 0 ),
					'height' => (int) ( $measured['height'] ?? 0 ),
				)
			);
			$loading  = (string) ( $resolved['loading'] ?? 'lazy' );
			$fetch    = (string) ( $resolved['fetchpriority'] ?? '' );
			$lead     = ! empty( $resolved['claims']['lead'] );
		}
		$sizes = array_fill_keys( $devices, sgs_media_sizes_for_width( null, 'lazy' === $loading ) );

		// One sibling per kind; `sgs_bg_media_siblings()` says which devices show each.
		$html = '';
		if ( $image_files ) {
			$first = reset( $image_files );
			$html .= sgs_media_picture(
				array_map(
					static fn( $s ) => $s ? array_intersect_key( $s, array_flip( array( 'id', 'url', 'width', 'height' ) ) ) : null,
					$images
				),
				array(
					'classes'         => 'sgs-media-el',
					'picture_classes' => 'sgs-media-picture sgs-media-sib sgs-media-sib--image',
					'alt'             => $alt_of( $first ),
					'loading'         => $loading,
					'fetchpriority'   => $fetch,
					'sizes'           => $sizes,
					'force_picture'   => true,
				)
			);
		}
		if ( $video_files ) {
			$first = reset( $video_files );
			$cover = array();
			foreach ( $videos as $device => $source ) {
				$cover[ $device ] = $source && '' !== $source['poster']['url'] ? $source['poster'] : null;
			}
			$stack  = sgs_media_picture(
				$cover,
				array(
					'classes'         => 'sgs-media-el sgs-media-cover',
					'picture_classes' => 'sgs-media-picture',
					'alt'             => '',
					'loading'         => $loading,
					'fetchpriority'   => $fetch,
					'sizes'           => $sizes,
					'force_picture'   => true,
				)
			);
			$stack .= sgs_media_video(
				$videos,
				$playback,
				array(
					'classes'    => 'sgs-media-el sgs-media-video',
					'label'      => $alt_of( $first ),
					'decorative' => $decorative,
				)
			);
			$stack .= $playback['autoplay'] && $playback['pause'] ? sgs_media_pause_button() : '';
			$html  .= '<span class="sgs-media-stack sgs-media-sib sgs-media-sib--video">' . $stack . '</span>';
		}
		$n   = 0;
		$fit = (string) $plan['fit']['desktop'];
		foreach ( $svgs as $entry ) {
			++$n;
			$label = $alt_of( $entry['source'] );
			$svg   = sgs_media_svg_element(
				$entry['source']['markup'],
				'sgs-media-el sgs-media-svg sgs-media-sib sgs-media-sib--svg-' . $n,
				'sgs-bg-s' . $n . '-' . substr( md5( $entry['source']['markup'] ), 0, 6 ) . '-',
				$label,
				'' === $label,
				$fit
			);
			if ( '' === $svg ) {
				continue;
			}
			$html .= $svg;
		}
		$result['has_image'] = (bool) array_filter( $plan['paint'], static fn( $p ) => in_array( $p, array( 'image', 'css' ), true ) );
		$result['has_video'] = (bool) $video_files;
		$result['has_svg']   = '' !== $html && ! empty( $svgs ) && (bool) array_intersect( array( 'svg' ), array_values( $plan['paint'] ) );
		if ( '' === $html && ! in_array( 'css', $plan['paint'], true ) ) {
			return $result;
		}

		$class  = $cap['element_class'] . ( $plan['pinned'] ? ' ' . $cap['element_class'] . '--pinned' : '' )
			. ( in_array( 'css', $plan['paint'], true ) ? ' ' . $cap['element_class'] . '--painted' : '' );
		$class .= ! empty( $context['lottie'] ) ? ' sgs-container__lottie-bg' : '';
		$class .= '' !== trim( (string) ( $context['extra_class'] ?? '' ) ) ? ' ' . trim( (string) $context['extra_class'] ) : '';
		$result['html'] = '<div class="' . esc_attr( $class ) . '"' . ( $decorative ? ' aria-hidden="true"' : '' ) . '>' . $html . '</div>';
		if ( $lead && in_array( 'css', $plan['paint'], true ) ) {
			$result['preload'] = sgs_bg_media_preload_links( $plan );
		}
		$result['lead'] = $lead;
		if ( empty( $context['in_editor'] ) && function_exists( 'sgs_media_enqueue_assets' ) ) {
			sgs_media_enqueue_assets( false, (bool) $video_files );
			sgs_bg_media_enqueue_sheet();
		}
		return $result;
	}
}

if ( ! function_exists( 'sgs_bg_media_enqueue_sheet' ) ) {
	/**
	 * Enqueue the background stylesheet.
	 *
	 * @return void
	 */
	function sgs_bg_media_enqueue_sheet(): void {
		if ( ! defined( 'SGS_BLOCKS_URL' ) || ! defined( 'SGS_BLOCKS_PATH' ) || ! function_exists( 'wp_enqueue_style' ) ) {
			return;
		}
		$rel  = (string) ( sgs_bg_media_capability()['stylesheet'] ?? 'assets/css/media-bg.css' );
		$file = SGS_BLOCKS_PATH . $rel;
		if ( file_exists( $file ) ) {
			wp_enqueue_style( 'sgs-media-bg', SGS_BLOCKS_URL . $rel, array(), (string) filemtime( $file ) );
		}
	}
}

if ( ! function_exists( 'sgs_media_render_background' ) ) {
	/**
	 * C2 for a slot whose context is `background`: the element and its per-instance CSS.
	 *
	 * @param array $slot    `{prefix, kinds, context}`.
	 * @param array $attrs   Block attributes.
	 * @param array $context `{uid, in_editor, hidden, extra_class, lottie}`; `uid` is the scope class the rules print under.
	 * @return array{html:string,css:string,needs_helper:bool,lead_candidate:bool}
	 */
	function sgs_media_render_background( array $slot, array $attrs, array $context = array() ): array {
		$slot = array_merge( sgs_bg_media_slot(), $slot );
		$done = sgs_bg_media_html( $slot, $attrs, $context );
		$uid  = sanitize_html_class( (string) ( $context['uid'] ?? '' ) );
		return array(
			'html'           => $done['preload'] . $done['html'],
			'css'            => '' === $done['html'] || '' === $uid ? '' : sgs_bg_media_css( $uid, $slot, $attrs ),
			'needs_helper'   => false,
			'lead_candidate' => $done['lead'],
		);
	}
}

require_once __DIR__ . '/background-css.php';
