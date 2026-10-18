/**
 * Publishing a block's named motion states from its view script (Spec 38A FR-38A-53, plan unit M5.17).
 *
 * A block that declares states in `supports.sgs.motion.states` (`sgs/form`: `invalid`, `step-changed`, `success`;
 * `sgs/choice-flow`: `step-changed`) calls these helpers on its state host, the block root. They hand the change to
 * `@sgs/motion-state` (`src/shared/effects/motion-state.js`), the one shared instance, loaded with a native `import()`
 * that webpack leaves untouched (`webpackIgnore`), so the browser resolves it through the import map;
 * `Sgs_Motion_Trigger_Open_State` enqueues the module on every page that prints an `open` or `state` entrance, which
 * lists it there. A static import would be collapsed by webpack into a top-level import that breaks the whole view script if
 * the specifier ever failed to resolve; this way a failed load is caught and the block works without state motion.
 *
 * Nothing is loaded or published unless the host or a descendant carries a `state` entrance (`data-sgs-me~="state"`),
 * so a block with no state motion costs nothing. `data-sgs-dir` is written next to `step-changed`
 * (`assets/css/motion-triggers.css` mirrors a step's horizontal travel under `back`). No inline style is written.
 *
 * @package
 */

const STATE_TARGETS = '[data-sgs-me~="state"]';
const DIR_ATTRIBUTE = 'data-sgs-dir';
const DIRECTIONS = [ 'forward', 'back' ];

let loading = null;

/**
 * The shared state helper, loaded once.
 *
 * @return {Promise<Object|null>} The `@sgs/motion-state` module, or null when it could not load.
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
 * Whether the host or anything inside it plays a `state` entrance.
 *
 * @param {Element} host State host.
 * @return {boolean} True when a state entrance is present.
 */
export function hasStateMotion( host ) {
	if ( ! host || 'function' !== typeof host.querySelector ) {
		return false;
	}
	return (
		host.matches( STATE_TARGETS ) ||
		null !== host.querySelector( STATE_TARGETS )
	);
}

/**
 * Run a call against the state helper when the host has state motion.
 *
 * @param {Element}  host State host.
 * @param {Function} call Receives the module.
 * @return {Promise<boolean>} True when the call ran.
 */
function withMotionState( host, call ) {
	if ( ! hasStateMotion( host ) ) {
		return Promise.resolve( false );
	}
	return loadMotionState().then( ( mod ) => {
		if ( ! mod ) {
			return false;
		}
		call( mod );
		return true;
	} );
}

/**
 * Play a per-event state, replaying it when it is already set (a second failed submit shakes again).
 *
 * @param {Element} host State host.
 * @param {string}  name State name.
 * @return {Promise<boolean>} True when published.
 */
export function pulseState( host, name ) {
	return withMotionState( host, ( mod ) =>
		mod.pulseMotionState( host, name )
	);
}

/**
 * Set or clear a lasting state.
 *
 * @param {Element} host      State host.
 * @param {string}  name      State name.
 * @param {boolean} [on=true] Whether the state is on.
 * @return {Promise<boolean>} True when published.
 */
export function setState( host, name, on = true ) {
	return withMotionState( host, ( mod ) => {
		if ( on ) {
			mod.setMotionState( host, name, true );
		} else {
			mod.clearMotionState( host, name );
		}
	} );
}

/**
 * Leave a lasting state so the entrance's stored close values play (the state's `close`); a state with none behaves as
 * `setState( host, name, false )` does.
 *
 * @param {Element} host State host.
 * @param {string}  name State name.
 * @return {Promise<boolean>} True when published.
 */
export function leaveState( host, name ) {
	return withMotionState( host, ( mod ) =>
		mod.leaveMotionState( host, name )
	);
}

/**
 * Set a lasting state that is already true at first paint, with no entrance animation (the held values show at once).
 *
 * @param {Element} host State host.
 * @param {string}  name State name.
 * @return {Promise<boolean>} True when published.
 */
export function restState( host, name ) {
	return withMotionState( host, ( mod ) =>
		mod.restMotionState( host, name )
	);
}

/**
 * Publish a step change: the direction first, then the `step-changed` pulse, so the replay reads the new direction.
 *
 * @param {Element} host      State host.
 * @param {string}  direction `forward` or `back`.
 * @return {Promise<boolean>} True when published.
 */
export function publishStepChange( host, direction ) {
	const dir = DIRECTIONS.includes( direction ) ? direction : 'forward';
	return withMotionState( host, ( mod ) => {
		host.setAttribute( DIR_ATTRIBUTE, dir );
		mod.pulseMotionState( host, 'step-changed' );
	} );
}

/**
 * Start loading the state helper early when the host has state motion, so the first change plays at once.
 *
 * @param {Element} host State host.
 * @return {void}
 */
export function preloadMotionState( host ) {
	if ( hasStateMotion( host ) ) {
		loadMotionState();
	}
}
