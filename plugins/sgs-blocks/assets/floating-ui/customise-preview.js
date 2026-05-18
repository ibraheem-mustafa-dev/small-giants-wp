/**
 * SGS Floating UI — Customiser preview-side bindings.
 *
 * Listens for postMessage transport setting changes and applies them
 * immediately to the live preview without a full page reload.
 *
 * Enqueued via `customize_preview_init` — only loads inside the Customiser
 * preview iframe, never on the public frontend.
 */
( function ( $, api ) {
	'use strict';

	const wrapper = document.querySelector( '.sgs-floating-ui' );
	const bttBtn  = document.querySelector( '.sgs-floating-ui__back-to-top' );
	const rpBar   = document.querySelector( '.sgs-floating-ui__reading-progress' );

	// ── Back to Top: enabled ────────────────────────────────────────────────

	api( 'sgs_floating_ui_back_to_top_enabled', function ( value ) {
		value.bind( function ( enabled ) {
			if ( bttBtn ) {
				bttBtn.style.display = enabled ? '' : 'none';
			}
		} );
	} );

	// ── Back to Top: background colour ──────────────────────────────────────

	api( 'sgs_floating_ui_back_to_top_bg_colour', function ( value ) {
		value.bind( function ( colour ) {
			if ( wrapper ) {
				wrapper.style.setProperty( '--btt-bg', colour );
			}
		} );
	} );

	// ── Back to Top: icon colour ─────────────────────────────────────────────

	api( 'sgs_floating_ui_back_to_top_icon_colour', function ( value ) {
		value.bind( function ( colour ) {
			if ( wrapper ) {
				wrapper.style.setProperty( '--btt-icon', colour );
			}
		} );
	} );

	// ── Back to Top: position ────────────────────────────────────────────────

	api( 'sgs_floating_ui_back_to_top_position', function ( value ) {
		value.bind( function ( position ) {
			if ( bttBtn ) {
				bttBtn.classList.remove( 'sgs-floating-ui__back-to-top--left', 'sgs-floating-ui__back-to-top--right' );
				bttBtn.classList.add( 'sgs-floating-ui__back-to-top--' + position );
			}
		} );
	} );

	// ── Reading Progress: enabled ─────────────────────────────────────────────

	api( 'sgs_floating_ui_reading_progress_enabled', function ( value ) {
		value.bind( function ( enabled ) {
			if ( rpBar ) {
				rpBar.style.display = enabled ? '' : 'none';
			}
		} );
	} );

	// ── Reading Progress: colour ──────────────────────────────────────────────

	api( 'sgs_floating_ui_reading_progress_colour', function ( value ) {
		value.bind( function ( colour ) {
			if ( wrapper ) {
				wrapper.style.setProperty( '--rp-colour', colour );
			}
		} );
	} );

	// ── Reading Progress: height ──────────────────────────────────────────────

	api( 'sgs_floating_ui_reading_progress_height', function ( value ) {
		value.bind( function ( height ) {
			if ( wrapper ) {
				wrapper.style.setProperty( '--rp-height', height + 'px' );
			}
		} );
	} );

}( window.jQuery, wp.customize ) );
