<?php
/**
 * Block binding source: sgs/archive (the archive page being shown).
 *
 * Lets one heading in an archive template name the listing it heads: bind `content` (sgs/heading) or `text` (sgs/text)
 * to `{ "source": "sgs/archive", "args": { "key": "title" } }`. Keys: `title` (the name of the category, tag or other
 * taxonomy term whose archive is shown, for example "Gifts" on /product-category/gifts/) and `description` (that term's
 * description, plain text). The optional `format` places the value inside a sentence: its first `%s` becomes the value.
 * Anywhere else (the shop page itself, a post type archive, a search, a single page), or with an empty value, the source
 * resolves to null, so the block keeps the text its author typed ("The shop") as the fallback.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and resolves the sgs/archive binding source.
 */
final class Archive_Binding {

	/** Keys the source resolves. */
	const KEYS = array( 'title', 'description' );

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
			'sgs/archive',
			array(
				'label'              => \__( 'SGS Archive', 'sgs-blocks' ),
				'get_value_callback' => array( __CLASS__, 'get_value' ),
				'uses_context'       => array(),
			)
		);
	}

	/**
	 * The bound value, or null when the page is not a taxonomy term archive or the term has no such value (the block
	 * then keeps its saved text).
	 *
	 * @param mixed $source_args Binding args (`key`, optional `format`).
	 * @return string|null
	 */
	public static function get_value( $source_args ): ?string {
		$key = \is_array( $source_args ) && isset( $source_args['key'] ) ? \sanitize_key( (string) $source_args['key'] ) : '';
		if ( ! \in_array( $key, self::KEYS, true ) || ! ( \is_category() || \is_tag() || \is_tax() ) ) {
			return null;
		}
		$term = \get_queried_object();
		if ( ! $term instanceof \WP_Term ) {
			return null;
		}
		$raw   = 'title' === $key ? (string) $term->name : (string) $term->description;
		$value = \trim( \wp_strip_all_tags( \html_entity_decode( $raw, ENT_QUOTES, 'UTF-8' ) ) );
		if ( '' === $value ) {
			return null;
		}
		$format = isset( $source_args['format'] ) ? \sanitize_text_field( (string) $source_args['format'] ) : '';
		$at     = '' !== $format ? \strpos( $format, '%s' ) : false;
		$text   = false === $at ? $value : \substr( $format, 0, $at ) . $value . \substr( $format, $at + 2 );
		return \esc_html( $text );
	}
}
