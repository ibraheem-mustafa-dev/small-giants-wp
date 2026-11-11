/**
 * The Cart and Checkout look canvas hook: a request that is still in flight when every setting is cleared must not
 * repaint the cleared setting when it answers late, and a failed request is reported in the editor console.
 */
import { createRoot } from '@wordpress/element';
import { act } from 'react';
import apiFetch from '@wordpress/api-fetch';
import { useCommerceLookCss } from '../../src/blocks/extensions/commerce-look/canvas-css';

jest.mock( '@wordpress/api-fetch', () => jest.fn() );

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** A promise whose settling the test controls. */
function deferred() {
	const d = {};
	d.promise = new Promise( ( resolve, reject ) => {
		d.resolve = resolve;
		d.reject = reject;
	} );
	return d;
}

let host;
let root;
let seen;

function Probe( { attributes } ) {
	seen = useCommerceLookCss( 'woocommerce/checkout', attributes );
	return null;
}

function render( attributes ) {
	act( () => {
		root.render( <Probe attributes={ attributes } /> );
	} );
}

async function settle() {
	await act( async () => {
		await Promise.resolve();
		await Promise.resolve();
	} );
}

beforeEach( () => {
	jest.useFakeTimers();
	apiFetch.mockReset();
	host = document.createElement( 'div' );
	document.body.appendChild( host );
	root = createRoot( host );
	seen = undefined;
} );

afterEach( () => {
	act( () => root.unmount() );
	host.remove();
	jest.useRealTimers();
} );

describe( 'useCommerceLookCss', () => {
	test( 'prints the answer for the current settings', async () => {
		const first = deferred();
		apiFetch.mockReturnValueOnce( first.promise );
		render( { sgsFieldMinHeight: '48px' } );
		act( () => jest.advanceTimersByTime( 300 ) );
		first.resolve( { css: '.a{min-height:48px;}' } );
		await settle();
		expect( seen ).toBe( '.a{min-height:48px;}' );
	} );

	test( 'a late answer does not repaint a setting that was cleared while it was in flight', async () => {
		const first = deferred();
		apiFetch.mockReturnValueOnce( first.promise );
		render( { sgsFieldMinHeight: '48px' } );
		act( () => jest.advanceTimersByTime( 300 ) );
		expect( apiFetch ).toHaveBeenCalledTimes( 1 );
		render( {} );
		expect( seen ).toBe( '' );
		first.resolve( { css: '.a{min-height:48px;}' } );
		await settle();
		expect( seen ).toBe( '' );
	} );

	test( 'the request is a POST carrying the attributes in its body, never in the address', async () => {
		apiFetch.mockReturnValueOnce( deferred().promise );
		render( { sgsFieldMinHeight: '48px' } );
		act( () => jest.advanceTimersByTime( 300 ) );
		const call = apiFetch.mock.calls[ 0 ][ 0 ];
		expect( call.method ).toBe( 'POST' );
		expect( call.path ).toBe( '/sgs/v1/commerce-look/css' );
		expect( call.data.block ).toBe( 'woocommerce/checkout' );
		expect( JSON.parse( call.data.attributes ) ).toEqual( { sgsFieldMinHeight: '48px' } );
	} );

	test( 'a failed request is reported in the editor console and the last good CSS stays', async () => {
		const first = deferred();
		const second = deferred();
		apiFetch.mockReturnValueOnce( first.promise ).mockReturnValueOnce( second.promise );
		render( { sgsFieldMinHeight: '48px' } );
		act( () => jest.advanceTimersByTime( 300 ) );
		first.resolve( { css: '.a{min-height:48px;}' } );
		await settle();
		render( { sgsFieldMinHeight: '52px' } );
		act( () => jest.advanceTimersByTime( 300 ) );
		second.reject( { code: 'rest_forbidden', message: 'Sorry, you are not allowed to do that.' } );
		await settle();
		expect( seen ).toBe( '.a{min-height:48px;}' );
		expect( console ).toHaveWarned();
		expect( console.warn.mock.calls[ 0 ].join( ' ' ) ).toContain( 'commerce-look' );
	} );
} );
