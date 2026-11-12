<?php
/**
 * An item set's media through the shared renderer (Spec 49 §8.3), for any block whose items carry their own picture.
 *
 * An item is `{source, alt, decorative, fit, focal, ...}`. The renderer reads a slot's settings from `{prefix}*`
 * attributes, so each item's own fields are laid over the block's (`{prefix}Fit`, `{prefix}Width`, `{prefix}Shape`,
 * `{prefix}Loading`...). The renderer prints the picture, its per-item rules under `{uid}-i{index}` and the block-level
 * rules once, with the first item that has a picture. The item's other fields (label, link, price) stay with the
 * block's own markup.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_media_item_device_tiers' ) ) {
	/**
	 * A responsive value's own `{desktop,tablet,mobile}` entries, empty ones left out; a plain value is the desktop one.
	 *
	 * @param mixed $raw Stored value.
	 * @return array<string,mixed>
	 */
	function sgs_media_item_device_tiers( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return null === $raw || '' === $raw ? array() : array( 'desktop' => $raw );
		}
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			if ( isset( $raw[ $device ] ) && '' !== $raw[ $device ] && array() !== $raw[ $device ] ) {
				$out[ $device ] = $raw[ $device ];
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_item_slot_for' ) ) {
	/**
	 * A block's media slot by prefix: its `supports.sgs.mediaElements` entry, or the given defaults.
	 *
	 * @param \WP_Block|null $block    The block instance.
	 * @param string         $prefix   Slot prefix.
	 * @param string[]       $fallback Kinds to use when the entry is missing.
	 * @param string         $context  Context to use when the entry names none or is missing.
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_media_item_slot_for( $block, string $prefix, array $fallback = array( 'image' ), string $context = 'item' ): array {
		$entries = $block instanceof \WP_Block ? (array) ( $block->block_type->supports['sgs']['mediaElements'] ?? array() ) : array();
		foreach ( $entries as $entry ) {
			if ( is_array( $entry ) && '' !== $prefix && ( $entry['prefix'] ?? '' ) === $prefix && ! empty( $entry['kinds'] ) ) {
				return array(
					'prefix'  => $prefix,
					'kinds'   => array_map( 'strval', (array) $entry['kinds'] ),
					'context' => (string) ( $entry['context'] ?? $context ),
				);
			}
		}
		return array(
			'prefix'  => $prefix,
			'kinds'   => $fallback,
			'context' => $context,
		);
	}
}

if ( ! function_exists( 'sgs_media_item_fit' ) ) {
	/**
	 * An item's Fit per device (Spec 49 §8.3: items inherit the block-level Fit). The item's own Fit wins at every device
	 * its own cascade reaches: a device it sets, and the narrower devices that inherit from it. Where the item's cascade
	 * has no value the block's cascade answers, then the block's default. Only the devices where the value changes from
	 * the wider device are written, so the renderer's own cascade restores the rest.
	 *
	 * @param mixed $block_fit    The block-level Fit (`{prefix}Fit`).
	 * @param mixed $item_fit     The item's own `fit`.
	 * @param mixed $default_fit  The block's default Fit when neither sets one (a plain value or a responsive value).
	 * @return array<string,string>
	 */
	function sgs_media_item_fit( $block_fit, $item_fit, $default_fit = null ): array {
		$item    = sgs_media_device_values( $item_fit );
		$block   = sgs_media_device_values( $block_fit );
		$default = sgs_media_device_values( $default_fit );
		$out     = array();
		$prev    = null;
		foreach ( sgs_media_devices() as $device ) {
			$value = $item[ $device ] ?? $block[ $device ] ?? $default[ $device ];
			if ( null !== $value && $value !== $prev ) {
				$out[ $device ] = $value;
			}
			$prev = $value ?? $prev;
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_item_slot_attrs' ) ) {
	/**
	 * The attributes the renderer reads for one item: the block's, with the item's own source, alt, decorative flag, focal
	 * point and fit laid over them. The fit follows `sgs_media_item_fit()`.
	 *
	 * @param string $prefix      Slot prefix.
	 * @param array  $item        One item.
	 * @param array  $attributes  Block attributes.
	 * @param mixed  $default_fit The block's Fit when neither the block nor the item sets one.
	 * @return array
	 */
	function sgs_media_item_slot_attrs( string $prefix, array $item, array $attributes, $default_fit = null ): array {
		$attrs                           = $attributes;
		$attrs[ $prefix . 'Source' ]     = $item['source'] ?? null;
		$attrs[ $prefix . 'Alt' ]        = is_string( $item['alt'] ?? null ) ? $item['alt'] : '';
		$attrs[ $prefix . 'Decorative' ] = ! empty( $item['decorative'] );
		if ( isset( $item['focal'] ) ) {
			$attrs[ $prefix . 'Focal' ] = $item['focal'];
		}
		$fit = sgs_media_item_fit( $attributes[ $prefix . 'Fit' ] ?? null, $item['fit'] ?? null, $default_fit );
		if ( array() !== $fit ) {
			$attrs[ $prefix . 'Fit' ] = $fit;
		}
		foreach ( array( 'Caption', 'LinkUrl', 'LinkUrlSource', 'LinkOpensNewTab', 'LinkRel' ) as $own ) {
			unset( $attrs[ $prefix . $own ] );
		}
		return $attrs;
	}
}

if ( ! function_exists( 'sgs_media_item_has_source' ) ) {
	/**
	 * Whether an item carries a picture of its own: a source with a file on any device.
	 *
	 * @param array $item One item.
	 * @return bool
	 */
	function sgs_media_item_has_source( array $item ): bool {
		$source = $item['source'] ?? null;
		if ( ! is_array( $source ) ) {
			return false;
		}
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$entry = $source[ $device ] ?? null;
			if ( is_array( $entry ) && ( ! empty( $entry['id'] ) || ! empty( $entry['url'] ) ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_media_item_renderer' ) ) {
	/**
	 * A renderer for the items of one block instance. Each call renders one item and returns its markup; the CSS of
	 * every item and the block's shared rules collect in `$css`, which the caller prints in its own scoped `<style>`.
	 *
	 * @param array  $slot       `{prefix, kinds, context}`.
	 * @param array  $attributes Block attributes.
	 * @param string $block_name Block name, e.g. `sgs/form-field-tiles`.
	 * @param string $scope_uid  Scope class the renderer's block-level rules use; carried by every item.
	 * @param array  $columns    Columns per device, for `sizes` (0 means unknown).
	 * @param string $css        Collected CSS, by reference.
	 * @param string $extra_class Classes the item's group carries besides the scope classes.
	 * @return callable(array,int):string Renders one item; '' when it has no picture.
	 */
	function sgs_media_item_renderer( array $slot, array $attributes, string $block_name, string $scope_uid, array $columns, string &$css, string $extra_class = '' ): callable {
		$block_rules = true;
		return static function ( array $item, int $index ) use ( $slot, $attributes, $block_name, $scope_uid, $columns, $extra_class, &$css, &$block_rules ): string {
			if ( ! class_exists( 'SGS_Media_Element' ) || ! sgs_media_item_has_source( $item ) ) {
				return '';
			}
			$out = SGS_Media_Element::render(
				$slot,
				sgs_media_item_slot_attrs( (string) $slot['prefix'], $item, $attributes ),
				array(
					'uid'         => $scope_uid,
					'block'       => $block_name,
					'in_editor'   => defined( 'REST_REQUEST' ) && REST_REQUEST,
					'extra_class' => $extra_class,
					'item_set'    => array(
						'index'       => $index,
						'columns'     => $columns,
						'block_rules' => $block_rules,
					),
				)
			);
			if ( '' === (string) $out['html'] ) {
				return '';
			}
			$block_rules = false;
			$css        .= (string) $out['css'];
			return (string) $out['html'];
		};
	}
}
