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

// The draft has no class names, so its page sections are found as <main>'s direct <section>s by what they hold.
const dsection = ( test ) => `(r) => [...document.querySelectorAll('main > section')].find((s) => ${ test })`;
// The draft's "Good to know" accordion buttons (aria-expanded) by their question, and the answer under an open one.
const dacc = ( re ) => `[...document.querySelectorAll('button[aria-expanded]')].find((b) => /${ re }/i.test(b.innerText.trim()))`;
// Live's size picker holds one frame size (M, the product's only variation); its chosen pill is the checked one.
const LSIZE = '[data-type-key="pa_frame-size"] input:checked + .sgs-option-picker__pill';

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
	// Where each link in the product body must go (GAP-CHECKLIST 14), written from the live page's real hrefs (2026-10-02). The draft's
	// internal links are "#", so only live is judged. Left out: "Which size am I?" and "Add my prescription" (same-page #anchors the
	// table cannot express).
	links: {
		'home': '/',
		'sunglasses': '/product-category/sunglasses/',
		'need advice? message me on whatsapp — i’m an optician, and i’m happy to help.': 'https://wa.me/4479605978?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.',
		'symbole': '/product/prada-symbole/',
	},
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
		// What a shopper's click on a different colour, a different size, a "Good to know" question and "Add to bag" changes.
		// A click that re-renders by fetch (live's add to bag) passes { quiet: true } so the snapshot waits for the network.
		{
			name: 'pick-colour',
			draft: ( h ) => h.click( 'button[aria-label="Black"]', { wait: 600 } ),
			live: ( h ) => h.click( 'label:has(input[value="black"])', { quiet: true, wait: 600 } ),
		},
		// The draft sizes the frame S / M / L (M chosen); live's product has one frame size (M), so there is no other size to choose:
		// the live click is optional and its absence is the finding.
		{
			name: 'pick-size',
			draft: ( h ) => h.clickText( '^S\\s*5\\d', { tag: 'button', wait: 600 } ),
			live: ( h ) => h.clickText( '^S\\s*5\\d', { tag: '.sgs-option-picker__option', optional: true, wait: 600 } ),
		},
		{
			name: 'accordion-open',
			draft: ( h ) => h.clickText( '^will prescription lenses work in these', { tag: 'button', wait: 600 } ),
			live: ( h ) => h.clickText( '^will prescription lenses work in these', { tag: 'summary', wait: 600 } ),
		},
		// The draft's toast (a fixed pill: "Added to bag", View bag) lasts 3.2s, so this state settles early; live confirms inline.
		{
			name: 'bag-added',
			settle: 300,
			draft: ( h ) => h.clickText( '^add to bag as they are', { tag: 'button', wait: 300 } ),
			live: ( h ) => h.click( '.buybox__add-to-cart', { quiet: true, wait: 300 } ),
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
		// pick-colour: the swatch the click chose and the "Colour <name>" value beside the label.
		{ name: 'colour-chosen', states: [ 'pick-colour' ], draft: 'button[aria-label="Black"]', live: 'label:has(input[value="black"]) .sgs-option-picker__pill', text: false,
			props: [ 'background-color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-radius', 'transform' ] },
		{ name: 'colour-value', states: [ 'pick-colour' ], box: [ 'h' ],
			draft: { js: `(r) => { const l = [...r.querySelectorAll('span')].find((s) => /^colour$/i.test(s.textContent.trim())); return l && l.nextElementSibling; }` },
			live: '.sgs-buybox__picker-selected-value' },
		// pick-size: the tile the click chose (live has one frame size, M, already chosen). The picker label carries no chosen
		// value on either side (the draft's row is "SIZE  Which size am I?", live's "FRAME SIZE  Which size am I?").
		{ name: 'size-chosen', states: [ 'pick-size' ], text: false, props: [ 'background-color', 'color', 'border-top-width', 'border-top-color', 'border-radius' ],
			draft: { js: `(r) => (${ draftOptionGrid( 'size' ) })(r)?.children[0]` }, live: LSIZE },
		// Hover end states on the opening view.
		{ name: 'size-button-m', states: [ 'opening' ], hover: true, text: false, props: [ 'background-color', 'color', 'border-top-width', 'border-top-color', 'border-radius' ],
			draft: { js: `(r) => (${ draftOptionGrid( 'size' ) })(r)?.children[1]` }, live: LSIZE },
		// The draft zooms the gallery photo to 1.04 over .9s.
		{ name: 'gallery-photo-zoom', states: [ 'opening' ], hover: true, hoverWait: 1400, draft: '[role="img"]', live: '.product-card__media img', text: false, structure: false, box: [], props: [ 'transform', 'scale', 'filter' ] },
		{ name: 'whatsapp-card', states: [ 'opening' ], hover: true, draft: { text: '^need advice', tag: 'a' }, live: '.sgs-whatsapp-cta--card',
			props: [ 'background-color', 'border-top-color', 'color' ] },
		// accordion-open: the question that was clicked and its opened answer.
		{ name: 'accordion-header', states: [ 'accordion-open' ], hover: true, draft: { js: `(r) => ${ dacc( '^will prescription lenses' ) }` }, live: 'details[open] > summary' },
		{ name: 'accordion-answer', states: [ 'accordion-open' ],
			draft: { js: `(r) => { const b = ${ dacc( '^will prescription lenses' ) }; return b && b.parentElement.children[1]; }` }, live: 'details[open] .sgs-accordion-item__content-inner',
			props: [ 'font-family', 'font-size', 'line-height', 'color', 'padding-top', 'padding-bottom' ] },
		// bag-added: the draft's toast (a fixed "Added to bag" pill with a View bag link) against live's inline confirmation.
		{ name: 'bag-toast', states: [ 'bag-added' ], structure: false,
			draft: { js: '(r) => [...document.querySelectorAll("[role=status]")].find((e) => /added to bag/i.test(e.innerText))' }, live: '.buybox__cart-status-region--visible',
			props: [ 'position', 'background-color', 'color', 'font-size', 'padding-top', 'padding-left', 'box-shadow', 'opacity' ] },
		// Scroll reveals (GAP-CHECKLIST 5): the draft's [data-reveal] sections against their live counterparts. For this Gucci frame the
		// draft shows no "More from Gucci" section and no "Read the clinic's reviews" link (it has 12 reviews and one Gucci frame), and
		// live has neither, so those two have nothing to pair.
		{ name: 'tabs-reveal', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: dsection( '!! s.querySelector("[role=tablist]")' ) }, live: { js: `(r) => document.querySelector('.sgs-tabs')?.closest('section.sgs-container--grid')` } },
		{ name: 'reviews-reveal', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: dsection( '/^reviews\\b/i.test(s.innerText.trim())' ) },
			live: { js: `(r) => [...document.querySelectorAll('p')].find((p) => /^no reviews on this frame yet/i.test(p.textContent.trim()))?.closest('section.sgs-container--grid')` } },
		{ name: 'similar-reveal', states: [ 'opening' ], scrollIn: true, text: false, box: [ 'h' ], props: [ 'opacity' ], structure: false,
			draft: { js: dsection( '/^similar shapes/i.test(s.innerText.trim())' ) },
			live: { js: `(r) => [...document.querySelectorAll('h2')].find((h) => /^similar shapes$/i.test(h.textContent.trim()))?.closest('section')` } },
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
		'pick-colour@1440': 'After clicking Black. Draft (left, scrolled to the buybox): COLOUR row reads Black, the Black tile outlined 1px black, M still the filled size, both buttons, Klarna line, WhatsApp card and ticks below. Live (right, still at the top): COLOUR row reads Black, the Black tile outlined 2px and lifted, single M frame size, price row and stock line above. Value label and chosen tile both change on both sides; live is bigger type and a thicker ring. Live header is collapsed to a stacked wordmark.',
		'pick-colour@768': 'After clicking Black at tablet. Draft: COLOUR Black with the three photo tiles (Black ringed), Colourway note, SIZE row S/M/L with M filled, buttons, Klarna, WhatsApp card, ticks. Live: title, price, stock, COLOUR Black with Black tile ringed 2px, FRAME SIZE with only M, Add my prescription. Both show the chosen colour and its name; live has no S/L tiles; live header is collapsed.',
		'pick-colour@375': 'After clicking Black at phone width. Draft: gallery with 4 thumbnails, title, stars, price, stock, COLOUR row starting at the foot. Live: title, price, stock, COLOUR Black with the Black tile ringed, FRAME SIZE M only. Live value label and ringed tile show the pick; draft colour row is below the fold in this viewport so its tile is read from the pair, not the shot.',
		'pick-size@1440': 'After clicking S. Draft: S now filled black (M back to white), COLOUR still Black, buttons below unchanged. Live: no S exists (one frame size, M), so nothing changes; the M tile stays filled and COLOUR still reads Black. The drive check records the missing S; size tile styling otherwise matches in kind (filled when chosen).',
		'pick-size@768': 'After clicking S at tablet. Draft: S filled, M and L white, colour tiles and buttons unchanged. Live: only M, still filled, no S or L; click absent. Layout of the rows otherwise as before.',
		'pick-size@375': 'After clicking S at phone width. Draft viewport shows gallery, title, price and stock (its size row is below the fold); live shows FRAME SIZE with M only, still filled. Nothing changes on live because there is no S to click.',
		'accordion-open@1440': 'After opening Will prescription lenses work in these. Draft: the question with a close glyph, answer paragraph beneath, the other three questions with plus signs, tabs and the Sizing diagram to the left. Live: same question open with a larger close X and a white header strip, the answer in smaller grey type, three collapsed questions with plus signs. Copy matches; header height (64 vs 56), column width and padding differ.',
		'accordion-open@768': 'After opening the first question at tablet. Draft: Sizing panel above, Good to know heading, open question with answer, three collapsed. Live: Sizing rows above, Good to know, open question in a white strip with a large X, answer, three collapsed. Content and order match; the open header look and spacing differ.',
		'accordion-open@375': 'After opening the first question at phone width. The viewport shows the top of the page on both sides (the click does not scroll), so the opened answer is below the shot; draft shows gallery, title, price, stock; live shows title, price, stock, colour and size. The opened answer is read by the accordion-answer pair, not the shot.',
		'bag-added@1440': 'After Add to bag as they are. Draft: a dark Added to bag toast with View bag floats bottom centre, Bag count 1, Good to know accordion above. Live: Bag count 1, no floating toast in the viewport (live confirms with Added to your basket under the button, off screen here), Good to know and Sizing rows visible. The toast is draft only; both bags count 1.',
		'bag-added@768': 'After Add to bag at tablet. Draft: dark Added to bag toast with View bag at the foot beside the WhatsApp button, Bag 1, accordion above. Live: Bag 1, accordion with the first question open, no toast shown. Toast is draft only; counts match.',
		'bag-added@375': 'After Add to bag at phone width. Draft: a narrow dark toast Added to bag with View bag wrapped over the stock line, Bag 1. Live: Bag 1, price and colour rows, no toast. Draft toast has no live counterpart; the live inline message sits below the button off screen.',
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
