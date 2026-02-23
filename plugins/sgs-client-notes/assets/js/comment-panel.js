/**
 * Comment Panel
 * 
 * Handles the slide-in comment panel for viewing and replying to notes.
 * 
 * @package SGS\ClientNotes
 */

(function() {
	'use strict';

	let panel = null;
	let currentNote = null;

	/**
	 * Initialise comment panel.
	 */
	function init() {
		createPanel();

		// Listen for note open events.
		document.addEventListener( 'sgs-cn-open-note', function( e ) {
			openNote( e.detail );
		} );

		// Listen for new note creation events.
		document.addEventListener( 'sgs-cn-new-note-created', function( e ) {
			openNote( e.detail );
		} );
	}

	/**
	 * Create the panel element.
	 */
	function createPanel() {
		panel = document.createElement( 'div' );
		panel.className = 'sgs-cn-panel';
		panel.innerHTML = `
			<div class="sgs-cn-panel-header">
				<h3 class="sgs-cn-panel-title">Note Details</h3>
				<button type="button" class="sgs-cn-panel-close" aria-label="Close">&times;</button>
			</div>
			<div class="sgs-cn-panel-body">
				<div class="sgs-cn-note-content"></div>
				<div class="sgs-cn-replies-section">
					<h4>Replies</h4>
					<div class="sgs-cn-replies-list"></div>
					<div class="sgs-cn-reply-form">
						<textarea class="sgs-cn-reply-input" placeholder="Type your reply..." rows="3"></textarea>
						<button type="button" class="sgs-cn-reply-submit">Send Reply</button>
					</div>
				</div>
			</div>
		`;

		document.body.appendChild( panel );

		// Close button handler.
		panel.querySelector( '.sgs-cn-panel-close' ).addEventListener( 'click', closePanel );

		// Click outside to close.
		panel.addEventListener( 'click', function( e ) {
			if ( e.target === panel ) {
				closePanel();
			}
		} );

		// Reply submit handler.
		panel.querySelector( '.sgs-cn-reply-submit' ).addEventListener( 'click', submitReply );

		// Enter to submit (Ctrl+Enter or Cmd+Enter).
		panel.querySelector( '.sgs-cn-reply-input' ).addEventListener( 'keydown', function( e ) {
			if ( e.key === 'Enter' && ( e.ctrlKey || e.metaKey ) ) {
				e.preventDefault();
				submitReply();
			}
		} );
	}

	/**
	 * Open a note in the panel.
	 * 
	 * @param {Object} note Note data.
	 */
	function openNote( note ) {
		currentNote = note;
		renderNoteContent( note );
		loadReplies( note.id );
		panel.classList.add( 'sgs-cn-panel-open' );
	}

	/**
	 * Close the panel.
	 */
	function closePanel() {
		panel.classList.remove( 'sgs-cn-panel-open' );
		currentNote = null;
	}

	/**
	 * Render note content in the panel.
	 * 
	 * @param {Object} note Note data.
	 */
	function renderNoteContent( note ) {
		const contentDiv = panel.querySelector( '.sgs-cn-note-content' );
		
		let statusBadge = '';
		if ( 'resolved' === note.status ) {
			statusBadge = '<span class="sgs-cn-status-badge sgs-cn-status-resolved">Resolved</span>';
		} else if ( 'in_progress' === note.status ) {
			statusBadge = '<span class="sgs-cn-status-badge sgs-cn-status-in-progress">In Progress</span>';
		}

		let screenshotHtml = '';
		if ( note.screenshot_url ) {
			screenshotHtml = `<div class="sgs-cn-screenshot"><img src="${escapeHtml( note.screenshot_url )}" alt="Screenshot"></div>`;
		}

		let adminActions = '';
		if ( sgsClientNotes.canManage ) {
			adminActions = `
				<div class="sgs-cn-admin-actions">
					<button type="button" class="sgs-cn-btn-secondary" data-action="in_progress">Mark In Progress</button>
					<button type="button" class="sgs-cn-btn-success" data-action="resolved">Mark Resolved</button>
				</div>
			`;
		}

		contentDiv.innerHTML = `
			<div class="sgs-cn-note-meta">
				<span class="sgs-cn-priority-badge sgs-cn-priority-${note.priority}">${note.priority}</span>
				${statusBadge}
				<span class="sgs-cn-author">by ${escapeHtml( note.author_name )}</span>
				<span class="sgs-cn-date">${formatDate( note.created_at )}</span>
			</div>
			${screenshotHtml}
			<div class="sgs-cn-comment">${escapeHtml( note.comment )}</div>
			${adminActions}
		`;

		// Attach admin action handlers.
		if ( sgsClientNotes.canManage ) {
			contentDiv.querySelectorAll( '[data-action]' ).forEach( btn => {
				btn.addEventListener( 'click', function() {
					updateNoteStatus( note.id, this.getAttribute( 'data-action' ) );
				} );
			} );
		}
	}

	/**
	 * Load replies for a note.
	 * 
	 * @param {number} noteId Note ID.
	 */
	function loadReplies( noteId ) {
		const repliesList = panel.querySelector( '.sgs-cn-replies-list' );
		repliesList.innerHTML = '<p class="sgs-cn-loading">Loading replies...</p>';

		fetch( `${sgsClientNotes.apiUrl}/notes/${noteId}/replies`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': sgsClientNotes.nonce,
			},
		} )
		.then( response => response.json() )
		.then( replies => {
			renderReplies( replies );
		} )
		.catch( error => {
			console.error( 'Failed to load replies:', error );
			repliesList.innerHTML = '<p class="sgs-cn-error">Failed to load replies.</p>';
		} );
	}

	/**
	 * Render replies list.
	 * 
	 * @param {Array} replies Array of reply objects.
	 */
	function renderReplies( replies ) {
		const repliesList = panel.querySelector( '.sgs-cn-replies-list' );

		if ( 0 === replies.length ) {
			repliesList.innerHTML = '<p class="sgs-cn-no-replies">No replies yet.</p>';
			return;
		}

		let html = '';
		replies.forEach( reply => {
			html += `
				<div class="sgs-cn-reply">
					<div class="sgs-cn-reply-meta">
						<strong>${escapeHtml( reply.author_name )}</strong>
						<span class="sgs-cn-reply-date">${formatDate( reply.created_at )}</span>
					</div>
					<div class="sgs-cn-reply-comment">${escapeHtml( reply.comment )}</div>
				</div>
			`;
		} );

		repliesList.innerHTML = html;
	}

	/**
	 * Submit a reply.
	 */
	function submitReply() {
		if ( ! currentNote ) {
			return;
		}

		const input = panel.querySelector( '.sgs-cn-reply-input' );
		const comment = input.value.trim();

		if ( ! comment ) {
			return;
		}

		const submitBtn = panel.querySelector( '.sgs-cn-reply-submit' );
		submitBtn.disabled = true;
		submitBtn.textContent = 'Sending...';

		fetch( `${sgsClientNotes.apiUrl}/notes/${currentNote.id}/replies`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': sgsClientNotes.nonce,
			},
			body: JSON.stringify( { comment } ),
		} )
		.then( response => {
			if ( ! response.ok ) {
				throw new Error( 'Failed to submit reply' );
			}
			return response.json();
		} )
		.then( reply => {
			input.value = '';
			loadReplies( currentNote.id );
			submitBtn.disabled = false;
			submitBtn.textContent = 'Send Reply';
		} )
		.catch( error => {
			console.error( 'Failed to submit reply:', error );
			alert( 'Failed to send reply. Please try again.' );
			submitBtn.disabled = false;
			submitBtn.textContent = 'Send Reply';
		} );
	}

	/**
	 * Update note status.
	 * 
	 * @param {number} noteId Note ID.
	 * @param {string} status New status.
	 */
	function updateNoteStatus( noteId, status ) {
		fetch( `${sgsClientNotes.apiUrl}/notes/${noteId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': sgsClientNotes.nonce,
			},
			body: JSON.stringify( { status } ),
		} )
		.then( response => {
			if ( ! response.ok ) {
				throw new Error( 'Failed to update status' );
			}
			return response.json();
		} )
		.then( note => {
			currentNote = note;
			renderNoteContent( note );
			
			// Refresh pins on the page.
			if ( 'function' === typeof window.sgsRefreshNotes ) {
				window.sgsRefreshNotes();
			}
		} )
		.catch( error => {
			console.error( 'Failed to update note status:', error );
			alert( 'Failed to update status. Please try again.' );
		} );
	}

	/**
	 * Format date for display.
	 * 
	 * @param {string} dateString Date string.
	 * @return {string}
	 */
	function formatDate( dateString ) {
		const date = new Date( dateString );
		const now = new Date();
		const diff = Math.floor( ( now - date ) / 1000 );

		if ( diff < 60 ) {
			return 'Just now';
		} else if ( diff < 3600 ) {
			const mins = Math.floor( diff / 60 );
			return `${mins} minute${1 !== mins ? 's' : ''} ago`;
		} else if ( diff < 86400 ) {
			const hours = Math.floor( diff / 3600 );
			return `${hours} hour${1 !== hours ? 's' : ''} ago`;
		} else {
			const options = { year: 'numeric', month: 'short', day: 'numeric' };
			return date.toLocaleDateString( undefined, options );
		}
	}

	/**
	 * Escape HTML.
	 * 
	 * @param {string} text Text to escape.
	 * @return {string}
	 */
	function escapeHtml( text ) {
		const div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	}

	// Initialise on DOM ready.
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

})();
