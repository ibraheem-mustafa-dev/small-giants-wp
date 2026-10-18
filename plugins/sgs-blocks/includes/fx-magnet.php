<?php
/**
 * Magnet moving part: resolves the stored part key to the selector the runtime moves.
 *
 * The motion model stores `movingPart` as `root` or a part key the block declares in `supports.sgs.elements`, and the
 * renderer prints it as `data-sgs-fx-magnet-moving-part`. The browser cannot know a block's declared selectors, so this
 * filter reads the registered block type (`Sgs_Motion_Targets`) and prints `data-sgs-fx-magnet-part-selector` beside it:
 * the part's declared selector, else its BEM class, relative to the block root. `root`, an unknown key and a wrapper
 * part print nothing, so the magnet moves the element itself.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

use SGS\Blocks\Motion\Sgs_Motion_Targets;

defined( 'ABSPATH' ) || exit;

/**
 * Print the part selector on a magnet root whose moving part is a declared part.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function sgs_apply_fx_magnet_part( $block_content, $block = array() ) {
	if ( ! \is_string( $block_content ) || '' === $block_content || ! \str_contains( $block_content, 'data-sgs-fx-magnet-moving-part' ) ) {
		return $block_content;
	}
	$name = \is_array( $block ) && isset( $block['blockName'] ) && \is_string( $block['blockName'] ) ? $block['blockName'] : '';
	if ( '' === $name || ! \class_exists( Sgs_Motion_Targets::class ) ) {
		return $block_content;
	}

	$offset    = sgs_fx_root_offset( $block_content );
	$head      = \substr( $block_content, 0, $offset );
	$processor = new \WP_HTML_Tag_Processor( \substr( $block_content, $offset ) );
	if ( ! $processor->next_tag() || ! sgs_fx_has_effect( $processor->get_attribute( 'data-sgs-fx' ), 'magnet' ) ) {
		return $block_content;
	}

	$part = (string) $processor->get_attribute( 'data-sgs-fx-magnet-moving-part' );
	if ( '' === $part || 'root' === $part || 1 !== \preg_match( '/^[a-z][a-zA-Z0-9-]*$/', $part ) ) {
		return $block_content;
	}
	$parts = Sgs_Motion_Targets::parts( $name );
	if ( ! \array_key_exists( $part, $parts ) || $parts[ $part ] ) {
		return $block_content;
	}

	$selector = Sgs_Motion_Targets::declared_selector( $name, $part );
	if ( '' === $selector ) {
		$selector = '.' . Sgs_Motion_Targets::part_class( $name, $part );
	}
	$processor->set_attribute( 'data-sgs-fx-magnet-part-selector', $selector );

	return $head . $processor->get_updated_html();
}

\add_filter( 'render_block', __NAMESPACE__ . '\sgs_apply_fx_magnet_part', 22, 2 );
