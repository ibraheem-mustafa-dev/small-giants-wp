// Parity config: the About page (Fatima Nawaz's bio and credential stack). A static, two-column
// page with no images, no slider/tabs/accordion/video: draft and live hold the same copy, so
// named pairs are found by exact text (draft has no class names; live's blocks carry only hashed
// per-instance classes, not stable BEM ones, so text finders are used on both sides too).
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/about.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/about/?cb={cb}';
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );

// The draft's card heading is a plain leaf <div> with the exact credential text; its card is that
// div's parent. Live's heading is an <h3>; its card is two levels up (an <h3> sits inside the
// block's own ".sgs-container__inner" padding wrapper, which sits inside the bordered/backed
// ".wp-block-sgs-container" that actually carries the background and (for DipTp(IP)) the accent border).
const draftCardOf = ( heading ) => `(r) => { const h = [...r.querySelectorAll('div')].find((d) => ! d.children.length && d.textContent.trim() === '${ heading }'); return h && h.parentElement; }`;
const liveCardOf = ( heading ) => `(r) => { const h = [...r.querySelectorAll('h3')].find((x) => x.textContent.trim() === '${ heading }'); return h && h.parentElement.parentElement; }`;


const config = {
	name: 'about',
	widths: [ 375, 768, 1440, 1920 ],
	// Ref tracing (Spec 47 FR-47-6 item 7): every row names the tree node (cr-ref-<surface>-<n>) it was measured on.
	refPrefix: 'cr-ref-',
	// Intended differences (Spec 47 FR-47-5), shared by every Eye Care surface.
	divergences: '../divergences.json',
	// Nav-track chrome outside the header and footer on both sides: the draft's floating WhatsApp
	// bubble and the "100% genuine" trust bar above the header (copied from shop.mjs/product.mjs:
	// the draft has no class names, so each is found by its own text). Live's header, footer,
	// mobile menu and WhatsApp bubble are excluded by default, but the trust bar sits OUTSIDE
	// <header> (verified against the live markup, 2026-09-28), so the default landmark exclusion
	// misses it: without this the first run read it as text-extra on every state (512 open rows
	// included it on both opening and auto-scrolled, all three widths). Excluded explicitly here,
	// matching shop.mjs's own `auto.exclude.live` (its brief only said to copy `.draft`; `.live`'s
	// `.sgs-trust-bar` entry is needed too, proven by the actual open row, not assumed).
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
			live: [ '.sgs-trust-bar' ],
		},
	},
	draft: {
		url: DRAFT,
		// The draft is a single-page app: its "About Eye Care" nav link is navigation, not an interaction.
		open: ( h ) => h.clickText( '^about eye care$', { wait: 900 } ),
	},
	live: { url: LIVE },
	states: [
		// No slider, tabs, accordion or video on this page (both sides): confirmed against the live
		// tree (sites/eye-care-ward-end/build/about.tree.json) and the rendered draft (Playwright,
		// 2026-09-28) — a static two-column bio with an entrance fade/rise on load, no click states.
		{ name: 'opening', fullPage: true },
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^about eye care$', tag: 'p', within: 'main' }, live: { text: '^about eye care$', tag: 'p', within: '#sgs-page-about' }, box: [ 'h' ] },
		{ name: 'name', anchor: 'eyebrow', draft: { text: '^fatima nawaz$', tag: 'h1', within: 'main' }, live: { text: '^fatima nawaz$', tag: 'h1', within: '#sgs-page-about' }, box: [ 'h' ] },
		{ name: 'credentials-line', anchor: 'name', draft: { text: '^BSc \\(Hons\\) Optometry', tag: 'p', within: 'main' }, live: { text: '^BSc \\(Hons\\) Optometry', tag: 'p', within: '#sgs-page-about' }, box: [ 'h' ] },
		{ name: 'intro-text', anchor: 'credentials-line', draft: { text: '^Eye Care Birmingham is an independent clinic', tag: 'p', within: 'main' }, live: { text: '^Eye Care Birmingham is an independent clinic', tag: 'p', within: '#sgs-page-about' }, box: [ 'h' ] },
		{ name: 'day-to-day-text', anchor: 'intro-text', draft: { text: '^Day to day I test eyes', tag: 'p', within: 'main' }, live: { text: '^Day to day I test eyes', tag: 'p', within: '#sgs-page-about' }, box: [ 'h' ] },
		{ name: 'checked-text', anchor: 'day-to-day-text', draft: { text: '^Every prescription order is checked by me', tag: 'p', within: 'main' }, live: { text: '^Every prescription order is checked by me', tag: 'p', within: '#sgs-page-about' }, box: [ 'h' ] },
		{ name: 'whatsapp-cta', hover: true, draft: { text: '^message me$', tag: 'a', within: 'main' }, live: { text: '^message me$', tag: 'a', within: '#sgs-page-about' },
			props: [ 'background-color', 'color', 'padding-top', 'padding-left' ] },
		{ name: 'shop-button', hover: true, draft: { text: '^shop the range$', tag: 'button', within: 'main' }, live: { text: '^shop the range$', tag: 'a', within: '#sgs-page-about' },
			props: [ 'background-color', 'color', 'border-top-width', 'border-top-color', 'padding-top', 'padding-left' ] },
		// The credential stack: one representative card (BSc (Hons)) with its parts, so the framework
		// carries the right background, padding and hairline gap between cards.
		{ name: 'credential-stack', anchor: 'name', text: false, box: [ 'w' ],
			draft: { js: `(r) => { const c = (${ draftCardOf( 'BSc (Hons)' ) })(r); return c && c.parentElement; }` },
			live: { js: `(r) => { const c = (${ liveCardOf( 'BSc (Hons)' ) })(r); return c && c.parentElement; }` } },
		{ name: 'card-bsc', text: false, box: [ 'w' ], props: [ 'background-color', 'padding-top', 'padding-left' ],
			draft: { js: draftCardOf( 'BSc (Hons)' ) }, live: { js: liveCardOf( 'BSc (Hons)' ) } },
		{ name: 'card-bsc-heading', box: [ 'h' ], draft: { text: '^BSc \\(Hons\\)$', tag: 'div', within: 'main' }, live: { text: '^BSc \\(Hons\\)$', tag: 'h3', within: '#sgs-page-about' } },
		{ name: 'card-bsc-text', draft: { text: '^An honours degree in optometry', tag: 'p', within: 'main' }, live: { text: '^An honours degree in optometry', tag: 'p', within: '#sgs-page-about' } },
		// The other three cards: heading only (their body text is left to the automatic per-word
		// check, which also catches the whole stack's reading order and any missing/extra card).
		{ name: 'card-mcoptom-heading', box: [ 'h' ], draft: { text: '^MCOptom$', tag: 'div', within: 'main' }, live: { text: '^MCOptom$', tag: 'h3', within: '#sgs-page-about' } },
		// DipTp(IP) is the one visually distinct card (a 3px accent left border): heading plus the
		// whole card, so the border itself is measured, not just its text.
		{ name: 'card-diptp-heading', box: [ 'h' ], draft: { text: '^DipTp\\(IP\\)$', tag: 'div', within: 'main' }, live: { text: '^DipTp\\(IP\\)$', tag: 'h3', within: '#sgs-page-about' } },
		{ name: 'card-diptp', text: false, box: [ 'w' ], props: [ 'background-color', 'border-left-width', 'border-left-style', 'border-left-color', 'padding-top', 'padding-left' ],
			draft: { js: draftCardOf( 'DipTp(IP)' ) }, live: { js: liveCardOf( 'DipTp(IP)' ) } },
		{ name: 'card-paediatric-heading', box: [ 'h' ], draft: { text: '^Paediatric Eye Care$', tag: 'div', within: 'main' }, live: { text: '^Paediatric Eye Care$', tag: 'h3', within: '#sgs-page-about' } },
	],
	// Links (GAP-CHECKLIST 14): the two buttons in the bio column (checked against the live page's hrefs, 2026-10-02).
	links: { 'Message me': 'https://wa.me/4479605978?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.', 'Shop the range': '/shop/' },
	// Screenshot review, region by region; header, footer and chat bubble are the nav track.
	// Written from the 2026-09-28 --no-review run (report.md, pair-*.png). auto-scrolled reads
	// identically to opening at every width: the page is too short for the scroll (a screen and a
	// half) to reveal anything neither side already shows above the fold — both sides just shift up.
	review: {
		'opening@1440': 'Eyebrow, "Fatima Nawaz" h1, credentials line, three body paragraphs, Message me (WhatsApp green) and Shop the range (outline) buttons on the left; four credential cards on the right (BSc (Hons), MCOptom, DipTp(IP) with its left accent border, Paediatric Eye Care), same copy and order on both. Draft: h1 is the site\'s serif display face at 48px/1.02 with a staggered fade-up on every block (eyebrow 0.5s to checked-text 0.9s) and the four-card column sits inside a 1px hairline border with 1px hairline rules between cards (both painted from the same border-colour token). Live: h1 renders far larger (63px, no matching line-height), nothing fades in (arrives static), and the card column has no border or hairline rules at all — cards float with plain white gaps. Buttons: Message me is a darker off-black on live where the draft uses a dark-green tone that reads better on the WhatsApp green, and Shop the range is 8px wider (28px side padding against the draft\'s 24px) and lifts on hover where the draft\'s does not.',
		'opening@768': 'Same single-column stack as 1440 reflowed: eyebrow, h1, credentials line, three paragraphs, buttons, then the four-card column below. Heading size already matches at this width (no font-size row in the report); the missing hairline border/rules on the credential column and the missing entrance fade carry through unchanged from 1440. Buttons match content and position; MCOptom card overlaps the "Ask me anything" WhatsApp bubble in the draft shot only because the bubble floats over the content there (nav track, excluded from comparison).',
		'opening@375': 'Same stacked order at full width: eyebrow, h1 (34px, matching in size here but with a much taller line-height on live: 41.9px against the draft\'s 34.7px, so the heading block is visibly taller), credentials line wrapping over two lines on both, three paragraphs, stacked-width buttons, four full-width cards with DipTp(IP)\'s accent border. No hairline border/rules on live\'s card column; nothing crosses the 375 edge on either side.',
		'auto-scrolled@1440': 'Scrolled a screen and a half: DipTp(IP) and Paediatric Eye Care cards plus the tail of the body paragraphs, then straight into the footer on both — the page has no content between the bio block and the footer, so scrolling reveals nothing new on either side. Same border/hairline gap on the credential column as opening.',
		'auto-scrolled@768': 'Scrolled: DipTp(IP) and Paediatric Eye Care cards and the footer start, same as 1440 reflowed to one column. No floating element other than the nav-track WhatsApp bubble (draft) / nothing (live, excluded either way). Nothing new revealed by the scroll on either side.',
		'auto-scrolled@375': 'Scrolled: the DipTp(IP) card tail and Paediatric Eye Care card, then the footer, matching 768\'s content at full width. No hairline border on live\'s card column, consistent with every other state; nothing clipped at the edge.',
	},
	accept: [
		// The automatic check (GAP-CHECKLIST section 12): the difference Bean has already decided, row by row.
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90; the lightest fail 4.5:1 contrast)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		// Same standing decision, on the named pair rather than the (auto) pseudo-pair (credentials-line
		// carries an explicit style:color check, not just the automatic per-word one).
		{ pair: 'credentials-line', kind: 'style', key: 'color', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90; the lightest fail 4.5:1 contrast)', when: ( d ) => 'rgb(94, 88, 79)' === d.live && [ 'rgb(107, 101, 94)', 'rgb(119, 113, 106)', 'rgb(139, 132, 120)', 'rgb(163, 156, 144)' ].includes( d.draft ) },
		// WordPress's own typographic-quote rendering (wptexturize converts a straight ' to a curly
		// ’ on save): the same precedent already accepted on lens.mjs ("live's typographic apostrophe").
		// Verified against the raw HTML (curl) and the draft's own source text (Playwright) — both
		// paragraphs are otherwise word-for-word identical.
		...[ 'intro-text', 'day-to-day-text', 'checked-text' ].map( ( pair ) => ( {
			pair, kind: 'text', reason: 'WordPress renders a straight apostrophe as a typographic one on save (wptexturize), as lens.mjs already accepts; no other difference in the paragraph', when: ( d ) => words( d.draft ) === words( d.live.replace( /[’]/g, "'" ) ),
		} ) ),
	],
};

export default config;
