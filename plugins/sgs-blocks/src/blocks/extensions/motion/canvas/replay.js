/**
 * Replay in the editor canvas (Spec 38A §11, D5; FR-38A-28 and the FR-38A-54 Replay clause): play one target's
 * entrance once, then return the element to its resting state. The Replay atom (`src/components/motion/ReplayButton.js`)
 * receives `onReplay={ () => replay( clientId, target ) }` and `disabled={ ! canReplay( clientId, target ) }` from the
 * Entrance panel.
 *
 * The canvas shows each entrance at its final state, so the entrance attributes (`data-sgs-me`,
 * `data-sgs-me-keyframes`) go on only while Replay plays: the two-state CSS animation starts when `data-sgs-in` is set,
 * and a multi-keyframe entrance plays through the shared WAAPI module (`assets/js/motion-keyframes.js`, loaded in the
 * editor by `Sgs_Motion_Assets::enqueue_editor_style`). Under reduced motion nothing moves and a one-line notice shows.
 *
 * `use-canvas-motion.js` keeps the registry current: one entry per mounted block with motion.
 *
 * @package SGS\Blocks
 */

import { dispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { ENTRANCE_ATTRS, planElements } from './canvas-dom';
import { ITEM_ATTR } from './loop-delays';

/** The one-line notice Replay shows under reduced motion (§11). */
export const REPLAY_REDUCED_NOTICE = __(
	'Reduced motion is on, so Replay shows the final state without movement.',
	'sgs-blocks'
);

// Longest a Replay waits for its animations before it restores the resting markers.
const REPLAY_CAP_MS = 10000;

/** Live blocks: clientId => { emitted, element(), mirrors() } (`mirrors` optional: the block's mirror roots). */
export const registry = new Map();

function prefersReduced( el ) {
	const win = el.ownerDocument.defaultView || window;
	return Boolean( win.matchMedia && win.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
}

// Play one element's entrance: write the plan's entrance attributes, set `data-sgs-in`, and when the play ends take off
// `data-sgs-in` and the attributes it wrote. An entrance marker already on the element (a block preview rendered by the
// server) plays from those attributes, which stay: they come off for the reflow and go back on with `data-sgs-in`,
// because a `load` marker already holds its finished animation at rest (`motion.css` names the animation for
// `[data-sgs-me~="load"]`), so only a fresh marker restarts it.
function playOn( el, attrs ) {
	const win = el.ownerDocument.defaultView || window;
	const written = ENTRANCE_ATTRS.filter(
		( name ) => attrs[ name ] !== undefined
	);
	const carried = ENTRANCE_ATTRS.filter(
		( name ) => ! written.includes( name ) && el.hasAttribute( name )
	).map( ( name ) => [ name, el.getAttribute( name ) ] );
	written.forEach( ( name ) => el.setAttribute( name, attrs[ name ] ) );
	carried.forEach( ( [ name ] ) => el.removeAttribute( name ) );
	el.removeAttribute( 'data-sgs-me-kf' );
	el.removeAttribute( 'data-sgs-in' );
	el.getBoundingClientRect();
	carried.forEach( ( [ name, value ] ) => el.setAttribute( name, value ) );
	el.setAttribute( 'data-sgs-in', '' );
	const keyframes = win.sgsMotionKeyframes;
	if ( el.hasAttribute( 'data-sgs-me-keyframes' ) && keyframes?.play ) {
		keyframes.play( el );
	}
	const running = typeof el.getAnimations === 'function' ? el.getAnimations() : [];
	const done = Promise.all( running.map( ( animation ) => animation.finished.catch( () => null ) ) );
	let timer = 0;
	const cap = new Promise( ( resolve ) => {
		timer = win.setTimeout( resolve, REPLAY_CAP_MS );
	} );
	return Promise.race( [ done, cap ] ).then( () => {
		win.clearTimeout( timer );
		[ ...written, 'data-sgs-in', 'data-sgs-me-kf' ].forEach( ( name ) =>
			el.removeAttribute( name )
		);
	} );
}

// While Replay plays, give each of a block's printed items its index (`data-sgs-loop-i`, in document order, as the
// server tags them), so the stagger's per-item delay rules (`loop-delays.js`) apply; an item that already carries one
// (a server-rendered preview) keeps it. Returns the items it indexed, so the index comes off again when Replay ends.
function indexLoopItems( rootEl, loopItems ) {
	if ( ! loopItems ) {
		return [];
	}
	return planElements( rootEl, loopItems ).filter( ( el, i ) => {
		if ( el.hasAttribute( ITEM_ATTR ) ) {
			return false;
		}
		el.setAttribute( ITEM_ATTR, String( i ) );
		return true;
	} );
}

// A plan Replay plays for a target: the target's own entrance, or the entrance its children inherited from it (the
// stagger's "Apply entrance to children", `stagger-apply.js`), which plays on the items, or a delegating block's
// shown cards (`delegated-children.js`).
function playsFrom( plan, target ) {
	return Boolean( plan.entrance ) && ( plan.target === target || plan.inheritedFrom === target );
}

/**
 * Play a target's entrance once in the canvas. Under reduced motion nothing moves and a one-line notice shows.
 *
 * @param {string} clientId Block client id.
 * @param {string} target   Target key (`root`, a part, `custom:<n>`).
 * @return {Promise<{played:boolean,reduced:boolean}>} Settles when the play ends.
 */
export function replay( clientId, target = 'root' ) {
	const entry = registry.get( clientId );
	const rootEl = entry ? entry.element() : null;
	const plans = entry ? entry.emitted.plans.filter( ( candidate ) => playsFrom( candidate, target ) ) : [];
	if ( ! rootEl || plans.length === 0 ) {
		return Promise.resolve( { played: false, reduced: false } );
	}
	if ( prefersReduced( rootEl ) ) {
		dispatch( 'core/notices' ).createNotice( 'info', REPLAY_REDUCED_NOTICE, {
			id: 'sgs-motion-replay-reduced',
			type: 'snackbar',
			isDismissible: true,
		} );
		return Promise.resolve( { played: false, reduced: true } );
	}
	// A mirrored block (the grid's template card) plays on each of its mirrors too (`mirrors.js`).
	const roots = [ rootEl, ...( typeof entry.mirrors === 'function' ? entry.mirrors() : [] ) ];
	const pairs = roots.flatMap( ( root ) =>
		plans.flatMap( ( plan ) => planElements( root, plan ).map( ( el ) => [ el, plan.attrs ] ) )
	);
	const indexed = roots.flatMap( ( root ) => indexLoopItems( root, entry.emitted.loopItems ) );
	return Promise.all( pairs.map( ( [ el, attrs ] ) => playOn( el, attrs ) ) ).then( () => {
		indexed.forEach( ( el ) => el.removeAttribute( ITEM_ATTR ) );
		return { played: pairs.length > 0, reduced: false };
	} );
}

/**
 * Whether a target holds an entrance Replay can play.
 *
 * @param {string} clientId Block client id.
 * @param {string} target   Target key.
 * @return {boolean} True when Replay has something to play.
 */
export function canReplay( clientId, target = 'root' ) {
	return Boolean( registry.get( clientId )?.emitted.plans.some( ( p ) => playsFrom( p, target ) ) );
}
