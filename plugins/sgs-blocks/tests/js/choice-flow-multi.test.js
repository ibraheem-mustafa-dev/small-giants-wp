/**
 * A choice-flow question that takes more than one answer (Spec 43 FR-43-27): count rules, toggling with a refusal
 * message, and the single cart-line row the picks travel in.
 */
import { parseLimits, canAddAnswer, meetsLeast, joinAnswerLabels, toggleMultiOption, chosenButtons, routingButton } from '../../src/blocks/choice-flow/flow-multi.js';
import { recordPlainAnswer, collectFlowFields } from '../../src/blocks/choice-flow/flow-fields.js';

const SELECTED = 'sgs-choice-flow-question__option-button--selected';

/**
 * A step holding one question of four options.
 *
 * @param {Object|null} limits Optional `{ min, max }` written as data attributes.
 * @return {{flow: HTMLElement, step: HTMLElement, buttons: HTMLElement[]}} The built DOM.
 */
function build( limits ) {
	document.body.innerHTML = '';
	const flow = document.createElement( 'div' );
	const attrs = limits ? ` data-answers-min="${ limits.min }" data-answers-max="${ limits.max }"` : '';
	const labels = [ 'Chocolate chip', 'Biscoff', 'Oreo', 'Plain' ];
	flow.innerHTML = `<div class="sgs-form-step" data-step-label="Flavour"><div class="sgs-choice-flow-question"${ attrs }>
		<ul class="sgs-choice-flow-question__options">${ labels
			.map( ( l, i ) => `<li><button type="button" class="sgs-choice-flow-question__option-button" data-value="v${ i }" data-next-step-id="${ i === 1 ? '3' : '' }"${ limits ? ' role="checkbox" aria-checked="false"' : '' }><span class="sgs-choice-flow-question__option-label">${ l }</span></button></li>` )
			.join( '' ) }</ul>
		<p class="sgs-choice-flow-question__limit-message" role="status" aria-live="polite" data-message="You can pick up to 3 answers."></p>
	</div></div>`;
	document.body.appendChild( flow );
	const step = flow.querySelector( '.sgs-form-step' );
	return { flow, step, buttons: [ ...flow.querySelectorAll( 'button' ) ] };
}

describe( 'count rules', () => {
	test( 'limits default to 1 and 1 and clamp the least to the most', () => {
		expect( parseLimits( null, null ) ).toEqual( { min: 1, max: 1 } );
		expect( parseLimits( '1', '1' ) ).toEqual( { min: 1, max: 1 } );
		expect( parseLimits( '1', '3' ) ).toEqual( { min: 1, max: 3 } );
		expect( parseLimits( '9', '3' ) ).toEqual( { min: 3, max: 3 } );
		expect( parseLimits( 'x', '3' ) ).toEqual( { min: 1, max: 3 } );
	} );
	test( 'a pick is allowed below the most, the least gates Continue', () => {
		expect( canAddAnswer( 2, 3 ) ).toBe( true );
		expect( canAddAnswer( 3, 3 ) ).toBe( false );
		expect( meetsLeast( 0, 1 ) ).toBe( false );
		expect( meetsLeast( 1, 1 ) ).toBe( true );
	} );
	test( 'labels join with a comma and space in the order given', () => {
		expect( joinAnswerLabels( [ 'Chocolate chip', 'Biscoff', 'Oreo' ] ) ).toBe( 'Chocolate chip, Biscoff, Oreo' );
	} );
} );

describe( 'a 1 to 3 question', () => {
	test( 'refuses a fourth pick with the message, and a deselect frees a slot', () => {
		const { flow, buttons } = build( { min: 1, max: 3 } );
		const region = flow.querySelector( '.sgs-choice-flow-question__limit-message' );
		jest.spyOn( window, 'requestAnimationFrame' ).mockImplementation( ( cb ) => cb() );

		expect( buttons.slice( 0, 3 ).map( toggleMultiOption ) ).toEqual( [ true, true, true ] );
		expect( toggleMultiOption( buttons[ 3 ] ) ).toBe( false );
		expect( buttons[ 3 ].classList.contains( SELECTED ) ).toBe( false );
		expect( buttons[ 3 ].getAttribute( 'aria-checked' ) ).toBe( 'false' );
		expect( region.textContent ).toBe( 'You can pick up to 3 answers.' );

		expect( toggleMultiOption( buttons[ 0 ] ) ).toBe( true );
		expect( buttons[ 0 ].getAttribute( 'aria-checked' ) ).toBe( 'false' );
		expect( region.textContent ).toBe( '' );
		expect( toggleMultiOption( buttons[ 3 ] ) ).toBe( true );
	} );

	test( 'the picks record as ONE answer row, labels joined in the order shown', () => {
		const { flow, step, buttons } = build( { min: 1, max: 3 } );
		// Picked out of order: Oreo, then Chocolate chip, then Biscoff.
		[ buttons[ 2 ], buttons[ 0 ], buttons[ 1 ] ].forEach( ( b ) => {
			toggleMultiOption( b );
			recordPlainAnswer( flow, 0, step, b );
		} );
		const rows = collectFlowFields( flow, document.createElement( 'div' ) );
		expect( rows ).toEqual( [ { label: 'Flavour', value: 'Chocolate chip, Biscoff, Oreo' } ] );
	} );

	test( 'toggling every pick off removes the row; branching follows the first routed pick', () => {
		const { flow, step, buttons } = build( { min: 1, max: 3 } );
		toggleMultiOption( buttons[ 0 ] );
		recordPlainAnswer( flow, 0, step, buttons[ 0 ] );
		toggleMultiOption( buttons[ 0 ] );
		recordPlainAnswer( flow, 0, step, buttons[ 0 ] );
		expect( collectFlowFields( flow, document.createElement( 'div' ) ) ).toEqual( [] );

		toggleMultiOption( buttons[ 0 ] );
		toggleMultiOption( buttons[ 1 ] );
		toggleMultiOption( buttons[ 2 ] );
		expect( routingButton( chosenButtons( buttons[ 0 ] ) ) ).toBe( buttons[ 1 ] );
	} );
} );

describe( 'a default question (negative control)', () => {
	test( 'is one answer: the clicked option alone, joined to nothing', () => {
		const { flow, step, buttons } = build( null );
		expect( chosenButtons( buttons[ 2 ] ) ).toEqual( [ buttons[ 2 ] ] );
		recordPlainAnswer( flow, 0, step, buttons[ 2 ] );
		expect( collectFlowFields( flow, document.createElement( 'div' ) ) ).toEqual( [ { label: 'Flavour', value: 'Oreo' } ] );
	} );
} );
