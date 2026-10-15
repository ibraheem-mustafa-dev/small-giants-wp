<?php
/**
 * WordPress stand-ins for the motion renderer tests (MotionRendererTest, MotionRefusalsTest and
 * run-motion-refusal-parity.php): just enough of the hook API, the block type registry (reading the real block.json
 * files), `WP_HTML_Tag_Processor` and the effect registry to run the shipped motion classes without WordPress.
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable

namespace SGS\Blocks {
	if ( ! class_exists( __NAMESPACE__ . '\SGS_Motion_Registry' ) ) {
		/** The effect registry, read from the real generated projection of `fx_effects`. */
		class SGS_Motion_Registry {
			public static function effects(): array {
				require_once dirname( __DIR__, 3 ) . '/includes/generated-fx-effects.php';
				return \sgs_get_motion_fx_effects();
			}
		}
	}
}

namespace {
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
	}
	if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
		define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 3 ) . '/' );
	}

	$GLOBALS['sgs_test_filters'] = $GLOBALS['sgs_test_filters'] ?? array();
	$GLOBALS['sgs_test_actions'] = $GLOBALS['sgs_test_actions'] ?? array();

	if ( ! function_exists( 'add_filter' ) ) {
		function add_filter( $hook, $cb, $priority = 10, $args = 1 ) {
			$GLOBALS['sgs_test_filters'][ $hook ][ $priority ][] = array( $cb, $args );
			return true;
		}
	}
	if ( ! function_exists( 'add_action' ) ) {
		function add_action( $hook, $cb, $priority = 10, $args = 1 ) {
			return add_filter( $hook, $cb, $priority, $args );
		}
	}
	if ( ! function_exists( 'apply_filters' ) ) {
		function apply_filters( $hook, $value, ...$rest ) {
			$by_priority = $GLOBALS['sgs_test_filters'][ $hook ] ?? array();
			ksort( $by_priority );
			foreach ( $by_priority as $callbacks ) {
				foreach ( $callbacks as $entry ) {
					$value = call_user_func_array( $entry[0], array_slice( array_merge( array( $value ), $rest ), 0, $entry[1] ) );
				}
			}
			return $value;
		}
	}
	if ( ! function_exists( 'do_action' ) ) {
		function do_action( $hook, ...$args ) {
			$GLOBALS['sgs_test_actions'][] = array( $hook, $args );
		}
	}
	if ( ! function_exists( 'wp_json_encode' ) ) {
		function wp_json_encode( $data, $flags = 0 ) {
			return json_encode( $data, $flags | JSON_UNESCAPED_SLASHES );
		}
	}
	if ( ! function_exists( 'esc_attr' ) ) {
		function esc_attr( $text ) {
			return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
		}
	}
	if ( ! function_exists( 'is_admin' ) ) {
		function is_admin() {
			return ! empty( $GLOBALS['sgs_test_is_admin'] );
		}
	}
	if ( ! function_exists( 'in_the_loop' ) ) {
		function in_the_loop() {
			return ! empty( $GLOBALS['sgs_test_in_loop'] );
		}
	}
	// Asset registration and enqueue stand-ins: record the handle, so a test can read what a render enqueued.
	if ( ! function_exists( 'wp_register_style' ) ) {
		function wp_register_style( $handle, $src = '', $deps = array(), $ver = false, $media = 'all' ) {
			$GLOBALS['sgs_test_registered'][ 'style:' . $handle ] = array( 'src' => $src, 'deps' => $deps, 'ver' => $ver, 'args' => $media );
		}
		function wp_register_script( $handle, $src = '', $deps = array(), $ver = false, $args = array() ) {
			$GLOBALS['sgs_test_registered'][ 'script:' . $handle ] = array( 'src' => $src, 'deps' => $deps, 'ver' => $ver, 'args' => $args );
		}
		function wp_register_script_module( $id, $src = '', $deps = array(), $ver = false ) {
			$GLOBALS['sgs_test_registered'][ 'module:' . $id ] = array( 'src' => $src, 'deps' => $deps, 'ver' => $ver, 'args' => array() );
		}
		function wp_enqueue_script( $handle ) {
			$GLOBALS['sgs_test_enqueued'][ 'script:' . $handle ] = true;
		}
		function wp_enqueue_script_module( $id ) {
			$GLOBALS['sgs_test_enqueued'][ 'module:' . $id ] = true;
		}
	}
	if ( ! function_exists( 'wp_enqueue_style' ) ) {
		function wp_enqueue_style( $handle ) {
			$GLOBALS['sgs_test_enqueued_styles'][] = $handle;
		}
	}
	if ( ! function_exists( 'wp_is_serving_rest_request' ) ) {
		function wp_is_serving_rest_request() {
			return ! empty( $GLOBALS['sgs_test_rest'] );
		}
	}

	if ( ! class_exists( 'WP_Block_Type_Registry' ) ) {
		/** Block types read from the real `src/blocks/<slug>/block.json`. */
		class WP_Block_Type_Registry {
			private static $inst;
			private $types = array();
			public static function get_instance() {
				return self::$inst ??= new self();
			}
			public function get_registered( $name ) {
				if ( ! array_key_exists( $name, $this->types ) ) {
					$slug = substr( (string) $name, strpos( (string) $name, '/' ) + 1 );
					$file = dirname( __DIR__, 3 ) . '/src/blocks/' . $slug . '/block.json';
					$json = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null;
					$this->types[ $name ] = is_array( $json ) ? (object) array( 'supports' => $json['supports'] ?? array() ) : null;
				}
				return $this->types[ $name ];
			}
		}
	}

	if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		/**
		 * A regex stand-in for the opening-tag walk the motion markup class uses. Attributes are read by a tokeniser that
		 * consumes each quoted value whole, so text inside a value that looks like an attribute (`title="a data-x=1"`)
		 * or a `>` inside a value is never read as markup (`sgs_test_tag_processor_self_test()` proves it).
		 */
		class WP_HTML_Tag_Processor {
			/** One attribute: name, then a double-quoted, single-quoted or bare value (all optional). */
			const ATTR = '/\s+([^\s"\'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'=<>`]+)))?/';

			private $html;
			private $start = -1;
			private $len   = 0;
			private $tag   = '';
			private $closer = false;
			public function __construct( $html ) {
				$this->html = (string) $html;
			}
			public function next_tag( $query = null ) {
				$closers = is_array( $query ) && 'visit' === ( $query['tag_closers'] ?? '' );
				$from    = $this->start < 0 ? 0 : $this->start + $this->len;
				$body    = '(?:\s(?:[^>"\']|"[^"]*"|\'[^\']*\')*)?>/';
				$pattern = $closers ? '/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)' . $body : '/<()([a-zA-Z][a-zA-Z0-9-]*)' . $body;
				if ( ! preg_match( $pattern, $this->html, $m, PREG_OFFSET_CAPTURE, $from ) ) {
					return false;
				}
				$this->closer = '/' === $m[1][0];
				$this->tag    = strtoupper( $m[2][0] );
				$this->start  = $m[0][1];
				$this->len    = strlen( $m[0][0] );
				return true;
			}
			public function is_tag_closer() {
				return $this->closer;
			}
			public function has_self_closing_flag() {
				return '/>' === substr( $this->open(), -2 );
			}
			public function get_tag() {
				return '' === $this->tag ? null : $this->tag;
			}
			private function open() {
				return substr( $this->html, $this->start, $this->len );
			}
			/**
			 * The open tag's attributes in order: lower-case name => [ value or true, offset, length ] (first wins).
			 */
			private function attributes() {
				$open = $this->open();
				$head = preg_match( '/^<[a-zA-Z][a-zA-Z0-9-]*/', $open, $t ) ? strlen( $t[0] ) : 0;
				$out  = array();
				preg_match_all( self::ATTR, $open, $all, PREG_SET_ORDER | PREG_OFFSET_CAPTURE, $head );
				foreach ( $all as $m ) {
					$name = strtolower( $m[1][0] );
					if ( isset( $out[ $name ] ) ) {
						continue;
					}
					$value = true;
					foreach ( array( 2, 3, 4 ) as $group ) {
						if ( isset( $m[ $group ] ) && -1 !== $m[ $group ][1] ) {
							$value = html_entity_decode( $m[ $group ][0], ENT_QUOTES );
							break;
						}
					}
					$out[ $name ] = array( $value, $m[0][1], strlen( $m[0][0] ) );
				}
				return $out;
			}
			public function get_attribute( $name ) {
				$attrs = $this->attributes();
				return isset( $attrs[ strtolower( $name ) ] ) ? $attrs[ strtolower( $name ) ][0] : null;
			}
			public function has_class( $class ) {
				$classes = $this->get_attribute( 'class' );
				return is_string( $classes ) && in_array( $class, preg_split( '/\s+/', trim( $classes ) ), true );
			}
			private function replace_open( $new ) {
				$this->html = substr_replace( $this->html, $new, $this->start, $this->len );
				$this->len  = strlen( $new );
			}
			/** The open tag without one attribute. */
			private function without( $name ) {
				$open  = $this->open();
				$attrs = $this->attributes();
				$found = $attrs[ strtolower( $name ) ] ?? null;
				return null === $found ? $open : substr_replace( $open, '', $found[1], $found[2] );
			}
			public function set_attribute( $name, $value ) {
				$open = $this->without( $name );
				$attr = true === $value ? ' ' . $name : ' ' . $name . '="' . htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ) . '"';
				$head = preg_match( '/^<[a-zA-Z][a-zA-Z0-9-]*/', $open, $t ) ? strlen( $t[0] ) : 0;
				$this->replace_open( substr_replace( $open, $attr, $head, 0 ) );
				return true;
			}
			public function remove_attribute( $name ) {
				$this->replace_open( $this->without( $name ) );
				return true;
			}
			public function add_class( $class ) {
				$current = $this->get_attribute( 'class' );
				return $this->set_attribute( 'class', is_string( $current ) && '' !== trim( $current ) ? trim( $current ) . ' ' . $class : $class );
			}
			public function get_updated_html() {
				return $this->html;
			}
		}
	}

	/**
	 * The stand-in's own check: attribute-like text and a `>` inside quoted values are never read as attributes or as
	 * the end of the tag, and a write replaces only the real attribute. Returns the failures (empty when it holds).
	 *
	 * @return array<int,string>
	 */
	function sgs_test_tag_processor_self_test(): array {
		$fail = array();
		$p    = new WP_HTML_Tag_Processor( '<div title="x data-sgs-mh=&quot;root&quot; class=&quot;no&quot;" data-q=\'a > b\' class="real"><span class="in">t</span></div>' );
		$p->next_tag();
		if ( null !== $p->get_attribute( 'data-sgs-mh' ) ) {
			$fail[] = 'read an attribute from inside a quoted value';
		}
		if ( 'real' !== $p->get_attribute( 'class' ) ) {
			$fail[] = 'class was not the real attribute';
		}
		if ( 'a > b' !== $p->get_attribute( 'data-q' ) ) {
			$fail[] = 'a > inside a single-quoted value ended the tag';
		}
		$p->set_attribute( 'class', 'real two' );
		$p->set_attribute( 'data-sgs-mh', 'self' );
		$html = $p->get_updated_html();
		if ( false === strpos( $html, 'title="x data-sgs-mh=&quot;root&quot; class=&quot;no&quot;"' ) ) {
			$fail[] = 'a write changed text inside another attribute\'s value';
		}
		if ( 1 !== substr_count( $html, ' class="real two"' ) || 1 !== substr_count( $html, ' data-sgs-mh="self"' ) ) {
			$fail[] = 'a write did not replace exactly the real attribute';
		}
		if ( ! $p->next_tag() || 'SPAN' !== $p->get_tag() || ! $p->has_class( 'in' ) ) {
			$fail[] = 'the walk did not reach the next real tag';
		}
		return $fail;
	}

	require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-breakpoints.php';
	require_once dirname( __DIR__, 3 ) . '/includes/helpers-hover-state.php';
	require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-css-registry.php';
	require_once dirname( __DIR__, 3 ) . '/includes/motion-loader.php';

	/**
	 * Run one parsed block through the renderer's three hooks in WordPress's order (render_block_data, the render
	 * callback, render_block at 20, render_block last). The callbacks are called directly, because other test files
	 * in the suite define no-op `add_filter()` stubs.
	 */
	function sgs_test_render_motion_block( array $block, string $html, $parent = null, ?callable $inner = null ): string {
		$renderer = '\SGS\Blocks\Motion\Sgs_Motion_Renderer';
		$block    = $renderer::open_frame( $block, $block, $parent );
		if ( null !== $inner ) {
			$inner();
		}
		$out = $renderer::render( $html, $block );
		return $renderer::close_frame( $out, $block );
	}
}
