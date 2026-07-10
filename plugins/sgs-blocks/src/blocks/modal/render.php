<?php
/**
 * Server-side render for the SGS Modal block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (modal content).
 * @var \WP_Block $block      Block instance.
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

// Scoped-CSS class uid — this block has supports.anchor:true, so the uid MUST
// be a CLASS (never an id) to avoid colliding with the user-set anchor id.
$uid      = 'sgs-modal-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid;

// Trigger button colour/background — token-driven, sanitised then routed to
// the block's own scoped <style> instead of an inline style="…" attribute.
$trigger_rules = array();
if ( $trigger_colour ) {
	$trigger_rules[] = 'color:' . sgs_colour_value( $trigger_colour );
}
if ( $trigger_background ) {
	$trigger_rules[] = 'background-color:' . sgs_colour_value( $trigger_background );
}

// Dialog background colour — same treatment.
$dialog_rules = array();
if ( $modal_background ) {
	$dialog_rules[] = 'background-color:' . sgs_colour_value( $modal_background );
}

// Backdrop styles stay as CSS custom-PROPERTY VALUES (not real property
// declarations) — these are allowed on the wrapper per the no-inline
// styling contract (Spec 32).
$backdrop_vars = array();
if ( $overlay_colour ) {
	$backdrop_vars[] = '--sgs-modal-backdrop-colour:' . $overlay_colour;
}
if ( $overlay_opacity ) {
	$backdrop_vars[] = '--sgs-modal-backdrop-opacity:' . ( (float) $overlay_opacity / 100 );
}
$wrapper_args = array(
	'class' => 'sgs-modal ' . $uid,
);
if ( $backdrop_vars ) {
	$wrapper_args['style'] = implode( ';', $backdrop_vars ) . ';';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// Build the block's own scoped <style> — trigger + dialog colour rules that
// used to be inline style="…" attributes.
$scoped_css_rules = array();
if ( $trigger_rules ) {
	$scoped_css_rules[] = $root_sel . ' .sgs-modal__trigger{' . implode( ';', $trigger_rules ) . '}';
}
if ( $dialog_rules ) {
	$scoped_css_rules[] = $root_sel . ' .sgs-modal__dialog{' . implode( ';', $dialog_rules ) . '}';
}
$scoped_css = implode( '', $scoped_css_rules );

// Render.
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>
	<button
		type="button"
		class="sgs-modal__trigger sgs-modal__trigger--<?php echo esc_attr( $trigger_style ); ?>"
		data-modal-id="<?php echo esc_attr( $modal_id ); ?>"
		aria-haspopup="dialog"
	>
		<?php echo esc_html( $trigger_text ); ?>
	</button>

	<dialog
		id="<?php echo esc_attr( $modal_id ); ?>"
		class="sgs-modal__dialog sgs-modal__dialog--<?php echo esc_attr( $max_width ); ?>"
		data-close-on-overlay="<?php echo $close_on_overlay ? 'true' : 'false'; ?>"
		aria-labelledby="<?php echo esc_attr( $modal_id ); ?>-title"
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
<?php if ( $scoped_css ) : ?>
	<style id="<?php echo esc_attr( $uid ); ?>"><?php echo wp_strip_all_tags( $scoped_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $scoped_css built from sgs_colour_value()-sanitised values only. ?></style>
<?php endif; ?>
