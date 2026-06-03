<?php
/**
 * Server-side render for the SGS Container block.
 *
 * Delegates all wrapper-assembly to SGS_Container_Wrapper::render() so the
 * sgs/container output is byte-identical to before while composite blocks can
 * share the same logic without re-implementing it.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/shape-dividers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// sgs_sanitize_grid_template() and sgs_container_gap_value() live in render-helpers.php.
// SGS_Container_Wrapper::render() handles the full wrapper + responsive-CSS assembly.
// $attributes passed VERBATIM — uid is md5(wp_json_encode($attributes).anchor); any
// mutation would change the uid → different scoped <style> selector → pixel drift.

$html_tag = $attributes['htmlTag'] ?? 'section';

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML; all variables sanitised internally via esc_*/wp_kses()/get_block_wrapper_attributes().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'section',
	array( 'tag' => $html_tag )
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
