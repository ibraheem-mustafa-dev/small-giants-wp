<?php
/**
 * Standalone runner: a declared part whose printed class differs from the default `sgs-<slug>__<part>` declares its
 * `selector`, and Sgs_Motion_Targets::resolve reads it, so motion on sgs/form-field-text's label, help and error lands
 * on the shared field classes the block prints (`includes/forms/field-render-helpers.php`).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-declared-selector-standalone.php
 *
 * Loads the real `Sgs_Motion_Targets` with the block type registry stand-in in `stubs/motion-render-stubs.php` (which
 * reads the real block.json). Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Targets;

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

foreach ( array( 'label', 'help', 'error' ) as $part ) {
	$r = Sgs_Motion_Targets::resolve( 'sgs/form-field-text', 'sgs-m-abc', $part, array() );
	$check( is_array( $r ) && '.sgs-m-abc .sgs-form-field__' . $part === ( $r['selector'] ?? null ), "form-field-text $part resolves to .sgs-form-field__$part (got " . var_export( $r['selector'] ?? $r, true ) . ')' );
}
// Negative control: a part with motion off is no motion target.
$check( null === Sgs_Motion_Targets::resolve( 'sgs/form-field-text', 'sgs-m-abc', 'input', array() ), 'input (motion off) is no target' );

echo "$checks checks, $failures failed\n";
exit( $failures ? 1 : 0 );
