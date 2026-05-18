<?php
/**
 * Admin UI for the Conditional Header rules engine (FR-S3-2, Spec 17 Wave 2).
 *
 * Registers a submenu under the SGS top-level menu (FR-S5-1) at
 * admin.php?page=sgs-header-rules. Lists existing rules and exposes an
 * "Add Rule" form. Form submissions go through admin-post.php with nonce +
 * capability gates; the actual storage + validation is delegated to
 * {@see Sgs_Header_Rules::add_rule()} and {@see Sgs_Header_Rules::remove_rule()}.
 *
 * UK English throughout. Plain language for operators — "Show this header
 * when..." rather than "Rule matches if...".
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Rules_Admin
 */
final class Sgs_Header_Rules_Admin {

	/** Submenu page slug. */
	const PAGE_SLUG = 'sgs-header-rules';

	/** Capability gate — matches every other SGS admin surface. */
	const CAP = 'edit_theme_options';

	/** Admin-post.php action for "Add Rule" form. */
	const ADD_ACTION = 'sgs_header_rules_add';

	/** Admin-post.php action for "Remove Rule" link. */
	const REMOVE_ACTION = 'sgs_header_rules_remove';

	/** Wire WP hooks. */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		\add_action( 'admin_post_' . self::ADD_ACTION, array( __CLASS__, 'handle_add' ) );
		\add_action( 'admin_post_' . self::REMOVE_ACTION, array( __CLASS__, 'handle_remove' ) );
	}

	/** Register the submenu under the SGS top-level entry. */
	public static function add_menu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'SGS Header Rules', 'sgs-blocks' ),
			\__( 'Header Rules', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/** Render the admin page (rules table + Add Rule form). */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}

		$status = isset( $_GET['sgs-status'] ) ? \sanitize_key( \wp_unslash( $_GET['sgs-status'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$error  = isset( $_GET['sgs-error'] ) ? \sanitize_text_field( \wp_unslash( $_GET['sgs-error'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		echo '<div class="wrap">';
		echo '<h1>' . \esc_html__( 'SGS Header Rules', 'sgs-blocks' ) . '</h1>';
		echo '<p>' . \esc_html__( 'Show different header patterns on different pages. Rules are checked top-to-bottom — the first matching rule wins. The default rule at the bottom always matches and cannot be removed.', 'sgs-blocks' ) . '</p>';

		if ( 'added' === $status ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Header rule added.', 'sgs-blocks' ) . '</p></div>';
		}
		if ( 'removed' === $status ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . \esc_html__( 'Header rule removed.', 'sgs-blocks' ) . '</p></div>';
		}
		if ( '' !== $error ) {
			echo '<div class="notice notice-error is-dismissible"><p>' . \esc_html( $error ) . '</p></div>';
		}

		self::render_rules_table();
		self::render_add_form();

		echo '</div>';
	}

	/** Render the table of existing rules. */
	private static function render_rules_table(): void {
		$rules = Sgs_Header_Rules::list_rules();
		echo '<h2>' . \esc_html__( 'Current rules', 'sgs-blocks' ) . '</h2>';
		echo '<table class="widefat striped">';
		echo '<thead><tr>';
		echo '<th>' . \esc_html__( 'Priority', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Show this header', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'When', 'sgs-blocks' ) . '</th>';
		echo '<th>' . \esc_html__( 'Actions', 'sgs-blocks' ) . '</th>';
		echo '</tr></thead><tbody>';
		foreach ( $rules as $rule ) {
			$id           = (string) ( $rule['id'] ?? '' );
			$priority     = (int) ( $rule['priority'] ?? 0 );
			$pattern_slug = (string) ( $rule['pattern_slug'] ?? '' );
			$is_default   = Sgs_Header_Rules::DEFAULT_RULE_ID === $id;
			$conditions   = isset( $rule['conditions'] ) && is_array( $rule['conditions'] ) ? $rule['conditions'] : array();

			echo '<tr>';
			echo '<td>' . \esc_html( (string) $priority ) . '</td>';
			echo '<td><code>' . \esc_html( $pattern_slug ) . '</code></td>';
			echo '<td>' . \esc_html( self::summarise_conditions( $conditions, $is_default ) ) . '</td>';
			echo '<td>';
			if ( $is_default ) {
				echo '<em>' . \esc_html__( 'Default — cannot remove', 'sgs-blocks' ) . '</em>';
			} else {
				$url = \wp_nonce_url(
					\add_query_arg(
						array(
							'action'  => self::REMOVE_ACTION,
							'rule_id' => $id,
						),
						\admin_url( 'admin-post.php' )
					),
					self::REMOVE_ACTION . '_' . $id
				);
				echo '<a href="' . \esc_url( $url ) . '" class="button button-link-delete">' . \esc_html__( 'Remove', 'sgs-blocks' ) . '</a>';
			}
			echo '</td>';
			echo '</tr>';
		}
		echo '</tbody></table>';
	}

	/**
	 * Render a plain-language summary of a rule's conditions.
	 *
	 * @param array<int,array<string,string>> $conditions Conditions.
	 * @param bool                            $is_default Whether this is the default rule.
	 * @return string
	 */
	public static function summarise_conditions( array $conditions, bool $is_default ): string {
		if ( $is_default || empty( $conditions ) ) {
			return \__( 'Always (fallback)', 'sgs-blocks' );
		}
		$parts = array();
		foreach ( $conditions as $condition ) {
			$type  = (string) ( $condition['type'] ?? '' );
			$value = (string) ( $condition['value'] ?? '' );
			switch ( $type ) {
				case 'post_type':
					$parts[] = sprintf( /* translators: %s: post type slug */ \__( 'Post type is %s', 'sgs-blocks' ), $value );
					break;
				case 'template':
					$parts[] = sprintf( /* translators: %s: template slug */ \__( 'Template is %s', 'sgs-blocks' ), $value );
					break;
				case 'url_match':
					$parts[] = sprintf( /* translators: %s: regex pattern */ \__( 'URL matches %s', 'sgs-blocks' ), $value );
					break;
				case 'user_role':
					$parts[] = sprintf( /* translators: %s: user role */ \__( 'User role is %s', 'sgs-blocks' ), $value );
					break;
				case 'device':
					$parts[] = sprintf( /* translators: %s: device class */ \__( 'Device is %s', 'sgs-blocks' ), $value );
					break;
			}
		}
		return implode( ' AND ', $parts );
	}

	/** Render the Add Rule form. */
	private static function render_add_form(): void {
		echo '<h2>' . \esc_html__( 'Add a rule', 'sgs-blocks' ) . '</h2>';
		echo '<form method="post" action="' . \esc_url( \admin_url( 'admin-post.php' ) ) . '">';
		\wp_nonce_field( self::ADD_ACTION );
		echo '<input type="hidden" name="action" value="' . \esc_attr( self::ADD_ACTION ) . '" />';

		echo '<table class="form-table"><tbody>';

		// Pattern slug dropdown.
		echo '<tr><th scope="row"><label for="sgs_pattern_slug">' . \esc_html__( 'Header pattern', 'sgs-blocks' ) . '</label></th><td>';
		echo '<select id="sgs_pattern_slug" name="pattern_slug" required>';
		foreach ( self::header_pattern_choices() as $slug => $title ) {
			echo '<option value="' . \esc_attr( $slug ) . '">' . \esc_html( $title ) . '</option>';
		}
		echo '</select>';
		echo '<p class="description">' . \esc_html__( 'Choose which header pattern to render when this rule matches.', 'sgs-blocks' ) . '</p>';
		echo '</td></tr>';

		// Priority.
		echo '<tr><th scope="row"><label for="sgs_priority">' . \esc_html__( 'Priority', 'sgs-blocks' ) . '</label></th><td>';
		echo '<input type="number" id="sgs_priority" name="priority" value="10" min="1" max="9998" />';
		echo '<p class="description">' . \esc_html__( 'Lower numbers run first. The default rule sits at 9999.', 'sgs-blocks' ) . '</p>';
		echo '</td></tr>';

		// Condition row (single, MVP — multi-condition UI deferred to FR-S5-2).
		echo '<tr><th scope="row"><label for="sgs_condition_type">' . \esc_html__( 'Show this header when', 'sgs-blocks' ) . '</label></th><td>';
		echo '<select id="sgs_condition_type" name="condition_type">';
		echo '<option value="">' . \esc_html__( '— Always (no extra condition) —', 'sgs-blocks' ) . '</option>';
		echo '<option value="post_type">' . \esc_html__( 'Post type is', 'sgs-blocks' ) . '</option>';
		echo '<option value="template">' . \esc_html__( 'Template is', 'sgs-blocks' ) . '</option>';
		echo '<option value="url_match">' . \esc_html__( 'URL matches (regex, e.g. ^/$ for homepage)', 'sgs-blocks' ) . '</option>';
		echo '<option value="user_role">' . \esc_html__( 'User role is', 'sgs-blocks' ) . '</option>';
		echo '<option value="device">' . \esc_html__( 'Device is (mobile / desktop)', 'sgs-blocks' ) . '</option>';
		echo '</select> ';
		echo '<input type="text" name="condition_value" maxlength="200" />';
		echo '<p class="description">' . \esc_html__( 'URL patterns are checked at storage time to reject ones that could hang the site.', 'sgs-blocks' ) . '</p>';
		echo '</td></tr>';

		echo '</tbody></table>';

		\submit_button( \__( 'Add rule', 'sgs-blocks' ) );

		echo '</form>';
	}

	/**
	 * Available header pattern choices for the dropdown.
	 *
	 * @return array<string,string> Map of slug => title.
	 */
	public static function header_pattern_choices(): array {
		$out = array();
		if ( class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			$registry = \WP_Block_Patterns_Registry::get_instance();
			$patterns = $registry->get_all_registered();
			foreach ( $patterns as $pattern ) {
				$slug       = (string) ( $pattern['name'] ?? '' );
				$blocktypes = (array) ( $pattern['blockTypes'] ?? array() );
				if ( '' === $slug ) {
					continue;
				}
				if ( in_array( 'core/template-part/header', $blocktypes, true ) ) {
					$out[ $slug ] = (string) ( $pattern['title'] ?? $slug );
				}
			}
		}
		if ( empty( $out ) ) {
			// Sensible fallback so the form is never empty in dev environments.
			$out[ Sgs_Header_Rules::DEFAULT_PATTERN_SLUG ] = \__( 'Default SGS header', 'sgs-blocks' );
		}
		return $out;
	}

	/** Handle "Add Rule" admin-post.php submission. */
	public static function handle_add(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to add a header rule.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::ADD_ACTION );

		$pattern_slug = isset( $_POST['pattern_slug'] ) ? \sanitize_text_field( \wp_unslash( $_POST['pattern_slug'] ) ) : '';
		$priority     = isset( $_POST['priority'] ) ? (int) \sanitize_text_field( \wp_unslash( $_POST['priority'] ) ) : 10;
		$type         = isset( $_POST['condition_type'] ) ? \sanitize_key( \wp_unslash( $_POST['condition_type'] ) ) : '';
		$value        = isset( $_POST['condition_value'] ) ? \sanitize_text_field( \wp_unslash( $_POST['condition_value'] ) ) : '';

		$conditions = array();
		if ( '' !== $type && '' !== $value ) {
			$conditions[] = array(
				'type'  => $type,
				'value' => $value,
			);
		}

		$result = Sgs_Header_Rules::add_rule(
			array(
				'pattern_slug' => $pattern_slug,
				'priority'     => $priority,
				'conditions'   => $conditions,
			)
		);

		if ( \is_wp_error( $result ) ) {
			self::redirect_back( array( 'sgs-error' => $result->get_error_message() ) );
		}
		self::redirect_back( array( 'sgs-status' => 'added' ) );
	}

	/** Handle "Remove Rule" admin-post.php request. */
	public static function handle_remove(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to remove a header rule.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		$rule_id = isset( $_GET['rule_id'] ) ? \sanitize_key( \wp_unslash( $_GET['rule_id'] ) ) : '';
		\check_admin_referer( self::REMOVE_ACTION . '_' . $rule_id );

		$result = Sgs_Header_Rules::remove_rule( $rule_id );
		if ( \is_wp_error( $result ) ) {
			self::redirect_back( array( 'sgs-error' => $result->get_error_message() ) );
		}
		self::redirect_back( array( 'sgs-status' => 'removed' ) );
	}

	/**
	 * Redirect to the rules page with the given query args.
	 *
	 * @param array<string,string> $args Query args to attach.
	 */
	private static function redirect_back( array $args ): void {
		$url = \add_query_arg(
			array_merge( array( 'page' => self::PAGE_SLUG ), $args ),
			\admin_url( 'admin.php' )
		);
		\wp_safe_redirect( $url );
		exit;
	}
}
