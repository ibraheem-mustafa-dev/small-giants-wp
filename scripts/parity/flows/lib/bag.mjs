// The bag, read and judged independently of how the drawer renders (Spec 47 FR-47-7).
//
//   - readBag        GET /wp-json/wc/store/v1/cart, WooCommerce's own Store API, from inside the page so it carries
//                    the shopper's cart cookie. The drawer's markup is never consulted.
//   - trackAdds      records every POST /wp-json/sgs/v1/cart/add-item the page makes: its status, its `code` (for
//                    example sgs_rate_limited) and the id it asked for, with a timestamp.
//   - addViaUi       drives the real buybox: picks an option in each unanswered group, presses the add button.
//   - the assert*    functions are pure (data in, verdict out) so the tests can prove each failure signal without a
//                    browser.
export const ADD_ITEM_PATH = '/wp-json/sgs/v1/cart/add-item';
export const CART_PATH = '/wp-json/wc/store/v1/cart';
export const SECOND_UNIT_MAX_GAP_MS = 20000;

export const SIGNALS = Object.freeze( {
	LOST_LINE: 'bag-lost-line',
	COOLDOWN: 'cooldown-blocked-second-unit',
	REJECTED: 'add-rejected',
} );

export async function readBag( page ) {
	const raw = await page.evaluate( async ( path ) => {
		const res = await fetch( path, { credentials: 'same-origin', headers: { Accept: 'application/json' } } );
		return { status: res.status, body: await res.json().catch( () => null ) };
	}, CART_PATH );
	if ( raw.status !== 200 || ! raw.body || ! Array.isArray( raw.body.items ) ) {
		throw new Error( `Store API cart read failed (HTTP ${ raw.status })` );
	}
	const lines = raw.body.items.map( ( i ) => ( { id: Number( i.id ), key: i.key, name: i.name, quantity: Number( i.quantity ) } ) );
	return { lines, itemsCount: lines.reduce( ( n, l ) => n + l.quantity, 0 ) };
}

// Starts recording the page's add-item calls. `at` is a wall-clock time so a gap between two adds can be measured.
export function trackAdds( page, now = () => Date.now() ) {
	const list = [];
	page.on( 'response', async ( res ) => {
		const req = res.request();
		if ( req.method() !== 'POST' || ! res.url().includes( ADD_ITEM_PATH ) ) {
			return;
		}
		const json = await res.json().catch( () => null );
		let body = null;
		try {
			body = req.postDataJSON();
		} catch {
			body = null;
		}
		list.push( {
			at: now(),
			status: res.status(),
			code: json && typeof json.code === 'string' ? json.code : null,
			message: json && typeof json.message === 'string' ? json.message : null,
			id: body && body.id ? Number( body.id ) : null,
			quantity: body && body.quantity ? Number( body.quantity ) : null,
		} );
	} );
	return { list };
}

// Picks the first available option in every group that has no answer yet. Runs in the page.
function chooseOptionsInPage() {
	const form = document.querySelector( '.buybox__cart-form' );
	const root = ( form && form.closest( '[data-wp-interactive]' ) ) || document;
	const groups = new Map();
	root.querySelectorAll( '.sgs-option-picker__option input[type="radio"]' ).forEach( ( input ) => {
		if ( ! groups.has( input.name ) ) {
			groups.set( input.name, [] );
		}
		groups.get( input.name ).push( input );
	} );
	for ( const inputs of groups.values() ) {
		if ( inputs.some( ( i ) => i.checked ) ) {
			continue;
		}
		const pick = inputs.find( ( i ) => ! i.disabled && i.closest( '.sgs-option-picker__option' )?.getAttribute( 'aria-disabled' ) !== 'true' );
		if ( pick ) {
			( pick.closest( 'label' ) || pick ).click();
		}
	}
}

// Presses the buybox's add button once and waits for the resulting add-item response. Returns that add record plus
// the cart-status text the shopper sees under the button.
export async function addViaUi( page, tracker, { timeoutMs = 20000 } = {} ) {
	await page.waitForSelector( '.buybox__cart-form button[type="submit"]', { state: 'visible', timeout: timeoutMs } );
	await page.evaluate( chooseOptionsInPage );
	const before = tracker.list.length;
	await page.locator( '.buybox__cart-form button[type="submit"]' ).first().click( { timeout: timeoutMs } );
	const deadline = Date.now() + timeoutMs;
	while ( tracker.list.length === before && Date.now() < deadline ) {
		await page.waitForTimeout( 100 );
	}
	if ( tracker.list.length === before ) {
		throw new Error( 'the add button was pressed but no add-item request was made' );
	}
	await page.waitForTimeout( 400 );
	const ui = await page.locator( '.buybox__cart-status' ).first().textContent( { timeout: 2000 } ).catch( () => '' );
	return { ...tracker.list[ tracker.list.length - 1 ], ui: ( ui || '' ).trim() };
}

// Two in-stock products whose pages carry a buybox, from the Store API (never hard-coded: any client site works).
// SGS_FLOW_PRODUCT_A / SGS_FLOW_PRODUCT_B (paths or URLs) override the pick.
export async function pickProducts( page, base, count = 2, env = process.env ) {
	const forced = [ env.SGS_FLOW_PRODUCT_A, env.SGS_FLOW_PRODUCT_B ].filter( Boolean );
	if ( forced.length >= count ) {
		return forced.slice( 0, count ).map( ( u ) => ( u.startsWith( 'http' ) ? u : base + u ) );
	}
	const found = await listBuyboxProducts( page, base, count );
	if ( found.length < count ) {
		throw new Error( `needed ${ count } in-stock products with a buybox, found ${ found.length }` );
	}
	return found;
}

// Up to `max` in-stock product pages that carry a buybox, in Store API order.
export async function listBuyboxProducts( page, base, max ) {
	await page.goto( base + '/', { waitUntil: 'domcontentloaded' } );
	const products = await page.evaluate( async () => {
		const res = await fetch( '/wp-json/wc/store/v1/products?per_page=40', { credentials: 'same-origin' } );
		return res.ok ? res.json() : [];
	} );
	const urls = [];
	for ( const p of products ) {
		if ( p.is_in_stock && p.is_purchasable && p.permalink && ! urls.includes( p.permalink ) ) {
			urls.push( p.permalink );
		}
	}
	const found = [];
	for ( const url of urls ) {
		await page.goto( url, { waitUntil: 'domcontentloaded' } );
		if ( await page.locator( '.buybox__cart-form button[type="submit"]' ).count() ) {
			found.push( url );
		}
		if ( found.length === max ) {
			break;
		}
	}
	return found;
}

// ── Pure assertions ───────────────────────────────────────────────────────────

// An add the shop refused is its own failure, named so it is never mistaken for a lost line.
export function rejectedAdd( add ) {
	return add.status >= 200 && add.status < 300 ? null : `${ SIGNALS.REJECTED } (HTTP ${ add.status }${ add.code ? ' ' + add.code : '' })`;
}

// Two different products: both adds returned 2xx, so the bag must hold two lines, one per product asked for.
export function assertTwoProducts( addA, addB, bag ) {
	const refused = rejectedAdd( addA ) || rejectedAdd( addB );
	if ( refused ) {
		return { ok: false, signal: refused, detail: 'the add itself was refused, so the bag was never given the chance to lose a line' };
	}
	const have = bag.lines.map( ( l ) => l.id );
	const missing = [ addA.id, addB.id ].filter( ( id ) => ! have.includes( id ) );
	if ( bag.lines.length !== 2 || missing.length ) {
		return {
			ok: false,
			signal: SIGNALS.LOST_LINE,
			detail: `both adds returned ${ addA.status }/${ addB.status } but the bag holds ${ bag.lines.length } line(s) [${ have.join( ', ' ) }]; expected 2 lines including ${ addA.id } and ${ addB.id }`,
		};
	}
	return { ok: true, signal: null, detail: `bag holds both products (${ addA.id }, ${ addB.id })` };
}

// True when the second add was blocked by the cooldown, by status and code or by what the shopper reads.
export function isCooldownBlock( add ) {
	return ( add.status === 429 && add.code === 'sgs_rate_limited' ) || /please wait/i.test( add.ui || '' );
}

// A second unit of the same product, inside the window where a per-item cooldown would still apply. The gap is
// asserted here because a 31-second wait would let a 30-second cooldown expire and hide the bug.
export function assertSecondUnit( first, second, bag, { maxGapMs = SECOND_UNIT_MAX_GAP_MS } = {} ) {
	const gapMs = second.at - first.at;
	if ( gapMs >= maxGapMs ) {
		return { ok: false, invalid: true, signal: 'gap-too-long', detail: `the second add came ${ gapMs } ms after the first; it must be under ${ maxGapMs } ms or a 30 s cooldown could have expired unseen` };
	}
	if ( isCooldownBlock( second ) ) {
		return { ok: false, signal: SIGNALS.COOLDOWN, detail: `second unit refused ${ gapMs } ms after the first: HTTP ${ second.status } ${ second.code || '' } ${ second.ui || second.message || '' }`.trim() };
	}
	const refused = rejectedAdd( second );
	if ( refused ) {
		return { ok: false, signal: refused, detail: `second unit refused ${ gapMs } ms after the first` };
	}
	const units = bag.lines.filter( ( l ) => l.id === first.id ).reduce( ( n, l ) => n + l.quantity, 0 );
	if ( units !== 2 ) {
		return { ok: false, signal: SIGNALS.LOST_LINE, detail: `second add returned ${ second.status } but the bag holds ${ units } unit(s) of product ${ first.id }; expected 2` };
	}
	return { ok: true, signal: null, detail: `2 units of product ${ first.id } in the bag, second add ${ gapMs } ms after the first` };
}
