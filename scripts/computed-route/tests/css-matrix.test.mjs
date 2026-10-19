// lib/css-matrix.mjs: a CSS transform list as the matrix the browser draws it with, checked against Chromium's own
// computed transform for every kind of function, in mixed orders; a list it cannot read is null, never a guess.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { transformMatrix, sameMatrix } from '../lib/css-matrix.mjs';

const CASES = [ 'translate(10px, 20px) rotate(30deg) scale(1.2)', 'perspective(800px) rotateX(10deg) rotateY(5deg) translateZ(40px)', 'scale(2) translateX(10px)', 'rotate3d(1, 1, 0, 45deg)', 'matrix(0.96, 0, 0, 0.96, 0, 39)', 'translateY(24px) scale(0.96)', 'rotate(0.25turn) scaleX(2) skew(10deg, 5deg)', 'translate3d(5px, 6px, 7px) scale3d(1.1, 0.9, 2) rotate(-0.5rad)', 'none' ];

test( 'in a real browser: every readable transform list is the matrix Chromium computes', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( '<div id="d" style="width:100px;height:50px"></div>' );
		for ( const css of CASES ) {
			const drawn = await page.evaluate( ( v ) => {
				const d = document.getElementById( 'd' );
				d.style.transform = v;
				const t = getComputedStyle( d ).transform;
				return Array.from( new DOMMatrix( 'none' === t ? undefined : t ).toFloat64Array() );
			}, css );
			assert.ok( sameMatrix( transformMatrix( css ), drawn, { tol: 1e-6, tolPx: 1e-4 } ), css );
		}
		assert.ok( ! sameMatrix( transformMatrix( 'scale(2) translateX(10px)' ), transformMatrix( 'translateX(10px) scale(2)' ) ), 'control: order changes the matrix' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: a list with a percentage, an unknown function or stray text is unreadable', () => {
	for ( const v of [ 'translateX(-120%)', 'skewX(-18deg) translateX(-120%)', 'wobble(2)', 'rotate(10deg) junk', 'translateX(1em)' ] ) {
		assert.equal( transformMatrix( v ), null, v );
	}
} );
