<?php
/**
 * sgs/choice-flow — root chrome helpers (Spec 43 Phase 3/4 §5).
 *
 * Owed design items from the Eye Care hand build
 * (.claude/plans/2026-09-24-eye-care-hand-build-design.md, "chrome"):
 *   - the progress bar fill's colour (an operator control; it painted a
 *     hardcoded black-on-brand default before this)
 *   - an optional header: logo, a "Step N of M" eyebrow, a labelled Close
 *     button (only meaningful when the flow sits inside an sgs/modal)
 *   - a sticky Back / primary-action footer
 *
 * `function_exists()` guards on every symbol — this file is `require_once`
 * from render.php, which itself can be included by more than one code path
 * per request (a linked flow rendering the referenced post's own blocks).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_chrome_classes' ) ) {
	/**
	 * Extra wrapper modifier classes for the optional header/sticky footer.
	 * Merged into render.php's own `sgs-choice-flow {$uid}` class string —
	 * this never replaces it, only adds to it.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Space-separated modifier classes (may be empty).
	 */
	function sgs_choice_flow_chrome_classes( array $attributes ): string {
		$classes = array();

		if ( ! empty( $attributes['showHeader'] ) ) {
			$classes[] = 'sgs-choice-flow--has-header';
		}

		if ( ! empty( $attributes['stickyFooter'] ) ) {
			$classes[] = 'sgs-choice-flow--sticky-footer';
		}

		return implode( ' ', $classes );
	}
}

if ( ! function_exists( 'sgs_choice_flow_chrome_header_html' ) ) {
	/**
	 * The optional header row: logo, a "Step N of M" eyebrow (client-filled —
	 * see chrome.js's mirrorStepEyebrow(), which mirrors the flow's own
	 * `.sgs-choice-flow__step-count` text so the flow keeps one source of
	 * truth for step position), and a Close button. Returns '' entirely when
	 * `showHeader` is off, so callers can echo unconditionally.
	 *
	 * The Close button is always emitted when the header is on — render.php
	 * has no reliable way to know whether this instance sits inside an
	 * sgs/modal (that's a runtime DOM relationship, not a block-tree one a
	 * dynamic block's own render pass can see). chrome.js's initChrome()
	 * hides it client-side when no enclosing `dialog.sgs-modal__dialog` is
	 * found, so a header used outside a modal never shows a dead button.
	 *
	 * @param array $attributes Block attributes.
	 * @param int   $step_count Total question-step count (excludes result
	 *                          steps — the same count view.js's own
	 *                          showStepByIndex() computes), for the eyebrow's
	 *                          no-JS-yet initial text only; view.js's mirror
	 *                          overwrites it on first paint once it has run.
	 * @return string Escaped HTML, or '' when the header is off.
	 */
	function sgs_choice_flow_chrome_header_html( array $attributes, int $step_count ): string {
		if ( empty( $attributes['showHeader'] ) ) {
			return '';
		}

		$logo     = is_array( $attributes['headerLogo'] ?? null ) ? $attributes['headerLogo'] : array();
		$logo_url = isset( $logo['url'] ) ? esc_url( (string) $logo['url'] ) : '';
		$logo_alt = isset( $logo['alt'] ) ? sanitize_text_field( (string) $logo['alt'] ) : '';

		$close_label_raw = isset( $attributes['closeLabel'] ) ? trim( (string) $attributes['closeLabel'] ) : '';
		$close_label      = '' !== $close_label_raw ? sanitize_text_field( $close_label_raw ) : __( 'Close', 'sgs-blocks' );

		$initial_eyebrow = $step_count > 0
			? sprintf(
				/* translators: 1: current step number, 2: total step count. */
				__( 'Step %1$d of %2$d', 'sgs-blocks' ),
				1,
				$step_count
			)
			: '';

		$html = '<div class="sgs-choice-flow__chrome-header">';

		if ( '' !== $logo_url ) {
			$html .= '<img class="sgs-choice-flow__chrome-logo" src="' . esc_url( $logo_url ) . '" alt="' . esc_attr( $logo_alt ) . '" />';
		}

		$html .= '<span class="sgs-choice-flow__chrome-eyebrow" aria-live="polite">' . esc_html( $initial_eyebrow ) . '</span>';

		$html .= '<button type="button" class="sgs-choice-flow__chrome-close">';
		$html .= '<span aria-hidden="true">&times;</span> ' . esc_html( $close_label );
		$html .= '</button>';

		$html .= '</div>';

		return $html;
	}
}

if ( ! function_exists( 'sgs_choice_flow_chrome_progress_colour_css' ) ) {
	/**
	 * The progress bar fill's colour override — a scoped custom-property
	 * declaration, consumed by style.css's
	 * `.sgs-choice-flow__progress-fill { background-color:
	 * var(--sgs-choice-flow-progress-colour, var(--wp--preset--color--primary,
	 * ...)) }`. Follows this same block's own `back` element's mechanism
	 * (a shared colour resolver, a scoped rule in the block's own <style>,
	 * never inline style="…" — Spec 32): `sgs_colour_value()` resolves a
	 * token slug or passes a raw CSS colour through.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   This instance's own scoped root selector
	 *                           (render.php's `$root_sel`).
	 * @return string A complete scoped CSS rule, or '' when unset.
	 */
	function sgs_choice_flow_chrome_progress_colour_css( array $attributes, string $root_sel ): string {
		$raw = isset( $attributes['progressColour'] ) ? (string) $attributes['progressColour'] : '';
		if ( '' === $raw || ! function_exists( 'sgs_colour_value' ) ) {
			return '';
		}

		$resolved = sgs_colour_value( $raw );
		if ( '' === $resolved ) {
			return '';
		}

		return "{$root_sel} .sgs-choice-flow__progress-fill{--sgs-choice-flow-progress-colour:{$resolved};}";
	}
}
