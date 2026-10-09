// Parity config: the Help page (delivery/returns info, FAQ accordion, contact CTA).
// Real behaviour proven before writing this (2026-09-28, both sides): the accordion's first
// item ("Are these frames genuine?") is OPEN AT REST on both draft and live (defaultOpen: 0 —
// view.js sets the `open` attribute the instant the page settles, and the draft's own React
// mounts its first item expanded too). There is no reachable "all closed" state without a click,
// so 'opening' captures the true default (first item open) and 'faq-closed' reaches the closed
// state the only way a visitor can: clicking that same item's own question. There is only one
// accordion group on this page (allowMultiple: false), so 'faq-item2-open' covers "another item
// in the group, opened by a real click" (GAP-CHECKLIST 11: walk the open state with a click on
// the question, so the entrance animation is actually sampled).
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/help.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/help/?cb={cb}';

const Q1 = 'Are these frames genuine?';
const Q2 = 'How are you cheaper than the high street?';
const LATER_QS = [
	'Can I put prescription lenses in sunglasses?',
	'What do I need for a prescription order?',
	'How long do prescription lenses take?',
	'How do I know which size to choose?',
	'Can I return prescription sunglasses?',
	'Can I collect and have them fitted?',
];
// Word multiset of a text, for accepted-difference matchers (as shop.mjs/lens.mjs/product.mjs).
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );

// The draft has no class names: an FAQ item is a <div> holding a <button> (question + rotating
// "+" glyph) and, only while open, a <p> answer (removed from the DOM when closed, not just hidden).
const dBtn = ( title ) => `(r) => [...r.querySelectorAll('button')].find((b) => { const s = b.querySelector('span'); return s && s.textContent.trim() === ${ JSON.stringify( title ) }; })`;
const dItem = ( title ) => `(r) => { const b = (${ dBtn( title ) })(r); return b && b.parentElement; }`;
const dAnswer = ( title ) => `(r) => { const item = (${ dItem( title ) })(r); return item && item.querySelector('p'); }`;
// The glyph is the button's second child span (font-size 24, rotates 45deg when open).
const dIcon = ( title ) => `(r) => { const b = (${ dBtn( title ) })(r); return b && b.children[1]; }`;

// Live: a native <details>/<summary> item, titled by .sgs-accordion-item__title.
const lItem = ( title ) => `(r) => [...r.querySelectorAll('.sgs-accordion-item')].find((d) => { const t = d.querySelector('.sgs-accordion-item__title'); return t && t.textContent.trim() === ${ JSON.stringify( title ) }; })`;
const lBtn = ( title ) => `(r) => { const item = (${ lItem( title ) })(r); return item && item.querySelector('.sgs-accordion-item__header'); }`;
const lAnswer = ( title ) => `(r) => { const item = (${ lItem( title ) })(r); return item && item.querySelector('.sgs-accordion-item__content'); }`;
// Live swaps two icon spans by CSS ([open] shows icon-close, hides icon-open): pick whichever paints.
const lIcon = ( title ) => `(r) => { const item = (${ lItem( title ) })(r); return [...item.querySelectorAll('.sgs-accordion-item__icon-open, .sgs-accordion-item__icon-close')].find((e) => e.offsetParent !== null); }`;


const config = {
	name: 'help',
	widths: [ 375, 768, 1440, 1920 ],
	// Ref tracing (Spec 47 FR-47-6 item 7): every row names the tree node (cr-ref-<surface>-<n>) it was measured on.
	refPrefix: 'cr-ref-',
	// Intended differences (Spec 47 FR-47-5), shared by every Eye Care surface.
	divergences: '../divergences.json',
	// Nav-track chrome outside the header and footer on both sides: the draft's floating WhatsApp
	// bubble and "100% genuine" trust bar (copied from shop.mjs/product.mjs: the draft has no class
	// names, so each is found by its own text). Live's header, footer, mobile menu, mega panels and
	// WhatsApp bubble are excluded by default.
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
				// Every FAQ question button's open/close glyph: a literal "+" text character (rotated by
				// CSS, never swapped), always the button's second span — found 120 open (auto)
				// text-missing "+" rows (2026-09-28): live's icon is an SVG with no text, so the auto
				// word check has nothing to pair it with. A CSS selector (not a single-element {js}
				// finder) so it excludes all 8 buttons in one entry.
				'button[aria-expanded] > span:nth-child(2)',
			],
			// The trust bar sits outside <header> on live, so the default landmark excludes miss it
			// (Bean 2026-09-28, as shop.mjs).
			live: [ '.sgs-trust-bar' ],
		},
		// Live renders typographic apostrophes (’) where the draft's are straight (Bean 2026-09-28).
		normalise: [ { side: 'live', from: /’/g, to: "'", reason: 'Typographic apostrophes on live where the draft\'s are straight (Bean 2026-09-28)' } ],
	},
	draft: {
		url: DRAFT,
		// The draft is a single-page app: reaching Help is navigation, not an interaction — but the
		// route differs by width (proven on the draft, 2026-09-28). At 1440 the header's own "Help"
		// link (an <a>/<button>) navigates directly. Below the nav's ~1060px collapse it moves into
		// the hamburger drawer relabelled "Delivery, returns & FAQs" (live uses the same two labels
		// for the same breakpoint) — a real per-width menu shape, not a config workaround. The menu
		// click is a no-op at 1440 (the button is hidden there); each clickText is optional because
		// exactly one of the two labels is ever visible for a given width, never both.
		open: async ( h ) => {
			// The menu button shows only below the desktop nav (h.click has no optional mode).
		if ( await h.page.evaluate( () => { const b = document.querySelector( 'button[aria-label="Menu"]' ); if ( b && b.offsetParent ) { b.click(); return true; } return false; } ) ) {
			await h.wait( 700 );
		}
			await h.clickText( '^help$', { tag: 'a,button,[role=button]', optional: true, wait: 300, nav: true } );
			await h.clickText( '^delivery, returns (&|and) faqs$', { optional: true, wait: 1200, nav: true } );
		},
	},
	live: { url: LIVE },
	states: [
		{ name: 'opening', fullPage: true },
		{
			name: 'faq-closed',
			draft: ( h ) => h.click( { js: dBtn( Q1 ) }, { wait: 700 } ),
			live: ( h ) => h.click( { js: lBtn( Q1 ) }, { wait: 700 } ),
		},
		{
			name: 'faq-item2-open',
			draft: ( h ) => h.click( { js: dBtn( Q2 ) }, { wait: 700 } ),
			live: ( h ) => h.click( { js: lBtn( Q2 ) }, { wait: 700 } ),
		},
		// Items 3-8, one state each: both accordions are single-open (proven 2026-10-07, clicking every question in
		// turn leaves exactly one open on both sides), so no real click reaches "every answer open". These states are
		// what lets pairs.mjs pair each answer block, which paints its words only while open (CR14).
		...LATER_QS.map( ( q, i ) => ( {
			name: `faq-item${ i + 3 }-open`,
			draft: ( h ) => h.click( { js: dBtn( q ) }, { wait: 700 } ),
			live: ( h ) => h.click( { js: lBtn( q ) }, { wait: 700 } ),
		} ) ),
		// The page's only other interactive control: "Size guide" opens a modal. Live's link becomes
		// a site-wide pop-up after the next deploy (anchor #size-guide, the modal moves to the
		// footer so it opens from any page) — the click is by visible text on both sides, so the
		// href change needs no config update; only the state's own action reaches it as a shopper
		// would, per GAP-CHECKLIST 1.
		{
			name: 'size-guide',
			// The draft's top "Size guide" is a <button> (it runs a JS action, not a navigation) — the
			// draft ALSO has a second "Size guide" <a> in its footer; tag: 'a' matched that one instead
			// (finder bug found via the 768 crash fix's own probing, 2026-09-28: confirmed by dumping
			// every leaf element with this exact text and its tag).
			draft: ( h ) => h.clickText( '^size guide$', { tag: 'button', wait: 700 } ),
			live: ( h ) => h.clickText( '^size guide$', { tag: 'a', wait: 700 } ),
		},
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^help$', tag: 'p' }, live: { text: '^help$', tag: 'p', within: 'main' }, box: [ 'h' ] },
		{ name: 'title', draft: 'h1', live: 'main h1', box: [ 'h' ] },
		// The 3-card delivery/collect/returns row: heading label + its main text, each anchored to
		// the title so the 40px gap under the h1 and the row's own rhythm both show.
		{ name: 'info-uk-heading', anchor: 'title', draft: { text: '^uk delivery$', tag: 'div' }, live: { text: '^uk delivery$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'info-uk-text', draft: { text: '^free over', tag: 'p' }, live: { text: '^free over', tag: 'p' }, box: [ 'h' ] },
		{ name: 'info-collect-heading', draft: { text: '^collect in birmingham$', tag: 'div' }, live: { text: '^collect in birmingham$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'info-collect-text', draft: { text: '^free\\. pick it at checkout', tag: 'p' }, live: { text: '^free\\. pick it at checkout', tag: 'p' }, box: [ 'h' ] },
		{ name: 'info-returns-heading', draft: { text: '^returns$', tag: 'div' }, live: { text: '^returns$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'info-returns-text', draft: { text: '^30 days on unworn', tag: 'p' }, live: { text: '^30 days on unworn', tag: 'p' }, box: [ 'h' ] },
		{ name: 'questions-heading', draft: 'h2', live: 'main h2', box: [ 'h' ] },
		// Finder bug fixed 2026-09-28: the draft's top "Size guide" is a <button> (a JS action, not a
		// link); tag: 'a' was matching a second, decoy "Size guide" <a> in the draft's footer instead
		// (120 open rows traced to this one wrong match — box w 307 vs 79, display block vs inline,
		// text-transform none vs uppercase: all footer-link chrome, not this control's real look).
		{ name: 'size-guide-link', draft: { text: '^size guide$', tag: 'button' }, live: { text: '^size guide$', tag: 'a' }, hover: true },
		// Two "Contact me" elements exist on both sides: a small text link beside Size guide, and the
		// primary button in the "Still not answered?" card at the foot. Tags disambiguate on the draft
		// (a vs button); live uses both as <a>, so the button is picked by its .sgs-button class.
		{ name: 'contact-link-top', anchor: 'questions-heading', draft: { text: '^contact me$', tag: 'a' }, live: { js: '(r) => [...r.querySelectorAll("main a")].find((a) => a.getAttribute("href") === "/contact/" && ! a.classList.contains("sgs-button"))' }, hover: true },
		// The FAQ question row, open answer panel and open/close icon for item 1 — open at rest
		// ('opening'), closed by a real click ('faq-closed').
		{ name: 'faq-question-1', states: [ 'opening', 'faq-closed' ], anchor: 'questions-heading', draft: { js: dBtn( Q1 ) }, live: { js: lBtn( Q1 ) }, hover: true, box: [ 'h' ] },
		{ name: 'faq-answer-1', states: [ 'opening' ], draft: { js: dAnswer( Q1 ) }, live: { js: lAnswer( Q1 ) }, box: [ 'h' ], props: [ 'font-family', 'font-size', 'line-height', 'color' ] },
		{ name: 'faq-icon-1', states: [ 'opening', 'faq-closed' ], draft: { js: dIcon( Q1 ) }, live: { js: lIcon( Q1 ) }, text: false, props: [ 'color' ] },
		// The same three, for item 2 — closed at rest, opened by a real click ('faq-item2-open').
		{ name: 'faq-question-2', states: [ 'faq-item2-open' ], draft: { js: dBtn( Q2 ) }, live: { js: lBtn( Q2 ) }, hover: true, box: [ 'h' ] },
		{ name: 'faq-answer-2', states: [ 'faq-item2-open' ], draft: { js: dAnswer( Q2 ) }, live: { js: lAnswer( Q2 ) }, box: [ 'h' ], props: [ 'font-family', 'font-size', 'line-height', 'color' ] },
		{ name: 'faq-icon-2', states: [ 'faq-item2-open' ], draft: { js: dIcon( Q2 ) }, live: { js: lIcon( Q2 ) }, text: false, props: [ 'color' ] },
		// The size-guide modal itself. After the next deploy this is the site-wide modal living in
		// the footer (anchor #size-guide), so it resolves on live from this page too — before that
		// deploy ships, live has no matching element yet (a real, dated gap, not one of Bean's
		// accepted classes).
		{ name: 'size-guide-modal', states: [ 'size-guide' ], draft: 'div[role="dialog"][aria-label="Size guide"]', live: '.sgs-modal__dialog', text: false, box: [ 'w' ] },
		{ name: 'still-heading', draft: { text: '^still not answered\\?$', tag: 'div' }, live: { text: '^still not answered\\?$', tag: 'p' }, box: [ 'h' ] },
		{ name: 'phone-text', anchor: 'still-heading', draft: { text: '^call the clinic on', tag: 'p' }, live: { text: '^call the clinic on', tag: 'p' }, box: [ 'h' ] },
		{ name: 'contact-button', draft: { text: '^contact me$', tag: 'button' }, live: { text: '^contact me$', tag: 'a.sgs-button' }, hover: true,
			props: [ 'background-color', 'border-top-width', 'border-radius', 'padding-top', 'padding-bottom' ] },
		{ name: 'call-button', draft: { text: '^call$', tag: 'a' }, live: { text: '^call$', tag: 'a' }, hover: true,
			props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'padding-top', 'padding-bottom' ] },
	],
	// Links (GAP-CHECKLIST 14), checked against the live page's hrefs (2026-10-02). "Size guide" opens the site-wide modal by
	// its #size-guide anchor; a same-page anchor reads as "/" here, so the table cannot tell it from a home link.
	links: { 'Size guide': '/#size-guide', 'Contact me': '/contact/', '0121 729 8233': 'tel:01217298233', Call: 'tel:01217298233' },
	// Screenshot review, region by region; written after looking at every shot, 2026-09-28.
	review: {
		'opening@1440': 'Title row: eyebrow, h1, 3-card info row (UK delivery, Collect in Birmingham, Returns) match in content and position. Questions row: heading, SIZE GUIDE / CONTACT ME links aligned right on both — box/style differences open on this run trace to my own finder matching the draft\'s decoy footer "Size guide" link instead of the real button (fixed above). Accordion: item 1 open with its answer and "×" on both, items 2-8 closed with "+"; row spacing/font-size differ (draft 17px/20px padding/20px gap, live 16px/16px/12px) — a real tree.json gap (the accordion block supports fontSize/padding/gap; help.tree.json sets none), not a look-alike. "Still not answered?" card, phone line and two buttons match in content; info-card body text and the phone line are near-black on live (rgb(20,20,20)) where the draft uses a muted grey (rgb(74,69,62)) — another tree.json gap (no textColour set on those text blocks).',
		'opening@768': 'Same layout at 768: 2-column info grid with the 3rd card\'s empty grid cell (auto-fit) painted the same shade on both. Questions row and accordion match in content; the same font-size/padding/gap and muted-text gaps carry over from 1440.',
		'opening@375': 'Stacked info cards, Questions row, first accordion item open — content matches. h1 wraps to 2 lines on both; box height differs by 13px (69 vs 82) and the first info card sits 13px lower on live — a small residual from the accordion/heading sizing gaps above cascading into the auto-fit grid\'s row height, not a new fault.',
		'faq-closed@1440': 'Item 1 closed by a real click on both: "+" replaces "×", the answer paragraph is removed from the draft\'s DOM and collapses to 0 on live\'s — both read the same closed state. Live\'s icon shows a small scale-in on hover (a framework default hover effect) that the draft\'s rotating "+" doesn\'t have; flagged for Bean, not accepted.',
		'faq-closed@768': 'Same close behaviour at 768: "+" replaces "×", the answer collapses, and the row below (items 2 onward) reflows identically on both sides once item 1 is shut.',
		'faq-closed@375': 'Same close behaviour at 375 as at the wider widths; nothing crosses the 375 edge on either side, and the row order below item 1 matches.',
		'faq-item2-open@1440': 'Item 2 opened by a real click on both (item 1 closes first, single-open mode): "How are you cheaper..." shows its answer and "×"; the fade-in is real on the draft (opacity 0→1, 300ms, ease, 0 delay, no rise) and entirely absent on live (motion: none) — the framework gap Bean is already building controls for; exact numbers given above.',
		'faq-item2-open@768': 'Same open behaviour at 768 as at 1440: item 2\'s answer and "×" show on both, and the same row spacing (padding/gap) difference from the accordion tree gap carries over.',
		'faq-item2-open@375': 'Same open behaviour at 375: item 2\'s answer and "×" show on both sides, nothing is clipped by the viewport edge, and the row order below matches.',
		'size-guide@1440': 'Draft opens "Which size am I?" (measures table, size bands) over a dimmed page; live is unchanged (pre-deploy: its Size guide link has no matching modal on this page yet). This is the known, dated gap — resolves once the site-wide footer modal ships.',
		'size-guide@768': 'Same pre-deploy gap at 768 as at 1440: the draft\'s modal fills most of the viewport with the same measures table, while live shows the plain scrolled page underneath, unchanged.',
		'size-guide@375': 'Same pre-deploy gap at 375: the draft\'s modal is readable at full width with the same content as the wider shots, live remains unchanged behind it.',
		'auto-scrolled@1440': 'Scrolled a screen and a half: remaining FAQ items, "Still not answered?" card and footer link columns match in content and order on both; footer column headings/links line up (Help: Delivery & returns / FAQs / Size guide / Contact) though live\'s footer groups them under one "Help" column where the draft repeats a "Help" list in its own column too — same information, same place.',
		'auto-scrolled@768': 'Same content as 1440 reflowed to 768: the footer keeps the same 2-column layout and link order on both, nothing missing.',
		'auto-scrolled@375': 'Same content as the wider widths at 375: the footer stacks in the same order on both sides, and nothing is clipped by the viewport edge.',
	},
	accept: [
		{ kind: 'hover', key: 'color', reason: 'Text colour on an element with no text (an icon button): nothing paints it' },
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90; the lightest fail 4.5:1 contrast)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		// 44px touch targets (2026-09-27): only accepted where live actually meets the 44px floor and
		// the draft's own row does not — never masks a case where both sides are already equal.
		{ kind: 'box', key: 'h', reason: 'Accepted (Bean 2026-09-27): 44px touch targets where the draft\'s row is shorter', when: ( d ) => d.live >= 44 && d.draft < 44 },
		// Hover text on a dark-fill button: the palette's text-inverse #FAF8F5 for the draft's pure white (2026-09-27/28).
		{ kind: 'hover', key: 'color', reason: 'Accepted (Bean 2026-09-27/28): hover/fill text is the palette\'s text-inverse #FAF8F5, the draft\'s pure white', when: ( d ) => 'rgb(255,255,255)' === d.draft && 'rgb(250,248,245)' === d.live },
		{ kind: 'style', key: 'color', reason: 'Accepted (Bean 2026-09-27/28): fill text is the palette\'s text-inverse #FAF8F5, the draft\'s pure white', when: ( d ) => 'rgb(255,255,255)' === d.draft && 'rgb(250,248,245)' === d.live },
		// The draft's open/close "+" glyph lives inside the same button as the question text (live's
		// icon is a separate SVG with no text), and live renders typographic apostrophes (’) where
		// the draft's are straight (Bean 2026-09-28) — one word-multiset accept covers both for every
		// named text pair (faq-question-*, faq-answer-*, info-*-text); replacing a "+" or apostrophe
		// that isn't there is a no-op, so this never masks an unrelated text difference.
		{ kind: 'text', reason: 'The draft\'s open/close icon is a literal "+" inside the question button (live\'s is a separate SVG with no text), and live renders typographic apostrophes (’) where the draft\'s are straight (Bean 2026-09-28)',
			when: ( d ) => words( d.draft.replace( /\s*\+$/, '' ) ) === words( d.live.replace( /’/g, "'" ) ) },
		// Measurement trap (GAP-CHECKLIST 7): live's phone number sits in an inline-flex tap target
		// (.sgs-business-info__link, 44px minimum) whose element boundary innerText renders as an
		// extra space before the following comma; the source has no such space.
		{ pair: 'phone-text', kind: 'text', reason: 'innerText measurement trap: live\'s inline-flex phone link renders an extra space before the following comma that isn\'t in the source (GAP-CHECKLIST 7)',
			when: ( d ) => words( d.draft ) === words( d.live.replace( /\s+,/, ',' ) ) },
		// Sub-pixel line-height rounding (under 1px, never visible) — safe because it never accepts a
		// real difference: questions-heading's genuine 45px-vs-30px gap is 15px, far past this bound.
		{ kind: 'style', key: 'line-height', reason: 'Sub-pixel line-height rounding between the two font engines, invisible', when: ( d ) => {
			const a = parseFloat( d.draft ); const b = parseFloat( d.live );
			return Number.isFinite( a ) && Number.isFinite( b ) && Math.abs( a - b ) < 1;
		} },
		// The same underline, two techniques (as shop.mjs's clear-all): the draft draws it as a 1px
		// bottom border under 3px padding, live as a native text-decoration underline (set via the
		// tree's textDecoration:'underline' on this text block).
		{ pair: 'contact-link-top', kind: 'style', notPainted: true, reason: 'The same underline: the draft draws it as a 1px bottom border under 3px padding, live as a native text-decoration underline (as shop.mjs\'s clear-all)', when: ( d ) => [ 'border-bottom-width', 'padding-bottom', 'display' ].includes( d.key ) },
		// The same 50px button (minHeight:50 in the tree, both sides): live centres the label with
		// top/bottom padding, the draft with flex centring and 0 padding — same box, different technique.
		{ pair: 'contact-button', kind: 'style', notPainted: true, reason: 'The same 50px button: live centres the label with padding, the draft with flex centring (0 padding)', when: ( d ) => [ 'padding-top', 'padding-bottom' ].includes( d.key ) },
		// Verified equivalent colour (not a guess): 0.0784314 x 255 = 20 exactly, so live's alpha-based
		// border colour is the same rgb(20,20,20) as the draft's, just painted at 0.75 opacity.
		{ pair: 'call-button', kind: 'style', key: 'border-top-color', reason: 'The same near-black border: live\'s outline-button preset paints it at 0.75 opacity (0.0784314 x 255 = 20 = rgb(20,20,20)) where the draft\'s is solid', when: ( d ) => 'rgb(20, 20, 20)' === d.draft && /^color\(srgb 0\.0784314 0\.0784314 0\.0784314 \/ 0\.75\)$/.test( d.live ) },
	],
};

export default config;
