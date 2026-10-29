<?php
/**
 * Text by time of day: the server half of `src/blocks/extensions/time-text.js` (Spec 02 FR-2-14).
 *
 * A block that lists `timeText` in `supports.sgs.enabledExtensions` and names the attribute holding its words in
 * `supports.sgs.timeTextWords` gets two attributes:
 *   - `sgsTimeText`: a list of `{ start, end, text }` ranges in whole hours (start 0-23, end 1-24; a range covers
 *     start <= hour < end, and one whose start is after its end spans midnight);
 *   - `sgsTimeTextZone`: '' (the visitor's own time), 'site' (the site's time zone) or a time zone name.
 *
 * The page is rendered once for every visitor (the page cache stays on): the block's own words are the fallback, or
 * the first range's words when the block has none, so a visitor without JavaScript and every crawler reads real text.
 * The element holding the words carries the ranges (`data-sgs-time-text`) and the resolved zone
 * (`data-sgs-time-zone`), and `@sgs/time-text` (src/shared/time-text.js), enqueued only when such a block renders,
 * swaps the words in the visitor's browser. No inline style, no live region.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const TIME_TEXT_MODULE      = '@sgs/time-text';
const TIME_TEXT_MODULE_PATH = 'build/shared/time-text.js';

add_action( 'init', __NAMESPACE__ . '\\time_text_register_module' );
add_filter( 'render_block_data', __NAMESPACE__ . '\\time_text_fallback_words', 10, 1 );
add_filter( 'render_block', __NAMESPACE__ . '\\time_text_mark_words', 10, 2 );

/**
 * Register the `@sgs/time-text` script module. A build without the file registers nothing, so the page keeps its
 * server-rendered words.
 */
function time_text_register_module(): void {
	if ( ! \function_exists( 'wp_register_script_module' ) || ! \file_exists( SGS_BLOCKS_PATH . TIME_TEXT_MODULE_PATH ) ) {
		return;
	}
	$version = \defined( 'SGS_BLOCKS_VERSION' ) ? (string) SGS_BLOCKS_VERSION : false;
	$asset   = SGS_BLOCKS_PATH . 'build/shared/time-text.asset.php';
	if ( \file_exists( $asset ) ) {
		$meta = include $asset;
		if ( \is_array( $meta ) && ! empty( $meta['version'] ) ) {
			$version = (string) $meta['version'];
		}
	}
	\wp_register_script_module( TIME_TEXT_MODULE, SGS_BLOCKS_URL . TIME_TEXT_MODULE_PATH, array(), $version );
}

/**
 * The attribute holding a block type's words when it opts into the time-of-day option, or '' when it does not.
 *
 * @param string $block_name Block name.
 * @return string
 */
function time_text_words_attribute( string $block_name ): string {
	if ( '' === $block_name || ! \class_exists( '\WP_Block_Type_Registry' ) ) {
		return '';
	}
	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	$sgs  = ( null !== $type && \is_array( $type->supports ?? null ) ) ? ( $type->supports['sgs'] ?? array() ) : array();
	$list = \is_array( $sgs ) ? ( $sgs['enabledExtensions'] ?? null ) : null;
	if ( ! \is_array( $list ) || ! \in_array( 'timeText', $list, true ) ) {
		return '';
	}
	return \is_string( $sgs['timeTextWords'] ?? null ) ? (string) $sgs['timeTextWords'] : '';
}

/**
 * A whole hour within bounds, or false.
 *
 * @param mixed $value Stored hour.
 * @param int   $min   Lowest hour allowed.
 * @param int   $max   Highest hour allowed.
 * @return int|false
 */
function time_text_hour( $value, int $min, int $max ) {
	$options = array(
		'min_range' => $min,
		'max_range' => $max,
	);
	return \filter_var( $value, FILTER_VALIDATE_INT, array( 'options' => $options ) );
}

/**
 * The usable ranges of a stored `sgsTimeText` value: whole hours in bounds and non-empty plain words; anything
 * malformed is dropped, in order.
 *
 * @param mixed $stored Stored value.
 * @return array<int, array{start: int, end: int, text: string}>
 */
function time_text_ranges( $stored ): array {
	if ( ! \is_array( $stored ) ) {
		return array();
	}
	$out = array();
	foreach ( $stored as $range ) {
		if ( ! \is_array( $range ) || ! isset( $range['start'], $range['end'] ) || ! \is_string( $range['text'] ?? null ) ) {
			continue;
		}
		$start = time_text_hour( $range['start'], 0, 23 );
		$end   = time_text_hour( $range['end'], 1, 24 );
		$text  = \trim( \wp_strip_all_tags( $range['text'] ) );
		if ( false === $start || false === $end || '' === $text ) {
			continue;
		}
		$out[] = array(
			'start' => (int) $start,
			'end'   => (int) $end,
			'text'  => $text,
		);
	}
	return $out;
}

/**
 * The zone the browser reads the hour in: '' for the visitor's own time, the site's zone for 'site', else a known
 * time zone name; an unknown name is the visitor's own time.
 *
 * @param mixed $zone Stored `sgsTimeTextZone`.
 * @return string
 */
function time_text_zone( $zone ): string {
	$zone = \is_string( $zone ) ? \trim( $zone ) : '';
	if ( 'site' === $zone ) {
		return \function_exists( 'wp_timezone_string' ) ? (string) \wp_timezone_string() : '';
	}
	if ( '' === $zone ) {
		return '';
	}
	return \in_array( $zone, \timezone_identifiers_list(), true ) ? $zone : '';
}

/**
 * A block with ranges and no words of its own prints the first range's words, so the page never renders an empty
 * element (hooked on render_block_data, before the block's own render reads its attributes).
 *
 * @param array $parsed_block Parsed block.
 * @return array
 */
function time_text_fallback_words( $parsed_block ) {
	if ( ! \is_array( $parsed_block ) ) {
		return $parsed_block;
	}
	$words_attr = time_text_words_attribute( (string) ( $parsed_block['blockName'] ?? '' ) );
	if ( '' === $words_attr ) {
		return $parsed_block;
	}
	$ranges = time_text_ranges( $parsed_block['attrs']['sgsTimeText'] ?? null );
	$own    = (string) ( $parsed_block['attrs'][ $words_attr ] ?? '' );
	if ( array() !== $ranges && '' === \trim( \wp_strip_all_tags( $own ) ) ) {
		$parsed_block['attrs'][ $words_attr ] = \esc_html( $ranges[0]['text'] );
	}
	return $parsed_block;
}

/**
 * Put the ranges and the zone on the element holding the words (the block's root, the first element after its scoped
 * `<style>`) and enqueue the swap.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function time_text_mark_words( $block_content, $block ) {
	if ( ! \is_string( $block_content ) || '' === $block_content || ! \is_array( $block ) ) {
		return $block_content;
	}
	if ( '' === time_text_words_attribute( (string) ( $block['blockName'] ?? '' ) ) ) {
		return $block_content;
	}
	$ranges = time_text_ranges( $block['attrs']['sgsTimeText'] ?? null );
	if ( array() === $ranges ) {
		return $block_content;
	}
	$tags = new \WP_HTML_Tag_Processor( $block_content );
	do {
		if ( ! $tags->next_tag() ) {
			return $block_content;
		}
	} while ( 'STYLE' === $tags->get_tag() );
	$tags->set_attribute( 'data-sgs-time-text', (string) \wp_json_encode( $ranges ) );
	$zone = time_text_zone( $block['attrs']['sgsTimeTextZone'] ?? '' );
	if ( '' !== $zone ) {
		$tags->set_attribute( 'data-sgs-time-zone', $zone );
	}
	if ( \function_exists( 'wp_enqueue_script_module' ) ) {
		\wp_enqueue_script_module( TIME_TEXT_MODULE );
	}
	return $tags->get_updated_html();
}
