<?php
/**
 * Business Info: scoped CSS and sanitising for the map, the open-status dot pulse and the
 * today row of the opening hours.
 *
 * Every value reaches CSS through the block's scoped <style> (no inline style attribute):
 * a custom property for the dot pulse, direct declarations for the today row and the map.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_business_info_map_filter_presets' ) ) {
	/**
	 * The map filter presets, slug to CSS filter value ('none' draws no filter).
	 *
	 * @return array<string,string>
	 */
	function sgs_business_info_map_filter_presets(): array {
		return array(
			'none'          => '',
			'greyscale'     => 'grayscale(1)',
			'muted'         => 'grayscale(.35) contrast(1.05)',
			'sepia'         => 'sepia(.6)',
			'high-contrast' => 'contrast(1.25) saturate(1.2)',
			'dark'          => 'invert(.9) hue-rotate(180deg)',
		);
	}
}

if ( ! function_exists( 'sgs_business_info_map_filter_value' ) ) {
	/**
	 * A CSS filter value kept only when every function is on the allowlist with a numeric or
	 * percent argument (blur takes a length, hue-rotate an angle); anything else, including
	 * url() and drop-shadow(), returns ''.
	 *
	 * @param mixed $raw Candidate value.
	 * @return string The trimmed value, or ''.
	 */
	function sgs_business_info_map_filter_value( $raw ): string {
		$value = is_string( $raw ) ? trim( $raw ) : '';
		if ( '' === $value || strlen( $value ) > 200 ) {
			return '';
		}
		$num     = '[-+]?(?:\d+\.?\d*|\.\d+)';
		$pattern = '/^(?:\s*(?:'
			. '(?:brightness|contrast|grayscale|invert|opacity|saturate|sepia)\(\s*' . $num . '%?\s*\)'
			. '|blur\(\s*' . $num . '(?:px|em|rem)?\s*\)'
			. '|hue-rotate\(\s*' . $num . '(?:deg|rad|grad|turn)?\s*\)'
			. '))+\s*$/i';
		return 1 === preg_match( $pattern, $value ) ? $value : '';
	}
}

if ( ! function_exists( 'sgs_business_info_map_filter_effective' ) ) {
	/**
	 * The filter the map paints: a valid custom value wins over the preset.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return string CSS filter value, '' for none.
	 */
	function sgs_business_info_map_filter_effective( array $attributes ): string {
		$custom = sgs_business_info_map_filter_value( $attributes['mapFilter'] ?? '' );
		if ( '' !== $custom ) {
			return $custom;
		}
		$presets = sgs_business_info_map_filter_presets();
		$slug    = isset( $attributes['mapFilterPreset'] ) ? (string) $attributes['mapFilterPreset'] : 'none';
		return $presets[ $slug ] ?? '';
	}
}

if ( ! function_exists( 'sgs_business_info_map_zoom' ) ) {
	/**
	 * The map zoom, clamped to 1 to 20; an unset or non-numeric value is 15.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return int
	 */
	function sgs_business_info_map_zoom( array $attributes ): int {
		$zoom = isset( $attributes['mapZoom'] ) && is_numeric( $attributes['mapZoom'] ) ? (int) $attributes['mapZoom'] : 15;
		return max( 1, min( 20, $zoom ) );
	}
}

if ( ! function_exists( 'sgs_business_info_map_url_with_zoom' ) ) {
	/**
	 * The embed URL with its z parameter set to the block's zoom.
	 *
	 * @param string $url  Embed URL from sgs_business_info_map_url().
	 * @param int    $zoom Zoom level.
	 * @return string
	 */
	function sgs_business_info_map_url_with_zoom( string $url, int $zoom ): string {
		return (string) preg_replace( '/([?&])z=\d+/', '${1}z=' . $zoom, $url, 1 );
	}
}

if ( ! function_exists( 'sgs_business_info_map_css' ) ) {
	/**
	 * Scoped height (per device) and filter for the map iframe.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The block root selector.
	 * @return string CSS, '' when neither is set.
	 */
	function sgs_business_info_map_css( array $attributes, string $root_sel ): string {
		$sel = $root_sel . ' .sgs-business-map iframe';
		$css = '';
		$h   = $attributes['mapHeight'] ?? null;
		if ( is_array( $h ) && array() !== $h ) {
			$css .= sgs_emit_responsive_css(
				$sel,
				array(
					array(
						'value'        => $h,
						'css'          => 'height',
						'unit_default' => 'px',
					),
				)
			);
		}
		$filter = sgs_business_info_map_filter_effective( $attributes );
		if ( '' !== $filter ) {
			$css .= $sel . '{filter:' . $filter . ';}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_business_info_pulse_css' ) ) {
	/**
	 * The dot pulse duration as a custom property on the root; the pulse itself is a stylesheet
	 * rule switched on by the --pulse class.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The block root selector.
	 * @return string CSS, '' when the pulse is off.
	 */
	function sgs_business_info_pulse_css( array $attributes, string $root_sel ): string {
		if ( empty( $attributes['openStatusDotPulse'] ) ) {
			return '';
		}
		$ms = isset( $attributes['openStatusDotPulseDuration'] ) && is_numeric( $attributes['openStatusDotPulseDuration'] ) ? (int) $attributes['openStatusDotPulseDuration'] : 1600;
		$ms = max( 200, min( 10000, $ms ) );
		return $root_sel . '{--sgs-os-pulse-dur:' . $ms . 'ms;}';
	}
}

if ( ! function_exists( 'sgs_business_info_today_css' ) ) {
	/**
	 * Text colour, background and weight of the today row of the opening hours. The day and time
	 * cells inherit the row's colour and weight so the row's setting wins over the label colour.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The block root selector.
	 * @return string CSS, '' when none is set.
	 */
	function sgs_business_info_today_css( array $attributes, string $root_sel ): string {
		$decls   = array();
		$inherit = array();
		$colour  = sgs_colour_value( isset( $attributes['hoursTodayColour'] ) ? (string) $attributes['hoursTodayColour'] : '' );
		if ( '' !== $colour ) {
			$decls[]   = 'color:' . $colour;
			$inherit[] = 'color:inherit';
		}
		$bg = sgs_colour_value( isset( $attributes['hoursTodayBackground'] ) ? (string) $attributes['hoursTodayBackground'] : '' );
		if ( '' !== $bg ) {
			$decls[] = 'background-color:' . $bg;
		}
		$weight = isset( $attributes['hoursTodayWeight'] ) ? (string) $attributes['hoursTodayWeight'] : '';
		if ( in_array( $weight, array( '300', '400', '500', '600', '700', '800', '900' ), true ) ) {
			$decls[]   = 'font-weight:' . $weight;
			$inherit[] = 'font-weight:inherit';
		}
		if ( ! $decls ) {
			return '';
		}
		$row = $root_sel . ' .sgs-business-hours__row.sgs-business-info__hours-row--today';
		$css = $row . '{' . implode( ';', $decls ) . ';}';
		if ( $inherit ) {
			$css .= $row . ' .sgs-business-hours__day,' . $row . ' .sgs-business-hours__time{' . implode( ';', $inherit ) . ';}';
		}
		return $css;
	}
}
