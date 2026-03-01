/**
 * SGS Accessibility — Admin checker UI (vanilla JS, no jQuery).
 *
 * Wires the "Run Check" button to the sgs_a11y_check AJAX action,
 * then renders the results table into #sgs-a11y-results.
 */
/* global sgsA11y */

( function () {
	'use strict';

	const runBtn   = document.getElementById( 'sgs-a11y-run' );
	const select   = document.getElementById( 'sgs-a11y-post-select' );
	const spinner  = document.getElementById( 'sgs-a11y-spinner' );
	const results  = document.getElementById( 'sgs-a11y-results' );

	if ( ! runBtn || ! select || ! spinner || ! results ) {
		return;
	}

	/**
	 * Escape HTML special characters.
	 *
	 * @param {string} str Raw string.
	 * @returns {string} HTML-escaped string.
	 */
	function esc( str ) {
		return String( str )
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' );
	}

	/**
	 * Build the results HTML from the server response.
	 *
	 * @param {object} data  Success data from the AJAX response.
	 * @returns {string}     HTML string.
	 */
	function buildResultsHTML( data ) {
		const issues   = data.issues || [];
		const errors   = issues.filter( i => i.severity === 'Error' ).length;
		const warnings = issues.filter( i => i.severity === 'Warning' ).length;
		const total    = issues.length;

		let html = '<div class="sgs-a11y-summary">';
		html += `<span class="sgs-errors">&#10008; ${errors} error${errors !== 1 ? 's' : ''}</span>`;
		html += `<span class="sgs-warnings">&#9888; ${warnings} warning${warnings !== 1 ? 's' : ''}</span>`;
		html += `<span class="sgs-url">Checked: <a href="${esc( data.url )}" target="_blank" rel="noopener">${esc( data.url )}</a></span>`;
		html += '</div>';

		if ( total === 0 ) {
			html += '<div class="sgs-a11y-pass">&#10003; No issues found — great work!</div>';
			return html;
		}

		html += `
			<table class="sgs-a11y-table" aria-label="Accessibility issues">
				<thead>
					<tr>
						<th scope="col">Severity</th>
						<th scope="col">WCAG Criterion</th>
						<th scope="col">Issue</th>
						<th scope="col">Element</th>
					</tr>
				</thead>
				<tbody>
		`;

		issues.forEach( function ( issue ) {
			const badgeClass = issue.severity === 'Error' ? 'sgs-badge-error' : 'sgs-badge-warning';
			html += `
				<tr>
					<td><span class="sgs-badge ${badgeClass}">${esc( issue.severity )}</span></td>
					<td>${esc( issue.criterion )}</td>
					<td>${esc( issue.issue )}</td>
					<td><code class="sgs-snippet">${esc( issue.snippet )}</code></td>
				</tr>
			`;
		} );

		html += '</tbody></table>';
		return html;
	}

	/**
	 * Handle the Run Check button click.
	 *
	 * @param {Event} e Click event.
	 * @returns {void}
	 */
	function handleRun( e ) {
		e.preventDefault();

		const postId = select.value;
		if ( ! postId ) {
			results.innerHTML = '<div class="sgs-a11y-error-msg">Please select a post or page first.</div>';
			return;
		}

		// Show spinner, disable button.
		spinner.style.display = 'block';
		runBtn.disabled = true;
		results.innerHTML = '';

		const body = new URLSearchParams( {
			action:  'sgs_a11y_check',
			nonce:   sgsA11y.nonce,
			post_id: postId,
		} );

		fetch( sgsA11y.ajaxUrl, {
			method:  'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body:    body.toString(),
		} )
			.then( function ( res ) {
				if ( ! res.ok ) {
					throw new Error( `HTTP ${ res.status }` );
				}
				return res.json();
			} )
			.then( function ( json ) {
				if ( json.success ) {
					results.innerHTML = buildResultsHTML( json.data );
				} else {
					const msg = ( json.data && json.data.message ) ? json.data.message : 'Unknown error.';
					results.innerHTML = `<div class="sgs-a11y-error-msg">Error: ${ esc( msg ) }</div>`;
				}
			} )
			.catch( function ( err ) {
				results.innerHTML = `<div class="sgs-a11y-error-msg">Request failed: ${ esc( err.message ) }</div>`;
			} )
			.finally( function () {
				spinner.style.display = 'none';
				runBtn.disabled = false;
			} );
	}

	runBtn.addEventListener( 'click', handleRun );
}() );
