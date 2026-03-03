<?php
/**
 * SGS Tabs — server-side render.
 *
 * Builds the tab navigation (role="tablist") and tab panels (role="tabpanel")
 * from the inner sgs/tab child blocks. Handles deep linking via data attributes
 * consumed by view.js.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (not used — we render manually).
 * @var WP_Block $block      Block instance with ->inner_blocks available.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$orientation  = $attributes['orientation'] ?? 'horizontal';
$tab_style    = $attributes['tabStyle'] ?? 'underline';
$tab_align    = $attributes['tabAlignment'] ?? 'left';
$transition   = isset( $attributes['transitionDuration'] )
	? (int) $attributes['transitionDuration']
	: 200;

// Collect tabs from inner blocks.
$tabs = [];
foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'sgs/tab' !== $inner_block->name ) {
		continue;
	}
	$tabs[] = [
		'label'   => isset( $inner_block->attributes['label'] )
			? wp_strip_all_tags( $inner_block->attributes['label'] )
			: __( 'Tab', 'sgs-blocks' ),
		'content' => ( new WP_Block( $inner_block->parsed_block ) )->render(),
	];
}

if ( empty( $tabs ) ) {
	return;
}

// Generate a stable block ID for ARIA relationships.
// Uses the anchor attribute if set; falls back to a hash of the block's context.
$block_id = ! empty( $attributes['anchor'] )
	? sanitize_html_class( $attributes['anchor'] )
	: 'sgs-tabs-' . substr( md5( serialize( $attributes ) . count( $tabs ) ), 0, 8 );

// ─── Inline CSS custom properties ────────────────────────────────────────────
$css_vars = [];

$colour_props = [
	'tabTextColour'            => '--sgs-tab-text',
	'tabActiveTextColour'      => '--sgs-tab-active-text',
	'tabActiveBgColour'        => '--sgs-tab-active-bg',
	'tabActiveIndicatorColour' => '--sgs-tab-active-indicator',
	'tabHoverBgColour'         => '--sgs-tab-hover-bg',
	'panelBgColour'            => '--sgs-panel-bg',
	'panelBorderColour'        => '--sgs-panel-border',
];

foreach ( $colour_props as $attr => $prop ) {
	if ( ! empty( $attributes[ $attr ] ) ) {
		$resolved = sgs_colour_value( $attributes[ $attr ] );
		if ( $resolved ) {
			$css_vars[] = $prop . ':' . $resolved;
		}
	}
}

$css_vars[] = '--sgs-transition-duration:' . $transition . 'ms';

$inline_style = implode( ';', $css_vars );

// ─── IA API context ───────────────────────────────────────────────────────────
$tab_count = count( $tabs );

$wrapper_context = wp_json_encode( [
	'activeTabId' => $block_id . '-tab-0',
	'orientation' => $orientation,
	'totalTabs'   => $tab_count,
] );

// ─── Wrapper attributes ───────────────────────────────────────────────────────
$wrapper_attrs = get_block_wrapper_attributes(
	[
		'class'               => implode( ' ', [
			'sgs-tabs',
			'sgs-tabs--' . esc_attr( $orientation ),
			'sgs-tabs--style-' . esc_attr( $tab_style ),
			'sgs-tabs--align-' . esc_attr( $tab_align ),
		] ),
		'id'                  => esc_attr( $block_id ),
		'data-tabs-block'     => 'true',
		'style'               => $inline_style,
		'data-wp-interactive' => 'sgs/tabs',
		'data-wp-context'     => $wrapper_context,
		'data-wp-init'        => 'callbacks.init',
	]
);

// ─── Build output ─────────────────────────────────────────────────────────────
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>

	<div
		class="sgs-tabs__nav"
		role="tablist"
		aria-label="<?php esc_attr_e( 'Content tabs', 'sgs-blocks' ); ?>"
		aria-orientation="<?php echo esc_attr( $orientation ); ?>"
		data-wp-on--keydown="actions.handleKeydown"
	>
		<?php foreach ( $tabs as $i => $tab ) :
			$tab_id      = esc_attr( $block_id . '-tab-' . $i );
			$panel_id    = esc_attr( $block_id . '-panel-' . $i );
			$is_first    = ( 0 === $i );
			$btn_context = esc_attr( wp_json_encode( [ 'tabId' => $block_id . '-tab-' . $i ] ) );
		?>
		<button
			id="<?php echo $tab_id; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $tab_id is assigned via esc_attr() above. ?>"
			class="sgs-tabs__tab<?php echo $is_first ? ' sgs-tabs__tab--active' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- outputs literal class name strings only. ?>"
			role="tab"
			aria-selected="<?php echo $is_first ? 'true' : 'false'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- outputs only the string literals 'true' or 'false'. ?>"
			aria-controls="<?php echo $panel_id; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $panel_id is assigned via esc_attr() above. ?>"
			tabindex="<?php echo $is_first ? '0' : '-1'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- outputs only the string literals '0' or '-1'. ?>"
			data-tab-index="<?php echo (int) $i; ?>"
			data-wp-context="<?php echo $btn_context; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped via esc_attr() above. ?>"
			data-wp-on--click="actions.activate"
			data-wp-class--is-active="context.activeTabId === context.tabId"
			data-wp-bind--aria-selected="context.activeTabId === context.tabId ? 'true' : 'false'"
			data-wp-bind--tabindex="context.activeTabId === context.tabId ? '0' : '-1'"
		>
			<?php echo esc_html( $tab['label'] ); ?>
		</button>
		<?php endforeach; ?>
	</div>

	<div class="sgs-tabs__panels">
		<?php foreach ( $tabs as $i => $tab ) :
			$tab_id        = esc_attr( $block_id . '-tab-' . $i );
			$panel_id      = esc_attr( $block_id . '-panel-' . $i );
			$is_first      = ( 0 === $i );
			$panel_context = esc_attr( wp_json_encode( [ 'tabId' => $block_id . '-tab-' . $i ] ) );
		?>
		<div
			id="<?php echo $panel_id; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $panel_id is assigned via esc_attr() above. ?>"
			class="sgs-tabs__panel"
			role="tabpanel"
			aria-labelledby="<?php echo $tab_id; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $tab_id is assigned via esc_attr() above. ?>"
			tabindex="0"
			<?php if ( ! $is_first ) : ?>hidden<?php endif; ?>
			data-wp-context="<?php echo $panel_context; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped via esc_attr() above. ?>"
			data-wp-bind--hidden="context.activeTabId !== context.tabId"
		>
			<?php
			echo $tab['content']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			?>
		</div>
		<?php endforeach; ?>
	</div>

</div>
