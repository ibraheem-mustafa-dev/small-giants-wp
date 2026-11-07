/**
 * Transform-independent layout measurements.
 *
 * `getBoundingClientRect()` reports the PAINTED box, so an entrance `scale()`, a held transform or any ancestor's scale
 * shrinks every width and distance read from it. Sliders, marquees and loops step by layout pixels (scroll offsets,
 * translate lengths), so they read these helpers instead: the painted rect divided by the scale painted on the element
 * and its ancestors. The scale is read from the computed `scale` and `transform` values, so a running entrance animation
 * is included.
 */

function matrixScale( transform ) {
	if (
		! transform ||
		'none' === transform ||
		'function' !== typeof window.DOMMatrixReadOnly
	) {
		return { x: 1, y: 1 };
	}
	try {
		const m = new window.DOMMatrixReadOnly( transform );
		return { x: Math.hypot( m.a, m.b ) || 1, y: Math.hypot( m.c, m.d ) || 1 };
	} catch ( error ) {
		return { x: 1, y: 1 };
	}
}

function ownScaleOf( el ) {
	const style = window.getComputedStyle( el );
	const m = matrixScale( style.transform );
	let x = m.x;
	let y = m.y;
	const parts = String( style.scale || '' )
		.trim()
		.split( /\s+/ )
		.map( parseFloat );
	if ( parts.length && Number.isFinite( parts[ 0 ] ) ) {
		x *= parts[ 0 ];
		y *= Number.isFinite( parts[ 1 ] ) ? parts[ 1 ] : parts[ 0 ];
	}
	return { x: x > 0 ? x : 1, y: y > 0 ? y : 1 };
}

/**
 * The scale a transform or `scale` property paints on the element itself.
 *
 * @param {Element} el Element to read.
 * @return {{x: number, y: number}} Horizontal and vertical scale, 1 when none.
 */
export function ownScale( el ) {
	return ownScaleOf( el );
}

/**
 * The scale painted on an element by itself and every ancestor.
 *
 * @param {Element} el Element to read.
 * @return {{x: number, y: number}} Horizontal and vertical scale, 1 when none.
 */
export function layoutScale( el ) {
	let x = 1;
	let y = 1;
	for ( let node = el; node && 1 === node.nodeType; node = node.parentElement ) {
		const s = ownScaleOf( node );
		x *= s.x;
		y *= s.y;
	}
	return { x, y };
}

/**
 * Border-box size in layout pixels, whatever scale is painted on the element or its ancestors.
 *
 * @param {Element} el Element to measure.
 * @return {{width: number, height: number}} Layout size.
 */
export function layoutBox( el ) {
	const rect = el.getBoundingClientRect();
	const scale = layoutScale( el );
	return { width: rect.width / scale.x, height: rect.height / scale.y };
}

/**
 * Where an element's border box starts inside an ancestor, in layout pixels.
 *
 * @param {Element} el       Element to locate.
 * @param {Element} ancestor Element whose painted scale is divided out.
 * @return {{x: number, y: number}} Offset from the ancestor's top-left corner.
 */
export function layoutOffset( el, ancestor ) {
	const scale = layoutScale( ancestor );
	const a = ancestor.getBoundingClientRect();
	const b = el.getBoundingClientRect();
	return { x: ( b.left - a.left ) / scale.x, y: ( b.top - a.top ) / scale.y };
}
