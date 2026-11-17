<?php
/**
 * The line under a cart item's name can show its attribute values alone ("Classic oat · Milk choc") instead of
 * "Base: Classic oat · Chip: Milk choc" (wording option `labelFormat`, WooCommerce > Shop wording).
 *
 * Layer A is the one shaper every surface reads (the basket drawer, the cart page, the checkout and new order emails),
 * so the format is tested there and in the wording normaliser that stores it.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartLineSummaryFormatTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/cart-line-summary/functions.php';

final class CartLineSummaryFormatTest extends TestCase {

	private function parts( string $format = '' ): array {
		$parts = array(
			'lead'       => '',
			'attributes' => array(
				array( 'label' => 'Base', 'value' => 'Classic oat' ),
				array( 'label' => 'Chip', 'value' => 'Milk choc' ),
				array( 'label' => 'Flavour', 'value' => 'Vanilla, Chocolate' ),
			),
		);
		if ( '' !== $format ) {
			$parts['labelFormat'] = $format;
		}
		return $parts;
	}

	public function test_the_default_keeps_the_labels(): void {
		$expected = array( 'Base: Classic oat · Chip: Milk choc · Flavour: Vanilla, Chocolate' );
		$this->assertSame( $expected, \SGS\Blocks\sgs_cart_line_summary_lines( $this->parts() ) );
		$this->assertSame( $expected, \SGS\Blocks\sgs_cart_line_summary_lines( $this->parts( 'labelled' ) ), 'naming the default changes nothing' );
		$this->assertSame( $expected, \SGS\Blocks\sgs_cart_line_summary_lines( $this->parts( 'anything else' ) ), 'an unknown format falls back to the labels' );
	}

	public function test_values_only_prints_the_values_joined_by_the_middle_dot(): void {
		$this->assertSame(
			array( 'Classic oat · Milk choc · Vanilla, Chocolate' ),
			\SGS\Blocks\sgs_cart_line_summary_lines( $this->parts( 'values' ) )
		);
	}

	public function test_values_only_ignores_the_label_separator(): void {
		$parts                   = $this->parts( 'values' );
		$parts['labelSeparator'] = ' = ';
		$this->assertSame( array( 'Classic oat · Milk choc · Vanilla, Chocolate' ), \SGS\Blocks\sgs_cart_line_summary_lines( $parts ) );
	}

	public function test_values_only_keeps_the_lead_and_the_add_on_line(): void {
		$parts         = $this->parts( 'values' );
		$parts['lead'] = 'Boxed';
		$this->assertSame( array( 'Boxed · Classic oat · Milk choc · Vanilla, Chocolate' ), \SGS\Blocks\sgs_cart_line_summary_lines( $parts ) );
		$parts['addons'] = array( 'Gift wrap' );
		$this->assertSame(
			array( 'Boxed · Gift wrap', 'Classic oat · Milk choc · Vanilla, Chocolate' ),
			\SGS\Blocks\sgs_cart_line_summary_lines( $parts )
		);
	}

	public function test_an_empty_value_is_still_skipped_in_values_only(): void {
		$parts                  = $this->parts( 'values' );
		$parts['attributes'][1] = array( 'label' => 'Chip', 'value' => '' );
		$this->assertSame( array( 'Classic oat · Vanilla, Chocolate' ), \SGS\Blocks\sgs_cart_line_summary_lines( $parts ) );
	}

	/**
	 * The wording the normaliser stores for this raw input, read in a child process with the WordPress stand-ins.
	 *
	 * @param array<string, mixed> $raw Raw wording.
	 */
	private function normalised( array $raw ): array {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgswording' );
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/cart-line-summary/wording.php', true ) . ';'
			. ' echo json_encode( SGS\Blocks\sgs_cart_line_summary_wording_normalise( ' . var_export( $raw, true ) . ' ) );'
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{' ) ), true );
		$this->assertIsArray( $decoded, 'the child process did not return JSON: ' . $out );
		return $decoded;
	}

	public function test_the_wording_stores_only_the_two_known_formats(): void {
		$this->assertSame( 'labelled', $this->normalised( array() )['labelFormat'], 'unset is the labelled default' );
		$this->assertSame( 'values', $this->normalised( array( 'labelFormat' => 'values' ) )['labelFormat'] );
		$this->assertSame( 'labelled', $this->normalised( array( 'labelFormat' => '<b>values</b>' ) )['labelFormat'], 'anything but the exact word is the default' );
	}
}
