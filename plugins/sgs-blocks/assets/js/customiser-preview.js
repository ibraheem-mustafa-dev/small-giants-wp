/**
 * SGS Customiser — Header + Footer live-preview bindings (Phase 5b, Decision 21).
 *
 * Listens for postMessage transport setting changes and applies them
 * immediately to the live preview iframe without a full page reload.
 *
 * Enqueued via `customize_preview_init` — only loads inside the Customiser
 * preview iframe, never on the public frontend.
 *
 * DOM targets: WP-canonical template-part wrappers `header.wp-block-template-part`
 * + `footer.wp-block-template-part`. CSS custom properties also written on
 * documentElement so any consumer selector can read them.
 *
 * Settings handled (postMessage transport):
 *   SGS Header:
 *     - sgs_header_bg_colour, sgs_header_text_colour, sgs_header_link_colour,
 *       sgs_header_max_width, sgs_header_sticky_enabled
 *   SGS Footer:
 *     - sgs_footer_bg_colour, sgs_footer_text_colour, sgs_footer_link_colour,
 *       sgs_footer_max_width
 */
( function ( api ) {
	'use strict';

	const headerEl = function () {
		return document.querySelector( 'header.wp-block-template-part' );
	};
	const footerEl = function () {
		return document.querySelector( 'footer.wp-block-template-part' );
	};
	const setRootVar = function ( name, value ) {
		document.documentElement.style.setProperty( name, value );
	};
	const innerGroupOf = function ( el ) {
		return el ? el.querySelector( ':scope > .wp-block-group' ) : null;
	};

	// ── SGS Header ───────────────────────────────────────────────────────────

	api( 'sgs_header_bg_colour', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-header-bg', newVal );
			const el = headerEl();
			if ( el ) {
				el.style.backgroundColor = newVal;
			}
		} );
	} );

	api( 'sgs_header_text_colour', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-header-text', newVal );
			const el = headerEl();
			if ( el ) {
				el.style.color = newVal;
			}
		} );
	} );

	api( 'sgs_header_link_colour', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-header-link', newVal );
			const el = headerEl();
			if ( el ) {
				el.querySelectorAll( 'a' ).forEach( function ( a ) {
					a.style.color = newVal;
				} );
			}
		} );
	} );

	api( 'sgs_header_max_width', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-header-width', newVal );
			const inner = innerGroupOf( headerEl() );
			if ( inner ) {
				inner.style.maxWidth = newVal;
				inner.style.marginInline = 'auto';
			}
		} );
	} );

	api( 'sgs_header_sticky_enabled', function ( value ) {
		value.bind( function ( enabled ) {
			const el = headerEl();
			if ( ! el ) {
				return;
			}
			if ( enabled ) {
				el.style.position = 'sticky';
				el.style.top = '0';
				el.style.zIndex = '100';
			} else {
				el.style.position = '';
				el.style.top = '';
				el.style.zIndex = '';
			}
		} );
	} );

	// ── SGS Footer ───────────────────────────────────────────────────────────

	api( 'sgs_footer_bg_colour', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-footer-bg', newVal );
			const el = footerEl();
			if ( el ) {
				el.style.backgroundColor = newVal;
			}
		} );
	} );

	api( 'sgs_footer_text_colour', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-footer-text', newVal );
			const el = footerEl();
			if ( el ) {
				el.style.color = newVal;
			}
		} );
	} );

	api( 'sgs_footer_link_colour', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-footer-link', newVal );
			const el = footerEl();
			if ( el ) {
				el.querySelectorAll( 'a' ).forEach( function ( a ) {
					a.style.color = newVal;
				} );
			}
		} );
	} );

	api( 'sgs_footer_max_width', function ( value ) {
		value.bind( function ( newVal ) {
			setRootVar( '--sgs-footer-width', newVal );
			const inner = innerGroupOf( footerEl() );
			if ( inner ) {
				inner.style.maxWidth = newVal;
				inner.style.marginInline = 'auto';
			}
		} );
	} );
}( window.wp.customize ) );
