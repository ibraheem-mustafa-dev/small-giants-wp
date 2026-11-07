// C5 geometry after and during entrances. (a) page horizontal overflow: scrollWidth > innerWidth at 375, 768, 1023, 1024,
// 1025 and 1440, naming the widest offenders. (b) sliders and carousels: once entrances end, the active slide's left edge
// equals the track's visible left edge within 0.5px and no neighbour shows unless the draft shows one; sampled once
// mid-entrance (informational: a scale entrance moves rects) and once after a window resize post-entrance. A slider is
// found by geometry (a clipping box holding a row of equal-width slides wider than itself), on both sides, so the draft
// is the control: a slider is paired with the draft's by order on the page, and a count mismatch is "unmeasured".
import { RESOLVE_SRC, pairFor, finding, round, openSide, settle, runPages, summary } from './lib-geometry.mjs';

export const C5_OVERFLOW_WIDTHS = [ 375, 768, 1023, 1024, 1025, 1440 ];
const EDGE_TOL = 0.5;

// In the page: horizontal overflow of the document and the elements reaching furthest past the viewport.
export function readOverflow() {
	const iw = window.innerWidth;
	const doc = document.documentElement;
	const refOf = ( e ) => {
		for ( let x = e; x; x = x.parentElement ) {
			const c = [ ...( x.classList || [] ) ].find( ( k ) => /^cr-ref-.+-\d+$/.test( k ) );
			if ( c ) {
				return c;
			}
		}
		return null;
	};
	const wide = [ ...document.body.querySelectorAll( '*' ) ].map( ( e ) => ( { e, r: e.getBoundingClientRect() } ) )
		.filter( ( { e, r } ) => {
			if ( r.width <= 0 || r.right <= iw + 0.5 || 'fixed' === getComputedStyle( e ).position ) {
				return false;
			}
			// Clipped by an ancestor that itself stays inside the viewport: it adds nothing to the page's scroll width.
			for ( let x = e.parentElement; x && x !== document.body; x = x.parentElement ) {
				if ( /hidden|clip/.test( getComputedStyle( x ).overflowX ) && x.getBoundingClientRect().right <= iw + 0.5 ) {
					return false;
				}
			}
			return true;
		} )
		.sort( ( a, b ) => b.r.right - a.r.right ).slice( 0, 3 )
		.map( ( { e, r } ) => ( { ref: refOf( e ), cls: [ ...e.classList ].filter( ( k ) => ! /^cr-ref-/.test( k ) ).slice( 0, 2 ).join( '.' ) || e.tagName.toLowerCase(), right: Math.round( r.right ) } ) );
	return { scrollW: doc.scrollWidth, innerW: iw, over: Math.max( 0, doc.scrollWidth - iw ), wide };
}

// In the page: every slider by geometry, in document order, with the active slide's offset from the track's left edge.
// With [ finder, resolveSrc, slideW ] it reads only inside the element the finder names (the draft's side of a pair); when
// that holds no slider by geometry (a draft that swaps one card in place) the card as wide as the live slide is read instead.
export function readSliders( arg ) {
	const [ finder, resolveSrc, slideW ] = arg || [];
	let scope = document.body;
	if ( finder ) {
		// eslint-disable-next-line no-new-func
		scope = new Function( `return (${ resolveSrc });` )()( finder );
		if ( ! scope ) {
			return [];
		}
	}
	const out = [];
	const refOf = ( e ) => {
		for ( let x = e; x; x = x.parentElement ) {
			const c = [ ...( x.classList || [] ) ].find( ( k ) => /^cr-ref-.+-\d+$/.test( k ) );
			if ( c ) {
				return c;
			}
		}
		return null;
	};
	const clips = [ ...scope.querySelectorAll( '*' ) ].filter( ( e ) => {
		const s = getComputedStyle( e );
		return /hidden|clip|auto|scroll/.test( s.overflowX ) && e.getBoundingClientRect().width > 100 && 'none' !== s.display;
	} );
	for ( const clip of clips ) {
		const cr = clip.getBoundingClientRect();
		// The list: a descendant (depth <= 3) whose children are equal-width slides laid in a row and wider than the clip together.
		const lists = [ clip, ...clip.querySelectorAll( ':scope > *, :scope > * > *, :scope > * > * > *' ) ];
		const list = lists.find( ( l ) => {
			const k = [ ...l.children ].filter( ( c ) => c.getBoundingClientRect().width > 40 && getComputedStyle( c ).position !== 'absolute' );
			if ( k.length < 3 ) {
				return false;
			}
			const rs = k.map( ( c ) => c.getBoundingClientRect() );
			const sameRow = rs.every( ( r ) => Math.abs( r.top - rs[ 0 ].top ) < 4 );
			const sameW = rs.every( ( r ) => Math.abs( r.width - rs[ 0 ].width ) < 4 );
			return sameRow && sameW && rs[ rs.length - 1 ].right - rs[ 0 ].left > cr.width + 4 && rs[ 0 ].width <= cr.width * 1.02 + 2;
		} );
		if ( ! list ) {
			continue;
		}
		const slides = [ ...list.children ].filter( ( c ) => c.getBoundingClientRect().width > 40 && getComputedStyle( c ).position !== 'absolute' );
		// A marquee: the list itself (or a slide) runs an endless transform or translate; a decorative endless animation inside a slide does not count.
		const moves = ( a ) => Object.keys( a.effect?.getKeyframes?.()[ 0 ] || {} ).some( ( k ) => /^(transform|translate|left|marginLeft|insetInlineStart)$|marquee/i.test( k ) );
		const continuous = clip.getAnimations( { subtree: true } ).some( ( a ) => Infinity === a.effect?.getTiming().iterations && 'running' === a.playState && moves( a ) );
		// Visible left edge of the track: its left edge plus its own left border and padding (what the slide should start at).
		const cs = getComputedStyle( clip );
		const trackLeft = cr.left + ( parseFloat( cs.borderLeftWidth ) || 0 ) + ( parseFloat( cs.paddingLeft ) || 0 );
		const inView = slides.map( ( s ) => ( { s, r: s.getBoundingClientRect() } ) ).filter( ( { r } ) => Math.min( r.right, cr.right ) - Math.max( r.left, cr.left ) > 1 );
		const visible = ( s ) => { const st = getComputedStyle( s ); return +st.opacity > 0.05 && 'hidden' !== st.visibility; };
		const shown = inView.filter( ( { s } ) => visible( s ) );
		const active = shown.slice().sort( ( a, b ) => Math.abs( a.r.left - trackLeft ) - Math.abs( b.r.left - trackLeft ) )[ 0 ] || null;
		const leftmost = shown.slice().sort( ( a, b ) => a.r.left - b.r.left )[ 0 ] || null;
		out.push( {
			ref: refOf( clip ), cls: [ ...clip.classList ].filter( ( k ) => ! /^cr-ref-/.test( k ) ).slice( 0, 2 ).join( '.' ) || clip.tagName.toLowerCase(),
			continuous, slides: slides.length, trackLeft: Math.round( trackLeft * 10 ) / 10, slideLeft: active ? Math.round( active.r.left * 10 ) / 10 : null, trackW: Math.round( cr.width * 10 ) / 10,
			offset: active ? Math.round( ( active.r.left - trackLeft ) * 10 ) / 10 : null,
			shown: shown.length, slideW: active ? Math.round( active.r.width * 10 ) / 10 : null,
		} );
	}
	if ( finder && ! out.length ) {
		const card = [ scope, ...scope.querySelectorAll( '*' ) ].find( ( e ) => {
			const r = e.getBoundingClientRect();
			return 'none' !== getComputedStyle( e ).display && Math.abs( r.width - slideW ) <= 3 && r.height > 60;
		} );
		if ( card ) {
			out.push( { card: true, cls: 'card', continuous: false, slideLeft: Math.round( card.getBoundingClientRect().left * 10 ) / 10, shown: 1, offset: null } );
		}
	}
	return out;
}

// Judges the live overflow against the draft's. Pure.
export function judgeOverflow( live, draft, base ) {
	const b = { class: 'C5', ...base, kind: 'page-overflow' };
	if ( ! live || ! draft ) {
		return [ { ...b, status: 'unmeasured', reason: 'a side did not load' } ];
	}
	if ( live.over > draft.over + 0.5 ) {
		const w = live.wide[ 0 ];
		return [ finding( { ...b, ref: w?.ref || null, block: w?.cls, draft: draft.over, live: live.over, note: `scrollWidth ${ live.scrollW } > innerWidth ${ live.innerW }; widest: ${ live.wide.map( ( x ) => `${ x.ref || x.cls } to ${ x.right }px` ).join( ', ' ) }` } ) ];
	}
	return [ { ...b, status: 'pass', draft: draft.over, live: live.over } ];
}

// Judges one settled slider reading against the draft's twin. Pure. `state` is settled, after-resize or mid-entrance.
export function judgeSlider( live, draft, base ) {
	const b = { class: 'C5', ...base, block: live.cls, ref: live.ref };
	if ( ! draft ) {
		return [ { ...b, status: 'unmeasured', kind: 'slide-offset', reason: 'no draft slider at the same position on the page' } ];
	}
	if ( draft.card && ! live.continuous ) {
		// The draft shows one card in place: the live active slide must start where that card starts.
		const informational = 'mid-entrance' === base.state;
		const d = live.slideLeft - draft.slideLeft;
		const rows = [ Math.abs( d ) > EDGE_TOL && ! informational
			? finding( { ...b, kind: 'slide-offset', draft: 0, live: round( d ), note: `active slide starts ${ round( d ) }px from the draft card's left edge (track left ${ live.trackLeft }px, slide ${ live.slideLeft }px, draft card ${ draft.slideLeft }px)` } )
			: { ...b, status: informational ? 'info' : 'pass', kind: 'slide-offset', draft: 0, live: round( d ) } ];
		rows.push( live.shown > 1 && ! informational
			? finding( { ...b, kind: 'neighbour-shown', draft: 1, live: live.shown, note: `${ live.shown } slides show in the track, the draft shows one card` } )
			: { ...b, status: informational ? 'info' : 'pass', kind: 'neighbour-shown', draft: 1, live: live.shown } );
		return rows;
	}
	if ( live.continuous || draft.continuous ) {
		return [ { ...b, status: 'unmeasured', kind: 'slide-offset', reason: 'a continuous marquee has no active slide' } ];
	}
	if ( null === live.offset ) {
		return [ { ...b, status: 'unmeasured', kind: 'slide-offset', reason: 'no slide shows inside the track' } ];
	}
	const informational = 'mid-entrance' === base.state;
	const bad = Math.abs( live.offset ) > EDGE_TOL && Math.abs( live.offset ) > Math.abs( draft.offset ?? 0 ) + EDGE_TOL;
	const out = [ bad && ! informational
		? finding( { ...b, kind: 'slide-offset', draft: draft.offset, live: live.offset, note: `active slide left edge is ${ live.offset }px from the track's left edge` } )
		: { ...b, status: informational ? 'info' : 'pass', kind: 'slide-offset', draft: draft.offset, live: live.offset } ];
	const extra = live.shown > draft.shown;
	out.push( extra && ! informational
		? finding( { ...b, kind: 'neighbour-shown', draft: draft.shown, live: live.shown, note: `${ live.shown } slides show in the track, the draft shows ${ draft.shown }` } )
		: { ...b, status: informational ? 'info' : 'pass', kind: 'neighbour-shown', draft: draft.shown, live: live.shown } );
	return out;
}

const scrollInto = ( page, ref, finder ) => page.evaluate( ( [ r, f, src ] ) => {
	// eslint-disable-next-line no-new-func
	const el = f ? new Function( `return (${ src });` )()( f ) : document.querySelector( `.${ r }` );
	el?.scrollIntoView( { block: 'center' } );
}, [ ref, finder, RESOLVE_SRC ] );

// Per page: overflow at every overflow width; sliders (paired by cr-ref through pairs.json) at each requested width, read
// mid-entrance, settled, and after a window resize.
export async function runC5( { browser, client, page: pg, liveUrl: lu, draftUrl: du, widths } ) {
	const results = [];
	const ow = [ ...new Set( [ ...( widths || [] ), ...C5_OVERFLOW_WIDTHS ] ) ].sort( ( a, b ) => a - b );
	for ( const w of ow ) {
		const L = await openSide( browser, 'live', lu, w, 900 );
		const D = await openSide( browser, 'draft', du, w, 900 );
		try {
			const slideWidth = [ 375, 768, 1440 ].includes( w ) || ( widths || [] ).includes( w );
			await settle( L.page, { fast: ! slideWidth } );
			await settle( D.page, { fast: ! slideWidth } );
			const base = { page: pg.route, width: w, widthPx: w, state: 'settled' };
			results.push( ...judgeOverflow( await L.page.evaluate( readOverflow ), await D.page.evaluate( readOverflow ), base ) );
			if ( ! slideWidth ) {
				continue;
			}
			const ls = await L.page.evaluate( readSliders );
			const seen = {};
			for ( const s of ls ) {
				const nth = seen[ s.ref ] = ( seen[ s.ref ] ?? -1 ) + 1;
				const sb = { ...base, block: s.cls, ref: s.ref };
				const finder = s.ref ? pairFor( client, s.ref ) : null;
				if ( ! finder ) {
					results.push( { class: 'C5', ...sb, kind: 'slide-offset', status: 'unmeasured', reason: 'no draft element paired with this slider' + ( s.ref ? '' : ' (no cr-ref)' ) } );
					continue;
				}
				const read = async ( p ) => {
					const l = ( await L.page.evaluate( readSliders ) ).filter( ( x ) => x.ref === s.ref )[ nth ];
					const d = l ? ( await D.page.evaluate( readSliders, [ finder, RESOLVE_SRC, l.slideW ] ) )[ 0 ] : null;
					return l && d ? judgeSlider( l, d, { ...sb, state: p } ) : [ { class: 'C5', ...sb, state: p, kind: 'slide-offset', status: 'unmeasured', reason: l ? 'no slider or card found in the draft element' : 'slider vanished' } ];
				};
				await L.page.reload( { waitUntil: 'load' } );
				await D.page.reload( { waitUntil: 'load' } );
				await L.page.waitForTimeout( 1000 );
				await D.page.waitForTimeout( 1000 );
				await scrollInto( L.page, s.ref, null );
				await scrollInto( D.page, null, finder );
				await L.page.waitForTimeout( 250 );
				results.push( ...await read( 'mid-entrance' ) );
				await L.page.waitForTimeout( 3200 );
				results.push( ...await read( 'settled' ) );
				await L.page.setViewportSize( { width: w + 17, height: 900 } );
				await D.page.setViewportSize( { width: w + 17, height: 900 } );
				await L.page.waitForTimeout( 900 );
				results.push( ...await read( 'after-resize' ) );
				await L.page.setViewportSize( { width: w, height: 900 } );
				await D.page.setViewportSize( { width: w, height: 900 } );
			}
		} finally {
			await L.ctx.close();
			await D.ctx.close();
		}
	}
	return results;
}
export const run = ( opts ) => runPages( runC5, opts );
export const summaryLines = summary;
