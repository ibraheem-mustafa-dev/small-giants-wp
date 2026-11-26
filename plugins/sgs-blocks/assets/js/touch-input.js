/**
 * Hover and press looks on touch screens (Spec 38A FR-38A-17), for the site setting "Hover effects on touch screens"
 * (`data-sgs-touch-hover` on <html>, includes/class-sgs-touch-hover-setting.php).
 *
 * Every SGS hover rule carries a mouse half guarded by `:where(:root:not(.sgs-touch-input))` and a touch half under the
 * class `.sgs-pressed`; every press (`:active`) rule carries a `.sgs-pressed` twin (scripts/hover-guard/transform.js,
 * includes/helpers-hover-state.php). This file sets the two classes:
 *   - `.sgs-touch-input` on <html> while the most recent pointer was a touch or pen, removed the moment a mouse is
 *     pressed or moved, so a hybrid device (touchscreen laptop, iPad with a trackpad) switches per input. It turns the
 *     mouse halves off, so a tapped element is never left in its hover look.
 *   - `.sgs-pressed` the moment a finger or pen lands, on the element under it and every ancestor up to <html> (the
 *     chain `:hover` covers, so a card's `.card:hover .title` look shows for a press anywhere on the card). It comes off
 *     when the finger lifts (`pointerup`), when the browser takes the touch as a scroll or zoom (`pointercancel`), and
 *     element by element as the finger slides: each move is hit-tested and every pressed element no longer under the
 *     finger loses it; nothing new is pressed during a slide. Pointer capture is left alone, so a slider relying on it
 *     keeps working.
 * The default ("Show while pressed", no attribute) sets both. "Off on touch screens" (`desktop`) sets only
 * `.sgs-touch-input`, so no hover look shows on touch. "Show on tap" (`tap`) sets neither: the browser's sticky hover.
 * The attribute is read per event, so a Customiser preview switches at once.
 *
 * SECOND JOB: TAP PRESS STATES ON iOS. WebKit applies `:active` on a tap only when the document has a touch-related
 * listener, and `pointerdown` is one (WebKit `EventNames.json`, category TouchRelated). The window listener below is
 * that listener for every page, whatever the setting, so an `:active` press look shows on a tap there too.
 *
 * Deliberately NOT a module and deliberately dependency-free: it must run on any page carrying a hover rule, and
 * importing motion-utils.js would pull the motion layer onto pages that use none of it.
 */
( function () {
	var PRESSED = 'sgs-pressed';
	var TOUCHED = 'sgs-touch-input';
	var root = document.documentElement;
	var pressed = [];
	var pointerId = null;
	var queued = false;
	var lastX = 0;
	var lastY = 0;

	if ( ! window.addEventListener || ! root || ! root.classList ) {
		return;
	}

	/** The site's choice: 'press' (default), 'tap' or 'desktop'. */
	function mode() {
		var value = root.getAttribute( 'data-sgs-touch-hover' );
		return 'tap' === value || 'desktop' === value ? value : 'press';
	}

	/** The element chain from a node up to <html>, crossing shadow roots to their hosts. */
	function chainOf( node ) {
		var chain = [];
		while ( node ) {
			if ( 1 === node.nodeType ) {
				chain.push( node );
			}
			node = node.parentNode || node.host || null;
		}
		return chain;
	}

	function clear() {
		for ( var i = 0; i < pressed.length; i++ ) {
			pressed[ i ].classList.remove( PRESSED );
		}
		pressed = [];
		pointerId = null;
	}

	/** Unpress every element no longer under the finger. */
	function settle() {
		queued = false;
		var under = document.elementFromPoint( lastX, lastY );
		var keep = under ? chainOf( under ) : [];
		var still = [];
		for ( var i = 0; i < pressed.length; i++ ) {
			if ( keep.indexOf( pressed[ i ] ) === -1 ) {
				pressed[ i ].classList.remove( PRESSED );
			} else {
				still.push( pressed[ i ] );
			}
		}
		pressed = still;
	}

	window.addEventListener(
		'pointerdown',
		function ( event ) {
			var touch = 'touch' === event.pointerType || 'pen' === event.pointerType;
			var chosen = mode();
			root.classList.toggle( TOUCHED, touch && 'tap' !== chosen );
			if ( ! touch ) {
				return;
			}
			clear();
			if ( ! event.isPrimary || 'press' !== chosen ) {
				return; // A second finger (a pinch) ends the press.
			}
			pointerId = event.pointerId;
			var path = event.composedPath ? event.composedPath() : chainOf( event.target );
			for ( var i = 0; i < path.length; i++ ) {
				if ( path[ i ] && 1 === path[ i ].nodeType ) {
					path[ i ].classList.add( PRESSED );
					pressed.push( path[ i ] );
				}
			}
		},
		{ capture: true, passive: true }
	);

	window.addEventListener(
		'pointermove',
		function ( event ) {
			// A mouse moving over the page gives its hover looks back at once, without waiting for a click.
			if ( 'mouse' === event.pointerType && root.classList.contains( TOUCHED ) ) {
				root.classList.remove( TOUCHED );
			}
			if ( event.pointerId !== pointerId || ! pressed.length ) {
				return;
			}
			lastX = event.clientX;
			lastY = event.clientY;
			if ( ! queued ) {
				queued = true;
				window.requestAnimationFrame( settle );
			}
		},
		{ capture: true, passive: true }
	);

	function end( event ) {
		if ( null !== pointerId && event.pointerId === pointerId ) {
			clear();
		}
	}
	window.addEventListener( 'pointerup', end, { capture: true, passive: true } );
	window.addEventListener( 'pointercancel', end, { capture: true, passive: true } );
	// The page losing the finger altogether (an app switch, a dialog) ends the press too.
	window.addEventListener( 'blur', clear );
	document.addEventListener( 'visibilitychange', clear );
} )();
