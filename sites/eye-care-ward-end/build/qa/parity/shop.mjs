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
const liveSwatch = ( slug ) => ( h ) => h.click( `${ LF } [id="attribute/colour-${ slug }"]`, { quiet: true, wait: 1200 } );

export default {
	name: 'shop',
	draft: { url: DRAFT, open: ( h ) => h.clickText( '^sunglasses$', { wait: 1200 } ) },
	live: { url: LIVE },
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
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^shop$', tag: 'p' }, live: { text: '^shop$', tag: 'p', within: 'main' }, box: [ 'h' ] },
		{ name: 'title', draft: 'h1', live: 'main h1', box: [ 'h' ] },
		{ name: 'count', draft: { text: '^\\d+ frames?$', tag: 'span' }, live: '.wp-block-woocommerce-product-results-count p, .woocommerce-result-count', box: [ 'h' ] },
		{ name: 'sort', draft: 'select[aria-label="Sort"]', live: 'select.orderby', hover: true },
		// The drawer's trigger below desktop: its place (row mates: count and sort) is checked by the structure pass.
		{ name: 'filter-button', states: [ 'opening' ], draft: { text: '^filter$', tag: 'button' }, live: { text: '^filter$', tag: 'button' }, hover: true },
		{ name: 'filters', states: [ 'filters-open', 'panel-after-click' ], draft: 'aside', live: LF, box: [ 'w' ], text: false, props: [ 'background-color', 'padding-top', 'padding-left' ] },
		{ name: 'gender-heading', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^gender$', within: 'aside', tag: 'button' }, live: { text: '^gender', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'gender-all', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^all$', within: 'aside', tag: 'button' }, live: `${ LF } .sgs-shop-filters__segment`, hover: true },
		{ name: 'gender-women', states: [ 'women' ], draft: { text: '^women$', within: 'aside', tag: 'button' }, live: { text: '^women$', within: LF, tag: '.sgs-shop-filters__segment' } },
		{ name: 'swatch-black', states: [ 'filters-open', 'colour-black', 'panel-after-click' ], draft: 'aside button[aria-label="Black"]', live: `${ LF } [id="attribute/colour-black"]`, text: false, hover: true },
		{ name: 'brand-search', states: [ 'filters-open', 'panel-after-click' ], draft: 'aside input[aria-label="Search brands"]', live: `${ LF } .sgs-filter-search__input`, text: false },
		{ name: 'brand-heading', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^brand', within: 'aside', tag: 'button' }, live: { text: '^brand', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'brand-ray-ban', states: [ 'filters-open', 'brand-ray-ban', 'panel-after-click' ], draft: { text: '^ray-ban', within: 'aside', tag: 'label' }, live: `${ LF } label[for="taxonomy/product_brand-ray-ban"]` },
		{ name: 'style-chip', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^pilot$', within: 'aside', tag: 'button' }, live: { text: '^pilot', within: LF, tag: 'button' }, hover: true },
		// Found on the screenshots: the chosen-filter row and the price slider's labels.
		{ name: 'active-pill', states: [ 'panel-after-click' ], draft: { js: DCLEAR.replace( 'return c;', 'return c && c.parentElement.firstElementChild;' ) }, live: `${ LF } .wc-block-product-filter-removable-chips__item` },
		{ name: 'clear-all', states: [ 'panel-after-click' ], draft: { js: DCLEAR }, live: `${ LF } .wp-block-woocommerce-product-filter-clear-button .sgs-button` },
		{ name: 'price-min', states: [ 'filters-open' ], draft: { text: '^£59$', within: 'aside', tag: 'span' }, live: `${ LF } .wc-block-product-filter-price-slider__left` },
		{ name: 'price-max', states: [ 'filters-open' ], draft: { text: '^£339$', within: 'aside', tag: 'span' }, live: `${ LF } .wc-block-product-filter-price-slider__right` },
		{ name: 'polarised-toggle', states: [ 'filters-open', 'panel-after-click' ], draft: { text: '^polarised only$', within: 'aside', tag: 'label,button,div' }, live: `${ LF } .sgs-shop-filters__bool-filter` },
		{ name: 'grid', draft: { js: DGRID }, live: '.sgs-shop-layout .wc-block-product-template', text: false, box: [ 'w' ], props: [ 'grid-template-columns', 'column-gap', 'row-gap' ] },
		{ name: 'card-gucci', states: [ 'opening', 'women' ], draft: { js: dcard( 'Oversized Cat-Eye' ) }, live: { js: lcard( 'Oversized Cat-Eye' ) }, hover: true, props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'box-shadow' ] },
		// A card below the fold at every width: how it appears as it scrolls into view.
		{ name: 'card-7', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: `(r) => { const g = (${ DGRID })(r); const c = g && g.children[6]; return c && c.firstElementChild.firstElementChild; }` },
			live: '.sgs-shop-layout .wc-block-product-template > li:nth-child(7) .product-card' },
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
	accept: [
		{
			kind: 'text', reason: 'Pennies on every price (Bean 2026-09-25)',
			when: ( d ) => words( d.draft ) === words( d.live.replace( /(£\d+)\.00/g, '$1' ) ),
		},
		// Measured, not painted: the property differs but the pixels do not.
		...[ 'display', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ].map( ( key ) => ( {
			kind: 'style', key, notPainted: true, reason: 'Layout property on an element whose painted box and content match (a flex vs block wrapper with one child or centred text)',
		} ) ),
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
		{ pair: 'card-name', reason: 'The title link is inline live and block in the draft; the text and its position match', when: ( d ) => [ 'display', 'w' ].includes( d.key ) },
		{ pair: 'style-chip', kind: 'style', key: 'border-radius', reason: 'A 999px or 9999px radius paints the same pill' },
		{ pair: 'style-chip', kind: 'style', key: 'line-height', reason: 'One line of text inside the chip’s 44px minimum height: the line height moves nothing' },
		{ kind: 'motion', key: 'transition', reason: 'The same timings listed by property name (background vs background-color) or including a property that does not change on hover', when: ( d ) => ! /cubic-bezier\(0\.2, 0\.7/.test( d.draft ) && ! /\b0\.3s\b/.test( d.draft ) },
		// Accepted (Bean 2026-09-27): differences kept on purpose.
		{ pair: 'card-gucci', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" until real reviews exist, where the draft shows made-up stars (the card is 5-6px shorter for it)', when: ( d ) => 'text' === d.kind || 'h' === d.key },
		{ pair: 'card-body', key: 'h', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" in place of made-up stars' },
		{ pair: 'card-rrp', reason: 'Pennies (Bean 2026-09-25); "Recommended retail price:" is screen-reader text only' },
		{ pair: 'card-price', key: 'w', reason: 'Pennies (Bean 2026-09-25)' },
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
		{ pair: 'active-pill', kind: 'text', reason: 'The draft’s "×" is live’s cross icon, whose name "Remove filter: Pilot" is screen-reader text', when: ( d ) => words( d.live ).includes( 'remove' ) && words( d.draft.replace( '×', '' ) ).split( ' ' ).every( ( w ) => words( d.live ).includes( w ) ) },
		{ pair: 'active-pill', reason: 'The remove control keeps a 24px target (WCAG 2.5.8) where the draft’s "×" is a 9px glyph, so the pill is 6px wider with 8px after the cross', when: ( d ) => [ 'w', 'padding-right' ].includes( d.key ) },
		{ pair: 'active-pill', kind: 'style', notPainted: true, reason: 'The same pill: live lays the label and cross out with flex, the draft centres one text run', when: ( d ) => [ 'line-height', 'text-align', 'justify-content', 'column-gap', 'row-gap' ].includes( d.key ) },
		{ pair: 'clear-all', kind: 'box', key: 'h', reason: 'Accepted (Bean 2026-09-27): 44px touch targets; the draft’s text button is 19px tall' },
		{ pair: 'clear-all', kind: 'style', reason: 'The same underlined capitals: live draws the 1px underline as a text decoration 5px below the text inside its 44px target, the draft as a bottom border under 2px padding', when: ( d ) => [ 'border-bottom-width', 'padding-bottom', 'display', 'justify-content', 'align-items', 'line-height' ].includes( d.key ) },
		{ pair: 'clear-all', kind: 'style', key: 'color', reason: 'The draft’s text is the browser default black, live’s the palette’s text #141414' },
		...[ 'active-pill', 'clear-all' ].map( ( pair ) => ( { pair, kind: 'structure', reason: 'PROPOSED to Bean: chosen filters sit at the top of the filter column (WooCommerce keeps them inside its filter block); the draft shows them in a row under the title' } ) ),
		{ pair: 'filter-button', kind: 'style', key: 'color', reason: 'The draft’s button text is the browser default black, live’s the palette’s text #141414 (both near-black on white)' },
		// Below the drawer breakpoint the live drawer is a sheet over the page (Bean 2026-09-27), so its rows share rows with the title bar.
		...[ 768, 375 ].flatMap( ( width ) => [ 'filters-open', 'panel-after-click' ].map( ( state ) => ( {
			state, width, kind: 'structure', key: 'row', reason: 'Accepted (Bean 2026-09-27): the live drawer is a sheet over the page, the draft’s sits in the page, so drawer rows share rows with the title bar on one side only',
		} ) ) ),
		...[ 'title', 'eyebrow' ].map( ( pair ) => ( { state: 'panel-after-click', pair, reason: 'Accepted (Bean 2026-09-27, as for brands): choosing one style turns the draft into that style’s page (title "Pilot", eyebrow "Shape"); live keeps "Sunglasses" with the filter applied' } ) ),
		{ state: 'brand-ray-ban', pair: 'title', reason: 'Accepted (Bean 2026-09-27): choosing one brand turns the draft into that brand’s page (title "Ray-Ban", no Shop eyebrow); live keeps "Sunglasses" with the filter applied' },
		{ state: 'brand-ray-ban', pair: 'eyebrow', reason: 'Accepted (Bean 2026-09-27): choosing one brand turns the draft into that brand’s page (title "Ray-Ban", no Shop eyebrow); live keeps "Sunglasses" with the filter applied' },
		{ kind: 'motion', key: 'transition', reason: 'Accepted (Bean 2026-09-27): hover timing curves: live uses the site’s standard easing where the draft uses ease (card) and a custom curve (photo zoom); durations match' },
	],
};
