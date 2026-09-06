/**
 * SGS Tier W — the public surface (Spec 38 §1.2b, D479).
 *
 * WHAT THIS IS. The single entry point into the WebGL rendering substrate.
 * Everything outside this directory reaches the GPU only through
 * `initSurface()` — never `renderer.js` or `capability.js` directly. QA Gate
 * A greps the tree for stray imports of `renderer.js` and fails the build if
 * it finds one, which is what makes "swappable in one file" (this directory's
 * README, "Swappability") a checked invariant rather than a comment nobody
 * enforces.
 *
 * This file exports EXACTLY ONE symbol: `initSurface`. Nothing else — a
 * prebuild gate greps this file for `export` and fails on a second match, so
 * do not add a second export here even for a seemingly-harmless constant.
 *
 * WHY THE PROBE RUNS FIRST, EVERY TIME. `initSurface()` never assumes the
 * page already knows whether WebGL2 paints correctly on this device —
 * `probeSurface()` (see `capability.js`) runs synchronously before
 * `createRenderer()` is even called. That keeps the "returns null, never
 * throws" contract (README, "initSurface returns null, never throws") true
 * for every caller unconditionally, with no separate "did you check
 * capability first?" step for a consumer to forget.
 *
 * @package
 */

import { probeSurface } from './capability';
import { createRenderer } from './renderer';

/**
 * Initialise a Tier W single-pass WebGL surface over `el`, or return `null`
 * when this device cannot reliably paint one. See this directory's README
 * for the full contract (single-pass restriction, context-loss recovery,
 * GPU disposal, Spec 32 no-inline-styling).
 *
 * A `null` return IS the fallback signal — the caller does nothing further,
 * and the untouched source element is already the finished state.
 *
 * @param {HTMLElement}      el                 Element the canvas is appended to.
 * @param {Object}            opts               Options.
 * @param {HTMLImageElement} opts.image         Already-decoded source image.
 * @param {string}            opts.fragment      GLSL ES 3.00 fragment shader source.
 * @param {Object}            [opts.uniforms]    Initial `{ name: value }` uniforms.
 * @return {{setUniform: Function, redraw: Function, destroy: Function}|null}
 *         The render handle, or `null` when unsupported or on any failure.
 */
export function initSurface( el, opts ) {
	if ( ! probeSurface() ) {
		return null;
	}
	return createRenderer( el, opts );
}
