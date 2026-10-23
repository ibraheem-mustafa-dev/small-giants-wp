// sgs/wishlist-link and sgs/cart: the tap area wraps the glyph a size setting sizes, 44px with none.
// The custom properties are the ones render.php prints (WishlistLinkRenderTest, CartRenderTest).
// The block themes set border-box on every element; the fixture states it so the 10px link padding sits inside the floor.
const wishlist = ( vars = '' ) =>
	`<style>*{box-sizing:border-box}</style><div class="sgs-wishlist-link-test wp-block-sgs-wishlist-link" style="${ vars }"><a class="sgs-wishlist-link" href="#"><span class="sgs-wishlist-link__icon"><svg viewBox="0 0 24 24" style="width:${ vars ? '20px' : '24px' };height:${ vars ? '20px' : '24px' }"></svg></span></a></div>`;
const trigger = ( vars = '' ) =>
	`<div class="sgs-cart wp-block-sgs-cart sgs-cart--trigger-icon" style="${ vars }"><button type="button" class="sgs-cart__trigger"><span class="sgs-cart__icon"><svg viewBox="0 0 24 24"></svg></span></button></div>`;
const close = ( vars = '', size = '' ) =>
	`<div class="sgs-cart__panel" style="${ vars }"><button type="button" class="sgs-cart__panel-close"><svg viewBox="0 0 24 24" style="display:block;${ size }"></svg></button></div>`;

export const CASES = [
	{
		name: 'wishlist glyph 20px: the link wraps glyph and its 10px padding',
		styles: [ 'wishlist-link' ],
		html: wishlist( '--sgs-wishlist-tap-min:0px' ),
		sel: '.sgs-wishlist-link',
		expect: { w: 40, h: 40 },
		sized: true,
	},
	{
		name: 'wishlist with no size set: the 44px floor stays',
		styles: [ 'wishlist-link' ],
		html: wishlist(),
		sel: '.sgs-wishlist-link',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'cart icon trigger with a 16px glyph: the trigger wraps the glyph',
		styles: [ 'cart' ],
		html: trigger( '--sgs-cart-icon-size:16px;--sgs-cart-tap-min:0px' ),
		sel: '.sgs-cart__trigger',
		expect: { w: 16, h: 16 },
		sized: true,
	},
	{
		name: 'cart icon trigger at the default size: the 44px floor stays',
		styles: [ 'cart' ],
		html: trigger( '--sgs-cart-icon-size:24px' ),
		sel: '.sgs-cart__trigger',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'cart panel close with a 20px glyph: the button wraps the glyph',
		styles: [ 'cart' ],
		html: close( '--sgs-cart-close-tap-min:0px', 'width:20px;height:20px' ),
		sel: '.sgs-cart__panel-close',
		expect: { w: 20, h: 20 },
		sized: true,
	},
	{
		name: 'cart panel close with no size set: the 44px floor stays',
		styles: [ 'cart' ],
		html: close( '', 'width:24px;height:24px' ),
		sel: '.sgs-cart__panel-close',
		expect: { w: 44, h: 44 },
		sized: false,
	},
];
