/**
 * src/shared/nav-interactivity/custom-css-scope.js: a drawer or mega panel moved to <body>
 * keeps its block's Custom CSS scope classes, and gives them back when moved home.
 */
import {
	carryCustomCssScope,
	dropCustomCssScope,
} from '../../src/shared/nav-interactivity/custom-css-scope';

function mount() {
	document.body.innerHTML =
		'<div class="sgs-c-r1bag sgs-cart sgs-cart-6ac04cc2"><div class="inner sgs-c-outer2"><dialog class="sgs-cart__panel sgs-cart-6ac04cc2"><img class="sgs-cart__item-thumb"></dialog></div></div>' +
		'<style>.sgs-c-r1bag.sgs-c-r1bag .sgs-cart__item-thumb{padding:4px}</style>';
	return document.querySelector( 'dialog' );
}

describe( 'carryCustomCssScope', () => {
	test( 'without the carry, a scoped rule stops matching once the dialog leaves its block (negative control)', () => {
		const dialog = mount();
		const thumb = dialog.querySelector( 'img' );
		expect( thumb.matches( '.sgs-c-r1bag.sgs-c-r1bag .sgs-cart__item-thumb' ) ).toBe( true );
		document.body.appendChild( dialog );
		expect( thumb.matches( '.sgs-c-r1bag.sgs-c-r1bag .sgs-cart__item-thumb' ) ).toBe( false );
	} );

	test( 'copies every ancestor scope class, and only scope classes, before the move', () => {
		const dialog = mount();
		const added = carryCustomCssScope( dialog );
		expect( added.sort() ).toEqual( [ 'sgs-c-outer2', 'sgs-c-r1bag' ] );
		expect( dialog.classList.contains( 'sgs-cart' ) ).toBe( false );
		document.body.appendChild( dialog );
		expect( dialog.querySelector( 'img' ).matches( '.sgs-c-r1bag.sgs-c-r1bag .sgs-cart__item-thumb' ) ).toBe( true );
		expect( dialog.matches( '.sgs-c-r1bag.sgs-c-r1bag.sgs-cart__panel' ) ).toBe( true );
	} );

	test( 'carries the block motion class too, so a part hover inside the moved panel still matches', () => {
		document.body.innerHTML =
			'<div class="sgs-cart cr-ref-header-13 sgs-m-4f61809c16"><dialog class="sgs-cart__panel"><a class="sgs-cart__panel-checkout" data-sgs-mh="self"></a></dialog></div>';
		const dialog = document.querySelector( 'dialog' );
		const checkout = dialog.querySelector( 'a' );
		const rule = '.sgs-m-4f61809c16 .sgs-cart__panel-checkout';
		const moved = dialog.cloneNode( true );
		document.body.appendChild( moved );
		expect( moved.querySelector( 'a' ).matches( rule ) ).toBe( false );
		const added = carryCustomCssScope( dialog );
		expect( added ).toEqual( [ 'sgs-m-4f61809c16' ] );
		expect( dialog.classList.contains( 'cr-ref-header-13' ) ).toBe( false );
		document.body.appendChild( dialog );
		expect( checkout.matches( rule ) ).toBe( true );
	} );

	test( 'dropCustomCssScope removes only what was added', () => {
		const dialog = mount();
		dialog.classList.add( 'sgs-c-own' );
		const added = carryCustomCssScope( dialog );
		dropCustomCssScope( dialog, added );
		expect( [ ...dialog.classList ] ).toEqual( [ 'sgs-cart__panel', 'sgs-cart-6ac04cc2', 'sgs-c-own' ] );
	} );
} );
