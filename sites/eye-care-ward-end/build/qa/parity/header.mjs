// Parity config: the site header's pop-up surfaces on the Home page (the header is the same site-wide):
// the four desktop mega panels (Sunglasses, Brands, Lenses, Help) and the phone menu drawer. The bag
// drawer is covered by bag.mjs and neither side has a search pop-up (checked 2026-09-29 at 1440 and 375).
//
// How each opens (Playwright inspection, 2026-09-29):
//  - Desktop mega panels: both sides open on POINTER HOVER over the top-nav item. Draft: the nav item is
//    an <a> with no class names; live: a `.sgs-nav-bar-menu__mega-trigger` button inside
//    `.sgs-nav-bar-menu__item--mega`, panel `.sgs-nav-bar-menu__mega-panel-wrap`. A click on live after
//    a hover toggles the panel shut again, so the states use hover only. The panels are full-width
//    layers under the header (no dialog role on either side).
//  - Phone menu: the "Menu" button (aria-label="Menu" on both sides). Draft: a fixed full-screen div
//    (no role); live: a native `<dialog class="sgs-nav-drawer">` labelled "Navigation menu".
//
// The walker runs every state at every width (no per-state widths): below desktop the nav items are
// not shown, so the hover states find nothing (the hover helper is a no-op then) and their pairs read
// missing on both sides; at desktop the Menu button is not shown, so `drawer-open` is a no-op there.
// Run the mega states at 1440 and 768 and `drawer-open` at 375:
//   node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/header.mjs --widths 1440 --states mega-shop,mega-brands,mega-lenses,mega-help
//   node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/header.mjs --widths 375 --states drawer-open
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/?cb={cb}';

const vis = 'const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden"; };';

// The open mega panel, found by the words it starts with. Draft: the deepest full-width layer
// under the header whose text starts with them (no class names). Live: the visible
// `.sgs-nav-bar-menu__mega-panel-wrap` that starts with them.
const dpanel = ( start ) => `(() => { ${ vis } const re = /^\\s*${ start }/i; const c = [...document.querySelectorAll('div,section')].filter((e) => vis(e) && e.getBoundingClientRect().width >= 1400 && e.getBoundingClientRect().top > 80 && e.getBoundingClientRect().top < 220 && re.test(e.innerText)); const min = Math.min(...c.map((e) => e.textContent.length)); return c.filter((e) => e.textContent.length === min).pop() || null; })()`;
const lpanel = ( start ) => `(() => { ${ vis } const re = /^\\s*${ start }/i; return [...document.querySelectorAll('.sgs-nav-bar-menu__mega-panel-wrap')].find((e) => vis(e) && re.test(e.textContent)) || null; })()`;
const panelOf = { draft: dpanel, live: lpanel };

// A finder for something inside the open panel: `inner` is `(panel) => element`.
const inside = ( side, start, inner ) => ( { js: `(r) => { const p = ${ panelOf[ side ]( start ) }; return p && (${ inner })(p); }` } );
// The smallest visible element in the panel whose rendered text matches `src`, optionally limited by tag.
const byText = ( src, tag = '*' ) => `(p) => { ${ vis } return [...p.querySelectorAll('${ tag }')].filter((e) => vis(e) && new RegExp(${ JSON.stringify( src ) }, 'i').test(e.innerText.replace(/\\s+/g, ' ').trim())).sort((a, b) => a.textContent.length - b.textContent.length)[0]; }`;
// The first / last visible link in the panel whose text starts with `src`.
const linkStarting = ( src, last = false ) => `(p) => { ${ vis } const l = [...p.querySelectorAll('a')].filter((e) => vis(e) && new RegExp(${ JSON.stringify( '^' + src ) }, 'i').test(e.innerText.trim())); return l[ ${ last ? 'l.length - 1' : '0' } ]; }`;
const none = '(p) => null';

// One pair on the panel's own box, and one hover pair on the trigger, per mega state.
const panelPair = ( name, state, start ) => ( { name, states: [ state ], text: false, box: [ 'w', 'h' ], props: [ 'background-color', 'padding-top', 'padding-left', 'box-shadow', 'border-bottom-width' ],
	draft: inside( 'draft', start, '(p) => p' ), live: inside( 'live', start, '(p) => p' ) } );
const triggerPair = ( name, state, label ) => ( { name, states: [ state ], hover: true,
	draft: { text: `^${ label }$`, tag: 'a', within: 'header' },
	live: { text: `^${ label }$`, tag: 'button', within: 'header' } } );
// A pair for the same thing on both sides, found in the open panel by two inner functions.
const inPanel = ( name, state, start, dInner, lInner, extra = {} ) => ( { name, states: [ state ], ...extra,
	draft: inside( 'draft', start, dInner ), live: inside( 'live', start, lInner ) } );

// Moves the pointer clear of any open panel, then onto the nav item: each mega state starts from a closed header.
const openMega = ( label ) => async ( h ) => {
	await h.page.mouse.move( 700, 880 );
	await h.wait( 700 );
	await h.hover( { text: `^${ label }$`, tag: 'a,button', within: 'header' }, { wait: 1100 } );
};

// The Menu button exists below desktop only; on desktop this is a no-op on both sides.
const openMenu = async ( h ) => {
	await h.clickText( '^$', { within: 'header', tag: 'button[aria-label="Menu"]', optional: true, wait: 1100 } );
};

// The phone drawer: draft is a fixed full-screen layer with no role; live is `<dialog class="sgs-nav-drawer">`.
const DDRAWER = `(() => { ${ vis } return [...document.querySelectorAll('body *')].find((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 600 && e.getBoundingClientRect().width > 300 && /close menu/i.test(e.innerHTML)) || null; })()`;
const LDRAWER = '.sgs-nav-drawer[open]';
const din = ( inner ) => ( { js: `(r) => { const p = ${ DDRAWER }; return p && (${ inner })(p); }` } );
const lin = ( inner ) => ( { within: LDRAWER, js: `(r) => (${ inner })(r)` } );
const dlink = ( src ) => `(p) => [...p.querySelectorAll('a,button')].find((e) => e.offsetParent !== null && new RegExp(${ JSON.stringify( src ) }, 'i').test(e.innerText.trim()))`;
const llink = ( src ) => `(r) => [...r.querySelectorAll('a')].find((e) => e.offsetParent !== null && new RegExp(${ JSON.stringify( src ) }, 'i').test(e.innerText.trim()))`;

export default {
	name: 'header',
	// The panels and the drawer are layers over the page: scrolling moves nothing in them.
	autoScroll: false,
	// The automatic whole-page comparison is left to home.mjs (the header is chrome the walker
	// excludes by default); this config compares the named pop-up pairs only.
	auto: false,
	draft: { url: DRAFT },
	live: { url: LIVE },
	states: [
		{ name: 'closed', draft: ( h ) => h.wait( 200 ), live: ( h ) => h.wait( 200 ) },
		{ name: 'mega-shop', draft: openMega( 'sunglasses' ), live: openMega( 'sunglasses' ) },
		{ name: 'mega-brands', draft: openMega( 'brands' ), live: openMega( 'brands' ) },
		{ name: 'mega-lenses', draft: openMega( 'lenses' ), live: openMega( 'lenses' ) },
		{ name: 'mega-help', draft: openMega( 'help' ), live: openMega( 'help' ) },
		// Below desktop only (375 and 768 both show the Menu button when the nav collapses).
		{ name: 'drawer-open', draft: async ( h ) => { await h.page.mouse.move( 700, 880 ); await openMenu( h ); }, live: async ( h ) => { await h.page.mouse.move( 700, 880 ); await openMenu( h ); } },
	],
	pairs: [
		// Sunglasses: two link columns (By style, Shop by) and a promo card with a picture.
		triggerPair( 'shop-trigger', 'mega-shop', 'sunglasses' ),
		panelPair( 'shop-panel', 'mega-shop', 'by style' ),
		inPanel( 'shop-heading-style', 'mega-shop', 'by style', byText( '^by style$' ), byText( '^by style$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'shop-heading-shopby', 'mega-shop', 'by style', byText( '^shop by$' ), byText( '^shop by$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'shop-link-pilot', 'mega-shop', 'by style', linkStarting( 'pilot' ), linkStarting( 'pilot' ), { hover: true } ),
		inPanel( 'shop-link-best-sellers', 'mega-shop', 'by style', linkStarting( 'best sellers' ), linkStarting( 'best sellers' ), { hover: true } ),
		inPanel( 'shop-link-mens', 'mega-shop', 'by style', linkStarting( 'men.s' ), linkStarting( 'men.s' ) ),
		inPanel( 'shop-promo-card', 'mega-shop', 'by style', linkStarting( 'prescription sunglasses' ), '(p) => p.querySelector(".sgs-media__link")', { hover: true, text: false } ),
		// A picture in the promo card is on live only (the draft's card is text): a one-sided-control finding.
		inPanel( 'shop-promo-image', 'mega-shop', 'by style', none, '(p) => p.querySelector(".sgs-media__img")', { text: false } ),

		// Brands: "Most asked for" tiles with frame counts, then the "All 40 brands" list.
		triggerPair( 'brands-trigger', 'mega-brands', 'brands' ),
		panelPair( 'brands-panel', 'mega-brands', 'most asked for' ),
		inPanel( 'brands-heading-top', 'mega-brands', 'most asked for', byText( '^most asked for$' ), byText( '^most asked for$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'brands-heading-all', 'mega-brands', 'most asked for', byText( '^all 40 brands$' ), byText( '^all 40 brands$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'brands-top-first', 'mega-brands', 'most asked for', linkStarting( 'ray-ban' ), linkStarting( 'ray-ban' ), { hover: true } ),
		inPanel( 'brands-top-count', 'mega-brands', 'most asked for', byText( '^48 frames$' ), byText( '^48 frames$' ), { box: [ 'h' ] } ),
		inPanel( 'brands-list-last', 'mega-brands', 'most asked for', linkStarting( '[a-z]', true ), linkStarting( '[a-z]', true ), { hover: true } ),

		// Lenses: four lens-type cards, each a link with a title, a price and a line of copy.
		triggerPair( 'lenses-trigger', 'mega-lenses', 'lenses' ),
		panelPair( 'lenses-panel', 'mega-lenses', 'single vision' ),
		inPanel( 'lenses-card-single', 'mega-lenses', 'single vision', linkStarting( 'single vision' ), linkStarting( 'single vision' ), { hover: true, text: false } ),
		inPanel( 'lenses-title-single', 'mega-lenses', 'single vision', byText( '^single vision$' ), byText( '^single vision$' ), { box: [ 'h' ] } ),
		inPanel( 'lenses-price-single', 'mega-lenses', 'single vision', byText( '^from \\S*59$' ), byText( '^from \\S*59$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'lenses-card-light', 'mega-lenses', 'single vision', linkStarting( 'light-reactive' ), linkStarting( 'light-reactive' ), { hover: true, text: false } ),

		// Help: three columns (Buying here, Prescriptions, Talk to me).
		triggerPair( 'help-trigger', 'mega-help', 'help' ),
		panelPair( 'help-panel', 'mega-help', 'buying here' ),
		inPanel( 'help-heading-buying', 'mega-help', 'buying here', byText( '^buying here$' ), byText( '^buying here$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'help-heading-talk', 'mega-help', 'buying here', byText( '^talk to me$' ), byText( '^talk to me$', 'h3' ), { box: [ 'h' ] } ),
		inPanel( 'help-link-delivery', 'mega-help', 'buying here', linkStarting( 'delivery' ), linkStarting( 'delivery' ), { hover: true } ),
		inPanel( 'help-link-phone', 'mega-help', 'buying here', linkStarting( '0121' ), linkStarting( '0121' ), { hover: true } ),

		// The phone menu drawer.
		{ name: 'menu-button', states: [ 'drawer-open' ], hover: true,
			draft: { within: 'header', js: '(r) => r.querySelector("button[aria-label=\\"Menu\\"]")' },
			live: { within: 'header', js: '(r) => r.querySelector("button[aria-label=\\"Menu\\"]")' } },
		{ name: 'drawer-panel', states: [ 'drawer-open' ], text: false, box: [ 'w', 'h' ], props: [ 'background-color', 'padding-top', 'padding-left' ],
			draft: din( '(p) => p' ), live: LDRAWER },
		{ name: 'drawer-close', states: [ 'drawer-open' ], hover: true,
			draft: din( '(p) => p.querySelector("button[aria-label=\\"Close menu\\"]")' ), live: `${ LDRAWER } .sgs-nav-drawer__close` },
		{ name: 'drawer-link-sunglasses', states: [ 'drawer-open' ], box: [ 'h' ], draft: din( dlink( '^sunglasses$' ) ), live: lin( llink( '^sunglasses$' ) ) },
		{ name: 'drawer-link-lenses', states: [ 'drawer-open' ], box: [ 'h' ], draft: din( dlink( '^prescription lenses$' ) ), live: lin( llink( '^prescription lenses$' ) ) },
		{ name: 'drawer-link-about', states: [ 'drawer-open' ], hover: true, draft: din( dlink( '^about eye care$' ) ), live: lin( llink( '^about eye care$' ) ) },
		{ name: 'drawer-link-contact', states: [ 'drawer-open' ], hover: true, draft: din( dlink( '^contact$' ) ), live: lin( llink( '^contact$' ) ) },
		{ name: 'drawer-phone', states: [ 'drawer-open' ], hover: true, draft: din( dlink( '^0121 729 8233$' ) ), live: lin( llink( '^0121 729 8233$' ) ) },
		{ name: 'drawer-whatsapp', states: [ 'drawer-open' ], hover: true, text: false,
			draft: din( '(p) => p.querySelector("a[aria-label=\\"WhatsApp\\"]")' ), live: `${ LDRAWER } .sgs-social-icons__item[aria-label*="WhatsApp"]` },
	],
	// No accept rules: nothing measured yet (no walk run for this config).
	accept: [],
};
