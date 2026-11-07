<?php
/**
 * Float position: take a block out of the flow and place it by its edges, per device.
 *
 * The server half of `src/blocks/extensions/float-position.js`. A block that lists `floatPosition` in
 * `supports.sgs.enabledExtensions` gets five per-device attributes ({desktop,tablet,mobile}; a blank tablet or
 * mobile tier inherits the tier above):
 *   - `sgsPosition`: 'static' | 'relative' | 'absolute' ('' = the block's own position, nothing printed);
 *   - `sgsInsetTop`, `sgsInsetRight`, `sgsInsetBottom`, `sgsInsetLeft`: a CSS length (negative values allowed),
 *     printed only while the tier's position is not static.
 *
 * Choosing 'static' at a tier puts the block back in the flow there and clears its offsets, so a float can start at
 * a tablet width and end at desktop. The nearest positioned ancestor is the containing block (an SGS container is
 * `position:relative`). The rules land on the block's root through a scoped `<style>` tag, never a style="" attribute.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\inject_float_position', 10, 2 );

const FLOAT_POSITION_MODES = array( 'static', 'relative', 'absolute' );
const FLOAT_POSITION_EDGES = array(
	'top'    => 'sgsInsetTop',
	'right'  => 'sgsInsetRight',
	'bottom' => 'sgsInsetBottom',
	'left'   => 'sgsInsetLeft',
);

/**
 * Whether a block type has opted into the float-position extension.
 *
 * @param string $block_name Block name.
 * @return bool
 */
function float_position_enabled( string $block_name ): bool {
	if ( '' === $block_name ) {
		return false;
	}
	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	$list = ( null !== $type && is_array( $type->supports ?? null ) ) ? ( $type->supports['sgs']['enabledExtensions'] ?? null ) : null;
	return is_array( $list ) && in_array( 'floatPosition', $list, true );
}

/**
 * The declarations for one resolved tier state.
 *
 * @param string               $mode      'static' | 'relative' | 'absolute' | '' (the block's own).
 * @param array<string,string> $edges     Sanitised edge lengths keyed top/right/bottom/left ('' = unset).
 * @param bool                 $any_float Whether any tier floats, so a static tier must clear the offsets.
 * @return string Declarations without braces.
 */
function float_position_declarations( string $mode, array $edges, bool $any_float ): string {
	if ( '' === $mode ) {
		return '';
	}
	if ( 'static' === $mode ) {
		return $any_float ? 'position:static;top:auto;right:auto;bottom:auto;left:auto;' : '';
	}
	$css = 'position:' . $mode . ';';
	foreach ( $edges as $property => $value ) {
		if ( '' !== $value ) {
			$css .= $property . ':' . $value . ';';
		}
	}
	return $css;
}

/**
 * Render-block filter: add the scope classes and the scoped position rules.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function inject_float_position( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	$attrs = $block['attrs'] ?? array();
	if ( empty( $attrs['sgsPosition'] ) || ! is_array( $attrs['sgsPosition'] ) ) {
		return $block_content;
	}
	if ( ! float_position_enabled( (string) ( $block['blockName'] ?? '' ) ) ) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-scoped-instance-vars.php';

	$tiers      = array( 'desktop', 'tablet', 'mobile' );
	$positions  = sgs_responsive_normalise_object( $attrs['sgsPosition'] );
	$edge_attrs = array();
	foreach ( FLOAT_POSITION_EDGES as $property => $attr ) {
		$edge_attrs[ $property ] = sgs_responsive_normalise_object( $attrs[ $attr ] ?? null );
	}

	$resolved  = array();
	$any_float = false;
	foreach ( $tiers as $tier ) {
		$mode = (string) sgs_resolve_tier( $positions, $tier, '' )['value'];
		$mode = in_array( $mode, FLOAT_POSITION_MODES, true ) ? $mode : '';
		$edges = array();
		foreach ( $edge_attrs as $property => $obj ) {
			$edges[ $property ] = sgs_css_length_value( (string) sgs_resolve_tier( $obj, $tier, '' )['value'] );
		}
		$resolved[ $tier ] = array( $mode, $edges );
		$any_float         = $any_float || in_array( $mode, array( 'relative', 'absolute' ), true );
	}

	// One state key per tier so the shared tier emitter skips a tier that matches the one above.
	$states = array();
	$css_by = array();
	foreach ( $resolved as $tier => $pair ) {
		$key             = $pair[0] . '|' . implode( '|', $pair[1] );
		$states[ $tier ] = $key;
		$css_by[ $key ]  = float_position_declarations( $pair[0], $pair[1], $any_float );
	}
	if ( '' === implode( '', $css_by ) ) {
		return $block_content;
	}

	$css_for = static function ( string $scope_class ) use ( $states, $css_by ): string {
		return sgs_emit_tier_rules_map( '.sgs-float-position.' . $scope_class, $states, $css_by, '', '' );
	};
	return sgs_inject_scoped_rules( $block_content, 'sgs-float-position', $css_for );
}
