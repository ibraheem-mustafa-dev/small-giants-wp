<?php
/**
 * SGS CPT "usage" admin-list-table columns.
 *
 * Adds a read-only "Used by" column to the `sgs_header`, `sgs_footer`,
 * `sgs_drawer`, `sgs_modal`, `sgs_form` and `sgs_choice_flow` list tables.
 * Deliberately NOT post meta — it must always reflect LIVE rule/reference
 * state, never a value that can go stale the moment a rule is edited
 * elsewhere, so every cell is computed at request time from the real source
 * of truth for that CPT:
 *
 *   - sgs_header / sgs_footer — {@see Sgs_Header_Rules::list_rules()} /
 *     {@see Sgs_Footer_Rules::list_rules()}, matched by `pattern_slug`
 *     (`sgs/header-{post_name}` / `sgs/footer-{post_name}`), the SAME string
 *     {@see Sgs_Block_CPTs::register_patterns_from_cpts()} derives.
 *   - sgs_drawer — {@see Sgs_Active_Layout}'s single site-wide "Active drawer"
 *     option pointer. `sgs/nav-bar-menu`'s `drawerRef` is a `sgs_drawer` post
 *     id (0 = use the Active drawer); the column reports the Active pointer, and
 *     a per-burger pick is not counted. So this column shows the same fact as
 *     the existing "Active" column (added by {@see Sgs_Active_Layout_Admin})
 *     for this CPT.
 *   - sgs_modal — a `post_content LIKE` scan across published posts/pages for
 *     a `sgs/modal` block instance whose `modalRef` attribute equals this
 *     post's ID (the attribute {@see Sgs_Block_CPTs::resolve_modal()} reads).
 *   - sgs_form — the same LIKE-scan shape, matching `sgs/form`'s `formId`
 *     attribute (a SLUG, not an id) against this post's `post_name` — the
 *     attribute {@see Sgs_Block_CPTs::resolve_form()} reads.
 *   - sgs_choice_flow — the same LIKE-scan shape against a `flowId` slug
 *     attribute, mirroring `resolve_form()`'s shape exactly (Spec 43 FR-43-8).
 *     No `sgs/choice-flow*` block currently declares `flowId`, so every choice
 *     flow reads "Not currently used" until an embedding block does.
 *
 * All list-table queries are bounded to a `COUNT(*)`/small `get_posts()` over
 * PUBLISHED content only — these CPTs and their embedding targets are all
 * low-cardinality by design (a handful of headers/footers/modals/forms per
 * site), matching the existing bounded-query precedent in this file's sibling
 * {@see Sgs_Block_CPTs::register_patterns_from_cpts()}.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Cpt_Usage_Columns
 */
final class Sgs_Cpt_Usage_Columns {

	/** List-table column key. */
	private const COLUMN_KEY = 'sgs_usage';

	/**
	 * Wire hooks. Call once from the plugin bootstrap, after Sgs_Block_CPTs
	 * so its post-type constants resolve.
	 */
	public static function register(): void {
		foreach ( self::post_types() as $post_type ) {
			\add_filter( "manage_{$post_type}_posts_columns", array( self::class, 'add_column' ) );
			\add_action( "manage_{$post_type}_posts_custom_column", array( self::class, 'render_column' ), 10, 2 );
		}
	}

	/**
	 * The six post types this column applies to.
	 *
	 * @return array<int,string>
	 */
	private static function post_types(): array {
		return array(
			Sgs_Block_CPTs::HEADER_CPT,
			Sgs_Block_CPTs::FOOTER_CPT,
			Sgs_Block_CPTs::DRAWER_CPT,
			Sgs_Block_CPTs::MODAL_CPT,
			Sgs_Block_CPTs::FORM_CPT,
			Sgs_Block_CPTs::CHOICE_FLOW_CPT,
		);
	}

	/**
	 * Insert the "Used by" column immediately after the title.
	 *
	 * @param array<string,string> $columns Existing columns.
	 * @return array<string,string>
	 */
	public static function add_column( array $columns ): array {
		$out   = array();
		$added = false;
		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;
			if ( 'title' === $key ) {
				$out[ self::COLUMN_KEY ] = \__( 'Used by', 'sgs-blocks' );
				$added                   = true;
			}
		}
		if ( ! $added ) {
			$out[ self::COLUMN_KEY ] = \__( 'Used by', 'sgs-blocks' );
		}
		return $out;
	}

	/**
	 * Render the "Used by" cell.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Row post id.
	 */
	public static function render_column( $column, $post_id ): void {
		if ( self::COLUMN_KEY !== $column ) {
			return;
		}
		$post = \get_post( (int) $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return;
		}
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from esc_html()/wp_kses-safe fragments below.
		echo self::describe_usage( $post );
	}

	/**
	 * Resolve the usage description for one post, dispatched by its CPT.
	 *
	 * @param \WP_Post $post Row post.
	 * @return string Escaped HTML fragment.
	 */
	private static function describe_usage( \WP_Post $post ): string {
		switch ( $post->post_type ) {
			case Sgs_Block_CPTs::HEADER_CPT:
			case Sgs_Block_CPTs::FOOTER_CPT:
				$rule_count = self::header_footer_rule_count( $post );
				return self::count_label(
					$rule_count,
					\__( 'Not currently used by any rule', 'sgs-blocks' ),
					/* translators: %d: number of rules. */
					\_n( 'Used by %d rule', 'Used by %d rules', $rule_count, 'sgs-blocks' )
				);

			case Sgs_Block_CPTs::DRAWER_CPT:
				return self::is_active_drawer( $post )
					? '<strong>' . \esc_html__( 'Active site-wide drawer', 'sgs-blocks' ) . '</strong>'
					: \esc_html__( 'Not the active drawer', 'sgs-blocks' );

			case Sgs_Block_CPTs::MODAL_CPT:
				$count = self::modal_reference_count( $post );
				return self::count_label(
					$count,
					\__( 'Not currently used by any trigger', 'sgs-blocks' ),
					/* translators: %d: number of modal triggers. */
					\_n( 'Used by %d trigger', 'Used by %d triggers', $count, 'sgs-blocks' )
				);

			case Sgs_Block_CPTs::FORM_CPT:
				$count = self::content_reference_count( 'formId', $post->post_name );
				return self::count_label(
					$count,
					\__( 'Not currently embedded on any page', 'sgs-blocks' ),
					/* translators: %d: number of pages. */
					\_n( 'Embedded on %d page', 'Embedded on %d pages', $count, 'sgs-blocks' )
				);

			case Sgs_Block_CPTs::CHOICE_FLOW_CPT:
				$count = self::content_reference_count( 'flowId', $post->post_name );
				return self::count_label(
					$count,
					\__( 'Not currently embedded on any page', 'sgs-blocks' ),
					/* translators: %d: number of pages. */
					\_n( 'Embedded on %d page', 'Embedded on %d pages', $count, 'sgs-blocks' )
				);
		}

		return '';
	}

	/**
	 * Build the "used / not used" label for a count.
	 *
	 * @param int    $count       The computed usage count.
	 * @param string $zero_label  Untranslated-already label for zero (passed pre-__()'d).
	 * @param string $count_label Untranslated-already, ALREADY run through _n() for the resolved count, containing one `%d`.
	 * @return string Escaped HTML.
	 */
	private static function count_label( int $count, string $zero_label, string $count_label ): string {
		if ( 0 === $count ) {
			return \esc_html( $zero_label );
		}
		return \esc_html( sprintf( $count_label, $count ) );
	}

	/**
	 * Count Header/Footer Rules whose `pattern_slug` targets this post.
	 *
	 * @param \WP_Post $post A `sgs_header` or `sgs_footer` post.
	 * @return int
	 */
	private static function header_footer_rule_count( \WP_Post $post ): int {
		$is_header    = ( Sgs_Block_CPTs::HEADER_CPT === $post->post_type );
		$target_slug  = ( $is_header ? 'sgs/header-' : 'sgs/footer-' ) . $post->post_name;
		$rules_class  = $is_header ? Sgs_Header_Rules::class : Sgs_Footer_Rules::class;
		$rules        = $rules_class::list_rules();
		$matched      = 0;
		foreach ( $rules as $rule ) {
			if ( ( $rule['pattern_slug'] ?? '' ) === $target_slug ) {
				++$matched;
			}
		}
		return $matched;
	}

	/**
	 * Whether this drawer post is the site-wide Active drawer.
	 *
	 * @param \WP_Post $post A `sgs_drawer` post.
	 * @return bool
	 */
	private static function is_active_drawer( \WP_Post $post ): bool {
		return Sgs_Active_Layout::get_stored_id( Sgs_Active_Layout::AREA_DRAWER ) === $post->ID;
	}

	/**
	 * Count published posts/pages whose content embeds a `sgs/modal` block
	 * instance with `modalRef` equal to this post's ID.
	 *
	 * Matches on two boundary characters (`,` and `}`) because
	 * `wp_json_encode()`'s compact output never pads a numeric attribute with
	 * whitespace, and the boundary prevents `modalRef":12` false-matching a
	 * stored `modalRef":123`.
	 *
	 * @param \WP_Post $post A `sgs_modal` post.
	 * @return int
	 */
	private static function modal_reference_count( \WP_Post $post ): int {
		global $wpdb;

		$needle = '"modalRef":' . (int) $post->ID;
		$like_comma = '%' . $wpdb->esc_like( $needle . ',' ) . '%';
		$like_brace = '%' . $wpdb->esc_like( $needle . '}' ) . '%';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- bounded COUNT(*), no list-table pagination equivalent exists for a content scan.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'publish' AND ( post_content LIKE %s OR post_content LIKE %s )",
				$like_comma,
				$like_brace
			)
		);
	}

	/**
	 * Count published posts/pages whose content embeds a block attribute
	 * `"{$attr}":"{$slug}"` — the shape both `sgs/form`'s `formId` and a
	 * `sgs/choice-flow` embedding block's `flowId` use to
	 * reference a CPT post by slug (mirrors `Sgs_Block_CPTs::resolve_form()` /
	 * `resolve_choice_flow()`'s own by-slug lookup).
	 *
	 * @param string $attr Attribute name (`formId` or `flowId`).
	 * @param string $slug Target post's slug.
	 * @return int
	 */
	private static function content_reference_count( string $attr, string $slug ): int {
		if ( '' === $slug ) {
			return 0;
		}

		global $wpdb;

		$needle = '"' . $attr . '":"' . $slug . '"';
		$like   = '%' . $wpdb->esc_like( $needle ) . '%';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- bounded COUNT(*), no list-table pagination equivalent exists for a content scan.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_content LIKE %s",
				$like
			)
		);
	}
}
