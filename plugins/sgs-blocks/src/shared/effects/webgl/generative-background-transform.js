/**
 * SGS motion — generative background, LAYERS 1 + 2 of the fold mechanism.
 *
 * ── WHY THIS FILE EXISTS SEPARATELY ────────────────────────────────────────
 *
 * Pure maths only: no DOM, no WebGL context, no browser globals. That is the
 * whole point — `scripts/generative-background/verify-transform.mjs` imports
 * THIS module directly under Node and checks it against matrices extracted
 * from the live reference rig. Testing a hand-rolled replica of the maths
 * would prove only that two of my own implementations agree; importing the
 * real thing is what makes the check ground-truth rather than self-consistent.
 * D882 named "not yet wired into `generative-background.js`" as the specific
 * outstanding gap — this module is what closes it.
 *
 * ── THE THREE LAYERS (D882) ────────────────────────────────────────────────
 *
 * The folded look is THREE transforms composed, not one. An earlier session
 * read `68467.glsl` in isolation, found only layer 3 there, and concluded the
 * other two did not exist — they do, in the rig's own JS, and their absence is
 * why every previous build came out centred, small and gentle no matter how
 * the camera was tuned:
 *
 *   1. CPU FOLD (this file, `buildFoldedGeometry`) — one-time, at build time.
 *   2. OBJECT TRANSFORM (this file, `composeModelMatrix`) — static per preset.
 *   3. PER-FRAME GPU TWIST (`generative-background.js`'s vertex shader) —
 *      already correct; not touched here.
 *
 * Order of application per vertex, matching the reference exactly:
 *   rest pose -> [1] CPU fold -> [3] displace + 3 twist rotations (shader)
 *             -> [2] model matrix -> view matrix -> projection.
 *
 * ⛔ Layer 2 lands AFTER the twist rotations, not before. The reference's
 * `gl_Position = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0)`
 * applies it to the already-twisted position. Putting the object transform
 * into the geometry buffer instead would scale and rotate the twist itself,
 * which is a different (and wrong) picture.
 *
 * ── PROVENANCE ─────────────────────────────────────────────────────────────
 *
 * The fold algorithm and the preset values below are ported from Stripe's hero
 * reference rig per Bean's explicit, twice-confirmed authorisation at D880,
 * which reverses this project's "describe and reimplement, never copy" rule
 * for this mechanism specifically. What is reproduced here is the ALGORITHM
 * and its MEASURED CONSTANTS, written in our own code — no reference source
 * text is copied into this file. The technique spec's own licence table
 * classifies measured parameter values as observed facts and mechanisms as
 * free to implement; this file sits on that side of the line. The palette PNG
 * remains off-limits regardless (artistic work, different asset class) and is
 * not used anywhere in this engine — colour comes from the client's own theme
 * tokens through the OKLCH pipeline in `fx-generative-background.js`.
 *
 * @package
 */

/** Plane dimensions and subdivision — the reference's own figures. */
export const PLANE_WIDTH = 400;
export const PLANE_HEIGHT = 400;
export const SEGMENTS_X = 128;
export const SEGMENTS_Y = 256;

/**
 * Fold band boundaries on the flat plane's local X, and the fold-power curve's
 * exponent. `foldPower = 4 - 2 * (4v(1-v))^9.5` peaks at the V extremes and
 * relaxes to 2 at the middle, which is what makes the sheet curl hardest at
 * its ends.
 */
const BAND_EDGE = 16;
const FOLD_BASE = 4;
const FOLD_DEPTH = 2;
const FOLD_EXPONENT = 9.5;

/**
 * Per-preset static object transform (layer 2) plus the geometry-driving
 * uniforms of layer 3. Euler angles are radians in three.js's default 'XYZ'
 * order, so the rotation composes as Rx · Ry · Rz — verified numerically to
 * 9.1e-13 against the rig, and NOT Rz · Ry · Rx, which was the first guess and
 * was wrong.
 *
 * ⚠ These are the reference's measured values, kept together as a set. Do not
 * mix a position from one preset with a rotation from another — they were
 * tuned as a composition and are not independently meaningful.
 */
export const PRESETS = {
	light: {
		position: [ 380, -301.7, -11.0999999999999 ],
		rotation: [ -0.449592653589793, -0.117592653589793, 1.87440734641021 ],
		scale: [ 9, 8, 5 ],
		// Layer 3 twist, indexed [A, B, C] to match the shader's rotation chain.
		// ⚠ The reference names these Y/X/Z, in that order — rotationA reads
		// twistFrequencyY, rotationB reads twistFrequencyX, rotationC reads
		// twistFrequencyZ. The letters are the reference's own labels and do
		// NOT correspond to axes; reordering them to look tidy would silently
		// swap which curve drives which rotation.
		twistFrequency: [ 0.41, -0.649999999999999, -0.58 ],
		twistPower: [ 0.7, 3.63, 3.95 ],
		displaceFrequencyX: 0.005831,
		displaceFrequencyZ: 0.016001,
		displaceAmount: -7.821,
		speed: 4e-5,
		timeOffset: 17500,
	},
	dark: {
		position: [ -24.3, -56.4, -11.0999999999999 ],
		rotation: [ -0.159592653589793, -0.283592653589793, -2.81559265358979 ],
		scale: [ 10, 10, 7 ],
		twistFrequency: [ 0.077, -0.0549999999999997, -0.518 ],
		twistPower: [ 5.85, 3.95, 6.33 ],
		displaceFrequencyX: 0.003234,
		displaceFrequencyZ: 0.00799,
		displaceAmount: 6.051,
		speed: 4e-5,
		timeOffset: 1150,
	},
};

/** Camera placement — orthographic, frustum sized from the canvas. */
export const CAMERA_POSITION = [ 100, 0, 5000 ];
export const CAMERA_TARGET = [ 0, 0, 0 ];
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 1e4;

/**
 * Linear remap, matching the reference's own `mapLinear` helper.
 *
 * @param {number} value Input.
 * @param {number} min1  Input range start.
 * @param {number} max1  Input range end.
 * @param {number} min2  Output range start.
 * @param {number} max2  Output range end.
 * @return {number} Remapped value.
 */
function mapLinear( value, min1, max1, min2, max2 ) {
	return min2 + ( ( value - min1 ) * ( max2 - min2 ) ) / ( max1 - min1 );
}

/**
 * LAYER 1 — fold a single rest-pose vertex.
 *
 * Operates on the flat plane lying in XY (z = 0), exactly as the reference's
 * source geometry does, then hands back the vertex in the FOLDED, stood-up
 * frame.
 *
 * The final "stand the sheet up" step is two -90 degree rotations, about X
 * then about Y. Composed, those collapse to a pure axis permutation:
 *
 *   Rx(-90): (x, y, z) -> (x,  z, -y)
 *   Ry(-90): (x, y, z) -> (-z, y,  x)
 *   together: (x, y, z) -> (y,  z,  x)
 *
 * so this is done as a relabel rather than two trig-laden matrix multiplies.
 * That identity is asserted directly by the verifier's `permutation` case, so
 * the shortcut is checked rather than merely claimed.
 *
 * @param {number} x  Rest-pose local X.
 * @param {number} y  Rest-pose local Y.
 * @param {number} v  The vertex's UV V coordinate, 0..1.
 * @param {number} planeWidth Plane width in local units.
 * @return {number[]} Folded [x, y, z].
 */
export function foldVertex( x, y, v, planeWidth = PLANE_WIDTH ) {
	// Fold power falls off toward the V extremes; strongest curl at the ends.
	const foldPower =
		FOLD_BASE - FOLD_DEPTH * Math.pow( 4 * v * ( 1 - v ), FOLD_EXPONENT );

	let fx = x;
	let fy = y;
	let fz = 0;

	if ( x < -BAND_EDGE ) {
		// Far flank: pushed out along +Z, otherwise undeformed.
		fz = foldPower;
	} else if ( x < BAND_EDGE ) {
		// Narrow central band: a cosine profile in BOTH X and Z, which is what
		// produces the curl rather than a simple bend. The two cosines run
		// over different ranges (0..PI for Z, -PI/2..PI/2 for X) on purpose.
		fz = Math.cos( mapLinear( x, -BAND_EDGE, BAND_EDGE, 0, Math.PI ) ) * foldPower;
		fx =
			Math.cos(
				mapLinear( x, -BAND_EDGE, BAND_EDGE, -Math.PI / 2, Math.PI / 2 )
			) *
				foldPower -
			BAND_EDGE;
	} else {
		// Near flank: pushed the other way along Z, and MIRRORED in X. The
		// mirror is what folds this flank back over the others instead of
		// leaving the sheet flat.
		fz = -foldPower;
		fx = -x;
	}

	// Shift a quarter-width along X before standing the sheet up.
	fx += planeWidth / 4;

	// Rx(-90) then Ry(-90), as the permutation derived above.
	return [ fy, fz, fx ];
}

/**
 * LAYER 1 — build the folded plane's buffers.
 *
 * @param {number} width      Plane width, local units.
 * @param {number} height     Plane height, local units.
 * @param {number} segmentsX  Subdivisions across X.
 * @param {number} segmentsY  Subdivisions across Y.
 * @return {Object} { positions, uvs, indices, vertexCount }.
 */
export function buildFoldedGeometry(
	width = PLANE_WIDTH,
	height = PLANE_HEIGHT,
	segmentsX = SEGMENTS_X,
	segmentsY = SEGMENTS_Y
) {
	const vertsX = segmentsX + 1;
	const vertsY = segmentsY + 1;
	const vertexCount = vertsX * vertsY;

	const positions = new Float32Array( vertexCount * 3 );
	const uvs = new Float32Array( vertexCount * 2 );

	for ( let iy = 0; iy <= segmentsY; iy++ ) {
		const v = iy / segmentsY;
		for ( let ix = 0; ix <= segmentsX; ix++ ) {
			const u = ix / segmentsX;
			const idx = iy * vertsX + ix;

			// Rest pose: flat, in the XY plane, matching the reference's own
			// source geometry (NOT the XZ plane an earlier build used).
			const restX = ( u - 0.5 ) * width;
			const restY = ( v - 0.5 ) * height;

			const folded = foldVertex( restX, restY, v, width );

			positions[ idx * 3 ] = folded[ 0 ];
			positions[ idx * 3 + 1 ] = folded[ 1 ];
			positions[ idx * 3 + 2 ] = folded[ 2 ];
			uvs[ idx * 2 ] = u;
			uvs[ idx * 2 + 1 ] = v;
		}
	}

	const indices = [];
	for ( let iy = 0; iy < segmentsY; iy++ ) {
		for ( let ix = 0; ix < segmentsX; ix++ ) {
			const a = iy * vertsX + ix;
			const b = a + 1;
			const c = a + vertsX;
			const d = c + 1;
			indices.push( a, c, b, b, c, d );
		}
	}

	return {
		positions,
		uvs,
		indices:
			vertexCount > 65535
				? new Uint32Array( indices )
				: new Uint16Array( indices ),
		vertexCount,
	};
}

/**
 * Multiply two column-major 4x4 matrices: returns a * b.
 *
 * @param {ArrayLike<number>} a Left matrix.
 * @param {ArrayLike<number>} b Right matrix.
 * @return {Float32Array} Product.
 */
export function multiplyMat4( a, b ) {
	const out = new Float32Array( 16 );
	for ( let col = 0; col < 4; col++ ) {
		for ( let row = 0; row < 4; row++ ) {
			out[ col * 4 + row ] =
				a[ row ] * b[ col * 4 ] +
				a[ 4 + row ] * b[ col * 4 + 1 ] +
				a[ 8 + row ] * b[ col * 4 + 2 ] +
				a[ 12 + row ] * b[ col * 4 + 3 ];
		}
	}
	return out;
}

/**
 * LAYER 2 — compose the static object transform, M = T · R · S.
 *
 * Rotation is an Euler triple in 'XYZ' order (Rx · Ry · Rz). Scale is applied
 * FIRST (innermost), then rotation, then translation — the standard TRS order,
 * and the one the reference's scene graph uses.
 *
 * ⚠ The Euler order is load-bearing and was got wrong once. Rz · Ry · Rx gives
 * a visibly different, plausible-looking composition; only the numeric check
 * against the rig distinguishes them.
 *
 * @param {number[]} position Translation [x, y, z].
 * @param {number[]} rotation Euler angles in radians, 'XYZ' order.
 * @param {number[]} scale    Non-uniform scale [x, y, z].
 * @return {Float32Array} Column-major mat4.
 */
export function composeModelMatrix( position, rotation, scale ) {
	const [ rx, ry, rz ] = rotation;
	const a = Math.cos( rx );
	const b = Math.sin( rx );
	const c = Math.cos( ry );
	const d = Math.sin( ry );
	const e = Math.cos( rz );
	const f = Math.sin( rz );

	const ae = a * e;
	const af = a * f;
	const be = b * e;
	const bf = b * f;

	// Rotation basis, column-major, for Euler 'XYZ'.
	const r = [
		c * e,
		af + be * d,
		bf - ae * d,
		-c * f,
		ae - bf * d,
		be + af * d,
		d,
		-b * c,
		a * c,
	];

	const [ sx, sy, sz ] = scale;
	const m = new Float32Array( 16 );

	// Columns 0..2 are the rotation basis scaled per-axis.
	m[ 0 ] = r[ 0 ] * sx;
	m[ 1 ] = r[ 1 ] * sx;
	m[ 2 ] = r[ 2 ] * sx;
	m[ 3 ] = 0;
	m[ 4 ] = r[ 3 ] * sy;
	m[ 5 ] = r[ 4 ] * sy;
	m[ 6 ] = r[ 5 ] * sy;
	m[ 7 ] = 0;
	m[ 8 ] = r[ 6 ] * sz;
	m[ 9 ] = r[ 7 ] * sz;
	m[ 10 ] = r[ 8 ] * sz;
	m[ 11 ] = 0;
	m[ 12 ] = position[ 0 ];
	m[ 13 ] = position[ 1 ];
	m[ 14 ] = position[ 2 ];
	m[ 15 ] = 1;

	return m;
}

/**
 * Compose the view matrix — the inverse of a camera sitting at `eye` and
 * aimed at `target`.
 *
 * Built directly as R-transpose · T(-eye) rather than by building the camera's
 * world matrix and inverting it numerically: for a rigid transform the
 * transpose IS the inverse of the rotation part, so this is exact rather than
 * merely well-conditioned.
 *
 * @param {number[]} eye    Camera position.
 * @param {number[]} target Look-at point.
 * @param {number[]} up     Up vector.
 * @return {Float32Array} Column-major mat4.
 */
export function composeViewMatrix( eye, target, up = [ 0, 1, 0 ] ) {
	const sub = ( p, q ) => [ p[ 0 ] - q[ 0 ], p[ 1 ] - q[ 1 ], p[ 2 ] - q[ 2 ] ];
	const cross = ( p, q ) => [
		p[ 1 ] * q[ 2 ] - p[ 2 ] * q[ 1 ],
		p[ 2 ] * q[ 0 ] - p[ 0 ] * q[ 2 ],
		p[ 0 ] * q[ 1 ] - p[ 1 ] * q[ 0 ],
	];
	const norm = ( p ) => {
		const len = Math.hypot( p[ 0 ], p[ 1 ], p[ 2 ] );
		return len === 0 ? [ 0, 0, 0 ] : [ p[ 0 ] / len, p[ 1 ] / len, p[ 2 ] / len ];
	};
	const dot = ( p, q ) => p[ 0 ] * q[ 0 ] + p[ 1 ] * q[ 1 ] + p[ 2 ] * q[ 2 ];

	// Camera looks down its own -Z, so z points from target back to eye.
	let z = norm( sub( eye, target ) );
	if ( z[ 0 ] === 0 && z[ 1 ] === 0 && z[ 2 ] === 0 ) {
		z = [ 0, 0, 1 ];
	}
	let x = norm( cross( up, z ) );
	if ( x[ 0 ] === 0 && x[ 1 ] === 0 && x[ 2 ] === 0 ) {
		// Degenerate: up is parallel to z. Nudge, matching three.js's own
		// handling rather than dividing by zero.
		z = [ z[ 0 ] + 1e-4, z[ 1 ], z[ 2 ] ];
		z = norm( z );
		x = norm( cross( up, z ) );
	}
	const y = cross( z, x );

	const m = new Float32Array( 16 );
	m[ 0 ] = x[ 0 ];
	m[ 1 ] = y[ 0 ];
	m[ 2 ] = z[ 0 ];
	m[ 3 ] = 0;
	m[ 4 ] = x[ 1 ];
	m[ 5 ] = y[ 1 ];
	m[ 6 ] = z[ 1 ];
	m[ 7 ] = 0;
	m[ 8 ] = x[ 2 ];
	m[ 9 ] = y[ 2 ];
	m[ 10 ] = z[ 2 ];
	m[ 11 ] = 0;
	m[ 12 ] = -dot( x, eye );
	m[ 13 ] = -dot( y, eye );
	m[ 14 ] = -dot( z, eye );
	m[ 15 ] = 1;

	return m;
}

/**
 * Standard orthographic projection — textbook `glOrtho`-equivalent maths.
 *
 * ⚠ Argument order is (left, right, TOP, BOTTOM, near, far), matching the
 * reference's own camera constructor. Swapping top/bottom flips the image
 * vertically and looks like a fold-direction bug rather than a camera one.
 *
 * @param {number} left   Frustum left edge.
 * @param {number} right  Frustum right edge.
 * @param {number} top    Frustum top edge.
 * @param {number} bottom Frustum bottom edge.
 * @param {number} near   Near plane.
 * @param {number} far    Far plane.
 * @return {Float32Array} Column-major mat4.
 */
export function buildOrthographicMatrix( left, right, top, bottom, near, far ) {
	const w = 1 / ( right - left );
	const h = 1 / ( top - bottom );
	const p = 1 / ( far - near );

	const m = new Float32Array( 16 );
	m[ 0 ] = 2 * w;
	m[ 5 ] = 2 * h;
	m[ 10 ] = -2 * p;
	m[ 12 ] = -( right + left ) * w;
	m[ 13 ] = -( top + bottom ) * h;
	m[ 14 ] = -( far + near ) * p;
	m[ 15 ] = 1;
	return m;
}

/**
 * The one matrix the vertex shader actually receives: P · V · M.
 *
 * @param {Object} preset       A `PRESETS` entry.
 * @param {number} canvasWidth  Backing-store width in px.
 * @param {number} canvasHeight Backing-store height in px.
 * @return {{ mvp: Float32Array, modelView: Float32Array, projection: Float32Array }}
 *         The combined matrix plus its two factors, which the verifier
 *         compares against the rig's own `modelViewMatrix`/`projectionMatrix`
 *         separately — a combined-only check can hide two errors that cancel.
 */
export function buildTransform( preset, canvasWidth, canvasHeight ) {
	const halfW = canvasWidth / 2;
	const halfH = canvasHeight / 2;

	const projection = buildOrthographicMatrix(
		-halfW,
		halfW,
		halfH,
		-halfH,
		CAMERA_NEAR,
		CAMERA_FAR
	);
	const view = composeViewMatrix( CAMERA_POSITION, CAMERA_TARGET );
	const model = composeModelMatrix(
		preset.position,
		preset.rotation,
		preset.scale
	);
	const modelView = multiplyMat4( view, model );

	return {
		mvp: multiplyMat4( projection, modelView ),
		modelView,
		projection,
	};
}
