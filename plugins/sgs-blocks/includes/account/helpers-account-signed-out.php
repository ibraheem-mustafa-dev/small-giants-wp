<?php
/**
 * Signed-out card and sign-in tabs for sgs/account (Spec 27 FR-30-25).
 *
 * Split out of render.php, which may declare no top-level function (a second
 * instance on one page would redeclare it and fatal). Every function here is
 * function_exists()-guarded. Every attribute read here is absent until the
 * editor sets it (no block.json `default`), so an untouched block keeps the
 * `$attributes` array its uid class hashes.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/helpers-border-style.php';
require_once dirname( __DIR__ ) . '/helpers-colour-variants.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-flex-wrap.php';
require_once dirname( __DIR__ ) . '/helpers-link-source.php';
require_once __DIR__ . '/helpers-account-render-css.php';

if ( ! function_exists( 'sgs_account_registration_enabled' ) ) {
	/**
	 * Whether WooCommerce lets visitors register on the My Account page.
	 *
	 * @return bool
	 */
	function sgs_account_registration_enabled(): bool {
		return 'yes' === get_option( 'woocommerce_enable_myaccount_registration' );
	}
}

if ( ! function_exists( 'sgs_account_login_form_requested' ) ) {
	/**
	 * Whether the visitor followed the card's sign-in link (`?sgs-login=1`).
	 * A read-only display switch: it reveals a form, writes nothing.
	 *
	 * @return bool
	 */
	function sgs_account_login_form_requested(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display switch, no state change.
		return isset( $_GET['sgs-login'] ) && '1' === sanitize_text_field( wp_unslash( (string) $_GET['sgs-login'] ) );
	}
}

if ( ! function_exists( 'sgs_account_register_mode_requested' ) ) {
	/**
	 * Whether the visitor asked for the Create account tab (`?mode=register`).
	 *
	 * @return bool
	 */
	function sgs_account_register_mode_requested(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display switch, no state change.
		return isset( $_GET['mode'] ) && 'register' === sanitize_key( wp_unslash( (string) $_GET['mode'] ) );
	}
}

if ( ! function_exists( 'sgs_account_signed_out_card_active' ) ) {
	/**
	 * Whether this render shows the signed-out card instead of WooCommerce's form.
	 * The card is the account page's front door only: a WooCommerce endpoint
	 * (lost password, reset) and the card's own sign-in link show the form.
	 *
	 * @param array $attributes Block attributes.
	 * @return bool
	 */
	function sgs_account_signed_out_card_active( array $attributes ): bool {
		return 'card' === ( $attributes['signedOutView'] ?? '' )
			&& ! is_user_logged_in()
			&& ! sgs_account_login_form_requested()
			&& ! ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url() );
	}
}

if ( ! function_exists( 'sgs_account_page_url' ) ) {
	/**
	 * The URL of the page the block sits on, with this block's own query
	 * arguments added.
	 *
	 * @param array<string,string> $args Query arguments to add.
	 * @return string
	 */
	function sgs_account_page_url( array $args ): string {
		$base = get_permalink();
		if ( ! is_string( $base ) || '' === $base ) {
			$base = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/' );
		}
		return add_query_arg( $args, $base );
	}
}

if ( ! function_exists( 'sgs_account_signed_out_button' ) ) {
	/**
	 * One card button, rendered by sgs/button so it takes the site's button
	 * presets, hover and focus exactly as every other SGS button does.
	 *
	 * @param string $label  Visible label.
	 * @param string $url    Destination.
	 * @param string $preset sgs/button `inheritStyle` preset.
	 * @param array  $look   Extra sgs/button attributes (minHeight, boxShadow, boxShadowColour).
	 * @return string Button HTML.
	 */
	function sgs_account_signed_out_button( string $label, string $url, string $preset, array $look = array() ): string {
		return render_block(
			array(
				'blockName'    => 'sgs/button',
				'attrs'        => array_merge(
					array(
						'label'        => $label,
						'url'          => $url,
						'inheritStyle' => $preset,
					),
					$look
				),
				'innerBlocks'  => array(),
				'innerHTML'    => '',
				'innerContent' => array(),
			)
		);
	}
}

if ( ! function_exists( 'sgs_account_signed_out_html' ) ) {
	/**
	 * The signed-out card: heading, copy and the sign-in / create-account
	 * buttons. The create-account button is left out while WooCommerce
	 * registration is off.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Card HTML.
	 */
	function sgs_account_signed_out_html( array $attributes ): string {
		$heading = (string) ( $attributes['signedOutHeading'] ?? __( 'Sign in to see your orders', 'sgs-blocks' ) );
		$copy    = (string) ( $attributes['signedOutCopy'] ?? __( 'Your orders, saved addresses and account details live here.', 'sgs-blocks' ) );

		$sign_in_label = (string) ( $attributes['signedOutSignInLabel'] ?? __( 'Sign in', 'sgs-blocks' ) );
		$sign_in_url   = sgs_link_source_href( (string) ( $attributes['signedOutSignInUrlSource'] ?? '' ), (string) ( $attributes['signedOutSignInUrl'] ?? '' ) );
		if ( '' === $sign_in_url ) {
			$sign_in_url = sgs_account_page_url( array( 'sgs-login' => '1' ) );
		}

		// The card's two buttons share one height and one resting shadow; everything else is the site's button presets.
		$look = array();
		if ( ! empty( $attributes['signedOutButtonMinHeight'] ) && is_array( $attributes['signedOutButtonMinHeight'] ) ) {
			$look['minHeight'] = $attributes['signedOutButtonMinHeight'];
		}
		if ( ! empty( $attributes['signedOutButtonShadow'] ) ) {
			$look['boxShadow'] = (string) $attributes['signedOutButtonShadow'];
		}
		if ( ! empty( $attributes['signedOutButtonShadowColour'] ) ) {
			$look['boxShadowColour'] = (string) $attributes['signedOutButtonShadowColour'];
		}
		if ( ! empty( $attributes['signedOutButtonShadowHover'] ) ) {
			$look['boxShadowHover'] = (string) $attributes['signedOutButtonShadowHover'];
		}
		if ( ! empty( $attributes['signedOutButtonShadowColourHover'] ) ) {
			$look['boxShadowColourHover'] = (string) $attributes['signedOutButtonShadowColourHover'];
		}

		$html  = '<div class="sgs-account__signed-out sgs-account__auth-card">';
		$html .= '<h2 class="sgs-account__heading">' . sgs_rich_text_kses( $heading ) . '</h2>';
		$html .= '<p class="sgs-account__card-desc">' . sgs_rich_text_kses( $copy ) . '</p>';
		$html .= '<div class="sgs-account__signed-out-actions">';
		$html .= sgs_account_signed_out_button( $sign_in_label, $sign_in_url, 'primary', $look );

		if ( sgs_account_registration_enabled() ) {
			$register_label = (string) ( $attributes['signedOutRegisterLabel'] ?? __( 'Create an account', 'sgs-blocks' ) );
			$register_url   = sgs_link_source_href( (string) ( $attributes['signedOutRegisterUrlSource'] ?? '' ), (string) ( $attributes['signedOutRegisterUrl'] ?? '' ) );
			if ( '' === $register_url ) {
				$register_url = sgs_account_page_url(
					array(
						'sgs-login' => '1',
						'mode'      => 'register',
					)
				);
			}
			$html .= sgs_account_signed_out_button( $register_label, $register_url, 'secondary', $look );
		}

		return $html . '</div></div>';
	}
}

if ( ! function_exists( 'sgs_account_auth_card_css' ) ) {
	/**
	 * Scoped CSS for the auth card (the signed-out card, and the sign-in tabs' container): fill, border, corner radius per
	 * device, shadow, padding per device, and the width and gap custom
	 * properties. Everything goes through the shared emitters.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_auth_card_css( array $attributes, string $root_sel ): string {
		$sel = $root_sel . ' .sgs-account__auth-card';
		$css = array();

		$fill   = sgs_fill_decls(
			$attributes,
			array(
				'base'     => 'signedOutCardBackgroundColour',
				'gradient' => 'signedOutCardBackgroundColourGradient',
			)
		);
		$shadow = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'signedOutCardShadow',
				'colour' => 'signedOutCardShadowColour',
			),
			'sgs/account'
		);
		$border = sgs_border_element_decls(
			$attributes,
			'signedOutCard',
			$sel,
			array(
				'colour' => array( 'base' => 'signedOutCardBorderColour' ),
				'radius' => 'signedOutCardBorderRadius',
			)
		);

		$base = array_merge( $fill['normal'], $border['base'], $shadow['normal'] );
		if ( $base ) {
			$css[] = $sel . '{' . implode( ';', $base ) . ';}';
		}
		$css   = array_merge( $css, $border['rules'] );
		$css[] = sgs_emit_tier_decls(
			$sel,
			array(
				'tablet' => $border['tablet'],
				'mobile' => $border['mobile'],
			)
		);
		$css[] = sgs_emit_responsive_css(
			$sel,
			array(
				array(
					'value' => $attributes['signedOutCardPadding'] ?? array(),
					'css'   => 'padding',
					'box'   => true,
				),
			)
		);
		$css[] = sgs_typography_css_rule( $attributes, 'signedOutHeading', $root_sel . ' .sgs-account__signed-out .sgs-account__heading', '', false, false, sgs_object_attr_keys( 'sgs/account' ) );
		$css[] = sgs_typography_css_rule( $attributes, 'signedOutCopy', $root_sel . ' .sgs-account__signed-out .sgs-account__card-desc', '', false, false, sgs_object_attr_keys( 'sgs/account' ) );
		$css[] = sgs_text_states_css( $root_sel . ' .sgs-account__signed-out .sgs-account__card-desc', $attributes, array( 'base' => 'signedOutCopyColour' ) );
		$css[] = sgs_flex_wrap_css( $attributes, $root_sel, array( 'signedOutActionsFlexWrap' => '.sgs-account__signed-out-actions' ) );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'signedOutButtonGap', '--sgs-account-signed-out-actions-gap', $root_sel, true );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'signedOutCardMaxWidth', '--sgs-account-signed-out-max-width', $root_sel );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'signedOutCardGap', '--sgs-account-signed-out-gap', $root_sel, true );

		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_apply_tabs' ) ) {
	/**
	 * Turn WooCommerce's log-in / register columns into ARIA tab panels and put
	 * the tab list inside their container (which becomes the auth card). The inactive panel is `hidden`, so the right form
	 * shows with no script; each tab is a real link (`?mode=…`) the view script
	 * upgrades to an in-page switch. Returns the markup untouched when the form
	 * is not the two-column log-in / register pair (registration off, or an
	 * endpoint such as lost password).
	 *
	 * @param string $wc_html       WooCommerce's rendered output.
	 * @param bool   $register_open Whether the Create account tab is the open one.
	 * @param string $uid           The block's uid, used to make unique element ids.
	 * @param string $signin_label  Sign in tab label.
	 * @param string $register_label Create account tab label.
	 * @return string Markup with the tabs applied.
	 */
	function sgs_account_apply_tabs( string $wc_html, bool $register_open, string $uid, string $signin_label, string $register_label ): string {
		if ( false === strpos( $wc_html, 'id="customer_login"' ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $wc_html;
		}

		$ids   = array(
			'signin'   => array(
				'tab'   => $uid . '-tab-signin',
				'panel' => $uid . '-panel-signin',
			),
			'register' => array(
				'tab'   => $uid . '-tab-register',
				'panel' => $uid . '-panel-register',
			),
		);
		$found = 0;
		$proc  = new WP_HTML_Tag_Processor( $wc_html );
		while ( $proc->next_tag( 'div' ) ) {
			if ( $proc->has_class( 'u-columns' ) ) {
				$proc->add_class( 'sgs-account__auth-card' );
				continue;
			}
			$key = $proc->has_class( 'u-column1' ) ? 'signin' : ( $proc->has_class( 'u-column2' ) ? 'register' : '' );
			if ( '' === $key ) {
				continue;
			}
			++$found;
			$proc->set_attribute( 'id', $ids[ $key ]['panel'] );
			$proc->set_attribute( 'role', 'tabpanel' );
			$proc->set_attribute( 'aria-labelledby', $ids[ $key ]['tab'] );
			$proc->add_class( 'sgs-account__auth-panel' );
			if ( ( 'register' === $key ) !== $register_open ) {
				$proc->set_attribute( 'hidden', '' );
			}
		}
		if ( 2 !== $found ) {
			return $wc_html;
		}
		$wc_html = $proc->get_updated_html();

		// The tab links keep the card's `?sgs-login=1`, or they would land back on the card.
		$keep = sgs_account_login_form_requested() ? array( 'sgs-login' => '1' ) : array();
		$tab  = static function ( string $key, string $label, string $url, bool $selected ) use ( $ids ): string {
			return '<a class="sgs-account__auth-tab" role="tab" id="' . esc_attr( $ids[ $key ]['tab'] ) . '" href="' . esc_url( $url )
				. '" aria-controls="' . esc_attr( $ids[ $key ]['panel'] ) . '" aria-selected="' . ( $selected ? 'true' : 'false' )
				. '" tabindex="' . ( $selected ? '0' : '-1' ) . '" data-sgs-auth-tab="' . esc_attr( $key ) . '">' . esc_html( $label ) . '</a>';
		};

		$tabs = '<div class="sgs-account__auth-tabs" role="tablist" aria-label="' . esc_attr__( 'Sign in or create an account', 'sgs-blocks' ) . '">'
			. $tab( 'signin', $signin_label, sgs_account_page_url( $keep + array( 'mode' => 'signin' ) ), ! $register_open )
			. $tab( 'register', $register_label, sgs_account_page_url( $keep + array( 'mode' => 'register' ) ), $register_open )
			. '</div>';

		// The tab list is the first thing inside the card, so one card holds the tabs and the open form.
		$inserted = preg_replace_callback(
			'/<div[^>]*id="customer_login"[^>]*>/',
			static fn( array $m ): string => $m[0] . $tabs,
			$wc_html,
			1
		);
		return is_string( $inserted ) ? $inserted : $wc_html;
	}
}

if ( ! function_exists( 'sgs_account_view_module' ) ) {
	/**
	 * Keep the account view module on the page only when an instance needs it.
	 * WordPress enqueues a block's view module after its render callback returns,
	 * so an instance can only record whether it needs the module; the
	 * `render_block_sgs/account` filter (which runs after that enqueue) withdraws
	 * it when no instance on the page has asked for it. Two instances: one that
	 * needs it keeps it for both.
	 *
	 * @param WP_Block $block  The block being rendered.
	 * @param bool     $needed Whether this instance needs the module.
	 * @return bool Whether any instance on the page has needed the module so far.
	 */
	function sgs_account_view_module( $block, bool $needed ): bool {
		static $wanted = false;
		if ( $needed ) {
			$wanted = true;
		}
		static $hooked = false;
		if ( ! $hooked ) {
			$hooked = true;
			add_filter(
				'render_block_sgs/account',
				static function ( $block_content, $parsed_block = array(), $instance = null ) use ( &$wanted ) {
					return sgs_account_withdraw_view_module( $block_content, $instance, $wanted );
				},
				20,
				3
			);
		}
		return $wanted;
	}
}

if ( ! function_exists( 'sgs_account_withdraw_view_module' ) ) {
	/**
	 * Dequeue the view module when no instance on the page needs it. Returns the
	 * block HTML untouched.
	 *
	 * @param string        $block_content Rendered block HTML.
	 * @param WP_Block|null $block         The block instance.
	 * @param bool          $wanted        Whether any instance has needed the module.
	 * @return string
	 */
	function sgs_account_withdraw_view_module( $block_content, $block, bool $wanted ) {
		if ( ! $wanted && function_exists( 'wp_dequeue_script_module' ) && isset( $block->block_type->view_script_module_ids ) ) {
			foreach ( (array) $block->block_type->view_script_module_ids as $id ) {
				wp_dequeue_script_module( $id );
			}
		}
		return $block_content;
	}
}

if ( ! function_exists( 'sgs_account_auth_tabs_css' ) ) {
	/**
	 * Scoped CSS for the sign-in tabs: height, the gap between tabs, the space
	 * below the list (custom properties the stylesheet reads) and the open
	 * tab's shadow.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_auth_tabs_css( array $attributes, string $root_sel ): string {
		$css    = array();
		$shadow = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'authTabShadow',
				'colour' => 'authTabShadowColour',
			),
			'sgs/account'
		);
		if ( $shadow['normal'] ) {
			$css[] = $root_sel . ' .sgs-account__auth-tab[aria-selected="true"]{' . implode( ';', $shadow['normal'] ) . ';}';
		}
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'authTabMinHeight', '--sgs-account-tab-min-height', $root_sel );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'authTabGap', '--sgs-account-tab-gap', $root_sel, true );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'authTabsSpaceBelow', '--sgs-account-tabs-space-below', $root_sel, true );
		return implode( '', array_filter( $css ) );
	}
}
