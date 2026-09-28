// Parity config: the product page for the Gucci Oversized Cat-Eye (eye-care-test product 76,
// photographed in the draft). Walks the opening view, every tab, the photo gallery and the
// "Which size am I?" size-guide modal. Does NOT walk the lens pop-up (its own config, lens.mjs)
// or the bag drawer (a later wave).
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/product.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/?cb={cb}';
// Word multiset of a text, for accepted-difference matchers.
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );

// The draft's SIZE and COLOUR rows: a { js } finder returns the grid of option buttons under
// the row's label span (the label row, then its next sibling holds the buttons).
const draftOptionGrid = ( label ) => `(r) => { const lbl = [...r.querySelectorAll('span')].find((s) => new RegExp('^${ label }$', 'i').test(s.textContent.trim())); return lbl && lbl.parentElement.nextElementSibling; }`;
// The draft's tab content: the tablist's sibling div (only one panel is ever in the DOM, swapped by tab state).
const DPANEL = `(r) => { const tl = r.querySelector('[role="tablist"]'); return tl && tl.parentElement.children[1]; }`;

export default {
	name: 'product',
	// Nav-track chrome outside the header and footer on both sides: the draft's floating WhatsApp bubble and
	// the "100% genuine" trust bar above the header (copied from shop.mjs: the draft has no class names, so
	// each is found by its own text). Live's header, footer, mobile menu, mega panels and WhatsApp bubble are
	// excluded by default.
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
		},
		normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price on the product page (Bean 2026-09-25)' } ],
	},
	draft: {
		url: DRAFT,
		open: async ( h ) => {
			await h.clickText( '^sunglasses$', { wait: 900 } );
			await h.clickText( '^oversized cat-eye$', { wait: 900 } );
		},
	},
	live: { url: LIVE },
	states: [
		{ name: 'opening', fullPage: true },
		{
			name: 'tab-description',
			draft: ( h ) => h.clickText( '^description$', { tag: 'button', wait: 500 } ),
			live: ( h ) => h.clickText( '^description$', { tag: '.sgs-tabs__tab', wait: 500 } ),
		},
		{
			name: 'tab-details',
			draft: ( h ) => h.clickText( '^details$', { tag: 'button', wait: 500 } ),
			live: ( h ) => h.clickText( '^details$', { tag: '.sgs-tabs__tab', wait: 500 } ),
		},
		{
			name: 'tab-sizing',
			draft: ( h ) => h.clickText( '^sizing$', { tag: 'button', wait: 500 } ),
			live: ( h ) => h.clickText( '^sizing$', { tag: '.sgs-tabs__tab', wait: 500 } ),
		},
		// The draft's four gallery views (Front, Angle, Side, Worn) are photo stand-ins; live currently holds
		// one product photo, so its thumbnail row hides itself (GAP-CHECKLIST 6: a control on one side only).
		{
			name: 'gallery-thumbnail',
			draft: ( h ) => h.tap( 'button[aria-label="Angle"]', { wait: 600 } ),
			live: ( h ) => h.tap( '.product-card__thumb[data-index="1"]', { optional: true, wait: 600 } ),
		},
		// Live's only working "Which size am I?" trigger sits inside the Sizing tab (its buybox has no SIZE
		// row at all); the draft has one in its SIZE row visible without switching tabs. Reached the way each
		// side's own shopper would: live opens Sizing first, the draft clicks its buybox trigger directly.
		{
			name: 'size-guide',
			draft: ( h ) => h.clickText( '^which size am i\\?$', { tag: 'button', wait: 700 } ),
			live: async ( h ) => {
				await h.clickText( '^sizing$', { tag: '.sgs-tabs__tab', wait: 500 } );
				await h.clickText( '^which size am i\\?$', { tag: 'a', wait: 700 } );
			},
		},
	],
	// The buybox and gallery pairs below are scoped away from 'size-guide': that state's modal covers them, so
	// measuring the page behind an open overlay only adds structure/row noise from the dialog sitting on top.
	pairs: [
		...[
			{ name: 'title', draft: 'h1', live: 'main h1', box: [ 'h' ] },
			{ name: 'brand', draft: { js: '(r) => document.querySelector("h1").previousElementSibling' }, live: '.sgs-buybox__extras--before p:first-child', box: [ 'h' ] },
			{ name: 'price', draft: { text: '^£289$', tag: 'span', nth: 0 }, live: '.buybox__price--current', box: [ 'h' ] },
			{ name: 'colour-picker', draft: { js: draftOptionGrid( 'colour' ) }, live: '.sgs-option-picker__options', text: false, box: [ 'w' ] },
			{ name: 'colour-swatch', draft: 'button[aria-label="Ivory"]', live: 'label:has(input[value="ivory"])', hover: true,
				props: [ 'background-color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-radius' ] },
			// Live's buybox has no SIZE row at all (the product has no size variation set up): a real content gap,
			// not one of Bean's accepted classes, so this stays open every run until the catalogue or tree changes.
			{ name: 'size-picker', draft: { js: draftOptionGrid( 'size' ) }, live: '.sgs-buybox__size-picker', text: false, box: [ 'w' ] },
			{ name: 'add-prescription', draft: { text: '^add my prescription', tag: 'button' }, live: '.sgs-button--primary', hover: true,
				props: [ 'background-color', 'border-top-width', 'border-radius', 'padding-top', 'padding-bottom' ] },
			{ name: 'add-to-bag', draft: { text: '^add to bag as they are', tag: 'button' }, live: '.buybox__add-to-cart', hover: true,
				props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'padding-top', 'padding-bottom' ] },
			{ name: 'gallery-photo', draft: '[role="img"]', live: '.product-card__media img', text: false,
				props: [ 'border-top-width', 'border-top-color', 'background-color', 'object-fit' ] },
		].map( ( p ) => ( { ...p, states: [ 'opening', 'tab-description', 'tab-details', 'tab-sizing', 'gallery-thumbnail' ] } ) ),
		{ name: 'tab-description-heading', draft: { text: '^description$', tag: 'button' }, live: { text: '^description$', tag: '.sgs-tabs__tab' }, box: [ 'h' ] },
		{ name: 'tab-details-heading', draft: { text: '^details$', tag: 'button' }, live: { text: '^details$', tag: '.sgs-tabs__tab' }, box: [ 'h' ] },
		{ name: 'tab-sizing-heading', draft: { text: '^sizing$', tag: 'button' }, live: { text: '^sizing$', tag: '.sgs-tabs__tab' }, box: [ 'h' ] },
		// One tab panel's text, on the simplest tab (a straight paragraph, not a field table the two trees
		// hold different counts of): the panels for Details and Sizing are left to the automatic check, since
		// the draft and the live tree intentionally hold different field counts there (see the report).
		{ name: 'tab-panel', states: [ 'tab-description' ], draft: { js: DPANEL }, live: '.sgs-tabs__panel--active',
			props: [ 'font-family', 'font-size', 'line-height', 'color' ] },
		{ name: 'gallery-thumb', states: [ 'opening', 'tab-description', 'tab-details', 'tab-sizing' ], draft: 'button[aria-label="Front"]', live: '.product-card__thumb[data-index="0"]', text: false,
			props: [ 'border-top-width', 'border-top-color' ] },
		// The thumbnail the state's own click selects (its ring/border changes): the pair the "gallery-thumbnail"
		// state itself is scoped to (GAP-CHECKLIST 2). Live is missing on this row whenever its single-photo
		// thumbnail strip has nothing at index 1 (the same real gap "gallery-thumb" reports).
		{ name: 'gallery-thumb-selected', states: [ 'gallery-thumbnail' ], draft: 'button[aria-label="Angle"]', live: '.product-card__thumb[data-index="1"]', text: false,
			props: [ 'border-top-width', 'border-top-color' ] },
		{ name: 'size-guide-box', states: [ 'size-guide' ], draft: 'div[role="dialog"][aria-label="Size guide"]', live: '.sgs-modal__dialog', text: false, box: [ 'w' ],
			props: [ 'background-color', 'border-top-width', 'border-top-color', 'box-shadow', 'padding-top', 'padding-left' ] },
		{ name: 'size-guide-close', states: [ 'size-guide' ], hover: true,
			draft: { js: '(r) => [...r.querySelectorAll(\'div[role="dialog"] button\')].find((b) => /^close$/i.test(b.getAttribute("aria-label") || ""))' },
			live: '.sgs-modal__close' },
	],
	// Screenshot review, region by region; written after looking at each shot, 2026-09-28.
	review: {
		'opening@1440': 'Breadcrumb, gallery (draft: 4 stand-in thumbnails Front/Angle/Side/Worn under the photo with a "Save £51 off RRP" ribbon; live: one real photo, no thumbnail row, no ribbon), brand/title/model code, stars row (draft only), price row with RRP and save pill, In stock line, Colour swatches (3, matching), SIZE row with S/M/L and "Which size am I?" (draft only — live has no size picker at all), Add my prescription and Add to bag buttons, Klarna/Apple Pay line (draft only), WhatsApp advice card, three tick bullets, tabs row (Description active) matching in content. Typography runs bigger/bolder/no-uppercase on live across nearly every label in this column (see report).',
		'opening@768': 'Single column: gallery then buybox stacked as at 1440 (draft ribbon and thumbnails, live single photo, no ribbon). Colour swatches match; SIZE row draft-only. Buttons, WhatsApp card and bullets match in content and order. Tabs, Description copy, Good to know accordion (4 items), the "No reviews yet" panel with the Google 4.7/15-reviews badge (live) against the draft\'s stars and written reviews list (accepted), and a single Prada "Similar shapes" card on both.',
		'opening@375': 'Same stacked order as 768 at full width: gallery (draft ribbon + 4 thumbnails, live single photo), title/price row, Colour swatches, SIZE row draft-only, stacked buttons, WhatsApp card, bullets, tabs, Description copy, Good to know, No-reviews panel + Google badge, Similar shapes (one Prada card). Nothing crosses the 375 edge on either side.',
		'tab-description@1440': 'Details/description column with COLOUR swatches, "Colourway shots are stand-ins" note, SIZE row (draft only), buttons, bullets below; right column: tabs row with Description underlined, the full description paragraph and 4 bullet points matching word-for-word, "Good to know" accordion heading visible below.',
		'tab-description@768': 'Same content stacked as 1440: colour row, SIZE row (draft only), buttons, WhatsApp card, bullets, tabs (Description active), full description paragraph and bullets matching; Good to know heading visible at the foot.',
		'tab-description@375': 'Colour row, SIZE row (draft only), stacked buttons, WhatsApp card, bullets, tabs, description paragraph and bullets matching at full width; nothing clipped.',
		'tab-details@1440': 'Left column unchanged (colour, SIZE draft-only, buttons, bullets); right column Details tab underlined: draft lists 17 specification rows (Brand, Model code, Lens width, Bridge, Temple length, Style, Frame type, Material, Hinge, Nose pads, Lenses as supplied, UV protection, Prescription, Gender, Availability, Warranty, Dispatch, With lenses) in a plain two-column list; live shows an 8-field, 4-column grid (Lens width, Bridge, Temple length, Style, Frame type, Material, Hinge, Nose pads) — a real content gap, not a look gap (grid cells that are present match the draft\'s numbers).',
		'tab-details@768': 'Same as 1440 at the narrower width: live\'s 8-field grid wraps to 2 columns, draft\'s 17-row list runs single column; the 8 fields both sides share match in value.',
		'tab-details@375': 'Live\'s 8-field grid at 2 columns per row, draft\'s 17-row list stacked full width; shared fields match in value; nothing clipped.',
		'tab-sizing@1440': 'Left column unchanged; right column Sizing tab underlined: draft shows a diagram callout (Front/Side with Bridge, Lens width, Lens height, Temple) then "Which size am I?" link and a 4-row measures table (Lens width, Bridge, Lens height, Temple) with descriptions; live shows "This pair, measured" + the same link and a 3-row table (Lens width, Bridge, Temple length) — live has no Lens height row (a real content gap; the shared three rows match in value and copy style).',
		'tab-sizing@768': 'Same tab content as 1440 reflowed to one column; the shared Lens width/Bridge/Temple rows match, live still lacks the Lens height row the draft\'s diagram carries.',
		'tab-sizing@375': 'Same at full width; shared rows match, Lens height still missing on live; nothing clipped.',
		'gallery-thumbnail@1440': 'After clicking the draft\'s second thumbnail (Angle): its border rings black, selected; the main photo replays its zoomIn. Live has no thumbnail row to click (single photo product, thumbnail strip hidden), so nothing changes and the drive check records the missing target — the real, structural cause of every diff in this state, not a fresh one.',
		'gallery-thumbnail@768': 'Same: draft\'s second thumbnail rings black and the main photo replays; live single photo unchanged (no thumbnail row present to click).',
		'gallery-thumbnail@375': 'Same at 375: draft\'s second thumbnail selected (black ring), live single photo with no thumbnail row.',
		'size-guide@1440': 'Modal open on both: heading "Which size am I?", intro line, 55/18/137 number row with Lens width/Bridge/Temple captions, three measure rows with the same copy, then Small/Medium/Large band rows — all matching in content and order. Differences are chrome only: live\'s modal is wider (800 vs 720) with a soft shadow and no border; live\'s close is a bordered square icon button, the draft\'s a plain "×" glyph flush at the corner.',
		'size-guide@768': 'Same modal content matching at 768; live modal fills more of the width behind it is dimmed on both; close-button chrome difference as at 1440.',
		'size-guide@375': 'Modal fills most of the 375 viewport on both; all rows and copy match; live\'s bordered-square close icon against the draft\'s plain "×"; nothing clipped by the viewport edge on either side.',
		'auto-scrolled@1440': 'Scrolled a screen and a half: description text and bullets match; Good to know accordion (4 items) matches; live has no Reviews section at all where the draft shows a 5.0/12-reviews summary and three written reviews (accepted, no reviews yet); both show "More from Gucci" then "Similar shapes" with the same single Prada card (no other Gucci or shape matches in the real catalogue).',
		'auto-scrolled@768': 'Same as 1440 reflowed to one column: description/bullets match, live\'s no-reviews panel + Google badge against the draft\'s written reviews (accepted), single Prada card under Similar shapes on both.',
		'auto-scrolled@375': 'Same at full width; no reviews section on live (accepted), single Prada card on both; nothing clipped at the edge.',
	},
	accept: [
		// Measured, not painted (GAP-CHECKLIST 8), as shop.mjs's and lens.mjs's first accept.
		...[ 'display', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ].map( ( key ) => ( {
			kind: 'style', key, notPainted: true, reason: 'Layout property on an element whose painted box and content match',
		} ) ),
		{ kind: 'hover', key: 'color', reason: 'Text colour on an element with no text (a swatch or dot): nothing paints it' },
		{
			kind: 'text', reason: 'Pennies on every price (Bean 2026-09-25)',
			when: ( d ) => words( d.draft ) === words( d.live.replace( /(£\d+)\.00/g, '$1' ) ),
		},
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-25): pennies on every price', when: ( d ) => ( ( d ) => /^moved "[^"]*£\d/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		// "No reviews yet" until real reviews exist (Bean 2026-09-27): the draft's made-up stars, star-breakdown
		// table and three placeholder written reviews have nothing to pair with on live.
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-27): "No reviews yet" until real reviews exist, where the draft shows made-up stars, a star breakdown and placeholder written reviews', when: ( d ) => ( ( d ) => /^text-missing "(★|\d\.\d out of 5|\d+ reviews\b|based on \d+ reviews|verified ·|bought with single vision|ordered friday|size so i asked|placeholder review)/.test( d.key ) || /^text-extra "no reviews yet"$/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
	],
};
