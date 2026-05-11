/**
 * Trustpilot Sync — Admin Sync-now button.
 *
 * POSTs to the SGS REST endpoint via wp.apiFetch (which automatically attaches
 * the X-WP-Nonce header for logged-in users), then updates the status line.
 */
( function () {
	'use strict';

	if ( typeof window.sgsTrustpilotSync === 'undefined' || ! window.wp || ! window.wp.apiFetch ) {
		return;
	}

	const config = window.sgsTrustpilotSync;
	const button = document.getElementById( 'sgs-trustpilot-sync-now' );
	const status = document.getElementById( 'sgs-trustpilot-sync-status' );

	if ( ! button || ! status ) {
		return;
	}

	const setStatus = function ( text, colour ) {
		status.textContent = text;
		status.style.color = colour || 'inherit';
	};

	button.addEventListener( 'click', function () {
		button.disabled  = true;
		const originalLabel = button.textContent;
		button.textContent = config.strings.syncing;
		setStatus( config.strings.syncing, '#646970' );

		wp.apiFetch( {
			url:    config.restRoot,
			method: 'POST',
			headers: { 'X-WP-Nonce': config.nonce },
		} )
			.then( function ( response ) {
				if ( response && response.success ) {
					const detail = response.data && response.data.message ? ' ' + response.data.message : '';
					setStatus( config.strings.success + detail, '#1e7e34' );
					// Reload after a short delay so the activity table picks up the new entry.
					window.setTimeout( function () { window.location.reload(); }, 1500 );
				} else {
					const msg = response && response.message ? response.message : config.strings.error;
					setStatus( config.strings.error + ' ' + msg, '#b32d2e' );
				}
			} )
			.catch( function ( err ) {
				const msg = err && err.message ? err.message : config.strings.networkError;
				setStatus( config.strings.error + ' ' + msg, '#b32d2e' );
			} )
			.finally( function () {
				button.disabled    = false;
				button.textContent = originalLabel;
			} );
	} );
} )();
