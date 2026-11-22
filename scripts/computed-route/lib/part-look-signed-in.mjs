// The signed-in views of an account surface for the part-look command (template-rework Task 7): the orders list, an order's page,
// the addresses and the account details, read from the draft signed in and from the scratch copy signed in as the seeded customer.
//
// The draft side. A draft draws its signed-in account from its own store (the account, its orders and addresses), and only after a
// sign-in: the data-branch seam (lib/skeleton-data-branches.mjs::forceRenderVals) can force the signed-in branch's test, but the
// lists inside it are derived from the same store, so a forced branch renders an account with no orders and no addresses and no
// card to read. So the read signs in the way a visitor does: on the draft's sign-in page it fills the form that holds a
// current-password field (any identity and password; the draft's own logic seeds its sample account) and submits it through the
// form's own submit, then opens the account page in the same browser context (the draft keeps the account in its own storage).
// Each view is then opened by the draft's own controls: every repeated control of the account menu in turn (a tab), and the
// item page through the first listed item's own control (a repeated card that holds an amount). Nothing is told by its words.
//
// Which parts a view reads: a part of the locator group with `view: "detail"` is read only on the item page (its locators would
// find the list's own elements on a tab); every other part is read on the tabs. The first view that locates a part keeps it.
//
// The live side: the scratch copy is opened signed in through WordPress's own sign-in form, at each width, on the account page and
// on every view its own menu links to (the sign-out link left out) and the seeded order's page; the first view whose page holds a
// part's selector keeps it.
import path from 'node:path';
import { serveDraft } from './draft.mjs';
import { loadChromium } from './fill-read.mjs';
import { READ_PROPS, WIDTHS, findPartsInPage } from './fill-part-look.mjs';
import { readLiveInPage } from './part-look-verify.mjs';
import { runOpeningSteps } from './part-look-run.mjs';

// The parts of a locator group a view reads: 'detail' the parts marked `view: "detail"`, 'tab' every other part.
export function partsOfView( parts, view ) {
	return Object.entries( parts || {} ).filter( ( [ , loc ] ) => ( 'detail' === view ) === ( 'detail' === loc?.view ) ).map( ( [ name ] ) => name );
}

// Adds one view's finds at one width to `reads` ({ part: { width: [ instance ] } }). A part another view located first keeps that
// view (`filled` maps a part to the view that located it); an empty find adds nothing.
export function mergeViewReads( { reads, filled, found, width, view } ) {
	for ( const [ part, list ] of Object.entries( found || {} ) ) {
		if ( ! list?.length || ( filled[ part ] && filled[ part ] !== view ) ) {
			continue;
		}
		filled[ part ] = view;
		( reads[ part ] ??= {} )[ width ] = list;
	}
	return reads;
}

// In-page: signs in through the page's sign-in form, the form holding a current-password field (else the one form with one password
// field and no new-password field), with an identity field (an email input, or an email or username token). Sets each value through
// the input's own value setter and an input event (a framework-controlled field keeps it) and submits through the form's own submit.
// Returns null, or why it could not.
export function signInInPage( { identity, password } ) {
	const tokens = ( el ) => String( el.getAttribute( 'autocomplete' ) || el.getAttribute( 'sc-camel-auto-complete' ) || '' ).toLowerCase().split( /\s+/ );
	const forms = [ ...document.querySelectorAll( 'form' ) ].filter( ( f ) => f.getBoundingClientRect().height > 0 );
	const pw = ( f ) => [ ...f.querySelectorAll( 'input[type=password]' ) ];
	let form = forms.find( ( f ) => pw( f ).some( ( i ) => tokens( i ).includes( 'current-password' ) ) );
	if ( ! form ) {
		const plain = forms.filter( ( f ) => 1 === pw( f ).length && ! pw( f ).some( ( i ) => tokens( i ).includes( 'new-password' ) ) );
		form = 1 === plain.length ? plain[ 0 ] : null;
	}
	if ( ! form ) {
		return 'the page has no sign-in form (a form with a current-password field)';
	}
	const id = [ ...form.querySelectorAll( 'input' ) ].find( ( i ) => 'email' === i.type || tokens( i ).some( ( t ) => [ 'email', 'username' ].includes( t ) ) );
	if ( ! id ) {
		return 'the sign-in form has no email or username field';
	}
	const setter = Object.getOwnPropertyDescriptor( HTMLInputElement.prototype, 'value' ).set;
	const fill = ( el, v ) => {
		setter.call( el, v );
		el.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		el.dispatchEvent( new Event( 'change', { bubbles: true } ) );
	};
	fill( id, identity );
	fill( pw( form ).find( ( i ) => tokens( i ).includes( 'current-password' ) ) || pw( form )[ 0 ], password );
	const submit = form.querySelector( 'button[type=submit], input[type=submit], button:not([type])' );
	submit ? form.requestSubmit( submit ) : form.requestSubmit();
	return null;
}

// In-page: the account menu's view controls, or does one thing with them. The menu is the navigation landmark (a nav, or an element
// of role navigation or tablist) inside the main content that holds two or more repeated controls (buttons or links sharing their
// shape); its view controls are those repeated controls, so a lone control beside them (sign out) is not one.
// { action: 'count' } returns how many; { action: 'open', index } clicks that one and returns whether it could.
export function menuInPage( { action, index = 0 } ) {
	const isControl = ( el ) => [ 'BUTTON', 'A' ].includes( el.tagName ) || 'button' === el.getAttribute( 'role' ) || 'tab' === el.getAttribute( 'role' );
	const signature = ( el ) => `${ el.tagName }|${ [ ...el.children ].map( ( c ) => c.tagName ).join( ',' ) }`;
	const shown = ( el ) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
	const controlsOf = ( nav ) => {
		const all = [ ...nav.querySelectorAll( '*' ) ].filter( ( el ) => isControl( el ) && shown( el ) );
		return all.filter( ( el ) => all.some( ( o ) => o !== el && o.parentElement?.parentElement === el.parentElement?.parentElement && signature( o ) === signature( el ) ) );
	};
	const main = document.querySelector( 'main' ) || document.body;
	const navs = [ ...main.querySelectorAll( 'nav, [role=navigation], [role=tablist]' ) ].filter( ( n ) => shown( n ) && ! n.closest( 'header, footer' ) && controlsOf( n ).length >= 2 );
	const controls = navs.length ? controlsOf( navs[ 0 ] ) : [];
	if ( 'count' === action ) {
		return controls.length;
	}
	if ( ! controls[ index ] ) {
		return false;
	}
	controls[ index ].click();
	return true;
}

// In-page: opens the first listed item's own page: the first of two or more repeated cards outside the account menu that each hold
// an amount and a control, through that card's last control. Returns whether it found one to click.
export function openItemInPage() {
	const AMOUNT = /[£$€]\s?\d|\d\s?[£$€]/;
	const isControl = ( el ) => [ 'BUTTON', 'A' ].includes( el.tagName ) || 'button' === el.getAttribute( 'role' );
	const signature = ( el ) => `${ el.tagName }|${ [ ...el.children ].map( ( c ) => c.tagName ).join( ',' ) }`;
	const main = document.querySelector( 'main' ) || document.body;
	const inMenu = ( el ) => !! el.closest( 'nav, [role=navigation], [role=tablist], header, footer' );
	const cards = [ ...main.querySelectorAll( '*' ) ].filter( ( el ) => ! inMenu( el ) && 'TR' !== el.tagName && el.getBoundingClientRect().height > 0 && AMOUNT.test( el.textContent || '' ) && [ ...el.querySelectorAll( '*' ) ].some( isControl ) && [ ...( el.parentElement?.children || [] ) ].some( ( s ) => s !== el && signature( s ) === signature( el ) ) );
	const smallest = cards.filter( ( c ) => ! cards.some( ( o ) => o !== c && c.contains( o ) ) );
	const first = smallest[ 0 ];
	const controls = first ? [ ...first.querySelectorAll( '*' ) ].filter( isControl ) : [];
	if ( ! controls.length ) {
		return false;
	}
	controls.at( -1 ).click();
	return true;
}

// Opens each account-menu tab in turn and reads it. `open( i )` answers whether tab i opened (menuInPage's answer); a tab that did not
// open is noted and skipped, never read, because the page still shows the previous view and its parts would be recorded under this
// tab's name. Returns how many tabs were read.
export async function readTabViews( { tabs, open, read, notes, width } ) {
	let done = 0;
	for ( let i = 0; i < tabs; i++ ) {
		if ( ! await open( i ) ) {
			notes.push( `tab ${ i + 1 } of the account menu could not be opened at ${ width }px, so it is not read` );
			continue;
		}
		await read( i );
		done++;
	}
	return done;
}

// Opens the item page from the first tab's list and reads it. `openFirstTab()` answers whether the first tab opened (menuInPage's
// answer) and `openItem()` whether an item page opened from its list. A first tab that did not open is noted and nothing is read,
// because the page still shows the last tab's view and an item opened from it would be recorded as the first tab's item page.
// Returns whether the item page was read.
export async function readItemView( { openFirstTab, openItem, read, notes, width } ) {
	if ( ! await openFirstTab() ) {
		notes.push( `the first tab of the account menu could not be opened again at ${ width }px, so no item page is read` );
		return false;
	}
	if ( ! await openItem() ) {
		1440 === width && notes.push( 'the first tab lists no item with an amount and a control, so no item page is read' );
		return false;
	}
	await read();
	return true;
}

const settle = async ( page ) => {
	await page.waitForFunction( () => document.querySelector( '#dc-root' )?.children.length > 0, null, { timeout: 45000 } ).catch( () => {} );
	await page.evaluate( () => document.fonts?.ready ).catch( () => {} );
	await page.waitForTimeout( 900 );
};

// Signs the draft in on one width's page and leaves it on the signed-in account: through the sign-in page file, then the account
// page file; or, in a one-file draft (`signinRoute`), on the main file sent to its own sign-in route by the draft's logic, where the
// draft's sign-in takes the visitor on to its account itself. `goto( file )` opens a served file; `openRoute( route )` runs the route
// (lib/part-look-run.mjs::runOpeningSteps' answer: null, or why not). Throws when a step fails.
export async function signInDraft( { page, mainFile, signinFile = null, signinRoute = null, goto, openRoute, settleMs = 1200 } ) {
	const where = signinFile ?? `${ mainFile } at its route "${ signinRoute }"`;
	await goto( signinFile ?? mainFile );
	if ( ! signinFile ) {
		const failure = await openRoute( signinRoute );
		if ( failure ) {
			throw new Error( `${ where }: ${ failure }` );
		}
		await page.waitForTimeout( 900 );
	}
	const failure = await page.evaluate( signInInPage, { identity: 'reader@example.com', password: 'Reader-pass-2026' } );
	if ( failure ) {
		throw new Error( `${ where }: ${ failure }` );
	}
	await page.waitForTimeout( settleMs );
	signinFile && await goto( mainFile );
	return where;
}

// Reads the signed-in views of a served draft at each width: { reads, filled, views, notes }. `mainFile` is the account page,
// `signinFile` the draft's sign-in page, or `signinRoute` the sign-in route of a one-file draft (no sign-in file); `spec` the locator
// group's spec as readParts takes it; `parts` the group's parts (for their `view`). Each width opens a fresh browser context, signs in,
// opens the account page and reads every view.
export async function readSignedInParts( { draftDir, mainFile, signinFile = null, signinRoute = null, spec, parts, pages, headed = false, log = () => {} } ) {
	if ( ! signinFile && ! signinRoute ) {
		throw new Error( 'the signed-in views need the draft\'s sign-in page file or, in a one-file draft, its sign-in route' );
	}
	const { chromium } = await loadChromium();
	const served = await serveDraft( draftDir, { index: mainFile } );
	const browser = await chromium.launch( { headless: ! headed, args: [ '--hide-scrollbars' ] } );
	const reads = {};
	const filled = {};
	const views = {};
	const notes = [];
	const read = async ( page, width, view, names ) => {
		const found = await page.evaluate( findPartsInPage, { spec, names, props: READ_PROPS, pages } );
		mergeViewReads( { reads, filled, found, width, view } );
		( views[ view ] ??= {} )[ width ] = Object.values( found ).filter( ( l ) => l.length ).length;
	};
	try {
		for ( const width of WIDTHS ) {
			const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
			try {
				const page = await ctx.newPage();
				const where = await signInDraft( {
					page, mainFile, signinFile, signinRoute,
					goto: async ( file ) => {
						await page.goto( `${ served.url }${ encodeURIComponent( file ) }`, { waitUntil: 'load', timeout: 60000 } );
						await settle( page );
					},
					openRoute: ( route ) => runOpeningSteps( page, { route } ),
				} );
				const tabs = await page.evaluate( menuInPage, { action: 'count' } );
				if ( ! tabs ) {
					throw new Error( `${ mainFile } shows no account menu after signing in on ${ where }: the draft did not sign in` );
				}
				await readTabViews( {
					tabs,
					width,
					notes,
					open: async ( i ) => {
						const opened = await page.evaluate( menuInPage, { action: 'open', index: i } );
						await page.waitForTimeout( 700 );
						return opened;
					},
					read: ( i ) => read( page, width, `tab ${ i + 1 }`, partsOfView( parts, 'tab' ) ),
				} );
				// The item page opens from the first tab's list.
				await readItemView( {
					width,
					notes,
					openFirstTab: async () => {
						const opened = await page.evaluate( menuInPage, { action: 'open', index: 0 } );
						await page.waitForTimeout( 700 );
						return opened;
					},
					openItem: async () => {
						const opened = await page.evaluate( openItemInPage );
						opened && await page.waitForTimeout( 900 );
						return opened;
					},
					read: () => read( page, width, 'detail', partsOfView( parts, 'detail' ) ),
				} );
				log( `read ${ mainFile } signed in at ${ width }px: ${ tabs } tabs and ${ views.detail?.[ width ] !== undefined ? 'the item page' : 'no item page' }` );
			} finally {
				await ctx.close();
			}
		}
	} finally {
		await browser.close();
		await served.close();
	}
	return { reads, filled, views, notes };
}

// The customer the seed made and the order page it gave them, from seed.php's output (its last JSON line): { login, orderView }.
export function signedInSeedOf( text ) {
	const line = String( text ).split( '\n' ).map( ( l ) => l.trim() ).filter( ( l ) => l.startsWith( '{' ) ).pop();
	const seed = line ? JSON.parse( line ) : null;
	if ( ! seed?.customer?.login ) {
		throw new Error( 'the seed file names no customer (the output of scripts/render-check/seed.php)' );
	}
	return { login: seed.customer.login, orderView: seed.order?.view ?? null };
}

// The live views to read, in order: the account page, every view its menu links to except signing out, then the seeded order's
// page. `menu` is [ { href, logout } ] read from the live menu; paths are kept site-relative.
export function liveViewPaths( { accountPath, menu = [], orderView = null } ) {
	const rel = ( href ) => {
		try {
			const u = new URL( href, 'http://site.invalid' );
			return `${ u.pathname }${ u.search }`;
		} catch ( e ) {
			return null;
		}
	};
	const out = [ accountPath ];
	for ( const m of menu ) {
		const p = m.logout ? null : rel( m.href );
		p && ! out.includes( p ) && out.push( p );
	}
	orderView && ! out.includes( orderView ) && out.push( orderView );
	return out;
}

// In-page: the live account menu's links: [ { href, logout } ] (WooCommerce's menu item classes name the endpoint).
export function liveMenuInPage() {
	return [ ...document.querySelectorAll( '.woocommerce-MyAccount-navigation-link a[href]' ) ].map( ( a ) => ( { href: a.getAttribute( 'href' ), logout: !! a.closest( '.woocommerce-MyAccount-navigation-link--customer-logout' ) } ) );
}

// Reads the scratch copy's signed-in views at each width: { reads, shown, paths }. `login` is { user, pass }; `pagePath` the
// account page's address. Signs in through wp-login.php, opens the account page, follows its menu and the seeded order's page.
export async function readLiveSignedIn( { base, pagePath, login, orderView = null, selectors, props = READ_PROPS, headed = false } ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: ! headed, args: [ '--hide-scrollbars' ] } );
	const reads = {};
	const shown = {};
	const filled = {};
	let paths = [];
	try {
		for ( const width of WIDTHS ) {
			const ctx = await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'reduce' } );
			try {
				const page = await ctx.newPage();
				await signInLive( page, base, login );
				await page.goto( `${ base }${ pagePath }`, { waitUntil: 'load', timeout: 60000 } );
				const accountPath = new URL( page.url() ).pathname;
				paths = liveViewPaths( { accountPath, menu: await page.evaluate( liveMenuInPage ), orderView } );
				for ( const p of paths ) {
					await page.goto( `${ base }${ p }`, { waitUntil: 'load', timeout: 60000 } );
					await page.evaluate( () => document.fonts && document.fonts.ready ).catch( () => {} );
					await page.waitForTimeout( 900 );
					const found = await page.evaluate( readLiveInPage, { selectors, props } );
					mergeViewReads( { reads, filled, found: Object.fromEntries( Object.entries( found ).map( ( [ part, r ] ) => [ part, r.instances ] ) ), width, view: p } );
					1440 === width && Object.entries( found ).forEach( ( [ part, r ] ) => ( shown[ part ] = Math.max( shown[ part ] || 0, r.instances.length ) ) );
				}
			} finally {
				await ctx.close();
			}
		}
	} finally {
		await browser.close();
	}
	return { reads, shown, paths };
}

// Signs a browser page in to a WordPress site through its own sign-in form; throws when the site does not accept the login.
export async function signInLive( page, base, { user, pass } ) {
	await page.goto( `${ base }/wp-login.php`, { waitUntil: 'load', timeout: 60000 } );
	await page.fill( '#user_login', user );
	await page.fill( '#user_pass', pass );
	await Promise.all( [ page.waitForNavigation( { timeout: 60000 } ).catch( () => {} ), page.click( '#wp-submit' ) ] );
	const cookies = await page.context().cookies();
	if ( ! cookies.some( ( c ) => c.name.startsWith( 'wordpress_logged_in' ) ) ) {
		throw new Error( `${ base } did not sign ${ user } in` );
	}
}

// The file name of a live view's picture: the site path with every run of characters a Windows file name cannot hold (`?`, `=`, `&`, `:`, `/`)
// as one hyphen, so plain permalinks (`/?page_id=12&view-order=7`) name a file and two such views never share one.
export function shotName( { prefix, path: viewPath, width } ) {
	const slug = String( viewPath ).split( /[^A-Za-z0-9._-]+/ ).filter( Boolean ).join( '-' ) || 'account';
	return `${ prefix }-${ slug }-${ width }.png`;
}

// Full-page pictures of the scratch copy's signed-in views at one width: { path: file }.
export async function shootLiveSignedIn( { base, pagePath, login, orderView = null, width = 1440, dir, prefix } ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true, args: [ '--hide-scrollbars' ] } );
	const files = {};
	try {
		const ctx = await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: 'reduce' } );
		const page = await ctx.newPage();
		await signInLive( page, base, login );
		await page.goto( `${ base }${ pagePath }`, { waitUntil: 'load', timeout: 60000 } );
		const paths = liveViewPaths( { accountPath: new URL( page.url() ).pathname, menu: await page.evaluate( liveMenuInPage ), orderView } );
		for ( const p of paths ) {
			await page.goto( `${ base }${ p }`, { waitUntil: 'load', timeout: 60000 } );
			await page.waitForTimeout( 1200 );
			const file = path.join( dir, shotName( { prefix, path: p, width } ) );
			await page.screenshot( { path: file, fullPage: true } );
			files[ p ] = file;
		}
	} finally {
		await browser.close();
	}
	return files;
}
