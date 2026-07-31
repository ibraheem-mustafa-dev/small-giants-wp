/**
 * Tier G effect — scroll-scrubbed canvas image sequence. Spec 38 FR-38-9.
 *
 * Draws a numbered frame sequence to a `<canvas>`, picking the visible frame
 * from the element's own scroll progress (the same element-scoped scrub
 * pattern as `fx-scrub.js` — NOT a pin: a client wanting the section to hold
 * still while the sequence plays composes this block inside a `sgs/container`
 * with pin+scrub separately; v1 keeps one effect per element per §11.2).
 *
 * PER FR-38-9's OWN DEFINITION OF DONE — repeated here because it is easy to
 * forget while writing the canvas code: "the block is NOT done when the
 * canvas draws; it is done when a client can produce usable frames with the
 * documented tooling." The asset pipeline this module's frames come from is
 * `scripts/image-sequence-prep.py` + its README — read those alongside this
 * file, they are not an afterthought.
 *
 * FAIL-OPEN (FR-38-2): `render.php` always emits a real `<img>` poster frame
 * UNDERNEATH the canvas. This module never removes or hides the poster — it
 * only reveals the canvas (`is-ready` class) once a decoded frame is ready to
 * paint, and un-reveals it (removes the class) on cleanup, so a mid-session
 * reduced-motion change or a load that never completes leaves the poster as
 * the thing the visitor sees. With JS blocked entirely, the poster is all
 * that ever exists.
 *
 * LAZY, CHUNKED FETCH (§3.1 explicit requirement — read before changing the
 * loading strategy): every frame reaching this module is a real HTTP request,
 * and a sequence is routinely 60-300 frames. Two mechanisms bound the cost:
 *
 *   1. An IntersectionObserver on the wrapper (rootMargin below) delays ANY
 *      fetching until the block is close to the viewport — a sequence far
 *      down the page a visitor never scrolls to costs nothing.
 *   2. Frames are requested in small CHUNKS with a yield to the event loop
 *      (`requestIdleCallback`, falling back to a macrotask) between chunks,
 *      in ascending frame order, so a 200-frame sequence never fires 200
 *      simultaneous requests — the browser's own connection-per-host limit
 *      would serialise them anyway, but queuing deliberately also keeps the
 *      main thread free between batches instead of parking 200 onload
 *      callbacks to fire back-to-back.
 *
 * DECODE OFF THE MAIN THREAD WHERE POSSIBLE: each frame is loaded via
 * `HTMLImageElement.decode()` (`decoding: 'async'`), which per spec performs
 * the image decode without blocking layout/paint of the rest of the page —
 * unlike relying on `onload`, which resolves the moment bytes finish
 * arriving and can still leave a large image's decode to happen inside the
 * next paint. `decode()` is awaited before a frame is marked loaded, so the
 * canvas never draws a frame that has bytes but hasn't finished decoding.
 *
 * RESOLUTION LADDER: `data-sgs-image-sequence-frames` carries one config
 * per device tier (desktop always present; tablet/mobile optional). The tier
 * is chosen ONCE at init from `window.innerWidth` against the project's
 * standard 768/1024 device-tier breakpoints (not re-evaluated on resize —
 * switching a sequence's frame source mid-scroll would restart every frame
 * that had already loaded, which is a worse experience than keeping the
 * tier chosen on load). An absent tier falls back to the next larger one, so
 * an operator who only ran the pipeline for desktop still gets a working
 * mobile render.
 *
 * Reduced motion (§10): SIMPLIFY to poster/final frame only. Handled
 * structurally by `withMotionAllowed` — the whole setup (including the
 * IntersectionObserver and every frame fetch) never runs, so a
 * reduced-motion visitor never downloads a single frame; they see the
 * `<img>` poster exactly as a no-JS visitor does.
 *
 * @package
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveStart,
	resolveScrub,
} from '@sgs/motion-provider';

/**
 * Frames requested per idle-callback slice. Small enough that one slice
 * never monopolises the main thread on a low-end device, large enough that a
 * 300-frame sequence does not need hundreds of scheduling round-trips.
 *
 * Not exposed as a block attribute — it is an internal performance tuning
 * knob, not a design property the Block Customisation Standard requires a
 * client-facing control for.
 *
 * @type {number}
 */
const CHUNK_SIZE = 12;

/**
 * How far below the viewport the IntersectionObserver starts loading frames.
 * Generous on purpose: on a fast scroll, loading should already be well
 * under way by the time the sequence's scrub range is reached.
 *
 * @type {string}
 */
const PRELOAD_ROOT_MARGIN = '600px 0px';

const ric =
	typeof window !== 'undefined' && window.requestIdleCallback
		? window.requestIdleCallback.bind( window )
		: ( cb ) => setTimeout( () => cb( { timeRemaining: () => 16 } ), 1 );

const cic =
	typeof window !== 'undefined' && window.cancelIdleCallback
		? window.cancelIdleCallback.bind( window )
		: clearTimeout;

/**
 * Resolve the device tier for THIS load, once. Mirrors the project's
 * standard 768/1024 device-tier breakpoints (contract §B2), not an arbitrary
 * visual breakpoint.
 *
 * @return {'mobile'|'tablet'|'desktop'} The tier to source frames from.
 */
function resolveTier() {
	const width = window.innerWidth || document.documentElement.clientWidth;
	if ( width < 768 ) {
		return 'mobile';
	}
	if ( width < 1024 ) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * A tier config is USABLE when it has a base URL and at least one frame.
 *
 * @param {Object|undefined} tier Candidate tier config from the JSON blob.
 * @return {boolean} True when frames can actually be requested from it.
 */
function isUsableTier( tier ) {
	return Boolean( tier && tier.base && Number( tier.count ) > 0 );
}

/**
 * Resolve the tier config to actually use, falling back UP the ladder
 * (mobile → tablet → desktop) when the requested tier was never exported by
 * the asset pipeline. Never falls DOWN — serving a phone the desktop-weight
 * frames on a genuine mobile-config miss is an acceptable degrade; serving a
 * desktop visitor a blurry mobile export because tablet/desktop are both
 * missing would silently look broken instead.
 *
 * @param {Object}                      config    Parsed frame config.
 * @param {'mobile'|'tablet'|'desktop'} requested Resolved device tier.
 * @return {Object|null} The tier config to load frames from, or null.
 */
function resolveTierConfig( config, requested ) {
	const LADDERS = {
		mobile: [ 'mobile', 'tablet', 'desktop' ],
		tablet: [ 'tablet', 'desktop' ],
		desktop: [ 'desktop' ],
	};
	const order = LADDERS[ requested ] || LADDERS.desktop;

	for ( const key of order ) {
		if ( isUsableTier( config[ key ] ) ) {
			return config[ key ];
		}
	}
	return null;
}

/**
 * Build the URL for one frame. Filenames follow the pipeline's fixed
 * convention — `frame_<padded index>.<ext>`, 1-indexed on disk — so this is
 * the ONLY place that convention is encoded; changing it means changing
 * `scripts/image-sequence-prep.py` and this function together.
 *
 * @param {Object} tier  Resolved tier config ({ base, count, pad, ext }).
 * @param {number} index 0-based frame index.
 * @return {string} Absolute or relative frame URL.
 */
function frameUrl( tier, index ) {
	const pad = Number.isFinite( tier.pad ) && tier.pad > 0 ? tier.pad : 4;
	const number = String( index + 1 ).padStart( pad, '0' );
	const ext = tier.ext || 'jpg';
	const base = String( tier.base ).replace( /\/+$/, '' );
	return `${ base }/frame_${ number }.${ ext }`;
}

/**
 * Load one frame with an async, off-main-thread-friendly decode.
 *
 * @param {string} url Frame URL.
 * @return {Promise<HTMLImageElement|null>} Resolves to the decoded image, or
 *                                          null when the frame failed to load
 *                                          (a missing frame must never throw
 *                                          and abort the whole queue).
 */
function loadFrame( url ) {
	const img = new window.Image();
	img.decoding = 'async';
	img.src = url;

	if ( 'function' === typeof img.decode ) {
		return img
			.decode()
			.then( () => img )
			.catch( () => null );
	}

	return new Promise( ( resolve ) => {
		img.onload = () => resolve( img );
		img.onerror = () => resolve( null );
	} );
}

/**
 * Draw one frame to the canvas using "cover" fit (scale to fill, crop the
 * overflow, centred) — the standard hero-image treatment, and the only
 * sensible default when the source frames' aspect ratio may not exactly
 * match the block's configured `aspectRatio`.
 *
 * @param {CanvasRenderingContext2D} ctx Canvas 2D context.
 * @param {HTMLImageElement}         img Decoded frame.
 * @param {number}                   cw  Canvas width in device pixels.
 * @param {number}                   ch  Canvas height in device pixels.
 */
function drawCover( ctx, img, cw, ch ) {
	const scale = Math.max( cw / img.naturalWidth, ch / img.naturalHeight );
	const drawW = img.naturalWidth * scale;
	const drawH = img.naturalHeight * scale;
	const dx = ( cw - drawW ) / 2;
	const dy = ( ch - drawH ) / 2;
	ctx.clearRect( 0, 0, cw, ch );
	ctx.drawImage( img, dx, dy, drawW, drawH );
}

/**
 * Size the canvas's internal pixel buffer to match its CSS box at the
 * current device pixel ratio, so frames draw crisp rather than upscaled.
 * The CSS box itself comes from the block's `aspectRatio` attribute (its own
 * scoped `<style>` rule in render.php) — this only reads the resulting
 * rendered size, never sets layout dimensions itself.
 *
 * @param {HTMLCanvasElement} canvas Target canvas.
 * @return {{cw:number, ch:number}} The buffer size just applied.
 */
function sizeCanvas( canvas ) {
	const rect = canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const cw = Math.max( 1, Math.round( rect.width * dpr ) );
	const ch = Math.max( 1, Math.round( rect.height * dpr ) );

	if ( canvas.width !== cw || canvas.height !== ch ) {
		canvas.width = cw;
		canvas.height = ch;
	}

	return { cw, ch };
}

/**
 * Initialise one image-sequence canvas.
 *
 * @param {HTMLCanvasElement} el The element carrying `data-sgs-fx="image-sequence"`.
 * @return {Function|undefined} Cleanup, or undefined when the block has no
 *                              usable frame config (leaves the poster showing).
 */
export function initImageSequence( el ) {
	let config;
	try {
		config = JSON.parse(
			el.getAttribute( 'data-sgs-image-sequence-frames' ) || '{}'
		);
	} catch ( err ) {
		config = {};
	}

	const tier = resolveTierConfig( config, resolveTier() );

	if ( ! tier ) {
		// No pipeline output configured yet for any tier reachable from this
		// visitor's viewport — the poster is the whole story until an operator
		// runs the asset pipeline. Not an error; a fresh block starts here.
		return undefined;
	}

	const ctx = el.getContext( '2d' );

	if ( ! ctx ) {
		return undefined;
	}

	const wrapper = el.closest( '.sgs-image-sequence' ) || el.parentElement;
	const count = Math.max( 1, Math.floor( Number( tier.count ) ) );

	return withMotionAllowed( () => {
		/** @type {Array<HTMLImageElement|null|undefined>} */
		const frames = new Array( count ).fill( undefined );
		let lastDrawnIndex = -1;
		let loadingStarted = false;
		let idleHandle = null;
		let cancelled = false;

		const drawIndex = ( index ) => {
			const clamped = Math.min( count - 1, Math.max( 0, index ) );
			const frame = frames[ clamped ];
			if ( ! frame ) {
				// Not loaded yet — keep whatever is currently painted (the
				// poster, or the last successfully drawn frame) rather than
				// clearing to blank while the queue catches up.
				return;
			}
			const { cw, ch } = sizeCanvas( el );
			drawCover( ctx, frame, cw, ch );
			lastDrawnIndex = clamped;
			wrapper?.classList.add( 'is-ready' );
		};

		/**
		 * Load frames in ascending order, CHUNK_SIZE at a time, yielding to
		 * the event loop between chunks. Frame 0 is always requested first
		 * and drawn the moment it decodes, independent of the chunk queue,
		 * so the canvas can reveal itself as early as possible rather than
		 * waiting for a full chunk.
		 */
		const runQueue = async () => {
			for ( let start = 0; start < count; start += CHUNK_SIZE ) {
				if ( cancelled ) {
					return;
				}
				const end = Math.min( count, start + CHUNK_SIZE );
				for ( let i = start; i < end; i++ ) {
					if ( cancelled ) {
						return;
					}
					if ( undefined !== frames[ i ] ) {
						continue; // Frame 0 may already have loaded ahead of the queue.
					}
					// eslint-disable-next-line no-await-in-loop
					const img = await loadFrame( frameUrl( tier, i ) );
					if ( cancelled ) {
						return;
					}
					frames[ i ] = img;
					if ( 0 === i ) {
						drawIndex( 0 );
					}
				}
				// Yield before the next chunk so a long sequence never holds
				// the main thread across its whole load.
				// eslint-disable-next-line no-await-in-loop
				await new Promise( ( resolve ) => {
					idleHandle = ric( resolve );
				} );
			}
		};

		const beginLoading = () => {
			if ( loadingStarted ) {
				return;
			}
			loadingStarted = true;
			runQueue();
		};

		// Lazy trigger: only start fetching once the block is within
		// PRELOAD_ROOT_MARGIN of the viewport, never on page load.
		const observer = new window.IntersectionObserver(
			( entries ) => {
				if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
					beginLoading();
					observer.disconnect();
				}
			},
			{ rootMargin: PRELOAD_ROOT_MARGIN }
		);
		observer.observe( wrapper || el );

		const scrollTrigger = {
			trigger: wrapper || el,
			start: () => resolveStart( el, 'top 80%' ),
			end: el.getAttribute( 'data-sgs-fx-end' ) || 'bottom 20%',
			scrub: resolveScrub( el ),
			onUpdate: ( self ) => {
				const index = Math.round( self.progress * ( count - 1 ) );
				if ( index !== lastDrawnIndex ) {
					drawIndex( index );
				}
			},
		};

		// A ScrollTrigger with no tween still needs `gsap.timeline` (or
		// `ScrollTrigger.create`) to register progress callbacks — using
		// `ScrollTrigger.create` directly, since there is no property to
		// tween: the canvas paints happen entirely in `onUpdate`.
		const trigger = ScrollTrigger.create( scrollTrigger );

		// Re-measure the canvas buffer on resize so a reflow (e.g. sidebar
		// collapse, orientation change) does not leave frames drawn at a
		// stale internal resolution. Cheap: it only resizes the buffer and
		// redraws whatever is already loaded — it does not refetch.
		const onResize = () => {
			if ( lastDrawnIndex >= 0 ) {
				drawIndex( lastDrawnIndex );
			}
		};
		window.addEventListener( 'resize', onResize );

		return () => {
			cancelled = true;
			if ( null !== idleHandle ) {
				cic( idleHandle );
			}
			observer.disconnect();
			window.removeEventListener( 'resize', onResize );
			trigger.kill();
			// Hide the canvas again so the fallback poster is what remains
			// visible — matches §10's "poster/final frame only" simplify
			// contract for a mid-session reduced-motion revert.
			wrapper?.classList.remove( 'is-ready' );
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'image-sequence', initImageSequence );
