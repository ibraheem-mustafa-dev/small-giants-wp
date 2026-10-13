/**
 * SGS Floating UI — Customiser panel: reading-progress gradient control.
 *
 * Paints the preview swatch from the typed gradient and shows a message when
 * the browser does not accept the value as a gradient. The server sanitiser
 * decides what is saved.
 */
( function ( api ) {
	'use strict';

	api.bind( 'ready', function () {
		api.control( 'sgs_floating_ui_reading_progress_gradient', function ( control ) {
			const container = control.container[ 0 ];
			const swatch    = container.querySelector( '.sgs-gradient-control__swatch' );
			const message   = container.querySelector( '.sgs-gradient-control__message' );
			if ( ! swatch || ! message ) {
				return;
			}

			swatch.style.display      = 'block';
			swatch.style.height       = '24px';
			swatch.style.marginTop    = '8px';
			swatch.style.border       = '1px solid #c3c4c7';
			swatch.style.borderRadius = '2px';

			const paint = function ( value ) {
				const text = ( value || '' ).trim();
				if ( '' === text ) {
					swatch.style.backgroundImage = 'none';
					message.textContent = '';
					return;
				}
				if ( window.CSS && CSS.supports( 'background-image', text ) ) {
					swatch.style.backgroundImage = text;
					message.textContent = '';
				} else {
					swatch.style.backgroundImage = 'none';
					message.textContent = 'Not a gradient the browser recognises yet.';
				}
			};

			control.setting.bind( paint );
			paint( control.setting.get() );
		} );
	} );
}( wp.customize ) );
