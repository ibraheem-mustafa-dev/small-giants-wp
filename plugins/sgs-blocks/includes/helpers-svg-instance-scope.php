<?php
/**
 * Scope one inlined SVG file to its own instance on the page.
 *
 * An SVG printed inline shares the page's id space and stylesheet: its <style> rules match every element on the page
 * and two copies of one file repeat each id, so a url(#g) in the second copy paints with the first copy's gradient.
 * sgs_svg_scope_instance() gives the root <svg> a unique id, prefixes every id in the file with it (rewriting each
 * url(#id), href="#id", begin/end "id.event" and aria id list to match), renames the file's @keyframes, and limits
 * every selector in its <style> to the root's subtree with `:where(#root)`, so each rule keeps its own specificity.
 * A file holding a <script> keeps its ids and id references untouched (its script looks elements up by id); only its
 * <style> is contained.
 *
 * The <style> CSS is read the way the browser's tokenizer reads it (strings, escapes, comments and nested brackets),
 * so a brace inside a string, after a backslash or inside a comment never ends a rule. Only qualified rules, @media,
 * @supports and @keyframes (with its vendor forms) pass; every other at-rule, statement, unbalanced item and nested
 * rule is dropped. The result is read again and must hold only scoped rules and prefixed keyframes, or the <style>
 * element is removed.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-svg-scope-css-reader.php';

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

		// A file with a <script> keeps every id and id reference as written, so the script can still find its elements;
		// its <style> is contained by a data-sgs-svg attribute on the root, never by an id the page could also hold.
		$scripted = $doc->getElementsByTagName( 'script' )->length > 0;
		$root_sel = $scripted ? '[data-sgs-svg="' . $scope . '"]' : '#' . $scope;
		$prefix   = sgs_svg_scope_prefix( $root_sel );
		$ids = array();
		foreach ( $scripted ? array() : $xpath->query( '//*[@id]' ) as $element ) {
			$old         = (string) $element->getAttribute( 'id' );
			$ids[ $old ] = $element->isSameNode( $root ) ? $scope : $scope . '-' . $old;
		}
		$frames = array();
		foreach ( $doc->getElementsByTagName( 'style' ) as $style ) {
			if ( preg_match_all( '/@(?:-webkit-|-moz-|-o-)?keyframes\s+([A-Za-z_][\w-]*)/', (string) $style->textContent, $m ) ) {
				foreach ( $m[1] as $name ) {
					$frames[ $name ] = $prefix . '-' . $name;
				}
			}
		}

		foreach ( $xpath->query( '//*' ) as $element ) {
			foreach ( iterator_to_array( $element->attributes, false ) as $attr ) {
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
		$root->setAttribute( $scripted ? 'data-sgs-svg' : 'id', $scope );

		foreach ( iterator_to_array( $doc->getElementsByTagName( 'style' ) ) as $style ) {
			$css = sgs_svg_scope_css( (string) $style->textContent, $root_sel, $ids, $frames );
			if ( '' === $css ) {
				$style->parentNode->removeChild( $style );
				continue;
			}
			while ( $style->firstChild ) {
				$style->removeChild( $style->firstChild );
			}
			$style->appendChild( $doc->createTextNode( $css ) );
		}
		return (string) $doc->saveXML( $root );
	}
}

if ( ! function_exists( 'sgs_svg_scope_prefix' ) ) {
	/**
	 * The name prefix an instance gives its keyframes: its root selector without punctuation.
	 *
	 * @param string $root The root's selector (#scope or [data-sgs-svg="scope"]).
	 * @return string
	 */
	function sgs_svg_scope_prefix( string $root ): string {
		return (string) preg_replace( '/[^A-Za-z0-9_-]/', '', $root );
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

if ( ! function_exists( 'sgs_svg_scope_selector' ) ) {
	/**
	 * Limit one selector to the instance root's subtree, keeping its specificity, or '' when it cannot be limited. A
	 * selector that starts with the `svg` type (or :root) matches the root itself, so the root's id joins that
	 * compound, and it may carry no sibling combinator (+ or ~), which could reach past the root. A selector that
	 * starts with a combinator is dropped.
	 *
	 * @param string               $selector One selector (no top-level commas).
	 * @param string               $root     The root's id selector (#scope).
	 * @param array<string,string> $ids      Old id => new id.
	 * @return string
	 */
	function sgs_svg_scope_selector( string $selector, string $root, array $ids ): string {
		$selector = trim(
			(string) preg_replace_callback(
				'/#((?:[A-Za-z0-9_-]|\\\\.)+)/',
				static function ( $m ) use ( $ids ) {
					return '#' . ( $ids[ $m[1] ] ?? $m[1] );
				},
				$selector
			)
		);
		if ( '' === $selector || false !== strpos( '>+~|', $selector[0] ) ) {
			return '';
		}
		if ( preg_match( '/^(?:svg|:root)(?![\w|\\\\-])/i', $selector, $m ) ) {
			if ( null !== sgs_svg_scope_find_top_level( $selector, 0, '+~' ) ) {
				return '';
			}
			return 'svg:where(' . $root . ')' . substr( $selector, strlen( $m[0] ) );
		}
		return ':where(' . $root . ') ' . $selector;
	}
}

if ( ! function_exists( 'sgs_svg_scope_has_block' ) ) {
	/**
	 * Whether a declaration list holds a nested block (a nested rule or at-rule).
	 *
	 * @param string $decls Declaration list.
	 * @return bool
	 */
	function sgs_svg_scope_has_block( string $decls ): bool {
		$i   = 0;
		$len = strlen( $decls );
		while ( $i < $len ) {
			list( $end, $stop ) = sgs_svg_scope_scan( $decls, $i, false );
			if ( '{' === $stop ) {
				return true;
			}
			$i = $end + 1;
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_svg_scope_rules' ) ) {
	/**
	 * Scope comment-free CSS: qualified rules limited to the root, @media and @supports recursed, @keyframes (and its
	 * vendor forms) renamed with the instance prefix; every other at-rule, every statement, every unclean item and
	 * every rule holding a nested block dropped.
	 *
	 * @param string               $css    Comment-free CSS.
	 * @param string               $root   The root's selector (#scope, or [data-sgs-svg="scope"]).
	 * @param array<string,string> $ids    Old id => new id.
	 * @param array<string,string> $frames Old keyframes name => new name.
	 * @return string
	 */
	function sgs_svg_scope_rules( string $css, string $root, array $ids, array $frames ): string {
		$out = '';
		foreach ( sgs_svg_scope_items( $css ) as $item ) {
			if ( ! $item['clean'] || null === $item['body'] ) {
				continue;
			}
			$prelude = $item['prelude'];
			$body    = $item['body'];
			if ( preg_match( '/^@(?:-webkit-|-moz-|-o-)?keyframes\s+([A-Za-z_][\w-]*)$/i', $prelude, $m ) ) {
				$out .= '@keyframes ' . ( $frames[ $m[1] ] ?? sgs_svg_scope_prefix( $root ) . '-' . $m[1] ) . '{' . $body . '}';
			} elseif ( preg_match( '/^@(?:media|supports)(?![\w-])/i', $prelude ) ) {
				$out .= $prelude . '{' . sgs_svg_scope_rules( $body, $root, $ids, $frames ) . '}';
			} elseif ( '@' !== $prelude[0] && ! sgs_svg_scope_has_block( $body ) ) {
				$selectors = array();
				foreach ( sgs_svg_scope_split( $prelude ) as $selector ) {
					$scoped = sgs_svg_scope_selector( $selector, $root, $ids );
					if ( '' === $scoped ) {
						$selectors = array();
						break;
					}
					$selectors[] = $scoped;
				}
				if ( $selectors ) {
					$out .= implode( ',', $selectors ) . '{' . sgs_svg_scope_animation_names( sgs_svg_scope_css_urls( $body, $ids ), $frames ) . '}';
				}
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_svg_scope_verify' ) ) {
	/**
	 * Read scoped CSS again and confirm every top-level item is a clean rule whose every selector starts with the root
	 * scope, a @keyframes named with the instance prefix, or a @media/@supports holding only such items.
	 *
	 * @param string $css  Scoped CSS.
	 * @param string $root The root's selector (#scope, or [data-sgs-svg="scope"] for a scripted file).
	 * @return bool
	 */
	function sgs_svg_scope_verify( string $css, string $root ): bool {
		$inner   = ':where(' . $root . ') ';
		$on_root = 'svg:where(' . $root . ')';
		$prefix  = sgs_svg_scope_prefix( $root ) . '-';
		foreach ( sgs_svg_scope_items( $css ) as $item ) {
			if ( ! $item['clean'] || null === $item['body'] ) {
				return false;
			}
			$prelude = $item['prelude'];
			if ( preg_match( '/^@keyframes\s+([A-Za-z_][\w-]*)$/', $prelude, $m ) ) {
				if ( 0 !== strpos( $m[1], $prefix ) ) {
					return false;
				}
				continue;
			}
			if ( preg_match( '/^@(?:media|supports)(?![\w-])/i', $prelude ) ) {
				if ( ! sgs_svg_scope_verify( $item['body'], $root ) ) {
					return false;
				}
				continue;
			}
			if ( sgs_svg_scope_has_block( $item['body'] ) ) {
				return false;
			}
			foreach ( sgs_svg_scope_split( $prelude ) as $selector ) {
				$selector = trim( $selector );
				if ( 0 === strpos( $selector, $inner ) ) {
					$next = ltrim( substr( $selector, strlen( $inner ) ) );
					if ( '' === $next || false !== strpos( '+~|', $next[0] ) ) {
						return false;
					}
				} elseif ( 0 !== strpos( $selector, $on_root ) || null !== sgs_svg_scope_find_top_level( $selector, 0, '+~' ) ) {
					return false;
				}
			}
		}
		return true;
	}
}

if ( ! function_exists( 'sgs_svg_scope_css' ) ) {
	/**
	 * Scope a <style> element's CSS to the instance root, or return '' when the scoped result cannot be confirmed.
	 *
	 * @param string               $css    CSS text.
	 * @param string               $root   The root's selector (#scope, or [data-sgs-svg="scope"]).
	 * @param array<string,string> $ids    Old id => new id.
	 * @param array<string,string> $frames Old keyframes name => new name.
	 * @return string
	 */
	function sgs_svg_scope_css( string $css, string $root, array $ids, array $frames ): string {
		$scoped = sgs_svg_scope_rules( sgs_svg_scope_strip_comments( $css ), $root, $ids, $frames );
		return sgs_svg_scope_verify( $scoped, $root ) ? $scoped : '';
	}
}
