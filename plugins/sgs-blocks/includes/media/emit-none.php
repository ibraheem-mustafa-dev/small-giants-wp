<?php
/**
 * C3 emitters of the atoms that print no CSS of their own: `source`, `meaning`, `caption`, `link`, `video-behaviour`
 * (markup and element state), `media-type` and `intrinsic` (folded into `Source.kind`, `Source.width` and `Source.height`)
 * and `box-shape` (split into the `sizing` and `shape` atoms, which print what it owned). Each returns ''.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_media_atom_source_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_source_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_meaning_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_meaning_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_caption_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_caption_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_link_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_link_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_video_behaviour_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_video_behaviour_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_media_type_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_media_type_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_intrinsic_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_intrinsic_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_emit' ) ) {
	/**
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string Always ''.
	 */
	function sgs_media_atom_box_shape_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		return '';
	}
}
