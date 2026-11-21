// node --test scripts/render-check/tests/normalise.test.mjs
// Each rule makes two copies (or two loads) of one page hash alike, and none hides a change a visitor would see.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliser } from '../lib/normalise.mjs';

const a = normaliser( 8150 );
const b = normaliser( 8151 );

test( 'the copy address', () => {
	assert.equal( a( 'src="http://localhost:8150/x.png"' ), b( 'src="http://localhost:8151/x.png"' ) );
	assert.equal( a( 'redirect_to=http%3A%2F%2Flocalhost%3A8150%2F' ), b( 'redirect_to=http%3A%2F%2Flocalhost%3A8151%2F' ) );
} );

test( 'asset versions, nonces and timestamps', () => {
	assert.equal( a( 'app.js?ver=1700000001' ), a( 'app.js?ver=1700000002' ) );
	assert.equal( a( '"nonce":"90671dac87"' ), a( '"nonce":"1c953cf0c0"' ) );
	assert.equal( a( '%22Nonce%22%3A%2290671dac87%22%2C%22Nonce-Timestamp%22%3A1795052734' ), a( '%22Nonce%22%3A%221c953cf0c0%22%2C%22Nonce-Timestamp%22%3A1795052735' ) );
	assert.equal( a( '"Cart-Token":"eyJhbGc.eyJ1c2Vy.sig1"' ), a( '"Cart-Token":"eyJhbGc.eyJ1c2Vz.sig2"' ) ); // gitleaks:allow (made-up token shapes)
} );

test( 'instance ids hashed from settings are renumbered in order', () => {
	assert.equal( a( 'class="sgs-cart-d6c3b780" aria-controls="sgs-cart-d6c3b780-drawer"' ), b( 'class="sgs-cart-ee5b4450" aria-controls="sgs-cart-ee5b4450-drawer"' ) );
	assert.notEqual( a( 'class="sgs-cart-d6c3b780 sgs-rl-11111111"' ), a( 'class="sgs-cart-d6c3b780 sgs-rl-d6c3b780"' ) );
	assert.equal( a( 'sgs-cart__panel' ), 'sgs-cart__panel' );
} );

test( 'obfuscated email characters and analytics data', () => {
	assert.equal( a( 'mailto:Za&#105;nab' ), a( 'mailto:Zai&#110;ab' ) );
	assert.equal( a( '<script>dataLayer.push({"item_category":"Vegan"})</script>' ), a( '<script>dataLayer.push({"item_category":"Zookies"})</script>' ) );
	assert.equal( a( '<script>window.gtm4wp_checkout_products = [{"item_category":"Vegan"}];</script>' ), a( '<script>window.gtm4wp_checkout_products = [{"item_category":"Zookies"}];</script>' ) );
	assert.equal( a( '<input data-gtm4wp_product_data="{&quot;c&quot;:1}" />' ), a( '<input data-gtm4wp_product_data="{&quot;c&quot;:2}" />' ) );
} );

test( 'what a visitor sees is never normalised away', () => {
	assert.notEqual( a( '<p>Vegan</p>' ), a( '<p>Zookies</p>' ) );
	assert.notEqual( a( '<a href="/shop/">Shop</a>' ), a( '<a href="/shop/">Shop now</a>' ) );
	assert.notEqual( a( '.x{color:#000}' ), a( '.x{color:#111}' ) );
	assert.notEqual( a( 'src="/photo.jpg"' ), a( 'src="/photo-2.jpg"' ) );
} );

test( 'MUST FAIL before recordHost: an element reading names the copy only as {host}', async () => {
	const { recordHost } = await import( '../lib/normalise.mjs' );
	const reading = ( port ) => JSON.stringify( { styles: [ [ `url("http://localhost:${ port }/wp-content/uploads/a.jpg")` ] ] } );
	assert.equal( recordHost( 'http://localhost:8150' )( reading( 8150 ) ), recordHost( 'http://localhost:8151' )( reading( 8151 ) ) );
	assert.notEqual( recordHost( 'http://localhost:8150' )( reading( 8150 ).replace( 'a.jpg', 'b.jpg' ) ), recordHost( 'http://localhost:8151' )( reading( 8151 ) ) );
} );
