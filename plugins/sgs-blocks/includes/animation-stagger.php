<?php
/**
 * Entrance trigger point, stagger and per-item entrances — render-time data attributes.
 *
 * Companion to animation-attributes.php (which writes the entrance itself and
 * sits close to the 300-line PHP limit). Runs after it at render_block
 * priority 11 and adds, onto the same root element:
 *
 *   · data-sgs-animation-trigger          — sgsAnimationTrigger: how far above
 *                                           the bottom of the screen (0-50 %) the
 *                                           block starts its entrance.
 *   · data-sgs-animation-stagger          — sgsAnimationStagger: this block's own
 *                                           stagger step (ms) against matching
 *                                           animated blocks beside it; reaches
 *                                           cards in repeated lists (a product
 *                                           template) whose parent is not ours.
 *   · data-sgs-animation-stagger-children — sgsAnimationStaggerChildren: a parent's
 *                                           stagger step (ms) for the animated
 *                                           blocks inside it. Written whether or
 *                                           not the parent animates itself. A
 *                                           block that declares its own stagger
 *                                           attribute (block.json attrMap
 *                                           `anim:stagger`, e.g. sgs/card-grid's
 *                                           staggerDelay) supplies it instead.
 *   · data-sgs-animation-stagger-max      — sgsAnimationStaggerMax: the item count
 *                                           after which the stagger stops growing.
 *   · data-sgs-animation-items            — block.json supports.sgs.animationItems:
 *                                           a selector for the block's own repeated
 *                                           items, which then enter one by one with
 *                                           the block's entrance settings instead of
 *                                           the block entering as one piece.
 *
 * Static blocks get the same attributes at save time from
 * src/blocks/extensions/animation.js; each is written only when present
 * there, so this filter never duplicates one. assets/js/animation-observer.js
 * reads all of them.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_entrance_stagger_attributes', 11, 2 );

/**
 * Clamp a numeric attribute string to a whole-number range, or '' when unset or not numeric.
 *
 * @param mixed $value Raw attribute value.
 * @param int   $min   Lowest allowed value.
 * @param int   $max   Highest allowed value.
 * @return string '' or a clamped integer string.
 */
function sgs_entrance_clamp_int( $value, int $min, int $max ): string {
	if ( null === $value || '' === $value || ! is_numeric( $value ) ) {
		return '';
	}
	return (string) max( $min, min( $max, (int) round( (float) $value ) ) );
}

/**
 * The attribute a block declares as its own stagger (attrMap `anim:stagger`), if any.
 *
 * @param \WP_Block_Type $type Registered block type.
 * @return string Attribute name, or ''.
 */
function sgs_entrance_declared_stagger_attr( \WP_Block_Type $type ): string {
	$elements = $type->supports['sgs']['elements'] ?? array();
	foreach ( (array) $elements as $element ) {
		if ( ! empty( $element['attrMap']['anim:stagger'] ) ) {
			return (string) $element['attrMap']['anim:stagger'];
		}
	}
	return '';
}

/**
 * Add the trigger, stagger and per-item entrance attributes to a block's root element.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block.
 * @return string Block HTML with the attributes added.
 */
function inject_entrance_stagger_attributes( string $block_content, array $block ): string {
	$block_name = $block['blockName'] ?? '';
	if ( '' === $block_content || ! $block_name
		|| ( ! str_starts_with( $block_name, 'sgs/' ) && ! in_array( $block_name, CORE_ANIMATION_BLOCKS, true ) ) ) {
		return $block_content;
	}

	$attrs    = $block['attrs'] ?? array();
	$trigger  = sgs_entrance_clamp_int( $attrs['sgsAnimationTrigger'] ?? '', 0, 50 );
	$stagger  = sgs_entrance_clamp_int( $attrs['sgsAnimationStagger'] ?? '', 0, 1000 );
	$children = sgs_entrance_clamp_int( $attrs['sgsAnimationStaggerChildren'] ?? '', 0, 1000 );
	$max      = sgs_entrance_clamp_int( $attrs['sgsAnimationStaggerMax'] ?? '', 1, 50 );

	$type  = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	$items = $type ? (string) ( $type->supports['sgs']['animationItems'] ?? '' ) : '';

	if ( '' === $children && $type ) {
		$declared = sgs_entrance_declared_stagger_attr( $type );
		if ( '' !== $declared ) {
			$children = sgs_entrance_clamp_int( $attrs[ $declared ] ?? ( $type->attributes[ $declared ]['default'] ?? '' ), 0, 1000 );
		}
	}

	if ( '' === $trigger && '' === $stagger && '' === $children && '' === $items ) {
		return $block_content;
	}

	// The root element follows any leading scoped <style>/<script> tags
	// (Spec 32), exactly as animation-attributes.php locates it.
	$offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $offset ), $lead ) ) {
		$close_pos = stripos( $block_content, '</' . strtolower( $lead[1] ) . '>', $offset );
		if ( false === $close_pos ) {
			break;
		}
		$offset = $close_pos + strlen( '</' . strtolower( $lead[1] ) . '>' );
	}

	$processor = new \WP_HTML_Tag_Processor( substr( $block_content, $offset ) );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	$set = static function ( string $name, string $value ) use ( $processor ): void {
		if ( '' !== $value && null === $processor->get_attribute( $name ) ) {
			$processor->set_attribute( $name, $value );
		}
	};

	// Trigger, own stagger and items apply only to a block that has an entrance.
	if ( null !== $processor->get_attribute( 'data-sgs-animation' ) ) {
		$set( 'data-sgs-animation-trigger', $trigger );
		$set( 'data-sgs-animation-stagger', $stagger );
		$set( 'data-sgs-animation-items', $items );
	}
	$set( 'data-sgs-animation-stagger-children', $children );
	if ( '' !== $stagger || '' !== $children ) {
		$set( 'data-sgs-animation-stagger-max', $max );
	}

	return substr( $block_content, 0, $offset ) . $processor->get_updated_html();
}
