<?php
/**
 * Site Info text and links for blocks that show one business detail as a line of text.
 *
 * sgs/business-info (condensed opening hours) and sgs/icon-list (items that read Site Info) call these, so a
 * phone number, address, email or opening-hours line reads and links the same wherever it appears. Values come
 * from Sgs_Site_Info; the Maps link comes from Sgs_Site_Info_Binding::link_for_key().
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_site_info_item_sources' ) ) {
	/**
	 * The Site Info sources an icon-list item can take its text from.
	 *
	 * @return string[]
	 */
	function sgs_site_info_item_sources(): array {
		return array( 'phone', 'email', 'address', 'hours' );
	}
}

if ( ! function_exists( 'sgs_site_info_hours_groups' ) ) {
	/**
	 * Opening hours with consecutive days that share the same hours folded into one group, e.g. Mon to Sat all
	 * "9.30-17.30" is one group. A day with no hours is left out unless $show_closed, in which case it groups on the
	 * closed label like any other value (so a run of closed days also folds, e.g. "Sat-Sun Closed").
	 *
	 * @param bool   $show_closed  Whether a day with no hours gets a group.
	 * @param string $closed_label Text shown for a day with no hours.
	 * @return array<int,array{start:string,end:string,value:string}> Groups in day order; start and end are short day names.
	 */
	function sgs_site_info_hours_groups( bool $show_closed = false, string $closed_label = '' ): array {
		$short = array(
			'mon' => __( 'Mon', 'sgs-blocks' ),
			'tue' => __( 'Tue', 'sgs-blocks' ),
			'wed' => __( 'Wed', 'sgs-blocks' ),
			'thu' => __( 'Thu', 'sgs-blocks' ),
			'fri' => __( 'Fri', 'sgs-blocks' ),
			'sat' => __( 'Sat', 'sgs-blocks' ),
			'sun' => __( 'Sun', 'sgs-blocks' ),
		);
		if ( '' === $closed_label ) {
			$closed_label = __( 'Closed', 'sgs-blocks' );
		}

		$groups = array();
		foreach ( $short as $slug => $day ) {
			$value = (string) \SGS\Blocks\Sgs_Site_Info::get( "opening_hours.{$slug}", '' );
			if ( '' === $value && ! $show_closed ) {
				continue;
			}
			$display = '' === $value ? $closed_label : $value;
			$last    = count( $groups ) - 1;
			if ( $last >= 0 && $groups[ $last ]['value'] === $display ) {
				$groups[ $last ]['end'] = $day;
			} else {
				$groups[] = array(
					'start' => $day,
					'end'   => $day,
					'value' => $display,
				);
			}
		}
		return $groups;
	}
}

if ( ! function_exists( 'sgs_site_info_hours_day_text' ) ) {
	/**
	 * The day span of one hours group: "Mon" for a single day, "Mon–Sat" for a run.
	 *
	 * @param array{start:string,end:string,value:string} $group One entry of sgs_site_info_hours_groups().
	 * @return string Plain text.
	 */
	function sgs_site_info_hours_day_text( array $group ): string {
		return $group['start'] === $group['end'] ? $group['start'] : $group['start'] . "\u{2013}" . $group['end'];
	}
}

if ( ! function_exists( 'sgs_site_info_hours_text' ) ) {
	/**
	 * Opening hours as one plain line, e.g. "Mon–Sat 9.30-17.30; Sun 10-14". '' when no day has hours.
	 *
	 * @return string Plain text (escape on output).
	 */
	function sgs_site_info_hours_text(): string {
		$parts = array();
		foreach ( sgs_site_info_hours_groups() as $group ) {
			$parts[] = sgs_site_info_hours_day_text( $group ) . ' ' . $group['value'];
		}
		return implode( '; ', $parts );
	}
}

if ( ! function_exists( 'sgs_site_info_item' ) ) {
	/**
	 * One Site Info detail as escaped HTML text plus the link it makes, formatted as sgs/business-info formats it.
	 *
	 * @param string $source One of sgs_site_info_item_sources().
	 * @param bool   $link   Address: link to the Maps link. Hours: link to the Google Business profile. Phone and
	 *                       email always link.
	 * @return array{html:string,url:string}|null Null when the source is unknown or Site Info holds no value for it.
	 */
	function sgs_site_info_item( string $source, bool $link = false ): ?array {
		switch ( $source ) {
			case 'phone':
				$phone = trim( (string) \SGS\Blocks\Sgs_Site_Info::get( 'phone', '' ) );
				if ( '' === $phone ) {
					return null;
				}
				return array(
					'html' => esc_html( $phone ),
					'url'  => 'tel:' . preg_replace( '/[^0-9+]/', '', $phone ),
				);

			case 'email':
				$email = trim( (string) \SGS\Blocks\Sgs_Site_Info::get( 'email', '' ) );
				if ( '' === $email || ! is_email( $email ) ) {
					return null;
				}
				return array(
					'html' => esc_html( $email ),
					'url'  => 'mailto:' . antispambot( $email ),
				);

			case 'address':
				$address = trim( (string) \SGS\Blocks\Sgs_Site_Info::get( 'address', '' ) );
				if ( '' === $address ) {
					return null;
				}
				// Stored as plain text plus <br>; nothing else survives.
				return array(
					'html' => wp_kses( $address, array( 'br' => array() ) ),
					'url'  => $link ? \SGS\Blocks\Sgs_Site_Info_Binding::link_for_key( 'address' ) : '',
				);

			case 'hours':
				$hours = sgs_site_info_hours_text();
				if ( '' === $hours ) {
					return null;
				}
				return array(
					'html' => esc_html( $hours ),
					'url'  => $link ? \SGS\Blocks\Sgs_Site_Info_Binding::link_for_key( 'socials.google' ) : '',
				);
		}
		return null;
	}
}
