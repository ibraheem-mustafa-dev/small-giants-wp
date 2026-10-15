/**
 * Motion state (Spec 38A §5.2, §9, §12; FR-38A-51 and FR-38A-53 enablers): the one helper a block's script calls to
 * publish its state to the motion model's `open` and `state` entrance triggers.
 *
 * Registered as the script module `@sgs/motion-state` and externalised in webpack, so every block bundle shares this
 * one instance and one reduced-motion listener.
 *
 * The contract with `assets/css/motion-triggers.css` and the renderer (`includes/motion/`):
 *
 *   data-sgs-motion-state="<tokens>"   set on a state host by this module only: the block root (or the part a
 *                                      disclosure opens). A space-separated token list.
 *   open / close                       the disclosure pair. Setting `open` removes `close`; clearing `open` on a
 *                                      host that was open sets `close`, which plays each target's close values,
 *                                      close duration and close delay. A host that never opened carries neither.
 *   <name>                             a named state the block declares in `supports.sgs.motion.states`
 *                                      (`invalid`, `step-changed`, `count-changed`, ...). Its rules are emitted per
 *                                      instance by the renderer, keyed to the host carrying the token.
 *
 * A host's targets are the host itself and its descendants. A nested host that is neither open nor closing shields
 * its own subtree from an outer host's open state, so a closed submenu inside an open drawer stays still. A block
 * prints `data-sgs-motion-state=""` on a host it owns at render, so that shield holds before the first change.
 *
 * API:
 *
 *   setMotionState( el, name, on = true )  add or remove one token. `open` and `close` follow the pairing above.
 *   pulseMotionState( el, name )           set a per-event state and RESTART its animation even when the token is
 *                                          already present (a second failed submit replays the shake; `aria-invalid`
 *                                          persists, so a rule keyed on it would not replay). The token stays set.
 *   clearMotionState( el, name? )          remove one token, or every token, with no close motion. The attribute
 *                                          stays (empty) so the host keeps shielding its subtree.
 *   hasMotionState( el, name )             whether the token is set.
 *   motionSettled( el )                    a Promise that resolves when every motion-model CSS animation on the host
 *                                          and its subtree has finished or been cancelled (a block hides a closing
 *                                          panel after it); resolves at once when none runs or under reduced motion.
 *   isReducedMotion()                      the current `prefers-reduced-motion: reduce` value, kept current by one
 *                                          `matchMedia` change listener, so a mid-session change is honoured.
 *
 * A state name follows the schema's `stateName` pattern (`^[a-z][a-z0-9-]{0,63}$`); any other name is ignored.
 * Under reduced motion the stylesheet plays nothing and shows each state's final values at once, and a pulse sets
 * the token without the restart (there is nothing to replay). The module writes no inline style.
 *
 * @package
 */

export const STATE_ATTRIBUTE = 'data-sgs-motion-state';
export const OPEN = 'open';
export const CLOSE = 'close';

const NAME_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const ANIMATION_PREFIX = 'sgs-me-';

let reducedQuery = null;
let reduced = false;

/**
 * Read the reduced-motion preference once and keep it current.
 *
 * @return {void}
 */
function watchReducedMotion() {
	if ( null !== reducedQuery || 'function' !== typeof window.matchMedia ) {
		return;
	}
	reducedQuery = window.matchMedia( REDUCED_QUERY );
	reduced = !! reducedQuery.matches;
	const onChange = ( event ) => {
		reduced = !! event.matches;
	};
	if ( 'function' === typeof reducedQuery.addEventListener ) {
		reducedQuery.addEventListener( 'change', onChange );
	} else if ( 'function' === typeof reducedQuery.addListener ) {
		reducedQuery.addListener( onChange );
	}
}

/**
 * Whether the visitor currently asks for reduced motion.
 *
 * @return {boolean} True under `prefers-reduced-motion: reduce`.
 */
export function isReducedMotion() {
	watchReducedMotion();
	return reduced;
}

/**
 * The host's tokens.
 *
 * @param {Element} el State host.
 * @return {string[]} Tokens in attribute order.
 */
function tokens( el ) {
	return ( el.getAttribute( STATE_ATTRIBUTE ) || '' )
		.split( /\s+/ )
		.filter( Boolean );
}

/**
 * Write the host's tokens (an empty list keeps the attribute, empty).
 *
 * @param {Element}  el   State host.
 * @param {string[]} list Tokens.
 * @return {void}
 */
function write( el, list ) {
	const next = Array.from( new Set( list ) ).join( ' ' );
	if ( el.getAttribute( STATE_ATTRIBUTE ) !== next ) {
		el.setAttribute( STATE_ATTRIBUTE, next );
	}
}

/**
 * Whether a value is an element and a name is a valid state name.
 *
 * @param {*} el   Candidate host.
 * @param {*} name Candidate name.
 * @return {boolean} True when both are usable.
 */
function usable( el, name ) {
	return (
		!! el &&
		'function' === typeof el.setAttribute &&
		'string' === typeof name &&
		NAME_PATTERN.test( name )
	);
}

/**
 * Whether the host carries a token.
 *
 * @param {Element} el   State host.
 * @param {string}  name State name.
 * @return {boolean} True when set.
 */
export function hasMotionState( el, name ) {
	return usable( el, name ) && tokens( el ).includes( name );
}

/**
 * Add or remove one state token.
 *
 * @param {Element} el        State host.
 * @param {string}  name      State name (`open`, or a declared named state).
 * @param {boolean} [on=true] Whether the state is on.
 * @return {void}
 */
export function setMotionState( el, name, on = true ) {
	if ( ! usable( el, name ) ) {
		return;
	}
	watchReducedMotion();
	const list = tokens( el );
	if ( OPEN === name ) {
		const wasOpen = list.includes( OPEN );
		const rest = list.filter( ( t ) => OPEN !== t && CLOSE !== t );
		if ( on ) {
			write( el, rest.concat( OPEN ) );
		} else {
			write(
				el,
				wasOpen || list.includes( CLOSE ) ? rest.concat( CLOSE ) : rest
			);
		}
		return;
	}
	if ( CLOSE === name ) {
		setMotionState( el, OPEN, ! on );
		return;
	}
	const rest = list.filter( ( t ) => name !== t );
	write( el, on ? rest.concat( name ) : rest );
}

/**
 * Set a per-event state and restart its animation when it is already set.
 *
 * Removing the token and forcing one style and layout flush (`offsetWidth`) before adding it back makes the browser
 * see the animation name go away and return, which starts a new CSS animation on the host and every target under
 * it. Without the flush both changes land in one style recalculation and nothing replays.
 *
 * @param {Element} el   State host.
 * @param {string}  name State name.
 * @return {void}
 */
export function pulseMotionState( el, name ) {
	if ( ! usable( el, name ) || OPEN === name || CLOSE === name ) {
		return;
	}
	watchReducedMotion();
	const list = tokens( el );
	if ( list.includes( name ) && ! reduced ) {
		write(
			el,
			list.filter( ( t ) => name !== t )
		);
		// Read for its side effect: the flush that ends the running animation.
		// eslint-disable-next-line no-unused-expressions
		el.offsetWidth;
	}
	write( el, tokens( el ).concat( name ) );
}

/**
 * Remove one token, or every token, with no close motion.
 *
 * @param {Element} el     State host.
 * @param {string}  [name] State name; omitted clears every token.
 * @return {void}
 */
export function clearMotionState( el, name ) {
	if ( ! el || 'function' !== typeof el.setAttribute ) {
		return;
	}
	if ( undefined === name ) {
		write( el, [] );
		return;
	}
	if ( usable( el, name ) ) {
		write(
			el,
			tokens( el ).filter( ( t ) => name !== t )
		);
	}
}

/**
 * Resolve when the motion-model animations on the host and its subtree have finished.
 *
 * @param {Element} el State host.
 * @return {Promise<void>} Settles once every running `sgs-me-*` CSS animation finishes or is cancelled.
 */
export function motionSettled( el ) {
	if ( ! el || 'function' !== typeof el.getAnimations || isReducedMotion() ) {
		return Promise.resolve();
	}
	const running = el
		.getAnimations( { subtree: true } )
		.filter(
			( a ) =>
				'string' === typeof a.animationName &&
				0 === a.animationName.indexOf( ANIMATION_PREFIX )
		);
	return Promise.all(
		running.map( ( a ) => a.finished.catch( () => undefined ) )
	).then( () => undefined );
}
