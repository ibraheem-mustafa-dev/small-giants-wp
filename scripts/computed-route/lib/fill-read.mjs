// Reading the draft for Fill (FR-47-4 step 1): the draft rendered in a real browser, every target's computed styles
// read through the walker's own collectors (scripts/parity/lib/collect.mjs::collectPair, ::resolveFinder), so Fill sees
// exactly what a later walk of the built page will compare against.
import fs from 'fs';
import path from 'path';
import { DEFAULT_PROPS, PSEUDO_PROPS, resolveFinder, collectPair } from '../../parity/lib/collect.mjs';
import { REF_PROPS } from '../../parity/lib/ref-trace.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { openDevtools, settleAnimations, declaredValues } from '../../parity/lib/devtools.mjs';
import { makeHelpers } from '../../parity/lib/helpers.mjs';
import { SCOPE_ATTR, scopeFinder, scopeSelector, finderKind } from './fill-skeleton.mjs';
import { contentType } from './draft.mjs';
import { FLUID_WIDTHS, SWEEP_WIDTHS, LENGTH_PROPS } from './fill-values.mjs';
import { extraProps, readExtras, missingExtras } from './fill-declared.mjs';
import { readStates } from './fill-state-read.mjs';
import { readLogicStates } from './fill-logic-state.mjs';
import { readCurrentItems } from './fill-current-item.mjs';

const RESOLVE = resolveFinder.toString();
const COLLECT = collectPair.toString();

// The widths every property is read at, and the widths only lengths are (the fluid samples).
export const READ_WIDTHS = [ 375, 768, 1440 ];
// The sweep series that records whether the element rendered at all at each width.
export const PRESENT = '(rendered)';
// The properties Fill resolves. Motion timings of an entrance are Fill's entrance step; icon sizes belong to a slot
// naming the svg; the `gap` shorthand is the row-gap and column-gap reads.
// The walker's list reads only the top border's style; a border on any other side needs its own, or a width written
// without a style would paint nothing.
const SIDE_STYLES = [ 'border-right-style', 'border-bottom-style', 'border-left-style' ];
export const PROPS = [ ...new Set( [ ...DEFAULT_PROPS, ...REF_PROPS, ...SIDE_STYLES ] ) ].filter( ( p ) => ! /^(animation-|icon-)/.test( p ) && 'gap' !== p );

// Playwright, from the route's own pinned install (scripts/computed-route/node_modules, FR-48-75).
export async function loadChromium() {
	try {
		return await import( 'playwright' );
	} catch ( e ) {
		throw new Error( `playwright is not installed for the route (run npm ci in scripts/computed-route): ${ e.message }` );
	}
}

// Whether the draft page may load a URL: its own origin, inline data, or anything when `external` is set. Blocking the rest
// keeps a read the same offline and keeps a local draft on this machine (its web fonts fall back to system fonts).
export const requestAllowed = ( url, origin, external ) => external || url.startsWith( `${ origin }/` ) || url === origin || /^(data|blob):/.test( url );

// Routes a browser context's requests for a draft read: a URL in `mirror` ({ url: local file }) is answered from that file
// (a draft's CDN script served from a local copy, so the draft renders without leaving the machine), a URL
// requestAllowed accepts goes through, everything else is aborted.
export async function routeDraft( ctx, { origin, external = false, mirror = {}, aborted = null } ) {
	await ctx.route( '**/*', ( route ) => {
		const u = route.request().url();
		const file = mirror[ u ] || mirror[ u.split( '#' )[ 0 ] ];
		if ( file ) {
			return route.fulfill( { status: 200, body: fs.readFileSync( file ), contentType: contentType( file ) } );
		}
		if ( requestAllowed( u, origin, external ) ) {
			return route.continue();
		}
		aborted?.add( u );
		return route.abort();
	} );
}

// The named failure for a read width that resolved none of its targets (R-48-3: no silent failure). A Claude Design draft
// loads React and Babel from unpkg, so with the external-request block on nothing renders and every target reads missing.
export function emptyReadError( width, count, aborted ) {
	const urls = [ ...aborted ];
	return new Error( `Fill read ${ width }px: 0 of ${ count } targets resolved. The route aborted ${ urls.length } request(s)${ urls.length ? `: ${ urls.slice( 0, 8 ).join( ', ' ) }${ urls.length > 8 ? ', ...' : '' }` : '' }. A Claude Design draft loads its runtime (React, Babel) from unpkg, so run Fill with --allow-external; otherwise the finders match nothing on the draft.` );
}

// In-page. Collects every job's pair snapshot with the walker's collectPair, plus what Fill adds: the exact border box,
// whether it takes part in flow, the element's own words and link, and (a block holding other blocks) its own text
// styles. jobs: [{ id, finder, mark (a number: stamp the element so slot finders scope to it), own }].
function collectMany( [ jobs, collectSrc, resolveSrc, paintSrc, props, pseudoProps, scopeAttr ] ) {
	// eslint-disable-next-line no-new-func
	const collect = new Function( `return (${ collectSrc });` )();
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
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
	for ( const j of jobs ) {
		const el = resolve( j.finder );
		if ( el && null !== j.mark ) {
			el.setAttribute( scopeAttr, String( j.mark ) );
		}
		const snap = collect( [ j.finder, props, resolveSrc, null, null, null, paintSrc, pseudoProps ] );
		if ( ! el || snap.missing ) {
			out[ j.id ] = { missing: true };
			continue;
		}
		const r = el.getBoundingClientRect();
		snap.rect = { x: Math.round( r.x * 1000 ) / 1000, y: Math.round( ( r.y + window.scrollY ) * 1000 ) / 1000, w: Math.round( r.width * 1000 ) / 1000, h: Math.round( r.height * 1000 ) / 1000 };
		snap.inFlow = ! [ 'absolute', 'fixed' ].includes( getComputedStyle( el ).position );
		snap.words = ( el.textContent || '' ).replace( /\s+/g, ' ' ).trim();
		const anchors = el.matches( 'a[href]' ) ? [ el ] : [ ...el.querySelectorAll( 'a[href]' ) ];
		const sole = 1 === anchors.length && ( el === anchors[ 0 ] || anchors[ 0 ].textContent.replace( /\s+/g, ' ' ).trim() === snap.words );
		snap.href = sole ? anchors[ 0 ].getAttribute( 'href' ) : null;
		const anchor = sole ? anchors[ 0 ] : null;
		snap.target = anchor?.getAttribute( 'target' ) || null;
		snap.rel = anchor?.getAttribute( 'rel' ) || null;
		snap.id = el.getAttribute( 'id' ) || null;
		snap.ariaLabel = el.getAttribute( 'aria-label' ) || anchor?.getAttribute( 'aria-label' ) || null;
		// A form control, a checkbox button or a group of choice chips: what the field blocks hold as settings (lib/fill-form.mjs).
		snap.form = ( () => {
			const text = ( n ) => ( n.textContent || '' ).replace( /\s+/g, ' ' ).trim();
			const control = el.matches( 'input, select, textarea' );
			const toggle = el.matches( 'button[role="checkbox"], [role="checkbox"]' );
			const pressed = [ ...el.querySelectorAll( 'button[aria-pressed], [role="radio"], [role="option"]' ) ];
			if ( ! control && ! toggle && pressed.length < 2 && ! el.matches( 'button' ) ) {
				return null;
			}
			const f = { tag: el.localName, type: el.getAttribute( 'type' ), role: el.getAttribute( 'role' ), id: el.getAttribute( 'id' ), name: el.getAttribute( 'name' ) };
			for ( const a of [ 'autocomplete', 'inputmode', 'maxlength', 'placeholder', 'accept', 'rows', 'min', 'max', 'step' ] ) {
				f[ a ] = el.getAttribute( a );
			}
			f.required = el.hasAttribute( 'required' ) || 'true' === el.getAttribute( 'aria-required' );
			if ( control && 'select' !== el.localName ) {
				f.value = el.value;
				f.checked = !! el.checked;
			} else if ( toggle ) {
				f.checked = 'true' === el.getAttribute( 'aria-checked' );
			}
			if ( 'select' === el.localName ) {
				f.options = [ ...el.options ].map( ( o ) => ( { value: o.value, label: text( o ), selected: o.selected && o.defaultSelected } ) );
				f.value = el.value;
			}
			if ( pressed.length >= 2 ) {
				f.chips = pressed.map( ( c ) => {
					const leaves = [ ...c.querySelectorAll( '*' ) ].filter( ( x ) => ! x.children.length && text( x ) );
					const label = leaves.length ? text( leaves[ 0 ] ) : text( c );
					return { label, description: leaves.length > 1 ? text( leaves[ 1 ] ) : '', on: 'true' === c.getAttribute( 'aria-pressed' ) || 'true' === c.getAttribute( 'aria-checked' ) };
				} );
			}
			// The label that names the control: inside its box (floating) or outside it (static); and a live "n / max" counter beside it.
			if ( control ) {
				const lab = ( el.labels && el.labels[ 0 ] ) || ( f.id ? document.querySelector( `label[for="${ CSS.escape( f.id ) }"]` ) : null );
				const box = el.getBoundingClientRect();
				const lr = lab ? lab.getBoundingClientRect() : null;
				f.labelInside = lr ? lr.top >= box.top - 1 && lr.bottom <= box.bottom + 1 && lr.height > 0 : null;
				const holder = el.parentElement && el.parentElement.querySelectorAll( 'input, select, textarea' ).length < 2 ? el.parentElement : null;
				const m = holder ? /(?:^|[^\d.])\d+\s*\/\s*(\d+)(?!\d)/.exec( text( holder ) ) : null;
				f.counterMax = m ? Number( m[ 1 ] ) : null;
			}
			return f;
		} )();
		// The one image this element is (an <img>, or a <figure> / <picture> holding exactly one) and its figcaption's words.
		const imgs = el.matches( 'img' ) ? [ el ] : [ ...el.querySelectorAll( 'img' ) ];
		const cap = el.matches( 'figure' ) ? el.querySelector( 'figcaption' ) : null;
		snap.img = 1 === imgs.length ? { tag: el.localName, src: imgs[ 0 ].getAttribute( 'src' ) ?? imgs[ 0 ].getAttribute( 'data-src' ) ?? '', alt: imgs[ 0 ].getAttribute( 'alt' ), caption: cap ? ( cap.textContent || '' ).replace( /\s+/g, ' ' ).trim() : null } : null;
		// The one embedded frame this element is or holds (a map): its address, the filter it paints and its height.
		const frames = el.matches( 'iframe' ) ? [ el ] : [ ...el.querySelectorAll( 'iframe' ) ];
		snap.embed = 1 === frames.length ? { src: frames[ 0 ].getAttribute( 'src' ) ?? '', filter: getComputedStyle( frames[ 0 ] ).filter, h: frames[ 0 ].getBoundingClientRect().height } : null;
		// The first scroller in this element (or inside it) that sets its own scrollbar colour: the colours it paints, the width
		// it asks, the parts the draft declares beside them and the ground it sits on, for the theme's scrollbar tokens.
		const scroller = [ el, ...[ ...el.querySelectorAll( '*' ) ].slice( 0, 400 ) ].find( ( n ) => 'auto' !== getComputedStyle( n ).scrollbarColor );
		snap.scrollbar = null;
		if ( scroller ) {
			const sc = getComputedStyle( scroller );
			let ground = 'rgba(0, 0, 0, 0)';
			for ( let a = scroller; a && 'rgba(0, 0, 0, 0)' === ground; a = a.parentElement ) {
				ground = getComputedStyle( a ).backgroundColor;
			}
			const part = ( name ) => {
				try {
					return getComputedStyle( scroller, `::-webkit-scrollbar-${ name }` ).backgroundColor || null;
				} catch {
					return null;
				}
			};
			snap.scrollbar = { color: sc.scrollbarColor, width: sc.scrollbarWidth, ground, thumbPart: part( 'thumb' ), trackPart: part( 'track' ) };
		}
		// The one inline SVG this element is or holds, as XML with the paint the draft's CSS gave each drawing element written onto it
		// (fill, stroke and stroke width, a colour equal to the SVG's own colour as currentColor), for the icon writer.
		const svgs = el.matches( 'svg' ) ? [ el ] : [ ...el.querySelectorAll( 'svg' ) ];
		snap.svg = null;
		if ( 1 === svgs.length ) {
			const [ from ] = svgs;
			const copy = from.cloneNode( true );
			const own = getComputedStyle( from ).color;
			const pairs = [ [ from, copy ], ...[ ...from.querySelectorAll( '*' ) ].map( ( o, i ) => [ o, copy.querySelectorAll( '*' )[ i ] ] ) ];
			const drawn = /^(?:path|circle|ellipse|rect|line|polyline|polygon)$/;
			for ( const [ o, c ] of pairs ) {
				if ( drawn.test( o.localName ) ) {
					const cs = getComputedStyle( o );
					for ( const p of [ 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'fill-rule', 'opacity' ] ) {
						const v = cs.getPropertyValue( p ).trim();
						const plain = { 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-dasharray': 'none', 'fill-rule': 'nonzero', opacity: '1' }[ p ];
						if ( v && v !== plain ) {
							c.setAttribute( p, v === own ? 'currentColor' : v );
						}
					}
				}
			}
			if ( ! copy.getAttribute( 'viewBox' ) ) {
				const b = from.getBoundingClientRect();
				copy.setAttribute( 'viewBox', `0 0 ${ Math.round( b.width ) } ${ Math.round( b.height ) }` );
			}
			// Which side of the words the icon is drawn on, from where it and each piece of text paint along the row (or the
			// column, when the words sit beneath it): 'before' when it is drawn ahead of all of them, 'after' behind all of
			// them, null when there are no words or it sits among them.
			const ic = from.getBoundingClientRect();
			const words = [];
			const walk = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
			while ( walk.nextNode() ) {
				const t = walk.currentNode;
				if ( t.textContent.trim() && ! from.contains( t ) && ! /^(?:SCRIPT|STYLE)$/.test( t.parentElement?.tagName ?? '' ) ) {
					const range = document.createRange();
					range.selectNodeContents( t );
					const r = range.getBoundingClientRect();
					r.width && r.height && words.push( r );
				}
			}
			const ahead = words.map( ( r ) => {
				const dx = r.left + r.width / 2 - ( ic.left + ic.width / 2 );
				const dy = r.top + r.height / 2 - ( ic.top + ic.height / 2 );
				return Math.abs( dx ) >= Math.abs( dy ) ? dx > 0 : dy > 0;
			} );
			const position = ! ahead.length ? null : ahead.every( Boolean ) ? 'before' : ahead.some( Boolean ) ? null : 'after';
			snap.svg = { markup: new XMLSerializer().serializeToString( copy ), position };
		}
		// The intrinsic ratio of the image or SVG this element is, or of the one it wraps: an image's natural size, else its
		// width and height attributes, else an SVG's viewBox. A wrapper is media only when that image is its only rendered
		// content (no words, no other element) and fills its box; a button or card holding one icon is not media. null when
		// there is no such element or none states a ratio.
		const only = el.matches( 'img, svg' ) ? null : ( 1 === el.querySelectorAll( 'img, svg' ).length ? el.querySelector( 'img, svg' ) : null );
		const fills = ( m ) => {
			const [ a, b ] = [ el.getBoundingClientRect(), m.getBoundingClientRect() ];
			return Math.abs( a.width - b.width ) <= 1 && Math.abs( a.height - b.height ) <= 1;
		};
		const wraps = only && ! el.textContent.trim() && [ ...el.querySelectorAll( '*' ) ].every( ( d ) => d === only || d.contains( only ) || only.contains( d ) ) && fills( only );
		const media = el.matches( 'img, svg' ) ? el : ( wraps ? only : null );
		let ratio = null;
		if ( media && 'svg' === media.localName ) {
			const vb = media.viewBox?.baseVal;
			ratio = vb && vb.width > 0 && vb.height > 0 ? vb.width / vb.height : null;
		} else if ( media ) {
			const attrs = [ 'width', 'height' ].map( ( a ) => parseFloat( media.getAttribute( a ) ) );
			ratio = media.naturalWidth > 0 && media.naturalHeight > 0 ? media.naturalWidth / media.naturalHeight : ( attrs.every( ( n ) => n > 0 ) ? attrs[ 0 ] / attrs[ 1 ] : null );
		}
		snap.intrinsic = ratio ? { tag: media.localName, ratio } : null;
		snap.role = el.getAttribute( 'role' );
		snap.className = String( el.getAttribute( 'class' ) || '' );
		if ( j.own ) {
			const cs = getComputedStyle( el );
			for ( const p of props.filter( ( x ) => [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ].includes( x ) ) ) {
				const v = cs.getPropertyValue( p ).trim();
				snap.styles[ p ] = /color$/.test( p ) ? srgb( v ) : v;
			}
		}
		out[ j.id ] = snap;
	}
	return out;
}

// Node side: the jobs for one read of every target: roots first so their slots can scope to them. A tpl finder names one
// exact draft element page-wide (parity/lib/collect.mjs resolves it, `within` only filters), so it is never scoped: a part
// the block draws from outside its root's element (an absorbed drawer opener, the nav's burger) or a root the draft does
// not draw at that width would otherwise never be found.
export function jobsFor( nodes ) {
	return nodes.flatMap( ( n ) => n.targets.map( ( t ) => ( {
		id: t.id,
		finder: t.scoped && 'tpl' !== finderKind( t.finder ) ? scopeFinder( t.finder, scopeSelector( n.index ) ) : t.finder,
		mark: t.scoped ? null : n.index,
		own: ! t.scoped && n.children.length > 0,
	} ) ) );
}

// Opens one page on the draft at a width (a phone at 375, as the walker reads it), runs the draft's open step (a click
// on the text of a navigation link in a single-page draft) and waits for its animations to finish.
async function openPage( browser, devices, { url, open, width, origin, external, mirror, aborted } ) {
	const phone = width < 500 ? devices[ 'iPhone 13' ] : {};
	const ctx = await browser.newContext( { ...phone, viewport: { width, height: width < 500 ? 812 : 900 } } );
	await routeDraft( ctx, { origin, external, mirror, aborted } );
	const page = await ctx.newPage();
	const h = makeHelpers( page, 'draft', { cb: ( u ) => u, RESOLVE, onAction: null } );
	await h.goto( url );
	if ( open ) {
		await h.clickText( open, { wait: 900 } );
	}
	await settleAnimations( page, { floor: 900 } );
	return { ctx, page, h };
}

// What every read of the draft returns:
//   widths[w][targetId]   the collectPair snapshot (plus rect, inFlow, words, href); { missing: true } when the finder
//                         found nothing visible. READ_WIDTHS carry every property, the other fluid widths only lengths.
//   declared[w][targetId] every longhand the draft's matched rules declare (FR-48-8), at READ_WIDTHS; the ones beyond
//                         PROPS (lib/fill-declared.mjs::extraProps) are read rendered into widths[w][targetId].styles too.
//   sweep[targetId][prop] [{ width, value }] every 16px from 320 to 1920 (lengths and keywords as read).
//   states[w]             each target's state looks at READ_WIDTHS (lib/fill-state-read.mjs::readStates), when `states`
//                         (the state vocabulary, lib/db.mjs::statesVocabulary) is given; with `logicRows` (the state map's
//                         `scIf` rows) it also holds the looks behind each set-state sc-if (lib/fill-logic-state.mjs::readLogicStates)
//                         in the same shape, and `logicGaps`; with `currentGroups` (lib/fill-current-item.mjs::currentItemGroups) it holds
//                         the current-item looks of a repeated list too.
// nodes: lib/fill-skeleton.mjs::skeletonNodes. open: the regex source of the text to click first. external: allow the
// draft to load anything beyond its own origin (off by default, so a read is the same offline).
export async function readDraft( { url, nodes, open = null, headless = true, sweep = true, external = false, mirror = {}, states = [], logicRows = [], currentGroups = [], log = () => {} } ) {
	const { chromium, devices } = await loadChromium();
	const origin = new URL( url ).origin;
	const jobs = jobsFor( nodes );
	const browser = await chromium.launch( { headless, args: [ '--hide-scrollbars' ] } );
	const result = { origin, widths: {}, declared: {}, sweep: {}, states: {} };
	const aborted = new Set();
	const emptyWidths = [];
	try {
		for ( const width of [ ...new Set( [ ...READ_WIDTHS, ...FLUID_WIDTHS ] ) ] ) {
			const { ctx, page } = await openPage( browser, devices, { url, open, width, origin, external, mirror, aborted } );
			const full = READ_WIDTHS.includes( width );
			result.widths[ width ] = await page.evaluate( collectMany, [ jobs, COLLECT, RESOLVE, PAINT_SRC, full ? PROPS : LENGTH_PROPS, full ? PSEUDO_PROPS : null, SCOPE_ATTR ] );
			// A width that resolves none is legitimate when the surface is hidden there by design; it is a failure when the route
			// aborted a request (the draft's runtime never loaded), or when every width resolves none.
			if ( jobs.length && jobs.every( ( j ) => result.widths[ width ][ j.id ]?.missing ) ) {
				emptyWidths.push( width );
				if ( aborted.size > 0 ) {
					log( `read ${ width }px: 0 of ${ jobs.length } targets` );
					throw emptyReadError( width, jobs.length, aborted );
				}
			}
			if ( full ) {
				const cdp = await openDevtools( page );
				result.declared[ width ] = {};
				const found = jobs.filter( ( x ) => ! result.widths[ width ][ x.id ]?.missing );
				for ( const j of found ) {
					result.declared[ width ][ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null ).catch( ( e ) => {
						log( `declared read failed for ${ j.id } at ${ width }px (its declared values are not judged there): ${ e.message }` );
						return null;
					} );
				}
				// What the code declares beyond Fill's list, read rendered too (FR-48-8), into the same snapshot.
				const extras = Object.fromEntries( found.map( ( j ) => [ j.id, extraProps( result.declared[ width ][ j.id ], PROPS ) ] ) );
				for ( const [ id, styles ] of Object.entries( await readExtras( page, found, extras, RESOLVE ) ) ) {
					result.widths[ width ][ id ].styles = { ...result.widths[ width ][ id ].styles, ...styles };
				}
				// Each target's state looks (FR-48-81), every target included: a state often reveals one hidden at rest.
				if ( states.length ) {
					result.states[ width ] = await readStates( { page, cdp, jobs, rows: states, rest: result.declared[ width ], resolveSrc: RESOLVE, log } );
					if ( logicRows.length ) {
						const logic = await readLogicStates( { page, cdp, jobs, rest: result.declared[ width ], logicRows, vocab: states, resolveSrc: RESOLVE, log } );
						for ( const [ id, looks ] of Object.entries( logic.looks ) ) {
							( result.states[ width ].looks[ id ] ??= [] ).push( ...looks );
						}
						result.states[ width ].logicGaps = logic.gaps;
					}
					// A list item the draft's logic marks current (lib/fill-current-item.mjs): its look against a non-current copy.
					if ( currentGroups.length ) {
						const current = await readCurrentItems( { page, cdp, jobs, groups: currentGroups, resolveSrc: RESOLVE } );
						for ( const [ id, looks ] of Object.entries( current.looks ) ) {
							( result.states[ width ].looks[ id ] ??= [] ).push( ...looks );
						}
						result.states[ width ].logicGaps = [ ...( result.states[ width ].logicGaps || [] ), ...current.gaps ];
					}
				}
			}
			log( `read ${ width }px: ${ Object.values( result.widths[ width ] ).filter( ( s ) => ! s.missing ).length } of ${ jobs.length } targets` );
			await ctx.close();
		}
		if ( jobs.length && emptyWidths.length === new Set( [ ...READ_WIDTHS, ...FLUID_WIDTHS ] ).size ) {
			throw emptyReadError( emptyWidths.join( '/' ), jobs.length, aborted );
		}
		// A property the code declares beyond PROPS at one width is read at every read width, so its value at the others
		// (a default, or another declaration) is known and one width's value is never carried to the rest.
		const missing = missingExtras( result, PROPS, READ_WIDTHS );
		if ( Object.keys( missing ).length ) {
			const { ctx, page } = await openPage( browser, devices, { url, open, width: 1440, origin, external, mirror } );
			for ( const width of READ_WIDTHS ) {
				await page.setViewportSize( { width, height: 900 } );
				await page.waitForTimeout( 80 );
				const want = Object.fromEntries( Object.entries( missing ).map( ( [ id, by ] ) => [ id, Object.fromEntries( ( by[ width ] || [] ).map( ( p ) => [ p, true ] ) ) ] ) );
				for ( const [ id, styles ] of Object.entries( await readExtras( page, jobs.filter( ( j ) => result.widths[ width ][ j.id ] && ! result.widths[ width ][ j.id ].missing ), want, RESOLVE ) ) ) {
					result.widths[ width ][ id ].styles = { ...result.widths[ width ][ id ].styles, ...styles };
				}
			}
			await ctx.close();
		}
		if ( sweep ) {
			const { ctx, page } = await openPage( browser, devices, { url, open, width: 1440, origin, external, mirror } );
			for ( const width of SWEEP_WIDTHS ) {
				await page.setViewportSize( { width, height: 900 } );
				await page.waitForTimeout( 80 );
				const snaps = await page.evaluate( collectMany, [ jobs, COLLECT, RESOLVE, PAINT_SRC, PROPS, null, SCOPE_ATTR ] );
				for ( const [ id, s ] of Object.entries( snaps ) ) {
					const series = ( result.sweep[ id ] ??= {} );
					( series[ PRESENT ] ??= [] ).push( { width, value: s.missing ? 'absent' : 'present' } );
					for ( const prop of PROPS ) {
						( series[ prop ] ??= [] ).push( { width, value: s.styles?.[ prop ] } );
					}
				}
			}
			log( `swept ${ SWEEP_WIDTHS.length } widths` );
			await ctx.close();
		}
	} finally {
		await browser.close();
	}
	return result;
}
