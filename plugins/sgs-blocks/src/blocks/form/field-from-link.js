/**
 * SGS Form — a field's value taken from a link parameter (Spec 04 FR-4-10).
 *
 * A field carrying `data-sgs-value-param="role"` is preset from `?role=Driver` in the page address. A select or
 * radio group takes the value only when it matches one of the field's own options (exact, or ignoring case, against
 * the option's value or its label); a text field takes it as plain text through `.value`, never as markup.
 *
 * @package SGS\Blocks
 */

/**
 * @param {string} a First string.
 * @param {string} b Second string.
 * @return {boolean} True when equal ignoring case and surrounding space.
 */
function same( a, b ) {
	return String( a ).trim().toLowerCase() === String( b ).trim().toLowerCase();
}

/**
 * @param {HTMLElement} el Control or group wrapper carrying the param attribute.
 * @return {HTMLElement[]} The controls to preset.
 */
function controlsOf( el ) {
	if ( [ 'INPUT', 'SELECT', 'TEXTAREA' ].includes( el.tagName ) ) {
		return [ el ];
	}
	return Array.from( el.querySelectorAll( 'input, select, textarea' ) );
}

/**
 * @param {HTMLInputElement} radio Radio input.
 * @return {string} Its label text.
 */
function radioLabel( radio ) {
	const own = radio.id ? document.querySelector( `label[for="${ radio.id.replace( /"/g, '\\"' ) }"]` ) : null;
	const label = own || radio.closest( 'label' );
	return label ? label.textContent : '';
}

/**
 * @param {HTMLElement} control Control to set.
 * @param {string}      value   Link value.
 * @return {boolean} True when the control changed.
 */
function applyTo( control, value ) {
	if ( control.tagName === 'SELECT' ) {
		const options = Array.from( control.options ).filter( ( o ) => o.value !== '' );
		const hit =
			options.find( ( o ) => o.value === value ) ||
			options.find( ( o ) => same( o.value, value ) ) ||
			options.find( ( o ) => same( o.textContent, value ) );
		if ( ! hit || control.value === hit.value ) {
			return false;
		}
		control.value = hit.value;
		return true;
	}
	if ( control.type === 'radio' ) {
		const scope = control.form || document;
		const group = Array.from( scope.querySelectorAll( 'input[type="radio"]' ) ).filter(
			( r ) => r.name === control.name
		);
		const hit =
			group.find( ( r ) => r.value === value ) ||
			group.find( ( r ) => same( r.value, value ) ) ||
			group.find( ( r ) => same( radioLabel( r ), value ) );
		if ( ! hit || hit.checked ) {
			return false;
		}
		hit.checked = true;
		return true;
	}
	if ( [ 'checkbox', 'file', 'hidden', 'submit', 'button' ].includes( control.type ) ) {
		return false;
	}
	if ( control.value === value ) {
		return false;
	}
	control.value = value;
	return true;
}

/**
 * Preset every field that names a parameter present in the address.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @param {string}      search   Query string, e.g. window.location.search.
 */
export function applyLinkValues( formRoot, search ) {
	let params;
	try {
		params = new URLSearchParams( search );
	} catch ( _e ) {
		return;
	}
	formRoot.querySelectorAll( '[data-sgs-value-param]' ).forEach( ( el ) => {
		const name = el.getAttribute( 'data-sgs-value-param' );
		if ( ! name || ! params.has( name ) ) {
			return;
		}
		const value = params.get( name );
		controlsOf( el ).forEach( ( control ) => {
			if ( applyTo( control, value ) ) {
				control.dispatchEvent( new Event( 'input', { bubbles: true } ) );
				control.dispatchEvent( new Event( 'change', { bubbles: true } ) );
			}
		} );
	} );
}
