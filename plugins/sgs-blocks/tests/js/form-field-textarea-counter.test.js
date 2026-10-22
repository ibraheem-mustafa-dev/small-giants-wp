/**
 * The textarea's live character counter (Spec 04 FR-4-5): it shows "<typed> / <max>", follows typing, and never
 * reads past the maximum.
 */

import { updateCounter, initCounters } from '../../src/blocks/form-field-textarea/view';

/**
 * Mount a textarea with its counter, as field_counter() prints them.
 *
 * @param {number} max   The counter's maximum.
 * @param {string} value The textarea's starting text.
 * @return {{textarea: HTMLTextAreaElement, counter: HTMLElement}} The two elements.
 */
function mount( max, value = '' ) {
	document.body.innerHTML =
		'<textarea id="sgs-field-msg"></textarea>' +
		`<span class="sgs-form-field__counter" aria-live="polite" data-sgs-counter-for="sgs-field-msg" data-sgs-counter-max="${ max }">0 / ${ max }</span>`;
	const textarea = document.getElementById( 'sgs-field-msg' );
	textarea.value = value;
	return { textarea, counter: document.querySelector( '.sgs-form-field__counter' ) };
}

describe( 'textarea counter', () => {
	test( 'updateCounter writes "<typed> / <max>"', () => {
		const { textarea, counter } = mount( 800, 'hello' );
		expect( updateCounter( textarea, counter ) ).toBe( '5 / 800' );
		expect( counter.textContent ).toBe( '5 / 800' );
	} );

	test( 'the count never reads past the maximum', () => {
		const { textarea, counter } = mount( 3, 'abcdef' );
		expect( updateCounter( textarea, counter ) ).toBe( '3 / 3' );
	} );

	test( 'initCounters starts from the existing text and follows typing', () => {
		const { textarea, counter } = mount( 800, 'abc' );
		expect( initCounters() ).toBe( 1 );
		expect( counter.textContent ).toBe( '3 / 800' );
		textarea.value = 'abcdefgh';
		textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		expect( counter.textContent ).toBe( '8 / 800' );
	} );

	test( 'initCounters does not bind the same textarea twice', () => {
		mount( 800 );
		expect( initCounters() ).toBe( 1 );
		expect( initCounters() ).toBe( 0 );
	} );

	test( 'a counter with no matching textarea is skipped', () => {
		document.body.innerHTML = '<span class="sgs-form-field__counter" data-sgs-counter-for="nope" data-sgs-counter-max="5">0 / 5</span>';
		expect( initCounters() ).toBe( 0 );
	} );
} );
