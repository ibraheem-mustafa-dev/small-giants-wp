<?php
/**
 * Standalone runner for includes/helpers-free-delivery.php::sgs_free_delivery_threshold.
 *
 * Checks the override-wins rule, the base-country zone lookup with stubbed WooCommerce classes, and that a numeric
 * override never reaches the zone lookup (the query-count rule sgs/cart keeps).
 *   php plugins/sgs-blocks/tests/php/run-free-delivery-threshold-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable Squiz.Commenting
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

final class Stub_Method {
	public string $id;
	private bool $enabled;
	private array $options;
	public function __construct( string $id, bool $enabled, array $options ) {
		$this->id      = $id;
		$this->enabled = $enabled;
		$this->options = $options;
	}
	public function is_enabled(): bool {
		return $this->enabled;
	}
	public function get_option( string $key, $default = '' ) {
		return $this->options[ $key ] ?? $default;
	}
}

final class Stub_Zone {
	public array $methods = array();
	public function get_shipping_methods( bool $enabled_only ): array {
		return $this->methods;
	}
}

final class WC_Shipping_Zones {
	public static int $lookups = 0;
	public static ?Stub_Zone $zone = null;
	public static array $last_package = array();
	public static function get_zone_matching_package( array $package ) {
		++self::$lookups;
		self::$last_package = $package;
		return self::$zone;
	}
}

function wc_get_base_location(): array {
	return array( 'country' => 'GB', 'state' => '' );
}

require dirname( __DIR__, 2 ) . '/includes/helpers-free-delivery.php';

$failures = 0;
function check( string $label, $actual, $expected ): void {
	global $failures;
	if ( $actual !== $expected ) {
		++$failures;
		echo 'FAIL ' . $label . ': got ' . var_export( $actual, true ) . ', expected ' . var_export( $expected, true ) . "\n";
		return;
	}
	echo 'ok   ' . $label . "\n";
}

check( 'numeric override wins', sgs_free_delivery_threshold( '35' ), 35.0 );
check( 'numeric override skips the zone lookup', WC_Shipping_Zones::$lookups, 0 );
check( 'padded override', sgs_free_delivery_threshold( ' 12.5 ' ), 12.5 );
check( 'no zone, no override', sgs_free_delivery_threshold( '' ), null );
check( 'non-numeric override falls to the lookup', WC_Shipping_Zones::$lookups, 1 );

$zone          = new Stub_Zone();
$zone->methods = array(
	new Stub_Method( 'flat_rate', true, array( 'min_amount' => '99' ) ),
	new Stub_Method( 'free_shipping', false, array( 'min_amount' => '77' ) ),
	new Stub_Method( 'free_shipping', true, array( 'min_amount' => '0' ) ),
	new Stub_Method( 'free_shipping', true, array( 'min_amount' => '40' ) ),
);
WC_Shipping_Zones::$zone = $zone;
check( 'zone minimum', sgs_free_delivery_threshold( 'abc' ), 40.0 );
check( 'one lookup per call', WC_Shipping_Zones::$lookups, 2 );
check( 'base country sent', WC_Shipping_Zones::$last_package['destination']['country'], 'GB' );
check( 'non-scalar override', sgs_free_delivery_threshold( array( 5 ) ), 40.0 );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
