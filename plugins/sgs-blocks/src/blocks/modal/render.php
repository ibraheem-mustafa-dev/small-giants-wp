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
$trigger_text   = $attributes['triggerText'] ?? __( 'Open Modal', 'sgs-blocks' );
$trigger_style  = $attributes['triggerStyle'] ?? 'primary';
$trigger_colour = $attributes['triggerColour'] ?? '';
// D956 — triggerColourGradient is the gradient sibling (778879732 rollout,
// Phase 3); the D942 comment below already anticipated + freed this slot.
$trigger_colour_gradient     = $attributes['triggerColourGradient'] ?? '';
$trigger_background          = $attributes['triggerBackground'] ?? '';
$trigger_background_gradient = sgs_css_gradient_value( $attributes['triggerBackgroundGradient'] ?? '' );
$max_width                   = $attributes['maxWidth'] ?? 'medium';
// size:'fullscreen' (step-by-step flows, e.g. a configurator) fills the
// viewport instead of using a maxWidth variant — the two are mutually
// exclusive, so the maxWidth modifier class below is swapped for the
// fullscreen one rather than emitted alongside it.
$size                      = $attributes['size'] ?? 'default';
$is_fullscreen             = 'fullscreen' === $size;
$dialog_size_class         = $is_fullscreen ? 'sgs-modal__dialog--fullscreen' : 'sgs-modal__dialog--' . $max_width;
$close_on_overlay          = $attributes['closeOnOverlay'] ?? true;
$open_on_hash_load         = ! empty( $attributes['openOnHashLoad'] );
$modal_background          = $attributes['modalBackground'] ?? 'white';
$modal_background_gradient = sgs_css_gradient_value( $attributes['modalBackgroundGradient'] ?? '' );

// Close button style — 'icon' (default) is the existing round SVG button;
// 'glyph' renders a plain "×" text character with no background disc
// (style.css's `.sgs-modal__close--glyph` modifier hides the ::after disc).
// Both keep the same aria-label and 44px touch target (style.css is
// unchanged for sizing either way).
$close_style        = in_array( $attributes['closeStyle'] ?? 'icon', array( 'icon', 'glyph' ), true ) ? $attributes['closeStyle'] : 'icon';
$close_button_class = 'glyph' === $close_style ? 'sgs-modal__close sgs-modal__close--glyph' : 'sgs-modal__close';

// Dialog custom width (Eye Care size-guide parity, 2026-09-28) — overrides
// the maxWidth variant class's `width` when set; empty keeps every existing
// modal's maxWidth-driven width unchanged. sgs_css_length_value() would
// treat a bare number as a spacing-preset lookup, which is wrong for a
// dialog width, so the number+unit pair is validated and concatenated here
// instead (mirrors sgs/heading's customWidth/customWidthUnit split-scalar
// shape).
$dialog_width_raw  = isset( $attributes['dialogWidth'] ) && is_string( $attributes['dialogWidth'] ) ? trim( $attributes['dialogWidth'] ) : '';
$dialog_width_unit = in_array( $attributes['dialogWidthUnit'] ?? 'px', array( 'px', '%', 'em', 'rem', 'vw' ), true ) ? $attributes['dialogWidthUnit'] : 'px';
$dialog_width      = ( '' !== $dialog_width_raw && preg_match( '/^\d+(?:\.\d+)?$/', $dialog_width_raw ) ) ? $dialog_width_raw . $dialog_width_unit : '';

// Dialog border — Shape B, block-private (same shape as sgs/accordion):
// borderWidth {top,right,bottom,left} box object, borderStyle enum,
// borderColour(+Gradient). 'none' style (the default) keeps the dialog's
// existing borderless look; width/style paint on the same selector as the
// background below, colour is handled separately via sgs_border_states_css()
// (Colour EMISSION helpers table — no hover needed on this element, mirrors
// modalBackground's own no-hover reasoning above).
$border_width_obj      = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top      = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right    = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom   = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left     = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width      = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );
$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

// Dialog shadow — ShadowControl's layered shape+colour text pair
// (sgs_shadow_box_decls(), includes/helpers-shadow-layers.php, loaded
// transitively via helpers-tokens.php -> render-helpers.php). Empty shape
// keeps the dialog's existing hardcoded box-shadow (style.css) unchanged.
$dialog_shadow_raw = isset( $attributes['dialogShadow'] ) && is_string( $attributes['dialogShadow'] ) ? trim( $attributes['dialogShadow'] ) : '';

// modalRef (Task 1, 2026-09-14) — when set, this instance's dialog content is
// the REFERENCED `sgs_modal` post's own content, not this instance's own
// InnerBlocks. Resolution is fail-closed by construction, same shape as
// Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item(): a missing, trashed, or
// wrong-post-type reference degrades to null and $content (this instance's
// own InnerBlocks — empty in reference mode, since edit.js hides that
// template once a reference is chosen) is used unchanged, never a fatal and
// never a broken dialog.
$modal_ref        = absint( $attributes['modalRef'] ?? 0 );
$referenced_modal = null;
if ( 0 !== $modal_ref && class_exists( '\SGS\Blocks\Sgs_Block_CPTs' ) ) {
	$referenced_modal = \SGS\Blocks\Sgs_Block_CPTs::resolve_modal( $modal_ref );
}
$dialog_inner_html = null !== $referenced_modal ? (string) do_blocks( $referenced_modal->post_content ) : $content;

// Generate unique ID for this modal instance.
$modal_id = 'sgs-modal-' . wp_unique_id();

// The dialog's accessible name: the referenced sgs_modal post's title, else
// the trigger text (a triggerless modal with no reference falls back to it too).
$dialog_label = null !== $referenced_modal ? get_the_title( $referenced_modal ) : '';
if ( '' === $dialog_label ) {
	$dialog_label = $trigger_text;
}

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
// per .claude/rules/colour-emission.md's "Colour EMISSION helpers" table — the trigger button already
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
// Dialog custom width — overrides the maxWidth variant class's `width` by
// source-order-independent specificity (this scoped rule is two classes,
// `.sgs-modal__dialog--{variant}` is one). `max-width` keeps the same
// viewport-safety clamp the variant classes already carry.
if ( '' !== $dialog_width ) {
	$dialog_rules[] = 'width:' . $dialog_width;
	$dialog_rules[] = 'max-width:calc(100vw - 2rem)';
}
// Dialog border width/style — same selector as the background above; 'none'
// (default) emits nothing, leaving style.css's `border: none` default look
// unchanged. Colour is a separate rule (below), via sgs_border_states_css().
if ( 'none' !== $border_style && $has_border_width ) {
	$bwt            = '' !== $border_width_top ? $border_width_top : '0';
	$bwr            = '' !== $border_width_right ? $border_width_right : '0';
	$bwb            = '' !== $border_width_bottom ? $border_width_bottom : '0';
	$bwl            = '' !== $border_width_left ? $border_width_left : '0';
	$dialog_rules[] = 'border-style:' . $border_style;
	$dialog_rules[] = 'border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}";
}

// Backdrop — the shared viewport scrim (U-2 Addendum A, modal migration,
// 2026-09-24). The block no longer paints its own `::backdrop`; instead it
// calls the shared helper, which returns this block's scoped scrim CSS
// (appended to $scoped_css_rules below) and queues the scrim's HTML for
// `wp_footer`. The open selector matches the uid'd dialog only while it is a
// real top-layer modal (`:modal`, not `[open]` — a plain `[open]` would also
// match a no-JS server-rendered fallback state this block doesn't have, but
// `:modal` is the correct native-dialog selector per the shared design doc).
$scrim_css = sgs_scrim_render( $attributes, $uid, array( 'open' => '.' . $uid . '.sgs-modal__dialog:modal' ) );

$wrapper_args = array(
	'class' => 'sgs-modal ' . $uid,
);

// The block's own HTML anchor (supports.anchor:true) doubles as the id a
// client links `#<anchor>` or `data-sgs-modal-open="<anchor>"` at to open
// THIS modal from anywhere on the page (view.js's delegated opener listener
// resolves that id to this wrapper, then finds the nested dialog inside it).
// Set explicitly on $wrapper_args rather than relying only on core's
// automatic anchor-support wrapper id, mirroring before-after/render.php's
// proven belt-and-braces pattern for a dynamic block's own wrapper.
$anchor = $attributes['anchor'] ?? '';
if ( $anchor ) {
	$wrapper_args['id'] = esc_attr( $anchor );
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

$trigger_colour_hover           = $attributes['triggerColourHover'] ?? '';
$trigger_colour_gradient_hover  = $attributes['triggerColourHoverGradient'] ?? '';
$trigger_colour_effective_hover = sgs_resolve_text_colour_or_gradient( $trigger_colour_hover, $trigger_colour_gradient_hover );
if ( '' !== $trigger_colour_effective_hover ) {
	$trigger_colour_effective_hover_decl = sgs_text_colour_decl( $trigger_colour_effective_hover );
	if ( '' !== $trigger_colour_effective_hover_decl ) {
		// ⚠ Pre-existing bug fixed in passing (found while wiring the border/
		// shadow rules below): this pushed onto `$scoped_css` (an undefined
		// variable, auto-vivified as its own array by `[]=`), which line
		// ~270's `$scoped_css = implode(...)` then silently OVERWROTE —
		// triggerColourHover/-GradientHover never reached the page. Target
		// the actual accumulator array instead.
		$scoped_css_rules[] = sgs_hover_state_rules( $root_sel . ' .sgs-modal__trigger', $trigger_colour_effective_hover_decl );
	}
	$scoped_css_rules[] = sgs_text_colour_gradient_fallback_rule( $root_sel . ' .sgs-modal__trigger:hover', $trigger_colour_effective_hover );
}

if ( $trigger_bg_css ) {
	$scoped_css_rules[] = $trigger_bg_css;
}
if ( $dialog_rules ) {
	$scoped_css_rules[] = $root_sel . ' .sgs-modal__dialog{' . implode( ';', $dialog_rules ) . '}';
}
// Dialog border colour — own rule (decision table: "One selector,
// background/border only, no text" -> sgs_border_states_css() directly). A
// flat colour resolves straight to `border-color`; a gradient gets the
// masked ::before ring automatically — no hover sibling (this element has no
// hover-shaped interaction, same reasoning as modalBackground above).
$border_colour_css = sgs_border_states_css(
	$root_sel . ' .sgs-modal__dialog',
	$attributes,
	array(
		'base'     => 'borderColour',
		'gradient' => 'borderColourGradient',
	)
);
if ( $border_colour_css ) {
	$scoped_css_rules[] = $border_colour_css;
}
// Dialog shadow — only when the operator has set one; empty leaves
// style.css's hardcoded box-shadow untouched (Eye Care size-guide parity:
// dialogShadow="0 30px 70px", dialogShadowColour="site 30%").
if ( '' !== $dialog_shadow_raw ) {
	$dialog_shadow_decls = sgs_shadow_box_decls( $dialog_shadow_raw, isset( $attributes['dialogShadowColour'] ) ? (string) $attributes['dialogShadowColour'] : '' );
	if ( ! empty( $dialog_shadow_decls ) ) {
		$scoped_css_rules[] = $root_sel . ' .sgs-modal__dialog{' . implode( ';', $dialog_shadow_decls ) . ';}';
	}
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
// Scrim CSS ($scrim_css, built above via sgs_scrim_render()) is scoped to the
// uid'd dialog selector already, so it is appended here alongside every other
// scoped rule rather than kept as a separate <style> tag.
if ( $scrim_css ) {
	$scoped_css_rules[] = $scrim_css;
}
$scoped_css = implode( '', $scoped_css_rules );

// Render.
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>
	<?php if ( 'none' !== $trigger_style ) : ?>
		<button
			type="button"
			class="sgs-modal__trigger sgs-modal__trigger--<?php echo esc_attr( $trigger_style ); ?>"
			data-modal-id="<?php echo esc_attr( $modal_id ); ?>"
			aria-haspopup="dialog"
		>
			<?php echo esc_html( $trigger_text ); ?>
		</button>
	<?php endif; ?>

	<?php
	/*
	 * data-open-on-hash-load, read by view.js's single delegated opener
	 * listener and its hash-on-load check: any link/button targeting this
	 * block's own HTML anchor id (`#anchor` or `data-sgs-modal-open="anchor"`)
	 * resolves to this block's WRAPPER — which carries `id="<anchor>"` via
	 * native anchor support (supports.anchor:true) — then finds this nested
	 * dialog inside it.
	 */
	?>
	<dialog
		id="<?php echo esc_attr( $modal_id ); ?>"
		class="sgs-modal__dialog <?php echo esc_attr( $dialog_size_class ); ?> <?php echo esc_attr( $uid ); ?>"
		data-close-on-overlay="<?php echo $close_on_overlay ? 'true' : 'false'; ?>"
		data-open-on-hash-load="<?php echo $open_on_hash_load ? 'true' : 'false'; ?>"
		aria-label="<?php echo esc_attr( wp_strip_all_tags( $dialog_label ) ); ?>"
	>
		<button
			type="button"
			class="<?php echo esc_attr( $close_button_class ); ?>"
			aria-label="<?php echo esc_attr__( 'Close modal', 'sgs-blocks' ); ?>"
		>
			<?php if ( 'glyph' === $close_style ) : ?>
				<span class="sgs-modal__close-glyph" aria-hidden="true">&times;</span>
			<?php else : ?>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			<?php endif; ?>
		</button>

		<div class="sgs-modal__inner">
			<?php echo $dialog_inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is core-trusted block HTML; do_blocks() output is the same provenance (see class-sgs-drawer-render.php). ?>
		</div>
	</dialog>
</div>
<?php if ( $scoped_css ) : ?>
	<style id="<?php echo esc_attr( $uid ); ?>"><?php echo wp_strip_all_tags( $scoped_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $scoped_css built from sgs_colour_value()-sanitised values only. ?></style>
<?php endif; ?>
