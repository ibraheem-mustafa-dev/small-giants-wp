// Parity config: the Lenses landing page (prescription-lenses), a single static view with no
// tabs, accordion or toggle either side — confirmed on the draft (Playwright: no hover change on
// the lens-type cards, no <details>/aria-expanded/dialog in its content, one button that only
// navigates to the shop). Walks the opening view only; the walker adds "auto-scrolled" itself.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/lenses.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/prescription-lenses/?cb={cb}';

// The draft's four lens-type cards: the grid whose every child names one of the four types.
const DGRID = `(r) => [...document.querySelectorAll('div')].find((x) => getComputedStyle(x).display === 'grid' && x.children.length === 4 && [...x.children].every((c) => /single vision|varifocal|polarised|thinner lenses/i.test(c.textContent)))`;
const dcard = ( name ) => `(r) => { const g = (${ DGRID })(r); return g && [...g.children].find((c) => c.textContent.includes('${ name }')); }`;
const dpart = ( name, nth ) => `(r) => { const c = (${ dcard( name ) })(r); return c && c.children[${ nth }]; }`;
// The live equivalent: a stack container whose inner div's direct children are exactly the
// three text lines a card holds (title, price, description), narrowed by its own text.
const lcard = ( name ) => `(r) => [...document.querySelectorAll('main .wp-block-sgs-container.sgs-container--stack')].find((c) => { const inner = c.querySelector(':scope > .sgs-container__inner'); return inner && inner.children.length === 3 && [...inner.children].every((e) => e.tagName === 'P') && c.textContent.includes('${ name }'); })`;
const lpart = ( name, nth ) => `(r) => { const c = (${ lcard( name ) })(r); const inner = c && c.querySelector(':scope > .sgs-container__inner'); return inner && inner.children[${ nth }]; }`;
// The benefits list ("In every lens") and the numbered steps ("How it goes"): found by one
// known item's text, then its list parent, on both sides (neither tree has a shared BEM class
// for these page-specific sections).
const dlistOf = ( itemRe ) => `(r) => [...r.querySelectorAll('li')].find((li) => ${ itemRe }.test(li.textContent.trim()))?.parentElement`;
const llistOf = ( itemRe ) => `(r) => [...r.querySelectorAll('li')].find((li) => ${ itemRe }.test(li.textContent.trim()))?.parentElement`;

const config = {
	name: 'lenses',
	widths: [ 375, 768, 1440, 1920 ],
	// Ref tracing (Spec 47 FR-47-6 item 7): every row names the tree node (cr-ref-<surface>-<n>) it was measured on.
	refPrefix: 'cr-ref-',
	// Intended differences (Spec 47 FR-47-5), shared by every Eye Care surface.
	divergences: '../divergences.json',
	// Nav-track chrome outside the header and footer on both sides: the draft's floating WhatsApp
	// bubble and the "100% genuine" trust bar above the header (copied from shop.mjs/product.mjs:
	// the draft has no class names, so each is found by its own text). Live's header, footer,
	// mobile menu, mega panels and WhatsApp bubble are excluded by default.
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
		},
	},
	draft: {
		url: DRAFT,
		// The header's "Lenses" link where it shows (1440); narrower, the draft folds its nav into a menu, so
		// the footer's "Prescription lenses" link opens the same view.
		open: async ( h ) => {
			const inNav = await h.page.evaluate( () => [ ...document.querySelectorAll( 'a,button' ) ].some( ( e ) => /^lenses$/i.test( e.textContent.trim() ) && e.offsetParent && e.getBoundingClientRect().width > 0 ) );
			await h.clickText( inNav ? '^lenses$' : '^prescription lenses$', { tag: 'a,button', wait: 900 } );
		},
	},
	live: { url: LIVE },
	states: [
		{ name: 'opening', fullPage: true },
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^prescription lenses$', tag: 'p' }, live: { text: '^prescription lenses$', tag: 'p', within: 'main' }, box: [ 'h' ] },
		{ name: 'title', anchor: 'eyebrow', draft: 'h1', live: 'main h1', box: [ 'h' ] },
		{ name: 'intro', anchor: 'title', draft: { text: '^any frame on this site', tag: 'p' }, live: { text: '^any frame on this site', tag: 'p', within: 'main' },
			props: [ 'font-family', 'font-size', 'line-height', 'color' ] },
		// The grid of four lens-type cards: whole grid for layout, one full card (Single vision)
		// for its parts, the other three as whole cards (content covered by the automatic check).
		{ name: 'lens-grid', anchor: 'intro', text: false, box: [ 'w' ],
			draft: { js: `(r) => (${ dcard( 'Single vision' ) })(r)?.parentElement` },
			live: { js: `(r) => (${ lcard( 'Single vision' ) })(r)?.parentElement` },
			props: [ 'grid-template-columns', 'column-gap', 'row-gap' ] },
		{ name: 'card-single-vision', text: false,
			draft: { js: dcard( 'Single vision' ) }, live: { js: lcard( 'Single vision' ) },
			props: [ 'background-color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-radius' ] },
		{ name: 'card-single-vision-title', box: [ 'h' ],
			draft: { js: dpart( 'Single vision', 0 ) }, live: { js: lpart( 'Single vision', 0 ) },
			props: [ 'font-family', 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		{ name: 'card-single-vision-price', box: [ 'h' ],
			draft: { js: dpart( 'Single vision', 1 ) }, live: { js: lpart( 'Single vision', 1 ) },
			props: [ 'font-family', 'font-size', 'font-weight', 'color' ] },
		{ name: 'card-single-vision-desc', box: [ 'h' ],
			draft: { js: dpart( 'Single vision', 2 ) }, live: { js: lpart( 'Single vision', 2 ) },
			props: [ 'font-family', 'font-size', 'line-height', 'color' ] },
		{ name: 'card-varifocal', text: false, box: [ 'w' ], structure: false,
			draft: { js: dcard( 'Varifocal' ) }, live: { js: lcard( 'Varifocal' ) } },
		{ name: 'card-polarised', text: false, box: [ 'w' ], structure: false,
			draft: { js: dcard( 'Polarised' ) }, live: { js: lcard( 'Polarised' ) } },
		{ name: 'card-thinner-lenses', text: false, box: [ 'w' ], structure: false,
			draft: { js: dcard( 'Thinner lenses' ) }, live: { js: lcard( 'Thinner lenses' ) } },
		// "In every lens, no extra charge": heading, the list as a whole (layout only, its six
		// lines are plain text left to the automatic check), and the first item for its style.
		{ name: 'benefits-heading', anchor: 'lens-grid', draft: { text: '^in every lens, no extra charge$', tag: 'h2' }, live: { text: '^in every lens, no extra charge$', tag: 'h2', within: 'main' }, box: [ 'h' ] },
		{ name: 'benefits-list', anchor: 'benefits-heading', text: false, box: [ 'w' ],
			draft: { js: dlistOf( '/^uv400 protection$/i' ) }, live: { js: llistOf( '/^uv400 protection$/i' ) },
			props: [ 'padding-top', 'padding-left' ] },
		{ name: 'benefits-item-1', draft: { text: '^uv400 protection$', tag: 'li' }, live: { text: '^uv400 protection$', tag: 'li' },
			props: [ 'font-family', 'font-size', 'color' ] },
		// "How it goes": heading, the numbered list as a whole, and the first step for its number
		// and title style.
		{ name: 'steps-heading', anchor: 'benefits-list', draft: { text: '^how it goes$', tag: 'h2' }, live: { text: '^how it goes$', tag: 'h2', within: 'main' }, box: [ 'h' ] },
		{ name: 'steps-list', anchor: 'steps-heading', text: false, box: [ 'w' ],
			draft: { js: dlistOf( '/choose a frame and tap/i' ) }, live: { js: llistOf( '/choose a frame and tap/i' ) },
			props: [ 'padding-top', 'padding-left' ] },
		{ name: 'step-1', draft: { js: `(r) => (${ dlistOf( '/choose a frame and tap/i' ) })(r)?.children[0]` }, live: { js: `(r) => (${ llistOf( '/choose a frame and tap/i' ) })(r)?.children[0]` },
			props: [ 'font-family', 'font-size', 'color' ] },
		// The draft reveals its [data-reveal] blocks as they scroll into view (opacity 0 and 26px down until reached, then a
		// 460ms fade-up): the card grid and the steps column, found as the card grid and the steps list's parent (as card-7 in shop.mjs).
		{ name: 'grid-reveal', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: `(r) => (${ dcard( 'Single vision' ) })(r)?.parentElement` },
			live: { js: `(r) => (${ lcard( 'Single vision' ) })(r)?.parentElement` } },
		{ name: 'steps-reveal', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: `(r) => (${ dlistOf( '/choose a frame and tap/i' ) })(r)?.parentElement` },
			live: { js: `(r) => (${ llistOf( '/choose a frame and tap/i' ) })(r)?.parentElement` } },
		{ name: 'choose-a-frame', anchor: 'step-1', hover: true,
			draft: { text: '^choose a frame$', tag: 'button' }, live: { text: '^choose a frame$', tag: 'a,button' },
			props: [ 'background-color', 'color', 'padding-left', 'padding-right', 'text-transform', 'letter-spacing' ] },
	],
	// Links (GAP-CHECKLIST 14): the page body's one link goes to the shop (checked against the live page, 2026-10-02).
	links: { 'Choose a frame': '/shop/' },
	// Screenshot review, region by region (header/footer/trust-bar/WhatsApp bubble are the nav
	// track, excluded); written after looking at each shot, 2026-09-28. First run, --no-review.
	review: {
		'opening@1440': 'Eyebrow, h1, intro paragraph (draft wraps 3 lines, live 4 — narrower live column), 4 lens-type cards in one row with hairline dividers on both. "In every lens" list and "How it goes" numbered list both fully visible; live\'s 1-4 numbers are noticeably larger and bolder (serif) than the draft\'s small accent-coloured numerals; "Choose a frame" is a compact left-aligned button on the draft, full-width on live. Trust bar and WhatsApp bubble match (nav track).',
		'auto-scrolled@1440': 'Scrolled: same content as opening (page is short at 1440, nothing new revealed). "In every lens"/"How it goes" columns, numbered list (live numbers still oversized/serif against the draft\'s small ones), Choose a frame button (still full-width on live only), footer below on both.',
		'opening@768': 'Header collapses to a hamburger "Menu" on both. Eyebrow, h1, intro, 4 cards two-across match. Below the cards the draft is blank white space down to the footer — "In every lens"/"How it goes" are in the DOM (heights measure) but paint nothing at this width; live shows both sections normally with the same oversized serif numbers and full-width button as at 1440. Footer matches on both.',
		'auto-scrolled@768': 'Scrolled a screen and a half: live shows steps 2-4 and the full-width "Choose a frame" button then the footer. The draft shows the button and footer but the "In every lens"/"How it goes" text above the button is still blank after scrolling — not just an unfired reveal-on-load, a real paint gap at this width (draft-side bug, not a live gap).',
		'opening@375': 'Header hamburger, eyebrow, h1, intro, 4 cards stacked full width match. Below the cards the draft is blank (same as 768) down to the footer; live shows "In every lens"/"How it goes" (oversized serif numbers) and the full-width button normally. Footer and WhatsApp bubble match.',
		'auto-scrolled@375': 'Scrolled: here the draft DOES repaint "In every lens"/"How it goes" and the button correctly (unlike 768) — confirms the opening@375 blank was the reveal-on-scroll not having fired for a non-scrolling full-page capture, not a permanent bug at this width. Live matches in content; numbers/button styling differences as above persist.',
	},
	accept: [
		// Measured, not painted (GAP-CHECKLIST 8), as shop.mjs's, lens.mjs's and product.mjs's first accept.
		...[ 'display', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ].map( ( key ) => ( {
			kind: 'style', key, notPainted: true, reason: 'Layout property on an element whose painted box and content match (a flex vs block wrapper with one child or centred text)',
		} ) ),
		// The automatic check (GAP-CHECKLIST section 12): the standing decision Bean has already made
		// for secondary text, confirmed again here — the draft's card eyebrow ("Single vision" etc.,
		// measured rgb(119,113,106) = #77716A) is one of the accepted lighter greys.
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90; the lightest fail 4.5:1 contrast)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		{ pair: 'card-single-vision-title', kind: 'style', key: 'color', reason: 'Accepted (Bean, confirmed 2026-09-28, as the (auto) rule above): the card eyebrow is the draft\'s lighter grey #77716A against live\'s text-muted #5E584F', when: ( d ) => 'rgb(94,88,79)' === d.live && 'rgb(119,113,106)' === d.draft },
		// Measured, not painted: verified live on the draft (Playwright) — border-top-width:0,
		// border-top-style:none at rest and on hover, so the declared border-top-color paints
		// nothing on either side (live's is transparent for the same reason).
		{ pair: 'choose-a-frame', kind: 'hover', key: 'border-top-color', notPainted: true, reason: 'Measured, not painted: the button has no border (0px, style none) at rest and on hover on both sides, so a declared border colour paints nothing' },
	],
};

export default config;
