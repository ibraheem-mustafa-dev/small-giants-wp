<?php
/**
 * A minimal WP_HTML_Tag_Processor for the render harness, loaded only by `--render-children`: the opening-tag walk a
 * delegating render (a products-mode sgs/card-grid) runs over the children it prints to tag each item. It reads
 * double-quoted class attributes only, which is all an SGS render prints.
 *
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable

if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
	/** Opening tags in document order; has_class(), set_attribute() and get_updated_html(). */
	class WP_HTML_Tag_Processor {
		private string $html;
		private int $start = -1;
		private int $len   = 0;
		public function __construct( $html ) {
			$this->html = (string) $html;
		}
		public function next_tag( $query = null ): bool {
			if ( ! preg_match( '/<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/', $this->html, $m, PREG_OFFSET_CAPTURE, $this->start + 1 ) ) {
				return false;
			}
			$this->start = (int) $m[0][1];
			$this->len   = strlen( $m[0][0] );
			return true;
		}
		public function has_class( $class_name ): bool {
			$open = substr( $this->html, $this->start, $this->len );
			return 1 === preg_match( '/\sclass="([^"]*)"/', $open, $m ) && in_array( $class_name, preg_split( '/\s+/', trim( $m[1] ) ), true );
		}
		public function set_attribute( $name, $value ): bool {
			$open = substr( $this->html, $this->start, $this->len );
			$tail = str_ends_with( $open, '/>' ) ? '/>' : '>';
			$new  = substr( $open, 0, -strlen( $tail ) ) . ' ' . $name . '="' . htmlspecialchars( (string) $value, ENT_QUOTES ) . '"' . $tail;
			$this->html = substr_replace( $this->html, $new, $this->start, $this->len );
			$this->len  = strlen( $new );
			return true;
		}
		public function get_updated_html(): string {
			return $this->html;
		}
	}
}
