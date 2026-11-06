// The applier's reads: one surface at one width on one side, every paired element's facts after entrances have played.
// A page opens through lib/pairs-page.mjs (the walker's own way in, closed states included); the wrapper below adds what a
// measured draft run needs (READING-DC-FILES section 5): a fixed clock and random, no saved form draft, a record of every
// Element.animate call, and external photos answered at once so a slow link cannot stall a read.
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { attachStateReads, stateReads } from './apply-hover.mjs';
import { openDraft, openLive } from './pairs-page.mjs';

const PIXEL = Buffer.from( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64' );

// Runs in the page before any script. Fixed on a Wednesday 11:00 UTC: inside any client's opening hours, stable across runs.
export function instrument( opts ) {
	const fixed = opts?.fixed ?? Date.UTC( 2026, 6, 8, 11, 0, 0 );
	const RealDate = Date;
	// eslint-disable-next-line no-global-assign
	Date = class extends RealDate {
		constructor( ...a ) {
			super( ...( a.length ? a : [ fixed ] ) );
		}
		static now() {
			return fixed + performance.now();
		}
	};
	Math.random = () => 0.5;
	try {
		localStorage.clear();
	} catch ( e ) {
		// A blocked store has nothing saved.
	}
	window.__sgsAnimate = [];
	const real = Element.prototype.animate;
	Element.prototype.animate = function ( frames, options ) {
		const host = this.closest( '[data-dc-tpl]' );
		window.__sgsAnimate.push( { el: this, host, frames, options } );
		return real.call( this, frames, options );
	};
}

// The second clock: a Sunday midday, outside the opening hours of any client that closes one day a week. A read taken under it
// shows the draft's and the live page's closed state (the open-status dot, its pulse, the reopening line).
export const CLOSED_CLOCK = Date.UTC( 2026, 10, 8, 12, 0, 0 );

// The live page's clock only: Date fixed, nothing else touched.
export function clockOnly( { fixed } ) {
	const RealDate = Date;
	// eslint-disable-next-line no-global-assign
	Date = class extends RealDate {
		constructor( ...a ) {
			super( ...( a.length ? a : [ fixed ] ) );
		}
		static now() {
			return fixed + performance.now();
		}
	};
}

// A browser whose pages are prepared before the walker's opener navigates them. `clock`: a fixed time in ms, or null for the
// default open-hours Wednesday on the draft and the real clock on the live page.
export function preparedBrowser( browser, { side, clock = null } ) {
	return {
		newPage: async ( options ) => {
			const page = await browser.newPage( options );
			if ( 'draft' === side ) {
				await page.addInitScript( instrument, { fixed: clock ?? undefined } );
				await page.route( /images\.unsplash\.com/, ( r ) => r.fulfill( { status: 200, contentType: 'image/png', body: PIXEL } ) );
			} else if ( clock ) {
				await page.addInitScript( clockOnly, { fixed: clock } );
			}
			return page;
		},
	};
}

// In-page: { key: facts } for each { key, finder }, the height of the page's sticky header and the recorded animate calls.
export function factsOf( { items, props, resolveSrc } ) {
	// eslint-disable-next-line no-new-func
	const find = new Function( `return (${ resolveSrc });` )();
	const out = {};
	const seen = new Map();
	for ( const { key, finder } of items ) {
		const el = find( finder );
		if ( ! el ) {
			continue;
		}
		const cs = getComputedStyle( el );
		const r = el.getBoundingClientRect();
		const styles = {};
		props.forEach( ( p ) => {
			styles[ p ] = cs.getPropertyValue( p );
		} );
		seen.set( el, key );
		// The layout box ignores transforms (an entrance's held scale shrinks a bounding box, never the layout).
		let lx = 0;
		let ly = 0;
		for ( let o = el; o instanceof HTMLElement; o = o.offsetParent ) {
			lx += o.offsetLeft;
			ly += o.offsetTop;
		}
		// The first repeated set under the element (three or more children of one width): a gallery's tiles, a timeline's cards.
		let items = null;
		const queue = [ el ];
		for ( let i = 0; i < queue.length && i < 300 && ! items; i++ ) {
			const kids = [ ...queue[ i ].children ].filter( ( c ) => c.offsetWidth > 0 );
			if ( kids.length >= 3 && kids.every( ( c ) => Math.abs( c.offsetWidth - kids[ 0 ].offsetWidth ) <= 1 ) ) {
				items = { n: kids.length, w: kids[ 0 ].offsetWidth, h: kids[ 0 ].offsetHeight, parentW: queue[ i ].clientWidth };
			} else if ( queue[ i ].children.length ) {
				queue.push( ...queue[ i ].children );
			}
		}
		const anchor = el.closest( 'a[href]' );
		out[ key ] = {
			tag: el.tagName.toLowerCase(),
			box: { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height },
			layout: { x: lx, y: ly, w: el.offsetWidth, h: el.offsetHeight },
			items,
			anchor: anchor ? anchor.getAttribute( 'href' ) : null,
			target: el.getAttribute( 'target' ),
			declared: el.style ? el.style.gridTemplateColumns : '',
			childAnchors: [ ...el.children ].filter( ( c ) => 'A' === c.tagName ).length,
			href: el.getAttribute( 'href' ),
			fx: el.getAttribute( 'data-sgs-fx' ),
			data: el.getAttributeNames().filter( ( n ) => n.startsWith( 'data-' ) ),
			fade: ( el.parentElement && ( getComputedStyle( el.parentElement ).maskImage || getComputedStyle( el.parentElement ).webkitMaskImage ) ) || 'none',
			text: ( el.textContent || '' ).trim().slice( 0, 80 ),
			styles,
		};
	}
	const header = [ ...document.querySelectorAll( 'body *' ) ].find( ( e ) => {
		const s = getComputedStyle( e );
		const r = e.getBoundingClientRect();
		return /sticky|fixed/.test( s.position ) && '0px' === s.top && r.width >= innerWidth - 20 && r.height > 30;
	} );
	// A call belongs to the nearest paired element at or above the one animated; `own` says it is that element itself.
	const ownerOf = ( node ) => {
		for ( let e = node; e; e = e.parentElement ) {
			if ( seen.has( e ) ) {
				return e;
			}
		}
		return null;
	};
	const animate = ( window.__sgsAnimate || [] ).map( ( a ) => ( {
		key: seen.get( ownerOf( a.el ) ) ?? null,
		own: seen.has( a.el ),
		tpl: a.el.getAttribute?.( 'data-dc-tpl' ) ?? a.host?.getAttribute?.( 'data-dc-tpl' ) ?? null,
		frames: JSON.parse( JSON.stringify( a.frames ?? null ) ),
		options: 'object' === typeof a.options ? JSON.parse( JSON.stringify( a.options ) ) : a.options,
	} ) );
	return { facts: out, headerHeight: header ? header.getBoundingClientRect().height : 0, animate };
}

// One side of a surface at one width. A draft that has not rendered is opened again: its runtime loads from the network.
// `extras` ({ hover: [ keys ], probes: [ keys ] }, lib/apply-hover.mjs::extrasOf) adds a real-pointer hover read and a form probe at 1440.
export async function readSurface( { browser, surface, side, width, props, extras = null, clock = null } ) {
	// A skeleton slot target reads the part's own element (`live`, null when no calibrated part matches it); `aux` names more draft
	// elements a family reads beside the target (the burger's bars), keyed `<key>~<tpl>`.
	const items = surface.pairs.flatMap( ( p ) => ( 'draft' === side
		? [ { key: p.key ?? p.ref, finder: { tpl: p.tpl } }, ...( p.aux || [] ).map( ( a ) => ( { key: a.key, finder: { tpl: a.tpl } } ) ) ]
		: ( null === p.live ? [] : [ { key: p.key ?? p.ref, finder: p.live ?? `.${ p.ref }` } ] ) ) );
	const open = 'draft' === side ? openDraft : openLive;
	const shim = preparedBrowser( browser, { side, clock } );
	for ( let attempt = 0; attempt < 3; attempt++ ) {
		const page = await open( shim, surface.cfg, width );
		try {
			const ready = 'live' === side || ( await page.evaluate( () => document.querySelectorAll( '[data-dc-tpl]' ).length > 40 ) );
			if ( ready ) {
				const read = await page.evaluate( factsOf, { items, props, resolveSrc: resolveFinder.toString() } );
				if ( 1440 === width && ( extras?.hover?.length || extras?.probes?.length ) ) {
					const finderOf = ( key ) => items.find( ( i ) => i.key === key ).finder;
					attachStateReads( read, await stateReads( page, { extras: { ...extras, hover: ( extras.hover || [] ).filter( ( k ) => items.some( ( i ) => i.key === k ) ), probes: ( extras.probes || [] ).filter( ( k ) => items.some( ( i ) => i.key === k ) ) }, finderOf, resolveSrc: resolveFinder.toString(), side } ) );
				}
				return read;
			}
		} finally {
			await page.close();
		}
	}
	throw new Error( `the draft of ${ surface.name } did not render at ${ width }` );
}
