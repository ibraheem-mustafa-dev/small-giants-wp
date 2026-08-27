/**
 * SGS motion — generative background boot module (Spec 38, D874 technique
 * spec). Tier W, THIRD entry — v1 STATIC BUILD ONLY.
 *
 * The `@sgs/fx-generative-background` script module the PHP motion registry
 * enqueues when a page renders a block carrying
 * `data-sgs-fx="generative-background"`.
 *
 * ⛔ NO WEBGL, NO SHADER, NO PER-FRAME ANIMATION. Per the technique spec's
 * Assembly & priority order §1 (build order step 1): a single OKLCH-
 * interpolated gradient IMAGE, built once on a `<canvas>` 2D context and
 * painted as a static background. This is colour maths, not rendering — it
 * needs no GPU context at all. §1's folded-plane geometry and its Animation
 * subsection are v1.1, a separate, later, design-gated build.
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
 * The canvas is added and revealed ONLY after a successful first draw. If
 * canvas 2D is unavailable or the colours cannot be parsed, the stylesheet's
 * static CSS gradient stays visible — built from the SAME custom properties
 * (a weaker, sRGB-only artefact — see `fx-generative-background.css`'s own
 * docblock), so it carries the client's own colours regardless.
 *
 * @package
 */

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
 * `var(--wp--preset--...)` the stylesheet knows and JS does not. Reading the
 * computed value means re-theming a site re-colours the gradient with no JS
 * change.
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
 * Attach one instance.
 *
 * @param {HTMLElement} el The marked element.
 * @return {Object|null} A teardown record, or null if nothing was drawn.
 */
function attach( el ) {
	const colours = readColours( el );
	if ( ! colours ) {
		return null;
	}

	const canvas = document.createElement( 'canvas' );
	canvas.className = 'sgs-generative-background__canvas';
	canvas.width = IMAGE_WIDTH;
	canvas.height = IMAGE_HEIGHT;
	// aria-hidden: it is decoration with no informational content.
	canvas.setAttribute( 'aria-hidden', 'true' );

	const ctx = canvas.getContext( '2d' );
	if ( ! ctx ) {
		return null;
	}

	const imageData = buildGradientImageData(
		colours,
		IMAGE_WIDTH,
		IMAGE_HEIGHT
	);
	ctx.putImageData( imageData, 0, 0 );

	el.appendChild( canvas );
	el.setAttribute( 'data-sgs-genbg-active', '1' );

	return {
		destroy: () => {
			canvas.remove();
			el.removeAttribute( 'data-sgs-genbg-active' );
		},
	};
}

/**
 * Attach every marked element on the page. Static build, so reduced motion
 * changes nothing here — there is no motion to simplify or suppress; this
 * is the finished state either way (Spec 38 §10 SIMPLIFY contract, honoured
 * by construction rather than by a branch). v1.1's own boot module will need
 * `prefersReducedMotion` once real per-frame motion exists; v1 has none.
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
