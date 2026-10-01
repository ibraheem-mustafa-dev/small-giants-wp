<?php
/**
 * Separators: the CSS for one list.
 *
 * A list names its layout and the helper picks the drawing path:
 *
 *   'line'  A single row or a single column of items the block itself owns
 *           (nav bar items, drawer rows, dropdown rows, icon-list). Every item
 *           except the first draws the line on its own leading edge, half a gap
 *           outward, so it sits centred in the gap at any thickness. All
 *           browsers, no script. See helpers-separators-line-css.php.
 *
 *   'flow'  Anything that wraps or auto-fits, or whose items the block does not
 *           own (sgs/container grids and flex, brand-strip). Browsers with gap
 *           decorations draw `column-rule` / `row-rule` natively; the others get
 *           an overlay painted from measured item positions by
 *           src/shared/separators/ (it exits at once where decorations exist).
 *
 * The list descriptor:
 *   list       string   Selector of the list element (the grid / flex element, or the <ul>).
 *   layout     string   'line' | 'flow'.
 *   item       string   Line only: selector of the items (already scoped).
 *   direction  string   Line only: 'row' (items side by side, vertical lines) or 'column' (stacked, horizontal lines).
 *   pseudo     string   Line only: the pseudo-element the line is drawn on. Default '::before'.
 *   pseudo_end string   Line only: the pseudo-element for the trailing edge. Default '::after'.
 *   heads      string[] Line only: selectors inside an item that count as "pointing at the row".
 *   gap        array    A gap tier object (`<row> <column>` or one length per tier).
 *   gap_expr   array    Or one CSS expression per axis (`['column' => 'var(--sgs-nm-gap, 8px)']`); trusted PHP constants only.
 *   container  bool     Also emit @container tier copies (the block's own opt-in).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-separators.php';
require_once __DIR__ . '/helpers-separators-line-css.php';

if ( ! function_exists( 'sgs_separators_var_props' ) ) {
	/**
	 * The per-device custom properties every path reads: the line thickness and the gap, per axis.
	 *
	 * @param array $n    Output of sgs_separators_normalise().
	 * @param array $list The list descriptor.
	 * @return array[] Property specs for sgs_emit_responsive_css().
	 */
	function sgs_separators_var_props( array $n, array $list ): array {
		$props = array();
		foreach ( sgs_separators_axes() as $axis ) {
			if ( null === $n[ $axis ] ) {
				continue;
			}
			$props[] = array(
				'value'     => $n[ $axis ]['width'],
				'css'       => '--sgs-sep-w-' . $axis,
				'transform' => static function ( $raw ) {
					return (string) $raw;
				},
			);
			if ( isset( $list['gap_expr'][ $axis ] ) ) {
				$props[] = array(
					'value'     => array( 'desktop' => (string) $list['gap_expr'][ $axis ] ),
					'css'       => '--sgs-sep-g-' . $axis,
					'transform' => static function ( $raw ) {
						return (string) $raw;
					},
				);
			} elseif ( isset( $list['gap'] ) && is_array( $list['gap'] ) && $list['gap'] ) {
				$props[] = array(
					'value'     => $list['gap'],
					'css'       => '--sgs-sep-g-' . $axis,
					'transform' => static function ( $raw ) use ( $axis ) {
						return sgs_separators_gap_axis( $raw, $axis );
					},
				);
			}
		}
		return $props;
	}
}

if ( ! function_exists( 'sgs_separators_axis_decls' ) ) {
	/**
	 * The style and colour custom properties for the active axes (not per device).
	 *
	 * @param array $n Output of sgs_separators_normalise().
	 * @return string Declarations.
	 */
	function sgs_separators_axis_decls( array $n ): string {
		$decls = '';
		foreach ( sgs_separators_axes() as $axis ) {
			if ( null !== $n[ $axis ] ) {
				$decls .= '--sgs-sep-s-' . $axis . ':' . $n[ $axis ]['style'] . ';--sgs-sep-c-' . $axis . ':' . $n[ $axis ]['colour'] . ';';
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_separators_flow_css' ) ) {
	/**
	 * The flow path: native gap decorations plus the stylesheet for the runtime overlay.
	 *
	 * `rule-visibility-items: between` keeps a rule from dangling beside an empty
	 * last-row cell. The `@supports not` block paints nothing itself: it styles the
	 * overlay elements the runtime adds (physical `border-left` / `border-top`, since the
	 * runtime positions lines by measured physical coordinates), so a browser that
	 * supports decorations never carries them.
	 *
	 * @param array  $n    Output of sgs_separators_normalise().
	 * @param string $list The list selector.
	 * @return string CSS.
	 */
	function sgs_separators_flow_css( array $n, string $list ): string {
		$native = '';
		$lines  = '';
		foreach ( array(
			'column' => 'left',
			'row'    => 'top',
		) as $axis => $edge ) {
			if ( null === $n[ $axis ] ) {
				continue;
			}
			$rule    = 'var(--sgs-sep-w-' . $axis . ') var(--sgs-sep-s-' . $axis . ') var(--sgs-sep-c-' . $axis . ')';
			$native .= $axis . '-rule:' . $rule . ';';
			$lines  .= $list . '>.sgs-sep-overlay>.sgs-sep-line--' . $axis . '{border-' . $edge . ':' . $rule . ';}';
		}
		if ( '' === $native ) {
			return '';
		}
		return $list . '{' . $native . 'rule-visibility-items:between;}'
			. '@supports not (row-rule-style:solid){'
			. $list . '.sgs-sep-anchored{position:relative;}'
			. $list . '>.sgs-sep-overlay{position:absolute;top:0;left:0;width:0;height:0;margin:0;padding:0;list-style:none;pointer-events:none;}'
			. $list . '>.sgs-sep-overlay>.sgs-sep-line{position:absolute;box-sizing:border-box;margin:0;padding:0;}'
			. $lines
			. '}';
	}
}

if ( ! function_exists( 'sgs_separators_css' ) ) {
	/**
	 * The scoped CSS for one list's separators.
	 *
	 * @param mixed $raw  The stored separators object.
	 * @param array $list The list descriptor (see the file header).
	 * @param array $caps What the block opted in to (`supports.sgs.separators.<attr>`).
	 * @return string CSS (no <style> wrapper); '' when the setting draws nothing.
	 */
	function sgs_separators_css( $raw, array $list, array $caps = array() ): string {
		$n    = sgs_separators_normalise( $raw, $caps );
		$sel  = (string) ( $list['list'] ?? '' );
		$mode = (string) ( $list['layout'] ?? 'flow' );
		if ( '' === $sel || ! sgs_separators_active( $n ) ) {
			return '';
		}
		$css = sgs_emit_responsive_css( $sel, sgs_separators_var_props( $n, $list ), array( 'container' => ! empty( $list['container'] ) ) );
		$css .= $sel . '{' . sgs_separators_axis_decls( $n ) . '}';
		if ( 'line' === $mode ) {
			return $css . sgs_separators_line_css( $n, $list );
		}
		return $css . sgs_separators_flow_css( $n, $sel );
	}
}

if ( ! function_exists( 'sgs_separators_root_attrs' ) ) {
	/**
	 * What a flow list's root carries so the runtime can find the list: a class and
	 * a `data-sgs-sep-list` value ('self', or a path below the root that starts with a
	 * child combinator, so a nested list is never picked up by an outer root).
	 *
	 * @param string $list_selector 'self' or a trusted path, e.g. '> .sgs-container__inner'.
	 * @return array { class: string, attr: string }.
	 */
	function sgs_separators_root_attrs( string $list_selector = 'self' ): array {
		$safe = preg_replace( '/[^A-Za-z0-9_\-\.\s>#]/', '', $list_selector );
		return array(
			'class' => sgs_separators_marker_class(),
			'attr'  => 'data-sgs-sep-list="' . esc_attr( '' === $safe ? 'self' : $safe ) . '"',
		);
	}
}
