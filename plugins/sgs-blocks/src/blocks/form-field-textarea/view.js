/**
 * Live character counter for the SGS textarea field (Spec 04 FR-4-5).
 *
 * field_counter() in includes/forms/field-render-helpers.php prints
 * `<span class="sgs-form-field__counter" data-sgs-counter-for="<textarea id>" data-sgs-counter-max="<n>">`.
 * This module keeps its text as "<typed> / <max>" while the visitor types. The textarea's own maxlength
 * attribute stops typing at the limit.
 *
 * @package SGS\Blocks
 */

/**
 * Write the textarea's current length into its counter.
 *
 * @param {HTMLTextAreaElement} textarea The field.
 * @param {HTMLElement}         counter  The counter span.
 * @return {string} The text written.
 */
export function updateCounter( textarea, counter ) {
	const max = parseInt( counter.getAttribute( 'data-sgs-counter-max' ), 10 ) || 0;
	const used = max > 0 ? Math.min( textarea.value.length, max ) : textarea.value.length;
	const text = `${ used } / ${ max }`;
	counter.textContent = text;
	return text;
}

/**
 * Bind every counter under a root to its textarea.
 *
 * @param {ParentNode} root Where to look (the document by default).
 * @return {number} How many counters were bound.
 */
export function initCounters( root = document ) {
	let bound = 0;
	root.querySelectorAll( '.sgs-form-field__counter[data-sgs-counter-for]' ).forEach( ( counter ) => {
		const textarea = ( root.ownerDocument || root ).getElementById( counter.getAttribute( 'data-sgs-counter-for' ) );
		if ( ! textarea || textarea.hasAttribute( 'data-sgs-counter-bound' ) ) {
			return;
		}
		textarea.setAttribute( 'data-sgs-counter-bound', '' );
		textarea.addEventListener( 'input', () => updateCounter( textarea, counter ) );
		updateCounter( textarea, counter );
		bound += 1;
	} );
	return bound;
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', () => initCounters() );
} else {
	initCounters();
}
