/**
 * SGS motion reveal (Spec 38A §9, FR-38A-19, FR-38A-27).
 *
 * Keeps `.sgs-motion-ready` on <html> (the only gate on a hidden entrance start state in assets/css/motion.css; the
 * head's ready gate, assets/js/motion-ready-gate.js, adds it before first paint, and this script adds it too) and
 * sets `data-sgs-in` on each `[data-sgs-me~="scroll"]` element once it crosses its start line; the stylesheet plays
 * the entrance from that attribute, so this script computes no timing. The start line is the percentage of the
 * viewport height above the bottom edge in the element's `--sgs-me-start` custom property (default 6). An element
 * already above its start line when the script runs (all rects are read before any attribute is written) plays its
 * entrance at once. Once it has measured the page it sets `window.sgsMotionRevealArmed`, which tells the head gate
 * to keep the class at the window's load event. An element scrolled above the viewport is revealed at once, and one fully visible in the uncropped viewport
 * is revealed too when the page cannot scroll far enough for its top to cross the start line. An element with no layout box, zero size or a position outside the horizontal viewport is left to the observers.
 * With reduced motion on, the class is removed and every observer released; a change of that preference mid-session
 * re-arms or releases them. Without IntersectionObserver neither script adds the class, so everything stays visible.
 * Elements printed after load (a post-grid's load more) are armed the same way when their block fires
 * `sgs-motion:scan` on the element holding them (Spec 38A §8): one in view is revealed at once, the rest are observed.
 */
( ( d, w ) => {
	if ( ! w.IntersectionObserver ) {
		return;
	}
	const root = d.documentElement;
	const READY = 'sgs-motion-ready';
	const mq = w.matchMedia( '(prefers-reduced-motion: reduce)' );
	let obs = {};
	const hit = ( list, io, full ) =>
		list.forEach( ( e ) => {
			if ( full ? e.intersectionRatio >= 1 : e.isIntersecting || e.boundingClientRect.top < 0 ) {
				e.target.setAttribute( 'data-sgs-in', '' );
				Object.keys( obs ).forEach( ( k ) => obs[ k ].unobserve( e.target ) );
			}
		} );
	const pending = '[data-sgs-me~="scroll"]:not([data-sgs-in])';
	const measure = ( list ) =>
		list.map( ( el ) => {
			let s = parseFloat( w.getComputedStyle( el ).getPropertyValue( '--sgs-me-start' ) );
			s = s >= 0 ? s : 6;
			const r = el.getBoundingClientRect();
			const seen = el.getClientRects().length && r.width && r.height && r.right > 0 && r.left < w.innerWidth;
			return [ el, s, r, seen && r.top < w.innerHeight * ( 1 - s / 100 ) ];
		} );
	const show = ( rows ) => rows.forEach( ( [ el, , , up ] ) => up && el.setAttribute( 'data-sgs-in', '' ) );
	const arm = ( rows ) =>
		rows.forEach( ( [ el, s, r, up ] ) => {
			if ( up ) {
				return;
			}
			( obs[ s ] = obs[ s ] || new w.IntersectionObserver( hit, { rootMargin: `0px 0px -${ s }% 0px` } ) ).observe( el );
			if ( r.top + w.pageYOffset > root.scrollHeight - ( w.innerHeight * s ) / 100 ) {
				( obs.f = obs.f || new w.IntersectionObserver( ( l, io ) => hit( l, io, 1 ), { threshold: 1 } ) ).observe( el );
			}
		} );
	const sync = () => {
		Object.keys( obs ).forEach( ( k ) => obs[ k ].disconnect() );
		obs = {};
		if ( mq.matches ) {
			root.classList.remove( READY );
		} else {
			const rows = measure( [ ...d.querySelectorAll( pending ) ] );
			show( rows );
			root.classList.add( READY );
			arm( rows );
		}
		w.sgsMotionRevealArmed = true;
	};
	d.addEventListener( 'sgs-motion:scan', ( e ) => {
		const host = e.target;
		if ( mq.matches || ! root.classList.contains( READY ) || ! host || ! host.querySelectorAll ) {
			return;
		}
		const rows = measure( [ ...( host.matches( pending ) ? [ host ] : [] ), ...host.querySelectorAll( pending ) ] );
		show( rows );
		arm( rows );
	} );
	mq.addEventListener( 'change', sync );
	'loading' === d.readyState ? d.addEventListener( 'DOMContentLoaded', sync ) : sync();
} )( document, window );
