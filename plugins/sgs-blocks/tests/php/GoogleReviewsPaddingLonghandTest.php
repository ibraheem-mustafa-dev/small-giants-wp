<?php
/**
 * Tests: sgs/google-reviews prints padding as the sides the client set (CR6, P2-d).
 *
 * A padding shorthand fills every unset side with 0, so a client who sets only the top padding wiped the
 * stylesheet's other sides, and a mobile tier setting one side wiped the tablet's other sides. The block's tier
 * engine now prints one longhand per side a tier itself sets. Border width and radius keep their shorthand.
 *
 * Renders the real block in a child process and reads the rule for the review card (`cardPadding`).
 *
 * Run with:
 *   vendor/bin/phpunit --filter GoogleReviewsPaddingLonghandTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * The review card's padding rule, rendered through the real block.
 */
final class GoogleReviewsPaddingLonghandTest extends TestCase {

	/**
	 * Render the real block and return the generated CSS.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @return string The block's scoped CSS.
	 */
	private function css( array $attrs ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/google-reviews-render-prepend.php';
		$attrs  += array(
			'placeId'    => 'ChIJtestplace',
			'dataSource' => 'inline',
			'reviews'    => array(
				array(
					'author' => 'A',
					'text'   => 'Body.',
					'rating' => 5,
				),
			),
		);
		$file    = tempnam( sys_get_temp_dir(), 'sgspl' );
		file_put_contents( $file, json_encode( $attrs, JSON_THROW_ON_ERROR ) );
		putenv( 'SGS_GR_TEST_MODE=live' );
		putenv( 'SGS_GR_TEST_SETTINGS_PLACE=' );
		try {
			$cmd = escapeshellarg( PHP_BINARY )
				. ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' ' . escapeshellarg( $harness )
				. ' --slug sgs/google-reviews --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_GR_TEST_MODE' );
			putenv( 'SGS_GR_TEST_SETTINGS_PLACE' );
			unlink( $file );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'the harness must print one JSON object, got: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php must not fatal: ' . ( $decoded['error'] ?? $out ) );
		return (string) ( $decoded['css'] ?? '' );
	}

	/**
	 * Every declaration block written for the review card's own selector, in source order.
	 *
	 * @param string $css Scoped CSS.
	 * @return string[] The text between the braces, with any @media wrapper marked `tablet:` or `mobile:`.
	 */
	private function card_blocks( string $css ): array {
		$blocks = array();
		preg_match_all( '/(@media[^{]*\{)?\s*[^{}@]*\.sgs-google-reviews__review\{([^}]*)\}/', $css, $m, PREG_SET_ORDER );
		foreach ( $m as $hit ) {
			$tier     = '' === $hit[1] ? '' : ( str_contains( $hit[1], '767' ) ? 'mobile:' : 'tablet:' );
			$blocks[] = $tier . $hit[2];
		}
		return $blocks;
	}

	/**
	 * Boxes and the padding declarations the desktop rule must carry.
	 *
	 * @return array<string, array{0: array<string, mixed>, 1: string}> cardPadding value, expected desktop padding text.
	 */
	public static function boxes(): array {
		return array(
			'one side'  => array( array( 'desktop' => array( 'top' => '12px' ) ), 'padding-top:12px;' ),
			'all four'  => array(
				array(
					'desktop' => array(
						'top'    => '1px',
						'right'  => '2px',
						'bottom' => '3px',
						'left'   => '4px',
					),
				),
				'padding-top:1px;padding-right:2px;padding-bottom:3px;padding-left:4px;',
			),
			'none'      => array( array(), '' ),
		);
	}

	/**
	 * One side prints one longhand, four sides four, none prints no padding declaration at all.
	 *
	 * @param array<string, mixed> $value    cardPadding attribute.
	 * @param string               $expected Expected padding text inside the card rule.
	 */
	#[DataProvider( 'boxes' )]
	public function test_desktop_padding_prints_only_the_set_sides( array $value, string $expected ): void {
		$css = $this->css( array( 'cardPadding' => $value ) );
		$this->assertStringNotContainsString( 'padding:padding', $css, 'a longhand block must never be joined to a property name' );
		$padding = implode( '', array_filter( $this->card_blocks( $css ), static fn( $b ) => str_contains( $b, 'padding' ) ) );
		if ( '' === $expected ) {
			$this->assertSame( '', $padding, 'an empty box writes no padding declaration' );
			$this->assertStringNotContainsString( 'padding:', $css );
			return;
		}
		$this->assertSame( $expected, $padding );
		$this->assertStringNotContainsString( 'padding:', $css, 'no padding shorthand may be written' );
	}

	/**
	 * A mobile tier that sets one side writes that one side only; the tablet's other sides survive by the cascade.
	 */
	public function test_a_narrow_tier_writes_only_the_side_it_sets(): void {
		$css    = $this->css(
			array(
				'cardPadding' => array(
					'desktop' => array(
						'top'  => '10px',
						'left' => '10px',
					),
					'tablet'  => array( 'top' => '20px' ),
					'mobile'  => array( 'bottom' => '30px' ),
				),
			)
		);
		$blocks = $this->card_blocks( $css );
		$this->assertSame(
			array( 'padding-top:10px;padding-left:10px;', 'tablet:padding-top:20px;', 'mobile:padding-bottom:30px;' ),
			array_values( array_unique( $blocks ) )
		);
	}

	/**
	 * A tier that sets the value the tier above already resolves to writes nothing.
	 */
	public function test_a_repeated_value_is_not_written_again(): void {
		$css    = $this->css(
			array(
				'cardPadding' => array(
					'desktop' => array( 'top' => '10px' ),
					'tablet'  => array( 'top' => '10px' ),
				),
			)
		);
		$this->assertSame( array( 'padding-top:10px;' ), array_values( array_unique( $this->card_blocks( $css ) ) ) );
	}

	/**
	 * Border width keeps the shorthand with unset sides at 0 (its style is written for all four sides).
	 */
	public function test_border_width_stays_on_the_shorthand(): void {
		$css = $this->css( array( 'cardBorderWidth' => array( 'desktop' => array( 'top' => '2px' ) ) ) );
		$this->assertStringContainsString( 'border-width:2px 0 0 0;', $css );
	}
}
