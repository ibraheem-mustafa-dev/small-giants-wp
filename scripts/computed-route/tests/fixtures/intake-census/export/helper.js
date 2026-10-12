// A helmet script for the census fixture: runs once while the browser parses the raw template.
( function () {
	document.documentElement.setAttribute( 'data-census-helper', 'ready' );
} )();
