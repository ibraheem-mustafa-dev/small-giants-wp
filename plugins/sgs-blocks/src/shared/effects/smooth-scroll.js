/**
 * Site-level smoothed scrolling — Spec 38 FR-38-18 (D422).
 *
 * WHAT THIS IS
 * A weighted, slightly-lagged feel to ordinary scrolling: the presentation
 * layer of the "expensive build" signal. Site setting, default OFF, and this
 * module is only ever enqueued when that setting is ON, so a site not using it
 * ships zero bytes of it.
 *
 * WHY LENIS AND NOT GSAP ScrollSmoother (D422 — supersedes the D407 resolution)
 * ScrollSmoother works by putting page content inside `#smooth-wrapper >
 * #smooth-content` and TRANSFORMING that content. A transformed ancestor
 * silently stops `position: sticky` from pinning — which is exactly what our
 * shipped Spec 37 header relies on — so adopting it meant restructuring every
 * template so the header could sit outside the wrapper, on a block theme where
 * WordPress offers no filter to wrap the whole template (`get_the_block_
 * template_html()` is private, core-only). Research found no block-theme
 * precedent for that anywhere.
 *
 * Lenis eases the REAL document scroll instead. No wrapper, no transform, no
 * template change. Measured on the canary before this was written: with Lenis
 * running, the header's whole ancestor chain reports `transform: none`, the
 * header holds `top: 0.00` at every scroll position INCLUDING mid-flight, the
 * published `--sgs-header-height` is unchanged at 93px, every header/row state
 * class toggles identically to baseline, `document.scrollHeight` is unchanged,
 * and no inline height is forced onto `<body>`. The Spec 37 system is untouched
 * by construction rather than by careful avoidance.
 *
 * HOUSE CONTRACT (mirrors `./motion-utils.js` and the Tier G provider)
 *   · reduced motion is checked LIVE and REACTIVELY — a mid-session OS change
 *     tears the smoother down, it does not wait for a reload
 *   · `initSmoothScroll() → cleanup()`
 *   · fail-open: with JS blocked or this module absent, scrolling is the
 *     browser's own. Nothing is hidden, offset, or dependent on it
 *   · bfcache-safe: a restored page re-measures rather than resuming against
 *     stale dimensions
 *   · never runs in the editor or wp-admin — enforced server-side by the
 *     enqueue, and again here as a cheap second gate
 *
 * @package
 */

import Lenis from 'lenis';

import { prefersReducedMotion } from './motion-utils';

/**
 * Module ID this file is registered under. The JSON settings blob WordPress
 * prints for a script module is keyed on it (`wp-script-module-data-{id}`),
 * so the two MUST stay in step with `class-sgs-motion-registry.php`.
 *
 * @type {string}
 */
const MODULE_ID = '@sgs/smooth-scroll';

/**
 * Strength (1–5, the client-facing control) → Lenis `lerp`.
 *
 * `lerp` is the fraction of the remaining distance covered each frame, so a
 * SMALLER number means MORE lag and a heavier feel. The scale is inverted for
 * the operator, who reasonably expects "5 = strongest effect".
 *
 * 3 is Lenis's own default (0.1) and is the setting's default, so an operator
 * who switches smoothing on without touching the slider gets the vendor's
 * tuned value rather than a number we invented.
 *
 * @type {Object<number, number>}
 */
const STRENGTH_LERP = {
	1: 0.2,
	2: 0.15,
	3: 0.1,
	4: 0.07,
	5: 0.05,
};

/**
 * Touch strength (1–5) → Lenis `syncTouchLerp`.
 *
 * A SEPARATE scale from the wheel, deliberately. Touch is the input where
 * overriding the platform's own momentum is most noticeable and most
 * complained about, so every step here sits LIGHTER than the wheel step of the
 * same number: touch 5 (0.075) is Lenis's own touch default and is already
 * heavier than most phone users expect, while touch 1 (0.3) is barely a
 * departure from native — the "smooth but still natural" setting.
 *
 * Direction matches the wheel scale so the two controls read the same way to
 * an operator: HIGHER number = heavier. (Mechanically that means a SMALLER
 * lerp, because lerp is the fraction of remaining distance covered per frame.)
 *
 * @type {Object<number, number>}
 */
const TOUCH_STRENGTH_LERP = {
	1: 0.3,
	2: 0.2,
	3: 0.15,
	4: 0.1,
	5: 0.075,
};

/**
 * Read the settings WordPress printed for this module.
 *
 * Absent, malformed, or empty all resolve to defaults rather than throwing —
 * a JSON parse error here would take out the whole module, and the failure
 * mode for a presentation-only feature must be "no smoothing", never "broken
 * page".
 *
 * @return {{strength: number}} Parsed settings, defaulted.
 */
function readConfig() {
	const fallback = { strength: 3, touch: false, touchStrength: 1 };
	const node = document.getElementById(
		`wp-script-module-data-${ MODULE_ID }`
	);

	if ( ! node || ! node.textContent ) {
		return fallback;
	}

	try {
		const parsed = JSON.parse( node.textContent );
		const strength = Number.parseInt( parsed?.strength, 10 );

		/*
		 * Test for KEY PRESENCE, not for the mapped value's truthiness.
		 * `STRENGTH_LERP[ strength ]` would work today only because every
		 * value in the table happens to be non-zero; add a tier mapping to
		 * lerp `0` (a legitimate "no smoothing" value) and the check would
		 * silently reject a valid strength and fall back to 3. Correct-now,
		 * wrong-test is the shape this codebase treats as debt, so it is
		 * written the right way round from the start.
		 */
		const touchStrength = Number.parseInt( parsed?.touchStrength, 10 );

		return {
			strength:
				Number.isFinite( strength ) &&
				Object.prototype.hasOwnProperty.call( STRENGTH_LERP, strength )
					? strength
					: fallback.strength,
			touch: true === parsed?.touch,
			touchStrength:
				Number.isFinite( touchStrength ) &&
				Object.prototype.hasOwnProperty.call(
					TOUCH_STRENGTH_LERP,
					touchStrength
				)
					? touchStrength
					: fallback.touchStrength,
		};
	} catch ( error ) {
		// A malformed settings blob must degrade to "no smoothing preference",
		// never take the module out. Nothing actionable to log for a visitor.
		return fallback;
	}
}

/**
 * Is this a context where smoothing must never run?
 *
 * FR-38-18(a). The server-side enqueue already excludes wp-admin, so this is a
 * second, cheap gate rather than the primary one — it also covers the block
 * editor's iframed canvas, where the document is rendered by the editor rather
 * than served through the frontend enqueue path.
 *
 * @return {boolean} True when the smoother must stay off.
 */
function isForbiddenContext() {
	if ( typeof document === 'undefined' ) {
		return true;
	}

	// The editor canvas renders inside an iframe whose parent carries the
	// block-editor UI. Smoothing the canvas would fight the editor's own
	// scrolling, which is the failure FR-38-18(a) exists to prevent.
	const inIframe = window.self !== window.top;
	if ( inIframe ) {
		return true;
	}

	return (
		document.body?.classList.contains( 'wp-admin' ) ||
		!! document.getElementById( 'wpwrap' )
	);
}

/**
 * Start smoothed scrolling and return a teardown.
 *
 * The instance is created lazily and destroyed outright under reduced motion,
 * rather than being created-then-paused: a paused smoother still owns the
 * wheel/touch listeners, and a visitor who has asked for reduced motion should
 * be scrolling on the browser's own code path, not ours.
 *
 * @return {Function} Cleanup — destroys the instance and detaches listeners.
 */
export function initSmoothScroll() {
	if ( isForbiddenContext() ) {
		return () => {};
	}

	const { strength, touch, touchStrength } = readConfig();
	const lerp = STRENGTH_LERP[ strength ] ?? STRENGTH_LERP[ 3 ];
	const touchLerp =
		TOUCH_STRENGTH_LERP[ touchStrength ] ?? TOUCH_STRENGTH_LERP[ 1 ];

	let lenis = null;
	let rafId = null;

	function start() {
		if ( lenis || prefersReducedMotion() ) {
			return;
		}

		lenis = new Lenis( {
			lerp,
			smoothWheel: true,
			/*
			 * Touch is left on the browser's own scrolling deliberately.
			 * Native momentum is what a phone user's muscle memory expects,
			 * and overriding it is the single most-complained-about behaviour
			 * of this class of library. Desktop gets the effect; touch keeps
			 * the platform's.
			 *
			 * ⚠ THE OPTION IS `syncTouch`, NOT `smoothTouch`. This shipped for
			 * one QC round as `smoothTouch: false`, which does not exist in
			 * Lenis 1.3.25 — verified: zero occurrences of that string in
			 * `dist/lenis.mjs` AND `dist/lenis.d.ts`. An unknown key on the
			 * options object is destructured-past in silence: no warning, no
			 * error, no console notice. The stated guarantee above was being
			 * delivered ENTIRELY by Lenis's own default (`syncTouch` defaults
			 * to `false`, `lenis.d.ts:157`), so it read as enforced while
			 * enforcing nothing — and would have flipped the moment upstream
			 * changed that default. Naming the real option is what makes the
			 * comment above true of the CODE rather than true by luck.
			 *
			 * OPERATOR-CONTROLLED since 2026-07-30 (owner request): touch
			 * smoothing can be switched ON with its own strength from
			 * SGS → Motion. It stays OFF by default, and the settings page
			 * states plainly that it is not recommended and to start low.
			 * Both values are passed EXPLICITLY in either state rather than
			 * omitted when off — an option this module relies on must be
			 * visible in the code, never inherited from a vendor default that
			 * can change under us. That is the whole lesson of the
			 * `smoothTouch` defect above.
			 */
			syncTouch: touch,
			syncTouchLerp: touchLerp,
			/*
			 * Lenis's anchor handling stays OFF. The theme already publishes
			 * `--sgs-header-height` and consumes it via `scroll-padding-top`
			 * (Spec 37 D391 / WCAG 2.4.11), and anchors were measured landing
			 * correctly clear of the sticky header with Lenis running and that
			 * mechanism untouched. Turning Lenis's own anchor handling on would
			 * put a second driver on the same click for no measured gain.
			 */
			anchors: false,
		} );

		const raf = ( time ) => {
			lenis.raf( time );
			rafId = window.requestAnimationFrame( raf );
		};
		rafId = window.requestAnimationFrame( raf );
	}

	function stop() {
		if ( rafId !== null ) {
			window.cancelAnimationFrame( rafId );
			rafId = null;
		}
		if ( lenis ) {
			lenis.destroy();
			lenis = null;
		}
	}

	start();

	/*
	 * Live reduced-motion handling. `prefersReducedMotion()` is checked per
	 * call rather than cached, and this listener is what makes the check
	 * REACTIVE: a visitor who turns the OS setting on mid-session gets the
	 * native scroller back immediately, and one who turns it off gets the
	 * effect without reloading.
	 */
	const motionQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const onMotionChange = () => {
		if ( motionQuery.matches ) {
			stop();
		} else {
			start();
		}
	};
	motionQuery.addEventListener( 'change', onMotionChange );

	/*
	 * bfcache: a back-navigation restores a live page whose dimensions may
	 * have changed while it was in the cache. Resizing re-measures rather than
	 * resuming against stale values.
	 */
	const onPageShow = ( event ) => {
		if ( event.persisted && lenis ) {
			lenis.resize();
		}
	};
	window.addEventListener( 'pageshow', onPageShow );

	return () => {
		motionQuery.removeEventListener( 'change', onMotionChange );
		window.removeEventListener( 'pageshow', onPageShow );
		stop();
	};
}

/**
 * The live instance's teardown, held at module scope.
 *
 * WHY THIS IS RETAINED RATHER THAN DISCARDED
 * On a classic multi-page site, throwing the cleanup away is harmless: a full
 * navigation destroys the whole JS realm, listeners included, and an ES module
 * evaluates once per document so there is no double-init path either. It would
 * have been dead-but-safe code today.
 *
 * It stops being safe the moment a SAME-DOCUMENT navigation exists, and page
 * transitions are the next task in this very wave (FR-38-19). A soft navigation
 * that needs to rebuild the smoother against a new document height would have
 * had no handle to call — the failure appearing later as "smoothing fights the
 * page after a soft nav", far from its cause. Holding the reference now costs
 * one binding.
 *
 * @type {Function|null}
 */
let activeCleanup = null;

/**
 * Tear down the running smoother, if any. Idempotent.
 *
 * @return {void}
 */
export function teardownSmoothScroll() {
	if ( typeof activeCleanup === 'function' ) {
		activeCleanup();
		activeCleanup = null;
	}
}

activeCleanup = initSmoothScroll();
