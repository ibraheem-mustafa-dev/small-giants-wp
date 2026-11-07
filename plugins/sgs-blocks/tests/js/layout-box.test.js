/**
 * Transform-independent layout measurement: a painted scale is divided out, and an unscaled element reads as painted.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

import { layoutBox, layoutOffset } from '../../src/shared/layout-box.js';

function stubRect( el, rect ) {
	el.getBoundingClientRect = () => ( {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height,
		right: rect.left + rect.width,
		bottom: rect.top + rect.height,
	} );
}

describe( 'layout box', () => {
	beforeEach( () => {
		document.body.innerHTML =
			'<div id="wrap"><div id="child"></div></div>';
	} );

	afterEach( () => jest.restoreAllMocks() );

	test( 'an unscaled element reads as painted', () => {
		const child = document.getElementById( 'child' );
		stubRect( child, { left: 10, top: 0, width: 300, height: 100 } );
		expect( layoutBox( child ) ).toEqual( { width: 300, height: 100 } );
	} );

	test( 'a held entrance scale on an ancestor is divided out of size and offset', () => {
		const wrap = document.getElementById( 'wrap' );
		const child = document.getElementById( 'child' );
		const real = window.getComputedStyle.bind( window );
		jest.spyOn( window, 'getComputedStyle' ).mockImplementation( ( el ) => {
			const style = real( el );
			return el === wrap
				? { scale: '0.96', transform: 'none', transformOrigin: style.transformOrigin }
				: style;
		} );
		stubRect( wrap, { left: 0, top: 0, width: 960, height: 480 } );
		stubRect( child, { left: 96, top: 0, width: 288, height: 96 } );
		expect( layoutBox( child ).width ).toBeCloseTo( 300, 5 );
		expect( layoutOffset( child, wrap ).x ).toBeCloseTo( 100, 5 );
	} );
} );
