<?php
/**
 * Shared "info toggle" helper — a floating '?' button that reveals a small
 * text panel, for any element whose visible label doesn't carry enough
 * context on its own (an option card, a pricing-tier feature, a form field).
 *
 * Built as a shared helper (Spec 43 Phase 2b follow-up) after
 * `sgs/choice-flow-question` proved the pattern out first — extracted so
 * any OTHER block can adopt the identical markup/behaviour/styling rather
 * than hand-rolling its own toggle-and-panel pair. This is a DIFFERENT
 * mechanism from the pre-existing `helpText` attribute on `sgs/form-field-*`
 * blocks, which renders as an always-visible `<p class="sgs-form-field__help">`
 * caption — that convention is untouched; this one is for a
 * click-to-reveal '?' affordance specifically.
 *
 * Frontend behaviour lives in `src/shared/info-toggle.js` (a plain ES
 * module, imported by each adopting block's own `view.js` — no shared
 * runtime chunk, each block's compiled output carries its own copy, same
 * as any other `src/utils`/`src/shared` import in this codebase). This PHP
 * side only emits the markup; it does not enqueue any script itself — the
 * adopting block's own `viewScriptModule` is responsible for importing the
 * JS module and it must expose `data-wp-interactive` (or otherwise run on
 * every page it appears on) same as any other block script.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_render_info_toggle' ) ) {
	/**
	 * Render an info-toggle button + its (initially hidden) panel.
	 *
	 * Returns an empty string when `$panel_text` is empty — callers should
	 * render nothing at all (not a disabled button) when there is no help
	 * text to show, matching FR-43-16's existing "empty string = no toggle
	 * button renders at all" contract.
	 *
	 * @param string $panel_text   The help copy shown inside the panel. Plain
	 *                             text — escaped internally, callers must not
	 *                             pre-escape.
	 * @param string $aria_label   Accessible label for the toggle button
	 *                             itself (NOT the panel content). Defaults to
	 *                             a generic "More information" — pass a more
	 *                             specific label when the caller has one
	 *                             (e.g. "More information about {option label}").
	 * @param string $extra_class  Optional additional class on the wrapping
	 *                             elements, for a caller that needs a scoped
	 *                             CSS hook beyond the shared `.sgs-info-toggle`
	 *                             classes (e.g. a block-specific override).
	 * @return string HTML markup, or '' if `$panel_text` is empty.
	 */
	function sgs_render_info_toggle( string $panel_text, string $aria_label = '', string $extra_class = '' ): string {
		if ( '' === trim( $panel_text ) ) {
			return '';
		}

		$aria_label   = '' !== $aria_label ? $aria_label : __( 'More information', 'sgs-blocks' );
		$panel_id     = wp_unique_id( 'sgs-info-toggle-panel-' );
		$button_class = 'sgs-info-toggle' . ( '' !== $extra_class ? ' ' . esc_attr( $extra_class ) . '__toggle' : '' );
		$panel_class  = 'sgs-info-toggle__panel' . ( '' !== $extra_class ? ' ' . esc_attr( $extra_class ) . '__panel' : '' );

		$html  = '<button type="button" class="' . $button_class . '"';
		$html .= ' aria-expanded="false"';
		$html .= ' aria-controls="' . esc_attr( $panel_id ) . '"';
		$html .= ' aria-label="' . esc_attr( $aria_label ) . '"';
		$html .= '>?</button>';

		$html .= '<div class="' . $panel_class . '" id="' . esc_attr( $panel_id ) . '" hidden>';
		$html .= esc_html( $panel_text );
		$html .= '</div>';

		return $html;
	}
}
