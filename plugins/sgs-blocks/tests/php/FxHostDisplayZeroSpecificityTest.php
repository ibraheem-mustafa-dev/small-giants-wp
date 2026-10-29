<?php
/**
 * Tests: an effect stylesheet's inline-host promotion never out-ranks a block's own `display`.
 *
 * fx-magnet.css and fx-particles.css promote an otherwise-unstyled inline host (a, span, em, strong, label, code) to
 * `inline-block`. A selector with attribute specificity (0,1,0) ties `.sgs-button`'s own `display: inline-flex` and
 * wins on source order, turning a magnet button into a block. The whole selector must sit inside `:where()` so it
 * carries zero specificity and any block's own display rule wins.
 *
 * Run with: vendor/bin/phpunit --filter FxHostDisplayZeroSpecificityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class FxHostDisplayZeroSpecificityTest extends TestCase {

	private const ZERO_SPECIFICITY = '/^:where\(\s*\[data-sgs-fx~="[a-z-]+"\]\s*\):where\(\s*a,\s*span,\s*em,\s*strong,\s*label,\s*code\s*\)$/';

	/**
	 * Selectors that promote an inline host, per effect stylesheet.
	 *
	 * @param string $file Stylesheet path relative to assets/css.
	 * @return string[] Selectors of every rule that lists the inline-host tags.
	 */
	private function host_selectors( string $file ): array {
		$css = (string) file_get_contents( __DIR__ . '/../../assets/css/' . $file );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		preg_match_all( '/([^{}]*\bspan\b[^{}]*)\{[^}]*display:\s*inline-block/', $css, $m );
		return array_map( 'trim', $m[1] );
	}

	/**
	 * @return array<string, array{0: string}>
	 */
	public static function stylesheet_provider(): array {
		return array(
			'magnet'    => array( 'fx-magnet.css' ),
			'particles' => array( 'fx-particles.css' ),
		);
	}

	/**
	 * @param string $file Stylesheet path relative to assets/css.
	 */
	#[DataProvider( 'stylesheet_provider' )]
	public function test_inline_host_promotion_has_zero_specificity( string $file ): void {
		$selectors = $this->host_selectors( $file );
		$this->assertCount( 1, $selectors, $file . ' has exactly one inline-host promotion rule' );
		$this->assertMatchesRegularExpression( self::ZERO_SPECIFICITY, $selectors[0] );
	}

	/**
	 * No effect stylesheet carries an inline-host promotion outside the zero-specificity form.
	 */
	public function test_no_effect_stylesheet_promotes_hosts_with_attribute_specificity(): void {
		foreach ( glob( __DIR__ . '/../../assets/css/fx-*.css' ) ?: array() as $path ) {
			foreach ( $this->host_selectors( basename( $path ) ) as $selector ) {
				$this->assertMatchesRegularExpression( self::ZERO_SPECIFICITY, $selector, basename( $path ) );
			}
		}
	}

	/**
	 * Negative control: the previous attribute-specificity selector fails the same pattern.
	 */
	public function test_previous_selector_shape_is_rejected(): void {
		$this->assertDoesNotMatchRegularExpression( self::ZERO_SPECIFICITY, '[data-sgs-fx~="magnet"]:where(a, span, em, strong, label, code)' );
		$this->assertDoesNotMatchRegularExpression( self::ZERO_SPECIFICITY, '[data-sgs-fx~="particles"]:where( a, span, em, strong, label, code )' );
	}
}
