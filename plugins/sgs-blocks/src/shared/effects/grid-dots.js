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
 * There are TWO such channels: `color` for the resting colour and
 * `text-decoration-color` for the colour at the pointer. Text decoration does
 * not render on a canvas, so the second is inert and carries data only.
 *
 * ── OPACITY BELONGS TO THE COLOUR, NOT TO THE ENGINE (2026-08-28) ──────────
 * This module used to force `globalAlpha = 0.34 + prox * 0.66`. Canvas
 * MULTIPLIES globalAlpha by the fill colour's own alpha, so that constant
 * quietly overrode whatever the client picked — a lattice set to an opaque
 * brand colour still painted at roughly a third, which is how the field
 * shipped at ~1.3:1 against a client's own cream background while every gate
 * stayed green. globalAlpha is now left at 1 and the alpha travels in the
 * colour, where the client's picker can reach it.
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
	shape: 'circle',
};

/**
 * Marker shapes that carry an ORIENTATION, and so rotate to point at the
 * pointer. For everything else the angle is never computed at all.
 *
 * This is the "magnetic filings" pattern rather than an invention: a lattice of
 * line segments that swing toward the cursor is an established genre, and it is
 * the only way the `lean` parameter becomes VISIBLE at rest — a circle is
 * radially symmetric, so a leaning circle and a still circle are the same
 * picture until it has physically moved.
 */
const DIRECTIONAL_SHAPES = new Set( [ 'line', 'triangle' ] );

/**
 * Parse a browser-computed colour into numeric channels.
 *
 * The input is ALWAYS `getComputedStyle`'s output, never author CSS, so it is
 * already normalised to `rgb()`/`rgba()` — hex, hex8, named colours and
 * `color-mix()` have all been resolved by the engine before we see them. That
 * is why this handles no other notation: adding hex/hsl parsing here would be
 * dead code that implies a contract this function does not have.
 *
 * Both the legacy comma form (`rgba(1, 2, 3, 0.4)`) and the modern slash form
 * (`rgb(1 2 3 / 40%)`) are accepted because engines differ on which they emit.
 *
 * @param {string} value A computed CSS colour.
 * @return {number[]} `[r, g, b, a]`, or opaque white when unparseable.
 */
function parseColour( value ) {
	const inner = /rgba?\(([^)]*)\)/i.exec( String( value || '' ) );
	if ( ! inner ) {
		return [ 255, 255, 255, 1 ];
	}
	// One split handles both separator styles, which keeps this readable and
	// avoids a regex complex enough to trip the lint ceiling.
	const parts = inner[ 1 ].trim().split( /[\s,/]+/ ).filter( Boolean );
	if ( parts.length < 3 ) {
		return [ 255, 255, 255, 1 ];
	}
	const channel = ( raw ) => {
		const n = parseFloat( raw );
		return Number.isNaN( n ) ? 0 : n;
	};
	let alpha = 1;
	if ( parts.length > 3 ) {
		alpha = channel( parts[ 3 ] );
		if ( parts[ 3 ].includes( '%' ) ) {
			alpha /= 100;
		}
	}
	return [
		channel( parts[ 0 ] ),
		channel( parts[ 1 ] ),
		channel( parts[ 2 ] ),
		alpha,
	];
}

/**
 * Shortest-path angular difference, so a marker crossing the ±π seam turns the
 * short way round instead of spinning most of a full circle.
 *
 * @param {number} from Current angle in radians.
 * @param {number} to   Target angle in radians.
 * @return {number} Signed delta in `(-π, π]`.
 */
function angleDelta( from, to ) {
	return ( ( to - from + Math.PI * 3 ) % ( Math.PI * 2 ) ) - Math.PI;
}

/**
 * Build a grid-dot field over one element.
 *
 * @param {HTMLElement} el     The emitter (the element carrying data-sgs-fx).
 * @param {Object}      [opts] Overrides; any omitted key falls back to DEFAULTS.
 * @return {{setPointer: Function, clearPointer: Function, destroy: Function, stats: Function}} Handle.
 */
export function createGridDots( el, opts = {} ) {
	/*
	 * ⛔ NOT `{ ...DEFAULTS, ...opts }`. Object spread COPIES an explicit
	 * `undefined` over the default rather than skipping it, and `fx-grid-dots.js`
	 * deliberately returns `undefined` for every attribute the emitter does not
	 * carry — precisely so this table stays the single source of the defaults.
	 * The two conventions cancelled each other out: `cfg.cell` became
	 * `undefined`, `Math.floor( width / undefined )` is `NaN`, the row/column
	 * loops never executed, and the field built ZERO dots.
	 *
	 * Caught by live verification on canary page 3038, not by any gate — the
	 * canvas was created at the right size, the stylesheet resolved, the colour
	 * resolved, `data-sgs-fx` was stamped, both assets were enqueued, and every
	 * one of the ten registration points was correct. The effect simply painted
	 * nothing. A green build cannot see an empty loop.
	 */
	const cfg = { ...DEFAULTS };
	for ( const [ key, value ] of Object.entries( opts ) ) {
		if ( undefined !== value ) {
			cfg[ key ] = value;
		}
	}

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
	let restRgba = [ 255, 255, 255, 0.8 ];
	let hotRgba = [ 255, 255, 255, 0.8 ];
	let destroyed = false;

	/**
	 * Resolve BOTH paint colours from the canvas's own computed style. See the
	 * module docblock — never read a custom property directly.
	 *
	 * The resting colour comes from `color` and the pointer colour from
	 * `text-decoration-color`, both set by the stylesheet from their custom
	 * properties. Text decoration does not render on a canvas, so that property
	 * is inert here and serves purely as a second resolved-colour channel.
	 *
	 * @return {void}
	 */
	function readColour() {
		const computed = window.getComputedStyle( canvas );
		if ( computed.color ) {
			colour = computed.color;
			restRgba = parseColour( computed.color );
		}
		/*
		 * Fall back to the resting colour rather than to a literal. An absent
		 * or unparseable pointer colour must mean "no colour shift", never a
		 * hardcoded one that would silently override the client's choice.
		 */
		hotRgba = computed.textDecorationColor
			? parseColour( computed.textDecorationColor )
			: restRgba;
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
				// `a` is the marker's own rotation, eased like x/y so a
				// directional shape swings toward the pointer rather than
				// snapping. Unused by symmetric shapes.
				dots.push( { hx, hy, x: hx, y: hy, a: 0 } );
			}
		}
		readColour();

		/*
		 * A field with a real box but ZERO dots is always a defect, and it is
		 * SILENT: the canvas still exists at the right size, the stylesheet
		 * still resolves, and every gate still passes. That is exactly how the
		 * spread-over-undefined bug above reached the canary. Saying so out
		 * loud in dev costs nothing and turns a blank background into a
		 * one-line diagnosis.
		 */
		if ( 'production' !== process.env.NODE_ENV && ! dots.length ) {
			// eslint-disable-next-line no-console
			console.warn(
				`sgs grid-dots: built 0 dots for a ${ Math.round( width ) }x${ Math.round(
					height
				) } box (cell=${ cellPx }). The field will paint nothing. Check that ` +
					'every option resolved to a number — an undefined cell size ' +
					'makes the row/column loops no-ops.'
			);
		}
	}

	/** @return {number} The effective displacement ceiling in px. */
	function leanCeiling() {
		return Math.min( cfg.maxLean, cellPx * CELL_LOCK );
	}

	/**
	 * Paint one marker at its current position, in the configured shape.
	 *
	 * `cfg.dot` is a RADIUS (it always was, for the circle), so every other
	 * shape is sized as a multiple of it rather than reusing it as a side
	 * length — that keeps a given "Dot size" visually comparable when the
	 * client switches shape, instead of the field jumping in weight.
	 *
	 * Only `line` and `triangle` consult the rotation; the rest are symmetric,
	 * so rotating them would cost transform state per dot and change nothing on
	 * screen. `ctx.fillStyle` is already set by the caller.
	 *
	 * @param {string}  shape       One of circle|line|square|triangle|cross.
	 * @param {Object}  d           The dot record.
	 * @param {boolean} directional Whether this shape uses `d.a`.
	 * @return {void}
	 */
	function paintMarker( shape, d, directional ) {
		const r = cfg.dot;

		if ( 'circle' === shape ) {
			ctx.beginPath();
			ctx.arc( d.x, d.y, r, 0, Math.PI * 2 );
			ctx.fill();
			return;
		}

		if ( 'square' === shape ) {
			const side = r * 1.8;
			ctx.fillRect( d.x - side / 2, d.y - side / 2, side, side );
			return;
		}

		if ( 'cross' === shape ) {
			const arm = r * 1.9;
			const thick = Math.max( 1, r * 0.7 );
			ctx.fillRect( d.x - arm, d.y - thick / 2, arm * 2, thick );
			ctx.fillRect( d.x - thick / 2, d.y - arm, thick, arm * 2 );
			return;
		}

		// Directional shapes past this point.
		ctx.save();
		ctx.translate( d.x, d.y );
		ctx.rotate( directional ? d.a : 0 );

		if ( 'line' === shape ) {
			// Longer than it is wide, or it reads as a smeared dot rather than
			// a filing pointing somewhere.
			const len = r * 4;
			const thick = Math.max( 1, r * 0.75 );
			ctx.fillRect( -len / 2, -thick / 2, len, thick );
		} else {
			// Triangle, apex forward along the rotation.
			const reach = r * 1.9;
			ctx.beginPath();
			ctx.moveTo( reach, 0 );
			ctx.lineTo( -reach * 0.7, reach * 0.8 );
			ctx.lineTo( -reach * 0.7, -reach * 0.8 );
			ctx.closePath();
			ctx.fill();
		}

		ctx.restore();
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
		const shape = cfg.shape || 'circle';
		const directional = DIRECTIONAL_SHAPES.has( shape );
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
			let ta = 0;

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
					if ( directional ) {
						ta = Math.atan2( dy, dx );
					}
				}
			}

			d.x += ( tx - d.x ) * k;
			d.y += ( ty - d.y ) * k;
			if ( directional ) {
				d.a += angleDelta( d.a, ta ) * k;
			}

			if (
				Math.abs( d.x - d.hx ) > 0.05 ||
				Math.abs( d.y - d.hy ) > 0.05 ||
				( directional && Math.abs( angleDelta( d.a, ta ) ) > 0.01 )
			) {
				moving = true;
			}

			/*
			 * ⛔ globalAlpha stays at 1 and the alpha rides in the fill colour.
			 *
			 * Canvas MULTIPLIES globalAlpha by the fill colour's own alpha, so
			 * the two are not interchangeable: a 70%-alpha colour under a 0.34
			 * globalAlpha paints at 0.238. While a constant lived here, a
			 * client who set a translucent colour in the picker silently got a
			 * third of what they chose, and one who set an opaque colour still
			 * got a third — which is exactly how this effect shipped painting
			 * at 1.3:1 against the client's own background.
			 *
			 * Opacity is now the COLOUR's, and therefore the client's. The
			 * proximity response is a colour interpolation (resting -> pointer,
			 * alpha included), so `fade: false` means "no interpolation, paint
			 * the resting colour" rather than "swap one constant for another".
			 */
			const t = cfg.fade ? prox : 0;
			const r = Math.round( restRgba[ 0 ] + ( hotRgba[ 0 ] - restRgba[ 0 ] ) * t );
			const g = Math.round( restRgba[ 1 ] + ( hotRgba[ 1 ] - restRgba[ 1 ] ) * t );
			const b = Math.round( restRgba[ 2 ] + ( hotRgba[ 2 ] - restRgba[ 2 ] ) * t );
			const a = restRgba[ 3 ] + ( hotRgba[ 3 ] - restRgba[ 3 ] ) * t;
			ctx.fillStyle = `rgba(${ r },${ g },${ b },${ a })`;
			paintMarker( shape, d, directional );
		}

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
				shape: cfg.shape || 'circle',
				/*
				 * Both RESOLVED colours, so a probe can assert the painted
				 * alpha rather than inferring it. The old hardcoded 0.34 was
				 * invisible to every probe precisely because it lived in
				 * globalAlpha and never appeared in any reported value.
				 */
				restRgba: restRgba.slice(),
				hotRgba: hotRgba.slice(),
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
