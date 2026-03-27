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
$max_width          = $attributes['maxWidth'] ?? 'medium';
$close_on_overlay   = $attributes['closeOnOverlay'] ?? true;
$modal_background   = $attributes['modalBackground'] ?? 'white';
$overlay_colour     = sgs_colour_value( $attributes['overlayColour'] ?? 'text' );
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

// Build dialog styles (includes backdrop via ::backdrop pseudo-element).
$dialog_styles = array();
if ( $modal_background ) {
	$dialog_styles[] = 'background-color:' . sgs_colour_value( $modal_background );
}
$dialog_style_attr = $dialog_styles ? ' style="' . implode( ';', $dialog_styles ) . '"' : '';

// Backdrop styles will be set via CSS custom properties for the ::backdrop pseudo-element.
$backdrop_vars = array();
if ( $overlay_colour ) {
	$backdrop_vars[] = '--sgs-modal-backdrop-colour:' . $overlay_colour;
}
if ( $overlay_opacity ) {
	$backdrop_vars[] = '--sgs-modal-backdrop-opacity:' . ( (float) $overlay_opacity / 100 );
}
$wrapper_args = array(
	'class' => 'sgs-modal',
);
if ( $backdrop_vars ) {
	$wrapper_args['style'] = implode( ';', $backdrop_vars ) . ';';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

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

	<dialog
		id="<?php echo esc_attr( $modal_id ); ?>"
		class="sgs-modal__dialog sgs-modal__dialog--<?php echo esc_attr( $max_width ); ?>"
		data-close-on-overlay="<?php echo $close_on_overlay ? 'true' : 'false'; ?>"
		<?php echo $dialog_style_attr; ?>
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
	</dialog>
</div>
