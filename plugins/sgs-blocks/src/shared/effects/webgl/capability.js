/**
 * SGS Tier W — capability probe (Spec 38 §1.2b, D479).
 *
 * WHAT THIS IS. Tier W's whole premise is "raw WebGL2, no fallback path to
 * keep in sync" (see this directory's README). That premise only holds if the
 * probe used to decide "can this device paint a WebGL2 surface" is honest.
 * A dishonest probe is worse than none: it would report success on a device
 * that then paints nothing, and the caller has no second chance to notice —
 * `initSurface()` returning a live-looking object IS the "yes" signal.
 *
 * WHY CONTEXT CREATION ALONE IS NOT ENOUGH. `canvas.getContext('webgl2')`
 * succeeding proves the browser's WebGL2 API surface exists. It does not
 * prove a program can be compiled AND LINKED on the actual GPU driver behind
 * it — some driver/OS combinations expose a context that then fails to link
 * even a trivial program (documented across Chromium's ANGLE issue tracker
 * for older Intel/AMD Windows drivers, and the well-known "blocklisted GPU"
 * class of failure). Checking `LINK_STATUS` on a real pass-through program is
 * therefore the cheapest test that actually proves paint capability, not just
 * API presence. `probeSurface()` runs it once per page (the caller decides
 * when — see `index.js`) and is deliberately synchronous and disposable: it
 * never keeps the throwaway context or canvas alive past the check.
 *
 * WHY `isLowPower()` DOES NOT USE `navigator.deviceMemory`. It is tempting —
 * it looks like the more direct signal for "should we even attempt a GPU
 * effect on this device". But `deviceMemory` is a Chromium-only API; every
 * other engine (Safari/WebKit, Firefox) reports it as `undefined`, and
 * `undefined <= 4` evaluates to `false` in JavaScript. That silently disables
 * the low-power gate on exactly the platform most likely to need it: iOS
 * Safari, which is documented (see this directory's README, "context-loss
 * recovery") as the most aggressive GPU-context discarder under memory
 * pressure of any shipping browser. `hardwareConcurrency` is supported
 * everywhere Tier W runs and degrades honestly (falls back to an assumed
 * high core count, never to a silent false-negative).
 *
 * @package
 */

/**
 * A trivial pass-through vertex shader — clip-space passthrough, no varying
 * work. Exists only to give `probeSurface()` something to link; it is never
 * reused for real rendering (that shader lives in `renderer.js`).
 *
 * @type {string}
 */
const PROBE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
	gl_Position = vec4( a_position, 0.0, 1.0 );
}
`;

/**
 * A trivial solid-colour fragment shader — the simplest possible program that
 * still exercises real link behaviour (varying-free, uniform-free).
 *
 * @type {string}
 */
const PROBE_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
out vec4 outColor;
void main() {
	outColor = vec4( 1.0, 1.0, 1.0, 1.0 );
}
`;

/**
 * Compile a single shader and check `COMPILE_STATUS`.
 *
 * @param {WebGL2RenderingContext} gl   The context.
 * @param {number}                 type `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`.
 * @param {string}                 src  GLSL ES 3.00 source.
 * @return {WebGLShader|null} The compiled shader, or `null` on failure.
 */
function compileProbeShader( gl, type, src ) {
	const shader = gl.createShader( type );
	if ( ! shader ) {
		return null;
	}
	gl.shaderSource( shader, src );
	gl.compileShader( shader );
	if ( ! gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
		gl.deleteShader( shader );
		return null;
	}
	return shader;
}

/**
 * Probe whether this device can actually paint a WebGL2 surface — context
 * creation AND program link, not context creation alone (see module
 * docblock). Never throws; any exception is treated as "cannot paint".
 *
 * The throwaway canvas and context are never attached to the DOM and are
 * released before returning, via the `WEBGL_lose_context` extension when the
 * browser supports it — leaving nothing behind for the real render to clash
 * with.
 *
 * @return {boolean} True only when a real program compiled, linked, and the
 *                    context was released cleanly.
 */
export function probeSurface() {
	let gl = null;
	let vertexShader = null;
	let fragmentShader = null;
	let program = null;

	try {
		const canvas = document.createElement( 'canvas' );
		// `failIfMajorPerformanceCaveat` is what makes this probe actually
		// mean "can paint WELL", not just "can paint" — without it a
		// blocklisted/software-rendered GPU still hands back a context that
		// links fine and then draws at a crawl. Context creation returning
		// null here is exactly the "decline" signal the whole module exists
		// to produce.
		// ⚠ SHARED GATE: this same probeSurface() also gates the already-
		// shipped `surface-treatment` effect (webgl/index.js's initSurface()),
		// so this flag tightens THAT effect's admission too, not just
		// wave-gradient's. Intentional — declining is correct behaviour on a
		// caveat-flagged driver for either effect — but it is a real,
		// shared-code-path change, not scoped to wave-gradient alone.
		gl = canvas.getContext( 'webgl2', {
			failIfMajorPerformanceCaveat: true,
		} );
		if ( ! gl ) {
			return false;
		}

		vertexShader = compileProbeShader(
			gl,
			gl.VERTEX_SHADER,
			PROBE_VERTEX_SHADER
		);
		if ( ! vertexShader ) {
			return false;
		}

		fragmentShader = compileProbeShader(
			gl,
			gl.FRAGMENT_SHADER,
			PROBE_FRAGMENT_SHADER
		);
		if ( ! fragmentShader ) {
			return false;
		}

		program = gl.createProgram();
		if ( ! program ) {
			return false;
		}
		gl.attachShader( program, vertexShader );
		gl.attachShader( program, fragmentShader );
		gl.linkProgram( program );

		// Compiling is not linking — this is the check the whole module
		// exists for (see docblock).
		return Boolean( gl.getProgramParameter( program, gl.LINK_STATUS ) );
	} catch ( error ) {
		return false;
	} finally {
		if ( gl ) {
			if ( program ) {
				if ( vertexShader ) {
					gl.detachShader( program, vertexShader );
				}
				if ( fragmentShader ) {
					gl.detachShader( program, fragmentShader );
				}
				gl.deleteProgram( program );
			}
			if ( vertexShader ) {
				gl.deleteShader( vertexShader );
			}
			if ( fragmentShader ) {
				gl.deleteShader( fragmentShader );
			}

			const loseContext = gl.getExtension( 'WEBGL_lose_context' );
			if ( loseContext ) {
				loseContext.loseContext();
			}
		}
	}
}

/**
 * Whether this device should be treated as low-power for the purposes of
 * deciding whether to attempt a GPU effect at all. Deliberately coarse — a
 * single-signal heuristic, not a benchmark.
 *
 * See module docblock for why `navigator.deviceMemory` is not used here.
 *
 * @return {boolean} True when the device reports 4 or fewer logical cores
 *                    (or reports nothing, since an unreported core count is
 *                    itself only seen on constrained/older devices in
 *                    practice — the nullish default of 8 keeps that case
 *                    resolving to "not low-power" rather than guessing low).
 */
export function isLowPower() {
	return ( navigator.hardwareConcurrency ?? 8 ) <= 4;
}
