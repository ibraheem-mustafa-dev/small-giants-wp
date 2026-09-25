<?php
/**
 * `POST /sgs/v1/choice-flow/submit` — the email-capture terminal
 * (`sgs/choice-flow-result`, `action: "email"`, Spec 43 FR-43-4).
 *
 * Mirrors the shape of `Flow_Fields_Upload` (same nonce permission callback,
 * same self-contained route-class pattern) but dispatches through the forms
 * engine (`Form_Processor::process()`) rather than the cart, since an email
 * result stores a submission and fires the N8N webhook — never `wp_mail()`.
 *
 * The rate limit is never taken from the request: it is read server-side
 * from the published flow's own `sgs/choice-flow-result` block attrs, so a
 * shopper cannot raise their own quota by editing the payload.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * Class Choice_Flow_Submit
 */
final class Choice_Flow_Submit {

	/** Default rate limit when no email-result block attrs can be read. */
	private const DEFAULT_RATE_LIMIT = 5;

	/** Most answers accepted; extras are truncated, not rejected. */
	private const ANSWERS_MAX = 16;

	/** Longest answer label kept, in characters. */
	private const LABEL_MAX = 60;

	/** Longest answer value kept, in characters. */
	private const VALUE_MAX = 200;

	/** Most tags accepted. */
	private const TAGS_MAX = 20;

	/** Register the route. */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/** Route definition. */
	public static function register_route(): void {
		\register_rest_route(
			'sgs/v1',
			'/choice-flow/submit',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( Form_REST_API::class, 'verify_form_nonce' ),
				'args'                => array(
					'flowRef' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'email'   => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'answers' => array(
						'required' => false,
						'type'     => 'array',
						'default'  => array(),
					),
					'tags'    => array(
						'required' => false,
						'type'     => 'array',
						'default'  => array(),
					),
					'sgs_hp'  => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Handle the submission.
	 *
	 * @param \WP_REST_Request $request The request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {
		$honeypot = (string) $request->get_param( 'sgs_hp' );

		// 1. Honeypot — fake success, never reveal the trap, nothing stored.
		if ( '' !== trim( $honeypot ) ) {
			return new \WP_REST_Response( array( 'success' => true ), 200 );
		}

		// 2. Email format — checked before resolving the flow so a malformed
		// request never burns a flow lookup or a rate-limit slot.
		$email = (string) $request->get_param( 'email' );
		if ( ! \is_email( $email ) ) {
			return new \WP_Error(
				'sgs_choice_flow_invalid_email',
				__( 'Please enter a valid email address.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// 3. Resolve the flow and the email-result block's own rateLimit.
		$flow_ref = (string) $request->get_param( 'flowRef' );
		$resolved = self::resolve_flow( $flow_ref );
		if ( null === $resolved ) {
			return new \WP_Error(
				'sgs_choice_flow_unknown',
				__( 'This form could not be found. Please refresh the page and try again.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		list( $flow_key, $rate_limit_max ) = $resolved;

		// 4. Rate limit, read from the block, never the request.
		$limited = Form_REST_Submission::check_rate_limit( 'choice-flow-' . $flow_key, $rate_limit_max );
		if ( \is_wp_error( $limited ) ) {
			return $limited;
		}

		// 5. Sanitise the rest of the payload and store.
		$fields = array(
			'email'   => $email,
			'answers' => self::sanitise_answers( $request->get_param( 'answers' ) ),
			'tags'    => self::sanitise_tags( $request->get_param( 'tags' ) ),
			'flowref' => \sanitize_text_field( $flow_ref ),
		);

		$result = Form_Processor::process( 'choice-flow-' . $flow_key, $fields, array(), true );
		if ( \is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Resolve `flowRef` to a rate-limit key + the email-result block's own
	 * `rateLimit` attribute (defaulting when no email-result block is found).
	 *
	 * `flowRef` is either a linked flow's `sgs_choice_flow` post slug, or
	 * `page:<postId>:<blockIndex>` for an inline flow — the Nth `sgs/choice-flow`
	 * block (document order, any depth) found in that published post's content.
	 *
	 * @param string $flow_ref The `flowRef` parameter.
	 * @return array{0:string,1:int}|null [flow_key, rateLimit], or null when unresolved.
	 */
	private static function resolve_flow( string $flow_ref ): ?array {
		if ( '' === $flow_ref ) {
			return null;
		}

		if ( 0 === strpos( $flow_ref, 'page:' ) ) {
			if ( ! preg_match( '/^page:(\d+):(\d+)$/', $flow_ref, $m ) ) {
				return null;
			}
			$post_id     = \absint( $m[1] );
			$block_index = \absint( $m[2] );
			$post        = \get_post( $post_id );
			if ( ! $post instanceof \WP_Post || 'publish' !== $post->post_status ) {
				return null;
			}
			$flow_blocks = self::find_blocks( \parse_blocks( $post->post_content ), 'sgs/choice-flow' );
			if ( ! isset( $flow_blocks[ $block_index ] ) ) {
				return null;
			}
			$flow_key = 'page-' . $post_id . '-' . $block_index;
			return array( $flow_key, self::rate_limit_from( $flow_blocks[ $block_index ] ) );
		}

		if ( ! class_exists( '\SGS\Blocks\Sgs_Block_CPTs' ) ) {
			return null;
		}

		$flow_post = \SGS\Blocks\Sgs_Block_CPTs::resolve_choice_flow( $flow_ref );
		if ( null === $flow_post ) {
			return null;
		}

		$flow_blocks = self::find_blocks( \parse_blocks( $flow_post->post_content ), 'sgs/choice-flow' );
		$flow_block  = $flow_blocks[0] ?? null;
		if ( null === $flow_block ) {
			return null;
		}

		$flow_key = 'flow-' . substr( md5( $flow_ref ), 0, 16 );
		return array( $flow_key, self::rate_limit_from( $flow_block ) );
	}

	/**
	 * The first `sgs/choice-flow-result` block's `rateLimit` attr inside a
	 * `sgs/choice-flow` block, or the default when none is found.
	 *
	 * @param array $flow_block A parsed `sgs/choice-flow` block.
	 * @return int
	 */
	private static function rate_limit_from( array $flow_block ): int {
		$results = self::find_blocks( $flow_block['innerBlocks'] ?? array(), 'sgs/choice-flow-result' );
		foreach ( $results as $result_block ) {
			if ( 'email' === ( $result_block['attrs']['action'] ?? '' ) ) {
				$configured = \absint( $result_block['attrs']['rateLimit'] ?? self::DEFAULT_RATE_LIMIT );
				return $configured > 0 ? $configured : self::DEFAULT_RATE_LIMIT;
			}
		}
		return self::DEFAULT_RATE_LIMIT;
	}

	/**
	 * Every block matching `$name`, anywhere in the tree, in document order.
	 *
	 * @param array  $blocks A `parse_blocks()` result (or an `innerBlocks` list).
	 * @param string $name   The block name to match.
	 * @return array[] Matching blocks.
	 */
	private static function find_blocks( array $blocks, string $name ): array {
		$found = array();
		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}
			if ( ( $block['blockName'] ?? '' ) === $name ) {
				$found[] = $block;
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = array_merge( $found, self::find_blocks( $block['innerBlocks'], $name ) );
			}
		}
		return $found;
	}

	/**
	 * Truncate to `ANSWERS_MAX` entries and clean each one — extras are
	 * dropped silently, never rejected (the client already showed them).
	 *
	 * @param mixed $raw The `answers` parameter.
	 * @return string[] "Label: Value" lines.
	 */
	private static function sanitise_answers( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$out = array();
		foreach ( array_slice( $raw, 0, self::ANSWERS_MAX ) as $entry ) {
			if ( ! is_array( $entry ) || ! isset( $entry['label'] ) || ! is_scalar( $entry['label'] ) ) {
				continue;
			}
			$label = mb_substr( \sanitize_text_field( (string) $entry['label'] ), 0, self::LABEL_MAX );
			if ( '' === $label ) {
				continue;
			}
			$value = isset( $entry['value'] ) && is_scalar( $entry['value'] ) ? (string) $entry['value'] : '';
			$value = mb_substr( \sanitize_text_field( $value ), 0, self::VALUE_MAX );
			$out[] = '' === $value ? $label : ( $label . ': ' . $value );
		}
		return $out;
	}

	/**
	 * Truncate to `TAGS_MAX` entries and reduce each to a safe key.
	 *
	 * @param mixed $raw The `tags` parameter.
	 * @return string[]
	 */
	private static function sanitise_tags( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$tags = array_map( 'sanitize_key', array_slice( $raw, 0, self::TAGS_MAX ) );
		return array_values( array_filter( $tags ) );
	}
}
