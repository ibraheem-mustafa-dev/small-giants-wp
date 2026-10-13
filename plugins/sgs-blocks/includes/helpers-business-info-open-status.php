<?php
/**
 * Business Info (open-status): server markup and scoped colours.
 *
 * The server cannot know whether the business is open: a full-page cache would freeze the answer.
 * It renders the stored opening hours as plain text (the fallback, readable with no JavaScript) and
 * carries the hours, the business time zone and the wording in a data-config attribute; the block's
 * view module (src/blocks/business-info/view.js) works out the status in the visitor's browser,
 * against the business's own time zone, and replaces the fallback text.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_business_info_open_status_labels' ) ) {
	/**
	 * The wording the status pill and line use: the block's attributes, falling back to the defaults.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return array<string,mixed> Labels keyed as view.js reads them; `days` is Monday first.
	 */
	function sgs_business_info_open_status_labels( array $attributes ): array {
		$pick = static function ( string $key, string $default ) use ( $attributes ): string {
			$value = isset( $attributes[ $key ] ) ? trim( (string) $attributes[ $key ] ) : '';
			return '' !== $value ? $value : $default;
		};
		return array(
			'open'     => $pick( 'openStatusOpenLabel', __( 'Open now', 'sgs-blocks' ) ),
			'closed'   => $pick( 'openStatusClosedLabel', __( 'Closed', 'sgs-blocks' ) ),
			'closes'   => $pick( 'openStatusClosesLabel', __( 'Closes at', 'sgs-blocks' ) ),
			'opens'    => $pick( 'openStatusOpensLabel', __( 'Opens at', 'sgs-blocks' ) ),
			'reopens'  => $pick( 'openStatusReopensLabel', __( 'Closed until', 'sgs-blocks' ) ),
			'today'    => __( 'today', 'sgs-blocks' ),
			'tomorrow' => __( 'tomorrow', 'sgs-blocks' ),
			'noon'     => __( 'noon', 'sgs-blocks' ),
			'midnight' => __( 'midnight', 'sgs-blocks' ),
			'days'     => array(
				__( 'Monday', 'sgs-blocks' ),
				__( 'Tuesday', 'sgs-blocks' ),
				__( 'Wednesday', 'sgs-blocks' ),
				__( 'Thursday', 'sgs-blocks' ),
				__( 'Friday', 'sgs-blocks' ),
				__( 'Saturday', 'sgs-blocks' ),
				__( 'Sunday', 'sgs-blocks' ),
			),
		);
	}
}

if ( ! function_exists( 'sgs_business_info_open_status_html' ) ) {
	/**
	 * The open-status markup, or '' when Site Info holds no opening hours.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param bool                $editor     True for an editor preview, which shows the open state with sample wording.
	 * @return string HTML.
	 */
	function sgs_business_info_open_status_html( array $attributes, bool $editor ): string {
		$fallback = sgs_site_info_hours_text();
		if ( '' === $fallback ) {
			return '';
		}

		$hours = array();
		foreach ( array( 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' ) as $slug ) {
			$hours[ $slug ] = (string) \SGS\Blocks\Sgs_Site_Info::get( "opening_hours.{$slug}", '' );
		}
		$labels    = sgs_business_info_open_status_labels( $attributes );
		$show_line = ! array_key_exists( 'openStatusShowLine', $attributes ) || ! empty( $attributes['openStatusShowLine'] );
		$timezone  = function_exists( 'wp_timezone_string' ) ? (string) wp_timezone_string() : 'UTC';
		$config    = array(
			'timezone' => $timezone,
			'hours'    => $hours,
			'labels'   => $labels,
			'showLine' => $show_line,
		);

		// Fallback: no pill, the stored hours as text. An editor preview shows the open state instead.
		$state     = $editor ? 'open' : '';
		$pill_attr = $editor ? '' : ' hidden';
		$line_text = $editor ? $labels['closes'] . ' 5pm ' . $labels['today'] : $fallback;
		$show_text = $editor && ! $show_line ? '' : $line_text;

		return sprintf(
			'<div class="sgs-business-info sgs-open-status" data-sgs-open-status data-state="%1$s" data-config="%2$s"><p class="sgs-open-status__pill"%3$s><span class="sgs-open-status__dot" aria-hidden="true"></span><span class="sgs-open-status__label">%4$s</span></p><p class="sgs-open-status__line">%5$s</p></div>',
			esc_attr( $state ),
			esc_attr( (string) wp_json_encode( $config ) ),
			$pill_attr,
			esc_html( $labels['open'] ),
			esc_html( $show_text )
		);
	}
}

if ( ! function_exists( 'sgs_business_info_open_status_css' ) ) {
	/**
	 * Scoped custom properties for the pill and dot colours; an unset colour emits nothing, so the
	 * stylesheet defaults apply.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The block root selector.
	 * @return string CSS, '' when no colour is set.
	 */
	function sgs_business_info_open_status_css( array $attributes, string $root_sel ): string {
		$map   = array(
			'openStatusOpenDot'         => '--sgs-os-open-dot',
			'openStatusClosedDot'       => '--sgs-os-closed-dot',
			'openStatusOpenText'        => '--sgs-os-open-text',
			'openStatusClosedText'      => '--sgs-os-closed-text',
			'openStatusOpenBackground'  => '--sgs-os-open-bg',
			'openStatusClosedBackground' => '--sgs-os-closed-bg',
		);
		$decls = array();
		foreach ( $map as $attr => $property ) {
			$value = isset( $attributes[ $attr ] ) ? sgs_colour_value( (string) $attributes[ $attr ] ) : '';
			if ( '' !== $value ) {
				$decls[] = $property . ':' . $value;
			}
		}
		return $decls ? $root_sel . '{' . implode( ';', $decls ) . ';}' : '';
	}
}
