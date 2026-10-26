<?php
/**
 * Every font weight a block prints is allowlisted (includes/helpers-css-safety.php::sgs_font_weight_value): the
 * editor's weights 100 to 900 and the keywords normal, bold, lighter and bolder print; anything else prints no
 * font-weight at all, never a stripped remainder ("7;0 0" is not 700) or an escaped breakout. One case per
 * mechanism the gate scripts/check-font-weight-allowlist.py found stripping or only escaping: the shared
 * typography rule (sgs/text), the shared button-element helper (sgs/choice-flow's Back button), the first letter
 * (sgs/text) and the nav menu's hover typography (sgs/nav-bar-menu).
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter FontWeightAllowlistTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class FontWeightAllowlistTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function weights(): array {
		return array(
			'seven hundred'  => array( '700', 'font-weight:700' ),
			'bold keyword'   => array( 'bold', 'font-weight:bold' ),
			'stripped junk'  => array( '7;0 0', '' ),
			'a word'         => array( 'heavy', '' ),
			'variable font'  => array( '450', 'font-weight:450' ),
			'off the scale'  => array( '1001', '' ),
			'a breakout'     => array( '700;color:red', '' ),
		);
	}

	/**
	 * The block and attributes that print a weight through each mechanism, and the selector it lands on.
	 *
	 * @return array<string, array{0: string, 1: callable(string): array<string, mixed>, 2: string}>
	 */
	private static function mechanisms(): array {
		return array(
			'typography rule' => array( 'sgs/text', static fn ( $w ) => array( 'text' => 'Fresh bread', 'fontWeight' => $w ), '' ),
			'button helper'   => array( 'sgs/choice-flow', static fn ( $w ) => array( 'backBorderStyle' => 'dashed', 'backBorderWidth' => array( 'top' => '2px' ), 'backFontWeight' => $w ), 'sgs-choice-flow__nav-back' ),
			'first letter'    => array( 'sgs/text', static fn ( $w ) => array( 'text' => 'Fresh bread', 'dropCap' => true, 'firstLetterFontWeight' => $w ), '::first-letter' ),
			'nav hover'       => array( 'sgs/nav-bar-menu', static fn ( $w ) => array( 'itemFontWeightHover' => $w ), ':hover' ),
		);
	}

	/**
	 * @return array<string, array{0: string, 1: string, 2: string}>
	 */
	public static function cases(): array {
		$out = array();
		foreach ( array_keys( self::mechanisms() ) as $mechanism ) {
			foreach ( self::weights() as $name => list( $weight, $expected ) ) {
				$out[ "$mechanism, $name" ] = array( $mechanism, $weight, $expected );
			}
		}
		return $out;
	}

	/**
	 * @dataProvider cases
	 */
	public function test_only_an_allowlisted_weight_prints( string $mechanism, string $weight, string $expected ): void {
		list( $slug, $attrs, $anchor ) = self::mechanisms()[ $mechanism ];
		$css                            = 'sgs/nav-bar-menu' === $slug ? $this->nav_hover_css( $attrs( $weight ) ) : $this->render_block( $slug, $attrs( $weight ) )['css'];
		$this->assertStringContainsString( $anchor, $css, 'positive control: the mechanism printed its rule' );

		// The weight declarations that come from this attribute: any font-weight carrying the given value's
		// characters, or (for a rejected value) any remainder a strip would leave.
		if ( '' !== $expected ) {
			$this->assertMatchesRegularExpression( '/' . preg_quote( $expected, '/' ) . '[;}]/', $css );
			return;
		}
		$stripped = preg_replace( '/[^a-z0-9]/i', '', $weight );
		$this->assertDoesNotMatchRegularExpression( '/font-weight:\s*' . preg_quote( $stripped, '/' ) . '\b/', $css, 'no stripped remainder' );
		$this->assertStringNotContainsString( 'color:red', $css, 'no breakout' );
		$this->assertStringNotContainsString( 'font-weight:' . $weight, $css, 'not printed as given' );
	}

	/**
	 * Run nav-bar-menu's sgs_nav_shared_typography_hover_rule() in a child process (render.php defines it, and the
	 * full render needs a real menu the QA harness does not have), with a text decoration beside the weight so the
	 * rule prints whatever the weight does.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 */
	private function nav_hover_css( array $attrs ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = tempnam( sys_get_temp_dir(), 'sgsfw' );
		$attrs += array( 'itemTextDecorationHover' => 'underline' );
		file_put_contents(
			$script,
			"<?php
define( 'ABSPATH', " . var_export( $root, true ) . " );
define( 'SGS_BLOCKS_PATH', ABSPATH );
" // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- builds the child script.
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';
require ABSPATH . 'includes/render-helpers.php';
"
			. '$attributes = array(); $content = ""; $block = null;
ob_start();
try { include ABSPATH . "src/blocks/nav-bar-menu/render.php"; } catch ( \Throwable $e ) {}
ob_end_clean();
'
			. 'echo sgs_nav_shared_typography_hover_rule( json_decode( ' . var_export( json_encode( $attrs ), true ) . ", true ), 'item', '.u .sgs-nav-bar-menu__link' );
" // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- builds the child script.
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		return $out;
	}

	public function test_the_helper_allowlist(): void {
		foreach ( array( '100', '400', '900', 'normal', 'bold', 'lighter', 'bolder', ' BOLD ' ) as $ok ) {
			$this->assertSame( strtolower( trim( $ok ) ), sgs_font_weight_value( $ok ), $ok );
		}
		$this->assertSame( '700', sgs_font_weight_value( 700 ), 'a stored number' );
		foreach ( array( '450', '650.5', '950', '1000', '1', 'inherit' ) as $ok ) {
			$this->assertSame( $ok, sgs_font_weight_value( $ok ), 'a CSS weight a draft can carry: ' . $ok );
		}
		foreach ( array( '', '0', '0.5', '1001', '1e3', '-400', 'heavy', '7;0 0', '700;color:red', null ) as $bad ) {
			$this->assertSame( '', sgs_font_weight_value( $bad ), var_export( $bad, true ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- assertion message.
		}
		$this->assertSame( '', sgs_font_weight_value( array( '700' ) ), 'an array is not a weight' );
	}
}
