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
	/**
	 * Faithful "zero posts found" WP_Query stub (2026-09-03, A6).
	 *
	 * FABRICATES: nothing that a CSS assertion can read. This class invents
	 * only STRUCTURE — an empty result set — never a post title, excerpt,
	 * colour, or any other value. `have_posts()` always returns false and
	 * `the_post()` is a no-op, so any render.php loop written as
	 * `while ( $query->have_posts() ) { $query->the_post(); ... }` executes
	 * its loop body zero times and falls straight through to that render's
	 * own "nothing found" branch — the same honest empty-result path a real
	 * WP_Query takes on a site with no matching posts. `max_num_pages` is 0,
	 * matching WP core's real behaviour for a query with zero results.
	 *
	 * Why this is legitimate here but the class was previously left as a
	 * bare unusable stub: `sgs/post-grid` ALWAYS constructs a `new
	 * WP_Query()` on its manual/default render path (it has no `source`
	 * discriminator gating the call, unlike sgs/card-grid's `source==='query'`
	 * branch below) — so leaving `have_posts()`/`the_post()` undefined does
	 * not skip a branch, it fatals EVERY post-grid render, including the
	 * pure block-attribute-driven CSS (card colours, hover states, the
	 * `--sgs-card-bg`/`--sgs-hover-*` custom properties) that render.php
	 * emits BEFORE and INDEPENDENTLY of the post loop. Card-level markup
	 * (title/excerpt/image per post) still never renders under this stub —
	 * that is a real, disclosed gap (see "UNABLE TO DETECT" in the harness
	 * report), not a silent gloss.
	 *
	 * sgs/card-grid's own `new WP_Query()` call (its 'query' source mode) is
	 * NOT exercised by this stub becoming more capable — the harness forces
	 * `source` to 'manual' unless a caller explicitly overrides it (see
	 * render-css-harness.php), so card-grid never reaches this class's
	 * constructor at all under the default harness contract. Any future
	 * caller that DOES opt into `source: 'query'` gets the same honest
	 * "zero posts" result, never fabricated post content.
	 */
	class WP_Query {
		public array $posts         = array();
		public int $max_num_pages   = 0;
		private int $current_index = -1;

		public function __construct( $args = array() ) {}

		/**
		 * Always false — mirrors the real WP_Query's own "no posts matched"
		 * result. Never fabricates a post to iterate over.
		 */
		public function have_posts(): bool {
			return $this->current_index + 1 < count( $this->posts );
		}

		/**
		 * No-op advance — real WP_Query sets up global $post / $wp_query
		 * post data here; this stub's $posts array is always empty, so
		 * there is never a post to set up. Present only so render.php's
		 * `$query->the_post();` call site resolves instead of fataling.
		 */
		public function the_post(): void {
			++$this->current_index;
		}
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

if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( string $text, string $domain = 'default' ): string {
		return esc_html( $text );
	}
}

if ( ! function_exists( 'tag_escape' ) ) {
	/**
	 * Real WP core keeps only [a-zA-Z0-9_:] in a tag name — reproduced
	 * verbatim (minus the tag_escape filter hook, which has no listeners in
	 * this harness) so heading/label's dynamic-tag CSS selector reflects the
	 * same sanitised tag string a live site would emit.
	 */
	function tag_escape( string $tag_name ): string {
		return strtolower( preg_replace( '/[^a-zA-Z0-9_:]/', '', $tag_name ) );
	}
}

if ( ! function_exists( 'wp_kses' ) ) {
	function wp_kses( $content, $allowed_html, $allowed_protocols = array() ): string {
		// No allowlist filtering — the harness has no HTML-sanitisation policy
		// to reproduce, and every render.php call site here passes markup it
		// generated itself, not untrusted input. Matches wp_kses_post()'s
		// existing pass-through convention immediately above.
		return (string) $content;
	}
}

if ( ! function_exists( 'is_singular' ) ) {
	function is_singular( $post_types = '' ): bool {
		// The harness runs outside any WP_Query — there is no current page.
		return false;
	}
}

if ( ! function_exists( 'get_queried_object_id' ) ) {
	function get_queried_object_id(): int {
		return 0;
	}
}

if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path = array(), array $options = array() ) {
		// Empty settings tree — every SGS caller (sgs_resolve_palette_hex())
		// is documented to degrade to its own $fallback when global settings
		// are unavailable, so this is the faithful "unavailable" state, not
		// an invented palette.
		return array();
	}
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
	function wp_enqueue_style( string $handle, string $src = '', array $deps = array(), $ver = false, string $media = 'all' ): void {
		// No-op — matches do_action()'s convention (harness has no registered
		// asset queue to append to).
	}
}

if ( ! function_exists( 'has_action' ) ) {
	function has_action( string $tag, $function_to_check = false ) {
		// Matches do_action()'s "no listeners registered" convention.
		return false;
	}
}

if ( ! function_exists( '_n_noop' ) ) {
	/**
	 * Reproduces WP core's return shape exactly (singular/plural/context/
	 * domain keys) since callers read those keys directly via
	 * translate_nooped_plural(), not just the raw strings.
	 */
	function _n_noop( string $singular, string $plural, string $domain = 'default' ): array {
		return array(
			0          => $singular,
			1          => $plural,
			'singular' => $singular,
			'plural'   => $plural,
			'context'  => null,
			'domain'   => $domain,
		);
	}
}

if ( ! function_exists( 'get_theme_mod' ) ) {
	function get_theme_mod( string $name, $default = false ) {
		// No theme mods registered in the harness — the documented
		// "mod not set" behaviour is to return $default.
		return $default;
	}
}

if ( ! function_exists( 'get_the_ID' ) ) {
	function get_the_ID() {
		// No current post in the harness's rendering context.
		return 0;
	}
}

if ( ! function_exists( 'get_query_var' ) ) {
	function get_query_var( string $var, $default = '' ) {
		// No global WP_Query has run, so every query var is unset.
		return $default;
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	function get_posts( array $args = array() ): array {
		// No posts exist in the harness — faithful "nothing found" result,
		// matching the empty-array fallback documented on every SGS caller
		// (class-sgs-nav-menu-source.php falls through to its next source).
		return array();
	}
}

if ( ! function_exists( 'get_post' ) ) {
	function get_post( $post = null ) {
		// No current/specified post exists in the harness.
		return null;
	}
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( string $option, $default = false ) {
		// No options table in the harness — every option is unset.
		return $default;
	}
}

if ( ! function_exists( 'is_archive' ) ) {
	function is_archive(): bool {
		// Same "no current WP_Query" reasoning as is_singular() above.
		return false;
	}
}

if ( ! function_exists( 'wp_is_serving_rest_request' ) ) {
	function wp_is_serving_rest_request(): bool {
		// The harness is a plain CLI process, never a REST route — needed by
		// the real SGS\Blocks\sgs_is_frontend_render() (require_once'd below).
		return false;
	}
}

if ( ! function_exists( 'wp_kses_allowed_html' ) ) {
	function wp_kses_allowed_html( $context = '' ): array {
		// No core allowlist reproduced — matches wp_kses()'s own pass-through
		// convention above (this harness has no HTML-sanitisation policy to
		// mirror). Callers that array_merge() this in still get their own
		// explicit local allowlist entries.
		return array();
	}
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action( string $tag, $function_to_add, int $priority = 10, int $accepted_args = 1 ): bool {
		// No-op — matches do_action()'s "harness has no registered listeners"
		// convention (nothing here ever fires wp_footer etc.).
		return true;
	}
}

if ( ! function_exists( 'translate_nooped_plural' ) ) {
	/**
	 * Real WP core selects singular/plural by count and then runs the result
	 * through translate() — no translation catalogue exists in this harness
	 * (mirrors __()'s pass-through above), so this returns the untranslated
	 * English string WP core would fall back to.
	 */
	function translate_nooped_plural( array $nooped_plural, $count, string $domain = 'default' ): string {
		return 1 === (int) $count ? (string) $nooped_plural['singular'] : (string) $nooped_plural['plural'];
	}
}

if ( ! function_exists( 'get_theme_file_path' ) ) {
	function get_theme_file_path( string $file = '' ): string {
		// No theme is loaded in this harness. Returning a path that
		// deliberately cannot exist keeps the caller's own file_exists()
		// check honest (falls through to its "no header content" empty
		// return) instead of fabricating a file that does not really exist.
		return '/sgs-qa-harness-no-theme-loaded/' . ltrim( $file, '/' );
	}
}

// Reproduces SGS\Blocks\sgs_is_frontend_render() (class-sgs-css-registry.php)
// verbatim — declared in its own namespaced file for the same PHP-syntax
// reason as google-reviews-settings-stub.php below (a namespaced declaration
// cannot live in the same file as this file's unnamespaced global stubs).
// Not require_once'ing the real parent file: it also add_filter()s a
// render_block consolidation hook and defines CSS-cache-directory/glob/
// unlink filesystem helpers at load time that have nothing to do with a
// block's CSS output and would need their own filesystem stubbing to load
// safely standalone.
require_once __DIR__ . '/sgs-is-frontend-render-stub.php';

// Real SGS logic (SGS\Blocks\Sgs_Schema, includes/class-sgs-schema.php) — a
// small, side-effect-free static encoder class (no add_action/add_filter, no
// filesystem access), so it is loaded for real rather than stubbed.
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-schema.php';

// Real SGS logic (SGS\Blocks\Sgs_Site_Info, includes/class-sgs-site-info.php)
// — static-only, no top-level add_action/add_filter, and its get()/
// get_esc_html()/get_esc_url() paths call only get_option()/esc_html()/
// esc_url(), all already stubbed above — so it is loaded for real. Every
// key comes back '' (get_option()'s stubbed "unset" default), which is the
// faithful "no business info configured" state, not fabricated content.
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-site-info.php';

if ( ! function_exists( 'is_search' ) ) {
	function is_search(): bool {
		// Same "no current WP_Query" reasoning as is_singular()/is_archive().
		return false;
	}
}

if ( ! function_exists( 'plugins_url' ) ) {
	function plugins_url( string $path = '', string $plugin = '' ): string {
		return 'https://example.test/wp-content/plugins/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'is_404' ) ) {
	function is_404(): bool {
		// Same "no current WP_Query" reasoning as is_singular()/is_archive()/is_search().
		return false;
	}
}

if ( ! function_exists( 'human_time_diff' ) ) {
	/**
	 * Faithful-enough subset of WP core's human_time_diff(): same threshold
	 * ladder (mins/hours/days/weeks/months/years), same rounding, without the
	 * i18n plural-string catalogue (matches this file's __() pass-through
	 * convention — every unit noun stays English, e.g. "6 months" not a
	 * translated/pluralised phrase).
	 */
	function human_time_diff( int $from, int $to = 0 ): string {
		if ( 0 === $to ) {
			$to = time();
		}
		$diff = abs( $to - $from );
		if ( $diff < HOUR_IN_SECONDS ) {
			$mins = (int) round( $diff / MINUTE_IN_SECONDS );
			$mins = max( 1, $mins );
			return $mins . ' min' . ( 1 === $mins ? '' : 's' );
		}
		if ( $diff < DAY_IN_SECONDS ) {
			$hours = (int) round( $diff / HOUR_IN_SECONDS );
			return $hours . ' hour' . ( 1 === $hours ? '' : 's' );
		}
		if ( $diff < WEEK_IN_SECONDS ) {
			$days = (int) round( $diff / DAY_IN_SECONDS );
			return $days . ' day' . ( 1 === $days ? '' : 's' );
		}
		if ( $diff < MONTH_IN_SECONDS ) {
			$weeks = (int) round( $diff / WEEK_IN_SECONDS );
			return $weeks . ' week' . ( 1 === $weeks ? '' : 's' );
		}
		if ( $diff < YEAR_IN_SECONDS ) {
			$months = (int) round( $diff / MONTH_IN_SECONDS );
			return $months . ' month' . ( 1 === $months ? '' : 's' );
		}
		$years = (int) round( $diff / YEAR_IN_SECONDS );
		return $years . ' year' . ( 1 === $years ? '' : 's' );
	}
}

if ( ! defined( 'MINUTE_IN_SECONDS' ) ) {
	define( 'MINUTE_IN_SECONDS', 60 );
}
if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}
if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}
if ( ! defined( 'WEEK_IN_SECONDS' ) ) {
	define( 'WEEK_IN_SECONDS', 604800 );
}
if ( ! defined( 'MONTH_IN_SECONDS' ) ) {
	define( 'MONTH_IN_SECONDS', 2592000 );
}
if ( ! defined( 'YEAR_IN_SECONDS' ) ) {
	define( 'YEAR_IN_SECONDS', 31536000 );
}

if ( ! function_exists( 'wp_get_nav_menus' ) ) {
	function wp_get_nav_menus( array $args = array() ): array {
		// No classic nav-menu terms exist in the harness — faithful "site
		// has no classic menu" result, matching the empty-array fallback
		// documented on its caller.
		return array();
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ): bool {
		return $thing instanceof \WP_Error;
	}
}

if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public function __construct( $code = '', $message = '', $data = '' ) {}
	}
}

if ( ! function_exists( 'get_pages' ) ) {
	function get_pages( array $args = array() ): array {
		// No pages exist in the harness — faithful "nothing to expand"
		// result for from_page_list()'s no-ref fallback.
		return array();
	}
}

if ( ! function_exists( 'get_nav_menu_locations' ) ) {
	function get_nav_menu_locations(): array {
		// No classic theme menu locations are registered in the harness —
		// faithful "nothing assigned" result, matching the empty-array
		// fallback documented on its caller (falls through to the next
		// resolution source).
		return array();
	}
}

// ─────────────────────────────────────────────────────────────────────────
// DELIBERATELY NOT STUBBED: sgs/buybox (2026-09-03, A6 investigation).
//
// buybox/render.php's WooCommerce-absent fallback calls the WP core function
// do_blocks() (undefined here), so the block reports NOT RUN today. That
// looks like a one-line fix (stub do_blocks() to a no-op) — it is not,
// and stubbing it would make the harness WORSE, not better:
//
// do_blocks() only fires on buybox's WC-ABSENT/simple-product/manifest-null
// fallback branch, which renders ZERO of the block's own markup and emits
// NO <style> tag at all (it just echoes core WC block placeholders). Making
// that branch "run" would produce a permanently vacuous harness result —
// every CSS assertion against it would fail, on the TRUE claim and the
// FALSE claim alike, because no scoped <style> is ever printed on that path.
// That is a false unblock (see the harness README's discrimination
// requirement), not a real one, so it was rejected.
//
// Reaching buybox's REAL CSS-emitting code (the backgroundColour/textColour/
// border scoped <style> block, guarded behind `class_exists('WooCommerce')`
// AND a variable product AND a non-null Product_Manifest::build() result)
// would require fabricating a working WC_Product_Variable with real child
// variations — wc_get_product(), ->is_type('variable'), ->get_children(),
// ->get_variation_attributes(), plus, inside Product_Manifest::build()
// itself (plugins/sgs-blocks/includes/class-product-manifest.php, read in
// full for this investigation): $wpdb tax-rate + post_modified queries,
// get_transient()/set_transient(), wc_get_price_decimals(),
// wc_get_price_to_display(), wc_get_price_excluding_tax(),
// wc_get_price_including_tax(), ->is_on_sale(), ->is_in_stock(),
// ->get_image_id(), get_term_by(), get_term_meta(), wc_attribute_label(),
// and Configurator_Meta's sanitisers — a real product/variation/pricing
// object graph, not a thin WP/external-API boundary stand-in.
//
// That is not "minimum structure for the render path to execute" (the
// WP_Query one-empty-post-set stub above, or the google-reviews class stub
// below, are that). It is reconstructing a working slice of WooCommerce's
// own commerce data model inside a test harness — exactly the kind of
// fabrication this file's own header rules out ("Real SGS logic ... is
// NEVER stubbed here"; Product_Manifest::build() IS real SGS logic, and the
// commerce values it produces would be invented, not computed). Even though
// none of those invented values (price, stock, variation attrs) would
// directly satisfy a COLOUR assertion, building and maintaining that much
// fabricated commerce surface is not something a future reader could audit
// for CSS-safety with confidence, and it is disproportionate to what a CSS-
// effect harness needs.
//
// Verdict: sgs/buybox stays NOT RUN. An honest NOT RUN — and exit non-zero
// — is the correct outcome per this harness's own documented contract, not
// a gap to paper over with a fake product graph.
// ─────────────────────────────────────────────────────────────────────────

// google-reviews/render.php calls two static methods on the real
// SGS\Blocks\Google_Reviews_Settings (includes/google-reviews-settings.php).
// That file is NOT require_once'd here: its bottom line runs
// Google_Reviews_Settings::init(), which registers admin_menu/admin_init/
// wp_ajax_* hooks via add_action() and pulls in register_setting(),
// add_options_page(), add_settings_section() and friends — none of which
// exist in this harness and none of which affect the block's CSS output.
// This mirrors the WP_Query stub-class convention already established
// above: a thin stand-in for a WP/external-API boundary the manual render
// path is never meant to exercise faithfully.
// Declared in its own file (google-reviews-settings-stub.php) because it
// lives in the SGS\Blocks namespace — mixing a namespaced class with this
// file's unnamespaced global-scope function stubs in one file is a PHP
// parse error, not a style choice.
require_once __DIR__ . '/google-reviews-settings-stub.php';
