/**
 * SGS Form — saved progress (Spec 04 FR-4-9).
 *
 * With the form's `savedProgress` setting on, every field value and the current step are kept in the browser's
 * localStorage as the visitor types, restored on the next visit (the notice then reads "Progress saved") and removed
 * once the form is submitted. Storage that throws (private mode, quota, blocked) leaves the form working unsaved.
 *
 * @package SGS\Blocks
 */

const KEY_PREFIX = 'sgs-form-progress';

/** Per-form step the last write or restore saw (module state is per bundle; keyed by element so forms stay apart). */
const stepOf = new WeakMap();

/**
 * @param {HTMLElement} formRoot Form wrapper.
 * @return {boolean} True when the form turned saved progress on.
 */
export function isEnabled( formRoot ) {
	return formRoot.getAttribute( 'data-saved-progress' ) === 'true';
}

/**
 * Storage key for one form on one page: path + form id + which copy of that form this is on the page, so two forms
 * (or the same saved form twice) never share state and a form on another page never reads this one.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @return {string} Storage key.
 */
export function progressKey( formRoot ) {
	const idOf = ( el ) => el.getAttribute( 'data-form-id' ) || el.id || 'form';
	const formId = idOf( formRoot );
	const same = Array.from(
		document.querySelectorAll( '[data-wp-interactive="sgs/form"]' )
	).filter( ( el ) => idOf( el ) === formId );
	const copy = Math.max( 0, same.indexOf( formRoot ) );
	return `${ KEY_PREFIX }:${ window.location.pathname }:${ formId }:${ copy }`;
}

/**
 * Fields whose value is stored: named, not a file, not hidden (a hidden value belongs to the server), not internal.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @return {HTMLElement[]} Storable controls.
 */
function storableFields( formRoot ) {
	return Array.from( formRoot.querySelectorAll( 'input, select, textarea' ) ).filter( ( el ) => {
		const name = el.getAttribute( 'name' );
		if ( ! name || name.startsWith( 'sgs_hp_' ) || name.startsWith( '_sgs_' ) ) {
			return false;
		}
		return ! [ 'file', 'hidden', 'password', 'submit', 'button' ].includes( el.type );
	} );
}

/**
 * Every storable field's current value, keyed by name. Checkboxes store the array of ticked values, radios the ticked
 * value (or an empty string), everything else its value.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @return {Object} Name to value.
 */
export function serialiseFields( formRoot ) {
	const values = {};
	storableFields( formRoot ).forEach( ( el ) => {
		const name = el.getAttribute( 'name' );
		if ( el.type === 'checkbox' ) {
			values[ name ] = values[ name ] || [];
			if ( el.checked ) {
				values[ name ].push( el.value );
			}
		} else if ( el.type === 'radio' ) {
			if ( ! ( name in values ) ) {
				values[ name ] = '';
			}
			if ( el.checked ) {
				values[ name ] = el.value;
			}
		} else {
			values[ name ] = el.value;
		}
	} );
	return values;
}

/**
 * Put stored values back, firing input and change so conditional logic and counters see them.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @param {Object}      values   Name to value, as from serialiseFields().
 */
export function applyFields( formRoot, values ) {
	storableFields( formRoot ).forEach( ( el ) => {
		const name = el.getAttribute( 'name' );
		if ( ! values || ! Object.prototype.hasOwnProperty.call( values, name ) ) {
			return;
		}
		const stored = values[ name ];
		let changed = false;
		if ( el.type === 'checkbox' ) {
			const on = Array.isArray( stored ) && stored.includes( el.value );
			changed = el.checked !== on;
			el.checked = on;
		} else if ( el.type === 'radio' ) {
			const on = stored === el.value && stored !== '';
			changed = el.checked !== on;
			el.checked = on;
		} else if ( typeof stored === 'string' && el.value !== stored ) {
			const before = el.value;
			el.value = stored;
			// A select keeps its old value when the stored one is no longer one of its options.
			changed = el.value !== before;
		}
		if ( changed ) {
			el.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			el.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		}
	} );
}

/**
 * @param {HTMLElement} formRoot Form wrapper.
 * @return {{v: Object, step: number}|null} The stored progress, or null when none or unreadable.
 */
export function readProgress( formRoot ) {
	try {
		const raw = window.localStorage.getItem( progressKey( formRoot ) );
		if ( ! raw ) {
			return null;
		}
		const data = JSON.parse( raw );
		if ( ! data || typeof data !== 'object' || typeof data.v !== 'object' || data.v === null ) {
			return null;
		}
		const step = parseInt( data.step, 10 );
		return { v: data.v, step: Number.isNaN( step ) || step < 0 ? 0 : step };
	} catch ( _e ) {
		return null;
	}
}

/**
 * Switch the notice to its saved wording.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 */
function markSaved( formRoot ) {
	const text = formRoot.querySelector( '.sgs-form__saved-text' );
	const done = text ? text.getAttribute( 'data-saved-label' ) : null;
	if ( text && done ) {
		text.textContent = done;
	}
}

/**
 * Write every field and the step. No-op when the setting is off.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 */
export function writeProgress( formRoot ) {
	if ( ! isEnabled( formRoot ) ) {
		return;
	}
	try {
		window.localStorage.setItem(
			progressKey( formRoot ),
			JSON.stringify( { v: serialiseFields( formRoot ), step: stepOf.get( formRoot ) || 0 } )
		);
		markSaved( formRoot );
	} catch ( _e ) {
		// Storage unavailable: the form works, it just does not remember.
	}
}

/**
 * Record the step the visitor is on and store it with the fields.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @param {number}      step     Zero-based step.
 */
export function saveStep( formRoot, step ) {
	stepOf.set( formRoot, step );
	writeProgress( formRoot );
}

/**
 * Remove the stored progress (the form was submitted).
 *
 * @param {HTMLElement} formRoot Form wrapper.
 */
export function clearProgress( formRoot ) {
	try {
		window.localStorage.removeItem( progressKey( formRoot ) );
	} catch ( _e ) {
		// Storage unavailable: nothing to clear.
	}
}

/**
 * Restore stored progress into the form and start saving changes. Does nothing when the setting is off.
 *
 * @param {HTMLElement} formRoot  Form wrapper.
 * @param {number}      stepCount Number of steps in the form.
 * @return {number} The step to start on (clamped; 0 when nothing was stored).
 */
export function initSavedProgress( formRoot, stepCount ) {
	if ( ! isEnabled( formRoot ) ) {
		return 0;
	}
	let start = 0;
	const stored = readProgress( formRoot );
	if ( stored ) {
		applyFields( formRoot, stored.v );
		start = Math.min( stored.step, Math.max( 0, stepCount - 1 ) );
		markSaved( formRoot );
	}
	stepOf.set( formRoot, start );
	const save = () => writeProgress( formRoot );
	formRoot.addEventListener( 'input', save );
	formRoot.addEventListener( 'change', save );
	return start;
}
