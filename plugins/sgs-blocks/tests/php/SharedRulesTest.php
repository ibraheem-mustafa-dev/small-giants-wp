<?php
/**
 * Tests: `sgs_shared_rules` and `sgs_style_tags` (includes/helpers-shared-rules.php), the one mechanism that gives
 * block instances with identical declarations one shared class and one printed rule.
 *
 * The collector is the real `sgs_collect_css` (class-sgs-css-registry.php), so a test proves what the page prints.
 *
 * Run with:
 *   vendor/bin/phpunit --filter SharedRulesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class SharedRulesTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! function_exists( 'add_filter' ) ) {
			function add_filter() {}
		}
		if ( ! function_exists( 'add_action' ) ) {
			function add_action() {}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-shared-rules.php';
		require_once dirname( __DIR__, 2 ) . '/includes/helpers-scoped-instance-vars.php';
		require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-css-registry.php';
		$GLOBALS['sgs_collected_css'] = array();
	}

	/** The nav hover colour rule, built for a class. */
	private static function hover_rule( string $colour ): callable {
		return static fn ( string $class ): string => ':where(:root:not(.sgs-touch-input)) .' . $class . ':hover{color:' . $colour . '}';
	}

	/**
	 * What one block prints: its own rules before the shared group, the shared group, its own rules after it.
	 * Every `<style>` tag is handed to the collector, as the render_block filter does.
	 */
	private static function render_instance( string $uid, string $colour, string $before = '', string $after = '' ): string {
		$shared = sgs_shared_rules( 'sgs-state-colour', self::hover_rule( $colour ) );
		$css    = $before . $shared['css'] . $after;
		$tags   = sgs_style_tags( $css, $uid );
		preg_match_all( '#<style\b[^>]*>(.*?)</style>#s', $tags, $m );
		foreach ( $m[1] as $inner ) {
			\SGS\Blocks\sgs_collect_css( $inner );
		}
		return $shared['class'];
	}

	private static function page_css(): string {
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	public function test_identical_declarations_share_one_class_and_print_one_rule(): void {
		$a = self::render_instance( 'sgs-nav-bar-menu-11111111', 'red', '.sgs-nav-bar-menu-11111111{gap:1px}' );
		$b = self::render_instance( 'sgs-nav-bar-menu-22222222', 'red', '.sgs-nav-bar-menu-22222222{gap:2px}' );
		$c = self::render_instance( 'sgs-nav-bar-menu-33333333', 'red', '.sgs-nav-bar-menu-33333333{gap:3px}' );

		$this->assertSame( $a, $b );
		$this->assertSame( $a, $c );
		$this->assertMatchesRegularExpression( '/^sgs-state-colour-[0-9a-f]{8}$/', $a );
		$this->assertSame( 1, substr_count( self::page_css(), ':hover{color:red}' ), 'one hover rule on the page for three instances' );
		$this->assertSame( 3, substr_count( self::page_css(), '{gap:' ), 'each instance keeps its own rule' );
	}

	public function test_different_declarations_get_different_classes_and_both_rules_print(): void {
		$red  = self::render_instance( 'sgs-nav-bar-menu-11111111', 'red' );
		$blue = self::render_instance( 'sgs-nav-bar-menu-22222222', 'blue' );

		$this->assertNotSame( $red, $blue );
		$this->assertStringContainsString( '.' . $red . ':hover{color:red}', self::page_css() );
		$this->assertStringContainsString( '.' . $blue . ':hover{color:blue}', self::page_css() );
	}

	public function test_a_later_rule_of_the_same_instance_still_comes_after_the_shared_rule(): void {
		// The override sits where the block's own rules sat: after the shared group.
		self::render_instance( 'sgs-nav-bar-menu-11111111', 'red', '', '.sgs-nav-bar-menu-11111111:hover{color:green}' );
		// The second instance shares the rule printed for the first and overrides it with its own, later rule.
		self::render_instance( 'sgs-nav-bar-menu-22222222', 'red', '.sgs-nav-bar-menu-22222222{gap:2px}', '.sgs-nav-bar-menu-22222222:hover{color:black}' );

		$css    = self::page_css();
		$shared = strpos( $css, ':where(:root:not(.sgs-touch-input))' );
		$this->assertNotFalse( $shared );
		$this->assertLessThan( strpos( $css, 'color:green' ), $shared, 'the first instance override follows the shared rule' );
		$this->assertLessThan( strpos( $css, 'color:black' ), $shared, 'the second instance override follows the shared rule' );
		$this->assertLessThan( strpos( $css, 'color:black' ), strpos( $css, 'color:green' ), 'instances keep their render order' );
	}

	public function test_a_rule_printed_before_the_shared_group_stays_before_it(): void {
		self::render_instance( 'sgs-nav-bar-menu-11111111', 'red', '.sgs-nav-bar-menu-11111111:hover{color:green}' );
		$css = self::page_css();
		$this->assertLessThan( strpos( $css, ':where(:root' ), strpos( $css, 'color:green' ) );
	}

	public function test_the_id_goes_on_the_first_tag_of_the_blocks_own_css(): void {
		$shared = sgs_shared_rules( 'sgs-state-colour', self::hover_rule( 'red' ) );
		$tags   = sgs_style_tags( $shared['css'] . '.a{b:c}', 'sgs-x-12345678' );
		$this->assertSame( 1, substr_count( $tags, 'id="sgs-x-12345678"' ) );
		$this->assertMatchesRegularExpression( '#<style id="sgs-x-12345678">\.a\{b:c\}</style>#', $tags );
		$this->assertSame( '<style id="sgs-x-12345678">.a{b:c}</style>', sgs_style_tags( '.a{b:c}', 'sgs-x-12345678' ), 'no shared group: the one tag the block printed before' );
		$this->assertSame( '', sgs_style_tags( '', 'sgs-x-12345678' ) );
	}

	public function test_the_seed_changes_the_class_but_not_the_rules(): void {
		$plain  = sgs_shared_rules( 'sgs-band-width', self::hover_rule( 'red' ) );
		$seeded = sgs_shared_rules( 'sgs-band-width', self::hover_rule( 'red' ), 'max-width:1px' );
		$again  = sgs_shared_rules( 'sgs-band-width', self::hover_rule( 'red' ), 'max-width:1px' );
		$other  = sgs_shared_rules( 'sgs-band-width', self::hover_rule( 'red' ), 'max-width:2px' );

		$this->assertNotSame( $plain['class'], $seeded['class'] );
		$this->assertSame( $seeded['class'], $again['class'] );
		$this->assertNotSame( $seeded['class'], $other['class'] );
		$this->assertSame( str_replace( $plain['class'], 'X', $plain['css'] ), str_replace( $seeded['class'], 'X', $seeded['css'] ) );
	}

	public function test_nothing_to_print_gives_no_class(): void {
		$none = sgs_shared_rules( 'sgs-state-colour', static fn ( string $class ): string => '' );
		$this->assertSame( array( 'class' => '', 'css' => '' ), $none );
	}

	public function test_the_minted_classes_are_never_taken_for_a_blocks_own_uid(): void {
		$shared = sgs_shared_rules( 'sgs-state-colour', self::hover_rule( 'red' ) );
		$this->assertTrue( \SGS\Blocks\sgs_scope_class_is_minted( $shared['class'] ) );
		foreach ( array( 'sgs-band-width', 'sgs-band-cap', 'sgs-band-pad', 'sgs-band-min', 'sgs-band-layout', 'sgs-state-colour', 'sgs-text-hover' ) as $prefix ) {
			$class = sgs_shared_rules( $prefix, self::hover_rule( 'red' ) )['class'];
			$this->assertTrue( \SGS\Blocks\sgs_scope_class_is_minted( $class ), $prefix );
			$this->assertSame(
				'sgs-nav-bar-menu-11111111',
				\SGS\Blocks\sgs_scope_class_for_root( '<nav class="' . $class . ' sgs-nav-bar-menu-11111111">', 'sgs-x' )
			);
		}
	}
}
