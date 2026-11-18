<?php
/**
 * Standalone runner for the site-styles emails feature (Spec 04, FR-04-EMAIL-STYLES and FR-04-EMAIL-INTRO).
 *
 * Exercises the REAL `Sgs_Email_Site_Tokens`, `Sgs_Email_Site_Styles`, `Sgs_Email_Introduction` and
 * `Gift_Card_Emails` classes against fake WordPress functions. Covers:
 *   - the token reader: var() and `var:preset|x|y` resolution (nested, with fallbacks), colour roles as
 *     colour presets, rem to px, clamp(), the contrast fallback, the generated fallback line colour, the
 *     per-site overrides, rejected values (injection, bad colours, bad lengths, bad fonts, bad files),
 *     the font stack ending in a web-safe family;
 *   - the switch: off leaves WooCommerce's CSS untouched apart from the gift card code rule; on appends
 *     the site's rules; the setting is added beside the template colours;
 *   - the introduction: filled, empty, no wrapper, placeholders (escaped), a button kept, the style reused;
 *   - the gift card email prints the code once in HTML and once in the plain-text alternative.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-email-site-styles-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace SGS\Blocks\Mail {
	// Stand-in mailer: records what the gift card emails hand over.
	if ( ! class_exists( __NAMESPACE__ . '\Sgs_Mailer', false ) ) {
		final class Sgs_Mailer {
			public static array $sent = array();
			public static function send( string $to, string $subject, string $heading, string $html, string $plain = '' ): bool {
				self::$sent[] = compact( 'to', 'subject', 'heading', 'html', 'plain' );
				return true;
			}
		}
	}
}

namespace {

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

$GLOBALS['sgs_test_options'] = array();
$GLOBALS['sgs_test_filters'] = array();

function get_option( $key, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $key ] ?? $default;
}
function add_filter( $hook, $callback, $priority = 10, $args = 1 ) {
	$GLOBALS['sgs_test_filters'][ $hook ][] = $callback;
}
function add_action( $hook, $callback, $priority = 10, $args = 1 ) {
	add_filter( $hook, $callback, $priority, $args );
}
function apply_filters( $hook, $value ) {
	return $value;
}
function __( $text, $domain = '' ) {
	return $text;
}
function esc_html( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES );
}
function wp_kses_post( $text ) {
	return strip_tags( (string) $text, '<br><strong><em><b><i><a>' );
}
function get_bloginfo( $show = '' ) {
	return 'Test Bakery';
}
function wp_date( $format, $ts = null ) {
	return '1 January 2030';
}

require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-email-site-tokens.php';
require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-email-site-styles.php';
require dirname( __DIR__, 2 ) . '/includes/mail/class-sgs-email-introduction.php';
require dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-money.php';
require dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-emails.php';

use SGS\Blocks\Gift_Card\Gift_Card_Emails;
use SGS\Blocks\Mail\Sgs_Email_Introduction;
use SGS\Blocks\Mail\Sgs_Email_Site_Styles;
use SGS\Blocks\Mail\Sgs_Email_Site_Tokens as T;
use SGS\Blocks\Mail\Sgs_Mailer;

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

// -- Fixture: a small site (bakery colours), every value behind a variable --------------------------------------

$vars = array(
	'--wp--preset--color--cocoa'      => '#3A2A22',
	'--wp--preset--color--paper'      => '#FFFAF0',
	'--wp--preset--color--cream'      => '#FBF3DC',
	'--wp--preset--color--yellow'     => '#F9CF6E',
	'--wp--preset--color--pale'       => '#EADBC0',
	'--wp--preset--color--muted'      => '#5E4A3D',
	'--wp--preset--color--lightgrey'  => '#CCCCCC',
	'--wp--preset--color--pinkdark'   => '#A8404F',
	'--wp--preset--font-family--body' => 'Karla, system-ui, sans-serif',
	'--wp--preset--font-family--head' => '"Young Serif", Georgia, serif',
	'--wp--preset--font-size--reg'    => 'clamp(0.9rem, 1vw + 0.5rem, 1.0625rem)',
	'--wp--custom--shadow-colour'     => 'var(--wp--preset--color--cocoa)',
);
$settings = array(
	'custom'     => array(
		'colourRoles'   => array(
			'primary'      => 'yellow',
			'primary-text' => 'cocoa',
			'surface'      => 'cream',
			'surface-alt'  => 'paper',
			'text'         => 'cocoa',
			'text-muted'   => 'muted',
			'border'       => 'cocoa',
			'border-light' => 'pale',
			'heading'      => 'cocoa',
			'link'         => 'pinkdark',
		),
		'borderRadius'  => array( 'small' => '4px', 'medium' => '20px' ),
		'buttonPresets' => array(
			'primary' => array(
				'background'    => 'var(--wp--preset--color--primary)',
				'text'          => 'var(--wp--preset--color--primary-text)',
				'border'        => 'var(--wp--preset--color--border)',
				'border-width'  => '2px',
				'border-radius' => '999px',
				'padding'       => '0px 30px 0px 30px',
				'font-size'     => '17px',
				'font-weight'   => '700',
				'min-height'    => '48px',
				'shadow'        => '4px 4px 0 var(--wp--custom--shadow-colour)',
			),
		),
	),
	'typography' => array(
		'fontFamilies' => array(
			'theme' => array(
				array(
					'slug'       => 'body',
					'fontFamily' => 'Karla, system-ui, sans-serif',
					'fontFace'   => array( array( 'fontFamily' => 'Karla', 'fontWeight' => '400 700', 'fontStyle' => 'normal', 'src' => array( 'file:./assets/fonts/karla/karla.woff2' ) ) ),
				),
				array(
					'slug'       => 'head',
					'fontFamily' => '"Young Serif", Georgia, serif',
					'fontFace'   => array(
						array( 'fontFamily' => 'Young Serif', 'fontWeight' => '400', 'fontStyle' => 'normal', 'src' => array( 'file:./assets/fonts/ys/ys.woff2' ) ),
						array( 'fontFamily' => 'Young Serif', 'fontWeight' => '400', 'fontStyle' => 'normal', 'src' => array( 'file:./../evil.woff2' ) ),
					),
				),
				array(
					'slug'       => 'other',
					'fontFamily' => 'Other, serif',
					'fontFace'   => array( array( 'fontFamily' => 'Other', 'src' => array( 'file:./assets/other.woff2' ) ) ),
				),
			),
		),
	),
);
$styles = array(
	'color'      => array( 'background' => 'var:preset|color|surface', 'text' => 'var:preset|color|text' ),
	'typography' => array( 'fontFamily' => 'var:preset|font-family|body' ),
	'elements'   => array(
		'heading' => array(
			'typography' => array( 'fontFamily' => 'var:preset|font-family|head', 'fontWeight' => '400', 'lineHeight' => '1.05' ),
			'color'      => array( 'text' => 'var:preset|color|heading' ),
		),
	),
);
$theme_uri = 'https://shop.test/wp-content/themes/sgs-theme';

$t = T::from_sources( $settings, $styles, $vars, $theme_uri );

// -- Token reader ------------------------------------------------------------------------------------------------

ok( '#fbf3dc' === $t['outer_bg'], 'outer background: styles.color.background, a var:preset reference to a colour role, resolved through the role to its palette colour' );
ok( '#fffaf0' === $t['card_bg'], 'card background: the surface-alt role' );
ok( '#3a2a22' === $t['text'], 'text colour resolved' );
ok( '#3a2a22' === $t['heading'], 'heading colour from the heading element' );
ok( '#a8404f' === $t['link'], 'link colour: the link role, readable on the card (>= 4.5:1)' );
ok( '#5e4a3d' === $t['muted'], 'muted colour: the text-muted role, readable on the card' );
ok( '#eadbc0' === $t['line'], 'line colour: the border-light role' );
ok( '20px' === $t['card_radius'], 'card radius defaults to the medium radius' );
ok( '4px' === $t['image_radius'], 'image radius defaults to the small radius' );
ok( 'solid' === $t['line_style'] && '1px' === $t['card_border_width'], 'line style and card border width defaults' );
ok( 'Karla, Helvetica, Arial, sans-serif' === $t['body_font'], 'body font: system-ui dropped, web-safe fallbacks added' );
ok( '"Young Serif", Georgia, serif' === $t['heading_font'], 'heading font keeps its quoted name and ends in serif' );
ok( '400' === $t['heading_weight'] && '1.05' === $t['heading_line_height'], 'heading weight and line height' );
$b = $t['button'];
ok( '#f9cf6e' === $b['bg'] && '#3a2a22' === $b['text'], 'button colours resolved through role presets' );
ok( '2px' === $b['border_width'] && '#3a2a22' === $b['border_colour'] && '999px' === $b['radius'], 'button border and radius' );
ok( '4px 4px 0px #3a2a22' === $b['shadow'], 'button shadow resolved through a nested var() and normalised' );
ok( 17 === (int) $b['font_size'] && '700' === $b['weight'] && 30 === $b['pad_h'], 'button font size, weight and horizontal padding' );
ok( 48 <= $b['pad_v'] * 2 + $b['line_height'] + 2 * 2, 'button min-height became vertical padding around a set line height' );
ok( 2 === count( $t['faces'] ), 'font faces: body and heading only, and the file outside the theme (..) refused' );
ok( 'https://shop.test/wp-content/themes/sgs-theme/assets/fonts/ys/ys.woff2' === $t['faces'][1]['src'], 'font file URL built from the theme URL' );

ok( 17.0 === (float) rtrim( (string) T::length( 'var(--wp--preset--font-size--reg)', $vars ), 'px' ), 'clamp() takes its maximum and rem becomes px at 16' );
ok( '#112233' === T::colour( 'rgb(17, 34, 51)', array() ), 'rgb() colour becomes hex' );
ok( '#aabbcc' === T::colour( '#ABC', array() ), 'short hex expands' );
ok( '#abcdef' === T::colour( 'var(--x, #ABCDEF)', array() ), 'var() fallback used when the property is absent' );
ok( null === T::colour( 'var(--missing)', array() ), 'an unresolvable reference is null' );
ok( '#112233' === T::colour( 'var(--a)', array( '--a' => 'var(--b)', '--b' => '#112233' ) ), 'nested var() followed' );

// Rejected values.
foreach ( array( 'red', 'url(x)', '#12345', 'expression(alert(1))', '#fff;}body{display:none', 'rgba(0,0,0,0.5)' ) as $bad ) {
	ok( null === T::colour( $bad, array() ), "colour rejected: {$bad}" );
}
foreach ( array( '1em', '10px;color:red', 'calc(1px + 2px)', '99999px', '-3px' ) as $bad ) {
	ok( null === T::length( $bad, array() ), "length rejected: {$bad}" );
}
ok( null === T::weight( '900;x', array() ) && null === T::weight( 'heavy', array() ), 'weight rejected' );
ok( null === T::line_height( '1.5;margin:0', array() ), 'line height rejected' );
$stack = T::font_stack( 'Evil;}body{x:y, "Pretty Face", cursive', array() );
ok( null !== $stack && false === strpbrk( $stack, ';{}()<>' ), 'font stack: unsafe characters stripped (' . $stack . ')' );
ok( str_ends_with( (string) T::font_stack( 'Oswald', array() ), 'sans-serif' ), 'a stack with no generic gets one' );
ok( str_ends_with( (string) T::font_stack( 'Merriweather Serif', array() ), 'serif' ), 'a serif family gets the serif generic' );

// The contrast fallback: a light-grey muted, link and heading colour fall back to the text colour.
$low                                                      = $settings;
$low['custom']['colourRoles']['text-muted']               = 'lightgrey';
$low['custom']['colourRoles']['link']                     = 'lightgrey';
$low['custom']['colourRoles']['heading']                  = 'lightgrey';
$tl = T::from_sources( $low, $styles, $vars, $theme_uri );
ok( '#3a2a22' === $tl['muted'] && '#3a2a22' === $tl['link'] && '#3a2a22' === $tl['heading'], 'contrast fallback: colours under 4.5:1 on the card fall back to the text colour' );
ok( T::contrast_ratio( '#3a2a22', '#fffaf0' ) >= 4.5 && T::contrast_ratio( '#cccccc', '#fffaf0' ) < 4.5, 'contrast ratio measured' );

// The generated line colour when the site has no border-light role.
$noline = $settings;
unset( $noline['custom']['colourRoles']['border-light'] );
$tn = T::from_sources( $noline, $styles, $vars, $theme_uri );
ok( $tn['line'] === T::mix( '#3a2a22', '#fffaf0', 0.2 ) && 1 === preg_match( '/^#[0-9a-f]{6}$/', $tn['line'] ), 'line colour falls back to the text colour at 20% mixed onto the card, as a literal hex' );

// Missing sources fall back to nothing (WooCommerce's own value stays).
$te = T::from_sources( array(), array(), array(), '' );
ok( ! isset( $te['button'], $te['text'], $te['card_bg'], $te['body_font'] ), 'no tokens: nothing resolved, so every WooCommerce value stays' );
$css_empty = Sgs_Email_Site_Styles::build_css( $te );
ok( false === strpos( $css_empty, 'background-color' ) && false === strpos( $css_empty, 'font-family' ), 'empty tokens emit no colour or font rule' );

// Button falls back to the site's button element when there is no preset.
$el = $settings;
unset( $el['custom']['buttonPresets'] );
$tb = T::from_sources( $el, array_merge( $styles, array( 'elements' => array( 'button' => array( 'color' => array( 'background' => '#112233', 'text' => '#ffffff' ), 'border' => array( 'radius' => '8px' ), 'typography' => array( 'fontWeight' => '600' ) ) ) ) ), $vars, $theme_uri );
ok( '#112233' === $tb['button']['bg'] && '8px' === $tb['button']['radius'] && '600' === $tb['button']['weight'], 'button falls back to styles.elements.button' );
ok( ! isset( $tb['button']['shadow'], $tb['button']['border_colour'] ), 'no shadow or border when the tokens have none' );

// Overrides under settings.custom.email, each validated.
$ov                             = $settings;
$ov['custom']['email']          = array(
	'outerBackground' => '#112233',
	'cardBackground'  => '#ffffff',
	'cardRadius'      => '0px',
	'cardBorderWidth' => '3px',
	'cardBorderColour' => '#222222',
	'cardBorderStyle' => 'solid',
	'lineColour'      => '#ff0000',
	'lineStyle'       => 'dashed',
	'imageRadius'     => '999px',
	'headingAlign'    => 'center',
	'panelBackground' => '#fff3c4',
);
$to = T::from_sources( $ov, $styles, $vars, $theme_uri );
ok( '#112233' === $to['outer_bg'] && '#ffffff' === $to['card_bg'] && '0' === $to['card_radius'] && '3px' === $to['card_border_width'], 'overrides: outer, card, radius, border width' );
ok( '#ff0000' === $to['line'] && 'dashed' === $to['line_style'] && '999px' === $to['image_radius'] && 'center' === $to['heading_align'] && '#fff3c4' === $to['panel_bg'], 'overrides: line colour and style, image radius, heading align, panel' );
ok( '#222222' === ( $to['card_border_colour'] ?? '' ) && 'solid' === ( $to['card_border_style'] ?? '' ) && ! isset( $t['card_border_colour'], $t['card_border_style'] ), 'overrides: the card edge takes its own colour and style, and has none by default' );
$ov['custom']['email'] = array( 'cardBorderColour' => 'red;', 'cardBorderStyle' => 'double', 'lineStyle' => 'dotted;x', 'headingAlign' => 'right', 'cardRadius' => 'huge', 'panelBackground' => 'url(x)', 'lineColour' => 'nope' );
$tx                    = T::from_sources( $ov, $styles, $vars, $theme_uri );
ok( 'solid' === $tx['line_style'] && ! isset( $tx['heading_align'], $tx['panel_bg'], $tx['card_border_colour'], $tx['card_border_style'] ) && '20px' === $tx['card_radius'] && '#eadbc0' === $tx['line'], 'bad overrides are ignored and the defaults stand' );

// The button's fill alone: the preset keeps its shape, border, shadow and (when readable) its text colour.
$fill                           = $settings;
$fill['custom']['email']        = array( 'buttonBackground' => '#EE8088' );
$tf                             = T::from_sources( $fill, $styles, $vars, $theme_uri );
ok( '#ee8088' === $tf['button']['bg'] && '#3a2a22' === $tf['button']['text'] && T::contrast_ratio( $tf['button']['text'], $tf['button']['bg'] ) >= 4.5, 'button fill override: the fill changes and the preset text colour stays, readable at 4.5:1' );
ok( $tf['button']['radius'] === $b['radius'] && $tf['button']['shadow'] === $b['shadow'] && $tf['button']['border_colour'] === $b['border_colour'] && $tf['button']['pad_v'] === $b['pad_v'], 'button fill override: shape, border and shadow stay the preset\'s' );
$fill['custom']['email']        = array( 'buttonBackground' => '#3A2A22' );
$td                             = T::from_sources( $fill, $styles, $vars, $theme_uri );
ok( '#3a2a22' === $td['button']['bg'] && '#ffffff' === $td['button']['text'], 'button fill override: text the fill makes unreadable becomes white or dark' );
$fill['custom']['email']        = array( 'buttonBackground' => 'pink;}' );
ok( '#f9cf6e' === T::from_sources( $fill, $styles, $vars, $theme_uri )['button']['bg'], 'button fill override: a bad value is ignored and the preset fill stands' );
$nofill                         = $el;
$nofill['custom']['email']      = array( 'buttonBackground' => '#EE8088' );
ok( '#ee8088' === ( T::from_sources( $nofill, array(), $vars, $theme_uri )['button']['bg'] ?? '' ), 'button fill override: gives a site with no preset or button element a button colour' );

// -- The switch --------------------------------------------------------------------------------------------------

Sgs_Email_Site_Styles::register();
ok( isset( $GLOBALS['sgs_test_filters']['woocommerce_email_styles'] ) && isset( $GLOBALS['sgs_test_filters']['woocommerce_email_settings'] ), 'registers the styles and settings filters' );

$woo = "body { color: red; }\nh1 { color: #333; }\n";
$GLOBALS['sgs_test_options'] = array();
$off                         = Sgs_Email_Site_Styles::filter_styles( $woo );
ok( str_starts_with( $off, $woo ) && $off === $woo . Sgs_Email_Site_Styles::gift_code_rule( Sgs_Email_Site_Styles::NEUTRAL_LINE, 'dashed' ), 'switch off: WooCommerce CSS untouched; only the gift card code rule is added (neutral colour)' );
ok( false === strpos( $off, 'font-face' ) && false === strpos( $off, '#template' ), 'switch off: no site rule at all' );
ok( false === Sgs_Email_Site_Styles::enabled(), 'the switch defaults to off' );

$GLOBALS['sgs_test_options']['sgs_email_site_styles'] = 'no';
ok( Sgs_Email_Site_Styles::filter_styles( $woo ) === $off, 'switch "no": same as off' );

$css = Sgs_Email_Site_Styles::build_css( $t );
ok( str_contains( $css, '@font-face' ) && str_contains( $css, 'font-family: "Young Serif"' ), 'on: @font-face rules for the body and heading families' );
ok( str_contains( $css, 'a.sgs-email-button' ) && str_contains( $css, 'box-shadow: 4px 4px 0px #3a2a22 !important' ) && str_contains( $css, 'border-radius: 999px !important' ), 'on: the button rule carries radius, border and shadow with !important' );
ok( ! str_contains( $css, ' hr' ) && str_contains( $css, 'border-bottom: 1px solid #eadbc0' ), 'on: one line colour and style; no rule hides a divider someone else wrote' );
ok( str_contains( $css, 'background-color: #fffaf0' ) && str_contains( $css, 'border: 1px solid #eadbc0' ) && str_contains( $css, 'border-radius: 20px' ), 'on: card background, border and radius' );
ok( str_contains( $css, 'font-size: 13px' ), 'on: footer text at 13px or more' );
ok( false === strpos( $css, '#fff3c4' ), 'no panel tint when the site sets none' );
ok( str_contains( Sgs_Email_Site_Styles::build_css( $to ), 'background-color: #fff3c4' ) && str_contains( Sgs_Email_Site_Styles::build_css( $to ), 'dashed #ff0000' ), 'overrides reach the CSS (panel tint, dashed line)' );
ok( 0 === preg_match( '/[<>]|expression|javascript:/i', $css ), 'the generated CSS holds no markup or script' );

$GLOBALS['sgs_test_options']['sgs_email_site_styles'] = 'yes';
ok( true === Sgs_Email_Site_Styles::enabled(), 'switch "yes" is on' );

$settings_in  = array( array( 'type' => 'title', 'id' => 'email_template_options' ), array( 'type' => 'color', 'id' => 'woocommerce_email_text_color' ), array( 'type' => 'sectionend', 'id' => 'email_template_options' ), array( 'type' => 'sectionend', 'id' => 'other' ) );
$settings_out = Sgs_Email_Site_Styles::add_setting( $settings_in );
ok( 5 === count( $settings_out ) && 'sgs_email_site_styles' === $settings_out[2]['id'] && 'checkbox' === $settings_out[2]['type'] && 'no' === $settings_out[2]['default'], 'the checkbox is added inside the email template section, default no' );
ok( $settings_in === array_values( array_filter( $settings_out, static fn( $s ) => 'sgs_email_site_styles' !== ( $s['id'] ?? '' ) ) ), 'the other settings are unchanged' );
ok( Sgs_Email_Site_Styles::add_setting( array( array( 'type' => 'title', 'id' => 'x' ) ) ) === array( array( 'type' => 'title', 'id' => 'x' ) ), 'no email template section: settings unchanged' );
ok( null === Sgs_Email_Site_Styles::add_setting( null ) && false === Sgs_Email_Site_Styles::filter_styles( false ), 'a value of the wrong type from another plugin is handed back, with no type error' );
ok( isset( $GLOBALS['sgs_test_filters']['woocommerce_email_body_display_section_divider'] ) && false === Sgs_Email_Site_Styles::hide_section_divider( true ), 'on: WooCommerce prints no section divider of its own' );
$GLOBALS['sgs_test_options']['sgs_email_site_styles'] = 'no';
ok( true === Sgs_Email_Site_Styles::hide_section_divider( true ), 'off: the section dividers stay' );
$GLOBALS['sgs_test_options']['sgs_email_site_styles'] = 'yes';

// -- The introduction --------------------------------------------------------------------------------------------

$page = '<div id="body_content_inner"><div class="email-introduction" style="padding-bottom: 24px;">'
	. "\n<p style=\"margin: 0 0 16px;\">Hi Aisha,</p>\n<p style=\"margin: 0 0 16px;\">Just to let you know.</p>\n</div><h2>Order summary</h2></div>";
$ph   = array( 'customer_first_name' => 'Aisha <b>', 'order_number' => '1042', 'site_title' => "Mama's" );

$out = Sgs_Email_Introduction::apply( $page, "Hi {customer_first_name}, thanks.\n\nOrder {order_number} at {site_title}.", $ph );
ok( str_contains( $out, '<div class="email-introduction" style="padding-bottom: 24px;">' ), 'introduction: the wrapper and its style stay' );
ok( 2 === substr_count( $out, '<p style="margin: 0 0 16px;">' ) && ! str_contains( $out, 'Just to let you know' ), 'introduction: replaces the sentences, two paragraphs, the inliner style reused' );
ok( str_contains( $out, 'Order 1042 at Mama&#039;s.' ) && str_contains( $out, 'Hi Aisha &lt;b&gt;, thanks.' ), 'introduction: placeholders filled and escaped' );
ok( str_contains( $out, '<h2>Order summary</h2>' ), 'introduction: nothing outside the wrapper changes' );
ok( str_contains( Sgs_Email_Introduction::apply( $page, "Line one\nLine two", $ph ), 'Line one<br />' . "\n" . 'Line two' ), 'introduction: a single newline is a line break' );
ok( str_contains( Sgs_Email_Introduction::apply( $page, '<script>alert(1)</script><strong>Hi</strong>', $ph ), '<strong>Hi</strong>' ) && ! str_contains( Sgs_Email_Introduction::apply( $page, '<script>alert(1)</script>x', $ph ), '<script>' ), 'introduction: markup passes the kses filter' );
$plain_page = '<div id="body_content_inner"><p>Hi</p></div>';
ok( Sgs_Email_Introduction::apply( $plain_page, 'New words', $ph ) === $plain_page, 'introduction: no wrapper present leaves the email unchanged' );
ok( Sgs_Email_Introduction::apply( $page, "   \n\n  ", $ph ) === $page, 'introduction: only blank lines leaves the email unchanged' );
$classed_page = str_replace( 'class="email-introduction"', 'class="first email-introduction wide"', $page );
ok( str_contains( Sgs_Email_Introduction::apply( $classed_page, 'New words', $ph ), 'New words' ), 'introduction: the wrapper is found when it carries other classes' );
ok( Sgs_Email_Introduction::apply( str_replace( 'class="email-introduction"', 'class="email-introduction-note"', $page ), 'New words', $ph ) === str_replace( 'class="email-introduction"', 'class="email-introduction-note"', $page ), 'introduction: a longer class name is not the wrapper' );
$button_page = '<div class="email-introduction" style="padding-bottom: 24px;"><p style="margin: 0 0 16px;">Hi</p><p style="margin: 24px 0;"><a class="sgs-email-button" href="u" style="display: inline-block; padding: 16px 32px;">Confirm</a></p><p style="margin: 0 0 16px;">Ignore this.</p></div>';
$bo          = Sgs_Email_Introduction::apply( $button_page, 'Welcome', $ph );
ok( str_contains( $bo, 'Confirm</a>' ) && str_contains( $bo, 'Welcome' ) && ! str_contains( $bo, 'Ignore this' ) && strpos( $bo, 'Welcome' ) < strpos( $bo, 'Confirm' ), 'introduction: a button inside the wrapper is kept, after the new words' );

// replace_introduction(): reads the email's own setting; empty means WooCommerce's wording.
$order = new class() {
	public function get_billing_first_name() { return 'Aisha'; }
	public function get_order_number() { return '77'; }
};
$mail = new class( $order ) {
	public $object;
	public $settings = array();
	public function __construct( $o ) { $this->object = $o; }
	public function get_option( $k, $d = '' ) { return $this->settings[ $k ] ?? $d; }
};
Sgs_Email_Introduction::remember_email( 'h', $mail );
ok( Sgs_Email_Introduction::replace_introduction( $page ) === $page, 'empty Introduction: the email is unchanged' );
$mail->settings['sgs_introduction'] = 'Hi {customer_first_name}, order {order_number}.';
Sgs_Email_Introduction::remember_email( 'h', $mail );
$done = Sgs_Email_Introduction::replace_introduction( $page );
ok( str_contains( $done, 'Hi Aisha, order 77.' ), 'filled Introduction: placeholders come from the email\'s order' );
ok( Sgs_Email_Introduction::replace_introduction( $page ) === $page, 'the current email is reset after one use, so the next email is untouched' );

// The field.
$fields = Sgs_Email_Introduction::add_field( array( 'subject' => array(), 'email_type' => array() ) );
ok( array( 'subject', 'sgs_introduction', 'email_type' ) === array_keys( $fields ) && 'textarea' === $fields['sgs_introduction']['type'] && '' === $fields['sgs_introduction']['default'], 'the Introduction field: a textarea, empty by default, before the email type' );
ok( $fields === Sgs_Email_Introduction::add_field( $fields ), 'the field is added once' );

// -- Gift card: the code appears once ----------------------------------------------------------------------------

$card = array(
	'recipient_name'  => 'Maryam',
	'recipient_email' => 'maryam@example.com',
	'purchaser_email' => 'aisha@example.com',
	'sender_name'     => 'Aisha',
	'message'         => '',
	'initial_pence'   => 2500,
	'expires_at'      => '',
	'code_last4'      => 'K7QP',
);
$code = 'MAMA-4F2H-9XTD-K7QP';
Sgs_Mailer::$sent = array();
Gift_Card_Emails::send_recipient_delivery( $card, $code );
Gift_Card_Emails::send_reissue( $card, $code );
foreach ( Sgs_Mailer::$sent as $i => $mail_sent ) {
	$what = 0 === $i ? 'delivery' : 'reissue';
	ok( 1 === substr_count( $mail_sent['html'], $code ), "gift card {$what}: the code is in the HTML once" );
	ok( 1 === substr_count( $mail_sent['plain'], $code ), "gift card {$what}: the plain-text alternative carries the code once" );
	ok( str_contains( $mail_sent['html'], '<p class="sgs-gift-card-email__code"><strong>' . $code . '</strong></p>' ), "gift card {$what}: the bold block stays" );
	ok( 1 === preg_match( '#code:</p><p class="sgs-gift-card-email__code">#', $mail_sent['html'] ), "gift card {$what}: the line is the label and the block follows it" );
	ok( ! str_contains( $mail_sent['html'], "\0" ) && ! str_contains( $mail_sent['plain'], "\0" ), "gift card {$what}: no placeholder leaks" );
}

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );
}
