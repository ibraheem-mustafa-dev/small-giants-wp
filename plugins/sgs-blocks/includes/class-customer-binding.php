<?php
/**
 * Block binding source: sgs/customer (the signed-in customer).
 *
 * Lets a heading or text block show the signed-in customer's name: bind `content` (sgs/heading) or `text` (sgs/text) to
 * `{ "source": "sgs/customer", "args": { "key": "first_name", "format": "Hello, %s" } }`. Keys: `first_name` (the
 * customer's first name, else their display name) and `display_name`. The optional `format` places the name inside a
 * sentence: its first `%s` becomes the name. Signed out, or with no name on the account, the source resolves to null, so
 * the block keeps the text its author typed as the fallback.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and resolves the sgs/customer binding source.
 */
final class Customer_Binding {

	/** Keys the source resolves. */
	const KEYS = array( 'first_name', 'display_name' );

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_source' ) );
	}

	/**
	 * Register the source with core.
	 *
	 * @return void
	 */
	public static function register_source(): void {
		if ( ! \function_exists( 'register_block_bindings_source' ) ) {
			return;
		}
		\register_block_bindings_source(
			'sgs/customer',
			array(
				'label'              => \__( 'SGS Customer', 'sgs-blocks' ),
				'get_value_callback' => array( __CLASS__, 'get_value' ),
				'uses_context'       => array(),
			)
		);
	}

	/**
	 * The bound value, or null when nobody is signed in or the account has no name (the block then keeps its saved text).
	 *
	 * @param mixed $source_args Binding args (`key`, optional `format`).
	 * @return string|null
	 */
	public static function get_value( $source_args ): ?string {
		$key = \is_array( $source_args ) && isset( $source_args['key'] ) ? \sanitize_key( (string) $source_args['key'] ) : '';
		if ( ! \in_array( $key, self::KEYS, true ) || ! \is_user_logged_in() ) {
			return null;
		}
		$user = \wp_get_current_user();
		$name = 'first_name' === $key ? \trim( (string) $user->first_name ) : '';
		if ( '' === $name ) {
			$name = \trim( (string) $user->display_name );
		}
		$name = \sanitize_text_field( $name );
		if ( '' === $name ) {
			return null;
		}
		$format = isset( $source_args['format'] ) ? \sanitize_text_field( (string) $source_args['format'] ) : '';
		$at     = '' !== $format ? \strpos( $format, '%s' ) : false;
		if ( false === $at ) {
			return $name;
		}
		return \substr( $format, 0, $at ) . $name . \substr( $format, $at + 2 );
	}
}
