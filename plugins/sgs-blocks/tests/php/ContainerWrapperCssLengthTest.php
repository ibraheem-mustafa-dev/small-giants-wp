<?php
/**
 * Tests: the shared container wrapper keeps CSS intrinsic sizing keywords intact.
 *
 * SGS_Container_Wrapper's `$sgs_css_length` closure used to strip every character except
 * [A-Za-z0-9.%], which removed the hyphen and parentheses: `max-content` became the invalid
 * `maxcontent` and `fit-content(320px)` became `fitcontent320px`, so a draft's
 * `width: max-content` never reached the page. The closure now delegates to
 * sgs_css_length_or_sizing_keyword() (includes/helpers-css-sizing-keyword.php).
 *
 * Two halves:
 *  1. A table test of the sanitiser itself, including injection attempts and the values whose
 *     output must be byte-identical to the old strip.
 *  2. Wrapper renders proving the keyword reaches the emitted rule, that an injection attempt
 *     cannot break out of the declaration, and that ordinary lengths are unchanged (the
 *     Mama's Munches container output is all ordinary lengths).
 *
 * Self-contained: the WP stubs are the same deterministic ones ContainerWrapperTest.php declares
 * (guarded, so they compose in either load order).
 *
 * Run with:
 *   vendor/bin/phpunit --filter ContainerWrapperCssLengthTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Minimal wp_json_encode() stub — the uid is derived from this.
	 *
	 * @param mixed $data Data to encode.
	 * @return string|false
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- test stub.
	}
}

if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	/**
	 * Deterministic wp_style_engine_get_styles() stub (same body as ContainerWrapperTest.php).
	 *
	 * @param array $styles  Style-engine style tree.
	 * @param array $options Must contain 'selector'.
	 * @return array{css: string}
	 */
	function wp_style_engine_get_styles( array $styles, array $options = array() ): array {
		$selector = $options['selector'] ?? '';
		$decls    = array();
		foreach ( array( 'padding', 'margin' ) as $box_prop ) {
			if ( empty( $styles['spacing'][ $box_prop ] ) || ! is_array( $styles['spacing'][ $box_prop ] ) ) {
				continue;
			}
			foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
				if ( isset( $styles['spacing'][ $box_prop ][ $side ] ) && '' !== $styles['spacing'][ $box_prop ][ $side ] ) {
					$decls[] = $box_prop . '-' . $side . ':' . $styles['spacing'][ $box_prop ][ $side ];
				}
			}
		}
		if ( ! $decls || '' === $selector ) {
			return array( 'css' => '' );
		}
		return array( 'css' => $selector . '{' . implode( ';', $decls ) . ';}' );
	}
}

require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-container-wrapper.php';

/**
 * Class ContainerWrapperCssLengthTest
 */
final class ContainerWrapperCssLengthTest extends TestCase {

	/**
	 * Values the keyword recogniser must accept, with the canonical form it returns.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function keyword_provider(): array {
		return array(
			'max-content'               => array( 'max-content', 'max-content' ),
			'min-content'               => array( 'min-content', 'min-content' ),
			'fit-content'               => array( 'fit-content', 'fit-content' ),
			'upper case'                => array( 'MAX-CONTENT', 'max-content' ),
			'surrounding whitespace'    => array( '  max-content  ', 'max-content' ),
			'fit-content px'            => array( 'fit-content(320px)', 'fit-content(320px)' ),
			'fit-content percent'       => array( 'fit-content(50%)', 'fit-content(50%)' ),
			'fit-content rem decimal'   => array( 'fit-content(12.5rem)', 'fit-content(12.5rem)' ),
			'fit-content leading dot'   => array( 'fit-content(.5em)', 'fit-content(.5em)' ),
			'fit-content zero unitless' => array( 'fit-content(0)', 'fit-content(0)' ),
			'fit-content spaced'        => array( 'fit-content( 320px )', 'fit-content(320px)' ),
			'fit-content upper'         => array( 'FIT-CONTENT(320PX)', 'fit-content(320px)' ),
		);
	}

	/**
	 * Values the keyword recogniser must NOT accept (so they stay on the strip path).
	 *
	 * @return array<string, array{0: mixed}>
	 */
	public static function not_keyword_provider(): array {
		return array(
			'empty'                         => array( '' ),
			'plain length'                  => array( '800px' ),
			'percentage'                    => array( '50%' ),
			'auto'                          => array( 'auto' ),
			'keyword plus declaration'      => array( 'max-content;}body{display:none}' ),
			'keyword plus rule'             => array( 'max-content}body{display:none' ),
			'keyword plus second value'     => array( 'max-content 100px' ),
			'prefix'                        => array( 'xmax-content' ),
			'suffix'                        => array( 'max-contentx' ),
			'fit-content unitless nonzero'  => array( 'fit-content(320)' ),
			'fit-content injected'          => array( 'fit-content(1px);}a{b:c}' ),
			'fit-content nested url'        => array( 'fit-content(url(x))' ),
			'fit-content nested calc'       => array( 'fit-content(calc(1px + 2px))' ),
			'fit-content unknown unit'      => array( 'fit-content(1parsec)' ),
			'fit-content empty'             => array( 'fit-content()' ),
			'fit-content unclosed'          => array( 'fit-content(320px' ),
			'fit-content comment'           => array( 'fit-content(1px/*)' ),
			'array'                         => array( array( 'max-content' ) ),
			'null'                          => array( null ),
		);
	}

	/**
	 * @param string $raw      Raw value.
	 * @param string $expected Canonical keyword.
	 */
	#[DataProvider( 'keyword_provider' )]
	public function test_sizing_keyword_is_recognised( string $raw, string $expected ): void {
		$this->assertSame( $expected, sgs_css_sizing_keyword( $raw ) );
		$this->assertSame( $expected, sgs_css_length_or_sizing_keyword( $raw ) );
	}

	/**
	 * @param mixed $raw Raw value.
	 */
	#[DataProvider( 'not_keyword_provider' )]
	public function test_non_keyword_is_not_recognised( $raw ): void {
		$this->assertSame( '', sgs_css_sizing_keyword( $raw ) );
	}

	/**
	 * Injection attempts must never come back with a character that can end a declaration or a rule.
	 *
	 * @return array<string, array{0: string}>
	 */
	public static function injection_provider(): array {
		return array(
			'close and open a rule'    => array( 'max-content;}body{display:none}' ),
			'declaration break'        => array( 'max-content;color:red' ),
			'fit-content break out'    => array( 'fit-content(1px);}a{b:c}' ),
			'style tag'                => array( 'max-content</style><script>alert(1)</script>' ),
			'comment opener'           => array( 'max-content/*' ),
			'url()'                    => array( 'fit-content(url(javascript:alert(1)))' ),
		);
	}

	/**
	 * @param string $raw Hostile value.
	 */
	#[DataProvider( 'injection_provider' )]
	public function test_injection_is_neutralised( string $raw ): void {
		$out = sgs_css_length_or_sizing_keyword( $raw );

		$this->assertDoesNotMatchRegularExpression( '/[;{}()<>\\/*:]/', $out, 'no character that can leave the declaration survives' );
	}

	/**
	 * Everything that is not a sizing keyword must come out byte-identical to the strip the
	 * closure used before this change.
	 *
	 * @return array<string, array{0: mixed}>
	 */
	public static function legacy_provider(): array {
		return array(
			'px'                 => array( '800px' ),
			'rem'                => array( '1.5rem' ),
			'percent'            => array( '50%' ),
			'vh'                 => array( '100vh' ),
			'bare number'        => array( '640' ),
			'auto'               => array( 'auto' ),
			'zero'               => array( '0' ),
			'calc is stripped'   => array( 'calc(100% - 2rem)' ),
			'clamp is stripped'  => array( 'clamp(1rem, 2vw, 3rem)' ),
			'declaration text'   => array( '12px;color:red' ),
			'empty'              => array( '' ),
			'negative'           => array( '-4px' ),
			'unitless fit'       => array( 'fit-content(320)' ),
		);
	}

	/**
	 * @param mixed $raw Raw value.
	 */
	#[DataProvider( 'legacy_provider' )]
	public function test_non_keywords_match_the_previous_strip( $raw ): void {
		$this->assertSame(
			preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $raw ),
			sgs_css_length_or_sizing_keyword( $raw )
		);
	}

	/**
	 * The shared box-helper sanitiser (used by label, google-reviews, mega-aside,
	 * mega-panel and testimonial) had the same hyphen-stripping defect as the wrapper
	 * closure, so it shares the one implementation.
	 */
	public function test_shared_box_length_sanitiser_keeps_sizing_keywords(): void {
		$this->assertSame( 'max-content', sgs_css_length_sanitise( 'max-content' ) );
		$this->assertSame( 'fit-content(320px)', sgs_css_length_sanitise( 'fit-content(320px)' ) );
		$this->assertSame( '12px', sgs_css_length_sanitise( '12px' ) );
		$this->assertStringNotContainsString( '{', sgs_css_length_sanitise( 'max-content;}body{display:none}' ) );
		$this->assertStringNotContainsString( ';', sgs_css_length_sanitise( 'max-content;}body{display:none}' ) );
	}

	// ── Wrapper renders ──────────────────────────────────────────────────────

	public function test_wrapper_max_width_tiers_keep_the_keyword(): void {
		$html = SGS_Container_Wrapper::render(
			array(
				'maxWidth' => array(
					'desktop' => 'max-content',
					'mobile'  => 'fit-content(320px)',
				),
			),
			null,
			'<p>x</p>',
			'section'
		);

		$this->assertStringContainsString( 'max-width:max-content;', $html );
		$this->assertStringContainsString( '@media (max-width:767px){', $html );
		$this->assertStringContainsString( 'max-width:fit-content(320px);', $html );
		$this->assertStringNotContainsString( 'maxcontent', $html, 'the hyphen is no longer stripped' );
		$this->assertStringNotContainsString( 'fitcontent', $html );
	}

	public function test_wrapper_min_height_keeps_the_keyword(): void {
		$html = SGS_Container_Wrapper::render(
			array( 'minHeight' => array( 'desktop' => 'min-content' ) ),
			null,
			'<p>x</p>',
			'section'
		);

		$this->assertStringContainsString( 'min-height:min-content', $html );
		$this->assertStringNotContainsString( 'mincontent', $html );
	}

	public function test_wrapper_cannot_be_broken_out_of_through_max_width(): void {
		foreach ( array( 'max-content;}body{display:none}', 'fit-content(1px);}a{b:c}' ) as $hostile ) {
			$html = SGS_Container_Wrapper::render(
				array( 'maxWidth' => array( 'desktop' => $hostile ) ),
				null,
				'<p>x</p>',
				'section'
			);

			$this->assertStringNotContainsString( '}body{', $html, $hostile );
			$this->assertStringNotContainsString( '}a{b:c}', $html, $hostile );
			$this->assertStringNotContainsString( 'display:none', $html, $hostile );
		}
	}

	public function test_wrapper_ordinary_lengths_are_unchanged(): void {
		$html = SGS_Container_Wrapper::render(
			array(
				'maxWidth'  => array(
					'desktop' => '1200px',
					'tablet'  => '90%',
					'mobile'  => '100%',
				),
				'minHeight' => array(
					'desktop' => '400px',
					'mobile'  => '200px',
				),
			),
			null,
			'<p>x</p>',
			'section'
		);

		$this->assertStringContainsString( 'max-width:1200px;', $html );
		$this->assertStringContainsString( '@media (max-width:1023px){', $html );
		$this->assertStringContainsString( 'max-width:90%;', $html );
		$this->assertStringContainsString( 'max-width:100%;', $html );
		$this->assertStringContainsString( 'min-height:400px', $html );
		$this->assertStringContainsString( 'min-height:200px', $html );
	}

	public function test_wrapper_flat_max_width_is_unchanged(): void {
		$html = SGS_Container_Wrapper::render(
			array( 'maxWidth' => '800px' ),
			null,
			'<p>x</p>',
			'section'
		);

		$this->assertStringContainsString( '{max-width:800px;margin-inline:auto}', $html );
	}
}
