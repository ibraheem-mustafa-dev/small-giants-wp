<?php
/**
 * SGS Email Site Styles — puts the site's own design tokens into every email's
 * stylesheet in place of WooCommerce's hard-coded email styling (Spec 04,
 * FR-04-EMAIL-STYLES).
 *
 * Off by default: the `sgs_email_site_styles` option (WooCommerce > Settings >
 * Emails, "Use the site's styles in emails") must be `yes`, so a site's emails
 * never change unless it opts in. The rules are appended to the compiled CSS on
 * `woocommerce_email_styles` after WooCommerce's own and after
 * {@see Sgs_Woocommerce_Email_Contrast}, so the site's colours win. SGS's own
 * emails (forms, gift cards) are wrapped in WooCommerce's header and footer and
 * inlined with the same stylesheet, so one filter reaches all of them. The
 * values come from {@see Sgs_Email_Site_Tokens}, already validated.
 *
 * @package SGS\Blocks\Mail
 */

namespace SGS\Blocks\Mail;

defined( 'ABSPATH' ) || exit;

/** Appends the site's tokens to the email stylesheet, and adds the on/off setting. */
final class Sgs_Email_Site_Styles {

	/** Option holding the per-site switch (`yes` or `no`). */
	const OPTION = 'sgs_email_site_styles';

	/** Border colour of the gift card code box when the switch is off. */
	const NEUTRAL_LINE = '#b3b3b3';

	/** Wire the filters. Called once from sgs-blocks.php; a no-op until WooCommerce fires them. */
	public static function register(): void {
		\add_filter( 'woocommerce_email_styles', array( __CLASS__, 'filter_styles' ), 20 );
		\add_filter( 'woocommerce_email_settings', array( __CLASS__, 'add_setting' ) );
		\add_filter( 'wc_get_template', array( __CLASS__, 'swap_button_template' ), 20, 2 );
	}

	/**
	 * Give WooCommerce's own email button template a class the site's button rule can match.
	 *
	 * Only WooCommerce's bundled template is swapped, and only while the switch is on; a theme's override stays.
	 *
	 * @param  mixed $template      Located template path.
	 * @param  mixed $template_name Template name, e.g. `emails/email-button.php`.
	 * @return mixed
	 */
	public static function swap_button_template( $template, $template_name = '' ) {
		if ( 'emails/email-button.php' !== $template_name || ! \is_string( $template ) || ! self::enabled() || ! \function_exists( 'WC' ) ) {
			return $template;
		}
		$bundled = \trailingslashit( \WC()->plugin_path() ) . 'templates/emails/email-button.php';
		return \wp_normalize_path( $template ) === \wp_normalize_path( $bundled ) ? __DIR__ . '/templates/email-button.php' : $template;
	}

	/**
	 * Whether the site opted in.
	 *
	 * @return bool
	 */
	public static function enabled(): bool {
		return 'yes' === \get_option( self::OPTION, 'no' );
	}

	/**
	 * Append the gift card code rule, and the site's rules when the switch is on.
	 *
	 * @param  string $css Compiled email CSS, before WooCommerce inlines it.
	 * @return string
	 */
	public static function filter_styles( string $css ): string {
		if ( ! self::enabled() ) {
			return $css . self::gift_code_rule( self::NEUTRAL_LINE, 'dashed' );
		}
		$tokens = Sgs_Email_Site_Tokens::current();
		return $css . self::gift_code_rule( $tokens['line'] ?? self::NEUTRAL_LINE, 'dashed' ) . self::build_css( $tokens );
	}

	/**
	 * Add the switch beside the email template colour settings.
	 *
	 * @param  array<int,array<string,mixed>> $settings WooCommerce email settings.
	 * @return array<int,array<string,mixed>>
	 */
	public static function add_setting( array $settings ): array {
		$field = array(
			'title'    => \__( 'Site styles', 'sgs-blocks' ),
			'desc'     => \__( "Use the site's styles in emails", 'sgs-blocks' ),
			'id'       => self::OPTION,
			'type'     => 'checkbox',
			'default'  => 'no',
			'autoload' => false,
		);
		$out   = array();
		$added = false;
		foreach ( $settings as $setting ) {
			if ( ! $added && \is_array( $setting ) && 'sectionend' === ( $setting['type'] ?? '' ) && 'email_template_options' === ( $setting['id'] ?? '' ) ) {
				$out[] = $field;
				$added = true;
			}
			$out[] = $setting;
		}
		return $out;
	}

	/**
	 * The code box on the gift card email: the code, centred and set apart.
	 *
	 * @param  string $line  Border colour `#rrggbb`.
	 * @param  string $style Border style, `solid` or `dashed`.
	 * @return string
	 */
	public static function gift_code_rule( string $line, string $style ): string {
		return "\n.sgs-gift-card-email__code {\n\ttext-align: center;\n\tfont-size: 20px;\n\tletter-spacing: 1px;\n\twhite-space: nowrap;\n\tline-height: 120%;\n\tmargin: 24px 0;\n\tpadding: 16px;\n\tborder: 2px {$style} {$line};\n}\n";
	}

	/**
	 * The site's rules, from validated tokens. A token that is absent leaves WooCommerce's own value.
	 *
	 * @param  array<string,mixed> $t Tokens from {@see Sgs_Email_Site_Tokens::from_sources()}.
	 * @return string
	 */
	public static function build_css( array $t ): string {
		$css = '';

		foreach ( (array) ( $t['faces'] ?? array() ) as $face ) {
			$css .= "\n@font-face {\n\tfont-family: \"{$face['family']}\";\n\tsrc: url(\"{$face['src']}\") format(\"" . ( '.woff' === \substr( $face['src'], -5 ) ? 'woff' : 'woff2' ) . "\");\n\tfont-weight: {$face['weight']};\n\tfont-style: {$face['style']};\n\tfont-display: swap;\n}\n";
		}

		// Fonts.
		if ( isset( $t['body_font'] ) ) {
			$css .= self::rule( '#body_content_inner, .td, .text, .address-title, .order-item-data, .font-family, #template_footer #credit, #body_content table td td.email-additional-content', array( 'font-family' => $t['body_font'] ) );
		}
		if ( isset( $t['heading_font'] ) ) {
			$css .= self::rule( 'h1, h2, h3, #template_header, .email-logo-text', array( 'font-family' => $t['heading_font'] ) );
		}

		// Colours.
		if ( isset( $t['text'] ) ) {
			$css .= self::rule( '#body_content_inner, .td, .text, .address-title, .order-item-data, .address, .additional-fields, #body_content table td td.email-additional-content', array( 'color' => $t['text'] ) );
		}
		if ( isset( $t['heading'] ) ) {
			$css .= self::rule( 'h1, h2, h3, #template_header, #template_header h1, #template_header h1 a, .email-logo-text', array( 'color' => $t['heading'] . ' !important' ) );
		}
		if ( isset( $t['link'] ) ) {
			$css .= self::rule( 'a, .link, .email-order-detail-heading span a', array( 'color' => $t['link'] . ' !important' ) );
		}
		if ( isset( $t['muted'] ) ) {
			$css .= self::rule( '#template_footer #credit, #template_footer #credit a, .email-order-item-meta, h2.email-order-detail-heading span', array( 'color' => $t['muted'] . ' !important' ) );
		}
		$css .= self::rule( '#template_footer #credit', array( 'font-size' => '13px' ) );

		// Headings.
		$heading = array( 'letter-spacing' => '0' );
		if ( isset( $t['heading_weight'] ) ) {
			$heading['font-weight'] = $t['heading_weight'];
		}
		$css .= self::rule( 'h1, h2, h3', $heading );
		if ( isset( $t['heading_line_height'] ) ) {
			$css .= self::rule( 'h1', array( 'line-height' => $t['heading_line_height'] ) );
			if ( \is_numeric( $t['heading_line_height'] ) ) {
				$css .= self::rule( 'h2, h3', array( 'line-height' => \max( 1.3, (float) $t['heading_line_height'] ) ) );
			}
		}
		if ( isset( $t['heading_align'] ) ) {
			$css .= self::rule( 'h1, #header_wrapper h1', array( 'text-align' => $t['heading_align'] ) );
			if ( 'center' === $t['heading_align'] ) {
				$css .= self::rule( '#template_header_image p', array( 'text-align' => 'center' ) );
			}
		}

		// The page and the card.
		if ( isset( $t['outer_bg'] ) ) {
			$css .= self::rule( 'body, #outer_wrapper', array( 'background-color' => $t['outer_bg'] ) );
		}
		$line = $t['line'] ?? null;
		$kind = $t['line_style'] ?? 'solid';
		if ( isset( $t['card_bg'] ) ) {
			$card = array(
				'background-color' => $t['card_bg'],
				'border-radius'    => $t['card_radius'] ?? '8px',
				'border-collapse'  => 'separate',
			);
			$card_line = $t['card_border_colour'] ?? $line;
			$card_kind = $t['card_border_style'] ?? $kind;
			if ( null !== $card_line ) {
				$card['border'] = ( $t['card_border_width'] ?? '1px' ) . " {$card_kind} {$card_line}";
			}
			$css   .= self::rule( '#inner_wrapper', $card );
			$css   .= self::rule( '#template_container, #template_header, #body_content, #template_footer', array( 'background-color' => $t['card_bg'] ) );
			$css   .= self::rule( '#template_container, #template_header', array( 'border-radius' => '0 !important' ) );
			$radius = (string) ( $t['card_radius'] ?? '8px' );
			$css   .= self::rule( '#template_footer, #template_footer td', array( 'border-radius' => "0 0 {$radius} {$radius}" ) );
		}

		// One line colour and style for every rule; the order summary's stacked rules become one.
		if ( null !== $line ) {
			$edge = "1px {$kind} {$line}";
			$css .= self::rule(
				'#body_content .email-order-details tbody tr:last-child td, #body_content .email-order-details .order-totals-last td, #body_content .email-order-details .order-totals-last th, #body_content .email-order-details .order-customer-note td',
				array( 'border-bottom' => $edge )
			);
			$css .= self::rule( '#template_footer #credit', array( 'border-top' => $edge ) );
			$css .= self::rule(
				'.hr, .hr-top, .hr-bottom',
				array(
					'border-bottom' => $edge,
					'opacity'       => '1',
				)
			);
			// The divider between the item rows and the totals draws a second rule beside the last row's own.
			$css .= self::rule( '#body_content hr', array( 'display' => 'none !important' ) );
		}

		// A tint behind the order summary.
		if ( isset( $t['panel_bg'] ) ) {
			$radius = (string) ( $t['card_radius'] ?? '8px' );
			$css   .= self::rule( '#body_content table.email-order-details', array( 'background-color' => $t['panel_bg'] ) );
			$css   .= self::rule( '#body_content table.email-order-details:first-child', array( 'border-radius' => "{$radius} {$radius} 0 0" ) );
			$css   .= self::rule( '#body_content table.email-order-details:last-child', array( 'border-radius' => "0 0 {$radius} {$radius}" ) );
			// The tinted panel's own edge ends the summary, so the rule under the totals goes.
			$css   .= self::rule( '#body_content .email-order-details .order-totals-last td, #body_content .email-order-details .order-totals-last th', array( 'border-bottom' => '0' ) );
			$css   .= self::rule( '#body_content table.email-order-details td:first-child, #body_content table.email-order-details th:first-child', array( 'padding-left' => '16px !important' ) );
			$css   .= self::rule( '#body_content table.email-order-details td:last-child, #body_content table.email-order-details th:last-child', array( 'padding-right' => '16px !important' ) );
		}

		if ( isset( $t['image_radius'] ) ) {
			$css .= self::rule( '.email-order-item-thumbnail img', array( 'border-radius' => $t['image_radius'] ) );
		}

		// The call-to-action button. WooCommerce prints its style inline, so these need !important.
		if ( isset( $t['button'] ) ) {
			$css .= self::button_rule( $t['button'], $t['body_font'] ?? null );
		}

		return $css;
	}

	/**
	 * The button rule. It targets the anchor of the template {@see self::swap_button_template()} puts in, which has a class to match on.
	 *
	 * @param  array<string,mixed> $b    Button tokens.
	 * @param  string|null         $font Body font stack.
	 * @return string
	 */
	private static function button_rule( array $b, ?string $font ): string {
		$decl = array(
			'display'          => 'inline-block !important',
			'background-color' => $b['bg'] . ' !important',
			'color'            => $b['text'] . ' !important',
			'border-radius'    => $b['radius'] . ' !important',
			'padding'          => "{$b['pad_v']}px {$b['pad_h']}px !important",
			'font-size'        => $b['font_size'] . ' !important',
			'font-weight'      => $b['weight'] . ' !important',
			'line-height'      => $b['line_height'] . 'px !important',
			'text-decoration'  => 'none !important',
		);
		if ( isset( $b['border_colour'], $b['border_width'] ) ) {
			$decl['border'] = "{$b['border_width']} solid {$b['border_colour']} !important";
		}
		if ( isset( $b['shadow'] ) ) {
			$decl['box-shadow'] = $b['shadow'] . ' !important';
		}
		if ( null !== $font ) {
			$decl['font-family'] = $font . ' !important';
		}
		return self::rule( 'a.sgs-email-button', $decl );
	}

	/**
	 * One CSS rule.
	 *
	 * @param  string               $selector     Selector list.
	 * @param  array<string,string> $declarations Property to value; every value is already validated.
	 * @return string
	 */
	private static function rule( string $selector, array $declarations ): string {
		$body = '';
		foreach ( $declarations as $property => $value ) {
			$body .= "\t{$property}: {$value};\n";
		}
		return "\n{$selector} {\n{$body}}\n";
	}
}
