<?php
/**
 * Tests: the nav drawer dialog announces itself as a modal dialog (role, aria-modal, accessible name), and the
 * testimonial slider's dots carry unique labels that say where they sit in the set.
 *
 * Renders the REAL render.php files through the QA harness in a child process (the harness applies no
 * block.json defaults, so each test passes exactly the attributes it means to).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class NavDrawerSliderA11yTest extends TestCase {

	/**
	 * Render a block and return its HTML.
	 *
	 * @param string                           $slug  Block slug.
	 * @param array<string, mixed>             $attrs Block attributes.
	 * @param array<int, array<string, mixed>> $inner Inner blocks: {name, attributes, html}.
	 * @return string
	 */
	private function html( string $slug, array $attrs, array $inner = array() ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = tempnam( sys_get_temp_dir(), 'sgsa1' );
		$inner_f = tempnam( sys_get_temp_dir(), 'sgsa2' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		file_put_contents( $inner_f, json_encode( $inner, JSON_THROW_ON_ERROR ) );

		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' ' . escapeshellarg( $harness )
				. ' --slug ' . escapeshellarg( $slug )
				. ' --attrs-file ' . escapeshellarg( $file )
				. ' --inner-blocks-file ' . escapeshellarg( $inner_f ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
			@unlink( $inner_f ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}

		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	/**
	 * The drawer's opening <dialog> tag.
	 *
	 * @param array<string, mixed> $attrs Drawer attributes.
	 * @return string
	 */
	private function dialog_tag( array $attrs ): string {
		$html = $this->html( 'sgs/nav-drawer', $attrs + array( 'drawerAlign' => 'left', 'submenuModel' => 'accordion' ) );
		$this->assertSame( 1, preg_match( '/<dialog\b[^>]*>/', $html, $m ), 'the drawer dialog renders' );
		return $m[0];
	}

	public function test_a_modal_drawer_is_a_named_modal_dialog(): void {
		$tag = $this->dialog_tag( array() );
		$this->assertStringContainsString( ' role="dialog"', $tag );
		$this->assertStringContainsString( ' aria-modal="true"', $tag );
		$this->assertMatchesRegularExpression( '/ aria-label="[^"]+"/', $tag, 'an accessible name' );
	}

	public function test_a_non_modal_drawer_does_not_claim_to_be_modal(): void {
		$tag = $this->dialog_tag( array( 'modality' => 'non-modal' ) );
		$this->assertStringContainsString( ' role="dialog"', $tag );
		$this->assertStringContainsString( ' aria-modal="false"', $tag );
	}

	public function test_the_operators_drawer_name_wins(): void {
		$this->assertStringContainsString( ' aria-label="Shop menu"', $this->dialog_tag( array( 'ariaLabel' => 'Shop menu' ) ) );
	}

	public function test_slider_dots_have_unique_labels_and_real_targets(): void {
		$inner = array();
		for ( $i = 1; $i <= 5; $i++ ) {
			$inner[] = array(
				'name'       => 'sgs/testimonial',
				'attributes' => array( 'name' => 'Person ' . $i ),
				'html'       => '<div class="sgs-testimonial">Quote ' . $i . '</div>',
			);
		}
		$html = $this->html( 'sgs/testimonial-slider', array( 'showDots' => true ), $inner );

		preg_match_all( '/<button id="[^"]+" class="sgs-testimonial-slider__dot[^"]*" aria-current="[^"]+" aria-controls="([^"]+)" aria-label="([^"]+)"/', $html, $m );
		$this->assertCount( 5, $m[2], 'one dot per testimonial' );
		$this->assertSame( 5, count( array_unique( $m[2] ) ), 'every dot label is unique' );
		$this->assertSame( 'Go to testimonial 2 of 5', $m[2][1] );
		foreach ( $m[1] as $controls_id ) {
			$this->assertStringContainsString( 'id="' . $controls_id . '"', $html, 'aria-controls points at a real slide id' );
		}
	}
}
