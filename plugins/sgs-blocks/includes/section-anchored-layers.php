<?php
/**
 * Floating layers anchored to the whole section.
 *
 * A `sgs/decorative-image` whose `anchorTo` is 'section' positions against its section, not against the content column
 * it is authored in. Its finished output (after every other render_block filter, motion included) is wrapped in a pair
 * of HTML comments; a section block that supports it (sgs/hero) cuts the marked fragments out of its rendered inner
 * content with sgs_lift_section_anchored_layers() and prints them as direct children of its own positioned root. The
 * fragment moved is the exact markup core rendered, so nothing renders twice and every per-render class (the motion
 * `sgs-m-*` class) still matches the CSS registered for it. Outside such a block the comments are inert.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SECTION_LAYER_OPEN  = '<!-- sgs:section-layer -->';
const SECTION_LAYER_CLOSE = '<!-- /sgs:section-layer -->';

/**
 * Wraps a section-anchored decorative layer's output in the lift markers.
 *
 * @param string $html  Rendered block HTML.
 * @param array  $block Parsed block.
 * @return string
 */
function mark_section_anchored_layer( $html, $block ) {
	if ( '' === trim( (string) $html ) || 'section' !== ( $block['attrs']['anchorTo'] ?? 'parent' ) ) {
		return $html;
	}
	return SECTION_LAYER_OPEN . $html . SECTION_LAYER_CLOSE;
}
add_filter( 'render_block_sgs/decorative-image', __NAMESPACE__ . '\\mark_section_anchored_layer', PHP_INT_MAX, 2 );

/**
 * Splits a block's rendered inner content into the section-anchored layers and everything else.
 *
 * Outermost marker pairs are lifted whole; a marked layer nested inside another marked layer moves with its parent.
 * Markers that do not pair up leave the content untouched.
 *
 * @param string $content Rendered inner blocks.
 * @return array{0:string,1:string} [ content without the lifted layers, the lifted layers in order ]
 */
function sgs_lift_section_anchored_layers( string $content ): array {
	if ( false === strpos( $content, SECTION_LAYER_OPEN ) ) {
		return array( $content, '' );
	}
	$parts = preg_split( '/(' . preg_quote( SECTION_LAYER_OPEN, '/' ) . '|' . preg_quote( SECTION_LAYER_CLOSE, '/' ) . ')/', $content, -1, PREG_SPLIT_DELIM_CAPTURE );
	$rest   = '';
	$lifted = '';
	$depth  = 0;
	foreach ( (array) $parts as $part ) {
		if ( SECTION_LAYER_OPEN === $part ) {
			if ( $depth > 0 ) {
				$lifted .= $part;
			}
			++$depth;
		} elseif ( SECTION_LAYER_CLOSE === $part ) {
			--$depth;
			if ( $depth < 0 ) {
				return array( $content, '' );
			}
			if ( $depth > 0 ) {
				$lifted .= $part;
			}
		} elseif ( $depth > 0 ) {
			$lifted .= $part;
		} else {
			$rest .= $part;
		}
	}
	if ( 0 !== $depth ) {
		return array( $content, '' );
	}
	return array( $rest, $lifted );
}
