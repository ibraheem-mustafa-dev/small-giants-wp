// Parity config: the site footer (the draft's <footer>, which the hosted draft renders without its sgs-footer class, vs eye-care-test's sgs/site-footer).
// Four columns (brand + social boxes, Shop, Help, Visit or call) over a bottom bar (copyright, Privacy, Terms).
// The footer is the same on every page, so the Home page carries it. The walker excludes footer landmarks from
// its automatic word check by default; auto.root points it at the footer element on both sides.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/footer.mjs
const DRAFT = 'https://mintcream-lyrebird-224487.hostingersite.com/';
// The footer element on either side (the draft's has no class; live's is the sgs/site-footer block), so one
// selector serves both sides and the --self baselines.
const FOOTER = 'footer:not([class]), footer.sgs-site-footer';
const LIVE = 'https://darkcyan-grouse-898606.hostingersite.com/?cb={cb}';

// Finders. The draft has no class names inside its footer, so each part is found by position in it;
// live's footer is the sgs/site-footer block: a columns row (four containers) and a bottom row.
const DF = "document.querySelector('footer')";
const LF = "document.querySelector('footer.sgs-site-footer')";
const dcol = ( i ) => `(r) => { const f = ${ DF }; return f && f.children[0].children[${ i }]; }`;
const lcol = ( i ) => `(r) => { const f = ${ LF }; const c = f && f.querySelector('.sgs-site-footer-row--columns > .sgs-container__inner').children[${ i }]; return c && c.querySelector(':scope > .sgs-container__inner'); }`;
// A part of a column: draft path off the column div (d), live path off the column's inner container (c).
const dpart = ( i, path ) => `(r) => { const d = (${ dcol( i ) })(r); try { return d && ${ path }; } catch ( e ) { return null; } }`;
const lpart = ( i, path ) => `(r) => { const c = (${ lcol( i ) })(r); try { return c && ${ path }; } catch ( e ) { return null; } }`;
// A link in the footer by its words, either side.
const dlink = ( re ) => `(r) => { const f = ${ DF }; return f && [...f.querySelectorAll('a')].find((a) => /${ re }/i.test(a.textContent.trim())); }`;
const llink = ( re ) => `(r) => { const f = ${ LF }; return f && [...f.querySelectorAll('a')].find((a) => /${ re }/i.test(a.textContent.trim())); }`;
const dsocial = ( label ) => `(r) => { const f = ${ DF }; return f && f.querySelector('a[aria-label="${ label }"]'); }`;
const lsocial = ( label ) => `(r) => { const f = ${ LF }; return f && f.querySelector('.sgs-social-icons__item[aria-label="${ label }"]'); }`;
const dicon = ( label ) => `(r) => { const a = (${ dsocial( label ) })(r); return a && a.querySelector('img,svg'); }`;
const licon = ( label ) => `(r) => { const a = (${ lsocial( label ) })(r); return a && a.querySelector('svg'); }`;
const dbar = `(r) => { const f = ${ DF }; return f && f.children[1]; }`;
const lbar = `(r) => { const f = ${ LF }; return f && f.querySelector('.sgs-site-footer-row--bottom'); }`;

const SOCIAL_PROPS = [ 'background-color', 'border-top-width', 'border-top-color', 'border-radius' ];

export default {
	name: 'footer',
	widths: [ 375, 768, 1440, 1920 ],
	// Ref tracing (Spec 47 FR-47-6 item 7): every row names the footer tree node (cr-ref-footer-<n>) it was measured on.
	refPrefix: 'cr-ref-',
	// Intended differences (Spec 47 FR-47-5), shared by every Eye Care surface.
	divergences: '../divergences.json',
	// The page above the footer is Home's (a moving brand strip): a scrolled state would compare it, not the footer.
	autoScroll: false,
	// The footer only: the link check reads the footer's links, and the load-entrance sampler (first screen) has nothing to read.
	linkRoot: { draft: FOOTER, live: FOOTER },
	entrances: false,
	auto: {
		root: { draft: FOOTER, live: FOOTER },
	},
	draft: { url: DRAFT },
	live: { url: LIVE },
	states: [
		{ name: 'opening', fullPage: true },
	],
	pairs: [
		// The footer itself: box, ground, hairline above it, and an inventory of every painted text and glyph.
		{ name: 'footer-root', draft: 'footer', live: 'footer.sgs-site-footer', inventory: true, structure: false, box: [ 'h' ],
			props: [ 'background-color', 'border-top-width', 'border-top-color', 'border-top-style' ] },

		// Brand block: wordmark, tagline words, description.
		{ name: 'brand-wordmark', draft: { js: dpart( 0, 'd.children[0]' ) }, live: { js: lpart( 0, 'c.querySelector("h4")' ) }, box: [ 'h' ] },
		{ name: 'brand-tagline', draft: { js: dpart( 0, 'd.children[1]' ) }, live: { js: lpart( 0, 'c.children[1]' ) }, box: [ 'h' ] },
		{ name: 'brand-description', draft: { js: dpart( 0, 'd.querySelector("p")' ) }, live: { js: lpart( 0, 'c.children[2]' ) } },

		// Social boxes: each box (look, hover, place) and its icon as its own pair. The draft lists
		// Instagram, Google, WhatsApp; live lists Instagram, WhatsApp, Google (the structure check shows the order).
		{ name: 'social-row', draft: { js: dpart( 0, 'd.children[3]' ) }, live: { js: lpart( 0, 'c.querySelector(".sgs-social-icons")' ) }, text: false, box: [ 'h' ] },
		{ name: 'social-instagram', draft: { js: dsocial( 'Instagram' ) }, live: { js: lsocial( 'Follow us on Instagram' ) }, hover: true, text: false, box: [ 'w', 'h' ], props: SOCIAL_PROPS },
		{ name: 'social-instagram-icon', draft: { js: dicon( 'Instagram' ) }, live: { js: licon( 'Follow us on Instagram' ) }, text: false, box: [ 'w', 'h' ] },
		{ name: 'social-google', draft: { js: dsocial( 'Google Business profile' ) }, live: { js: lsocial( 'Read our reviews on Google' ) }, hover: true, text: false, box: [ 'w', 'h' ], props: SOCIAL_PROPS },
		{ name: 'social-google-icon', draft: { js: dicon( 'Google Business profile' ) }, live: { js: licon( 'Read our reviews on Google' ) }, text: false, box: [ 'w', 'h' ] },
		{ name: 'social-whatsapp', draft: { js: dsocial( 'WhatsApp' ) }, live: { js: lsocial( 'Message us on WhatsApp' ) }, hover: true, text: false, box: [ 'w', 'h' ], props: SOCIAL_PROPS },
		{ name: 'social-whatsapp-icon', draft: { js: dicon( 'WhatsApp' ) }, live: { js: licon( 'Message us on WhatsApp' ) }, text: false, box: [ 'w', 'h' ] },

		// Column headings (a span on the draft, an h5 on live).
		{ name: 'col-shop-heading', draft: { js: dpart( 1, 'd.children[0]' ) }, live: { js: lpart( 1, 'c.querySelector("h5")' ) }, box: [ 'h' ] },
		{ name: 'col-help-heading', draft: { js: dpart( 2, 'd.children[0]' ) }, live: { js: lpart( 2, 'c.querySelector("h5")' ) }, box: [ 'h' ] },
		{ name: 'col-visit-heading', draft: { js: dpart( 3, 'd.children[0]' ) }, live: { js: lpart( 3, 'c.querySelector("h5")' ) }, box: [ 'h' ] },

		// Shop links. "Glasses - arriving soon" is plain text on both sides (a span against a list item).
		{ name: 'link-sunglasses', draft: { js: dlink( '^sunglasses$' ) }, live: { js: llink( '^sunglasses$' ) }, hover: true },
		{ name: 'link-all-brands', draft: { js: dlink( '^all brands$' ) }, live: { js: llink( '^all brands$' ) }, hover: true },
		{ name: 'link-prescription-lenses', draft: { js: dlink( '^prescription lenses$' ) }, live: { js: llink( '^prescription lenses$' ) }, hover: true },
		{ name: 'text-glasses-soon', draft: { js: dpart( 1, 'd.children[4]' ) }, live: { js: lpart( 1, 'c.querySelector("ul").lastElementChild' ) } },

		// Help links.
		{ name: 'link-delivery', draft: { js: dlink( '^delivery' ) }, live: { js: llink( '^delivery' ) }, hover: true },
		{ name: 'link-faqs', draft: { js: dlink( '^faqs$' ) }, live: { js: llink( '^faqs$' ) }, hover: true },
		{ name: 'link-size-guide', draft: { js: dlink( '^size guide$' ) }, live: { js: llink( '^size guide$' ) }, hover: true },
		{ name: 'link-contact', draft: { js: dlink( '^contact$' ) }, live: { js: llink( '^contact$' ) }, hover: true },

		// Visit or call: About link, phone, address, hours.
		{ name: 'link-about', draft: { js: dlink( '^about eye care$' ) }, live: { js: llink( '^about eye care$' ) }, hover: true },
		{ name: 'link-phone', draft: { js: `(r) => { const f = ${ DF }; return f && [...f.querySelectorAll('a')].find((a) => /^tel:/.test(a.getAttribute('href') || '') || /^0121/.test(a.textContent.trim())); }` }, live: { js: `(r) => { const f = ${ LF }; return f && f.querySelector('a[href^="tel:"]'); }` }, hover: true },
		{ name: 'address', draft: { js: dlink( '^644 washwood' ) }, live: { js: `(r) => { const f = ${ LF }; return f && f.querySelector('address'); }` }, hover: true },
		{ name: 'hours', draft: { js: dpart( 3, 'd.children[4]' ) }, live: { js: lpart( 3, 'c.querySelector(".sgs-business-hours")' ) } },

		// Bottom bar: the bar with its hairline, the copyright line, and the Privacy and Terms links.
		{ name: 'bottom-bar', draft: { js: dbar }, live: { js: lbar }, box: [ 'h' ], props: [ 'border-top-width', 'border-top-color', 'border-top-style', 'background-color' ] },
		{ name: 'bottom-copyright', draft: { js: `(r) => { const b = (${ dbar })(r); return b && b.children[0]; }` }, live: { js: `(r) => { const f = ${ LF }; return f && f.querySelector('.sgs-business-copyright'); }` } },
		{ name: 'link-privacy', draft: { js: dlink( '^privacy$' ) }, live: { js: llink( '^privacy$' ) }, hover: true },
		{ name: 'link-terms', draft: { js: dlink( '^terms$' ) }, live: { js: llink( '^terms$' ) }, hover: true },
	],
	accept: [],
	review: {
		'opening@1440': 'Footer, full width: brand column (wordmark, BIRMINGHAM tagline, description, three social boxes), Shop, Help and Visit or call columns with headings and links, address and hours line, then the bottom bar hairline, copyright line and Privacy and Terms links. Compared region by region against the draft.',
		'opening@768': 'Footer at tablet width: column wrap, brand block with social boxes, headings and links, address and hours, bottom bar with copyright and Privacy and Terms, compared against the draft region by region.',
		'opening@375': 'Footer at phone width: single column stack, brand block and social boxes, column headings and links, address and hours line, bottom bar hairline, copyright and Privacy and Terms links compared against the draft.',
	},
};
