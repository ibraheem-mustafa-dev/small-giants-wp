<?php
/**
 * Card grid card media: each card's picture goes through the shared media renderer (Spec 49 §7, §8.3).
 *
 * A card is `{source, alt, decorative, fit, focal, title, subtitle, ...}`. The renderer reads the slot's settings from
 * `image*` attributes, so each card's own fields are laid over the block's (`imageFit`, `imageRadius`, `imageShape`,
 * `imageLoading`) and the renderer prints the picture, its per-card rules under `{uid}-i{index}` and the block-level
 * rules once. The frame the picture sits in (ratio, height, padding) is the card's own `.sgs-card-grid__image-wrap`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/media/render-item-slot.php';

if ( ! function_exists( 'sgs_card_grid_render_item_media' ) ) {
	/**
	 * Render one card's media through the shared renderer.
	 *
	 * @param array  $item        One `items` entry.
	 * @param int    $index       The card's position.
	 * @param array  $attributes  Block attributes.
	 * @param array  $slot        The image slot.
	 * @param string $scope_uid   Scope class the renderer's block-level rules use.
	 * @param array  $columns     Columns per device, for `sizes`.
	 * @param bool   $block_rules Whether this card prints the block-level rules.
	 * @return array{html:string,css:string}
	 */
	function sgs_card_grid_render_item_media( array $item, int $index, array $attributes, array $slot, string $scope_uid, array $columns, bool $block_rules ): array {
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return array(
				'html' => '',
				'css'  => '',
			);
		}
		$out = SGS_Media_Element::render(
			$slot,
			sgs_media_item_slot_attrs( 'image', $item, $attributes ),
			array(
				'uid'       => $scope_uid,
				'block'     => 'sgs/card-grid',
				'hidden'    => function_exists( 'sgs_in_hidden_render_context' ) && sgs_in_hidden_render_context(),
				'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
				'item_set'  => array(
					'index'       => $index,
					'columns'     => $columns,
					'block_rules' => $block_rules,
				),
			)
		);
		return array(
			'html' => (string) $out['html'],
			'css'  => (string) $out['css'],
		);
	}
}

if ( ! function_exists( 'sgs_card_grid_frame_css' ) ) {
	/**
	 * The image frame's ratio per device (`imageRatio`; 16 / 9 where the desktop has none) as the
	 * `--sgs-card-grid-aspect` custom property, and its fixed height per device (`imageHeight`) as `height`, which
	 * replaces the ratio.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $frame_sel  The frame's scoped selector.
	 * @return string CSS.
	 */
	function sgs_card_grid_frame_css( array $attributes, string $frame_sel ): string {
		$ratios = array( 'desktop' => '16 / 9' );
		foreach ( sgs_media_item_device_tiers( $attributes['imageRatio'] ?? null ) as $device => $raw ) {
			$ratio = is_string( $raw ) ? sgs_media_ratio( $raw ) : '';
			if ( '' !== $ratio ) {
				$ratios[ $device ] = $ratio;
			} elseif ( 'natural' === $raw ) {
				$ratios[ $device ] = 'auto';
			}
		}
		$css = sgs_emit_responsive_css(
			$frame_sel,
			array(
				array(
					'value'     => $ratios,
					'css'       => '--sgs-card-grid-aspect',
					'transform' => static fn( $raw ): string => (string) $raw,
				),
			)
		);
		$heights = array();
		foreach ( sgs_media_item_device_tiers( $attributes['imageHeight'] ?? null ) as $device => $raw ) {
			$length = is_scalar( $raw ) ? sgs_css_length_value( (string) $raw ) : '';
			if ( '' !== $length ) {
				$heights[ $device ] = $length;
			}
		}
		if ( array() !== $heights ) {
			$css .= sgs_emit_responsive_css(
				$frame_sel,
				array(
					array(
						'value'        => $heights,
						'css'          => 'height',
						'unit_default' => 'px',
					),
					array(
						'value'     => $heights,
						'css'       => 'aspect-ratio',
						'transform' => static fn(): string => 'auto',
					),
				)
			);
		}
		return $css;
	}
}
