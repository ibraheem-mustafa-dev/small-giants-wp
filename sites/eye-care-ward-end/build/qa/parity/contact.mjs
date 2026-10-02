// Parity config: the Contact page (info column + form on the left, map and social links on the
// right). A static page with one interactive surface, the form: no tabs, accordion, slider or
// video either side (confirmed against the live tree, sites/eye-care-ward-end/build/contact.tree.json
// and contact-form.tree.json, and the rendered draft, Playwright 2026-09-28). Hours render as a
// single condensed row (no opening-hours toggle on either side), so the states below are the
// three the brief asks for: opening, a field focused, and the form submitted empty.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/contact.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/contact/?cb={cb}';

// The draft's five form fields, matched by their placeholder (no visible <label> either side —
// both block attributes leave `label` empty, so only the placeholder and the focus ring paint).
const DNAME = 'input[placeholder="Your name"]';
const DEMAIL = 'input[placeholder="Email"]';
const DPHONE = 'input[placeholder="Phone (optional)"]';
const DTOPIC = 'main form select, main select';
const DMESSAGE = 'textarea[placeholder="Your message"]';
const LNAME = '#sgs-field-your_name';
const LEMAIL = '#sgs-field-email';
const LPHONE = '#sgs-field-phone';
const LTOPIC = '#sgs-field-topic';
const LMESSAGE = '#sgs-field-message';


const config = {
	name: 'contact',
	// Nav-track chrome outside the header and footer on both sides: the draft's floating WhatsApp
	// bubble and the "100% genuine" trust bar above the header (copied from about.mjs/lenses.mjs:
	// the draft has no class names, so each is found by its own text). Live's header, footer,
	// mobile menu, mega panels and WhatsApp bubble are excluded by default.
	auto: {
		exclude: {
			draft: [
				'a[aria-label^="Message Fatima"]',
				{ js: '(r) => { let e = [...document.querySelectorAll("span")].find((s) => /^100% genuine/i.test(s.textContent.trim())); while (e && e.parentElement && e.getBoundingClientRect().width < innerWidth - 2) e = e.parentElement; return e; }' },
			],
			// The live trust bar sits outside <header> (a sibling landmark), so it is not covered by
			// the walker's default header/footer/nav-track exclusions (shop.mjs's pattern).
			live: [ '.sgs-trust-bar' ],
		},
	},
	draft: {
		url: DRAFT,
		// The draft is a single-page app with no "Contact" link in its header nav at any width
		// (checked 1440/768/375, Playwright 2026-09-28): the footer's "Contact" link is the one
		// control visible at every width, so it opens the view on all three.
		open: ( h ) => h.clickText( '^contact$', { tag: 'a,button', wait: 900 } ),
	},
	live: { url: LIVE },
	states: [
		{ name: 'opening', fullPage: true },
		// A field focused: the focus ring (outline colour/width/offset) is the only thing that
		// moves — neither side renders a floating label (both leave the form field's `label`
		// attribute empty, placeholder-only).
		// FIX 2026-09-28: h.click() calls el.click(), which does NOT move focus onto a text input
		// (proven: document.activeElement stayed <body> immediately after a scripted .click() on
		// this exact input, Playwright, both draft and live) — the first run's 'field-focused' rows
		// were reading the UNFOCUSED look on both sides (outline-width 0px both, a false match, not
		// a real one). h.tap() drives a real mouse click, which does focus it.
		{
			name: 'field-focused',
			draft: ( h ) => h.tap( DNAME, { wait: 400 } ),
			live: ( h ) => h.tap( LNAME, { wait: 400 } ),
		},
		// The form submitted with every field empty — never a filled form, so nothing sends.
		// Both sides run the browser's native constraint validation (live calls formEl.reportValidity()
		// after its own per-field check, view.js::submitForm), so both show a native tooltip on the
		// first invalid field; live additionally writes visible text into every invalid field's own
		// .sgs-form-field__error span and sets aria-invalid (which turns its border red) on all four
		// required fields at once, where the draft's native validation stops at the first.
		{
			name: 'form-submitted-empty',
			draft: ( h ) => h.clickText( '^send message$', { tag: 'button', wait: 400 } ),
			live: ( h ) => h.clickText( '^send message$', { tag: 'button', wait: 400 } ),
		},
	],
	pairs: [
		{ name: 'eyebrow', draft: { text: '^contact$', tag: 'p', within: 'main' }, live: { text: '^contact$', tag: 'p', within: '#sgs-page-contact' }, box: [ 'h' ] },
		{ name: 'heading', anchor: 'eyebrow', draft: { text: 'be talking to me, not a help desk', tag: 'h1', within: 'main' }, live: { text: 'be talking to me, not a help desk', tag: 'h1', within: '#sgs-page-contact' }, box: [ 'h' ] },
		{ name: 'intro-text', anchor: 'heading', draft: { text: '^Frame advice, prescription questions', tag: 'p', within: 'main' }, live: { text: '^Frame advice, prescription questions', tag: 'p', within: '#sgs-page-contact' },
			props: [ 'font-family', 'font-size', 'line-height', 'color' ] },
		{ name: 'whatsapp-cta', anchor: 'intro-text', hover: true, draft: { text: '^whatsapp 07960 5978$', tag: 'a', within: 'main' }, live: { text: '^whatsapp 07960 5978$', tag: 'a', within: '#sgs-page-contact' },
			props: [ 'background-color', 'color', 'padding-top', 'padding-left' ] },
		// The Phone/Email/Clinic/Hours 2x2 grid: whole grid for layout, each label and its value.
		// FIX 2026-09-28: the live finder was only 2 levels up from the "Phone" label, which lands
		// on the label's OWN stack item (label -> .sgs-container__inner -> the item), not the grid
		// two levels further out (-> the grid's .sgs-container__inner -> the grid). The draft needs
		// only 2 levels (its DOM has no .sgs-container__inner wrapper), so only live changed.
		{ name: 'detail-grid', anchor: 'whatsapp-cta', text: false, box: [ 'w' ],
			draft: { js: `(r) => { const p = [...r.querySelectorAll('div')].find((d) => ! d.children.length && d.textContent.trim() === 'Phone'); return p && p.parentElement.parentElement; }` },
			live: { js: `(r) => { const p = [...r.querySelectorAll('p')].find((x) => x.textContent.trim() === 'Phone'); return p && p.parentElement.parentElement.parentElement.parentElement; }` },
			props: [ 'grid-template-columns', 'column-gap', 'row-gap' ] },
		{ name: 'detail-phone-label', box: [ 'h' ], draft: { text: '^phone$', tag: 'div', within: 'main' }, live: { text: '^phone$', tag: 'p', within: '#sgs-page-contact' },
			props: [ 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		{ name: 'detail-phone-value', anchor: 'detail-phone-label', hover: true, draft: { text: '^0121 729 8233$', tag: 'a', within: 'main' }, live: { text: '^0121 729 8233$', tag: 'a', within: '#sgs-page-contact' },
			props: [ 'font-size', 'color' ] },
		{ name: 'detail-email-label', box: [ 'h' ], draft: { text: '^email$', tag: 'div', within: 'main' }, live: { text: '^email$', tag: 'p', within: '#sgs-page-contact' },
			props: [ 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		// FIX 2026-09-28: the draft's email/clinic/hours values are trailing TEXT NODES beside the
		// label div, not wrapped in their own element (unlike phone, which the draft wraps in <a>),
		// so an exact-text finder for just the value never matches anything (always "missing") —
		// the value pair now targets the whole item (label + value) on both sides instead: draft's
		// label.parentElement, live's label -> .sgs-container__inner -> the stack item (2 levels).
		{ name: 'detail-email-value', anchor: 'detail-email-label', text: false,
			draft: { js: `(r) => { const l = [...r.querySelectorAll('div')].find((d) => ! d.children.length && d.textContent.trim() === 'Email'); return l && l.parentElement; }` },
			live: { js: `(r) => { const l = [...r.querySelectorAll('p')].find((x) => x.textContent.trim() === 'Email'); return l && l.parentElement.parentElement; }` },
			props: [ 'font-size', 'color' ] },
		{ name: 'detail-clinic-label', box: [ 'h' ], draft: { text: '^clinic$', tag: 'div', within: 'main' }, live: { text: '^clinic$', tag: 'p', within: '#sgs-page-contact' },
			props: [ 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		{ name: 'detail-clinic-value', anchor: 'detail-clinic-label', text: false,
			draft: { js: `(r) => { const l = [...r.querySelectorAll('div')].find((d) => ! d.children.length && d.textContent.trim() === 'Clinic'); return l && l.parentElement; }` },
			live: { js: `(r) => { const l = [...r.querySelectorAll('p')].find((x) => x.textContent.trim() === 'Clinic'); return l && l.parentElement.parentElement; }` },
			props: [ 'font-size', 'color' ] },
		{ name: 'detail-hours-label', box: [ 'h' ], draft: { text: '^hours$', tag: 'div', within: 'main' }, live: { text: '^hours$', tag: 'p', within: '#sgs-page-contact' },
			props: [ 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		// The whole Hours item, including "Collections by arrangement" (a second draft text node in
		// the same box, and live's separate sgs/text sibling below the <dl>): one pair, text:false,
		// since draft flows label + hours + collections as one blob while live keeps them as three
		// distinct nodes — the (auto) whole-page word check still compares the words themselves.
		{ name: 'detail-hours-value', anchor: 'detail-hours-label', text: false,
			draft: { js: `(r) => { const l = [...r.querySelectorAll('div')].find((d) => ! d.children.length && d.textContent.trim() === 'Hours'); return l && l.parentElement; }` },
			live: { js: `(r) => { const l = [...r.querySelectorAll('p')].find((x) => x.textContent.trim() === 'Hours'); return l && l.parentElement.parentElement; }` },
			props: [ 'font-size', 'color' ] },
		// The form card: bordered box (heading, intro line, then the fields).
		{ name: 'form-card', anchor: 'detail-grid', text: false, box: [ 'w' ],
			draft: { js: `(r) => { const h = [...r.querySelectorAll('h2')].find((x) => /^or send me a message$/i.test(x.textContent.trim())); return h && h.parentElement; }` },
			live: { js: `(r) => { const h = [...r.querySelectorAll('h2')].find((x) => /^or send me a message$/i.test(x.textContent.trim())); let c = h && h.parentElement; while (c && ! getComputedStyle(c).borderTopWidth.startsWith('1')) c = c.parentElement; return c; }` },
			props: [ 'background-color', 'border-top-width', 'border-top-color', 'padding-top' ] },
		{ name: 'form-heading', anchor: 'form-card', draft: { text: '^or send me a message$', tag: 'h2', within: 'main' }, live: { text: '^or send me a message$', tag: 'h2', within: '#sgs-page-contact' }, box: [ 'h' ] },
		{ name: 'form-subtext', anchor: 'form-heading', draft: { text: '^I answer these myself', tag: 'p', within: 'main' }, live: { text: '^I answer these myself', tag: 'p', within: '#sgs-page-contact' },
			props: [ 'font-size', 'color' ] },
		// Each field: input box and look (no visible label either side, placeholder-only).
		{ name: 'field-name', anchor: 'form-subtext', text: false, box: [ 'h' ], draft: DNAME, live: LNAME,
			props: [ 'border-color', 'background-color', 'padding-top', 'padding-left', 'font-size' ] },
		{ name: 'field-email', text: false, box: [ 'h' ], draft: DEMAIL, live: LEMAIL,
			props: [ 'border-color', 'background-color', 'padding-top', 'padding-left', 'font-size' ] },
		{ name: 'field-phone', text: false, box: [ 'h' ], draft: DPHONE, live: LPHONE,
			props: [ 'border-color', 'background-color', 'padding-top', 'padding-left', 'font-size' ] },
		{ name: 'field-topic', text: false, box: [ 'h' ], draft: DTOPIC, live: LTOPIC,
			props: [ 'border-color', 'background-color', 'padding-top', 'padding-left', 'font-size' ] },
		{ name: 'field-message', text: false, box: [ 'h' ], draft: DMESSAGE, live: LMESSAGE,
			props: [ 'border-color', 'background-color', 'padding-top', 'padding-left', 'font-size' ] },
		// The focus ring and, once submitted empty, the invalid look (border/box-shadow) on the
		// first field. Scoped to the two states that actually change it.
		{ name: 'field-name-focus-look', states: [ 'field-focused', 'form-submitted-empty' ], text: false, box: [ 'h' ], draft: DNAME, live: LNAME,
			props: [ 'outline-color', 'outline-width', 'outline-offset', 'border-color', 'box-shadow' ] },
		// The written error line under each required field: live's own copy (view.js::submitForm
		// writes it into a role="alert" span on every invalid field); the draft has no equivalent
		// DOM text for any field beyond the first (its browser-native validation tooltip is not
		// a DOM node this walker can pair, and only ever names one field).
		{ name: 'error-name', states: [ 'form-submitted-empty' ], anchor: 'field-name',
			draft: { js: '(r) => null' }, live: '#sgs-field-your_name-error' },
		{ name: 'error-email', states: [ 'form-submitted-empty' ], anchor: 'field-email',
			draft: { js: '(r) => null' }, live: '#sgs-field-email-error' },
		{ name: 'error-topic', states: [ 'form-submitted-empty' ], anchor: 'field-topic',
			draft: { js: '(r) => null' }, live: '#sgs-field-topic-error' },
		{ name: 'error-message', states: [ 'form-submitted-empty' ], anchor: 'field-message',
			draft: { js: '(r) => null' }, live: '#sgs-field-message-error' },
		{
			name: 'submit-button', anchor: 'field-message', hover: true,
			draft: { text: '^send message$', tag: 'button', within: 'main' }, live: { text: '^send message$', tag: 'button', within: '#sgs-page-contact' },
			props: [ 'background-color', 'color', 'padding-left', 'padding-right', 'font-size', 'text-transform', 'letter-spacing' ],
		},
		// The map: the draft is an explicit sketch placeholder (its own caption says "swap for an
		// embedded Google map on the live site"); live already carries the real Google Maps iframe
		// the note asks for, so only presence and place are worth comparing, not the painted look.
		{ name: 'map', text: false, structure: false, draft: 'a[href*="maps.google.com"]', live: '.sgs-business-map', box: [ 'w' ] },
		// The two link cards under the map (Google reviews, Instagram).
		{ name: 'social-google-label', draft: { text: '^google$', tag: 'span,div,p', within: 'main' }, live: { text: '^google$', tag: 'p', within: '#sgs-page-contact' }, box: [ 'h' ],
			props: [ 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		{ name: 'social-google-link', anchor: 'social-google-label', hover: true, draft: { text: '^reviews & hours$', tag: 'a', within: 'main' }, live: { text: '^reviews & hours$', tag: 'a', within: '#sgs-page-contact' },
			props: [ 'font-size', 'color' ] },
		{ name: 'social-instagram-label', draft: { text: '^instagram$', tag: 'span,div,p', within: 'main' }, live: { text: '^instagram$', tag: 'p', within: '#sgs-page-contact' }, box: [ 'h' ],
			props: [ 'font-size', 'letter-spacing', 'text-transform', 'color' ] },
		{ name: 'social-instagram-link', anchor: 'social-instagram-label', hover: true, draft: { text: '^@eyecare\\.birmingham$', tag: 'a', within: 'main' }, live: { text: '^@eyecare\\.birmingham$', tag: 'a', within: '#sgs-page-contact' },
			props: [ 'font-size', 'color' ] },
	],
	// Links (GAP-CHECKLIST 14), checked against the live page's hrefs (2026-10-02).
	links: {
		'WhatsApp 07960 5978': 'https://wa.me/4479605978?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services.',
		'0121 729 8233': 'tel:01217298233',
		'hello@eyecarebirmingham.co.uk': 'mailto:hello@eyecarebirmingham.co.uk',
		'Reviews & hours': 'https://share.google/9YZzTiRj2gvW1Xrpr',
		'@eyecare.birmingham': 'https://www.instagram.com/eyecare.birmingham/',
	},
	// Screenshot review, region by region (header/footer/trust bar are the nav track); written
	// after the first run, 2026-09-28. The 1440 opening/auto-scrolled/field-focused/form-submitted
	// shots all show the still-open detail-grid and form-field single-column collapse (see the
	// report's biggest group) — noted once here rather than repeated for every 1440 state.
	review: {
		'opening@1440': 'Eyebrow, h1 (wraps 2 lines on live against the draft\'s fixed 48px, open), intro text, WhatsApp button, then Phone/Email/Clinic/Hours: draft 2x2, live one column top-to-bottom (open, the detail-grid collapse). Form card: heading, subtext, then five fields one-per-row on live against the draft\'s 2-up name/email and phone/topic (open, the same container-query collapse). Map: draft\'s sketch placeholder against live\'s real embedded Google map (expected, the draft\'s own caption asks for this swap). Google/Instagram cards match position and content.',
		'opening@768': 'Matches well: eyebrow/h1/intro/WhatsApp stack correctly, and the Phone/Email/Clinic/Hours grid is 2x2 on BOTH sides here (the page\'s own info+form/map+links split collapses to one column at this width, so the nested grid gets the full content width and clears its 2-column floor) — confirms the 1440 collapse is caused by the narrow half-page column, not the grid formula itself. Form fields also correctly 2-up (name/email, phone/topic). Map sketch vs real embed as at 1440.',
		'opening@375': 'Single column throughout on both sides, as designed for mobile (columns.mobile:1 on the info grid, and the form\'s own narrow-container fallback). Hours row, map, Google/Instagram cards all line up. No open issues at this width.',
		'field-focused@1440': 'Focus moved onto "Your name" via a real click (h.tap, after the h.click() bug fix below): draft outlines the field in its accent brown with a 2px ring; live\'s ring reads primary-dark/near-black rather than the intended accent brown (open — see the focus-ring variable mismatch in the report). Everything else on the page is the same static layout as opening@1440 (still showing the detail-grid/field collapse).',
		'field-focused@768': 'Same focus-ring colour gap as 1440 (accent vs near-black); the rest of the page matches (2x2 detail grid, 2-up fields, as opening@768).',
		'field-focused@375': 'Same focus-ring colour gap; layout matches (single column, as opening@375).',
		'form-submitted-empty@1440': 'Both sides show a native "Please fill in this field" tooltip on "Your name". Live additionally reddens the field\'s border/shadow and (once scrolled into view) writes visible error text under every required field; the draft\'s native validation only ever flags the first — expected per view.js::submitForm, not a live bug. The shot is not full-page, so live\'s far-lower fields (pushed down by the column collapse) sit below the fold here — worth a full-page shot once the collapse is fixed.',
		'form-submitted-empty@768': 'Same native-tooltip-plus-red-border pattern as 1440; layout otherwise matches opening@768.',
		'form-submitted-empty@375': 'Same pattern; layout otherwise matches opening@375.',
		'auto-scrolled@1440': 'Scrolled a screen and a half: same static page, so the same detail-grid/field collapse and focus-ring points as opening@1440. No fixed/sticky element appears on either side; only the nav-track WhatsApp bubble floats.',
		'auto-scrolled@768': 'Matches opening@768; no floating element besides the nav-track WhatsApp bubble.',
		'auto-scrolled@375': 'Matches opening@375; no floating element besides the nav-track WhatsApp bubble.',
	},
	accept: [
		// Measured, not painted (GAP-CHECKLIST 8), as shop.mjs's, about.mjs's and lens.mjs's first accept.
		...[ 'display', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ].map( ( key ) => ( {
			kind: 'style', key, notPainted: true, reason: 'Layout property on an element whose painted box and content match (a flex vs block wrapper with one child or centred text)',
		} ) ),
		// WordPress runs wptexturize() on post content, converting a straight apostrophe to a
		// typographic one; the draft's mockup text is unprocessed. Same standing pattern as
		// lens.mjs's "live's typographic apostrophe" accept.
		{ pair: 'heading', kind: 'text', reason: 'WordPress wptexturize() converts the straight apostrophe to a typographic one; the draft\'s text is unprocessed', when: ( d ) => d.draft.replace( /'/g, '’' ) === d.live },
		// NOT a bug (corrected 2026-09-28, Bean): the field's focus ring is deliberately two
		// layers (plugins/sgs-blocks/src/blocks/form/style.css, the docblock above
		// .sgs-form-field__input:focus-visible, D459 2026-08-01). The `outline` stays a neutral
		// primary-dark — proven >=3:1 against every client palette's field background, the WCAG
		// 2.4.11 focus-indicator floor — while `--sgs-focus-ring-colour` (accent, the block's
		// formFocusRingColour attribute) drives the visible border-colour + box-shadow glow on
		// top. The draft has no such two-layer design, so its single ring reads as accent; only
		// the outline (the neutral underlay) is compared here, never the border/glow.
		{ pair: 'field-name-focus-look', kind: 'style', key: 'outline-color', reason: 'Framework accessibility design (D459, 2026-08-01): the outline is a neutral primary-dark WCAG floor layer, not the visible ring colour — that is carried by border-colour/box-shadow instead (accent, matching the draft)' },
		// 44px touch targets (Bean 2026-09-27): any control the framework holds to a 44px minimum
		// where the draft is smaller (as about.mjs's "close", lens.mjs's "close", shop.mjs's chips).
		{ kind: 'box', key: 'h', reason: '44px touch targets (the accessibility baseline), Bean 2026-09-27', when: ( d ) => 44 === d.live && d.draft < 44 },
		// text-inverse #FAF8F5 for the draft's pure white (Bean 2026-09-27/28), as the whatsapp-cta,
		// shop-button, add-to-bag and help-toggle hover text in about.mjs and lens.mjs; direction
		// varies per control depending on which side owns the hover state, so both are matched.
		{ kind: 'style', key: 'color', reason: 'The palette\'s text-inverse #FAF8F5 against the draft\'s pure white on a dark ground (Bean 2026-09-27/28)', when: ( d ) => ( 'rgb(255,255,255)' === d.draft && 'rgb(250,248,245)' === d.live ) || ( 'rgb(250,248,245)' === d.draft && 'rgb(255,255,255)' === d.live ) },
		{ kind: 'hover', key: 'color', reason: 'The palette\'s text-inverse #FAF8F5 against the draft\'s pure white on a dark ground (Bean 2026-09-27/28)', when: ( d ) => ( 'rgb(255,255,255)' === d.draft && 'rgb(250,248,245)' === d.live ) || ( 'rgb(250,248,245)' === d.draft && 'rgb(255,255,255)' === d.live ) },
		// The automatic check (GAP-CHECKLIST section 12): the standing decision Bean has already
		// made for secondary text, confirmed again here.
		{ pair: '(auto)', reason: 'Accepted (Bean, confirmed 2026-09-28): secondary text uses the darker text-muted #5E584F where the draft uses lighter greys (#6B655E, #77716A, #8B8478, #A39C90; the lightest fail 4.5:1 contrast)', when: ( d ) => /^style:color /.test( d.key ) && 'rgb(94,88,79)' === d.live && [ 'rgb(107,101,94)', 'rgb(119,113,106)', 'rgb(139,132,120)', 'rgb(163,156,144)' ].includes( d.draft ) },
		{ pair: 'detail-phone-label', kind: 'style', key: 'color', reason: 'Accepted (Bean, confirmed 2026-09-28, as the (auto) rule above): the label is the draft\'s lighter grey against live\'s text-muted #5E584F', when: ( d ) => 'rgb(94,88,79)' === d.live && 'rgb(119,113,106)' === d.draft },
		...[ 'detail-email-label', 'detail-clinic-label', 'detail-hours-label', 'social-google-label', 'social-instagram-label' ].map( ( pair ) => ( {
			pair, kind: 'style', key: 'color', reason: 'Accepted (Bean, confirmed 2026-09-28, as the (auto) rule above): the label is the draft\'s lighter grey against live\'s text-muted #5E584F', when: ( d ) => 'rgb(94,88,79)' === d.live && 'rgb(119,113,106)' === d.draft,
		} ) ),
	],
};

export default config;
