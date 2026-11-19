// In-page functions for the render check's capture (each runs inside the page through page.evaluate, so each is
// self-contained). recordTree: every element's key, own text, picture source, box and computed style (deduplicated
// into a style table), with ::before and ::after. settle: finish every finite animation and transition, park every
// endless one at its start, pause videos. breakpoints: every width a stylesheet's media query switches at.
// probeTargets: one visible element per distinct interactive kind, marked for the forced hover and focus probes.

export function recordTree( [ rootSel, PROPS ] ) {
	const GENERATED = /\bsgs-c-\S+|\bsgs-m-\S+|\bsgs-cl-\S+|\bsgs-[a-z-]*-[0-9a-f]{6,}\b|\bwp-container-\S+|\bwp-elements-\S+|\bis-visible\b|\bsgs-in-view\b|\bsgs-focus-source\b|\bsgs-motion\S*/g;
	const clean = ( c ) => String( c || '' ).replace( GENERATED, '' ).replace( /\s+/g, ' ' ).trim();
	const styles = [];
	const index = new Map();
	const vec = ( cs, pseudo ) => {
		const v = PROPS.map( ( p ) => cs.getPropertyValue( p ) );
		if ( pseudo ) {
			v.push( cs.getPropertyValue( 'content' ), cs.getPropertyValue( 'width' ), cs.getPropertyValue( 'height' ) );
		}
		const s = v.join( '\u0001' );
		if ( ! index.has( s ) ) {
			index.set( s, styles.length );
			styles.push( v );
		}
		return index.get( s );
	};
	const ownText = ( e ) => {
		let t = '';
		for ( const n of e.childNodes ) {
			if ( n.nodeType === 3 ) {
				t += n.nodeValue;
			}
		}
		t = t.replace( /\s+/g, ' ' ).trim();
		if ( ! t && ( e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' ) ) {
			t = 'value=' + e.value + ( e.placeholder ? ' placeholder=' + e.placeholder : '' );
		}
		return t.slice( 0, 200 );
	};
	// The src attribute, not currentSrc: which srcset candidate a lazy `sizes="auto"` picture loads varies between two
	// loads of one page; a changed srcset or sizes shows in the server's HTML and in the box.
	const src = ( e ) => {
		const s = e.getAttribute( 'src' ) || '';
		return s.replace( /^https?:\/\/[^/]+/, '' ).replace( /\?.*$/, '' );
	};
	// An inline icon's shapes, as a short fingerprint of its markup (ids and url(#id) references dropped: they are
	// generated per page), since the elements inside an svg are not recorded one by one.
	const svgSig = ( e ) => {
		const s = e.innerHTML.replace( /\s(id|class)="[^"]*"/g, '' ).replace( /url\(#[^)]*\)/g, 'url()' ).replace( /\s+/g, ' ' );
		let h = 5381;
		for ( let i = 0; i < s.length; i++ ) {
			h = ( ( h * 33 ) ^ s.charCodeAt( i ) ) >>> 0;
		}
		return 'svg:' + s.length + ':' + h.toString( 16 );
	};
	const root = rootSel ? document.querySelector( rootSel ) : document.body;
	const els = root ? [ ...( rootSel ? [ root ] : [] ), ...root.querySelectorAll( '*' ) ] : [];
	const out = [];
	for ( const e of els ) {
		const tag = e.tagName.toLowerCase();
		if ( [ 'script', 'style', 'noscript', 'link', 'meta', 'template' ].includes( tag ) ) {
			continue;
		}
		if ( ( e.closest( 'svg' ) && tag !== 'svg' ) || e.closest( '#wpadminbar' ) ) {
			continue;
		}
		const cls = clean( typeof e.className === 'string' ? e.className : e.getAttribute( 'class' ) || '' );
		const key = tag + ( cls ? '.' + cls.split( ' ' ).join( '.' ) : '' );
		const cs = getComputedStyle( e );
		if ( cs.display === 'none' ) {
			out.push( [ key, 0, 0, 0, 0, -1, -1, -1, '', '' ] );
			continue;
		}
		const r = e.getBoundingClientRect();
		const b = getComputedStyle( e, '::before' );
		const a = getComputedStyle( e, '::after' );
		const has = ( p ) => p.content && p.content !== 'none' && p.content !== 'normal';
		const round = ( n ) => Math.round( n * 10 ) / 10;
		out.push( [
			key, round( r.x + scrollX ), round( r.y + scrollY ), round( r.width ), round( r.height ),
			vec( cs ), has( b ) ? vec( b, true ) : -1, has( a ) ? vec( a, true ) : -1,
			ownText( e ), tag === 'svg' ? svgSig( e ) : tag === 'img' || tag === 'source' || tag === 'video' ? src( e ) : '',
		] );
	}
	return { els: out, styles, scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth };
}

export async function settle() {
	for ( let pass = 0; pass < 3; pass++ ) {
		for ( const anim of document.getAnimations() ) {
			try {
				const timing = anim.effect && anim.effect.getComputedTiming ? anim.effect.getComputedTiming() : null;
				if ( timing && timing.iterations === Infinity ) {
					anim.pause();
					anim.currentTime = 0;
				} else {
					anim.finish();
				}
			} catch ( e ) {
				// An animation with no finite end that is not marked endless: leave it.
			}
		}
		document.querySelectorAll( 'video' ).forEach( ( v ) => {
			v.pause();
			v.currentTime = 0;
		} );
		await new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) );
	}
}

export async function scrollThrough() {
	for ( let y = 0; y < document.documentElement.scrollHeight; y += 500 ) {
		scrollTo( { top: y, behavior: 'instant' } );
		await new Promise( ( r ) => setTimeout( r, 50 ) );
	}
	scrollTo( { top: 0, behavior: 'instant' } );
	await document.fonts.ready;
}

export function breakpoints() {
	const found = new Set();
	const toPx = ( n, unit ) => ( unit === 'px' ? n : n * 16 );
	const read = ( text ) => {
		const re = /(min|max)-width\s*:\s*([\d.]+)(px|em|rem)|width\s*(>=|>|<=|<)\s*([\d.]+)(px|em|rem)/g;
		let m;
		while ( ( m = re.exec( text ) ) ) {
			if ( m[ 1 ] ) {
				const px = toPx( parseFloat( m[ 2 ] ), m[ 3 ] );
				// The first width of the band above the switch: min-width N starts at N, max-width N ends at N.
				found.add( m[ 1 ] === 'min' ? Math.ceil( px ) : Math.floor( px ) + 1 );
			} else {
				const px = toPx( parseFloat( m[ 5 ] ), m[ 6 ] );
				found.add( m[ 4 ] === '>=' || m[ 4 ] === '<' ? Math.ceil( px ) : Math.floor( px ) + 1 );
			}
		}
	};
	const walk = ( rules ) => {
		for ( const rule of rules ) {
			if ( rule.media ) {
				read( rule.media.mediaText );
			}
			if ( rule.cssRules ) {
				walk( rule.cssRules );
			}
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			read( sheet.media ? sheet.media.mediaText : '' );
			walk( sheet.cssRules );
		} catch ( e ) {
			// A cross-origin stylesheet's rules cannot be read.
		}
	}
	return [ ...found ].sort( ( x, y ) => x - y );
}

export function probeTargets( cap ) {
	const GENERATED = /\bsgs-c-\S+|\bsgs-m-\S+|\bsgs-cl-\S+|\bsgs-[a-z-]*-[0-9a-f]{6,}\b|\bwp-container-\S+|\bwp-elements-\S+|\bis-visible\b|\bsgs-in-view\b|\bsgs-focus-source\b|\bsgs-motion\S*/g;
	const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [tabindex="0"]';
	document.querySelectorAll( '[data-rc-probe]' ).forEach( ( e ) => e.removeAttribute( 'data-rc-probe' ) );
	const seen = new Set();
	const keys = [];
	for ( const e of document.querySelectorAll( sel ) ) {
		if ( e.closest( '#wpadminbar' ) ) {
			continue;
		}
		const r = e.getBoundingClientRect();
		const cs = getComputedStyle( e );
		if ( r.width <= 0 || r.height <= 0 || cs.visibility === 'hidden' ) {
			continue;
		}
		const cls = String( typeof e.className === 'string' ? e.className : '' ).replace( GENERATED, '' ).replace( /\s+/g, ' ' ).trim();
		const key = e.tagName.toLowerCase() + ( cls ? '.' + cls.split( ' ' ).join( '.' ) : '' ) + ( e.type ? '[' + e.type + ']' : '' );
		if ( seen.has( key ) ) {
			continue;
		}
		seen.add( key );
		e.setAttribute( 'data-rc-probe', String( keys.length ) );
		keys.push( key );
		if ( keys.length >= cap ) {
			break;
		}
	}
	return keys;
}
