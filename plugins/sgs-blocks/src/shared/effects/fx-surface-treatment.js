/**
 * SGS Tier W — surface-treatment boot module (Spec 38 §1.2b, D479).
 *
 * The `@sgs/fx-surface-treatment` script module the PHP motion registry
 * enqueues when a page renders a block carrying
 * `data-sgs-fx="surface-treatment"`. It finds those elements, resolves each
 * one's preset + overrides, and hands the FIRST `<img>` inside to the Tier W
 * rendering substrate (`./webgl/index.js`). It knows nothing about how a
 * pixel reaches the screen — that is `webgl/renderer.js`'s job, reached only
 * through `initSurface()` (this directory's contract; see `webgl/README.md`
 * "The public surface").
 *
 * Shaped identically to `fx-cursor-field.js` (selector constant, module-
 * local `cleanups` array, `boot()`/`teardown()`, the same bfcache handling)
 * so the two boot modules read as one family. It differs in exactly the
 * places the effect itself differs: per-element init is ASYNC (an
 * undecoded image uploads as a blank texture, so every element must await
 * `img.decode()` before `initSurface()` can run), and — the load-bearing
 * difference — a FAILED or SKIPPED element does nothing at all rather than
 * falling back to anything this module writes. See "THE LOAD-BEARING RULE"
 * below.
 *
 * ── WHY NO `prefersReducedMotion()` GATE ──────────────────────────────────
 *
 * Every other Tier V/G module in this directory checks `prefersReducedMotion
 * ()` before doing its work, because those effects ANIMATE — a pointer
 * follower, a parallax scroll, a stagger reveal. This effect draws EXACTLY
 * ONCE (`initSurface()` paints one frame; `redraw()` only fires again on a
 * debounced resize, never on a timer or scroll) and then sits static, same
 * as a plain `<img>` would. There is no motion here for `prefers-reduced-
 * motion: reduce` to suppress. A reduced-motion early-return would instead
 * suppress a STATIC IMAGE TREATMENT — silently give reduced-motion visitors
 * a plain photo where every other visitor sees the designed grain/halftone/
 * duotone finish — which is exactly the "degrade to less content" failure
 * this framework's design rules forbid (`degrade-to-more-content-never-
 * less`). This omission is deliberate, not an oversight; do not add the
 * gate back without re-litigating this paragraph.
 *
 * @package
 */

import { initSurface } from './webgl';
import { resolvePreset } from './surface-treatments/presets';

/** Elements the render layer marked as surface-treatment hosts. */
const SELECTOR = '[data-sgs-fx="surface-treatment"]';

/** Live cleanups, so a bfcache restore can tear down before re-init. */
let cleanups = [];

/**
 * Convert a preset uniform key (e.g. `uIntensity`) to the `data-sgs-fx-
 * treatment-*` suffix a client would author (e.g. `intensity`), and from
 * there to the DOM dataset key (`sgsFxTreatmentIntensity`) `HTMLElement
 * .dataset` exposes for `data-sgs-fx-treatment-intensity`.
 *
 * @param {string} uniformName The preset's uniform key, e.g. `uIntensity`.
 * @return {string} The matching `dataset` property name.
 */
function datasetKeyForUniform( uniformName ) {
	const suffix = uniformName.charAt( 1 ).toLowerCase() + uniformName.slice( 2 );
	return 'sgsFxTreatment' + suffix.charAt( 0 ).toUpperCase() + suffix.slice( 1 );
}

/**
 * Resolve a CSS custom property to a concrete `[r, g, b]` triple in 0-1
 * float space, for use as a `vec3` uniform.
 *
 * The property may itself hold a `var(--wp--preset--color--…)` reference —
 * `getComputedStyle( el ).getPropertyValue( name )` does NOT resolve that
 * kind of indirection on the custom property directly, so this probes via
 * `color` on a throwaway element instead, the same technique already
 * established in `blocks/audio/view.js`'s `resolveColour()` for exactly this
 * WP-preset-var problem. Re-implemented locally rather than imported: that
 * function is block-private (not exported) and this module has no
 * dependency on the audio block.
 *
 * @param {HTMLElement} root     Element to resolve the property against
 *                                (custom properties inherit down the tree).
 * @param {string}      name     Custom property name, e.g. `--sgs-fx-shadow`.
 * @param {number[]}    fallback `[r, g, b]` in 0-1 float space, used when
 *                                the property is unset or unparsable.
 * @return {number[]} `[r, g, b]` in 0-1 float space.
 */
function resolveColourVec3( root, name, fallback ) {
	const probe = document.createElement( 'span' );
	probe.className = 'sgs-fx-colour-probe';
	probe.style.setProperty( 'color', 'var(' + name + ')' );
	root.appendChild( probe );
	const resolved = getComputedStyle( probe ).color;
	probe.remove();

	const match = resolved && resolved.match(
		/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
	);
	if ( ! match ) {
		return fallback;
	}
	return [
		parseInt( match[ 1 ], 10 ) / 255,
		parseInt( match[ 2 ], 10 ) / 255,
		parseInt( match[ 3 ], 10 ) / 255,
	];
}

/**
 * Build the `{ name: value }` uniform map for one element: preset defaults,
 * overridden by `data-sgs-fx-treatment-*` for scalar (`float`) uniforms and
 * by CSS custom properties for `vec3` colour uniforms (the render layer
 * publishes those — see this function's colour-resolution branch).
 *
 * @param {HTMLElement}                        el     The treatment host.
 * @param {import('./surface-treatments/presets').SurfaceTreatmentPreset} preset
 * @return {Object<string, number|number[]>} The resolved uniform values.
 */
function resolveUniforms( el, preset ) {
	const uniforms = {};

	Object.keys( preset.uniforms ).forEach( ( name ) => {
		const spec = preset.uniforms[ name ];

		if ( spec.type === 'vec3' ) {
			// Colour uniforms come from CSS custom properties, named after
			// the uniform's own suffix (uShadow -> --sgs-fx-shadow), not
			// from data-* overrides — the render layer is the publisher.
			const suffix = name.charAt( 1 ).toLowerCase() + name.slice( 2 );
			uniforms[ name ] = resolveColourVec3(
				el,
				'--sgs-fx-' + suffix,
				spec.default
			);
			return;
		}

		const raw = el.dataset[ datasetKeyForUniform( name ) ];
		const parsed = raw !== undefined ? parseFloat( raw ) : NaN;
		uniforms[ name ] = isFinite( parsed ) ? parsed : spec.default;
	} );

	return uniforms;
}

/**
 * Initialise one element: locate its image, wait for it to decode, resolve
 * its preset + uniforms, and attempt a Tier W surface.
 *
 * THE LOAD-BEARING RULE: `img.style.visibility` and `el.dataset
 * .sgsWebglActive` are written ONLY after `initSurface()` returns a non-null
 * handle — a successful first paint already happened by the time
 * `initSurface()` returns (see `webgl/renderer.js`: it paints once inside
 * `createRenderer()` before returning the handle), so "non-null" and "first
 * draw succeeded" are the same condition here, not two checks. On `null`,
 * this function does nothing further — the untouched `<img>` is already the
 * finished state (`webgl/README.md` "initSurface returns null, never
 * throws"). There is no fallback branch to write.
 *
 * @param {HTMLElement} el The `[data-sgs-fx="surface-treatment"]` element.
 * @return {Function} A cleanup function, safe to call at any point —
 *                     including before this async init has resolved.
 */
function initTreatment( el ) {
	const state = { cancelled: false, handle: null };

	const img = el.querySelector( 'img' );
	if ( ! img ) {
		return () => {
			state.cancelled = true;
		};
	}

	( async () => {
		if ( ! img.complete ) {
			try {
				await img.decode();
			} catch ( error ) {
				// A failed decode (broken src, aborted load) leaves the
				// plain <img> in place — exactly the same finished state a
				// `null` initSurface() return produces, so no separate
				// handling is needed here beyond bailing out.
				return;
			}
		}

		if ( state.cancelled ) {
			return;
		}

		const preset = resolvePreset( el.dataset.sgsFxTreatment );
		const uniforms = resolveUniforms( el, preset );

		const handle = initSurface( el, {
			image: img,
			fragment: preset.fragment,
			uniforms,
		} );

		if ( state.cancelled ) {
			// Torn down while initSurface() was running (bfcache restore
			// racing this async init) — release what was just built rather
			// than leaving a live GPU surface this module has lost track of.
			if ( handle ) {
				handle.destroy();
			}
			return;
		}

		if ( ! handle ) {
			return;
		}

		state.handle = handle;

		// The ONLY inline style write in this module, and it is a
		// visibility TOGGLE, not a styling declaration — Spec 32 forbids
		// emitting CSS *property declarations* for design/styling purposes;
		// this sets zero design properties (colour, spacing, typography…),
		// it only decides which of two already-painted layers (the <img> or
		// the canvas drawn over it) is visible. `visibility`, never
		// `display: none`, because the <img> must keep occupying layout —
		// hiding it with `display: none` would reflow the page around the
		// canvas that replaced it.
		img.style.visibility = 'hidden';
		el.dataset.sgsWebglActive = '1';
	} )();

	return () => {
		state.cancelled = true;
		if ( state.handle ) {
			state.handle.destroy();
			state.handle = null;
		}
		img.style.visibility = '';
		delete el.dataset.sgsWebglActive;
	};
}

/**
 * Attach a treatment to every marked element on the page.
 *
 * @return {void}
 */
function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		cleanups.push( initTreatment( el ) );
	} );
}

/**
 * Tear every attached treatment down.
 *
 * @return {void}
 */
function teardown() {
	cleanups.forEach( ( cleanup ) => cleanup() );
	cleanups = [];
}

boot();

/*
 * bfcache (§1.6, mirrors fx-cursor-field.js). A back-navigation restores the
 * page from memory WITHOUT re-running module code, so a live GPU surface
 * from before the navigation would otherwise sit undisturbed over a DOM that
 * may since have been re-rendered. Tearing down and re-booting on a
 * persisted restore keeps the two in step. On a normal load `persisted` is
 * false and this does nothing.
 */
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
