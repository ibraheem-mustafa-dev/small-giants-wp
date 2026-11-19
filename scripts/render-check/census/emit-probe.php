<?php
// Read-only emit probe: renders each block type with ONE setting changed at a time and records which CSS rules change.
// The result is the real setting -> (selector, property) map, read from what the code prints rather than from names.
//   wp eval-file emit-probe.php <probe-input.json> <emit-map.json>
// Input:  { "<block>": { "base": {attrs}, "probes": [ [ "<attr>", [ candidate values... ], "all"|"first" ] ] } }
// Output: { "<block>": { "rendered": bool, "base_rules": n, "attrs": { "<attr>": { "value": <candidate>, "rules": [ [media, selector, property, value, "+"|"-"|"~"] ] } } } }
// It writes nothing to the site: no post, option or meta is saved (rendering is what a page view does).

// A command-line probe run by `wp eval-file` in the global scope: it sets the global post and product the way a page view would, prints nothing
// to a browser and writes only its output JSON file outside the site.
// phpcs:disable WordPress.WP.GlobalVariablesOverride, WordPress.WP.AlternativeFunctions, WordPress.PHP.DevelopmentFunctions, WordPress.PHP.DiscouragedPHPFunctions, WordPress.Security.EscapeOutput, WordPress.WP.CapitalPDangit

$sgs_probe_in  = json_decode( file_get_contents( $args[0] ), true );
$sgs_probe_out = array();

function sgs_probe_split( string $text, string $sep ): array {
	$out   = array();
	$depth = 0;
	$quote = '';
	$cur   = '';
	$len   = strlen( $text );
	for ( $i = 0; $i < $len; $i++ ) {
		$ch = $text[ $i ];
		if ( '' !== $quote ) {
			$cur .= $ch;
			if ( '\\' === $ch && $i + 1 < $len ) {
				$cur .= $text[ ++$i ];
			} elseif ( $ch === $quote ) {
				$quote = '';
			}
			continue;
		}
		if ( '"' === $ch || "'" === $ch ) {
			$quote = $ch;
			$cur  .= $ch;
			continue;
		}
		if ( '(' === $ch || '[' === $ch ) {
			++$depth;
		} elseif ( ')' === $ch || ']' === $ch ) {
			--$depth;
		}
		if ( $ch === $sep && 0 === $depth ) {
			$out[] = $cur;
			$cur   = '';
			continue;
		}
		$cur .= $ch;
	}
	$out[] = $cur;
	return $out;
}

// CSS text -> [ "media\x1fselector\x1fproperty" => value ].
function sgs_probe_triples( string $css, string $media = '', array &$out = array() ): array {
	$css = preg_replace( '#/\*.*?\*/#s', '', $css );
	$len = strlen( $css );
	$pos = 0;
	while ( $pos < $len ) {
		$open = strpos( $css, '{', $pos );
		if ( false === $open ) {
			break;
		}
		$prelude = trim( substr( $css, $pos, $open - $pos ) );
		$depth   = 1;
		$i       = $open + 1;
		$quote   = '';
		while ( $i < $len && $depth > 0 ) {
			$ch = $css[ $i ];
			if ( '' !== $quote ) {
				if ( '\\' === $ch ) {
					++$i;
				} elseif ( $ch === $quote ) {
					$quote = '';
				}
			} elseif ( '"' === $ch || "'" === $ch ) {
				$quote = $ch;
			} elseif ( '{' === $ch ) {
				++$depth;
			} elseif ( '}' === $ch ) {
				--$depth;
			}
			++$i;
		}
		$body = substr( $css, $open + 1, $i - $open - 2 );
		$pos  = $i;
		if ( '' !== $prelude && '@' === $prelude[0] ) {
			if ( preg_match( '/^@(media|supports|container|layer)\b/i', $prelude ) ) {
				sgs_probe_triples( $body, trim( $media . ' ' . preg_replace( '/\s+/', ' ', $prelude ) ), $out );
			}
			continue;
		}
		$selector = preg_replace( '/\s+/', ' ', $prelude );
		foreach ( sgs_probe_split( $body, ';' ) as $decl ) {
			$at = strpos( $decl, ':' );
			if ( false === $at ) {
				continue;
			}
			$prop = strtolower( trim( substr( $decl, 0, $at ) ) );
			if ( ! preg_match( '/^-{0,2}[a-z][a-z0-9-]*$/', $prop ) ) {
				continue;   // a nested at-rule inside the rule body is not a declaration
			}
			$out[ $media . "\x1f" . $selector . "\x1f" . $prop ] = trim( substr( $decl, $at + 1 ) );
		}
	}
	return $out;
}

function sgs_probe_css( string $name, array $attrs ): ?array {
	try {
		if ( 'woocommerce/cart' === $name || 'woocommerce/checkout' === $name ) {
			$css = \SGS\Blocks\sgs_commerce_look_css( $attrs, 'woocommerce/cart' === $name ? 'cart' : 'checkout', 'sgsuid-00000000' );
			return array( 'x', $css );
		}
		$GLOBALS['sgs_collected_css'] = array();
		ob_start();
		// A placeholder child, so a wrapper block that hides itself when empty still renders; a block that echoes is read from the buffer.
		$html  = render_block(
			array(
				'blockName'    => $name,
				'attrs'        => $attrs,
				'innerBlocks'  => array(),
				'innerHTML'    => '<p>probe</p>',
				'innerContent' => array( '<p>probe</p>' ),
			)
		);
		$html .= (string) ob_get_clean();
		$css   = implode( "\n", $GLOBALS['sgs_collected_css'] );
		if ( preg_match_all( '#<style\b[^>]*>(.*?)</style>#is', (string) $html, $m ) ) {
			$css .= "\n" . implode( "\n", $m[1] );
		}
		// A scope class that counts renders (sgs-pc-12) instead of hashing settings: read it off the root element.
		if ( preg_match( '/^\s*(?:<style\b.*?<\/style>\s*)*<\w+\b[^>]*\bclass="([^"]*)/s', (string) $html, $rm ) ) {
			foreach ( preg_split( '/\s+/', $rm[1] ) as $cls ) {
				if ( preg_match( '/^[a-z][a-z-]*-\d+$/', $cls ) ) {
					$css = preg_replace( '/\.' . preg_quote( $cls, '/' ) . '(?![A-Za-z0-9_])/', '.SGSUID', $css );
				}
			}
		}
		return array( (string) $html, $css );
	} catch ( \Throwable $e ) {
		while ( ob_get_level() > 1 ) {
			ob_end_clean();
		}
		return null;
	}
}

// Every instance scope class (a class ending in 8 hex characters) becomes one token, so two renders compare.
function sgs_probe_norm( string $css ): string {
	return preg_replace( '/([.#])[A-Za-z][A-Za-z0-9_-]*?-[0-9a-f]{8}(?![0-9a-f])/', '$1SGSUID', $css );
}

wp_set_current_user( 1 );
if ( function_exists( 'wc_load_cart' ) && function_exists( 'WC' ) && null === WC()->cart ) {
	wc_load_cart();
}
$sgs_probe_products = function_exists( 'wc_get_products' ) ? wc_get_products(
	array(
		'limit'  => 1,
		'status' => 'publish',
		'type'   => 'variable',
	)
) : array();
if ( ! $sgs_probe_products && function_exists( 'wc_get_products' ) ) {
	$sgs_probe_products = wc_get_products(
		array(
			'limit'  => 1,
			'status' => 'publish',
		)
	);
}
if ( $sgs_probe_products ) {
	$GLOBALS['post']    = get_post( $sgs_probe_products[0]->get_id() );
	$GLOBALS['product'] = $sgs_probe_products[0];
	setup_postdata( $GLOBALS['post'] );
}
error_reporting( 0 );

foreach ( $sgs_probe_in as $name => $spec ) {
	$t0 = microtime( true );
	// The first saved instance that renders is the base; when none does (they need a context the probe lacks, such as an order), the block's defaults are.
	$bases     = is_array( $spec['bases'] ?? null ) ? $spec['bases'] : array();
	$bases[]   = array();
	$fell_back = false;
	foreach ( $bases as $bi => $base ) {
		$r0 = sgs_probe_css( $name, $base );
		if ( null !== $r0 && '' !== trim( $r0[0] . $r0[1] ) ) {
			$fell_back = array() === $base && count( $bases ) > 1;
			break;
		}
	}
	$row = array(
		'rendered' => null !== $r0 && '' !== trim( $r0[0] . $r0[1] ),
		'base'     => $fell_back ? 'defaults' : 'saved',
		'attrs'    => array(),
	);
	if ( ! $row['rendered'] ) {
		$sgs_probe_out[ $name ] = $row;
		fwrite( STDERR, "$name: not rendered\n" );
		continue;
	}
	$t_base            = sgs_probe_triples( sgs_probe_norm( $r0[1] ) );
	$row['base_rules'] = count( $t_base );
	$renders           = 1;
	foreach ( $spec['probes'] as $probe ) {
		list( $attr, $candidates, $mode ) = $probe;
		$found                            = array();
		$used                             = null;
		foreach ( $candidates as $cand ) {
			if ( array_key_exists( $attr, $base ) && $base[ $attr ] === $cand ) {
				continue;
			}
			$r1 = sgs_probe_css( $name, array_merge( $base, array( $attr => $cand ) ) );
			++$renders;
			if ( null === $r1 ) {
				continue;
			}
			$t1   = sgs_probe_triples( sgs_probe_norm( $r1[1] ) );
			$diff = array();
			foreach ( $t1 as $k => $v ) {
				if ( ! array_key_exists( $k, $t_base ) ) {
					$diff[ $k ] = array( $v, '+' );
				} elseif ( $t_base[ $k ] !== $v ) {
					$diff[ $k ] = array( $v, '~' );
				}
			}
			foreach ( $t_base as $k => $v ) {
				if ( ! array_key_exists( $k, $t1 ) ) {
					$diff[ $k ] = array( $v, '-' );
				}
			}
			if ( $diff ) {
				if ( null === $used ) {
					$used = $cand;
				}
				foreach ( $diff as $k => $v ) {
					if ( ! isset( $found[ $k ] ) ) {
						$found[ $k ] = $v;
					}
				}
				if ( 'first' === $mode ) {
					break;
				}
			}
		}
		if ( $found ) {
			$rules = array();
			foreach ( $found as $k => $v ) {
				$p       = explode( "\x1f", $k );
				$rules[] = array( $p[0], $p[1], $p[2], substr( (string) $v[0], 0, 80 ), $v[1] );
				if ( count( $rules ) >= 120 ) {
					break;
				}
			}
			$row['attrs'][ $attr ] = array(
				'value' => $used,
				'rules' => $rules,
				'total' => count( $found ),
			);
		}
	}
	$row['renders']         = $renders;
	$row['seconds']         = round( microtime( true ) - $t0, 1 );
	$sgs_probe_out[ $name ] = $row;
	fwrite( STDERR, sprintf( "%s: %d of %d settings print CSS (%d renders, %.1fs)\n", $name, count( $row['attrs'] ), count( $spec['probes'] ), $renders, $row['seconds'] ) );
}
file_put_contents( $args[1], json_encode( $sgs_probe_out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
echo 'emit map written: ' . count( $sgs_probe_out ) . " blocks\n";
