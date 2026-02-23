/**
 * Screenshot Capture
 *
 * Loads html2canvas on demand and captures a viewport screenshot.
 * Called from annotation-mode.js when the user clicks "Capture Screenshot".
 *
 * @package SGS\ClientNotes
 */

( function () {
	'use strict';

	const SGS_CN = window.sgsClientNotes;

	let html2canvasLoaded = false;

	/**
	 * Load html2canvas on demand (first call only).
	 *
	 * @return {Promise<void>}
	 */
	function loadHtml2Canvas() {
		if ( html2canvasLoaded || window.html2canvas ) {
			html2canvasLoaded = true;
			return Promise.resolve();
		}

		return new Promise( function ( resolve, reject ) {
			const script = document.createElement( 'script' );
			script.src = SGS_CN.vendorUrl + '/html2canvas.min.js';
			script.onload = function () {
				html2canvasLoaded = true;
				resolve();
			};
			script.onerror = function () {
				reject( new Error( 'Failed to load html2canvas.' ) );
			};
			document.head.appendChild( script );
		} );
	}

	/**
	 * Capture a screenshot of the region around the given element.
	 *
	 * @param {Element} element  The DOM element to capture around.
	 * @param {Function} onDone  Callback( screenshotUrl: string|null ).
	 */
	function captureScreenshot( element, onDone ) {
		loadHtml2Canvas()
			.then( function () {
				// Crop to the viewport centred on the element.
				const rect     = element.getBoundingClientRect();
				const margin   = 40;
				const x        = Math.max( 0, rect.left + window.scrollX - margin );
				const y        = Math.max( 0, rect.top + window.scrollY - margin );
				const width    = Math.min(
					window.innerWidth,
					rect.width + margin * 2
				);
				const height   = Math.min(
					window.innerHeight,
					rect.height + margin * 2
				);

				return window.html2canvas( document.body, {
					x,
					y,
					width,
					height,
					scale: Math.min( window.devicePixelRatio, 2 ),
					useCORS: true,
					allowTaint: false,
					backgroundColor: '#ffffff',
					// Max canvas width to keep file size under 5MB.
					windowWidth: Math.min( document.documentElement.scrollWidth, 1920 ),
				} );
			} )
			.then( function ( canvas ) {
				// Convert to JPEG (quality 0.7).
				const dataUri = canvas.toDataURL( 'image/jpeg', 0.7 );

				// Upload to WordPress.
				return fetch( SGS_CN.apiUrl + '/screenshot/upload', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': SGS_CN.nonce,
					},
					body: JSON.stringify( { image: dataUri } ),
				} );
			} )
			.then( function ( response ) {
				if ( ! response.ok ) {
					throw new Error( 'Upload failed' );
				}
				return response.json();
			} )
			.then( function ( data ) {
				onDone( data.url || null );
			} )
			.catch( function ( err ) {
				// eslint-disable-next-line no-console
				console.warn( 'SGS Client Notes: screenshot capture failed —', err.message );
				onDone( null );
			} );
	}

	// Expose to annotation-mode.js via window.
	window.sgsClientNotesScreenshot = { capture: captureScreenshot };
} )();
