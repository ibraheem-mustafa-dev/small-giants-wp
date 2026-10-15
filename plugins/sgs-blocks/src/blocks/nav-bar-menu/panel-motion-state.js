/**
 * The dropdown and mega panels' open and close motion state (Spec 38A FR-38A-51, §6.5 `data-sgs-motion-state`).
 *
 * On a bar on the Entrance model every panel wrap is a motion state host: render.php prints
 * `data-sgs-motion-state=""` on it (`includes/helpers-nav-bar-motion-model.php`), and the panel and its items play
 * `open` entrances (`assets/css/motion-triggers.css`). The `sgs/mega` store owns opening and closing
 * (`src/shared/nav-interactivity/mega-disclosure.js`) and shows it on the trigger's `aria-expanded`; this module turns
 * each flip into a motion state:
 *
 *   true   → `setMotionState( panel, 'open', true )`   every open entrance in the panel plays.
 *   false  → `setMotionState( panel, 'open', false )`  the host gains `close`, which keeps the panel displayed while each
 *            target plays its stored close values, duration and close delay; once they settle
 *            (`motionSettled`) the state is cleared and the panel hides. A re-open before then wins.
 *
 * `@sgs/motion-state` is loaded with a native `import()` that webpack leaves alone (`webpackIgnore`), resolved through
 * the import map, which `Sgs_Motion_Trigger_Open_State` fills on any page that prints an `open` entrance. It is loaded
 * only when a panel holds one, at init, so it is ready before the first open. A failed load is caught: the panels
 * still open and close, without motion. Under reduced motion the stylesheet shows each state's final values at once and
 * `motionSettled` resolves at once. No inline style is written.
 *
 * @package
 */

const PANELS = '[data-sgs-mega-panel][data-sgs-motion-state]';
const OPEN_TARGETS = '[data-sgs-me~="open"]';
const TRIGGER = '[data-sgs-mega-trigger]';

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
 * Whether the panel or anything inside it plays an `open` entrance.
 *
 * @param {Element} panel The panel wrap.
 * @return {boolean} True when an open entrance is present.
 */
export function hasOpenMotion( panel ) {
	return (
		!! panel &&
		'function' === typeof panel.querySelector &&
		( panel.matches( OPEN_TARGETS ) ||
			null !== panel.querySelector( OPEN_TARGETS ) )
	);
}

/**
 * The trigger that controls a panel: the `[data-sgs-mega-trigger]` whose `aria-controls` names the panel's id, looked
 * up inside the panel's disclosure root first (the panel may later be moved to `<body>`).
 *
 * @param {Element} panel The panel wrap.
 * @return {Element|null} The trigger.
 */
export function triggerFor( panel ) {
	const id = panel.getAttribute( 'id' );
	if ( ! id ) {
		return null;
	}
	const root = panel.parentElement;
	const candidates = root ? root.querySelectorAll( TRIGGER ) : [];
	for ( const el of candidates ) {
		if ( el.getAttribute( 'aria-controls' ) === id ) {
			return el;
		}
	}
	return null;
}

/**
 * Publish one trigger state on the panel.
 *
 * @param {Object}  mod   The motion state module.
 * @param {Element} panel The panel wrap.
 * @param {boolean} open  Whether the trigger is expanded.
 * @return {void}
 */
export function publish( mod, panel, open ) {
	if ( open ) {
		mod.setMotionState( panel, 'open', true );
		return;
	}
	if ( ! mod.hasMotionState( panel, 'open' ) ) {
		return;
	}
	mod.setMotionState( panel, 'open', false );
	mod.motionSettled( panel ).then( () => {
		if ( mod.hasMotionState( panel, 'close' ) ) {
			mod.clearMotionState( panel );
		}
	} );
}

/**
 * Wire one panel.
 *
 * @param {Element} panel The panel wrap.
 * @return {void}
 */
export function wirePanelMotionState( panel ) {
	if ( ! hasOpenMotion( panel ) || wired.has( panel ) ) {
		return;
	}
	const trigger = triggerFor( panel );
	if ( ! trigger || 'function' !== typeof window.MutationObserver ) {
		return;
	}
	wired.add( panel );
	loadMotionState();
	const sync = () => {
		const open = 'true' === trigger.getAttribute( 'aria-expanded' );
		if ( loaded ) {
			publish( loaded, panel, open );
			return;
		}
		loadMotionState().then( ( mod ) => {
			if ( mod ) {
				publish(
					mod,
					panel,
					'true' === trigger.getAttribute( 'aria-expanded' )
				);
			}
		} );
	};
	new window.MutationObserver( sync ).observe( trigger, {
		attributes: true,
		attributeFilter: [ 'aria-expanded' ],
	} );
	if ( 'true' === trigger.getAttribute( 'aria-expanded' ) ) {
		sync();
	}
}

/**
 * Wire every panel on the page that holds an open entrance.
 *
 * @param {Document|Element} [root=document] Where to look.
 * @return {void}
 */
export default function initPanelMotionState( root = document ) {
	if ( ! root || 'function' !== typeof root.querySelectorAll ) {
		return;
	}
	root.querySelectorAll( PANELS ).forEach( wirePanelMotionState );
}
