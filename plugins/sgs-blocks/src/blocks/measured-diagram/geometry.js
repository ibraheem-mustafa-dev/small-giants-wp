/**
 * Measured diagram geometry — the editor-canvas twin of
 * includes/helpers-diagram-geometry.php::sgs_diagram_dimension_paths().
 *
 * Both sides read one shared fixture set
 * (tests/fixtures/diagram-geometry-fixtures.json) and must produce identical
 * path strings, so the canvas preview and the page draw the same lines.
 *
 * Coordinates arrive as % of the drawing box (0–100); reach, overshoot and
 * tick length as % of the drawing WIDTH, so one scale holds on both axes. The
 * viewBox is the drawing's own width × height, so its units are isotropic.
 *
 * The guide lines run along the line's normal n = (-uy, ux), where u is the
 * unit vector from start to end. A positive reach reaches towards -n (above a
 * left-to-right line); a negative reach reaches towards +n. The overshoot
 * always continues past the line on the side opposite the reach.
 */

/**
 * Round to two decimals, dropping a trailing ".00" (the PHP twin formats the
 * same way).
 *
 * @param {number} value
 * @return {string} Formatted number.
 */
export function fmt( value ) {
	const rounded = Math.round( value * 100 ) / 100;
	const fixed = ( Object.is( rounded, -0 ) ? 0 : rounded ).toFixed( 2 );
	return fixed.replace( /\.?0+$/, '' ) || '0';
}

/**
 * Clamp a number into [min, max], with a fallback for junk input.
 *
 * @param {*}      value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @return {number} The clamped number.
 */
function clamp( value, min, max, fallback ) {
	const num = Number( value );
	if ( value === null || value === '' || ! Number.isFinite( num ) ) {
		return fallback;
	}
	return Math.min( max, Math.max( min, num ) );
}

/**
 * Build the SVG path data for one dimension.
 *
 * @param {Object} dim                Dimension settings.
 * @param {number} dim.startX         Start x, % of drawing width.
 * @param {number} dim.startY         Start y, % of drawing height.
 * @param {number} dim.endX           End x, % of drawing width.
 * @param {number} dim.endY           End y, % of drawing height.
 * @param {string} [dim.kind]         'dimension' | 'leader'.
 * @param {string} [dim.endStyle]     'tick' | 'arrow' | 'dot' | 'none'.
 * @param {number} [dim.extReach]     Guide reach at the start, % of width (signed).
 * @param {number} [dim.extReachEnd]  Guide reach at the end; null = same as the start.
 * @param {number} [dim.extOvershoot] Guide overshoot past the line, % of width.
 * @param {number} [dim.tickLength]   Tick or arrow length, % of width.
 * @param {number} width              Drawing (viewBox) width.
 * @param {number} height             Drawing (viewBox) height.
 * @return {{line: string, guides: string, ends: string, dots: Array<{cx: string, cy: string}>}} Path data.
 */
export function dimensionPaths( dim, width, height ) {
	const empty = { line: '', guides: '', ends: '', dots: [] };
	const w = Number( width );
	const h = Number( height );
	if ( ! ( w > 0 ) || ! ( h > 0 ) ) {
		return empty;
	}
	const scale = w / 100;
	const x1 = ( clamp( dim.startX, 0, 100, 0 ) / 100 ) * w;
	const y1 = ( clamp( dim.startY, 0, 100, 0 ) / 100 ) * h;
	const x2 = ( clamp( dim.endX, 0, 100, 0 ) / 100 ) * w;
	const y2 = ( clamp( dim.endY, 0, 100, 0 ) / 100 ) * h;
	const length = Math.hypot( x2 - x1, y2 - y1 );
	if ( length === 0 ) {
		return empty;
	}
	const ux = ( x2 - x1 ) / length;
	const uy = ( y2 - y1 ) / length;
	const nx = -uy;
	const ny = ux;

	const kind = dim.kind === 'leader' ? 'leader' : 'dimension';
	const endStyle = [ 'tick', 'arrow', 'dot', 'none' ].includes( dim.endStyle )
		? dim.endStyle
		: 'tick';
	const tick = clamp( dim.tickLength, 0, 20, 1.76 ) * scale;
	const overshoot = clamp( dim.extOvershoot, 0, 50, 0 ) * scale;
	const reachStart = clamp( dim.extReach, -100, 100, 0 ) * scale;
	const reachEnd =
		dim.extReachEnd === null || dim.extReachEnd === undefined || dim.extReachEnd === ''
			? reachStart
			: clamp( dim.extReachEnd, -100, 100, 0 ) * scale;

	const line = `M${ fmt( x1 ) } ${ fmt( y1 ) }L${ fmt( x2 ) } ${ fmt( y2 ) }`;

	let guides = '';
	if ( kind === 'dimension' ) {
		[
			[ x1, y1, reachStart ],
			[ x2, y2, reachEnd ],
		].forEach( ( [ px, py, reach ] ) => {
			if ( reach === 0 ) {
				return;
			}
			const sign = reach > 0 ? 1 : -1;
			const ax = px - nx * reach;
			const ay = py - ny * reach;
			const bx = px + nx * sign * overshoot;
			const by = py + ny * sign * overshoot;
			guides += `M${ fmt( ax ) } ${ fmt( ay ) }L${ fmt( bx ) } ${ fmt( by ) }`;
		} );
	}

	let ends = '';
	const dots = [];
	// A leader marks only the point it starts from; a dimension marks both ends.
	const endPoints =
		kind === 'leader'
			? [ [ x1, y1, 1 ] ]
			: [
					[ x1, y1, 1 ],
					[ x2, y2, -1 ],
			  ];
	endPoints.forEach( ( [ px, py, inward ] ) => {
		if ( endStyle === 'none' || tick === 0 ) {
			return;
		}
		if ( endStyle === 'dot' ) {
			dots.push( { cx: fmt( px ), cy: fmt( py ) } );
			return;
		}
		if ( endStyle === 'tick' ) {
			const half = tick / 2;
			ends += `M${ fmt( px - nx * half ) } ${ fmt( py - ny * half ) }L${ fmt(
				px + nx * half
			) } ${ fmt( py + ny * half ) }`;
			return;
		}
		// Arrow: two strokes pointing at the end, 30 degrees either side of the line.
		const back = tick * Math.cos( Math.PI / 6 );
		const side = tick * Math.sin( Math.PI / 6 );
		const bx = px + ux * inward * back;
		const by = py + uy * inward * back;
		ends += `M${ fmt( bx + nx * side ) } ${ fmt( by + ny * side ) }L${ fmt(
			px
		) } ${ fmt( py ) }L${ fmt( bx - nx * side ) } ${ fmt( by - ny * side ) }`;
	} );

	return { line, guides, ends, dots };
}
