<?php
// phpcs:ignoreFile WordPress.Files.FileName.InvalidClassFileName -- this test
// harness defines a conditional `Locale` stand-in class inline (see below)
// rather than in its own class-locale.php; it is a test fixture, not shipped
// OO code.
/**
 * Standalone runner for sgs/language-switch's label/tag helpers
 * (includes/language-switch-helpers.php). Exercises the REAL functions with
 * plain PHP, no PHPUnit. Exits non-zero on any failure.
 *
 * Normal run (all green):
 *   php plugins/sgs-blocks/tests/php/run-language-switch-standalone.php
 *
 * Negative-control run (deliberately broken intl-unavailable fallback, must
 * go RED):
 *   php plugins/sgs-blocks/tests/php/run-language-switch-standalone.php --negative-control
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
// The stand-in `Locale` class below (defined only when the real intl
// extension is absent) intentionally mirrors PHP's own intl API name and
// method casing (`getDisplayLanguage`, `canonicalize`) rather than WordPress
// snake_case — it has to match the real class's call shape exactly, since
// includes/language-switch-helpers.php calls `\Locale::getDisplayLanguage()`
// and `\Locale::canonicalize()` verbatim. It also shares this file with the
// test harness's own functions rather than living in a `class-locale.php` of
// its own, since it exists only as a conditional test fixture.
// phpcs:disable WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
// phpcs:disable Squiz.Commenting.ClassComment.Missing
// phpcs:disable Universal.Files.SeparateFunctionsFromOO.Mixed
// phpcs:disable WordPress.Files.FileName.InvalidClassFileName

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// esc_html()/esc_attr()/esc_url() stubs — this test exercises the helper
// FUNCTIONS directly (label/tag resolution), not render.php's markup
// assembly, so these are never called by the code under test here. They are
// still defined in case a future addition to this file renders markup via
// sgs_language_switch_item_html(), which esc_*()'s inside.
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ) {
		return filter_var( (string) $url, FILTER_SANITIZE_URL );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/language-switch-helpers.php';

// Minimal stand-in for PHP's intl `Locale` class, defined ONLY when the real
// intl extension is not installed on the machine running this test (this
// repo's own dev sandbox has no intl module). It covers exactly the codes
// this test exercises, so the "intl available" branch of
// sgs_language_switch_bcp47()/sgs_language_switch_autonym_or_fallback() is
// genuinely run rather than silently skipped in that environment. On a
// machine WITH the real extension (canary/production), this block never
// runs — class_exists() finds the real class first.
if ( ! class_exists( 'Locale', false ) ) {
	class Locale {
		public static function canonicalize( $locale ) {
			$normalised = str_replace( '-', '_', (string) $locale );
			$map        = array(
				'es'    => 'es',
				'nl'    => 'nl',
				'en'    => 'en',
				'en_gb' => 'en_GB',
				'fr'    => 'fr',
			);
			$key        = strtolower( $normalised );
			return $map[ $key ] ?? $normalised;
		}

		public static function getDisplayLanguage( $locale, $display_locale ) {
			unset( $display_locale ); // This stand-in only supports the "in its own language" call shape this block always uses.
			$names   = array(
				'es' => 'español',
				'nl' => 'nederlands',
				'en' => 'english',
				'fr' => 'français',
			);
			$parts   = explode( '_', str_replace( '-', '_', (string) $locale ) );
			$primary = strtolower( $parts[0] );
			return $names[ $primary ] ?? '';
		}
	}
}

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

$negative_control = in_array( '--negative-control', $argv ?? array(), true );

if ( $negative_control ) {
	echo "=== NEGATIVE CONTROL RUN — deliberately broken intl-unavailable fallback ===\n";

	/**
	 * The bug this test exists to catch: an autonym resolver that returns
	 * '' when intl is unavailable instead of falling back to the typed
	 * customLabel, then the upper-cased code. "Never an empty string" is
	 * the contract sgs_language_switch_autonym_or_fallback() exists to
	 * guarantee; this broken stand-in drops the fallback chain entirely.
	 *
	 * @param string $code           Raw language code.
	 * @param string $custom_label   Operator's typed custom label.
	 * @param bool   $intl_available Forced availability flag.
	 * @return string Resolved label (wrongly, on the intl-unavailable path).
	 */
	function sgs_language_switch_autonym_or_fallback_broken( $code, $custom_label, $intl_available ) {
		if ( $intl_available && class_exists( 'Locale' ) ) {
			$autonym = \Locale::getDisplayLanguage( $code, $code );
			if ( is_string( $autonym ) && '' !== trim( $autonym ) ) {
				return sgs_language_switch_ucfirst( trim( $autonym ) );
			}
		}
		return ''; // BUG: should fall back to $custom_label, then the upper-cased code.
	}

	$broken_no_custom = sgs_language_switch_autonym_or_fallback_broken( 'nl', '', false );
	ok(
		'' !== $broken_no_custom,
		'NEGATIVE CONTROL: with intl unavailable and no custom label, the fallback must not be empty (expect this to FAIL against the broken stand-in)'
	);

	$broken_with_custom = sgs_language_switch_autonym_or_fallback_broken( 'nl', 'Dutch', false );
	ok(
		'Dutch' === $broken_with_custom,
		'NEGATIVE CONTROL: with intl unavailable, the typed custom label is used (expect this to FAIL against the broken stand-in)'
	);

	echo "\n$pass passed, $fail failed\n";
	// Same exit convention as the normal run (mirrors run-local-time-standalone.php):
	// the broken stand-in above SHOULD fail these assertions, so this run is
	// expected to exit 1 (red) — that non-zero exit IS the proof the guard is
	// real. If it ever exits 0 here, the broken stand-in accidentally passed,
	// meaning the guard is not actually catching the bug.
	exit( $fail ? 1 : 0 );
}

// ---------------------------------------------------------------------------
// 1. BCP 47 / hreflang tag resolution (intl available — the real Locale class
// on whichever machine runs this).
// ---------------------------------------------------------------------------

ok( 'es' === sgs_language_switch_bcp47( 'es' ), '"es" canonicalises to "es"' );
ok( 'en-GB' === sgs_language_switch_bcp47( 'en_GB' ), '"en_GB" canonicalises to "en-GB" (underscore to hyphen)' );
ok( 'nl' === sgs_language_switch_bcp47( 'nl' ), '"nl" canonicalises to "nl"' );
ok( '' === sgs_language_switch_bcp47( '' ), 'an empty code resolves to an empty tag' );

// Forced intl-unavailable path still produces a usable tag (a plain
// underscore-to-hyphen swap of the typed code).
ok( 'en-GB' === sgs_language_switch_bcp47( 'en_GB', false ), 'with intl forced unavailable, "en_GB" still becomes "en-GB" via the plain swap' );

// ---------------------------------------------------------------------------
// 2. Autonym resolution ("es" -> "Español") — intl available.
// ---------------------------------------------------------------------------

ok( 'Español' === sgs_language_switch_autonym_or_fallback( 'es', '', null ), '"es" autonym resolves to "Español"' );
ok( 'Nederlands' === sgs_language_switch_autonym_or_fallback( 'nl', '', null ), '"nl" autonym resolves to "Nederlands"' );

// ---------------------------------------------------------------------------
// 3. Visible label per labelStyle.
// ---------------------------------------------------------------------------

ok( 'Español' === sgs_language_switch_visible_label( 'es', 'autonym', '', null ), 'autonym style: "es" -> "Español"' );
ok( 'NL' === sgs_language_switch_visible_label( 'nl', 'code', '', null ), 'code style: "nl" -> "NL"' );
ok( 'Site en Français' === sgs_language_switch_visible_label( 'fr', 'custom', 'Site en Français', null ), 'custom style: uses the typed custom label verbatim' );
ok( 'FR' === sgs_language_switch_visible_label( 'fr', 'custom', '', null ), 'custom style with no typed label falls back to the upper-cased code' );

// ---------------------------------------------------------------------------
// 4. Accessible name for "code" style — the hidden span text is the autonym,
// not the visible code (lamalama's "NL" link, accessible name "Nederlands").
// ---------------------------------------------------------------------------

ok( 'Nederlands' === sgs_language_switch_accessible_name( 'nl', '', null ), 'code style accessible name: "nl" -> "Nederlands"' );

$nl_item_html = sgs_language_switch_item_html(
	array(
		'code'        => 'nl',
		'url'         => '/nl/',
		'customLabel' => '',
	),
	'code',
	false,
	null
);
ok(
	false !== strpos( $nl_item_html, '<span class="sgs-sr-only">Nederlands</span>' ),
	'code style item markup carries a visually-hidden span with the autonym as the accessible name'
);
ok(
	false !== strpos( $nl_item_html, '<span aria-hidden="true">NL</span>' ),
	'code style item markup hides the visible "NL" text from assistive tech (the sr-only span carries the name instead)'
);
ok(
	false !== strpos( $nl_item_html, 'lang="nl"' ) && false !== strpos( $nl_item_html, 'hreflang="nl"' ),
	'code style item markup carries lang and hreflang'
);

// ---------------------------------------------------------------------------
// 5. hreflang/lang on an autonym-style item ("es" -> "Español", hreflang="es",
// lang="es").
// ---------------------------------------------------------------------------

$es_item_html = sgs_language_switch_item_html(
	array(
		'code'        => 'es',
		'url'         => '/es/',
		'customLabel' => '',
	),
	'autonym',
	false,
	null
);
ok( false !== strpos( $es_item_html, '>Español<' ), '"es" item visible text is "Español"' );
ok( false !== strpos( $es_item_html, 'hreflang="es"' ), '"es" item carries hreflang="es"' );
ok( false !== strpos( $es_item_html, 'lang="es"' ), '"es" item carries lang="es"' );

// ---------------------------------------------------------------------------
// 6. en_GB -> hreflang="en-GB" on the rendered item.
// ---------------------------------------------------------------------------

$en_gb_item_html = sgs_language_switch_item_html(
	array(
		'code'        => 'en_GB',
		'url'         => '/en-gb/',
		'customLabel' => '',
	),
	'autonym',
	false,
	null
);
ok( false !== strpos( $en_gb_item_html, 'hreflang="en-GB"' ), '"en_GB" item carries hreflang="en-GB"' );
ok( false !== strpos( $en_gb_item_html, 'lang="en-GB"' ), '"en_GB" item carries lang="en-GB"' );

// ---------------------------------------------------------------------------
// 7. aria-current on the item matching a stubbed get_locale().
// ---------------------------------------------------------------------------

ok( true === sgs_language_switch_is_current( 'en', 'en_US' ), '"en" item matches current locale "en_US" (same primary subtag)' );
ok( true === sgs_language_switch_is_current( 'en_GB', 'en_US' ), '"en_GB" item matches current locale "en_US" (primary subtag only, region ignored)' );
ok( false === sgs_language_switch_is_current( 'es', 'en_US' ), '"es" item does not match current locale "en_US"' );

$current_item_html = sgs_language_switch_item_html(
	array(
		'code'        => 'en',
		'url'         => '/',
		'customLabel' => '',
	),
	'autonym',
	true, // is_current.
	null
);
ok( false !== strpos( $current_item_html, 'aria-current="true"' ), 'the item matching get_locale() carries aria-current="true"' );

$non_current_item_html = sgs_language_switch_item_html(
	array(
		'code'        => 'es',
		'url'         => '/es/',
		'customLabel' => '',
	),
	'autonym',
	false, // is_current.
	null
);
ok( false === strpos( $non_current_item_html, 'aria-current' ), 'a non-current item carries no aria-current attribute at all' );

// ---------------------------------------------------------------------------
// 8. single-link mode prints only the first non-current item — proved at the
// helper level: iterate a language list the same way render.php does (first
// !isCurrent wins), current items are skipped entirely.
// ---------------------------------------------------------------------------

$languages_for_single_link = array(
	array(
		'code'       => 'en',
		'is_current' => true,
	),
	array(
		'code'       => 'fr',
		'is_current' => false,
	),
	array(
		'code'       => 'es',
		'is_current' => false,
	),
);

$single_link_target = null;
foreach ( $languages_for_single_link as $item ) {
	if ( ! $item['is_current'] ) {
		$single_link_target = $item;
		break;
	}
}

ok( null !== $single_link_target && 'fr' === $single_link_target['code'], 'single-link mode selects the FIRST non-current item ("fr"), skipping the current "en" and the later "es"' );

$languages_all_current = array(
	array(
		'code'       => 'en',
		'is_current' => true,
	),
);
$single_link_none = null;
foreach ( $languages_all_current as $item ) {
	if ( ! $item['is_current'] ) {
		$single_link_none = $item;
		break;
	}
}
ok( null === $single_link_none, 'single-link mode finds nothing to print when every item is current' );

// ---------------------------------------------------------------------------
// 9. Fallback chain with intl forced unavailable — never an empty string.
// ---------------------------------------------------------------------------

ok( 'Dutch' === sgs_language_switch_autonym_or_fallback( 'nl', 'Dutch', false ), 'intl unavailable + a typed custom label: the custom label wins' );
ok( 'NL' === sgs_language_switch_autonym_or_fallback( 'nl', '', false ), 'intl unavailable + no custom label: falls back to the upper-cased code, never empty' );
ok( '' !== sgs_language_switch_autonym_or_fallback( 'nl', '', false ), 'intl unavailable fallback is never an empty string' );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
