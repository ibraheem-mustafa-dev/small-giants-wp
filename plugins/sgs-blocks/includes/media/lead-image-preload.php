<?php
/**
 * Head preload of the page's lead image (Spec 49 section 7.7 rule 4).
 *
 * `SGS_Media_Priority::resolve` gives one image per page `fetchpriority="high"`: the lead, usually the LCP element.
 * The browser only finds that `<img>` when the HTML reaches it, and on a page that prints its CSS inline the image can
 * sit hundreds of kilobytes in (a shop's first product card behind about 970 KB of per-instance CSS), so its request
 * starts only as the HTML finishes arriving. A `<link rel="preload" as="image">` near the top of `<head>` starts it
 * at once.
 *
 * The preload is read from the finished page, not threaded through each media caller: whichever block printed the
 * lead, the first `<img>` in the body carrying `fetchpriority="high"` is the one the page asked to come first. The link
 * copies the image's `src`, `srcset` and `sizes` (as `href`, `imagesrcset`, `imagesizes`) so the browser picks the
 * same file it will draw, and sits right after `<meta name="viewport">` so `sizes` resolves at the device's width.
 *
 * No preload is added when the lead image is lazy, has no `src`, sits in `<noscript>` or `<template>`, sits in a
 * `<picture>` with `<source>` children (the preload cannot know which source the browser will choose, so it could cost a
 * second download), or is already preloaded. A page with no such image is returned unchanged, byte for byte.
 *
 * Called from the page output buffer (`class-sgs-css-registry.php::sgs_css_inject`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Add a head preload for the page's lead image.
 *
 * @param string $html The finished page.
 * @return string The page, with the preload link in its head when the lead image qualifies.
 */
function sgs_lead_image_preload( string $html ): string {
	$head_end = \stripos( $html, '</head>' );
	if ( false === $head_end ) {
		return $html;
	}
	$img = sgs_lead_image_find( $html, $head_end );
	if ( null === $img ) {
		return $html;
	}
	$head = \substr( $html, 0, $head_end );
	if ( sgs_lead_image_already_preloaded( $head, $img['src'] ) ) {
		return $html;
	}

	$link = '<link rel="preload" as="image" href="' . \esc_url( $img['src'] ) . '"';
	if ( '' !== $img['srcset'] ) {
		$link .= ' imagesrcset="' . \esc_attr( $img['srcset'] ) . '"';
		if ( '' !== $img['sizes'] ) {
			$link .= ' imagesizes="' . \esc_attr( $img['sizes'] ) . '"';
		}
	}
	$link .= ' fetchpriority="high" />';

	if ( \preg_match( '/<meta\b[^>]*\bname\s*=\s*(["\']?)viewport\1[^>]*>/i', $head, $m, PREG_OFFSET_CAPTURE ) ) {
		$at = $m[0][1] + \strlen( $m[0][0] );
	} elseif ( \preg_match( '/<head\b[^>]*>/i', $head, $m, PREG_OFFSET_CAPTURE ) ) {
		$at = $m[0][1] + \strlen( $m[0][0] );
	} else {
		return $html;
	}
	return \substr( $html, 0, $at ) . "\n" . $link . \substr( $html, $at );
}

/**
 * The first `<img>` after the head that carries `fetchpriority="high"`, if it may be preloaded.
 *
 * Only the first such image counts: if it may not be preloaded, no other image is preloaded in its place.
 *
 * @param string $html     The page.
 * @param int    $head_end Offset of `</head>`.
 * @return array{src:string,srcset:string,sizes:string}|null
 */
function sgs_lead_image_find( string $html, int $head_end ): ?array {
	$offset = $head_end;
	while ( \preg_match( '/<img\b[^>]*>/i', $html, $m, PREG_OFFSET_CAPTURE, $offset ) ) {
		$tag    = $m[0][0];
		$start  = $m[0][1];
		$offset = $start + \strlen( $tag );
		if ( false === \stripos( $tag, 'fetchpriority' ) ) {
			continue;
		}
		$attrs = sgs_lead_image_attrs( $tag );
		if ( 'high' !== \strtolower( $attrs['fetchpriority'] ?? '' ) ) {
			continue;
		}
		$src = \trim( $attrs['src'] ?? '' );
		if ( '' === $src || 'lazy' === \strtolower( $attrs['loading'] ?? '' ) ) {
			return null;
		}
		$before = \substr( $html, $head_end, $start - $head_end );
		if ( sgs_lead_image_inside( $before, 'noscript' ) || sgs_lead_image_inside( $before, 'template' ) ) {
			return null;
		}
		$picture = sgs_lead_image_open_at( $before, 'picture' );
		if ( null !== $picture && false !== \stripos( \substr( $before, $picture ), '<source' ) ) {
			return null;
		}
		return array(
			'src'    => $src,
			'srcset' => \trim( $attrs['srcset'] ?? '' ),
			'sizes'  => \trim( $attrs['sizes'] ?? '' ),
		);
	}
	return null;
}

/**
 * The attributes of one start tag, names lower-cased, values with character references decoded.
 *
 * @param string $tag One start tag, `<img …>`.
 * @return array<string,string>
 */
function sgs_lead_image_attrs( string $tag ): array {
	$out  = array();
	$body = \preg_replace( '/^<[a-z0-9]+|\/?>$/i', '', $tag );
	\preg_match_all( '/([^\s"\'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'=<>`]+)))?/', (string) $body, $found, PREG_SET_ORDER );
	foreach ( $found as $a ) {
		$name = \strtolower( $a[1] );
		if ( isset( $out[ $name ] ) ) {
			continue; // The first occurrence of an attribute wins, as in the HTML parser.
		}
		$value        = $a[2] ?? '';
		$value        = '' !== $value ? $value : ( $a[3] ?? '' );
		$value        = '' !== $value ? $value : ( $a[4] ?? '' );
		$out[ $name ] = \html_entity_decode( $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}
	return $out;
}

/**
 * Offset of the last `<$name` in `$before` that is still open at its end, or null.
 *
 * @param string $before The page from the head's end up to the image.
 * @param string $name   Element name.
 * @return int|null
 */
function sgs_lead_image_open_at( string $before, string $name ): ?int {
	if ( ! \preg_match_all( '/<' . $name . '\b/i', $before, $opens, PREG_OFFSET_CAPTURE ) ) {
		return null;
	}
	$open  = (int) \end( $opens[0] )[1];
	$close = \strripos( $before, '</' . $name );
	return ( false === $close || $close < $open ) ? $open : null;
}

/**
 * Whether the image sits inside an open `<$name>` element.
 *
 * @param string $before The page from the head's end up to the image.
 * @param string $name   Element name.
 * @return bool
 */
function sgs_lead_image_inside( string $before, string $name ): bool {
	return null !== sgs_lead_image_open_at( $before, $name );
}

/**
 * Whether the head already preloads this image.
 *
 * @param string $head The head's markup.
 * @param string $src  The image's URL.
 * @return bool
 */
function sgs_lead_image_already_preloaded( string $head, string $src ): bool {
	if ( ! \preg_match_all( '/<link\b[^>]*>/i', $head, $links ) ) {
		return false;
	}
	foreach ( $links[0] as $link ) {
		$a = sgs_lead_image_attrs( $link );
		if ( 'preload' === \strtolower( $a['rel'] ?? '' ) && \trim( $a['href'] ?? '' ) === $src ) {
			return true;
		}
	}
	return false;
}
