<?php
/**
 * Detector: every block that (a) declares a `backgroundImage` attribute in its
 * own block.json AND (b) routes through `SGS_Container_Wrapper::render()` in
 * its render.php must also declare `surfaceTone` (U-13 §4.3/§4.4,
 * .claude/reports/2026-09-26-u13-header-ink-design.md) — the "Surface tone:
 * Automatic / Light / Dark" override that lets an operator override the
 * automatic image-tone judgement in helpers-surface-tone.php.
 *
 * Built FIRST per CLAUDE.md's "3+ files getting the same change? Build the
 * detector first" — this is exactly that shape (7 candidate block.json files).
 * Run red before any block.json gained `surfaceTone`, green after.
 *
 * A block reaches the shared wrapper's tone-judgement code (condition b)
 * ONLY when its render.php literally calls `SGS_Container_Wrapper::render(` —
 * `sgs/nav-drawer` declares `backgroundImage` but computes its OWN
 * block-private tone (see run-surface-private-standalone.php) and correctly
 * never matches. `sgs/card-grid`'s render.php mentions the wrapper but never
 * declares a `backgroundImage` attribute of its own (no editor control
 * exists for it), so it correctly never matches either — condition (a) fails
 * first.
 *
 * EXCLUDE lists two blocks that DO match both conditions but are deliberately
 * left out of THIS session's scope, each with the reason it is excluded —
 * never a silent skip.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-surface-tone-attribute-coverage-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

/**
 * Blocks that match both detector conditions but deliberately do not declare
 * `surfaceTone`, keyed by block name, valued by the reason. Empty: every
 * matching block declares it.
 *
 * @var array<string,string>
 */
$exclude = array();

$blocks_dir = dirname( __DIR__, 2 ) . '/src/blocks';
$block_json_files = glob( $blocks_dir . '/*/block.json' );

if ( empty( $block_json_files ) ) {
	fwrite( STDERR, "FAIL no block.json files found under $blocks_dir\n" );
	exit( 1 );
}

sort( $block_json_files );

$pass    = 0;
$fail    = 0;
$checked = array();
$matched = array();
$excluded_matched = array();

foreach ( $block_json_files as $block_json_path ) {
	$block_dir = dirname( $block_json_path );
	$json      = json_decode( (string) file_get_contents( $block_json_path ), true );

	if ( ! is_array( $json ) ) {
		continue;
	}

	$name       = (string) ( $json['name'] ?? '' );
	$attributes = is_array( $json['attributes'] ?? null ) ? $json['attributes'] : array();

	$declares_bg_image = array_key_exists( 'backgroundImage', $attributes );

	if ( ! $declares_bg_image ) {
		continue;
	}

	$render_path = $block_dir . '/render.php';
	if ( ! file_exists( $render_path ) ) {
		continue;
	}

	$render_source = (string) file_get_contents( $render_path );
	$reaches_wrapper_tone = false !== strpos( $render_source, 'SGS_Container_Wrapper::render(' );

	if ( ! $reaches_wrapper_tone ) {
		continue;
	}

	$checked[] = $name;

	if ( isset( $exclude[ $name ] ) ) {
		$excluded_matched[] = $name . ' (' . $exclude[ $name ] . ')';
		continue;
	}

	$matched[] = $name;

	$declares_surface_tone = array_key_exists( 'surfaceTone', $attributes );
	$shape_ok              = $declares_surface_tone
		&& 'string' === ( $attributes['surfaceTone']['type'] ?? '' )
		&& array( 'auto', 'light', 'dark' ) === ( $attributes['surfaceTone']['enum'] ?? array() )
		&& 'auto' === ( $attributes['surfaceTone']['default'] ?? '' );

	++$pass;
	if ( ! $shape_ok ) {
		--$pass;
		++$fail;
		fwrite(
			STDERR,
			"FAIL  {$name} declares backgroundImage and reaches SGS_Container_Wrapper::render() but does not declare a correctly-shaped surfaceTone attribute (type:string, enum:[auto,light,dark], default:auto)\n"
		);
	} else {
		echo "PASS  {$name} declares surfaceTone correctly\n";
	}
}

echo "\nChecked (declares backgroundImage + reaches the wrapper's tone code): " . implode( ', ', $checked ) . "\n";
echo 'Excluded (matched, out of scope): ' . ( empty( $excluded_matched ) ? '(none)' : implode( '; ', $excluded_matched ) ) . "\n";
echo 'In-scope candidates required to declare surfaceTone: ' . implode( ', ', $matched ) . "\n";

echo "\n==== {$pass} passed, {$fail} failed ====\n";
exit( $fail > 0 ? 1 : 0 );
