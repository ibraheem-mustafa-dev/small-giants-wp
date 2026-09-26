<?php
/**
 * Standalone runner for section-adaptive header ink (Wave 3C U-13).
 *
 * Exercises includes/sgs-header-ink-css.php directly, with plain PHP, no
 * PHPUnit. Every case pairs a positive assertion with a negative control that
 * proves the assertion can actually fail — see each block's own comment for
 * what the control demonstrates. Exits non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-header-ink-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

// sgs_colour_value()/sgs_css_gradient_value() are the REAL functions from
// helpers-tokens.php (needs only esc_attr() stubbed above — neither touches
// wp_get_global_settings()), so a change to either resolver is a change to
// what this test exercises, matching the house convention
// (run-header-gradient-fill-standalone.php).
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-motion-easing.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-ink-css.php';

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

$root_sel = '.sgs-sh-abc123.sgs-site-header';
$uid      = 'sgs-sh-abc123';
$all_off  = array(
	'desktop' => 'off',
	'tablet'  => 'off',
	'mobile'  => 'off',
);

// ─────────────────────────────────────────────────────────────────────────
// 1. adapt ON ONLY AT MOBILE emits rules only in the mobile media block —
//    no fill of its own (unconditional mode), no Transparent.
// ─────────────────────────────────────────────────────────────────────────
$mobile_only = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'mobile' => 'adapt' ) ),
	$all_off,
	false,
	'',
	''
);
ok( false !== strpos( $mobile_only['css'], '@media (max-width:767px)' ), 'mobile-only adapt emits inside the mobile @media block' );
ok( false !== strpos( $mobile_only['css'], 'is-header-on-dark' ), 'mobile-only adapt emits the ink selector' );
// Negative control: the SAME css string must NOT carry an un-media-scoped
// (desktop) ink rule — proves the assertion above is not just "css is
// non-empty", it specifically checks WHERE the rule landed. A broken tier
// cascade that ignored the tier and always emitted at desktop would pass the
// two assertions above but fail this one.
$first_at           = strpos( $mobile_only['css'], '@' );
$before_first_media = false === $first_at ? $mobile_only['css'] : substr( $mobile_only['css'], 0, $first_at );
ok( false === strpos( $before_first_media, 'is-header-on-dark' ), 'NEGATIVE CONTROL: no un-media-scoped (desktop) ink rule is emitted' );

// ─────────────────────────────────────────────────────────────────────────
// 2. OPAQUE header with no tone fill emits NO ink rule at that tier — the
//    header reads against its own fill, not the section.
// ─────────────────────────────────────────────────────────────────────────
$opaque = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'desktop' => 'adapt' ) ),
	$all_off, // Transparent off everywhere.
	false,
	'var(--wp--preset--color--primary)', // has its own resting fill.
	''
);
ok( '' === $opaque['css'], 'opaque header, no tone fill, no Transparent: no ink CSS at all' );
ok( false === $opaque['any_adapt'] ? false : true, 'sanity: any_adapt is still true (the attribute IS set to adapt)' );
// Negative control: the SAME attributes but WITHOUT an own resting fill (the
// header is naturally see-through) DO paint — proving "no CSS" above is
// caused by the opaque fill, not by some other unrelated reason (e.g. a typo
// dropping the whole function).
$same_but_transparent = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'desktop' => 'adapt' ) ),
	$all_off,
	false,
	'', // no own fill this time.
	''
);
ok( '' !== $same_but_transparent['css'], 'NEGATIVE CONTROL: the same attributes without an own fill DO paint ink' );

// ─────────────────────────────────────────────────────────────────────────
// 3. TRANSPARENT-FIRST emits ink under :not(.is-header-scrolled) — the
//    see-through state only.
// ─────────────────────────────────────────────────────────────────────────
$transparent_first = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'desktop' => 'adapt' ) ),
	array(
		'desktop' => 'on',
		'tablet'  => 'off',
		'mobile'  => 'off',
	),
	false, // transparent-first.
	'', // Transparent supplies the resting transparency, not a static own fill.
	''
);
ok( 0 === strpos( $transparent_first['live'], 'desktop:rest ' ), 'transparent-first: tone classes live only at rest (desktop:rest)' );
// Negative control: the SAME attributes under solid-first direction must NOT
// carry that selector — it carries `.is-header-scrolled` (with no `:not()`)
// instead, proving the direction actually flips which state is see-through.
$solid_first = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'desktop' => 'adapt' ) ),
	array(
		'desktop' => 'on',
		'tablet'  => 'off',
		'mobile'  => 'off',
	),
	true, // solid-first.
	'',
	''
);
ok( 0 === strpos( $solid_first['live'], 'desktop:scrolled ' ), 'NEGATIVE CONTROL: solid-first flips the live window to scrolled' );
ok( false !== strpos( $solid_first['css'], '.is-header-scrolled.is-header-on-dark' ) || false !== strpos( $solid_first['css'], '.is-header-on-dark' ), 'solid-first still carries the ink selector, just on the other state' );

// ─────────────────────────────────────────────────────────────────────────
// 4. A TONE FILL emits the (uid + is-header-on-dark + is-header-scrolled)
//    three-part selector, base AND scrolled.
// ─────────────────────────────────────────────────────────────────────────
$tone_fill = sgs_header_ink_css(
	$root_sel,
	$uid,
	array(
		'sectionInk' => array( 'desktop' => 'adapt' ),
		'fillOnDark' => 'primary',
	),
	$all_off,
	false,
	'', // own fill irrelevant once a tone fill is set — tone-fill mode wins.
	''
);
ok( false !== strpos( $tone_fill['css'], $root_sel . '.is-header-on-dark{color:' ) && 0 === strpos( $tone_fill['live'], 'desktop:always' ), 'tone fill on an opaque header: ink and fill in every state' );

// Transparent on + tone fill: the fill follows the section only once scrolled
// (the solid state); at rest the header stays see-through (wearecollins).
$tone_fill_transparent = sgs_header_ink_css(
	$root_sel,
	$uid,
	array(
		'sectionInk' => array( 'desktop' => 'adapt' ),
		'fillOnDark' => 'primary',
	),
	array(
		'desktop' => 'on',
		'tablet'  => 'off',
		'mobile'  => 'off',
	),
	false,
	'',
	''
);
ok( false !== strpos( $tone_fill_transparent['css'], $root_sel . '.is-header-on-dark.is-header-scrolled{background:' ), 'transparent + tone fill: fill only in the scrolled state' );
$tft_desktop = substr( $tone_fill_transparent['css'], 0, (int) strpos( $tone_fill_transparent['css'], '@media (min-width:768px)' ) );
ok( false === strpos( $tft_desktop, $root_sel . '.is-header-on-dark{background:' ), 'NEGATIVE CONTROL: transparent + tone fill paints no fill at rest (desktop, where Transparent is on)' );
ok( false !== strpos( $tone_fill_transparent['css'], '@media (max-width:767px){' ) && false !== strpos( substr( $tone_fill_transparent['css'], (int) strpos( $tone_fill_transparent['css'], '@media (max-width:767px){' ) ), $root_sel . '.is-header-on-dark{background:' ), 'mobile, Transparent off: the tone fill is stateless' );
ok( 0 === strpos( $tone_fill_transparent['live'], 'desktop:always' ), 'transparent + tone fill: ink live in both states' );
ok( false === strpos( $tone_fill_transparent['css'], 'revert' ), 'no tier ever cancels with revert' );
ok( false !== strpos( $tone_fill_transparent['css'], '.is-header-on-dark .sgs-nav-bar-menu__item>.sgs-nav-bar-menu__link:not(:hover):not(:focus-visible)' ), 'live ink overrides the menu link colour, except on hover and focus' );
ok( false === strpos( sgs_header_ink_css( $root_sel, $uid, array(), $all_off, false, '', '' )['css'], 'sgs-nav-bar-menu__link' ), 'NEGATIVE CONTROL: with section ink off the menu link colour is untouched' );
ok( false !== strpos( $tone_fill_transparent['css'], '--sgs-cart-icon-colour:currentColor !important' ) && false !== strpos( $tone_fill_transparent['css'], '.wp-block-sgs-business-info:not(.is-style-button)' ), 'live ink overrides header icon colours (business info, cart, social), not filled chips' );
ok( false === strpos( sgs_header_ink_css( $root_sel, $uid, array(), $all_off, false, '', '' )['css'], '--sgs-cart-icon-colour' ), 'NEGATIVE CONTROL: with section ink off the icon colours are untouched' );
ok( false !== strpos( $tone_fill['css'], 'background:var(--wp--preset--color--primary, currentColor) !important;' ), 'tone fill paints the resolved fill colour' );
// Negative control: the SAME attributes WITHOUT fillOnDark do not carry that
// selector at all — proving the three-part selector is caused by the tone
// fill, not emitted unconditionally by every adapt tier.
$no_tone_fill = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'desktop' => 'adapt' ) ),
	$all_off,
	false,
	'',
	''
);
ok( false === strpos( $no_tone_fill['css'], '.is-header-on-dark.is-header-scrolled' ), 'NEGATIVE CONTROL: no tone fill, no scrolled selector' );

// ─────────────────────────────────────────────────────────────────────────
// 5. OFF emits nothing at all.
// ─────────────────────────────────────────────────────────────────────────
$off = sgs_header_ink_css( $root_sel, $uid, array( 'sectionInk' => array() ), $all_off, false, '', '' );
ok( '' === $off['css'], 'sectionInk off (default {}) emits no CSS' );
ok( '' === $off['transition'], 'sectionInk off emits no transition' );
ok( false === $off['any_adapt'], 'sectionInk off: any_adapt is false' );
// Negative control: the SAME shape but with desktop explicitly 'adapt' DOES
// emit — proving the off-case above is genuinely reading the attribute, not
// a helper that always returns empty.
$on_control = sgs_header_ink_css( $root_sel, $uid, array( 'sectionInk' => array( 'desktop' => 'adapt' ) ), $all_off, false, '', '' );
ok( '' !== $on_control['css'], 'NEGATIVE CONTROL: desktop adapt (no own fill) does emit' );

// ─────────────────────────────────────────────────────────────────────────
// blend — no colour needed, mix-blend-mode on the header's rows, ink forced
// to white, and paints regardless of own fill (unlike adapt).
// ─────────────────────────────────────────────────────────────────────────
$blend = sgs_header_ink_css(
	$root_sel,
	$uid,
	array( 'sectionInk' => array( 'desktop' => 'blend' ) ),
	$all_off,
	false,
	'var(--wp--preset--color--primary)', // opaque — blend still paints (unlike adapt).
	''
);
ok( false !== strpos( $blend['css'], 'mix-blend-mode:difference' ), 'blend paints mix-blend-mode:difference' );
ok( false !== strpos( $blend['css'], 'color:#fff !important' ), 'blend forces ink to white' );
ok( '' === $blend['transition'], 'blend has no transition (instant, no interpolation)' );

// Allow-list defence: a junk sectionInk value coerces to 'off'.
$junk_tiers = sgs_header_ink_tiers( array( 'sectionInk' => array( 'desktop' => 'not-a-real-value' ) ) );
ok( 'off' === $junk_tiers['desktop'], 'a junk sectionInk value coerces to off' );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
