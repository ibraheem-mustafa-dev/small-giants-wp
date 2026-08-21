/**
 * SGS Tier W — the ONE swappable rendering file (Spec 38 §1.2b, D479).
 *
 * WHAT THIS IS. Raw WebGL2, zero dependencies, single-pass only (see this
 * directory's README — "SINGLE PASS ONLY" is a hard contract, not a current
 * limitation to grow out of). This is the only file in the codebase that may
 * know how a pixel actually reaches the screen for a Tier W effect; nothing
 * outside this directory imports it (`index.js` is the public surface, and a
 * QA gate greps for stray imports of this file).
 *
 * WHY A FULLSCREEN TRIANGLE, NOT A QUAD. Two triangles sharing an edge need
 * four vertices, an index buffer, and a seam down the diagonal that filtering
 * can (rarely, but measurably) show. One oversized triangle whose corners sit
 * outside clip space needs three vertices, no index buffer, and rasterises to
 * exactly the same visible quad after clipping — it is the standard trick for
 * a single full-screen pass and costs one buffer instead of two.
 *
 * WHY THE TWO CONTRACTS BELOW ARE LOAD-BEARING, NOT DEFENSIVE PADDING:
 *
 * 1. CONTEXT LOSS. iOS Safari discards GPU contexts under memory pressure
 *    more aggressively than any other shipping engine (documented across
 *    every major WebGL library's issue tracker — this directory's README
 *    calls it out explicitly). An effect with no loss-recovery path degrades
 *    to a dead black rectangle sitting over the source image forever. This
 *    module removes its own canvas on unrecoverable loss and calls the
 *    caller's `onLost` so the caller can restore whatever it hid.
 *
 *    ⚠ CORRECTED 2026-08-21 (pre-merge QC council). This paragraph used to
 *    claim the source `<img>` was "never hidden, only covered", which would
 *    have made recovery free. It is NOT true: the boot module sets
 *    `visibility: hidden` on the `<img>` once the first draw succeeds, so
 *    removing the canvas alone leaves a blank slot. Recovery therefore needs
 *    BOTH halves — canvas removal here, and the `onLost` callback for the
 *    caller's own un-hide. A docblock that overstates a safety property is
 *    worse than none, because it stops the next reader looking.
 *
 * 2. DISPOSAL ORDERING. `destroy()` must set the `destroyed` flag and detach
 *    both context-event listeners BEFORE calling `loseContext()`, because
 *    `loseContext()` itself SYNCHRONOUSLY fires `webglcontextlost` on some
 *    engines. Without the flag-then-detach order, `destroy()` would race its
 *    own loss handler and the handler could schedule an async rebuild against
 *    a surface that is mid-teardown. Both handlers early-return on
 *    `destroyed` as a second line of defence.
 *
 * SPEC 32 (no inline styling). This module never writes a CSS property
 * declaration from JS — not `canvas.style.*`, nothing. The canvas gets the
 * `sgs-webgl-surface` class; a stylesheet elsewhere positions it. Only the
 * `width`/`height` CONTENT ATTRIBUTES are set here (the drawing-buffer size —
 * not CSS, and setting them any other way would blur the raster).
 *
 * @package
 */

/**
 * Module-local tally of live GPU objects (programs + shaders + buffers/VAOs +
 * textures), so a test can assert `destroy()` actually released everything
 * rather than trusting that the code "looks like" it calls every `delete*`.
 *
 * TEST HOOK — not part of the public render contract. Exported only so a
 * probe/test can assert it returns to 0 after every renderer this module
 * creates has been destroyed. Never read by production code.
 */
let gpuObjectCount = 0;

/**
 * @return {number} The current live GPU object tally. Test hook — see the
 *                   module-local `gpuObjectCount` docblock above.
 */
export function __gpuObjectCount() {
	return gpuObjectCount;
}

const CANVAS_CLASS = 'sgs-webgl-surface';

/**
 * How long to wait for `webglcontextrestored` after a loss before giving up,
 * removing the canvas and telling the caller to restore its own fallback.
 *
 * A restore is entirely at the browser's discretion and on iOS Safari it
 * frequently never arrives at all, so "wait for the restore" cannot be the
 * only recovery path — see `onContextLost()`. Three seconds is long enough
 * that a browser genuinely intending to restore has done so, and short
 * enough that a visitor is not left looking at a blank slot.
 */
const CONTEXT_RESTORE_GRACE_MS = 3000;

/** Cap device-pixel-ratio scaling — beyond 2x the extra fill rate buys
 * nothing visible and costs real frame time on the redraw path. */
const MAX_DPR = 2;

const FULLSCREEN_TRIANGLE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
	// The oversized triangle's clip-space corners map to UV space so the
	// fragment shader can sample the source texture directly, with no
	// separate UV attribute/buffer needed.
	v_uv = a_position * 0.5 + 0.5;
	gl_Position = vec4( a_position, 0.0, 1.0 );
}
`;

/**
 * The three oversized-triangle corners (standard fullscreen-triangle trick):
 * clipped to the viewport, this rasterises to exactly the same visible
 * region as a two-triangle quad, using one buffer and no index buffer.
 *
 * @type {Float32Array}
 */
const TRIANGLE_VERTICES = new Float32Array( [
	-1, -1,
	3, -1,
	-1, 3,
] );

/**
 * Compile a shader and check `COMPILE_STATUS`. On failure, returns the shader
 * info log alongside `null` so the caller can produce one `console.warn`.
 *
 * @param {WebGL2RenderingContext} gl   The context.
 * @param {number}                 type `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`.
 * @param {string}                 src  GLSL ES 3.00 source.
 * @return {{shader: WebGLShader|null, log: string|null}} The result.
 */
function compileShader( gl, type, src ) {
	const shader = gl.createShader( type );
	if ( ! shader ) {
		return { shader: null, log: 'gl.createShader() returned null' };
	}
	gl.shaderSource( shader, src );
	gl.compileShader( shader );
	if ( ! gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
		const log = gl.getShaderInfoLog( shader );
		gl.deleteShader( shader );
		return { shader: null, log };
	}
	gpuObjectCount += 1;
	return { shader, log: null };
}

/**
 * Link a vertex + fragment shader pair and check `LINK_STATUS`. Compiling is
 * not linking — see this directory's `capability.js` docblock for why that
 * distinction matters; the same risk applies to every real program this
 * renderer builds, not just the probe's throwaway one.
 *
 * @param {WebGL2RenderingContext} gl             The context.
 * @param {WebGLShader}            vertexShader   Compiled vertex shader.
 * @param {WebGLShader}            fragmentShader Compiled fragment shader.
 * @return {{program: WebGLProgram|null, log: string|null}} The result.
 */
function linkProgram( gl, vertexShader, fragmentShader ) {
	const program = gl.createProgram();
	if ( ! program ) {
		return { program: null, log: 'gl.createProgram() returned null' };
	}
	gl.attachShader( program, vertexShader );
	gl.attachShader( program, fragmentShader );
	gl.linkProgram( program );
	if ( ! gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
		const log = gl.getProgramInfoLog( program );
		gl.deleteProgram( program );
		return { program: null, log };
	}
	gpuObjectCount += 1;
	return { program, log: null };
}

/**
 * Set the standard non-power-of-2-safe texture parameters: clamp on both
 * axes, linear filtering, no mipmaps. An arbitrary source image is very
 * unlikely to be power-of-2 sized, and `REPEAT` wrapping or mipmap generation
 * on a non-POT texture is either invalid or silently wrong in WebGL2.
 *
 * @param {WebGL2RenderingContext} gl The context.
 */
function setNonPowerOfTwoTextureParams( gl ) {
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
}

/**
 * Resolve the uniform setter arity from the value shape passed to
 * `setUniform()`. Supports a bare number (`uniform1f`) and 2/3/4-length
 * arrays (`uniform2fv`/`3fv`/`4fv`).
 *
 * @param {WebGL2RenderingContext} gl       The context.
 * @param {WebGLUniformLocation}   location The cached uniform location.
 * @param {number|number[]}       value    The value to upload.
 * @return {boolean} True when the value shape was recognised and uploaded.
 */
function uploadUniform( gl, location, value ) {
	if ( typeof value === 'number' ) {
		gl.uniform1f( location, value );
		return true;
	}
	if ( Array.isArray( value ) ) {
		if ( value.length === 2 ) {
			gl.uniform2fv( location, value );
			return true;
		}
		if ( value.length === 3 ) {
			gl.uniform3fv( location, value );
			return true;
		}
		if ( value.length === 4 ) {
			gl.uniform4fv( location, value );
			return true;
		}
	}
	return false;
}

/**
 * Create a single-pass WebGL2 renderer over `image`, drawn once into a
 * canvas appended to `el`. See this directory's README for the full
 * contract; this docblock covers only what is not already stated there.
 *
 * Never throws. Returns `null` on any failure — see README "initSurface
 * returns null, never throws" for why that is the whole fallback mechanism.
 *
 * @param {HTMLElement}      el                 Element the canvas is appended to.
 * @param {Object}            opts               Options.
 * @param {HTMLImageElement} opts.image         Already-decoded source image.
 * @param {string}            opts.fragment      GLSL ES 3.00 fragment shader source.
 * @param {Object}            [opts.uniforms]    Initial `{ name: value }` uniforms.
 * @return {{setUniform: Function, redraw: Function, destroy: Function}|null}
 *         The render handle, or `null` on failure.
 */
export function createRenderer( el, opts ) {
	if ( ! el || ! opts || ! opts.image || ! opts.fragment ) {
		return null;
	}

	const { image, fragment, uniforms = {}, onLost = null } = opts;

	/** Pending give-up timer from a context loss, or null. */
	let giveUpTimer = null;

	const rect = el.getBoundingClientRect();
	if ( rect.width <= 0 || rect.height <= 0 ) {
		return null;
	}

	const canvas = document.createElement( 'canvas' );
	canvas.className = CANVAS_CLASS;

	const gl = canvas.getContext( 'webgl2' );
	if ( ! gl ) {
		return null;
	}

	let destroyed = false;
	let program = null;
	let vertexShader = null;
	let fragmentShader = null;
	let vao = null;
	let vertexBuffer = null;
	let texture = null;
	let resizeObserver = null;
	let resizeScheduled = false;
	const uniformLocations = new Map();
	const uniformValues = { ...uniforms };

	/**
	 * Build the program, upload the fullscreen-triangle buffer, and upload
	 * the source image as a texture. Used both on first init and to rebuild
	 * after a `webglcontextrestored` event, since a restored context starts
	 * with every previous GPU object invalid.
	 *
	 * @return {boolean} True when every step succeeded.
	 */
	function buildProgram() {
		const vertexResult = compileShader(
			gl,
			gl.VERTEX_SHADER,
			FULLSCREEN_TRIANGLE_VERTEX_SHADER
		);
		if ( ! vertexResult.shader ) {
			// eslint-disable-next-line no-console
			console.warn(
				'[sgs webgl] vertex shader compile failed:',
				vertexResult.log
			);
			return false;
		}
		vertexShader = vertexResult.shader;

		const fragmentResult = compileShader(
			gl,
			gl.FRAGMENT_SHADER,
			fragment
		);
		if ( ! fragmentResult.shader ) {
			// eslint-disable-next-line no-console
			console.warn(
				'[sgs webgl] fragment shader compile failed:',
				fragmentResult.log
			);
			return false;
		}
		fragmentShader = fragmentResult.shader;

		const linkResult = linkProgram( gl, vertexShader, fragmentShader );
		if ( ! linkResult.program ) {
			// eslint-disable-next-line no-console
			console.warn( '[sgs webgl] program link failed:', linkResult.log );
			return false;
		}
		program = linkResult.program;

		vao = gl.createVertexArray();
		gl.bindVertexArray( vao );
		gpuObjectCount += 1;

		vertexBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW );
		gpuObjectCount += 1;

		const positionLoc = gl.getAttribLocation( program, 'a_position' );
		if ( positionLoc >= 0 ) {
			gl.enableVertexAttribArray( positionLoc );
			gl.vertexAttribPointer( positionLoc, 2, gl.FLOAT, false, 0, 0 );
		}
		gl.bindVertexArray( null );

		texture = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, texture );
		setNonPowerOfTwoTextureParams( gl );

		// WebGL's texture origin is bottom-left; an HTMLImageElement's is
		// top-left, so without this every treated image renders upside down.
		// It belongs HERE, at the upload, and deliberately not in each
		// fragment shader: a per-shader `1.0 - v_uv.y` is three chances to
		// forget and a silent visual defect when one of them does.
		gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );

		try {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				image
			);
		} catch ( error ) {
			// A cross-origin image without CORS headers throws SECURITY_ERR
			// and would taint the canvas — treat exactly like a compile/link
			// failure: clean up and signal failure to the caller.
			// eslint-disable-next-line no-console
			console.warn(
				'[sgs webgl] texImage2D failed (likely cross-origin image):',
				error
			);
			gl.deleteTexture( texture );
			texture = null;
			return false;
		}
		gpuObjectCount += 1;

		uniformLocations.clear();

		return true;
	}

	/**
	 * Size the drawing buffer to the element's current rendered box, capped
	 * at `MAX_DPR`. Sets the `width`/`height` CONTENT ATTRIBUTES only (Spec
	 * 32 — never a CSS property from JS).
	 */
	function sizeCanvas() {
		const box = el.getBoundingClientRect();
		const dpr = Math.min( window.devicePixelRatio || 1, MAX_DPR );
		const width = Math.max( 1, Math.round( box.width * dpr ) );
		const height = Math.max( 1, Math.round( box.height * dpr ) );
		if ( canvas.width !== width || canvas.height !== height ) {
			canvas.width = width;
			canvas.height = height;
		}
	}

	/**
	 * Resolve and cache a uniform's location, uploading `null` into the
	 * cache when the uniform does not exist in the linked program (an
	 * optional uniform the fragment shader doesn't declare is not an error).
	 *
	 * @param {string} name Uniform name.
	 * @return {WebGLUniformLocation|null} The cached location.
	 */
	function locationFor( name ) {
		if ( uniformLocations.has( name ) ) {
			return uniformLocations.get( name );
		}
		const location = gl.getUniformLocation( program, name );
		uniformLocations.set( name, location );
		return location;
	}

	/**
	 * Draw exactly one frame with the current uniform values. Single-pass,
	 * single-draw — see README "SINGLE PASS ONLY".
	 */
	function paint() {
		if ( destroyed || ! program ) {
			return;
		}
		gl.viewport( 0, 0, canvas.width, canvas.height );
		gl.useProgram( program );
		gl.bindVertexArray( vao );

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, texture );
		const samplerLoc = locationFor( 'u_image' );
		if ( samplerLoc ) {
			gl.uniform1i( samplerLoc, 0 );
		}

		Object.keys( uniformValues ).forEach( ( name ) => {
			const location = locationFor( name );
			if ( location ) {
				uploadUniform( gl, location, uniformValues[ name ] );
			}
		} );

		gl.drawArrays( gl.TRIANGLES, 0, 3 );
		gl.bindVertexArray( null );
	}

	/**
	 * Delete every GPU object this instance owns and decrement the shared
	 * tally accordingly. Safe to call when some objects were never created
	 * (a failed rebuild).
	 */
	function releaseGpuObjects() {
		if ( program ) {
			gl.deleteProgram( program );
			gpuObjectCount -= 1;
			program = null;
		}
		if ( vertexShader ) {
			gl.deleteShader( vertexShader );
			gpuObjectCount -= 1;
			vertexShader = null;
		}
		if ( fragmentShader ) {
			gl.deleteShader( fragmentShader );
			gpuObjectCount -= 1;
			fragmentShader = null;
		}
		if ( vertexBuffer ) {
			gl.deleteBuffer( vertexBuffer );
			gpuObjectCount -= 1;
			vertexBuffer = null;
		}
		if ( vao ) {
			gl.deleteVertexArray( vao );
			gpuObjectCount -= 1;
			vao = null;
		}
		if ( texture ) {
			gl.deleteTexture( texture );
			gpuObjectCount -= 1;
			texture = null;
		}
		uniformLocations.clear();
	}

	/**
	 * `webglcontextlost` — must call `preventDefault()` to make the context
	 * eligible for restoration at all; every currently-live GPU object is
	 * already invalid the instant this fires, so this handler does no GPU
	 * work of its own (see README contract 1).
	 *
	 * @param {Event} event The loss event.
	 */
	function onContextLost( event ) {
		if ( destroyed ) {
			return;
		}
		event.preventDefault();
		// The lost context invalidated every object gl.delete* would touch;
		// drop our references without calling delete* on them (they are
		// already gone) but keep the tally honest.
		gpuObjectCount -= [
			program,
			vertexShader,
			fragmentShader,
			vertexBuffer,
			vao,
			texture,
		].filter( Boolean ).length;
		program = null;
		vertexShader = null;
		fragmentShader = null;
		vertexBuffer = null;
		vao = null;
		texture = null;

		// ⛔ THE RESTORE MAY NEVER COME, AND THAT IS THE COMMON CASE.
		//
		// `webglcontextrestored` firing at all is entirely at the browser's
		// discretion. iOS Safari — the engine this contract singles out as the
		// most aggressive context-discarder — frequently discards under memory
		// pressure and never offers a restore. Until this guard existed, that
		// path left the canvas mounted over an <img> the caller had already
		// hidden, painting nothing: a permanent blank slot where the client's
		// photograph used to be, which is precisely the outcome this whole
		// substrate is designed to make impossible.
		//
		// Recovery was previously reachable ONLY from `onContextRestored`'s
		// failure branch — i.e. only when a restore WAS offered and then
		// failed. Give up on a deadline instead, and tell the caller so it can
		// put its own fallback back.
		if ( giveUpTimer ) {
			clearTimeout( giveUpTimer );
		}
		giveUpTimer = setTimeout( () => {
			giveUpTimer = null;
			if ( destroyed || program ) {
				return;
			}
			removeCanvas();
			if ( 'function' === typeof onLost ) {
				onLost();
			}
		}, CONTEXT_RESTORE_GRACE_MS );
	}

	/**
	 * `webglcontextrestored` — rebuild everything and redraw. On failure,
	 * remove the canvas so the original `<img>` becomes visible again rather
	 * than leaving a dead surface in place (see README contract 1).
	 */
	function onContextRestored() {
		if ( destroyed ) {
			return;
		}
		// A restore arrived inside the grace window — stand the give-up down.
		if ( giveUpTimer ) {
			clearTimeout( giveUpTimer );
			giveUpTimer = null;
		}
		if ( ! buildProgram() ) {
			removeCanvas();
			return;
		}
		sizeCanvas();
		paint();
	}

	/**
	 * Detach the canvas from the DOM. The idempotent tail-end of both a
	 * failed rebuild and `destroy()`.
	 */
	function removeCanvas() {
		if ( canvas.parentNode ) {
			canvas.parentNode.removeChild( canvas );
		}
	}

	if ( ! buildProgram() ) {
		removeCanvas();
		return null;
	}

	el.appendChild( canvas );
	sizeCanvas();
	paint();

	canvas.addEventListener( 'webglcontextlost', onContextLost, false );
	canvas.addEventListener(
		'webglcontextrestored',
		onContextRestored,
		false
	);

	if ( typeof window.ResizeObserver === 'function' ) {
		resizeObserver = new window.ResizeObserver( () => {
			if ( destroyed || resizeScheduled ) {
				return;
			}
			resizeScheduled = true;
			window.requestAnimationFrame( () => {
				resizeScheduled = false;
				if ( destroyed ) {
					return;
				}
				sizeCanvas();
				paint();
			} );
		} );
		resizeObserver.observe( el );
	}

	return {
		/**
		 * Set a uniform's cached value. Does NOT redraw — the caller decides
		 * when to call `redraw()`, since a burst of uniform changes should
		 * usually collapse to one paint.
		 *
		 * @param {string}          name  Uniform name.
		 * @param {number|number[]} value A number, or a 2/3/4-length array.
		 */
		setUniform( name, value ) {
			if ( destroyed ) {
				return;
			}
			uniformValues[ name ] = value;
		},

		/**
		 * Re-draw with the current uniform values.
		 */
		redraw() {
			if ( destroyed ) {
				return;
			}
			paint();
		},

		/**
		 * Tear down everything this renderer created: GPU objects, the
		 * canvas, the ResizeObserver, and the context-loss listeners.
		 *
		 * ORDERING IS LOAD-BEARING — see module docblock "DISPOSAL ORDERING"
		 * and this directory's README. `destroyed` is set and both context
		 * listeners are removed BEFORE `loseContext()` is invoked, because
		 * `loseContext()` can synchronously fire `webglcontextlost`.
		 */
		destroy() {
			if ( destroyed ) {
				return;
			}
			destroyed = true;

			canvas.removeEventListener(
				'webglcontextlost',
				onContextLost,
				false
			);
			canvas.removeEventListener(
				'webglcontextrestored',
				onContextRestored,
				false
			);

			if ( resizeObserver ) {
				resizeObserver.disconnect();
				resizeObserver = null;
			}

			releaseGpuObjects();

			const loseContextExt = gl.getExtension( 'WEBGL_lose_context' );
			if ( loseContextExt ) {
				loseContextExt.loseContext();
			}

			removeCanvas();
		},
	};
}
