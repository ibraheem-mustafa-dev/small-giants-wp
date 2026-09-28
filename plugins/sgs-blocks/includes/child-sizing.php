<?php
/**
 * Child sizing: how a block sizes itself inside a flex row.
 *
 * The server half of `src/blocks/extensions/child-sizing.js`. A block that
 * lists `childSizing` in `supports.sgs.enabledExtensions` gets two per-device
 * attributes:
 *   - `sgsChildSizing` {desktop,tablet,mobile}: 'fit' | 'fill' | 'fixed'
 *     ('' or missing on desktop = the block's own natural sizing; a blank
 *     tablet/mobile tier inherits the tier above);
 *   - `sgsChildWidth`  {desktop,tablet,mobile}: a CSS length, read by 'fixed'.
 *
 * 'fill' takes the space left over in the row (`flex:1 1 0%`), so the
 * siblings keep their natural size and this block gets the rest; 'fit' sizes
 * to the content; 'fixed' holds the given width. The rules land on the
 * block's root element (the flex item) through a scoped `<style>` tag keyed
 * to a scope class, never a style="" attribute (Spec 32), the same path the
 * hover extension uses.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_child_sizing', 10, 2 );

/**
 * Whether a block type has opted into the child-sizing extension.
 *
 * @param string $block_name Block name.
 * @return bool
 */
function child_sizing_enabled( string $block_name ): bool {
	if ( '' === $block_name ) {
		return false;
	}
	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	$list = ( null !== $type && is_array( $type->supports ?? null ) ) ? ( $type->supports['sgs']['enabledExtensions'] ?? null ) : null;
	return is_array( $list ) && in_array( 'childSizing', $list, true );
}

/**
 * The CSS declarations for one resolved sizing state.
 *
 * @param string $mode      'fit' | 'fill' | 'fixed' | '' (natural).
 * @param string $width     Sanitised CSS length ('' when unset).
 * @param bool   $any_fixed Whether any tier uses a fixed width, so 'fit' and
 *                          'fill' must also cancel that width at their tier.
 * @return string Declarations without braces ('' = emit nothing).
 */
function child_sizing_declarations( string $mode, string $width, bool $any_fixed ): string {
	$reset_width = $any_fixed ? 'width:auto;max-width:none;' : '';
	switch ( $mode ) {
		case 'fill':
			return 'flex:1 1 0%;min-width:0;' . $reset_width;
		case 'fit':
			return 'flex:0 1 auto;' . $reset_width;
		case 'fixed':
			// `width`, not `flex-basis`: in a column-direction parent the basis
			// would size the height. max-width keeps it inside a narrow row.
			return '' === $width ? '' : 'flex:0 0 auto;width:' . $width . ';max-width:100%;box-sizing:border-box;';
		default:
			return '';
	}
}

/**
 * Render-block filter: add the scope classes and the scoped sizing rules.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function inject_child_sizing( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	$attrs = $block['attrs'] ?? array();
	if ( empty( $attrs['sgsChildSizing'] ) || ! is_array( $attrs['sgsChildSizing'] ) ) {
		return $block_content;
	}
	if ( ! child_sizing_enabled( (string) ( $block['blockName'] ?? '' ) ) ) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-scoped-instance-vars.php';

	// A blank tier inherits the tier above: sgs_resolve_tier() reads only
	// null/'inherit' as inherit, so normalise '' to null first.
	$normalise = static function ( $obj ): array {
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$v            = is_array( $obj ) ? ( $obj[ $tier ] ?? null ) : null;
			$out[ $tier ] = ( is_string( $v ) && '' !== $v ) ? $v : null;
		}
		return $out;
	};
	$modes     = $normalise( $attrs['sgsChildSizing'] );
	$widths    = $normalise( $attrs['sgsChildWidth'] ?? array() );

	$resolved  = array();
	$any_fixed = false;
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$mode              = (string) sgs_resolve_tier( $modes, $tier, '' )['value'];
		$mode              = in_array( $mode, array( 'fit', 'fill', 'fixed' ), true ) ? $mode : '';
		$width             = 'fixed' === $mode ? sgs_css_single_length_value( (string) sgs_resolve_tier( $widths, $tier, '' )['value'] ) : '';
		$resolved[ $tier ] = array( $mode, $width );
		$any_fixed         = $any_fixed || ( 'fixed' === $mode && '' !== $width );
	}

	// One state key per tier (mode + width) so the shared tier emitter can
	// diff tiers and skip a tier that matches the one above.
	$states = array();
	$css_by = array();
	foreach ( $resolved as $tier => $pair ) {
		$key             = $pair[0] . '|' . $pair[1];
		$states[ $tier ] = $key;
		$css_by[ $key ]  = child_sizing_declarations( $pair[0], $pair[1], $any_fixed );
	}
	if ( '' === implode( '', $css_by ) ) {
		return $block_content;
	}

	// Skip any leading <style>/<script> a block prepends to reach its real root.
	$offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $offset ), $lead ) ) {
		$close     = '</' . strtolower( $lead[1] ) . '>';
		$close_pos = stripos( $block_content, $close, $offset );
		if ( false === $close_pos ) {
			return $block_content;
		}
		$offset = $close_pos + strlen( $close );
	}
	$head = substr( $block_content, 0, $offset );
	$root = substr( $block_content, $offset );

	$root_tag = sgs_extract_root_opening_tag( ltrim( $root ) );
	if ( '' === $root_tag ) {
		return $block_content;
	}
	// The scope reuses the block's own uid class when it has one; add it only
	// when it was freshly minted.
	$scope   = sgs_scope_class_for_root( $root_tag, 'sgs-child-sizing' );
	$has_uid = (bool) preg_match( '/\bclass=["\'][^"\']*\b' . preg_quote( $scope, '/' ) . '\b/', $root_tag );
	$classes = $has_uid ? 'sgs-child-sizing' : 'sgs-child-sizing ' . $scope;

	if ( preg_match( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', $root ) ) {
		$root = preg_replace( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', '$1' . $classes . ' ', $root, 1 );
	} else {
		$root = preg_replace( '/^(\s*<\w+)(\b)/', '$1 class="' . $classes . '"$2', $root, 1 );
	}

	// Two classes (marker + scope) so a per-instance choice outranks a block's
	// own single-class sizing default such as `.sgs-button--full`.
	$css = sgs_emit_tier_rules_map( '.sgs-child-sizing.' . $scope, $states, $css_by, '', '|' );
	if ( '' === $css ) {
		return $head . $root;
	}
	return $head . $root . '<style>' . wp_strip_all_tags( $css ) . '</style>';
}
