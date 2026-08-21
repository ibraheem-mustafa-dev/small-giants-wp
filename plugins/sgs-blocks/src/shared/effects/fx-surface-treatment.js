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
import { prefersReducedMotion, rafThrottle } from './motion-utils';

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
	// ⛔ ASK WHETHER THE PROPERTY IS SET **BEFORE** PROBING IT. Without this
	// guard the `fallback` argument below is UNREACHABLE, and the bug is
	// silent and plausible-looking rather than loud.
	//
	// Measured on the canary 2026-08-21: with `--sgs-fx-shadow` unset, the
	// probe returned `rgb(58, 46, 38)` — byte-identical to the page's
	// INHERITED text colour. CSS makes a declaration referencing an unset
	// custom property "invalid at computed-value time", and the specified
	// behaviour for that is to INHERIT, not to fail. So `getComputedStyle`
	// hands back a perfectly well-formed `rgb()`, the regex below matches
	// happily, and the preset default is never applied.
	//
	// The visible consequence: a client picking "Duotone" without choosing
	// colours — which is the DEFAULT path, not an edge case — got both
	// shadow and highlight resolved to the body text colour, so
	// `mix( shadow, highlight, lum )` collapsed to a single flat tone and
	// the image merely looked darkened. It rendered, the liveness flag was
	// set, and every automated check passed.
	const declared = getComputedStyle( root ).getPropertyValue( name ).trim();
	if ( '' === declared ) {
		return fallback;
	}

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
 * Derive a duotone END from a brand colour.
 *
 * A duotone maps luminance across TWO colours, and it only reads as a duotone
 * when those two have real tonal distance. A brand palette rarely supplies
 * that: it supplies one mid-tone hue. Using that hue raw at both ends produces
 * a flat ramp and an image that looks untouched — measured on the Mama's
 * Munches canary, whose primary (#e68a95) is a mid pink.
 *
 * So take the hue and derive a deep end and a pale end from it. The result has
 * the contrast a duotone needs AND stays unmistakably the client's colour,
 * which is the entire reason to use a duotone rather than greyscale.
 *
 * @param {number[]} rgb       `[r, g, b]` 0-1, the brand colour.
 * @param {string}   transform `'deepen'` | `'lighten'` | undefined (identity).
 * @return {number[]} The derived `[r, g, b]`.
 */
function transformBrandColour( rgb, transform ) {
	if ( 'deepen' === transform ) {
		// Toward black, keeping the hue. Not pure multiplication on every
		// channel equally — a touch of extra blue keeps deep tones from going
		// muddy-brown, the failure the first duotone build actually exhibited.
		return [ rgb[ 0 ] * 0.26, rgb[ 1 ] * 0.24, rgb[ 2 ] * 0.34 ];
	}
	if ( 'ink' === transform ) {
		// Printer's ink: dark enough to read as ink, saturated enough to read
		// as a COLOUR. A full 'deepen' lands near-black and defeats the point
		// of offering an ink colour at all.
		return [ rgb[ 0 ] * 0.55, rgb[ 1 ] * 0.42, rgb[ 2 ] * 0.50 ];
	}
	if ( 'lighten' === transform ) {
		// Toward white, retaining a clear tint so highlights still read as
		// branded rather than as plain paper.
		const m = 0.84;
		return [
			rgb[ 0 ] + ( 1 - rgb[ 0 ] ) * m,
			rgb[ 1 ] + ( 1 - rgb[ 1 ] ) * m,
			rgb[ 2 ] + ( 1 - rgb[ 2 ] ) * m,
		];
	}
	return rgb;
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

			// Resolution order, cheapest-correct first:
			//   1. what the client explicitly picked (the render layer
			//      publishes it as --sgs-fx-<suffix>)
			//   2. the site's own palette, via this uniform's declared
			//      `paletteFallback` slug — so an untouched duotone is
			//      ON-BRAND rather than wearing whatever colours this file
			//      happened to hard-code
			//   3. the preset's literal default, which now only ever applies
			//      to a site that does not define that palette slug at all
			let fallback = spec.default;
			if ( spec.paletteFallback ) {
				// A SITE-WIDE override of which palette slug the treatments
				// derive from, published by the render layer from the SGS ->
				// Motion setting. Absent means `primary`, the preset's own
				// declared slug — the render layer deliberately does not stamp
				// the default, so an unset site keeps a clean DOM.
				const siteSlug = el.dataset.sgsFxTreatmentPalette;
				const slug = siteSlug || spec.paletteFallback;
				const brand = resolveColourVec3(
					el,
					'--wp--preset--color--' + slug,
					null
				);
				if ( brand ) {
					fallback = transformBrandColour( brand, spec.paletteTransform );
				}
			}

			uniforms[ name ] = resolveColourVec3(
				el,
				'--sgs-fx-' + suffix,
				fallback
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
 * Drive `uResolve` from 1 (untouched source) down to 0 (the treatment at its
 * chosen strength) as `el` scrolls into view, so the treatment DEVELOPS in.
 *
 * ── WHY THIS DIRECTION, AND NOT THE OBVIOUS ONE ───────────────────────────
 *
 * The intuitive reading of "resolve" is the photograph resolving OUT of a
 * treated state into a clean one. That was rejected deliberately: it makes
 * the settled appearance of every treated image the UNTREATED photograph, so
 * the treatment is only ever visible mid-scroll and vanishes once the visitor
 * stops. Running it the other way leaves the resting appearance byte-identical
 * to what it was before this driver existed — the motion is strictly additive
 * and cannot regress a look already signed off.
 *
 * ── WHY SCROLL-DRIVEN MOTION IS NOT AN SC 2.2.2 PROBLEM ───────────────────
 *
 * WCAG 2.2.2 (Pause, Stop, Hide) governs motion that STARTS AUTOMATICALLY and
 * runs for more than five seconds. This runs only while the visitor scrolls,
 * advances only as far as they scroll, and stops the instant they do — it is
 * user-driven, like a parallax, not autoplaying. That is the same reasoning
 * the shipped Tier V parallax rests on, and it is why this could be added
 * without acquiring the pause-control obligation that disqualified the fluid
 * cursor field (Spec 38 §1.2b).
 *
 * Cost is bounded three ways: an `IntersectionObserver` means an off-screen
 * image runs nothing at all; the scroll handler is rAF-coalesced so a burst of
 * scroll events costs one redraw per frame at most; and progress is clamped so
 * a fully-entered element stops redrawing entirely.
 *
 * @param {HTMLElement} el     The treatment host.
 * @param {{setUniform: Function, redraw: Function}} handle The render handle.
 * @return {Function} Teardown for this driver.
 */
function driveScrollResolve( el, handle ) {
	// Reduced motion: no listener, no observer, no per-frame work — just the
	// finished state. Note this lands on TREATED, not untreated: the settled
	// look is the content the client configured, and dropping to a plain photo
	// would be the degrade-to-LESS-content failure (see this module's header).
	if ( prefersReducedMotion() ) {
		handle.setUniform( 'uResolve', 0 );
		handle.redraw();
		return () => {};
	}

	let visible = false;
	let settled = false;

	const update = () => {
		if ( ! visible ) {
			return;
		}
		const rect = el.getBoundingClientRect();
		const vh = window.innerHeight || document.documentElement.clientHeight;
		// 0 while the element's top edge is still at the bottom of the
		// viewport; 1 once its top has travelled 65% of the way up. The
		// treatment is therefore fully developed well before the element
		// centres, rather than still resolving as it leaves.
		const travelled = ( vh - rect.top ) / ( vh * 0.65 );
		const progress = Math.min( 1, Math.max( 0, travelled ) );
		const resolve = 1 - progress;

		if ( settled && resolve === 0 ) {
			return; // fully developed and staying that way — stop redrawing.
		}
		settled = resolve === 0;

		handle.setUniform( 'uResolve', resolve );
		handle.redraw();
	};

	const onScroll = rafThrottle( update );

	const io = new IntersectionObserver( ( entries ) => {
		entries.forEach( ( entry ) => {
			visible = entry.isIntersecting;
			if ( visible ) {
				update();
			}
		} );
	} );
	io.observe( el );

	window.addEventListener( 'scroll', onScroll, { passive: true } );
	window.addEventListener( 'resize', onScroll, { passive: true } );
	update();

	return () => {
		io.disconnect();
		window.removeEventListener( 'scroll', onScroll );
		window.removeEventListener( 'resize', onScroll );
	};
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
	const state = { cancelled: false, handle: null, stopDriver: null };

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
			// THE OTHER HALF OF CONTEXT-LOSS RECOVERY. The substrate removes
			// its own dead canvas, but only THIS module knows the <img> was
			// hidden, so only this module can put it back. Without this
			// callback an unrecoverable GPU context loss — routine on iOS
			// Safari under memory pressure — left a hidden <img> under a
			// canvas painting nothing: a permanent blank slot where the
			// client's photograph was. Found by a pre-merge QC council
			// tracing the path, not by any automated gate.
			onLost: () => {
				img.style.visibility = '';
				delete el.dataset.sgsWebglActive;
				state.handle = null;
				// Stop the scroll driver too — it would otherwise keep
				// pushing uniforms at a destroyed surface every frame.
				if ( state.stopDriver ) {
					state.stopDriver();
					state.stopDriver = null;
				}
			},
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

		// Scroll-resolve, unless the client turned it off. Started only here,
		// after a confirmed first paint — a driver attached to a surface that
		// never drew would push uniforms at nothing.
		if ( 'off' !== el.dataset.sgsFxTreatmentReveal ) {
			state.stopDriver = driveScrollResolve( el, handle );
		}
	} )();

	return () => {
		state.cancelled = true;
		if ( state.stopDriver ) {
			state.stopDriver();
			state.stopDriver = null;
		}
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
