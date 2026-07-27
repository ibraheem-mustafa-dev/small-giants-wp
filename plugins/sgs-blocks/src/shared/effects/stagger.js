/**
 * SGS shared motion — staggered reveal (Mega-Menu Build Spec §6, row 1).
 *
 * Frozen export contract — a parallel agent imports this into
 * `sgs/mega-panel` without seeing this file's implementation:
 *
 *   import { initStagger } from '../../shared/effects/stagger';
 *   const cleanup = initStagger( containerEl, { childSelector, mobile } );
 *   // … later, on teardown / panel close:
 *   cleanup();
 *
 * CONSUMING-BLOCK CSS CONTRACT (Spec 32 no-inline: this module writes ONLY
 * custom-property VALUES via `style.setProperty`; the actual `opacity` /
 * `transform` / `transition` DECLARATIONS must live in the consuming
 * block's own scoped stylesheet, keyed on the SAME custom properties). A
 * consuming block (e.g. `sgs/mega-panel`) must ship rules shaped like:
 *
 *   [data-stagger] {
 *     opacity: var( --sgs-stagger-panel-opacity, 1 );
 *     transform: translateY( var( --sgs-stagger-panel-y, 0 ) )
 *       scale( var( --sgs-stagger-panel-scale, 1 ) );
 *     transition: opacity 340ms cubic-bezier(.16,.84,.32,1),
 *       transform 340ms cubic-bezier(.16,.84,.32,1);
 *   }
 *   [data-stagger] > * {
 *     opacity: var( --sgs-stagger-opacity, 1 );
 *     transform: translate( var( --sgs-stagger-x, 0 ), var( --sgs-stagger-y, 0 ) );
 *     transition: opacity var( --sgs-stagger-duration, 460ms ) cubic-bezier(.16,.84,.32,1) var( --sgs-stagger-delay, 0ms ),
 *       transform var( --sgs-stagger-duration, 460ms ) cubic-bezier(.16,.84,.32,1) var( --sgs-stagger-delay, 0ms );
 *   }
 *   \@media ( prefers-reduced-motion: reduce ) {
 *     [data-stagger], [data-stagger] > * { transition: none !important; }
 *   }
 *
 * Every custom property defaults (via the CSS `var(…, fallback)` second
 * argument) to the FULLY VISIBLE end state — a page where this module never
 * runs (JS-off, or the import throws) renders exactly as if the reveal had
 * already finished. The "hidden, about to reveal" values only ever exist
 * because THIS module wrote them, which is what rule 4 (no-JS never hides
 * content) requires.
 *
 * @package
 */

import { prefersReducedMotion } from './motion-utils';

/**
 * D-E: the mega-scoped exact entrance curve (deliberately NOT the theme
 * `ease-out` token — that's a near-but-not-equal miss per the build spec).
 */
const EASING = 'cubic-bezier(.16,.84,.32,1)';

/**
 * Snap every tracked node straight to its fully-revealed end state, with no
 * transition to wait for. Used both for the reduced-motion path and as the
 * final step of the normal reveal.
 *
 * @param {HTMLElement}        containerEl The panel/container element.
 * @param {Array<HTMLElement>} children    The staggered children.
 */
function applyRevealedState( containerEl, children ) {
	containerEl.style.setProperty( '--sgs-stagger-panel-opacity', '1' );
	containerEl.style.setProperty( '--sgs-stagger-panel-y', '0' );
	containerEl.style.setProperty( '--sgs-stagger-panel-scale', '1' );
	children.forEach( ( child ) => {
		child.style.setProperty( '--sgs-stagger-opacity', '1' );
		child.style.setProperty( '--sgs-stagger-x', '0' );
		child.style.setProperty( '--sgs-stagger-y', '0' );
	} );
}

/**
 * Run the staggered reveal once on a container (call this on panel-OPEN).
 *
 * @param {HTMLElement} containerEl                          The panel/container element whose
 *                                                           children reveal in sequence.
 * @param {Object}      [options]                            Options.
 * @param {string}      [options.childSelector=':scope > *'] Selector (relative
 *                                                           to containerEl) for the children
 *                                                           to stagger.
 * @param {boolean}     [options.mobile=false]               Mobile variant: children slide
 *                                                           in from the X axis with a
 *                                                           different duration/delay step.
 * @return {Function} Cleanup — cancels any pending reveal frame. Safe to call
 *                     multiple times; safe on a detached/empty element.
 */
export function initStagger( containerEl, options = {} ) {
	const { childSelector = ':scope > *', mobile = false } = options;

	if ( ! containerEl || typeof containerEl.querySelectorAll !== 'function' ) {
		return () => {};
	}

	let children = [];
	try {
		children = Array.from( containerEl.querySelectorAll( childSelector ) );
	} catch {
		children = [];
	}

	// Reduced motion: the end state renders instantly and correctly — no
	// hidden flash, no staggered delay, no transition.
	if ( prefersReducedMotion() ) {
		applyRevealedState( containerEl, children );
		return () => {};
	}

	// 1. Apply the HIDDEN starting values (JS-applied, never CSS-authored —
	//    see the module doc-block: the stylesheet default is always visible).
	containerEl.style.setProperty( '--sgs-stagger-panel-opacity', '0' );
	containerEl.style.setProperty( '--sgs-stagger-panel-y', '-8px' );
	containerEl.style.setProperty( '--sgs-stagger-panel-scale', '.99' );

	children.forEach( ( child, i ) => {
		const delayMs = mobile ? i * 55 : Math.min( i * 28, 320 );
		child.style.setProperty( '--sgs-stagger-delay', `${ delayMs }ms` );
		child.style.setProperty(
			'--sgs-stagger-duration',
			mobile ? '420ms' : '460ms'
		);
		child.style.setProperty( '--sgs-stagger-opacity', '0' );
		if ( mobile ) {
			child.style.setProperty( '--sgs-stagger-x', '24px' );
			child.style.setProperty( '--sgs-stagger-y', '0' );
		} else {
			child.style.setProperty( '--sgs-stagger-x', '0' );
			child.style.setProperty( '--sgs-stagger-y', '14px' );
		}
	} );

	// 2. Flip to the revealed values on the NEXT frame (double-rAF: the first
	//    frame commits the hidden starting values so the browser has
	//    something concrete to transition FROM; the second frame changes
	//    them, which is what actually starts the transition).
	let rafOuter = window.requestAnimationFrame( () => {
		rafOuter = null;
		rafInner = window.requestAnimationFrame( () => {
			rafInner = null;
			applyRevealedState( containerEl, children );
		} );
	} );
	let rafInner = null;

	return () => {
		if ( null !== rafOuter ) {
			window.cancelAnimationFrame( rafOuter );
			rafOuter = null;
		}
		if ( null !== rafInner ) {
			window.cancelAnimationFrame( rafInner );
			rafInner = null;
		}
	};
}

export { EASING as STAGGER_EASING };
