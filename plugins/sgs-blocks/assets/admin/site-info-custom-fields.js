/**
 * SGS Site Info — Custom Fields repeater.
 *
 * Vanilla JS (no jQuery). Adds Add Row / Remove Row behaviour to the Custom
 * fields table on Appearance → SGS Site Info. Empty-key rows are already
 * dropped server-side, so no client-side validation is required here.
 *
 * @since 1.0.0
 */
( function () {
	'use strict';

	function ready( fn ) {
		if ( 'loading' !== document.readyState ) {
			fn();
		} else {
			document.addEventListener( 'DOMContentLoaded', fn );
		}
	}

	function nextIndex( tbody ) {
		// Indices are assigned by position in the POST array; pick the highest
		// existing row index + 1 so new rows never collide with existing ones.
		var rows = tbody.querySelectorAll( 'tr.sgs-site-info-custom-row' );
		var max  = -1;
		rows.forEach( function ( row ) {
			var input = row.querySelector( 'input[name*="[custom]"]' );
			if ( ! input ) {
				return;
			}
			var match = input.name.match( /\[custom\]\[(\d+)\]/ );
			if ( match ) {
				var n = parseInt( match[ 1 ], 10 );
				if ( n > max ) {
					max = n;
				}
			}
		} );
		return max + 1;
	}

	function buildRow( optionKey, idx, removeLabel ) {
		var tr = document.createElement( 'tr' );
		tr.className = 'sgs-site-info-custom-row';

		var keyCell = document.createElement( 'td' );
		var keyInput = document.createElement( 'input' );
		keyInput.type = 'text';
		keyInput.name = optionKey + '[custom][' + idx + '][key]';
		keyInput.value = '';
		keyInput.pattern = '[a-z0-9_]+';
		keyInput.title = 'Lower-case letters, numbers, and underscores only.';
		keyInput.className = 'regular-text code';
		keyCell.appendChild( keyInput );

		var valCell = document.createElement( 'td' );
		var valInput = document.createElement( 'input' );
		valInput.type = 'text';
		valInput.name = optionKey + '[custom][' + idx + '][value]';
		valInput.value = '';
		valInput.className = 'regular-text';
		valCell.appendChild( valInput );

		var actCell = document.createElement( 'td' );
		var btn = document.createElement( 'button' );
		btn.type = 'button';
		btn.className = 'button button-link-delete sgs-site-info-remove-row';
		btn.textContent = removeLabel;
		actCell.appendChild( btn );

		tr.appendChild( keyCell );
		tr.appendChild( valCell );
		tr.appendChild( actCell );
		return tr;
	}

	ready( function () {
		var container = document.querySelector( '.sgs-site-info-custom-fields-table' );
		if ( ! container ) {
			return;
		}
		var optionKey   = container.getAttribute( 'data-option-key' ) || 'sgs_site_info';
		var removeLabel = container.getAttribute( 'data-remove-label' ) || 'Remove';
		var tbody       = container.querySelector( 'tbody' );
		var addBtn      = container.querySelector( '.sgs-site-info-add-row' );

		if ( addBtn && tbody ) {
			addBtn.addEventListener( 'click', function () {
				var row = buildRow( optionKey, nextIndex( tbody ), removeLabel );
				tbody.appendChild( row );
				var input = row.querySelector( 'input[type="text"]' );
				if ( input ) {
					input.focus();
				}
			} );
		}

		container.addEventListener( 'click', function ( event ) {
			var target = event.target;
			if ( ! target || ! target.classList || ! target.classList.contains( 'sgs-site-info-remove-row' ) ) {
				return;
			}
			event.preventDefault();
			var row = target.closest( 'tr.sgs-site-info-custom-row' );
			if ( row && row.parentNode ) {
				row.parentNode.removeChild( row );
			}
		} );
	} );
}() );
