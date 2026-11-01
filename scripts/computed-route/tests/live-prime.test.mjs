// A checkout surface's live priming (lib/live-prime.mjs, lib/fill-config.mjs::baseConfigText): the product picker and the generated config.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickPrimeProduct, livePrimeFor, checkoutRole, primeReject, variationReject } from '../lib/live-prime.mjs';
import { baseConfigText } from '../lib/fill-config.mjs';

const P = ( o ) => ( { id: 1, type: 'simple', title: 'Cookie', sku: 'c1', categories: [ 'cookies' ], fixture: false, purchasable: true, inStock: true, managed: false, stock: null, ...o } );
const BASE = 'http://localhost:8084';

test( 'MUST FAIL: the picker rejects variable, gift-card, fixture and out-of-stock products and takes the first good one', () => {
	assert.equal( primeReject( P( { type: 'variable' } ) ), 'variable product' );
	assert.equal( primeReject( P( { title: 'Gift Card' } ) ), 'gift card' );
	assert.equal( primeReject( P( { categories: [ 'gift-cards' ] } ) ), 'gift card' );
	assert.equal( primeReject( P( { fixture: true } ) ), 'calibration fixture' );
	assert.equal( primeReject( P( { inStock: false } ) ), 'out of stock' );
	assert.equal( primeReject( P( { managed: true, stock: 0 } ) ), 'out of stock' );
	const r = pickPrimeProduct( [ P( { id: 1, type: 'variable' } ), P( { id: 2, title: 'Gift voucher' } ), P( { id: 3, fixture: true } ), P( { id: 4, managed: true, stock: 0 } ), P( { id: 5 } ), P( { id: 6 } ) ] );
	assert.equal( r.id, 5 );
} );

test( 'MUST FAIL: no eligible product gives a null id and a reason', () => {
	const r = pickPrimeProduct( [ P( { id: 1, type: 'variable' } ), P( { id: 2, inStock: false } ) ] );
	assert.equal( r.id, null );
	assert.match( r.why, /#1 variable product; #2 out of stock/ );
	assert.match( pickPrimeProduct( [] ).why, /no published product/ );
} );

test( 'MUST FAIL: a checkout surface carries live.prime with the add-to-cart URL, any other surface none', () => {
	assert.deepEqual( livePrimeFor( { role: 'checkout', base: `${ BASE }/`, productId: 5 } ), [ `${ BASE }/?add-to-cart=5` ] );
	assert.equal( livePrimeFor( { role: 'cart', base: BASE, productId: 5 } ), null );
	assert.equal( livePrimeFor( { role: null, base: BASE, productId: 5 } ), null );
	assert.equal( livePrimeFor( { role: 'checkout', base: BASE, productId: null } ), null );
	assert.equal( checkoutRole( { target: { template: 'checkout' } }, null ), 'checkout' );
	assert.equal( checkoutRole( { target: { template: 'cart' } }, null ), 'cart' );
	const text = ( prime ) => baseConfigText( { surface: 'template-checkout', draftUrl: 'http://d/', liveUrl: `${ BASE }/checkout/`, prime } );
	assert.match( text( livePrimeFor( { role: 'checkout', base: BASE, productId: 5 } ) ), /live: \{ url: "[^"]+", prime: \["http:\/\/localhost:8084\/\?add-to-cart=5"\] \}/ );
	assert.doesNotMatch( text( livePrimeFor( { role: 'cart', base: BASE, productId: 5 } ) ), /prime/ );
} );

const V = ( id, o ) => ( { id, attributes: { attribute_pa_size: 's' }, purchasable: true, inStock: true, managed: false, stock: null, ...o } );

test( 'MUST FAIL: with only variable products the picker returns a variation add-to-cart URL carrying its attributes', () => {
	const r = pickPrimeProduct( [ P( { id: 446, type: 'variable', variations: [ V( 447 ), V( 448, { attributes: { attribute_pa_size: 'm' } } ) ] } ) ] );
	assert.equal( r.id, 446 );
	assert.deepEqual( r.variation, { parentId: 446, id: 447, attributes: { attribute_pa_size: 's' } } );
	assert.deepEqual( livePrimeFor( { role: 'checkout', base: BASE, productId: r.id, variation: r.variation } ), [ `${ BASE }/?add-to-cart=446&variation_id=447&attribute_pa_size=s` ] );
	assert.equal( livePrimeFor( { role: 'cart', base: BASE, productId: r.id, variation: r.variation } ), null );
} );

test( 'MUST FAIL: a simple product still wins over a variable product listed before it', () => {
	const r = pickPrimeProduct( [ P( { id: 1, type: 'variable', variations: [ V( 2 ) ] } ), P( { id: 3 } ) ] );
	assert.equal( r.id, 3 );
	assert.equal( r.variation, null );
	assert.deepEqual( livePrimeFor( { role: 'checkout', base: BASE, productId: r.id, variation: r.variation } ), [ `${ BASE }/?add-to-cart=3` ] );
} );

test( 'MUST FAIL: out-of-stock variations and fixture or gift-card parents are rejected', () => {
	assert.equal( variationReject( P( { type: 'variable' } ), V( 2, { inStock: false } ) ), 'out of stock' );
	assert.equal( variationReject( P( { type: 'variable' } ), V( 2, { managed: true, stock: 0 } ) ), 'out of stock' );
	assert.equal( variationReject( P( { type: 'variable' } ), V( 2, { purchasable: false } ) ), 'not purchasable' );
	assert.equal( variationReject( P( { type: 'variable', fixture: true } ), V( 2 ) ), 'calibration fixture' );
	assert.equal( variationReject( P( { type: 'variable', title: 'Gift card' } ), V( 2 ) ), 'gift card' );
	const r = pickPrimeProduct( [
		P( { id: 10, type: 'variable', fixture: true, variations: [ V( 11 ) ] } ),
		P( { id: 12, type: 'variable', variations: [ V( 13, { inStock: false } ), V( 14, { managed: true, stock: 0 } ) ] } ),
		P( { id: 15, type: 'variable', variations: [ V( 16 ), V( 17 ) ] } ),
	] );
	assert.equal( r.variation.id, 16 );
	const none = pickPrimeProduct( [ P( { id: 10, type: 'variable', fixture: true, variations: [ V( 11 ) ] } ), P( { id: 12, type: 'variable', variations: [ V( 13, { inStock: false } ) ] } ) ] );
	assert.equal( none.id, null );
	assert.match( none.why, /#10 variable product/ );
} );
