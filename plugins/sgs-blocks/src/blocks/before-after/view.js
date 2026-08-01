/**
 * Frontend interactivity for sgs/before-after. Spec 38 FR-38-13.
 *
 * PROGRESSIVE ENHANCEMENT ONLY — style.css already paints a real, correctly
 * positioned comparison split from `--sgs-before-after-position` with zero
 * JS (render.php step 5). Everything below only ever re-assigns that SAME
 * custom property; it never introduces a mechanism the CSS does not already
 * understand, so a script error part-way through still leaves a readable,
 * correctly split comparison.
 *
 * TWO LAYERS, ONE SOURCE OF TRUTH (the range input's `value`):
 *
 *   1. The native `<input type="range">` (always rendered — render.php).
 *      Listening to its `input` event is enough, on its own, to make the
 *      whole block fully operable: native mouse/touch drag on the thumb,
 *      and — because it is a real `<input type="range">` — native ARROW-KEY
 *      keyboard control for free. This layer has NO dependency on GSAP and
 *      runs even if the Draggable enhancement below never loads.
 *
 *   2. GSAP Draggable (opt-in via `fxDraggable`, Spec 38 FR-38-13 roster).
 *      Lets a visitor drag anywhere on the image area, not just the thin
 *      handle — GSAP owns the pointer/touch gesture tracking (bounded 1D
 *      drag, no momentum: a comparison slider must not fling past where the
 *      visitor released it, so InertiaPlugin is deliberately not used here).
 *      Every Draggable move WRITES BACK to the range input's `value` and
 *      dispatches a real `input` event, so layer 2 never becomes a second
 *      source of truth — it is a pointer-tracking front end for layer 1.
 *
 * REDUCED MOTION (Spec 38 §10): drag is user-driven input, not autonomous
 * motion, so it stays live under `prefers-reduced-motion: reduce` — nothing
 * here is gated behind `withMotionAllowed`. There is no momentum/inertia to
 * simplify away in the first place (see above), so the "momentum off, drag
 * still works" contract is satisfied by construction rather than a branch.
 *
 * @package
 */

/**
 * Write a 0-100 position to the block's CSS custom property. This is the
 * ONE place the visual divider position is ever set from JS — both the
 * range-input layer and the Draggable layer call through here.
 *
 * @param {HTMLElement} root  Block root element.
 * @param {number}      value 0-100.
 */
function writePosition( root, value ) {
	const clamped = Math.max( 0, Math.min( 100, value ) );
	root.style.setProperty( '--sgs-before-after-position', `${ clamped }%` );
}

/**
 * Wire the always-present native range input. Runs for EVERY instance,
 * regardless of `fxDraggable` — this is the layer that must never depend on
 * GSAP loading successfully.
 *
 * @param {HTMLElement} root Block root element.
 */
function bootRangeLayer( root ) {
	const range = root.querySelector( '[data-sgs-before-after-range]' );
	if ( ! range ) {
		return;
	}

	range.addEventListener( 'input', () => {
		writePosition( root, Number.parseFloat( range.value ) );
	} );
}

/**
 * Enhance with GSAP Draggable — free-drag anywhere on the image area.
 * Bounded to the stage; writes back to the range input on every move so the
 * range stays the single source of truth (screen readers + reduced-motion
 * revert both see a consistent value).
 *
 * @param {HTMLElement} root  Block root element.
 * @param {HTMLElement} stage The `.wp-block-sgs-before-after__stage` element.
 */
async function bootDraggableLayer( root, stage ) {
	const range = root.querySelector( '[data-sgs-before-after-range]' );
	if ( ! range ) {
		return;
	}

	// `webpackIgnore` is load-bearing, not decorative (proven against the
	// installed webpack 5.105.2, `testimonial-slider/view.js` — same fix,
	// same root cause). With `externalsType: 'module'` + real ESM output,
	// webpack's `ExternalModule.build()` always marks an externalised module
	// `buildMeta.async = false` regardless of whether the request came from a
	// static `import` or a dynamic `import()` — the async/sync decision is
	// keyed on `buildInfo.javascriptModule`, never on the call site. That
	// collapses this call into a STATIC top-level import at compile time
	// (wrapped in a `Promise.resolve().then()` that fakes async shape but
	// resolves before any code runs), so module linking happens before
	// `isEditorSurface()` or any `.catch()` can run — which is exactly why
	// the editor threw an uncaught `Failed to resolve module specifier
	// "@sgs/gsap-draggable"` even though this call sits behind the
	// `isEditorSurface()` early-return above. Scoping the externals callback
	// on `dependencyType` was investigated and disproved: both static and
	// dynamic ESM imports report `dependency.category === 'esm'`, so there is
	// no config-level fix. `webpackIgnore: true` is the one documented escape
	// hatch — it tells webpack to leave this exact `import()` expression
	// completely untouched, so the specifier survives verbatim to the
	// browser, which resolves it natively (and asynchronously, catchably)
	// via the import map WordPress prints for registered script modules. The
	// specifiers here MUST already be the EXTERNALISED module IDs
	// (`@sgs/gsap-draggable`, registered in `class-sgs-motion-registry.php`'s
	// `GSAP_MODULE_IDS`/`GSAP_PLUGIN_MODULE_IDS` maps), not the bare `gsap/*`
	// path — with webpackIgnore, webpack's `gsap/*` → `@sgs/gsap-*` externals
	// rewrite never runs, so there is no translation step.
	const [ { Draggable }, { tierG } ] = await Promise.all( [
		import( /* webpackIgnore: true */ '@sgs/gsap-draggable' ),
		import( /* webpackIgnore: true */ '@sgs/motion-provider' ),
	] );

	// ⚠ Load-bearing (Spec 38 provider.js docblock): Draggable looks core up
	// via the global GSAP registration set. Skipping this call leaves the
	// plugin fetched but silently inert — no drag, no console error.
	tierG( Draggable );

	const vertical = 'vertical' === root.dataset.orientation;

	// A 1px-tall/wide invisible proxy tracks the pointer across the WHOLE
	// stage; Draggable needs a real element to transform, and the range
	// input itself already spans the stage (its own listener above keeps it
	// in sync), so dragging the proxy is equivalent to dragging the range.
	const proxy = document.createElement( 'div' );
	proxy.style.position = 'absolute';
	proxy.style.inset = '0';
	proxy.style.opacity = '0';
	proxy.style.cursor = vertical ? 'ns-resize' : 'ew-resize';
	proxy.setAttribute( 'aria-hidden', 'true' );
	stage.appendChild( proxy );

	const [ instance ] = Draggable.create( proxy, {
		type: vertical ? 'y' : 'x',
		bounds: stage,
		// No InertiaPlugin: a comparison divider must stop exactly where
		// released, never coast past it (see file docblock).
		onDrag() {
			const rect = stage.getBoundingClientRect();
			const size = vertical ? rect.height : rect.width;
			if ( size <= 0 ) {
				return;
			}
			const offset = vertical ? this.y : this.x;
			const pct = ( offset / size ) * 100;
			range.value = String( Math.max( 0, Math.min( 100, pct ) ) );
			range.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			// Keep the proxy pinned to the current position rather than
			// accumulating translateX/Y, so the next drag starts from the
			// pointer's real position instead of the proxy's last offset.
			this.x = 0;
			this.y = 0;
		},
	} );

	// Sync the proxy's start position whenever the range moves via keyboard
	// or the pointer, so a keyboard nudge doesn't leave the next drag
	// starting from a stale spot.
	range.addEventListener( 'input', () => {
		instance.x = 0;
		instance.y = 0;
	} );
}

/**
 * Are we running inside wp-admin (the block editor) rather than the frontend?
 *
 * WordPress loads a block's `viewScriptModule` in the EDITOR as well as on the
 * frontend, but `SGS_Motion_Registry` registers the Tier G modules on the
 * frontend only, so in the editor the import map holds no `@sgs/gsap-*` entries
 * and `import( 'gsap/Draggable' )` below throws. Verified live 2026-07-31 —
 * the editor threw `Failed to resolve module specifier "@sgs/gsap-draggable"`.
 * The `.catch()` on `bootDraggableLayer` already made that harmless, but a
 * caught error is still an error the editor did not need to produce, and Spec
 * 38 §9 is explicit that motion is never active in wp-admin.
 *
 * The RANGE-INPUT layer is deliberately left running in both surfaces: it is
 * plain form behaviour with no GSAP dependency, and it is what makes the block
 * operable at all.
 *
 * @return {boolean} True when running in wp-admin.
 */
function isEditorSurface() {
	return (
		document.body?.classList.contains( 'wp-admin' ) ||
		!! document.getElementById( 'wpwrap' ) ||
		// The editor CANVAS is a same-origin iframe whose body carries neither
		// `wp-admin` nor `#wpwrap`, so those two checks alone miss it. These are
		// the canvas's own markers. Checked 2026-07-31 because the editor loads
		// block view modules INTO that iframe, which is exactly where an
		// unguarded motion boot would run.
		!! document.querySelector(
			'.block-editor-iframe__body, .editor-styles-wrapper'
		) ||
		document.body?.classList.contains( 'block-editor-iframe__body' )
	);
}

/**
 * Wire the shared play/pause control that drives BOTH comparison videos at
 * once, plus drift correction so they never show different moments.
 *
 * Only present when `data-has-video="1"` (render.php gates the button's
 * markup on at least one slot being `video`). A comparison whose two videos
 * could be started/paused independently would defeat the whole point of a
 * before/after — this is the ONE control surface for both.
 *
 * REDUCED MOTION (Spec 38 §10): autoplay is genuinely autonomous motion, so
 * it is suppressed under `prefers-reduced-motion: reduce` — both videos
 * start paused and wait for an explicit click on the toggle. The toggle
 * itself is never suppressed: a user-initiated play is not the kind of
 * motion §10 asks blocks to simplify away (the same reasoning the file
 * docblock already applies to the divider drag).
 *
 * @param {HTMLElement} root Block root element.
 */
function bootVideoSyncLayer( root ) {
	if ( '1' !== root.dataset.hasVideo ) {
		return;
	}

	const videos = Array.from(
		root.querySelectorAll( '[data-sgs-before-after-video]' )
	);
	const toggle = root.querySelector( '[data-sgs-before-after-video-toggle]' );

	if ( 0 === videos.length || ! toggle ) {
		return;
	}

	const [ primary, ...rest ] = videos;
	const DRIFT_TOLERANCE_SECONDS = 0.15;

	const setPressed = ( isPlaying ) => {
		toggle.setAttribute( 'aria-pressed', isPlaying ? 'true' : 'false' );
		toggle.setAttribute(
			'aria-label',
			isPlaying
				? toggle.dataset.pauseLabel || 'Pause comparison videos'
				: toggle.dataset.playLabel || 'Play comparison videos'
		);
	};

	toggle.dataset.playLabel = toggle.getAttribute( 'aria-label' );
	toggle.dataset.pauseLabel = 'Pause comparison videos';

	toggle.addEventListener( 'click', () => {
		if ( primary.paused ) {
			videos.forEach( ( video ) => {
				video.currentTime = primary.currentTime;
				// Autoplay-policy note: this call only ever runs from a real
				// click event, so browsers treat it as user-initiated and it
				// is never blocked the way an unrequested autoplay() call
				// can be.
				video.play().catch( () => {
					// A blocked/failed play() leaves the video visibly
					// paused — no broken half-played state to reconcile.
				} );
			} );
			setPressed( true );
		} else {
			videos.forEach( ( video ) => video.pause() );
			setPressed( false );
		}
	} );

	// Drift correction: the primary video's `timeupdate` (fires several
	// times a second) re-syncs every other video whenever it has wandered
	// more than the tolerance away — covers independent buffering stalls,
	// not just the loop-boundary wrap where drift is most likely.
	primary.addEventListener( 'timeupdate', () => {
		rest.forEach( ( video ) => {
			if (
				Math.abs( video.currentTime - primary.currentTime ) >
				DRIFT_TOLERANCE_SECONDS
			) {
				video.currentTime = primary.currentTime;
			}
		} );
	} );

	// Autoplay — gated behind reduced-motion (see docblock above). Only
	// attempted when the operator opted in via `videoAutoplay`.
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matched;

	if ( '1' === root.dataset.videoAutoplay && ! prefersReducedMotion ) {
		videos.forEach( ( video ) => {
			video.play().catch( () => {
				// Autoplay blocked by the browser (common when unmuted or
				// off-screen) — the toggle above remains fully functional.
			} );
		} );
		setPressed( true );
	}
}

/**
 * Boot every sgs/before-after instance on the page.
 */
function bootBeforeAfter() {
	const roots = document.querySelectorAll( '.wp-block-sgs-before-after' );

	roots.forEach( ( root ) => {
		// Fail-open: if the range input is missing (malformed markup), the
		// CSS-only static split from render.php is still correct — nothing
		// below can make it worse.
		bootRangeLayer( root );

		if ( ! isEditorSurface() ) {
			bootVideoSyncLayer( root );
		}

		if ( '0' === root.dataset.fxDraggable || isEditorSurface() ) {
			return;
		}

		const stage = root.querySelector( '[data-sgs-before-after-stage]' );
		if ( ! stage ) {
			return;
		}

		bootDraggableLayer( root, stage ).catch( () => {
			// Draggable failed to load (offline, blocked request, etc.) —
			// the range-input layer above already makes the block fully
			// operable, so this is a silent, harmless degradation.
		} );
	} );
}

bootBeforeAfter();
