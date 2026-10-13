/**
 * SGS motion reveal (Spec 38A §9, FR-38A-19, FR-38A-27).
 *
 * Adds `.sgs-motion-ready` to <html> (the only gate on a hidden entrance start state in assets/css/motion.css) and
 * sets `data-sgs-in` on each `[data-sgs-me~="scroll"]` element once it crosses its start line; the stylesheet plays
 * the entrance from that attribute, so this script computes no timing. The start line is the percentage of the
 * viewport height above the bottom edge in the element's `--sgs-me-start` custom property (default 6). An element
 * already above the viewport is revealed at once. With reduced motion on, the class is removed and every observer
 * released; a change of that preference mid-session re-arms or releases them. Without IntersectionObserver the class
 * is never added, so everything stays visible.
 */
( ( d, w ) => {
	if ( ! w.IntersectionObserver ) {
		return;
	}
	const root = d.documentElement;
	const mq = w.matchMedia( '(prefers-reduced-motion: reduce)' );
	let obs = {};
	const hit = ( list, io ) =>
		list.forEach( ( e ) => {
			if ( e.isIntersecting || e.boundingClientRect.top < 0 ) {
				e.target.setAttribute( 'data-sgs-in', '' );
				io.unobserve( e.target );
			}
		} );
	const sync = () => {
		Object.keys( obs ).forEach( ( k ) => obs[ k ].disconnect() );
		obs = {};
		root.classList.toggle( 'sgs-motion-ready', ! mq.matches );
		if ( mq.matches ) {
			return;
		}
		d.querySelectorAll( '[data-sgs-me~="scroll"]:not([data-sgs-in])' ).forEach( ( el ) => {
			let s = parseFloat( w.getComputedStyle( el ).getPropertyValue( '--sgs-me-start' ) );
			s = s >= 0 ? s : 6;
			( obs[ s ] = obs[ s ] || new w.IntersectionObserver( hit, { rootMargin: `0px 0px -${ s }% 0px` } ) ).observe( el );
		} );
	};
	mq.addEventListener( 'change', sync );
	'loading' === d.readyState ? d.addEventListener( 'DOMContentLoaded', sync ) : sync();
} )( document, window );
