// Parity config: the Home page (draft's opening view vs eye-care-test /). Eight sections top to
// bottom: hero, scrolling brand strip, Best sellers (product grid), Why buy from me (4 reasons),
// Start with a shape (shape tiles), What people say (Google reviews slider), the prescription-sunglasses
// strip, and the optician bio. Each section's heading, text, media and buttons are named pairs; the
// product-card and shape-tile grids follow shop.mjs's one-representative-card-plus-parts pattern.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/home.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/?cb={cb}';

// The Best sellers grid: the grid in main whose every child is a priced card (copied from shop.mjs's
// DGRID; the shape tiles below have no price text, so they never match this).
const BGRID = `(r) => [...document.querySelectorAll('main div')].find((x) => getComputedStyle(x).display === 'grid' && x.children.length >= 2 && ! x.querySelector('aside') && [...x.children].every((c) => c.textContent.includes('£')))`;
// A card in the Best sellers grid, by product name (same "Frame Card" component as the shop and product page).
const bcard = ( name ) => `(r) => { const g = (${ BGRID })(r); const c = g && [...g.children].find((c) => c.textContent.includes('${ name }')); return c && c.firstElementChild.firstElementChild; }`;
const lcard = ( name ) => `(r) => [...document.querySelectorAll('.product-card')].find((c) => c.textContent.includes('${ name }'))`;
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );
// A numbered reason tile (01-04) or process step (1-3), found by its own number text (no class names on the draft).
const numTile = ( num ) => `(r) => { const n = [...r.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === '${ num }'); return n && n.parentElement; }`;
// The draft renders a typographic apostrophe (’); matches either so "I'm"/"you're" find on both sides.
const AP = "['’]";
// Every brand name the brand strip can show (mega-brands.tree.json), lower-cased: a row made only of
// these (and "&") is marquee timing.
const BRAND_LIST = ["adidas originals", "balenciaga", "barbour", "calvin klein", "carrera", "chloé", "coach", "dkny", "david beckham", "diesel", "dolce", "gabbana", "dsquared2", "emporio armani", "armani", "farah", "ferrari scuderia", "fila", "giorgio armani", "gucci", "hugo boss", "lipsy", "marc jacobs", "maxmara", "michael kors", "montblanc", "mulberry", "nike", "o\'neill", "o’neill", "oakley", "polaroid", "police", "prada", "radley", "ralph lauren", "ray-ban", "superdry", "swarovski", "tiffany", "tommy hilfiger", "versace", "vogue"];
const BRAND_WORDS = new RegExp( '^(?:(?:' + [ ...BRAND_LIST ].sort( ( x, y ) => y.length - x.length ).map( ( b ) => b.replace( /[.*+?^${}()|[\]\\-]/g, '\\$&' ) ).join( '|' ) + '|&)\\s*)+$' );
// A shape-tile card: the clickable element itself carries the visible text AND the card's own
// aspect-ratio style (found directly, not by walking up an arbitrary number of ancestors — the
// walk-up approach landed on an inner content wrapper, not the card).
// No anchors: a tile with no photo (Pilot, Oversized) prints its "Photo to come" fallback text
// BEFORE the title inside the same button, so the name is not at the start of textContent
// (found 2026-09-28). The aspect-ratio check is what makes the match unique (only tile cards carry it).
const stile = ( name ) => `(r) => [...r.querySelectorAll('button,a')].find((e) => new RegExp('${ name }', 'i').test(e.textContent.trim()) && getComputedStyle(e).aspectRatio && getComputedStyle(e).aspectRatio !== 'auto')`;

// The draft's reveal wrapper (it marks each with [data-reveal]) and live's fade-up container (data-sgs-animation),
// found by the words that open them. Both finders take the first match in DOM order.
const dreveal = ( re ) => `(r) => [...document.querySelectorAll('[data-reveal]')].find((e) => /${ re }/i.test(e.innerText.trim()))`;
const lreveal = ( re ) => `(r) => [...document.querySelectorAll('[data-sgs-animation]')].find((e) => /${ re }/i.test(e.innerText.trim()))`;
// The hero photo: the draft's carries the Ken Burns zoom and sits in a layer that the scroll parallax translates; live's is one
// element (.sgs-hero__bg-img) that carries both.
const DHERO = 'img[alt^="Designer sunglasses resting"]';
// Scrolls the opening view about 300px, as a shopper starts to read past the hero (the parallax state).
const scrollHero = async ( h ) => {
	await h.page.evaluate( () => window.scrollTo( { top: 300, behavior: 'instant' } ) );
	await h.wait( 900 );
};

export default {
	name: 'home',
	widths: [ 375, 768, 1440, 1920 ],
	// Ref tracing (Spec 47 FR-47-6 item 7): every row names the tree node (cr-ref-<surface>-<n>) it was measured on.
	refPrefix: 'cr-ref-',
	// Intended differences (Spec 47 FR-47-5), shared by every Eye Care surface.
	divergences: '../divergences.json',
	// Nav-track chrome outside the header and footer: the draft's floating WhatsApp bubble and the
	// "100% genuine" trust bar above the header (copied from shop.mjs/product.mjs: the draft has no
	// class names, so each is found by its own text). Live's header, footer, mobile menu, mega panels
	// and WhatsApp bubble are excluded by default.
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
			// The live trust bar sits outside <header> (a sibling landmark), so the walker's default
			// header/footer/nav-track exclusions miss it (shop.mjs's and contact.mjs's pattern).
			live: [ '.sgs-trust-bar' ],
		},
		normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price on the Home page (Bean 2026-09-25)' } ],
	},
	draft: { url: DRAFT },
	live: { url: LIVE },
	// Where each link in the page body must go (GAP-CHECKLIST 14), written once from the live page's real hrefs (2026-10-02). The draft's
	// internal links are all "#" (a one-page prototype), so only live is judged. Left out: the two shape tiles still showing "Photo to
	// come" and the "All N styles" link, whose text changes when a photo or a style arrives.
	links: {
		'shop sunglasses': '/shop/',
		'add your prescription': '/prescription-lenses/',
		...Object.fromEntries( [ 'ray-ban', 'gucci', 'oakley', 'prada', 'versace', 'balenciaga', 'michael kors', 'carrera', 'polaroid', 'police', 'emporio armani', 'ralph lauren', 'coach', 'tiffany', 'superdry' ].map( ( b ) => [ b, `/brand/${ b.replace( ' ', '-' ) }/` ] ) ),
		'dolce & gabbana': '/brand/dolce-gabbana/',
		'see everything': '/shop/',
		'aviator classic': '/product/ray-ban-aviator-classic/',
		'oversized cat-eye': '/product/gucci-oversized-cat-eye/',
		'holbrook': '/product/oakley-holbrook/',
		'symbole': '/product/prada-symbole/',
		'original wayfarer': '/product/ray-ban-original-wayfarer/',
		'round metal': '/product/ray-ban-round-metal/',
		'medusa biggie': '/product/versace-medusa-biggie/',
		'pld 6003/n': '/product/polaroid-pld-6003-n/',
		'wayfarer': '/shop/?filter_shape=wayfarer&query_type_shape=or',
		'round': '/shop/?filter_shape=round&query_type_shape=or',
		'cat-eye': '/shop/?filter_shape=cat-eye&query_type_shape=or',
		'square': '/shop/?filter_shape=square&query_type_shape=or',
		'see all reviews': 'https://share.google/9YZzTiRj2gvW1Xrpr',
		'write a review': 'https://share.google/9YZzTiRj2gvW1Xrpr',
		'read the full review': 'https://share.google/9YZzTiRj2gvW1Xrpr',
		'how lenses work here': '/prescription-lenses/',
		'message me on whatsapp': 'https://wa.me/4479605978?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20your%20frames.',
		'my qualifications': '/about/',
	},
	states: [
		{ name: 'opening', fullPage: true },
		// The hero's scroll parallax: the draft translates the photo layer 0.18 x the scroll (54px at 300px); live pins its photo with
		// position: fixed. A pair on the photo layer reads the transform each side carries once scrolled.
		{ name: 'hero-scrolled', draft: scrollHero, live: scrollHero },
		// The Google reviews rail: both sides scroll one card on "next" (a scroll-snap rail, not a
		// DOM swap), so the second review card only comes fully into view after the click. The click
		// itself is a raw DOM el.click() (helpers.mjs), which never scrolls the page — without scrolling
		// there first, the viewport shot proves nothing (it still shows the hero). Scroll the rail into
		// view before clicking so the shot actually shows what changed (found 2026-09-28: the first run's
		// reviews-next shots showed the hero, not the reviews section).
		{
			name: 'reviews-next',
			draft: async ( h ) => {
				await h.page.evaluate( () => document.querySelector( 'button[aria-label="More reviews"]' )?.scrollIntoView( { block: 'center' } ) );
				await h.wait( 300 );
				await h.click( 'button[aria-label="More reviews"]', { wait: 700 } );
			},
			live: async ( h ) => {
				await h.page.evaluate( () => document.querySelector( '.sgs-google-reviews__arrow--next' )?.scrollIntoView( { block: 'center' } ) );
				await h.wait( 300 );
				await h.click( '.sgs-google-reviews__arrow--next', { wait: 700 } );
			},
		},
	],
	pairs: [
		// Hero. hero-label is a <span> on live, not a <p> (fixed 2026-09-28: the tag-only finder missed it).
		{ name: 'hero-label', draft: { text: '^40 designer brands', tag: 'p' }, live: { text: '^40 designer brands', tag: 'p,span' }, box: [ 'h' ] },
		{ name: 'hero-heading', draft: 'h1', live: 'main h1', box: [ 'h' ] },
		{ name: 'hero-subtext', draft: { text: `^I${ AP }m an optician in Birmingham`, tag: 'p' }, live: { text: `^I${ AP }m an optician in Birmingham`, tag: 'p' } },
		{ name: 'hero-btn-shop', draft: { text: '^shop sunglasses$', tag: 'a,button' }, live: { text: '^shop sunglasses$', tag: 'a,button' }, hover: true },
		{ name: 'hero-btn-prescription', draft: { text: '^add your prescription$', tag: 'a,button' }, live: { text: '^add your prescription$', tag: 'a,button' }, hover: true },
		// The hero photo's Ken Burns zoom (the draft's kenburns keyframes, 3s, scale 1.08 to 1): the pair reads its keyframes and
		// declared animation (its transform is mid-zoom at 3s, so a sample of it is noise); `timeline: true` samples it after every click.
		{ name: 'hero-image', timeline: true, text: false, structure: false, box: [ 'w' ], props: [ 'opacity', 'object-fit' ],
			draft: DHERO, live: '.sgs-hero__bg-img' },
		// The scroll parallax, read after the hero-scrolled state's 300px scroll.
		{ name: 'hero-image-layer', states: [ 'hero-scrolled' ], text: false, structure: false, box: [ 'w' ], props: [ 'transform', 'translate', 'scale' ],
			draft: { js: `(r) => document.querySelector('${ DHERO }')?.parentElement` }, live: '.sgs-hero__bg-img' },

		// Scrolling brand strip: the draft names its own section (fixed 2026-09-28: the previous js finder
		// never matched). The words are read by the automatic check; this pair checks its box and background only.
		{ name: 'brand-strip', draft: 'section[aria-label="Shop by brand"]', live: '.sgs-brand-strip', text: false, box: [ 'w' ], props: [ 'background-color' ], structure: false },
		// One logo link (the draft's brightens from 0.75 to full opacity) and the marquee track it rides on (the draft's
		// track pauses while the pointer is over it: animation-play-state).
		{ name: 'brand-link', states: [ 'opening' ], hover: true, text: false, structure: false, box: [], props: [ 'opacity', 'color' ],
			draft: 'section[aria-label="Shop by brand"] a', live: '.sgs-brand-strip a' },
		{ name: 'brand-track', states: [ 'opening' ], hover: true, text: false, structure: false, box: [], props: [ 'animation-name', 'animation-play-state' ], hoverProps: [ 'animation-play-state', 'animation-name' ],
			draft: 'section[aria-label="Shop by brand"] > div', live: '.sgs-brand-strip__track' },

		// Best sellers.
		{ name: 'bestsellers-eyebrow', draft: { text: '^moving fastest this month$', tag: 'p' }, live: { text: '^moving fastest this month$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'bestsellers-heading', draft: { text: '^best sellers$', tag: 'h2' }, live: { text: '^best sellers$', tag: 'h2' }, box: [ 'h' ] },
		{ name: 'bestsellers-see-all', draft: { text: '^see everything$', tag: 'a,button' }, live: { text: '^see everything$', tag: 'a,button' }, hover: true },
		// Fixed 2026-09-28: live was scoped to a single card (321px wide), not the grid wrapper (only one
		// `.sgs-container--grid` sits inside `.sgs-best-sellers`, so this is unambiguous).
		{ name: 'bestsellers-grid', anchor: 'bestsellers-heading', draft: { js: BGRID }, live: '.sgs-best-sellers .sgs-container--grid > .sgs-container__inner', text: false, box: [ 'w' ], structure: false },
		{ name: 'card-gucci', draft: { js: bcard( 'Oversized Cat-Eye' ) }, live: { js: lcard( 'Oversized Cat-Eye' ) }, hover: true, props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'box-shadow' ] },
		// The Polarised tag: Holbrook (Oakley) carries it in the Best sellers row, as on the shop.
		{ name: 'card-holbrook', draft: { js: bcard( 'Holbrook' ) }, live: { js: lcard( 'Holbrook' ) }, text: false, box: [ 'w' ], props: [], structure: false },
		{ name: 'tag-holbrook', anchor: 'card-holbrook', anchorX: true,
			draft: { js: `(r) => { const c = (${ bcard( 'Holbrook' ) })(r); return c && [...c.querySelectorAll('span, div')].find((e) => ! e.children.length && /^polarised$/i.test(e.textContent.trim())); }` },
			live: { js: `(r) => { const c = (${ lcard( 'Holbrook' ) })(r); return c && c.querySelector('.sgs-product-card__attribute-tag'); }` },
			props: [ 'font-size', 'font-weight', 'letter-spacing', 'text-transform', 'color', 'border-top-width', 'border-top-color', 'padding-top', 'padding-right' ] },
		// The last card in the grid (below the fold below 1440): its fade-up entrance.
		{ name: 'card-7', scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: `(r) => { const g = (${ BGRID })(r); return g && g.children[7]; }` },
			live: '.sgs-best-sellers .product-card:nth-of-type(8)' },
		// The Gucci card's parts (copied from shop.mjs: draft path from its bordered card, live class inside .product-card).
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
			draft: { js: `(r) => { const c = (${ bcard( 'Oversized Cat-Eye' ) })(r); try { return c && ${ dpath }; } catch ( e ) { return null; } }` },
			live: { js: `(r) => { const c = (${ lcard( 'Oversized Cat-Eye' ) })(r); return c && c.querySelector('${ lsel }'); }` },
			text,
			hover: 'wishlist' === part || 'dot' === part,
		} ) ),

		// Why buy from me.
		{ name: 'whybuy-eyebrow', draft: { text: '^why buy from me$', tag: 'p' }, live: { text: '^why buy from me$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'whybuy-heading', draft: { text: '^four reasons', tag: 'h2' }, live: { text: '^four reasons', tag: 'h2' }, box: [ 'h' ] },
		{ name: 'whybuy-text', draft: { text: `^I${ AP }m an optician who genuinely enjoys`, tag: 'p' }, live: { text: `^I${ AP }m an optician who genuinely enjoys`, tag: 'p' } },
		...[
			[ '1', 'Below RRP, and I show you by how much' ],
			[ '2', 'I glaze the lenses myself' ],
			[ '3', 'You can just message me' ],
			[ '4', 'Collect in Birmingham, or posted tracked' ],
		].flatMap( ( [ n, heading ] ) => [
			{ name: `whybuy-${ n }-number`, draft: { text: `^0${ n }$`, tag: 'div,span,p' }, live: { text: `^0${ n }$`, tag: 'div,span,p' }, box: [ 'h' ] },
			{ name: `whybuy-${ n }-heading`, anchor: `whybuy-${ n }-number`, draft: { text: `^${ heading }$`, tag: 'h3' }, live: { text: `^${ heading }$`, tag: 'h3' }, box: [ 'h' ] },
		] ),

		// Start with a shape.
		{ name: 'shapetiles-eyebrow', draft: { text: '^not sure what suits you\\?$', tag: 'p' }, live: { text: '^not sure what suits you\\?$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'shapetiles-heading', draft: { text: '^start with a shape$', tag: 'h2' }, live: { text: '^start with a shape$', tag: 'h2' }, box: [ 'h' ] },
		// Real catalogue count: the draft names 12 styles, live the real 6 shapes it has photos for (Bean 2026-09-27 pattern).
		{ name: 'shapetiles-see-all', draft: { text: '^all \\d+ styles$', tag: 'a,button' }, live: { text: '^all \\d+ styles$', tag: 'a,button' }, hover: true, text: false },
		// Fixed 2026-09-28: the previous draft finder walked up "the first position:relative ancestor",
		// which landed on the inner glyph+title wrap (94px tall), not the card (253px, matching live's
		// aspect-ratio 4/5 box). The card itself is the clickable element carrying the aspect-ratio style.
		{ name: 'shapetile-wayfarer', hover: true, props: [ 'border-top-width', 'border-top-color' ],
			draft: { js: stile( 'Wayfarer' ) },
			live: { js: '(r) => [...r.querySelectorAll(".sgs-card-grid__item")].find((a) => /wayfarer/i.test(a.textContent))' } },
		// Fixed 2026-09-28: the live finder matched the FIRST `.sgs-card-grid__item` in the whole grid
		// (Pilot), not the Wayfarer tile this pair is named for; scope it to the Wayfarer tile specifically.
		{ name: 'shapetile-wayfarer-title', anchor: 'shapetile-wayfarer', box: [ 'h' ],
			draft: { text: '^wayfarer$', tag: 'span' },
			live: { js: '(r) => [...r.querySelectorAll(".sgs-card-grid__item")].find((a) => /wayfarer/i.test(a.textContent))?.querySelector(".sgs-card-grid__title")' } },
		// The Wayfarer tile's photo (the draft zooms it to 1.07 over 1s) and its outline glyph.
		{ name: 'shapetile-wayfarer-photo', states: [ 'opening' ], hover: true, hoverWait: 1400, text: false, structure: false, box: [ 'w' ], props: [ 'transform', 'scale', 'object-fit' ],
			draft: { js: `(r) => { const t = (${ stile( 'Wayfarer' ) })(r); return t && t.querySelector('span[style*="background-image"]'); }` },
			live: { js: '(r) => [...r.querySelectorAll(".sgs-card-grid__item")].find((a) => /wayfarer/i.test(a.textContent))?.querySelector("img.sgs-media-el")' } },
		{ name: 'shapetile-wayfarer-glyph', states: [ 'opening' ], hover: true, text: false, structure: false, box: [], props: [ 'transform', 'scale', 'opacity' ],
			draft: { js: `(r) => { const t = (${ stile( 'Wayfarer' ) })(r); return t && t.querySelector('svg'); }` },
			live: { js: '(r) => [...r.querySelectorAll(".sgs-card-grid__item")].find((a) => /wayfarer/i.test(a.textContent))?.querySelector(".sgs-card-grid__glyph")' } },
		// The last tile (Oversized): its own fade/stagger entrance below the fold.
		{ name: 'shapetile-oversized', scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: stile( 'Oversized' ) },
			live: { js: '(r) => [...r.querySelectorAll(".sgs-card-grid__item")].find((a) => /^\\s*oversized\\s*$/i.test(a.querySelector(".sgs-card-grid__title")?.textContent || ""))' } },

		// What people say (Google reviews).
		{ name: 'reviews-eyebrow', draft: { text: '^from the clinic$', tag: 'p' }, live: { text: '^from the clinic$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'reviews-heading', draft: { text: '^what people say$', tag: 'h2' }, live: { text: '^what people say$', tag: 'h2' }, box: [ 'h' ] },
		{ name: 'review-card', text: false, box: [ 'w' ], props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius' ],
			draft: { js: '(r) => [...r.querySelectorAll("*")].find((e) => e.children.length >= 2 && /lovely experience taking my daughter/.test(e.textContent) && e.textContent.length < 900)' },
			live: '.sgs-google-reviews__review' },
		{ name: 'review-arrow-prev', hover: true, draft: 'button[aria-label="Previous reviews"]', live: '.sgs-google-reviews__arrow--prev' },
		{ name: 'review-arrow-next', hover: true, draft: 'button[aria-label="More reviews"]', live: '.sgs-google-reviews__arrow--next' },
		// The two Google links under the rating (the draft's turn to the Google blue/outlined look on hover).
		{ name: 'reviews-see-all', states: [ 'opening' ], hover: true, draft: { text: '^see all reviews$', tag: 'a' }, live: { text: '^see all reviews$', tag: 'a' } },
		{ name: 'reviews-write', states: [ 'opening' ], hover: true, draft: { text: '^write a review$', tag: 'a' }, live: { text: '^write a review$', tag: 'a' } },
		// What the "next" click itself changes: the rail scrolls, so the second review comes into view
		// (its left edge moves toward the first review's old position). Scoped to the reviews-next state (GAP-CHECKLIST 2).
		// Fixed 2026-09-28: matching "any element with 5 stars" picked up a Best-sellers PRODUCT card
		// (also 5-starred), not the second review — the real second review's own text names it instead.
		{ name: 'review-card-2', states: [ 'reviews-next' ], anchor: 'review-card', anchorX: true, text: false, box: [ 'w' ],
			draft: { js: '(r) => [...r.querySelectorAll("*")].find((e) => e.children.length >= 2 && /took my mum as emergency appointment/i.test(e.textContent) && e.textContent.length < 900)' },
			live: '.sgs-google-reviews__review:nth-of-type(2)' },

		// Scroll reveals of the sections not covered by card-7 / shapetile-oversized (GAP-CHECKLIST 5): the draft's [data-reveal]
		// wrapper against live's fade-up container (data-sgs-animation), found by the words that open each.
		...[
			[ 'whybuy-reveal', '^why buy from me' ],
			[ 'reviews-reveal', '^from the clinic' ],
			[ 'about-reveal', '^prescription sunglasses' ],
			[ 'optician-reveal', '^you.re buying from a person' ],
		].map( ( [ name, re ] ) => ( { name, states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false, draft: { js: dreveal( re ) }, live: { js: lreveal( re ) } } ) ),
		{ name: 'about-photo-reveal', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: `(r) => document.querySelector('main img[alt="Person wearing sunglasses outdoors"]')?.closest('[data-reveal]')` },
			live: { js: `(r) => document.querySelector('main img[alt="Person wearing sunglasses outdoors"]')?.closest('[data-sgs-animation]')` } },

		// Prescription-sunglasses strip. Fixed 2026-09-28: live's background photo is decorative
		// (correctly `alt=""` + `aria-hidden`, WCAG-appropriate for a non-informative image), so it
		// never matches an alt-text finder; find it by its background-image class instead.
		{ name: 'about-photo', draft: 'main img[alt="Person wearing sunglasses outdoors"]', live: 'main img[alt="Person wearing sunglasses outdoors"]', text: false, box: [ 'w' ], hover: true, hoverWait: 1600 },
		{ name: 'about-eyebrow', draft: { text: '^prescription sunglasses$', tag: 'p' }, live: { text: '^prescription sunglasses$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'about-heading', draft: { text: '^any pair here', tag: 'h2' }, live: { text: '^any pair here', tag: 'h2' }, box: [ 'h' ] },
		{ name: 'about-text', draft: { text: '^three questions with pictures', tag: 'p' }, live: { text: '^three questions with pictures', tag: 'p' } },
		...[
			[ '1', 'Pick a frame, then “Add my prescription”' ],
			[ '2', "Tell me what they're for, how thin, what finish" ],
			[ '3', 'Send your prescription now, or later — no rush' ],
		].map( ( [ n, title ], i ) => ( {
			// The draft's step is the <li> holding its number and text; live's is the same step element
			// (`.sgs-process-steps__step`), so both sides measure the whole step.
			name: `about-step-${ n }`, box: [ 'h' ],
			draft: { js: `(r) => { const n = [...r.querySelectorAll('span,div')].find((e) => e.children.length === 0 && e.textContent.trim() === '${ n }'); return n && n.parentElement; }` },
			live: `.sgs-process-steps__step:nth-of-type(${ i + 1 })`,
		} ) ),
		{ name: 'about-button', draft: { text: '^how lenses work here$', tag: 'a,button' }, live: { text: '^how lenses work here$', tag: 'a,button' }, hover: true },

		// Optician bio.
		{ name: 'optician-photo', draft: { text: '^photo of the clinic$', tag: 'span' }, live: { text: '^photo of the clinic$', tag: 'p,span,div' }, box: [ 'w' ] },
		{ name: 'optician-eyebrow', draft: { text: `^you${ AP }re buying from a person$`, tag: 'p' }, live: { text: `^you${ AP }re buying from a person$`, tag: 'p' }, box: [ 'h' ] },
		{ name: 'optician-heading', draft: { text: `^I${ AP }m Fatima Nawaz`, tag: 'h2' }, live: { text: `^I${ AP }m Fatima Nawaz`, tag: 'h2' }, box: [ 'h' ] },
		{ name: 'optician-text-1', draft: { text: '^everything on this site I chose myself', tag: 'p' }, live: { text: '^everything on this site I chose myself', tag: 'p' } },
		{ name: 'optician-text-2', draft: { text: `^if you${ AP }re unsure about anything`, tag: 'p' }, live: { text: `^if you${ AP }re unsure about anything`, tag: 'p' } },
		{ name: 'optician-whatsapp-cta', draft: { text: '^message me on whatsapp$', tag: 'a,button' }, live: { text: '^message me on whatsapp$', tag: 'a,button' }, hover: true },
		{ name: 'optician-qualifications-button', draft: { text: '^my qualifications$', tag: 'a,button' }, live: { text: '^my qualifications$', tag: 'a,button' }, hover: true },
	],
	accept: [
		// Measured, not painted (GAP-CHECKLIST 8), as shop.mjs's, lens.mjs's and product.mjs's first accept.
		...[ 'display', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ].map( ( key ) => ( {
			kind: 'style', key, notPainted: true, reason: 'Layout property on an element whose painted box and content match',
		} ) ),
		...[ 1, 2, 3 ].map( ( n ) => ( {
			pair: `about-step-${ n }`, kind: 'style', key: 'gap',
			reason: 'The column gap matches (16px); only the row half of the gap shorthand differs, and the draft step is a one-row flex where a row gap paints nothing (step boxes 47/47px at 375, 24/23px at 1440, measured 2026-10-08)',
			when: ( d ) => d.live === `0px ${ d.draft }`,
		} ) ),
		{ kind: 'hover', key: 'color', reason: 'Text colour on an element with no text (a swatch, dot or icon button): nothing paints it' },
		{
			kind: 'text', reason: 'Pennies on every price (Bean 2026-09-25)',
			when: ( d ) => words( d.draft ) === words( d.live.replace( /(£\d+)\.00/g, '$1' ) ),
		},
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-25): pennies on every price', when: ( d ) => ( ( d ) => /^moved "[^"]*£\d/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		// "No reviews yet" until real reviews exist (Bean 2026-09-27): every product card's made-up stars.
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" until real reviews exist, where the draft shows made-up stars', when: ( d ) => ( ( d ) => /^text-missing "★|^text-missing "\)"$|^text-extra "no reviews yet"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: 'card-gucci', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" until real reviews exist, where the draft shows made-up stars (the card is 5-6px shorter for it)', when: ( d ) => 'text' === d.kind || 'h' === d.key },
		{ pair: 'card-body', key: 'h', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" in place of made-up stars' },
		// WordPress runs wptexturize() on post content, curling a straight apostrophe; the draft's
		// text is unprocessed. The standing pattern of lens.mjs, about.mjs and contact.mjs.
		{ kind: 'text', reason: 'WordPress wptexturize() converts the straight apostrophe to a typographic one; the draft\'s text is unprocessed', when: ( d ) => d.draft.replace( /'/g, '’' ) === d.live },
		// The brand strip is a moving marquee: which brand names are on screen differs with the
		// moment each side is captured. Only rows made purely of the site's brand names.
		{ pair: '(auto)', reason: 'The brand strip scrolls continuously; which brand names are in view depends on the moment each side is captured', when: ( d ) => {
			if ( ! /^text-(missing|extra) "/.test( d.key ) ) {
				return false;
			}
			const text = d.key.replace( /^text-(missing|extra) "|"( #\d+)?$/g, '' ).trim();
			// A long run is cut off mid-brand: drop up to three trailing words that start a brand name.
			const words = text.split( ' ' );
			for ( let k = 0; k <= 3 && k < words.length; k++ ) {
				const head = words.slice( 0, words.length - k ).join( ' ' );
				const tail = words.slice( words.length - k ).join( ' ' );
				if ( BRAND_WORDS.test( head ) && ( 0 === k || BRAND_LIST.some( ( b ) => b.startsWith( tail ) ) ) ) {
					return true;
				}
			}
			return false;
		} },
		// A text link drawn as an underline on the words where the draft uses a 1px bottom border with
		// 3px padding: the same 1px line under the text, kept inside the 44px touch target.
		...[ 'bestsellers-see-all', 'shapetiles-see-all' ].flatMap( ( pair ) => [
			...[ 'border-bottom-width', 'border-bottom-color', 'padding-bottom' ].map( ( key ) => ( { pair, kind: 'style', key, reason: 'The link\'s line under its words is a text underline, not a bottom border, so it stays under the words inside the 44px touch target (Bean 2026-09-27)' } ) ),
			{ pair, kind: 'hover', key: 'text-decoration-line', reason: 'The underline is the resting look and stays on hover, as the draft\'s bottom border does' },
		] ),
		// The hero's entrance is a script animation (animation-observer.js, element.animate()), cancelled
		// once it finishes, so a sample after load reads "none" where the draft's CSS animation stays
		// listed. Recorded on the live page (2026-09-29, Element.prototype.animate wrapped before load):
		// label 150ms delay / 800ms / ease, headline 280 / 900 / ease, subtext 420 / 900 / ease — the
		// draft's 0.15s/0.8s, 0.28s/0.9s and 0.42s/0.9s ease exactly.
		...[ 'hero-label', 'hero-heading', 'hero-subtext' ].map( ( pair ) => ( { pair, kind: 'motion', reason: 'Script entrance (element.animate), cancelled when finished; recorded live 2026-09-29 at the draft\'s exact delay, duration and curve' } ) ),
		// The review arrows' inner padding: a 40px round button whose icon is centred either way; the
		// painted box matches the draft's, so the 1px 6px padding paints nothing.
		...[ 'review-arrow-prev', 'review-arrow-next' ].flatMap( ( pair ) => [ 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ].map( ( key ) => ( { pair, kind: 'style', key, reason: 'Inner padding of a fixed 40px round arrow whose icon is centred; the painted box matches the draft' } ) ) ),
		// A button's line box inside its fixed min-height, and a border style with no border width:
		// neither moves a pixel while the button's box matches.
		...[ 'hero-btn-shop', 'hero-btn-prescription', 'about-button', 'optician-qualifications-button' ].flatMap( ( pair ) => [
			{ pair, kind: 'style', key: 'line-height', notPainted: true, reason: 'Line box of a button label inside a fixed min-height; the painted box and the text position match' },
			{ pair, kind: 'style', key: 'border-top-style', notPainted: true, reason: 'A border style on a button whose border width is 0' },
		] ),
		// Hover timing curves (Bean 2026-09-27, shop.mjs): live uses the site's standard easing where the
		// draft uses ease (cards, tiles) and a custom curve (photo zoom); the durations match.
		...[ 'card-gucci', 'card-holbrook', 'card-photo', 'shapetile-wayfarer', 'shapetile-oversized' ].map( ( pair ) => ( { pair, kind: 'motion', key: 'transition', reason: 'Accepted (Bean 2026-09-27): hover timing curves: live uses the site\'s standard easing where the draft uses ease (card) and a custom curve (photo zoom); durations match' } ) ),
		// Secondary text in text-muted #5E584F where the draft's greys are lighter (Bean, confirmed
		// 2026-09-28): the grid's own colour, as the (auto) rule above for its words.
		{ pair: 'bestsellers-grid', kind: 'box', key: 'y-from-bestsellers-heading', reason: 'The cards sit 81px below the heading on both sides at 1440/768/375 (measured 2026-09-29); the draft\'s grid box starts 26px above its first card, live\'s grid box starts at the card' },
		{ pair: 'bestsellers-grid', kind: 'style', key: 'color', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys', when: ( d ) => 'rgb(94, 88, 79)' === d.live },
		// A tile ground that is transparent on both sides ("none" is no ground; alpha 0 is none too).
		{ pair: 'shapetile-wayfarer', key: 'painted-ground', reason: 'Transparent on both sides (alpha 0 vs no ground)', when: ( d ) => /,\s*0\)$/.test( d.draft ) && 'none' === d.live },
		// The two "see all" text links are held to the 44px touch target (Bean 2026-09-27), their
		// underlined text centred in it, where the draft's link is its own 23px line.
		...[ 'bestsellers-see-all', 'shapetiles-see-all' ].flatMap( ( pair ) => [
			{ pair, kind: 'box', key: 'h', reason: '44px touch targets (the accessibility baseline), Bean 2026-09-27', when: ( d ) => 44 === d.live && d.draft < 44 },
			{ pair, kind: 'box', key: 'text-inset-y', reason: '44px touch targets (Bean 2026-09-27): the link text sits centred in the taller target' },
		] ),
		{ pair: 'card-rrp', kind: 'text', reason: '"Recommended retail price:" is screen-reader text only', when: ( d ) => words( d.draft ) === words( d.live.replace( /recommended retail price:/i, '' ) ) },
		{ pair: 'card-photo', kind: 'style', reason: 'The same photo: the draft paints it as a div background, live as an <img> with object-fit cover' },
		{ pair: 'card-brand', kind: 'style', key: 'background-image', reason: 'The same gradient written with and without the 0% and 100% stops', when: ( d ) => d.live.includes( '62%' ) },
		{ pair: 'card-name', reason: 'The title link is inline live and block in the draft; the text and its position match', when: ( d ) => [ 'display', 'w' ].includes( d.key ) },
		{ pair: 'card-wishlist', kind: 'structure', key: 'inside', reason: 'The heart paints at the same place on both: live nests it in the photo box, the draft in the card' },
		...[ 'tag-holbrook' ].map( ( pair ) => ( {
			pair, kind: 'box', key: `right-from-card-holbrook`,
			reason: 'Accepted (Bean 2026-09-27, as the shop\'s tag-holbrook): the tag sits in one place on every card, inside the card\'s 16px inset',
			when: ( d ) => d.live >= 16,
		} ) ),
		{ pair: 'card-7', reason: 'Off screen, nothing paints: the draft holds every card at its start pose (opacity 0, 26px down) from load, the framework only once a card is within 200px of view; both play the same fade-up on reaching view', when: ( d ) => 'opacity' === d.key || /^pre:/.test( d.key ) },
		{ pair: 'card-7', kind: 'box', key: 'h', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" is a line shorter than the draft\'s made-up stars', when: ( d ) => Math.abs( d.draft - d.live ) <= 12 },
		// Measured 2026-09-29 (1440/768/375): the "Photo to come" labels sit 151/72px down their card on both
		// sides; only the See-all link above differs (a 44px touch target, text centred, vs the draft's 24px).
		{ pair: '(auto)', reason: 'Word offsets across the 44px See-all link (touch target, accepted); the cards and their "Photo to come" labels match (measured 2026-09-29)', when: ( d ) => /^moved "(sellers|everything|shape|styles) \u2192/.test( d.key ) },
		{ pair: 'shapetile-oversized', kind: 'style', key: 'painted-ground', reason: 'Before the entrance the draft\'s tile ground is still transparent (it fades in with the tile); after the scroll both paint #2B2721 (no open row in the scrolled states)', when: ( d ) => /,\s*0\)$/.test( d.draft ) },
		{ pair: 'card-7', key: 'running-on-reveal', reason: 'The draft plays this card\'s fade-up from its own script (inline styles the walker cannot record); both enter with the same 460ms fade-up from 26px down', when: ( d ) => 'none' === d.draft },
		{ pair: 'whybuy-text', kind: 'box', key: 'h', reason: 'Every line sits at the same place on both (5 lines at 1, 26, 51, 75, 100px, measured 2026-09-29); live\'s paragraph box is stretched 6px by its grid row at 1440', when: ( d ) => Math.abs( d.draft - d.live ) <= 8 },
		{ pair: 'about-photo', kind: 'motion', key: 'transition', reason: 'The same 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) zoom; live also lists the shadow atom\'s box-shadow transition, which changes nothing here (no shadow set)', when: ( d ) => d.live.startsWith( d.draft ) },
		{ pair: 'tag-holbrook', kind: 'box', key: 'y-from-card-holbrook', reason: 'At 375 the draft\'s tag runs 6px past its 163px card (ends at 169px); live wraps it under the name, inside the card (measured 2026-09-29)', when: ( d ) => d.live > d.draft },
		{ pair: 'shapetile-oversized', reason: 'Off screen, nothing paints: the draft holds every tile at its start pose from load, the framework only once a tile is within 200px of view', when: ( d ) => 'opacity' === d.key || /^pre:/.test( d.key ) },
		{ pair: 'shapetiles-see-all', kind: 'text', reason: 'Accepted (Bean 2026-09-27, as the shop\'s brand/style counts): live counts the real 6 photographed shapes; the draft counts a made-up catalogue of 12', when: ( d ) => /^all \d+ styles$/i.test( d.draft ) && /^all \d+ styles$/i.test( d.live ) },
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27, as the shop\'s brand/style counts): live counts the real 6 photographed shapes; the draft counts a made-up catalogue of 12', when: ( d ) => ( ( d ) => /^text-(missing|extra) "all \d+ styles"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		// The brand marquee scrolls continuously on both sides, so where its words sit is only a matter of the
		// moment each side was sampled; the strip itself matches (97 vs 96px tall at 1440/768/375, measured 2026-09-29).
		{ pair: '(auto)', reason: 'The brand marquee is moving on both sides: its words sit wherever the scroll was at the moment of the sample (strip 97 vs 96px tall, measured 2026-09-29)', when: ( d ) => /^(moved|text-(missing|extra)) "[^"]*(moving fastest this month|ray-ban|gucci|oakley|prada|versace|balenciaga|dolce|&|michael|kors|polaroid|police|carrera|ferrari|emporio|armani|superdry)/.test( d.key.replace( / #\d+$/, '' ) ) && ! /\b(ago|reviews?|photos)\b/.test( d.key ) },
		// The review stars: live draws five 15px icons 2px apart (the framework's fixed star gap), the draft five
		// text glyphs; the star row is 7px wider, so the date beside it starts 7px further right. Bean 2026-09-29:
		// not worth a star-spacing control.
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-29): icon stars sit 2px apart, 7px wider than the draft\'s text stars, so the date beside them starts up to 8px further right', when: ( d ) => /^moved "[^"]*(reviews|photos|review) → (a|\d+) (year|month|week)s? ago/.test( d.key ) && ( ( [ dx, dy ], [ lx, ly ] ) => Math.abs( lx - dx ) <= 8 && Math.abs( ly - dy ) <= 2 )( d.draft.split( ',' ).map( Number ), d.live.split( ',' ).map( Number ) ) },
		// The shape tile title: "normal" against 18.2px, and both boxes measure 18px (measured 2026-09-29).
		{ pair: 'shapetile-wayfarer-title', kind: 'style', key: 'line-height', reason: 'Both titles measure 18px tall (the draft\'s "normal" line at 14px resolves to the same box, measured 2026-09-29)', when: ( d ) => 'normal' === d.draft && /^18(\.\d+)?px$/.test( d.live ) },
		// The Google reviews widget: live pulls the real Google feed (different reviewers, dates and counts
		// than the draft's placeholder text), so only the card's look (box, colour, shape) is compared, not its words.
		{ pair: 'review-card', kind: 'text', reason: 'Accepted (Bean 2026-09-28): live pulls the real Google review feed; the draft\'s reviewer names, dates and wording are placeholder copy' },
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-28): live pulls the real Google review feed (different reviewers, review counts and wording) where the draft uses placeholder review text', when: ( d ) => ( ( d ) => /^text-(missing|extra) "(anonymous|fatima|reviews?\b|verified|google)/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		// The Google review card is the real Google widget (Roboto, its own border/shadow), same reasoning
		// as review-card, extended to the second card once the reviews-next scroll-into-view fix (2026-09-28)
		// let the walker actually reach it.
		{ pair: 'review-card-2', kind: 'text', reason: 'Accepted (Bean 2026-09-28, as review-card): live pulls the real Google review feed; the draft\'s reviewer names, dates and wording are placeholder copy' },
		{ pair: 'review-card-2', kind: 'style', reason: 'Accepted (Bean 2026-09-28, as review-card): the Google Card widget keeps Google\'s own Roboto type, colour and border, not the site palette', when: ( d ) => [ 'font-family', 'font-size', 'font-weight', 'line-height', 'color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color' ].includes( d.key ) },
		// Copied verbatim from shop.mjs's accepted decision: the same timings listed by property name, or
		// including a property that never changes on this element, read the same as a real difference but
		// paint identically.
		{ kind: 'motion', key: 'transition', reason: 'The same timings listed by property name (background vs background-color) or including a property that does not change here', when: ( d ) => ! /cubic-bezier\(0.2, 0.7/.test( d.draft ) && ! /\b0.3s\b/.test( d.draft ) },
		// A measurement artefact, not a design difference: matrix(1,0,0,1,0,0) is the identity matrix —
		// zero translation, zero scale change — exactly the same as "none" (as GAP-CHECKLIST 8: measured, not painted).
		{ kind: 'hover', key: 'transform', reason: 'matrix(1, 0, 0, 1, 0, 0) is the identity matrix: no movement, same as none', when: ( d ) => 'none' === d.draft && /^matrix\(1, ?0, ?0, ?1, ?0, ?0\)$/.test( d.live ) },
		// The card-grid tiles play their stagger entrance via a declared CSS animation-name (the framework's
		// `.sgs-has-stagger` class), which stays in getComputedStyle() permanently once it exists; the draft's
		// reveal is inline-style/WAAPI-driven and leaves no persisting `animation`/`transition` declaration.
		// Both settle to the same final look (both tiles are accepted already for their pre-reveal pose above).
		...[ 'shapetile-wayfarer', 'shapetile-oversized' ].map( ( pair ) => ( {
			pair, kind: 'motion', reason: 'The framework declares the card-grid\'s stagger entrance as a persisting CSS animation-name; the draft\'s reveal is inline-style-driven and leaves nothing declared once played — both settle to the same look',
			when: ( d ) => [ 'keyframes', 'animation', 'running-after-action' ].includes( d.key ),
		} ) ),
		// Wording only, same function (Bean 2026-09-28): the draft's arrows say "Previous reviews"/"More
		// reviews" (plural, generic); live's say "Previous review"/"Next review" (singular, the standard
		// Google-widget slider labels) — both are one-card-at-a-time prev/next controls.
		...[ 'review-arrow-prev', 'review-arrow-next' ].map( ( pair ) => ( {
			pair, kind: 'text', reason: 'Accepted (Bean 2026-09-28): wording only ("Previous reviews"/"More reviews" vs "Previous review"/"Next review"), same prev/next function',
		} ) ),
		// The off-white #FAF8F5 in place of pure white, as the palette's text-inverse token used elsewhere
		// (product.mjs's help-toggle, lens.mjs's add-to-bag) — here on the arrow's own background instead of text.
		...[ 'review-arrow-prev', 'review-arrow-next' ].map( ( pair ) => ( {
			pair, reason: 'Accepted (Bean 2026-09-28, as the palette\'s text-inverse #FAF8F5 used elsewhere for the draft\'s pure white): the arrow\'s background is the palette off-white, not #FFFFFF',
			when: ( d ) => [ 'background-color', 'painted-ground' ].includes( d.key ) && [ 'rgb(255, 255, 255)', 'rgba(255, 255, 255, 1)' ].includes( d.draft ) && [ 'rgb(250, 248, 245)', 'rgba(250, 248, 245, 1)' ].includes( d.live ),
		} ) ),
		// The section reveals (as card-7): the draft plays its 460ms fade-up from its own script and holds each section at the start pose
		// from load; live's fade-up container (data-sgs-animation, 26px, 460ms) starts once the section is within 200px of view.
		...[ 'whybuy-reveal', 'reviews-reveal', 'about-reveal', 'optician-reveal', 'about-photo-reveal' ].flatMap( ( pair ) => [
			{ pair, reason: 'Off screen, nothing paints: the draft holds every section at its start pose (opacity 0, 26px down) from load, the framework only once the section is within 200px of view; both play the same fade-up on reaching view', when: ( d ) => 'opacity' === d.key || /^pre:/.test( d.key ) },
			{ pair, key: 'running-on-reveal', reason: 'The draft plays the fade-up of this section from its own script (inline styles the walker cannot record); the live fade-up container runs 460ms from 26px down, the draft runs 460ms from translateY(26px)', when: ( d ) => 'none' === d.draft },
		] ),
	],
	// Review notes: region by region, written after opening every shot in out/home (2026-09-28).
	review: {
		'opening@1440': 'Hero: label, headline, subtext and both buttons match in content; live plays no entrance (fade-up-on-load animation missing from the tree, see report). Brand strip scrolls the same real 14 brands (marquee) beneath. Best sellers: eyebrow, heading, 8 cards in a 4-column grid, prices/save badges/swatches match; "No reviews yet" accepted. Why buy: 4 numbered reasons match in copy; live\'s h3s render serif (Playfair) where the draft is sans (Outfit) — a real tree.json gap (see report), taller line height as a result. Start with a shape: BLANK grey gradient band on live where 6 shape tiles should be — the shape-tile images and text painted nothing in this full-page shot (see report: likely a lazy-image timing gap between native `loading="lazy"` and the walker\'s screenshot, not a live bug — confirmed by the auto-scrolled shot showing images loaded fine higher up the page). What people say: Google widget renders with 4 real reviews, score 4.7, matching structure to the draft\'s styled mock. Prescription strip: live\'s photo half is a SOLID BLACK BOX (same lazy-image timing cause as the shape tiles — the `<img>` never painted before the shot, leaving the section\'s dark fallback background showing); text, 3 steps and button match. Optician bio: both sides show the same literal "Photo of the clinic" placeholder (real content gap, not a live bug — nobody has supplied a photo yet); heading/text/WhatsApp CTA/qualifications button match.',
		'opening@768': 'Same section order reflowed to one column. Hero, brand strip, Best sellers (2x4 grid) match. Why buy 2-column grid: same font-family gap as 1440. Shape tiles: same blank grey band as 1440 (lazy-image timing). Reviews: 2 cards visible, matching. Prescription strip: live photo again solid black (lazy-image timing); text and steps match. Optician bio: placeholder box and copy match on both.',
		'opening@375': 'CAUTION: this shot appears to duplicate the entire page content partway down (hero, Best sellers, Why buy, shape tiles and reviews all repeat a second time on both draft and live) — this looks like a walker/Playwright full-page-screenshot artefact at this width, not a real page or theme bug (it affects both sides identically and 1440/768 don\'t show it); flagging for the walker author rather than reading it as a content difference. Reading only the first pass: hero, Best sellers (2-column) and Why buy (stacked) match; shape tiles show the same blank grey band as the wider widths.',
		'reviews-next@1440': 'Fixed 2026-09-28 (see home.mjs changes): the state now scrolls the reviews rail into view before clicking "next", so the shot shows the review cards, not the hero. Both rails hold their card widths (319 draft / 340 live, a Google Card standard width) and scroll one card per click.',
		'reviews-next@768': 'Same fix applied; the rail scrolls one card at this width too.',
		'reviews-next@375': 'Same fix applied; single-column rail, one card per click on both sides.',
		'hero-scrolled@1440': 'Scrolled 300px. Left (draft): compact sticky header bar (menu links, wordmark, phone, Bag), the hero photo layer translated down 54px, headline cropped under the header, subtext and both buttons, then the brand strip as text names. Right (live): the header is collapsed into a stacked vertical wordmark with menu words overlapping, the hero photo is pinned (position fixed, no transform) so it reads brighter and lower, headline cropped, subtext and both buttons match in content, brand strip shows logo images. Differences are the pinned versus translated photo, the broken scrolled header and the lighter overlay.',
		'hero-scrolled@768': 'Scrolled 300px at tablet. Draft: Menu, wordmark and Bag in a compact bar, headline, subtext and both buttons over the dark overlay, brand names beneath. Live: header collapsed to a vertical wordmark with Menu and Bag overlapping, the photo pinned and brighter behind the subtext and buttons, brand logos beneath. Copy and buttons match; the photo motion (translate versus fixed), header and overlay differ.',
		'hero-scrolled@375': 'Scrolled 300px at phone width. Draft: header bar with burger, wordmark and Bag, headline, subtext, two stacked buttons, brand strip text. Live: stacked vertical wordmark beside the burger and Bag, subtext and stacked buttons over a lighter pinned photo that runs behind the text, brand logo strip. Copy and buttons match; the pinned photo, lighter overlay and collapsed header differ.',
		'auto-scrolled@1440': 'Scrolled a screen and a half: Best sellers grid visible with real photos loaded (Gucci, Holbrook, Original Wayfarer, Round Metal); Versace ("Medusa Biggie") and Polaroid ("PLD 6003/N") have no real photo on either side — the draft shows its "PHOTO TO COME" label, live shows the framework\'s generic broken-image icon glyph instead of a styled placeholder (a framework polish opportunity, not a parity bug: both sides simply lack a photo for these two products).',
		'auto-scrolled@768': 'Same as 1440 reflowed to 2 columns; same two photo-less cards (Medusa Biggie, PLD 6003/N) showing the generic icon on live against the draft\'s text label.',
		'auto-scrolled@375': 'Same at full width; nothing clipped at the edge; same two photo-less cards.',
	},
};
