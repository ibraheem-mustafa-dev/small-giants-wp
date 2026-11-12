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
require_once dirname( __DIR__ ) . '/helpers-link-source.php';

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
 * The atoms whose settings differ per item of an item set (§8.3): `source`, `alt`, `decorative`, `fit`, `focal`.
 * Their rules print under each item's own scope class; every other atom's rules print once under the block's.
 *
 * @return string[]
 */
function sgs_media_item_atom_ids(): array {
	return array( 'focal_point', 'meaning', 'object_fit', 'source' );
}

/**
 * Render one media slot (Spec 49 C2): markup, per-instance CSS, whether the helper printed and whether the
 * slot is the page's lead image candidate.
 *
 * Nesting is `figure > a > helper > mask > media element`, omitting the levels not needed (§7.1). CSS comes
 * from each atom's `sgs_media_atom_<id>_emit()` when it exists, plus the sibling and caption rules. An empty
 * or deleted source returns empty `html`.
 *
 * An item of an item set passes `item_set.index`: the item prints in a group carrying `{uid}-i{index}` and the block's
 * `{uid}`, its per-item rules (sibling, caption, fit, focal) use `{uid}-i{index}`, and the block-level rules print under
 * `{uid}` once, with the item whose `item_set.block_rules` is true (item 0 when the key is absent). `item_set.columns`
 * is one count or a count per device.
 *
 * @param array $slot    `{prefix, kinds, context}`.
 * @param array $attrs   Block attributes.
 * @param array $context `{uid, block, area, section_index, item_set:{index,columns,block_rules}, in_editor, extra_class, anchor,
 *                       device_queries}` (device_queries: device => the media condition that shows that device's image, for a
 *                       block with its own switch width) plus `effects`, `entrance` and `hover` for §7.3.
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
	$block_uid = sanitize_html_class( (string) ( $context['uid'] ?? '' ) );
	if ( '' === $block_uid ) {
		$block_uid = 'sgs-media-' . substr( md5( (string) wp_json_encode( array( $slot, $attrs ) ) ), 0, 8 );
	}
	// An item of an item set (§8.3): per-item rules use `{uid}-i{index}`; block-level rules print once, with item 0.
	$item_set   = is_array( $context['item_set'] ?? null ) ? $context['item_set'] : array();
	$item_index = isset( $item_set['index'] ) && is_numeric( $item_set['index'] ) ? max( 0, (int) $item_set['index'] ) : null;
	$uid        = null === $item_index ? $block_uid : $block_uid . '-i' . $item_index;
	$block_rules = null === $item_index || ! empty( $item_set['block_rules'] ) || ( ! array_key_exists( 'block_rules', $item_set ) && 0 === $item_index );
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
			// An autoplaying embed prints without autoplay; the view module turns it on unless motion is reduced.
			$embeds[ $key ]['still']     = $playback['autoplay'] ? sgs_media_normalise_embed_url( $source['url'], array_merge( $playback, array( 'autoplay' => false ) ) ) : '';
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
	$caption     = trim( (string) $attr( 'Caption' ) );
	$caption_tag = in_array( $attr( 'CaptionTag' ), array( 'figcaption', 'div' ), true ) ? (string) $attr( 'CaptionTag' ) : 'figcaption';
	$link_url    = '';
	$link_source = '';
	if ( ! $decorative ) {
		$link_source = is_string( $attr( 'LinkUrlSource' ) ) ? (string) $attr( 'LinkUrlSource' ) : '';
		$link_url    = trim( (string) sgs_link_source_href( $link_source, trim( (string) $attr( 'LinkUrl' ) ) ) );
	}
	$helper      = sgs_media_needs_helper( $prefix, $attrs, $context );
	$fill        = $helper && sgs_media_any_value( $attr( 'Height' ), static fn( $v ): bool => 'fill' === $v );
	$has_figure  = '' !== $caption;
	$has_link    = '' !== $link_url;
	// An item of an item set always sits in one group that owns the scope classes, so the block-level rules find the
	// same nodes in every item whatever its caption, link or helper.
	$grouped     = null !== $item_index;
	$plain       = $bare && ! $has_figure && ! $has_link && ! $helper && ! $grouped;
	$needs_group = ! $has_figure && ! $has_link && ! $helper && ! $plain && ! $grouped;

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
	// `columns` is one count or a count per device (§8.3); each device's `sizes` divides by its own count.
	$columns    = sgs_media_device_values( $item_set['columns'] ?? 0 );
	$widths     = sgs_media_device_values( $attr( 'Width' ) );
	$max_widths = sgs_media_device_values( $attr( 'MaxWidth' ) );
	// `item_width`: a fixed px width per device where the items are not sized by the column count (a swipe row's tracks).
	$item_widths = (array) ( $item_set['item_width'] ?? array() );
	// `item_cap`: a px width every item stays within on every device (a brand strip's logo box is at most its Max height).
	$item_cap = sgs_media_sizes_px( $item_set['item_cap'] ?? null );
	if ( null === $item_cap && isset( $item_set['item_cap'] ) && is_numeric( $item_set['item_cap'] ) && (float) $item_set['item_cap'] > 0 ) {
		$item_cap = (float) $item_set['item_cap'];
	}
	if ( null !== $item_cap ) {
		foreach ( sgs_media_devices() as $device ) {
			$m_px = sgs_media_sizes_px( $max_widths[ $device ] );
			if ( null === $m_px || $item_cap < $m_px ) {
				$max_widths[ $device ] = $item_cap . 'px';
			}
		}
	}
	// A px Height with no Width leaves the width automatic: the image's own shape (Height x ratio), or less where the
	// container clamps it (a logo sized by height). That figure joins Max width as a cap on the slot's width.
	$heights = sgs_media_device_values( $attr( 'Height' ) );
	foreach ( sgs_media_devices() as $device ) {
		$file  = $images[ $device ] ?? null;
		$h_px  = sgs_media_sizes_px( $heights[ $device ] );
		$w_set = null !== $widths[ $device ] && '' !== $widths[ $device ];
		if ( $w_set || null === $h_px || ! is_array( $file ) || (int) ( $file['width'] ?? 0 ) <= 0 || (int) ( $file['height'] ?? 0 ) <= 0 ) {
			continue;
		}
		$h_cap = (int) ceil( $h_px * (int) $file['width'] / (int) $file['height'] );
		$m_px  = sgs_media_sizes_px( $max_widths[ $device ] );
		if ( null === $m_px || $h_cap < $m_px ) {
			$max_widths[ $device ] = $h_cap . 'px';
		}
	}
	$avail       = class_exists( 'Sgs_Layout_Width' ) ? Sgs_Layout_Width::own() : null;
	$sizes       = array();
	foreach ( sgs_media_devices() as $device ) {
		$sizes[ $device ] = sgs_media_sizes_for_width( $widths[ $device ], 'lazy' === $loading, (int) $columns[ $device ], $max_widths[ $device ], $avail[ $device ] ?? null, $item_widths[ $device ] ?? null );
	}
	$crop_id    = $image_files ? (int) reset( $image_files )['id'] : 0;
	$cover_crop = false;
	if ( $crop_id > 0 && function_exists( 'sgs_media_cover_crop_plan' ) ) {
		$boxes = array();
		foreach ( null !== $avail ? sgs_media_devices() : array() as $device ) {
			if ( isset( $avail[ $device ] ) ) {
				$boxes[ $device ] = sgs_media_width_model( $widths[ $device ], (int) $columns[ $device ], $max_widths[ $device ], $avail[ $device ], $item_widths[ $device ] ?? null );
			}
		}
		$plan = sgs_media_cover_crop_plan( $attrs, $slot, $crop_id, $boxes, class_exists( 'Sgs_Layout_Width' ) ? Sgs_Layout_Width::box() : null );
		if ( ! empty( $plan['widens'] ) ) {
			// The crop draws the file wider than its box, so `auto` (the box width) would pick a file too small: the marker
			// lets sgs_media_drop_auto_sizes take out the `auto` core adds to lazy images later in the_content.
			$cover_crop = true;
		}
		if ( ! empty( $plan['by_device'] ) ) {
			$sizes = (array) $plan['by_device'];
		} elseif ( ! empty( $plan['sizes'] ) ) {
			$sizes = array_fill_keys( sgs_media_devices(), (string) $plan['sizes'] );
		} elseif ( ! empty( $plan['widens'] ) ) {
			// The drawn width is unknown (a fill box of a landscape image: the box shape, so the crop, cannot be read), and the
			// box width alone would pick a file that is too small. Printing no `sizes` leaves WordPress's own hint for the
			// attachment, which is as wide as the file, so the browser picks a file wide enough.
			$sizes = array_fill_keys( sgs_media_devices(), '' );
		}
	}

	// The media elements: one sibling per kind, per distinct embed and per distinct SVG.
	$scope    = $uid . ( $uid !== $block_uid ? ' ' . $block_uid : '' );
	$direct   = 'sgs-media-el' . ( $plain ? ' sgs-media sgs-media--renderer ' . trim( $scope . ' ' . (string) ( $context['extra_class'] ?? '' ) ) : '' );
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
				'queries'         => (array) ( $context['device_queries'] ?? array() ),
				'cover_crop'      => $cover_crop,
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
				// Both pictures carry the slot's lead attributes: each device shows one kind, and the other picture
				// resolves to the blank source there, so every device fetches at most one high-priority file (§7.7).
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
		$siblings['sgs-media-sib--video'] = array_keys( $video_files );
	}
	$n = 0;
	foreach ( $embeds as $url => $entry ) {
		++$n;
		$class = $plain ? $direct . ' sgs-media-embed' : 'sgs-media-el sgs-media-embed sgs-media-sib sgs-media-sib--embed-' . $n;
		$html .= '' !== $entry['still']
			? sgs_media_embed_element( $entry['still'], $class, $alt_of( $entry['source'] ), (string) $url )
			: sgs_media_embed_element( (string) $url, $class, $alt_of( $entry['source'] ) );
		$siblings[ 'sgs-media-sib--embed-' . $n ] = $entry['devices'];
	}
	$n   = 0;
	$fit = (string) sgs_media_device_values( $attr( 'Fit' ) )['desktop'];
	foreach ( $svgs as $entry ) {
		++$n;
		$class = $plain ? $direct . ' sgs-media-svg' : 'sgs-media-el sgs-media-svg sgs-media-sib sgs-media-sib--svg-' . $n;
		$label = $alt_of( $entry['source'] );
		$html .= sgs_media_svg_parts_attr( sgs_media_svg_element( $entry['source']['markup'], $class, $uid . '-s' . $n . '-', $label, '' === $label, $fit ), $attr( 'SvgParts' ), (string) $attr( 'SvgPartsTrigger' ) );
		$siblings[ 'sgs-media-sib--svg-' . $n ] = $entry['devices'];
	}
	if ( '' === $html ) {
		return $result;
	}
	// A bare media element is the block's root, so it carries the anchor too (unless it already holds an id of its own).
	if ( $plain && '' !== trim( (string) ( $context['anchor'] ?? '' ) ) ) {
		$html = (string) preg_replace_callback(
			'/^<([a-z]+)\b([^>]*)>/i',
			static fn( array $m ): string => false === stripos( $m[2], ' id="' ) ? '<' . $m[1] . ' id="' . esc_attr( trim( (string) $context['anchor'] ) ) . '"' . $m[2] . '>' : $m[0],
			$html,
			1
		);
	}

	// Nesting, innermost first. The outermost printed element carries the uid, the block classes and the anchor.
	$outer = static function ( string $classes ) use ( $context, $scope ): string {
		$extra  = trim( (string) ( $context['extra_class'] ?? '' ) );
		$anchor = trim( (string) ( $context['anchor'] ?? '' ) );
		return ' class="' . esc_attr( trim( $classes . ' sgs-media sgs-media--renderer ' . $scope . ' ' . $extra ) ) . '"' . ( '' !== $anchor ? ' id="' . esc_attr( $anchor ) . '"' : '' );
	};
	$out = $html;
	if ( $needs_group ) {
		$out = '<span' . $outer( 'sgs-media-group' ) . '>' . $out . '</span>';
	}
	if ( $helper ) {
		$box  = 'sgs-media-box' . ( $fill ? ' sgs-media-box--fill' : '' );
		$mask = sgs_media_has_mask( $prefix, $attrs );
		$out  = ( $mask ? '<span class="sgs-media-box__mask">' . $out . '</span>' : $out );
		$out  = '<span' . ( $has_figure || $has_link || $grouped ? ' class="' . $box . '"' : $outer( $box ) ) . '>' . $out . '</span>';
	}
	if ( $has_link ) {
		$new_tab = ! empty( $attr( 'LinkOpensNewTab' ) );
		$rel     = trim( (string) $attr( 'LinkRel' ) . ( $new_tab ? ' noopener noreferrer' : '' ) );
		$a_class = 'sgs-media-link' . ( $fill && ! $has_figure ? ' sgs-fill-wrap' : '' );
		$out     = '<a' . ( $has_figure || $grouped ? ' class="' . $a_class . '"' : $outer( $a_class ) )
			. ' href="' . esc_url( $link_url ) . '"' . ( $new_tab ? ' target="_blank"' : '' ) . sgs_link_source_attrs_html( $link_source ) . ( '' !== $rel ? ' rel="' . esc_attr( $rel ) . '"' : '' )
			. '>' . $out . '</a>';
	}
	if ( $has_figure ) {
		$out = '<figure' . ( $grouped ? ( $fill ? ' class="sgs-fill-wrap"' : '' ) : $outer( $fill ? 'sgs-fill-wrap' : '' ) ) . '>' . $out
			. '<' . $caption_tag . ' class="sgs-media-caption">' . ( function_exists( 'sgs_rich_text_kses' ) ? sgs_rich_text_kses( $caption ) : wp_kses_post( $caption ) ) . '</' . $caption_tag . '></figure>';
	}

	if ( $grouped ) {
		$out = '<span' . $outer( 'sgs-media-group' ) . '>' . $out . '</span>';
	}

	// CSS: the sibling rules, the caption rule, then each atom's own emitter.
	$atom_slot = array_merge( $slot, array( 'wrapper' => $has_figure || $has_link || $needs_group || $grouped ) );
	$css       = sgs_media_sibling_css( $uid, $plain ? array() : $siblings );
	if ( $has_figure ) {
		$css .= sgs_media_caption_css( $uid, sgs_media_width_is_auto( $prefix, $attrs ) );
	}
	if ( $has_link ) {
		$css .= sgs_media_link_tap_css( $uid, $slot, $attrs );
	}
	foreach ( sgs_media_atom_emitter_ids() as $id ) {
		$emit = 'sgs_media_atom_' . $id . '_emit';
		if ( ! function_exists( $emit ) ) {
			continue;
		}
		$scope_uid = $uid;
		if ( $grouped && ! in_array( $id, sgs_media_item_atom_ids(), true ) ) {
			// A block-level atom reads settings every item shares: its rules print once, under the block's scope class.
			if ( ! $block_rules ) {
				continue;
			}
			$scope_uid = $block_uid;
		}
		$css .= (string) $emit( $atom_slot, $attrs, $scope_uid, $helper );
	}
	if ( ! empty( $slot['kinds'] ) && empty( $context['in_editor'] ) ) {
		sgs_media_enqueue_assets( $helper, (bool) $video_files, sgs_media_has_mask( $prefix, $attrs ), $playback['autoplay'] && array() !== array_filter( array_column( $embeds, 'still' ) ) );
	}
	return array(
		'html'           => $out,
		'css'            => $css,
		'needs_helper'   => $helper,
		'lead_candidate' => 'high' === $fetch,
	);
}
