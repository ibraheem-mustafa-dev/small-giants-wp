// Spec 49 §11: the draft-pattern rows that turn one width's computed and declared styles into slot settings. Pure; not wired
// until Stage B. Rows are matched top to bottom per property; a pattern with no setting is reported, never dropped.
//
// Read shape (`e`): { declared: { longhand: value }, computed: { objectFit, objectPosition, borderRadius: { tl, tr, br, bl },
//   borderWidth: { top, right, bottom, left }, borderStyle, borderColor, boxShadow, padding: { top.. }, opacity, filter,
//   mixBlendMode, clipPath, marginLeft, marginRight, order }, box: { w, h }, natural: { w, h } | null,
//   rendered: { w, h } | null (the image's drawn size inside its box) }.
// `shapes` (optional): { slug: [[x, y], ...] } polygons in 0..100 units, the registry's polygon shapes.
// Returns { writes: { key: value }, reported: [{ property, value, reason }] } keyed by the slot schema's lower camel keys.
const px = ( v ) => ( /^-?\d*\.?\d+px$/.test( String( v ).trim() ) ? parseFloat( v ) : null );
const KEYWORD = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
const SIZING = { ratio: 'aspect-ratio', width: 'width', height: 'height', minWidth: 'min-width', maxWidth: 'max-width', minHeight: 'min-height', maxHeight: 'max-height' };

function crops( e ) {
	const n = e.natural;
	return !! ( n && n.w > 0 && n.h > 0 && e.box?.w > 0 && e.box?.h > 0 && Math.abs( e.box.w / e.box.h - n.w / n.h ) / ( n.w / n.h ) > 0.01 );
}

/**
 * `object-position` as `{x,y}` percentages. Percentages and keywords convert directly; keywords with offsets (`left 20% top`)
 * take the percentage; a pixel offset uses the free space of the rendered image size. null when unparseable.
 *
 * @param {string} value Computed object-position.
 * @param {Object} e     Element read.
 * @return {{x:number,y:number}|null} Focal, or null.
 */
export function focalOf( value, e ) {
	const t = String( value ?? '' ).trim().toLowerCase().split( /\s+/ ).filter( Boolean );
	const axisOf = ( k ) => ( 'left' === k || 'right' === k ? 'x' : 'top' === k || 'bottom' === k ? 'y' : null );
	const free = { x: ( e.box?.w ?? 0 ) - ( e.rendered?.w ?? NaN ), y: ( e.box?.h ?? 0 ) - ( e.rendered?.h ?? NaN ) };
	// A percentage, or a pixel length over the free space of the rendered image; null when neither.
	const amount = ( tok, axis ) => {
		if ( /^-?\d*\.?\d+%$/.test( tok ) ) return parseFloat( tok );
		const p = px( tok );
		return null !== p && free[ axis ] > 0 ? ( p / free[ axis ] ) * 100 : null;
	};
	const out = { x: 50, y: 50 };
	if ( ! t.length || t.length > 4 ) {
		return null;
	}
	if ( t.length <= 2 ) {
		const [ a, b ] = t;
		if ( a in KEYWORD && ( ! b || b in KEYWORD ) ) {
			// Keywords in either order: `top left`, `bottom`, `center right`.
			const axes = [ axisOf( a ), b ? axisOf( b ) : null ];
			if ( axes[ 0 ] && axes[ 0 ] === axes[ 1 ] ) return null;
			const first = axes[ 0 ] || ( 'y' === axes[ 1 ] ? 'x' : 'y' );
			const second = 'x' === first ? 'y' : 'x';
			out[ first ] = KEYWORD[ a ];
			b && ( out[ second ] = KEYWORD[ b ] );
			return out;
		}
		const x = a in KEYWORD && 'y' !== axisOf( a ) ? KEYWORD[ a ] : amount( a, 'x' );
		const y = ! b ? 50 : b in KEYWORD && 'x' !== axisOf( b ) ? KEYWORD[ b ] : amount( b, 'y' );
		return null === x || null === y ? null : { x, y };
	}
	// Keywords with offsets: `left 20% top`, `right 10px bottom 5px`.
	for ( let i = 0; i < t.length; i++ ) {
		const axis = axisOf( t[ i ] );
		if ( ! axis ) {
			if ( 'center' === t[ i ] ) continue;
			return null;
		}
		const next = t[ i + 1 ];
		const offset = next && ! ( next in KEYWORD ) ? amount( next, axis ) : 0;
		if ( null === offset ) return null;
		out[ axis ] = 'left' === t[ i ] || 'top' === t[ i ] ? offset : 100 - offset;
		next && ! ( next in KEYWORD ) && i++;
	}
	return out;
}

function radiusRows( e, shapes, out ) {
	const r = e.computed?.borderRadius;
	const w = e.box?.w;
	const h = e.box?.h;
	if ( ! r || ! ( w > 0 ) || ! ( h > 0 ) ) {
		return;
	}
	const all = [ r.tl, r.tr, r.br, r.bl ].map( ( v ) => String( v ?? '0' ).trim() );
	if ( all.every( ( v ) => '0' === v || '0px' === v ) ) {
		return;
	}
	const square = Math.abs( w - h ) / Math.max( w, h ) <= 0.01;
	if ( all.every( ( v ) => '50%' === v ) ) {
		out.writes.shape = { shape: square ? 'circle' : 'ellipse' };
		return;
	}
	const half = Math.min( w, h ) / 2;
	if ( all.every( ( v ) => null !== px( v ) && px( v ) >= half - 0.5 ) && ! square ) {
		out.writes.shape = { shape: 'pill' };
		return;
	}
	out.writes.radius = { topLeft: all[ 0 ], topRight: all[ 1 ], bottomRight: all[ 2 ], bottomLeft: all[ 3 ] };
}

function polygonShape( points, shapes ) {
	return Object.keys( shapes || {} ).find( ( slug ) => {
		const ref = shapes[ slug ];
		return ref.length === points.length && ref.every( ( [ x, y ], i ) => Math.abs( x - points[ i ][ 0 ] ) <= 1 && Math.abs( y - points[ i ][ 1 ] ) <= 1 );
	} ) || null;
}

function clipRows( e, shapes, out ) {
	const clip = String( e.computed?.clipPath ?? 'none' ).trim().toLowerCase();
	if ( ! clip || 'none' === clip ) {
		return;
	}
	if ( /^circle\(\s*50%\s*(?:at\s+50%\s+50%)?\s*\)$/.test( clip ) ) {
		out.writes.shape = { shape: 'circle' };
	} else if ( /^ellipse\(\s*50%\s+50%\s*(?:at\s+50%\s+50%)?\s*\)$/.test( clip ) ) {
		out.writes.shape = { shape: 'ellipse' };
	} else if ( /^inset\(.*\bround\s+([^)]+)\)$/.test( clip ) ) {
		const radius = /\bround\s+([^)]+)\)$/.exec( clip )[ 1 ].trim();
		out.writes.radius = { topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius };
	} else if ( clip.startsWith( 'polygon(' ) ) {
		const points = [ ...clip.matchAll( /(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%/g ) ].map( ( m ) => [ parseFloat( m[ 1 ] ), parseFloat( m[ 2 ] ) ] );
		const slug = points.length ? polygonShape( points, shapes ) : null;
		slug ? ( out.writes.shape = { shape: slug } ) : out.reported.push( { property: 'clip-path', value: clip, reason: 'polygon matches no registry shape within 1%: Custom CSS' } );
	} else {
		out.reported.push( { property: 'clip-path', value: clip, reason: 'no setting for this clip-path: Custom CSS' } );
	}
}

/**
 * @param {Object} e      Element read (one width).
 * @param {Object} fill   `heightFill( e )`.
 * @param {Object} shapes Registry polygons (optional).
 * @return {{writes:Object, reported:Object[]}} Settings and what has no setting.
 */
export function styleRows( e, fill, shapes ) {
	const out = { writes: {}, reported: [] };
	const d = e.declared || {};
	const c = e.computed || {};
	if ( fill?.fill ) {
		out.writes.height = 'fill';
	}
	for ( const [ key, prop ] of Object.entries( SIZING ) ) {
		const v = d[ prop ];
		if ( v === undefined || v === '' || ( 'height' === key && ( fill?.fill || fill?.matchItsSpace ) ) ) continue;
		out.writes[ key ] = 'ratio' === key ? ( /^auto$/i.test( v ) ? 'natural' : String( v ).replace( /\s*\/\s*/, ' / ' ) ) : v;
	}
	fill?.fill && delete out.writes.ratio;
	const n = e.natural;
	if ( d.height && ! d.width && n && e.box?.w > 0 && e.box?.h > 0 && Math.abs( e.box.w / e.box.h - n.w / n.h ) / ( n.w / n.h ) <= 0.01 ) {
		out.writes.width = 'auto';
	}
	if ( crops( e ) ) {
		c.objectFit && ( out.writes.fit = c.objectFit );
		const focal = focalOf( c.objectPosition, e );
		if ( null === focal ) {
			out.reported.push( { property: 'object-position', value: c.objectPosition, reason: 'unparseable' } );
		} else if ( 50 !== focal.x || 50 !== focal.y ) {
			out.writes.focal = focal;
		}
	}
	radiusRows( e, shapes, out );
	clipRows( e, shapes, out );
	const bw = c.borderWidth;
	if ( bw && [ bw.top, bw.right, bw.bottom, bw.left ].some( ( v ) => v > 0 ) ) {
		out.writes.borderWidth = { top: bw.top, right: bw.right, bottom: bw.bottom, left: bw.left };
		c.borderStyle && ( out.writes.borderStyle = c.borderStyle );
		c.borderColor && ( out.writes.borderColour = c.borderColor );
	}
	c.boxShadow && 'none' !== c.boxShadow && ( out.writes.boxShadow = c.boxShadow );
	const pad = c.padding;
	pad && Object.values( pad ).some( ( v ) => px( v ) > 0 ) && ( out.writes.padding = { ...pad } );
	'number' === typeof c.opacity && c.opacity < 1 && ( out.writes.opacity = Math.round( c.opacity * 100 ) );
	c.mixBlendMode && 'normal' !== c.mixBlendMode && ( out.writes.blend = c.mixBlendMode );
	'number' === typeof c.order && 0 !== c.order && ( out.writes.order = c.order );
	if ( 'auto' === d.marginLeft && 'auto' === d.marginRight ) {
		out.writes.alignment = 'center';
	}
	const f = String( c.filter ?? 'none' ).trim().toLowerCase();
	if ( f && 'none' !== f ) {
		const g = /^grayscale\(\s*(\d*\.?\d+)(%?)\s*\)$/.exec( f );
		if ( g ) {
			out.writes.colour = 'greyscale';
			out.writes.greyscale = Math.round( '%' === g[ 2 ] ? parseFloat( g[ 1 ] ) : parseFloat( g[ 1 ] ) * 100 );
		} else if ( /^brightness\(\s*0\s*\)\s+invert\(\s*(?:1|100%)\s*\)$/.test( f ) ) {
			out.writes.colour = 'white';
		} else {
			out.reported.push( { property: 'filter', value: f, reason: 'no setting for this filter: Custom CSS' } );
		}
	}
	return out;
}
