/**
 * Touch-input tracking for the "Hover effects on touch screens" setting.
 *
 * The site setting (Customiser, SGS Interaction) is printed as `data-sgs-touch-hover` on <html>. With "Desktop only"
 * (`desktop`) this file sets `.sgs-touch-input` on <html> whenever the most recent pointer interaction was a touch,
 * and removes it again the moment a mouse or pen is used (pressed or moved). `includes/helpers-hover-state.php` scopes every emitted
 * `:hover` rule inside `:where(:root:not(.sgs-touch-input))`, so a hover style simply stops applying while the page is
 * being touched. With the default "Show on tap" the class is never set: a tap shows the hover look and the browser
 * clears it when the visitor taps elsewhere.
 *
 * The class is reactive on every pointerdown, never cached, because a hybrid device (touchscreen laptop, Surface,
 * iPad with a trackpad) can switch pointer type between one interaction and the next.
 *
 * SECOND JOB: TAP PRESS STATES ON iOS. WebKit applies `:active` on a tap only
 * when the document has a touch-related listener, and `pointerdown` is one
 * (WebKit `EventNames.json`, category TouchRelated). This window listener is
 * that listener for every page, so a pressed look (sgs/button's
 * `active-transform` / `active-shadow`, includes/helpers-button-press.php)
 * shows on a tap without a listener of its own. It is registered whatever the setting says.
 *
 * Deliberately NOT a module and deliberately dependency-free: it must run on
 * any page carrying a hover rule, and importing motion-utils.js would pull the
 * motion layer onto pages that use none of it.
 */
( function () {
	var root = document.documentElement;

	if ( ! root || ! root.classList || ! window.addEventListener ) {
		return;
	}

	window.addEventListener(
		'pointerdown',
		function ( event ) {
			// Read per event so the choice stays correct if the attribute changes (Customiser preview).
			if ( 'desktop' !== root.getAttribute( 'data-sgs-touch-hover' ) ) {
				return;
			}
			root.classList.toggle( 'sgs-touch-input', 'touch' === event.pointerType );
		},
		{ capture: true, passive: true }
	);

	// A mouse or pen moving over the page clears the touch state at once, without waiting for a click: a hybrid
	// device switching back, or a browser's device emulation turned off, gets its hover looks back on the next move.
	window.addEventListener(
		'pointermove',
		function ( event ) {
			if ( 'touch' !== event.pointerType && root.classList.contains( 'sgs-touch-input' ) ) {
				root.classList.remove( 'sgs-touch-input' );
			}
		},
		{ capture: true, passive: true }
	);
} )();
