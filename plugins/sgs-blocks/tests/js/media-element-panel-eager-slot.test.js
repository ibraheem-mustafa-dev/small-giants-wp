/**
 * `MediaElementPanel` mounts each tab's inspector slot at once and loads only the panels' body inside it, so the
 * Background panel keeps its place in the tab on first select instead of registering after every other panel.
 */
const React = require( 'react' );
const util = require( 'util' );

// jsdom lacks the encoders the server renderer reads at load.
global.TextEncoder = global.TextEncoder || util.TextEncoder;
global.TextDecoder = global.TextDecoder || util.TextDecoder;
const { renderToString } = require( 'react-dom/server' );

jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		InspectorControls: ( { group, children } ) =>
			R.createElement( 'div', { 'data-slot': group }, children ),
	};
} );
jest.mock( '@wordpress/blocks', () => ( { getBlockType: () => null } ) );
jest.mock( '../../src/components/media/panels/MediaPanels.js', () => ( { __esModule: true, default: () => null } ) );

const MediaElementPanel = require( '../../src/components/MediaElementPanel' ).default;

// Server rendering stops at the lazy body (it cannot load yet) and keeps everything outside its Suspense: the
// moment before the chunk arrives. A slot that mounted inside the chunk would be missing from this output.
function render( props ) {
	return renderToString(
		React.createElement( MediaElementPanel, {
			attributes: {},
			setAttributes: jest.fn(),
			kinds: [ 'image' ],
			...props,
		} )
	);
}

const slots = ( html ) => [ ...html.matchAll( /data-slot="(\w+)"/g ) ].map( ( m ) => m[ 1 ] );

describe( 'MediaElementPanel inspector slots', () => {
	it( 'an element slot mounts its Settings and Styles slots before the panels body has loaded', () => {
		expect( slots( render( { context: 'element' } ) ) ).toEqual( [ 'settings', 'styles' ] );
	} );

	it( 'a background mounts only the Styles slot, which holds Background alone', () => {
		expect( slots( render( { context: 'background', kinds: [ 'image', 'video', 'svg' ] } ) ) ).toEqual( [ 'styles' ] );
	} );

	it( 'inGroup renders that group in place, with no slot of its own, and still mounts the other group', () => {
		const styles = render( { context: 'element', inGroup: 'styles' } );
		expect( slots( styles ) ).toEqual( [ 'settings' ] );
		// A background that sits in a Styles slot already mounts no slot at all.
		const bg = render( { context: 'background', kinds: [ 'image', 'video', 'svg' ], inGroup: 'styles' } );
		expect( slots( bg ) ).toEqual( [] );
	} );

	it( 'the lazy body keeps a placement anchor until its content has mounted (PlacedSuspense)', () => {
		expect( render( { context: 'element' } ) ).toContain( 'sgs-placed-suspense__anchor' );
	} );

	it( 'a slot with no kinds renders nothing', () => {
		expect( render( { kinds: [] } ) ).toBe( '' );
	} );
} );
