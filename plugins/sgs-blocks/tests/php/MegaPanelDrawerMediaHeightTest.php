<?php
/**
 * Tests: the drawer aside card's fill photo takes a fixed height per device (`drawerCardMediaHeight`) in place of the
 * ratio rule, and keeps the ratio rule when no tier is set.
 *
 * Runs sgs_mega_panel_drawer_media_css() (includes/mega-panel-drawer-extras-css.php) in a child process.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class MegaPanelDrawerMediaHeightTest extends TestCase {

	/**
	 * The media CSS for these attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function css( array $attributes ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsmh' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' foreach ( glob( ' . var_export( $root . '/includes/helpers-*.php', true ) . ' ) as $f ) { require_once $f; }'
			. ' require_once ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' require_once ' . var_export( $root . '/includes/mega-panel-drawer-extras-css.php', true ) . ';'
			. ' echo sgs_mega_panel_drawer_media_css( ' . var_export( $attributes, true ) . ', ".aside" );';
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_tablet_and_mobile_heights_print_with_ratio_auto(): void {
		$css = $this->css( array( 'drawerCardMediaHeight' => array( 'tablet' => '170px', 'mobile' => '150px' ) ) );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{\.aside \.sgs-media-box--fill\{height:170px;aspect-ratio:auto;max-height:none;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media[^{]*767[^{]*\{\.aside \.sgs-media-box--fill\{height:150px;\}\}/', $css, 'mobile inherits the tablet tier ratio auto and cap lift' );
		$this->assertStringContainsString( 'aspect-ratio:2 / 1;max-height:170px;', $css, 'the ratio rule stays as the base for any tier left unset' );
	}

	public function test_a_bare_number_takes_px(): void {
		$css = $this->css( array( 'drawerCardMediaHeight' => array( 'mobile' => 150 ) ) );
		$this->assertStringContainsString( 'height:150px;aspect-ratio:auto;max-height:none;', $css );
	}

	public function test_unset_prints_only_the_ratio_rule(): void {
		$expected = '.aside .sgs-media-box--fill{width:100%;height:auto;aspect-ratio:2 / 1;max-height:170px;}';
		$this->assertSame( $expected, $this->css( array() ) );
		$this->assertSame( $expected, $this->css( array( 'drawerCardMediaHeight' => array() ) ) );
	}

	public function test_an_unsafe_value_prints_nothing_extra(): void {
		$css = $this->css( array( 'drawerCardMediaHeight' => array( 'mobile' => '150px;}body{x:y' ) ) );
		$this->assertStringNotContainsString( 'aspect-ratio:auto', $css );
		$this->assertStringNotContainsString( 'body{', $css );
	}
}
