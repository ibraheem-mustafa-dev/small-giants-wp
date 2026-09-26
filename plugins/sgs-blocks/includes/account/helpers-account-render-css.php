<?php
/**
 * Scoped CSS builders for sgs/account's render.php.
 *
 * Split out of render.php to keep it under the 300-line PHP limit and
 * because render.php itself may declare no top-level function (a second
 * instance of the block on one page would redeclare it and fatal). Every
 * function here is function_exists()-guarded for the same reason a second
 * `require` must stay safe.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_menu_icon_css' ) ) {
	/**
	 * Build the `::before` mask-image CSS that paints one Lucide icon per
	 * WooCommerce My Account menu item.
	 *
	 * WooCommerce's own menu markup renders each item's label as plain
	 * escaped text (`<a>{label}</a>`) with no markup slot for an icon, so the
	 * icon cannot be injected as a real `<svg>` child — it is painted as a
	 * CSS mask on the anchor's `::before` instead, sized as a small square
	 * and coloured via `background-color:currentColor` so it always matches
	 * the anchor's own text colour (including on hover/active/focus, with no
	 * separate icon-colour attribute needed).
	 *
	 * @param array  $menu_icons  Endpoint => icon-name map (already merged
	 *                            with the framework defaults by the caller).
	 * @param string $root_sel    The block's own scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_menu_icon_css( array $menu_icons, string $root_sel ): string {
		if ( empty( $menu_icons ) ) {
			return '';
		}
		require_once dirname( __DIR__ ) . '/lucide-icons.php';

		$css = '';
		foreach ( $menu_icons as $endpoint => $icon_name ) {
			$endpoint  = sanitize_html_class( (string) $endpoint );
			$icon_name = sanitize_key( (string) $icon_name );
			if ( '' === $endpoint || '' === $icon_name ) {
				continue;
			}
			$svg = function_exists( 'sgs_get_lucide_icon' ) ? sgs_get_lucide_icon( $icon_name ) : '';
			if ( '' === $svg ) {
				continue;
			}
			$data_uri = sgs_account_icon_data_uri( $svg );
			if ( '' === $data_uri ) {
				continue;
			}
			$selector = $root_sel . ' .woocommerce-MyAccount-navigation-link--' . $endpoint . ' > a::before';
			$css     .= $selector . '{content:"";display:inline-block;width:18px;height:18px;flex:0 0 auto;'
				. 'margin-inline-end:0.5em;vertical-align:middle;'
				. 'background-color:currentColor;'
				. '-webkit-mask-image:url("' . $data_uri . '");mask-image:url("' . $data_uri . '");'
				. '-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;'
				. '-webkit-mask-position:center;mask-position:center;}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_account_icon_data_uri' ) ) {
	/**
	 * Turn a Lucide `<svg>` markup string into a `data:image/svg+xml,...` URI
	 * safe for a CSS `mask-image:url()` value.
	 *
	 * Strips the leading HTML comment (Lucide's licence header) — a comment
	 * inside a data URI is harmless but wastes bytes on every one of the
	 * (up to 8) menu items this can run for.
	 *
	 * @param string $svg Raw `<svg>…</svg>` markup (trusted — sourced only
	 *                    from the bundled Lucide map, never user input).
	 * @return string `data:image/svg+xml,...` URI, or '' when $svg is empty.
	 */
	function sgs_account_icon_data_uri( string $svg ): string {
		$svg = preg_replace( '/^<!--.*?-->/s', '', $svg );
		$svg = trim( (string) $svg );
		if ( '' === $svg ) {
			return '';
		}
		return 'data:image/svg+xml,' . rawurlencode( $svg );
	}
}

if ( ! function_exists( 'sgs_account_card_border_shape_css' ) ) {
	/**
	 * Card border width and style (the colour comes from sgs_border_states_css).
	 * A style with no width, or 'none', leaves the stylesheet's default border.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $selector   Scoped card selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_card_border_shape_css( array $attributes, string $selector ): string {
		$style = (string) ( $attributes['cardBorderStyle'] ?? '' );
		if ( ! in_array( $style, array( 'solid', 'dashed', 'dotted', 'double' ), true ) ) {
			return '';
		}
		$width = is_array( $attributes['cardBorderWidth'] ?? null ) ? $attributes['cardBorderWidth'] : array();
		$sides = array();
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$sides[ $side ] = sgs_css_length_value( (string) ( $width[ $side ] ?? '' ) );
		}
		if ( '' === implode( '', $sides ) ) {
			return '';
		}
		foreach ( $sides as $side => $value ) {
			$sides[ $side ] = '' !== $value ? $value : '0';
		}
		return $selector . '{border-style:' . $style . ';border-width:' . implode( ' ', $sides ) . ';}';
	}
}

if ( ! function_exists( 'sgs_account_scoped_css' ) ) {
	/**
	 * Build the full scoped `<style>` payload for one `sgs/account` instance:
	 * menu/heading/card colours + typography, the active-item indicator/pill
	 * custom properties, the progress-track colours, and the menu-width/gap/
	 * content-max-width responsive tiers.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's own scoped root selector
	 *                           (`.{uid}.wp-block-sgs-account`).
	 * @return string CSS text (may be '').
	 */
	function sgs_account_scoped_css( array $attributes, string $root_sel ): string {
		$css = array();

		// Menu link text (base + hover) — WooCommerce's own nav markup.
		$css[] = sgs_text_states_css(
			$root_sel . ' .woocommerce-MyAccount-navigation a',
			$attributes,
			array(
				'base'  => 'menuTextColour',
				'hover' => 'menuTextColourHover',
			)
		);

		// Active item — a bar (sidebar) or a filled pill (tabs), never colour
		// alone (WCAG): both also carry bold text. The bar is the link's
		// ::before; the background paints the active link in either layout.
		$active_link  = $root_sel . ' nav.woocommerce-MyAccount-navigation .woocommerce-MyAccount-navigation-link.is-active > a';
		$css[]        = sgs_text_states_css( $active_link, $attributes, array( 'base' => 'menuActiveTextColour' ) );
		$css[]        = sgs_fill_states_css( $active_link . '::before', $attributes, array( 'base' => 'menuActiveIndicatorColour' ) );
		$css[]        = sgs_fill_states_css( $active_link, $attributes, array( 'base' => 'menuActiveBackgroundColour' ) );

		// Cards (dashboard quick-cards, latest-order card, auth cards, tracking card).
		$css[] = sgs_fill_states_css(
			$root_sel . ' .sgs-account__card',
			$attributes,
			array( 'base' => 'cardBackgroundColour' )
		);
		$css[] = sgs_border_states_css( $root_sel . ' .sgs-account__card', $attributes, array( 'base' => 'cardBorderColour' ) );
		$css[] = sgs_account_card_border_shape_css( $attributes, $root_sel . ' .sgs-account__card' );

		// Links in the account content and the log-in forms (not the menu,
		// buttons or quick cards, which have their own controls).
		$css[] = sgs_text_states_css(
			$root_sel . ' .sgs-account__wc a:where(:not(nav *, .button, .wp-element-button, .sgs-account__quick-card))',
			$attributes,
			array(
				'base'  => 'contentLinkColour',
				'hover' => 'contentLinkColourHover',
			)
		);

		// Headings (dashboard greeting/section titles) + card titles share one colour.
		$css[] = sgs_text_states_css(
			$root_sel . ' .sgs-account__heading, ' . $root_sel . ' .sgs-account__card-title',
			$attributes,
			array( 'base' => 'headingColour' )
		);

		// Status chip.
		$css[] = sgs_fill_states_css(
			$root_sel . ' .sgs-account__chip',
			$attributes,
			array( 'base' => 'chipBackgroundColour' )
		);
		$css[] = sgs_text_states_css(
			$root_sel . ' .sgs-account__chip',
			$attributes,
			array( 'base' => 'chipTextColour' )
		);

		// Progress track: each step's top border; completed steps override it.
		$css[] = sgs_border_states_css( $root_sel . ' .sgs-account__progress-step', $attributes, array( 'base' => 'trackColour' ) );
		$css[] = sgs_border_states_css( $root_sel . ' .sgs-account__progress-step--done', $attributes, array( 'base' => 'trackDoneColour' ) );

		// Typography — three prefixes, one helper each.
		$css[] = sgs_typography_css_rule( $attributes, 'menu', $root_sel . ' .woocommerce-MyAccount-navigation a' );
		$css[] = sgs_typography_css_rule( $attributes, 'heading', $root_sel . ' .sgs-account__heading' );
		$css[] = sgs_typography_css_rule( $attributes, 'cardTitle', $root_sel . ' .sgs-account__card-title' );

		// Menu width / gap / content max-width — responsive custom-property tiers.
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'navWidth', '--sgs-account-menu-width', $root_sel );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'gap', '--sgs-account-gap', $root_sel );
		$css[] = sgs_account_tier_custom_property_css( $attributes, 'contentMaxWidth', '--sgs-account-content-max-width', $root_sel );

		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_tier_custom_property_css' ) ) {
	/**
	 * Emit a responsive (`desktop`/`tablet`/`mobile`) tier object attribute
	 * as one custom property on the block's own root selector — the same
	 * Pattern A shape `sgs/wishlist-panel`'s render.php uses for its
	 * `columns`/`gap` tiers.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param string $attr_name   Tier-object attribute name (e.g. 'gap').
	 * @param string $css_var     Custom property name (e.g. '--sgs-account-gap').
	 * @param string $root_sel    The block's own scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_tier_custom_property_css( array $attributes, string $attr_name, string $css_var, string $root_sel ): string {
		$tiers = sgs_responsive_normalise_object( $attributes[ $attr_name ] ?? null, false );
		$css   = '';
		foreach (
			array(
				'desktop' => '',
				'tablet'  => '@media(max-width:1023px)',
				'mobile'  => '@media(max-width:767px)',
			) as $tier => $media
		) {
			$raw = $tiers[ $tier ] ?? null;
			if ( null === $raw || '' === $raw ) {
				continue;
			}
			$safe = sgs_css_length_value( is_numeric( $raw ) ? $raw . 'px' : (string) $raw );
			if ( '' === $safe ) {
				continue;
			}
			$rule = $root_sel . '{' . $css_var . ':' . $safe . ';}';
			$css .= $media ? $media . '{' . $rule . '}' : $rule;
		}
		return $css;
	}
}
