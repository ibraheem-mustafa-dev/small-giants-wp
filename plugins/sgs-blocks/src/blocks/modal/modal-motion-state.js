/**
 * The pop-up's open motion state (Spec 38A FR-38A-51, §6.5 `data-sgs-motion-state`).
 *
 * The dialog is the motion state host: render.php prints `data-sgs-motion-state=""` on it, and content inside plays its
 * `open` entrances (`assets/css/motion-triggers.css`) each time the dialog opens, as the nav drawer's does:
 *
 *   open   → `setMotionState( dialog, 'open', true )`  every open entrance plays.
 *   close  → `clearMotionState( dialog )`              the dialog is shut, so the host returns to empty and the next
 *            open plays again.
 *
 * `modal-core.js::openModal` announces each open through `announceModalOpen`; `wireModalMotionState` clears on the
 * native `close` event, which fires for every close path. `@sgs/motion-state` is loaded with a native `import()` that
 * webpack leaves alone (`webpackIgnore`), resolved through the import map `Sgs_Motion_Trigger_Open_State` fills on any
 * page that prints an `open` entrance, and only when the dialog holds one. A failed load is caught and warned about once
 * (a dialog rendered after `wp_head` misses the import map): the modal still opens and closes, without motion. No inline style is written.
 *
 * @package
 */

const DIALOGS = 'dialog.sgs-modal__dialog[data-sgs-motion-state]';
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
			.catch( () => {
				// eslint-disable-next-line no-console
				console.warn(
					'sgs/modal: @sgs/motion-state did not load, so open entrances will not play. The import map was probably not printed because this dialog rendered after wp_head.'
				);
				return null;
			} );
	}
	return loading;
}

/**
 * Whether the dialog or anything inside it plays an `open` entrance.
 *
 * @param {Element} dialog The modal dialog.
 * @return {boolean} True when an open entrance is present.
 */
export function hasOpenMotion( dialog ) {
	return (
		!! dialog &&
		'function' === typeof dialog.querySelector &&
		( dialog.matches( OPEN_TARGETS ) ||
			null !== dialog.querySelector( OPEN_TARGETS ) )
	);
}

/**
 * Publish the open state for a dialog that has just opened.
 *
 * @param {Element} dialog The modal dialog.
 * @return {void}
 */
export function announceModalOpen( dialog ) {
	if ( ! hasOpenMotion( dialog ) ) {
		return;
	}
	const run = ( mod ) => {
		// A close that landed before the module loaded must not be undone by a late open.
		if ( mod && dialog.open ) {
			mod.setMotionState( dialog, 'open', true );
		}
	};
	if ( loaded ) {
		run( loaded );
		return;
	}
	loadMotionState().then( run );
}

/**
 * Wire one dialog: clear the open state when it closes.
 *
 * @param {Element} dialog The modal dialog.
 * @return {void}
 */
export function wireModalMotionState( dialog ) {
	if ( ! hasOpenMotion( dialog ) || wired.has( dialog ) ) {
		return;
	}
	wired.add( dialog );
	loadMotionState();
	dialog.addEventListener( 'close', () => {
		if ( loaded ) {
			loaded.clearMotionState( dialog );
		}
	} );
}

/**
 * Wire every modal dialog on the page that holds an open entrance.
 *
 * @param {Document|Element} [root=document] Where to look.
 * @return {void}
 */
export default function initModalMotionState( root = document ) {
	if ( ! root || 'function' !== typeof root.querySelectorAll ) {
		return;
	}
	root.querySelectorAll( DIALOGS ).forEach( wireModalMotionState );
}
