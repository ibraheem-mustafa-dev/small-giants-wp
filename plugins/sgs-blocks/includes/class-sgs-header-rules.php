<?php
/**
 * Conditional Header rules engine (FR-S3-2, Spec 17 Wave 2).
 *
 * Operators declare ordered rules pairing a header pattern slug with a set of
 * conditions (post type, template, URL pattern, user role, device class). Rules
 * are evaluated top-to-bottom on every page render; the first matching rule
 * wins; an immutable default fallback rule always exists at priority 9999.
 *
 * Hook integration uses the `pre_render_block` filter so we intercept BEFORE
 * the core/template-part block has resolved its area. Returning a non-null
 * value short-circuits core rendering with our chosen pattern's HTML.
 *
 * ReDoS guard strategy is documented in {@see Sgs_Header_Rules_ReDoS_Guard}.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Rules
 *
 * Storage + evaluation engine. Stateless static helpers — the future
 * `wp sgs header-rules ...` CLI command (FR-S5-3) wraps these directly.
 */
final class Sgs_Header_Rules {

	/** Wp_options key holding the serialised rules array. */
	const OPTION_KEY = 'sgs_header_rules';

	/** Immutable default-rule id. Can never be removed by remove_rule(). */
	const DEFAULT_RULE_ID = 'rule_default';

	/** Default fallback pattern slug. Matches everything. */
	const DEFAULT_PATTERN_SLUG = 'sgs/framework-header-default';

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

	/** Return the canonical default rule definition. @return array<string,mixed> */
	public static function default_rule(): array {
		return array(
			'id'           => self::DEFAULT_RULE_ID,
			'priority'     => 9999,
			'pattern_slug' => self::DEFAULT_PATTERN_SLUG,
			'conditions'   => array(),
		);
	}

	/**
	 * Return all rules sorted ascending by priority. Default rule always present.
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
	 * Add a rule. Validates slug + every url_match via ReDoS guard.
	 *
	 * @param array<string,mixed> $rule_input Operator payload (no id required).
	 * @return string|\WP_Error Assigned rule id, or WP_Error on rejection.
	 */
	public static function add_rule( array $rule_input ) {
		$pattern_slug = isset( $rule_input['pattern_slug'] ) ? (string) $rule_input['pattern_slug'] : '';
		if ( '' === $pattern_slug ) {
			return new \WP_Error( 'sgs_header_rules_invalid_pattern', \__( 'A pattern slug is required.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}
		$conditions = isset( $rule_input['conditions'] ) && is_array( $rule_input['conditions'] ) ? $rule_input['conditions'] : array();
		foreach ( $conditions as $condition ) {
			if ( ! is_array( $condition ) ) {
				return new \WP_Error( 'sgs_header_rules_invalid_condition', \__( 'Each condition must be an object.', 'sgs-blocks' ), array( 'status' => 400 ) );
			}
			if ( ( $condition['type'] ?? '' ) === 'url_match' ) {
				$guard = Sgs_Header_Rules_ReDoS_Guard::validate_at_storage( (string) ( $condition['value'] ?? '' ) );
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
			return new \WP_Error( 'sgs_header_rules_default_immutable', \__( 'The default header rule cannot be removed.', 'sgs-blocks' ), array( 'status' => 400 ) );
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
			return new \WP_Error( 'sgs_header_rules_not_found', \__( 'Rule not found.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}
		\update_option( self::OPTION_KEY, $filtered );
		return true;
	}

	/**
	 * `pre_render_block` filter callback. Intercepts core/template-part blocks
	 * for the `header` area only; footer is FR-S3-3.
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
		if ( 'header' !== $area ) {
			return $pre;
		}

		// FR-37-3 (Spec 37) — the active-CPT direct-render branch, deliberately
		// placed BEFORE self::evaluate() so the common case (one header, set
		// active in SGS > Advanced Headers) never touches the rules engine at
		// all. The rules engine remains the advanced per-page-type path
		// (FR-37-20) and is reached only when no valid active CPT exists.
		//
		// Sgs_Active_Layout::render_active() fails closed — it returns null for
		// a missing, trashed, draft or wrong-type target — so a broken pointer
		// falls through to the rules engine and then to the immutable framework
		// default (FR-37-4) rather than rendering an empty header. It also
		// carries its own per-request re-entrancy guard, which the
		// $evaluated_this_request static below does NOT cover.
		$active = Sgs_Active_Layout::render_active( Sgs_Active_Layout::AREA_HEADER );
		if ( null !== $active ) {
			return $active;
		}

		// A page can resolve the header area more than once. If the active CPT
		// already served this request, hand the second slot back to core rather
		// than to the rules engine below.
		//
		// Without this, the second slot renders a DIFFERENT header: the CPT
		// branch short-circuits before self::evaluate() on the first pass, so
		// $evaluated_this_request is still false when the second pass reaches
		// it. evaluate() then runs for the first time, matches the immutable
		// default rule (priority 9999, always present), and paints the framework
		// default header underneath the operator's one. Two unlike headers on
		// one page, silently — worse than a duplicate, and no error is raised.
		if ( Sgs_Active_Layout::has_served( Sgs_Active_Layout::AREA_HEADER ) ) {
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
	 * Short-circuits after the first invocation per request — multi-header
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

		// Delegate render-time PCRE guard (backtrack limit + error handler) to the
		// guard class. The callable runs inside a try/finally that always restores
		// both settings, even on exception.
		return Sgs_Header_Rules_ReDoS_Guard::run_guarded(
			static function () use ( $rules ): ?string {
				foreach ( $rules as $rule ) {
					if ( Sgs_Header_Rules::rule_matches( $rule ) ) {
						$html = Sgs_Header_Rules::render_pattern( (string) ( $rule['pattern_slug'] ?? '' ) );
						if ( null !== $html ) {
							/**
							 * Filters the rendered header HTML after a rule match.
							 *
							 * Allows downstream classes (e.g. Sgs_Header_Behaviours) to
							 * inject wrapper classes or attributes into the outermost
							 * <header> element before the HTML is returned to the template.
							 *
							 * @since 1.0.0
							 * @param string              $html The rendered pattern HTML.
							 * @param array<string,mixed> $rule The matched rule definition.
							 */
							return (string) \apply_filters( 'sgs_header_rule_resolved', $html, $rule );
						}
					}
				}
				return null;
			}
		);
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
