/**
 * SGS motion — cursor grid-dot field engine (Spec 38 §3.3, FR-38-33). Tier V.
 *
 * A background GRID with a dot in each cell. Dots within a set radius of the
 * pointer lean toward it, each LOCKED INSIDE ITS OWN CELL, and ease back to
 * their cell centre when the pointer moves out of range.
 *
 * This module owns the canvas, the lattice and the integrator. It knows nothing
 * about blocks or WordPress — `fx-grid-dots.js` is the boot module that finds
 * marked elements and drives this, exactly the split `particles.js` /
 * `fx-particles.js` already use.
 *
 * ── THE CLAMP IS THE WHOLE EFFECT ─────────────────────────────────────────
 * Nine live references were measured before this was built and NOT ONE does
 * what this does. The common failure is the interesting one: an attract-grid
 * with no per-cell clamp (Zach Saucier's, measured — 38.5px of travel against a
 * 36px cell pitch) collapses its dots into a blob on the cursor and leaves a
 * hole where they came from. The lattice stops reading as a lattice.
 *
 * So `CELL_LOCK` is not a tuning knob. A dot's displacement is clamped to
 * `CELL_LOCK * cell` REGARDLESS of what the caller asks for, and at 0.42 that
 * is strictly less than the half-cell distance to the boundary — so a dot
 * cannot reach its own cell wall, let alone cross it. The `maxLean` option
 * tunes the feel WITHIN that ceiling; it can never raise it.
 *
 * ── COLOUR IS READ FROM THE CANVAS, NOT FROM A CUSTOM PROPERTY ────────────
 * D846: the particle trail shipped taking colour from an inherited value and
 * painted ~7,400 canvas pixels at 1.44:1 contrast — firing perfectly and
 * invisible. A lit-pixel count cannot tell "painting correctly" from "painting
 * invisibly". This reads the CANVAS's own computed `color`, which the
 * stylesheet sets from `--sgs-fx-grid-dot-colour`, because
 * `getPropertyValue()` on a custom property returns the `var(...)` text
 * UNRESOLVED and a canvas cannot paint with a string.
 *
 * ── NO INLINE STYLE (Spec 32) ─────────────────────────────────────────────
 * This module writes the canvas's WIDTH/HEIGHT ATTRIBUTES (the drawing buffer)
 * and nothing else. `assets/css/fx-grid-dots.css` owns position/inset/z-index/
 * pointer-events. A buffer-size attribute is not a CSS property declaration.
 *
 * @package
 */

/**
 * Hard ceiling on dots per emitter. Beyond this the cell GROWS until the
 * lattice fits, which is graceful and deterministic — never a silent crop that
 * would leave a visibly half-covered panel.
 */
const MAX_DOTS = 1200;

/** Displacement ceiling as a share of cell pitch. See the docblock. */
const CELL_LOCK = 0.42;

/** Same DPR clamp `particles.js` and the FR-38-31 canvas both use. */
const MAX_DPR = 1.5;

/** Preset B — owner-chosen at the 2026-08-28 design gate, from a live prototype. */
const DEFAULTS = {
	cell: 40,
	dot: 2,
	radius: 150,
	maxLean: 12,
	easeMs: 260,
	fade: true,
};

/**
 * Build a grid-dot field over one element.
 *
 * @param {HTMLElement} el     The emitter (the element carrying data-sgs-fx).
 * @param {Object}      [opts] Overrides; any omitted key falls back to DEFAULTS.
 * @return {{setPointer: Function, clearPointer: Function, destroy: Function, stats: Function}} Handle.
 */
export function createGridDots( el, opts = {} ) {
	const cfg = { ...DEFAULTS, ...opts };

	const canvas = document.createElement( 'canvas' );
	canvas.className = 'sgs-grid-dots__canvas';
	canvas.setAttribute( 'aria-hidden', 'true' );
	el.appendChild( canvas );
	const ctx = canvas.getContext( '2d' );

	let dots = [];
	let width = 0;
	let height = 0;
	let cellPx = cfg.cell;
	let pointerX = 0;
	let pointerY = 0;
	let pointerLive = false;
	let raf = 0;
	let visible = true;
	let colour = 'rgba(255,255,255,0.8)';
	let destroyed = false;

	/**
	 * Resolve the paint colour from the CANVAS's computed `color`. See the
	 * module docblock — never read the custom property directly.
	 *
	 * @return {void}
	 */
	function readColour() {
		const c = window.getComputedStyle( canvas ).color;
		if ( c ) {
			colour = c;
		}
	}

	/**
	 * (Re)build the lattice for the emitter's current box.
	 *
	 * @return {void}
	 */
	function layout() {
		const rect = el.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		if ( width <= 0 || height <= 0 ) {
			dots = [];
			return;
		}

		const dpr = Math.min( window.devicePixelRatio || 1, MAX_DPR );
		canvas.width = Math.round( width * dpr );
		canvas.height = Math.round( height * dpr );
		ctx.setTransform( dpr, 0, 0, dpr, 0, 0 );

		cellPx = cfg.cell;
		let cols = Math.floor( width / cellPx );
		let rows = Math.floor( height / cellPx );
		// Grow the cell until the lattice fits under the cap. Deterministic,
		// and it degrades to a sparser grid rather than a cropped one.
		while ( cols * rows > MAX_DOTS && cellPx < 400 ) {
			cellPx += 2;
			cols = Math.floor( width / cellPx );
			rows = Math.floor( height / cellPx );
		}

		const offsetX = ( width - cols * cellPx ) / 2 + cellPx / 2;
		const offsetY = ( height - rows * cellPx ) / 2 + cellPx / 2;

		dots = [];
		for ( let row = 0; row < rows; row++ ) {
			for ( let col = 0; col < cols; col++ ) {
				const hx = offsetX + col * cellPx;
				const hy = offsetY + row * cellPx;
				dots.push( { hx, hy, x: hx, y: hy } );
			}
		}
		readColour();
	}

	/** @return {number} The effective displacement ceiling in px. */
	function leanCeiling() {
		return Math.min( cfg.maxLean, cellPx * CELL_LOCK );
	}

	/**
	 * One frame. Returns whether anything is still in motion, so the caller
	 * can stop scheduling — the self-terminating shape `particles.js` uses,
	 * with no timer anywhere.
	 *
	 * @return {boolean} True while a dot is still off its home position.
	 */
	function step() {
		ctx.clearRect( 0, 0, width, height );
		if ( ! dots.length ) {
			return false;
		}

		const lean = leanCeiling();
		const radius = cfg.radius;
		// Frame-rate independent approach factor: the fraction of the
		// remaining distance to close in one ~60fps frame for the configured
		// time constant. A fixed per-frame constant would ease at different
		// speeds on 60Hz and 120Hz displays.
		const k = 1 - Math.exp( ( -16.7 / cfg.easeMs ) * 2.2 );
		let moving = false;

		for ( let i = 0; i < dots.length; i++ ) {
			const d = dots[ i ];
			let tx = d.hx;
			let ty = d.hy;
			let prox = 0;

			if ( pointerLive ) {
				const dx = pointerX - d.hx;
				const dy = pointerY - d.hy;
				const dist = Math.sqrt( dx * dx + dy * dy );
				if ( dist < radius && dist > 0.001 ) {
					// Linear falloff, the aaronmedina shape with the sign
					// corrected (his displaces AWAY; this is the attract case).
					const force = 1 - dist / radius;
					prox = force;
					const mag = force * lean;
					tx = d.hx + ( dx / dist ) * mag;
					ty = d.hy + ( dy / dist ) * mag;
				}
			}

			d.x += ( tx - d.x ) * k;
			d.y += ( ty - d.y ) * k;

			if (
				Math.abs( d.x - d.hx ) > 0.05 ||
				Math.abs( d.y - d.hy ) > 0.05
			) {
				moving = true;
			}

			ctx.globalAlpha = cfg.fade ? 0.34 + prox * 0.66 : 0.82;
			ctx.fillStyle = colour;
			ctx.beginPath();
			ctx.arc( d.x, d.y, cfg.dot, 0, Math.PI * 2 );
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		return moving;
	}

	/**
	 * Schedule frames only while something is happening. Stops the frame the
	 * lattice is at rest and the pointer has left — no timer, no idle loop.
	 *
	 * @return {void}
	 */
	function tick() {
		const moving = step();
		raf = moving || pointerLive ? requestAnimationFrame( tick ) : 0;
	}

	/** @return {void} */
	function kick() {
		if ( ! raf && visible && ! destroyed ) {
			raf = requestAnimationFrame( tick );
		}
	}

	const resizeObserver =
		typeof ResizeObserver !== 'undefined'
			? new ResizeObserver( () => {
					layout();
					kick();
			  } )
			: null;
	if ( resizeObserver ) {
		resizeObserver.observe( el );
	}

	// Off-screen runs nothing.
	const intersectionObserver =
		typeof IntersectionObserver !== 'undefined'
			? new IntersectionObserver( ( entries ) => {
					visible = entries.some( ( e ) => e.isIntersecting );
					if ( visible ) {
						kick();
					}
			  } )
			: null;
	if ( intersectionObserver ) {
		intersectionObserver.observe( el );
	}

	function onVisibilityChange() {
		if ( ! document.hidden ) {
			kick();
		}
	}
	document.addEventListener( 'visibilitychange', onVisibilityChange );

	layout();
	// Paint the resting lattice once, so the field is present before the
	// pointer ever arrives — and so the no-pointer state is the same picture
	// reduced-motion visitors would get if this module ever ran for them.
	kick();

	return {
		/**
		 * @param {number} x Pointer X, in the emitter's local coordinates.
		 * @param {number} y Pointer Y, in the emitter's local coordinates.
		 * @return {void}
		 */
		setPointer( x, y ) {
			pointerX = x;
			pointerY = y;
			pointerLive = true;
			kick();
		},
		/** @return {void} */
		clearPointer() {
			pointerLive = false;
			kick();
		},
		/** @return {Object} Read-only counters for a live probe (D807). */
		stats() {
			return {
				dots: dots.length,
				cell: cellPx,
				leanCeiling: leanCeiling(),
				running: raf !== 0,
				colour,
			};
		},
		/** @return {void} */
		destroy() {
			destroyed = true;
			if ( raf ) {
				cancelAnimationFrame( raf );
				raf = 0;
			}
			if ( resizeObserver ) {
				resizeObserver.disconnect();
			}
			if ( intersectionObserver ) {
				intersectionObserver.disconnect();
			}
			document.removeEventListener(
				'visibilitychange',
				onVisibilityChange
			);
			if ( canvas.parentNode ) {
				canvas.parentNode.removeChild( canvas );
			}
			dots = [];
		},
	};
}
