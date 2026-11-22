<?php
/**
 * The built-in button kit's `float` group: includes/helpers-button-style.php::sgs_button_kit_css prints a part's position and edge
 * offsets per device (a carousel arrow set beside a heading), refuses a position outside its list, and prints nothing when unset.
 *
 * Every test runs the real helpers in a child process, as the plugin loads them.
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ButtonKitFloatTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ButtonKitFloatTest extends TestCase {

	/**
	 * The kit's CSS for one attribute set on the prefix `arrow`, in a child process.
	 *
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return string
	 */
	private function kit( array $attrs ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = (string) tempnam( sys_get_temp_dir(), 'sgskit' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_VERSION', 't' );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. 'echo sgs_button_kit_css( ' . var_export( $attrs, true ) . ", 'arrow', '.u.u .arrow', array() );"
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	/** Negative control: nothing set, nothing printed for the float group. */
	public function test_unset_prints_no_position_or_offsets(): void {
		$css = $this->kit( array( 'arrowColourBackground' => '#fff' ) );
		$this->assertStringNotContainsString( 'position:', $css );
		$this->assertStringNotContainsString( 'top:', $css );
	}

	/** MUST FAIL before the group: the position and offsets were not settings. */
	public function test_position_and_offsets_print_per_device(): void {
		$css = $this->kit(
			array(
				'arrowPosition'   => array( 'desktop' => 'absolute', 'mobile' => 'static' ),
				'arrowInsetTop'   => array( 'desktop' => '-80px', 'mobile' => 'auto' ),
				'arrowInsetRight' => array( 'desktop' => '62px' ),
			)
		);
		$this->assertStringContainsString( '.u.u .arrow{position:absolute;top:-80px;right:62px;}', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767\.98px[^{]*\{\.u\.u \.arrow\{position:static;top:auto;\}\}/', $css );
	}

	public function test_a_position_outside_the_list_and_an_unsafe_offset_print_nothing(): void {
		$css = $this->kit(
			array(
				'arrowPosition'  => array( 'desktop' => 'fixed' ),
				'arrowInsetLeft' => array( 'desktop' => '4px;color:red' ),
			)
		);
		$this->assertStringNotContainsString( 'fixed', $css );
		$this->assertStringNotContainsString( 'color:red', $css );
	}
}
