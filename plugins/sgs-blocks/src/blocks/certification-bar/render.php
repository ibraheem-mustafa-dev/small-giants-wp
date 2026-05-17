<?php
/**
 * Server-side render for sgs/certification-bar.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/certification-bar {attrs} /-->`)
 * produce the expected DOM. Without this file the static save.js HTML never
 * gets rendered for cv2-emitted instances, so the `sgs-certification-bar`
 * root class never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$block_title           = $attributes['title'] ?? '';
$block_items           = isset( $attributes['items'] ) && is_array( $attributes['items'] ) ? $attributes['items'] : array();
$block_badge_style     = $attributes['badgeStyle'] ?? 'text-only';
$block_badge_size      = $attributes['badgeSize'] ?? 'medium';
$block_title_colour    = $attributes['titleColour'] ?? '';
$block_title_font_size = $attributes['titleFontSize'] ?? '';
$block_label_colour    = $attributes['labelColour'] ?? '';
$block_label_font_size = $attributes['labelFontSize'] ?? '';

// Wrapper CSS — root class + optional style modifiers.
$wrapper_classes = array(
	'sgs-certification-bar',
	'sgs-certification-bar--' . sanitize_html_class( $block_badge_style ),
	'sgs-certification-bar--' . sanitize_html_class( $block_badge_size ),
);

$wrapper_args  = array(
	'class' => implode( ' ', $wrapper_classes ),
);
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Title inline style (colour + font-size).
$title_style_parts = array();
if ( $block_title_colour ) {
	$title_style_parts[] = 'color:' . sgs_colour_value( $block_title_colour );
}
if ( $block_title_font_size ) {
	$title_style_parts[] = 'font-size:' . sgs_font_size_value( $block_title_font_size );
}
$title_style_attr = $title_style_parts ? ' style="' . esc_attr( implode( ';', $title_style_parts ) ) . '"' : '';

// Label inline style (colour + font-size).
$label_style_parts = array();
if ( $block_label_colour ) {
	$label_style_parts[] = 'color:' . sgs_colour_value( $block_label_colour );
}
if ( $block_label_font_size ) {
	$label_style_parts[] = 'font-size:' . sgs_font_size_value( $block_label_font_size );
}
$label_style_attr = $label_style_parts ? ' style="' . esc_attr( implode( ';', $label_style_parts ) ) . '"' : '';

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( $block_title ) : ?>
		<p class="sgs-certification-bar__title"<?php echo $title_style_attr; // phpcs:ignore ?>>
			<?php echo wp_kses_post( $block_title ); ?>
		</p>
	<?php endif; ?>

	<?php if ( ! empty( $block_items ) ) : ?>
		<div class="sgs-certification-bar__badges">
			<?php
			foreach ( $block_items as $i => $item ) :
				$item      = is_array( $item ) ? $item : array();
				$media_url = isset( $item['media']['url'] ) ? (string) $item['media']['url'] : '';
				if ( empty( $media_url ) && isset( $item['image']['url'] ) ) {
					$media_url = (string) $item['image']['url'];
				}
				$media_alt = isset( $item['media']['alt'] ) ? (string) $item['media']['alt'] : '';
				if ( empty( $media_alt ) ) {
					$media_alt = isset( $item['label'] ) ? (string) $item['label'] : '';
				}
				$item_label = isset( $item['label'] ) ? (string) $item['label'] : '';
				$item_url   = isset( $item['url'] ) ? (string) $item['url'] : '';

				// Conditionally render badge image or label based on badgeStyle.
				$show_image = 'text-only' !== $block_badge_style && ! empty( $media_url );
				$show_label = 'image-only' !== $block_badge_style && ! empty( $item_label );

				if ( $item_url ) :
					?>
					<a href="<?php echo esc_url( $item_url ); ?>" class="sgs-certification-bar__badge" target="_blank" rel="noopener noreferrer">
						<?php if ( $show_image ) : ?>
							<img src="<?php echo esc_url( $media_url ); ?>" alt="<?php echo esc_attr( $media_alt ); ?>" class="sgs-certification-bar__badge-img" loading="lazy" />
						<?php endif; ?>
						<?php if ( $show_label ) : ?>
							<span class="sgs-certification-bar__badge-label"<?php echo $label_style_attr; // phpcs:ignore ?>>
								<?php echo esc_html( $item_label ); ?>
							</span>
						<?php endif; ?>
					</a>
					<?php
				else :
					?>
					<div class="sgs-certification-bar__badge">
						<?php if ( $show_image ) : ?>
							<img src="<?php echo esc_url( $media_url ); ?>" alt="<?php echo esc_attr( $media_alt ); ?>" class="sgs-certification-bar__badge-img" loading="lazy" />
						<?php endif; ?>
						<?php if ( $show_label ) : ?>
							<span class="sgs-certification-bar__badge-label"<?php echo $label_style_attr; // phpcs:ignore ?>>
								<?php echo esc_html( $item_label ); ?>
							</span>
						<?php endif; ?>
					</div>
					<?php
				endif;
			endforeach;
			?>
		</div>
	<?php endif; ?>
</div>
<?php
