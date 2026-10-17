<?php
/**
 * Card Grid template card: the one locked sgs/product-card inner block a products-mode sgs/card-grid holds as the
 * design every product card renders with (the Query Loop post-template model).
 *
 * The grid is registered with `skip_inner_blocks`, so WordPress never renders the template itself on the page; the
 * grid's render reads the template's saved attributes and renders one sgs/product-card per product with them, the
 * per-product identity attributes winning.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the template card and builds each product card's attributes from it.
 */
final class Card_Grid_Template {

	/** The block that holds the template. */
	public const GRID_BLOCK = 'sgs/card-grid';

	/** The block the template is. */
	public const CARD_BLOCK = 'sgs/product-card';

	/** The grid sources that render their results through the template card. */
	public const PRODUCT_SOURCES = array( 'wc-product', 'cpt-collection' );

	/**
	 * Template attributes that name one product or one element on the page, so they never reach the cards: the bound
	 * product and its source, the HTML anchor (an id printed once per card would repeat), the editor lock and the
	 * block metadata (bindings and the List View name).
	 */
	public const IDENTITY_ATTRS = array( 'sourceMode', 'productId', 'anchor', 'lock', 'metadata' );

	/**
	 * Whether a grid source renders through the template card.
	 *
	 * @param string $source The grid's `source` attribute.
	 */
	public static function is_product_source( string $source ): bool {
		return \in_array( $source, self::PRODUCT_SOURCES, true );
	}

	/**
	 * `block_type_metadata_settings` filter: registers the grid with `skip_inner_blocks`, as core registers
	 * core/post-template, so WordPress hands the grid's render an empty `$content` and never renders the template.
	 *
	 * @param array $settings Block type settings.
	 * @param array $metadata The block.json metadata.
	 * @return array
	 */
	public static function metadata_settings( $settings, $metadata ) {
		if ( \is_array( $settings ) && \is_array( $metadata ) && self::GRID_BLOCK === ( $metadata['name'] ?? '' ) ) {
			$settings['skip_inner_blocks'] = true;
		}
		return $settings;
	}

	/**
	 * The template card's saved attributes, identity attributes removed; empty when the grid holds no template.
	 *
	 * Reads the parsed block (the attributes the editor saved), never the instance's defaulted attributes, so a
	 * template setting left at its default stays absent and the card's own default applies.
	 *
	 * @param object|null $block The grid's WP_Block.
	 * @return array<string,mixed>
	 */
	public static function template_attrs( $block ): array {
		$inner = \is_object( $block ) && isset( $block->parsed_block['innerBlocks'] ) && \is_array( $block->parsed_block['innerBlocks'] )
			? $block->parsed_block['innerBlocks']
			: array();
		foreach ( $inner as $parsed ) {
			if ( \is_array( $parsed ) && self::CARD_BLOCK === ( $parsed['blockName'] ?? '' ) ) {
				$attrs = \is_array( $parsed['attrs'] ?? null ) ? $parsed['attrs'] : array();
				return array_diff_key( $attrs, array_flip( self::IDENTITY_ATTRS ) );
			}
		}
		return array();
	}

	/**
	 * One product card's attributes: the grid's forwarded card settings, then the template's settings over them,
	 * then the product's identity over both.
	 *
	 * @param array<string,mixed> $forwarded The grid-level card settings the grid forwards (each its own default).
	 * @param array<string,mixed> $template  The template card's attributes (template_attrs()).
	 * @param array<string,mixed> $identity  The product's identity: sourceMode and productId.
	 * @return array<string,mixed>
	 */
	public static function card_attrs( array $forwarded, array $template, array $identity ): array {
		return array_merge( $forwarded, array_diff_key( $template, array_flip( self::IDENTITY_ATTRS ) ), $identity );
	}
}

add_filter( 'block_type_metadata_settings', array( Card_Grid_Template::class, 'metadata_settings' ), 10, 2 );
