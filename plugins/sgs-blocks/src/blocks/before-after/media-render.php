<?php
/**
 * One comparison side's media for sgs/before-after: each side (`before`, `after`) is a media slot printed by the
 * shared renderer (Spec 49 §7), so the picture, video or inline SVG, its per-device files, alt text and Fit and Focal
 * rules all come from `SGS_Media_Element::render()`.
 *
 * Loaded with `require_once` from render.php, a sibling file of this block, so the webpack PHP copy carries it to
 * `build/`. The functions are named (not closures) so PHP declares each once per request however many comparisons the
 * page holds.
 *
 * A comparison keeps both sides' playback in step through one shared play and pause button (view.js), so a side's
 * video prints with no native controls, muted and looped unless its Playback setting says otherwise. A side that
 * shows a YouTube or Vimeo address prints nothing: a cross-origin player cannot be kept in step without that
 * platform's own script (Spec 38's motion doctrine allows no CDN script), so the comparison reports the side as
 * empty instead of drawing a comparison that drifts.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_before_after_slot' ) ) {
	/**
	 * One side's slot: its `supports.sgs.mediaElements` entry, or the entry's defaults.
	 *
	 * @param \WP_Block|null $block The block instance.
	 * @param string         $side  'before' or 'after'.
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_before_after_slot( $block, string $side ): array {
		$entries = $block instanceof \WP_Block ? (array) ( $block->block_type->supports['sgs']['mediaElements'] ?? array() ) : array();
		foreach ( $entries as $entry ) {
			if ( is_array( $entry ) && $side === ( $entry['prefix'] ?? '' ) && ! empty( $entry['kinds'] ) ) {
				return array(
					'prefix'  => $side,
					'kinds'   => array_map( 'strval', (array) $entry['kinds'] ),
					'context' => (string) ( $entry['context'] ?? 'content' ),
				);
			}
		}
		return array(
			'prefix'  => $side,
			'kinds'   => array( 'image', 'video', 'svg' ),
			'context' => 'content',
		);
	}
}

if ( ! function_exists( 'sgs_before_after_side_attrs' ) ) {
	/**
	 * The side's attributes with this block's playback defaults under whatever the Playback setting stores.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $side       'before' or 'after'.
	 * @return array
	 */
	function sgs_before_after_side_attrs( array $attributes, string $side ): array {
		$key                = $side . 'Playback';
		$stored             = is_array( $attributes[ $key ] ?? null ) ? $attributes[ $key ] : array();
		$attributes[ $key ] = array_merge(
			array(
				'controls' => false,
				'muted'    => true,
				'loop'     => true,
			),
			$stored
		);
		return $attributes;
	}
}

if ( ! function_exists( 'sgs_before_after_side_kinds' ) ) {
	/**
	 * The kinds a side shows across its devices, and whether any of them is a YouTube or Vimeo address.
	 *
	 * @param array $slot       The side's slot.
	 * @param array $attributes Block attributes.
	 * @return array{kinds:string[],embed:bool}
	 */
	function sgs_before_after_side_kinds( array $slot, array $attributes ): array {
		$kinds = array();
		$embed = false;
		foreach ( sgs_media_resolve_sources( $slot, $attributes ) as $source ) {
			if ( ! is_array( $source ) ) {
				continue;
			}
			$kinds[] = (string) $source['kind'];
			if ( 'embed' === $source['kind'] || (bool) preg_match( '#(?:youtube\.com/|youtu\.be/|vimeo\.com/)#i', (string) ( $source['url'] ?? '' ) ) ) {
				$embed = true;
			}
		}
		return array(
			'kinds' => array_values( array_unique( $kinds ) ),
			'embed' => $embed,
		);
	}
}

if ( ! function_exists( 'sgs_before_after_render_side' ) ) {
	/**
	 * Print one comparison side through the shared renderer.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $side       'before' or 'after'.
	 * @param string $uid        Block instance class; the side's scope class is `{uid}-{side}`.
	 * @param array  $slot       The side's slot.
	 * @return array{html:string,css:string,has_content:bool,has_video:bool}
	 */
	function sgs_before_after_render_side( array $attributes, string $side, string $uid, array $slot ): array {
		$empty = array(
			'html'        => '',
			'css'         => '',
			'has_content' => false,
			'has_video'   => false,
		);
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return $empty;
		}
		$attrs = sgs_before_after_side_attrs( $attributes, $side );
		$seen  = sgs_before_after_side_kinds( $slot, $attrs );
		if ( $seen['embed'] ) {
			return $empty;
		}
		$out = SGS_Media_Element::render(
			$slot,
			$attrs,
			array(
				'uid'       => $uid . '-' . $side,
				'block'     => 'sgs/before-after',
				'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
			)
		);
		if ( '' === (string) $out['html'] ) {
			return $empty;
		}
		return array(
			'html'        => '<div class="wp-block-sgs-before-after__side wp-block-sgs-before-after__side--' . esc_attr( $side ) . '">' . $out['html'] . '</div>',
			'css'         => (string) $out['css'],
			'has_content' => true,
			'has_video'   => in_array( 'video', $seen['kinds'], true ),
		);
	}
}
