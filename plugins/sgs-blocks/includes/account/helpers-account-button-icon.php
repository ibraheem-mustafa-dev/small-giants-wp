<?php
/**
 * An icon inside sgs/account's sign-in and create-account buttons.
 *
 * WooCommerce prints both submit buttons from its own templates, so the icon is put on the finished markup (the
 * same way Account_Strings::register_heading() sets the register heading): the label stays WooCommerce's, the
 * `<button>` stays the one tap target, and the form still submits. The glyph is the framework's Lucide icon
 * (`sgs_get_lucide_icon()`) sanitised with the allowlist sgs/button prints its icon through
 * (`sgs_button_icon_svg_allowed()`), inside the same `.sgs-button__icon` span, and it reads the same custom
 * properties (`--sgs-btn-icon-size`, `--sgs-btn-icon-shape-size`). With no icon chosen nothing changes.
 *
 * Settings per button (`loginButton…` and `registerButton…`): Icon, IconPosition, IconSize, IconGap, IconColour,
 * IconBackground, IconShapeSize.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-colour-variants.php';
require_once dirname( __DIR__ ) . '/helpers-button-inner-kses.php';
require_once dirname( __DIR__ ) . '/lucide-icons.php';

if ( ! function_exists( 'sgs_account_button_icon_markup' ) ) {
	/**
	 * The icon span for one button.
	 *
	 * @param string $name        Lucide icon name (a block attribute, untrusted).
	 * @param bool   $with_circle Whether a circle fill is set (adds the circle modifier).
	 * @return string Escaped markup, or '' when the name is empty or unknown.
	 */
	function sgs_account_button_icon_markup( string $name, bool $with_circle ): string {
		$name = sanitize_text_field( $name );
		if ( '' === $name ) {
			return '';
		}
		$svg = sgs_get_lucide_icon( $name );
		if ( ! is_string( $svg ) || '' === $svg ) {
			return '';
		}
		$class = 'sgs-button__icon sgs-account__button-icon' . ( $with_circle ? ' sgs-account__button-icon--circle' : '' );
		return sprintf(
			'<span class="%s" aria-hidden="true">%s</span>',
			esc_attr( $class ),
			wp_kses( $svg, sgs_button_icon_svg_allowed() )
		);
	}
}

if ( ! function_exists( 'sgs_account_button_icon_add' ) ) {
	/**
	 * Put the icon inside the one WooCommerce submit button that carries `$submit_class`.
	 *
	 * @param string $html         WooCommerce's rendered markup.
	 * @param string $submit_class The button's WooCommerce class (`woocommerce-form-login__submit`).
	 * @param string $icon_html    Output of sgs_account_button_icon_markup().
	 * @param string $position     'before' or 'after' (anything else = after).
	 * @return string
	 */
	function sgs_account_button_icon_add( string $html, string $submit_class, string $icon_html, string $position ): string {
		if ( '' === $icon_html || false === strpos( $html, $submit_class ) ) {
			return $html;
		}
		$out = preg_replace_callback(
			'#<button\b([^>]*)>(.*?)</button>#s',
			static function ( array $m ) use ( $submit_class, $icon_html, $position ): string {
				if ( ! preg_match( '#\bclass="([^"]*)"#', $m[1], $class ) || ! preg_match( '#(?<![\w-])' . preg_quote( $submit_class, '#' ) . '(?![\w-])#', $class[1] ) ) {
					return $m[0];
				}
				$attrs = str_replace( $class[0], 'class="' . $class[1] . ' sgs-account__button--icon"', $m[1] );
				$inner = 'before' === $position ? $icon_html . $m[2] : $m[2] . $icon_html;
				return '<button' . $attrs . '>' . $inner . '</button>';
			},
			$html
		);
		return is_string( $out ) ? $out : $html;
	}
}

if ( ! function_exists( 'sgs_account_button_icons' ) ) {
	/**
	 * Add the sign-in and create-account icons to WooCommerce's rendered markup.
	 *
	 * @param string $html       WooCommerce's rendered markup.
	 * @param array  $attributes Block attributes.
	 * @return string
	 */
	function sgs_account_button_icons( string $html, array $attributes ): string {
		$login = sgs_account_button_icon_markup( (string) ( $attributes['loginButtonIcon'] ?? '' ), '' !== (string) ( $attributes['loginButtonIconBackground'] ?? '' ) );
		$html  = sgs_account_button_icon_add( $html, 'woocommerce-form-login__submit', $login, (string) ( $attributes['loginButtonIconPosition'] ?? '' ) );

		$register = sgs_account_button_icon_markup( (string) ( $attributes['registerButtonIcon'] ?? '' ), '' !== (string) ( $attributes['registerButtonIconBackground'] ?? '' ) );
		return sgs_account_button_icon_add( $html, 'woocommerce-form-register__submit', $register, (string) ( $attributes['registerButtonIconPosition'] ?? '' ) );
	}
}

if ( ! function_exists( 'sgs_account_button_icon_css' ) ) {
	/**
	 * The scoped CSS for both buttons' icons (nothing for a button without an icon).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_button_icon_css( array $attributes, string $root_sel ): string {
		$form = $root_sel . ' .sgs-account__wc form';
		$css  = array();

		if ( '' !== (string) ( $attributes['loginButtonIcon'] ?? '' ) ) {
			$btn   = $form . ' .woocommerce-form-login__submit';
			$icon  = $btn . ' .sgs-account__button-icon';
			$css[] = sgs_emit_responsive_css(
				$btn,
				array(
					array(
						'value'        => $attributes['loginButtonIconGap'] ?? array(),
						'css'          => 'gap',
						'unit_default' => 'px',
					),
					array(
						'value'        => $attributes['loginButtonIconSize'] ?? array(),
						'css'          => '--sgs-btn-icon-size',
						'unit_default' => 'px',
						'cast'         => 'int',
					),
					array(
						'value'        => $attributes['loginButtonIconShapeSize'] ?? array(),
						'css'          => '--sgs-btn-icon-shape-size',
						'unit_default' => 'px',
						'cast'         => 'int',
					),
				)
			);
			$css[] = sgs_text_states_css( $icon, $attributes, array( 'base' => 'loginButtonIconColour' ) );
			$css[] = sgs_fill_states_css( $icon, $attributes, array( 'base' => 'loginButtonIconBackground' ) );
		}

		if ( '' !== (string) ( $attributes['registerButtonIcon'] ?? '' ) ) {
			$btn   = $form . ' .woocommerce-form-register__submit';
			$icon  = $btn . ' .sgs-account__button-icon';
			$css[] = sgs_emit_responsive_css(
				$btn,
				array(
					array(
						'value'        => $attributes['registerButtonIconGap'] ?? array(),
						'css'          => 'gap',
						'unit_default' => 'px',
					),
					array(
						'value'        => $attributes['registerButtonIconSize'] ?? array(),
						'css'          => '--sgs-btn-icon-size',
						'unit_default' => 'px',
						'cast'         => 'int',
					),
					array(
						'value'        => $attributes['registerButtonIconShapeSize'] ?? array(),
						'css'          => '--sgs-btn-icon-shape-size',
						'unit_default' => 'px',
						'cast'         => 'int',
					),
				)
			);
			$css[] = sgs_text_states_css( $icon, $attributes, array( 'base' => 'registerButtonIconColour' ) );
			$css[] = sgs_fill_states_css( $icon, $attributes, array( 'base' => 'registerButtonIconBackground' ) );
		}

		return implode( '', array_filter( $css ) );
	}
}
