// Parity config: the shop archive (draft "Sunglasses" view vs eye-care-test /shop/). Each filter state starts
// from a fresh page so both sides show the same single filter.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/shop.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/shop/?cb={cb}';
const LF = '#sgs-shop-filters';
// The draft’s product grid: the grid in main whose every child is a priced card (no aside below desktop).
const DGRID = `(r) => [...document.querySelectorAll('main div')].find((x) => getComputedStyle(x).display === 'grid' && x.children.length >= 2 && ! x.querySelector('aside') && [...x.children].every((c) => c.textContent.includes('£')))`;
// A card in the draft’s grid, by product name.
const dcard = ( name ) => `(r) => { const g = (${ DGRID })(r); const c = g && [...g.children].find((c) => c.textContent.includes('${ name }')); return c && c.firstElementChild.firstElementChild; }`;
const lcard = ( name ) => `(r) => [...document.querySelectorAll('.sgs-shop-layout .wc-block-product-template > li')].find((c) => c.textContent.includes('${ name }'))?.querySelector('.sgs-product-card, .product-card')`;
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );

const draftShop = async ( h ) => {
	await h.goto( DRAFT );
	await h.clickText( '^sunglasses$', { wait: 1200 } );
};
// Below desktop both sides keep the filters in a drawer behind a "Filter" button (no-op on desktop).
const openFilters = ( h ) => h.clickText( '^filter$', { tag: 'button', optional: true, wait: 900 } );
// The draft’s drawer closes with "Show N frames"; it applies each choice as it is made.
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
		// Measured, not painted: the property differs but the pixels do not.
		...[ 'display', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ].map( ( key ) => ( {
			kind: 'style', key, reason: 'Layout property on an element whose painted box and content match (a flex vs block wrapper with one child or centred text)',
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
		// PROPOSED to Bean: differences kept on purpose.
		{ pair: 'card-gucci', reason: 'PROPOSED to Bean: "No reviews yet" until real reviews exist, where the draft shows made-up stars (the card is 5-6px shorter for it)', when: ( d ) => 'text' === d.kind || 'h' === d.key },
		{ pair: 'card-body', key: 'h', reason: 'PROPOSED to Bean: "No reviews yet" in place of made-up stars' },
		{ pair: 'card-rrp', reason: 'Pennies (Bean 2026-09-25); "Recommended retail price:" is screen-reader text only' },
		{ pair: 'card-price', key: 'w', reason: 'Pennies (Bean 2026-09-25)' },
		{ pair: 'brand-heading', kind: 'text', reason: 'PROPOSED to Bean: live counts the real 14 brands; the draft counts a made-up catalogue of 40' },
		{ pair: 'style-chip', reason: 'PROPOSED to Bean: 44px touch targets (the accessibility baseline) where the draft chips are 38px', when: ( d ) => [ 'h', 'padding-top', 'padding-bottom' ].includes( d.key ) },
		{ pair: 'filters', key: 'padding-left', reason: 'The same 20px inset: the draft pads each row, live pads the drawer' },
		{ pair: 'brand-search', key: 'h', reason: 'PROPOSED to Bean: 44px touch target where the draft box is 40px' },
		{ pair: 'filters', kind: 'motion', reason: 'PROPOSED to Bean: the draft fades its filter column in because it is a single-page app changing view; the live page loads with it' },
		{ pair: 'filters', reason: 'PROPOSED to Bean: the live drawer slides up from the bottom (a native dialog with its header inside its 24px top padding); the draft’s drawer appears in place', when: ( d ) => [ 'padding-top', 'transition' ].includes( d.key ) },
		{ state: 'colour-black', pair: 'count', reason: 'PROPOSED to Bean: a draft bug; its Black swatch returns "0 frames" where live returns 14' },
		{ state: 'colour-black', pair: 'grid', reason: 'PROPOSED to Bean: a draft bug; its Black swatch returns "0 frames" where live returns 14' },
		{ state: 'brand-ray-ban', pair: 'title', reason: 'PROPOSED to Bean: choosing one brand turns the draft into that brand’s page (title "Ray-Ban", no Shop eyebrow); live keeps "Sunglasses" with the filter applied' },
		{ state: 'brand-ray-ban', pair: 'eyebrow', reason: 'PROPOSED to Bean: choosing one brand turns the draft into that brand’s page (title "Ray-Ban", no Shop eyebrow); live keeps "Sunglasses" with the filter applied' },
		{ pair: 'sort', reason: 'PROPOSED to Bean: the browser’s own sort menu is 11px wider than the draft’s at the same text size', when: ( d ) => [ 'w', 'display' ].includes( d.key ) },
		{ kind: 'motion', key: 'transition', reason: 'PROPOSED to Bean: hover timing curves: live uses the site’s standard easing where the draft uses ease (card) and a custom curve (photo zoom); durations match' },
	],
};
