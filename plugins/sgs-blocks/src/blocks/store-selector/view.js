/**
 * SGS Store Selector — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * Server output (no-JS state):
 *   - the store list has NO `hidden` attribute → every store link is visible
 *     and reachable without JS.
 *   - the trigger button carries `aria-expanded="false"`.
 *
 * On init, this module hides the list (adds `hidden`) and wires:
 *   - click on the trigger toggles the list open/closed, flips
 *     `aria-expanded`;
 *   - Escape while open closes the list and returns focus to the trigger;
 *   - a click outside the block while open closes the list (no focus move —
 *     the visitor's focus is already wherever their click landed).
 *
 * No jQuery. No dependencies.
 */

function initInstance( root ) {
	const trigger = root.querySelector( '.sgs-store-selector__trigger' );
	const list = root.querySelector( '.sgs-store-selector__list' );

	if ( ! trigger || ! list ) {
		return;
	}

	if ( root.dataset.sgsStoreSelectorReady === '1' ) {
		return;
	}
	root.dataset.sgsStoreSelectorReady = '1';

	// Enhance: hide the list now that a trigger exists to reveal it again.
	list.hidden = true;

	const isOpen = () => 'true' === trigger.getAttribute( 'aria-expanded' );

	const open = () => {
		list.hidden = false;
		trigger.setAttribute( 'aria-expanded', 'true' );
	};

	const close = ( { returnFocus = false } = {} ) => {
		list.hidden = true;
		trigger.setAttribute( 'aria-expanded', 'false' );
		if ( returnFocus ) {
			trigger.focus();
		}
	};

	trigger.addEventListener( 'click', () => {
		if ( isOpen() ) {
			close();
		} else {
			open();
		}
	} );

	root.addEventListener( 'keydown', ( event ) => {
		if ( 'Escape' === event.key && isOpen() ) {
			close( { returnFocus: true } );
		}
	} );

	document.addEventListener( 'click', ( event ) => {
		if ( isOpen() && ! root.contains( event.target ) ) {
			close();
		}
	} );
}

function init() {
	const roots = document.querySelectorAll( '.sgs-store-selector' );
	roots.forEach( initInstance );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
