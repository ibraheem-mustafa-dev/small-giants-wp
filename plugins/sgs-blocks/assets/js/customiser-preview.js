/**
 * SGS Customiser — Header + Footer live-preview bindings (Phase 5b, Decision 21).
 *
 * Listens for postMessage transport setting changes and applies them
 * immediately to the live preview iframe without a full page reload.
 *
 * Enqueued via `customize_preview_init` — only loads inside the Customiser
 * preview iframe, never on the public frontend.
 *
 * Settings handled (postMessage transport):
 *   SGS Header:
 *     - sgs_header_bg_colour    → --sgs-header-bg on .wp-site-header
 *     - sgs_header_text_colour  → --sgs-header-text on .wp-site-header
 *     - sgs_header_link_colour  → --sgs-header-link on .wp-site-header
 *     - sgs_header_max_width    → --sgs-header-width on .wp-site-header
 *     - sgs_header_sticky_enabled → position:sticky toggle on .wp-site-header
 *   SGS Footer:
 *     - sgs_footer_bg_colour    → --sgs-footer-bg on .wp-site-footer
 *     - sgs_footer_text_colour  → --sgs-footer-text on .wp-site-footer
 *     - sgs_footer_link_colour  → --sgs-footer-link on .wp-site-footer
 *     - sgs_footer_max_width    → --sgs-footer-width on .wp-site-footer
 */
( function ( api ) {
	'use strict';

	const headerEl = function () {
		return document.querySelector( '.wp-site-header' );
	};
	const footerEl = function () {
		return document.querySelector( '.wp-site-footer' );
	};

	// ── SGS Header ───────────────────────────────────────────────────────────

	api( 'sgs_header_bg_colour', function ( value ) {
		value.bind( function ( newVal ) {
			const el = headerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-header-bg', newVal );
				el.style.backgroundColor = newVal;
			}
		} );
	} );

	api( 'sgs_header_text_colour', function ( value ) {
		value.bind( function ( newVal ) {
			const el = headerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-header-text', newVal );
				el.style.color = newVal;
			}
		} );
	} );

	api( 'sgs_header_link_colour', function ( value ) {
		value.bind( function ( newVal ) {
			const el = headerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-header-link', newVal );
				el.querySelectorAll( 'a' ).forEach( function ( a ) {
					a.style.color = newVal;
				} );
			}
		} );
	} );

	api( 'sgs_header_max_width', function ( value ) {
		value.bind( function ( newVal ) {
			const el = headerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-header-width', newVal );
				el.style.maxWidth = newVal;
			}
		} );
	} );

	api( 'sgs_header_sticky_enabled', function ( value ) {
		value.bind( function ( enabled ) {
			const el = headerEl();
			if ( el ) {
				if ( enabled ) {
					el.style.position = 'sticky';
					el.style.top = '0';
					el.style.zIndex = '100';
				} else {
					el.style.position = '';
					el.style.top = '';
					el.style.zIndex = '';
				}
			}
		} );
	} );

	// ── SGS Footer ───────────────────────────────────────────────────────────

	api( 'sgs_footer_bg_colour', function ( value ) {
		value.bind( function ( newVal ) {
			const el = footerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-footer-bg', newVal );
				el.style.backgroundColor = newVal;
			}
		} );
	} );

	api( 'sgs_footer_text_colour', function ( value ) {
		value.bind( function ( newVal ) {
			const el = footerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-footer-text', newVal );
				el.style.color = newVal;
			}
		} );
	} );

	api( 'sgs_footer_link_colour', function ( value ) {
		value.bind( function ( newVal ) {
			const el = footerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-footer-link', newVal );
				el.querySelectorAll( 'a' ).forEach( function ( a ) {
					a.style.color = newVal;
				} );
			}
		} );
	} );

	api( 'sgs_footer_max_width', function ( value ) {
		value.bind( function ( newVal ) {
			const el = footerEl();
			if ( el ) {
				el.style.setProperty( '--sgs-footer-width', newVal );
				el.style.maxWidth = newVal;
			}
		} );
	} );
}( window.wp.customize ) );
