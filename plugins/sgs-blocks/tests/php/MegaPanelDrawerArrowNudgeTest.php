<?php
/**
 * Tests: the drawer card's arrow nudge (`drawerCardLinkShiftHover`) transitions exactly the elements its hover moves,
 * so the arrow glides instead of jumping: a round link button that is the card's last slot moves as a whole, a link
 * with a label moves its icon. With no nudge nothing is printed.
 *
 * Runs sgs_mega_panel_drawer_hover_css() (includes/mega-panel-drawer-extras-css.php) in a child process.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class MegaPanelDrawerArrowNudgeTest extends TestCase {

	/**
	 * The hover CSS for these attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function css( array $attributes ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsmn' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' foreach ( glob( ' . var_export( $root . '/includes/helpers-*.php', true ) . ' ) as $f ) { require_once $f; }'
			. ' require_once ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' require_once ' . var_export( $root . '/includes/mega-panel-drawer-extras-css.php', true ) . ';'
			. ' echo sgs_mega_panel_drawer_hover_css( ' . var_export( $attributes, true ) . ', ".row", ".aside" );';
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_the_nudge_transitions_the_elements_it_moves(): void {
		$css = $this->css( array( 'drawerCardLinkShiftHover' => 4 ) );
		$this->assertStringContainsString( '.aside > .sgs-button:last-child,.aside > :last-child:not(.sgs-button) .sgs-button__icon', $css );
		$this->assertMatchesRegularExpression( '/\.aside > \.sgs-button:last-child,[^{]*\{transition:transform 300ms/', $css );
		$this->assertMatchesRegularExpression( '/\.aside:hover > \.sgs-button:last-child,[^{]*\{transform:translateX\(4px\)\}/', $css );
		$this->assertStringNotContainsString( ':nth-child(5)', $css, 'the transition no longer depends on the link being the fifth slot' );
	}

	public function test_no_nudge_prints_nothing(): void {
		$this->assertSame( '', trim( $this->css( array() ) ) );
	}
}
