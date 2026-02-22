/**
 * SGS Theme — Dark Mode Toggle
 *
 * Manages dark mode state via [data-theme] attribute on <html>.
 * Persists user preference in localStorage.
 * Respects OS-level prefers-color-scheme when no explicit choice is made.
 *
 * @package SGS\Theme
 */

( function () {
	'use strict';

	const STORAGE_KEY = 'sgs-theme-preference';
	const root = document.documentElement;

	/**
	 * Get the stored theme preference or null.
	 */
	function getStoredPreference() {
		try {
			return localStorage.getItem( STORAGE_KEY );
		} catch {
			return null;
		}
	}

	/**
	 * Set the theme and persist it.
	 */
	function setTheme( theme ) {
		root.setAttribute( 'data-theme', theme );

		// Update prefers-dark data attribute for auto mode.
		const prefersDark = window.matchMedia( '(prefers-color-scheme: dark)' ).matches;
		root.setAttribute( 'data-prefers-dark', prefersDark ? 'true' : 'false' );

		try {
			localStorage.setItem( STORAGE_KEY, theme );
		} catch {
			// localStorage unavailable — degrade gracefully.
		}
	}

	/**
	 * Initialise theme from stored preference or OS preference.
	 */
	function init() {
		const stored = getStoredPreference();
		const prefersDark = window.matchMedia( '(prefers-color-scheme: dark)' ).matches;

		root.setAttribute( 'data-prefers-dark', prefersDark ? 'true' : 'false' );

		if ( stored === 'dark' || stored === 'light' ) {
			root.setAttribute( 'data-theme', stored );
		}
		// If no stored preference, don't set data-theme — let CSS media query handle it.

		// Listen for OS theme changes.
		window.matchMedia( '(prefers-color-scheme: dark)' ).addEventListener( 'change', ( e ) => {
			root.setAttribute( 'data-prefers-dark', e.matches ? 'true' : 'false' );
			// Only auto-switch if user hasn't explicitly chosen.
			const current = getStoredPreference();
			if ( ! current ) {
				root.removeAttribute( 'data-theme' );
			}
		} );

		// Bind toggle buttons.
		document.addEventListener( 'click', ( e ) => {
			const btn = e.target.closest( '.sgs-dark-mode-toggle' );
			if ( ! btn ) {
				return;
			}

			const current = root.getAttribute( 'data-theme' );
			const isDark = current === 'dark' ||
				( ! current && prefersDark );

			setTheme( isDark ? 'light' : 'dark' );
		} );
	}

	// Run immediately (script should be in <head> or deferred).
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
