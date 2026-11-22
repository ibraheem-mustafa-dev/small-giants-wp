<?php
/**
 * Scoped rules for sgs/choice-flow's bands and boxes: the progress bar's track, the header band, the footer band and
 * the summary box (Spec 02 FR-2-34). Every setting is unset by default and an unset one prints nothing, so the
 * stylesheet's own look stands.
 *
 * Each rule sits under the instance's scoped root (`.{uid}.wp-block-sgs-choice-flow`, two classes), so it outranks the
 * stylesheet's compact and showcase rules for the same element (one or two classes) without a source-order tie. The
 * header's border is its bottom edge and the footer's its top edge, as the stylesheet draws them; the summary box's
 * border runs round it. Borders are `{desktop|tablet|mobile: {width, style, colour}}` (includes/helpers-tiered-border.php),
 * paddings a `{top,right,bottom,left}` box per device.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tiered-border.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tokens.php';

if ( ! function_exists( 'sgs_choice_flow_band_css' ) ) {
	/**
	 * One part's fill, border and padding.
	 *
	 * @param array  $attributes    Root block attributes.
	 * @param string $selector      The part's scoped selector.
	 * @param string $prefix        Attribute prefix (`headerBand`, `footerBand`, `summary`).
	 * @param string $border_prefix CSS border prefix (`border`, `border-top`, `border-bottom`).
	 * @return string Scoped rules, '' when none of the part's settings is set.
	 */
	function sgs_choice_flow_band_css( array $attributes, string $selector, string $prefix, string $border_prefix ): string {
		$css  = '';
		$fill = sgs_colour_value( (string) ( $attributes[ $prefix . 'Background' ] ?? '' ) );
		if ( '' !== $fill ) {
			$css .= $selector . '{background-color:' . $fill . ';background-image:none;}';
		}
		$css .= sgs_emit_responsive_css( $selector, sgs_tiered_border_specs( $attributes[ $prefix . 'Border' ] ?? array(), $border_prefix ) );
		$css .= sgs_emit_responsive_css(
			$selector,
			array(
				array(
					'value'        => $attributes[ $prefix . 'Padding' ] ?? null,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		return $css;
	}
}

if ( ! function_exists( 'sgs_choice_flow_bands_css' ) ) {
	/**
	 * The progress track's colour, the header and footer bands and the summary box with its dividers.
	 *
	 * @param array  $attributes Root block attributes.
	 * @param string $root_sel   The instance's scoped root selector.
	 * @return string Scoped rules, or '' when none of the settings is set.
	 */
	function sgs_choice_flow_bands_css( array $attributes, string $root_sel ): string {
		$css   = '';
		$track = sgs_colour_value( (string) ( $attributes['progressTrackColour'] ?? '' ) );
		if ( '' !== $track ) {
			$css .= $root_sel . ' .sgs-choice-flow__progress{background-color:' . $track . ';}';
		}
		$css .= sgs_choice_flow_band_css( $attributes, $root_sel . ' .sgs-choice-flow__chrome-header', 'headerBand', 'border-bottom' );
		$css .= sgs_choice_flow_band_css( $attributes, $root_sel . ' .sgs-choice-flow__footer', 'footerBand', 'border-top' );
		$css .= sgs_choice_flow_band_css( $attributes, $root_sel . ' .sgs-choice-flow__summary-body', 'summary', 'border' );
		// The rules between the summary's lines and above its total.
		$divider = sgs_colour_value( (string) ( $attributes['summaryDividerColour'] ?? '' ) );
		if ( '' !== $divider ) {
			$css .= $root_sel . ' .sgs-choice-flow__summary-lines,' . $root_sel . ' .sgs-choice-flow__summary-total{border-color:' . $divider . ';}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_choice_flow_note_icon_size_css' ) ) {
	/**
	 * The help note's icon disc diameter per device (`stageNoteIconCircleSize`, a CSS length per device; a bare number is px);
	 * the icon inside keeps its own size.
	 *
	 * @param array  $attributes Root block attributes.
	 * @param string $root_sel   The instance's scoped root selector.
	 * @return string Scoped rules, or '' when unset.
	 */
	function sgs_choice_flow_note_icon_size_css( array $attributes, string $root_sel ): string {
		$raw = $attributes['stageNoteIconCircleSize'] ?? null;
		return sgs_emit_responsive_css(
			$root_sel . ' .sgs-choice-flow__summary-note-icon',
			array(
				array(
					'value'     => $raw,
					'css'       => 'width',
					'transform' => 'sgs_length_transform',
				),
				array(
					'value'     => $raw,
					'css'       => 'height',
					'transform' => 'sgs_length_transform',
				),
			)
		);
	}
}
