<?php
/**
 * Conditional Footer rules engine (FR-S3-3, Spec 17 Wave 2).
 *
 * Operators declare ordered rules pairing a footer pattern slug with a set of
 * conditions (post type, template, URL pattern, user role, device class). Rules
 * are evaluated top-to-bottom on every page render; the first matching rule
 * wins; an immutable default fallback rule always exists at priority 9999.
 *
 * Hook integration uses the `pre_render_block` filter so we intercept BEFORE
 * the core/template-part block has resolved its area. Returning a non-null
 * value short-circuits core rendering with our chosen pattern's HTML.
 *
 * ReDoS guard (URL patterns are operator-provided strings consumed by
 * `preg_match`) is applied at TWO layers:
 *
 *   1. STORAGE-TIME (in {@see add_rule()}): a static blacklist of
 *      catastrophic-backtracking shapes ((a+)+, (.*)+, (.+)*, (\w+)+, etc.) is
 *      checked first; patterns are then test-compiled via preg_match against
 *      an empty string; patterns longer than 200 characters are rejected.
 *
 *   2. RENDER-TIME (in {@see evaluate()}): the PCRE backtrack limit is lowered
 *      via ini_set for the duration of the rule pass, a per-request static
 *      short-circuit bails after the first core/template-part match, and a
 *      set_error_handler() shim converts PCRE warnings into a graceful fall
 *      through to the default rule.
 *
 * Mirror of FR-S3-2 (Sgs_Header_Rules). Separate wp_options key, separate
 * filter callback, no shared global state with the header engine.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Footer_Rules
 *
 * Storage + evaluation engine. Stateless static helpers — the future
 * `wp sgs footer-rules ...` CLI command (FR-S5-3) wraps these directly.
 */
final class Sgs_Footer_Rules {

	/** Wp_options key holding the serialised rules array. */
	const OPTION_KEY = 'sgs_footer_rules';

	/** Immutable default-rule id. Can never be removed by remove_rule(). */
	const DEFAULT_RULE_ID = 'rule_default';

	/** Default fallback pattern slug. Matches everything. */
	const DEFAULT_PATTERN_SLUG = 'sgs/framework-footer-default';

	/** Maximum allowed length of an operator-provided regex pattern. */
	const MAX_PATTERN_LENGTH = 200;

	/** PCRE backtrack limit applied during render-time evaluation. */
	const RENDER_BACKTRACK_LIMIT = 100000;

	/**
	 * Catastrophic-backtracking shapes rejected at storage time. The validator
	 * patterns are known-fast literals — they themselves do NOT introduce
	 * ReDoS risk because each is anchored to specific character classes.
	 *
	 * @var array<int,string>
	 */
	const NESTED_QUANTIFIER_BLACKLIST = array(
		'/\([^)]*[+*][^)]*\)\s*[+*]/', // (anything+/-)+ or (anything+/-)*  — nested unbounded quantifier.
		'/\([^)]*[+*][^)]*\)\s*\{\d*,?\d*\}/', // (anything+/-){n,m}  — bounded quantifier over a greedy inner group.
	);

	/**
	 * Per-request short-circuit flag. Reset to false on each fresh request.
	 *
	 * @var bool
	 */
	private static $evaluated_this_request = false;

	/** Wire WP hooks. Safe to call from sgs-blocks.php bootstrap. */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'ensure_default_rule' ) );
		\add_filter( 'pre_render_block', array( __CLASS__, 'filter_template_part' ), 10, 2 );
	}

	/**
	 * Reset the per-request short-circuit. Exposed for testing only; in
	 * production the static state naturally resets between requests because
	 * PHP processes terminate at the end of each request.
	 */
	public static function reset_request_state(): void {
		self::$evaluated_this_request = false;
	}

	/**
	 * Ensure the immutable default fallback exists. Called on init; idempotent.
	 */
	public static function ensure_default_rule(): void {
		$rules = self::list_rules();
		foreach ( $rules as $rule ) {
			if ( self::DEFAULT_RULE_ID === ( $rule['id'] ?? '' ) ) {
				return;
			}
		}
		$rules[] = self::default_rule();
		\update_option( self::OPTION_KEY, $rules );
	}

	/**
	 * Return the canonical default rule definition.
	 *
	 * @return array<string,mixed>
	 */
	public static function default_rule(): array {
		return array(
			'id'           => self::DEFAULT_RULE_ID,
			'priority'     => 9999,
			'pattern_slug' => self::DEFAULT_PATTERN_SLUG,
			'conditions'   => array(),
		);
	}

	/**
	 * Return all rules sorted ascending by priority. The default rule is
	 * always present (auto-appended if missing).
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function list_rules(): array {
		$stored = \get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		$has_default = false;
		foreach ( $stored as $rule ) {
			if ( is_array( $rule ) && self::DEFAULT_RULE_ID === ( $rule['id'] ?? '' ) ) {
				$has_default = true;
				break;
			}
		}
		if ( ! $has_default ) {
			$stored[] = self::default_rule();
		}
		usort(
			$stored,
			static function ( $a, $b ) {
				return ( (int) ( $a['priority'] ?? 0 ) ) <=> ( (int) ( $b['priority'] ?? 0 ) );
			}
		);
		return $stored;
	}

	/**
	 * Add a new rule. Validates the pattern slug, priority, and every URL
	 * condition through the ReDoS guard. Returns the assigned rule id on
	 * success or a WP_Error with HTTP 400 on rejection.
	 *
	 * @param array<string,mixed> $rule_input Operator payload (no id required).
	 * @return string|\WP_Error
	 */
	public static function add_rule( array $rule_input ) {
		$pattern_slug = isset( $rule_input['pattern_slug'] ) ? (string) $rule_input['pattern_slug'] : '';
		if ( '' === $pattern_slug ) {
			return new \WP_Error( 'sgs_footer_rules_invalid_pattern', \__( 'A pattern slug is required.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}
		$conditions = isset( $rule_input['conditions'] ) && is_array( $rule_input['conditions'] ) ? $rule_input['conditions'] : array();
		foreach ( $conditions as $condition ) {
			if ( ! is_array( $condition ) ) {
				return new \WP_Error( 'sgs_footer_rules_invalid_condition', \__( 'Each condition must be an object.', 'sgs-blocks' ), array( 'status' => 400 ) );
			}
			if ( ( $condition['type'] ?? '' ) === 'url_match' ) {
				$guard = self::validate_url_pattern( (string) ( $condition['value'] ?? '' ) );
				if ( \is_wp_error( $guard ) ) {
					return $guard;
				}
			}
		}
		$rules = self::list_rules();
		$id    = 'rule_' . substr( md5( (string) microtime( true ) . wp_json_encode( $rule_input ) ), 0, 8 );
		$new   = array(
			'id'           => $id,
			'priority'     => isset( $rule_input['priority'] ) ? max( 1, min( 9998, (int) $rule_input['priority'] ) ) : 10,
			'pattern_slug' => $pattern_slug,
			'conditions'   => array_values( $conditions ),
		);
		// Place new rule above the immutable default.
		$out = array();
		foreach ( $rules as $rule ) {
			if ( self::DEFAULT_RULE_ID !== ( $rule['id'] ?? '' ) ) {
				$out[] = $rule;
			}
		}
		$out[] = $new;
		$out[] = self::default_rule();
		\update_option( self::OPTION_KEY, $out );
		return $id;
	}

	/**
	 * Remove a rule by id. Refuses to remove the immutable default.
	 *
	 * @param string $rule_id Rule id.
	 * @return true|\WP_Error
	 */
	public static function remove_rule( string $rule_id ) {
		if ( self::DEFAULT_RULE_ID === $rule_id ) {
			return new \WP_Error( 'sgs_footer_rules_default_immutable', \__( 'The default footer rule cannot be removed.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}
		$rules    = self::list_rules();
		$filtered = array();
		$found    = false;
		foreach ( $rules as $rule ) {
			if ( ( $rule['id'] ?? '' ) === $rule_id ) {
				$found = true;
				continue;
			}
			$filtered[] = $rule;
		}
		if ( ! $found ) {
			return new \WP_Error( 'sgs_footer_rules_not_found', \__( 'Rule not found.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}
		\update_option( self::OPTION_KEY, $filtered );
		return true;
	}

	/**
	 * Static validator for an operator-supplied URL regex pattern. Applied at
	 * storage time. See class docblock for the ReDoS guard strategy.
	 *
	 * @param string $pattern Operator-supplied pattern (no delimiters).
	 * @return true|\WP_Error
	 */
	public static function validate_url_pattern( string $pattern ) {
		if ( '' === $pattern ) {
			return new \WP_Error( 'sgs_footer_rules_empty_pattern', \__( 'URL pattern cannot be empty.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}
		if ( strlen( $pattern ) > self::MAX_PATTERN_LENGTH ) {
			return new \WP_Error( 'sgs_footer_rules_pattern_too_long', \__( 'URL pattern exceeds 200 characters.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}
		foreach ( self::NESTED_QUANTIFIER_BLACKLIST as $blacklist_re ) {
			if ( preg_match( $blacklist_re, $pattern ) ) {
				return new \WP_Error( 'sgs_footer_rules_redos_shape', \__( 'URL pattern contains a nested unbounded quantifier (e.g. (a+)+) that risks catastrophic backtracking.', 'sgs-blocks' ), array( 'status' => 400 ) );
			}
		}
		// Test-compile against an empty string. PHP returns false on compile failure.
		// We suppress warnings via @ — the false return value is the canonical signal.
		$result = @preg_match( '/' . str_replace( '/', '\\/', $pattern ) . '/', '' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( false === $result ) {
			return new \WP_Error( 'sgs_footer_rules_invalid_regex', \__( 'URL pattern is not a valid regular expression.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}
		return true;
	}

	/**
	 * `pre_render_block` filter callback. Intercepts core/template-part blocks
	 * for the `footer` area only; header is FR-S3-2.
	 *
	 * @param mixed               $pre   Whatever an earlier filter returned (null = let core render).
	 * @param array<string,mixed> $block Parsed block.
	 * @return mixed Returning a string short-circuits rendering; null falls through.
	 */
	public static function filter_template_part( $pre, $block ) {
		if ( ! is_array( $block ) ) {
			return $pre;
		}
		if ( 'core/template-part' !== ( $block['blockName'] ?? '' ) ) {
			return $pre;
		}
		$area = $block['attrs']['area'] ?? '';
		if ( 'footer' !== $area ) {
			return $pre;
		}
		$rendered = self::evaluate();
		return null === $rendered ? $pre : $rendered;
	}

	/**
	 * Evaluate rules and return the rendered pattern HTML for the first match,
	 * or null when no operator rule matches (in which case core continues to
	 * render the template-part normally).
	 *
	 * Short-circuits after the first invocation per request — multi-footer
	 * pages would otherwise re-evaluate (and re-render) on every nested
	 * template-part call.
	 *
	 * @return string|null
	 */
	public static function evaluate(): ?string {
		if ( self::$evaluated_this_request ) {
			return null;
		}
		self::$evaluated_this_request = true;

		$rules = self::list_rules();

		// Lower the backtrack limit for the duration of this pass and restore on exit.
		$prev_limit = ini_get( 'pcre.backtrack_limit' );
		ini_set( 'pcre.backtrack_limit', (string) self::RENDER_BACKTRACK_LIMIT );

		// Convert PCRE runtime warnings into a graceful skip rather than aborting render.
		$swallow = static function () {
			return true;
		};
		set_error_handler( $swallow ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions

		try {
			foreach ( $rules as $rule ) {
				if ( self::rule_matches( $rule ) ) {
					$html = self::render_pattern( (string) ( $rule['pattern_slug'] ?? '' ) );
					if ( null !== $html ) {
						return $html;
					}
				}
			}
			return null;
		} finally {
			restore_error_handler();
			if ( false !== $prev_limit ) {
				ini_set( 'pcre.backtrack_limit', (string) $prev_limit );
			}
		}
	}

	/**
	 * AND-evaluate every condition in a rule. Default rule (zero conditions)
	 * trivially matches.
	 *
	 * @param array<string,mixed> $rule Rule definition.
	 * @return bool
	 */
	public static function rule_matches( array $rule ): bool {
		$conditions = isset( $rule['conditions'] ) && is_array( $rule['conditions'] ) ? $rule['conditions'] : array();
		foreach ( $conditions as $condition ) {
			if ( ! is_array( $condition ) || ! self::condition_matches( $condition ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Evaluate a single condition against the current request context.
	 *
	 * @param array<string,mixed> $condition Condition definition.
	 * @return bool
	 */
	public static function condition_matches( array $condition ): bool {
		$type  = (string) ( $condition['type'] ?? '' );
		$value = (string) ( $condition['value'] ?? '' );
		switch ( $type ) {
			case 'post_type':
				return function_exists( 'get_post_type' ) && (string) \get_post_type() === $value;

			case 'template':
				return function_exists( 'get_page_template_slug' ) && (string) \get_page_template_slug() === $value;

			case 'url_match':
				$raw  = isset( $_SERVER['REQUEST_URI'] ) ? \sanitize_text_field( \wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
				$path = (string) \wp_parse_url( $raw, PHP_URL_PATH );
				$re   = '/' . str_replace( '/', '\\/', $value ) . '/';
				$ok   = @preg_match( $re, $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
				return 1 === $ok;

			case 'user_role':
				if ( ! function_exists( 'wp_get_current_user' ) ) {
					return false;
				}
				$user = \wp_get_current_user();
				return $user && in_array( $value, (array) ( $user->roles ?? array() ), true );

			case 'device':
				$ua_raw    = isset( $_SERVER['HTTP_USER_AGENT'] ) ? \sanitize_text_field( \wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
				$ua        = strtolower( $ua_raw );
				$is_mobile = (bool) preg_match( '/mobile|android|iphone|ipad/i', $ua );
				return ( 'mobile' === $value ) ? $is_mobile : ! $is_mobile;
		}
		return false;
	}

	/**
	 * Render a pattern by slug. Returns null when the pattern isn't registered
	 * (caller falls through to the next rule or to core rendering).
	 *
	 * @param string $slug Pattern slug.
	 * @return string|null
	 */
	public static function render_pattern( string $slug ): ?string {
		if ( '' === $slug ) {
			return null;
		}
		if ( ! class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			return null;
		}
		$registry = \WP_Block_Patterns_Registry::get_instance();
		$pattern  = $registry->get_registered( $slug );
		if ( empty( $pattern ) || empty( $pattern['content'] ) ) {
			return null;
		}
		return function_exists( 'do_blocks' ) ? \do_blocks( (string) $pattern['content'] ) : (string) $pattern['content'];
	}
}
