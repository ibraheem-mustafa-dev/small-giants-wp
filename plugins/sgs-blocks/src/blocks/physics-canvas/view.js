/**
 * Tier G effect — the sgs/physics-canvas runtime. Spec 38 FR-38-27 / D447.
 *
 * Upgrades a decorative arena's direct children into throwable, physics-
 * driven bodies: pick one up (Draggable), release it, and it keeps moving
 * under momentum (InertiaPlugin) and gravity, settling with a bounce off the
 * arena's edges (Physics2DPlugin) — the "weight, momentum, bounce" feel Bean
 * asked for, on the curated Draggable+Inertia+Physics2D combo GSAP itself
 * documents for this exact pattern.
 *
 * DECORATIVE-ONLY (the load-bearing constraint, not a style choice): this
 * module is only ever booted against `[data-sgs-physics-body]`, which
 * render.php only ever creates from children of a DECORATIVE-ONLY roster
 * (edit.js `ALLOWED_BLOCKS`) — no link, button, form field, or must-read
 * body copy can ever reach this code path. If that invariant is ever
 * loosened, WCAG 2.5.7 re-applies in full and this module can no longer run
 * against the affected element (see Spec 38 FR-38-27).
 *
 * REDUCED MOTION (§10): the whole upgrade sits inside `withMotionAllowed`,
 * which only runs its callback under `(prefers-reduced-motion: no-preference)`
 * and reverts everything the instant that stops matching. An object still
 * moving after release is AUTONOMOUS motion (unlike drag-to-scroll, which is
 * user-driven input) — so, unlike `fx-draggable.js`, there is no "drag still
 * works, only momentum is off" carve-out here. Under reduced motion this
 * module never runs at all, and the children stay exactly where render.php
 * put them: in normal document flow (see style.css), not absolutely
 * positioned. Nothing is hidden — `degrade-to-more-content-never-less`.
 *
 * FAIL-OPEN (FR-38-2): render.php never writes inline position. Every
 * `position: absolute` / `left` / `top` this module applies is JS-applied
 * transient state, so with JS blocked the arena is a normal, readable static
 * section — the same carve-out `fx-draggable.js`'s `snapControl()` uses.
 *
 * @package
 */

import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { tierG, withMotionAllowed } from '@sgs/motion-provider';
import { settle } from './physics-body';

const CANVAS_SELECTOR = '[data-sgs-physics-canvas="1"]';
const BODY_ATTR = 'data-sgs-physics-body';
const DRAGGING_CLASS = 'sgs-physics-canvas__dragging';

/**
 * Read a numeric config value off the canvas root, falling back safely.
 *
 * @param {HTMLElement} canvas  The canvas root element.
 * @param {string}      attr     Attribute name.
 * @param {number}      fallback Value to use when absent or not a number.
 * @return {number} The parsed value, or `fallback`.
 */
function readConfig( canvas, attr, fallback ) {
	const raw = canvas.getAttribute( attr );
	const parsed = null === raw ? NaN : parseFloat( raw );
	return Number.isFinite( parsed ) ? parsed : fallback;
}

/**
 * Lift one child out of flow into an absolutely-positioned body, preserving
 * its current on-screen box exactly so the switch causes no visible jump.
 *
 * @param {HTMLElement} arena The `.sgs-container__inner` throw arena.
 * @param {HTMLElement} child Direct child element to upgrade.
 * @return {void}
 */
function toBody( arena, child ) {
	const arenaRect = arena.getBoundingClientRect();
	const childRect = child.getBoundingClientRect();

	child.style.position = 'absolute';
	child.style.left = `${ childRect.left - arenaRect.left }px`;
	child.style.top = `${ childRect.top - arenaRect.top }px`;
	child.style.width = `${ childRect.width }px`;
	child.style.height = `${ childRect.height }px`;
	child.style.margin = '0';
	child.setAttribute( BODY_ATTR, '1' );
}

/**
 * Undo `toBody()` — restores the element to normal flow with no leftover
 * inline styling. Called on cleanup so a reduced-motion switch mid-session
 * (or a bfcache restore) never leaves a body frozen mid-throw off-layout.
 *
 * @param {HTMLElement} child Body element to restore.
 * @return {void}
 */
function restoreFlow( child ) {
	child.style.position = '';
	child.style.left = '';
	child.style.top = '';
	child.style.width = '';
	child.style.height = '';
	child.style.margin = '';
	child.style.transform = '';
	child.removeAttribute( BODY_ATTR );
	child.classList.remove( DRAGGING_CLASS );
}

/**
 * Boot every canvas on the page. Called only inside `withMotionAllowed`.
 *
 * @param {Object} gsapInstance Shared gsap instance (registered plugins).
 * @return {Function} Cleanup — kills every Draggable + tween, restores flow.
 */
function bootCanvases( gsapInstance ) {
	const teardowns = Array.from(
		document.querySelectorAll( CANVAS_SELECTOR )
	).map( ( canvas ) => {
		const arena =
			canvas.querySelector( '.sgs-container__inner' ) || canvas;

		const children = Array.from( arena.children );
		if ( 0 === children.length ) {
			return () => {};
		}

		const gravity = readConfig( canvas, 'data-sgs-physics-gravity', 1400 );
		const bounce = readConfig( canvas, 'data-sgs-physics-bounce', 0.55 );
		const edgeResistance = readConfig(
			canvas,
			'data-sgs-physics-edge',
			0.5
		);

		children.forEach( ( child ) => toBody( arena, child ) );

		const draggables = Draggable.create( children, {
			type: 'x,y',
			bounds: arena,
			edgeResistance,
			inertia: true,
			allowContextMenu: true,
			dragClickables: true,
			onPress() {
				this.target.classList.add( DRAGGING_CLASS );
				gsapInstance.killTweensOf( this.target );
			},
			onDragEnd() {
				this.target.classList.remove( DRAGGING_CLASS );
				settle( gsapInstance, this.target, this, gravity, bounce );
			},
		} );

		return () => {
			draggables.forEach( ( d ) => d.kill() );
			children.forEach( ( child ) => {
				gsapInstance.killTweensOf( child );
				restoreFlow( child );
			} );
		};
	} );

	return () => teardowns.forEach( ( teardown ) => teardown() );
}

withMotionAllowed( ( gsapInstance ) => {
	tierG( Draggable, InertiaPlugin, Physics2DPlugin );
	return bootCanvases( gsapInstance );
} );
