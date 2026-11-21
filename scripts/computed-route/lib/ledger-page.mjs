// The clone difference ledger's page reads (tools/clone-ledger.mjs): one page view per side and width, every target read in
// one evaluate with the parity walker's own collector (parity/lib/collect.mjs::collectPair, the full look: text, box, paint,
// typography, pseudo layers, motion), so the ledger judges a pair exactly as the walker does. Page views only: nothing is
// clicked, typed or written.
import { collectPair, resolveFinder, DEFAULT_PROPS, PSEUDO_PROPS } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';

// The look read on every element: the walker's list and the rest of what the eye sees (margins, offsets on every side, the
// stacking, blend, filter and background family, the overflow and wrapping).
export const LOOK_PROPS = [ ...new Set( [ ...DEFAULT_PROPS, 'position', 'right', 'bottom', 'z-index', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
	'width', 'max-width', 'filter', 'mix-blend-mode', 'background-size', 'background-position', 'background-repeat', 'background-clip', 'visibility', 'overflow-x', 'overflow-y', 'white-space',
	'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'border-bottom-style', 'border-left-style', 'border-right-style' ] ) ];

// In-page: every item found, stamped (data-ledger-n) and read. items: [ { n, finder? , scopeN?, scope?, liveRoot?, liveSlot? } ]
// in order (a slot item after the item whose element scopes it). Returns { [n]: { found, shown, snap?, err?, parent? } }.
export function readBatchInPage( [ items, collectSrc, resolveSrc, paintSrc, props, pseudoProps ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const collect = new Function( `return (${ collectSrc });` )();
	const els = new Map();
	const byPart = new Set();
	const out = {};
	for ( const it of items ) {
		let el = null;
		let approx = false;
		try {
			if ( it.liveRoot ) {
				const root = document.querySelector( it.liveRoot );
				// A slot is the element's path from the block root (ref-trace.mjs::elementPath); a wrapper the block prints
				// between them (a trigger's wrap) is skipped by a descendant match. A path into a moved part (`@controls`) is not read.
				const slotEl = () => {
					if ( /^@/.test( it.liveSlot ) ) {
						return null;
					}
					const exact = root.querySelector( `:scope > ${ it.liveSlot }` ) || root.querySelector( `:scope ${ it.liveSlot }` );
					if ( exact || ! /:nth-of-type\(/.test( it.liveSlot ) ) {
						return exact;
					}
					// The path's position among siblings is not on the live block (a split menu numbers its far side's items
					// afresh): the first element of the same part, recorded as paired by part.
					const loose = root.querySelector( `:scope ${ it.liveSlot.replace( /:nth-of-type\(\d+\)/g, '' ) }` );
					approx = !! loose;
					return loose;
				};
				el = root && it.liveSlot ? slotEl() : root;
			} else if ( it.finder ) {
				const scopeEl = null == it.scopeN ? null : els.get( it.scopeN );
				if ( null == it.scopeN || scopeEl ) {
					scopeEl?.setAttribute( 'data-fill-scope', String( it.scope ) );
					el = 'string' === typeof it.finder ? document.querySelector( it.finder ) : resolve( it.finder );
					scopeEl?.removeAttribute( 'data-fill-scope' );
				}
			}
		} catch ( e ) {
			out[ it.n ] = { found: false, err: String( e.message || e ).slice( 0, 160 ) };
			continue;
		}
		if ( ! el ) {
			out[ it.n ] = { found: false };
			continue;
		}
		els.set( it.n, el );
		if ( approx ) {
			byPart.add( it.n );
		}
		el.setAttribute( 'data-ledger-n', `${ el.getAttribute( 'data-ledger-n' ) || '' } ${ it.n }`.trim() );
	}
	const box = ( e ) => {
		const r = e.getBoundingClientRect();
		return { x: Math.round( r.x ), y: Math.round( r.y + window.scrollY ), w: Math.round( r.width ), h: Math.round( r.height ) };
	};
	const sel = ( n ) => `[data-ledger-n~="${ n }"]`;
	for ( const [ n, el ] of els ) {
		const cs = getComputedStyle( el );
		const shown = el.getClientRects().length > 0 && 'hidden' !== cs.visibility;
		const rec = { found: true, shown, ...( byPart.has( n ) ? { byPart: true } : {} ) };
		const p = el.parentElement;
		rec.parent = p ? { tag: p.tagName.toLowerCase(), cls: String( p.className || '' ).slice( 0, 80 ), box: box( p ) } : null;
		if ( shown ) {
			const others = [];
			for ( const [ m, o ] of els ) {
				if ( m !== n && o !== el && el.contains( o ) ) {
					others.push( sel( m ) );
				}
			}
			try {
				const snap = collect( [ sel( n ), props, resolveSrc, null, null, null, paintSrc, pseudoProps, { others, textOthers: others, paintPart: true } ] );
				rec.snap = snap.missing ? null : snap;
				// An element the walker's visibility test refuses (no offsetParent) still has its box: read it here.
				if ( ! rec.snap ) {
					rec.snap = null;
					rec.box = box( el );
				}
			} catch ( e ) {
				rec.err = String( e.message || e ).slice( 0, 160 );
				rec.box = box( el );
			}
		}
		out[ n ] = rec;
	}
	return out;
}

// Opens `url` at `width` in a fresh context, scrolls through the page once so every entrance has run, returns to the top,
// waits `settleMs`, and reads `items`. Returns readBatchInPage's result.
export async function readPage( browser, url, width, items, { settleMs = 1500, height = 900 } = {} ) {
	const ctx = await browser.newContext( { viewport: { width, height } } );
	try {
		const page = await ctx.newPage();
		await page.goto( url, { waitUntil: 'load', timeout: 90000 } );
		await page.waitForTimeout( 800 );
		await page.evaluate( async () => {
			const step = Math.max( 300, Math.floor( innerHeight * 0.8 ) );
			for ( let y = 0; y < document.documentElement.scrollHeight; y += step ) {
				window.scrollTo( { top: y, behavior: 'instant' } );
				await new Promise( ( r ) => setTimeout( r, 60 ) );
			}
			window.scrollTo( { top: 0, behavior: 'instant' } );
		} );
		await page.waitForTimeout( settleMs );
		return await page.evaluate( readBatchInPage, [ items, collectPair.toString(), resolveFinder.toString(), PAINT_SRC, LOOK_PROPS, PSEUDO_PROPS ] );
	} finally {
		await ctx.close();
	}
}
