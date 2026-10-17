/**
 * Page script flag.
 *
 * Adds `.sgs-js` to <html> once script runs. The image-sequence and horizontal-panel stylesheets read it to keep
 * their no-JavaScript fallback visible until script confirms it can take over, so a page without script shows
 * everything unstyled-but-complete.
 *
 * Dependency-free and not a module: it must run on any page, before any block script needs the flag.
 */
( function () {
	'use strict';

	if ( document.documentElement ) {
		document.documentElement.classList.add( 'sgs-js' );
	}
} )();
