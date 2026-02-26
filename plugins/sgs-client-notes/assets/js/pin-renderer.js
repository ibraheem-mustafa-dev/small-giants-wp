/**
 * Pin Renderer
 * 
 * Loads and displays annotation pins on the page.
 * 
 * @package SGS\ClientNotes
 */

(function() {
	'use strict';

	// Store loaded notes globally for access by other modules.
	window.sgsClientNotesData = {
		notes: [],
		currentNote: null,
	};

	/**
	 * Initialise pin renderer.
	 */
	function init() {
		if ( 'undefined' === typeof sgsClientNotes ) {
			return;
		}

		// Set viewport width for responsive handling.
		sgsClientNotes.viewportWidth = window.innerWidth;

		// Load notes on page load.
		loadNotes();

		// Re-render pins on window resize.
		let resizeTimer;
		window.addEventListener( 'resize', function() {
			clearTimeout( resizeTimer );
			resizeTimer = setTimeout( function() {
				sgsClientNotes.viewportWidth = window.innerWidth;
				renderPins();
			}, 250 );
		} );
	}

	/**
	 * Load notes for the current page.
	 */
	function loadNotes() {
		const params = new URLSearchParams( {
			page_url: sgsClientNotes.currentUrl,
		} );

		fetch( sgsClientNotes.apiUrl + '/notes?' + params.toString(), {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': sgsClientNotes.nonce,
			},
		} )
		.then( response => response.json() )
		.then( notes => {
			window.sgsClientNotesData.notes = notes;
			renderPins();
		} )
		.catch( error => {
			console.error( 'Failed to load notes:', error );
		} );
	}

	/**
	 * Render all pins on the page.
	 */
	function renderPins() {
		// Remove existing pins.
		document.querySelectorAll( '.sgs-cn-pin' ).forEach( pin => pin.remove() );

		window.sgsClientNotesData.notes.forEach( note => {
			renderPin( note );
		} );
	}

	/**
	 * Render a single pin.
	 * 
	 * @param {Object} note Note data.
	 */
	function renderPin( note ) {
		// Try to find the element using the selector.
		let element = null;

		if ( note.selector ) {
			try {
				element = document.querySelector( note.selector );
			} catch ( e ) {
				console.warn( 'Invalid selector:', note.selector );
			}
		}

		// Fallback to XPath if selector failed.
		if ( ! element && note.xpath ) {
			element = getElementByXPath( note.xpath );
		}

		// If element not found, add to detached notes panel.
		if ( ! element ) {
			addToDetachedNotes( note );
			return;
		}

		// Calculate pin position.
		const rect = element.getBoundingClientRect();
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

		const pinX = scrollLeft + rect.left + ( rect.width * note.offset_x / 100 );
		const pinY = scrollTop + rect.top + ( rect.height * note.offset_y / 100 );

		// Create pin element.
		const pin = document.createElement( 'div' );
		pin.className = 'sgs-cn-pin sgs-cn-pin-' + note.priority;
		
		if ( 'resolved' === note.status ) {
			pin.classList.add( 'sgs-cn-pin-resolved' );
		}

		pin.style.left = pinX + 'px';
		pin.style.top = pinY + 'px';
		pin.setAttribute( 'data-note-id', note.id );

		// Pin number badge.
		const badge = document.createElement( 'span' );
		badge.className = 'sgs-cn-pin-badge';
		badge.textContent = window.sgsClientNotesData.notes.indexOf( note ) + 1;
		pin.appendChild( badge );

		// Resolved checkmark.
		if ( 'resolved' === note.status ) {
			const checkmark = document.createElement( 'span' );
			checkmark.className = 'sgs-cn-pin-checkmark';
			checkmark.innerHTML = '✓';
			pin.appendChild( checkmark );
		}

		// Click handler.
		pin.addEventListener( 'click', function( e ) {
			e.stopPropagation();
			openNotePanel( note );
		} );

		document.body.appendChild( pin );
	}

	/**
	 * Get element by XPath.
	 * 
	 * @param {string} xpath XPath expression.
	 * @return {Element|null}
	 */
	function getElementByXPath( xpath ) {
		try {
			const result = document.evaluate( xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null );
			return result.singleNodeValue;
		} catch ( e ) {
			console.warn( 'Invalid XPath:', xpath );
			return null;
		}
	}

	/**
	 * Add note to detached notes panel.
	 * 
	 * @param {Object} note Note data.
	 */
	function addToDetachedNotes( note ) {
		let panel = document.querySelector( '.sgs-cn-detached-panel' );

		if ( ! panel ) {
			panel = document.createElement( 'div' );
			panel.className = 'sgs-cn-detached-panel';
			panel.innerHTML = '<h4>Detached Notes</h4><p class="sgs-cn-detached-info">These notes could not be anchored to their original elements (the page may have changed).</p><ul class="sgs-cn-detached-list"></ul>';
			document.body.appendChild( panel );
		}

		const list = panel.querySelector( '.sgs-cn-detached-list' );
		const item = document.createElement( 'li' );
		item.innerHTML = `
			<strong>${escapeHtml( note.element_text || 'Unknown element' )}</strong><br>
			<span class="sgs-cn-priority-badge sgs-cn-priority-${note.priority}">${note.priority}</span>
			${escapeHtml( note.comment.substring( 0, 50 ) )}...
		`;
		item.style.cursor = 'pointer';
		item.addEventListener( 'click', () => openNotePanel( note ) );
		list.appendChild( item );
	}

	/**
	 * Open the note comment panel.
	 * 
	 * @param {Object} note Note data.
	 */
	function openNotePanel( note ) {
		window.sgsClientNotesData.currentNote = note;

		// Trigger custom event for comment panel to handle.
		const event = new CustomEvent( 'sgs-cn-open-note', { detail: note } );
		document.dispatchEvent( event );
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

	/**
	 * Add a new note to the collection and render it.
	 * 
	 * @param {Object} note Note data.
	 */
	window.sgsAddNote = function( note ) {
		window.sgsClientNotesData.notes.push( note );
		renderPin( note );
	};

	/**
	 * Refresh all notes from the server.
	 */
	window.sgsRefreshNotes = function() {
		loadNotes();
	};

	// Initialise on DOM ready.
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

})();
