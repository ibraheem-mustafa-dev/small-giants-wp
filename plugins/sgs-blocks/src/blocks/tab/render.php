<?php
/**
 * SGS Tab — server-side render.
 *
 * Renders a single tab panel with proper ARIA attributes.
 * The parent sgs/tabs block handles tab activation state and navigation.
 * This block simply wraps the InnerBlocks content with semantically correct markup.
 *
 * @var array    $attributes Block attributes (label, etc.).
 * @var string   $content    Rendered inner blocks (InnerBlocks markup).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$label = isset( $attributes['label'] ) ? wp_strip_all_tags( $attributes['label'] ) : __( 'Tab', 'sgs-blocks' );

// Generate stable IDs for ARIA relationships.
// The parent tabs block provides tab IDs; we derive the panel ID from the block's anchor or context.
$block_id   = isset( $attributes['anchor'] ) ? sanitize_html_class( $attributes['anchor'] ) : '';
$panel_id   = ! empty( $block_id ) ? esc_attr( $block_id ) : '';
$tab_id_ref = ! empty( $block_id ) ? esc_attr( str_replace( '-panel-', '-tab-', $block_id ) ) : '';

// Wrapper attributes with ARIA tabpanel semantics.
$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'           => 'sgs-tab',
		'role'            => 'tabpanel',
		'id'              => $panel_id,
		'aria-labelledby' => $tab_id_ref,
		'tabindex'        => '0',
	)
);

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div class="sgs-tab__content">
		<?php
		echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
	</div>
</div>
