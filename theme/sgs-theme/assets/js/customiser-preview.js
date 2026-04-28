/**
 * Customiser Preview JS
 *
 * Handles live-preview for the SGS Floating UI section.
 */

( function( $ ) {

	// --- BACK TO TOP ---

	wp.customize( 'sgs_back_to_top_enabled', function( value ) {
		value.bind( function( to ) {
			$( '#sgs-back-to-top' ).toggle( to );
		} );
	} );

	wp.customize( 'sgs_back_to_top_position', function( value ) {
		value.bind( function( to ) {
			const $el = $( '#sgs-back-to-top' );
			$el.removeClass( function( index, className ) {
				return ( className.match( /(^|\s)sgs-floating-ui--position-\S+/g ) || [] ).join( ' ' );
			} );
			$el.addClass( 'sgs-floating-ui--position-' + to );
		} );
	} );

	wp.customize( 'sgs_back_to_top_show_after', function( value ) {
		value.bind( function( to ) {
			const el = document.getElementById( 'sgs-back-to-top' );
			if ( el ) {
				el.dataset.threshold = to;
			}
		} );
	} );

	wp.customize( 'sgs_back_to_top_shape', function( value ) {
		value.bind( function( to ) {
			const $el = $( '#sgs-back-to-top' );
			$el.removeClass( function( index, className ) {
				return ( className.match( /(^|\s)sgs-floating-ui--shape-\S+/g ) || [] ).join( ' ' );
			} );
			$el.addClass( 'sgs-floating-ui--shape-' + to );
		} );
	} );

	wp.customize( 'sgs_back_to_top_colour_slug', function( value ) {
		value.bind( function( to ) {
			const el = document.getElementById( 'sgs-back-to-top' );
			if ( el ) {
				el.style.backgroundColor = 'var(--wp--preset--color--' + to + ')';
			}
		} );
	} );

	wp.customize( 'sgs_back_to_top_size', function( value ) {
		value.bind( function( to ) {
			const el = document.getElementById( 'sgs-back-to-top' );
			if ( el ) {
				el.style.width = to + 'px';
				el.style.height = to + 'px';
			}
		} );
	} );

	// --- READING PROGRESS ---

	wp.customize( 'sgs_reading_progress_enabled', function( value ) {
		value.bind( function( to ) {
			$( '#sgs-reading-progress' ).toggle( to );
		} );
	} );

	wp.customize( 'sgs_reading_progress_mode', function( value ) {
		value.bind( function( to ) {
			const $el = $( '#sgs-reading-progress' );
			$el.removeClass( function( index, className ) {
				return ( className.match( /(^|\s)sgs-floating-ui--mode-\S+/g ) || [] ).join( ' ' );
			} );
			$el.addClass( 'sgs-floating-ui--mode-' + to );
		} );
	} );

	wp.customize( 'sgs_reading_progress_position', function( value ) {
		value.bind( function( to ) {
			const $el = $( '#sgs-reading-progress' );
			$el.removeClass( function( index, className ) {
				return ( className.match( /(^|\s)sgs-floating-ui--pos-\S+/g ) || [] ).join( ' ' );
			} );
			$el.addClass( 'sgs-floating-ui--pos-' + to );
		} );
	} );

	wp.customize( 'sgs_reading_progress_bar_colour_slug', function( value ) {
		value.bind( function( to ) {
			document.documentElement.style.setProperty( '--sgs-rp-bar-colour', 'var(--wp--preset--color--' + to + ')' );
		} );
	} );

	wp.customize( 'sgs_reading_progress_bar_height', function( value ) {
		value.bind( function( to ) {
			document.documentElement.style.setProperty( '--sgs-rp-bar-height', to + 'px' );
		} );
	} );

} )( jQuery );
