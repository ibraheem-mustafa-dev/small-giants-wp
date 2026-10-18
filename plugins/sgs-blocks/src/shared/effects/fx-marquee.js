/**
 * SGS motion: marquee boot module (Spec 38A FR-38A-44). Tier V.
 *
 * The one marquee runtime, serving `sgs/brand-strip` and `sgs/trust-bar`. The `@sgs/fx-marquee` script module the PHP
 * motion registry enqueues when a page renders a block carrying `data-sgs-fx` with `marquee` in its token list.
 *
 * Markup contract (printed by the block's render.php): inside the block root, one element marked
 * `data-sgs-marquee-set` holds the items. This module clones that set, appends the copies after it (aria-hidden and
 * inert, so a linked logo never takes focus), and runs the same Web Animations loop on every copy through the shared
 * loop control (`@sgs/loop-control`): the registered channel owner `--sgs-marquee-x` (or `-y` for a vertical
 * marquee) runs from 0 to minus one set pitch, and `assets/css/fx-marquee.css` composes it into `translate`.
 * One pitch is the distance between a set and its copy, so the loop is seamless at any item count or width.
 *
 * Controls, each read from a custom property of the same name when the emitter writes one (the per-device fields)
 * and otherwise from the data attribute:
 *   speed          px/s, the one pace control; the loop time is the measured pitch divided by it, re-measured when the
 *                  set or root resizes.
 *   direction      left, right, up or down.
 *   hoverRate      playback rate while a mouse or pen is over the block: 1 no change, 0 pauses.
 *   touchPause     off, tap (a tap pauses, the next tap resumes; the default) or hold (paused while a finger rests on it).
 *   edgeFade       fade the two ends; edgeFadeWidth is the fade's size as a percentage of the root.
 *   belowBreakpoint always, tablet (1023px and below) or mobile (767px and below); static outside the range.
 *   pauseControl   the pause button; off by default. Hover and keyboard-focus pause do not depend on it.
 *
 * When the marquee cannot run (reduced motion, off at this device tier, outside the range, no Web Animations) nothing is cloned or animated and
 * the block keeps its static layout, so every item stays visible.
 *
 * @package
 */

/* eslint-disable import/no-unresolved -- a webpack external (script module `@sgs/loop-control`). */
import {
	animateLoop,
	onReducedMotionChange,
	prefersReducedMotion,
} from '@sgs/loop-control';
/* eslint-enable import/no-unresolved */
import { isEffectOffAtThisTier } from './off-switch';

const SELECTOR = '[data-sgs-fx~="marquee"]';
const SET = '[data-sgs-marquee-set]';
const CLONE_ATTR = 'data-sgs-marquee-clone';
const PREFIX = 'data-sgs-fx-marquee-';
const IMAGE_WAIT_MS = 1500;
const DEFAULT_SPEED = 40;
const DEFAULT_FADE = 5;
const TOUCH_MODES = [ 'off', 'tap', 'hold' ];
const DEFAULT_TOUCH_PAUSE = 'tap';
const BELOW = { tablet: '(max-width: 1023px)', mobile: '(max-width: 767px)' };
const VERTICAL = [ 'up', 'down' ];
const REVERSED = [ 'right', 'down' ];

let registered = [];

function number( text ) {
	const value = parseFloat( text );
	return Number.isFinite( value ) ? value : null;
}

/**
 * The marquee's settings for one block root.
 *
 * @param {HTMLElement} root The element carrying the `marquee` token.
 * @return {Object} `speed`, `direction`, `hoverRate`, `touchPause`, `edgeFade`, `edgeFadeWidth`,
 *                  `below` and `pauseControl`, with the defaults filled in.
 */
export function readMarquee( root ) {
	const style = window.getComputedStyle( root );
	const attr = ( key ) => root.getAttribute( PREFIX + key );
	const read = ( key ) => {
		const prop = style.getPropertyValue( `--sgs-marquee-${ key }` ).trim();
		return number( prop !== '' ? prop : attr( key ) );
	};
	const direction = attr( 'direction' );
	const below = attr( 'below-breakpoint' );
	const speed = read( 'speed' );
	const touchPause = attr( 'touch-pause' );
	const hoverRate = read( 'hover-rate' );
	const fade = read( 'edge-fade-width' );
	return {
		speed: speed !== null && speed > 0 ? speed : DEFAULT_SPEED,
		direction: [ 'left', 'right', 'up', 'down' ].includes( direction )
			? direction
			: 'left',
		hoverRate:
			hoverRate !== null && hoverRate >= 0 && hoverRate < 1
				? hoverRate
				: 1,
		touchPause: TOUCH_MODES.includes( touchPause )
			? touchPause
			: DEFAULT_TOUCH_PAUSE,
		edgeFade: attr( 'edge-fade' ) === 'true',
		edgeFadeWidth:
			fade !== null && fade >= 0 && fade <= 50 ? fade : DEFAULT_FADE,
		below: below === 'tablet' || below === 'mobile' ? below : 'always',
		pauseControl: attr( 'pause-control' ) === 'true',
	};
}

/**
 * A running marquee carries its items past continuously, so a per-item scroll entrance has no meaning there: an item
 * still waiting for the reveal module is shown now. The copies are cloned from this state; the reveal module never
 * sees them, so a copy that kept the hidden start state would stay invisible. `fx-marquee.css` stops the stylesheet
 * entrance animation inside the running lane; a multi-keyframe entrance is played by `assets/js/motion-keyframes.js`
 * once `data-sgs-in` appears, so its target is also marked played (`data-sgs-me-kf`), which that module skips.
 *
 * @param {Element} set The marquee set.
 */
function settleEntrances( set ) {
	const pending = '[data-sgs-me~="scroll"]:not([data-sgs-in])';
	const items = Array.from( set.querySelectorAll( pending ) );
	if ( set.matches( pending ) ) {
		items.push( set );
	}
	items.forEach( ( el ) => {
		el.setAttribute( 'data-sgs-in', '' );
		if ( el.hasAttribute( 'data-sgs-me-keyframes' ) ) {
			el.setAttribute( 'data-sgs-me-kf', 'played' );
		}
	} );
}

function makeClone( set ) {
	const clone = set.cloneNode( true );
	clone.removeAttribute( 'data-sgs-marquee-set' );
	clone.setAttribute( CLONE_ATTR, '' );
	clone.setAttribute( 'aria-hidden', 'true' );
	// aria-hidden alone leaves a focusable item in the tab order of hidden content; `inert` removes the copy from the
	// tab order and the accessibility tree, tabindex=-1 covers engines without it.
	clone.setAttribute( 'inert', '' );
	clone
		.querySelectorAll( '[id]' )
		.forEach( ( el ) => el.removeAttribute( 'id' ) );
	clone
		.querySelectorAll( 'a, button, input, select, textarea, [tabindex]' )
		.forEach( ( el ) => el.setAttribute( 'tabindex', '-1' ) );
	return clone;
}

function waitForImages( set ) {
	const pending = [];
	set.querySelectorAll( 'img' ).forEach( ( img ) => {
		if ( ! img.complete ) {
			pending.push(
				new Promise( ( resolve ) => {
					img.addEventListener( 'load', resolve, { once: true } );
					img.addEventListener( 'error', resolve, { once: true } );
				} )
			);
		}
	} );
	if ( pending.length === 0 ) {
		return Promise.resolve();
	}
	// Capped: a lazy logo outside the viewport may never fetch, and an uncapped wait would leave the strip unmeasured.
	return Promise.race( [
		Promise.all( pending ),
		new Promise( ( resolve ) => setTimeout( resolve, IMAGE_WAIT_MS ) ),
	] );
}

/**
 * Run the marquee on one block root.
 *
 * @param {HTMLElement} root The element carrying the `marquee` token.
 * @return {{destroy: Function}|null} Controller, or null when the root holds no set.
 */
export function createMarquee( root ) {
	const original = root.querySelector( SET );
	if ( ! original ) {
		return null;
	}
	const lane = original.parentElement;
	let settings = readMarquee( root );
	let copies = [];
	let loops = [];
	let pitch = 0;
	let destroyed = false;
	let measured = { size: 0, view: 0 };
	let observer = null;
	const state = { period: 1000, distance: 0, axis: 'x' };
	const queries = [];

	const clones = () =>
		Array.from( lane.querySelectorAll( `:scope > [${ CLONE_ATTR }]` ) );
	const rangeMatches = () => {
		const query = BELOW[ settings.below ];
		return ! query || window.matchMedia( query ).matches;
	};
	// A motion layer's per-device off switch (Spec 38A FR-38A-23) is read live. The `below` range listeners above sit at
	// 767/768 and 1023/1024, the same edges as the device tiers, so a tier change always re-runs `layout`.
	const canRun = () =>
		! prefersReducedMotion() &&
		! isEffectOffAtThisTier( root, 'marquee' ) &&
		typeof original.animate === 'function' &&
		rangeMatches();

	function unmark() {
		root.removeAttribute( 'data-sgs-marquee' );
		lane.removeAttribute( 'data-sgs-marquee-lane' );
		root.style.removeProperty( '--sgs-marquee-fade-size' );
	}

	function teardown() {
		loops.forEach( ( loop ) => loop.destroy() );
		loops = [];
		clones().forEach( ( clone ) => clone.remove() );
		copies = [];
		unmark();
	}

	function fadeSize() {
		if ( settings.edgeFade ) {
			root.style.setProperty(
				'--sgs-marquee-fade-size',
				`${ settings.edgeFadeWidth }%`
			);
		} else {
			root.style.removeProperty( '--sgs-marquee-fade-size' );
		}
	}

	function measure( vertical ) {
		const first = original.getBoundingClientRect();
		const size = vertical ? first.height : first.width;
		const viewport = root.getBoundingClientRect();
		const view = vertical ? viewport.height : viewport.width;
		return { size, view };
	}

	function pitchOf( vertical, size ) {
		const second = copies[ 1 ];
		if ( second ) {
			const a = original.getBoundingClientRect();
			const b = second.getBoundingClientRect();
			const delta = vertical ? b.top - a.top : b.left - a.left;
			if ( Number.isFinite( delta ) && delta > 0 ) {
				return delta;
			}
		}
		const style = window.getComputedStyle( lane );
		const gap = parseFloat( vertical ? style.rowGap : style.columnGap );
		return size + ( Number.isFinite( gap ) ? gap : 0 );
	}

	function start( loopOptions ) {
		return copies.map( ( copy ) =>
			animateLoop( copy, {
				read: () => ( {
					period: state.period,
					phase: 0,
					easing: 'linear',
					direction: REVERSED.includes( settings.direction )
						? 'reverse'
						: 'normal',
				} ),
				keyframes: () => {
					const prop = `--sgs-marquee-${ state.axis }`;
					return [
						{ [ prop ]: '0px' },
						{ [ prop ]: `-${ state.distance }px` },
					];
				},
				// Every copy takes its visibility from the block root, so the copies pause and run together.
				observe: root,
				...loopOptions,
			} )
		);
	}

	function layout( force = true ) {
		if ( destroyed ) {
			return;
		}
		settings = readMarquee( root );
		if ( ! canRun() ) {
			teardown();
			return;
		}
		const vertical = VERTICAL.includes( settings.direction );
		// The set is measured in the running layout: a block can keep the set out of its static layout until the
		// marquee runs (the trust bar's track is `display: contents` until then), so the marks go on first.
		root.setAttribute( 'data-sgs-marquee', 'on' );
		lane.setAttribute( 'data-sgs-marquee-lane', 'on' );
		settleEntrances( original );
		const { size, view } = measure( vertical );
		if ( size <= 0 ) {
			// Not laid out yet (a hidden ancestor, an image still loading); the resize observer calls back in. A block
			// that is not running yet goes back to its static layout meanwhile.
			if ( 0 === loops.length ) {
				unmark();
			}
			return;
		}
		if (
			! force &&
			loops.length > 0 &&
			size === measured.size &&
			view === measured.view
		) {
			return;
		}
		measured = { size, view };
		const wanted = Math.max( 2, Math.ceil( view / size ) + 1 );
		const rebuilt =
			copies.length !== wanted || state.axis !== ( vertical ? 'y' : 'x' );
		const previous = loops;
		if ( rebuilt ) {
			clones().forEach( ( clone ) => clone.remove() );
			copies = [ original ];
			let last = original;
			for ( let i = 1; i < wanted; i++ ) {
				const clone = makeClone( original );
				last.after( clone );
				copies.push( clone );
				last = clone;
			}
		}
		state.axis = vertical ? 'y' : 'x';
		root.setAttribute( 'data-sgs-marquee', 'on' );
		lane.setAttribute( 'data-sgs-marquee-lane', 'on' );
		fadeSize();
		pitch = pitchOf( vertical, size );
		state.distance = pitch;
		state.period = Math.max( 100, ( pitch / settings.speed ) * 1000 );
		if ( rebuilt ) {
			// The new loops register before the old ones go, so the root's pause button and a visitor pause survive.
			loops = start( {
				hoverRate: settings.hoverRate,
				touchPause: settings.touchPause,
				pauseControl: settings.pauseControl,
				label: 'Pause scrolling',
			} );
			previous.forEach( ( loop ) => loop.destroy() );
		} else {
			loops.forEach( ( loop ) => loop.rebuild() );
		}
	}

	function boot() {
		waitForImages( original ).then( () => {
			if ( destroyed ) {
				return;
			}
			layout();
			if ( typeof window.ResizeObserver === 'function' ) {
				observer = new window.ResizeObserver( () => layout( false ) );
				observer.observe( root );
				observer.observe( original );
			}
		} );
	}

	const stopReduced = onReducedMotionChange( layout );
	[ BELOW.tablet, BELOW.mobile ].forEach( ( text ) => {
		const query = window.matchMedia( text );
		if ( typeof query.addEventListener === 'function' ) {
			query.addEventListener( 'change', layout );
			queries.push( query );
		}
	} );
	boot();

	return {
		destroy() {
			destroyed = true;
			stopReduced();
			queries.forEach( ( query ) =>
				query.removeEventListener( 'change', layout )
			);
			if ( observer ) {
				observer.disconnect();
			}
			teardown();
		},
	};
}

function bootAll() {
	document.querySelectorAll( SELECTOR ).forEach( ( root ) => {
		const marquee = createMarquee( root );
		if ( marquee ) {
			registered.push( marquee );
		}
	} );
}

function teardownAll() {
	registered.forEach( ( marquee ) => marquee.destroy() );
	registered = [];
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', bootAll, { once: true } );
} else {
	bootAll();
}

// A bfcache restore skips module code, so rebuild against the restored DOM.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardownAll();
		bootAll();
	}
} );
