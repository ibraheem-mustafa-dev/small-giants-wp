/**
 * SGS Form — the review step as one card per section (Spec 04 FR-4-11).
 *
 * Each earlier step becomes a card: the step's label as its title, an "Edit" button that jumps back to that step, and
 * a label/value row for every answered field. Built with safe DOM methods only, never innerHTML.
 *
 * @package SGS\Blocks
 */
import { appendAuthoredText } from '../../utils/authored-text-dom';

let cardCounter = 0;
const wired = new WeakSet();

/**
 * The label element of an input: the one whose `for` names it (the id is escaped for the selector), else, when
 * asked, the label that wraps it.
 *
 * @param {HTMLElement}      field  A `.sgs-form-field` element.
 * @param {HTMLInputElement} input  The input.
 * @param {boolean}          [wrap] Fall back to the wrapping label.
 * @return {HTMLElement|null} The label.
 */
function labelOf( field, input, wrap = true ) {
	let label = null;
	if ( input.id ) {
		label = 'function' === typeof CSS && CSS.escape
			? field.querySelector( `label[for="${ CSS.escape( input.id ) }"]` )
			: Array.from( field.querySelectorAll( 'label' ) ).find( ( candidate ) => candidate.htmlFor === input.id ) || null;
	}
	return label || ( wrap ? input.closest( 'label' ) : null );
}

/**
 * Whether the field prints a question of its own: a legend, a field label, a consent text or an
 * aria-labelledby group. A lone checkbox in such a field is an option, not a yes/no question.
 *
 * @param {HTMLElement} field A `.sgs-form-field` element.
 * @return {boolean} True when the field asks its own question.
 */
function printsOwnQuestion( field ) {
	return !! field.querySelector( 'legend, .sgs-form-field__label, .sgs-form-field__consent-text, [aria-labelledby]' );
}

/**
 * Human-readable answer for one field wrapper, or '' when unanswered.
 *
 * @param {HTMLElement} field A `.sgs-form-field` element.
 * @return {string} Answer text.
 */
export function fieldValueText( field ) {
	let valueText = '';

	const textInput = field.querySelector(
		'input[type="text"], input[type="email"], input[type="tel"], input[type="hidden"], textarea'
	);
	if ( textInput && textInput.value ) {
		valueText = textInput.value;
	}

	const selectEl = field.querySelector( 'select' );
	if ( selectEl && selectEl.value ) {
		const selectedOption = selectEl.querySelector( 'option:checked' );
		valueText = selectedOption ? selectedOption.textContent : selectEl.value;
	}

	const labelFor = ( input ) => {
		const label = labelOf( field, input, false );
		return label ? label.textContent.trim() : input.value;
	};

	const checkedRadio = field.querySelector( 'input[type="radio"]:checked' );
	if ( checkedRadio ) {
		valueText = labelFor( checkedRadio );
	}

	const checkedBoxes = field.querySelectorAll( 'input[type="checkbox"]:checked' );
	if ( checkedBoxes.length > 0 ) {
		valueText = Array.from( checkedBoxes ).map( labelFor ).join( ', ' );
	}

	const checkedTiles = field.querySelectorAll( '.sgs-form-tile input:checked' );
	if ( checkedTiles.length > 0 ) {
		const values = [];
		checkedTiles.forEach( ( tileInput ) => {
			const tileLabel = tileInput.closest( 'label' );
			if ( tileLabel ) {
				const text = tileLabel.querySelector( '.sgs-form-tile__label' );
				values.push( text ? text.textContent.trim() : tileInput.value );
			}
		} );
		valueText = values.join( ', ' );
	}

	const filePreview = field.querySelector( '.sgs-form-file__name' );
	if ( filePreview ) {
		valueText = filePreview.textContent;
	}

	const consentCheckbox = field.querySelector( 'input[type="checkbox"]' );
	if ( field.classList.contains( 'sgs-form-field--consent' ) && consentCheckbox ) {
		valueText = consentCheckbox.checked ? 'Yes' : 'No';
	}

	// A lone checkbox ("Deliver to this address") answers yes or no, ticked or not.
	const lone = loneCheckbox( field );
	if ( lone && ! printsOwnQuestion( field ) ) {
		valueText = lone.checked ? 'Yes' : 'No';
	}

	return valueText;
}

/**
 * The only checkbox of a field that holds exactly one and is not a consent field, else null.
 *
 * @param {HTMLElement} field A `.sgs-form-field` element.
 * @return {HTMLInputElement|null} The checkbox.
 */
function loneCheckbox( field ) {
	if ( field.classList.contains( 'sgs-form-field--consent' ) ) {
		return null;
	}
	const boxes = field.querySelectorAll( 'input[type="checkbox"]' );
	return 1 === boxes.length ? boxes[ 0 ] : null;
}

/**
 * The question of a field that prints no visible label element: its aria-label, then its data-label, then its
 * a lone checkbox's own words, then its input name made readable ("trade_type[]" reads "Trade type").
 *
 * @param {HTMLElement} field A `.sgs-form-field` element.
 * @return {string} Label text, or '' when the field carries none of the three.
 */
function fallbackLabelText( field ) {
	const labelled = field.matches( '[aria-label]' ) ? field : field.querySelector( '[aria-label]' );
	const aria = labelled ? labelled.getAttribute( 'aria-label' ).trim() : '';
	if ( aria ) {
		return aria;
	}
	const dataEl = field.matches( '[data-label]' ) ? field : field.querySelector( '[data-label]' );
	const data = dataEl ? dataEl.getAttribute( 'data-label' ).trim() : '';
	if ( data ) {
		return data;
	}
	// A lone checkbox with no question asks its own words, shortened to 40 characters.
	const lone = printsOwnQuestion( field ) ? null : loneCheckbox( field );
	const own = lone ? labelOf( field, lone ) : null;
	const words = own ? own.textContent.replace( /\s+/g, ' ' ).trim() : '';
	if ( words ) {
		return words.length > 40 ? `${ words.slice( 0, 40 ) }…` : words;
	}
	const named = field.querySelector( 'input[name], select[name], textarea[name]' );
	const name = named ? named.getAttribute( 'name' ).replace( /\[\d*\]$/, '' ).replace( /[-_]+/g, ' ' ).replace( /\s+/g, ' ' ).trim() : '';
	return name ? name.charAt( 0 ).toUpperCase() + name.slice( 1 ) : '';
}

/**
 * The question a field asks: the group legend or field label, never an option's label, with the required marker
 * and its screen-reader "(required)" text stripped.
 *
 * @param {HTMLElement} field A `.sgs-form-field` element.
 * @return {string} Clean label text, or '' when the field has none.
 */
export function fieldLabelText( field ) {
	const consentText = field.querySelector( '.sgs-form-field__consent-text' );
	let source = consentText || field.querySelector( 'legend.sgs-form-field__label, .sgs-form-field__label' );
	if ( ! source ) {
		const group = field.querySelector( '[aria-labelledby]' );
		const ids = group ? group.getAttribute( 'aria-labelledby' ).split( /\s+/ ) : [];
		source = ids.map( ( id ) => document.getElementById( id ) ).find( Boolean ) || null;
	}
	if ( ! source ) {
		source = field.querySelector( 'legend' ) ||
			field.querySelector( 'label:not(.sgs-form-field__option):not(.sgs-form-tile):not(.screen-reader-text)' );
	}
	if ( ! source ) {
		return fallbackLabelText( field );
	}
	const clone = source.cloneNode( true );
	clone.querySelectorAll( '.sgs-form-field__required, .sgs-form-field__optional, .sgs-sr-only, .screen-reader-text' ).forEach( ( node ) => node.remove() );
	return clone.textContent.replace( /\s+/g, ' ' ).trim();
}

/**
 * Whether a field is hidden by conditional logic: applyConditionalLogic() puts `sgs-form-field--hidden` on the
 * wrapper and disables its inputs, which is also what takes it out of step validation.
 *
 * @param {HTMLElement} field A `.sgs-form-field` element.
 * @return {boolean} True when the field is out of the form.
 */
function isFieldHidden( field ) {
	if ( field.closest( '.sgs-form-field--hidden' ) ) {
		return true;
	}
	const inputs = field.querySelectorAll( 'input, select, textarea' );
	return inputs.length > 0 && Array.from( inputs ).every( ( input ) => input.disabled );
}

/**
 * Whether a whole step is out of the form: hidden by the `hidden` attribute (itself or an ancestor), or holding
 * inputs that are all disabled. A step merely not on screen (`sgs-form-step--hidden`, the stepper's own class)
 * is still part of the form and is not skipped.
 *
 * @param {HTMLElement} step Step element.
 * @return {boolean} True when the step takes no part in the review.
 */
function isStepSkipped( step ) {
	if ( step.closest( '[hidden]' ) ) {
		return true;
	}
	const inputs = step.querySelectorAll( 'input, select, textarea' );
	return inputs.length > 0 && Array.from( inputs ).every( ( input ) => input.disabled );
}

/**
 * Label/value rows for the answered fields inside a container.
 *
 * @param {HTMLElement} scope Step or form element.
 * @return {Array<{label: string, value: string}>} Rows.
 */
function answeredRows( scope ) {
	const rows = [];
	scope.querySelectorAll( '.sgs-form-field' ).forEach( ( field ) => {
		if ( isFieldHidden( field ) ) {
			return;
		}
		const label = fieldLabelText( field );
		const value = label ? fieldValueText( field ) : '';
		if ( label && value ) {
			rows.push( { label, value } );
		}
	} );
	return rows;
}

/**
 * Jump back to a step through the progress bar's own step button (so the form's step state, saved progress and
 * motion all run), then move focus to the step's heading.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @param {number}      index    Zero-based step to show.
 */
export function jumpToStep( formRoot, index ) {
	const button = formRoot.querySelectorAll( '.sgs-form__progress-step' )[ index ];
	if ( button ) {
		button.click();
	}
	const step = formRoot.querySelectorAll( '.sgs-form-step' )[ index ];
	if ( ! step ) {
		return;
	}
	const target = step.querySelector( 'h1, h2, h3, h4, h5, h6' ) || step;
	if ( ! target.hasAttribute( 'tabindex' ) ) {
		target.setAttribute( 'tabindex', '-1' );
	}
	target.focus();
}

/**
 * @param {string} text Text.
 * @param {string} tag  Tag name.
 * @param {string} cls  Class.
 * @return {HTMLElement} New element.
 */
function el( tag, cls, text ) {
	const node = document.createElement( tag );
	node.className = cls;
	if ( text ) {
		node.textContent = text;
	}
	return node;
}

/**
 * Fill a review block with one card per earlier section.
 *
 * @param {HTMLElement} formRoot Form wrapper.
 * @param {HTMLElement} review   The `.sgs-form-review` element.
 */
export function populateReview( formRoot, review ) {
	const mount = review.querySelector( '.sgs-form-review__cards' );
	if ( ! mount ) {
		return;
	}
	if ( ! wired.has( mount ) ) {
		wired.add( mount );
		mount.addEventListener( 'click', ( event ) => {
			const button = event.target.closest( '.sgs-form-review__edit' );
			if ( button ) {
				jumpToStep( formRoot, parseInt( button.getAttribute( 'data-step' ), 10 ) );
			}
		} );
	}
	while ( mount.firstChild ) {
		mount.removeChild( mount.firstChild );
	}

	const showEdit = review.getAttribute( 'data-show-edit' ) !== 'false';
	const editLabel = review.getAttribute( 'data-edit-label' ) || 'Edit';
	const steps = Array.from( formRoot.querySelectorAll( '.sgs-form-step' ) );
	const ownStep = review.closest( '.sgs-form-step' );
	const ownIndex = ownStep ? steps.indexOf( ownStep ) : steps.length;
	const sections = steps.length
		? steps.slice( 0, ownIndex ).map( ( step, index ) => ( {
			step,
			index,
			title: step.getAttribute( 'data-step-label' ) || '',
		} ) )
		: [ { step: formRoot, index: -1, title: '' } ];

	sections.forEach( ( section ) => {
		if ( section.index >= 0 && isStepSkipped( section.step ) ) {
			return;
		}
		const rows = answeredRows( section.step );
		if ( ! rows.length ) {
			return;
		}
		cardCounter += 1;
		const titleId = `sgs-form-review-card-${ cardCounter }`;
		const card = el( 'section', 'sgs-form-review__card' );
		const head = el( 'div', 'sgs-form-review__card-head' );
		const title = el( 'p', 'sgs-form-review__card-title' );
		appendAuthoredText( title, section.title, { links: false } );
		title.id = titleId;
		if ( section.title ) {
			card.setAttribute( 'aria-labelledby', titleId );
			head.appendChild( title );
		}
		if ( showEdit && section.index >= 0 ) {
			const button = el( 'button', 'sgs-form-review__edit', editLabel );
			button.type = 'button';
			button.setAttribute( 'data-step', String( section.index ) );
			if ( section.title ) {
				button.appendChild( el( 'span', 'sgs-form-review__edit-context', ' ' + section.title ) );
			}
			head.appendChild( button );
		}
		if ( head.firstChild ) {
			card.appendChild( head );
		}

		const list = el( 'dl', 'sgs-form-review__list' );
		rows.forEach( ( row ) => {
			const item = el( 'div', 'sgs-form-review__row' );
			item.appendChild( el( 'dt', 'sgs-form-review__term', row.label ) );
			item.appendChild( el( 'dd', 'sgs-form-review__detail', row.value ) );
			list.appendChild( item );
		} );
		card.appendChild( list );
		mount.appendChild( card );
	} );
}
