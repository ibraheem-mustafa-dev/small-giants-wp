/**
 * SGS Form — per-field validation copy.
 *
 * A field may carry `data-sgs-msg-<reason>` attributes (`required`, `type`, `email`, `url`, `pattern`, `minlength`,
 * `maxlength`, `min`, `max`, `step`, `badinput`, `invalid`, `toolong`). The message for the reason that failed replaces the browser's text.
 *
 * @package SGS\Blocks
 */

/**
 * The reasons a control currently fails, most specific first.
 *
 * @param {HTMLElement} field Control.
 * @return {string[]} Reason suffixes.
 */
export function reasons( field ) {
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
		out.push( 'badinput' );
	}
	// PHP prints data-sgs-msg-invalid and data-sgs-msg-toolong: every failure other than a missing value is "invalid", and an over-long value is "toolong".
	if ( v.typeMismatch || v.patternMismatch || v.tooShort || v.rangeUnderflow || v.rangeOverflow || v.stepMismatch || v.badInput ) {
		out.push( 'invalid' );
	}
	if ( v.tooLong ) {
		out.push( 'toolong' );
	}
	return out;
}

const GROUP_SELECTOR = 'fieldset[data-sgs-group-required]';

/**
 * Apply a tick-several group's "at least one" rule. A group-required fieldset (checkbox and multi-select tiles
 * fields) carries no `required` attribute on its inputs: when none of its checkboxes is ticked the FIRST one is
 * given a custom validity (its own `data-sgs-msg-required` copy, else the default), and every other box is cleared.
 *
 * @param {HTMLElement} group Fieldset carrying data-sgs-group-required.
 */
export function syncGroupRequired( group ) {
	const boxes = Array.from( group.querySelectorAll( 'input[type="checkbox"]' ) );
	const anyTicked = boxes.some( ( box ) => box.checked );
	boxes.forEach( ( box, index ) => {
		if ( 0 === index && ! anyTicked ) {
			box.setCustomValidity( box.getAttribute( 'data-sgs-msg-required' ) || 'Please select at least one option.' );
		} else {
			box.setCustomValidity( '' );
		}
	} );
}

/**
 * The error line of a field: the control's own `<id>-error`, or for a control inside a tick-several group the
 * group's field-level error line.
 *
 * @param {HTMLElement} field Control.
 * @return {HTMLElement|null} Error element.
 */
function errorLineFor( field ) {
	const own = field.id ? document.getElementById( field.id + '-error' ) : null;
	if ( own ) {
		return own;
	}
	const group = field.closest( GROUP_SELECTOR );
	return group ? group.closest( '.sgs-form-field' )?.querySelector( '.sgs-form-field__error' ) ?? null : null;
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
	const group = field.closest( GROUP_SELECTOR );
	if ( group ) {
		syncGroupRequired( group );
	}
	const errorEl = errorLineFor( field );
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

// A tick-several group re-checks its rule whenever a box changes, and clears the error it showed once one is ticked.
if ( 'undefined' !== typeof document ) {
	document.addEventListener( 'change', ( event ) => {
		const group = event.target?.closest ? event.target.closest( GROUP_SELECTOR ) : null;
		if ( ! group ) {
			return;
		}
		syncGroupRequired( group );
		const first = group.querySelector( 'input[type="checkbox"]' );
		if ( first && 'true' === first.getAttribute( 'aria-invalid' ) ) {
			validateField( first );
		}
	} );
	document.querySelectorAll( GROUP_SELECTOR ).forEach( syncGroupRequired );
}
