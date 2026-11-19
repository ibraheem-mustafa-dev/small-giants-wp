// Who a capture views a page as: a guest, a guest with the seeded product in the basket, the seeded customer, or the
// customer with that product in the basket. Each is made once per side and pass and handed to every state's context as
// a storage state, so states that share a viewer share one basket and nothing re-adds per page.
// The basket is filled by posting WooCommerce's own add-to-cart form (seed.php's addFields, picks included), which works
// for a guest and a signed-in customer alike (the Store API would need a REST nonce to act as the customer).

const NOISY = /stripe\.com|stripe\.network|stripecdn|googletagmanager|google-analytics|doubleclick|facebook\.net/;

export async function blockNoisy( ctx ) {
	await ctx.route( NOISY, ( r ) => r.abort() );
}

// After the form is sent, wait for the sign-in cookie itself or the sign-in page's own error message, whichever comes
// first (up to 60 s), then for the page it lands on: waiting for "loaded" alone returns at once, because the sign-in
// page is already loaded. A wrong password shows the error within one page load; a busy machine can take far longer to
// set the cookie, so the cookie wait is long and a refused sign-in still ends quickly.
const SIGN_IN_ERROR = '#login_error, .woocommerce-error';
async function awaitSignedIn( page ) {
	for ( let i = 0; i < 240; i++ ) {
		if ( ( await page.context().cookies() ).some( ( c ) => c.name.startsWith( 'wordpress_logged_in' ) ) ) {
			break;
		}
		if ( await page.locator( SIGN_IN_ERROR ).count().catch( () => 0 ) ) {
			break;
		}
		await page.waitForTimeout( 250 );
	}
	await page.waitForLoadState( 'load' ).catch( () => {} );
}

async function signIn( page, origin, user, pwd ) {
	await page.goto( origin + '/wp-login.php', { waitUntil: 'load', timeout: 60000 } );
	if ( await page.locator( '#user_login' ).count() ) {
		await page.fill( '#user_login', user );
		await page.fill( '#user_pass', pwd );
		await page.click( '#wp-submit' );
		return awaitSignedIn( page );
	}
	// A site that hides wp-login.php: WooCommerce's own sign-in form on the account page.
	await page.goto( origin + '/my-account/', { waitUntil: 'load', timeout: 60000 } );
	await page.fill( '#username', user );
	await page.fill( '#password', pwd );
	await page.click( 'button[name=login]' );
	return awaitSignedIn( page );
}

/**
 * Make one viewer's storage state. Returns { state, error }; error names what failed (the sign-in, the basket).
 */
export async function makeViewer( browser, { origin, auth, basket, user, pwd, product } ) {
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	await blockNoisy( ctx );
	const page = await ctx.newPage();
	try {
		if ( auth === 'customer' ) {
			await signIn( page, origin, user, pwd );
			const cookies = await ctx.cookies();
			if ( ! cookies.some( ( c ) => c.name.startsWith( 'wordpress_logged_in' ) ) ) {
				// A refusal shows the sign-in page's error; no cookie and no error means the site never answered in time.
				const refused = await page.locator( SIGN_IN_ERROR ).count().catch( () => 0 );
				return { state: null, error: refused
					? 'sign-in failed: the sign-in page refused ' + user
					: 'sign-in failed: no wordpress_logged_in cookie and no sign-in error after signing in as ' + user };
			}
		}
		if ( basket ) {
			// WooCommerce's own add-to-cart form, posted with the fields seed.php proved the shop accepts.
			await ctx.request.post( origin + product.path, { form: product.addFields, maxRedirects: 5 } );
			const cookies = await ctx.cookies();
			if ( ! cookies.some( ( c ) => c.name.startsWith( 'woocommerce_items_in_cart' ) ) ) {
				return { state: null, error: 'basket not filled: no woocommerce_items_in_cart cookie after adding product ' + product.id };
			}
		}
		return { state: await ctx.storageState(), error: null };
	} catch ( e ) {
		return { state: null, error: 'viewer ' + auth + ( basket ? '+basket' : '' ) + ' threw: ' + String( e ).split( '\n' )[ 0 ].slice( 0, 200 ) };
	} finally {
		await ctx.close();
	}
}
