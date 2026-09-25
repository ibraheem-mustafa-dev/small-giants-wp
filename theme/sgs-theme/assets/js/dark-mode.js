/**
 * SGS Theme — Dark Mode
 *
 * Manages theme STATE via the `data-theme` attribute on <html>: "light", "dark" or
 * "auto". "auto" follows the OS `prefers-color-scheme` live — `data-prefers-dark`
 * always records the current OS reading, so CSS can react to it without a bare media
 * query per palette slug (see dark-mode.css / functions.php::dark_mode_mapping_css()).
 * Persists the chosen state in localStorage and fires `sgs-theme-change` on every
 * change so other blocks (a dark logo swap, sgs/audio's own toggle) can react without
 * polling.
 *
 * Colour VALUES live in theme.json's `settings.custom.dark` (derived by
 * scripts/derive-dark-palette.py) — this file only ever manages STATE.
 *
 * The anti-flash head script (functions.php::dark_mode_inline_script) reads the same
 * localStorage key and sets the same two attributes before first paint; this file
 * takes over from there.
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const STORAGE_KEY = 'sgs-theme-preference';
	const root = document.documentElement;
	const media = window.matchMedia( '(prefers-color-scheme: dark)' );

	/**
	 * The stored preference, or null when nothing valid is stored.
	 */
	function getStoredPreference() {
		try {
			const stored = localStorage.getItem( STORAGE_KEY );
			return 'light' === stored || 'dark' === stored || 'auto' === stored ? stored : null;
		} catch {
			return null;
		}
	}

	function persistPreference( pref ) {
		try {
			localStorage.setItem( STORAGE_KEY, pref );
		} catch {
			// localStorage unavailable — degrade gracefully; the choice just won't persist.
		}
	}

	/**
	 * Whether the page is CURRENTLY showing dark, given the explicit `pref` and, for
	 * "auto", the live OS reading.
	 */
	function isShowingDark( pref ) {
		if ( 'dark' === pref ) {
			return true;
		}
		if ( 'light' === pref ) {
			return false;
		}
		return media.matches; // auto
	}

	function currentPreference() {
		const attr = root.getAttribute( 'data-theme' );
		return 'light' === attr || 'dark' === attr || 'auto' === attr ? attr : 'auto';
	}

	/**
	 * Sets `aria-pressed` on every switch-style toggle and `aria-checked` on every
	 * segmented-style choice, so multiple copies on one page (header + drawer) all
	 * agree with the single source of truth on <html>.
	 */
	function updateToggleAttributes( pref ) {
		const showingDark = isShowingDark( pref );

		document.querySelectorAll( '.sgs-dark-mode-toggle' ).forEach( ( toggle ) => {
			toggle.setAttribute( 'aria-pressed', showingDark ? 'true' : 'false' );
		} );

		document.querySelectorAll( '[data-sgs-theme-choice]' ).forEach( ( choice ) => {
			const isChecked = choice.getAttribute( 'data-sgs-theme-choice' ) === pref;
			choice.setAttribute( 'aria-checked', isChecked ? 'true' : 'false' );
		} );
	}

	/**
	 * Applies `pref` ("light" | "dark" | "auto") to the document, refreshes every
	 * toggle's accessible state, and notifies listeners. Does NOT persist — the
	 * initial paint (from storage, or the "auto" default) doesn't need to re-write
	 * the same value it just read.
	 */
	function applyTheme( pref ) {
		root.setAttribute( 'data-theme', pref );
		root.setAttribute( 'data-prefers-dark', media.matches ? 'true' : 'false' );
		updateToggleAttributes( pref );
		document.dispatchEvent(
			new CustomEvent( 'sgs-theme-change', {
				detail: { theme: pref, isDark: isShowingDark( pref ) },
			} )
		);
	}

	function setTheme( pref ) {
		applyTheme( pref );
		persistPreference( pref );
	}

	function init() {
		applyTheme( getStoredPreference() || 'auto' );

		// OS preference changes while "auto" is active — keep data-prefers-dark and
		// every toggle's accessible state live, and notify listeners, without
		// touching storage or the explicit light/dark choice.
		media.addEventListener( 'change', () => {
			if ( 'auto' === currentPreference() ) {
				applyTheme( 'auto' );
			} else {
				// Not showing auto right now, but data-prefers-dark still records the
				// live OS reading for anything reading it directly.
				root.setAttribute( 'data-prefers-dark', media.matches ? 'true' : 'false' );
			}
		} );

		document.addEventListener( 'click', ( e ) => {
			// A plain switch (sgs/theme-toggle toggleStyle:"switch") flips between
			// light and dark FROM THE CURRENTLY SHOWN STATE — clicking it while
			// "auto" is showing dark lands on "light", never back on "auto".
			const toggle = e.target.closest( '.sgs-dark-mode-toggle' );
			if ( toggle ) {
				setTheme( isShowingDark( currentPreference() ) ? 'light' : 'dark' );
				return;
			}

			// A segmented control's radio choice (toggleStyle:"segmented") sets the
			// explicit state named on the button, including "auto".
			const choice = e.target.closest( '[data-sgs-theme-choice]' );
			if ( choice ) {
				const pref = choice.getAttribute( 'data-sgs-theme-choice' );
				if ( 'light' === pref || 'dark' === pref || 'auto' === pref ) {
					setTheme( pref );
				}
			}
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
