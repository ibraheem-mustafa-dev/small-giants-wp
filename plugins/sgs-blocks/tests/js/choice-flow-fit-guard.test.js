/**
 * Fit guard (Spec 43 FR-43-24a): while a showcase flow's Fit to screen is active, a squeezed option card (padding or
 * row gap eaten) switches the fit off and the step scrolls; the fit returns only when the window is taller than the
 * height it switched at. A stacked flow and a flow without Fit to screen are never guarded.
 */
import { initFitGuard, isOptionSqueezed, FIT_CLASS, GUARD_CLASS } from '../../src/blocks/choice-flow/fit-guard';

const rect = ( top, bottom ) => ( { top, bottom, width: 100, height: bottom - top } );

/** One option button whose parts carry the given [top, bottom] rects; its box ends at `boxBottom`. */
function button( parts, boxBottom, { rowGap = '5px', paddingBottom = '18px' } = {} ) {
	const el = document.createElement( 'button' );
	el.style.rowGap = rowGap;
	el.style.paddingBottom = paddingBottom;
	el.getBoundingClientRect = () => rect( 0, boxBottom );
	parts.forEach( ( [ top, bottom ] ) => {
		const part = document.createElement( 'span' );
		part.getBoundingClientRect = () => rect( top, bottom );
		el.appendChild( part );
	} );
	return el;
}

test( 'content that clears its bottom padding and keeps the row gap is not squeezed', () => {
	expect( isOptionSqueezed( button( [ [ 0, 100 ], [ 110, 130 ] ], 150 ) ) ).toBe( false );
} );

test( 'content running into the bottom padding is squeezed', () => {
	expect( isOptionSqueezed( button( [ [ 0, 100 ], [ 110, 140 ] ], 150 ) ) ).toBe( true );
} );

test( 'two rows closer than the row gap are squeezed; parts sharing a row are not', () => {
	expect( isOptionSqueezed( button( [ [ 0, 100 ], [ 102, 120 ] ], 150 ) ) ).toBe( true );
	expect( isOptionSqueezed( button( [ [ 0, 100 ], [ 110, 128 ], [ 112, 126 ] ], 150 ) ) ).toBe( false );
} );

describe( 'initFitGuard', () => {
	let callbacks;
	let queue;
	const flush = () => queue.splice( 0 ).forEach( ( cb ) => cb() );
	let flow;
	let option;

	beforeEach( () => {
		callbacks = [];
		global.ResizeObserver = class {
			constructor( cb ) {
				callbacks.push( cb );
			}
			observe() {}
			disconnect() {}
		};
		queue = [];
		window.requestAnimationFrame = ( cb ) => queue.push( cb );
		document.body.innerHTML = '';
		flow = document.createElement( 'div' );
		flow.classList.add( FIT_CLASS );
		Object.defineProperty( flow, 'clientWidth', { value: 1200, configurable: true } );
		flow.innerHTML = '<div class="sgs-choice-flow__inner"><div class="sgs-form-step"></div></div>';
		option = button( [ [ 0, 100 ], [ 110, 140 ] ], 150 );
		const media = document.createElement( 'span' );
		media.className = 'sgs-choice-flow-question__option-media';
		media.getBoundingClientRect = () => rect( 0, 100 );
		option.appendChild( media );
		option.className = 'sgs-choice-flow-question__option-button';
		flow.querySelector( '.sgs-form-step' ).appendChild( option );
		document.body.appendChild( flow );
	} );

	test( 'a squeezed step is guarded and records the window height', () => {
		window.innerHeight = 570;
		initFitGuard( flow );
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( true );
	} );

	test( 'the guard holds at or below the recorded height and lifts above it', () => {
		window.innerHeight = 570;
		initFitGuard( flow );
		flush();
		option.getBoundingClientRect = () => rect( 0, 200 );
		window.innerHeight = 570;
		callbacks[ 0 ]();
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( true );
		window.innerHeight = 700;
		callbacks[ 0 ]();
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( false );
	} );

	test( 'a different visible step is measured afresh at the same window height', () => {
		window.innerHeight = 570;
		initFitGuard( flow );
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( true );
		const first = flow.querySelector( '.sgs-form-step' );
		first.hidden = true;
		const second = document.createElement( 'div' );
		second.className = 'sgs-form-step';
		const roomy = button( [ [ 0, 100 ], [ 110, 130 ] ], 200 );
		roomy.className = 'sgs-choice-flow-question__option-button';
		const media = document.createElement( 'span' );
		media.className = 'sgs-choice-flow-question__option-media';
		media.getBoundingClientRect = () => rect( 0, 100 );
		roomy.appendChild( media );
		second.appendChild( roomy );
		first.parentNode.appendChild( second );
		callbacks[ 0 ]();
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( false );
	} );

	test( 'a stacked flow is never guarded', () => {
		Object.defineProperty( flow, 'clientWidth', { value: 500, configurable: true } );
		window.innerHeight = 570;
		initFitGuard( flow );
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( false );
	} );

	test( 'a flow without Fit to screen is left alone', () => {
		flow.classList.remove( FIT_CLASS );
		window.innerHeight = 570;
		initFitGuard( flow );
		flush();
		expect( flow.classList.contains( GUARD_CLASS ) ).toBe( false );
	} );
} );
