/**
 * SGS shared motion — cursor spotlight (Mega-Menu Build Spec §6, row 3).
 *
 * ⚠ THIS IS NOW A THIN WRAPPER. The implementation moved to
 * `cursor-field.js` on 2026-08-01 (FR-38-25, the cursor-reactive field
 * system). This file exists solely to keep the FROZEN export contract below
 * working for its one consumer, `sgs/mega-panel` (`mega-panel/view.js:50`).
 *
 * Do NOT add behaviour here. A new capability belongs in `cursor-field.js`,
 * which every other consumer imports directly. The reason this wrapper is kept
 * rather than the call site being updated: the contract is documented as frozen
 * and was written to be importable "without seeing this file's implementation",
 * so honouring it costs three lines and breaking it costs a working block.
 *
 * Frozen export contract:
 *
 *   import { initSpotlight } from '../../shared/effects/spotlight';
 *   const cleanup = initSpotlight( asideEl );
 *
 * CONSUMING-BLOCK CSS CONTRACT (Spec 32 no-inline: this module writes ONLY
 * the `--mx` / `--my` custom-property VALUES; the actual `background-image`
 * declaration lives in the consuming block's own scoped stylesheet):
 *
 *   [data-spotlight] {
 *     position: relative;
 *   }
 *   [data-spotlight]::before {
 *     content: '';
 *     position: absolute;
 *     inset: 0;
 *     opacity: .9;
 *     pointer-events: none;
 *     background: radial-gradient(
 *       260px circle at var( --mx, 50% ) var( --my, 30% ),
 *       var( --sgs-spotlight-colour, var( --wp--preset--color--accent ) ),
 *       transparent 70%
 *     );
 *   }
 *
 * `var(--mx, 50%)` / `var(--my, 30%)` default to the STATIC centre-ish
 * position, so with no JS (or with reduced motion) the spotlight simply
 * never moves — it renders as one fixed soft highlight, never absent.
 *
 * Contrast note (rule `an-effect-recomputes-every-contrast-above-it`): the
 * consuming block MUST verify text-over-the-lifted-zone contrast at the
 * position the spotlight ACTUALLY occupies, not just at its resting spot —
 * that check belongs to the consuming block, not this shared module.
 *
 * ONE BEHAVIOURAL DIFFERENCE, stated rather than buried: `cursor-field.js`
 * additionally gates tracking on a fine, hover-capable pointer. `mousemove`
 * does not fire from touch input in the first place, so the rendered result is
 * unchanged — but the gate is now explicit rather than incidental.
 *
 * @package
 */

import { initCursorField } from './cursor-field';

/**
 * Attach a rAF-throttled cursor-tracking spotlight to `el`.
 *
 * Element-relative coordinate space (percentages of `el`) — the original
 * spotlight behaviour, and the correct space for a single self-contained
 * element. The multi-element field (an emitter whose opaque children paint
 * their own share) uses viewport space instead; see `cursor-field.js`.
 *
 * @param {HTMLElement} el The element the spotlight follows the cursor over.
 * @return {Function} Cleanup — removes the listeners. Safe on a
 *                     detached/empty element.
 */
export function initSpotlight( el ) {
	return initCursorField( el, { coordinateSpace: 'element' } );
}
