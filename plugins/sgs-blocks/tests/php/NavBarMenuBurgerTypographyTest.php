<?php
/**
 * The menu button's label typography (nav-bar-menu): size unit, style, line height and its unit are
 * declared in block.json (so WordPress keeps them on save) and reach the emitted CSS through
 * includes/helpers-typography.php::sgs_typography_css_rule.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter NavBarMenuBurgerTypographyTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class NavBarMenuBurgerTypographyTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const SUFFIXES = array( 'FontSizeUnit', 'FontStyle', 'LineHeight', 'LineHeightUnit' );

	public function test_block_json_declares_the_burger_typography_attributes_and_maps_them(): void {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-bar-menu/block.json' ), true );
		foreach ( self::SUFFIXES as $suffix ) {
			$this->assertArrayHasKey( 'burger' . $suffix, $json['attributes'], "burger{$suffix} must be declared or WordPress drops it on save" );
		}
		$map = $json['supports']['sgs']['elements']['burger']['attrMap'];
		$this->assertSame( 'burgerFontStyle', $map['css:font-style'] ?? null );
		$this->assertSame( 'burgerLineHeight', $map['css:line-height'] ?? null );
	}

	/**
	 * Run sgs_nav_bar_menu_trigger_css() in a child process (its include files define functions the PHPUnit
	 * process must not load) and return the CSS it prints. The full block render needs a real menu, which the
	 * QA harness does not have, so the emitter is called directly with the attributes render.php hands it.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 */
	private function trigger_css( array $attrs ): string {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = tempnam( sys_get_temp_dir(), 'sgsnb' );
		file_put_contents(
			$script,
			"<?php
define( 'ABSPATH', " . var_export( $root, true ) . " );
define( 'SGS_BLOCKS_PATH', ABSPATH );
"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';
require ABSPATH . 'includes/render-helpers.php';
"
			. "require_once ABSPATH . 'includes/nav-menu-trigger-css.php';
"
			. 'echo sgs_nav_bar_menu_trigger_css( json_decode( ' . var_export( json_encode( $attrs ), true ) . ", true ), '.u', array(), 'text' );
"
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		return $out;
	}

	public function test_the_settings_reach_the_label_css(): void {
		$css = $this->trigger_css(
			array(
				'burgerFontSize'       => array( 'desktop' => 1.25 ),
				'burgerFontSizeUnit'   => 'rem',
				'burgerFontStyle'      => 'italic',
				'burgerLineHeight'     => 2,
				'burgerLineHeightUnit' => 'unitless',
			)
		);

		$this->assertStringContainsString( '.u .sgs-nav-bar-menu__burger-text{', $css, 'positive control: the label rule printed' );
		$this->assertStringContainsString( 'font-size:1.25rem;', $css, 'size with its unit' );
		$this->assertStringContainsString( 'font-style:italic;', $css, 'font style' );
		$this->assertStringContainsString( 'line-height:2;', $css, 'line height' );
	}

	public function test_unset_settings_print_no_style_or_line_height(): void {
		$css = $this->trigger_css( array() );

		$this->assertStringContainsString( '.u .sgs-nav-bar-menu__burger-text{', $css, 'positive control: the label rule printed' );
		$this->assertStringNotContainsString( 'font-style:italic', $css );
		$this->assertStringNotContainsString( 'line-height:', $css );
	}
}
