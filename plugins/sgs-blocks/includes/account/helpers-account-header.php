<?php
/**
 * Page header of sgs/account: an optional eyebrow, title and intro per view (sign in, lost password, signed-in
 * account), plus the account view's signed-in line and rule and the lost-password view's "Back to sign in" link.
 *
 * Each view prints only the parts its settings fill; a block that sets none prints no header at all. The colours and
 * type go through the shared emitters in `sgs_account_header_css()`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';
require_once dirname( __DIR__ ) . '/helpers-typography.php';
require_once dirname( __DIR__ ) . '/helpers-colour-variants.php';

if ( ! function_exists( 'sgs_account_current_view' ) ) {
	/**
	 * Which view the block is showing: 'account' (signed in), 'lost' (the lost-password request form), 'lost-sent'
	 * (its confirmation, WooCommerce's `reset-link-sent` query var), 'lost-reset' (the choose-a-new-password form,
	 * `show-reset-form`) or 'signin'.
	 *
	 * @return string
	 */
	function sgs_account_current_view(): string {
		if ( is_user_logged_in() ) {
			return 'account';
		}
		if ( ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'lost-password' ) ) {
			return 'signin';
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only: WooCommerce's own flags choose which view to word.
		if ( isset( $_GET['reset-link-sent'] ) ) {
			return 'lost-sent';
		}
		if ( isset( $_GET['show-reset-form'] ) ) {
			return 'lost-reset';
		}
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		return 'lost';
	}
}

if ( ! function_exists( 'sgs_account_header_tokens' ) ) {
	/**
	 * Fill the {first_name}, {name} and {email} tokens of a header line. The line is escaped first, each value too.
	 *
	 * @param string $template Raw setting text.
	 * @return string Escaped HTML text.
	 */
	function sgs_account_header_tokens( string $template ): string {
		$user  = wp_get_current_user();
		$first = trim( (string) $user->first_name );
		$name  = '' !== $first ? $first : (string) $user->display_name;
		return strtr(
			esc_html( $template ),
			array(
				'{first_name}' => esc_html( $name ),
				'{name}'       => esc_html( $name ),
				'{email}'      => esc_html( (string) $user->user_email ),
			)
		);
	}
}

if ( ! function_exists( 'sgs_account_header_html' ) ) {
	/**
	 * The page header for one view, or '' when the view has nothing set.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $view       'signin' | 'lost' | 'lost-sent' | 'lost-reset' | 'account'.
	 * @return string Escaped HTML.
	 */
	function sgs_account_header_html( array $attributes, string $view ): string {
		// The confirmation and reset views use their own title and intro; with neither set they keep the request view's header.
		$sub = array(
			'lost-sent'  => array( 'headerLostSentTitle', 'headerLostSentIntro' ),
			'lost-reset' => array( 'headerLostResetTitle', 'headerLostResetIntro' ),
		);
		if ( isset( $sub[ $view ] ) && '' === trim( (string) ( $attributes[ $sub[ $view ][0] ] ?? '' ) . (string) ( $attributes[ $sub[ $view ][1] ] ?? '' ) ) ) {
			$view = 'lost';
		}
		$names = array(
			'signin'  => array(
				'eyebrow' => 'headerSignInEyebrow',
				'title'   => 'headerSignInTitle',
				'intro'   => 'headerSignInIntro',
			),
			'lost'    => array(
				'eyebrow' => 'headerLostEyebrow',
				'title'   => 'headerLostTitle',
				'intro'   => 'headerLostIntro',
			),
			'lost-sent'  => array(
				'eyebrow' => 'headerLostEyebrow',
				'title'   => 'headerLostSentTitle',
				'intro'   => 'headerLostSentIntro',
			),
			'lost-reset' => array(
				'eyebrow' => 'headerLostEyebrow',
				'title'   => 'headerLostResetTitle',
				'intro'   => 'headerLostResetIntro',
			),
			'account' => array(
				'eyebrow' => 'headerAccountEyebrow',
				'title'   => 'headerAccountTitle',
				'intro'   => 'headerAccountIntro',
				'meta'    => 'headerAccountMeta',
			),
		)[ $view ] ?? array();
		if ( array() === $names ) {
			return '';
		}
		$read    = static function ( string $slot ) use ( $attributes, $names ): string {
			return isset( $names[ $slot ] ) ? trim( (string) ( $attributes[ $names[ $slot ] ] ?? '' ) ) : '';
		};
		$eyebrow = $read( 'eyebrow' );
		$title   = $read( 'title' );
		$intro   = $read( 'intro' );
		$meta    = $read( 'meta' );
		if ( '' === $eyebrow . $title . $intro . $meta ) {
			return '';
		}

		$tag = in_array( $attributes['headerTitleTag'] ?? '', array( 'h1', 'h2', 'h3' ), true ) ? $attributes['headerTitleTag'] : 'h2';
		$cls = 'sgs-account__header sgs-account__header--' . $view;
		if ( 'account' === $view && ! empty( $attributes['headerAccountRule'] ) ) {
			$cls .= ' sgs-account__header--rule';
		}
		$fill = 'account' === $view ? 'sgs_account_header_tokens' : 'esc_html';

		$html = '<header class="' . esc_attr( $cls ) . '"><div class="sgs-account__header-main">';
		if ( '' !== $eyebrow ) {
			$html .= '<p class="sgs-account__header-eyebrow">' . $fill( $eyebrow ) . '</p>';
		}
		if ( '' !== $title ) {
			$html .= '<' . $tag . ' class="sgs-account__header-title">' . $fill( $title ) . '</' . $tag . '>';
		}
		if ( '' !== $intro ) {
			$html .= '<p class="sgs-account__header-intro">' . $fill( $intro ) . '</p>';
		}
		$html .= '</div>';
		if ( '' !== $meta ) {
			$html .= '<p class="sgs-account__header-meta">' . sgs_account_header_tokens( $meta ) . '</p>';
		}
		return $html . '</header>';
	}
}

if ( ! function_exists( 'sgs_account_lost_back_html' ) ) {
	/**
	 * The Back to sign in link of the lost-password views. It sits under the form, not in the page header, and prints
	 * on the request and confirmation views (not the new-password form) while the label is set.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $view       Value of sgs_account_current_view().
	 * @return string Escaped HTML, or '' on any other view or with no label.
	 */
	function sgs_account_lost_back_html( array $attributes, string $view ): string {
		$back = trim( (string) ( $attributes['headerLostBackLabel'] ?? '' ) );
		if ( ! in_array( $view, array( 'lost', 'lost-sent' ), true ) || '' === $back ) {
			return '';
		}
		$url = function_exists( 'wc_get_page_permalink' ) ? (string) wc_get_page_permalink( 'myaccount' ) : home_url( '/' );
		return '<p class="sgs-account__header-backline"><a class="sgs-account__header-back" href="' . esc_url( $url ) . '">' . esc_html( $back ) . '</a></p>';
	}
}

if ( ! function_exists( 'sgs_account_header_css' ) ) {
	/**
	 * Scoped CSS for the page header: colours and type for each part, and the rule's colour.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_header_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$css    = array();
		$css[]  = sgs_typography_css_rule( $attributes, 'headerEyebrow', $root_sel . ' .sgs-account__header-eyebrow', '', false, false, $tiered );
		$css[]  = sgs_typography_css_rule( $attributes, 'headerTitle', $root_sel . ' .sgs-account__header-title', '', false, false, $tiered );
		$css[]  = sgs_typography_css_rule( $attributes, 'headerIntro', $root_sel . ' .sgs-account__header-intro', '', false, false, $tiered );
		$css[]  = sgs_typography_css_rule( $attributes, 'headerMeta', $root_sel . ' .sgs-account__header-meta', '', false, false, $tiered );
		$css[]  = sgs_text_states_css( $root_sel . ' .sgs-account__header-eyebrow', $attributes, array( 'base' => 'headerEyebrowColour' ) );
		$css[]  = sgs_text_states_css( $root_sel . ' .sgs-account__header-title', $attributes, array( 'base' => 'headerTitleColour' ) );
		$css[]  = sgs_text_states_css( $root_sel . ' .sgs-account__header-intro', $attributes, array( 'base' => 'headerIntroColour' ) );
		$css[]  = sgs_text_states_css( $root_sel . ' .sgs-account__header-meta', $attributes, array( 'base' => 'headerMetaColour' ) );
		$css[]  = sgs_typography_css_rule( $attributes, 'headerBack', $root_sel . ' .sgs-account__header-back', '', false, false, $tiered );
		$css[]  = sgs_text_states_css( $root_sel . ' .sgs-account__header-back', $attributes, array( 'base' => 'headerBackColour' ) );
		$rule   = sgs_colour_value( (string) ( $attributes['headerRuleColour'] ?? '' ) );
		if ( '' !== $rule ) {
			$css[] = $root_sel . ' .sgs-account__header--rule{border-bottom-color:' . $rule . ';}';
		}
		return implode( '', array_filter( $css ) );
	}
}
