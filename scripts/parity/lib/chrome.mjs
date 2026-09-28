// Header/footer mode (`mode: 'header'`) in-page collectors for draft-live-walk.mjs. Each is
// passed to page.evaluate(), so each is self-contained. GAP-CHECKLIST.md section 11 says what each proves.

// The ground an element actually paints (its own background, else a ::before/::after, else a
// child covering 80% of its box), and where its first painted text sits inside its box.
export function paintedExtras( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const r = el.getBoundingClientRect();
	const clear = ( c ) => ! c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test( c );
	const covers = ( b ) => b.width * b.height >= 0.8 * r.width * r.height;
	const visible = ( cs ) => cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat( cs.opacity ) > 0.05;
	// A colour with its layer's opacity folded into the alpha, so the same paint reads the same.
	const fold = ( c, op ) => {
		const ctx = document.createElement( 'canvas' ).getContext( '2d' );
		ctx.fillStyle = c;
		ctx.fillRect( 0, 0, 1, 1 );
		const [ R, G, B, A ] = ctx.getImageData( 0, 0, 1, 1 ).data;
		return `rgba(${ R }, ${ G }, ${ B }, ${ Math.round( ( A / 255 ) * parseFloat( op ) * 100 ) / 100 })`;
	};
	let ground = 'none';
	const own = getComputedStyle( el );
	if ( ! clear( own.backgroundColor ) ) {
		ground = fold( own.backgroundColor, own.opacity );
	} else {
		for ( const p of [ '::before', '::after' ] ) {
			const ps = getComputedStyle( el, p );
			if ( ps.content !== 'none' && visible( ps ) && ! clear( ps.backgroundColor ) && parseFloat( ps.width ) * parseFloat( ps.height ) >= 0.8 * r.width * r.height ) {
				ground = fold( ps.backgroundColor, ps.opacity );
				break;
			}
		}
		if ( 'none' === ground ) {
			const kid = [ ...el.querySelectorAll( '*' ) ].find( ( k ) => {
				const cs = getComputedStyle( k );
				return visible( cs ) && ! clear( cs.backgroundColor ) && covers( k.getBoundingClientRect() );
			} );
			if ( kid ) {
				const cs = getComputedStyle( kid );
				ground = fold( cs.backgroundColor, cs.opacity );
			}
		}
	}
	const walker = document.createTreeWalker( el, NodeFilter.SHOW_TEXT, { acceptNode: ( n ) => ( n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP ) } );
	let text = null;
	for ( let n = walker.nextNode(); n; n = walker.nextNode() ) {
		const range = document.createRange();
		range.selectNodeContents( n );
		const tr = range.getBoundingClientRect();
		if ( tr.width ) {
			text = { x: Math.round( tr.x - r.x ), y: Math.round( tr.y - r.y ) };
			break;
		}
	}
	return { ground, textX: text ? text.x : null, textY: text ? text.y : null };
}

// Everything painted under a root, in reading order: text leaves, media (img, svg, video, canvas;
// a glyph drawn from 2-4px dots counts as one media of kind "dots"), each with the text of the
// row it sits in, its size and part count, and whether it spills out of its painted parent.
export function inventory( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const root = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! root ) {
		return null;
	}
	// Painted and inside the root's box: a closed pill that clips its menu does not count the menu.
	const rb = root.getBoundingClientRect();
	const shown = ( e ) => {
		const b = e.getBoundingClientRect();
		const cs = getComputedStyle( e );
		const inside = b.right > rb.left && b.left < rb.right && b.bottom > rb.top && b.top < rb.bottom;
		// Clipped to nothing by itself or an ancestor (a hidden form layer, a closed submenu), or
		// outside an ancestor that hides its overflow.
		for ( let a = e; a && a !== root; a = a.parentElement ) {
			// Inside a closed <details> (other than its summary): collapsed, whatever its box says.
			if ( 'DETAILS' === a.tagName && ! a.open && ! e.closest( 'summary' ) ) {
				return false;
			}
			const ab = a.getBoundingClientRect();
			if ( a !== e && 'visible' !== getComputedStyle( a ).overflow && ! ( b.right > ab.left && b.left < ab.right && b.bottom > ab.top && b.top < ab.bottom ) ) {
				return false;
			}
			if ( /inset\((0(px|%)? )?0(px|%)? 100%|100%/.test( getComputedStyle( a ).clipPath ) ) {
				return false;
			}
		}
		return b.width > 0 && b.height > 0 && inside && cs.visibility !== 'hidden' && parseFloat( cs.opacity ) > 0.05;
	};
	const norm = ( s ) => ( s || '' ).replace( /[‘’]/g, "'" ).replace( /\s+/g, ' ' ).trim().toLowerCase();
	const host = ( e ) => {
		for ( let a = e.parentElement; a && a !== root.parentElement; a = a.parentElement ) {
			const t = norm( a.innerText );
			if ( t && t.length < 60 ) {
				return t;
			}
		}
		return '';
	};
	const painted = ( e ) => {
		for ( let a = e.parentElement; a && a !== root; a = a.parentElement ) {
			const cs = getComputedStyle( a );
			if ( cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderRadius === '50%' ) {
				return a.getBoundingClientRect();
			}
		}
		return null;
	};
	const texts = [];
	const media = [];
	const seen = new Set();
	for ( const e of root.querySelectorAll( '*' ) ) {
		if ( ! shown( e ) || [ ...seen ].some( ( s ) => s.contains( e ) ) ) {
			continue;
		}
		const tag = e.tagName.toLowerCase();
		const own = norm( [ ...e.childNodes ].filter( ( n ) => n.nodeType === 3 ).map( ( n ) => n.textContent ).join( ' ' ) );
		const dots = [ ...e.children ].filter( ( k ) => { const b = k.getBoundingClientRect(); return b.width >= 1 && b.width <= 4 && b.height <= 4 && shown( k ); } );
		const kind = [ 'img', 'svg', 'video', 'canvas' ].includes( tag ) ? tag : dots.length >= 3 && dots.length === e.children.length ? 'dots' : null;
		if ( kind ) {
			seen.add( e );
			const b = e.getBoundingClientRect();
			const parts = 'svg' === kind ? e.querySelectorAll( 'path, circle, rect, line, polyline, polygon, ellipse' ).length : 'dots' === kind ? dots.length : 1;
			const frame = painted( e );
			const spill = frame ? Math.max( frame.x - b.x, frame.y - b.y, b.right - frame.right, b.bottom - frame.bottom ) : 0;
			media.push( { kind, host: host( e ), w: Math.round( b.width ), h: Math.round( b.height ), parts, spill: Math.round( spill ) } );
		} else if ( own ) {
			const b = e.getBoundingClientRect();
			texts.push( { own, top: b.top, bottom: b.bottom, x: b.left } );
		}
	}
	// On-screen reading order: rows by vertical overlap (a 3px hover lift stays in its row), then
	// left to right. CSS can reorder a column that DOM order hides.
	texts.sort( ( a, b ) => a.top - b.top );
	const rows = [];
	for ( const t of texts ) {
		const row = rows.find( ( r ) => ( t.top + t.bottom ) / 2 > r.top && ( t.top + t.bottom ) / 2 < r.bottom );
		if ( row ) {
			row.items.push( t );
		} else {
			rows.push( { top: t.top, bottom: t.bottom, items: [ t ] } );
		}
	}
	return { texts: rows.flatMap( ( r ) => r.items.sort( ( a, b ) => a.x - b.x ).map( ( t ) => t.own ) ), media };
}

// Motion right after an action, for each named root: its box and opacity/transform/clip, the
// first six text leaves' opacity/transform/clip, and the delays of the animations running in it.
export function timelineSample( [ finders, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const out = {};
	for ( const [ name, f ] of Object.entries( finders ) ) {
		const el = resolve( f );
		if ( ! el ) {
			out[ name ] = null;
			continue;
		}
		// A pose includes the ancestors up to `upTo`: a row that slides in moves its label, a wrapper
		// that fades in fades the panel inside it.
		const pose = ( e, upTo ) => {
			let op = 1;
			let tf = 'none';
			let clip = 'none';
			for ( let a = e; a && a !== upTo; a = a.parentElement ) {
				const cs = getComputedStyle( a );
				op *= parseFloat( cs.opacity );
				tf = 'none' !== cs.transform && 'matrix(1, 0, 0, 1, 0, 0)' !== cs.transform ? cs.transform : tf;
				clip = 'none' !== cs.clipPath ? cs.clipPath : clip;
			}
			return { op: Math.round( op * 100 ) / 100, tf, clip };
		};
		const b = el.getBoundingClientRect();
		const leaves = [ ...el.querySelectorAll( '*' ) ].filter( ( e ) => [ ...e.childNodes ].some( ( n ) => n.nodeType === 3 && n.textContent.trim() ) && e.getClientRects().length ).slice( 0, 6 );
		const anims = document.getAnimations().filter( ( a ) => a.effect?.target && ( el.contains( a.effect.target ) || a.effect.target.contains( el ) ) )
			.map( ( a ) => Math.round( a.effect.getTiming().delay || 0 ) );
		out[ name ] = { w: Math.round( b.width ), h: Math.round( b.height ), ...pose( el, document.documentElement ), leaves: leaves.map( ( x ) => pose( x, el ) ), delays: anims };
	}
	return out;
}

// The hover-relevant state of an element and everything inside it (and their ::before/::after):
// read at rest and at the hover end state, and the text read mid-hover (a scramble).
export function hoverDetail( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const r = el.getBoundingClientRect();
	const parts = [];
	const read = ( cs, b, id ) => parts.push( {
		id, op: parseFloat( cs.opacity ), bg: cs.backgroundColor, tf: cs.transform, pl: cs.paddingLeft,
		vis: cs.display !== 'none' && cs.visibility !== 'hidden',
		cover: b.width * b.height >= 0.8 * r.width * r.height, small: b.width <= 24 && b.height <= 24, left: b.x - r.x < r.width / 3,
	} );
	[ el, ...el.querySelectorAll( '*' ) ].forEach( ( e, i ) => {
		read( getComputedStyle( e ), e.getBoundingClientRect(), `${ i }` );
		for ( const p of [ '::before', '::after' ] ) {
			const ps = getComputedStyle( e, p );
			if ( ps.content !== 'none' ) {
				read( ps, { width: parseFloat( ps.width ) || 0, height: parseFloat( ps.height ) || 0, x: r.x }, `${ i }${ p }` );
			}
		}
	} );
	return { text: ( el.innerText || '' ).replace( /\s+/g, ' ' ).trim(), parts };
}
