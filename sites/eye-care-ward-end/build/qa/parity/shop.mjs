// Parity config: the shop archive (draft "Sunglasses" view vs eye-care-test /shop/). Each filter state starts
// from a fresh page and applies one filter by clicking it on both sides, as a shopper does (a filter loaded
// by URL skips WooCommerce's Interactivity re-render, which is where the panel's looks broke).
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/shop.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/shop/?cb={cb}';
const LF = '#sgs-shop-filters';
// The draft’s product grid: the grid in main whose every child is a priced card (no aside below desktop).
const DGRID = `(r) => [...document.querySelectorAll('main div')].find((x) => getComputedStyle(x).display === 'grid' && x.children.length >= 2 && ! x.querySelector('aside') && [...x.children].every((c) => c.textContent.includes('£')))`;
// A card in the draft’s grid, by product name.
const dcard = ( name ) => `(r) => { const g = (${ DGRID })(r); const c = g && [...g.children].find((c) => c.textContent.includes('${ name }')); return c && c.firstElementChild.firstElementChild; }`;
const lcard = ( name ) => `(r) => [...document.querySelectorAll('.sgs-shop-layout .wc-block-product-template > li')].find((c) => c.textContent.includes('${ name }'))?.querySelector('.sgs-product-card, .product-card')`;
// The draft's "CLEAR ALL" in its chosen-filter row above the grid.
const DCLEAR = `(r) => { const c = [...document.querySelectorAll('main button')].find((b) => b.offsetParent && /^clear all$/i.test(b.textContent.trim())); return c; }`;
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );

// The draft is a single-page app: its "Sunglasses" link is navigation, not an interaction.
const shopOn = {
	draft: async ( h ) => {
		await h.goto( DRAFT );
		await h.clickText( '^sunglasses$', { wait: 1200, nav: true } );
	},
	live: ( h ) => h.goto( LIVE ),
};
// Below desktop both sides keep the filters in a drawer behind a "Filter" button (no-op on desktop).
const openFilters = ( h ) => h.clickText( '^filter$', { tag: 'button', optional: true, wait: 900 } );
// Both drawers close with "Show N frames"; each applies a choice as it is made.
const closeFilters = ( h ) => h.clickText( '^show \\d+ frames?$', { tag: 'button', optional: true, wait: 900 } );
// One filter clicked on each side from a fresh shop page; `keepOpen` leaves the drawer open to compare the panel.
const pick = ( draftClick, liveClick, keepOpen = false ) => Object.fromEntries( [ [ 'draft', draftClick ], [ 'live', liveClick ] ].map( ( [ side, click ] ) => [ side, async ( h ) => {
	await shopOn[ side ]( h );
	await openFilters( h );
	await click( h );
	if ( ! keepOpen ) {
		await closeFilters( h );
	}
} ] ) );
const scrollDown = async ( h, side ) => {
	await shopOn[ side ]( h );
	await h.page.evaluate( () => window.scrollTo( { top: 1200, behavior: 'instant' } ) );
	await h.wait( 1200 );
};
const liveSwatch =( slug ) => ( h ) => h.click( `${ LF } [id="attribute/colour-${ slug }"]`, { quiet: true, wait: 1200 } );
// What a shopper does with the other filter controls: types into the brand search, chooses a sort, moves the price
// slider with the keyboard. The brand search takes a real mouse tap (focus) then real key presses; the sort and the
// slider are logged as clicks so the drive check sees both sides interacting. PageDown moves a range input by a tenth
// of its span on both sides (the draft's slider steps by 10, live's by 1, so arrow keys would move them unequally).
const DBRANDS = 'aside input[aria-label="Search brands"]';
const LBRANDS = `${ LF } .sgs-filter-search__input`;
const DSORT = 'select[aria-label="Sort"]';
const LSORT = 'select.orderby';
const DPRICE = 'aside input[aria-label="Maximum price"]';
const LPRICE = `${ LF } .wc-block-product-filter-price-slider__range input.max`;
const typeBrand = ( sel ) => async ( h ) => {
	await h.tap( sel, { wait: 300, name: 'brand search' } );
	await h.page.keyboard.type( 'ray', { delay: 70 } );
	await h.wait( 800 );
};
const chooseSort = ( sel, value ) => async ( h ) => {
	h.log.push( { type: 'click', target: 'sort', hit: true } );
	await h.page.selectOption( sel, value );
	await h.quiet();
	await h.wait( 900 );
};
const nudgePrice = ( sel ) => async ( h ) => {
	h.log.push( { type: 'click', target: 'price slider', hit: true } );
	await h.page.locator( sel ).focus();
	for ( let i = 0; i < 3; i++ ) {
		await h.page.keyboard.press( 'PageDown' );
	}
	await h.quiet();
	await h.wait( 900 );
};
// The first card's title after a sort: the grid's first card on each side.
const DFIRSTNAME = `(r) => { const g = (${ DGRID })(r); const c = g && g.children[0] && g.children[0].firstElementChild.firstElementChild; return c && c.children[2].children[0].querySelector('a'); }`;

const DEXCLUDE = [ 'a[aria-label^="Message Fatima"]', { js: '(r) => { const h = [...document.querySelectorAll("aside button")].find((b) => /^brand/i.test(b.textContent.trim())); return h && h.parentElement; }' }, { js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' } ];

export default {
	name: 'shop',
	widths: [ 375, 768, 1440, 1920 ],
	// Ref tracing (Spec 47 FR-47-6 item 7): every row names the tree node (cr-ref-<surface>-<n>) it was measured on.
	refPrefix: 'cr-ref-',
	// Intended differences (Spec 47 FR-47-5), shared by every Eye Care surface.
	divergences: '../divergences.json',
	draft: { url: DRAFT, open: ( h ) => h.clickText( '^sunglasses$', { wait: 1200 } ) },
	live: { url: LIVE },
	// Nav-track chrome outside the header and footer on both sides: the draft's floating WhatsApp bubble and
	// the "100% genuine" trust bar above the header (the draft's has no class names: the full-width row
	// holding its text).
	auto: { exclude: {
		// The brand list: live lists the real 14 brands, the draft a made-up 40 (Bean 2026-09-27), so its words
		// pair badly with card chips; the named brand pairs check its look.
		draft: DEXCLUDE,
		live: [ '.sgs-trust-bar', { js: '(r) => { const l = document.querySelector("#sgs-shop-filters [for^=\\"taxonomy/product_brand\\"]"); return l && ( l.closest("details") || l.closest(".wp-block-woocommerce-product-filter-taxonomy")?.parentElement ); }' } ],
	} },
	states: [
		{ name: 'opening', fullPage: true },
		{
			name: 'filters-open',
			draft: async ( h ) => {
				await shopOn.draft( h );
				await openFilters( h );
			},
			live: async ( h ) => {
				await shopOn.live( h );
				await openFilters( h );
			},
		},
		{
			name: 'women',
			...pick( ( h ) => h.clickText( '^women$', { within: 'aside', tag: 'button' } ),
				( h ) => h.clickText( '^women$', { within: LF, tag: '.sgs-shop-filters__segment', quiet: true, wait: 1500 } ) ),
		},
		{
			name: 'colour-black',
			...pick( ( h ) => h.click( 'aside button[aria-label="Black"]' ), liveSwatch( 'black' ) ),
		},
		{
			name: 'brand-ray-ban',
			...pick( ( h ) => h.clickText( '^ray-ban', { within: 'aside', tag: 'label' } ),
				( h ) => h.click( `${ LF } label[for="taxonomy/product_brand-ray-ban"]`, { quiet: true, wait: 1200 } ) ),
		},
		// The panel itself after a click (drawer left open): every group must keep its look through
		// WooCommerce's re-render (swatches, segments, chips, counts).
		{
			name: 'panel-after-click',
			// A style chip, not a colour: the draft's colour filter returns 0 frames for every colour.
			...pick( ( h ) => h.clickText( '^pilot$', { within: 'aside', tag: 'button' } ),
				( h ) => h.clickText( '^pilot', { within: LF, tag: 'button', quiet: true, wait: 1200 } ), true ),
		},
		// A filter group opened by clicking its heading (Size is closed at rest on both sides); the drawer stays open below
		// desktop so the group's own pairs are measured.
		{
			name: 'size-open',
			...pick( ( h ) => h.clickText( '^size$', { within: 'aside', tag: 'button' } ),
				( h ) => h.clickText( '^size', { within: LF, tag: 'summary', wait: 600 } ), true ),
		},
		// "ray" typed into the brand search: the list narrows to Ray-Ban.
		{ name: 'brand-typed', ...pick( typeBrand( DBRANDS ), typeBrand( LBRANDS ), true ) },
		// Sort chosen from the select (drawer closed): the grid reorders, cheapest first.
		{
			name: 'sort-low',
			draft: async ( h ) => {
				await shopOn.draft( h );
				await chooseSort( DSORT, 'low' )( h );
			},
			live: async ( h ) => {
				await shopOn.live( h );
				await chooseSort( LSORT, 'price' )( h );
			},
		},
		// The price slider’s maximum handle moved by keyboard; the drawer stays open below desktop.
		{ name: 'price-moved', ...pick( nudgePrice( DPRICE ), nudgePrice( LPRICE ), true ) },
		// Scrolled a screen and a half down: anything fixed that appears only after scrolling (GAP-CHECKLIST 5a).
		{ name: 'scrolled', draft: ( h ) => scrollDown( h, 'draft' ), live: ( h ) => scrollDown( h, 'live' ) },
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^shop$', tag: 'p' }, live: { text: '^shop$', tag: 'p', within: 'main' }, box: [ 'h' ] },
		{ name: 'title', draft: 'h1', live: 'main h1', box: [ 'h' ] },
		{ name: 'count', anchor: 'title', draft: { text: '^\\d+ frames?$', tag: 'span' }, live: '.wp-block-woocommerce-product-results-count p, .woocommerce-result-count', box: [ 'h' ] },
		{ name: 'sort', anchor: 'title', draft: 'select[aria-label="Sort"]', live: 'select.orderby', hover: true },
		// The drawer's trigger below desktop: its place (row mates: count and sort) is checked by the structure pass.
		{ name: 'filter-button', states: [ 'opening', 'women' ], draft: { text: '^filter$', tag: 'button' }, live: { text: '^filter$', tag: 'button' }, hover: true },
		{ name: 'filters', states: [ 'filters-open', 'panel-after-click' ], draft: 'aside', live: LF, box: [ 'w' ], text: false, props: [ 'background-color', 'padding-top', 'padding-left' ] },
		{ name: 'gender-heading', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^gender$', within: 'aside', tag: 'button' }, live: { text: '^gender', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'gender-all', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^all$', within: 'aside', tag: 'button' }, live: `${ LF } .sgs-shop-filters__segment`, hover: true },
		{ name: 'gender-women', states: [ 'women' ], draft: { text: '^women$', within: 'aside', tag: 'button' }, live: { text: '^women$', within: LF, tag: '.sgs-shop-filters__segment' } },
		{ name: 'swatch-black', states: [ 'filters-open', 'colour-black', 'panel-after-click' ], draft: 'aside button[aria-label="Black"]', live: `${ LF } [id="attribute/colour-black"]`, text: false, hover: true },
		{ name: 'brand-search', states: [ 'filters-open', 'brand-typed', 'panel-after-click' ], draft: 'aside input[aria-label="Search brands"]', live: `${ LF } .sgs-filter-search__input`, text: false },
		{ name: 'brand-heading', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^brand', within: 'aside', tag: 'button' }, live: { text: '^brand', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'brand-ray-ban', states: [ 'filters-open', 'brand-typed', 'brand-ray-ban', 'panel-after-click' ], draft: { text: '^ray-ban', within: 'aside', tag: 'label' }, live: `${ LF } label[for="taxonomy/product_brand-ray-ban"]` },
		{ name: 'style-chip', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^pilot$', within: 'aside', tag: 'button' }, live: { text: '^pilot', within: LF, tag: 'button' }, hover: true },
		// Found on the screenshots: the chosen-filter row and the price slider’s labels.
		{ name: 'active-pill', states: [ 'panel-after-click' ], draft: { js: DCLEAR.replace( 'return c;', 'return c && c.parentElement.firstElementChild;' ) }, live: '.sgs-shop-chosen__pill' },
		{ name: 'clear-all', states: [ 'panel-after-click' ], draft: { js: DCLEAR }, live: '.sgs-shop-chosen__clear' },
		{ name: 'price-min', states: [ 'filters-open', 'price-moved' ], draft: { text: '^£59$', within: 'aside', tag: 'span' }, live: `${ LF } .wc-block-product-filter-price-slider__left` },
		{ name: 'price-max', states: [ 'filters-open', 'price-moved' ], draft: { text: '^£339$', within: 'aside', tag: 'span' }, live: `${ LF } .wc-block-product-filter-price-slider__right` },
		// The Size group opened by its heading: the heading, a size chip (hover) and the helper line under the chips.
		{ name: 'size-heading', states: [ 'filters-open', 'size-open' ], draft: { text: '^size$', within: 'aside', tag: 'button' }, live: { text: '^size', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'size-small', states: [ 'size-open' ], draft: { text: '^small$', within: 'aside', tag: 'button' }, live: `${ LF } [id="attribute/size-small"]`, hover: true },
		{ name: 'size-note', states: [ 'size-open' ], draft: { text: '^measured across one lens$', within: 'aside', tag: 'p' }, live: { text: '^measured across one lens$', within: LF, tag: 'p' }, box: [ 'h' ] },
		// A brand label's hover (the row lifts or tints on pointer-over).
		{ name: 'brand-label-hover', states: [ 'filters-open' ], draft: { text: '^ray-ban', within: 'aside', tag: 'label' }, live: `${ LF } label[for="taxonomy/product_brand-ray-ban"]`, hover: true },
		// "ray" typed: the list under the search narrows to one label on both sides.
		{ name: 'brand-list', states: [ 'brand-typed' ], text: false, box: [ 'h' ], structure: false,
			draft: { js: `(r) => { const i = document.querySelector('${ DBRANDS }'); return i && i.nextElementSibling; }` },
			live: { js: `(r) => { const s = document.querySelector('${ LBRANDS }'); const d = s && s.closest('details'); return d && d.querySelector('.wc-block-product-filter-checkbox-list__items'); }` } },
		// The sort chosen: the select, and the first card's name (the cheapest frame leads on both).
		{ name: 'sort-select', states: [ 'sort-low' ], anchor: 'title', draft: DSORT, live: LSORT, hover: true },
		{ name: 'sort-first-name', states: [ 'sort-low' ], box: [ 'h' ], structure: false, draft: { js: DFIRSTNAME }, live: '.sgs-shop-layout .wc-block-product-template > li:nth-child(1) .product-card__title-link' },
		// The price slider moved: the range input itself (both handles share it on live).
		{ name: 'price-slider', states: [ 'filters-open', 'price-moved' ], text: false, box: [ 'h' ], draft: DPRICE, live: LPRICE },
		{ name: 'polarised-toggle', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^polarised only$', within: 'aside', tag: 'label,button,div' }, live: `${ LF } .sgs-shop-filters__bool-filter` },
		{ name: 'grid', anchor: 'title', draft: { js: DGRID }, live: '.sgs-shop-layout .wc-block-product-template', text: false, box: [ 'w' ], props: [ 'grid-template-columns', 'column-gap', 'row-gap' ] },
		// The floating Filter button live showed once scrolled on narrow screens; the draft has none.
		{ name: 'floating-filter', states: [ 'scrolled' ], draft: { js: `() => [...document.querySelectorAll('button')].find((b) => /^filter/i.test(b.textContent.trim()) && b.offsetParent && getComputedStyle(b).position === 'fixed')` }, live: '.sgs-shop-filters__sticky-trigger' },
		{ name: 'card-gucci', states: [ 'opening', 'women' ], draft: { js: dcard( 'Oversized Cat-Eye' ) }, live: { js: lcard( 'Oversized Cat-Eye' ) }, hover: true, props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'box-shadow' ] },
		// The Polarised tag in one place on every card (Bean 2026-09-27): a one-word name (Holbrook) and one that wraps
		// (Lewis 10), each tag's top and right edge measured from its own card.
		...[ [ 'holbrook', 'Holbrook' ], [ 'lewis', 'Lewis 10' ] ].flatMap( ( [ key, name ] ) => [
			{ name: `card-${ key }`, states: [ 'opening' ], draft: { js: dcard( name ) }, live: { js: lcard( name ) }, text: false, box: [ 'w' ], props: [], structure: false },
			{ name: `tag-${ key }`, states: [ 'opening' ], anchor: `card-${ key }`, anchorX: true,
				draft: { js: `(r) => { const c = (${ dcard( name ) })(r); return c && [...c.querySelectorAll('span, div')].find((e) => ! e.children.length && /^polarised$/i.test(e.textContent.trim())); }` },
				live: { js: `(r) => { const c = (${ lcard( name ) })(r); return c && c.querySelector('.sgs-product-card__attribute-tag'); }` },
				props: [ 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'color', 'border-top-width', 'border-top-color', 'padding-top', 'padding-right' ] },
		] ),
		// A card below the fold at every width: how it appears as it scrolls into view.
		{ name: 'card-7', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: `(r) => { const g = (${ DGRID })(r); const c = g && g.children[6]; return c; }` },
			live: '.sgs-shop-layout .wc-block-product-template > li:nth-child(7)' },
		// The Gucci card's parts: draft path from its bordered card, live class inside .product-card.
		...[
			[ 'media', 'c.children[0]', '.product-card__media', false ],
			[ 'photo', 'c.children[0].children[0]', '.product-card__media img', false ],
			[ 'brand', 'c.children[0].children[1]', '.sgs-product-card__brand', true ],
			[ 'save', 'c.children[0].children[2]', '.sgs-product-card__saving-badge', true ],
			[ 'wishlist', "c.querySelector('button[aria-label=Save]')", '.sgs-product-card__wishlist', false ],
			[ 'body', 'c.children[2]', '.product-card-body', false ],
			[ 'name', "c.children[2].children[0].querySelector('a')", '.product-card__title-link', true ],
			[ 'price', 'c.children[2].children[2].children[0].children[0]', '.price--current', true ],
			[ 'rrp', 'c.children[2].children[2].children[0].children[1]', '.sgs-product-card__rrp', true ],
			[ 'dot', 'c.children[2].children[2].children[1].children[0]', '.sgs-product-card__swatch', false ],
		].map( ( [ part, dpath, lsel, text ] ) => ( {
			name: `card-${ part }`,
			states: [ 'opening' ],
			draft: { js: `(r) => { const c = (${ dcard( 'Oversized Cat-Eye' ) })(r); try { return c && ${ dpath }; } catch ( e ) { return null; } }` },
			live: { js: `(r) => { const c = (${ lcard( 'Oversized Cat-Eye' ) })(r); return c && c.querySelector('${ lsel }'); }` },
			text,
			hover: 'wishlist' === part || 'dot' === part,
		} ) ),
	],
	// Links (GAP-CHECKLIST 14): every product name in the grid goes to its product page. The draft's own links are "#",
	// so the table is the only statement of where each one must go. Checked against the live page's hrefs (2026-10-02).
	links: Object.fromEntries( [
		[ 'Aviator Classic', 'ray-ban-aviator-classic' ], [ 'Oversized Cat-Eye', 'gucci-oversized-cat-eye' ], [ 'Holbrook', 'oakley-holbrook' ],
		[ 'Symbole', 'prada-symbole' ], [ 'Original Wayfarer', 'ray-ban-original-wayfarer' ], [ 'Round Metal', 'ray-ban-round-metal' ],
		[ 'Medusa Biggie', 'versace-medusa-biggie' ], [ 'PLD 6003/N', 'polaroid-pld-6003-n' ], [ 'Carrera 1055/S', 'carrera-carrera-1055-s' ],
		[ 'FZ6001', 'ferrari-scuderia-fz6001' ], [ 'SDS Shockwave', 'superdry-sds-shockwave' ], [ 'Shield', 'balenciaga-shield' ],
		[ 'Lewis 10', 'police-lewis-10' ], [ 'DG4268', 'dolce-gabbana-dg4268' ], [ 'Chelsea', 'michael-kors-chelsea' ], [ 'EA4033', 'emporio-armani-ea4033' ],
	].map( ( [ label, slug ] ) => [ label, `/product/${ slug }/` ] ) ),
	// Screenshot review, region by region; header, footer and chat bubble are the nav track.
	review: {
		'opening@1440': 'Title row: eyebrow, h1, count and sort aligned, hairline 24px under it on both. Filter column: segments, swatches in order, slider with both 14px handles whole, brand search and list, Style chips, Polarised toggle. Grid 3 columns; cards: whole-pound prices with the RRP beside, dots right, Polarised tag right of the name on Holbrook. The draft blanks rows 3+ until scrolled (its reveal). The "Every pair is genuine" note starts at the grid’s left edge under the last card on both (2026-09-28).',
		'opening@768': 'Title row with the outlined FILTER between count and sort, hairline under it. Grid 2 columns; every card reads price and RRP in whole pounds on one line with the dots at the right, Holbrook tag beside the name 17px from the card edge; stars against No reviews yet accepted.',
		'opening@375': 'Count, FILTER and sort in one row, hairline under it. Two cards across: RRP under the price with dots beside it; the Polarised tag on its own line under the name, right-aligned, on Holbrook and PLD 6003/N (Bean); Aviator and Wayfarer put their dots on a line of their own (Bean: accepted). Nothing crosses a card edge.',
		'filters-open@1440': 'The desktop column stays in place: segments, 12 round swatches in order, price slider with both handles whole and 4px in from each side, labels £59 and £339, brand count and search, list; no "up to £340" heading value (Bean: accepted earlier). Grid unchanged.',
		'filters-open@768': 'Drawer over the page: ruled Filter header (its focus ring is the scripted click, section 7), Gender segments, Size closed, swatches in one row, slider track inside the content width with both 14px handles whole, brand search and list, CLEAR and SHOW 16 FRAMES in the footer on both.',
		'filters-open@375': 'Drawer: header and close, segments, swatches in two rows, slider inside the content width with both handles fully painted and the £59 and £339 labels, brand heading count, search, Ray-Ban 3 and Balenciaga 1 (real counts, accepted), CLEAR and SHOW 16 FRAMES footer. No floating button.',
		'women@1440': 'Chosen-filter row under the title on both ("Women ×" pill, CLEAR ALL), Women segment chosen, 11 frames, same first three cards with whole-pound prices and RRPs beside them, dots right.',
		'women@768': 'FILTER (1) in the title row on both, Women pill and CLEAR ALL under the hairline, drawer closed, 11 frames, 2 columns with price and RRP on one line and dots at the right. Focus ring on FILTER is focus returning after the scripted close.',
		'women@375': 'Count, FILTER (1) and sort in one row, the Women pill row under the hairline, two cards across with the RRP under the price and dots beside it on both; Aviator keeps its four dots on their own line (Bean: accepted).',
		'colour-black@1440': 'Black swatch ringed on both, Black pill and CLEAR ALL under the title; the draft returns 0 frames (its bug, accepted) where live shows 14 cards with whole-pound prices.',
		'colour-black@768': 'FILTER (1) and the Black pill row under the hairline on both; draft empty state from its colour bug, live 2-column grid of 14 with price, RRP and dots on one line.',
		'colour-black@375': 'Toolbar row and chosen-filter row match; draft empty state (its bug) against live cards, RRP under the price with dots beside it.',
		'brand-ray-ban@1440': 'Ray-Ban pill row, 3 frames, the same three cards with whole-pound prices, RRPs and dots; the draft retitles to "Ray-Ban" with a Brand eyebrow (accepted). Live price labels £129 to £139 follow the 3 results.',
		'brand-ray-ban@768': 'FILTER (1), Ray-Ban pill and CLEAR ALL under the hairline, 3 frames, cards match (whole pounds, dots right); draft brand-page title accepted.',
		'brand-ray-ban@375': 'Toolbar row, chosen-filter row and two cards across; Wayfarer keeps its dots and +2 on their own line (Bean: accepted), Aviator the same; draft brand-page title accepted.',
		'panel-after-click@1440': 'After clicking Pilot: the panel keeps every look (segments, round swatches, counts, groups), Pilot pill row under the title, 5 frames, same 3 cards; draft retitles "Pilot" (accepted); live slider £99 to £169 for the results, both handles whole.',
		'panel-after-click@768': 'Drawer left open after Pilot: header, segments, swatches in one row, slider £99 to £169 with both handles whole inside the content width, brand count 5 with Carrera, Ferrari Scuderia, Michael Kors, Police, Ray-Ban, SHOW 5 FRAMES on both.',
		'panel-after-click@375': 'Drawer left open after Pilot: segments, two swatch rows, slider inside the content width with both handles whole, brand count 5, SHOW 5 FRAMES and CLEAR in the footer on both.',
		'size-open@1440': 'Size group opened by its heading on both: chevron up, Small, Medium and Large chips in one row (live adds real counts "(4)", "(8)", "(4)", 44px chips), Colour, Price and Brand below. The draft’s "Measured across one lens" line under the chips is missing on live (open). Grid beside the column unchanged.',
		'size-open@768': 'Drawer left open after clicking Size: Filter header, Gender segments, Size heading with chevron up, three chips in a row (live with counts), the draft’s helper line "Measured across one lens" absent on live (open), Colour swatches in one row, price slider with both handles whole, brand list, CLEAR and SHOW 16 FRAMES footer on both.',
		'size-open@375': 'Drawer at phone width with Size opened: header and close, segments, Size heading with chevron up, three chips (live adds counts), draft helper line missing on live (open), swatches in two rows, slider with £59 and £339 labels, brand heading, search and first label, CLEAR and SHOW 16 FRAMES footer.',
		'brand-typed@1440': '"ray" typed into the brand search on both: the field keeps its focus ring, the list narrows to the single Ray-Ban label with its count (48 draft, 3 live, real counts), Style chips follow below; column scrolled with the page, grid unchanged.',
		'brand-typed@768': 'Drawer left open with "ray" typed: search field ringed on both, one Ray-Ban label with its count, Style chips below (live has 9 in stock against 12), Material, Frame type and Hinge groups closed, CLEAR and SHOW 16 FRAMES footer.',
		'brand-typed@375': 'Phone drawer scrolled to Brand with "ray" typed: search field focused on both (live adds its clear cross), a single Ray-Ban label with count, Style chips wrapping in rows (9 live, 12 draft), footer CLEAR and SHOW 16 FRAMES.',
		'sort-low@1440': 'Sort changed to "Price: low to high" from the select on both: toolbar row (16 frames, select showing the choice), filter column at rest, grid now led by PLD 6003/N, SDS Shockwave and Lewis 10 at £59, £59 and £99 with the same Polarised tags.',
		'sort-low@768': 'Title row with count, outlined FILTER and the sort select showing "Price: low to high" on both; grid two across starting with PLD 6003/N (Polarised tag beside the name) and SDS Shockwave, £59 each with RRP; stars against "No reviews yet" is the accepted difference.',
		'sort-low@375': 'Count, FILTER and the sort select in one row showing "Price: low to high"; two cards across, PLD 6003/N and SDS Shockwave first on both, prices £59 with RRP and dots; the draft keeps its Polarised tag beside the name where live puts it on its own line (accepted, Bean).',
		'price-moved@1440': 'Price slider’s maximum handle moved by keyboard (PageDown three times): the draft’s bar reads "up to £250" in its heading with a handle two-thirds across, live reads a £255 label; the chosen-filter row above the grid shows an "Up to" pill and CLEAR ALL on both, 14 frames, grid starting Aviator, Holbrook, Symbole.',
		'price-moved@768': 'Drawer left open after moving the slider: price bar with the handle at about two-thirds on both (draft heading "up to £250", live label £255), Brand list below, SHOW 14 FRAMES in the footer on both; live brand count falls to 12.',
		'price-moved@375': 'Phone drawer after moving the slider: handle at about two-thirds across on both, draft heading "up to £250" against live label £255, brand list under it, CLEAR and SHOW 14 FRAMES footer on both; slider ends are whole inside the content width.',
		'scrolled@1440': 'Scrolled 1200px: the filter column stays beside the grid on both, cards Medusa Biggie to Shield with whole-pound prices; PLD 6003/N tag beside the name at the right. No floating element apart from the chat bubble (nav track).',
		'scrolled@768': 'Scrolled 1200px: no floating Filter button on either side; Wayfarer and Round Metal rows with price and RRP on one line and dots right, Versace and Polaroid below. Only the chat bubble floats (nav track).',
		'scrolled@375': 'Scrolled 1200px: no floating Filter button on either side (the draft has none; live switched off). Cards two across, PLD 6003/N tag under the name right-aligned (Bean), RRP under the price with dots beside it; only the chat bubble floats.',
		'auto-scrolled@1440': 'Scrolled a screen and a half (2026-09-28): filter column beside the grid on both; rows Medusa Biggie to Shield match with whole-pound prices and the PLD tag beside the name. The live bottom row (Police, Dolce & Gabbana, Michael Kors) is still blank where the draft shows it: its scroll reveal has not fired (open, with Bean). Only the chat bubble floats (nav track).',
		'auto-scrolled@768': 'Scrolled (2026-09-28): Wayfarer and Round Metal, then Medusa Biggie and PLD 6003/N, two across on both, prices and RRPs on one line, dots right, the PLD tag beside the name. Live draws "PHOTO TO COME" far fainter and smaller than the draft (open, with Bean). No floating Filter button; only the chat bubble floats.',
		'auto-scrolled@375': 'Scrolled (2026-09-28): two across, Medusa Biggie, PLD 6003/N (tag under the name, Bean), Carrera 1055/S and FZ6001 on both; RRP under the price with dots beside it; "No reviews yet" for the stars (Bean). Live "PHOTO TO COME" far fainter (open, with Bean). No floating Filter button; only the chat bubble floats.',
	},
	accept: [
		// The draft's filter column is still running its view-swap fade-in (Bean 2026-09-27) when the
		// walker hovers in the first state after the shop opens, so its swatch reads no growth there
		// (reproduced headless 2026-09-29). Measured directly the same day, the draft's swatch grows to
		// 1.12 on hover, as live's (sgs_shop_filter_swatch_hover 112); the later states compare it equal.
		{ pair: 'swatch-black', state: 'filters-open', kind: 'hover', reason: 'Hover sampled during the draft\'s view-swap fade-in; measured directly, the draft\'s swatch grows to 1.12 as live\'s', when: ( d ) => ( 'transform' === d.key && /^matrix\(1\.12, 0, 0, 1\.12/.test( d.live ) ) || ( 'hover-effects' === d.key && 'moves' === d.live ) },
		{ kind: 'hover', key: 'color', reason: 'Text colour on an element with no text (a swatch, dot or icon button): nothing paints it' },
		...[ 'gender-heading', 'brand-heading' ].map( ( pair ) => ( {
			pair, kind: 'style', reason: 'The same 52px heading row: live centres the text by min-height, the draft by 16px padding',
			when: ( d ) => [ 'line-height', 'padding-top', 'padding-bottom' ].includes( d.key ),
		} ) ),
		...[ 'gender-all', 'gender-women' ].map( ( pair ) => ( {
			pair, reason: 'The same segment box (within 3px): the label is centred by flex, so padding and line height do not move it',
			when: ( d ) => [ 'line-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'w' ].includes( d.key ),
		} ) ),
		{ pair: 'card-photo', kind: 'style', reason: 'The same photo: the draft paints it as a div background, live as an <img> with object-fit cover' },
		{ pair: 'card-brand', kind: 'style', key: 'background-image', reason: 'The same gradient written with and without the 0% and 100% stops', when: ( d ) => d.live.includes( '62%' ) },
		{ pair: 'card-brand', reason: 'Register S9 (Bean): live shows the brand logo image with the brand name as its alt text where the draft types the name, so the badge has no text and its text styles paint nothing (read live 2026-10-08: brand-logo-gucci.jpg)', when: ( d ) => 'text' === d.kind || ( 'style' === d.kind && null == d.live ) },
		{ pair: 'card-name', reason: 'The title link is inline live and block in the draft; the text and its position match', when: ( d ) => [ 'display', 'w' ].includes( d.key ) },
		{ pair: 'style-chip', kind: 'style', key: 'border-radius', reason: 'A 999px or 9999px radius paints the same pill' },
		{ pair: 'style-chip', kind: 'style', key: 'line-height', reason: 'One line of text inside the chip’s 44px minimum height: the line height moves nothing' },
		{ kind: 'motion', key: 'transition', reason: 'The same timings listed by property name (background vs background-color) or including a property that does not change on hover', when: ( d ) => ! /cubic-bezier\(0\.2, 0\.7/.test( d.draft ) && ! /\b0\.3s\b/.test( d.draft ) },
		// Accepted (Bean 2026-09-27): differences kept on purpose.
		{ pair: 'card-gucci', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" until real reviews exist, where the draft shows made-up stars (the card is 5-6px shorter for it)', when: ( d ) => 'text' === d.kind || 'h' === d.key },
		{ pair: 'card-body', key: 'h', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" in place of made-up stars' },
		{ pair: 'card-rrp', kind: 'text', reason: '"Recommended retail price:" is screen-reader text only', when: ( d ) => words( d.draft ) === words( d.live.replace( /recommended retail price:/i, '' ) ) },
		{ pair: 'brand-heading', kind: 'text', reason: 'Accepted (Bean 2026-09-27): live counts the real 14 brands; the draft counts a made-up catalogue of 40' },
		{ pair: 'style-chip', reason: 'Accepted (Bean 2026-09-27): 44px touch targets (the accessibility baseline) where the draft chips are 38px', when: ( d ) => [ 'h', 'padding-top', 'padding-bottom' ].includes( d.key ) },
		{ pair: 'filters', key: 'padding-left', reason: 'The same 20px inset: the draft pads each row, live pads the drawer' },
		{ pair: 'brand-search', key: 'h', reason: 'Accepted (Bean 2026-09-27): 44px touch target where the draft box is 40px' },
		{ pair: 'filters', kind: 'motion', reason: 'Accepted (Bean 2026-09-27): the draft fades its filter column in because it is a single-page app changing view; the live page loads with it' },
		{ pair: 'filters', reason: 'Accepted (Bean 2026-09-27): the live drawer slides up from the bottom (a native dialog with its header inside its 24px top padding); the draft’s drawer appears in place', when: ( d ) => [ 'padding-top', 'transition' ].includes( d.key ) },
		{ state: 'colour-black', pair: 'count', reason: 'Accepted (Bean 2026-09-27): a draft bug; its Black swatch returns "0 frames" where live returns 14' },
		{ state: 'colour-black', pair: 'grid', reason: 'Accepted (Bean 2026-09-27): a draft bug; its Black swatch returns "0 frames" where live returns 14' },
		{ pair: 'card-wishlist', kind: 'structure', key: 'inside', reason: 'The heart paints at the same place on both (283/276/115px across, 11px down from the card at 1440/768/375, 36px): live nests it in the photo box, the draft in the card' },
		{ pair: 'brand-ray-ban', kind: 'text', reason: 'Accepted (Bean 2026-09-27): real brand counts; live’s brackets are painted at font-size 0, so "Ray-Ban 3" reads as the draft’s "Ray-Ban 48" does', when: ( d ) => /^ray-ban \d+$/i.test( d.draft ) && /^ray-ban \(\d+\)$/i.test( d.live ) },
		{ pair: 'brand-ray-ban', kind: 'box', key: 'h', reason: 'Accepted (Bean 2026-09-27): 44px touch targets where the draft rows are 38px' },
		{ pair: 'brand-ray-ban', kind: 'style', notPainted: true, reason: 'The same row: live puts the count right with margin-left auto and a 10px gap on the label, the draft with space-between and the gap on an inner span', when: ( d ) => [ 'justify-content', 'column-gap', 'row-gap' ].includes( d.key ) },
		{ pair: 'active-pill', kind: 'style', notPainted: true, reason: 'The same pill: live lays the label and cross out with flex, the draft centres one text run; a 0px border has no style to paint and 999px or 9999px round the same pill', when: ( d ) => [ 'line-height', 'text-align', 'justify-content', 'border-top-style', 'border-radius' ].includes( d.key ) },
		{ pair: 'clear-all', kind: 'box', key: 'h', reason: 'Accepted (Bean 2026-09-27): 44px touch targets; the draft’s text button is 19px tall' },
		{ pair: 'clear-all', kind: 'style', reason: 'The same underlined capitals: live draws the 1px underline as a text decoration 5px below the text inside its 44px target, the draft as a bottom border under 2px padding', when: ( d ) => [ 'border-bottom-width', 'padding-bottom', 'display', 'justify-content', 'align-items', 'line-height' ].includes( d.key ) },
		{ pair: 'clear-all', kind: 'style', key: 'color', reason: 'The draft’s text is the browser default black, live’s the palette’s text #141414' },
		{ pair: 'card-7', reason: 'Off screen, nothing paints: the draft holds every card at its start pose (opacity 0, 26px down) from load, the framework only once a card is within 200px of view; both play the same fade-up on reaching view', when: ( d ) => 'opacity' === d.key || /^pre:/.test( d.key ) },
		{ pair: 'card-7', kind: 'box', key: 'h', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" is a line shorter than the draft’s made-up stars', when: ( d ) => Math.abs( d.draft - d.live ) <= 12 },
		...[ 'holbrook', 'lewis' ].map( ( key ) => ( {
			pair: `tag-${ key }`, kind: 'box', key: `right-from-card-${ key }`,
			reason: 'Accepted (Bean 2026-09-27): the tag sits in one place on every card, inside the card’s 16px inset, and the name wraps beside it; in the draft a one-word name at 375 pushes its tag past the card edge',
			when: ( d ) => d.live >= 16,
		} ) ),
		...[ 'holbrook', 'lewis' ].map( ( key ) => ( {
			pair: `tag-${ key }`, width: 375, kind: 'box', key: `y-from-card-${ key }`,
			reason: 'Accepted (Bean 2026-09-27): in a two-across phone card the tag takes its own line under the name, right-aligned, so no name breaks mid-word beside it',
			when: ( d ) => d.live - d.draft >= 20 && d.live - d.draft <= 40,
		} ) ),
		...[ 'holbrook', 'lewis' ].map( ( key ) => ( {
			pair: `card-${ key }`, kind: 'motion', key: 'running-after-action',
			reason: 'The same fade-up as card-7: the framework starts it once a card is within 200px of view, the draft on reaching view, so a snapshot can catch one side mid-play',
		} ) ),
		{ pair: 'filter-button', kind: 'style', key: 'color', reason: 'The draft’s button text is the browser default black, live’s the palette’s text #141414 (both near-black on white)' },
		// Below the drawer breakpoint the live drawer is a sheet over the page (Bean 2026-09-27), so its rows share rows with the title bar.
		...[ 768, 375 ].flatMap( ( width ) => [ 'filters-open', 'panel-after-click' ].map( ( state ) => ( {
			state, width, kind: 'structure', key: 'row', reason: 'Accepted (Bean 2026-09-27): the live drawer is a sheet over the page, the draft’s sits in the page, so drawer rows share rows with the title bar on one side only',
		} ) ) ),
		...[ 'title', 'eyebrow' ].map( ( pair ) => ( { state: 'panel-after-click', pair, reason: 'Accepted (Bean 2026-09-27, as for brands): choosing one style turns the draft into that style’s page (title "Pilot", eyebrow "Shape"); live keeps "Sunglasses" with the filter applied' } ) ),
		{ state: 'brand-ray-ban', pair: 'title', reason: 'Accepted (Bean 2026-09-27): choosing one brand turns the draft into that brand’s page (title "Ray-Ban", no Shop eyebrow); live keeps "Sunglasses" with the filter applied' },
		{ state: 'brand-ray-ban', pair: 'eyebrow', reason: 'Accepted (Bean 2026-09-27): choosing one brand turns the draft into that brand’s page (title "Ray-Ban", no Shop eyebrow); live keeps "Sunglasses" with the filter applied' },
		{ kind: 'motion', key: 'transition', reason: 'Accepted (Bean 2026-09-27): hover timing curves: live uses the site’s standard easing where the draft uses ease (card) and a custom curve (photo zoom); durations match' },
		// The automatic check (GAP-CHECKLIST section 12): the differences Bean has already decided, row by row.
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" until real reviews exist, where the draft shows made-up stars', when: ( d ) => ( ( d ) => /^text-missing "★|^text-missing "\)"$|^text-extra "no reviews yet"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27): each card is 5-6px shorter for "No reviews yet" against the draft’s stars, so the next card in the column starts that much higher', when: ( d ) => ( ( d ) => /^moved "[^"]* → [^"]*(save £|photo to come)/.test( d.key ) && Math.abs( Number( d.draft.split( ',' )[ 0 ] ) - Number( d.live.split( ',' )[ 0 ] ) ) <= 4 && Math.abs( Number( d.draft.split( ',' )[ 1 ] ) - Number( d.live.split( ',' )[ 1 ] ) ) <= 8 )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27): live lists and counts the real catalogue (14 brands, real counts per option); the draft a made-up one (40 brands)', when: ( d ) => ( ( d ) => /^text-(missing|extra) "[\d ()]+"$|^text-(missing|extra) "([a-z&'.-]+ )*\d+( [a-z&'.-]+( [a-z&'.-]+)* \d+)*"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', state: 'brand-ray-ban', reason: 'Accepted (Bean 2026-09-27): choosing one brand turns the draft into that brand’s page (Brand eyebrow, "Ray-Ban" title); live keeps "Shop / Sunglasses"', when: ( d ) => ( ( d ) => /^text-(missing|extra) "(brand ray-ban|shop sunglasses|ray-ban)"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', state: 'panel-after-click', reason: 'Accepted (Bean 2026-09-27): choosing one style turns the draft into that style’s page (Shape eyebrow, "Pilot" title); live keeps "Shop / Sunglasses"', when: ( d ) => ( ( d ) => /^text-(missing|extra) "(shape pilot|shop sunglasses)"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', state: 'colour-black', reason: 'Accepted (Bean 2026-09-27): a draft bug; its Black swatch returns "0 frames" and an empty message where live returns 14 frames', when: ( d ) => ( ( d ) => /^text-missing "(0|nothing matches all of that)|^text-extra "[^"]*(no reviews yet|£\d)/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted earlier (Bean): the price filter shows no "up to £X" heading value, and its two labels follow the prices of the results', when: ( d ) => ( ( d ) => /^text-missing "up to £\d+( £\d+ £\d+)?"$|^text-extra "£\d+ £\d+"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'The draft’s button text is the browser default black, live’s the palette’s text #141414 (both near-black on white), as the named clear-all and filter-button pairs', when: ( d ) => ( ( d ) => /^style:color "(clear all|filter|filter \(1\))"$/.test( d.key ) && 'rgb(0,0,0)' === d.draft )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', width: 375, reason: 'Accepted (Bean 2026-09-27): in a two-across phone card the tag takes its own line under the name, right-aligned, where the draft puts it beside the name', when: ( d ) => ( ( d ) => /^moved "[^"]*(polarised|6003\/n|lewis|ea4033|holbrook)/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'The same close cross: a × glyph in the draft’s drawer, an icon on live (not text)', when: ( d ) => ( ( d ) => /^text-missing "×"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-28): live shows the 9 styles with frames in stock where the draft lists 12 (Browline, Geometric, Oversized have none), so the chip rows wrap differently', when: ( d ) => ( ( d ) => /^text-missing "(browline|geometric|oversized|browline geometric|square|oval|square rectangle|oval cat-eye butterfly browline geometric shield oversized)"$/.test( d.key ) || /^moved "(square|oval|butterfly|shield|wayfarer|rectangle|round|oversized) → /.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90; the lightest fail 4.5:1 contrast)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		{ pair: '(auto)', reason: 'Crossing the brand list, which both sides leave out (the real 14 brands against the draft’s 40, Bean 2026-09-27): what follows it sits by its height; the price labels also sit 4px in from each side of the thin slider', when: ( d ) => /^moved "£\d+ → (£\d+ )?(style|clear show|brand)/.test( d.key.replace( / #\d+$/, '' ) ) },
		{ pair: '(auto)', width: 375, reason: 'Accepted (Bean 2026-09-27): Aviator and Wayfarer put their colour dots on a line of their own on phones, so their RRP has room beside the price where the draft wraps it under', when: ( d ) => /^moved "(£139 → £171 (gucci|ray-ban|carrera)|£171 → (gucci|ray-ban|carrera) save|£129 → £159|£159 → \+2|\+2 → )/.test( d.key.replace( / #\d+$/, '' ) ) },
		// Rows closed 2026-09-28, each traced on the dumped words (--dump-auto) and the shots.
		{ pair: '(auto)', width: 375, reason: 'Accepted (Bean 2026-09-27): a tagged card’s Polarised tag takes its own line under the name on phones, so the card after it in the column starts up to 32px lower', when: ( d ) => {
			const [ dx, dy ] = String( d.draft ).split( ',' ).map( Number );
			const [ lx, ly ] = String( d.live ).split( ',' ).map( Number );
			return /^moved "£\d+ → photo to come /.test( d.key.replace( / #\d+$/, '' ) ) && Math.abs( dx - lx ) <= 4 && Math.abs( dy - ly ) <= 32;
		} },
		{ pair: '(auto)', width: 375, state: 'panel-after-click', reason: 'Accepted (Bean 2026-09-27): Aviator’s dots on a line of their own put its RRP beside the price, which moves the next card’s start; FZ6001 shares its row with Lewis 10, whose tag line makes the row taller, and prices level at the card foot, so its price row sits 11px lower', when: ( d ) => /^moved "(£139 → £171 photo to come|£171 → photo to come carrera|yet → £169 £205|£205 → photo to come police)/.test( d.key.replace( / #\d+$/, '' ) ) },
		{ pair: '(auto)', width: 375, state: 'colour-black', reason: 'Accepted (Bean 2026-09-27): a draft bug; its "0 frames" is narrower than live’s "14 frames", so the toolbar’s FILTER (1) sits 6px further left above the same pill row', when: ( d ) => /^moved "\(1\) → black × clear all"$/.test( d.key ) },
		{ pair: '(auto)', reason: 'The pinned filter column sits at the same place on screen (measured 2026-09-28: gender 129px down in the draft, 128px live); the page text it is measured from sits 21px lower on live under the taller header and trust bar (the nav track)', when: ( d ) => {
			const [ dx, dy ] = String( d.draft ).split( ',' ).map( Number );
			const [ lx, ly ] = String( d.live ).split( ',' ).map( Number );
			return /^moved "frames → gender /.test( d.key ) && Math.abs( dx - lx ) <= 4 && Math.abs( dy - ly ) <= 30;
		} },
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27 and 2026-09-28): "Polarised only" is the filter column’s last item, under the brand list (live’s real 14 brands against the draft’s 40) and the style chips (9 in stock against 12), so its height against the first card follows those lists (and, pinned, the taller nav-track header)', when: ( d ) => /^moved "only → photo to come ray-ban"$/.test( d.key ) && d.draft.split( ',' )[ 0 ] === d.live.split( ',' )[ 0 ] },
		{ pair: '(auto)', reason: 'Reveal timing at the fold (the brief, 2026-09-28): a card whose top edge sits at the fold (its brand chip 827px down on a 900px screen, 838px on an 812px one) has passed the 15% reveal trigger on one side only, because live’s page sits 21px lower under the taller nav-track header; the unrevealed card’s chip is the only part in view, so only the chip differs', when: ( d ) => /^text-(missing|extra) "(armani|balenciaga|carrera|dolce & gabbana|emporio armani|ferrari scuderia|gucci|michael kors|oakley|polaroid|police|prada|ray-ban|superdry|versace)"$/.test( d.key.replace( / #\d+$/, '' ) ) },
		// Bean 2026-09-27: 44px touch targets; a label centred in a 44px row sits lower in it than in the draft's 38px row.
		{ pair: 'brand-ray-ban', kind: 'box', key: 'text-inset-y', reason: 'Accepted (Bean 2026-09-27, 44px touch targets): the label centred in a 44px row sits 3px lower than in the draft’s 38px row', when: ( d ) => d.live - d.draft <= 4 },
		{ pair: 'clear-all', kind: 'box', key: 'text-inset-y', reason: 'Accepted (Bean 2026-09-27, 44px touch targets): the draft’s 19px text button has its text at the top; live centres it in 44px' },
	],
};
