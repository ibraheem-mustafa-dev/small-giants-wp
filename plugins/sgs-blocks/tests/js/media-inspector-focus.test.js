/**
 * Spec 49 C6 and §9.6: the `sgs/inspector-focus` store, the Background motion line that writes to it and the Effects
 * panel's controlled open (`useFocusRequest`).
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		Button: ( { children, onClick } ) => R.createElement( 'button', { type: 'button', onClick }, children ),
	};
} );
jest.mock( '@wordpress/a11y', () => ( { speak: jest.fn() } ) );
jest.mock( '@wordpress/data', () => {
	const open = jest.fn();
	const clear = jest.fn();
	return {
		__open: open,
		__clear: clear,
		createReduxStore: jest.fn( ( name, config ) => ( { name, ...config } ) ),
		register: jest.fn(),
		select: jest.fn( () => undefined ),
		useSelect: ( fn ) => fn( () => ( { getRequest: () => global.__request || null } ) ),
		useDispatch: () => ( { open, clear } ),
	};
} );

const data = require( '@wordpress/data' );
const { speak } = require( '@wordpress/a11y' );
const { actions, selectors, reducer, nextRequestId, INSPECTOR_FOCUS_STORE } = require( '../../src/components/media/inspector-focus-store.js' );
const { motionLineText, motionLineButton, backgroundTarget } = require( '../../src/components/media/panels/motion-line.js' );
const MotionLine = require( '../../src/components/media/panels/MotionLine.js' ).default;
const { useFocusRequest } = require( '../../src/blocks/extensions/motion/EffectsPanel.js' );

function mount( element ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( element ) );
	return { container, root };
}

describe( 'the sgs/inspector-focus store (C6)', () => {
	it( 'is registered once under its name', () => {
		expect( INSPECTOR_FOCUS_STORE ).toBe( 'sgs/inspector-focus' );
		expect( data.register ).toHaveBeenCalledTimes( 1 );
		expect( data.createReduxStore.mock.calls[ 0 ][ 0 ] ).toBe( 'sgs/inspector-focus' );
	} );

	it( 'open records a request per block, getRequest reads it and clear removes it', () => {
		let state = reducer( undefined, { type: '@@INIT' } );
		expect( selectors.getRequest( state, 'a' ) ).toBeNull();
		state = reducer( state, actions.open( { clientId: 'a', panel: 'effects', target: 'background', requestId: 1 } ) );
		state = reducer( state, actions.open( { clientId: 'b', panel: 'effects', target: 'media', requestId: 2 } ) );
		expect( selectors.getRequest( state, 'a' ) ).toEqual( { panel: 'effects', target: 'background', requestId: 1 } );
		expect( selectors.getRequest( state, 'b' ).target ).toBe( 'media' );
		state = reducer( state, actions.clear( 'a' ) );
		expect( selectors.getRequest( state, 'a' ) ).toBeNull();
		expect( selectors.getRequest( state, 'b' ) ).not.toBeNull();
	} );

	it( 'clearing a block with no request keeps the same state object', () => {
		const state = reducer( undefined, { type: '@@INIT' } );
		expect( reducer( state, actions.clear( 'none' ) ) ).toBe( state );
	} );

	it( 'request ids rise', () => {
		const first = nextRequestId();
		expect( nextRequestId() ).toBeGreaterThan( first );
	} );
} );

describe( 'the Background motion line (§9.6)', () => {
	const layer = ( effect, intensity ) => ( { id: effect, effect, intensity } );

	it( 'says none and offers Choose motion when nothing is set', () => {
		expect( motionLineText( [] ) ).toBe( 'Background motion: none' );
		expect( motionLineButton( [] ) ).toBe( 'Choose motion' );
	} );

	it( 'names one effect with its intensity, then offers Change', () => {
		const layers = [ layer( 'parallax', 'subtle' ) ];
		expect( motionLineText( layers ) ).toBe( 'Background motion: Parallax, gentle' );
		expect( motionLineButton( layers ) ).toBe( 'Change' );
	} );

	it( 'names the first two effects and counts the rest', () => {
		const three = [ layer( 'parallax', 'subtle' ), layer( 'ken-burns' ), layer( 'ambient-float' ) ];
		expect( motionLineText( three ) ).toMatch( /^Background motion: Parallax, gentle and .+ \+1$/ );
		expect( motionLineText( three.slice( 0, 2 ) ) ).not.toMatch( /\+\d/ );
	} );

	it( 'targets the part that matches the kind', () => {
		expect( backgroundTarget( 'image' ) ).toBe( 'background' );
		expect( backgroundTarget( 'video' ) ).toBe( 'background-video' );
		expect( backgroundTarget( 'svg' ) ).toBe( 'svg-bg' );
	} );

	it( 'the button dispatches open with the target and a rising requestId, and creates no motion', () => {
		data.__open.mockClear();
		const attributes = { sgsMotion: { elements: { background: { effects: [ layer( 'parallax', 'subtle' ) ] } } } };
		const { container } = mount( React.createElement( MotionLine, { clientId: 'blk', attributes, kind: 'image' } ) );
		expect( container.textContent ).toContain( 'Background motion: Parallax, gentle' );
		const button = container.querySelector( 'button' );
		act( () => button.click() );
		act( () => button.click() );
		const [ one, two ] = data.__open.mock.calls.map( ( c ) => c[ 0 ] );
		expect( one ).toMatchObject( { clientId: 'blk', panel: 'effects', target: 'background' } );
		expect( two.requestId ).toBeGreaterThan( one.requestId );
		expect( JSON.stringify( attributes ) ).not.toContain( 'ken-burns' );
	} );

	it( 'a video background targets background-video', () => {
		data.__open.mockClear();
		const { container } = mount( React.createElement( MotionLine, { clientId: 'blk', attributes: {}, kind: 'video' } ) );
		expect( container.textContent ).toContain( 'Background motion: none' );
		act( () => container.querySelector( 'button' ).click() );
		expect( data.__open.mock.calls[ 0 ][ 0 ].target ).toBe( 'background-video' );
	} );
} );

describe( 'the controlled Effects panel (useFocusRequest)', () => {
	function Probe( { onRequest } ) {
		const focus = useFocusRequest( {
			clientId: 'blk',
			onRequest,
			announce: ( request ) => `Effects opened on ${ request.target }.`,
		} );
		return React.createElement(
			'div',
			{ className: 'components-panel__body', 'data-opened': String( focus.opened ) },
			React.createElement( 'span', { ref: focus.ref, hidden: true } ),
			React.createElement( 'h2', { className: 'components-panel__body-title' }, React.createElement( 'button', { type: 'button', id: 'heading' }, 'Effects' ) )
		);
	}

	beforeEach( () => {
		jest.useFakeTimers();
		window.requestAnimationFrame = ( fn ) => setTimeout( fn, 0 );
		speak.mockClear();
		data.__clear.mockClear();
	} );
	afterEach( () => {
		jest.useRealTimers();
		global.__request = null;
	} );

	it( 'does nothing without a request', () => {
		const onRequest = jest.fn();
		const { container } = mount( React.createElement( Probe, { onRequest } ) );
		act( () => jest.runAllTimers() );
		expect( onRequest ).not.toHaveBeenCalled();
		expect( container.firstChild.dataset.opened ).toBe( 'false' );
		expect( speak ).not.toHaveBeenCalled();
	} );

	it( 'a request opens the panel, selects the target, focuses the heading, announces and clears', () => {
		global.__request = { panel: 'effects', target: 'background', requestId: 7 };
		const onRequest = jest.fn();
		const { container } = mount( React.createElement( Probe, { onRequest } ) );
		act( () => jest.runAllTimers() );
		expect( onRequest ).toHaveBeenCalledWith( global.__request );
		expect( container.firstChild.dataset.opened ).toBe( 'true' );
		expect( document.activeElement.id ).toBe( 'heading' );
		expect( speak ).toHaveBeenCalledWith( 'Effects opened on background.', 'polite' );
		expect( data.__clear ).toHaveBeenCalledWith( 'blk' );
	} );

	it( 'ignores a request for another panel', () => {
		global.__request = { panel: 'hover', target: 'background', requestId: 8 };
		const onRequest = jest.fn();
		mount( React.createElement( Probe, { onRequest } ) );
		act( () => jest.runAllTimers() );
		expect( onRequest ).not.toHaveBeenCalled();
	} );
} );
