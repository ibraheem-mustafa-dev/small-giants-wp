/**
 * Annotation Mode
 * 
 * Handles interactive element selection and note creation.
 * 
 * @package SGS\ClientNotes
 */

(function() {
	'use strict';

	let annotationActive = false;
	let overlay = null;
	let createForm = null;
	let selectedElement = null;
	let clickPosition = { x: 0, y: 0 };
	let capturedScreenshotUrl = null;

	/**
	 * Initialise annotation mode.
	 */
	function init() {
		const toggleBtn = document.getElementById( 'sgs-cn-toggle-annotation' );
		if ( ! toggleBtn ) {
			return;
		}

		toggleBtn.addEventListener( 'click', toggleAnnotationMode );

		// ESC key to exit annotation mode.
		document.addEventListener( 'keydown', function( e ) {
			if ( 'Escape' === e.key && annotationActive ) {
				deactivateAnnotationMode();
			}
		} );
	}

	/**
	 * Toggle annotation mode on/off.
	 */
	function toggleAnnotationMode() {
		if ( annotationActive ) {
			deactivateAnnotationMode();
		} else {
			activateAnnotationMode();
		}
	}

	/**
	 * Activate annotation mode.
	 */
	function activateAnnotationMode() {
		annotationActive = true;

		// Create overlay.
		overlay = document.createElement( 'div' );
		overlay.className = 'sgs-cn-annotation-overlay';
		document.body.appendChild( overlay );

		// Add active class to body.
		document.body.classList.add( 'sgs-cn-annotation-active' );

		// Update toolbar button.
		const toggleBtn = document.getElementById( 'sgs-cn-toggle-annotation' );
		toggleBtn.classList.add( 'sgs-cn-active' );
		toggleBtn.querySelector( 'span' ).textContent = 'Click to Annotate (ESC to cancel)';

		// Attach element hover/click handlers.
		attachElementHandlers();
	}

	/**
	 * Deactivate annotation mode.
	 */
	function deactivateAnnotationMode() {
		annotationActive = false;

		// Remove overlay.
		if ( overlay ) {
			overlay.remove();
			overlay = null;
		}

		// Remove active class.
		document.body.classList.remove( 'sgs-cn-annotation-active' );

		// Remove highlighted elements.
		document.querySelectorAll( '.sgs-cn-highlight' ).forEach( el => {
			el.classList.remove( 'sgs-cn-highlight' );
		} );

		// Update toolbar button.
		const toggleBtn = document.getElementById( 'sgs-cn-toggle-annotation' );
		toggleBtn.classList.remove( 'sgs-cn-active' );
		toggleBtn.querySelector( 'span' ).textContent = 'Leave Feedback';

		// Close creation form if open.
		if ( createForm ) {
			createForm.remove();
			createForm = null;
		}

		// Detach element handlers.
		detachElementHandlers();
	}

	/**
	 * Attach element hover and click handlers.
	 */
	function attachElementHandlers() {
		document.addEventListener( 'mouseover', handleElementHover, true );
		document.addEventListener( 'mouseout', handleElementOut, true );
		document.addEventListener( 'click', handleElementClick, true );
	}

	/**
	 * Detach element handlers.
	 */
	function detachElementHandlers() {
		document.removeEventListener( 'mouseover', handleElementHover, true );
		document.removeEventListener( 'mouseout', handleElementOut, true );
		document.removeEventListener( 'click', handleElementClick, true );
	}

	/**
	 * Handle element hover.
	 * 
	 * @param {Event} e Mouse event.
	 */
	function handleElementHover( e ) {
		if ( ! annotationActive ) {
			return;
		}

		const target = e.target;

		// Ignore our own elements.
		if ( isOwnElement( target ) ) {
			return;
		}

		target.classList.add( 'sgs-cn-highlight' );
	}

	/**
	 * Handle element mouseout.
	 * 
	 * @param {Event} e Mouse event.
	 */
	function handleElementOut( e ) {
		if ( ! annotationActive ) {
			return;
		}

		const target = e.target;
		target.classList.remove( 'sgs-cn-highlight' );
	}

	/**
	 * Handle element click.
	 * 
	 * @param {Event} e Mouse event.
	 */
	function handleElementClick( e ) {
		if ( ! annotationActive ) {
			return;
		}

		const target = e.target;

		// Ignore our own elements.
		if ( isOwnElement( target ) ) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		selectedElement = target;
		target.classList.remove( 'sgs-cn-highlight' );

		// Calculate click position relative to element.
		const rect = target.getBoundingClientRect();
		clickPosition.x = ( ( e.clientX - rect.left ) / rect.width ) * 100;
		clickPosition.y = ( ( e.clientY - rect.top ) / rect.height ) * 100;

		// Show creation form.
		showCreateForm( e.clientX, e.clientY );
	}

	/**
	 * Check if element is one of our plugin's elements.
	 * 
	 * @param {Element} element Element to check.
	 * @return {boolean}
	 */
	function isOwnElement( element ) {
		return element.closest( '.sgs-cn-annotation-overlay, .sgs-cn-toolbar, .sgs-cn-create-form, .sgs-cn-panel, .sgs-cn-pin' );
	}

	/**
	 * Show the note creation form.
	 * 
	 * @param {number} x Click X position.
	 * @param {number} y Click Y position.
	 */
	function showCreateForm( x, y ) {
		// Deactivate annotation mode.
		deactivateAnnotationMode();

		// Create form.
		createForm = document.createElement( 'div' );
		createForm.className = 'sgs-cn-create-form sgs-cn-create-form-open';
		createForm.innerHTML = `
			<div class="sgs-cn-create-header">
				<h3>New Feedback Note</h3>
				<button type="button" class="sgs-cn-create-close" aria-label="Close">&times;</button>
			</div>
			<div class="sgs-cn-create-body">
				<div class="sgs-cn-form-group">
					<label for="sgs-cn-comment">Your Comment</label>
					<textarea id="sgs-cn-comment" placeholder="Describe the issue or suggestion..." rows="5" required></textarea>
				</div>
				<div class="sgs-cn-form-group">
					<label for="sgs-cn-priority">Priority</label>
					<select id="sgs-cn-priority">
						<option value="suggestion">Suggestion</option>
						<option value="issue">Issue</option>
						<option value="urgent">Urgent</option>
					</select>
				</div>
				<div class="sgs-cn-form-group">
					<button type="button" class="sgs-cn-btn-secondary sgs-cn-screenshot-btn" id="sgs-cn-capture-screenshot">
						&#128247; Capture Screenshot
					</button>
					<div id="sgs-cn-screenshot-preview" class="sgs-cn-screenshot-preview" hidden></div>
				</div>
				<div class="sgs-cn-form-actions">
					<button type="button" class="sgs-cn-btn-secondary sgs-cn-cancel">Cancel</button>
					<button type="button" class="sgs-cn-btn-primary sgs-cn-submit">Submit Note</button>
				</div>
			</div>
		`;

		document.body.appendChild( createForm );

		// Focus on comment field.
		setTimeout( () => {
			createForm.querySelector( '#sgs-cn-comment' ).focus();
		}, 100 );

		// Reset captured screenshot state.
		capturedScreenshotUrl = null;

		// Attach form handlers.
		createForm.querySelector( '.sgs-cn-create-close' ).addEventListener( 'click', closeCreateForm );
		createForm.querySelector( '.sgs-cn-cancel' ).addEventListener( 'click', closeCreateForm );
		createForm.querySelector( '.sgs-cn-submit' ).addEventListener( 'click', submitNote );
		createForm.querySelector( '#sgs-cn-capture-screenshot' ).addEventListener( 'click', handleCaptureScreenshot );
	}

	/**
	 * Handle screenshot capture button click.
	 */
	function handleCaptureScreenshot() {
		var btn     = createForm.querySelector( '#sgs-cn-capture-screenshot' );
		var preview = createForm.querySelector( '#sgs-cn-screenshot-preview' );

		if ( ! window.sgsClientNotesScreenshot ) {
			btn.textContent = 'Screenshot unavailable';
			btn.disabled    = true;
			return;
		}

		btn.textContent = 'Capturing...';
		btn.disabled    = true;

		window.sgsClientNotesScreenshot.capture( selectedElement, function ( url ) {
			if ( url ) {
				capturedScreenshotUrl = url;
				btn.textContent = '\u2713 Screenshot captured';

				// Build preview using safe DOM methods.
				var img = document.createElement( 'img' );
				img.src          = url;
				img.alt          = 'Screenshot preview';
				img.style.cssText = 'max-width:100%;border-radius:4px;';
				while ( preview.firstChild ) {
					preview.removeChild( preview.firstChild );
				}
				preview.appendChild( img );
				preview.hidden = false;
			} else {
				btn.textContent = 'Could not capture \u2014 describe the issue in your comment';
				btn.disabled    = false;
			}
		} );
	}

	/**
	 * Close the creation form.
	 */
	function closeCreateForm() {
		if ( createForm ) {
			createForm.remove();
			createForm = null;
		}
		selectedElement = null;
	}

	/**
	 * Submit the note.
	 */
	function submitNote() {
		const comment = createForm.querySelector( '#sgs-cn-comment' ).value.trim();
		const priority = createForm.querySelector( '#sgs-cn-priority' ).value;

		if ( ! comment ) {
			alert( 'Please enter a comment.' );
			return;
		}

		const submitBtn = createForm.querySelector( '.sgs-cn-submit' );
		submitBtn.disabled = true;
		submitBtn.textContent = 'Submitting...';

		// Generate CSS selector for the element.
		const selector = generateSelector( selectedElement );
		const xpath = generateXPath( selectedElement );
		const elementText = selectedElement.textContent.trim().substring( 0, 255 );

		const noteData = {
			post_id: sgsClientNotes.postId,
			selector: selector,
			xpath: xpath,
			offset_x: clickPosition.x,
			offset_y: clickPosition.y,
			viewport_width: sgsClientNotes.viewportWidth,
			comment: comment,
			priority: priority,
			page_url: sgsClientNotes.currentUrl,
			element_text: elementText,
			screenshot_url: capturedScreenshotUrl || '',
		};

		fetch( sgsClientNotes.apiUrl + '/notes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': sgsClientNotes.nonce,
			},
			body: JSON.stringify( noteData ),
		} )
		.then( response => {
			if ( ! response.ok ) {
				throw new Error( 'Failed to create note' );
			}
			return response.json();
		} )
		.then( note => {
			closeCreateForm();
			
			// Add note to page and open panel.
			if ( 'function' === typeof window.sgsAddNote ) {
				window.sgsAddNote( note );
			}

			// Open the note in the panel.
			const event = new CustomEvent( 'sgs-cn-new-note-created', { detail: note } );
			document.dispatchEvent( event );

			// Show success message.
			showNotification( 'Note created successfully!', 'success' );
		} )
		.catch( error => {
			console.error( 'Failed to create note:', error );
			alert( 'Failed to create note. Please try again.' );
			submitBtn.disabled = false;
			submitBtn.textContent = 'Submit Note';
		} );
	}

	/**
	 * Generate CSS selector for an element.
	 * 
	 * @param {Element} element Element.
	 * @return {string}
	 */
	function generateSelector( element ) {
		// Try ID first.
		if ( element.id ) {
			return '#' + element.id;
		}

		// Try data attributes.
		const dataAttrs = Array.from( element.attributes ).filter( attr => attr.name.startsWith( 'data-' ) );
		if ( dataAttrs.length > 0 ) {
			return element.tagName.toLowerCase() + '[' + dataAttrs[0].name + '="' + dataAttrs[0].value + '"]';
		}

		// Build nth-child path.
		const path = [];
		let current = element;

		while ( current && current !== document.body ) {
			let selector = current.tagName.toLowerCase();
			
			if ( current.className && 'string' === typeof current.className ) {
				const classes = current.className.split( ' ' ).filter( c => c && ! c.startsWith( 'sgs-cn-' ) );
				if ( classes.length > 0 ) {
					selector += '.' + classes.slice( 0, 2 ).join( '.' );
				}
			}

			// Add nth-child if needed.
			const parent = current.parentElement;
			if ( parent ) {
				const siblings = Array.from( parent.children ).filter( el => el.tagName === current.tagName );
				if ( siblings.length > 1 ) {
					const index = siblings.indexOf( current ) + 1;
					selector += ':nth-child(' + index + ')';
				}
			}

			path.unshift( selector );
			current = parent;
		}

		return path.join( ' > ' );
	}

	/**
	 * Generate XPath for an element.
	 * 
	 * @param {Element} element Element.
	 * @return {string}
	 */
	function generateXPath( element ) {
		if ( element.id ) {
			return '//*[@id="' + element.id + '"]';
		}

		const path = [];
		let current = element;

		while ( current && current !== document.body ) {
			let index = 0;
			let sibling = current.previousSibling;

			while ( sibling ) {
				if ( sibling.nodeType === 1 && sibling.tagName === current.tagName ) {
					index++;
				}
				sibling = sibling.previousSibling;
			}

			const tagName = current.tagName.toLowerCase();
			const xpathIndex = index > 0 ? '[' + ( index + 1 ) + ']' : '';
			path.unshift( tagName + xpathIndex );
			current = current.parentElement;
		}

		return '/' + path.join( '/' );
	}

	/**
	 * Show a notification message.
	 * 
	 * @param {string} message Message text.
	 * @param {string} type    Notification type (success, error).
	 */
	function showNotification( message, type ) {
		const notification = document.createElement( 'div' );
		notification.className = 'sgs-cn-notification sgs-cn-notification-' + type;
		notification.textContent = message;
		document.body.appendChild( notification );

		setTimeout( () => {
			notification.classList.add( 'sgs-cn-notification-show' );
		}, 10 );

		setTimeout( () => {
			notification.classList.remove( 'sgs-cn-notification-show' );
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );
	}

	// Initialise on DOM ready.
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

})();
