<?php
/**
 * Server-side render for the Nav Drawer block.
 *
 * Phase-1 scaffold — minimal render that outputs the drawer container
 * and persists InnerBlocks child content. Full drawer functionality
 * (toggle trigger, animation, accessibility) deferred to Phase 2.
 *
 * @var array      $attributes Block attributes.
 * @var string     $content    InnerBlocks HTML (drawer menu items).
 * @var \WP_Block  $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Build block wrapper attributes with SGS classname.
 */
$sgs_wrapper_atts = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-nav-drawer',
	)
);

/**
 * Output the drawer wrapper with persisted InnerBlocks content ($content).
 * Phase-2 build will add:
 * - Trigger button integration
 * - Drawer animation (slide/fade)
 * - Focus trap and keyboard navigation
 * - Mobile breakpoint detection
 * - Accessibility attributes (aria-modal, aria-hidden, role)
 */
?>
<div <?php echo wp_kses_post( $sgs_wrapper_atts ); ?>>
	<nav class="sgs-nav-drawer__content">
		<?php
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
		echo $content;
		// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
	</nav>
</div>
