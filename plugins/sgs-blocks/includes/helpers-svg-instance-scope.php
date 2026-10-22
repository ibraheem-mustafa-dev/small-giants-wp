<?php
/**
 * Scope one inlined SVG file to its own instance on the page.
 *
 * An SVG printed inline shares the page's id space and stylesheet: its <style> rules match every element on the page
 * and two copies of one file repeat each id, so a url(#g) in the second copy paints with the first copy's gradient.
 * sgs_svg_scope_instance() gives the root <svg> a unique id, prefixes every id in the file with it (rewriting each
 * url(#id), href="#id", begin/end "id.event" and aria id list to match), renames the file's @keyframes, and limits
 * every selector in its <style> to the root's subtree with `:where(#root)`, so each rule keeps its own specificity.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_svg_scope_instance' ) ) {
	/**
	 * Scope sanitised SVG markup to one instance.
	 *
	 * @param string $svg   Markup rebuilt by sgs_svg_sanitise_document() (well-formed, <svg> root).
	 * @param string $scope Unique id for this instance; becomes the root's id and the prefix of every other id.
	 * @return string The scoped markup, or '' when the markup cannot be parsed.
	 */
	function sgs_svg_scope_instance( string $svg, string $scope ): string {
		$scope = (string) preg_replace( '/[^A-Za-z0-9_-]/', '', $scope );
		if ( '' === $scope || 0 !== strpos( $svg, '<svg' ) ) {
			return '';
		}
		$doc      = new DOMDocument();
		$previous = libxml_use_internal_errors( true );
		$parsed   = $doc->loadXML( $svg, LIBXML_NONET );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );
		if ( ! $parsed || ! $doc->documentElement ) {
			return '';
		}
		$root  = $doc->documentElement;
		$xpath = new DOMXPath( $doc );

		$ids = array();
		foreach ( $xpath->query( '//*[@id]' ) as $element ) {
			$old         = (string) $element->getAttribute( 'id' );
			$ids[ $old ] = $element->isSameNode( $root ) ? $scope : $scope . '-' . $old;
		}
		$frames = array();
		foreach ( $doc->getElementsByTagName( 'style' ) as $style ) {
			if ( preg_match_all( '/@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)/', (string) $style->textContent, $m ) ) {
				foreach ( $m[1] as $name ) {
					$frames[ $name ] = $scope . '-' . $name;
				}
			}
		}

		foreach ( $xpath->query( '//*' ) as $element ) {
			foreach ( iterator_to_array( $element->attributes ) as $attr ) {
				$name  = strtolower( (string) $attr->localName );
				$value = (string) $attr->value;
				if ( 'id' === $name ) {
					$value = $ids[ $value ] ?? $value;
				} elseif ( 'href' === $name && 0 === strpos( $value, '#' ) ) {
					$value = '#' . ( $ids[ substr( $value, 1 ) ] ?? substr( $value, 1 ) );
				} elseif ( 'begin' === $name || 'end' === $name ) {
					$value = (string) preg_replace_callback(
						'/(^|[;\s])([A-Za-z_][\w-]*)(?=\.)/',
						static function ( $m ) use ( $ids ) {
							return $m[1] . ( $ids[ $m[2] ] ?? $m[2] );
						},
						$value
					);
				} elseif ( in_array( $name, array( 'aria-labelledby', 'aria-describedby' ), true ) ) {
					$value = implode(
						' ',
						array_map(
							static function ( $id ) use ( $ids ) {
								return $ids[ $id ] ?? $id;
							},
							preg_split( '/\s+/', trim( $value ) )
						)
					);
				} else {
					$value = sgs_svg_scope_css_urls( $value, $ids );
					if ( 'style' === $name ) {
						$value = sgs_svg_scope_animation_names( $value, $frames );
					}
				}
				if ( $value !== (string) $attr->value ) {
					$attr->value = $value;
				}
			}
		}
		$root->setAttribute( 'id', $scope );

		foreach ( iterator_to_array( $doc->getElementsByTagName( 'style' ) ) as $style ) {
			$css = sgs_svg_scope_css( (string) $style->textContent, '#' . $scope, $ids, $frames );
			while ( $style->firstChild ) {
				$style->removeChild( $style->firstChild );
			}
			$style->appendChild( $doc->createTextNode( $css ) );
		}
		return (string) $doc->saveXML( $root );
	}
}

if ( ! function_exists( 'sgs_svg_scope_css_urls' ) ) {
	/**
	 * Point every url(#id) at the renamed id.
	 *
	 * @param string               $value CSS or attribute text.
	 * @param array<string,string> $ids   Old id => new id.
	 * @return string
	 */
	function sgs_svg_scope_css_urls( string $value, array $ids ): string {
		return (string) preg_replace_callback(
			'/url\(\s*(["\']?)#([^"\')\s]+)\1\s*\)/i',
			static function ( $m ) use ( $ids ) {
				return 'url(' . $m[1] . '#' . ( $ids[ $m[2] ] ?? $m[2] ) . $m[1] . ')';
			},
			$value
		);
	}
}

if ( ! function_exists( 'sgs_svg_scope_animation_names' ) ) {
	/**
	 * Rename the file's keyframes inside every animation and animation-name declaration of a declaration block.
	 *
	 * @param string               $decls  Declarations.
	 * @param array<string,string> $frames Old keyframes name => new name.
	 * @return string
	 */
	function sgs_svg_scope_animation_names( string $decls, array $frames ): string {
		if ( ! $frames ) {
			return $decls;
		}
		return (string) preg_replace_callback(
			'/(\banimation(?:-name)?\s*:)([^;}]*)/i',
			static function ( $m ) use ( $frames ) {
				return $m[1] . preg_replace_callback(
					'/(?<![\w-])([A-Za-z_][\w-]*)(?![\w-])/',
					static function ( $n ) use ( $frames ) {
						return $frames[ $n[1] ] ?? $n[1];
					},
					$m[2]
				);
			},
			$decls
		);
	}
}

if ( ! function_exists( 'sgs_svg_scope_split' ) ) {
	/**
	 * Split text on a character that sits outside strings, parentheses and brackets.
	 *
	 * @param string $text Text.
	 * @param string $sep  One separator character.
	 * @return string[]
	 */
	function sgs_svg_scope_split( string $text, string $sep ): array {
		$parts = array();
		$depth = 0;
		$quote = '';
		$start = 0;
		$len   = strlen( $text );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $text[ $i ];
			if ( '' !== $quote ) {
				if ( '\\' === $c ) {
					++$i;
				} elseif ( $c === $quote ) {
					$quote = '';
				}
				continue;
			}
			if ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '(' === $c || '[' === $c ) {
				++$depth;
			} elseif ( ')' === $c || ']' === $c ) {
				$depth = max( 0, $depth - 1 );
			} elseif ( $c === $sep && 0 === $depth ) {
				$parts[] = substr( $text, $start, $i - $start );
				$start   = $i + 1;
			}
		}
		$parts[] = substr( $text, $start );
		return $parts;
	}
}

if ( ! function_exists( 'sgs_svg_scope_selector' ) ) {
	/**
	 * Limit one selector to the instance root's subtree, keeping its specificity. A selector that starts with the
	 * `svg` type matches the root itself, so the root's id joins that compound instead.
	 *
	 * @param string               $selector One selector (no commas).
	 * @param string               $root     The root's id selector (#scope).
	 * @param array<string,string> $ids      Old id => new id.
	 * @return string
	 */
	function sgs_svg_scope_selector( string $selector, string $root, array $ids ): string {
		$selector = trim( (string) preg_replace_callback(
			'/#((?:[A-Za-z0-9_-]|\\\\.)+)/',
			static function ( $m ) use ( $ids ) {
				return '#' . ( $ids[ $m[1] ] ?? $m[1] );
			},
			$selector
		) );
		if ( '' === $selector ) {
			return '';
		}
		if ( preg_match( '/^svg(?![\w-])/i', $selector ) ) {
			return 'svg:where(' . $root . ')' . substr( $selector, 3 );
		}
		if ( preg_match( '/^:root(?![\w-])/i', $selector ) ) {
			return 'svg:where(' . $root . ')' . substr( $selector, 5 );
		}
		return ':where(' . $root . ') ' . $selector;
	}
}

if ( ! function_exists( 'sgs_svg_scope_css' ) ) {
	/**
	 * Scope a <style> element's CSS to the instance root: every rule's selectors, nested inside conditional at-rules too;
	 * @keyframes renamed; url(#id) and #id selectors pointed at the renamed ids.
	 *
	 * @param string               $css    CSS text.
	 * @param string               $root   The root's id selector (#scope).
	 * @param array<string,string> $ids    Old id => new id.
	 * @param array<string,string> $frames Old keyframes name => new name.
	 * @return string
	 */
	function sgs_svg_scope_css( string $css, string $root, array $ids, array $frames ): string {
		$css = (string) preg_replace( '#/\*.*?(?:\*/|$)#s', '', $css );
		$out = '';
		$len = strlen( $css );
		$pos = 0;
		while ( $pos < $len ) {
			$open = strpos( $css, '{', $pos );
			$semi = strpos( $css, ';', $pos );
			if ( false === $open ) {
				$out .= trim( substr( $css, $pos ) );
				break;
			}
			if ( false !== $semi && $semi < $open ) {
				$out .= trim( substr( $css, $pos, $semi - $pos + 1 ) );
				$pos  = $semi + 1;
				continue;
			}
			$prelude = trim( substr( $css, $pos, $open - $pos ) );
			$depth   = 1;
			$i       = $open + 1;
			for ( ; $i < $len && $depth > 0; $i++ ) {
				if ( '{' === $css[ $i ] ) {
					++$depth;
				} elseif ( '}' === $css[ $i ] ) {
					--$depth;
				}
			}
			$body = substr( $css, $open + 1, max( 0, $i - $open - 2 ) );
			$pos  = $i;
			if ( preg_match( '/^@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)/i', $prelude, $m ) ) {
				$out .= '@keyframes ' . ( $frames[ $m[1] ] ?? $m[1] ) . '{' . $body . '}';
			} elseif ( preg_match( '/^@(?:media|supports|container|layer|document)\b/i', $prelude ) ) {
				$out .= $prelude . '{' . sgs_svg_scope_css( $body, $root, $ids, $frames ) . '}';
			} elseif ( 0 === strpos( $prelude, '@' ) ) {
				$out .= $prelude . '{' . $body . '}';
			} else {
				$selectors = array_filter(
					array_map(
						static function ( $s ) use ( $root, $ids ) {
							return sgs_svg_scope_selector( $s, $root, $ids );
						},
						sgs_svg_scope_split( $prelude, ',' )
					)
				);
				$out      .= implode( ',', $selectors ) . '{' . sgs_svg_scope_animation_names( sgs_svg_scope_css_urls( $body, $ids ), $frames ) . '}';
			}
		}
		return $out;
	}
}
