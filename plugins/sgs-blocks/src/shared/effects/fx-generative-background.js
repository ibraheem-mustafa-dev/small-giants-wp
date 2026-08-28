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
 *   2. The OKLCH-built `<canvas>` 2D image (below) — painted FIRST, always,
 *      unconditionally, the instant the four colours parse. This is colour
 *      maths, not rendering — no GPU context needed — so it never fails for
 *      a reason the WebGL layer would also fail for.
 *   3. The WebGL2 folded-ribbon shape (`webgl/generative-background.js`) —
 *      attempted ON TOP, using layer 2's own canvas as its colour texture
 *      (§2 — "reuse Step 1's OKLCH build code, don't reimplement"). Revealed
 *      only after its OWN first successful draw; on any failure, layer 2
 *      stays exactly as it was already painted.
 *
 * This is the ONLY WebGL context this effect ever opens; it owns the
 * lifecycle (IntersectionObserver / visibilitychange / context-loss / SC
 * 2.2.2 pause / bfcache), mirroring `fx-wave-gradient.js`'s contract.
 *
 * ── WHY OKLCH, NOT A PLAIN CSS/CANVAS GRADIENT ─────────────────────────────
 *
 * `CanvasRenderingContext2D.createLinearGradient()` interpolates in sRGB,
 * which produces a visible muddy grey band between non-hue-adjacent colours
 * (a straight chord across the hue circle dips toward its centre — true in
 * sRGB, linear RGB, Lab AND OKLab, since all four are Cartesian). OKLCH is
 * the POLAR form of the same perceptual space (Lightness, Chroma, hue
 * Angle): interpolating hue as an ANGLE around the wheel — the shorter arc —
 * routes around that grey centre instead of through it. This module
 * therefore does its own per-pixel interpolation and writes the result via
 * `putImageData`, rather than delegating to the canvas gradient API.
 *
 * The conversion pipeline (sRGB gamma -> linear-light sRGB -> LMS -> OKLab ->
 * OKLCH, and the same steps in reverse) is documented, public maths — the
 * CSS Color Module Level 4 reference formulas, credited to Björn Ottosson's
 * OKLab publication. No third-party shader or library source is used or
 * ported (KJC-4, `.claude/plans/2026-08-27-generative-background-engine.md`).
 *
 * ── FAIL-OPEN ─────────────────────────────────────────────────────────────
 *
 * Both canvases are added and revealed only after their OWN successful first
 * draw. If canvas 2D is unavailable or the colours cannot be parsed, the
 * stylesheet's static CSS gradient stays visible. If WebGL2 is unsupported,
 * a shader fails to compile/link, the capability gate declines, or the
 * context is lost and never recovers, the OKLCH 2D-canvas image stays
 * visible — never a blank rectangle.
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
 * ── OKLCH colour maths (CSS Color Module Level 4 reference formulas) ──────
 * Public, documented conversion pipeline. Written from the published
 * matrices, not ported from any third-party source.
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

/** Linear-light sRGB [r,g,b] -> OKLab [L,a,b]. */
function linearSrgbToOklab( [ r, g, b ] ) {
	const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
	const l_ = Math.cbrt( l );
	const m_ = Math.cbrt( m );
	const s_ = Math.cbrt( s );
	return [
		0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
		1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
		0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
	];
}

/** OKLab [L,a,b] -> linear-light sRGB [r,g,b]. */
function oklabToLinearSrgb( [ L, a, b ] ) {
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;
	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

/** sRGB 0-1 [r,g,b] -> OKLCH {l, c, h(degrees)}. */
function srgbToOklch( rgb ) {
	const linear = rgb.map( srgbToLinear );
	const [ L, a, b ] = linearSrgbToOklab( linear );
	const c = Math.sqrt( a * a + b * b );
	let h = ( Math.atan2( b, a ) * 180 ) / Math.PI;
	if ( h < 0 ) {
		h += 360;
	}
	return { l: L, c, h };
}

/** OKLCH {l, c, h(degrees)} -> sRGB 0-1 [r,g,b], gamut-clamped. */
function oklchToSrgb( { l, c, h } ) {
	const hRad = ( h * Math.PI ) / 180;
	const a = c * Math.cos( hRad );
	const b = c * Math.sin( hRad );
	const linear = oklabToLinearSrgb( [ l, a, b ] );
	// Gamma round-trip, then clamp to the sRGB gamut — an OKLCH interpolation
	// between two in-gamut colours can produce an out-of-gamut intermediate;
	// an unclamped value produces a colour-clipping artefact that looks
	// exactly like the banding this whole fix exists to remove.
	return linear.map( ( v ) => Math.max( 0, Math.min( 1, linearToSrgb( v ) ) ) );
}

/**
 * Interpolate the hue ANGLE around the shorter arc — a polar interpolation
 * needs a stated direction, unlike a Cartesian one.
 *
 * @param {number} h1 Start hue, degrees.
 * @param {number} h2 End hue, degrees.
 * @param {number} t  0-1 interpolation factor.
 * @return {number} Interpolated hue, degrees (0-360).
 */
function lerpHue( h1, h2, t ) {
	let delta = h2 - h1;
	if ( delta > 180 ) {
		delta -= 360;
	} else if ( delta < -180 ) {
		delta += 360;
	}
	let h = h1 + delta * t;
	if ( h < 0 ) {
		h += 360;
	}
	return h % 360;
}

/**
 * Interpolate between two OKLCH colours: L and C linearly, hue around the
 * shorter arc (§2's colour-space correction).
 *
 * @param {Object} a OKLCH start.
 * @param {Object} b OKLCH end.
 * @param {number} t 0-1 interpolation factor.
 * @return {Object} OKLCH midpoint.
 */
function lerpOklch( a, b, t ) {
	return {
		l: a.l + ( b.l - a.l ) * t,
		c: a.c + ( b.c - a.c ) * t,
		h: lerpHue( a.h, b.h, t ),
	};
}

/**
 * Build the gradient ImageData: N evenly-spaced stops, interpolated in OKLCH
 * along the shorter hue arc between each adjacent pair, painted as a
 * horizontal band replicated down every row.
 *
 * @param {number[][]} stops sRGB 0-1 colours, in stop order.
 * @param {number}     width Image width, px.
 * @param {number}     height Image height, px.
 * @return {ImageData} The built image.
 */
function buildGradientImageData( stops, width, height ) {
	const oklchStops = stops.map( srgbToOklch );
	const segments = oklchStops.length - 1;
	const row = new Uint8ClampedArray( width * 4 );

	for ( let x = 0; x < width; x++ ) {
		const pos = segments <= 0 ? 0 : ( x / ( width - 1 ) ) * segments;
		const seg = Math.min( segments - 1, Math.floor( pos ) );
		const t = segments <= 0 ? 0 : pos - seg;
		const oklch = lerpOklch( oklchStops[ seg ], oklchStops[ seg + 1 ], t );
		const [ r, g, b ] = oklchToSrgb( oklch );
		const i = x * 4;
		row[ i ] = Math.round( r * 255 );
		row[ i + 1 ] = Math.round( g * 255 );
		row[ i + 2 ] = Math.round( b * 255 );
		row[ i + 3 ] = 255;
	}

	const data = new Uint8ClampedArray( width * height * 4 );
	for ( let y = 0; y < height; y++ ) {
		data.set( row, y * width * 4 );
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

	const imageData = buildGradientImageData( colours, IMAGE_WIDTH, IMAGE_HEIGHT );
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
