<?php
/**
 * sgs/text registers no WordPress block styles (Spec 32, Spec 35A Part G reject them).
 *
 * The Styles tab used to offer Quote, Caption and Lead for sgs/text. Each wrote
 * an `is-style-*` class whose CSS out-ranks the block's own settings. They are
 * retired; the block's own inspector controls cover the same looks.
 *
 * Run with: vendor/bin/phpunit --filter TextBlockStylesRetiredTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

final class TextBlockStylesRetiredTest extends TestCase {

	/**
	 * Load every variations file as the plugin does, fire the `init` callbacks they hook, and return
	 * the styles registered, keyed by block name.
	 *
	 * @return array<string,string[]>
	 */
	private static function registered_styles(): array {
		$GLOBALS['sgs_t_styles'] = array();
		$GLOBALS['sgs_t_init']   = array();
		eval(
			'function add_action( $hook, $cb ) { if ( "init" === $hook ) { $GLOBALS["sgs_t_init"][] = $cb; } return true; }
			function add_filter( ...$a ) { return true; }
			function register_block_style( $block, $args ) { $GLOBALS["sgs_t_styles"][ $block ][] = $args["name"]; return true; }'
		);
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		foreach ( glob( dirname( __DIR__, 2 ) . '/includes/variations/sgs-*.php' ) as $file ) {
			require_once $file;
		}
		foreach ( $GLOBALS['sgs_t_init'] as $callback ) {
			$callback();
		}
		return $GLOBALS['sgs_t_styles'];
	}

	#[RunInSeparateProcess]
	#[PreserveGlobalState( false )]
	public function test_the_text_block_registers_no_styles(): void {
		$styles = self::registered_styles();
		$this->assertArrayNotHasKey(
			'sgs/text',
			$styles,
			'sgs/text must register no block style (found: ' . implode( ', ', $styles['sgs/text'] ?? array() ) . ').'
		);
	}

	/** Positive control: the harness does see the styles other blocks still register, so the test above can fail. */
	#[RunInSeparateProcess]
	#[PreserveGlobalState( false )]
	public function test_the_harness_still_sees_other_blocks_styles(): void {
		$styles = self::registered_styles();
		$this->assertNotEmpty( $styles['sgs/heading'] ?? array(), 'The harness must see sgs/heading styles (deferred, not retired here).' );
		$this->assertNotEmpty( $styles['sgs/quote'] ?? array(), 'The harness must see sgs/quote styles (deferred, not retired here).' );
	}

	public function test_no_text_block_source_writes_a_text_style_class(): void {
		$root = dirname( __DIR__, 2 );
		foreach ( array( 'block.json', 'edit.js', 'save.js', 'index.js', 'style.css', 'editor.css' ) as $name ) {
			$file = $root . '/src/blocks/text/' . $name;
			if ( ! is_file( $file ) ) {
				continue;
			}
			$this->assertDoesNotMatchRegularExpression(
				'/is-style-(quote|caption|lead)/',
				(string) file_get_contents( $file ),
				$name . ' must not carry a retired text style class.'
			);
		}
	}
}
