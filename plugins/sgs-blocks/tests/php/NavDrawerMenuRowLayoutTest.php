<?php
/**
 * sgs/nav-drawer-menu row layout: the whole-row accordion toggle keeps its label at the start beside the number
 * ornament (the stylesheet gives the caret the free space, as a link row's trailing icon has), and a set
 * `justifyContent` spreads both link and toggle rows and cancels the caret's auto margin.
 *
 * Runs sgs_nav_drawer_menu_row_layout_css() (includes/nav-drawer-menu-section-css.php) in a child process, and reads
 * the block stylesheet for the default.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter NavDrawerMenuRowLayoutTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class NavDrawerMenuRowLayoutTest extends TestCase {

	/**
	 * The row layout CSS for these attributes, from a child process with the section helpers loaded.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function css( array $attributes ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsrl' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/nav-drawer-menu-section-css.php', true ) . ';'
			. ' echo sgs_nav_drawer_menu_row_layout_css( ' . var_export( $attributes, true ) . ', ".x" );';
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_the_toggle_row_keeps_its_label_at_the_start_by_default(): void {
		$style = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer-menu/style.css' );
		$this->assertMatchesRegularExpression( '/\.sgs-nav-drawer-menu__accordion-summary--row \{[^}]*justify-content: flex-start;/', $style );
		$this->assertMatchesRegularExpression( '/\.sgs-nav-drawer-menu__accordion-summary--row > \.sgs-nav-drawer-menu__caret \{\s*margin-inline-start: auto;/', $style );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-nav-drawer-menu__accordion-summary--row \{[^}]*justify-content: space-between;/', $style, 'negative control: space-between centres the label of a three-child row' );
		$this->assertSame( '', $this->css( array() ), 'unset prints nothing' );
	}

	public function test_a_set_spread_reaches_both_row_kinds_and_cancels_the_caret_margin(): void {
		$css = $this->css( array( 'justifyContent' => 'center' ) );
		$this->assertStringContainsString( '.x .sgs-nav-drawer-menu__link{justify-content:center;}', $css );
		$this->assertStringContainsString( '.x .sgs-nav-drawer-menu__accordion-summary--row > .sgs-nav-drawer-menu__caret{margin-inline-start:0;}', $css );
		$this->assertSame( '', $this->css( array( 'justifyContent' => 'bogus' ) ), 'an unlisted value prints nothing' );
	}
}
