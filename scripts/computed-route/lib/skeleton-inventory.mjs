// Skeleton writer step 1 (Spec 48 §3.4): the inventory of a draft surface. Every element the draft runtime stamped
// (data-dc-tpl) under the surface root, read in a real browser at 1440, 375 and 768 through the page bridges
// `window.__dcAnnotatedTemplate` and `window.__dcRootName`. The draft's code supplies identity and structure only (R-47-4):
// the key, the parent, the source tag, the loop and condition membership. Every value is measured later by Fill.
import fs from 'fs';
import path from 'path';
import { tplKeyOf } from '../../parity/lib/collect.mjs';
import { tplLineOf } from './identity.mjs';
import { loadChromium } from './fill-read.mjs';
import { applyStateRoute } from './state-route.mjs';
import { discoverReveals, readReveals } from './skeleton-reveal.mjs';
import { addDataBranches } from './skeleton-data-branches.mjs';
import { recId } from './reveal-merge.mjs';
import { ALL_TEXT_CAP } from './skeleton-model.mjs';
import { uaKeyOf } from './skeleton-paint-conservation.mjs';

export const INVENTORY_WIDTHS = [ 1440, 375, 768 ];
// The attributes kept per element: what a block needs to know (link, name, label, image source) and the style attribute
// (the fingerprint Fill's origin map keeps).
// The computed values recorded per width (`resolved`, read by lib/element-facts.mjs): the inherited text properties, and the
// sizes, corner radii and padding a rule compares with a number, whatever expression the draft wrote them with (a clamp(),
// a var(), a calc()) and whatever the element inherits; `vertical-align` is how an inline piece (a count pill) sits on its line.
export const RESOLVED = [ 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'line-height', 'width', 'height', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'text-align', 'vertical-align' ];
// The paint a box shows, recorded in `resolved` beside those only where it differs from the value named here (the property's
// initial value, which paints nothing): a background, a border side's width and style, a shadow, a width cap. An absent paint
// property in a `resolved` read that holds `text-align` therefore means the box does not paint it
// (lib/skeleton-paint-conservation.mjs).
export const PAINT_INITIAL = { 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'border-top-width': '0px', 'border-right-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px', 'border-top-style': 'none', 'border-right-style': 'none', 'border-bottom-style': 'none', 'border-left-style': 'none', 'box-shadow': 'none', 'max-width': 'none' };
// The border side colours, recorded the same sparse way against their initial value, the element's own text colour
// (currentcolor): an absent colour is the text colour, and a recorded one names another (a transparent side paints nothing).
export const PAINT_CURRENT_COLOUR = [ 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color' ];
// The draft's own `data-*` marks kept per element as `data` (a reveal mark, a tilt mark), without the `data-` prefix; the
// runtime's stamps, the route's own and this reader's working marks are not the draft's.
export const NOT_DRAFT_DATA = /^data-(?:dc|sc|sgs|inv)-/;
// `autocomplete` is the token the account readers tell a sign-in form from a create-account form by (lib/template-piece-account-read.mjs::authForms).
const ATTRS = [ 'href', 'aria-label', 'alt', 'role', 'type', 'title', 'target', 'aria-hidden', 'viewBox', 'class', 'style', 'autocomplete' ];

// In-page (self-contained: its source is sent to the page). Whether a sibling is, or holds at any depth, the root of another
// surface. `strips.exclude` is [ [ component, tpl ] ]: a tpl number is unique only within its component, so an element is a
// surface's own only when its host's component is that component (`strips.rootComponent` names the entry draft's component
// where the served runtime calls the root host `window.__dcRootName()`; absent, the host name is the component). A surface
// root may be a non-rendering sc-if / sc-for / sc-else (a page), which no element carries: the surface then holds every
// element its stamped source subtree stamps, so the template's own tree (`srcDoc( templateName )`) names the ids.
export function holdsOtherRoot( s, strips, srcDoc ) {
	const rootName = window.__dcRootName();
	const hostName = ( x ) => x.parentElement?.closest( '.sc-host' )?.dataset.scName;
	const componentOf = ( x ) => {
		const n = hostName( x );
		return n === rootName && strips.rootComponent ? strips.rootComponent : n;
	};
	const mine = [ s, ...s.querySelectorAll( '[data-dc-tpl]' ) ].filter( ( x ) => x.hasAttribute( 'data-dc-tpl' ) );
	return ( strips?.exclude || [] ).some( ( [ dc, tpl ] ) => {
		const src = srcDoc( dc === strips.rootComponent ? rootName : dc ).querySelector( `[data-dc-tpl="${ tpl }"]` );
		const ids = new Set( [ String( tpl ), ...( src ? [ ...src.querySelectorAll( '[data-dc-tpl]' ) ].map( ( n ) => n.dataset.dcTpl ) : [] ) ] );
		return mine.some( ( x ) => componentOf( x ) === dc && ids.has( x.dataset.dcTpl ) );
	} );
}

// In-page. in: [ rootSelector, tplKeyOfSource, attrs, tplLineOfSource, strips ]. `strips` is null, or { exclude: [ [ component,
// tpl ] ] } (the roots of the other surfaces that are not global: a page, footer, drawer, panel, menu or form; a sibling that
// is or holds one at any depth holds another surface's root): the root's siblings are then read too, as `beside`, and the
// elements of those in the chain of strips next to the root are inventoried under `strip` roots (rules.headerSlots decides
// which are rows: lib/skeleton-header-slots.mjs::besideStrips). Returns { records, beside } or { error }.
// The items a strip's code builds inside element `e` when no stamped element sits in it (run in the page): the first level
// below it, through single-child wrappers, holding two or more elements; each item's own words (its direct text) and its one
// inline SVG with the paint the draft's CSS gives each drawing element written onto it (a colour equal to the SVG's own as
// currentColor). A run read twice in a row (a marquee's loop) is read once. Null unless two or more items have words.
// Each item also carries `at`, its element's child-index path from `e` (Fill reads the first item's look there), and
// `marks`, the words of its child elements that are not an SVG (a separator glyph drawn beside the words), or '' for none.
export function codeItemsOf( e ) {
	if ( e.querySelector( '[data-dc-tpl]' ) ) {
		return null;
	}
	const ws = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	let lvl = e;
	const path = [];
	while ( 1 === lvl.children.length ) {
		lvl = lvl.children[ 0 ];
		path.push( 0 );
	}
	const plain = { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' };
	const svgOf = ( k ) => {
		const svgs = k.querySelectorAll( 'svg' );
		if ( 1 !== svgs.length ) {
			return null;
		}
		const copy = svgs[ 0 ].cloneNode( true );
		const own = getComputedStyle( svgs[ 0 ] ).color;
		const copies = copy.querySelectorAll( '*' );
		[ ...svgs[ 0 ].querySelectorAll( '*' ) ].forEach( ( o, j ) => {
			if ( /^(?:path|circle|ellipse|rect|line|polyline|polygon)$/.test( o.localName ) ) {
				const cs = getComputedStyle( o );
				for ( const p of [ 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin' ] ) {
					const v = cs.getPropertyValue( p ).trim();
					v && v !== plain[ p ] && copies[ j ].setAttribute( p, v === own ? 'currentColor' : v );
				}
			}
		} );
		return new XMLSerializer().serializeToString( copy );
	};
	const marksOf = ( k ) => ws( [ ...k.children ].filter( ( c ) => 'svg' !== c.localName && ! c.querySelector( 'svg' ) ).map( ( c ) => c.textContent ).join( ' ' ) );
	const items = [ ...lvl.children ].map( ( k, i ) => ( { text: ws( [ ...k.childNodes ].filter( ( c ) => 3 === c.nodeType ).map( ( c ) => c.nodeValue ).join( ' ' ) ), svg: svgOf( k ), marks: marksOf( k ), at: [ ...path, i ] } ) ).filter( ( x ) => x.text );
	const half = items.length / 2;
	const twice = items.length > 2 && 0 === items.length % 2 && items.slice( 0, half ).every( ( x, j ) => x.text === items[ half + j ].text );
	const once = twice ? items.slice( 0, half ) : items;
	return once.length >= 2 ? once : null;
}

// The rendered markup of one inline SVG (run in the page): a copy with the paint the draft's CSS gives each drawing element
// written onto it (a colour equal to the SVG's own as currentColor) and every bound attribute at the value it renders, so
// an icon whose path the draft fills from a script value (`d="{{ t.icon }}"`) is kept as drawn. The inventory records it as
// an SVG element's `svg` (a block that keeps a stamped item's icon as its own markup reads it there).
export function svgMarkupOf( svg ) {
	const plain = { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' };
	const copy = svg.cloneNode( true );
	const own = getComputedStyle( svg ).color;
	const copies = copy.querySelectorAll( '*' );
	[ ...svg.querySelectorAll( '*' ) ].forEach( ( o, j ) => {
		[ ...copies[ j ].attributes ].filter( ( a ) => a.name.startsWith( 'data-' ) ).forEach( ( a ) => copies[ j ].removeAttribute( a.name ) );
		if ( /^(?:path|circle|ellipse|rect|line|polyline|polygon)$/.test( o.localName ) ) {
			const cs = getComputedStyle( o );
			for ( const p of [ 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin' ] ) {
				const v = cs.getPropertyValue( p ).trim();
				v && v !== plain[ p ] && copies[ j ].setAttribute( p, v === own ? 'currentColor' : v );
			}
		}
	} );
	[ ...copy.attributes ].filter( ( a ) => a.name.startsWith( 'data-' ) ).forEach( ( a ) => copy.removeAttribute( a.name ) );
	return new XMLSerializer().serializeToString( copy );
}

function collect( [ rootSelector, keySrc, attrNames, lineSrc, strips, holdsSrc, allTextCap, itemsSrc, resolvedNames, paintInitial = {}, notDraftData = null, currentColour = [], svgSrc = null ] ) {
	// eslint-disable-next-line no-new-func
	const keyOf = new Function( `return (${ keySrc });` )();
	// eslint-disable-next-line no-new-func
	const codeItems = itemsSrc ? new Function( `return (${ itemsSrc });` )() : () => null;
	// eslint-disable-next-line no-new-func
	const svgMarkup = svgSrc ? new Function( `return (${ svgSrc });` )() : null;
	const lineOf = new Function( `return (${ lineSrc });` )();
	const root = document.querySelector( rootSelector );
	if ( ! root ) {
		return { error: `no element matches ${ rootSelector }` };
	}
	document.querySelectorAll( '[data-inv-strip]' ).forEach( ( x ) => x.removeAttribute( 'data-inv-strip' ) );
	const stampedAt = ( x ) => x.hasAttribute( 'data-dc-tpl' );
	const parsed = {};
	const srcDoc = ( name ) => {
		if ( ! parsed[ name ] ) {
			const t = document.createElement( 'template' );
			t.innerHTML = window.__dcAnnotatedTemplate( name ) || '';
			parsed[ name ] = t.content;
		}
		return parsed[ name ];
	};
	// The sibling boxes and the root's are read in one frame: at scroll 0, where a sticky root is at its natural place. The
	// scroll is put back after the read.
	const scrollWas = [ scrollX, scrollY ];
	scrollTo( 0, 0 );
	// eslint-disable-next-line no-new-func
	const holdsFn = holdsSrc ? new Function( `return (${ holdsSrc });` )() : null;
	const holdsOther = ( s ) => holdsFn( s, strips, srcDoc );
	const beside = [];
	const stripRoots = new Map();
	if ( strips && root.parentElement ) {
		const sibs = [ ...root.parentElement.children ];
		const at = sibs.indexOf( root );
		const read = sibs.map( ( s, i ) => ( { s, i } ) ).filter( ( { s, i } ) => i !== at && stampedAt( s ) ).map( ( { s, i } ) => ( { s, side: i < at ? 'before' : 'after', distance: Math.abs( i - at ) } ) ).sort( ( a, b ) => a.distance - b.distance );
		let open = { before: true, after: true };
		read.forEach( ( { s, side, distance } ) => {
			const r = s.getBoundingClientRect();
			const position = getComputedStyle( s ).position;
			const renders = s.getClientRects().length > 0 && r.width > 0 && r.height > 0 && s.checkVisibility( { opacityProperty: true, visibilityProperty: true } );
			const holdsOtherRoot = holdsOther( s );
			beside.push( { key: keyOf( s ), side, distance, position, renders, holdsOtherRoot } );
			const floats = [ 'fixed', 'absolute' ].includes( position );
			if ( strips.floating ) {
				// A footer reads only the floating siblings (rules.footerSlots): they are its bottom row's.
				floats && renders && ! holdsOtherRoot && stripRoots.set( s, { side, distance } );
			} else if ( open[ side ] && ! floats && renders ) {
				holdsOtherRoot ? ( open[ side ] = false ) : stripRoots.set( s, { side, distance } );
			}
		} );
	}
	stripRoots.forEach( ( v, s ) => s.setAttribute( 'data-inv-strip', v.side ) );
	const els = [ root, ...root.querySelectorAll( '*' ), ...[ ...stripRoots.keys() ].flatMap( ( s ) => [ s, ...s.querySelectorAll( '*' ) ] ) ];
	const ws = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	const hostOf = ( e ) => ( e.parentElement ? e.parentElement.closest( '.sc-host' ) : null );
	const out = [];
	const unstamped = [];
	els.forEach( ( e ) => {
		if ( ! e.hasAttribute( 'data-dc-tpl' ) ) {
			unstamped.push( { tag: e.tagName.toLowerCase(), cls: String( e.className?.baseVal ?? e.className ), text: ws( e.textContent ).slice( 0, 60 ) } );
			return;
		}
		e.setAttribute( 'data-inv-i', String( out.length ) );
		const n = e.dataset.dcTpl;
		const tname = hostOf( e ).dataset.scName;
		let p = e.parentElement;
		while ( p && ! p.hasAttribute( 'data-dc-tpl' ) ) {
			p = p.parentElement;
		}
		const top = e.closest( '[data-inv-strip]' ) || root;
		let depth = top === root ? 0 : 1;
		for ( let a = e; a !== top; ) {
			a = a.parentElement;
			if ( a.hasAttribute( 'data-dc-tpl' ) ) {
				depth++;
			}
		}
		let own = '';
		for ( const c of e.childNodes ) {
			if ( 3 === c.nodeType ) {
				own += `${ c.nodeValue } `;
			} else if ( 1 === c.nodeType && ! c.hasAttribute( 'data-dc-tpl' ) ) {
				own += `${ c.textContent } `;
			}
		}
		const attrs = {};
		for ( const a of attrNames ) {
			const v = e.getAttribute( a );
			if ( null != v && '' !== v ) {
				attrs[ a ] = v;
			}
		}
		if ( 'IMG' === e.tagName ) {
			const s = e.currentSrc || e.getAttribute( 'src' ) || '';
			attrs.srcBasename = s.startsWith( 'data:' ) ? `data:${ s.slice( 5, 30 ) }...` : s.split( '?' )[ 0 ].split( '/' ).pop();
		}
		const s = srcDoc( tname ).querySelector( `[data-dc-tpl="${ n }"]` );
		const membership = [];
		let srcTag = null;
		let snippet = null;
		let srcOwn = null;
		if ( s ) {
			srcTag = s.localName;
			snippet = ws( s.outerHTML ).slice( 0, 400 );
			srcOwn = ws( [ ...s.childNodes ].filter( ( c ) => 3 === c.nodeType ).map( ( c ) => c.nodeValue ).join( ' ' ) );
			for ( let a = s.parentElement; a; a = a.parentElement ) {
				const t = a.localName;
				if ( 'sc-for' === t ) {
					membership.unshift( { kind: 'sc-for', list: a.getAttribute( 'list' ), as: a.getAttribute( 'as' ) || 'item', tpl: a.dataset.dcTpl } );
				} else if ( 'sc-if' === t ) {
					membership.unshift( { kind: 'sc-if', value: a.getAttribute( 'value' ), tpl: a.dataset.dcTpl } );
				} else if ( 'sc-else' === t ) {
					membership.unshift( { kind: 'sc-else', tpl: a.dataset.dcTpl } );
				} else if ( 'dc-import' === t ) {
					membership.unshift( { kind: 'dc-import', name: a.getAttribute( 'name' ) || a.getAttribute( 'component' ), tpl: a.dataset.dcTpl } );
				}
			}
		}
		if ( tname !== window.__dcRootName() ) {
			membership.unshift( { kind: 'inside-import', template: tname } );
		}
		const items = codeItems( e );
		const cs = getComputedStyle( e );
		const resolved = Object.fromEntries( resolvedNames.map( ( n ) => [ n, cs.getPropertyValue( n ) ] ) );
		for ( const [ n, initial ] of Object.entries( paintInitial ) ) {
			const v = cs.getPropertyValue( n );
			v !== initial && ( resolved[ n ] = v );
		}
		for ( const n of currentColour ) {
			const v = cs.getPropertyValue( n );
			v !== cs.color && ( resolved[ n ] = v );
		}
		const data = notDraftData ? Object.fromEntries( [ ...e.attributes ].filter( ( a ) => a.name.startsWith( 'data-' ) && ! new RegExp( notDraftData ).test( a.name ) ).map( ( a ) => [ a.name.slice( 5 ), a.value ] ) ) : {};
		const r = e.getBoundingClientRect();
		const box = e.getClientRects().length ? { x: +( r.left + scrollX ).toFixed( 1 ), y: +( r.top + scrollY ).toFixed( 1 ), w: +r.width.toFixed( 1 ), h: +r.height.toFixed( 1 ) } : null;
		out.push( {
			i: out.length, key: keyOf( e ), parentKey: p && ! stripRoots.has( e ) ? keyOf( p ) : null, ...( stripRoots.has( e ) ? { strip: stripRoots.get( e ) } : {} ), depth, tag: e.tagName.toLowerCase(), template: tname, tpl: Number( n ), attrs, words: ws( own ), allText: ws( e.textContent ).slice( 0, allTextCap ),
			...( items ? { codeItems: items } : {} ), ...( svgMarkup && 'svg' === e.localName ? { svg: svgMarkup( e ) } : {} ), srcLine: lineOf( window.__dcAnnotatedTemplate( tname ) || '', n ), membership, srcTag, srcOwnText: srcOwn, snippet, resolved, ...( Object.keys( data ).length ? { data } : {} ), box, visible: !! box && box.w > 0 && box.h > 0 && e.checkVisibility( { opacityProperty: true, visibilityProperty: true } ), display: getComputedStyle( e ).display, position: getComputedStyle( e ).position, flexDirection: getComputedStyle( e ).flexDirection,
		} );
	} );
	scrollTo( scrollWas[ 0 ], scrollWas[ 1 ] );
	return { records: out, beside, unstamped, rootKey: out[ 0 ]?.key ?? null, rootName: window.__dcRootName() };
}

// In-page (self-contained). The content the draft's code put into each inventoried element at run time (Spec 48 RC12): an
// <svg> child the element holds with no data-dc-tpl stamp of its own (a fetched SVG written into a holder, or a custom
// element's own content) whose source is an SVG file the page fetched, as { <data-inv-i>: { tag: 'svg', viewBox, source } }.
// `source` is the fetched file whose element structure (every element's tag in order, metadata left out) and viewBox equal
// the injected one (the code may rename ids or drop attributes, not elements), as a path relative to the page. Only files the
// page's script fetched count (a fetch or XHR request: code can write only markup it fetched), so an <svg> the template binds as
// markup is not injected content even when the page also shows the same file as an <img>; nor is one no fetched file matches.
export async function injectedContent() {
	const shape = ( svg ) => [ ...svg.querySelectorAll( '*' ) ].filter( ( x ) => ! x.closest( 'metadata' ) ).map( ( x ) => x.localName ).join( ',' );
	const holders = [ ...document.querySelectorAll( '[data-inv-i]' ) ].map( ( e ) => [ e, [ ...e.children ].find( ( c ) => 'svg' === c.localName && ! c.hasAttribute( 'data-dc-tpl' ) ) ] ).filter( ( [ , svg ] ) => svg );
	if ( ! holders.length ) {
		return {};
	}
	const base = location.href.replace( /[#?].*$/, '' ).replace( /[^/]*$/, '' );
	const files = [];
	const fetched = performance.getEntriesByType( 'resource' ).filter( ( r ) => [ 'fetch', 'xmlhttprequest' ].includes( r.initiatorType ) );
	for ( const url of [ ...new Set( fetched.map( ( r ) => r.name ).filter( ( u ) => /\.svg(?:[?#]|$)/i.test( u ) ) ) ] ) {
		try {
			const root = new DOMParser().parseFromString( await ( await fetch( url ) ).text(), 'image/svg+xml' ).documentElement;
			'svg' === root?.localName && files.push( { url, shape: shape( root ), viewBox: root.getAttribute( 'viewBox' ) } );
		} catch {
			// A file the page cannot fetch again names no source.
		}
	}
	const out = {};
	for ( const [ e, svg ] of holders ) {
		const hit = files.find( ( f ) => f.shape === shape( svg ) && f.viewBox === svg.getAttribute( 'viewBox' ) );
		hit && ( out[ e.getAttribute( 'data-inv-i' ) ] = { tag: 'svg', viewBox: svg.getAttribute( 'viewBox' ), source: decodeURI( hit.url.startsWith( base ) ? hit.url.slice( base.length ) : hit.url ) } );
	}
	return out;
}

// Each record's injected content (injectedContent) on the read it belongs to.
async function withInjected( page, res ) {
	const injected = await page.evaluate( injectedContent );
	Object.entries( injected ).forEach( ( [ i, v ] ) => res.records[ Number( i ) ] && ( res.records[ Number( i ) ].injected = v ) );
	return res;
}

const safe = ( k ) => k.replace( /[^A-Za-z0-9]+/g, '_' ).replace( /^_|_$/g, '' );

// In-page. The padding the browser itself gives each tag key (lib/skeleton-paint-conservation.mjs::uaKeyOf: a tag, or
// `input[type=…]`): one unstyled element per key inside a shadow root of the draft's document, which no author rule reaches.
// Returns { key: { 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' } }.
export function uaPaddingOf( keys ) {
	const host = document.createElement( 'div' );
	host.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
	document.body.appendChild( host );
	const shadow = host.attachShadow( { mode: 'open' } );
	const out = {};
	for ( const key of keys ) {
		const m = /^([a-z][a-z0-9-]*)(?:\[type=(.+)\])?$/.exec( key );
		if ( ! m ) {
			continue;
		}
		const e = document.createElement( m[ 1 ] );
		m[ 2 ] && e.setAttribute( 'type', m[ 2 ] );
		shadow.appendChild( e );
		const cs = getComputedStyle( e );
		out[ key ] = Object.fromEntries( [ 'top', 'right', 'bottom', 'left' ].map( ( s ) => [ `padding-${ s }`, cs.getPropertyValue( `padding-${ s }` ) ] ) );
	}
	host.remove();
	return out;
}

// Measures, once per read, the browser's own padding of each tag key one width's records hold that `into` lacks.
async function measureUaPadding( page, records, into ) {
	const keys = [ ...new Set( records.map( uaKeyOf ) ) ].filter( ( k ) => k && ! into[ k ] );
	keys.length && Object.assign( into, await page.evaluate( uaPaddingOf, keys ) );
}

// Scrolls the whole page so scroll-triggered entrances fire, then rests on the root.
async function settle( page, rootSelector ) {
	await page.waitForTimeout( 2500 );
	await page.evaluate( async ( sel ) => {
		for ( let y = 0; y < document.body.scrollHeight; y += 600 ) {
			scrollTo( 0, y );
			await new Promise( ( r ) => setTimeout( r, 60 ) );
		}
		document.querySelector( sel )?.scrollIntoView();
	}, rootSelector );
	await page.waitForTimeout( 1500 );
}

// In-page: hides fixed and sticky overlays outside the root for the crops, keeping each one's earlier inline
// visibility in data-inv-hidden.
function hideOverlays( sel ) {
	const r = document.querySelector( sel );
	for ( const e of document.body.querySelectorAll( '*' ) ) {
		if ( ! r.contains( e ) && ! e.contains( r ) && ! e.closest( '[data-inv-strip]' ) && ! e.querySelector( '[data-inv-strip]' ) && [ 'fixed', 'sticky' ].includes( getComputedStyle( e ).position ) ) {
			e.hasAttribute( 'data-inv-hidden' ) || e.setAttribute( 'data-inv-hidden', JSON.stringify( [ e.style.getPropertyValue( 'visibility' ), e.style.getPropertyPriority( 'visibility' ) ] ) );
			e.style.setProperty( 'visibility', 'hidden', 'important' );
		}
	}
}

// In-page: undoes hideOverlays, so a later read of another root on the same page sees the page as it was.
function restoreOverlays() {
	for ( const e of document.querySelectorAll( '[data-inv-hidden]' ) ) {
		const [ v, p ] = JSON.parse( e.getAttribute( 'data-inv-hidden' ) );
		v ? e.style.setProperty( 'visibility', v, p ) : e.style.removeProperty( 'visibility' );
		e.removeAttribute( 'data-inv-hidden' );
	}
}

// The screenshots of one width's records (1440 for every shown element, 375 only where an element's size or place inside its
// parent changed), taken with the overlays outside the root hidden; `shotsDir` null takes none but still marks `layoutChanged`.
// An element read in a reveal state is not on the page at the opening state, so it has no crop.
async function shootWidth( { page, res, runs, w, root, shotsDir, shots, skipped } ) {
	if ( 1440 !== w && 375 !== w ) {
		return;
	}
	shotsDir && await page.evaluate( hideOverlays, root );
	for ( const r of res.records ) {
		if ( ! r.visible ) {
			skipped.push( { w, key: r.key, why: r.box ? `not visible (box ${ r.box.w }x${ r.box.h })` : 'not rendered (no layout box)' } );
			continue;
		}
		if ( 375 === w ) {
			const d = runs[ 1440 ].records.find( ( x ) => x.key === r.key && ! x.reveal );
			const pd = d && runs[ 1440 ].records.find( ( x ) => x.key === d.parentKey && ! x.reveal );
			const pm = res.records.find( ( x ) => x.key === r.parentKey );
			const rel = ( a, pa ) => ( a?.box && pa?.box ? [ a.box.x - pa.box.x, a.box.y - pa.box.y ] : [ 0, 0 ] );
			const [ dx, dy ] = rel( d, pd );
			const [ mx, my ] = rel( r, pm );
			r.layoutChanged = ! d?.box || Math.abs( d.box.w - r.box.w ) > 1 || Math.abs( d.box.h - r.box.h ) > 1 || Math.abs( dx - mx ) > 1 || Math.abs( dy - my ) > 1;
			if ( ! r.layoutChanged ) {
				continue;
			}
		}
		if ( ! shotsDir ) {
			continue;
		}
		const file = `${ safe( r.key ) }@${ w }.png`;
		try {
			await page.locator( `[data-inv-i="${ r.i }"]` ).screenshot( { path: path.join( shotsDir, file ), animations: 'disabled', timeout: 15000 } );
			( shots[ r.key ] ||= {} )[ w ] = `shots/${ file }`;
		} catch ( e ) {
			skipped.push( { w, key: r.key, why: `screenshot failed: ${ e.message.split( '\n' )[ 0 ] }` } );
		}
	}
	shotsDir && await page.evaluate( restoreOverlays );
}

// Reads the states of the root that show more than its opening state (lib/skeleton-reveal.mjs) and merges their elements into
// `res.records`; the states are found at each width (a control can exist at one width only, such as a compact layout's toggle).
// Does nothing without `reveal` ({ records }: the handoff's surfaces.json records).
// Runs `run` with the page held on its document: a main-frame document request made meanwhile is aborted. A draft
// control may leave the page by script (a product card sets `location.href`), which a click probe's preventDefault
// cannot stop, and every later read then fails with "Execution context was destroyed". A same-document hash change
// makes no request, so state routes still work. Returns what `run` returns; `held` counts the aborted navigations.
export async function holdNavigation( page, run, held = { count: 0 } ) {
	const guard = ( route ) => {
		const request = route.request();
		if ( request.isNavigationRequest() && request.frame() === page.mainFrame() ) {
			held.count++;
			return route.abort( 'aborted' );
		}
		return route.fallback();
	};
	await page.route( '**/*', guard );
	try {
		return await run();
	} finally {
		await page.unroute( '**/*', guard );
	}
}

async function addReveals( { page, res, args, reveal, w, log } ) {
	if ( ! reveal ) {
		return;
	}
	const held = { count: 0 };
	await holdNavigation( page, async () => {
		const states = await discoverReveals( page, { root: args[ 0 ], records: reveal.records, log } );
		const read = async () => {
			const r = await page.evaluate( collect, args );
			if ( r.error ) {
				throw new Error( `${ r.error } in a reveal state at ${ w }px` );
			}
			return r.records;
		};
		res.records = await readReveals( { page, states, read, base: res.records, log } );
		log( `inventory ${ w }px reveals: ${ states.length } states, ${ res.records.length } elements${ held.count ? `; ${ held.count } navigation(s) a probed control tried were held` : '' }` );
	}, held );
}

// The read on a page the caller prepared (readInventory with `page`): per width, resize, `settle( page, width )`, clear
// the previous read's data-inv-i marks, read; screenshots only with `shotsDir`; overlays hidden for crops are restored.
async function readOnPage( { page, url, root, shotsDir, log, settle: settleAt, strips, reveal, branches } ) {
	if ( 'function' !== typeof settleAt ) {
		throw new Error( 'readInventory with a page needs settle( page, width ): the caller drives settling' );
	}
	const runs = {};
	const shots = {};
	const skipped = [];
	const uaPadding = {};
	shotsDir && fs.mkdirSync( shotsDir, { recursive: true } );
	const height = page.viewportSize()?.height ?? 900;
	for ( const w of INVENTORY_WIDTHS ) {
		await page.setViewportSize( { width: w, height } );
		await settleAt( page, w );
		await page.evaluate( () => document.querySelectorAll( '[data-inv-i]' ).forEach( ( e ) => e.removeAttribute( 'data-inv-i' ) ) );
		const args = [ root, tplKeyOf.toString(), ATTRS, tplLineOf.toString(), strips, holdsOtherRoot.toString(), ALL_TEXT_CAP, codeItemsOf.toString(), RESOLVED, PAINT_INITIAL, NOT_DRAFT_DATA.source, PAINT_CURRENT_COLOUR, svgMarkupOf.toString() ];
		const res = await page.evaluate( collect, args );
		if ( res.error ) {
			throw new Error( `${ res.error } at ${ w }px` );
		}
		runs[ w ] = await withInjected( page, res );
		log( `inventory ${ w }px: ${ res.records.length } elements` );
		await shootWidth( { page, res, runs, w, root, shotsDir, shots, skipped } );
		await addReveals( { page, res, args, reveal, w, log } );
		await addDataBranches( { page, res, collect, args, branches, w, log } );
		await measureUaPadding( page, res.records, uaPadding );
	}
	return summarise( { runs, shots, skipped, url: url ?? page.url(), root, uaPadding } );
}

// Reads the draft at every width and returns { generated, source, root, keyFormat, checks, elements }. Screenshots go to
// `shotsDir` (1440 for every shown element, 375 only where an element's size or place inside its parent changed).
// Without `page`, a browser of its own opens `url` at each width. With `page` (a page the caller already prepared,
// opened and settled, such as intake's sandboxed harness page), nothing is launched or navigated: readOnPage resizes it
// to each width and the caller's `settle( page, width )` settles it; `shotsDir` may be null (no screenshots) and `url`
// only labels the result (default: the page's url). `reveal` ({ records }, or null for none) adds the elements the root
// shows only in a state a click reaches (lib/skeleton-reveal.mjs): each carries `reveal: { component, keys }`. `branches`
// ({ list, hosts }, lib/skeleton-data-branches.mjs::inventoryBranches) adds, in document order, the elements a branch shows
// only for some data: each carries `branch: { component, keys }`.
export async function readInventory( { url, root, shotsDir, log = () => {}, page = null, settle: settleAt = null, strips = null, reveal = null, branches = null } ) {
	if ( page ) {
		return readOnPage( { page, url, root, shotsDir, log, settle: settleAt, strips, reveal, branches } );
	}
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	const runs = {};
	const shots = {};
	const skipped = [];
	const uaPadding = {};
	fs.mkdirSync( shotsDir, { recursive: true } );
	try {
		for ( const w of INVENTORY_WIDTHS ) {
			const ctx = await browser.newContext( { viewport: { width: w, height: 900 } } );
			const page = await ctx.newPage();
			await page.goto( url, { waitUntil: 'networkidle', timeout: 90000 } );
			await applyStateRoute( page );
			await settle( page, root );
			const args = [ root, tplKeyOf.toString(), ATTRS, tplLineOf.toString(), strips, holdsOtherRoot.toString(), ALL_TEXT_CAP, codeItemsOf.toString(), RESOLVED, PAINT_INITIAL, NOT_DRAFT_DATA.source, PAINT_CURRENT_COLOUR, svgMarkupOf.toString() ];
			const res = await page.evaluate( collect, args );
			if ( res.error ) {
				throw new Error( `${ res.error } at ${ w }px` );
			}
			runs[ w ] = await withInjected( page, res );
			log( `inventory ${ w }px: ${ res.records.length } elements` );
			await shootWidth( { page, res, runs, w, root, shotsDir, shots, skipped } );
			await addReveals( { page, res, args, reveal, w, log } );
			await addDataBranches( { page, res, collect, args, branches, w, log } );
			await measureUaPadding( page, res.records, uaPadding );
			await ctx.close();
		}
	} finally {
		await browser.close();
	}
	return summarise( { runs, shots, skipped, url, root, uaPadding } );
}

// The 1440 records plus the elements that render only at another width (an sc-if on a width, a branch shown only on a phone
// or a tablet): each is inserted in document order after the record that precedes it in its own width's read, so a width
// alternative sits beside its sibling branch. An element read at 1440 keeps its place and its record unchanged.
export function withWidthOnly( runs ) {
	const out = [ ...runs[ 1440 ].records ];
	const have = new Set( out.map( recId ) );
	for ( const w of INVENTORY_WIDTHS.filter( ( x ) => 1440 !== x ) ) {
		const recs = runs[ w ]?.records || [];
		recs.forEach( ( r, i ) => {
			if ( have.has( recId( r ) ) ) {
				return;
			}
			const prev = recs.slice( 0, i ).reverse().find( ( x ) => have.has( recId( x ) ) );
			const at = prev ? out.findIndex( ( x ) => recId( x ) === recId( prev ) ) + 1 : 0;
			out.splice( at, 0, { ...r, box: null, visible: false, position: null, resolved: null } );
			have.add( recId( r ) );
		} );
	}
	return out;
}

// The injected content of one element per width ({ injected: { 375, 768, 1440 } }), or nothing when no width holds any.
const injectedOf = ( atWidth ) => {
	const by = Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, atWidth( w )?.injected ?? null ] ) );
	return Object.values( by ).some( Boolean ) ? { injected: by } : {};
};

// The inventory from the per-width reads ({ width: collect result }). Each element keeps its 1440 `display` and its computed
// display at every width in `displayAt` (null where that width's read has no such element). `uaPadding`, the browser's own
// padding per tag key (uaPaddingOf), is kept as the inventory's `uaPadding` when given.
export function summarise( { runs, shots, skipped, url, root, uaPadding = null } ) {
	const base = runs[ 1440 ];
	const at = ( w, id ) => runs[ w ].records.find( ( x ) => recId( x ) === id );
	const records = withWidthOnly( runs ).map( ( r ) => {
		const { i, ...rest } = r;
		const id = recId( r );
		// The words the element draws at each width, kept only where they differ (a script value that is shorter on a phone).
		const wordsAt = Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, at( w, id )?.words ?? '' ] ) );
		return { ...rest, ...( new Set( Object.values( wordsAt ).filter( Boolean ) ).size > 1 ? { wordsAt } : {} ), box: { 375: at( 375, id )?.box ?? null, 768: at( 768, id )?.box ?? null, 1440: r.box }, visible: { 375: at( 375, id )?.visible ?? false, 768: at( 768, id )?.visible ?? false, 1440: r.visible }, position: { 375: at( 375, id )?.position ?? null, 768: at( 768, id )?.position ?? null, 1440: r.position ?? null }, displayAt: Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, at( w, id )?.display ?? null ] ) ), resolved: { 375: at( 375, id )?.resolved ?? null, 768: at( 768, id )?.resolved ?? null, 1440: r.resolved ?? null }, ...injectedOf( ( w ) => ( 1440 === w ? r : at( w, id ) ) ), layoutChanged375: at( 375, id )?.layoutChanged ?? null, screenshots: r.reveal ? {} : shots[ r.key ] || {} };
	} );
	// The opening state's elements stay a list of their own; what only a state shows is kept beside it (lib/reveal-merge.mjs).
	const elements = records.filter( ( r ) => ! r.reveal );
	const revealed = records.filter( ( r ) => r.reveal );
	const tagOk = ( r ) => !! r.srcTag && r.srcTag.replace( /^sc-raw-/, '' ).toLowerCase() === r.tag;
	const checks = {
		rootName: base.rootName, rootKey: base.rootKey, unstamped: base.unstamped, duplicateKeys: records.length - new Set( records.map( recId ) ).size,
		perWidthCounts: Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, runs[ w ].records.filter( ( r ) => ! r.reveal ).length ] ) ), tagAgree: elements.filter( tagOk ).length, tagDisagree: elements.filter( ( r ) => ! tagOk( r ) ).map( ( r ) => [ r.key, r.srcTag, r.tag ] ),
		keysMissingAt: Object.fromEntries( INVENTORY_WIDTHS.map( ( w ) => [ w, records.filter( ( r ) => ! at( w, recId( r ) ) ).map( recId ) ] ) ), screenshotSkips: skipped,
	};
	return { generated: new Date().toISOString(), source: url, root, ...( base.beside?.length ? { beside: base.beside } : {} ), keyFormat: 'importChain/tplNumber#copyIndex (parity/lib/collect.mjs::tplKeyOf)', checks, ...( uaPadding ? { uaPadding } : {} ), elements, ...( revealed.length ? { revealed } : {} ) };
}
