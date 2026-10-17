<?php
/**
 * Tests: the effect stylesheets the editor canvas's stories need (Spec 38A §11, M3.6; the editor and frontend
 * asset-guard rule).
 *
 * `includes/motion/class-sgs-motion-story-styles.php` enqueues `assets/css/fx-<effect>.css` for each story the
 * manifest marks `"stylesheet": true`, from `enqueue_block_assets`, in the admin only. With recording stand-ins for the
 * WordPress asset functions, these tests prove the editor receives exactly the marked stylesheets, the front end
 * receives none, an unmarked story or a missing file adds nothing, and the shipped manifest names only real effects.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionStoryStylesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Motion_Story_Styles;

// The stand-ins define global WordPress functions, so every test runs in its own process.
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionStoryStylesTest extends TestCase {

	private string $root;

	protected function setUp(): void {
		$this->root = dirname( __DIR__, 2 ) . '/';
		foreach ( array(
			'ABSPATH'            => $this->root,
			'SGS_BLOCKS_PATH'    => $this->root,
			'SGS_BLOCKS_URL'     => 'https://example.test/sgs-blocks/',
			'SGS_BLOCKS_VERSION' => '0.0.0-test',
		) as $name => $value ) {
			if ( ! defined( $name ) ) {
				define( $name, $value );
			}
		}
		$GLOBALS['sgs_test_is_admin']        = false;
		$GLOBALS['sgs_test_enqueued_styles'] = array();
		$GLOBALS['sgs_test_actions']         = array();
		// `wp_enqueue_style` is the bootstrap's recording stand-in (handles only).
		if ( ! function_exists( 'is_admin' ) ) {
			function is_admin() {
				return ! empty( $GLOBALS['sgs_test_is_admin'] );
			}
		}
		if ( ! function_exists( 'add_action' ) ) {
			function add_action( $hook, $callback, $priority = 10, $args = 1 ) {
				$GLOBALS['sgs_test_actions'][ $hook ][] = $callback;
				return true;
			}
		}
		// The real registry first, so the class resolves stylesheets by the shipped naming convention.
		require_once $this->root . 'includes/class-sgs-motion-registry.php';
		require_once $this->root . 'includes/motion/class-sgs-motion-story-styles.php';
	}

	private const STORIES = array(
		'grid-dots'    => array( 'stylesheet' => true ),
		'cursor-field' => array( 'stylesheet' => false ),
		'not-a-file'   => array( 'stylesheet' => true ),
	);

	public function test_happy_editor_loads_each_marked_story_stylesheet(): void {
		$GLOBALS['sgs_test_is_admin'] = true;
		Sgs_Motion_Story_Styles::enqueue_editor_styles( self::STORIES );
		$this->assertSame(
			array( 'sgs-fx-grid-dots' ),
			$GLOBALS['sgs_test_enqueued_styles'],
			'only the marked story whose stylesheet exists loads, under the registry handle'
		);
	}

	public function test_fail_front_end_loads_no_story_stylesheet(): void {
		Sgs_Motion_Story_Styles::enqueue_editor_styles( self::STORIES );
		$this->assertSame( array(), $GLOBALS['sgs_test_enqueued_styles'], 'a front-end request gets no fx-*.css from this hook' );
	}

	public function test_edge_unmarked_story_and_missing_file_add_nothing(): void {
		$this->assertSame( array(), Sgs_Motion_Story_Styles::stylesheets( array( 'cursor-field' => array( 'stylesheet' => false ) ) ) );
		$this->assertSame( array(), Sgs_Motion_Story_Styles::stylesheets( array( 'not-a-file' => array( 'stylesheet' => true ) ) ) );
		$this->assertSame( array(), Sgs_Motion_Story_Styles::stylesheets( array( '../evil' => array( 'stylesheet' => true ) ) ), 'a non-slug never reaches the filesystem' );
		$this->assertSame( array(), Sgs_Motion_Story_Styles::stylesheets( array( 'grid-dots' => array( 'stylesheet' => 'yes' ) ) ), 'only a literal true marks a story' );
	}

	public function test_happy_hook_is_registered_on_block_assets(): void {
		Sgs_Motion_Story_Styles::register();
		$this->assertContains(
			array( Sgs_Motion_Story_Styles::class, 'enqueue_editor_styles' ),
			$GLOBALS['sgs_test_actions']['enqueue_block_assets'] ?? array()
		);
	}

	public function test_happy_shipped_manifest_names_real_stories_and_loads_what_it_marks(): void {
		$stories = Sgs_Motion_Story_Styles::stories();
		$this->assertIsArray( $stories, 'the shipped manifest reads' );
		foreach ( array_keys( $stories ) as $effect ) {
			$this->assertFileExists( $this->root . 'src/blocks/extensions/motion/stories/' . $effect . '.js', "story file for {$effect}" );
		}
		$GLOBALS['sgs_test_is_admin'] = true;
		Sgs_Motion_Story_Styles::enqueue_editor_styles();
		$expected = array();
		foreach ( array_keys( Sgs_Motion_Story_Styles::stylesheets( $stories ) ) as $effect ) {
			$expected[] = 'sgs-fx-' . $effect;
		}
		$this->assertSame( $expected, $GLOBALS['sgs_test_enqueued_styles'], 'the hook with no argument loads what the shipped manifest marks' );
	}
}
