<?php
/**
 * Tests: the spacing migration's move of saved flat padding and margin into the owned attributes
 * (scripts/lib/spacing-sweep.php, which the WP-CLI sweep scripts/sweep-spacing-attrs.php runs over saved content).
 *
 * The cases run the real functions in a child process. They pin the flat box becoming the desktop tier, the preset reference
 * becoming the same theme token, the owned value winning over a flat one, idempotence, that a block outside the named list keeps its
 * `style.spacing`, and that the bytes of a post outside a block delimiter's attributes stay as they were.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter SpacingSweepTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class SpacingSweepTest extends TestCase {

	/** @param array<string, array<string, mixed>> $cases @return array<string, mixed> */
	private static function run_cases( array $cases ): array {
		$file = tempnam( sys_get_temp_dir(), 'sgssp' );
		file_put_contents( $file, json_encode( $cases, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-spacing-sweep-standalone.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$start   = strpos( $out, '{' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) ) {
			throw new RuntimeException( 'runner failed: ' . $out );
		}
		return $decoded;
	}

	/** @return array<string, mixed> The sweep of one block's attributes. */
	private static function attrs( array $attrs ): array {
		return self::run_cases( array( 'c' => array( 'fn' => 'attrs', 'attrs' => $attrs ) ) )['c'];
	}

	public function test_a_flat_box_becomes_the_desktop_tier_and_the_old_key_goes(): void {
		$out = self::attrs(
			array(
				'style'   => array(
					'spacing' => array(
						'padding' => array( 'top' => '24px', 'bottom' => '2rem' ),
						'margin'  => array( 'left' => '0' ),
					),
				),
				'columns' => 3,
			)
		);
		$this->assertSame(
			array(
				'columns' => 3,
				'padding' => array( 'desktop' => array( 'top' => '24px', 'bottom' => '2rem' ) ),
				'margin'  => array( 'desktop' => array( 'left' => '0' ) ),
			),
			$out
		);
	}

	public function test_a_preset_reference_becomes_the_same_theme_token(): void {
		$out = self::attrs( array( 'style' => array( 'spacing' => array( 'padding' => array( 'top' => 'var:preset|spacing|40', 'left' => 'var:preset|spacing|2xl' ) ) ) ) );
		$this->assertSame( array( 'padding' => array( 'desktop' => array( 'top' => 'var(--wp--preset--spacing--40)', 'left' => 'var(--wp--preset--spacing--2xl)' ) ) ), $out );
	}

	public function test_other_spacing_keys_and_other_style_keys_stay(): void {
		$out = self::attrs(
			array(
				'style' => array(
					'spacing' => array( 'blockGap' => '1rem', 'padding' => array( 'top' => '8px' ) ),
					'border'  => array( 'radius' => '4px' ),
				),
			)
		);
		$this->assertSame(
			array(
				'style'   => array(
					'spacing' => array( 'blockGap' => '1rem' ),
					'border'  => array( 'radius' => '4px' ),
				),
				'padding' => array( 'desktop' => array( 'top' => '8px' ) ),
			),
			$out
		);
	}

	public function test_an_owned_desktop_value_wins_and_the_flat_box_is_dropped(): void {
		$out = self::attrs(
			array(
				'padding' => array( 'desktop' => array( 'top' => '10px' ), 'tablet' => array( 'top' => '6px' ) ),
				'style'   => array( 'spacing' => array( 'padding' => array( 'top' => '99px' ) ) ),
			)
		);
		$this->assertSame( array( 'padding' => array( 'desktop' => array( 'top' => '10px' ), 'tablet' => array( 'top' => '6px' ) ) ), $out );
	}

	public function test_a_flat_box_joins_an_owned_object_that_has_only_other_tiers(): void {
		$out = self::attrs(
			array(
				'padding' => array( 'mobile' => array( 'top' => '4px' ) ),
				'style'   => array( 'spacing' => array( 'padding' => array( 'top' => '20px' ) ) ),
			)
		);
		$this->assertSame( array( 'padding' => array( 'mobile' => array( 'top' => '4px' ), 'desktop' => array( 'top' => '20px' ) ) ), $out );
	}

	public function test_a_second_run_changes_nothing(): void {
		$once  = self::attrs( array( 'style' => array( 'spacing' => array( 'margin' => array( 'top' => 'var:preset|spacing|30' ) ) ) ) );
		$twice = self::attrs( $once );
		$this->assertSame( $once, $twice );
		$this->assertSame( array( 'columns' => 2 ), self::attrs( array( 'columns' => 2 ) ), 'a block with no flat box is returned as it came' );
	}

	public function test_content_rewrites_named_blocks_only_and_leaves_every_other_byte(): void {
		$flat    = '{"style":{"spacing":{"padding":{"top":"var:preset|spacing|40"}}},"columns":3}';
		$content = "<p>before</p>\n<!-- wp:sgs/card-grid {$flat} -->\n<div class=\"x\">kept</div>\n<!-- /wp:sgs/card-grid -->\n"
			. "<!-- wp:sgs/text {$flat} /-->\n<!-- wp:group {$flat} -->\n<div>g</div>\n<!-- /wp:group -->\n";
		$result  = self::run_cases( array( 'c' => array( 'fn' => 'content', 'content' => $content, 'blocks' => array( 'sgs/card-grid' ) ) ) )['c'];
		$this->assertSame( array( 'sgs/card-grid' => 1 ), $result['changed'] );
		$this->assertSame( array( 'sgs/card-grid::padding' => 1 ), $result['attrs'] );
		// WordPress writes a double hyphen inside a block comment as \u002d\u002d; it reads back as the theme token.
		$this->assertStringContainsString( '"padding":{"desktop":{"top":"var(\u002d\u002dwp\u002d\u002dpreset\u002d\u002dspacing\u002d\u002d40)"}}', $result['content'] );
		$this->assertStringContainsString( "<!-- wp:sgs/text {$flat} /-->", $result['content'], 'a block outside the list keeps its flat box' );
		$this->assertStringContainsString( "<!-- wp:group {$flat} -->", $result['content'], 'a core block keeps its flat box' );
		$this->assertStringContainsString( "<p>before</p>\n<!-- wp:sgs/card-grid ", $result['content'] );
		$this->assertStringContainsString( "<div class=\"x\">kept</div>\n<!-- /wp:sgs/card-grid -->", $result['content'] );
	}

	public function test_the_sweep_script_is_a_dry_run_unless_told_to_apply(): void {
		$script = file_get_contents( dirname( __DIR__, 2 ) . '/scripts/sweep-spacing-attrs.php' );
		$this->assertStringContainsString( "in_array( 'apply', \$words, true )", $script );
		$this->assertStringContainsString( 'Dry run by default', $script );
	}
}
