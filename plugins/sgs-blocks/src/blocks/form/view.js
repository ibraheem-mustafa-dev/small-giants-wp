/**
 * SGS Form — Interactivity API Store
 *
 * Handles multi-step form navigation, validation, and submission.
 * Uses WordPress Interactivity API for reactive state management.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'sgs/form', {
	state: {
		/**
		 * Calculate progress bar width based on current step.
		 *
		 * @return {string} Width percentage (e.g., "33%").
		 */
		get progressWidth() {
			const ctx = getContext();
			if ( ! ctx.isMultiStep || ctx.totalSteps === 0 ) {
				return '0%';
			}
			const percent = ( ( ctx.currentStep + 1 ) / ctx.totalSteps ) * 100;
			return `${ Math.round( percent ) }%`;
		},

		/**
		 * Check if currently on first step.
		 *
		 * @return {boolean} True if on first step.
		 */
		get isFirstStep() {
			const ctx = getContext();
			return ctx.currentStep === 0;
		},

		/**
		 * Check if currently on last step.
		 *
		 * @return {boolean} True if on last step.
		 */
		get isLastStep() {
			const ctx = getContext();
			return ctx.currentStep >= ctx.totalSteps - 1;
		},

		/**
		 * Check if a specific step is active (used by progress step buttons).
		 *
		 * @return {boolean} True if this step button represents the current step.
		 */
		get isStepActive() {
			const ctx = getContext();
			return ctx.stepIndex === ctx.currentStep;
		},

		/**
		 * Check if a specific step is completed (used by progress step buttons).
		 *
		 * @return {boolean} True if this step is before the current step.
		 */
		get isStepCompleted() {
			const ctx = getContext();
			return ctx.stepIndex < ctx.currentStep;
		},
	},

	actions: {
		/**
		 * Navigate to the next step.
		 * Validates current step fields before proceeding.
		 */
		nextStep() {
			const ctx = getContext();
			const { ref } = getElement();
			const formRoot = ref.closest( '[data-wp-interactive="sgs/form"]' );

			if ( ! formRoot ) {
				return;
			}

			// Get current step element.
			const currentStepEl = formRoot.querySelectorAll(
				'.sgs-form-step'
			)[ ctx.currentStep ];

			if ( ! currentStepEl ) {
				return;
			}

			// Validate all fields in current step.
			const fields = currentStepEl.querySelectorAll(
				'input, select, textarea'
			);
			let isValid = true;

			fields.forEach( ( field ) => {
				if ( ! field.checkValidity() ) {
					field.reportValidity();
					isValid = false;
				}
			} );

			if ( ! isValid ) {
				return;
			}

			// Move to next step.
			if ( ctx.currentStep < ctx.totalSteps - 1 ) {
				ctx.currentStep++;
				updateStepVisibility( formRoot, ctx.currentStep );
				formRoot.scrollIntoView( {
					behavior: 'smooth',
					block: 'start',
				} );
			}
		},

		/**
		 * Navigate to the previous step.
		 */
		prevStep() {
			const ctx = getContext();
			const { ref } = getElement();
			const formRoot = ref.closest( '[data-wp-interactive="sgs/form"]' );

			if ( ! formRoot ) {
				return;
			}

			if ( ctx.currentStep > 0 ) {
				ctx.currentStep--;
				updateStepVisibility( formRoot, ctx.currentStep );
				formRoot.scrollIntoView( {
					behavior: 'smooth',
					block: 'start',
				} );
			}
		},

		/**
		 * Navigate to a specific step (from progress bar button).
		 * Only allows navigating to current step or earlier.
		 */
		goToStep() {
			const ctx = getContext();
			const { ref } = getElement();
			const formRoot = ref.closest( '[data-wp-interactive="sgs/form"]' );

			if ( ! formRoot ) {
				return;
			}

			// Only allow navigating backwards or to current step.
			if ( ctx.stepIndex <= ctx.currentStep ) {
				ctx.currentStep = ctx.stepIndex;
				updateStepVisibility( formRoot, ctx.currentStep );
				formRoot.scrollIntoView( {
					behavior: 'smooth',
					block: 'start',
				} );
			}
		},

		/**
		 * Submit the form.
		 * Validates all fields, collects data, and sends to REST endpoint.
		 *
		 * @param {Event} event Submit event.
		 */
		*submitForm( event ) {
			event.preventDefault();

			const ctx = getContext();
			const { ref } = getElement();
			const formRoot = ref.closest( '[data-wp-interactive="sgs/form"]' );
			const formEl = formRoot.querySelector( 'form' );

			if ( ! formEl ) {
				return;
			}

			// Validate entire form.
			if ( ! formEl.checkValidity() ) {
				formEl.reportValidity();
				return;
			}

			ctx.submitting = true;
			ctx.errorMessage = '';

			try {
				// Collect form data.
				const formData = new FormData( formEl );
				const fields = {};
				let honeypotValue = '';

				// Convert FormData to object, handling arrays for checkboxes/tiles.
				for ( const [ key, value ] of formData.entries() ) {
					// Capture honeypot value separately.
					if ( key.startsWith( 'sgs_hp_' ) ) {
						honeypotValue = value;
						continue;
					}

					// Skip internal fields.
					if ( key.startsWith( '_sgs_' ) ) {
						continue;
					}

					// Handle multiple values (checkboxes, tiles).
					if ( fields[ key ] ) {
						if ( ! Array.isArray( fields[ key ] ) ) {
							fields[ key ] = [ fields[ key ] ];
						}
						fields[ key ].push( value );
					} else {
						fields[ key ] = value;
					}
				}

				// Collect file attachment IDs.
				const fileInputs = formEl.querySelectorAll(
					'input[data-file-id]'
				);
				const fileIds = [];
				fileInputs.forEach( ( input ) => {
					const fileId = parseInt(
						input.getAttribute( 'data-file-id' ),
						10
					);
					if ( fileId ) {
						fileIds.push( fileId );
					}
				} );

				// Submit to REST endpoint.
				const response = yield fetch(
					state.restUrl + 'submit',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'X-WP-Nonce': state.nonce,
						},
						body: JSON.stringify( {
							formId: ctx.formId,
							fields,
							fileIds,
							honeypot: honeypotValue,
							storeSubmissions: formRoot.getAttribute( 'data-store-submissions' ) !== 'false',
						} ),
					}
				);

				if ( ! response.ok ) {
					const errorData = yield response.json();
					throw new Error(
						errorData.message ||
							'Submission failed. Please try again.'
					);
				}

				// Success.
				ctx.submitted = true;
				ctx.submitting = false;

				// Redirect if configured.
				if ( ctx.successRedirect ) {
					window.location.href = ctx.successRedirect;
				}
			} catch ( error ) {
				ctx.errorMessage =
					error.message ||
					'An error occurred. Please try again later.';
				ctx.submitting = false;
			}
		},

		/**
		 * Toggle a tile checkbox/radio (for tile-based selection fields).
		 */
		toggleTile() {
			const { ref } = getElement();

			// Find the input inside the clicked label.
			const input = ref.querySelector( 'input' );
			if ( ! input ) {
				return;
			}

			// Toggle the input.
			if ( input.type === 'checkbox' ) {
				input.checked = ! input.checked;
			} else if ( input.type === 'radio' ) {
				input.checked = true;
			}

			// Dispatch change event for validation.
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );

			// Toggle selected class on the label.
			ref.classList.toggle( 'sgs-form-tile--selected', input.checked );
		},

		/**
		 * Upload a file to WordPress media library.
		 *
		 * @param {Event} event Change event from file input.
		 */
		*uploadFile( event ) {
			const input = event.target;
			const file = input.files[ 0 ];

			if ( ! file ) {
				return;
			}

			const fieldWrapper = input.closest( '.sgs-form-field' );
			if ( ! fieldWrapper ) {
				return;
			}

			const progressEl = fieldWrapper.querySelector(
				'.sgs-form-file__progress'
			);
			const previewEl = fieldWrapper.querySelector(
				'.sgs-form-file__preview'
			);
			const hiddenInput = fieldWrapper.querySelector(
				'input[data-file-id]'
			);

			// Show progress indicator.
			if ( progressEl ) {
				progressEl.hidden = false;
			}

			try {
				// Upload file.
				const formData = new FormData();
				formData.append( 'file', file );

				const response = yield fetch(
					state.restUrl + 'upload',
					{
						method: 'POST',
						headers: {
							'X-WP-Nonce': state.nonce,
						},
						body: formData,
					}
				);

				if ( ! response.ok ) {
					throw new Error( 'Upload failed' );
				}

				const result = yield response.json();

				// Store attachment ID in hidden input.
				if ( hiddenInput && result.id ) {
					hiddenInput.setAttribute( 'data-file-id', result.id );
				}

				// Show file name preview.
				if ( previewEl ) {
					// Clear existing content safely.
					while ( previewEl.firstChild ) {
						previewEl.removeChild( previewEl.firstChild );
					}

					const nameEl = document.createElement( 'span' );
					nameEl.className = 'sgs-form-file__name';
					nameEl.textContent = file.name;

					previewEl.appendChild( nameEl );
					previewEl.hidden = false;
				}

				// Hide progress indicator.
				if ( progressEl ) {
					progressEl.hidden = true;
				}
			} catch ( error ) {
				// Show error.
				if ( previewEl ) {
					// Clear existing content safely.
					while ( previewEl.firstChild ) {
						previewEl.removeChild( previewEl.firstChild );
					}

					const errorEl = document.createElement( 'span' );
					errorEl.className = 'sgs-form-file__error';
					errorEl.textContent =
						'Upload failed. Please try again.';

					previewEl.appendChild( errorEl );
					previewEl.hidden = false;
				}

				// Hide progress indicator.
				if ( progressEl ) {
					progressEl.hidden = true;
				}
			}
		},
	},
} );

/**
 * Update step visibility based on current step index.
 *
 * @param {HTMLElement} formRoot Form wrapper element.
 * @param {number}      currentStep Current step index.
 */
function updateStepVisibility( formRoot, currentStep ) {
	const steps = formRoot.querySelectorAll( '.sgs-form-step' );

	steps.forEach( ( step, index ) => {
		step.hidden = index !== currentStep;
	} );

	// If current step contains a review block, populate it.
	const currentStepEl = steps[ currentStep ];
	if ( currentStepEl ) {
		const reviewList = currentStepEl.querySelector(
			'.sgs-form-review__list'
		);
		if ( reviewList ) {
			populateReview( formRoot, reviewList );
		}
	}
}

/**
 * Populate review summary with all field values.
 * Uses safe DOM methods only — no innerHTML.
 *
 * @param {HTMLElement} formRoot Form wrapper element.
 * @param {HTMLElement} reviewList Review list element (dl).
 */
function populateReview( formRoot, reviewList ) {
	// Clear existing content safely.
	while ( reviewList.firstChild ) {
		reviewList.removeChild( reviewList.firstChild );
	}

	// Get all form fields.
	const fields = formRoot.querySelectorAll( '.sgs-form-field' );

	fields.forEach( ( field ) => {
		const labelEl = field.querySelector( 'label' );
		const labelText = labelEl ? labelEl.textContent.trim() : '';

		if ( ! labelText ) {
			return;
		}

		let valueText = '';

		// Text, email, phone, textarea, hidden.
		const textInput = field.querySelector(
			'input[type="text"], input[type="email"], input[type="tel"], input[type="hidden"], textarea'
		);
		if ( textInput && textInput.value ) {
			valueText = textInput.value;
		}

		// Select.
		const selectEl = field.querySelector( 'select' );
		if ( selectEl && selectEl.value ) {
			const selectedOption = selectEl.querySelector(
				'option:checked'
			);
			valueText = selectedOption
				? selectedOption.textContent
				: selectEl.value;
		}

		// Radio buttons.
		const checkedRadio = field.querySelector(
			'input[type="radio"]:checked'
		);
		if ( checkedRadio ) {
			const radioLabel = field.querySelector(
				`label[for="${ checkedRadio.id }"]`
			);
			valueText = radioLabel
				? radioLabel.textContent.trim()
				: checkedRadio.value;
		}

		// Checkboxes.
		const checkedBoxes = field.querySelectorAll(
			'input[type="checkbox"]:checked'
		);
		if ( checkedBoxes.length > 0 ) {
			const values = [];
			checkedBoxes.forEach( ( checkbox ) => {
				const checkboxLabel = field.querySelector(
					`label[for="${ checkbox.id }"]`
				);
				values.push(
					checkboxLabel
						? checkboxLabel.textContent.trim()
						: checkbox.value
				);
			} );
			valueText = values.join( ', ' );
		}

		// Tiles (similar to checkboxes/radio).
		const checkedTiles = field.querySelectorAll(
			'.sgs-form-tile input:checked'
		);
		if ( checkedTiles.length > 0 ) {
			const values = [];
			checkedTiles.forEach( ( tileInput ) => {
				const tileLabel = tileInput.closest( 'label' );
				if ( tileLabel ) {
					const tileLabelText =
						tileLabel.querySelector( '.sgs-form-tile__label' );
					values.push(
						tileLabelText
							? tileLabelText.textContent.trim()
							: tileInput.value
					);
				}
			} );
			valueText = values.join( ', ' );
		}

		// File upload.
		const filePreview = field.querySelector( '.sgs-form-file__name' );
		if ( filePreview ) {
			valueText = filePreview.textContent;
		}

		// Consent.
		const consentCheckbox = field.querySelector(
			'input[type="checkbox"]'
		);
		if (
			field.classList.contains( 'sgs-form-field--consent' ) &&
			consentCheckbox
		) {
			valueText = consentCheckbox.checked ? 'Yes' : 'No';
		}

		// Only add to review if we have a value.
		if ( ! valueText ) {
			return;
		}

		// Create dt and dd elements safely.
		const dt = document.createElement( 'dt' );
		dt.className = 'sgs-form-review__term';
		dt.textContent = labelText;

		const dd = document.createElement( 'dd' );
		dd.className = 'sgs-form-review__detail';
		dd.textContent = valueText;

		reviewList.appendChild( dt );
		reviewList.appendChild( dd );
	} );
}

/**
 * Initialise forms on page load.
 * Sets up initial step visibility for multi-step forms.
 */
function initForms() {
	const forms = document.querySelectorAll(
		'[data-wp-interactive="sgs/form"]'
	);

	forms.forEach( ( formRoot ) => {
		const steps = formRoot.querySelectorAll( '.sgs-form-step' );

		if ( steps.length > 1 ) {
			// Multi-step form: hide all steps except first.
			steps.forEach( ( step, index ) => {
				step.hidden = index !== 0;
			} );
		}
	} );
}

// Run initialisation when DOM is ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initForms );
} else {
	initForms();
}
