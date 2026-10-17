/**
 * SGS motion ready gate (Spec 38A §9, FR-38A-19). `Sgs_Motion_Assets::print_ready_gate` prints this file inline at the
 * top of <head> (without this comment) on a page with a scroll entrance.
 *
 * It adds `.sgs-motion-ready` to <html> before the body is parsed, so a scroll entrance's hidden start state
 * (assets/css/motion.css) applies from first paint and no target is painted at its resting opacity before its
 * entrance plays. The deferred reveal module (assets/js/motion-reveal.js) then reveals what is in view and observes the
 * rest, and sets `window.sgsMotionRevealArmed` once it has. If the module has not armed by the window's load event
 * (it failed to download or threw: a deferred script always runs before load), the gate removes the class, so every
 * target shows at its resting state. Without IntersectionObserver, or with reduced motion, it adds nothing; with
 * JavaScript blocked it never runs; in each case nothing is hidden.
 */
( ( d, w ) => {
	const root = d.documentElement;
	if ( ! w.IntersectionObserver || ! w.matchMedia || w.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}
	root.classList.add( 'sgs-motion-ready' );
	w.addEventListener( 'load', () => {
		if ( ! w.sgsMotionRevealArmed ) {
			root.classList.remove( 'sgs-motion-ready' );
		}
	} );
} )( document, window );
