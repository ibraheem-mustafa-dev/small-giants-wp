// The navigation checks of a site check (site-check.mjs): the header menu's links against the page map, each mega menu
// opening its panel and closing, and the drawer opening and closing at a width. Every check works on the page as it is
// loaded (the caller navigates and sets the width) and judges the block's own behaviour: nothing is forced open, so a
// trigger whose handler never runs fails. The markers the blocks emit are Spec 36's: a mega trigger carries
// `data-sgs-mega-trigger` with `aria-controls` naming its panel (includes/nav-menu-markup.php), the burger is a header
// button whose `aria-controls` names the drawer, a <dialog> (sgs/nav-drawer).

const SETTLE_MS = 600;
export const MARK = 'data-site-check';

// In-page: whether an element shows: a <dialog> must be open; the element must render a box and not be hidden by CSS
// or opacity. Content below the fold shows.
export function shownInPage( el ) {
	if ( ! el || ! el.isConnected || ( 'DIALOG' === el.tagName && ! el.open ) ) {
		return false;
	}
	if ( el.checkVisibility && ! el.checkVisibility( { checkOpacity: true, checkVisibilityCSS: true } ) ) {
		return false;
	}
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0;
}

// In-page: whether an opened panel shows on screen: shownInPage's test plus overlapping the viewport (a drawer parked
// off-screen by a transform is closed). Self-contained, because it travels into the page as source.
export function onScreenInPage( el ) {
	if ( ! el || ! el.isConnected || ( 'DIALOG' === el.tagName && ! el.open ) ) {
		return false;
	}
	if ( el.checkVisibility && ! el.checkVisibility( { checkOpacity: true, checkVisibilityCSS: true } ) ) {
		return false;
	}
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}

// The normalised address of a link for comparison: origin + path without its trailing slash; query and hash dropped.
export function pathKey( href, base ) {
	try {
		const u = new URL( href, base );
		return `${ u.origin }${ u.pathname.replace( /\/+$/, '' ) }`;
	} catch {
		return null;
	}
}

// In-page: every link of the header: [{ text, href (as written), abs, inMenu (inside a menu bar), disclosure,
// selector }]. A link carrying aria-expanded / aria-controls or the mega marker is a disclosure trigger. The header is
// the page's `.sgs-site-header`, else its first <header>.
export function readHeaderLinksInPage() {
	const header = document.querySelector( '.sgs-site-header' ) || document.querySelector( 'header' );
	if ( ! header ) {
		return { header: false, links: [] };
	}
	const links = [ ...header.querySelectorAll( 'a' ) ].map( ( a, i ) => ( {
		text: ( a.textContent.replace( /\s+/g, ' ' ).trim() || a.getAttribute( 'aria-label' ) || '' ).slice( 0, 80 ),
		href: a.getAttribute( 'href' ),
		abs: a.href,
		inMenu: !! a.closest( '.sgs-nav-bar-menu, nav' ),
		disclosure: a.hasAttribute( 'data-sgs-mega-trigger' ) || a.hasAttribute( 'aria-controls' ) || a.hasAttribute( 'aria-expanded' ),
		selector: `${ header.classList.contains( 'sgs-site-header' ) ? '.sgs-site-header' : 'header' } a >> nth=${ i }`,
	} ) );
	return { header: true, links };
}

// In-page: the links of the page that point at a draft file (a Claude Design `.dc.html` route the clone never resolved
// to a site address): [{ text, href }].
export function readDraftLinksInPage() {
	return [ ...document.querySelectorAll( 'a[href]' ) ].filter( ( a ) => /\.dc\.html\b/i.test( a.getAttribute( 'href' ) ) ).map( ( a ) => ( { text: a.textContent.replace( /\s+/g, ' ' ).trim().slice( 0, 60 ), href: a.getAttribute( 'href' ) } ) );
}

const DRAFT_HREF = /\.dc\.html\b/i;

// The menu check's items, from the header's links and the resolved pages:
//   pages: [{ key, finalUrl }] (page-map pages as they loaded); examples: [{ key, finalUrl }] (a product or category
//   row's example: any link under the same parent path reaches that row); headerRows: [{ key, title, url|null }]
//   (page-map rows the draft puts in the header menu); draftLinks: [{ href, text, pages: [key] }] (every checked page's
//   links to a draft file). A link passes when its address is a page-map page; a draft-file link, `#`, an empty href or
//   any other address on the site fails, as does an off-site link in the menu bar; a `#` disclosure trigger and an
//   off-site, mailto or tel link outside the menu bar are n-a. A header row no link reaches (by address, else by its
//   title as the link text) fails as missing; each draft-file address any page links to fails once.
export function menuItems( { header, links, pages, examples = [], headerRows, draftLinks = [], base, url } ) {
	if ( ! header ) {
		return [ { status: 'fail', subject: 'header', url, error: 'the page has no .sgs-site-header or <header>' } ];
	}
	if ( ! links.some( ( l ) => l.inMenu ) ) {
		return [ { status: 'fail', subject: 'header menu', url, error: 'the header holds no menu links' } ];
	}
	const known = new Map( pages.filter( ( p ) => p.finalUrl ).map( ( p ) => [ pathKey( p.finalUrl, base ), p ] ) );
	const under = examples.filter( ( e ) => e.finalUrl ).map( ( e ) => ( { key: e.key, prefix: pathKey( e.finalUrl, base ).replace( /\/[^/]*$/, '/' ) } ) );
	const origin = new URL( base ).origin;
	const items = links.map( ( l ) => {
		const ev = { subject: `${ l.inMenu ? 'menu' : 'header' } link "${ l.text || '(no text)' }"`, url, selector: l.selector };
		const raw = String( l.href ?? '' ).trim();
		if ( DRAFT_HREF.test( raw ) ) {
			return { status: 'fail', ...ev, error: `points at the draft file ${ raw } (an unresolved draft link)` };
		}
		if ( ! raw || raw.startsWith( '#' ) ) {
			return l.disclosure ? { status: 'n-a', ...ev, detail: `href "${ raw }" on a disclosure trigger (it opens a panel; the mega check covers it)` } : { status: 'fail', ...ev, error: `points at "${ raw || '(empty)' }", not a page` };
		}
		if ( /^(mailto|tel|sms):/i.test( raw ) ) {
			return { status: 'n-a', ...ev, detail: `a contact link (${ raw })` };
		}
		const k = pathKey( l.abs || raw, base );
		const hit = k && ( known.get( k ) || under.find( ( u ) => k.startsWith( u.prefix ) ) );
		if ( hit ) {
			return { status: 'pass', ...ev, detail: `${ raw } is ${ hit.key }` };
		}
		if ( k && ! k.startsWith( origin ) ) {
			return l.inMenu ? { status: 'fail', ...ev, error: `points off the site: ${ raw }` } : { status: 'n-a', ...ev, detail: `an off-site link (${ raw })` };
		}
		return { status: 'fail', ...ev, error: `${ raw } is not a page-map page` };
	} );
	const linkKeys = new Set( links.map( ( l ) => pathKey( l.abs || l.href || '', base ) ) );
	const texts = links.map( ( l ) => l.text.toLowerCase() );
	for ( const r of headerRows ) {
		const byUrl = r.url && linkKeys.has( pathKey( r.url, base ) );
		const byText = r.title && texts.includes( String( r.title ).toLowerCase() );
		if ( ! byUrl && ! byText ) {
			items.push( { status: 'fail', subject: `page-map header item ${ r.key }`, url, error: `the page map puts ${ r.key } ("${ r.title }") in the header menu; no header link reaches it${ r.url ? ` (${ r.url })` : '' }` } );
		}
	}
	for ( const d of draftLinks ) {
		items.push( { status: 'fail', subject: `draft-file link "${ d.text || d.href }"`, error: `${ d.href } is a draft file, not a site address; linked from ${ d.pages.join( ', ' ) }` } );
	}
	return items;
}

// In-page: marks the visible mega triggers of the header (MARK="mega-<i>") and their panels (MARK="panel-<i>"):
// [{ i, text, panelId, hasPanel }].
export function markMegaInPage( mark ) {
	const header = document.querySelector( '.sgs-site-header' ) || document.querySelector( 'header' ) || document.body;
	document.querySelectorAll( `[${ mark }]` ).forEach( ( e ) => e.removeAttribute( mark ) );
	const shown = ( el ) => el.checkVisibility ? el.checkVisibility( { checkVisibilityCSS: true } ) && el.getBoundingClientRect().width > 0 : !! el.offsetParent;
	return [ ...header.querySelectorAll( '[data-sgs-mega-trigger]' ) ].filter( shown ).map( ( t, i ) => {
		t.setAttribute( mark, `mega-${ i }` );
		const panelId = t.getAttribute( 'aria-controls' );
		const panel = panelId && document.getElementById( panelId );
		panel && panel.setAttribute( mark, `panel-${ i }` );
		return { i, text: t.textContent.replace( /\s+/g, ' ' ).trim(), panelId, hasPanel: !! panel };
	} );
}

// In-page: { expanded, shown } of a marked trigger and its marked target.
export function stateInPage( [ mark, trigger, target, shownSrc ] ) {
	// The source is this module's own onScreenInPage, never page or site text.
	const shown = new Function( `return (${ shownSrc })` )();
	const t = document.querySelector( `[${ mark }="${ trigger }"]` );
	const p = document.querySelector( `[${ mark }="${ target }"]` );
	return { expanded: t?.getAttribute( 'aria-expanded' ) ?? null, shown: shown( p ) };
}

const stateOf = ( page, trigger, target ) => page.evaluate( stateInPage, [ MARK, trigger, target, onScreenInPage.toString() ] );
const isOpen = ( s ) => s.shown && 'false' !== s.expanded;
const isClosed = ( s ) => ! s.shown && 'true' !== s.expanded;

// Moves the pointer and focus off everything, so a hover- or focus-opened panel has no reason to stay open.
async function release( page ) {
	await page.mouse.move( 1, 1 );
	await page.evaluate( () => document.activeElement?.blur() );
}

// Opens one marked disclosure the way a visitor would: hover, then focus and ArrowDown, then a click. A click that
// leaves the page (a link trigger whose handler did not run) is recorded and the page is brought back. Returns
// { opened, how, tried, navigated }.
export async function openDisclosure( page, trigger, target ) {
	const loc = page.locator( `[${ MARK }="${ trigger }"]` ).first();
	const startUrl = page.url();
	const tried = [];
	const ways = [
		[ 'hover', () => loc.hover() ],
		[ 'focus + ArrowDown', async () => {
			await loc.focus();
			await page.keyboard.press( 'ArrowDown' );
		} ],
		[ 'click', () => loc.click( { noWaitAfter: true } ) ],
	];
	for ( const [ how, act ] of ways ) {
		tried.push( how );
		await act().catch( () => {} );
		await page.waitForTimeout( SETTLE_MS );
		if ( page.url() !== startUrl ) {
			const navigated = page.url();
			await page.goto( startUrl, { waitUntil: 'load' } );
			return { opened: false, how: null, tried, navigated };
		}
		if ( isOpen( await stateOf( page, trigger, target ) ) ) {
			return { opened: true, how, tried, navigated: null };
		}
		await release( page );
	}
	return { opened: false, how: null, tried, navigated: null };
}

// Closes an open marked disclosure: `closer` (a selector inside the target, e.g. a close button) when given, then
// Escape, then moving the pointer and focus away. Returns { closed, how }.
export async function closeDisclosure( page, trigger, target, closer = null ) {
	const ways = [];
	if ( closer ) {
		ways.push( [ `the close button (${ closer })`, () => page.locator( `[${ MARK }="${ target }"] ${ closer }` ).first().click( { timeout: 3000 } ) ] );
	}
	ways.push( [ 'Escape', () => page.keyboard.press( 'Escape' ) ], [ 'pointer and focus moved away', () => release( page ) ] );
	for ( const [ how, act ] of ways ) {
		await act().catch( () => {} );
		await page.waitForTimeout( SETTLE_MS );
		if ( isClosed( await stateOf( page, trigger, target ) ) ) {
			return { closed: true, how };
		}
	}
	return { closed: false, how: null };
}

// The mega check on the loaded page: one item per visible mega trigger in the header. `shoot(name)` saves a screenshot
// and returns its path.
export async function megaItems( page, { url, shoot } ) {
	const triggers = await page.evaluate( markMegaInPage, MARK );
	const items = [];
	for ( const t of triggers ) {
		const subject = `mega "${ t.text }"`;
		const selector = `[data-sgs-mega-trigger][aria-controls="${ t.panelId }"]`;
		if ( ! t.hasPanel ) {
			items.push( { status: 'fail', subject, url, selector, error: `aria-controls names "${ t.panelId }", which is not on the page` } );
			continue;
		}
		const open = await openDisclosure( page, `mega-${ t.i }`, `panel-${ t.i }` );
		if ( ! open.opened ) {
			items.push( { status: 'fail', subject, url, selector, screenshot: await shoot( `mega-${ t.i }-not-open` ), error: open.navigated ? `the trigger navigated to ${ open.navigated } instead of opening its panel` : `the panel never showed (tried ${ open.tried.join( ', ' ) })` } );
			await page.evaluate( markMegaInPage, MARK );
			continue;
		}
		const screenshot = await shoot( `mega-${ t.i }-open` );
		const close = await closeDisclosure( page, `mega-${ t.i }`, `panel-${ t.i }` );
		items.push( close.closed ? { status: 'pass', subject, url, selector, screenshot, detail: `opened by ${ open.how }, closed by ${ close.how }` } : { status: 'fail', subject, url, selector, screenshot, error: `opened by ${ open.how } but did not close (Escape, pointer and focus moved away)` } );
	}
	return items;
}

// In-page: marks the header's visible burger (MARK="burger") and its drawer (MARK="drawer"): a header button whose
// aria-controls names a <dialog>, a role=dialog element or a drawer. { burger, drawer, drawerAnywhere, controls, closer }.
export function markDrawerInPage( mark ) {
	document.querySelectorAll( `[${ mark }]` ).forEach( ( e ) => e.removeAttribute( mark ) );
	const header = document.querySelector( '.sgs-site-header' ) || document.querySelector( 'header' ) || document.body;
	const isDrawer = ( el ) => el && ( 'DIALOG' === el.tagName || 'dialog' === el.getAttribute( 'role' ) || /drawer/i.test( el.className ) );
	const visible = ( el ) => ( el.checkVisibility ? el.checkVisibility( { checkVisibilityCSS: true, checkOpacity: true } ) : !! el.offsetParent ) && el.getBoundingClientRect().width > 0;
	const candidates = [ ...header.querySelectorAll( 'button[aria-controls]' ) ].filter( ( b ) => isDrawer( document.getElementById( b.getAttribute( 'aria-controls' ) ) ) );
	const burger = candidates.find( visible );
	const drawerAnywhere = candidates.length > 0 || !! document.querySelector( 'dialog[class*="drawer"], [class*="nav-drawer"][role="dialog"]' );
	if ( ! burger ) {
		return { burger: false, drawer: false, drawerAnywhere, controls: candidates[ 0 ]?.getAttribute( 'aria-controls' ) ?? null };
	}
	const drawer = document.getElementById( burger.getAttribute( 'aria-controls' ) );
	burger.setAttribute( mark, 'burger' );
	drawer.setAttribute( mark, 'drawer' );
	const close = drawer.querySelector( '[class*="__close"], button[aria-label*="close" i]' );
	const closer = close ? ( close.className && 'string' === typeof close.className ? `.${ close.className.trim().split( /\s+/ )[ 0 ] }` : 'button[aria-label*="close" i]' ) : null;
	return { burger: true, drawer: true, drawerAnywhere, controls: drawer.id, closer };
}

// The drawer check at one width, on the page loaded at that width: n-a when the page has no drawer, or (above the
// phone width) when the bar shows its links instead of a burger; fail when a drawer exists but no burger shows at the
// phone width, the drawer never shows after the burger's click, or it does not close.
export async function drawerItem( page, { width, url, shoot, phoneWidth = 375 } ) {
	const m = await page.evaluate( markDrawerInPage, MARK );
	const subject = `drawer at ${ width }`;
	if ( ! m.burger ) {
		if ( ! m.drawerAnywhere ) {
			return { status: 'n-a', subject, url, detail: 'the page has no drawer and no burger' };
		}
		return width <= phoneWidth ?
			{ status: 'fail', subject, url, screenshot: await shoot( `drawer-${ width }-no-burger` ), error: `a drawer${ m.controls ? ` (#${ m.controls })` : '' } exists but no burger shows in the header` } :
			{ status: 'n-a', subject, url, detail: 'no burger shows at this width (the bar shows its links)' };
	}
	const selector = `header button[aria-controls="${ m.controls }"]`;
	await page.locator( `[${ MARK }="burger"]` ).first().click( { timeout: 5000 } ).catch( () => {} );
	await page.waitForTimeout( SETTLE_MS );
	const opened = await stateOf( page, 'burger', 'drawer' );
	if ( ! isOpen( opened ) ) {
		return { status: 'fail', subject, url, selector, screenshot: await shoot( `drawer-${ width }-not-open` ), error: `the drawer #${ m.controls } did not show after the burger's click (shown ${ opened.shown }, aria-expanded ${ opened.expanded })` };
	}
	const screenshot = await shoot( `drawer-${ width }-open` );
	const close = await closeDisclosure( page, 'burger', 'drawer', m.closer );
	return close.closed ?
		{ status: 'pass', subject, url, selector, screenshot, detail: `opened by the burger, closed by ${ close.how }` } :
		{ status: 'fail', subject, url, selector, screenshot, error: `the drawer opened but did not close (${ m.closer ? `close button ${ m.closer}, ` : 'no close button, ' }Escape, pointer moved away)` };
}
