// The helpers handed to a config's open() and state actions, and the anchor-offset check,
// for draft-live-walk.mjs.
import { centreOf } from './collect.mjs';

// Every goto, click, tap and hover is logged per state (h.log) for the drive check: pass
// { nav: true } on a click that only navigates (a single-page draft's menu link), so it counts
// as a URL load; { quiet: true } waits until the network is idle (an Interactivity re-render).
// onAction (header mode) runs right after each click, tap or hover, before the settle wait, so
// motion is sampled while it plays.
export function makeHelpers( page, side, { cb, RESOLVE, onAction } ) {
	let inflight = 0;
	page.on( 'request', () => inflight++ );
	page.on( 'requestfinished', () => inflight-- );
	page.on( 'requestfailed', () => inflight-- );
	const after = async ( opts ) => {
		const spent = onAction ? await onAction( h ) : 0;
		await page.waitForTimeout( Math.max( 0, ( opts.wait ?? 700 ) - spent ) );
		if ( opts.quiet ) {
			await h.quiet();
		}
	};
	const at = ( finder ) => page.evaluate( centreOf, [ finder, RESOLVE ] );
	// What a tap did: the URL changed, something opened (a dialog, an open details, an expanded
	// control, or a fixed layer grew by more than 40px), or nothing.
	const surface = () => page.evaluate( () => {
		const open = document.querySelectorAll( 'dialog[open], details[open], [aria-expanded="true"]' ).length;
		const fixed = [ ...document.querySelectorAll( 'body *' ) ].filter( ( e ) => getComputedStyle( e ).position === 'fixed' && e.getClientRects().length )
			.reduce( ( sum, e ) => sum + e.getBoundingClientRect().height, 0 );
		// Visible text-bearing elements: an accordion that opens inside a full-screen layer adds them.
		const shown = [ ...document.querySelectorAll( 'body *' ) ].filter( ( e ) => e.getClientRects().length && [ ...e.childNodes ].some( ( n ) => 3 === n.nodeType && n.textContent.trim() ) ).length;
		return { url: location.href, open, fixed, shown };
	} );
	const h = {
		page, side, log: [],
		wait: ( ms ) => page.waitForTimeout( ms ),
		// Resolves once no request has been in flight for 500ms (15s at most).
		quiet: async () => {
			for ( let calm = 0, t = 0; calm < 5 && t < 150; t++ ) {
				calm = inflight > 0 ? 0 : calm + 1;
				await page.waitForTimeout( 100 );
			}
		},
		goto: async ( url ) => {
			h.log.push( { type: 'goto', target: url } );
			await page.goto( cb( url ), { waitUntil: 'networkidle' } );
			await page.waitForTimeout( 500 );
		},
		// Clicks the smallest visible element whose rendered text matches the regex source.
		clickText: async ( src, opts = {} ) => {
			const ok = await page.evaluate( ( [ finder, res ] ) => {
				// eslint-disable-next-line no-new-func
				const el = new Function( `return (${ res });` )()( finder );
				if ( el ) {
					el.click();
				}
				return !! el;
			}, [ { text: src, tag: opts.tag || 'a,button,[role=button],[role=tab],label,summary,h3,span,div', within: opts.within, nth: opts.nth }, RESOLVE ] );
			h.log.push( opts.nav ? { type: 'goto', target: `/${ src }/` } : { type: 'click', target: `/${ src }/`, hit: ok, optional: !! opts.optional } );
			if ( ! ok && ! opts.optional ) {
				throw new Error( `${ side }: nothing visible matches /${ src }/` );
			}
			await after( opts );
		},
		click: async ( selector, opts = {} ) => {
			h.log.push( opts.nav ? { type: 'goto', target: selector } : { type: 'click', target: selector, hit: true } );
			await page.evaluate( ( [ sel, res ] ) => {
				// eslint-disable-next-line no-new-func
				const el = new Function( `return (${ res });` )()( sel );
				if ( ! el ) {
					throw new Error( 'no visible ' + sel );
				}
				el.click();
			}, [ selector, RESOLVE ] );
			await after( opts );
		},
		// A real mouse click at the element's centre: whatever paints on top there takes it (an
		// overlay, a label that is a link). Logs what the click did, for the drive check.
		tap: async ( finder, opts = {} ) => {
			const point = await at( finder );
			const name = opts.name || ( typeof finder === 'string' ? finder : JSON.stringify( finder ) );
			if ( ! point ) {
				h.log.push( { type: 'click', target: name, hit: false, optional: !! opts.optional, tap: true, outcome: 'no target' } );
				if ( ! opts.optional ) {
					throw new Error( `${ side }: nothing visible to tap for ${ name }` );
				}
				return;
			}
			const before = await surface();
			await page.mouse.click( point.x, point.y );
			await after( opts );
			await page.waitForLoadState( 'domcontentloaded' ).catch( () => {} );
			const now = await surface().catch( () => ( { url: 'unknown', open: 0, fixed: 0, shown: 0 } ) );
			const outcome = now.url.split( '?' )[ 0 ] !== before.url.split( '?' )[ 0 ] ? 'navigated'
				: now.open > before.open || now.fixed - before.fixed > 40 || now.shown - before.shown >= 3 ? 'opened' : 'nothing';
			h.log.push( { type: 'click', target: name, hit: true, optional: !! opts.optional, tap: true, outcome } );
		},
		// Points the mouse at the element (a panel that opens on pointer-enter); a no-op when nothing matches.
		hover: async ( finder, opts = {} ) => {
			const point = await at( finder );
			h.log.push( { type: 'hover', target: typeof finder === 'string' ? finder : JSON.stringify( finder ), hit: !! point } );
			if ( point ) {
				await page.mouse.move( point.x, point.y, { steps: 4 } );
				await after( opts );
			}
		},
		waitFor: ( selector ) => page.waitForSelector( selector, { state: 'visible', timeout: 15000 } ),
	};
	return h;
}

// A pair with `anchor: '<pair>'` is compared on its vertical distance from that pair,
// so a missing gap or rule shows even when the pages above (a header) differ in height.
// `anchorX: true` also compares the gap from the pair's right edge to the anchor's
// (`right-from-<anchor>`): a tag pushed past its card's edge reads as a negative gap.
// `anchorLeft: true` compares the left edges (`x-from-<anchor>`): where an item sits along a bar.
export function anchorOffset( p, ds, ls, t ) {
	const a = p.anchor;
	if ( ! a || ! ds[ a ] || ! ls[ a ] || ds[ a ].missing || ls[ a ].missing || ds[ p.name ].missing || ls[ p.name ].missing ) {
		return [];
	}
	const out = [];
	const dy = ds[ p.name ].box.y - ds[ a ].box.y;
	const ly = ls[ p.name ].box.y - ls[ a ].box.y;
	if ( Math.abs( dy - ly ) > t.box ) {
		out.push( { kind: 'box', key: `y-from-${ a }`, draft: dy, live: ly } );
	}
	if ( p.anchorLeft && Math.abs( ( ds[ p.name ].box.x - ds[ a ].box.x ) - ( ls[ p.name ].box.x - ls[ a ].box.x ) ) > t.box ) {
		out.push( { kind: 'box', key: `x-from-${ a }`, draft: ds[ p.name ].box.x - ds[ a ].box.x, live: ls[ p.name ].box.x - ls[ a ].box.x } );
	}
	if ( p.anchorX ) {
		const right = ( s ) => s[ a ].box.x + s[ a ].box.w - ( s[ p.name ].box.x + s[ p.name ].box.w );
		if ( Math.abs( right( ds ) - right( ls ) ) > t.box ) {
			out.push( { kind: 'box', key: `right-from-${ a }`, draft: right( ds ), live: right( ls ) } );
		}
	}
	return out;
}
