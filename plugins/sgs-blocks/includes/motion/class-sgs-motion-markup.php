<?php
/**
 * Motion markup: data attributes on each target element and the injected paint layers (Spec 38A §6.5, FR-38A-49).
 *
 * Attributes go on through `WP_HTML_Tag_Processor`, which escapes every value. The block root is the first tag after
 * any leading `<style>`/`<script>` a block prepends (the same skip `includes/animation-attributes.php` uses). A part
 * target is every element carrying its BEM class; a custom target is every element matching its selector's last
 * compound (classes and tag). A target marked `child` (the container wrapper's band) matches a direct child of the root
 * only, so a nested container's band, which carries the same classes, is never stamped.
 *
 * Injected layers: the tag processor cannot insert markup, so an element that needs layers is first marked with a
 * temporary attribute, then each `<span class="sgs-motion-layer" data-sgs-layer="<owner>" aria-hidden="true"></span>`
 * is appended just before that element's matching close tag and the mark is removed. A void element (an `<img>`)
 * cannot hold a layer and gets none.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Markup
 */
final class Sgs_Motion_Markup {

	const MARK = 'data-sgs-ml-mark';

	const VOID = array( 'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'SOURCE', 'TRACK', 'WBR' );

	/** Elements the tag processor visits as one token: their closer is never visited, so they never open a level. */
	const ATOMIC = array( 'IFRAME', 'NOEMBED', 'NOFRAMES', 'SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE', 'XMP' );

	/**
	 * Split leading `<style>`/`<script>` tags from the block's real root.
	 *
	 * @param string $html Block HTML.
	 * @return array{0:string,1:string} Head and rest.
	 */
	public static function split_head( string $html ): array {
		$offset = 0;
		while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $html, $offset ), $m ) ) {
			$close     = '</' . strtolower( $m[1] ) . '>';
			$close_pos = stripos( $html, $close, $offset );
			if ( false === $close_pos ) {
				break;
			}
			$offset = $close_pos + strlen( $close );
		}
		return array( substr( $html, 0, $offset ), substr( $html, $offset ) );
	}

	/**
	 * Whether the tag processor's current tag matches a target.
	 *
	 * @param \WP_HTML_Tag_Processor $p     Processor on a tag.
	 * @param array<string,mixed>    $match Target matcher.
	 * @param int                    $depth The tag's depth below the root (1 for a direct child).
	 * @return bool
	 */
	private static function matches( $p, array $match, int $depth = 1 ): bool {
		if ( ! empty( $match['child'] ) && 1 !== $depth ) {
			return false;
		}
		if ( null !== $match['tag'] && $p->get_tag() !== $match['tag'] ) {
			return false;
		}
		if ( array() === $match['classes'] && null === $match['tag'] ) {
			return false;
		}
		foreach ( $match['classes'] as $class ) {
			if ( true !== $p->has_class( $class ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Write the plans onto the markup.
	 *
	 * @param string                         $html       Block HTML.
	 * @param array<int,array<string,mixed>> $plans      Per target: match, attrs, layers.
	 * @param array<string,string>           $root_attrs Attributes for the root.
	 * @param string                         $scope      Scope class for the root ('' for none).
	 * @param string                         $css_tag    A `<style>` tag to keep inline (editor preview), or ''.
	 * @return string
	 */
	public static function apply( string $html, array $plans, array $root_attrs, string $scope, string $css_tag = '' ): string {
		list( $head, $rest ) = self::split_head( $html );
		$p                   = new \WP_HTML_Tag_Processor( $rest );
		if ( ! $p->next_tag() ) {
			return $html;
		}
		if ( '' !== $scope ) {
			$p->add_class( $scope );
		}
		foreach ( $root_attrs as $name => $value ) {
			$p->set_attribute( $name, '' === $value ? true : $value );
		}
		$marked = false;
		foreach ( $plans as $plan ) {
			if ( $plan['match']['root'] ) {
				$marked = self::write( $p, $plan ) || $marked;
			}
		}
		$open = array( (string) $p->get_tag() );
		while ( self::next_open( $p, $open ) ) {
			$depth = count( $open ) - ( self::opens_level( $p ) ? 1 : 0 );
			foreach ( $plans as $plan ) {
				if ( ! $plan['match']['root'] && self::matches( $p, $plan['match'], $depth ) ) {
					$marked = self::write( $p, $plan ) || $marked;
				}
			}
		}
		$rest = $p->get_updated_html();
		if ( $marked ) {
			$rest = self::inject_layers( $rest );
		}
		return $css_tag . $head . $rest;
	}

	/**
	 * Advance to the next opening tag, keeping the stack of open elements (the root first). A closer pops back to its
	 * matching open element; a closer with no open match is ignored.
	 *
	 * @param \WP_HTML_Tag_Processor $p    Processor.
	 * @param array<int,string>      $open Open element names, upper case; the current tag is pushed when it opens a level.
	 * @return bool Whether an opening tag was found.
	 */
	private static function next_open( $p, array &$open ): bool {
		while ( $p->next_tag( array( 'tag_closers' => 'visit' ) ) ) {
			$tag = (string) $p->get_tag();
			if ( $p->is_tag_closer() ) {
				$at = array_search( $tag, array_reverse( $open, true ), true );
				if ( false !== $at ) {
					$open = array_slice( $open, 0, (int) $at );
				}
				continue;
			}
			if ( self::opens_level( $p ) ) {
				$open[] = $tag;
			}
			return true;
		}
		return false;
	}

	/**
	 * Whether the current opening tag holds children (not void, atomic or self-closing).
	 *
	 * @param \WP_HTML_Tag_Processor $p Processor on an opening tag.
	 * @return bool
	 */
	private static function opens_level( $p ): bool {
		$tag = (string) $p->get_tag();
		return ! in_array( $tag, self::VOID, true ) && ! in_array( $tag, self::ATOMIC, true ) && ! $p->has_self_closing_flag();
	}

	/**
	 * Write one plan's attributes on the current tag, and mark it for layers.
	 *
	 * @param \WP_HTML_Tag_Processor $p    Processor on a tag.
	 * @param array<string,mixed>    $plan A plan.
	 * @return bool Whether the tag was marked for layers.
	 */
	private static function write( $p, array $plan ): bool {
		foreach ( $plan['attrs'] as $name => $value ) {
			$p->set_attribute( $name, $value );
		}
		if ( array() === $plan['layers'] || in_array( $p->get_tag(), self::VOID, true ) ) {
			return false;
		}
		$p->set_attribute( self::MARK, implode( ' ', $plan['layers'] ) );
		return true;
	}

	/**
	 * The end offset of the open tag whose attribute starts at $from (quote-aware).
	 *
	 * @param string $html HTML.
	 * @param int    $from Offset inside the open tag.
	 * @return int|null Offset just after `>`.
	 */
	private static function open_tag_end( string $html, int $from ): ?int {
		$quote = '';
		for ( $i = $from, $n = strlen( $html ); $i < $n; $i++ ) {
			$c = $html[ $i ];
			if ( '' !== $quote ) {
				$quote = $c === $quote ? '' : $quote;
			} elseif ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '>' === $c ) {
				return $i + 1;
			}
		}
		return null;
	}

	/**
	 * The offset of the close tag matching an element that opened just before $from.
	 *
	 * @param string $html HTML.
	 * @param string $tag  Tag name, lower case.
	 * @param int    $from Offset after the open tag.
	 * @return int|null
	 */
	private static function close_tag_at( string $html, string $tag, int $from ): ?int {
		$depth = 1;
		if ( ! preg_match_all( '#<(/?)' . preg_quote( $tag, '#' ) . '\b[^>]*?(/?)>#i', $html, $m, PREG_OFFSET_CAPTURE | PREG_SET_ORDER, $from ) ) {
			return null;
		}
		foreach ( $m as $hit ) {
			if ( '/' === $hit[1][0] ) {
				--$depth;
				if ( 0 === $depth ) {
					return $hit[0][1];
				}
			} elseif ( '/' !== $hit[2][0] ) {
				++$depth;
			}
		}
		return null;
	}

	/**
	 * Replace each layer mark with its appended spans.
	 *
	 * @param string $html HTML with marks.
	 * @return string
	 */
	private static function inject_layers( string $html ): string {
		$pattern = '/\s' . preg_quote( self::MARK, '/' ) . '="([^"]*)"/';
		for ( $guard = 0; $guard < 256 && preg_match( $pattern, $html, $m, PREG_OFFSET_CAPTURE ); $guard++ ) {
			$attr_at = $m[0][1];
			$keys    = preg_split( '/\s+/', trim( $m[1][0] ) );
			$html    = substr_replace( $html, '', $attr_at, strlen( $m[0][0] ) );
			$start   = strrpos( substr( $html, 0, $attr_at ), '<' );
			if ( false === $start || ! preg_match( '/^<([a-zA-Z][a-zA-Z0-9-]*)/', substr( $html, $start ), $t ) ) {
				continue;
			}
			$open_end = self::open_tag_end( $html, $attr_at );
			$close_at = null === $open_end ? null : self::close_tag_at( $html, strtolower( $t[1] ), $open_end );
			if ( null === $close_at ) {
				continue;
			}
			$spans = '';
			foreach ( is_array( $keys ) ? $keys : array() as $key ) {
				$spans .= '<span class="sgs-motion-layer" data-sgs-layer="' . esc_attr( $key ) . '" aria-hidden="true"></span>';
			}
			$html = substr_replace( $html, $spans, $close_at, 0 );
		}
		return $html;
	}

	/**
	 * Whether a target's element is, or contains, an `<img fetchpriority="high">` (the LCP rule's image clause).
	 *
	 * @param string              $html  Block HTML.
	 * @param array<string,mixed> $match Target matcher.
	 * @return bool
	 */
	public static function is_priority_image( string $html, array $match ): bool {
		if ( false === stripos( $html, 'fetchpriority' ) ) {
			return false;
		}
		list( , $rest ) = self::split_head( $html );
		$p              = new \WP_HTML_Tag_Processor( $rest );
		$found          = $p->next_tag();
		if ( $found && $match['root'] ) {
			return self::holds_priority_image( $p );
		}
		$open  = array( (string) $p->get_tag() );
		$found = $found && self::next_open( $p, $open );
		while ( $found ) {
			if ( self::matches( $p, $match, count( $open ) - ( self::opens_level( $p ) ? 1 : 0 ) ) ) {
				$p->set_attribute( self::MARK, 'probe' );
				$probe = $p->get_updated_html();
				$at    = strpos( $probe, self::MARK . '="probe"' );
				$end   = false === $at ? null : self::open_tag_end( $probe, $at );
				$close = null === $end ? null : self::close_tag_at( $probe, strtolower( (string) $p->get_tag() ), $end );
				if ( 'IMG' === $p->get_tag() && 'high' === $p->get_attribute( 'fetchpriority' ) ) {
					return true;
				}
				if ( null !== $close && preg_match( '/<img\b[^>]*\bfetchpriority=(["\']?)high\1/i', substr( $probe, (int) $end, $close - (int) $end ) ) ) {
					return true;
				}
				return false;
			}
			$found = self::next_open( $p, $open );
		}
		return false;
	}

	/**
	 * Whether the root (the processor's current tag) is or contains a priority image.
	 *
	 * @param \WP_HTML_Tag_Processor $p Processor on the root tag.
	 * @return bool
	 */
	private static function holds_priority_image( $p ): bool {
		do {
			if ( 'IMG' === $p->get_tag() && 'high' === $p->get_attribute( 'fetchpriority' ) ) {
				return true;
			}
		} while ( $p->next_tag() );
		return false;
	}
}
