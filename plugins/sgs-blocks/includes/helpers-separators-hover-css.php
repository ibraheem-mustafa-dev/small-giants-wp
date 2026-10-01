<?php
/**
 * Separators: the hover colour and the directional sweep for item-drawn lines.
 *
 * A line sits between two items, so it belongs to both: pointing at (or
 * keyboard-focusing) EITHER neighbour repaints it. The line is the pseudo-element
 * of the item that follows it, so the own-item rule covers that neighbour and an
 * adjacent-sibling rule (`item:hover + item::before`) covers the one before.
 *
 * A caller whose rows hold more than a link (the drawer's expander, a split row)
 * names `heads`: the selectors inside an item that count as "pointing at the row".
 * Every hover selector is one top-level comma part (`sgs_hover_guarded_rule()`
 * splits on commas), so the `:has()` lists are written out as separate parts.
 *
 * The sweep reuses includes/sweep-css.php::sgs_directional_sweep_css. A sweep is a
 * gradient band, so it only ever draws a solid line.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/sweep-css.php';

if ( ! function_exists( 'sgs_separators_hover_selectors' ) ) {
	/**
	 * The selectors that repaint one item's leading line.
	 *
	 * @param string   $item   The item selector.
	 * @param string   $pseudo The pseudo-element the line is drawn on.
	 * @param string[] $heads  Selectors inside an item that count as pointing at the row ('' list = the item itself).
	 * @param string   $state  ':hover' or the focus pseudo-class.
	 * @return string[] Selector parts (own item, then the item before it).
	 */
	function sgs_separators_hover_selectors( string $item, string $pseudo, array $heads, string $state ): array {
		$focus = ':hover' !== $state;
		$parts = array();
		if ( ! $heads ) {
			$on      = $item . ':not(:first-child)' . ( $focus ? ':focus-within' : ':hover' );
			$parts[] = $on . $pseudo;
			$parts[] = $item . ( $focus ? ':focus-within' : ':hover' ) . ' + ' . $item . $pseudo;
			return $parts;
		}
		foreach ( $heads as $head ) {
			$has     = ':has(' . $head . ( $focus ? ':focus-visible' : ':hover' ) . ')';
			$parts[] = $item . ':not(:first-child)' . $has . $pseudo;
			$parts[] = $item . $has . ' + ' . $item . $pseudo;
		}
		return $parts;
	}
}

if ( ! function_exists( 'sgs_separators_swap_hover_css' ) ) {
	/**
	 * A plain colour swap on hover and focus.
	 *
	 * @param string   $item   The item selector.
	 * @param string   $pseudo The pseudo-element the line is drawn on.
	 * @param string[] $heads  See sgs_separators_hover_selectors().
	 * @param string   $decls  The declarations that repaint the line.
	 * @return string CSS.
	 */
	function sgs_separators_swap_hover_css( string $item, string $pseudo, array $heads, string $decls ): string {
		$hover = implode( ',', sgs_separators_hover_selectors( $item, $pseudo, $heads, ':hover' ) );
		$focus = implode( ',', sgs_separators_hover_selectors( $item, $pseudo, $heads, ':focus' ) );
		return sgs_hover_guarded_rule( $hover, $decls ) . $focus . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_separators_sweep_band' ) ) {
	/**
	 * The resting declarations and the hover position of a sweep band.
	 *
	 * @param string     $axis  'row' or 'column'.
	 * @param array      $a     A normalised axis.
	 * @param float|null $angle The stored sweep angle (CSS gradient degrees), or null for the axis default.
	 * @return array { rest: string, hover: string } Declarations.
	 */
	function sgs_separators_sweep_band( string $axis, array $a, ?float $angle ): array {
		$angle = null === $angle ? ( 'column' === $axis ? 180.0 : 90.0 ) : $angle;
		$band  = sgs_directional_sweep_css( $angle, $a['colour'], $a['hover'] );
		return array(
			'rest'  => 'background-image:' . $band['gradient'] . ';background-size:' . $band['background_size']
				. ';background-position:' . $band['rest_position'] . ';background-repeat:no-repeat;'
				. 'transition:background-position var(--sgs-sep-motion,300ms ease);',
			'hover' => 'background-position:' . $band['hover_position'],
		);
	}
}
