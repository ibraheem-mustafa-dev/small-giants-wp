/**
 * SGS Button Presets — Customiser CONTROLS-side behaviour.
 *
 * Wires the named-swatch picker (and its "Custom colour" escape hatch) to the
 * underlying Customiser setting. Loaded only in the Customiser control pane
 * (`customize_controls_enqueue_scripts`), never on the frontend.
 *
 * The stored value is always one of four shapes, matching the PHP allowlist in
 * `sanitise_colour_token()`:
 *   ''                                  -> theme default (key deleted on save)
 *   'transparent'
 *   'var(--wp--preset--color--{slug})'  -> a named brand colour
 *   '#rrggbb'                           -> a custom colour
 */
( function ( api, $ ) {
	'use strict';

	var HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

	api.controlConstructor.sgs_button_preset_colour = api.Control.extend( {
		ready: function () {
			var control = this;
			var container = control.container;
			var setting = control.setting;

			var $radios = container.find( 'input[type="radio"]' );
			var $customRadio = container.find( '.sgs-btn-preset-custom-radio' );
			var $customInput = container.find( '.sgs-btn-preset-custom-input' );

			/**
			 * Show the native colour picker only while "Custom colour" is selected.
			 *
			 * @param {boolean} visible Whether to reveal the picker.
			 */
			function toggleCustom( visible ) {
				$customInput.toggleClass( 'is-visible', !! visible );
			}

			/**
			 * Reflect the setting's current value into the radio group.
			 *
			 * A hex value selects the custom radio and seeds the picker; anything else
			 * selects the matching named swatch. If the stored value matches no swatch
			 * at all (e.g. a token whose palette entry was removed by a later snapshot)
			 * nothing is checked, which is honest — it shows the client the value is not
			 * one of their brand colours rather than silently mislabelling it.
			 *
			 * @param {string} value Current setting value.
			 */
			function syncFromSetting( value ) {
				value = value || '';

				if ( HEX.test( value ) ) {
					$customRadio.prop( 'checked', true );
					$customInput.val( value.length === 4
						? '#' + value[ 1 ] + value[ 1 ] + value[ 2 ] + value[ 2 ] + value[ 3 ] + value[ 3 ]
						: value.substring( 0, 7 ) );
					toggleCustom( true );
					return;
				}

				$radios.each( function () {
					this.checked = ( this.value === value );
				} );
				toggleCustom( false );
			}

			$radios.on( 'change', function () {
				if ( this.value === '__custom__' ) {
					toggleCustom( true );
					// Adopt whatever the picker currently holds so the preview responds
					// to the radio click itself, not only to a later picker interaction.
					setting.set( $customInput.val() || '#000000' );
					return;
				}
				toggleCustom( false );
				setting.set( this.value );
			} );

			// `input` (not `change`) so dragging inside the OS colour picker previews live.
			$customInput.on( 'input change', function () {
				$customRadio.prop( 'checked', true );
				setting.set( this.value );
			} );

			setting.bind( syncFromSetting );
			syncFromSetting( setting.get() );
		},
	} );
} )( wp.customize, jQuery );
