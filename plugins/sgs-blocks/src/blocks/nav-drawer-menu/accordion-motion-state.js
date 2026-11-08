/**
 * The drawer accordion's open motion state (Spec 38A FR-38A-51, §6.5 `data-sgs-motion-state`).
 *
 * Each accordion `<details>` is a nested motion state host: includes/nav-drawer-menu-items.php prints
 * `data-sgs-motion-state=""` on it, so its items do not play their `open` entrances when the drawer opens (the
 * stylesheet, `assets/css/motion-triggers.css`, lets a state host that is not open shield its subtree). This module
 * publishes the row's `open` property on that host: opening the row plays the `open` entrances of the items inside it,
 * each staggered from 0 within the row; closing it clears the state. A row already open at load is published at init.
 *
 * `@sgs/motion-state` is loaded with a native `import()` that webpack leaves alone, resolved through the import map
 * `Sgs_Motion_Trigger_Open_State` fills on any page that prints an `open` entrance. A failed load is caught: the rows
 * still open and close, without motion. No inline style is written.
 *
 * @package
 */

const HOSTS = 'details[data-sgs-motion-state]';

let loading = null;

/**
 * The shared motion state helper, loaded once.
 *
 * @return {Promise<Object|null>} The module, or null when it could not load.
 */
function loadMotionState() {
	if ( null === loading ) {
		// A script module the browser resolves through the import map, not a package on disk.
		// eslint-disable-next-line import/no-unresolved
		loading = import( /* webpackIgnore: true */ '@sgs/motion-state' ).catch(
			() => null
		);
	}
	return loading;
}

/**
 * Publish one row's open property as its motion state.
 *
 * @param {HTMLDetailsElement} details The accordion row.
 * @return {void}
 */
function publish( details ) {
	loadMotionState().then( ( mod ) => {
		if ( mod ) {
			mod.setMotionState( details, 'open', details.open );
		}
	} );
}

/**
 * Wire one drawer menu. `toggle` does not bubble, so it is caught in the capture phase.
 *
 * @param {HTMLElement} bar The `.sgs-nav-drawer-menu__bar`.
 * @return {Function} Cleanup.
 */
export function initAccordionMotionState( bar ) {
	const onToggle = ( event ) => {
		const details = event.target;
		if (
			details &&
			'DETAILS' === details.tagName &&
			details.hasAttribute( 'data-sgs-motion-state' ) &&
			bar.contains( details )
		) {
			publish( details );
		}
	};
	bar.addEventListener( 'toggle', onToggle, true );
	bar.querySelectorAll( HOSTS ).forEach( ( details ) => {
		if ( details.open ) {
			publish( details );
		}
	} );
	return () => bar.removeEventListener( 'toggle', onToggle, true );
}
