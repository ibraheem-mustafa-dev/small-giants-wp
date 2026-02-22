<?php
/**
 * Server-side render for the SGS Modal block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (modal content).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$trigger_text       = $attributes['triggerText'] ?? __( 'Open Modal', 'sgs-blocks' );
$trigger_style      = $attributes['triggerStyle'] ?? 'primary';
$trigger_colour     = $attributes['triggerColour'] ?? '';
$trigger_background = $attributes['triggerBackground'] ?? '';
$modal_size         = $attributes['modalSize'] ?? 'medium';
$close_on_backdrop  = $attributes['closeOnBackdrop'] ?? true;
$modal_background   = $attributes['modalBackground'] ?? 'white';
$overlay_colour     = $attributes['overlayColour'] ?? '#000000';
$overlay_opacity    = $attributes['overlayOpacity'] ?? 50;

// Generate unique ID for this modal instance.
$modal_id = 'sgs-modal-' . wp_unique_id();

// Build trigger button styles.
$trigger_styles = array();
if ( $trigger_colour ) {
	$trigger_styles[] = 'color:' . sgs_colour_value( $trigger_colour );
}
if ( $trigger_background ) {
	$trigger_styles[] = 'background-color:' . sgs_colour_value( $trigger_background );
}
$trigger_style_attr = $trigger_styles ? ' style="' . implode( ';', $trigger_styles ) . '"' : '';

// Build modal content styles.
$modal_content_style = '';
if ( $modal_background ) {
	$modal_content_style = ' style="background-color:' . sgs_colour_value( $modal_background ) . '"';
}

// Build overlay styles.
$overlay_styles = array();
if ( $overlay_colour ) {
	$overlay_styles[] = 'background-color:' . esc_attr( $overlay_colour );
}
if ( $overlay_opacity ) {
	$overlay_styles[] = 'opacity:' . ( (float) $overlay_opacity / 100 );
}
$overlay_style_attr = $overlay_styles ? ' style="' . implode( ';', $overlay_styles ) . '"' : '';

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'sgs-modal',
) );

// Render.
?>
<div <?php echo $wrapper_attributes; ?>>
	<button
		type="button"
		class="sgs-modal__trigger sgs-modal__trigger--<?php echo esc_attr( $trigger_style ); ?>"
		data-modal-id="<?php echo esc_attr( $modal_id ); ?>"
		aria-haspopup="dialog"
		<?php echo $trigger_style_attr; ?>
	>
		<?php echo esc_html( $trigger_text ); ?>
	</button>

	<div
		id="<?php echo esc_attr( $modal_id ); ?>"
		class="sgs-modal__overlay sgs-modal__overlay--<?php echo esc_attr( $modal_size ); ?>"
		role="dialog"
		aria-modal="true"
		aria-hidden="true"
		data-close-on-backdrop="<?php echo $close_on_backdrop ? 'true' : 'false'; ?>"
		<?php echo $overlay_style_attr; ?>
	>
		<div class="sgs-modal__container">
			<div
				class="sgs-modal__content sgs-modal__content--<?php echo esc_attr( $modal_size ); ?>"
				<?php echo $modal_content_style; ?>
			>
				<button
					type="button"
					class="sgs-modal__close"
					aria-label="<?php echo esc_attr__( 'Close modal', 'sgs-blocks' ); ?>"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>

				<div class="sgs-modal__inner">
					<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>
			</div>
		</div>
	</div>
</div>
