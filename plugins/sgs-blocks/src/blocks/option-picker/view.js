/**
 * SGS Option Picker — frontend module.
 *
 * CSS handles all visual state (resting / hover / checked) via
 * `input:checked ~ .sgs-option-picker__pill`. This module's only job
 * is to dispatch a bubbling custom event when the user changes selection,
 * so parent blocks (e.g. product cards) can react without coupling.
 *
 * Event contract:
 *   type    : 'sgs:option-selected'
 *   bubbles : true
 *   detail  : { typeKey: string, selectedKey: string, contentImpact: string[] }
 *
 * Loaded as a viewScriptModule (ES module, deferred, never viewScript).
 *
 * No WP Interactivity API store is needed here — the block has no reactive
 * server state, and a plain addEventListener is smaller and simpler for a
 * single fire-and-forget event.
 */

document.querySelectorAll( '.sgs-option-picker' ).forEach( ( fieldset ) => {
	const optionsDiv = fieldset.querySelector( '.sgs-option-picker__options' );
	if ( ! optionsDiv ) {
		return;
	}

	/** Read static data attributes baked in by render.php */
	const typeKey       = optionsDiv.dataset.typeKey       || '';
	const contentImpact = optionsDiv.dataset.contentImpact
		? optionsDiv.dataset.contentImpact
				.split( ',' )
				.map( ( s ) => s.trim() )
				.filter( Boolean )
		: [];

	/**
	 * Dispatch the selection-changed event from the fieldset so it
	 * bubbles up through any parent blocks that are listening.
	 */
	function dispatchSelectionEvent( selectedKey ) {
		fieldset.dispatchEvent(
			new CustomEvent( 'sgs:option-selected', {
				bubbles: true,
				composed: true, // Also crosses shadow DOM boundaries if ever needed.
				detail: {
					typeKey,
					selectedKey,
					contentImpact,
				},
			} )
		);
	}

	/**
	 * Listen on the options container — event delegation catches all
	 * radio inputs regardless of order or future additions.
	 */
	optionsDiv.addEventListener( 'change', ( event ) => {
		const input = event.target;
		if ( input.type !== 'radio' ) {
			return;
		}
		dispatchSelectionEvent( input.value );
	} );

	/**
	 * Dispatch once on load for the pre-checked option so that any
	 * parent block listening after DOMContentLoaded gets the initial state.
	 * Uses requestAnimationFrame to ensure sibling blocks are mounted first.
	 */
	requestAnimationFrame( () => {
		const checked = optionsDiv.querySelector( 'input[type="radio"]:checked' );
		if ( checked ) {
			dispatchSelectionEvent( checked.value );
		}
	} );
} );
