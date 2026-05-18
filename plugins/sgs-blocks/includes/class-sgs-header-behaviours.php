<?php
/**
 * Header Behaviours - wrapper-class injector and asset enqueuer (F4).
 *
 * Hooks into `sgs_header_rule_resolved` (a filter applied by
 * Sgs_Header_Rules::evaluate() after render_pattern() returns) to
 * inject two CSS classes into the outermost header element:
 *
 *   1. .sgs-header            - always present; stable cloning-pipeline hook.
 *   2. .sgs-header--<slug>    - behaviour modifier (transparent, sticky,
 *                               hide-on-scroll-down) when the matched rule
 *                               carries a behaviour key.
 *
 * Also enqueues header-behaviours.css and view.js on the frontend.
 *
 * Naming convention: SGS-prefixed BEM per blub.db row 236.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Behaviours
 */
final class Sgs_Header_Behaviours {

	/**
	 * Valid behaviour slugs. Any other value from the rule is treated as none.
	 *
	 * @var string[]
	 */
	const VALID_BEHAVIOURS = array( 'transparent', 'sticky', 'hide-on-scroll-down' );

	/**
	 * Wire WordPress hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_filter( 'sgs_header_rule_resolved', array( __CLASS__, 'inject_behaviour_class' ), 10, 2 );
		// Second filter: WP core wraps template-part content in <header class="wp-block-template-part">
		// AFTER our pattern HTML is returned. The first filter above can't inject onto that wrapper
		// because the wrapper doesn't exist yet at that point. This second filter runs post-wrap,
		// reads the active rule's behaviour, and injects the SGS classes into the wrapper.
		\add_filter( 'render_block_core/template-part', array( __CLASS__, 'inject_wrapper_class' ), 10, 2 );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * Inject .sgs-header (+ behaviour modifier) onto the <header class="wp-block-template-part">
	 * wrapper that WP core renders around the template-part content. Runs only for the header area;
	 * footer area is left untouched (FR-S3-3 owns the footer-side mirror).
	 *
	 * @param string              $block_content The fully-rendered template-part HTML (includes wrapper).
	 * @param array<string,mixed> $block         Parsed block.
	 * @return string
	 */
	public static function inject_wrapper_class( string $block_content, array $block ): string {
		if ( ( $block['attrs']['area'] ?? '' ) !== 'header' ) {
			return $block_content;
		}

		// Find the active rule that the rules engine matched on THIS request,
		// so we know the behaviour modifier. Re-evaluating won't double-render —
		// Sgs_Header_Rules has a per-request guard. Instead read directly from
		// the rules option + condition matcher.
		$rules = Sgs_Header_Rules::list_rules();
		$behaviour = 'none';
		foreach ( $rules as $rule ) {
			if ( Sgs_Header_Rules::rule_matches( $rule ) ) {
				$behaviour_raw = isset( $rule['behaviour'] ) ? (string) $rule['behaviour'] : 'none';
				$behaviour = in_array( $behaviour_raw, self::VALID_BEHAVIOURS, true ) ? $behaviour_raw : 'none';
				break;
			}
		}

		$classes_to_add = 'none' === $behaviour ? 'sgs-header' : 'sgs-header sgs-header--' . $behaviour;

		// Inject onto the FIRST <header ...> tag — typically the wrapper that core just added.
		$callback = static function ( array $matches ) use ( $classes_to_add ): string {
			$tag_open = $matches[1];
			$attrs    = $matches[2];

			if ( preg_match( '/\bclass=(["\'])([^"\']*)\1/i', $attrs, $cm ) ) {
				$merged   = trim( $cm[2] . ' ' . $classes_to_add );
				$new_attr = 'class=' . $cm[1] . $merged . $cm[1];
				$attrs    = str_replace( $cm[0], $new_attr, $attrs );
				return $tag_open . $attrs . '>';
			}

			return $tag_open . ' class="' . \esc_attr( $classes_to_add ) . '"' . $attrs . '>';
		};

		$result = preg_replace_callback(
			'/(<header)((?:\s[^>]*)?)>/i',
			$callback,
			$block_content,
			1
		);

		return null === $result ? $block_content : $result;
	}

	/**
	 * Inject .sgs-header (and the behaviour modifier when applicable) into
	 * the outermost header start tag.
	 *
	 * Strategy: locate the first <header ... > tag, then splice new classes
	 * into an existing class attribute, or add a fresh class attribute when
	 * none is present. When no header tag is found the content is returned
	 * unchanged so we never corrupt patterns that omit a semantic header element.
	 *
	 * @param string              $content Rendered pattern HTML.
	 * @param array<string,mixed> $rule    Matched rule definition.
	 * @return string
	 */
	public static function inject_behaviour_class( string $content, array $rule ): string {
		$behaviour_raw  = isset( $rule['behaviour'] ) ? (string) $rule['behaviour'] : 'none';
		$has_valid      = in_array( $behaviour_raw, self::VALID_BEHAVIOURS, true );
		$behaviour      = $has_valid ? $behaviour_raw : 'none';
		$classes_to_add = 'none' === $behaviour ? 'sgs-header' : 'sgs-header sgs-header--' . $behaviour;

		$callback = static function ( array $matches ) use ( $classes_to_add ): string {
			$tag_open = $matches[1];
			$attrs    = $matches[2];

			if ( preg_match( '/\bclass=(["\'])([^"\']*)\1/i', $attrs, $cm ) ) {
				$merged   = trim( $cm[2] . ' ' . $classes_to_add );
				$new_attr = 'class=' . $cm[1] . $merged . $cm[1];
				$attrs    = str_replace( $cm[0], $new_attr, $attrs );
				return $tag_open . $attrs . '>';
			}

			return $tag_open . ' class="' . esc_attr( $classes_to_add ) . '"' . $attrs . '>';
		};

		$result = preg_replace_callback(
			'/(<header)((?:\s[^>]*)?)>/i',
			$callback,
			$content,
			1
		);

		if ( null === $result ) {
			return $content;
		}

		return $result;
	}

	/**
	 * Enqueue CSS and JS assets on the frontend only.
	 *
	 * The JS is a plain IIFE so it is enqueued as a standard deferred script,
	 * not a WP module. The build step copies it to build/header-behaviours/view.js;
	 * in development the source file is served directly when the build output
	 * does not yet exist.
	 */
	public static function enqueue_assets(): void {
		if ( \is_admin() ) {
			return;
		}

		$css_path = SGS_BLOCKS_PATH . 'assets/css/header-behaviours.css';
		if ( file_exists( $css_path ) ) {
			\wp_enqueue_style(
				'sgs-header-behaviours',
				SGS_BLOCKS_URL . 'assets/css/header-behaviours.css',
				array(),
				SGS_BLOCKS_VERSION
			);
		}

		$js_build = SGS_BLOCKS_PATH . 'build/header-behaviours/view.js';
		$js_src   = SGS_BLOCKS_PATH . 'src/header-behaviours/view.js';

		if ( file_exists( $js_build ) ) {
			$js_url = SGS_BLOCKS_URL . 'build/header-behaviours/view.js';
		} elseif ( file_exists( $js_src ) ) {
			$js_url = SGS_BLOCKS_URL . 'src/header-behaviours/view.js';
		} else {
			return;
		}

		\wp_enqueue_script(
			'sgs-header-behaviours-view',
			$js_url,
			array(),
			SGS_BLOCKS_VERSION,
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}
}
