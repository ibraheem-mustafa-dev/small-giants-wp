<?php
/**
 * linkUnderline on sgs/text and sgs/heading (includes/helpers-link-underline.php::sgs_link_underline_css):
 * each mode prints its rule on the block's own links, an unset or off-enum value prints nothing, and a gradient
 * link colour keeps the sweep off the background it already paints.
 *
 * Run with: vendor/bin/phpunit --filter LinkUnderlineTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class LinkUnderlineTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function text( array $attrs ): array {
		return $this->render_block( 'sgs/text', array_merge( array( 'text' => '<a href="/about/">About</a>' ), $attrs ) );
	}

	public function test_sweep_draws_a_background_line_on_the_blocks_links(): void {
		$css = $this->text( array( 'linkUnderline' => 'sweep' ) )['css'];

		$this->assertMatchesRegularExpression( '/ a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);[^}]*background-size:0 var\(--wp--custom--link-sweep--thickness, 1px\);/', $css );
		$this->assertMatchesRegularExpression( '/@media \(hover: hover\)[^{]*\{[^{]* a:hover\{background-size:100% var\(--wp--custom--link-sweep--thickness, 1px\);?\}/', $css, 'hover sits behind the touch guard' );
		$this->assertMatchesRegularExpression( '/ a:focus-visible\{background-size:100% /', $css, 'keyboard focus shows the line too' );
		$this->assertStringContainsString( ' a:dir(rtl){background-position:100% 100%;}', $css );
		$this->assertMatchesRegularExpression( '/@media \(prefers-reduced-motion: reduce\)\{[^{]* a\{transition:none;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media \(forced-colors: active\)\{[^{,]* a\{text-decoration:underline;\}\}/', $css, 'forced colours: the line shows at rest' );
	}

	public function test_a_set_thickness_replaces_the_theme_token(): void {
		$css = $this->text( array( 'linkUnderline' => 'sweep', 'linkUnderlineThickness' => '2px' ) )['css'];

		$this->assertStringContainsString( 'background-size:0 2px;', $css );
		$this->assertStringNotContainsString( '--wp--custom--link-sweep--thickness', $css );
	}

	public function test_always_and_none_print_their_decoration(): void {
		$this->assertMatchesRegularExpression( '/ a\{text-decoration-line:underline;text-decoration-thickness:3px;\}/', $this->text( array( 'linkUnderline' => 'always', 'linkUnderlineThickness' => '3px' ) )['css'] );
		$this->assertMatchesRegularExpression( '/ a\{text-decoration-line:underline;\}/', $this->text( array( 'linkUnderline' => 'always' ) )['css'] );
		$none = $this->text( array( 'linkUnderline' => 'none' ) )['css'];
		$this->assertMatchesRegularExpression( '/ a\{text-decoration:none;\}/', $none );
		$this->assertMatchesRegularExpression( '/@media \(forced-colors: active\)\{[^{]* a\{text-decoration:underline;\}\}/', $none, 'forced colours restore the line even for none' );
	}

	public function test_unset_or_off_enum_prints_nothing(): void {
		foreach ( array( array(), array( 'linkUnderline' => '' ), array( 'linkUnderline' => 'wavy' ) ) as $attrs ) {
			$out = $this->text( $attrs );
			$this->assertStringContainsString( 'href="/about/"', $out['html'], 'positive control: the link rendered' );
			$this->assertStringNotContainsString( 'text-decoration', $out['css'] );
			$this->assertStringNotContainsString( 'link-sweep', $out['css'] );
		}
	}

	public function test_a_gradient_link_colour_keeps_the_sweep_off(): void {
		$css = $this->text( array( 'linkUnderline' => 'sweep', 'linkColourGradient' => 'linear-gradient(90deg,#f00,#00f)' ) )['css'];

		$this->assertStringContainsString( 'background-clip:text', $css, 'positive control: the gradient link colour printed' );
		$this->assertStringNotContainsString( 'linear-gradient(currentColor', $css );
	}

	public function test_heading_takes_the_same_setting(): void {
		$out = $this->render_block( 'sgs/heading', array( 'content' => '<a href="/x/">X</a>', 'linkUnderline' => 'sweep' ) );

		$this->assertMatchesRegularExpression( '/ a\{text-decoration:none;background-image:linear-gradient\(currentColor,currentColor\);/', $out['css'] );
		$this->assertStringNotContainsString( 'style="', $out['html'] );
	}
}
