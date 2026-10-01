<?php
/**
 * Separators: the item-drawn path for a single row or a single column of items.
 *
 * Every item except the first draws the line on its own leading edge as an empty
 * pseudo-element, offset half a gap plus half the line outward, so the line is
 * centred in the gap at any thickness and gap, with no measuring. One line per gap
 * (n-1 for n items). `edges` adds the outer lines: 'all' draws the leading edge of
 * the first item and the trailing edge of the last, 'end' only the trailing edge of
 * the last. Edge lines sit flush inside their item (there is no gap beyond the list).
 *
 * The pseudo-elements (`pseudo` for the between lines and the leading edge,
 * `pseudo_end` for the trailing edge) must be free on the items the caller names.
 * The hover colour and the sweep live in helpers-separators-hover-css.php.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-separators-hover-css.php';

if ( ! function_exists( 'sgs_separators_line_geometry' ) ) {
	/**
	 * The logical-property names for one axis of a line.
	 *
	 * A `column` line is vertical and sits on an item's inline-start edge; a `row`
	 * line is horizontal and sits on its block-start edge.
	 *
	 * @param string $axis 'row' or 'column'.
	 * @return array { start, end, span, border } CSS logical names.
	 */
	function sgs_separators_line_geometry( string $axis ): array {
		if ( 'column' === $axis ) {
			return array(
				'start'  => 'inset-inline-start',
				'end'    => 'inset-inline-end',
				'span'   => 'top:0;bottom:0;',
				'border' => 'inline',
			);
		}
		return array(
			'start'  => 'inset-block-start',
			'end'    => 'inset-block-end',
			'span'   => 'inset-inline:0;',
			'border' => 'block',
		);
	}
}

if ( ! function_exists( 'sgs_separators_line_css' ) ) {
	/**
	 * The item-drawn rules for a line-mode list.
	 *
	 * @param array $n    Output of sgs_separators_normalise().
	 * @param array $list The list descriptor (see helpers-separators-css.php).
	 * @return string CSS.
	 */
	function sgs_separators_line_css( array $n, array $list ): string {
		$item = (string) ( $list['item'] ?? '' );
		$axis = 'column' === ( $list['direction'] ?? 'row' ) ? 'row' : 'column';
		if ( '' === $item || null === $n[ $axis ] ) {
			return '';
		}
		$a      = $n[ $axis ];
		$geo    = sgs_separators_line_geometry( $axis );
		$before = (string) ( $list['pseudo'] ?? '::before' );
		$after  = (string) ( $list['pseudo_end'] ?? '::after' );
		$w      = 'var(--sgs-sep-w-' . $axis . ')';
		$gap    = 'var(--sgs-sep-g-' . $axis . ',0px)';
		$edge   = 'content:"";position:absolute;pointer-events:none;' . $geo['span'];
		$border = 'border-' . $geo['border'] . '-start:' . $w . ' ' . $a['style'] . ' ' . $a['colour'] . ';';
		$sweep  = 'sweep' === $n['treatment'] && 'solid' === $a['style'] && '' !== $a['hover'];

		$css = $item . '{position:relative;}';

		// The line between item N-1 and item N: half a gap plus half a line outward from N's leading edge.
		$between = $item . ':not(:first-child)' . $before;
		$offset  = $geo['start'] . ':calc((' . $gap . ' + ' . $w . ') / -2);';
		if ( $sweep ) {
			$band = sgs_separators_sweep_band( $axis, $a, $n['angle'] );
			$css .= $between . '{' . $edge . $offset . ( 'column' === $axis ? 'width:' : 'height:' ) . $w . ';' . $band['rest'] . '}';
			$css .= sgs_separators_swap_hover_css( $item, $before, $list['heads'] ?? array(), $band['hover'] );
		} else {
			$css .= $between . '{' . $edge . $offset . $border . ( '' !== $a['hover'] ? 'transition:border-color var(--sgs-sep-motion,300ms ease);' : '' ) . '}';
			if ( '' !== $a['hover'] && 'none' !== $n['treatment'] ) {
				$css .= sgs_separators_swap_hover_css( $item, $before, $list['heads'] ?? array(), 'border-' . $geo['border'] . '-start-color:' . $a['hover'] );
			}
		}
		if ( '' !== $a['hover'] && 'none' !== $n['treatment'] ) {
			$css .= '@media (prefers-reduced-motion:reduce){' . $between . '{transition:none;}}';
		}

		// The outer lines.
		if ( 'all' === $n['edges'] ) {
			$css .= $item . ':first-child' . $before . '{' . $edge . $geo['start'] . ':0;' . $border . '}';
		}
		if ( 'all' === $n['edges'] || 'end' === $n['edges'] ) {
			$css .= $item . ':last-child' . $after . '{' . $edge . $geo['end'] . ':0;' . str_replace( '-start:', '-end:', $border ) . '}';
		}
		return $css;
	}
}
