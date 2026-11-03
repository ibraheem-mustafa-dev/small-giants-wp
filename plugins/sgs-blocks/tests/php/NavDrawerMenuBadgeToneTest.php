<?php
/**
 * sgs/nav-drawer-menu item badges: a per-item tone (A or B) prints one modifier class and its own colour rule, a
 * badge border prints per device, a badge opacity overrides the stylesheet's 0.65, and with none of it set the badge
 * markup and the scoped CSS are unchanged.
 *
 * Runs sgs_nav_shared_badge_html() (includes/nav-menu-markup.php) and sgs_nav_drawer_menu_parity_css()
 * (includes/nav-drawer-menu-parity-css.php) in a child process with the shared helpers loaded.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter NavDrawerMenuBadgeToneTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class NavDrawerMenuBadgeToneTest extends TestCase {

	/**
	 * Run PHP statements with the badge helpers loaded; whatever they echo is returned.
	 *
	 * @param string $body PHP statements.
	 */
	private function run_child( string $body ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsbt' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/nav-menu-markup.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/nav-drawer-menu-parity-css.php', true ) . ';'
			. $body;
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	/**
	 * The scoped CSS for these block attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function css( array $attributes ): string {
		return $this->run_child( ' echo sgs_nav_drawer_menu_parity_css( ' . var_export( $attributes, true ) . ', ".x", ".x .l" );' );
	}

	public function test_a_tone_prints_one_modifier_class_on_that_badge(): void {
		$a = $this->run_child( ' echo sgs_nav_shared_badge_html( "3 for 5", "sgs-nav-drawer-menu", "a" );' );
		$b = $this->run_child( ' echo sgs_nav_shared_badge_html( "10% off", "sgs-nav-drawer-menu", "b" );' );
		$this->assertStringContainsString( 'class="sgs-nav-drawer-menu__badge sgs-nav-drawer-menu__badge--tone-a"', $a );
		$this->assertStringContainsString( 'class="sgs-nav-drawer-menu__badge sgs-nav-drawer-menu__badge--tone-b"', $b );
		$this->assertSame( 1, substr_count( $a, '__badge--tone-' ), 'one tone class' );
	}

	public function test_no_tone_or_an_unknown_tone_leaves_the_badge_unchanged(): void {
		$plain = $this->run_child( ' echo sgs_nav_shared_badge_html( "NEW", "sgs-nav-drawer-menu" );' );
		$this->assertStringContainsString( '<span class="sgs-nav-drawer-menu__badge">NEW</span>', $plain, 'control: byte-identical badge' );
		$this->assertSame( $plain, $this->run_child( ' echo sgs_nav_shared_badge_html( "NEW", "sgs-nav-drawer-menu", "c" );' ) );
		$this->assertSame( $plain, $this->run_child( ' echo sgs_nav_shared_badge_html( "NEW", "sgs-nav-drawer-menu", "" );' ) );
	}

	public function test_two_tones_print_two_different_rules(): void {
		$css = $this->css(
			array(
				'badgeColourA'     => '#f9cf6e',
				'badgeTextColourA' => '#3a2a22',
				'badgeColourB'     => '#f9d5d3',
			)
		);
		$this->assertMatchesRegularExpression( '/\.x \.sgs-nav-drawer-menu__badge--tone-a\{background-color:#f9cf6e;color:#3a2a22;\}/', $css );
		$this->assertMatchesRegularExpression( '/\.x \.sgs-nav-drawer-menu__badge--tone-b\{background-color:#f9d5d3;\}/', $css );
	}

	public function test_a_badge_border_prints_per_device_and_opacity_overrides_the_default(): void {
		$css = $this->css(
			array(
				'badgeBorder'      => array( 'desktop' => array( 'width' => '2px', 'style' => 'solid', 'colour' => '#3a2a22' ) ),
				'itemBadgeOpacity' => '1',
			)
		);
		$this->assertStringContainsString( '.x .sgs-nav-drawer-menu__badge{border-width:2px;border-style:solid;border-color:#3a2a22;}', $css );
		$this->assertStringContainsString( '.x .sgs-nav-drawer-menu__badge{opacity:1;}', $css );
	}

	public function test_nothing_set_prints_none_of_the_new_rules(): void {
		$css = $this->css( array() );
		$this->assertStringNotContainsString( '--tone-', $css, 'control: no tone rules' );
		$this->assertStringNotContainsString( 'border-width', $css );
		$this->assertStringNotContainsString( 'opacity', $css );
		$this->assertStringNotContainsString( 'opacity', $this->css( array( 'itemBadgeOpacity' => 'abc' ) ), 'a non-number prints nothing' );
	}
}
