/**
 * SGS motion — generative background boot module (Spec 38, D874 technique
 * spec). Tier W, THIRD entry — v1.1 GEOMETRY BUILD.
 *
 * The `@sgs/fx-generative-background` script module the PHP motion registry
 * enqueues when a page renders a block carrying
 * `data-sgs-fx="generative-background"`.
 *
 * ── LAYER STACK (fail-open, weakest artefact first) ─────────────────────────
 *
 *   1. CSS static gradient (`fx-generative-background.css`) — the true no-JS
 *      state, and what every visitor sees before JS runs at all.
 *   2. The organic-field `<canvas>` 2D image (below) — painted FIRST, always,
 *      unconditionally, the instant the four colours parse. This is colour
 *      maths, not rendering — no GPU context needed — so it never fails for
 *      a reason the WebGL layer would also fail for.
 *   3. The WebGL2 folded-ribbon shape (`webgl/generative-background.js`) —
 *      attempted ON TOP, using layer 2's own canvas as its colour texture.
 *      Revealed only after its OWN first successful draw; on any failure,
 *      layer 2 stays exactly as it was already painted.
 *
 * This is the ONLY WebGL context this effect ever opens; it owns the
 * lifecycle (IntersectionObserver / visibilitychange / context-loss / SC
 * 2.2.2 pause / bfcache), mirroring `fx-wave-gradient.js`'s contract.
 *
 * ── WHY AN ALPHA-COMPOSITED ORGANIC FIELD, NOT A GRADIENT ──────────────────
 *
 * Measured directly against the reference's own palette texture (D941/D942):
 * it is not a 1D gradient stretched into a square — colour varies in BOTH
 * directions, its per-pixel "how much ink is here" coverage has real
 * variance (some areas read as genuine white page showing through, some as
 * a single fully-saturated colour, most as a blend between neighbours), and
 * its blob edges are organic/torn rather than smooth circles. A flat
 * horizontal interpolation (this file's previous approach) cannot produce
 * any of that regardless of how many colour stops it uses.
 *
 * `buildFieldImageData()` below reproduces that CATEGORY of texture from our
 * own maths — deterministic per the four client colours (so re-theming
 * reproduces predictably, and two instances with the same colours look the
 * same), with no dependency on any third-party asset: colour blobs are
 * placed procedurally, warped by a small value-noise field for organic
 * (non-circular) edges, and composited with real alpha-over blending in
 * linear-light sRGB starting from a white canvas — the same compositing
 * order that produces genuine white gaps and genuine near-pure patches,
 * which a normalised weighted blend (every pixel forced to sum to 100%
 * colour) structurally cannot.
 *
 * ── FAIL-OPEN ─────────────────────────────────────────────────────────────
 *
 * Both canvases are added and revealed only after their OWN successful first
 * draw. If canvas 2D is unavailable or the colours cannot be parsed, the
 * stylesheet's static CSS gradient stays visible. If WebGL2 is unsupported,
 * a shader fails to compile/link, the capability gate declines, or the
 * context is lost and never recovers, the organic-field 2D-canvas image
 * stays visible — never a blank rectangle.
 *
 * @package
 */

import { createGenerativeBackground } from './webgl/generative-background';
import { prefersReducedMotion } from './motion-utils';

/** Elements the render layer marked. */
const SELECTOR = '[data-sgs-fx="generative-background"]';

/** The four colour custom properties this effect reads, in stop order. */
const COLOUR_PROPS = [
	'--sgs-genbg-1',
	'--sgs-genbg-2',
	'--sgs-genbg-3',
	'--sgs-genbg-4',
];

/** Live instances, so a bfcache restore can tear down before re-init. */
let instances = [];

/*
 * ── Colour parsing (identical approach to fx-wave-gradient.js) ────────────
 * Reused rather than re-invented: a DOM probe validates + normalises any CSS
 * colour syntax, falling back to a 1x1 canvas resolve for colour-function
 * forms (`oklch()`, `color(display-p3 …)`) the DOM probe's computed style
 * may return instead of a plain `rgb()` string.
 */

let colourProbe = null;
function getColourProbe() {
	if ( ! colourProbe ) {
		colourProbe = document.createElement( 'span' );
		colourProbe.style.display = 'none';
		document.body.appendChild( colourProbe );
	}
	return colourProbe;
}

function parseRgbString( str ) {
	const m =
		typeof str === 'string' &&
		str.match( /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i );
	if ( ! m ) {
		return null;
	}
	return [
		parseFloat( m[ 1 ] ) / 255,
		parseFloat( m[ 2 ] ) / 255,
		parseFloat( m[ 3 ] ) / 255,
	];
}

let colourCanvasCtx = null;
function getColourCanvasCtx() {
	if ( colourCanvasCtx === null ) {
		const canvas = document.createElement( 'canvas' );
		canvas.width = 1;
		canvas.height = 1;
		colourCanvasCtx = canvas.getContext( '2d' ) || false;
	}
	return colourCanvasCtx || null;
}

function parseViaCanvas( str ) {
	const ctx = getColourCanvasCtx();
	if ( ! ctx || typeof str !== 'string' || ! str.trim() ) {
		return null;
	}
	ctx.fillStyle = '#000000';
	ctx.fillStyle = str.trim();
	ctx.fillRect( 0, 0, 1, 1 );
	const [ r, g, b ] = ctx.getImageData( 0, 0, 1, 1 ).data;
	return [ r / 255, g / 255, b / 255 ];
}

/**
 * Parse ANY valid CSS colour into 0-1 sRGB. Returns null on anything invalid.
 *
 * @param {string} raw Colour, in any valid CSS colour syntax.
 * @return {number[]|null} [r,g,b] 0-1, or null.
 */
function parseCssColour( raw ) {
	if ( typeof raw !== 'string' || ! raw.trim() ) {
		return null;
	}
	const probe = getColourProbe();
	probe.style.color = '';
	probe.style.color = raw.trim();
	if ( probe.style.color === '' ) {
		return null;
	}
	const computed = getComputedStyle( probe ).color;
	const rgb = parseRgbString( computed );
	if ( rgb ) {
		return rgb;
	}
	return parseViaCanvas( computed );
}

/*
 * ── Linear-light sRGB conversion (public, documented — CSS Color Module
 *    Level 4 reference formulas) ────────────────────────────────────────────
 * Needed so blob compositing below happens in LINEAR light, not gamma-
 * encoded sRGB — compositing two colours in gamma space visibly darkens
 * their overlap versus how light actually combines.
 */

/** sRGB gamma-encoded channel (0-1) -> linear-light. */
function srgbToLinear( c ) {
	const abs = Math.abs( c );
	if ( abs <= 0.04045 ) {
		return c / 12.92;
	}
	return Math.sign( c ) * Math.pow( ( abs + 0.055 ) / 1.055, 2.4 );
}

/** Linear-light channel (0-1) -> sRGB gamma-encoded. */
function linearToSrgb( c ) {
	const abs = Math.abs( c );
	if ( abs > 0.0031308 ) {
		return Math.sign( c ) * ( 1.055 * Math.pow( abs, 1 / 2.4 ) - 0.055 );
	}
	return 12.92 * c;
}

/*
 * ── Deterministic PRNG + value noise ───────────────────────────────────────
 * mulberry32 — public-domain, widely-published 32-bit PRNG (not third-party
 * source in the licence sense; a common one-line utility, same category as
 * the Rodrigues rotation formula already used elsewhere in this effect).
 * Seeded from the four client colours so the same palette always produces
 * the same blob layout, and a different palette produces a different one.
 */
function mulberry32( seed ) {
	let a = seed;
	return function () {
		a |= 0;
		a = ( a + 0x6d2b79f5 ) | 0;
		let t = Math.imul( a ^ ( a >>> 15 ), 1 | a );
		t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t;
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

/**
 * Hash the four sRGB stops into a 32-bit seed.
 *
 * @param {number[][]} stops sRGB 0-1 colours.
 * @return {number} A 32-bit integer seed.
 */
function seedFromColours( stops ) {
	let h = 0x811c9dc5;
	for ( const [ r, g, b ] of stops ) {
		for ( const v of [ r, g, b ] ) {
			h ^= Math.round( v * 255 );
			h = Math.imul( h, 0x01000193 );
		}
	}
	return h >>> 0;
}

/**
 * A small bilinear-interpolated value-noise field, sampled lazily per pixel.
 * Used to warp blob edges so they read as organic/torn rather than smooth
 * circles — matching the reference texture's actual character (measured,
 * D941/D942), not a stylistic flourish.
 *
 * @param {number}   width  Field width, px.
 * @param {number}   height Field height, px.
 * @param {number}   cell   Lattice cell size, px.
 * @param {Function} rng    A `mulberry32()` generator.
 * @return {Function} `(x, y) => number` sampling the smoothed field, 0-1.
 */
function makeValueNoise( width, height, cell, rng ) {
	const gw = Math.floor( width / cell ) + 2;
	const gh = Math.floor( height / cell ) + 2;
	const grid = new Float32Array( gw * gh );
	for ( let i = 0; i < grid.length; i++ ) {
		grid[ i ] = rng();
	}
	const smooth = ( t ) => t * t * ( 3 - 2 * t );
	return ( x, y ) => {
		const gx = x / cell;
		const gy = y / cell;
		const x0 = Math.floor( gx );
		const y0 = Math.floor( gy );
		const x1 = Math.min( x0 + 1, gw - 1 );
		const y1 = Math.min( y0 + 1, gh - 1 );
		const fx = smooth( gx - x0 );
		const fy = smooth( gy - y0 );
		const v00 = grid[ y0 * gw + x0 ];
		const v10 = grid[ y0 * gw + x1 ];
		const v01 = grid[ y1 * gw + x0 ];
		const v11 = grid[ y1 * gw + x1 ];
		const top = v00 * ( 1 - fx ) + v10 * fx;
		const bot = v01 * ( 1 - fx ) + v11 * fx;
		return top * ( 1 - fy ) + bot * fy;
	};
}

/**
 * Build the organic colour-field ImageData: N procedurally-placed, noise-
 * warped colour blobs, alpha-composited over a white canvas in linear-light
 * sRGB. Reproduces the reference palette texture's measured CATEGORY of
 * result — real coverage variance (white gaps, near-pure patches, blended
 * overlaps), never a 1D gradient — from our own maths, with no dependency
 * on any third-party asset (D941/D942).
 *
 * @param {number[][]} stops  sRGB 0-1 colours, exactly 4.
 * @param {number}     width  Image width, px.
 * @param {number}     height Image height, px.
 * @param {Object}     [blobShape] Blob-count/radius override — EXPORTED
 *   and parameterised (rather than left as inline literals) solely so
 *   `scripts/generative-background/verify-field-texture.mjs`'s negative
 *   control can re-run this SAME real generator against the exact
 *   overcorrected D946 config it was reverted from (`N_BLOBS = 26`,
 *   `radius = (0.1 + rng()*0.12) * width`), rather than hand-rolling a
 *   second copy of the compositing maths. Every real caller (this file's
 *   own `attachStaticCanvas()` included) omits it and gets the shipped
 *   defaults below unchanged.
 * @param {number}     [blobShape.nBlobs]      Blob count. Default 36 (shipped).
 * @param {number}     [blobShape.radiusMin]   Radius formula's base fraction of width. Default 0.18 (shipped).
 * @param {number}     [blobShape.radiusRange] Radius formula's random range fraction of width. Default 0.14 (shipped).
 * @return {ImageData} The built image.
 */
export function buildFieldImageData( stops, width, height, { nBlobs = 36, radiusMin = 0.18, radiusRange = 0.14 } = {} ) {
	const rng = mulberry32( seedFromColours( stops ) );
	// ⚠ Blob scale is calibrated against TWO measurements, not guessed — read
	// both before changing these numbers. (1) A UV-visualisation debug render
	// of the actual folded geometry proved the on-screen ribbon only ever
	// samples roughly the top ~45% of this canvas's V range, though it uses
	// the full U range — any layout tuned to "look right" on the whole
	// 320x320 canvas has roughly HALF its detail invisible on the real shape,
	// which is why blob density needs to be high enough to hold up in ANY
	// sub-window. (2) The reference's own palette-a.png measures only 0.8%
	// near-white ("how much ink is here" < 0.10) — an earlier version of this
	// generator (11 large blobs) had ~0% near-white, then an over-correction
	// (26 small blobs) measured 24-35% near-white on the actual deployed
	// output, which is what read as "so many white splotches" live. These
	// constants (36 blobs, larger radius, higher core alpha) were swept
	// against a real white-percentage measurement across 6 seeds before
	// shipping (avg 3.3%, range 1.5-6.7%) — close to the reference's 0.8%
	// without erasing genuine gaps entirely.
	const noiseX = makeValueNoise( width, height, width * 0.12, mulberry32( rng() * 4294967296 ) );
	const noiseY = makeValueNoise( width, height, width * 0.12, mulberry32( rng() * 4294967296 ) );

	const stopsLinear = stops.map( ( [ r, g, b ] ) => [
		srgbToLinear( r ),
		srgbToLinear( g ),
		srgbToLinear( b ),
	] );

	const N_BLOBS = nBlobs;
	const blobs = [];
	for ( let i = 0; i < N_BLOBS; i++ ) {
		const radius = ( radiusMin + rng() * radiusRange ) * width;
		blobs.push( {
			cx: rng() * width,
			cy: rng() * height,
			radius,
			coreFrac: 0.15 + rng() * 0.25,
			coreAlpha: 0.85 + rng() * 0.15,
			colour: stopsLinear[ i % stopsLinear.length ],
		} );
	}
	// Random draw order so no single colour slot systematically paints last
	// (and therefore always "wins" every overlap) on every instance.
	for ( let i = blobs.length - 1; i > 0; i-- ) {
		const j = Math.floor( rng() * ( i + 1 ) );
		[ blobs[ i ], blobs[ j ] ] = [ blobs[ j ], blobs[ i ] ];
	}

	const data = new Uint8ClampedArray( width * height * 4 );
	for ( let y = 0; y < height; y++ ) {
		for ( let x = 0; x < width; x++ ) {
			const warpX = ( noiseX( x, y ) - 0.5 ) * width * 0.1;
			const warpY = ( noiseY( x, y ) - 0.5 ) * height * 0.1;

			// Alpha-over compositing, linear-light, starting from white.
			// `coverage` accumulates alongside colour using the SAME
			// Porter-Duff "over" formula — this is the real per-pixel "how
			// much ink is here" value, written to the canvas's own alpha
			// channel below instead of a hardcoded opaque 255. Without this,
			// every "white gap" pixel is baked as literal opaque white RGB,
			// which renders wrong on a dark ground preset (D946/1a).
			let r = 1;
			let g = 1;
			let b = 1;
			let coverage = 0;
			for ( const blob of blobs ) {
				const dx = x - blob.cx + warpX;
				const dy = y - blob.cy + warpY;
				const d = Math.sqrt( dx * dx + dy * dy );
				// Smoothstep from a flat full-alpha core to zero at radius —
				// NOT a power falloff starting at the centre, which never lets
				// a blob reach true near-full coverage anywhere.
				const edge0 = blob.radius * blob.coreFrac;
				const t = Math.min( 1, Math.max( 0, ( d - edge0 ) / ( blob.radius - edge0 ) ) );
				const fall = t * t * ( 3 - 2 * t );
				const a = blob.coreAlpha * ( 1 - fall );
				r = blob.colour[ 0 ] * a + r * ( 1 - a );
				g = blob.colour[ 1 ] * a + g * ( 1 - a );
				b = blob.colour[ 2 ] * a + b * ( 1 - a );
				coverage = a + coverage * ( 1 - a );
			}

			const i = ( y * width + x ) * 4;
			data[ i ] = Math.round( linearToSrgb( r ) * 255 );
			data[ i + 1 ] = Math.round( linearToSrgb( g ) * 255 );
			data[ i + 2 ] = Math.round( linearToSrgb( b ) * 255 );
			data[ i + 3 ] = Math.round( coverage * 255 );
		}
	}
	return new ImageData( data, width, height );
}

/** Build resolution — small, per the technique spec's own "256-512px square" guidance. */
const IMAGE_WIDTH = 320;
const IMAGE_HEIGHT = 320;

/**
 * Read the four colours off the element's own computed custom properties.
 *
 * Deliberately read from COMPUTED STYLE rather than data attributes: the
 * client may pick a palette SLUG, which resolves to a
 * `var(--wp--preset--color--...)` the stylesheet knows and JS does not. Reading
 * the computed value means re-theming a site re-colours the gradient with no
 * JS change.
 *
 * @param {HTMLElement} el The marked element.
 * @return {number[][]|null} Four sRGB 0-1 colours, or null if unusable.
 */
function readColours( el ) {
	const cs = getComputedStyle( el );
	const out = [];
	for ( const prop of COLOUR_PROPS ) {
		const raw = cs.getPropertyValue( prop );
		const rgb = parseCssColour( raw );
		if ( ! rgb ) {
			// eslint-disable-next-line no-console
			console.warn(
				`SGS generative-background: could not parse colour "${ raw.trim() }" for ${ prop } — effect not started.`,
				el
			);
			return null;
		}
		out.push( rgb );
	}
	return out;
}

/**
 * Attach the layer-2 OKLCH 2D-canvas image — always attempted first,
 * unconditionally, and used as the WebGL layer's own colour texture.
 *
 * @param {HTMLElement}  el      The marked element.
 * @param {number[][]}   colours Four sRGB 0-1 colours.
 * @return {HTMLCanvasElement|null} The painted canvas, or null on failure.
 */
function attachStaticCanvas( el, colours ) {
	const canvas = document.createElement( 'canvas' );
	canvas.className = 'sgs-generative-background__canvas';
	canvas.width = IMAGE_WIDTH;
	canvas.height = IMAGE_HEIGHT;
	canvas.setAttribute( 'aria-hidden', 'true' );

	const ctx = canvas.getContext( '2d' );
	if ( ! ctx ) {
		return null;
	}

	const imageData = buildFieldImageData( colours, IMAGE_WIDTH, IMAGE_HEIGHT );
	ctx.putImageData( imageData, 0, 0 );

	el.appendChild( canvas );
	el.setAttribute( 'data-sgs-genbg-active', '1' );

	return canvas;
}

/**
 * Attach the layer-3 WebGL folded-ribbon shape, on top of an already-painted
 * static canvas. Fully async (geometry build is a Worker round-trip) — the
 * static canvas is the visible state for the whole time this is settling.
 *
 * Mirrors `fx-wave-gradient.js`'s lifecycle contract: IntersectionObserver +
 * visibilitychange pausing, context-loss recovery (falls back to the static
 * canvas, never a dead rectangle), reduced-motion draws one frame and stops,
 * a real SC 2.2.2 pause control, full `destroy()` teardown.
 *
 * @param {HTMLElement}       el           The marked element.
 * @param {HTMLCanvasElement} staticCanvas The already-painted layer-2 canvas.
 * @return {Object|null} A teardown record, or null if WebGL never started.
 */
function attachWebglLayer( el, staticCanvas ) {
	const canvas = document.createElement( 'canvas' );
	canvas.className = 'sgs-generative-background__webgl-canvas';
	canvas.setAttribute( 'aria-hidden', 'true' );

	const speedRaw = parseFloat( el.getAttribute( 'data-sgs-fx-gen-speed' ) );
	const speed = isNaN( speedRaw ) ? 1 : Math.max( 0.1, Math.min( 3, speedRaw / 50 ) );

	/*
	 * The eight geometry-mechanism attributes (v1.2 rewrite) — read as plain
	 * numbers off the marked element, `undefined` when absent/unparseable so
	 * `createGenerativeBackground()`'s own calibrated defaults stand rather
	 * than being overridden by `NaN`.
	 */
	const readNumberAttr = ( name ) => {
		const raw = parseFloat( el.getAttribute( name ) );
		return isNaN( raw ) ? undefined : raw;
	};
	const dispAmount = readNumberAttr( 'data-sgs-fx-gen-disp-amount' );
	const dispFreqX = readNumberAttr( 'data-sgs-fx-gen-disp-freq-x' );
	const dispFreqZ = readNumberAttr( 'data-sgs-fx-gen-disp-freq-z' );
	const foldFreq1 = readNumberAttr( 'data-sgs-fx-gen-fold-freq-1' );
	const foldFreq2 = readNumberAttr( 'data-sgs-fx-gen-fold-freq-2' );
	const foldFreq3 = readNumberAttr( 'data-sgs-fx-gen-fold-freq-3' );
	const foldPower1 = readNumberAttr( 'data-sgs-fx-gen-fold-power-1' );
	const foldPower2 = readNumberAttr( 'data-sgs-fx-gen-fold-power-2' );
	const foldPower3 = readNumberAttr( 'data-sgs-fx-gen-fold-power-3' );

	/*
	 * Striation / glow-gate + depth-fade params (§3, 2026-08-28 build).
	 */
	const glowAmount = readNumberAttr( 'data-sgs-fx-gen-glow-amount' );
	const glowPower = readNumberAttr( 'data-sgs-fx-gen-glow-power' );
	const glowRamp = readNumberAttr( 'data-sgs-fx-gen-glow-ramp' );
	const striationStrength = readNumberAttr( 'data-sgs-fx-gen-striation-strength' );
	const striationFreq = readNumberAttr( 'data-sgs-fx-gen-striation-freq' );
	const colourAttenuation = readNumberAttr( 'data-sgs-fx-gen-colour-attenuation' );
	const parabolaPower = readNumberAttr( 'data-sgs-fx-gen-parabola-power' );

	// Depth fade mixes toward this — the SAME `--sgs-genbg-ground` custom
	// property the CSS fallback and `sgs_apply_fx_generative_background()`
	// already resolve (module docblock), read via the same colour-probe
	// parser `readColours()` above uses so any valid CSS colour syntax works.
	const groundColour = parseCssColour(
		getComputedStyle( el ).getPropertyValue( '--sgs-genbg-ground' )
	);

	let handle = null;
	let cancelled = false;
	let frame = null;
	let visible = false;
	let paused = el.getAttribute( 'data-sgs-genbg-paused' ) === '1';
	let started = false;
	let elapsed = 0;
	let last = 0;

	const sizeToElement = () => {
		if ( ! handle ) {
			return;
		}
		const rect = el.getBoundingClientRect();
		handle.resize( rect.width, rect.height, window.devicePixelRatio );
	};

	const tick = ( now ) => {
		if ( ! last ) {
			last = now;
		}
		elapsed += ( now - last ) * 0.001;
		last = now;
		if ( ! handle.draw( elapsed ) ) {
			stop();
			return;
		}
		if ( ! started ) {
			started = true;
			el.setAttribute( 'data-sgs-genbg-webgl-active', '1' );
		}
		frame = requestAnimationFrame( tick );
	};

	function start() {
		if ( ! handle || frame !== null || paused || ! visible || document.hidden ) {
			return;
		}
		if ( prefersReducedMotion() ) {
			// Draw ONE frame and stop — the folded shape is a legitimate still
			// image (§10 SIMPLIFY, never suppress).
			sizeToElement();
			if ( handle.draw( 0 ) ) {
				el.setAttribute( 'data-sgs-genbg-webgl-active', '1' );
			}
			return;
		}
		last = 0;
		frame = requestAnimationFrame( tick );
	}

	function stop() {
		if ( frame !== null ) {
			cancelAnimationFrame( frame );
			frame = null;
		}
	}

	let observer = null;
	let onVisibility = null;
	let resizeObserver = null;
	let toggle = null;
	let onToggle = null;

	const teardownRecord = {
		destroy: () => {
			cancelled = true;
			stop();
			if ( observer ) {
				observer.disconnect();
			}
			if ( onVisibility ) {
				document.removeEventListener( 'visibilitychange', onVisibility );
			}
			if ( resizeObserver ) {
				resizeObserver.disconnect();
			}
			if ( toggle && onToggle ) {
				toggle.removeEventListener( 'click', onToggle );
			}
			if ( handle ) {
				handle.destroy();
			}
			canvas.remove();
			el.removeAttribute( 'data-sgs-genbg-webgl-active' );
		},
	};

	createGenerativeBackground( canvas, {
		textureSource: staticCanvas,
		speed,
		dispAmount,
		dispFreqX,
		dispFreqZ,
		foldFreq1,
		foldFreq2,
		foldFreq3,
		foldPower1,
		foldPower2,
		foldPower3,
		groundColour,
		glowAmount,
		glowPower,
		glowRamp,
		striationStrength,
		striationFreq,
		colourAttenuation,
		parabolaPower,
		// Context loss is the one stop() caller that must also drop the active
		// flag — every other stop() is temporary and must not flash the static
		// canvas back into view (it never left; the WebGL layer just sits on
		// top of it, so "falling back" here is simply not revealing/hiding
		// this layer, not swapping anything).
		onLost: () => {
			stop();
			el.removeAttribute( 'data-sgs-genbg-webgl-active' );
		},
	} ).then( ( created ) => {
		if ( cancelled || ! created ) {
			return;
		}
		handle = created;

		el.appendChild( canvas );
		sizeToElement();

		observer = new IntersectionObserver(
			( entries ) => {
				visible = entries.some( ( e ) => e.isIntersecting );
				if ( visible ) {
					sizeToElement();
					start();
				} else {
					stop();
				}
			},
			{ rootMargin: '100px' }
		);
		observer.observe( el );

		onVisibility = () => ( document.hidden ? stop() : start() );
		document.addEventListener( 'visibilitychange', onVisibility );

		resizeObserver = new ResizeObserver( () => {
			sizeToElement();
			if ( frame === null ) {
				handle.draw( elapsed );
			}
		} );
		resizeObserver.observe( el );

		// The SC 2.2.2 pause control the render layer emitted.
		toggle = el.querySelector( '[data-sgs-genbg-toggle]' );
		onToggle = () => {
			paused = ! paused;
			el.setAttribute( 'data-sgs-genbg-paused', paused ? '1' : '0' );
			toggle.setAttribute( 'aria-pressed', paused ? 'true' : 'false' );
			if ( paused ) {
				stop();
			} else {
				start();
			}
		};
		if ( toggle ) {
			toggle.hidden = false;
			toggle.addEventListener( 'click', onToggle );
		}

		start();
	} );

	return teardownRecord;
}

/**
 * Attach one instance: the static OKLCH canvas first (unconditional), then
 * attempt the WebGL folded-ribbon layer on top of it.
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object|null} A teardown record, or null if nothing was drawn.
 */
function attach( el ) {
	const colours = readColours( el );
	if ( ! colours ) {
		return null;
	}

	const staticCanvas = attachStaticCanvas( el, colours );
	if ( ! staticCanvas ) {
		return null;
	}

	const webglRecord = attachWebglLayer( el, staticCanvas );

	return {
		destroy: () => {
			if ( webglRecord ) {
				webglRecord.destroy();
			}
			staticCanvas.remove();
			el.removeAttribute( 'data-sgs-genbg-active' );
		},
	};
}

/**
 * Attach every marked element on the page.
 *
 * @return {void}
 */
function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		const instance = attach( el );
		if ( instance ) {
			instances.push( instance );
		}
	} );
}

/**
 * Tear every instance down.
 *
 * @return {void}
 */
function teardown() {
	instances.forEach( ( i ) => i.destroy() );
	instances = [];
}

boot();

// bfcache (§1.6) — same discipline as fx-wave-gradient.js: a back-navigation
// restores the page from memory without re-running module code, so a full
// teardown/re-boot is the safe move rather than trusting stale canvases.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
