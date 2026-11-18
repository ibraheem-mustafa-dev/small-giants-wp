/**
 * The compositor frames the looping effects share (`src/shared/effects/loop-transform.js`).
 */

import {
	positive,
	readChannel,
	readLift,
	transformFrame,
} from '../../src/shared/effects/loop-transform';

let style;

beforeEach( () => {
	style = { transform: 'none', scale: 'none' };
	window.getComputedStyle = jest.fn( () => style );
	document.body.innerHTML = '<div id="el"></div>';
} );

describe( 'transformFrame', () => {
	test( 'writes the movement then the scale, as ratio to the held scale', () => {
		expect(
			transformFrame( { scale: 1.2, x: '10px', y: '-4px', held: 1.2 } )
		).toEqual( { transform: 'translate(10px, -4px) scale(1)' } );
	} );

	test( 'a px movement is divided by the lift, and a relative length by a calc()', () => {
		expect(
			transformFrame( { x: '20px', y: '50%', lift: 1.25 } ).transform
		).toBe( 'translate(16px, calc(50% / 1.25)) scale(1)' );
	} );

	test( 'an authored transform follows the frame, so the movement stays outside it', () => {
		expect(
			transformFrame( { base: 'matrix(1, 0, 0, 1, 5, 5)' } ).transform
		).toBe( 'translate(0px, 0px) scale(1) matrix(1, 0, 0, 1, 5, 5)' );
	} );

	test( 'the ratio keeps six decimals, so a held zoom times it is the authored zoom to a thousandth of a pixel', () => {
		expect( transformFrame( { scale: 1, held: 1.08 } ).transform ).toBe(
			'translate(0px, 0px) scale(0.925926)'
		);
	} );
} );

describe( 'readChannel', () => {
	test( 'an element with no transform is animated on the transform channel with nothing to carry', () => {
		expect( readChannel( document.getElementById( 'el' ) ) ).toEqual( {
			channel: 'transform',
			base: '',
		} );
	} );

	test( 'an authored transform is carried', () => {
		style.transform = 'matrix(0.9, 0.1, -0.1, 0.9, 0, 0)';
		expect( readChannel( document.getElementById( 'el' ) ) ).toEqual( {
			channel: 'transform',
			base: style.transform,
		} );
	} );

	test( 'the motion transform channel keeps the registered-property run', () => {
		style.transform = 'matrix(1, 0, 0, 1, 0, 0)';
		const el = document.getElementById( 'el' );
		el.setAttribute( 'data-sgs-mc', 'scale transform' );
		expect( readChannel( el ) ).toEqual( {
			channel: 'property',
			base: '',
		} );
	} );
} );

describe( 'readers', () => {
	test( 'positive reads a computed number and falls back for none, empty and zero', () => {
		expect( positive( '1.08', 1 ) ).toBe( 1.08 );
		expect( positive( 'none', 1 ) ).toBe( 1 );
		expect( positive( '', 1 ) ).toBe( 1 );
		expect( positive( '0', 1 ) ).toBe( 1 );
	} );

	test( 'readLift is the element computed scale', () => {
		style.scale = '1.5';
		expect( readLift( document.getElementById( 'el' ) ) ).toBe( 1.5 );
		style.scale = 'none';
		expect( readLift( document.getElementById( 'el' ) ) ).toBe( 1 );
	} );
} );
