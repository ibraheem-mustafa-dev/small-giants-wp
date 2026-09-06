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
// D956 — triggerColourGradient is the gradient sibling (778879732 rollout,
// Phase 3); the D942 comment below already anticipated + freed this slot.
$trigger_colour_gradient = $attributes['triggerColourGradient'] ?? '';
$trigger_background = $attributes['triggerBackground'] ?? '';
$trigger_background_gradient = sgs_css_gradient_value( $attributes['triggerBackgroundGradient'] ?? '' );
$max_width          = $attributes['maxWidth'] ?? 'medium';
$close_on_overlay   = $attributes['closeOnOverlay'] ?? true;
$modal_background   = $attributes['modalBackground'] ?? 'white';
$modal_background_gradient = sgs_css_gradient_value( $attributes['modalBackgroundGradient'] ?? '' );
$overlay_colour     = $attributes['overlayColour'] ?? 'text';
// overlayColourGradient (2026-09-06, colour-conformance closeout) — gradient
// sibling resolved below via sgs_custom_property_gradient_decls(), same shape
// as sgs/tabs tabBgColour/panelBgColour.
$overlay_colour_gradient = $attributes['overlayColourGradient'] ?? '';
$overlay_opacity    = $attributes['overlayOpacity'] ?? 50;

// overlayColourHover/overlayColourHoverGradient (2026-09-06, colour-conformance
// closeout) — the ::backdrop box is a genuine click-to-close target (view.js),
// resolved below via the same 5-arg sgs_custom_property_gradient_decls() call.
// Kept in their own blank-line-separated alignment group so this addition
// does not cascade a phpcs realignment warning across the whole block above.
$overlay_colour_hover          = (string) ( $attributes['overlayColourHover'] ?? '' );
$overlay_colour_hover_gradient = (string) ( $attributes['overlayColourHoverGradient'] ?? '' );

// Generate unique ID for this modal instance.
$modal_id = 'sgs-modal-' . wp_unique_id();

// Scoped-CSS class uid — this block has supports.anchor:true, so the uid MUST
// be a CLASS (never an id) to avoid colliding with the user-set anchor id.
$uid      = 'sgs-modal-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid;

// Trigger button colour/background — token-driven, sanitised then routed to
// the block's own scoped <style> instead of an inline style="…" attribute.
$trigger_rules = array();
// D956 — sibling gradient wins when set+valid, same resolve/decl/fallback
// shape as sgs/counter's numberColour/labelColour.
$trigger_colour_effective = sgs_resolve_text_colour_or_gradient( $trigger_colour, $trigger_colour_gradient );
if ( '' !== $trigger_colour_effective ) {
	$trigger_colour_decl = sgs_text_colour_decl( $trigger_colour_effective );
	if ( '' !== $trigger_colour_decl ) {
		$trigger_rules[] = $trigger_colour_decl;
	}
	if ( ! $trigger_background && ! $trigger_background_gradient ) {
		// D942 recipe item 2: the style-variant class default
		// (`.sgs-modal__trigger--primary`, modal/style.css) paints a
		// `background-color` on this same selector. This scoped rule
		// already out-specifies that class default today (via
		// selector-compounding), so cancel it here via pure cascade
		// rather than duplicating the class's actual colour value —
		// frees `triggerColour` for a `triggerColourGradient` sibling
		// (`background-clip:text` would otherwise be clipped by the
		// class's inherited fill). Only when the operator hasn't set
		// an explicit `triggerBackground` — that already wins this same
		// rule below and must not be cancelled.
		$trigger_rules[] = 'background-color:transparent';
	}
}
// Trigger background fill — migrated 2026-09-06 (colour-conformance closeout,
// Case C) off a hand-assembled entry in $trigger_rules onto sgs_fill_states_css(),
// which owns its OWN standalone rule for this fill alone (the recommended shape
// per CLAUDE.md's "Colour EMISSION helpers" table — the trigger button already
// shares its selector with the colour rule above, but the FILL half needed no
// composing, only a state pair). Adds triggerBackgroundHover/-HoverGradient: the
// static `.sgs-modal__trigger--{style}:hover` class default (style.css) never
// adapted to a custom triggerBackground, and the trigger is a genuinely
// interactive element — the scoped rule below out-specifies that class default
// via the same selector-compounding already proven for the normal state (D942
// comment above). Unset hover attrs resolve to '' -> sgs_fill_states_css()
// emits no hover rule, byte-for-byte the prior no-hover behaviour.
$trigger_bg_css = sgs_fill_states_css(
	$root_sel . ' .sgs-modal__trigger',
	$attributes,
	array(
		'base'           => 'triggerBackground',
		'gradient'       => 'triggerBackgroundGradient',
		'hover'          => 'triggerBackgroundHover',
		'hover_gradient' => 'triggerBackgroundHoverGradient',
	)
);

// Dialog background colour — same treatment.
$dialog_rules = array();
if ( $modal_background ) {
	$dialog_rules[] = sgs_background_paint_decl( $modal_background, $modal_background_gradient );
}

// Backdrop styles stay as CSS custom-PROPERTY VALUES (not real property
// declarations) — these are allowed on the wrapper per the no-inline
// styling contract (Spec 32).
$backdrop_vars = array();
// sgs_custom_property_gradient_decls() resolves the flat colour (via
// sgs_colour_value()) and, when set+valid, its gradient sibling — emitting
// --sgs-modal-backdrop-colour and --sgs-modal-backdrop-colour-gradient.
// Hover sibling (2026-09-06, colour-conformance closeout) — the ::backdrop box
// is a genuine click-to-close target (view.js), so this 5-arg call also emits
// --sgs-modal-backdrop-colour-hover(-gradient), consumed by a new
// .sgs-modal__dialog::backdrop:hover rule in style.css.
$backdrop_vars = array_merge(
	$backdrop_vars,
	sgs_custom_property_gradient_decls(
		'sgs-modal-backdrop-colour',
		$overlay_colour,
		$overlay_colour_gradient,
		$overlay_colour_hover,
		$overlay_colour_hover_gradient
	)
);
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
	// @supports fallback for a browser lacking background-clip:text — no-op
	// when $trigger_colour_effective is a flat colour.
	$scoped_css_rules[] = sgs_text_colour_gradient_fallback_rule( $root_sel . ' .sgs-modal__trigger', $trigger_colour_effective );
}
if ( $trigger_bg_css ) {
	$scoped_css_rules[] = $trigger_bg_css;
}
if ( $dialog_rules ) {
	$scoped_css_rules[] = $root_sel . ' .sgs-modal__dialog{' . implode( ';', $dialog_rules ) . '}';
}
// Close button — button-shaped (background + text colour), so it shares the
// button-element style emitter with every other built-in CTA (helpers-button-style.php)
// rather than a hand-rolled rule set. Superseded the hardcoded
// .sgs-modal__close:hover rule that used to live in style.css.
// bg_layer=true (D940 batch): moves closeColourBackground onto a `::after`
// layer, freeing closeColourText for a future text-gradient sibling.
// bg_layer_positioned=true because `.sgs-modal__close` is already
// `position:absolute` in style.css (top/right corner placement) — skips the
// helper's own `position:relative` so it isn't silently overridden.
$close_button_css = sgs_button_element_style_css( $attributes, 'close', $root_sel . ' .sgs-modal__close', true, true );
if ( $close_button_css ) {
	$scoped_css_rules[] = $close_button_css;
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
