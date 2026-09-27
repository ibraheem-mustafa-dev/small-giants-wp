// Parity config: the shop archive (draft "Sunglasses" view vs eye-care-test /shop/). Each filter state starts
// from a fresh page so both sides show the same single filter.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/shop.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/shop/?cb={cb}';
const LF = '#sgs-shop-filters';
// The draft's product grid: the grid in main whose every child is a priced card (no aside below desktop).
const DGRID = `(r) => [...document.querySelectorAll('main div')].find((x) => getComputedStyle(x).display === 'grid' && x.children.length >= 2 && ! x.querySelector('aside') && [...x.children].every((c) => c.textContent.includes('£')))`;
// A card in the draft's grid, by product name.
const dcard = ( name ) => `(r) => { const g = (${ DGRID })(r); const c = g && [...g.children].find((c) => c.textContent.includes('${ name }')); return c && c.firstElementChild.firstElementChild; }`;
const lcard = ( name ) => `(r) => [...document.querySelectorAll('.sgs-shop-layout .wc-block-product-template > li')].find((c) => c.textContent.includes('${ name }'))?.querySelector('.sgs-product-card, .product-card')`;
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );

const draftShop = async ( h ) => {
	await h.goto( DRAFT );
	await h.clickText( '^sunglasses$', { wait: 1200 } );
};
// Below desktop both sides keep the filters in a drawer behind a "Filter" button (no-op on desktop).
const openFilters = ( h ) => h.clickText( '^filter$', { tag: 'button', optional: true, wait: 900 } );
// The draft's drawer closes with "Show N frames"; it applies each choice as it is made.
const closeDraftFilters = ( h ) => h.clickText( '^show \\d+ frames?$', { tag: 'button', optional: true, wait: 900 } );
const draftPick = ( pick ) => async ( h ) => {
	await draftShop( h );
	await openFilters( h );
	await pick( h );
	await closeDraftFilters( h );
};
const liveShop = ( query ) => async ( h ) => h.goto( LIVE + ( query ? '&' + query : '' ) );

export default {
	name: 'shop',
	draft: { url: DRAFT, open: ( h ) => h.clickText( '^sunglasses$', { wait: 1200 } ) },
	live: { url: LIVE },
	states: [
		{ name: 'opening', fullPage: true },
		{
			name: 'filters-open',
			draft: async ( h ) => {
				await draftShop( h );
				await openFilters( h );
			},
			live: async ( h ) => {
				await h.goto( LIVE );
				await openFilters( h );
			},
		},
		{
			name: 'women',
			draft: draftPick( ( h ) => h.clickText( '^women$', { within: 'aside', tag: 'button' } ) ),
			live: liveShop( 'filter_gender=women' ),
		},
		{
			name: 'colour-black',
			draft: draftPick( ( h ) => h.click( 'aside button[aria-label="Black"]' ) ),
			live: liveShop( 'filter_colour=black' ),
		},
		{
			name: 'brand-ray-ban',
			draft: draftPick( ( h ) => h.clickText( '^ray-ban', { within: 'aside', tag: 'label' } ) ),
			live: liveShop( 'brands=ray-ban' ),
		},
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^shop$', tag: 'p' }, live: { text: '^shop$', tag: 'p', within: 'main' }, box: [ 'h' ] },
		{ name: 'title', draft: 'h1', live: 'main h1', box: [ 'h' ] },
		{ name: 'count', draft: { text: '^\\d+ frames?$', tag: 'span' }, live: '.wp-block-woocommerce-product-results-count p, .woocommerce-result-count', box: [ 'h' ] },
		{ name: 'sort', draft: 'select[aria-label="Sort"]', live: 'select.orderby', hover: true },
		{ name: 'filters', states: [ 'filters-open' ], draft: 'aside', live: LF, box: [ 'w' ], text: false, props: [ 'background-color', 'padding-top', 'padding-left' ] },
		{ name: 'gender-heading', states: [ 'filters-open' ], draft: { text: '^gender$', within: 'aside', tag: 'button' }, live: { text: '^gender', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'gender-all', states: [ 'filters-open' ], draft: { text: '^all$', within: 'aside', tag: 'button' }, live: `${ LF } .sgs-shop-filters__segment`, hover: true },
		{ name: 'gender-women', states: [ 'women' ], draft: { text: '^women$', within: 'aside', tag: 'button' }, live: { text: '^women$', within: LF, tag: '.sgs-shop-filters__segment' } },
		{ name: 'swatch-black', states: [ 'filters-open' ], draft: 'aside button[aria-label="Black"]', live: `${ LF } [id="attribute/colour-black"]`, text: false, hover: true },
		{ name: 'brand-search', states: [ 'filters-open' ], draft: 'aside input[aria-label="Search brands"]', live: `${ LF } .sgs-filter-search__input`, text: false },
		{ name: 'brand-heading', states: [ 'filters-open' ], draft: { text: '^brand', within: 'aside', tag: 'button' }, live: { text: '^brand', within: LF, tag: 'summary' }, box: [ 'h' ] },
		{ name: 'style-chip', states: [ 'filters-open' ], draft: { text: '^pilot$', within: 'aside', tag: 'button' }, live: { text: '^pilot', within: LF, tag: 'button' }, hover: true },
		{ name: 'polarised-toggle', states: [ 'filters-open' ], draft: { text: '^polarised only$', within: 'aside', tag: 'label,button,div' }, live: `${ LF } .sgs-shop-filters__bool-filter` },
		{ name: 'grid', draft: { js: DGRID }, live: '.sgs-shop-layout .wc-block-product-template', text: false, box: [ 'w' ], props: [ 'grid-template-columns', 'column-gap', 'row-gap' ] },
		{ name: 'card-gucci', states: [ 'opening', 'women' ], draft: { js: dcard( 'Oversized Cat-Eye' ) }, live: { js: lcard( 'Oversized Cat-Eye' ) }, hover: true, props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'box-shadow' ] },
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
	],
};
