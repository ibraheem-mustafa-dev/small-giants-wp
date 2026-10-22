/**
 * SGS Form — the review step as one card per section (Spec 04 FR-4-11).
 *
 * Each earlier step becomes a card: the step's label as its title, an "Edit" button that jumps back to that step, and
 * a label/value row for every answered field. Built with safe DOM methods only, never innerHTML.
 *
 * @package SGS\Blocks
 */

let cardCounter = 0;
const wired = new WeakSet();

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
		const label = input.id ? field.querySelector( `label[for="${ input.id }"]` ) : null;
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

	return valueText;
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
		const labelEl = field.querySelector( 'label' );
		const label = labelEl ? labelEl.textContent.trim() : '';
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
		const rows = answeredRows( section.step );
		if ( ! rows.length ) {
			return;
		}
		cardCounter += 1;
		const titleId = `sgs-form-review-card-${ cardCounter }`;
		const card = el( 'section', 'sgs-form-review__card' );
		const head = el( 'div', 'sgs-form-review__card-head' );
		const title = el( 'p', 'sgs-form-review__card-title', section.title );
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
			list.appendChild( el( 'dt', 'sgs-form-review__term', row.label ) );
			list.appendChild( el( 'dd', 'sgs-form-review__detail', row.value ) );
		} );
		card.appendChild( list );
		mount.appendChild( card );
	} );
}
