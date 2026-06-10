<?php
/**
 * Standalone runner for the FR-27-R4 product-template envelope functions.
 *
 * Exercises the PURE envelope helpers in Product_Templates_Envelope — no
 * PHPUnit, no WordPress, no WooCommerce required. Tests:
 *   - build() → validate() round-trip (build produces a valid envelope).
 *   - sanitise() produces identical structure after round-trip (export then
 *     import-parse gives equal data).
 *   - validate() rejects: bad version, missing version, attribute count cap,
 *     term count cap, integer ID smuggled in attribute slug, integer ID in
 *     term slug, integer ID in attribute name, integer ID in term name,
 *     non-array envelope, invalid swatch_color, disallowed presentation key.
 *   - sanitise() strips XSS tags from strings.
 *   - clean_slug() removes disallowed characters.
 *   - is_valid_hex_color() accepts #rgb and #rrggbb; rejects non-hex.
 *   - find_smuggled_ids() detects numeric slugs/names.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-product-templates-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// Stub the one WP function called by the envelope class (wp_strip_all_tags).
// The rest of the envelope helpers are pure PHP.
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Minimal stub: strip HTML tags and trim.
	 *
	 * @param string $text Input.
	 * @return string
	 */
	function wp_strip_all_tags( string $text ): string { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- stub for standalone test runner only.
		// Strip <script> and <style> tag content first (mirrors real wp_strip_all_tags behaviour).
		$text = preg_replace( '@<(script|style)[^>]*?>.*?</\\1>@si', '', $text );
		return trim( strip_tags( $text ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- standalone test runner; WP not available.
	}
}

// Stub ABSPATH guard so the class file does not exit.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

require_once dirname( __DIR__, 2 ) . '/includes/class-product-templates-envelope.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-product-templates-validators.php';

use SGS\Blocks\Product_Templates_Envelope as Env;
use SGS\Blocks\Product_Templates_Validators as Validators;

// ── Tiny assertion harness ────────────────────────────────────────────────────

$pass  = 0;
$fail  = 0;
$cases = array();

/**
 * Assert two values are identical (===).
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $label    Human-readable case label.
 * @return void
 */
function assert_same( mixed $expected, mixed $actual, string $label ): void {
	global $pass, $fail, $cases;
	if ( $expected === $actual ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- test runner: debug output intentional.
		$cases[] = 'FAIL  ' . $label . '  (expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) . ')';
	}
}

/**
 * Assert that $haystack contains $needle (array value or substring).
 *
 * @param mixed  $needle   Value to find.
 * @param mixed  $haystack Array or string to search.
 * @param string $label    Human-readable case label.
 * @return void
 */
function assert_contains( mixed $needle, mixed $haystack, string $label ): void {
	global $pass, $fail, $cases;
	$found = is_array( $haystack )
		? in_array( $needle, $haystack, true )
		: ( is_string( $haystack ) && false !== strpos( $haystack, (string) $needle ) );
	if ( $found ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- test runner: debug output intentional.
		$cases[] = 'FAIL  ' . $label . '  (needle ' . var_export( $needle, true ) . ' not found)';
	}
}

/**
 * Assert that the errors array is empty (valid envelope).
 *
 * @param array  $errors Array of error strings from validate().
 * @param string $label  Human-readable case label.
 * @return void
 */
function assert_valid( array $errors, string $label ): void {
	global $pass, $fail, $cases;
	if ( empty( $errors ) ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		$cases[] = 'FAIL  ' . $label . '  (unexpected errors: ' . implode( '; ', $errors ) . ')';
	}
}

/**
 * Assert that the errors array is non-empty (invalid envelope).
 *
 * @param array  $errors Array of error strings from validate().
 * @param string $label  Human-readable case label.
 * @return void
 */
function assert_invalid( array $errors, string $label ): void {
	global $pass, $fail, $cases;
	if ( ! empty( $errors ) ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		$cases[] = 'FAIL  ' . $label . '  (expected validation errors but got none)';
	}
}

// ── Fixture ───────────────────────────────────────────────────────────────────

$good_attrs = array(
	array(
		'name'  => 'Size',
		'slug'  => 'size',
		'terms' => array(
			array(
				'name'         => 'Small',
				'slug'         => 'small',
				'swatch_color' => null,
			),
			array(
				'name'         => 'Medium',
				'slug'         => 'medium',
				'swatch_color' => '#ff0000',
			),
			array(
				'name'         => 'Large',
				'slug'         => 'large',
				'swatch_color' => '#abc',
			),
		),
	),
	array(
		'name'  => 'Colour',
		'slug'  => 'colour',
		'terms' => array(
			array(
				'name'         => 'Red',
				'slug'         => 'red',
				'swatch_color' => '#cc0000',
			),
			array(
				'name'         => 'Blue',
				'slug'         => 'blue',
				'swatch_color' => null,
			),
		),
	),
);

$good_presentation = array(
	'_sgs_unit_label'    => 'pack',
	'_sgs_unit_divisor'  => 6,
	'_sgs_decoy_enabled' => true,
);

// ── 1. build() produces a valid envelope ─────────────────────────────────────

$built = Env::build( 'sgs-blocks/0.1.2', $good_attrs, $good_presentation, 'size', 'size' );
assert_same( 1, $built['version'], 'build: version = 1' );
assert_same( 'sgs-blocks/0.1.2', $built['generator'], 'build: generator preserved' );
assert_same( $good_attrs, $built['attributes'], 'build: attributes preserved' );
assert_same( $good_presentation, $built['presentation'], 'build: presentation preserved' );
assert_same( 'size', $built['varies_by'], 'build: varies_by preserved' );
assert_same( 'size', $built['pack_size_axis_slug'], 'build: pack_size_axis_slug preserved' );

$validation_result = Env::validate( $built );
assert_valid( $validation_result, 'build → validate: built envelope is valid' );

// ── 2. Round-trip: sanitise(built) equals built (already clean data) ──────────

$sanitised = Validators::sanitise( $built );
assert_same( 1, $sanitised['version'], 'round-trip: sanitised version = 1' );
assert_same( 2, count( $sanitised['attributes'] ), 'round-trip: attribute count preserved' );
assert_same( 3, count( $sanitised['attributes'][0]['terms'] ), 'round-trip: term count for attr 0 preserved' );
assert_same( 'size', $sanitised['attributes'][0]['slug'], 'round-trip: attr slug preserved' );
assert_same( 'small', $sanitised['attributes'][0]['terms'][0]['slug'], 'round-trip: term slug preserved' );
assert_same( '#ff0000', $sanitised['attributes'][0]['terms'][1]['swatch_color'], 'round-trip: swatch_color #ff0000 preserved' );
assert_same( '#abc', $sanitised['attributes'][0]['terms'][2]['swatch_color'], 'round-trip: swatch_color #abc preserved' );
assert_same( null, $sanitised['attributes'][0]['terms'][0]['swatch_color'], 'round-trip: null swatch preserved' );

// ── 3. validate() accepts valid envelope with null optional fields ─────────────

$minimal = Env::build( 'sgs-blocks/test', $good_attrs, array(), null, null );
assert_valid( Env::validate( $minimal ), 'validate: minimal envelope (null varies_by, empty presentation) is valid' );

// ── 4. validate() rejects: unknown version ────────────────────────────────────

$bad_version            = $built;
$bad_version['version'] = 99;
$errs                   = Env::validate( $bad_version );
assert_invalid( $errs, 'validate: version=99 rejected' );
assert_contains( 'Unsupported envelope version', $errs[0], 'validate: version error message correct' );

// ── 5. validate() rejects: missing version ───────────────────────────────────

$no_version = $built;
unset( $no_version['version'] );
assert_invalid( Env::validate( $no_version ), 'validate: missing version rejected' );

// ── 6. validate() rejects: non-array input ───────────────────────────────────

assert_invalid( Env::validate( 'not an array' ), 'validate: string input rejected' );
assert_invalid( Env::validate( null ), 'validate: null input rejected' );
assert_invalid( Env::validate( 42 ), 'validate: integer input rejected' );

// ── 7. validate() rejects: attribute count cap ───────────────────────────────

$too_many_attrs = $built;
$extra_attr     = array(
	'name'  => 'Extra',
	'slug'  => 'extra',
	'terms' => array(
		array(
			'name'         => 'T',
			'slug'         => 't',
			'swatch_color' => null,
		),
	),
);
for ( $i = 0; $i < Env::MAX_ATTRIBUTES; $i++ ) {
	$too_many_attrs['attributes'][] = array_merge(
		$extra_attr,
		array(
			'slug' => 'extra' . $i,
			'name' => 'Extra ' . $i,
		)
	);
}
assert_invalid( Env::validate( $too_many_attrs ), 'validate: >' . Env::MAX_ATTRIBUTES . ' attributes rejected' );

// ── 8. validate() rejects: term count cap ────────────────────────────────────

$too_many_terms = $built;
$big_terms      = array();
for ( $i = 0; $i <= Env::MAX_TERMS_PER_ATTRIBUTE; $i++ ) {
	$big_terms[] = array(
		'name'         => 'Term ' . $i,
		'slug'         => 'term-' . $i,
		'swatch_color' => null,
	);
}
$too_many_terms['attributes'][0]['terms'] = $big_terms;
assert_invalid( Env::validate( $too_many_terms ), 'validate: >' . Env::MAX_TERMS_PER_ATTRIBUTE . ' terms per attribute rejected' );

// ── 9. validate() rejects: integer ID in attribute slug ──────────────────────

$id_in_attr_slug                          = $built;
$id_in_attr_slug['attributes'][0]['slug'] = '123';
assert_invalid( Env::validate( $id_in_attr_slug ), 'validate: numeric attribute slug rejected' );

// ── 10. validate() rejects: integer ID in attribute name ─────────────────────

$id_in_attr_name                          = $built;
$id_in_attr_name['attributes'][0]['name'] = '456';
assert_invalid( Env::validate( $id_in_attr_name ), 'validate: numeric attribute name rejected' );

// ── 11. validate() rejects: integer ID in term slug ──────────────────────────

$id_in_term_slug                                      = $built;
$id_in_term_slug['attributes'][0]['terms'][0]['slug'] = '789';
assert_invalid( Env::validate( $id_in_term_slug ), 'validate: numeric term slug rejected' );

// ── 12. validate() rejects: integer ID in term name ──────────────────────────

$id_in_term_name                                      = $built;
$id_in_term_name['attributes'][0]['terms'][0]['name'] = '101';
assert_invalid( Env::validate( $id_in_term_name ), 'validate: numeric term name rejected' );

// ── 13. validate() rejects: invalid swatch_color ─────────────────────────────

$bad_swatch = $built;
$bad_swatch['attributes'][0]['terms'][1]['swatch_color'] = 'red'; // Not a hex value.
assert_invalid( Env::validate( $bad_swatch ), 'validate: non-hex swatch_color rejected' );

$bad_swatch2 = $built;
$bad_swatch2['attributes'][0]['terms'][1]['swatch_color'] = '#zzzzzz';
assert_invalid( Env::validate( $bad_swatch2 ), 'validate: invalid hex swatch_color rejected' );

// ── 14. validate() accepts: valid 3-digit hex swatch ─────────────────────────

$three_digit = $built;
$three_digit['attributes'][0]['terms'][1]['swatch_color'] = '#a1b';
assert_valid( Env::validate( $three_digit ), 'validate: 3-digit hex swatch_color accepted' );

// ── 15. validate() rejects: disallowed presentation key ──────────────────────

$bad_pres = $built;
$bad_pres['presentation']['_sgs_base_price_pence'] = 100; // Commerce key — excluded.
assert_invalid( Env::validate( $bad_pres ), 'validate: _sgs_base_price_pence in presentation rejected' );

$bad_pres2                                = $built;
$bad_pres2['presentation']['_sgs_pack_k'] = 'standard'; // Commerce key.
assert_invalid( Env::validate( $bad_pres2 ), 'validate: _sgs_pack_k in presentation rejected' );

$bad_pres3                                        = $built;
$bad_pres3['presentation']['_sgs_pack_size_axis'] = 'pa_size'; // H2: sole carrier is the top-level pack_size_axis_slug field.
assert_invalid( Env::validate( $bad_pres3 ), 'validate: _sgs_pack_size_axis in presentation rejected (single-path H2)' );

// ── 16. sanitise() strips XSS tags ───────────────────────────────────────────

$xss                                      = $built;
$xss['attributes'][0]['name']             = '<script>alert(1)</script>Size';
$xss['attributes'][0]['terms'][0]['name'] = '<b>Small</b>';
$cleaned                                  = Validators::sanitise( $xss );
assert_same( 'Size', $cleaned['attributes'][0]['name'], 'sanitise: script tags stripped from attr name' );
assert_same( 'Small', $cleaned['attributes'][0]['terms'][0]['name'], 'sanitise: bold tags stripped from term name' );

// ── 17. clean_slug() removes disallowed characters ───────────────────────────

assert_same( 'pa-size', Validators::clean_slug( 'pa-size' ), 'clean_slug: valid slug unchanged' );
assert_same( 'pa-size', Validators::clean_slug( 'PA-Size' ), 'clean_slug: uppercased slug lowercased' );
assert_same( 'pasize', Validators::clean_slug( 'pa size' ), 'clean_slug: space removed' );
assert_same( 'colour', Validators::clean_slug( 'colour!' ), 'clean_slug: punctuation stripped' );
assert_same( 'abc123', Validators::clean_slug( 'abc123' ), 'clean_slug: alphanumeric unchanged' );

// ── 18. is_valid_hex_color() ─────────────────────────────────────────────────

assert_same( true, Validators::is_valid_hex_color( '#ff0000' ), 'is_valid_hex_color: #ff0000 accepted' );
assert_same( true, Validators::is_valid_hex_color( '#FFF' ), 'is_valid_hex_color: #FFF accepted' );
assert_same( true, Validators::is_valid_hex_color( '#abc' ), 'is_valid_hex_color: #abc accepted' );
assert_same( false, Validators::is_valid_hex_color( 'red' ), 'is_valid_hex_color: "red" rejected' );
assert_same( false, Validators::is_valid_hex_color( '#zzzzzz' ), 'is_valid_hex_color: #zzzzzz rejected' );
assert_same( false, Validators::is_valid_hex_color( '#ff00' ), 'is_valid_hex_color: 4-char hex rejected' );
assert_same( false, Validators::is_valid_hex_color( '' ), 'is_valid_hex_color: empty string rejected' );

// ── 19. find_smuggled_ids() ───────────────────────────────────────────────────

$smuggled                                      = $built;
$smuggled['attributes'][0]['slug']             = '42';
$smuggled['attributes'][1]['terms'][0]['slug'] = '99';
$violations                                    = Validators::find_smuggled_ids( $smuggled );
assert_same( 2, count( $violations ), 'find_smuggled_ids: 2 violations found' );
assert_contains( 'attributes[0].slug', $violations[0], 'find_smuggled_ids: attr slug violation reported' );
assert_contains( 'attributes[1].terms[0].slug', $violations[1], 'find_smuggled_ids: term slug violation reported' );

$clean_envelope = Validators::find_smuggled_ids( $built );
assert_same( 0, count( $clean_envelope ), 'find_smuggled_ids: clean envelope has 0 violations' );

// ── 20. sanitise() preserves boolean presentation value ──────────────────────

$bool_pres      = Env::build( 'test', $good_attrs, array( '_sgs_decoy_enabled' => true ), null, null );
$sanitised_bool = Validators::sanitise( $bool_pres );
assert_same( true, $sanitised_bool['presentation']['_sgs_decoy_enabled'], 'sanitise: boolean presentation value preserved' );

// ── 21. sanitise() drops disallowed presentation keys ────────────────────────

$extra_pres      = Env::build(
	'test',
	$good_attrs,
	array(
		'_sgs_unit_label'       => 'ml',
		'_sgs_base_price_pence' => 500,
	),
	null,
	null
);
$sanitised_extra = Validators::sanitise( $extra_pres );
assert_same( false, isset( $sanitised_extra['presentation']['_sgs_base_price_pence'] ), 'sanitise: commerce key dropped from presentation' );
assert_same( 'ml', $sanitised_extra['presentation']['_sgs_unit_label'], 'sanitise: allowed presentation key preserved' );

// ── 22. validate() rejects: oversized raw payload (>256 KB) ──────────────────

$oversized_body = str_repeat( 'a', Env::MAX_PAYLOAD_BYTES + 1 );
assert_invalid( Env::validate( $built, $oversized_body ), 'validate: oversized raw body (>256KB) rejected' );

// ── Summary ───────────────────────────────────────────────────────────────────

echo PHP_EOL;
foreach ( $cases as $line ) {
	echo $line . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test runner, not HTML output.
}

echo PHP_EOL;
echo '────────────────────────────────────────────────────────────' . PHP_EOL;
echo 'Results: ' . $pass . ' PASS  /  ' . $fail . ' FAIL' . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test runner, not HTML output.
echo '────────────────────────────────────────────────────────────' . PHP_EOL;

exit( 0 < $fail ? 1 : 0 );
