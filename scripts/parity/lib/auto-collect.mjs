// In-page collector for the walker's automatic check (GAP-CHECKLIST.md section 12): every painted
// word and every control or media item on the page, so nothing depends on a config naming it.
// Passed to page.evaluate(), so it is self-contained.

// Returns { words, controls, dpr, scrollX, scrollY, vw, vh }. `scope.root` limits it to one element;
// `scope.modal` marks what sits inside an open modal (m: true); `exclude` lists selectors whose
// subtrees are skipped (the header, footer and floating chat: the nav track checks those).
export function collectAuto( [ scope, exclude, maxWords ] ) {
	const root = scope.root || document.body;
	const inModal = ( el ) => !! scope.modal && scope.modal.contains( el );
	const ex = [ ...( scope.excludeEls || [] ), ...exclude.flatMap( ( sel ) => {
		try {
			return [ ...document.querySelectorAll( sel ) ];
		} catch {
			return [];
		}
	} ) ];
	const excluded = ( el ) => ex.some( ( x ) => x.contains( el ) );
	const ctx = document.createElement( 'canvas' ).getContext( '2d' );
	const srgb = ( v ) => {
		ctx.fillStyle = '#000';
		ctx.fillStyle = v;
		const f = ctx.fillStyle;
		if ( ! f.startsWith( '#' ) ) {
			return f.replace( /\s+/g, '' );
		}
		const n = parseInt( f.slice( 1 ), 16 );
		return `rgb(${ ( n >> 16 ) & 255 },${ ( n >> 8 ) & 255 },${ n & 255 })`;
	};
	const sy = window.scrollY;
	const sx = window.scrollX;
	const inView = ( r ) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
	// Hidden for everyone: screen-reader-only boxes (1px or clipped to nothing) and zero-size text.
	const srOnly = ( el ) => {
		for ( let a = el, i = 0; a && i < 4; a = a.parentElement, i++ ) {
			const r = a.getBoundingClientRect();
			const cs = getComputedStyle( a );
			if ( ( 'absolute' === cs.position && r.width <= 2 && r.height <= 2 ) || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test( cs.clip ) || /inset\(50%\)/.test( cs.clipPath ) ) {
				return true;
			}
		}
		return false;
	};
	const opacity = ( el ) => {
		let o = 1;
		for ( let a = el; a && a !== document.documentElement; a = a.parentElement ) {
			o *= parseFloat( getComputedStyle( a ).opacity );
		}
		return o;
	};
	const fixedOf = ( el ) => {
		for ( let a = el; a && a !== document.body; a = a.parentElement ) {
			if ( 'fixed' === getComputedStyle( a ).position ) {
				return true;
			}
		}
		return false;
	};
	// A closed <details> paints only its summary, yet Chrome still reports boxes for the rest of it.
	const inClosedDetails = ( el ) => {
		for ( let d = el.closest( 'details:not([open])' ); d; d = d.parentElement?.closest( 'details:not([open])' ) ) {
			const summary = d.querySelector( ':scope > summary' );
			if ( ! summary || ! summary.contains( el ) ) {
				return true;
			}
		}
		return false;
	};
	// A pending scroll reveal holds content at opacity 0 off screen, so opacity only hides what is in view.
	const hidden = ( el, r ) => inClosedDetails( el ) || ( inView( r ) && opacity( el ) < 0.05 );
	// The offset of a reveal's start pose (a faded ancestor moved by transform or translate), taken off
	// every position: the draft poses its cards from load, the framework only near view.
	const shifts = new Map();
	const shiftOf = ( el ) => {
		if ( ! el || el === root.parentElement || el === document.documentElement ) {
			return [ 0, 0 ];
		}
		if ( ! shifts.has( el ) ) {
			const cs = getComputedStyle( el );
			const up = shiftOf( el.parentElement );
			let own = [ 0, 0 ];
			if ( parseFloat( cs.opacity ) < 0.99 ) {
				const m = 'none' === cs.transform ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly( cs.transform );
				const tr = 'none' === cs.translate ? [ 0, 0 ] : cs.translate.split( ' ' ).map( parseFloat );
				own = [ m.m41 + ( tr[ 0 ] || 0 ), m.m42 + ( tr[ 1 ] || 0 ) ];
			}
			shifts.set( el, [ up[ 0 ] + own[ 0 ], up[ 1 ] + own[ 1 ] ] );
		}
		return shifts.get( el );
	};

	// The box an element's paint is clipped to: the intersection of every ancestor that clips its overflow.
	// Text in a collapsed group (height 0, overflow hidden) has boxes of its own and paints nothing.
	const clips = new Map();
	const clipOf = ( el ) => {
		if ( ! el || el === document.body || el === document.documentElement ) {
			return { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
		}
		if ( ! clips.has( el ) ) {
			const up = clipOf( el.parentElement );
			const cs = getComputedStyle( el.parentElement || el );
			let c = up;
			if ( el.parentElement && ( 'visible' !== cs.overflowX || 'visible' !== cs.overflowY ) ) {
				const r = el.parentElement.getBoundingClientRect();
				c = { l: Math.max( up.l, r.left ), t: Math.max( up.t, r.top ), r: Math.min( up.r, r.right ), b: Math.min( up.b, r.bottom ) };
			}
			clips.set( el, c );
		}
		return clips.get( el );
	};
	// The element's own overflow counts too: text cut off by its own box ("GUCCI OVERSIZED CA…").
	const clippedAway = ( el, r ) => {
		let c = clipOf( el );
		const own = getComputedStyle( el );
		if ( 'visible' !== own.overflowX || 'visible' !== own.overflowY ) {
			const b = el.getBoundingClientRect();
			c = { l: Math.max( c.l, b.left ), t: Math.max( c.t, b.top ), r: Math.min( c.r, b.right ), b: Math.min( c.b, b.bottom ) };
		}
		return r.right <= c.l + 1 || r.left >= c.r - 1 || r.bottom <= c.t || r.top >= c.b;
	};

	const words = [];
	const styleCache = new Map();
	const tw = document.createTreeWalker( root, NodeFilter.SHOW_TEXT );
	const range = document.createRange();
	for ( let n = tw.nextNode(); n && words.length < maxWords; n = tw.nextNode() ) {
		const el = n.parentElement;
		if ( ! el || ! n.textContent.trim() || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION)$/.test( el.tagName ) || el.closest( 'svg' ) || excluded( el ) ) {
			continue;
		}
		if ( ! styleCache.has( el ) ) {
			const cs = getComputedStyle( el );
			const r = el.getBoundingClientRect();
			const skip = 'hidden' === cs.visibility || parseFloat( cs.fontSize ) < 2 || srOnly( el ) || hidden( el, r );
			styleCache.set( el, skip ? null : {
				fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily.split( ',' )[ 0 ].replace( /["']/g, '' ).trim().toLowerCase(),
				fst: cs.fontStyle, tt: cs.textTransform, ls: cs.letterSpacing, c: srgb( cs.color ), fixed: fixedOf( el ), m: inModal( el ),
			} );
		}
		const st = styleCache.get( el );
		if ( ! st ) {
			continue;
		}
		for ( const m of n.textContent.matchAll( /\S+/g ) ) {
			range.setStart( n, m.index );
			range.setEnd( n, m.index + m[ 0 ].length );
			const r = range.getClientRects()[ 0 ];
			if ( ! r || r.width < 1 || clippedAway( el, r ) ) {
				continue;
			}
			const t = m[ 0 ].toLowerCase().replace( /[’‘]/g, "'" ).replace( /[“”]/g, '"' );
			const [ ox, oy ] = shiftOf( el );
			words.push( { t, x: Math.round( r.left - ox + ( st.fixed ? 0 : sx ) ), y: Math.round( r.top - oy + ( st.fixed ? 0 : sy ) ), w: Math.round( r.width ), h: Math.round( r.height ), ...st } );
		}
	}

	// Controls and media: form controls, buttons and links with no words (icons, swatches), pictures.
	const CONTROL = 'input:not([type=hidden]), select, textarea, [role=slider], [role=switch], [role=checkbox], [role=radio], button, a[href], img, video, canvas, picture';
	const controls = [];
	for ( const el of root.querySelectorAll( CONTROL ) ) {
		if ( excluded( el ) || ( 'IMG' === el.tagName && el.closest( 'picture' ) ) ) {
			continue;
		}
		if ( /^(BUTTON|A)$/.test( el.tagName ) && el.innerText.trim() ) {
			continue;
		}
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle( el );
		// A range input paints its track and handles outside its box, which can be 0px tall (WooCommerce's
		// price slider): it is kept at any height, with a 16px band round its centre line as its painted rows.
		const range = 'range' === el.type;
		if ( r.width < 6 || ( r.height < 6 && ! range ) || 'hidden' === cs.visibility || ( ! range && srOnly( el ) ) || hidden( el, r ) ) {
			continue;
		}
		const type = 'INPUT' === el.tagName ? `input:${ el.type }` : /^(IMG|PICTURE|VIDEO|CANVAS)$/.test( el.tagName ) ? 'media' : el.getAttribute( 'role' ) || el.tagName.toLowerCase();
		// The nearest ancestor that clips its overflow: a control flush with its edge may be cut off.
		let clip = null;
		for ( let a = el.parentElement; a && a !== document.body; a = a.parentElement ) {
			const acs = getComputedStyle( a );
			if ( 'visible' !== acs.overflowX || 'visible' !== acs.overflowY ) {
				const c = a.getBoundingClientRect();
				let bg = 'rgba(0,0,0,0)';
				for ( let g = a; g && /rgba\(0, 0, 0, 0\)|transparent/.test( bg ); g = g.parentElement ) {
					bg = getComputedStyle( g ).backgroundColor;
				}
				// The padding box: a border inside the edge is not the control's ink.
				clip = { l: c.left + parseFloat( acs.borderLeftWidth ), r: c.right - parseFloat( acs.borderRightWidth ), t: c.top, b: c.bottom, bg: srgb( bg ) };
				break;
			}
		}
		const fixed = fixedOf( el );
		const [ ox, oy ] = shiftOf( el );
		controls.push( {
			type, label: ( el.getAttribute( 'aria-label' ) || el.getAttribute( 'alt' ) || el.getAttribute( 'title' ) || '' ).toLowerCase().slice( 0, 40 ),
			x: Math.round( r.left - ox + ( fixed ? 0 : sx ) ), y: Math.round( r.top - oy + ( fixed ? 0 : sy ) ), w: Math.round( r.width ), h: Math.round( r.height ), fixed, m: inModal( el ),
			client: { l: r.left, r: r.right, t: range && r.height < 16 ? r.top + r.height / 2 - 8 : r.top, b: range && r.height < 16 ? r.top + r.height / 2 + 8 : r.bottom }, clip,
		} );
	}
	return { words, controls, dpr: window.devicePixelRatio, scrollX: sx, scrollY: sy, vw: innerWidth, vh: innerHeight };
}
