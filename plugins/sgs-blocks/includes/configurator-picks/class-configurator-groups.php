<?php
/**
 * The one group resolver for the buy box "Pick a set" mode.
 *
 * Roles come from WooCommerce: a variation attribute is a priced picker, a non-variation attribute is an answer group.
 * Flags live in the product meta `_sgs_attribute_flags` only. Render and server validation both read the groups from
 * here, so visibility and the two-option minimum are the same rules in both.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Configurator_Groups
 */
final class Configurator_Groups {

	/** Product meta holding the flags map. */
	const FLAGS_META = '_sgs_attribute_flags';

	/** Term meta holding an explicit pack number. */
	const PACK_UNITS_META = '_sgs_pack_units';

	/**
	 * The key a product attribute is known by: the taxonomy name for a global attribute, `sanitize_title( name )` for a local one.
	 *
	 * @param string $name WC attribute name (taxonomy name or local label).
	 * @return string
	 */
	public static function attribute_key( string $name ): string {
		return \function_exists( 'taxonomy_exists' ) && \taxonomy_exists( $name ) ? $name : \sanitize_title( $name );
	}

	/**
	 * The product's stored flags, sanitised.
	 *
	 * @param int $product_id Product ID.
	 * @return array<string,array<string,mixed>>
	 */
	public static function flags_for_product( int $product_id ): array {
		return sgs_picks_sanitise_flags( \get_post_meta( $product_id, self::FLAGS_META, true ) );
	}

	/**
	 * Every attribute of the product as a group, in the product's attribute (drag) order.
	 *
	 * The `sgs_configurator_groups` filter may return a ready array for a product (the override point the tests use).
	 *
	 * @param int $product_id Product ID.
	 * @return array<int,array<string,mixed>> Each: key, label, role (priced|answer), terms (id, slug, label, colour, image, badge, description), flags.
	 */
	public static function for_product( int $product_id ): array {
		$preset = \apply_filters( 'sgs_configurator_groups', null, $product_id );
		if ( \is_array( $preset ) ) {
			return $preset;
		}
		$product = \function_exists( 'wc_get_product' ) ? \wc_get_product( $product_id ) : null;
		if ( ! $product instanceof \WC_Product ) {
			return array();
		}
		$stored = self::flags_for_product( $product_id );
		$groups = array();
		foreach ( $product->get_attributes() as $attribute ) {
			if ( ! $attribute instanceof \WC_Product_Attribute ) {
				continue;
			}
			$name     = (string) $attribute->get_name();
			$key      = self::attribute_key( $name );
			$priced   = (bool) $attribute->get_variation();
			$groups[] = array(
				'key'   => $key,
				'label' => $attribute->is_taxonomy() ? \wc_attribute_label( $name ) : $name,
				'role'  => $priced ? 'priced' : 'answer',
				'terms' => self::terms( $product_id, $attribute ),
				'flags' => $priced ? array() : ( $stored[ $key ] ?? array() ),
			);
		}
		return $groups;
	}

	/**
	 * The options of one attribute.
	 *
	 * @param int                   $product_id Product ID.
	 * @param \WC_Product_Attribute $attribute  Attribute.
	 * @return array<int,array<string,mixed>>
	 */
	private static function terms( int $product_id, \WC_Product_Attribute $attribute ): array {
		$out = array();
		if ( $attribute->is_taxonomy() ) {
			$terms = \wc_get_product_terms( $product_id, (string) $attribute->get_name(), array( 'fields' => 'all' ) );
			foreach ( \is_array( $terms ) ? $terms : array() as $term ) {
				$id    = (int) $term->term_id;
				$out[] = array(
					'id'          => $id,
					'slug'        => (string) $term->slug,
					'label'       => (string) $term->name,
					'colour'      => (string) \sanitize_hex_color( (string) \get_term_meta( $id, '_sgs_swatch_color', true ) ),
					'image'       => \absint( \get_term_meta( $id, '_sgs_swatch_image_id', true ) ),
					'badge'       => (string) \get_term_meta( $id, '_sgs_term_badge', true ),
					'description' => (string) \get_term_meta( $id, '_sgs_term_description', true ),
				);
			}
			return $out;
		}
		foreach ( (array) $attribute->get_options() as $option ) {
			$text = \trim( (string) $option );
			if ( '' === $text ) {
				continue;
			}
			$out[] = array(
				'id'          => 0,
				'slug'        => \sanitize_title( $text ),
				'label'       => $text,
				'colour'      => '',
				'image'       => 0,
				'badge'       => '',
				'description' => '',
			);
		}
		return $out;
	}

	/**
	 * The pack axis and each of its options' pack number.
	 *
	 * The axis is the product's own `_sgs_pack_size_axis` marker. A term's `_sgs_pack_units` wins; otherwise its name must
	 * hold exactly one run of digits. Options that give no number are listed in `unparseable` (their labels).
	 *
	 * @param int                            $product_id Product ID.
	 * @param array<int,array<string,mixed>> $groups     Resolver output.
	 * @return array{key:string,units:array<string,int>,unparseable:string[]} `key` is '' when the product has no pack axis.
	 */
	public static function pack( int $product_id, array $groups ): array {
		$none = array(
			'key'         => '',
			'units'       => array(),
			'unparseable' => array(),
		);
		$axis = \sanitize_key( (string) \get_post_meta( $product_id, '_sgs_pack_size_axis', true ) );
		if ( '' === $axis ) {
			return $none;
		}
		foreach ( $groups as $group ) {
			if ( $axis !== $group['key'] || 'priced' !== $group['role'] ) {
				continue;
			}
			$units = array();
			$bad   = array();
			foreach ( $group['terms'] as $term ) {
				$explicit = ! empty( $term['id'] ) ? \absint( \get_term_meta( (int) $term['id'], self::PACK_UNITS_META, true ) ) : 0;
				$number   = $explicit > 0 ? $explicit : sgs_picks_parse_pack_number( (string) $term['label'] );
				if ( null === $number ) {
					$bad[] = (string) $term['label'];
				} else {
					$units[ (string) $term['slug'] ] = $number;
				}
			}
			return array(
				'key'         => $axis,
				'units'       => $units,
				'unparseable' => $bad,
			);
		}
		return $none;
	}
}
