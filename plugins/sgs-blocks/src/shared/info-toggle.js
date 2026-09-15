/**
 * Shared "info toggle" frontend behaviour — pairs with the PHP markup
 * emitter `sgs_render_info_toggle()` (`includes/helpers-info-toggle.php`).
 *
 * Extracted from `sgs/choice-flow-question`'s Phase 2b help-text toggle
 * (FR-43-16) so any OTHER block adopting the same '?' info-toggle pattern
 * gets identical, already-accessible behaviour rather than a hand-rolled
 * copy. Each adopting block's own `view.js` imports and calls
 * `handleInfoToggleClick()` from its own delegated click listener — this
 * module registers no listener of its own, so it composes cleanly with a
 * block's existing click-routing (see `choice-flow/view.js` for the
 * reference adoption: one selector check per branch, never a conflict).
 *
 * @package SGS\Blocks
 */

export const INFO_TOGGLE_SELECTOR = '.sgs-info-toggle';

/**
 * Toggle a `.sgs-info-toggle` button's panel open/closed, keeping
 * `aria-expanded` in sync for assistive tech.
 *
 * @param {HTMLElement} toggleEl The clicked `.sgs-info-toggle` button.
 */
export function handleInfoToggleClick( toggleEl ) {
	const panelId = toggleEl.getAttribute( 'aria-controls' );
	const panelEl = panelId ? document.getElementById( panelId ) : null;
	if ( ! panelEl ) {
		return;
	}

	const isCurrentlyHidden = panelEl.hidden;
	panelEl.hidden = ! isCurrentlyHidden;
	toggleEl.setAttribute( 'aria-expanded', isCurrentlyHidden ? 'true' : 'false' );
}
