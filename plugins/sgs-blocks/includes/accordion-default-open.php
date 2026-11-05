<?php
/**
 * The accordion's start-up open item, printed in the server markup.
 *
 * `defaultOpen` names the item that starts open. view.js used to add its `open` attribute after the page loaded,
 * which grew the item and moved everything below it. The item is now printed open, with the `expanded` motion state
 * at rest on an item whose icon turns on that state (the state the view script writes for an open item at start-up),
 * so the script keeps only its behaviour.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Prints the default item open and marks every open item's expanded state.
 *
 * Only the accordion's own items (the outermost `<details>` of the rendered blocks) are touched; an accordion
 * inside an item's panel keeps its own markup.
 *
 * @param string $content      Rendered accordion items.
 * @param int    $default_open Zero-based index of the item that starts open, or a negative number for none.
 * @return string The items markup.
 */
function sgs_accordion_open_default_item( string $content, int $default_open ): string {
	if ( false === stripos( $content, '<details' ) ) {
		return $content;
	}
	if ( false === preg_match_all( '#<(/?)details\b[^>]*>#i', $content, $tags, PREG_OFFSET_CAPTURE | PREG_SET_ORDER ) ) {
		return $content;
	}

	// The outermost items: each opening tag at depth zero, with the offset of its closing tag.
	$items = array();
	$depth = 0;
	$start = null;
	foreach ( $tags as $tag ) {
		if ( '' === $tag[1][0] ) {
			if ( 0 === $depth ) {
				$start = $tag;
			}
			++$depth;
			continue;
		}
		--$depth;
		if ( 0 === $depth && null !== $start ) {
			$items[] = array( $start[0][1], strlen( $start[0][0] ), $tag[0][1] );
			$start   = null;
		}
	}

	// Rewrite from the last item to the first so earlier offsets stay valid.
	for ( $i = count( $items ) - 1; $i >= 0; --$i ) {
		list( $at, $length, $end ) = $items[ $i ];
		$open_tag                  = substr( $content, $at, $length );
		$body                      = substr( $content, $at + $length, $end - ( $at + $length ) );
		$is_open                   = 1 === preg_match( '#\sopen(?=[\s=>])#i', $open_tag );

		if ( ! $is_open && $i === $default_open ) {
			$open_tag = substr( $open_tag, 0, -1 ) . ' open>';
			$body     = preg_replace( '#(<summary\b[^>]*\baria-expanded=")false(")#i', '${1}true${2}', $body, 1 );
			$is_open  = true;
		}
		if ( $is_open && 1 === preg_match( '#data-sgs-me="[^"]*\bstate\b#', $body ) && false === strpos( $open_tag, 'data-sgs-motion-state' ) ) {
			$open_tag = substr( $open_tag, 0, -1 ) . ' data-sgs-motion-state="expanded expanded-rest">';
		}
		$content = substr( $content, 0, $at ) . $open_tag . $body . substr( $content, $end );
	}
	return $content;
}
