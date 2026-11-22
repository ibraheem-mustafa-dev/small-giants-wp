<?php
/**
 * A cart line's Store API extension data says whether its product links a published choice flow
 * (`extensions.sgs.hasChoiceFlow`, includes/cart-item-extensions.php::sgs_cart_item_has_choice_flow), which the bag drawer
 * reads to offer its "finish configuring" link only on such a line (tests/js/cart-item-row-add-options.test.js).
 *
 * Runs the function in a child process with the WordPress stubs and a stand-in for the choice-flow resolver.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartItemChoiceFlowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartItemChoiceFlowTest extends TestCase {

	/**
	 * The function's answer for a cart line, with the product's `_sgs_choice_flow` meta and the published flows given.
	 *
	 * @param array<string, mixed> $cart_item The cart line.
	 * @param string               $meta      The product's `_sgs_choice_flow` value ('' for none).
	 * @param string[]             $published The flow slugs that resolve to a published flow.
	 */
	private function has_flow( array $cart_item, string $meta, array $published ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsflow' );
		$code   = '<?php namespace SGS\Blocks { class Sgs_Block_CPTs { public static $published = array();'
			. ' public static function resolve_choice_flow( string $slug ) { return in_array( $slug, self::$published, true ) ? new \stdClass() : null; } } }'
			. ' namespace { define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' $GLOBALS["sgs_qa_product"] = array( "id" => 42, "meta" => array( "_sgs_choice_flow" => ' . var_export( $meta, true ) . ' ) );'
			. ' \SGS\Blocks\Sgs_Block_CPTs::$published = ' . var_export( $published, true ) . ';'
			. ' require ' . var_export( $root . '/includes/cart-item-extensions.php', true ) . ';'
			. ' echo sgs_cart_item_has_choice_flow( ' . var_export( $cart_item, true ) . ' ) ? "yes" : "no"; }';
		file_put_contents( $script, $code );
		try {
			return trim( (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' ) );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_a_product_linking_a_published_flow_has_one(): void {
		$line = array(
			'product_id'   => 42,
			'variation_id' => 43,
		);
		$this->assertSame( 'yes', $this->has_flow( $line, 'lens-flow', array( 'lens-flow' ) ) );
	}

	public function test_no_link_an_unpublished_flow_or_no_product_has_none(): void {
		$this->assertSame( 'no', $this->has_flow( array( 'product_id' => 42 ), '', array( 'lens-flow' ) ), 'no link' );
		$this->assertSame( 'no', $this->has_flow( array( 'product_id' => 42 ), 'lens-flow', array() ), 'a link to a flow that is not published' );
		$this->assertSame( 'no', $this->has_flow( array(), 'lens-flow', array( 'lens-flow' ) ), 'a line with no product' );
	}
}
