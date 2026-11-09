/**
 * Fit guard for a showcase flow's Fit to screen setting (Spec 43 FR-43-24a).
 *
 * The height-fit rules in `style.css` and `choice-flow-question/style.css` shrink a pictured step's rows to the room
 * the window leaves. Below a certain window height that shrinking eats into the cards: the description spills out of
 * its card, or the padding and the gaps between a card's parts collapse. The guard watches the step's real layout
 * while the fit is active. When a visible option's content runs into its bottom padding, or two of its parts sit
 * closer than the computed row gap, it adds `sgs-choice-flow--fit-guarded`, which the fit rules are gated on
 * (`:not( .sgs-choice-flow--fit-guarded )`), and the step scrolls as the draft does. It remembers the window height it
 * switched at and lets the fit back in only when the window is taller than that. The two-column layout is the only
 * one that fits, so a stacked flow (narrower than the showcase container breakpoint) is never guarded.
 *
 * @package
 */

export const FIT_CLASS = 'sgs-choice-flow--fit-screen';
export const GUARD_CLASS = 'sgs-choice-flow--fit-guarded';

const OPTION_BUTTON = '.sgs-choice-flow-question__option-button';
const OPTION_MEDIA = '.sgs-choice-flow-question__option-media';
const PANE = '.sgs-choice-flow__inner';
const STEP = '.sgs-form-step:not([hidden])';

/** The showcase container query's breakpoint: the fit applies from here up. */
export const TWO_COLUMN_MIN_WIDTH = 768;

/** Sub-pixel tolerance for rounded layout values. */
const TOLERANCE = 0.5;

/**
 * Whether one option's content is squeezed: its last part ends inside the bottom padding, or two rows of parts sit
 * closer than the button's row gap.
 *
 * @param {Element} button An option button.
 * @return {boolean} True when the card's padding or gaps are being eaten.
 */
export function isOptionSqueezed( button ) {
	const parts = Array.from( button.children )
		.filter( ( part ) => {
			if (
				part.hidden ||
				window.getComputedStyle( part ).position === 'absolute'
			) {
				return false;
			}
			const rect = part.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		} )
		.map( ( part ) => part.getBoundingClientRect() )
		.sort( ( a, b ) => a.top - b.top );
	if ( ! parts.length ) {
		return false;
	}
	const style = window.getComputedStyle( button );
	const rowGap = parseFloat( style.rowGap ) || 0;
	const paddingBottom = parseFloat( style.paddingBottom ) || 0;
	const box = button.getBoundingClientRect();
	const contentBottom = Math.max( ...parts.map( ( rect ) => rect.bottom ) );
	if ( contentBottom + paddingBottom > box.bottom + TOLERANCE ) {
		return true;
	}
	// Parts that share a grid row overlap vertically (a label beside its price); the gap that must hold is between rows.
	const rows = [];
	parts.forEach( ( rect ) => {
		const row = rows[ rows.length - 1 ];
		if ( row && rect.top < row.bottom - TOLERANCE ) {
			row.bottom = Math.max( row.bottom, rect.bottom );
		} else {
			rows.push( { top: rect.top, bottom: rect.bottom } );
		}
	} );
	for ( let i = 1; i < rows.length; i++ ) {
		if ( rows[ i ].top - rows[ i - 1 ].bottom < rowGap - TOLERANCE ) {
			return true;
		}
	}
	return false;
}

/**
 * Whether any pictured option in the flow's visible step is squeezed.
 *
 * @param {Element} flowRoot The flow root.
 * @return {boolean} True when the visible step has a squeezed option.
 */
export function isStepSqueezed( flowRoot ) {
	const step = flowRoot.querySelector( STEP );
	if ( ! step ) {
		return false;
	}
	return Array.from( step.querySelectorAll( OPTION_BUTTON ) )
		.filter( ( button ) => button.querySelector( OPTION_MEDIA ) )
		.some( isOptionSqueezed );
}

/**
 * Start the guard on one flow. A flow without Fit to screen is left alone.
 *
 * @param {Element} flowRoot The flow root.
 * @return {() => void} Stops watching and clears the guard class.
 */
export function initFitGuard( flowRoot ) {
	if ( ! flowRoot.classList.contains( FIT_CLASS ) ) {
		return () => {};
	}
	let switchedAt = 0;
	let frame = 0;

	const evaluate = () => {
		frame = 0;
		if ( flowRoot.clientWidth < TWO_COLUMN_MIN_WIDTH ) {
			flowRoot.classList.remove( GUARD_CLASS );
			switchedAt = 0;
			return;
		}
		if ( flowRoot.classList.contains( GUARD_CLASS ) ) {
			if ( window.innerHeight <= switchedAt ) {
				return;
			}
			flowRoot.classList.remove( GUARD_CLASS );
		}
		if ( isStepSqueezed( flowRoot ) ) {
			flowRoot.classList.add( GUARD_CLASS );
			switchedAt = window.innerHeight;
		}
	};

	const schedule = () => {
		if ( ! frame ) {
			frame = window.requestAnimationFrame( evaluate );
		}
	};

	const resizeObserver = new window.ResizeObserver( schedule );
	const watched = flowRoot.querySelector( PANE ) || flowRoot;
	resizeObserver.observe( watched );
	resizeObserver.observe( flowRoot );
	const mutationObserver = new window.MutationObserver( schedule );
	mutationObserver.observe( watched, {
		subtree: true,
		attributes: true,
		attributeFilter: [ 'hidden' ],
	} );
	window.addEventListener( 'resize', schedule );
	schedule();

	return () => {
		resizeObserver.disconnect();
		mutationObserver.disconnect();
		window.removeEventListener( 'resize', schedule );
		if ( frame ) {
			window.cancelAnimationFrame( frame );
		}
		flowRoot.classList.remove( GUARD_CLASS );
	};
}
