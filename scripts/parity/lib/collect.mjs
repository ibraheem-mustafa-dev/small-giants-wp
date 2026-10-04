// In-page collectors for draft-live-walk.mjs. Every function here is passed to
// page.evaluate(), so each one is self-contained (no closures over module scope).

// Computed properties read for every element pair unless the pair names its own list.
export const DEFAULT_PROPS = [
	'display', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
	'text-transform', 'text-align', 'color', 'background-color', 'background-image', 'opacity',
	'border-top-width', 'border-top-style', 'border-top-color', 'border-bottom-width', 'border-bottom-color',
	'border-left-width', 'border-right-width', 'border-radius', 'box-shadow',
	'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
	'grid-template-columns', 'column-gap', 'row-gap', 'justify-content', 'align-items', 'object-fit', 'aspect-ratio', 'min-height', 'flex-grow',
	'border-left-color', 'border-right-color', 'text-shadow', 'transform', 'rotate', 'scale', 'translate', 'backdrop-filter',
	'outline-style', 'outline-width', 'outline-color', 'outline-offset',
	// The underline a visitor sees and an icon's colour: both read by collectPair, not from the element's own style.
	'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset', 'icon-fill', 'icon-stroke',
];

// Properties read at rest and again at the hover end state.
export const HOVER_PROPS = [ 'color', 'background-color', 'border-top-color', 'box-shadow', 'transform', 'scale', 'translate', 'rotate', 'opacity', 'text-decoration-line', 'text-decoration-color', 'filter' ];

// Properties read on the focused control after a real Tab key reaches it (the keyboard focus ring).
export const FOCUS_PROPS = [ 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow', 'background-color', 'color', 'text-decoration-line', 'border-bottom-color' ];

// Resolves a finder to one element inside the page. A finder is a CSS selector string,
// { text: 'regex source', within?: selector, tag?: selector } for the smallest visible
// element whose rendered text matches, or { js: '(root) => element' } run in the page.
export function resolveFinder( finder ) {
	const visible = ( e ) => !! e && ( e.offsetParent !== null || getComputedStyle( e ).position === 'fixed' ) && e.getClientRects().length > 0;
	const scope = ( sel ) => ( sel ? document.querySelector( sel ) : document ) || document;
	if ( typeof finder === 'string' ) {
		return [ ...document.querySelectorAll( finder ) ].find( visible ) || null;
	}
	if ( finder.textRun ) {
		return [ ...document.querySelectorAll( finder.textRun.within ) ].find( visible ) || null;
	}
	if ( finder.group ) {
		return finder.group.paths.map( ( p ) => document.querySelector( p ) ).find( visible ) || null;
	}
	if ( finder.js ) {
		// eslint-disable-next-line no-new-func
		return new Function( 'root', `return (${ finder.js })(root);` )( scope( finder.within ) );
	}
	if ( finder.text ) {
		const re = new RegExp( finder.text, finder.flags ?? 'i' );
		// Rendered text (innerText) or source text (textContent): a label under
		// text-transform or split across inline elements matches either way.
		const norm = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
		const pool = [ ...scope( finder.within ).querySelectorAll( finder.tag || '*' ) ]
			.filter( ( e ) => visible( e ) && ( re.test( norm( e.innerText ) ) || re.test( norm( e.textContent ) ) ) );
		pool.sort( ( a, b ) => a.textContent.length - b.textContent.length );
		return pool[ finder.nth || 0 ] || null;
	}
	return null;
}

// Everything the comparison needs about one element pair, at rest. With a ref prefix (ref tracing,
// lib/ref-trace.mjs) it also returns `trace`: the element's ref, block root class and selector paths.
// in: [ finder, props, resolveSrc, refPrefix, traceSrc, pathSrc, paintSrc ]; paintSrc is paint.mjs::PAINT_SRC.
export function collectPair( [ finder, props, resolveSrc, refPrefix, traceSrc, pathSrc, paintSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const { textCarrier, paintedDecoration, layoutElement, textRun, groupBox } = new Function( `${ paintSrc }; return { textCarrier, paintedDecoration, layoutElement, textRun, groupBox };` )();
	const el = resolve( finder );
	if ( ! el ) {
		return { missing: true };
	}
	const cs = getComputedStyle( el );
	const r = el.getBoundingClientRect();
	// Text properties come from the element painting the first visible text (a button's label span, not the button).
	const TEXT_PROPS = [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ];
	// A text-run finder ({ textRun: { within, direct } }) measures the block's rendered text only: its extent and its paint.
	// A group finder ({ group: { paths } }) measures the union box of its elements only (no styles).
	const run = finder.textRun ? textRun( el, !! finder.textRun.direct, finder.textRun.match || null ) : ( finder.group ? groupBox( finder.group.paths ) : null );
	const carrier = run ? run.carrier : textCarrier( el );
	const ccs = carrier ? getComputedStyle( carrier ) : null;
	// Layout properties come from the element laying out the children (paint.mjs::LAYOUT_PROPS, layoutElement); a flex
	// or grid gap of `normal`, and any gap of an element not laying out with flex or grid (block flow ignores it), reads
	// as the 0 it paints.
	const LAYOUT = [ 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];
	const layoutEl = layoutElement( el );
	const lcs = getComputedStyle( layoutEl );
	// Colours reported as oklab()/color() (colour-mix, relative colours) go through a
	// canvas, which always hands back #rrggbb or rgba(), so both sides compare in sRGB.
	const ctx = document.createElement( 'canvas' ).getContext( '2d' );
	const srgb = ( v ) => {
		if ( ! /^(oklab|oklch|lab|lch|color)\(/.test( v ) ) {
			return v;
		}
		ctx.fillStyle = '#000';
		ctx.fillStyle = v;
		const f = ctx.fillStyle;
		if ( f.startsWith( '#' ) ) {
			const n = parseInt( f.slice( 1 ), 16 );
			return `rgb(${ ( n >> 16 ) & 255 }, ${ ( n >> 8 ) & 255 }, ${ n & 255 })`;
		}
		return f;
	};
	const styles = {};
	for ( const p of run ? props.filter( ( x ) => ! finder.group && TEXT_PROPS.includes( x ) ) : props ) {
		const src = TEXT_PROPS.includes( p ) ? ccs : ( LAYOUT.includes( p ) ? lcs : cs );
		if ( src && ! /^icon-/.test( p ) ) {
			const v = src.getPropertyValue( p ).trim();
			styles[ p ] = /color$/.test( p ) ? srgb( v ) : ( /gap$/.test( p ) && ( 'normal' === v || ! /(^|-)(flex|grid)$/.test( lcs.display ) ) ? '0px' : v );
		}
	}
	if ( ! finder.group && props.includes( 'text-decoration-line' ) ) {
		const deco = paintedDecoration( carrier || el );
		styles[ 'text-decoration-line' ] = deco ? deco.textDecorationLine : 'none';
		styles[ 'text-decoration-color' ] = deco ? srgb( deco.textDecorationColor ) : 'none';
		styles[ 'text-decoration-thickness' ] = deco ? deco.textDecorationThickness : 'none';
		styles[ 'text-underline-offset' ] = deco ? deco.textUnderlineOffset : 'none';
	}
	// An icon's colour: the first painted shape of the pair's svg (or the svg the pair is).
	// `line-height: normal` is the font's own line height: compared as the pixels it paints (a one-line probe in the
	// carrier's font), so a draft's `normal` and a live number compare like for like and a numeric setting can match it.
	if ( 'normal' === styles[ 'line-height' ] && ccs ) {
		const probe = document.createElement( 'div' );
		probe.textContent = 'Hg';
		probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;line-height:normal;font:${ ccs.font };`;
		document.body.appendChild( probe );
		styles[ 'line-height' ] = `${ Math.round( probe.getBoundingClientRect().height * 100 ) / 100 }px`;
		probe.remove();
	}
	// An icon: the first painted shape of the pair's svg (or the svg the pair is) gives its colour; the svg's box its size.
	let iconEl = null;
	if ( ! run && props.includes( 'icon-fill' ) ) {
		const svg = 'svg' === el.tagName.toLowerCase() ? el : el.querySelector( 'svg' );
		const shape = svg && [ ...svg.querySelectorAll( 'path, circle, rect, ellipse, line, polyline, polygon, use, text' ) ]
			.find( ( s ) => s.getClientRects().length && 'none' !== getComputedStyle( s ).display );
		if ( shape ) {
			const ss = getComputedStyle( shape );
			styles[ 'icon-fill' ] = 'none' === ss.fill ? 'none' : srgb( ss.fill );
			styles[ 'icon-stroke' ] = 'none' === ss.stroke ? 'none' : srgb( ss.stroke );
			const sb = svg.getBoundingClientRect();
			styles[ 'icon-width' ] = `${ Math.round( sb.width * 100 ) / 100 }px`;
			styles[ 'icon-height' ] = `${ Math.round( sb.height * 100 ) / 100 }px`;
			iconEl = svg;
		}
	}
	// Keyframes compared by content, so a namespaced name (sgs-x-pop) matches the draft's (pop).
	const keyframes = ( name ) => {
		if ( ! name || name === 'none' ) {
			return 'none';
		}
		for ( const sheet of document.styleSheets ) {
			let rules = [];
			try {
				rules = [ ...sheet.cssRules ];
			} catch {
				continue;
			}
			const kf = rules.find( ( x ) => x.type === CSSRule.KEYFRAMES_RULE && x.name === name );
			if ( kf ) {
				return [ ...kf.cssRules ].map( ( k ) => `${ k.keyText }{${ k.style.cssText.replace( /\s+/g, '' ).split( ';' ).filter( Boolean ).sort().join( ';' ) }}` ).join( '' );
			}
		}
		return `unresolved:${ name }`;
	};
	let trace;
	if ( refPrefix ) {
		// eslint-disable-next-line no-new-func
		trace = new Function( `return (${ traceSrc });` )()( el, carrier, refPrefix, pathSrc, layoutEl, iconEl );
	}
	return {
		trace,
		text: ( el.innerText || el.getAttribute( 'aria-label' ) || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 400 ),
		keyframes: cs.animationName.split( ',' ).every( ( n ) => 'none' === n.trim() ) ? 'none' : cs.animationName.split( ',' ).map( ( n ) => keyframes( n.trim() ) ).join( ' | ' ),
		box: run ? run.box : { x: Math.round( r.x ), y: Math.round( r.y + window.scrollY ), w: Math.round( r.width ), h: Math.round( r.height ) },
		styles,
		layoutDisplay: lcs.display,
		tag: el.tagName.toLowerCase(),
		motion: {
			animation: cs.animationName.split( ',' ).every( ( n ) => 'none' === n.trim() ) ? 'none' : `${ cs.animationDuration } ${ cs.animationTimingFunction } ${ cs.animationDelay } ${ cs.animationIterationCount } ${ cs.animationFillMode }`,
			transition: cs.transitionProperty === 'all' && cs.transitionDuration === '0s' ? 'none' : cs.transition.replace( /\s+/g, ' ' ),
		},
	};
}

// The animations and transitions running on a pair's element right after a state's
// action (a price "pop", a step "rise"); read about 60ms after the click.
export function collectRunning( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	if ( ! el ) {
		return null;
	}
	return el.getAnimations().map( ( a ) => {
		const t = a.effect?.getTiming?.() || {};
		// Kind and timing only: animation names are compared through their keyframes.
		return `${ a.transitionProperty ? 'transition ' + a.transitionProperty : 'animation' } ${ t.duration }ms ${ t.easing || '' }`.trim();
	} ).sort();
}

// Centre of a pair's element in viewport coordinates, scrolled into view first.
export function centreOf( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	if ( ! el ) {
		return null;
	}
	// Instant: a site with smooth scrolling would still be moving when the rect is read.
	el.scrollIntoView( { block: 'center', inline: 'nearest', behavior: 'instant' } );
	const r = el.getBoundingClientRect();
	return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

// Hover-relevant styles of a pair's element (read at rest and at the hover end state). Text colour and the underline
// are read where the text is painted, as collectPair reads them: a link whose label sits in a span is judged by the
// span's colour, not by its root's unused one. in: [ finder, props, resolveSrc, paintSrc ].
export function hoverStyles( [ finder, props, resolveSrc, paintSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const { textCarrier, paintedDecoration } = new Function( `${ paintSrc }; return { textCarrier, paintedDecoration };` )();
	const el = resolve( finder );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el );
	const carrier = textCarrier( el );
	const deco = props.some( ( p ) => /^text-decoration-/.test( p ) ) ? paintedDecoration( carrier || el ) : null;
	// Same sRGB normalising as collectPair (oklab()/color() through a canvas).
	const ctx = document.createElement( 'canvas' ).getContext( '2d' );
	const srgb = ( v ) => {
		if ( ! /^(oklab|oklch|lab|lch|color)\(/.test( v ) ) {
			return v;
		}
		ctx.fillStyle = '#000';
		ctx.fillStyle = v;
		const f = ctx.fillStyle;
		if ( ! f.startsWith( '#' ) ) {
			return f;
		}
		const n = parseInt( f.slice( 1 ), 16 );
		return `rgb(${ ( n >> 16 ) & 255 }, ${ ( n >> 8 ) & 255 }, ${ n & 255 })`;
	};
	const out = {};
	for ( const p of props ) {
		let v;
		if ( 'color' === p && carrier ) {
			v = getComputedStyle( carrier ).color;
		} else if ( /^text-decoration-/.test( p ) ) {
			v = deco ? deco.getPropertyValue( p ).trim() : 'none';
		} else {
			v = cs.getPropertyValue( p ).trim();
		}
		out[ p ] = /color$/.test( p ) && 'none' !== v ? srgb( v ) : v;
	}
	return out;
}
