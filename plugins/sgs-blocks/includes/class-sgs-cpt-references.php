<?php
/**
 * Where a `sgs_form` or `sgs_choice_flow` post is referenced from.
 *
 * One reference finder shared by the "Used by" list-table column
 * ({@see Sgs_Cpt_Usage_Columns}) and the delete guard
 * ({@see Sgs_Cpt_Delete_Guard}), so the two can never disagree about whether a
 * form or flow is in use.
 *
 * Embeds reference these posts by SLUG (Spec 42 §2): `sgs/form`'s `formId`,
 * `sgs/choice-flow`'s `flowId`. A definition post's own root block carries its
 * own slug too, so the post itself is always excluded — it is the definition,
 * not an embed of it. A choice flow can also be linked from a product through
 * the `_sgs_choice_flow` meta key (Spec 43 FR-43-25).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Cpt_References
 */
final class Sgs_Cpt_References {

	/**
	 * Every status whose content can reach a visitor now or later. Trashed
	 * posts, revisions (`inherit`) and auto-drafts are not embed points.
	 */
	public const LIVE_STATUSES = array( 'publish', 'future', 'draft', 'pending', 'private' );

	/** Cap on rows returned per lookup; these CPTs are low-cardinality by design. */
	private const ROW_LIMIT = 50;

	/**
	 * The embed attribute that references a post of this type, or '' when the
	 * type is not slug-referenced.
	 *
	 * @param string $post_type Post type.
	 * @return string
	 */
	public static function embed_attribute( string $post_type ): string {
		if ( Sgs_Block_CPTs::FORM_CPT === $post_type ) {
			return 'formId';
		}
		if ( Sgs_Block_CPTs::CHOICE_FLOW_CPT === $post_type ) {
			return 'flowId';
		}
		return '';
	}

	/**
	 * Posts whose content embeds this form or flow, excluding the post itself.
	 *
	 * @param \WP_Post           $post     A `sgs_form` or `sgs_choice_flow` post.
	 * @param array<int,string> $statuses Statuses of the embedding posts to count.
	 * @return array<int,object{ID:string,post_title:string,post_type:string}>
	 */
	public static function embedding_posts( \WP_Post $post, array $statuses = self::LIVE_STATUSES ): array {
		$attr = self::embed_attribute( $post->post_type );
		if ( '' === $attr || '' === $post->post_name || array() === $statuses ) {
			return array();
		}

		global $wpdb;

		$like         = '%' . $wpdb->esc_like( '"' . $attr . '":"' . $post->post_name . '"' ) . '%';
		$placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$args         = array_merge( array( $like, (int) $post->ID ), $statuses, array( self::ROW_LIMIT ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- bounded content scan; $placeholders is a run of literal %s built above.
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT ID, post_title, post_type FROM {$wpdb->posts} WHERE post_content LIKE %s AND ID <> %d AND post_status IN ( {$placeholders} ) ORDER BY ID LIMIT %d", $args ) );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Products linking this choice flow through `_sgs_choice_flow`.
	 *
	 * @param \WP_Post $post A `sgs_choice_flow` post.
	 * @return array<int,object{ID:string,post_title:string,post_type:string}>
	 */
	public static function linking_products( \WP_Post $post ): array {
		if ( Sgs_Block_CPTs::CHOICE_FLOW_CPT !== $post->post_type || '' === $post->post_name ) {
			return array();
		}

		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- bounded meta join, same statuses as sgs_product_choice_flow_count().
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.ID, p.post_title, p.post_type FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE pm.meta_key = '_sgs_choice_flow' AND pm.meta_value = %s AND p.post_type = 'product' AND p.post_status IN ( 'publish', 'draft', 'private' ) ORDER BY p.ID LIMIT %d",
				$post->post_name,
				self::ROW_LIMIT
			)
		);

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Everything that would break if this post went away: embedding posts,
	 * plus linking products for a choice flow.
	 *
	 * @param \WP_Post $post A `sgs_form` or `sgs_choice_flow` post.
	 * @return array<int,object{ID:string,post_title:string,post_type:string}>
	 */
	public static function all_references( \WP_Post $post ): array {
		return array_merge( self::embedding_posts( $post ), self::linking_products( $post ) );
	}
}
