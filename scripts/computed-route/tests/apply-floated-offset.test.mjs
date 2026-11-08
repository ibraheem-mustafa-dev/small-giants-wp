// A floated form label's offset is its layout top plus the vertical shift a CSS transform or translate adds, so a draft that moves
// the label by translateY and one that moves it by `top` read the same offset. Run: node --test tests/apply-floated-offset.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { floatedTop, translateY } from '../lib/apply-probes.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

test( 'translateY reads the matrix, matrix3d and translate property shifts', () => {
	assert.equal( translateY( { translate: 'none', transform: 'none' } ), 0 );
	assert.equal( translateY( { translate: 'none', transform: 'matrix(1, 0, 0, 1, 0, -22)' } ), -22 );
	assert.equal( translateY( { translate: 'none', transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -9, 0, 1)' } ), -9 );
	assert.equal( translateY( { translate: '0px -12px', transform: 'matrix(0.8, 0, 0, 0.8, 0, -4)' } ), -16 );
} );

test( 'floatedTop: a top-moved label and a transform-moved label read the same offset', () => {
	assert.equal( floatedTop( { layoutTop: -22, translate: 'none', transform: 'none' } ), '-22px' );
	assert.equal( floatedTop( { layoutTop: 18, translate: 'none', transform: 'matrix(1, 0, 0, 1, 0, -40)' } ), '-22px' );
	assert.equal( floatedTop( { layoutTop: null, translate: 'none', transform: 'none' } ), null );
} );

const PAGE = `<style>.f{position:relative;margin:30px}.f label{position:absolute;left:0;top:18px;transition:all .2s}
.a input:focus+label{top:-22px}.b input:focus+label{transform:translateY(-40px) scale(.8)}</style>
<div class="f a"><input id="x"><label for="x">A</label></div><div class="f b"><input id="y"><label for="y">B</label></div>`;

test( 'in a page, the layout top and transform shift sum to the floated offset for both styles', async () => {
	const browser = await ( await loadChromium() ).chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( PAGE );
		const read = ( id ) => page.evaluate( async ( i ) => {
			const el = document.getElementById( i );
			el.focus();
			await new Promise( ( r ) => setTimeout( r, 400 ) );
			const l = el.nextElementSibling;
			const cs = getComputedStyle( l );
			const seen = { translate: cs.translate, transform: cs.transform };
			l.style.setProperty( 'transform', 'none', 'important' );
			l.style.setProperty( 'transition', 'none', 'important' );
			return { ...seen, layoutTop: l.getBoundingClientRect().top - l.offsetParent.getBoundingClientRect().top };
		}, id );
		assert.equal( floatedTop( await read( 'x' ) ), '-22px' );
		assert.equal( floatedTop( await read( 'y' ) ), '-22px' );
	} finally {
		await browser.close();
	}
} );
