<?php
/**
 * Timeline entry media: each entry's picture or video goes through the shared media renderer (Spec 49 §7, §8.3).
 *
 * An entry is `{date, title, description, icon, source, alt, decorative, fit, focal}`. The renderer reads the slot's
 * settings from `entry*` attributes, so each entry's own fields are laid over the block's (`entryFit`,
 * `entryLoading`, the shape and border settings) and the renderer prints the media, its per-entry rules under
 * `{uid}-i{index}` and the block-level rules once. The media box's own size (Width, Height and Ratio) belongs to the
 * entry's `.sgs-timeline__media-slot` cell, which the stylesheet lays out and render.php sizes, so those three settings
 * are not passed to the renderer.
 *
 * Loaded with `require_once` from render.php, a sibling file of this block, so the webpack PHP copy carries it to
 * `build/`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_timeline_media_slot' ) ) {
	/**
	 * The timeline's `entry` slot: its `supports.sgs.mediaElements` entry, or the entry's defaults.
	 *
	 * @param \WP_Block|null $block The block instance.
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_timeline_media_slot( $block ): array {
		$entries = $block instanceof \WP_Block ? (array) ( $block->block_type->supports['sgs']['mediaElements'] ?? array() ) : array();
		foreach ( $entries as $entry ) {
			if ( is_array( $entry ) && 'entry' === ( $entry['prefix'] ?? '' ) && ! empty( $entry['kinds'] ) ) {
				return array(
					'prefix'  => 'entry',
					'kinds'   => array_map( 'strval', (array) $entry['kinds'] ),
					'context' => (string) ( $entry['context'] ?? 'content' ),
				);
			}
		}
		return array(
			'prefix'  => 'entry',
			'kinds'   => array( 'image', 'video' ),
			'context' => 'content',
		);
	}
}

if ( ! function_exists( 'sgs_timeline_device_tiers' ) ) {
	/**
	 * A responsive value's own `{desktop,tablet,mobile}` entries, empty ones left out; a plain value is the desktop one.
	 *
	 * @param mixed $raw Stored value.
	 * @return array<string,mixed>
	 */
	function sgs_timeline_device_tiers( $raw ): array {
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

if ( ! function_exists( 'sgs_timeline_entry_attrs' ) ) {
	/**
	 * The attributes the renderer reads for one entry: the block's, with the entry's own source, alt, decorative flag,
	 * focal point and fit laid over them (a device the entry sets no fit for takes the timeline's), and without the
	 * three settings the media slot cell owns.
	 *
	 * @param array $entry      One `entries` item.
	 * @param array $attributes Block attributes.
	 * @return array
	 */
	function sgs_timeline_entry_attrs( array $entry, array $attributes ): array {
		$attrs                    = $attributes;
		$attrs['entrySource']     = $entry['source'] ?? null;
		$attrs['entryAlt']        = is_string( $entry['alt'] ?? null ) ? $entry['alt'] : '';
		$attrs['entryDecorative'] = ! empty( $entry['decorative'] );
		$attrs['entryFocal']      = $entry['focal'] ?? null;
		$attrs['entryLoading']    = is_string( $attributes['entryLoading'] ?? null ) ? $attributes['entryLoading'] : '';
		$fit                      = array_merge( sgs_timeline_device_tiers( $attributes['entryFit'] ?? null ), sgs_timeline_device_tiers( $entry['fit'] ?? null ) );
		if ( array() !== $fit ) {
			$attrs['entryFit'] = $fit;
		}
		foreach ( array( 'entryWidth', 'entryHeight', 'entryRatio' ) as $own ) {
			unset( $attrs[ $own ] );
		}
		return $attrs;
	}
}

if ( ! function_exists( 'sgs_timeline_render_entry_media' ) ) {
	/**
	 * Render one entry's media through the shared renderer.
	 *
	 * @param array  $entry       One `entries` item.
	 * @param int    $index       The entry's position.
	 * @param array  $attributes  Block attributes.
	 * @param array  $slot        The entry slot.
	 * @param string $scope_uid   Scope class the renderer's block-level rules use.
	 * @param bool   $block_rules Whether this entry prints the block-level rules.
	 * @return array{html:string,css:string,decorative:bool}
	 */
	function sgs_timeline_render_entry_media( array $entry, int $index, array $attributes, array $slot, string $scope_uid, bool $block_rules ): array {
		$empty = array(
			'html'       => '',
			'css'        => '',
			'decorative' => false,
		);
		if ( ! class_exists( 'SGS_Media_Element' ) || ! is_array( $entry['source'] ?? null ) ) {
			return $empty;
		}
		$attrs = sgs_timeline_entry_attrs( $entry, $attributes );
		$out   = SGS_Media_Element::render(
			$slot,
			$attrs,
			array(
				'uid'         => $scope_uid,
				'block'       => 'sgs/timeline',
				'in_editor'   => defined( 'REST_REQUEST' ) && REST_REQUEST,
				'extra_class' => 'sgs-timeline__media',
				'item_set'    => array(
					'index'       => $index,
					'columns'     => 1,
					'block_rules' => $block_rules,
				),
			)
		);
		return array(
			'html'       => (string) $out['html'],
			'css'        => (string) $out['css'],
			'decorative' => ! empty( $attrs['entryDecorative'] ),
		);
	}
}
