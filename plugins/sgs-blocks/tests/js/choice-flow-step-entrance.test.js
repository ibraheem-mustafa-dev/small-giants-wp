/**
 * A choice-flow step's rise-in: `.is-entering` is added, the step is un-hidden, the browser is made to compute that
 * start state, and the class is removed a frame later, which is what starts the CSS transition. Without the forced
 * style computation between add and remove (Back has none of its own; forward gets one from scrollIntoView) the
 * browser never sees the start state and the step appears at rest. The same entrance replays when the pop-up opens.
 */

jest.mock(
	'@wordpress/interactivity',
	() => ( { store: () => ( {} ), getContext: () => ( {} ), getElement: () => ( {} ), getConfig: () => ( {} ) } ),
	{ virtual: true }
);

const log = [];
let frameCallbacks = [];

beforeEach( () => {
	log.length = 0;
	frameCallbacks = [];
	window.requestAnimationFrame = ( cb ) => {
		frameCallbacks.push( cb );
		return frameCallbacks.length;
	};
	Object.defineProperty( HTMLElement.prototype, 'offsetWidth', {
		configurable: true,
		get() {
			log.push( 'reflow' );
			return 100;
		},
	} );
	document.body.innerHTML = `
		<div class="sgs-choice-flow" data-wp-interactive="sgs/choice-flow">
			<div class="sgs-form-step" hidden></div>
			<div class="sgs-form-step"></div>
		</div>`;
	document.querySelectorAll( '.sgs-form-step' ).forEach( ( el, i ) => {
		const add = el.classList.add.bind( el.classList );
		const remove = el.classList.remove.bind( el.classList );
		el.classList.add = ( c ) => {
			log.push( `add:${ i }` );
			add( c );
		};
		el.classList.remove = ( c ) => {
			log.push( `remove:${ i }` );
			remove( c );
		};
	} );
} );

const runFrames = () => {
	const cbs = frameCallbacks;
	frameCallbacks = [];
	cbs.forEach( ( cb ) => cb() );
};

test( 'showStepByIndex computes the start state between adding and removing the entering class (Back path)', () => {
	const { showStepByIndex } = require( '../../src/blocks/choice-flow/flow-steps' );
	const flow = document.querySelector( '.sgs-choice-flow' );
	showStepByIndex( flow, 0 );
	runFrames();
	const mine = log.filter( ( l ) => l === 'add:0' || l === 'remove:0' || l === 'reflow' );
	expect( mine.indexOf( 'add:0' ) ).toBeGreaterThanOrEqual( 0 );
	const between = mine.slice( mine.indexOf( 'add:0' ), mine.indexOf( 'remove:0' ) );
	expect( between ).toContain( 'reflow' );
} );

test( 'replayStepEntrance replays the visible step on every call', () => {
	const { replayStepEntrance } = require( '../../src/blocks/choice-flow/flow-steps' );
	const flow = document.querySelector( '.sgs-choice-flow' );
	for ( let open = 0; open < 2; open++ ) {
		log.length = 0;
		replayStepEntrance( flow );
		expect( log.slice( 0, 2 ) ).toEqual( [ 'add:1', 'reflow' ] );
		expect( flow.querySelectorAll( '.sgs-form-step' )[ 1 ].classList.contains( 'is-entering' ) ).toBe( true );
		runFrames();
		expect( log ).toContain( 'remove:1' );
		expect( flow.querySelectorAll( '.sgs-form-step' )[ 1 ].classList.contains( 'is-entering' ) ).toBe( false );
	}
} );

test( 'replayStepEntrance does nothing under reduced motion', () => {
	window.matchMedia = () => ( { matches: true } );
	const { replayStepEntrance } = require( '../../src/blocks/choice-flow/flow-steps' );
	replayStepEntrance( document.querySelector( '.sgs-choice-flow' ) );
	expect( log ).toEqual( [] );
	delete window.matchMedia;
} );
