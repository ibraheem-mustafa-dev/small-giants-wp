<?php
/**
 * Tests: the theme's shop Load more button (theme/sgs-theme/assets/css/shop-load-more.css) wears the primary button preset's
 * tokens, and a site that names another preset in `settings.custom.shopButtonPreset` gets that preset's whole look.
 *
 * The pin resolves every `var()` in the button's rules against the theme's theme.json with each site's theme snapshot laid over
 * it (a site's own tokens win, as WordPress merges them) and compares each site's resolved declarations to the recorded ones.
 * A stylesheet edit that leaves every site's computed look alone leaves the pin green; the literal fallbacks inside `var()`
 * never resolve while a token is defined, so dropping them is invisible to it, which is what the pin proves.
 *
 * Re-record the pin (only when a look change is intended) with SGS_WRITE_PINS=1.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ShopLoadMoreButtonTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ShopLoadMoreButtonTest extends TestCase {

	private const ROOT = __DIR__ . '/../../../..';
	private const PINS = __DIR__ . '/../fixtures/button-kit-adopters/shop-load-more-resolved.json';

	private static function kebab( string $key ): string {
		return strtolower( (string) preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', $key ) );
	}

	/** @param array<string, mixed> $tree @param array<string, string> $out */
	private static function flatten( array $tree, string $prefix, array &$out ): void {
		foreach ( $tree as $key => $value ) {
			$name = $prefix . '--' . self::kebab( (string) $key );
			if ( is_array( $value ) ) {
				self::flatten( $value, $name, $out );
			} elseif ( is_scalar( $value ) ) {
				$out[ $name ] = (string) $value;
			}
		}
	}

	/** @param array<string, mixed> $settings theme.json `settings`. @return array<string, string> custom property => value. */
	private static function tokens( array $settings ): array {
		$out = array();
		self::flatten( (array) ( $settings['custom'] ?? array() ), '--wp--custom', $out );
		$palette = $settings['color']['palette'] ?? array();
		$palette = isset( $palette['theme'] ) ? $palette['theme'] : $palette;
		foreach ( (array) $palette as $entry ) {
			if ( is_array( $entry ) && isset( $entry['slug'], $entry['color'] ) ) {
				$out[ '--wp--preset--color--' . $entry['slug'] ] = (string) $entry['color'];
			}
		}
		foreach ( (array) ( $settings['spacing']['spacingSizes'] ?? array() ) as $entry ) {
			if ( is_array( $entry ) && isset( $entry['slug'], $entry['size'] ) ) {
				$out[ '--wp--preset--spacing--' . $entry['slug'] ] = (string) $entry['size'];
			}
		}
		return $out;
	}

	/** Resolve every `var(--x, fallback)` in a value against the tokens; a token that is itself a `var()` resolves in turn. */
	private static function resolve( string $value, array $tokens, int $depth = 0 ): string {
		if ( $depth > 8 ) {
			return $value;
		}
		while ( preg_match( '/var\(\s*(--[a-z0-9-]+)\s*(?:,((?:[^()]|\((?:[^()]|\([^()]*\))*\))*))?\)/i', $value, $m, PREG_OFFSET_CAPTURE ) ) {
			$name     = $m[1][0];
			$fallback = isset( $m[2] ) ? trim( $m[2][0] ) : '';
			$hit      = $tokens[ $name ] ?? null;
			$resolved = null !== $hit ? self::resolve( $hit, $tokens, $depth + 1 ) : self::resolve( $fallback, $tokens, $depth + 1 );
			$value    = substr( $value, 0, $m[0][1] ) . $resolved . substr( $value, $m[0][1] + strlen( $m[0][0] ) );
		}
		return trim( $value );
	}

	/** @return array<string, array<string, string>> selector => property => raw value, for the button's rules. */
	private static function button_rules(): array {
		$css = (string) file_get_contents( self::ROOT . '/theme/sgs-theme/assets/css/shop-load-more.css' );
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		$out = array();
		if ( preg_match_all( '/(\.sgs-shop-load-more__button(?::[a-z-]+)?)\s*\{([^}]*)\}/', $css, $rules, PREG_SET_ORDER ) ) {
			foreach ( $rules as $rule ) {
				foreach ( explode( ';', $rule[2] ) as $decl ) {
					if ( false !== strpos( $decl, ':' ) ) {
						list( $prop, $val )              = array_map( 'trim', explode( ':', $decl, 2 ) );
						$out[ $rule[1] ][ $prop ] = $val;
					}
				}
			}
		}
		return $out;
	}

	/** @return array<string, array<string, array<string, string>>> site => selector => property => resolved value. */
	private static function resolved_per_site(): array {
		$base  = json_decode( (string) file_get_contents( self::ROOT . '/theme/sgs-theme/theme.json' ), true, 512, JSON_THROW_ON_ERROR );
		$rules = self::button_rules();
		$sites = array( '(theme.json alone)' => $base['settings'] );
		foreach ( glob( self::ROOT . '/sites/*/theme-snapshot.json' ) ?: array() as $file ) {
			$snap = json_decode( (string) file_get_contents( $file ), true, 512, JSON_THROW_ON_ERROR );
			// WordPress merges a variation's settings over the theme's; a palette list replaces the theme's list.
			$merged = array_replace_recursive( $base['settings'], (array) ( $snap['settings'] ?? array() ) );
			if ( isset( $snap['settings']['color']['palette'] ) ) {
				$merged['color']['palette'] = $snap['settings']['color']['palette'];
			}
			$sites[ basename( dirname( $file ) ) ] = $merged;
		}
		$out = array();
		foreach ( $sites as $site => $settings ) {
			$tokens = self::tokens( $settings );
			foreach ( $rules as $selector => $decls ) {
				foreach ( $decls as $prop => $raw ) {
					$out[ $site ][ $selector ][ $prop ] = self::resolve( $raw, $tokens );
				}
			}
		}
		ksort( $out );
		return $out;
	}

	public function test_every_sites_button_resolves_as_before(): void {
		$current = self::resolved_per_site();
		if ( getenv( 'SGS_WRITE_PINS' ) ) {
			file_put_contents( self::PINS, json_encode( $current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( 'pins re-recorded' );
		}
		$pins = json_decode( (string) file_get_contents( self::PINS ), true, 512, JSON_THROW_ON_ERROR );
		$this->assertSame( $pins, $current );
	}

	/** What `shop_load_more_preset_css()` returns for a site's theme settings, run in a clean process. */
	private static function preset_css( array $custom, bool $plugin = true ): string {
		$file = tempnam( sys_get_temp_dir(), 'sgslm' );
		file_put_contents( $file, json_encode( array( 'plugin' => $plugin, 'settings' => array( 'custom' => (object) $custom ) ), JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-shop-load-more-preset-standalone.php' ) . ' ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$start   = strpos( $out, '{"css"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) ) {
			throw new RuntimeException( 'runner failed: ' . $out );
		}
		return $decoded['css'];
	}

	private const BRAND = array(
		'background'       => '#0a0',
		'text'             => '#fff',
		'border'           => '#0a0',
		'hover-background' => '#050',
		'hover-text'       => '#fff',
		'hover-border'     => '#050',
	);

	public function test_no_named_preset_leaves_the_stylesheet_as_it_is(): void {
		$brand = array( 'namedButtonPresets' => true, 'buttonPresets' => array( 'brand' => self::BRAND ) );
		$this->assertSame( '', self::preset_css( array() ), 'a site naming no preset' );
		$this->assertSame( '', self::preset_css( array( 'shopButtonPreset' => '' ) + $brand ), 'an empty name' );
		$this->assertSame( '', self::preset_css( array( 'shopButtonPreset' => 'primary' ) + $brand ), 'primary is what the stylesheet paints' );
		$this->assertSame( '', self::preset_css( array( 'shopButtonPreset' => 'no-such-preset' ) + $brand ), 'an unknown name' );
		$this->assertSame( '', self::preset_css( array( 'shopButtonPreset' => 'brand', 'buttonPresets' => array( 'brand' => self::BRAND ) ) ), 'a site that has not opted in to named presets' );
		$this->assertSame( '', self::preset_css( array( 'shopButtonPreset' => 'brand' ) + $brand, false ), 'without the blocks plugin' );
	}

	public function test_a_named_preset_paints_the_button_with_its_hover_and_size(): void {
		$css = self::preset_css( array( 'namedButtonPresets' => true, 'shopButtonPreset' => 'brand', 'buttonPresets' => array( 'brand' => self::BRAND ) ) );
		$sel = '.sgs-shop-load-more .sgs-shop-load-more__button';
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . '\{background:var\(--wp--custom--button-presets--brand--background\);color:var\(--wp--custom--button-presets--brand--text\)/', $css, 'the resting fill and text' );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $sel, '/' ) . ':hover\{background:var\(--wp--custom--button-presets--brand--hover-background[^}]*color:var\(--wp--custom--button-presets--brand--hover-text/', $css, 'hover colours print together' );
		$this->assertStringContainsString( $sel . ':focus-visible{background:var(--wp--custom--button-presets--brand--hover-background', $css, 'keyboard focus shows the hover look' );
		$this->assertStringContainsString( $sel . '{min-height:max(44px,var(--wp--custom--button-presets--brand--min-height,44px));padding:var(--wp--custom--button-presets--brand--padding,0.5em 1.75em);font-size:var(--wp--custom--button-presets--brand--font-size,0.9375rem);}', $css, 'the size reads the named preset' );
		$this->assertStringNotContainsString( 'presets--primary--', $css );
		$this->assertStringNotContainsString( 'style="', $css );
	}

	public function test_the_stylesheet_carries_no_client_colour(): void {
		$css = (string) file_get_contents( self::ROOT . '/theme/sgs-theme/assets/css/shop-load-more.css' );
		$this->assertDoesNotMatchRegularExpression( '/#E68A95|#fffaf5/i', $css, 'a client colour in framework code' );
	}
}
