// The keyboard focus pass for draft-live-walk.mjs (GAP-CHECKLIST.md section 13). A scripted el.focus()
// after mouse clicks never matches :focus-visible, so the ring a keyboard user sees is reached the way
// they reach it: focus goes to the tabbable control just before the pair's own, then a real Tab moves it on.
import { FOCUS_PROPS } from './collect.mjs';

// In the page: the pair's focus target (itself, its first tabbable descendant or its tabbable
// ancestor) and focus parked on the tabbable control before it in document order.
function parkBefore( [ finder, resolveSrc, props ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	if ( ! el ) {
		return 'missing';
	}
	const F = 'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
	const target = el.matches( F ) ? el : el.querySelector( F ) || el.closest( F );
	if ( ! target ) {
		return 'none';
	}
	const shown = ( e ) => e.getClientRects().length && 'hidden' !== getComputedStyle( e ).visibility;
	const all = [ ...document.querySelectorAll( F ) ].filter( ( e ) => e === target || shown( e ) );
	const i = all.indexOf( target );
	document.activeElement?.blur?.();
	if ( i > 0 ) {
		all[ i - 1 ].focus( { preventScroll: true } );
	}
	target.setAttribute( 'data-parity-focus', '' );
	// A Tab scrolls the focused control into view; every scroller around it is put back afterwards, so the
	// pass leaves the page exactly as the state left it.
	const scrollers = [ document.scrollingElement ];
	for ( let a = target.parentElement; a; a = a.parentElement ) {
		if ( a.scrollHeight > a.clientHeight || a.scrollWidth > a.clientWidth ) {
			scrollers.push( a );
		}
	}
	window.__parityScroll = scrollers.map( ( e ) => [ e, e.scrollTop, e.scrollLeft ] );
	// The control's values before focus, so only what focus changes is compared.
	const cs = getComputedStyle( target );
	return { rest: Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) ) };
}

// In the page: the focused control's ring, and whether the Tab really landed on the target.
function readFocus( props ) {
	const target = document.querySelector( '[data-parity-focus]' );
	if ( ! target ) {
		return null;
	}
	target.removeAttribute( 'data-parity-focus' );
	const landed = document.activeElement === target && target.matches( ':focus-visible' );
	const cs = getComputedStyle( target );
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
	const styles = {};
	for ( const p of props ) {
		const v = cs.getPropertyValue( p ).trim();
		styles[ p ] = /color$/.test( p ) ? srgb( v ) : v;
	}
	target.blur();
	for ( const [ e, top, left ] of window.__parityScroll || [] ) {
		e.scrollTo( { top, left, behavior: 'instant' } );
	}
	return { landed, styles };
}

// Focuses one pair's control by keyboard and reads its ring. Returns { landed, styles }, { none: true }
// (nothing focusable in or around the pair) or null (the pair is gone).
export async function focusPass( page, p, side, RESOLVE ) {
	const props = p.focusProps || FOCUS_PROPS;
	const parked = await page.evaluate( parkBefore, [ p[ side ], RESOLVE, props ] ).catch( () => 'missing' );
	if ( 'missing' === parked ) {
		return null;
	}
	if ( 'none' === parked ) {
		return { none: true };
	}
	await page.keyboard.press( 'Tab' );
	await page.waitForTimeout( p.focusWait ?? 300 );
	// readFocus blurs the control; no Escape, which would close the drawer or dialog the state opened.
	const out = await page.evaluate( readFocus, props ).catch( () => null );
	return out && { ...out, rest: parked.rest };
}

// The differences between the two sides' focus rings. A ring that one side never shows is the finding,
// so "focus not reached" on one side only is a row of its own.
export function compareFocus( d, l, sameValue, pxTol ) {
	if ( ! d || ! l || d.none || l.none ) {
		return d?.none !== l?.none && d && l ? [ { kind: 'focus', key: 'focusable', draft: d.none ? 'none' : 'yes', live: l.none ? 'none' : 'yes' } ] : [];
	}
	if ( d.landed !== l.landed ) {
		return [ { kind: 'focus', key: 'reached', draft: d.landed ? 'focus-visible' : 'not reached', live: l.landed ? 'focus-visible' : 'not reached' } ];
	}
	const rows = [];
	const none = ( s ) => 'none' === s[ 'outline-style' ];
	// Only what focus changes on at least one side: a difference that is the same at rest is the rest rows' job.
	const moved = ( s, k ) => ! s.rest || ! sameValue( k, s.rest[ k ], s.styles[ k ], pxTol );
	for ( const k of Object.keys( d.styles ).filter( ( x ) => moved( d, x ) || moved( l, x ) ) ) {
		// An outline's width, colour and offset paint nothing while its style is none (the style row says it).
		if ( /^outline-(width|color|offset)$/.test( k ) && ( none( d.styles ) || none( l.styles ) ) ) {
			continue;
		}
		if ( ! sameValue( k, d.styles[ k ], l.styles[ k ], pxTol ) ) {
			rows.push( { kind: 'focus', key: k, draft: d.styles[ k ], live: l.styles[ k ] } );
		}
	}
	return rows;
}
