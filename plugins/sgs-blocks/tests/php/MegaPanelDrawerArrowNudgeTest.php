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
		// "last" skips the whole-card link overlay the card appends after its slots
		$this->assertStringContainsString( '.aside > :nth-last-child(1 of :not(.sgs-block-link-overlay)):not(.wp-block-sgs-container) .sgs-button__icon', $css );
		$this->assertStringContainsString( ' > .sgs-container__inner > :last-child .sgs-button__icon', $css );
		$this->assertMatchesRegularExpression( '/\.aside > :nth-last-child[^{]*\.sgs-button__icon[^{]*\{transition:transform 300ms/', $css );
		$this->assertMatchesRegularExpression( '/\.aside:hover > :nth-last-child[^{]*\.sgs-button__icon[^{]*\{transform:translateX\(4px\)\}/', $css );
		$this->assertStringNotContainsString( '.aside > .sgs-button:last-child', $css, 'negative control: a bare :last-child never matches a card with a link overlay' );
		$this->assertStringNotContainsString( ':nth-child(5)', $css, 'the transition no longer depends on the link being the fifth slot' );
	}

	public function test_the_round_link_button_holds_still_while_its_arrow_slides(): void {
		$css = $this->css( array( 'drawerCardLinkShiftHover' => 4 ) );
		// every moved selector ends at the icon: a round arrow button's circle never moves, only the arrow inside it
		preg_match_all( '/([^{}]+)\{transform:translateX\(4px\)\}/', $css, $m );
		$this->assertNotEmpty( $m[1] );
		foreach ( explode( ',', implode( ',', $m[1] ) ) as $selector ) {
			$this->assertStringEndsWith( '.sgs-button__icon', trim( $selector ) );
		}
	}

	public function test_no_nudge_prints_nothing(): void {
		$this->assertSame( '', trim( $this->css( array() ) ) );
	}
}
