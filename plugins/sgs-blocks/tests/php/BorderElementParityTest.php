<?php
/**
 * Tests: border CSS parity across the six blocks that share one border function.
 *
 * Renders the real render.php of sgs/quote, counter, heading, icon-list, process-steps and timeline for a
 * matrix of border cases and compares the printed CSS with a recorded golden. The comparison is by the SET
 * of declarations per (media/supports context || selector): rule grouping and declaration order may change,
 * the per-selector declaration set may not.
 *
 * Determinism: every block derives its scoped class from md5( wp_json_encode( $attributes ) ), so a given case
 * always renders the same class. The class is still normalised to `<prefix>-UID` (regex
 * sgs-<word>-<hex 8..32>) so that a future change to the hash input cannot churn the goldens.
 *
 * Record goldens (writes tests/php/fixtures/border-element/<block>.json, then reports the run as skipped):
 *   SGS_RECORD_BORDER_GOLDENS=1 vendor/bin/phpunit --filter BorderElementParityTest
 * Assert:
 *   vendor/bin/phpunit --filter BorderElementParityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Per-block border CSS declaration-set parity.
 */
final class BorderElementParityTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const BLOCKS = array( 'quote', 'counter', 'heading', 'icon-list', 'process-steps', 'timeline' );

	/**
	 * Block => attribute names it must declare for a case to apply.
	 *
	 * @return array<string, array<int, string>>
	 */
	private static function case_requirements(): array {
		return array(
			'a_baseline'           => array(),
			'b_equal_sides'        => array( 'borderWidth', 'borderColour' ),
			'c_unequal_dashed_raw' => array( 'borderWidth', 'borderStyle', 'borderColour' ),
			'd_style_none'         => array( 'borderWidth', 'borderStyle', 'borderColour' ),
			'e_widths_no_colour'   => array( 'borderWidth' ),
			'f_colour_no_widths'   => array( 'borderColour' ),
			'g_gradient'           => array( 'borderWidth', 'borderColourGradient' ),
			'h_hover_flat'         => array( 'borderWidth', 'borderColour', 'borderColourHover' ),
			'i_hover_gradient'     => array( 'borderWidth', 'borderColourGradient', 'borderColourHoverGradient' ),
			'j_radius_uniform'     => array( 'borderRadius' ),
			'k_radius_tiers'       => array( 'borderRadius' ),
			'l_inherit_style'      => array( 'borderWidth', 'borderColour', 'inheritStyle' ),
		);
	}

	/**
	 * Attributes for a case.
	 *
	 * @param string $case Case name.
	 * @return array<string, mixed>
	 * @throws InvalidArgumentException For a case name the matrix does not define.
	 */
	private static function case_attrs( string $case ): array {
		$two = array(
			'top'    => '2px',
			'right'  => '2px',
			'bottom' => '2px',
			'left'   => '2px',
		);
		switch ( $case ) {
			case 'a_baseline':
				return array();
			case 'b_equal_sides':
				return array(
					'borderWidth'  => $two,
					'borderColour' => 'primary',
				);
			case 'c_unequal_dashed_raw':
				return array(
					'borderWidth'  => array(
						'top'  => '1px',
						'left' => '4px',
					),
					'borderStyle'  => 'dashed',
					'borderColour' => '#ff0000',
				);
			case 'd_style_none':
				return array(
					'borderWidth'  => $two,
					'borderStyle'  => 'none',
					'borderColour' => 'primary',
				);
			case 'e_widths_no_colour':
				return array( 'borderWidth' => $two );
			case 'f_colour_no_widths':
				return array( 'borderColour' => 'primary' );
			case 'g_gradient':
				return array(
					'borderWidth'          => array(
						'top'    => '3px',
						'right'  => '3px',
						'bottom' => '3px',
						'left'   => '3px',
					),
					'borderColourGradient' => 'linear-gradient(90deg,#f00,#00f)',
				);
			case 'h_hover_flat':
				return array(
					'borderWidth'       => $two,
					'borderColour'      => 'primary',
					'borderColourHover' => 'secondary',
				);
			case 'i_hover_gradient':
				return array(
					'borderWidth'               => $two,
					'borderColourGradient'      => 'linear-gradient(90deg,#f00,#00f)',
					'borderColourHoverGradient' => 'linear-gradient(45deg,#0f0,#ff0)',
				);
			case 'j_radius_uniform':
				return array( 'borderRadius' => '8px' );
			case 'k_radius_tiers':
				return array(
					'borderRadius' => array(
						'desktop' => array(
							'topLeft'     => '12px',
							'topRight'    => '12px',
							'bottomRight' => '4px',
							'bottomLeft'  => '4px',
						),
						'tablet'  => array( 'topLeft' => '6px' ),
						'mobile'  => array(
							'topLeft'  => '2px',
							'topRight' => '3px',
						),
					),
				);
			case 'l_inherit_style':
				return array(
					'borderWidth'  => $two,
					'borderColour' => 'primary',
					'inheritStyle' => true,
				);
		}
		throw new InvalidArgumentException( 'unknown case ' . esc_html( $case ) );
	}

	/**
	 * Every (block, case) pair whose attributes the block declares.
	 *
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function cases(): array {
		$out = array();
		foreach ( self::BLOCKS as $block ) {
			$json  = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/' . $block . '/block.json' ), true );
			$attrs = array_keys( $json['attributes'] ?? array() );
			foreach ( self::case_requirements() as $case => $needs ) {
				if ( array() === array_diff( $needs, $attrs ) ) {
					$out[ $block . ' / ' . $case ] = array( $block, $case );
				}
			}
		}
		return $out;
	}

	/**
	 * Attributes a block needs before it prints any CSS: quote/render.php returns
	 * early unless there is a body or an attribution.
	 *
	 * @param string $block Block folder name.
	 * @return array<string, mixed>
	 */
	private static function block_base( string $block ): array {
		return 'quote' === $block ? array( 'attribution' => 'Parity' ) : array();
	}

	/**
	 * The six blocks, as data-provider rows.
	 *
	 * @return array<string, array{0: string}>
	 */
	public static function blocks(): array {
		$out = array();
		foreach ( self::BLOCKS as $block ) {
			$out[ $block ] = array( $block );
		}
		return $out;
	}

	/**
	 * The desktop radius rule prints BEFORE the tablet and mobile media rules.
	 *
	 * Both carry the root selector at the same specificity, so whichever comes
	 * later wins; a desktop rule printed after the media rules silently beats
	 * the tablet and mobile radius. The declaration-set comparison cannot see
	 * order, so this test does.
	 *
	 * @param string $block Block folder name.
	 */
	#[DataProvider( 'blocks' )]
	public function test_desktop_radius_precedes_the_tier_radius( string $block ): void {
		$css     = $this->render_block( 'sgs/' . $block, array_merge( self::block_base( $block ), self::case_attrs( 'k_radius_tiers' ) ) )['css'];
		$desktop = strpos( $css, 'border-top-left-radius:12px' );
		$tablet  = strpos( $css, 'border-top-left-radius:6px' );
		$mobile  = strpos( $css, 'border-top-left-radius:2px' );
		$this->assertNotFalse( $desktop, "{$block}: desktop radius not printed" );
		$this->assertNotFalse( $tablet, "{$block}: tablet radius not printed" );
		$this->assertNotFalse( $mobile, "{$block}: mobile radius not printed" );
		$this->assertLessThan( $tablet, $desktop, "{$block}: the desktop radius prints after the tablet media rule, so it beats it" );
		$this->assertLessThan( $mobile, $tablet, "{$block}: the tablet radius prints after the mobile media rule, so it beats it" );
	}

	/**
	 * Render, parse and compare (or record) one case.
	 *
	 * @param string $block Block folder name.
	 * @param string $case  Case name.
	 */
	#[DataProvider( 'cases' )]
	public function test_border_css_declaration_sets_are_unchanged( string $block, string $case ): void {
		$out = $this->render_block( 'sgs/' . $block, array_merge( self::block_base( $block ), self::case_attrs( $case ) ) );
		$map = self::parse_css( $out['css'] );

		$file = __DIR__ . '/fixtures/border-element/' . $block . '.json';

		if ( '1' === getenv( 'SGS_RECORD_BORDER_GOLDENS' ) ) {
			$golden          = is_file( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : array();
			$golden          = is_array( $golden ) ? $golden : array();
			$golden[ $case ] = $map;
			ksort( $golden );
			if ( ! is_dir( dirname( $file ) ) ) {
				mkdir( dirname( $file ), 0777, true );
			}
			file_put_contents( $file, json_encode( $golden, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
			$this->markTestSkipped( "RECORD MODE: wrote golden for {$block} / {$case}; nothing was asserted." );
		}

		$this->assertFileExists( $file, 'no golden for ' . $block . '; record with SGS_RECORD_BORDER_GOLDENS=1' );
		$golden = json_decode( (string) file_get_contents( $file ), true );
		$this->assertArrayHasKey( $case, $golden, "no golden for {$block} / {$case}" );

		$diff = self::diff( $golden[ $case ], $map );
		$this->assertSame( '', $diff, "{$block} / {$case}: printed CSS declaration set changed:\n" . $diff );
	}

	/**
	 * Human-readable difference between two declaration maps.
	 *
	 * @param array<string, array<int, string>> $want Golden.
	 * @param array<string, array<int, string>> $got  Actual.
	 */
	private static function diff( array $want, array $got ): string {
		$lines = array();
		foreach ( array_unique( array_merge( array_keys( $want ), array_keys( $got ) ) ) as $key ) {
			$w       = $want[ $key ] ?? null;
			$g       = $got[ $key ] ?? null;
			$missing = array_diff( $w ?? array(), $g ?? array() );
			$extra   = array_diff( $g ?? array(), $w ?? array() );
			if ( null === $w ) {
				$lines[] = "  [{$key}] selector is NEW; declarations: " . implode( '; ', $g );
			} elseif ( null === $g ) {
				$lines[] = "  [{$key}] selector is GONE; declarations were: " . implode( '; ', $w );
			} elseif ( $missing || $extra ) {
				$lines[] = "  [{$key}] missing: " . ( $missing ? implode( '; ', $missing ) : '-' ) . ' | extra: ' . ( $extra ? implode( '; ', $extra ) : '-' );
			}
		}
		return implode( "\n", $lines );
	}

	/**
	 * Parse CSS into "context || selector" => sorted unique "prop:value" list.
	 *
	 * @param string $css Raw printed CSS.
	 * @return array<string, array<int, string>>
	 */
	public static function parse_css( string $css ): array {
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		// Per-render unique class (md5 of the attributes) is normalised.
		$css = (string) preg_replace( '/\bsgs-([a-z]+)-[0-9a-f]{8,32}\b/', 'sgs-$1-UID', $css );
		$map = array();
		self::walk( $css, '', $map );
		foreach ( $map as $key => $decls ) {
			$decls = array_values( array_unique( $decls ) );
			sort( $decls, SORT_STRING );
			$map[ $key ] = $decls;
		}
		ksort( $map );
		return $map;
	}

	/**
	 * Split text at depth-0 occurrences of a delimiter, respecting (), [], quotes and {}.
	 *
	 * @param string $text  Text.
	 * @param string $delim Single-character delimiter.
	 * @return array<int, string>
	 */
	private static function split_top( string $text, string $delim ): array {
		$parts = array();
		$cur   = '';
		$depth = 0;
		$quote = '';
		$len   = strlen( $text );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $text[ $i ];
			if ( '' !== $quote ) {
				$cur .= $c;
				if ( '\\' === $c && $i + 1 < $len ) {
					$cur .= $text[ ++$i ];
				} elseif ( $c === $quote ) {
					$quote = '';
				}
				continue;
			}
			if ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '(' === $c || '[' === $c || '{' === $c ) {
				++$depth;
			} elseif ( ')' === $c || ']' === $c || '}' === $c ) {
				--$depth;
			} elseif ( $c === $delim && 0 === $depth ) {
				$parts[] = $cur;
				$cur     = '';
				continue;
			}
			$cur .= $c;
		}
		$parts[] = $cur;
		return $parts;
	}

	/**
	 * Collapse whitespace, including around structural punctuation.
	 *
	 * @param string $s Text.
	 */
	private static function norm( string $s ): string {
		$s = trim( (string) preg_replace( '/\s+/', ' ', $s ) );
		$s = (string) preg_replace( '/\s*([,>+~])\s*(?![^(]*\))/', '$1', $s );
		return (string) preg_replace( '/\s*([:,])\s+/', '$1', $s );
	}

	/**
	 * Walk a stylesheet body, filling $map.
	 *
	 * @param string                            $css     CSS text.
	 * @param string                            $context Wrapping at-rule chain.
	 * @param array<string, array<int, string>> $map     Output.
	 */
	private static function walk( string $css, string $context, array &$map ): void {
		$len = strlen( $css );
		$i   = 0;
		while ( $i < $len ) {
			// Find the next '{' or ';' at depth 0 (prelude end).
			$j     = $i;
			$depth = 0;
			$quote = '';
			for ( ; $j < $len; $j++ ) {
				$c = $css[ $j ];
				if ( '' !== $quote ) {
					if ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '(' === $c ) {
					++$depth;
				} elseif ( ')' === $c ) {
					--$depth;
				} elseif ( 0 === $depth && ( '{' === $c || ';' === $c ) ) {
					break;
				}
			}
			$prelude = trim( substr( $css, $i, $j - $i ) );
			if ( $j >= $len || ';' === $css[ $j ] ) {
				$i = $j + 1; // Statement at-rule (@import/@charset) or trailing junk.
				continue;
			}
			// Match the closing brace.
			$d     = 0;
			$quote = '';
			$k     = $j;
			for ( ; $k < $len; $k++ ) {
				$c = $css[ $k ];
				if ( '' !== $quote ) {
					if ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '{' === $c ) {
					++$d;
				} elseif ( '}' === $c ) {
					--$d;
					if ( 0 === $d ) {
						break;
					}
				}
			}
			$body = substr( $css, $j + 1, $k - $j - 1 );
			$i    = $k + 1;

			$prelude = self::norm( $prelude );
			if ( '' !== $prelude && '@' === $prelude[0] && 1 === preg_match( '/^@(media|supports|container|layer|keyframes|-webkit-keyframes)\b/', $prelude ) ) {
				self::walk( $body, '' === $context ? $prelude : $context . ' >> ' . $prelude, $map );
				continue;
			}
			self::rule( $prelude, $body, $context, $map );
		}
	}

	/**
	 * Record one style rule's declarations (nested rules are keyed under their parent selector).
	 *
	 * @param string                            $selector Selector as printed, whitespace-normalised.
	 * @param string                            $body     Rule body.
	 * @param string                            $context  At-rule chain.
	 * @param array<string, array<int, string>> $map      Output.
	 */
	private static function rule( string $selector, string $body, string $context, array &$map ): void {
		$key           = $context . ' || ' . $selector;
		$map[ $key ] ??= array();
		foreach ( self::split_top( $body, ';' ) as $segment ) {
			$segment = trim( $segment );
			if ( '' === $segment ) {
				continue;
			}
			if ( false !== strpos( $segment, '{' ) ) {
				$brace = strpos( $segment, '{' );
				$inner = self::norm( substr( $segment, 0, $brace ) );
				self::rule( $selector . ' >> ' . $inner, substr( $segment, $brace + 1, -1 ), $context, $map );
				continue;
			}
			$colon = strpos( $segment, ':' );
			if ( false === $colon ) {
				continue;
			}
			$prop          = strtolower( trim( substr( $segment, 0, $colon ) ) );
			$val           = trim( (string) preg_replace( '/\s+/', ' ', substr( $segment, $colon + 1 ) ) );
			$val           = (string) preg_replace( '/\s*,\s*/', ',', $val );
			$val           = (string) preg_replace( '/\(\s+/', '(', $val );
			$val           = (string) preg_replace( '/\s+\)/', ')', $val );
			$map[ $key ][] = $prop . ':' . $val;
		}
		if ( array() === $map[ $key ] ) {
			unset( $map[ $key ] );
		}
	}
}
