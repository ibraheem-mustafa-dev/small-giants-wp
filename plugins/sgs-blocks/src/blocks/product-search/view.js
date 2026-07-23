/**
 * SGS Product Search — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * Accessible combobox with debounced REST fetch, keyboard navigation, and
 * AbortController-based request cancellation.
 *
 * Supports three display modes set by render.php via data-display
 * (FR-36-20 — ONE shared combobox implementation reused across all three;
 * only the chrome wiring below differs):
 *   (none / "inline")     — always-visible search bar, unchanged behaviour.
 *   "icon"                — <details>/<summary> DISCLOSURE (FR-36-10); JS
 *                           enhances focus management + Escape/outside-click.
 *   "full-screen-overlay" — <dialog> DIALOG (FR-36-10) opened/closed through
 *                           the shared store('sgs/nav') plumbing (FR-36-7) —
 *                           the side-effect import below registers it, so
 *                           this block never hand-rolls a second open/close/
 *                           focus/inert utility (R-31-9).
 *
 * No jQuery. Only dependency is the shared nav store (FR-36-7 reuse).
 */

// Side-effect import — registers store('sgs/nav') so the full-screen-overlay
// trigger's data-wp-on--click="actions.toggleDrawer" / data-wp-bind directives
// resolve even on a page with no other nav block present. The Interactivity
// runtime merges repeat `sgs/nav` registrations as a no-op (see the store's
// own header comment) — bundling a second copy here is the documented and
// safe pattern, not a duplicate utility.
import '../../shared/nav-interactivity/store.js';

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
	const rest = root.dataset.rest || '';
	const noResults = root.dataset.noResults || 'No products found';
	const busy =
		root.dataset.busy || 'Search is busy — please try again in a moment';
	// Both plural forms come from PHP (_n_noop() in render.php) — never do
	// English-only pluralisation rules or string surgery here; this text is
	// read aloud by the aria-live status region (WCAG 4.1.3).
	const countTemplateOne =
		root.dataset.countTemplateOne || '%d product found';
	const countTemplateOther =
		root.dataset.countTemplateOther || '%d products found';
	const maxResultsDesktop =
		Number.parseInt( root.dataset.maxResults, 10 ) || 10;
	const maxResultsMobile =
		Number.parseInt( root.dataset.maxResultsMobile, 10 ) || 6;

	// FR-36-20 MUST: ≤10 desktop / 4–8 mobile — the effective cap is read live
	// at fetch time (not cached at init) so a resize/orientation change is
	// honoured on the next query. 767px matches the SGS device-tier contract
	// (mobile max-width:767px — see CLAUDE.md "Responsive breakpoint discipline").
	const mobileMedia =
		typeof window.matchMedia === 'function'
			? window.matchMedia( '(max-width: 767px)' )
			: null;

	function getEffectiveMaxResults() {
		return mobileMedia && mobileMedia.matches
			? maxResultsMobile
			: maxResultsDesktop;
	}

	// Display-mode detection — set by render.php as data-display.
	// icon: <details>/<summary> DISCLOSURE (FR-36-10).
	// full-screen-overlay: <dialog> DIALOG (FR-36-10), driven by the shared
	// store('sgs/nav') import above.
	const isIcon = root.dataset.display === 'icon';
	const isOverlay = root.dataset.display === 'full-screen-overlay';
	const details = isIcon
		? root.querySelector( '.sgs-product-search__disclosure' )
		: null;
	const dialog = isOverlay
		? root.querySelector( '.sgs-product-search__dialog' )
		: null;

	// DOM refs.
	const input = root.querySelector( '.sgs-product-search__input' );
	const ul = root.querySelector( '.sgs-product-search__results' );
	const status = root.querySelector( '.sgs-product-search__status' );

	if ( ! input || ! ul || ! status ) {
		return;
	}

	const listId = ul.id; // e.g. "sgs-product-search-1-listbox"

	/**
	 * Whether an element is inside this component. Overlay mode's <dialog>
	 * is REPARENTED to <body> on first open by the shared store (D323 escape-
	 * transformed-ancestor fix) — after that, `root.contains()` alone would
	 * wrongly treat every click/focus inside the (now-detached) dialog as
	 * "outside", closing the listbox the instant the input gains focus. This
	 * checks BOTH the original wrapper and the (possibly-moved) dialog.
	 *
	 * @param {Node} node The node to test.
	 * @return {boolean} Whether the node is part of this instance.
	 */
	function isInsideComponent( node ) {
		return (
			root.contains( node ) ||
			( dialog !== null && dialog.contains( node ) )
		);
	}

	// State.
	let debounceTimer = null;
	let activeController = null; // AbortController for the in-flight fetch.
	let activeIndex = -1; // Index into visible <li> options.

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

	/**
	 * Close the icon-mode disclosure panel and return focus to the summary toggle.
	 * No-op in inline mode.
	 */
	function closeDisclosure() {
		if ( isIcon && details ) {
			details.open = false;
			const summary = root.querySelector( 'summary' );
			if ( summary ) {
				summary.focus();
			}
		}
	}

	function announce( message ) {
		status.textContent = message;
	}

	/**
	 * Append a title to a parent node with the MATCHED portion (not the typed
	 * portion — FR-36-20 MUST) wrapped in a <mark>. Built entirely from DOM
	 * text nodes — never innerHTML — so it stays XSS-inert exactly like the
	 * REST response's title field (see class-product-search-rest.php step 8).
	 *
	 * @param {HTMLElement} parent The element to append into.
	 * @param {string}      title  The result's title.
	 * @param {string}      query  The user's current query.
	 */
	function appendHighlightedTitle( parent, title, query ) {
		const idx = query
			? title.toLowerCase().indexOf( query.toLowerCase() )
			: -1;

		if ( idx === -1 ) {
			parent.appendChild( document.createTextNode( title ) );
			return;
		}

		if ( idx > 0 ) {
			parent.appendChild(
				document.createTextNode( title.slice( 0, idx ) )
			);
		}

		const mark = document.createElement( 'mark' );
		mark.textContent = title.slice( idx, idx + query.length );
		parent.appendChild( mark );

		const tail = title.slice( idx + query.length );
		if ( tail ) {
			parent.appendChild( document.createTextNode( tail ) );
		}
	}

	// -------------------------------------------------------------------------
	// Icon mode — move focus into the input when the disclosure opens.
	// The <details> toggle event fires after open state changes.
	// -------------------------------------------------------------------------
	if ( details ) {
		details.addEventListener( 'toggle', () => {
			if ( details.open && input ) {
				input.focus();
			}
		} );
	}

	// -------------------------------------------------------------------------
	// Overlay mode — the <dialog> is opened/closed by the shared store('sgs/nav')
	// (FR-36-7 reuse). render.php renders it with the `open` attribute as the
	// no-JS fallback (a plain in-flow, non-modal form); close it once on load so
	// the enhanced behaviour is showModal()-only from here on, then watch the
	// `open` attribute to react to the store's actions.toggleDrawer.
	// -------------------------------------------------------------------------
	if ( dialog ) {
		if ( dialog.open ) {
			dialog.close();
		}

		const observer = new window.MutationObserver( () => {
			if ( dialog.open ) {
				// Override the store's default focus-first (the × close button,
				// FR-36-6 chrome-first-in-DOM convention) — a search dialog
				// should land focus on the input for immediate typing.
				input.focus();
			} else {
				// Dialog just closed (×, Escape, or backdrop-adjacent close) —
				// reset the combobox so the next open starts clean.
				closeDropdown();
				input.value = '';
				announce( '' );
			}
		} );
		observer.observe( dialog, {
			attributes: true,
			attributeFilter: [ 'open' ],
		} );
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

			const data = await response.json();
			const results = Array.isArray( data.results ) ? data.results : [];
			// FR-36-20 MUST: ≤10 desktop / 4–8 mobile — read live, not cached.
			const capped = results.slice( 0, getEffectiveMaxResults() );

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
				const li = document.createElement( 'li' );
				li.setAttribute( 'role', 'option' );
				li.id = optId;
				li.dataset.href = result.permalink || '';

				// Product preview — thumbnail (FR-36-20 MUST). The REST response
				// always includes `thumbnail`; see class-product-search-rest.php.
				if ( result.thumbnail ) {
					const img = document.createElement( 'img' );
					img.src = result.thumbnail;
					img.alt = '';
					img.loading = 'lazy';
					img.width = 40;
					img.height = 40;
					li.appendChild( img );
				}

				const info = document.createElement( 'div' );
				info.className = 'sgs-product-search__result-info';

				const titleEl = document.createElement( 'span' );
				titleEl.className = 'sgs-product-search__result-title';
				// Highlight the MATCHED portion, not the typed portion (FR-36-20
				// MUST) — built from text nodes only, never innerHTML.
				appendHighlightedTitle( titleEl, result.title || '', q );
				info.appendChild( titleEl );

				// Price preview (FR-36-20 MUST). NOTE: the current REST response
				// (class-product-search-rest.php, out of this build's file scope)
				// deliberately excludes price — "no price / meta / stock /
				// variation data — ever" is its documented invariant. This reads
				// `result.price` defensively so the preview activates the moment
				// that invariant is revisited server-side; it renders nothing
				// today. Always textContent — never innerHTML.
				if ( typeof result.price === 'string' && result.price ) {
					const priceEl = document.createElement( 'span' );
					priceEl.className = 'sgs-product-search__result-price';
					priceEl.textContent = result.price;
					info.appendChild( priceEl );
				}

				li.appendChild( info );

				ul.appendChild( li );
			} );

			ul.hidden = false;
			input.setAttribute( 'aria-expanded', 'true' );
			const countTemplate =
				capped.length === 1 ? countTemplateOne : countTemplateOther;
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
				if ( ! ul.hidden ) {
					// First Escape press: close the suggestions dropdown, keep focus in input.
					closeDropdown();
					input.focus();
				} else if ( isIcon && details && details.open ) {
					// Second Escape press (dropdown already closed): close the icon panel
					// and return focus to the summary toggle.
					closeDisclosure();
				}
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
	// Inline: close the dropdown.
	// Icon: also close the disclosure panel when the click is outside.
	// Overlay: the dialog itself closes via the shared store (ESC/×); this
	// only ever needs to close the internal listbox, using isInsideComponent()
	// so a click on the reparented dialog is never mistaken for "outside".
	// -------------------------------------------------------------------------

	document.addEventListener( 'click', ( event ) => {
		if ( ! isInsideComponent( event.target ) ) {
			closeDropdown();
			// In icon mode, also close the <details> disclosure.
			if ( isIcon && details ) {
				details.open = false;
			}
		}
	} );

	// -------------------------------------------------------------------------
	// Close on blur (delay so option clicks register first). Uses
	// isInsideComponent() so tabbing within the reparented overlay dialog
	// (e.g. input → submit button) is never mistaken for focus leaving.
	// -------------------------------------------------------------------------

	input.addEventListener( 'blur', () => {
		setTimeout( () => {
			if ( ! isInsideComponent( document.activeElement ) ) {
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
