/**
 * The drawer's open and close motion state (Spec 38A FR-38A-51, §6.5 `data-sgs-motion-state`).
 *
 * The drawer root is the motion state host: render.php prints `data-sgs-motion-state=""` on the `<dialog>`, and the
 * panel and its items play `open` entrances (`assets/css/motion-triggers.css`). The nav store owns opening and closing
 * (`src/shared/nav-interactivity/store.js`); it announces both through `sgs-nav-drawer-phase`
 * (`drawer-lifecycle.js`), synchronously, and this module turns them into motion states:
 *
 *   open   → `setMotionState( drawer, 'open', true )`   every open entrance plays.
 *   close  → `setMotionState( drawer, 'open', false )`  the host gains `close`, each target plays its stored close
 *            values, duration and close delay; the store waits on those animations before it closes the dialog.
 *   native `close` event → `clearMotionState( drawer )` the dialog is shut, so the host returns to empty.
 *
 * `@sgs/motion-state` is loaded with a native `import()` that webpack leaves alone (`webpackIgnore`), resolved through
 * the import map, which `Sgs_Motion_Trigger_Open_State` fills on any page that prints an `open` entrance. It is loaded
 * only when the drawer holds one, and started at init so it is ready before the first open. A failed load is caught:
 * the drawer still opens and closes, without motion. Under reduced motion the store closes at once, the stylesheet
 * shows each state's final values, and no delay applies. No inline style is written.
 *
 * @package
 */

import { DRAWER_PHASE_EVENT } from '../../shared/nav-interactivity/drawer-lifecycle';

const DRAWERS = '[data-sgs-nav-drawer][data-sgs-motion-state]';
const OPEN_TARGETS = '[data-sgs-me~="open"]';

let loading = null;
let loaded = null;
const wired = new WeakSet();

/**
 * The shared motion state helper, loaded once.
 *
 * @return {Promise<Object|null>} The module, or null when it could not load.
 */
function loadMotionState() {
	if ( null === loading ) {
		// A script module the browser resolves through the import map, not a package on disk.
		// eslint-disable-next-line import/no-unresolved
		loading = import( /* webpackIgnore: true */ '@sgs/motion-state' )
			.then( ( mod ) => {
				loaded = mod;
				return mod;
			} )
			.catch( () => null );
	}
	return loading;
}

/**
 * Whether the drawer or anything inside it plays an `open` entrance.
 *
 * @param {Element} drawer The drawer dialog.
 * @return {boolean} True when an open entrance is present.
 */
export function hasOpenMotion( drawer ) {
	return (
		!! drawer &&
		'function' === typeof drawer.querySelector &&
		( drawer.matches( OPEN_TARGETS ) ||
			null !== drawer.querySelector( OPEN_TARGETS ) )
	);
}

/**
 * Publish one lifecycle point. Runs synchronously once the module has loaded, so the store's animation sample a line
 * later already sees the close animations; before that it runs when the load settles.
 *
 * @param {Element}          drawer The drawer dialog.
 * @param {'open' | 'close'} phase  The lifecycle point.
 * @return {void}
 */
function publish( drawer, phase ) {
	const run = ( mod ) => {
		if ( ! mod ) {
			return;
		}
		mod.setMotionState( drawer, 'open', 'open' === phase );
	};
	if ( loaded ) {
		run( loaded );
		return;
	}
	loadMotionState().then( run );
}

/**
 * Wire one drawer.
 *
 * @param {Element} drawer The drawer dialog.
 * @return {void}
 */
export function wireDrawerMotionState( drawer ) {
	if ( ! hasOpenMotion( drawer ) || wired.has( drawer ) ) {
		return;
	}
	wired.add( drawer );
	loadMotionState();
	drawer.addEventListener( DRAWER_PHASE_EVENT, ( event ) => {
		const phase = event?.detail?.phase;
		if ( 'open' === phase || 'close' === phase ) {
			publish( drawer, phase );
		}
	} );
	drawer.addEventListener( 'close', () => {
		if ( loaded ) {
			loaded.clearMotionState( drawer );
		}
	} );
}

/**
 * Wire every drawer on the page that holds an open entrance.
 *
 * @param {Document|Element} [root=document] Where to look.
 * @return {void}
 */
export default function initDrawerMotionState( root = document ) {
	if ( ! root || 'function' !== typeof root.querySelectorAll ) {
		return;
	}
	root.querySelectorAll( DRAWERS ).forEach( wireDrawerMotionState );
}
