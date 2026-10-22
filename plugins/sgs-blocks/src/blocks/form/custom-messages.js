/**
 * SGS Form — per-field validation copy.
 *
 * A field may carry `data-sgs-msg-<reason>` attributes (`required`, `type`, `email`, `url`, `pattern`, `minlength`,
 * `maxlength`, `min`, `max`, `step`, `invalid`). The message for the reason that failed replaces the browser's text.
 *
 * @package SGS\Blocks
 */

/**
 * The reasons a control currently fails, most specific first.
 *
 * @param {HTMLElement} field Control.
 * @return {string[]} Reason suffixes.
 */
function reasons( field ) {
	const v = field.validity;
	const out = [];
	if ( v.valueMissing ) {
		out.push( 'required' );
	}
	if ( v.typeMismatch ) {
		out.push( field.type, 'type' );
	}
	if ( v.patternMismatch ) {
		out.push( 'pattern' );
	}
	if ( v.tooShort ) {
		out.push( 'minlength' );
	}
	if ( v.tooLong ) {
		out.push( 'maxlength' );
	}
	if ( v.rangeUnderflow ) {
		out.push( 'min' );
	}
	if ( v.rangeOverflow ) {
		out.push( 'max' );
	}
	if ( v.stepMismatch ) {
		out.push( 'step' );
	}
	if ( v.badInput ) {
		out.push( 'invalid' );
	}
	return out;
}

/**
 * Validate one control, mark it and fill its error line. A field's own message is also set as the control's custom
 * validity so the browser bubble shows the same words.
 *
 * @param {HTMLElement} field Control.
 * @return {boolean} True when valid.
 */
export function validateField( field ) {
	field.setCustomValidity( '' );
	const errorEl = field.id ? document.getElementById( field.id + '-error' ) : null;
	if ( field.checkValidity() ) {
		field.removeAttribute( 'aria-invalid' );
		if ( errorEl ) {
			errorEl.textContent = '';
		}
		return true;
	}
	let message = '';
	for ( const reason of reasons( field ) ) {
		const own = field.getAttribute( 'data-sgs-msg-' + reason );
		if ( own ) {
			message = own;
			break;
		}
	}
	if ( message ) {
		field.setCustomValidity( message );
	}
	field.setAttribute( 'aria-invalid', 'true' );
	if ( errorEl ) {
		errorEl.textContent = message || field.validationMessage || 'This field is required.';
	}
	return false;
}
