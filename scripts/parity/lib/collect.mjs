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
	// A drawn line's weight and dash pattern (a dimension line, an outline icon), read from the same painted shape.
	'icon-stroke-width', 'icon-stroke-dasharray',
	// Where an absolutely or fixed positioned element sits (a label on a drawing, a decorative image); read only for those.
	'left', 'top',
	// Motion timings as ordinary rows (a setting can hold each), beside the motion rows' shorthand comparison.
	'transition-duration', 'transition-delay', 'transition-timing-function', 'animation-duration', 'animation-delay', 'animation-timing-function',
];

// Properties read on an element's ::before and ::after layers (a painted ring, an overlay ground), only where the layer
// paints (its content is not none). Rows carry `pseudo` and the layer's path is the element's path plus the pseudo,
// the key calibration gives the same layer (computed-route lib/calibrate-read.mjs).
export const PSEUDO_PROPS = [ 'content', 'background-color', 'background-image', 'border-image-source', 'opacity', 'color', 'border-top-color', 'border-top-width', 'box-shadow', 'transform', 'width', 'height' ];

// Properties read at rest and again at the hover end state.
export const HOVER_PROPS = [ 'color', 'background-color', 'border-top-color', 'border-top-width', 'box-shadow', 'transform', 'scale', 'translate', 'rotate', 'opacity', 'text-decoration-line', 'text-decoration-color', 'filter' ];

// Properties read on the focused control after a real Tab key reaches it (the keyboard focus ring).
export const FOCUS_PROPS = [ 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow', 'background-color', 'color', 'text-decoration-line', 'border-bottom-color' ];

// Properties read on a pressed element (:active forced through the DevTools protocol, devtools.mjs::forcedPseudo): the
// press feedback a visitor sees (a button that sinks, darkens or loses its shadow). Read at rest and while pressed.
export const ACTIVE_PROPS = [ 'color', 'background-color', 'border-top-color', 'border-top-width', 'box-shadow', 'transform', 'scale', 'translate', 'rotate', 'opacity', 'filter', 'text-decoration-line', 'text-decoration-color', 'outline-style', 'outline-width', 'outline-color' ];

// The draft runtime's own name for a stamped element (data-dc-tpl), self-contained so it can be serialised into a page:
// `<chain>/<n>#<copy>`. The chain is the import hosts (.sc-host) from the document root to the element's nearest host:
// `Root`, then `<template name>@<host stamp>#<host copy>` for each nested import (the copy is the host's position among
// same-named hosts of its own parent host). The number restarts in every template, so a number alone is ambiguous; the
// copy is the element's position among same-numbered stamps of its nearest host, in document order.
export function tplKeyOf( e ) {
	const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
	const chainOf = ( host ) => {
		const parts = [];
		for ( let h = host; h; h = parentHost( h ) ) {
			const up = parentHost( h );
			const same = up ? [ ...up.querySelectorAll( '.sc-host' ) ].filter( ( x ) => parentHost( x ) === up && x.dataset.scName === h.dataset.scName && x.dataset.dcTpl === h.dataset.dcTpl ) : [];
			parts.unshift( up ? `${ h.dataset.scName }${ h.dataset.dcTpl ? `@${ h.dataset.dcTpl }` : '' }#${ same.indexOf( h ) }` : h.dataset.scName );
		}
		return parts.join( '>' );
	};
	const host = parentHost( e );
	const n = e.dataset.dcTpl;
	const copies = [ ...host.querySelectorAll( `[data-dc-tpl="${ n }"]` ) ].filter( ( x ) => parentHost( x ) === host );
	return `${ chainOf( host ) }/${ n }#${ copies.indexOf( e ) }`;
}

// Resolves a finder to one element inside the page. A finder is a CSS selector string,
// { text: 'regex source', within?: selector, tag?: selector } for the smallest visible
// element whose rendered text matches, { js: '(root) => element' } run in the page, or
// { tpl: '<chain>/<n>#<copy>', within?: selector } for the exact element the draft runtime stamped (tplKeyOf's key; the
// element is returned whether or not it shows, and `within` must contain it).
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
	if ( finder.tpl ) {
		const m = /^(.+)\/(\d+)#(\d+)$/.exec( finder.tpl );
		if ( ! m ) {
			return null;
		}
		const parentHost = ( x ) => ( x.parentElement ? x.parentElement.closest( '.sc-host' ) : null );
		const parts = m[ 1 ].split( '>' );
		let host = [ ...document.querySelectorAll( '.sc-host' ) ].find( ( h ) => ! parentHost( h ) && h.dataset.scName === parts[ 0 ] ) || null;
		for ( const part of parts.slice( 1 ) ) {
			const p = /^(.*?)(?:@(\d+))?#(\d+)$/.exec( part );
			const owner = host;
			host = ! owner || ! p ? null : [ ...owner.querySelectorAll( '.sc-host' ) ].filter( ( h ) => parentHost( h ) === owner && h.dataset.scName === p[ 1 ] && ( undefined === p[ 2 ] || h.dataset.dcTpl === p[ 2 ] ) )[ Number( p[ 3 ] ) ] || null;
		}
		const el = host ? [ ...host.querySelectorAll( `[data-dc-tpl="${ m[ 2 ] }"]` ) ].filter( ( x ) => parentHost( x ) === host )[ Number( m[ 3 ] ) ] || null : null;
		return el && ( ! finder.within || document.querySelector( finder.within )?.contains( el ) ) ? el : null;
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
// in: [ finder, props, resolveSrc, refPrefix, traceSrc, pathSrc, paintSrc, pseudoProps ]; paintSrc is paint.mjs::PAINT_SRC;
// pseudoProps (PSEUDO_PROPS, or null to skip) are read on the element's painting ::before and ::after layers.
export function collectPair( [ finder, props, resolveSrc, refPrefix, traceSrc, pathSrc, paintSrc, pseudoProps = null ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const { textCarrier, paintedDecoration, decoratedElement, layoutElement, textRun, groupBox } = new Function( `${ paintSrc }; return { textCarrier, paintedDecoration, decoratedElement, layoutElement, textRun, groupBox };` )();
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
	// An offset means something only on a box taken out of flow; in flow, the flow-position rows cover where it sits.
	if ( ! [ 'absolute', 'fixed' ].includes( cs.position ) ) {
		delete styles.left;
		delete styles.top;
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
	// An icon: the svg the pair is, or the one painted svg it contains (a container holding several reads no icon at all:
	// the first in document order would be a different icon on each side). The first painted shape of that svg gives its
	// colour; the svg's box its size. `iconKind` says what paints the icon (svg, glyph, dashicon, or null for no icon) and
	// `icon-colour` is the one colour of it whatever the kind: an svg's fill (else stroke), a glyph's text colour.
	let iconEl = null;
	let iconKind = null;
	if ( ! run && props.includes( 'icon-fill' ) ) {
		const paintedSvg = ( s ) => s.getClientRects().length > 0 && s.getBoundingClientRect().width > 0 && s.getBoundingClientRect().height > 0
			&& 'none' !== getComputedStyle( s ).display && 'visible' === getComputedStyle( s ).visibility;
		const inner = [ ...el.querySelectorAll( 'svg' ) ].filter( ( s ) => paintedSvg( s ) && ! s.parentElement.closest( 'svg' ) );
		const svg = 'svg' === el.tagName.toLowerCase() ? el : ( 1 === inner.length ? inner[ 0 ] : null );
		const shape = svg && [ ...svg.querySelectorAll( 'path, circle, rect, ellipse, line, polyline, polygon, use, text' ) ]
			.find( ( s ) => s.getClientRects().length && 'none' !== getComputedStyle( s ).display );
		if ( shape ) {
			const ss = getComputedStyle( shape );
			styles[ 'icon-fill' ] = 'none' === ss.fill ? 'none' : srgb( ss.fill );
			styles[ 'icon-stroke' ] = 'none' === ss.stroke ? 'none' : srgb( ss.stroke );
			styles[ 'icon-stroke-width' ] = 'none' === ss.stroke ? 'none' : ss.strokeWidth;
			styles[ 'icon-stroke-dasharray' ] = 'none' === ss.stroke ? 'none' : ss.strokeDasharray;
			styles[ 'icon-colour' ] = 'none' !== ss.fill ? srgb( ss.fill ) : ( 'none' !== ss.stroke ? srgb( ss.stroke ) : 'none' );
			const sb = svg.getBoundingClientRect();
			styles[ 'icon-width' ] = `${ Math.round( sb.width * 100 ) / 100 }px`;
			styles[ 'icon-height' ] = `${ Math.round( sb.height * 100 ) / 100 }px`;
			iconEl = svg;
			iconKind = 'svg';
		} else if ( ! svg ) {
			// A font icon: one non-alphanumeric grapheme (an emoji, a plus sign) in an icon context, so a stand-alone bullet
			// separator stays text; or a dashicon, whose glyph is a ::before and leaves no text.
			const word = ( el.textContent || '' ).trim();
			const graphemes = word ? [ ...new Intl.Segmenter( undefined, { granularity: 'grapheme' } ).segment( word ) ].length : 0;
			const iconContext = !! el.closest( '[class*="__icon"], [class*="sgs-icon"], button, summary' ) || !! el.querySelector( '[class*="__icon"], [class*="sgs-icon"]' );
			if ( 1 === graphemes && ! /[\p{L}\p{N}]/u.test( word ) && iconContext ) {
				iconKind = 'glyph';
				styles[ 'icon-colour' ] = srgb( ( ccs || cs ).color );
			} else if ( ! word && ( el.matches( '.dashicons, [class*="dashicons-"]' ) || el.querySelector( '.dashicons, [class*="dashicons-"]' ) ) ) {
				iconKind = 'dashicon';
				styles[ 'icon-colour' ] = srgb( cs.color );
			}
		}
	}
	// Keyframes compared by content, so a namespaced name (sgs-x-pop) matches the draft's (pop); a name with no readable
	// rules reads as `unresolved` whatever its name (the name is an identity, not a painted output).
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
		return 'unresolved';
	};
	// The element's painting pseudo layers: { '::before': { prop: value } }, absent where content is none or the layer is
	// display:none (a connector line a list layout switches off generates no box and paints nothing).
	const pseudo = {};
	for ( const ps of run || ! pseudoProps ? [] : [ '::before', '::after' ] ) {
		const pcs = getComputedStyle( el, ps );
		if ( ! [ 'none', 'normal', '' ].includes( pcs.getPropertyValue( 'content' ).trim() ) && 'none' !== pcs.getPropertyValue( 'display' ).trim() ) {
			pseudo[ ps ] = Object.fromEntries( pseudoProps.map( ( p ) => [ p, /color$/.test( p ) ? srgb( pcs.getPropertyValue( p ).trim() ) : pcs.getPropertyValue( p ).trim() ] ) );
		}
	}
	// Properties an infinite animation drives on this element (a marquee's transform): they have no resting value, so the
	// comparison leaves them out (compare.mjs::comparePair). Only the properties the animation's keyframes name.
	const loops = [ ...new Set( el.getAnimations().filter( ( a ) => Infinity === a.effect?.getTiming?.().iterations )
		.flatMap( ( a ) => a.effect.getKeyframes().flatMap( ( k ) => Object.keys( k ) ) )
		.filter( ( k ) => ! [ 'offset', 'easing', 'composite', 'computedOffset' ].includes( k ) )
		.map( ( k ) => ( 'cssFloat' === k ? 'float' : k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) ) ) ) ].sort();
	let trace;
	if ( refPrefix ) {
		// eslint-disable-next-line no-new-func
		trace = new Function( `return (${ traceSrc });` )()( el, carrier, refPrefix, pathSrc, layoutEl, iconEl, finder.group ? null : decoratedElement( carrier || el ) );
	}
	// The words the element paints: innerText without visually hidden text (a screen-reader link name clipped to nothing,
	// auto-collect.mjs::collectAuto's srOnly test). An element that paints no words is named by its aria-label, else
	// by that hidden text, so an icon-only link still compares by its name.
	const srOnly = ( a ) => {
		const b = a.getBoundingClientRect();
		const s = getComputedStyle( a );
		return ( 'absolute' === s.position && b.width <= 2 && b.height <= 2 && 'visible' !== s.overflow ) || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test( s.clip ) || /inset\(50%\)/.test( s.clipPath );
	};
	const hiddenEls = [ ...el.querySelectorAll( '*' ) ].filter( srOnly );
	let paintedText = el.innerText || '';
	for ( const h of hiddenEls ) {
		const t = ( h.innerText || h.textContent || '' ).trim();
		if ( t ) {
			paintedText = paintedText.replace( t, ' ' );
		}
	}
	const hiddenText = hiddenEls.map( ( h ) => h.textContent || '' ).join( ' ' );
	return {
		trace,
		text: ( paintedText.trim() || el.getAttribute( 'aria-label' ) || hiddenText ).replace( /\s+/g, ' ' ).trim().slice( 0, 400 ),
		keyframes: cs.animationName.split( ',' ).every( ( n ) => 'none' === n.trim() ) ? 'none' : cs.animationName.split( ',' ).map( ( n ) => keyframes( n.trim() ) ).join( ' | ' ),
		box: run ? run.box : { x: Math.round( r.x ), y: Math.round( r.y + window.scrollY ), w: Math.round( r.width ), h: Math.round( r.height ) },
		// A text run's rows (paint.mjs::textRun): compared as the spacing between them.
		...( run?.rows ? { rows: run.rows } : {} ),
		styles,
		iconKind,
		loops,
		pseudo,
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

// Where a real pointer must go to hover a pair's element, in viewport coordinates, scrolled into view first: the centre of
// the element's rect intersected with the viewport (a marquee track far wider than the screen has its raw centre off it, and
// a pointer there never fires mouseenter), checked with elementFromPoint to land on the element or something inside it.
// A few points of the visible part are tried when the centre is covered. Returns null when the element is missing,
// { unreached: true } when it exists but no visible point of it can take a pointer (never read that as a hover that
// changed nothing), else { x, y, clamped } (clamped: the point is not the raw rect's centre).
export function hoverPointOf( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	if ( ! el ) {
		return null;
	}
	el.scrollIntoView( { block: 'center', inline: 'nearest', behavior: 'instant' } );
	const r = el.getBoundingClientRect();
	const left = Math.max( r.left, 0 );
	const right = Math.min( r.right, document.documentElement.clientWidth );
	const top = Math.max( r.top, 0 );
	const bottom = Math.min( r.bottom, document.documentElement.clientHeight );
	if ( right <= left || bottom <= top ) {
		return { unreached: true };
	}
	const raw = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	for ( const [ fx, fy ] of [ [ 0.5, 0.5 ], [ 0.25, 0.5 ], [ 0.75, 0.5 ], [ 0.5, 0.25 ], [ 0.5, 0.75 ], [ 0.25, 0.25 ], [ 0.75, 0.25 ], [ 0.25, 0.75 ], [ 0.75, 0.75 ] ] ) {
		const x = left + ( right - left ) * fx;
		const y = top + ( bottom - top ) * fy;
		const hit = document.elementFromPoint( x, y );
		if ( hit && ( hit === el || el.contains( hit ) ) ) {
			return { x, y, clamped: x !== raw.x || y !== raw.y };
		}
	}
	return { unreached: true };
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
