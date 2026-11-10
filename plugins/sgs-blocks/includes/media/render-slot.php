<?php
/**
 * Media renderer: `SGS_Media_Element::render()`'s implementation (Spec 49 C2).
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
require_once __DIR__ . '/tier-embed.php';

/**
 * Every defined C3 emitter id (`sgs_media_atom_<id>_emit`), sorted.
 *
 * @return string[]
 */
function sgs_media_atom_emitter_ids(): array {
	$ids = array();
	foreach ( get_defined_functions()['user'] as $name ) {
		if ( preg_match( '/^sgs_media_atom_(.+)_emit$/', $name, $m ) ) {
			$ids[] = $m[1];
		}
	}
	sort( $ids );
	return $ids;
}

/**
 * Render one media slot (Spec 49 C2): markup, per-instance CSS, whether the helper printed and whether the
 * slot is the page's lead image candidate.
 *
 * Nesting is `figure > a > helper > mask > media element`, omitting the levels not needed (§7.1). CSS comes
 * from each atom's `sgs_media_atom_<id>_emit()` when it exists, plus the sibling and caption rules. An empty
 * or deleted source returns empty `html`.
 *
 * @param array $slot    `{prefix, kinds, context}`.
 * @param array $attrs   Block attributes.
 * @param array $context `{uid, block, area, section_index, item_set:{index,columns}, in_editor, extra_class, anchor}`
 *                       plus `effects`, `entrance` and `hover` for §7.3.
 * @return array{html:string,css:string,needs_helper:bool,lead_candidate:bool}
 */
function sgs_media_render_slot( array $slot, array $attrs, array $context = array() ): array {
	$result  = array(
		'html'           => '',
		'css'            => '',
		'needs_helper'   => false,
		'lead_candidate' => false,
	);
	$prefix  = (string) ( $slot['prefix'] ?? '' );
	$sources = sgs_media_resolve_sources( $slot, $attrs );
	if ( ! array_filter( $sources ) ) {
		return $result;
	}
	$uid = sanitize_html_class( (string) ( $context['uid'] ?? '' ) );
	if ( '' === $uid ) {
		$uid = 'sgs-media-' . substr( md5( (string) wp_json_encode( array( $slot, $attrs ) ) ), 0, 8 );
	}
	$attr       = static function ( string $base ) use ( $attrs, $prefix ) {
		return $attrs[ sgs_media_element_attr( $prefix, $base ) ] ?? null;
	};
	$playback   = sgs_media_playback( $slot, $attrs );
	$decorative = ! empty( $attr( 'Decorative' ) );
	$base_alt   = (string) $attr( 'Alt' );
	$alt_of     = static function ( array $source ) use ( $decorative, $base_alt ): string {
		return $decorative ? '' : ( '' !== $source['alt'] ? $source['alt'] : $base_alt );
	};

	// Group the devices by what they show.
	$images = array();
	$videos = array();
	$embeds = array();
	$svgs   = array();
	foreach ( sgs_media_devices() as $device ) {
		$source            = $sources[ $device ];
		$images[ $device ] = null;
		$videos[ $device ] = null;
		if ( null === $source ) {
			continue;
		}
		if ( 'image' === $source['kind'] ) {
			$images[ $device ] = $source;
		} elseif ( 'video' === $source['kind'] ) {
			$videos[ $device ] = $source;
		} elseif ( 'embed' === $source['kind'] ) {
			$key                         = sgs_media_normalise_embed_url( $source['url'], $playback );
			$embeds[ $key ]['source']    = $source;
			$embeds[ $key ]['devices'][] = $device;
		} else {
			$key                       = md5( $source['markup'] );
			$svgs[ $key ]['source']    = $source;
			$svgs[ $key ]['devices'][] = $device;
		}
	}
	$image_files = array_filter( $images );
	$video_files = array_filter( $videos );
	$all         = count( sgs_media_devices() );
	$total       = ( $image_files ? 1 : 0 ) + ( $video_files ? 1 : 0 ) + count( $embeds ) + count( $svgs );
	$one_file    = $image_files && count( $image_files ) === $all && 1 === count( array_unique( array_map( 'sgs_media_file_key', $image_files ) ) );
	$only_embed  = 1 === count( $embeds ) ? reset( $embeds ) : null;
	$only_svg    = 1 === count( $svgs ) ? reset( $svgs ) : null;
	$bare        = 1 === $total && ( $one_file || ( $only_embed && count( $only_embed['devices'] ) === $all ) || ( $only_svg && count( $only_svg['devices'] ) === $all ) );

	// What surrounds the media.
	$caption     = trim( (string) ( $attrs['caption'] ?? '' ) );
	$link_url    = $decorative ? '' : trim( (string) ( $attrs['linkUrl'] ?? '' ) );
	$helper      = sgs_media_needs_helper( $prefix, $attrs, $context );
	$fill        = $helper && sgs_media_any_value( $attr( 'Height' ), static fn( $v ): bool => 'fill' === $v );
	$has_figure  = '' !== $caption;
	$has_link    = '' !== $link_url;
	$plain       = $bare && ! $has_figure && ! $has_link && ! $helper;
	$needs_group = ! $has_figure && ! $has_link && ! $helper && ! $plain;

	// Loading, resolved once for the slot.
	$loading = 'lazy';
	$fetch   = '';
	if ( ( $image_files || $video_files ) && class_exists( 'SGS_Media_Priority' ) ) {
		$load_priority = (string) ( $attr( 'Loading' ) ?? 'auto' );
		$first_img     = $image_files ? reset( $image_files ) : array(
			'width'  => 0,
			'height' => 0,
		);
		$resolved  = SGS_Media_Priority::resolve(
			array_merge(
				$context,
				array(
					'uid'    => $uid,
					'slot'   => $slot,
					'prefix' => $prefix,
					'kind'   => $image_files ? 'image' : 'video',
					'width'  => (int) $first_img['width'],
					'height' => (int) $first_img['height'],
					'load'   => in_array( $load_priority, array( 'first', 'later' ), true ) ? $load_priority : '',
					'role'   => (string) ( $context['role'] ?? '' ),
				)
			)
		);
		$loading   = (string) ( $resolved['loading'] ?? 'lazy' );
		$fetch     = (string) ( $resolved['fetchpriority'] ?? '' );
	}
	$columns = (int) ( $context['item_set']['columns'] ?? 0 );
	$widths  = sgs_media_device_values( $attr( 'Width' ) );
	$sizes   = array();
	foreach ( sgs_media_devices() as $device ) {
		$sizes[ $device ] = sgs_media_sizes_for_width( $widths[ $device ], 'lazy' === $loading, $columns );
	}
	$crop_id = $image_files ? (int) reset( $image_files )['id'] : 0;
	if ( $crop_id > 0 && ! empty( $context['block'] ) && function_exists( 'sgs_media_cover_crop_plan' ) ) {
		$plan = sgs_media_cover_crop_plan( $attrs, $prefix, (string) $context['block'], $crop_id );
		if ( ! empty( $plan['sizes'] ) ) {
			$sizes = array_fill_keys( sgs_media_devices(), (string) $plan['sizes'] );
		}
	}

	// The media elements: one sibling per kind, per distinct embed and per distinct SVG.
	$direct   = 'sgs-media-el' . ( $plain ? ' sgs-media ' . $uid : '' );
	$siblings = array();
	$html     = '';
	if ( $image_files ) {
		$first = reset( $image_files );
		$html .= sgs_media_picture(
			array_map(
				static fn( $s ) => $s ? array_intersect_key( $s, array_flip( array( 'id', 'url', 'width', 'height' ) ) ) : null,
				$images
			),
			array(
				'classes'         => $direct,
				'picture_classes' => $plain ? 'sgs-media-picture' : 'sgs-media-picture sgs-media-sib sgs-media-sib--image',
				'alt'             => $alt_of( $first ),
				'loading'         => $loading,
				'fetchpriority'   => $fetch,
				'sizes'           => $sizes,
			)
		);
		$siblings['sgs-media-sib--image'] = array_keys( $image_files );
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
		$html .= '<span class="sgs-media-stack sgs-media-sib sgs-media-sib--video">' . $stack . '</span>';
		$siblings['sgs-media-sib--video'] = array_keys( $video_files );
	}
	$n = 0;
	foreach ( $embeds as $url => $entry ) {
		++$n;
		$class = $plain ? $direct . ' sgs-media-embed' : 'sgs-media-el sgs-media-embed sgs-media-sib sgs-media-sib--embed-' . $n;
		$html .= sgs_media_embed_element( (string) $url, $class, $alt_of( $entry['source'] ) );
		$siblings[ 'sgs-media-sib--embed-' . $n ] = $entry['devices'];
	}
	$n   = 0;
	$fit = (string) sgs_media_device_values( $attr( 'Fit' ) )['desktop'];
	foreach ( $svgs as $entry ) {
		++$n;
		$class = $plain ? $direct . ' sgs-media-svg' : 'sgs-media-el sgs-media-svg sgs-media-sib sgs-media-sib--svg-' . $n;
		$label = $alt_of( $entry['source'] );
		$html .= sgs_media_svg_element( $entry['source']['markup'], $class, $uid . '-s' . $n . '-', $label, '' === $label, $fit );
		$siblings[ 'sgs-media-sib--svg-' . $n ] = $entry['devices'];
	}
	if ( '' === $html ) {
		return $result;
	}

	// Nesting, innermost first. The outermost printed element carries the uid, the block classes and the anchor.
	$outer = static function ( string $classes ) use ( $context, $uid ): string {
		$extra  = trim( (string) ( $context['extra_class'] ?? '' ) );
		$anchor = trim( (string) ( $context['anchor'] ?? '' ) );
		return ' class="' . esc_attr( trim( $classes . ' sgs-media ' . $uid . ' ' . $extra ) ) . '"' . ( '' !== $anchor ? ' id="' . esc_attr( $anchor ) . '"' : '' );
	};
	$out = $html;
	if ( $needs_group ) {
		$out = '<span' . $outer( 'sgs-media-group' ) . '>' . $out . '</span>';
	}
	if ( $helper ) {
		$box  = 'sgs-media-box' . ( $fill ? ' sgs-media-box--fill' : '' );
		$mask = sgs_media_has_mask( $prefix, $attrs );
		$out  = ( $mask ? '<span class="sgs-media-box__mask">' . $out . '</span>' : $out );
		$out  = '<span' . ( $has_figure || $has_link ? ' class="' . $box . '"' : $outer( $box ) ) . '>' . $out . '</span>';
	}
	if ( $has_link ) {
		$new_tab = ! empty( $attrs['linkOpensNewTab'] );
		$rel     = trim( (string) ( $attrs['linkRel'] ?? '' ) . ( $new_tab ? ' noopener noreferrer' : '' ) );
		$a_class = 'sgs-media-link' . ( $fill && ! $has_figure ? ' sgs-fill-wrap' : '' );
		$out     = '<a' . ( $has_figure ? ' class="' . $a_class . '"' : $outer( $a_class ) )
			. ' href="' . esc_url( $link_url ) . '"' . ( $new_tab ? ' target="_blank"' : '' ) . ( '' !== $rel ? ' rel="' . esc_attr( $rel ) . '"' : '' )
			. '>' . $out . '</a>';
	}
	if ( $has_figure ) {
		$out = '<figure' . $outer( $fill ? 'sgs-fill-wrap' : '' ) . '>' . $out
			. '<figcaption class="sgs-media-caption">' . wp_kses_post( $caption ) . '</figcaption></figure>';
	}

	// CSS: the sibling rules, the caption rule, then each atom's own emitter.
	$atom_slot = array_merge( $slot, array( 'wrapper' => $has_figure || $has_link || $needs_group ) );
	$css       = sgs_media_sibling_css( $uid, $plain ? array() : $siblings );
	if ( $has_figure ) {
		$css .= sgs_media_caption_css( $uid, sgs_media_width_is_auto( $prefix, $attrs ) );
	}
	foreach ( sgs_media_atom_emitter_ids() as $id ) {
		$emit = 'sgs_media_atom_' . $id . '_emit';
		if ( function_exists( $emit ) ) {
			$css .= (string) $emit( $atom_slot, $attrs, $uid, $helper );
		}
	}
	if ( ! empty( $slot['kinds'] ) && empty( $context['in_editor'] ) ) {
		sgs_media_enqueue_assets( $helper, (bool) $video_files );
	}
	return array(
		'html'           => $out,
		'css'            => $css,
		'needs_helper'   => $helper,
		'lead_candidate' => 'high' === $fetch,
	);
}
