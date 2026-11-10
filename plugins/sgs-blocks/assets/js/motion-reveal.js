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
 * A jump to a `#fragment` (the load URL's, a `hashchange`, or a click on a same-page `#` link, caught in the capture
 * phase before any other click handler such as the nav drawer's close) reveals every unrevealed scroll entrance on the
 * target and its ancestors at once, finishing their entrance animations, so the browser scrolls to the settled
 * position and not to the translated start state; load and `hashchange` then call `scrollIntoView` once so the
 * scroll-padding applies. Reduced motion is unchanged (nothing is hidden). Other entrances keep their own.
 * An interactivity-router region (`data-wp-router-region`: a product collection's or query loop's pagination and
 * filters) replaces its content without a page load, so each region fires that scan itself when its children change.
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
	const watchRegions = () => {
		if ( ! w.MutationObserver ) {
			return;
		}
		d.querySelectorAll( '[data-wp-router-region]' ).forEach( ( region ) => {
			let queued = false;
			new w.MutationObserver( () => {
				if ( queued ) {
					return;
				}
				queued = true;
				w.requestAnimationFrame( () => {
					queued = false;
					region.dispatchEvent( new w.CustomEvent( 'sgs-motion:scan', { bubbles: true } ) );
				} );
			} ).observe( region, { childList: true, subtree: true } );
		} );
	};
	const targetOf = ( hash ) => {
		let id = hash.replace( /^#/, '' );
		try {
			id = decodeURIComponent( id );
		} catch ( err ) {
			// A malformed escape is looked up as written.
		}
		return id ? d.getElementById( id ) || d.getElementsByName( id )[ 0 ] || null : null;
	};
	const settle = ( target ) => {
		if ( mq.matches || ! target ) {
			return false;
		}
		const path = [];
		for ( let n = target; n && n.nodeType === 1; n = n.parentElement ) {
			n.matches( pending ) && path.push( n );
		}
		path.forEach( ( n ) => {
			n.setAttribute( 'data-sgs-in', '' );
			Object.keys( obs ).forEach( ( k ) => obs[ k ].unobserve( n ) );
		} );
		path.forEach( ( n ) => n.getAnimations && n.getAnimations().forEach( ( a ) => a.finish() ) );
		return path.length > 0;
	};
	d.addEventListener(
		'click',
		( e ) => {
			const a = e.target && e.target.closest ? e.target.closest( 'a[href]' ) : null;
			if ( ! a || e.defaultPrevented || 0 !== e.button ) {
				return;
			}
			const u = new w.URL( a.href, w.location.href );
			u.hash.length > 1 && u.origin + u.pathname + u.search === w.location.origin + w.location.pathname + w.location.search && settle( targetOf( u.hash ) );
		},
		true
	);
	w.addEventListener( 'hashchange', () => {
		const target = targetOf( w.location.hash );
		settle( target ) && target.scrollIntoView && target.scrollIntoView();
	} );
	const start = () => {
		const target = targetOf( w.location.hash );
		const moved = settle( target );
		sync();
		moved && target.scrollIntoView && target.scrollIntoView();
		watchRegions();
	};
	mq.addEventListener( 'change', sync );
	'loading' === d.readyState ? d.addEventListener( 'DOMContentLoaded', start ) : start();
} )( document, window );
