<?php
/**
 * Minimal WordPress core function/class stubs for standalone render.php
 * execution (scripts/qa/lib/render-css-harness.php).
 *
 * Scope: only what SGS render.php files actually call on the MANUAL /
 * DEFAULT source path — the block-attribute-driven markup + CSS build.
 * WP_Query / render_block()-delegating branches (query, wc-product,
 * cpt-collection sources) are deliberately NOT stubbed to full fidelity;
 * a harness caller should keep `source` at its manual/default value so
 * those branches are never entered. This mirrors the existing
 * plugins/sgs-blocks/tests/php/stubs/wp-functions.php idiom used by the
 * run-*-standalone.php test runners, extended with the additional
 * functions the colour/border/typography helpers + SGS_Container_Wrapper
 * need to run to completion.
 *
 * Real SGS logic (sgs_colour_value(), sgs_emit_state_colour_css(),
 * sgs_background_paint_decl(), SGS_Container_Wrapper::render(), etc.) is
 * NEVER stubbed here — render.php require_once's the real files, so the
 * actual production code is what runs and what gets asserted against.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

if ( ! function_exists( 'absint' ) ) {
	function absint( $val ): int {
		return abs( (int) $val );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $val ): string {
		return strtolower( preg_replace( '/[^a-z0-9_-]/i', '', (string) $val ) );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $val ): string {
		return trim( strip_tags( (string) $val ) );
	}
}

if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( $val, $fallback = '' ): string {
		$sanitized = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $val );
		return '' !== $sanitized ? $sanitized : $fallback;
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( $val ): string {
		return strip_tags( (string) $val );
	}
}

if ( ! function_exists( 'wp_kses_post' ) ) {
	function wp_kses_post( $val ): string {
		return (string) $val;
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $val ): string {
		return htmlspecialchars( (string) $val, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $val ): string {
		return htmlspecialchars( (string) $val, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $val ): string {
		$url = filter_var( (string) $val, FILTER_SANITIZE_URL );
		return $url ?: '';
	}
}

if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( string $text, string $domain = 'default' ): string {
		return esc_attr( $text );
	}
}

if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}

if ( ! function_exists( '_x' ) ) {
	function _x( string $text, string $context, string $domain = 'default' ): string {
		return $text;
	}
}

if ( ! function_exists( 'wp_unique_id' ) ) {
	function wp_unique_id( string $prefix = '' ): string {
		static $counter = 0;
		return $prefix . ( ++$counter );
	}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore -- CLI harness stub.
	}
}

if ( ! function_exists( 'wp_list_pluck' ) ) {
	function wp_list_pluck( array $list, $field ) {
		return array_map(
			static function ( $item ) use ( $field ) {
				return is_object( $item ) ? ( $item->{$field} ?? null ) : ( $item[ $field ] ?? null );
			},
			$list
		);
	}
}

if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	function get_block_wrapper_attributes( array $extra = array() ): string {
		$parts = array();
		foreach ( $extra as $key => $value ) {
			$parts[] = esc_attr( (string) $key ) . '="' . esc_attr( (string) $value ) . '"';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( string $tag, $value ) {
		return $value;
	}
}

if ( ! function_exists( 'do_action' ) ) {
	function do_action( string $tag, ...$args ): void {
		// No-op — harness has no listeners registered.
	}
}

if ( ! function_exists( 'is_admin' ) ) {
	function is_admin(): bool {
		return false;
	}
}

if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	/**
	 * Faithful-enough subset of WP core's wp_style_engine_get_styles() for the
	 * `color` (text/background/gradient), `shadow`, `typography`
	 * (fontSize/lineHeight/letterSpacing/textTransform/fontWeight/fontStyle)
	 * and `border.radius` shapes SGS render.php files pass. Real WP core ships
	 * a much larger style-engine; this stub covers exactly the shapes used on
	 * the manual/default render path so assertions reflect real selector +
	 * property + value output rather than a placeholder.
	 */
	function wp_style_engine_get_styles( array $styles, array $options = array() ): array {
		$decls = array();

		if ( isset( $styles['color'] ) && is_array( $styles['color'] ) ) {
			if ( ! empty( $styles['color']['text'] ) ) {
				$decls[] = 'color:' . $styles['color']['text'];
			}
			if ( ! empty( $styles['color']['gradient'] ) ) {
				$decls[] = 'background:' . $styles['color']['gradient'];
			} elseif ( ! empty( $styles['color']['background'] ) ) {
				$decls[] = 'background-color:' . $styles['color']['background'];
			}
		}

		if ( isset( $styles['shadow'] ) && '' !== $styles['shadow'] ) {
			$decls[] = 'box-shadow:' . $styles['shadow'];
		}

		if ( isset( $styles['typography'] ) && is_array( $styles['typography'] ) ) {
			$map = array(
				'fontSize'      => 'font-size',
				'lineHeight'    => 'line-height',
				'letterSpacing' => 'letter-spacing',
				'textTransform' => 'text-transform',
				'fontWeight'    => 'font-weight',
				'fontStyle'     => 'font-style',
			);
			foreach ( $map as $key => $prop ) {
				if ( isset( $styles['typography'][ $key ] ) && '' !== $styles['typography'][ $key ] ) {
					$decls[] = $prop . ':' . $styles['typography'][ $key ];
				}
			}
		}

		if ( isset( $styles['border']['radius'] ) ) {
			$radius = $styles['border']['radius'];
			if ( is_string( $radius ) && '' !== $radius ) {
				$decls[] = 'border-radius:' . $radius;
			} elseif ( is_array( $radius ) ) {
				$sides = array(
					'topLeft'     => 'border-top-left-radius',
					'topRight'    => 'border-top-right-radius',
					'bottomLeft'  => 'border-bottom-left-radius',
					'bottomRight' => 'border-bottom-right-radius',
				);
				foreach ( $sides as $key => $prop ) {
					if ( isset( $radius[ $key ] ) && '' !== $radius[ $key ] ) {
						$decls[] = $prop . ':' . $radius[ $key ];
					}
				}
			}
		}

		if ( empty( $decls ) ) {
			return array( 'css' => '' );
		}

		$selector = $options['selector'] ?? '';
		$css      = $selector . '{' . implode( ';', $decls ) . ';}';
		return array(
			'css'         => $css,
			'declarations' => $decls,
		);
	}
}

// NOTE: sgs_link_attributes() / sgs_render_media() are real SGS helpers
// (plugins/sgs-blocks/includes/helpers-link.php, helpers-media.php),
// require_once'd by render.php itself — never stubbed here, or the stub
// would collide with (or silently mask) the real implementation under test.

// ── Stub classes only used on branches the harness callers are expected to
// avoid (query / wc-product / cpt-collection source modes). Declared so a
// require_once of the real class files that reference them at class-body
// level (extends/implements/type-hints) still resolves; NOT functionally
// complete, and intentionally so — a harness call that reaches these is a
// caller bug (wrong `source` attribute), not a gap in the harness.
if ( ! class_exists( 'WP_Query' ) ) {
	class WP_Query {
		public array $posts = array();
		public function __construct( $args = array() ) {}
	}
}

if ( ! function_exists( 'render_block' ) ) {
	function render_block( array $parsed_block ): string {
		return '<!-- harness stub: render_block() not implemented, block=' . esc_attr( $parsed_block['blockName'] ?? '' ) . ' -->';
	}
}

if ( ! function_exists( 'get_post_thumbnail_id' ) ) {
	function get_post_thumbnail_id( $post = null ) {
		return 0;
	}
}

if ( ! function_exists( 'wp_get_attachment_image_url' ) ) {
	function wp_get_attachment_image_url( $id, $size = 'thumbnail' ) {
		return '';
	}
}

if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( $id, $key = '', $single = false ) {
		return $single ? '' : array();
	}
}

if ( ! function_exists( 'get_the_title' ) ) {
	function get_the_title( $post = null ): string {
		return '';
	}
}

if ( ! function_exists( 'get_the_excerpt' ) ) {
	function get_the_excerpt( $post = null ): string {
		return '';
	}
}

if ( ! function_exists( 'wp_trim_words' ) ) {
	function wp_trim_words( $text, $num_words = 55, $more = null ): string {
		return (string) $text;
	}
}

if ( ! function_exists( 'get_permalink' ) ) {
	function get_permalink( $post = null ) {
		return '';
	}
}

if ( ! function_exists( 'wp_reset_postdata' ) ) {
	function wp_reset_postdata(): void {}
}

if ( ! function_exists( 'wp_interactivity_state' ) ) {
	function wp_interactivity_state( string $namespace, array $state = array() ): array {
		static $stores = array();
		if ( ! isset( $stores[ $namespace ] ) ) {
			$stores[ $namespace ] = array();
		}
		$stores[ $namespace ] = array_merge( $stores[ $namespace ], $state );
		return $stores[ $namespace ];
	}
}

if ( ! function_exists( 'esc_html_e' ) ) {
	function esc_html_e( string $text, string $domain = 'default' ): void {
		echo esc_html( $text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	}
}

if ( ! function_exists( 'esc_attr_e' ) ) {
	function esc_attr_e( string $text, string $domain = 'default' ): void {
		echo esc_attr( $text ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	}
}

if ( ! function_exists( 'rest_url' ) ) {
	function rest_url( string $path = '' ): string {
		return 'https://example.test/wp-json/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( string $path = '' ): string {
		return 'https://example.test/wp-admin/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'home_url' ) ) {
	function home_url( string $path = '' ): string {
		return 'https://example.test/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'wp_create_nonce' ) ) {
	function wp_create_nonce( string $action = '-1' ): string {
		return 'harness-nonce';
	}
}

if ( ! function_exists( 'wp_interactivity_data_wp_context' ) ) {
	function wp_interactivity_data_wp_context( array $context, string $namespace = '' ): string {
		return 'data-wp-context=\'' . json_encode( $context ) . '\'';
	}
}
