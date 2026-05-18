<?php
/**
 * Header Behaviours — body_class injector and asset enqueuer (F4).
 *
 * Hooks into `body_class` to append SGS header behaviour classes to <body>.
 * CSS and JS then target `body.sgs-header-behaviour-{slug} header.wp-block-template-part`
 * — no DOM rewriting needed at all.
 *
 * Body classes emitted:
 *   - sgs-has-header               always present (stable cloning-pipeline hook).
 *   - sgs-has-header-behaviour     present when any rule's behaviour matches a
 *                                  valid VALID_BEHAVIOURS slug.
 *   - sgs-header-behaviour-{slug}  the specific behaviour modifier.
 *
 * State classes toggled by view.js (on body, not on header element):
 *   - is-header-scrolled
 *   - is-header-scrolling-down
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
		\add_filter( 'body_class', array( __CLASS__, 'add_body_classes' ) );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * Append SGS header behaviour classes to the <body> element.
	 *
	 * Walk rules via Sgs_Header_Rules::list_rules() + Sgs_Header_Rules::rule_matches()
	 * to find the FIRST matching rule, read its behaviour, and emit the appropriate
	 * body classes. When no rule matches or the behaviour is invalid, only the
	 * always-on sgs-has-header hook class is appended.
	 *
	 * @param string[] $classes Existing body classes from WordPress.
	 * @return string[]
	 */
	public static function add_body_classes( array $classes ): array {
		// Always emit the stable hook class so the cloning recogniser has a
		// reliable surface to target regardless of whether behaviours are active.
		$classes[] = 'sgs-has-header';

		if ( ! class_exists( '\SGS\Blocks\Sgs_Header_Rules' ) ) {
			return $classes;
		}

		$rules     = Sgs_Header_Rules::list_rules();
		$behaviour = '';

		foreach ( $rules as $rule ) {
			if ( Sgs_Header_Rules::rule_matches( $rule ) ) {
				$behaviour_raw = isset( $rule['behaviour'] ) ? (string) $rule['behaviour'] : '';
				if ( in_array( $behaviour_raw, self::VALID_BEHAVIOURS, true ) ) {
					$behaviour = $behaviour_raw;
				}
				break;
			}
		}

		if ( '' !== $behaviour ) {
			$classes[] = 'sgs-has-header-behaviour';
			$classes[] = 'sgs-header-behaviour-' . $behaviour;
		}

		return $classes;
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
