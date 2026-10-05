// A local mock shop for the flow tests: the same selectors, routes and response shapes the real shop uses, with one
// switchable fault per mode. It exists because the live site cannot be made to fail on demand (register N11(b) is
// fixed there at HEAD by 35e8b94d4, and a deliberately broken build must never be deployed to prove a test), and
// because Hostinger's edge 403s headless browsers after bursts.
//
// Modes
//   good        HEAD behaviour: the 30 s per-item cooldown exempts an item already in the bag; the bag keeps every
//               line; the filter redraw replaces the groups cleanly; skip adds the frame to the bag.
//   bug-a       N11(a): an add of a different product returns 200 but the bag is rebuilt without the saved lines.
//   bug-b       N11(b) before 35e8b94d4: the cooldown also blocks a second unit already in the bag, 429
//               sgs_rate_limited "Please wait before adding more of this item."
//   bug-filter  N25: each redraw leaves the old group wrappers behind as empty shells and duplicates Gender.
//   bug-skip    N38: skip opens the result step instead of adding the frame.
//
// Routes: /product/a/ (variable, id 101, variations 1011/1012, has the lens pop-up), /product/b/ (simple, id 102),
// /shop/, /wp-json/wc/store/v1/products, /wp-json/wc/store/v1/cart, POST /wp-json/sgs/v1/cart/add-item.
// A cart and its cooldowns belong to the `mock_sid` cookie, so a fresh browser context starts with an empty bag.
import http from 'node:http';
import crypto from 'node:crypto';

export const MODES = [ 'good', 'bug-a', 'bug-b', 'bug-filter', 'bug-skip' ];
const COOLDOWN_MS = 30000;
const PRODUCTS = {
	101: { id: 101, name: 'Frame A', slug: 'a', variations: [ 1011, 1012 ] },
	102: { id: 102, name: 'Frame B', slug: 'b', variations: [] },
};

const buybox = ( p ) => `<div data-wp-interactive="sgs/product-card" class="sgs-buybox">
<h1>${ p.name }</h1>
${ p.variations.length ? `<div class="sgs-option-picker" role="radiogroup" aria-label="Colour">${ p.variations.map( ( v, i ) => `<label class="sgs-option-picker__option"><input type="radio" name="attribute_colour" value="${ v }"><span>Colour ${ i + 1 }</span></label>` ).join( '' ) }</div>` : '' }
<form class="buybox__cart-form" data-id="${ p.id }"><button type="submit" class="buybox__add-to-cart">Add to bag</button></form>
<div class="buybox__cart-status-region" role="alert"><p class="buybox__cart-status"></p></div>
</div>
<script>
const form = document.querySelector( '.buybox__cart-form' );
const status = document.querySelector( '.buybox__cart-status' );
let pending = false;
form.addEventListener( 'submit', async ( e ) => {
	e.preventDefault();
	const radio = document.querySelector( 'input[name="attribute_colour"]:checked' );
	const hasPicker = !! document.querySelector( 'input[name="attribute_colour"]' );
	if ( pending || ( hasPicker && ! radio ) ) { return; }
	const id = radio ? Number( radio.value ) : Number( form.dataset.id );
	pending = true; status.textContent = '';
	const res = await fetch( '/wp-json/sgs/v1/cart/add-item', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': 'mock' }, body: JSON.stringify( { id, quantity: 1 } ) } );
	if ( ! res.ok ) { const j = await res.json().catch( () => ( {} ) ); status.textContent = j.message || 'Sorry, this item could not be added to your basket.'; }
	pending = false;
} );
</script>`;

const lensPopup = ( mode ) => `<a href="#" id="rx-link">Add my prescription</a>
<dialog id="lens" class="sgs-lens-dialog"><div class="sgs-choice-flow" data-wp-interactive="sgs/choice-flow">
<div class="sgs-form-step" id="step-1"><p>What will you use them for?</p>
<button class="sgs-choice-flow-question__option-button" data-add-to-bag-now>No prescription</button>
<div class="sgs-choice-flow__skip"><button type="button" class="sgs-choice-flow__skip-button">Frame only? Skip the lenses</button></div></div>
<div class="sgs-form-step sgs-choice-flow-result" id="step-result" hidden><p>Your frame</p><button class="sgs-choice-flow__add-to-basket">Add to bag</button></div>
</div></dialog>
<script>
document.getElementById( 'rx-link' ).addEventListener( 'click', ( e ) => { e.preventDefault(); document.getElementById( 'lens' ).showModal(); } );
document.querySelector( '.sgs-choice-flow__skip-button' ).addEventListener( 'click', async () => {
	if ( '${ mode }' === 'bug-skip' ) { document.getElementById( 'step-1' ).hidden = true; document.getElementById( 'step-result' ).hidden = false; return; }
	await fetch( '/wp-json/sgs/v1/cart/add-item', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': 'mock' }, body: JSON.stringify( { id: 101, quantity: 1 } ) } );
} );
</script>`;

const shopPage = ( mode ) => `<button class="sgs-shop-filters__toggle" type="button">Filter</button>
<dialog class="sgs-shop-filters" id="filters"><div class="sgs-shop-filters__scroll" id="groups"></div>
<div class="sgs-shop-filters__sheet-footer"><button class="sgs-shop-filters__clear-all" type="button">Clear all</button></div></dialog>
<script>
const BUG = ${ mode === 'bug-filter' };
const FILTERS = { Gender: [ 'Men', 'Women' ], Colour: [ 'Black', 'Tortoise' ], Brand: [ 'Alpha', 'Beta' ] };
const chosen = new Set();
const dialog = document.getElementById( 'filters' );
const groupsEl = document.getElementById( 'groups' );
const group = ( label ) => '<details class="sgs-shop-filters__group" open><summary class="sgs-shop-filters__group-summary"><h3 class="sgs-shop-filters__group-heading">' + label + '<span class="sgs-shop-filters__group-count">' + FILTERS[ label ].length + '</span></h3></summary><div>' + FILTERS[ label ].map( ( o ) => '<button type="button" class="wc-block-product-filter-chips__item" aria-checked="' + chosen.has( label + o ) + '" data-key="' + label + o + '">' + o + '</button>' ).join( '' ) + '</div></details>';
const shell = '<details class="sgs-shop-filters__group" open><summary class="sgs-shop-filters__group-summary"></summary></details>';
function redraw() {
	// WooCommerce redraws its region and the theme rebuilds the groups. The bug leaves the old wrappers behind.
	const fresh = Object.keys( FILTERS ).map( group ).join( '' );
	if ( BUG && groupsEl.children.length ) {
		const old = Array.from( groupsEl.children ).map( () => shell ).join( '' );
		groupsEl.innerHTML = old + fresh + group( 'Gender' );
		groupsEl.querySelectorAll( 'details' ).forEach( ( d, i, all ) => { if ( i >= all.length - 1 ) { d.querySelectorAll( '.wc-block-product-filter-chips__item' ).forEach( ( c ) => c.remove() ); } } );
	} else { groupsEl.innerHTML = fresh; }
	setTimeout( () => dialog.dispatchEvent( new CustomEvent( 'sgs-shop-filters:rebuilt' ) ), 50 );
}
groupsEl.addEventListener( 'click', ( e ) => { const c = e.target.closest( '.wc-block-product-filter-chips__item' ); if ( ! c ) { return; } const k = c.dataset.key; chosen.has( k ) ? chosen.delete( k ) : chosen.add( k ); redraw(); } );
document.querySelector( '.sgs-shop-filters__clear-all' ).addEventListener( 'click', () => { chosen.clear(); redraw(); } );
document.querySelector( '.sgs-shop-filters__toggle' ).addEventListener( 'click', () => dialog.showModal() );
redraw();
</script>`;

const page = ( body ) => `<!doctype html><html><head><meta charset="utf-8"><title>Mock shop</title></head><body>${ body }</body></html>`;

export async function startMockShop( { mode = 'good', now = () => Date.now() } = {} ) {
	if ( ! MODES.includes( mode ) ) {
		throw new Error( `unknown mock mode ${ mode }` );
	}
	const carts = new Map();
	const log = [];
	const cartOf = ( sid ) => {
		if ( ! carts.has( sid ) ) {
			carts.set( sid, { lines: [], cooldown: new Map() } );
		}
		return carts.get( sid );
	};
	const productOf = ( id ) => Object.values( PRODUCTS ).find( ( p ) => p.id === id || p.variations.includes( id ) );

	const server = http.createServer( ( req, res ) => {
		const cookie = ( req.headers.cookie || '' ).match( /mock_sid=([a-f0-9]+)/ );
		const sid = cookie ? cookie[ 1 ] : crypto.randomBytes( 8 ).toString( 'hex' );
		const json = ( status, body ) => {
			res.writeHead( status, { 'Content-Type': 'application/json', 'Set-Cookie': `mock_sid=${ sid }; Path=/` } );
			res.end( JSON.stringify( body ) );
		};
		const html = ( body ) => {
			res.writeHead( 200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `mock_sid=${ sid }; Path=/` } );
			res.end( page( body ) );
		};
		const url = new URL( req.url, 'http://x' );
		const cart = cartOf( sid );

		if ( req.method === 'GET' && url.pathname === '/' ) {
			return html( '<h1>Mock shop</h1>' );
		}
		if ( req.method === 'GET' && url.pathname === '/product/a/' ) {
			return html( buybox( PRODUCTS[ 101 ] ) + lensPopup( mode ) );
		}
		if ( req.method === 'GET' && url.pathname === '/product/b/' ) {
			return html( buybox( PRODUCTS[ 102 ] ) );
		}
		if ( req.method === 'GET' && url.pathname === '/shop/' ) {
			return html( shopPage( mode ) );
		}
		if ( req.method === 'GET' && url.pathname === '/wp-json/wc/store/v1/products' ) {
			const origin = `http://${ req.headers.host }`;
			return json( 200, Object.values( PRODUCTS ).map( ( p ) => ( { id: p.id, is_in_stock: true, is_purchasable: true, permalink: `${ origin }/product/${ p.slug }/` } ) ) );
		}
		if ( req.method === 'GET' && url.pathname === '/wp-json/wc/store/v1/cart' ) {
			return json( 200, { items: cart.lines.map( ( l ) => ( { key: String( l.id ), id: l.id, name: productOf( l.id ).name, quantity: l.quantity } ) ), items_count: cart.lines.reduce( ( n, l ) => n + l.quantity, 0 ) } );
		}
		if ( req.method === 'POST' && url.pathname === '/wp-json/sgs/v1/cart/add-item' ) {
			let raw = '';
			req.on( 'data', ( c ) => ( raw += c ) );
			req.on( 'end', () => {
				const { id } = JSON.parse( raw || '{}' );
				const t = now();
				const inBag = cart.lines.find( ( l ) => l.id === id );
				const until = cart.cooldown.get( id ) || 0;
				log.push( { sid, id, at: t, mode } );
				// bug-b is the pre-35e8b94d4 route: the cooldown applies to every add. good exempts an item in the bag.
				if ( until > t && ( mode === 'bug-b' || ! inBag ) ) {
					const message = mode === 'bug-b' ? 'Please wait before adding more of this item.' : 'You have just added this item. Please wait a few seconds before adding it again.';
					return json( 429, { code: 'sgs_rate_limited', message, data: { status: 429 } } );
				}
				if ( mode === 'bug-a' && cart.lines.length && ! inBag ) {
					// The bag is rebuilt without loading the saved one: it says "added" and the old line is all that is left.
					cart.cooldown.set( id, t + COOLDOWN_MS );
					return json( 200, { items_count: cart.lines.length } );
				}
				if ( inBag ) {
					inBag.quantity += 1;
				} else {
					cart.lines.push( { id, quantity: 1 } );
				}
				cart.cooldown.set( id, t + COOLDOWN_MS );
				return json( 200, { items_count: cart.lines.reduce( ( n, l ) => n + l.quantity, 0 ) } );
			} );
			return undefined;
		}
		res.writeHead( 404 );
		return res.end( 'not found' );
	} );
	await new Promise( ( r ) => server.listen( 0, '127.0.0.1', r ) );
	const { port } = server.address();
	return { url: `http://127.0.0.1:${ port }`, mode, log, close: () => new Promise( ( r ) => server.close( r ) ) };
}
