<?php
/**
 * Refuse trashing or deleting a form or choice flow that is still in use
 * (Spec 42 FR-42-7b; Spec 43 FR-43-8 applies the same contract to flows).
 *
 * Refuse, never warn: a non-coder client clicks through a warning without
 * registering it. Enforced on `pre_trash_post` / `pre_delete_post`, so the
 * admin list, the block editor, REST and WP-CLI are all covered, not only
 * the admin UI action. Each surface also gets a readable reason:
 *   - REST (the block editor's "Move to trash"): a 409 with the list of
 *     pages/products, returned before the controller runs.
 *   - wp-admin list-table trash/delete: a wp_die() page naming the pages,
 *     with a back link (core would otherwise show only "Error in moving the
 *     item to Trash.").
 *   - WP-CLI: a warning naming the pages before core's own failure line.
 *
 * "In use" comes from {@see Sgs_Cpt_References::all_references()}, the same
 * finder the "Used by" column reads.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Cpt_Delete_Guard
 */
final class Sgs_Cpt_Delete_Guard {

	/** How many referencing items a refusal message names before summarising. */
	private const NAMED_LIMIT = 8;

	/**
	 * Wire hooks. Call once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_filter( 'pre_trash_post', array( self::class, 'guard_trash' ), 10, 2 );
		\add_filter( 'pre_delete_post', array( self::class, 'guard_delete' ), 10, 2 );
		\add_filter( 'rest_request_before_callbacks', array( self::class, 'guard_rest_delete' ), 10, 3 );
	}

	/**
	 * `pre_trash_post`: refuse when the post is still referenced.
	 *
	 * @param bool|null $trash Short-circuit value from an earlier filter.
	 * @param \WP_Post  $post  Post about to be trashed.
	 * @return bool|null False to refuse, otherwise the incoming value.
	 */
	public static function guard_trash( $trash, $post ) {
		return self::guard( $trash, $post, \__( 'moved to the Trash', 'sgs-blocks' ) );
	}

	/**
	 * `pre_delete_post`: refuse when the post is still referenced.
	 *
	 * @param \WP_Post|false|null $delete Short-circuit value from an earlier filter.
	 * @param \WP_Post            $post   Post about to be deleted.
	 * @return \WP_Post|false|null False to refuse, otherwise the incoming value.
	 */
	public static function guard_delete( $delete, $post ) {
		return self::guard( $delete, $post, \__( 'deleted', 'sgs-blocks' ) );
	}

	/**
	 * `rest_request_before_callbacks`: turn a DELETE on an in-use form or flow
	 * into a 409 carrying the reason, before the posts controller runs.
	 *
	 * @param mixed            $response Response so far (a WP_Error short-circuits).
	 * @param array            $handler  Route handler.
	 * @param \WP_REST_Request $request  Request.
	 * @return mixed
	 */
	public static function guard_rest_delete( $response, $handler, $request ) {
		if ( \is_wp_error( $response ) || ! $request instanceof \WP_REST_Request || 'DELETE' !== $request->get_method() ) {
			return $response;
		}

		$types = Sgs_Block_CPTs::FORM_CPT . '|' . Sgs_Block_CPTs::CHOICE_FLOW_CPT;
		if ( ! preg_match( '#^/wp/v2/(' . $types . ')/(\d+)$#', $request->get_route(), $match ) ) {
			return $response;
		}

		$post = \get_post( (int) $match[2] );
		if ( ! $post instanceof \WP_Post || $post->post_type !== $match[1] ) {
			return $response;
		}

		$references = Sgs_Cpt_References::all_references( $post );
		if ( array() === $references ) {
			return $response;
		}

		$verb = $request->get_param( 'force' ) ? \__( 'deleted', 'sgs-blocks' ) : \__( 'moved to the Trash', 'sgs-blocks' );

		return new \WP_Error( 'sgs_in_use', self::message( $post, $references, $verb ), array( 'status' => 409 ) );
	}

	/**
	 * Shared refusal for trash and delete.
	 *
	 * @param mixed    $incoming Incoming short-circuit value.
	 * @param \WP_Post $post     Post being removed.
	 * @param string   $verb     Translated past participle for the message.
	 * @return mixed False to refuse, otherwise $incoming.
	 */
	private static function guard( $incoming, $post, string $verb ) {
		if ( null !== $incoming || ! $post instanceof \WP_Post || '' === Sgs_Cpt_References::embed_attribute( $post->post_type ) ) {
			return $incoming;
		}

		$references = Sgs_Cpt_References::all_references( $post );
		if ( array() === $references ) {
			return $incoming;
		}

		$message = self::message( $post, $references, $verb );

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			\WP_CLI::warning( $message );
		} elseif ( \is_admin() && ! \wp_doing_ajax() && ! \wp_is_serving_rest_request() ) {
			\wp_die(
				\esc_html( $message ),
				\esc_html__( 'Still in use', 'sgs-blocks' ),
				array(
					'response'  => 409,
					'back_link' => true,
				)
			);
		}

		return false;
	}

	/**
	 * Plain-English refusal naming what still uses the post.
	 *
	 * @param \WP_Post          $post       Post being removed.
	 * @param array<int,object> $references Rows from Sgs_Cpt_References.
	 * @param string            $verb       Translated past participle.
	 * @return string Unescaped text; each caller escapes for its surface.
	 */
	private static function message( \WP_Post $post, array $references, string $verb ): string {
		$names = array();
		foreach ( array_slice( $references, 0, self::NAMED_LIMIT ) as $row ) {
			$type_object = \get_post_type_object( (string) $row->post_type );
			$type_label  = $type_object ? $type_object->labels->singular_name : (string) $row->post_type;
			$title       = '' !== (string) $row->post_title ? (string) $row->post_title : \__( '(no title)', 'sgs-blocks' );
			$names[]     = sprintf( '%1$s (%2$s)', $title, $type_label );
		}

		$list  = implode( ', ', $names );
		$extra = count( $references ) - count( $names );
		if ( $extra > 0 ) {
			/* translators: 1: list of names, 2: number of further items. */
			$list = sprintf( \_n( '%1$s and %2$d more', '%1$s and %2$d more', $extra, 'sgs-blocks' ), $list, $extra );
		}

		$title = '' !== $post->post_title ? $post->post_title : $post->post_name;

		/* translators: 1: form or flow title, 2: "moved to the Trash" or "deleted", 3: list of pages/products. */
		return sprintf( \__( '"%1$s" can\'t be %2$s because it is still used on: %3$s. Remove it from those first, then try again.', 'sgs-blocks' ), $title, $verb, $list );
	}
}
