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
}
