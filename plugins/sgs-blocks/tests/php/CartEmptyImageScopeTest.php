<?php
/**
 * Tests: the basket drawer's empty-state picture prints its sizing rule on the picture's own scope class, never on the
 * block's, which is also the drawer dialog's class (a Width of 120px once made the whole drawer 120px wide).
 *
 * Runs the REAL src/blocks/cart/render.php through the QA harness in a child PHP process.
 *
 * Run with: vendor/bin/phpunit --filter CartEmptyImageScopeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartEmptyImageScopeTest extends TestCase {

	/**
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return array{html:string,css:string}
	 */
	private function render( array $attrs ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsce' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec(
				escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( __DIR__ . '/stubs/wc-active-stub.php' ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/cart --attrs-file ' . escapeshellarg( $file )
				. ' --context-file ' . escapeshellarg( $file ) . ' --global-settings-file ' . escapeshellarg( $file ) . ' --stub-woocommerce 2>&1'
			);
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{"ok"' ) ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . $out );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	/** @return array<string, mixed> */
	private function attrs(): array {
		return array(
			'displayMode'       => 'drawer',
			'emptyImageSource'  => array(
				'desktop' => array(
					'kind'   => 'image',
					'id'     => 0,
					'url'    => 'https://example.test/u/empty.png',
					'width'  => 300,
					'height' => 150,
				),
			),
			'emptyImageWidth'   => array( 'desktop' => '120px' ),
			'emptyImageMaxWidth' => array( 'desktop' => '200px' ),
		);
	}

	public function test_the_pictures_width_rule_targets_the_picture_not_the_drawer(): void {
		$out = $this->render( $this->attrs() );
		$this->assertMatchesRegularExpression( '/class="sgs-cart[^"]*\b(sgs-cart-[0-9a-f]{8})\b/', $out['html'], 'the block root carries its uid' );
		preg_match( '/class="sgs-cart[^"]*\b(sgs-cart-[0-9a-f]{8})\b/', $out['html'], $m );
		$uid = $m[1];
		$this->assertStringContainsString( 'sgs-cart__panel-empty-media', $out['html'], 'the picture prints in the empty state' );
		$this->assertStringContainsString( 'width:120px', str_replace( ' ', '', $out['css'] ), 'the width setting prints a rule' );
		preg_match_all( '/([^{}]+)\{[^}]*\bwidth\s*:\s*120px[^}]*\}/', $out['css'], $rules );
		$this->assertNotEmpty( $rules[1] );
		foreach ( $rules[1] as $selector ) {
			$this->assertStringContainsString( $uid . '-empty', $selector, "the 120px rule `$selector` targets the picture's own class" );
			$this->assertDoesNotMatchRegularExpression( '/\.' . preg_quote( $uid, '/' ) . '(?![\w-])/', $selector, "the 120px rule `$selector` never names the block's scope class" );
		}
		$this->assertStringContainsString( 'class="sgs-cart__panel-empty-media"', $out['html'] );
	}
}
