// Parity config: lamalama.com's floating pill against its copy on sandybrown (page 4446, header 4435).
// Header mode (scripts/parity/GAP-CHECKLIST.md section 11). Measure only while 4435 is the ACTIVE header, inside
// one trapped command that restores 3777 and qa-item-markup-fixture.php two-bar (nav-qa/README.md §13).
// Run: node scripts/parity/draft-live-walk.mjs plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-lamalama.mjs
// The corner "GET IN TOUCH" card is accepted as absent (DEC-18) and has no pair.
// The hand-read diff this must reach: reports/visual-diff/u18-hand-read-diff-2026-09-27.md.
const REF = 'https://lamalama.com/';
const LIVE = 'https://sandybrown-nightingale-600381.hostingersite.com/qa-copy-lamalama/?cb={cb}';
const RPILL = 'header.ll-header > div.fixed';
const LBAR = 'header.sgs-site-header';
const LDRAWER = `() => document.querySelector('dialog.sgs-nav-drawer[open]')`;
const inSel = ( rootJs, re, tags = '*' ) => ( { js: `() => { const r = (${ rootJs })(); return r && [...r.querySelectorAll('${ tags }')].filter((e) => e.getClientRects().length && /${ re }/i.test(e.innerText.trim())).sort((a, b) => a.innerText.length - b.innerText.length)[0]; }` } );
const rpill = `() => document.querySelector('${ RPILL }')`;
// The message in the pill's top row (the reference rotates it; the copy's is a notice banner): only a text in
// the first 50px of the pill counts, so a message that is absent reads as absent.
const message = ( root ) => ( { js: `() => { const r = document.querySelector('${ root }'); if (!r) return null; const top = r.getBoundingClientRect().top; return [...r.querySelectorAll('*')].find((e) => e.children.length === 0 && e.innerText && e.innerText.trim() && getComputedStyle(e).opacity !== '0' && e.getClientRects().length && e.getBoundingClientRect().top - top < 40 && e.getBoundingClientRect().width > 20) || null; }` } );

// lamalama plays an intro before its pill is interactive; every state starts from a fresh page.
const fresh = {
	draft: async ( h ) => {
		await h.goto( REF );
		await h.wait( 5000 );
	},
	live: ( h ) => h.goto( LIVE ),
};
// The reference's pill message rotates on a timer (GAP-CHECKLIST.md section 11, exceptions): its words are
// dropped from inventories; the message is compared by presence, type and place.
const ROTATING = "nice entrance|you made it|let.s do damage|looking sharp today|good to see you|welcome back";
const burger = { draft: 'button.js-menu-toggle-button', live: '.sgs-nav-bar-menu__burger' };
const state = ( name, act ) => ( { name, ...Object.fromEntries( [ 'draft', 'live' ].map( ( side ) => [ side, async ( h ) => {
	await fresh[ side ]( h );
	await act[ side ]( h );
} ] ) ) } );

export default {
	name: 'lamalama',
	mode: 'header',
	widths: [ 1920, 1440, 768, 375 ],
	draft: { url: REF, open: ( h ) => h.wait( 5000 ) },
	live: { url: LIVE },
	states: [
		{ name: 'closed' },
		// A real click on the pill's middle text: the reference's full-pill overlay opens the menu.
		state( 'tap-message', { draft: ( h ) => h.tap( message( RPILL ), { optional: true, name: 'pill text' } ), live: ( h ) => h.tap( message( LBAR ), { optional: true, name: 'pill text' } ) } ),
		state( 'open', { draft: ( h ) => h.tap( burger.draft, { name: 'burger' } ), live: ( h ) => h.tap( burger.live, { name: 'burger' } ) } ),
	],
	pairs: [
		{ name: 'pill', states: [ 'closed' ], draft: RPILL, live: LBAR, text: false, inventory: true, inventoryIgnore: ROTATING, props: [ 'border-radius', 'backdrop-filter' ] },
		{ name: 'logo', states: [ 'closed' ], draft: `${ RPILL } a[aria-label]`, live: `${ LBAR } .sgs-responsive-logo__link`, text: false, anchor: 'pill' },
		{ name: 'burger', states: [ 'closed' ], draft: burger.draft, live: burger.live, text: false, anchor: 'pill', hover: true },
		{ name: 'message', states: [ 'closed' ], draft: message( RPILL ), live: message( LBAR ), text: false, anchor: 'pill' },
		{ name: 'tap-result', states: [ 'tap-message' ], draft: RPILL, live: { js: `() => document.querySelector('dialog.sgs-nav-drawer[open]') || document.querySelector('${ LBAR }')` }, text: false, structure: false, props: [] },
		{ name: 'drawer', states: [ 'open' ], draft: RPILL, live: { js: LDRAWER }, text: false, inventory: true, inventoryIgnore: ROTATING, props: [ 'border-radius' ] },
		{ name: 'blur', states: [ 'open' ], draft: 'div.js-menu-blur', live: { js: `() => [...document.querySelectorAll('[class*="-scrim"]')].find((s) => parseFloat(getComputedStyle(s).opacity) > 0)` }, text: false, structure: false, timeline: true, props: [ 'opacity', 'backdrop-filter' ] },
		{ name: 'showreel', states: [ 'open' ], draft: inSel( `() => document.querySelector('header.ll-header')`, '^this is us$', 'button' ), live: inSel( `() => document.body`, '^this is us$', 'button,a' ), text: false },
		{ name: 'item-work', states: [ 'open' ], draft: inSel( rpill, '^work$', 'a' ), live: inSel( LDRAWER, '^work$', 'a' ), hover: true, anchor: 'drawer' },
		{ name: 'item-careers', states: [ 'open' ], draft: inSel( rpill, '^careers$', 'a' ), live: inSel( LDRAWER, '^careers$', 'a' ), hover: true },
		{ name: 'cta-pitchdeck', states: [ 'open' ], draft: `${ RPILL } button.ll-part--buttons-button`, live: { js: `() => { const d = (${ LDRAWER })(); return d && d.querySelector('.sgs-button--outline'); }` }, text: false, hover: true, anchor: 'drawer' },
		{ name: 'cta-call', states: [ 'open' ], draft: `${ RPILL } a.ll-add-button`, live: { js: `() => { const d = (${ LDRAWER })(); return d && d.querySelector('.sgs-button--primary'); }` }, text: false, hover: true },
	],
	review: {},
	accept: [
		{ pair: 'message', key: 'text-inset-x', reason: 'The reference message rotates on a timer, so its centred text moves as its length changes' },
	],
};
