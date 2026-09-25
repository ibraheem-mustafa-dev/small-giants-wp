/**
 * SGS Add-on price list — settings page row add/remove (Spec 43 FR-43-17).
 *
 * Plain vanilla JS, no jQuery/build step. Enqueued only on the "Add-on
 * prices" admin page (see Addon_Price_List_Admin::enqueue_assets()).
 *
 * The two <template> elements (#sgs-addon-group-template,
 * #sgs-addon-option-template) hold a fresh, empty row each — server-rendered
 * once with PHP-side "__INDEX__" / "__GINDEX__" / "__OINDEX__" placeholders,
 * swapped here for real, never-reused indices so a fresh save never collides
 * an added row with a removed one.
 */
( function () {
	'use strict';

	var groupsContainer = document.getElementById( 'sgs-addon-groups' );
	var groupTemplate = document.getElementById( 'sgs-addon-group-template' );
	var optionTemplate = document.getElementById( 'sgs-addon-option-template' );
	var addGroupButton = document.getElementById( 'sgs-addon-add-group' );

	if ( ! groupsContainer || ! groupTemplate || ! optionTemplate || ! addGroupButton ) {
		return;
	}

	var nextGroupIndex = groupsContainer.querySelectorAll( '.sgs-addon-group' ).length;

	/**
	 * Renumber every name="groups[g][...]" / name="groups[g][options][o][...]"
	 * attribute inside a freshly-cloned fragment.
	 *
	 * @param {DocumentFragment|Element} root       Fragment or element to rewrite.
	 * @param {string}                   groupIndex Real group index.
	 * @param {string}                   optIndex   Real option index (omit for a whole-group clone).
	 */
	function renumber( root, groupIndex, optIndex ) {
		var inputs = root.querySelectorAll( 'input[name]' );
		for ( var i = 0; i < inputs.length; i++ ) {
			var name = inputs[ i ].getAttribute( 'name' );
			name = name.replace( '__GINDEX__', groupIndex ).replace( '__INDEX__', groupIndex );
			if ( undefined !== optIndex ) {
				name = name.replace( '__OINDEX__', optIndex );
			}
			inputs[ i ].setAttribute( 'name', name );
			inputs[ i ].value = '';
		}
	}

	function addOptionRow( fieldset ) {
		var tbody = fieldset.querySelector( '.sgs-addon-options tbody' );
		var groupIndex = fieldset.getAttribute( 'data-group-index' );
		var optionIndex = tbody.querySelectorAll( 'tr' ).length;
		var clone = optionTemplate.content.cloneNode( true );
		renumber( clone, groupIndex, String( optionIndex ) );
		tbody.appendChild( clone );
	}

	function addGroup() {
		var clone = groupTemplate.content.cloneNode( true );
		var fieldset = clone.querySelector( '.sgs-addon-group' );
		var groupIndex = String( nextGroupIndex );
		nextGroupIndex++;
		fieldset.setAttribute( 'data-group-index', groupIndex );
		renumber( clone, groupIndex );
		groupsContainer.appendChild( clone );
	}

	// Give every server-rendered group an index for later option additions.
	var existingGroups = groupsContainer.querySelectorAll( '.sgs-addon-group' );
	for ( var g = 0; g < existingGroups.length; g++ ) {
		existingGroups[ g ].setAttribute( 'data-group-index', String( g ) );
	}

	addGroupButton.addEventListener( 'click', addGroup );

	groupsContainer.addEventListener( 'click', function ( event ) {
		var target = event.target;

		if ( target.classList.contains( 'sgs-addon-add-option' ) ) {
			addOptionRow( target.closest( '.sgs-addon-group' ) );
			return;
		}

		if ( target.classList.contains( 'sgs-addon-remove-option' ) ) {
			var row = target.closest( 'tr' );
			if ( row ) {
				row.parentNode.removeChild( row );
			}
			return;
		}

		if ( target.classList.contains( 'sgs-addon-remove-group' ) ) {
			var fieldset = target.closest( '.sgs-addon-group' );
			if ( fieldset ) {
				fieldset.parentNode.removeChild( fieldset );
			}
		}
	} );
} )();
