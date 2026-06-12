/**
 * SGS Product Search — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * Accessible combobox with debounced REST fetch, keyboard navigation, and
 * AbortController-based request cancellation.
 *
 * No jQuery. No dependencies.
 */

/**
 * Wire one product-search instance.
 *
 * @param {HTMLElement} root The [data-sgs-product-search] wrapper.
 */
function initInstance( root ) {
	// Double-bind guard.
	if ( root.dataset.sgsProductSearchReady === '1' ) {
		return;
	}
	root.dataset.sgsProductSearchReady = '1';

	// Read config from data-attributes set by render.php.
	const rest          = root.dataset.rest          || '';
	const noResults     = root.dataset.noResults      || 'No products found';
	const busy          = root.dataset.busy           || 'Search is busy — please try again in a moment';
	const countTemplate = root.dataset.countTemplate  || '%d products found';
	const maxResults    = parseInt( root.dataset.maxResults, 10 ) || 10;

	// DOM refs.
	const input  = root.querySelector( '.sgs-product-search__input' );
	const ul     = root.querySelector( '.sgs-product-search__results' );
	const status = root.querySelector( '.sgs-product-search__status' );

	if ( ! input || ! ul || ! status ) {
		return;
	}

	const listId = ul.id; // e.g. "sgs-product-search-1-listbox"

	// State.
	let debounceTimer  = null;
	let activeController = null; // AbortController for the in-flight fetch.
	let activeIndex    = -1;     // Index into visible <li> options.

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	function getOptions() {
		return Array.from( ul.querySelectorAll( 'li[role="option"]' ) );
	}

	function clearActive() {
		getOptions().forEach( ( li ) => li.classList.remove( 'is-active' ) );
		input.removeAttribute( 'aria-activedescendant' );
		activeIndex = -1;
	}

	function setActive( index ) {
		const options = getOptions();
		if ( ! options.length ) {
			return;
		}
		// Clamp.
		index = Math.max( 0, Math.min( options.length - 1, index ) );
		clearActive();
		activeIndex = index;
		options[ index ].classList.add( 'is-active' );
		input.setAttribute( 'aria-activedescendant', options[ index ].id );
		// Scroll into view within the ul.
		options[ index ].scrollIntoView( { block: 'nearest' } );
	}

	function closeDropdown() {
		ul.hidden = true;
		input.setAttribute( 'aria-expanded', 'false' );
		clearActive();
	}

	function announce( message ) {
		status.textContent = message;
	}

	// -------------------------------------------------------------------------
	// Fetch
	// -------------------------------------------------------------------------

	async function fetchResults( q ) {
		// Cancel any previous in-flight request.
		if ( activeController ) {
			activeController.abort();
		}
		activeController = new AbortController();
		const { signal } = activeController;

		try {
			const response = await fetch(
				rest + '?q=' + encodeURIComponent( q ),
				{ headers: { Accept: 'application/json' }, signal }
			);

			if ( response.status === 429 || response.status === 503 ) {
				closeDropdown();
				announce( busy );
				return;
			}

			if ( ! response.ok ) {
				closeDropdown();
				announce( busy );
				return;
			}

			const data    = await response.json();
			const results = Array.isArray( data.results ) ? data.results : [];
			const capped  = results.slice( 0, maxResults );

			if ( ! capped.length ) {
				closeDropdown();
				announce( noResults );
				return;
			}

			// Populate the listbox. Options must have NO focusable descendants
			// (ARIA combobox rule — an inner <a> trips axe nested-interactive).
			// The URL lives on li.dataset.href; navigation happens via JS.
			ul.innerHTML = '';
			capped.forEach( ( result, i ) => {
				const optId = listId + '-opt-' + i;
				const li    = document.createElement( 'li' );
				li.setAttribute( 'role', 'option' );
				li.id = optId;
				li.dataset.href = result.permalink || '';

				if ( result.thumbnail ) {
					const img    = document.createElement( 'img' );
					img.src      = result.thumbnail;
					img.alt      = '';
					img.loading  = 'lazy';
					img.width    = 40;
					img.height   = 40;
					li.appendChild( img );
				}

				const span        = document.createElement( 'span' );
				span.textContent  = result.title || '';
				li.appendChild( span );

				ul.appendChild( li );
			} );

			ul.hidden = false;
			input.setAttribute( 'aria-expanded', 'true' );
			announce( countTemplate.replace( '%d', capped.length ) );

		} catch ( err ) {
			// Ignore AbortError — this is intentional cancellation.
			if ( err.name !== 'AbortError' ) {
				closeDropdown();
				announce( busy );
			}
		}
	}

	// -------------------------------------------------------------------------
	// Input handler (debounce 300 ms)
	// -------------------------------------------------------------------------

	input.addEventListener( 'input', () => {
		clearTimeout( debounceTimer );
		const q = input.value.trim();

		if ( q.length < 2 ) {
			closeDropdown();
			announce( '' );
			return;
		}

		debounceTimer = setTimeout( () => {
			fetchResults( q );
		}, 300 );
	} );

	// -------------------------------------------------------------------------
	// Keyboard navigation
	// -------------------------------------------------------------------------

	input.addEventListener( 'keydown', ( event ) => {
		const options = getOptions();

		switch ( event.key ) {
			case 'ArrowDown':
				event.preventDefault();
				if ( ! ul.hidden && options.length ) {
					setActive( activeIndex + 1 );
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if ( ! ul.hidden && options.length ) {
					setActive( activeIndex - 1 );
				}
				break;

			case 'Enter':
				if ( activeIndex >= 0 && options[ activeIndex ] ) {
					event.preventDefault();
					const href = options[ activeIndex ].dataset.href;
					if ( href ) {
						location.href = href;
					}
				}
				// If no option active: fall through → form submits normally (no-JS fallback).
				break;

			case 'Escape':
				event.preventDefault();
				closeDropdown();
				input.focus();
				break;
		}
	} );

	// -------------------------------------------------------------------------
	// Option click — delegated on the ul. Navigate to the clicked option's URL.
	// (Options carry no inner <a>; the URL is on li.dataset.href.)
	// -------------------------------------------------------------------------

	ul.addEventListener( 'click', ( event ) => {
		const li = event.target.closest( 'li[role="option"]' );
		if ( li && ul.contains( li ) ) {
			const href = li.dataset.href;
			if ( href ) {
				location.href = href;
			}
		}
	} );

	// -------------------------------------------------------------------------
	// Close on outside click
	// -------------------------------------------------------------------------

	document.addEventListener( 'click', ( event ) => {
		if ( ! root.contains( event.target ) ) {
			closeDropdown();
		}
	} );

	// -------------------------------------------------------------------------
	// Close on blur (delay so option clicks register first)
	// -------------------------------------------------------------------------

	input.addEventListener( 'blur', () => {
		setTimeout( () => {
			if ( ! root.contains( document.activeElement ) ) {
				closeDropdown();
			}
		}, 150 );
	} );
}

/**
 * Initialise all instances on the page.
 */
function init() {
	const roots = document.querySelectorAll( '[data-sgs-product-search]' );
	roots.forEach( initInstance );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
