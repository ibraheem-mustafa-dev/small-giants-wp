/**
 * SGS motion — cursor-field boot module (Spec 38 §3.3, FR-38-25). Tier V.
 *
 * The `@sgs/fx-cursor-field` script module the PHP motion registry enqueues
 * when a page renders a block carrying `data-sgs-fx="cursor-field"`. It finds
 * those elements and attaches the emitter; the emitter itself lives in
 * `cursor-field.js`, which knows nothing about blocks or WordPress.
 *
 * ── WHY THIS IS TIER V AND DECLARES NO DEPENDENCIES ───────────────────────
 *
 * Both shipped field types paint in pure CSS, and the only JS is one
 * rAF-throttled custom-property write. There is nothing here GSAP would do
 * better, so a page using this effect and no Tier G effect ships ZERO GSAP
 * bytes — the §4.4 conditional-loading promise, honoured by not creating the
 * dependency in the first place. Registered like `smooth-scroll`, the existing
 * non-GSAP module precedent, NOT like the `gsap/fx-*` family.
 *
 * ── WHAT THIS MODULE DELIBERATELY DOES NOT DO ─────────────────────────────
 *
 * It does not apply `data-sgs-cursor-field`. The render layer
 * (`includes/fx-cursor-field.php`) writes that attribute into SSR markup,
 * because the FIELD ITSELF is the finished state (§1.6 fail-open): with JS
 * blocked the CSS must still paint one static field. If this module applied
 * the attribute, a no-JS visitor would get a blank surface where the client
 * configured an effect — which is the fail-open contract inverted.
 *
 * JS therefore adds exactly one thing: the field FOLLOWING the pointer.
 *
 * @package
 */

import { initCursorField } from './cursor-field';

/** Elements the render layer marked as emitters. */
const SELECTOR = '[data-sgs-cursor-field]';

/** Live cleanups, so a bfcache restore can tear down before re-init. */
let cleanups = [];

/**
 * Attach the emitter to every marked element on the page.
 *
 * @return {void}
 */
function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		cleanups.push( initCursorField( el ) );
	} );
}

/**
 * Tear every attached emitter down.
 *
 * @return {void}
 */
function teardown() {
	cleanups.forEach( ( cleanup ) => cleanup() );
	cleanups = [];
}

boot();

/*
 * bfcache (§1.6). A back-navigation restores the page from memory WITHOUT
 * re-running module code, so listeners survive but the participant marks may
 * describe a DOM that has since been re-rendered. Tearing down and re-booting
 * on a persisted restore keeps the two in step. On a normal load `persisted`
 * is false and this does nothing.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
