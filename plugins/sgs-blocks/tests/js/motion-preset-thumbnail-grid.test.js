/**
 * The preset gallery (Spec 38A §11, FR-38A-28, FR-38A-29): a radio group with one tab stop, arrow-key focus movement,
 * aria-checked on the radios, and a memoised child that skips a re-render when the panel rebuilds the same options.
 */
const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );

// The shared components mock drops a button's role, aria and tabindex props; this one passes them through.
jest.mock( '@wordpress/components', () => {
	const ReactLib = require( 'react' );
	return {
		Button: ReactLib.forwardRef( ( { children, ...rest }, ref ) =>
			ReactLib.createElement( 'button', { ref, type: 'button', ...rest }, children )
		),
	};
} );

const mockRenders = { count: 0 };
jest.mock(
	'../../src/blocks/extensions/motion/thumbnails/PresetThumbnail',
	() => {
		const actual = jest.requireActual(
			'../../src/blocks/extensions/motion/thumbnails/PresetThumbnail'
		);
		const Counted = ( props ) => {
			mockRenders.count += 1;
			return actual.default( props );
		};
		return { __esModule: true, ...actual, default: Counted };
	}
);
const {
	default: PresetThumbnailGrid,
} = require( '../../src/blocks/extensions/motion/thumbnails/PresetThumbnailGrid' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const make = () => [
	{ value: 'hover-lift', label: 'Lift' },
	{ value: 'hover-scale', label: 'Scale' },
	{ value: 'hover-rotate', label: 'Rotate' },
];
let host;
let root;
const draw = ( props ) =>
	act( () =>
		root.render(
			React.createElement( PresetThumbnailGrid, {
				label: 'Hover state previews',
				options: make(),
				value: 'hover-scale',
				onChange: () => {},
				...props,
			} )
		)
	);
const radios = () => [ ...host.querySelectorAll( '[role="radio"]' ) ];
const key = ( target, name ) =>
	act( () => {
		target.dispatchEvent(
			new KeyboardEvent( 'keydown', { key: name, bubbles: true, cancelable: true } )
		);
	} );

beforeEach( () => {
	host = document.createElement( 'div' );
	document.body.appendChild( host );
	root = createRoot( host );
	mockRenders.count = 0;
} );
afterEach( () => {
	act( () => root.unmount() );
	host.remove();
} );

test( 'is a labelled radio group with aria-checked and one tab stop', () => {
	draw();
	const group = host.querySelector( '[role="radiogroup"]' );
	expect( group.getAttribute( 'aria-label' ) ).toBe( 'Hover state previews' );
	expect( radios().map( ( r ) => r.getAttribute( 'aria-checked' ) ) ).toEqual( [ 'false', 'true', 'false' ] );
	expect( radios().map( ( r ) => r.tabIndex ) ).toEqual( [ -1, 0, -1 ] );
	expect( host.querySelector( '[aria-pressed]' ) ).toBeNull();
	draw( { value: '' } );
	expect( radios().map( ( r ) => r.tabIndex ) ).toEqual( [ 0, -1, -1 ] );
} );

test( 'arrow keys, Home and End move focus and wrap; they do not choose', () => {
	const picked = [];
	draw( { onChange: ( slug ) => picked.push( slug ) } );
	radios()[ 1 ].focus();
	key( radios()[ 1 ], 'ArrowRight' );
	expect( document.activeElement ).toBe( radios()[ 2 ] );
	key( radios()[ 2 ], 'ArrowRight' );
	expect( document.activeElement ).toBe( radios()[ 0 ] );
	key( radios()[ 0 ], 'ArrowUp' );
	expect( document.activeElement ).toBe( radios()[ 2 ] );
	key( radios()[ 2 ], 'Home' );
	expect( document.activeElement ).toBe( radios()[ 0 ] );
	key( radios()[ 0 ], 'End' );
	expect( document.activeElement ).toBe( radios()[ 2 ] );
	expect( picked ).toEqual( [] );
} );

test( 'a click writes the clicked slug through the latest onChange, and not the chosen one', () => {
	const first = [];
	const second = [];
	draw( { onChange: ( slug ) => first.push( slug ) } );
	draw( { onChange: ( slug ) => second.push( slug ), options: make() } );
	act( () => radios()[ 1 ].click() );
	act( () => radios()[ 0 ].click() );
	expect( first ).toEqual( [] );
	expect( second ).toEqual( [ 'hover-lift' ] );
} );

test( 'a rebuilt but identical option list does not re-render the radios; a changed one does', () => {
	draw();
	const initial = mockRenders.count;
	expect( initial ).toBe( 3 );
	draw( { onChange: () => {}, options: make() } );
	expect( mockRenders.count ).toBe( initial );
	draw( { value: 'hover-lift' } );
	expect( mockRenders.count ).toBeGreaterThan( initial );
} );
