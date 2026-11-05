<?php
/**
 * The cart trigger's accessible name carries the visible pill word whenever any tier shows the pill (WCAG 2.5.3),
 * not only when the pill is mixed with the icon style.
 *
 * Runs the real src/blocks/cart/render.php through the QA harness with an opt-in WooCommerce presence stub.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartPillAccessibleNameTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartPillAccessibleNameTest extends TestCase {

	/**
	 * The trigger's aria-label for a cart rendered with these attributes.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 */
	private function trigger_name( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgscn' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/cart --attrs-file ' . escapeshellarg( $file )
				. ' --context-file ' . escapeshellarg( $file ) . ' --global-settings-file ' . escapeshellarg( $file ) . ' --stub-woocommerce 2>&1'
			);
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$start   = strpos( $out, '{"ok"' ); // The render may print a PHP warning ahead of the JSON.
		$decoded = json_decode( false === $start ? $out : substr( $out, $start ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed' );
		$this->assertSame( 1, preg_match( '/class="sgs-cart__trigger"[^>]*aria-label="([^"]*)"/', (string) $decoded['html'], $m ), 'trigger has an aria-label' );
		return html_entity_decode( $m[1] );
	}

	public function test_uniform_pill_name_contains_the_visible_word(): void {
		$name = $this->trigger_name( array( 'ariaLabel' => 'Open bag', 'pillLabel' => 'Basket', 'triggerStyle' => 'pill' ) );
		$this->assertSame( 'Basket 0 items, open bag', $name );
	}

	public function test_a_name_that_already_has_the_word_is_unchanged(): void {
		$this->assertSame( 'Basket 0 items, open basket', $this->trigger_name( array( 'ariaLabel' => 'Open basket', 'pillLabel' => 'Basket', 'triggerStyle' => 'pill' ) ) );
	}

	public function test_icon_only_cart_name_is_unchanged(): void {
		$this->assertSame( 'Open bag (0 items in cart)', $this->trigger_name( array( 'ariaLabel' => 'Open bag', 'pillLabel' => 'Basket' ) ) );
	}

	/** The widget carries the singular and plural templates view.js fills the count into (tests/js/cart-trigger-label.test.js reads the same strings). */
	public function test_widget_prints_the_label_templates(): void {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgscn' );
		file_put_contents( $file, json_encode( (object) array( 'ariaLabel' => 'Open bag', 'pillLabel' => 'Bag', 'triggerStyle' => 'pill' ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/cart --attrs-file ' . escapeshellarg( $file ) . ' --context-file ' . escapeshellarg( $file ) . ' --global-settings-file ' . escapeshellarg( $file ) . ' --stub-woocommerce 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{"ok"' ) ), true );
		$this->assertStringContainsString( 'data-label-one="Bag {count} item, open bag"', (string) $decoded['html'] );
		$this->assertStringContainsString( 'data-label-other="Bag {count} items, open bag"', (string) $decoded['html'] );
	}

	/** Negative control: an icon-only cart prints no templates and keeps its name. */
	public function test_icon_only_prints_no_templates(): void {
		$this->assertSame( 'Open bag (0 items in cart)', $this->trigger_name( array( 'ariaLabel' => 'Open bag', 'pillLabel' => 'Basket' ) ) );
	}

	/** The word and the count are separated by a space text node, so the visible text reads "Basket 0" (WCAG 2.5.3). */
	public function test_pill_word_and_count_are_separated(): void {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgscn' );
		file_put_contents( $file, json_encode( (object) array( 'pillLabel' => 'Basket', 'triggerStyle' => 'pill' ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/cart --attrs-file ' . escapeshellarg( $file ) . ' --context-file ' . escapeshellarg( $file ) . ' --global-settings-file ' . escapeshellarg( $file ) . ' --stub-woocommerce 2>&1' );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{"ok"' ) ), true );
		$this->assertStringContainsString( 'Basket</span> <span class="sgs-cart__badge', (string) $decoded['html'] );
	}
}
