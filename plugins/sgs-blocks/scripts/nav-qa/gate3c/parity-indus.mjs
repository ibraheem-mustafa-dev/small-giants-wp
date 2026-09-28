// Parity config: Bean's Indus Foods mega-menu draft against its copy on sandybrown (page 4465, header 4461).
// Header mode (scripts/parity/GAP-CHECKLIST.md section 11). Measure only while 4461 is the ACTIVE header, inside
// one trapped command that restores 3777 and qa-item-markup-fixture.php two-bar (nav-qa/README.md §13).
// Run: node scripts/parity/draft-live-walk.mjs plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-indus.mjs
// The draft opens a panel on pointer-enter and switches to its drawer below 960px; the copy's bar is a burger below 1024.
// The hand-read diff this must reach: reports/visual-diff/u18-hand-read-diff-2026-09-27.md.
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../../..' );
const DRAFT = pathToFileURL( path.join( ROOT, 'sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html' ) ).href;
const LIVE = 'https://sandybrown-nightingale-600381.hostingersite.com/qa-copy-indus/?cb={cb}';

// The draft has no class names: its bar is the header's first child, its open panel the first child of the
// header's absolutely placed row, its drawer the fixed layer at z-index 300 and its backdrop the one at 150.
const DPANEL = `() => { const d = document.querySelector('header > div[style*="top: 100%"]'); return d && d.firstElementChild; }`;
const fixedAt = ( z ) => `() => [...document.querySelectorAll('body div')].find((d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '${ z }')`;
const DDRAWER = fixedAt( 300 );
const LPANEL = `() => [...document.querySelectorAll('.sgs-mega-panel')].find((p) => p.getClientRects().length && p.getBoundingClientRect().height > 20)`;
const LDRAWER = `() => document.querySelector('dialog.sgs-nav-drawer[open]')`;
// The smallest visible element in a root whose text matches.
const inRoot = ( rootJs, re, tags = '*' ) => ( { js: `() => { const r = (${ rootJs })(); return r && [...r.querySelectorAll('${ tags }')].filter((e) => e.getClientRects().length && /${ re }/i.test(e.innerText.trim())).sort((a, b) => a.innerText.length - b.innerText.length)[0]; }` } );
const DBAR = 'header > div';
const LBAR = 'header.sgs-site-header';
const item = ( scope, label, tag ) => ( { text: `^${ label }$`, tag, within: scope } );
const caret = ( scope, label, tag ) => ( { js: `() => { const b = [...document.querySelectorAll('${ scope } ${ tag }')].find((x) => x.offsetParent && /^${ label }$/i.test(x.innerText.trim())); const s = b && b.querySelector('svg'); return s && s.parentElement.tagName === 'SPAN' && s.parentElement.children.length === 1 ? s.parentElement : s; }` } );

// Each panel state moves the pointer off the header, then points at its bar item (hovering again once if
// no panel opened: the draft closes on a 170ms leave timer); a no-op where the bar is a burger.
const openPanel = ( scope, label, root ) => async ( h ) => {
	for ( let tries = 0; tries < 2; tries++ ) {
		await h.page.mouse.move( 1, 700 );
		await h.wait( 400 );
		await h.hover( item( scope, label, 'button' ), { wait: 900 } );
		if ( ! ( await h.page.evaluate( ( [ l, src ] ) => !! document.querySelector( 'header' ) && new Function( `return (${ src })();` )() && l, [ label, root ] ) ) ) {
			continue;
		}
		return;
	}
};
const panel = ( name, label ) => ( { name, draft: openPanel( 'header nav', label, DPANEL ), live: openPanel( LBAR, label, LPANEL ) } );
// Each drawer state starts from a fresh page, so an earlier tap (a label that navigates) cannot leak into it.
const drawer = ( then ) => ( {
	draft: async ( h ) => {
		await h.goto( DRAFT );
		// The draft compiles its component in the browser (Babel) after the network settles.
		await h.wait( 1500 );
		await h.tap( 'button[aria-label=Menu]', { optional: true, name: 'burger' } );
		if ( then ) {
			await then.draft( h );
		}
	},
	live: async ( h ) => {
		await h.goto( LIVE );
		await h.tap( '.sgs-nav-bar-menu__burger', { optional: true, name: 'burger' } );
		if ( then ) {
			await then.live( h );
		}
	},
} );
const DACC = inRoot( DDRAWER, '^about$', 'button' );
const LACC = { js: `() => document.querySelector('dialog[open] summary[aria-label="Show submenu for About"]')` };
const LLABEL = inRoot( LDRAWER, '^about$', 'a' );

export default {
	name: 'indus',
	mode: 'header',
	draft: { url: DRAFT, open: ( h ) => h.wait( 1500 ) },
	live: { url: LIVE },
	states: [
		{ name: 'opening' },
		panel( 'panel-about', 'About' ),
		panel( 'panel-sectors', 'Sectors' ),
		panel( 'panel-brands', 'Brands' ),
		{ name: 'drawer-open', ...drawer() },
		// A tap on the "About" label itself: the draft's whole row opens the section.
		{ name: 'drawer-tap-label', ...drawer( { draft: ( h ) => h.tap( DACC, { optional: true, name: 'about label' } ), live: ( h ) => h.tap( LLABEL, { optional: true, name: 'about label' } ) } ) },
		// The section opened through each side's own control (the copy's caret).
		{ name: 'drawer-about', ...drawer( { draft: ( h ) => h.tap( DACC, { optional: true, name: 'about control' } ), live: ( h ) => h.tap( LACC, { optional: true, name: 'about control' } ) } ) },
	],
	pairs: [
		// Bar
		{ name: 'bar', draft: DBAR, live: LBAR, text: false, inventory: true, props: [ 'background-color', 'border-bottom-width', 'border-bottom-color' ] },
		{ name: 'logo', draft: 'header a', live: `${ LBAR } .sgs-responsive-logo__link`, hover: true, text: false, anchor: 'bar', anchorLeft: true },
		{ name: 'nav-home', draft: item( 'header', 'home', 'button' ), live: item( LBAR, 'home', 'a' ), hover: true, anchor: 'bar', anchorLeft: true },
		{ name: 'nav-about', draft: item( 'header', 'about', 'button' ), live: item( LBAR, 'about', 'button' ), hover: true, hoverAt: [ 0.2, 0.5 ], anchor: 'bar', anchorLeft: true },
		{ name: 'nav-about-caret', draft: caret( 'header nav', 'about', 'button' ), live: caret( LBAR, 'about', 'button' ), text: false, props: [ 'opacity', 'transform' ] },
		{ name: 'cta', draft: item( 'header', 'request catalogue', 'a' ), live: item( LBAR, 'request catalogue', 'a' ), hover: true, anchor: 'bar', anchorLeft: true },
		// About panel, its scrim and the switch between panels
		{ name: 'about-panel', states: [ 'panel-about' ], draft: { js: DPANEL }, live: { js: LPANEL }, text: false, inventory: true, anchor: 'bar', anchorLeft: true, props: [ 'background-color', 'border-radius', 'box-shadow' ] },
		{ name: 'scrim', states: [ 'panel-about' ], draft: { js: fixedAt( 150 ) }, live: { js: `() => [...document.querySelectorAll('[class*="-scrim"]')].find((s) => parseFloat(getComputedStyle(s).opacity) > 0)` }, text: false, timeline: true, structure: false, props: [ 'opacity', 'backdrop-filter' ] },
		{ name: 'about-row-1', states: [ 'panel-about' ], anchor: 'about-panel', draft: inRoot( DPANEL, '^01\\s*our story', 'a' ), live: inRoot( LPANEL, '^01\\s*our story', 'div' ), hover: true },
		{ name: 'about-label-1', states: [ 'panel-about' ], anchor: 'about-row-1', draft: inRoot( DPANEL, '^our story$', 'span' ), live: inRoot( LPANEL, '^our story$', 'h4' ) },
		{ name: 'about-desc-1', states: [ 'panel-about' ], anchor: 'about-row-1', draft: inRoot( DPANEL, '^three decades of heritage$', 'span' ), live: inRoot( LPANEL, '^three decades of heritage$', 'p' ) },
		{ name: 'about-aside', states: [ 'panel-about' ], draft: { js: `() => { const p = (${ DPANEL })(); return p && p.firstElementChild && p.firstElementChild.children[1]; }` }, live: { js: `() => { const p = (${ LPANEL })(); return p && p.querySelector('.sgs-mega-aside'); }` }, text: false, props: [ 'border-left-width', 'padding-top', 'padding-left' ] },
		{ name: 'about-tag', states: [ 'panel-about' ], anchor: 'about-panel', draft: inRoot( DPANEL, '^since 1994$', 'span' ), live: inRoot( LPANEL, '^since 1994$', 'span' ) },
		{ name: 'about-link', states: [ 'panel-about' ], anchor: 'about-panel', draft: inRoot( DPANEL, '^read our story', 'a' ), live: inRoot( LPANEL, '^read our story', 'a' ), hover: true },
		{ name: 'about-frame', states: [ 'panel-about' ], anchor: 'about-panel', draft: { js: `() => { const a = (${ DPANEL })(); const s = a && a.firstElementChild && a.firstElementChild.children[1]; return s && s.firstElementChild; }` }, live: { js: `() => { const p = (${ LPANEL })(); const s = p && p.querySelector('.sgs-mega-aside'); return s && s.firstElementChild; }` }, text: false, props: [ 'border-top-width', 'border-top-color', 'border-radius', 'background-color' ] },
		// Sectors and Brands panels
		{ name: 'sectors-panel', states: [ 'panel-sectors' ], draft: { js: DPANEL }, live: { js: LPANEL }, text: false, inventory: true, props: [ 'padding-top' ] },
		{ name: 'sectors-card-1', states: [ 'panel-sectors' ], draft: inRoot( DPANEL, '^food service', 'a' ), live: { js: `() => [...document.querySelectorAll('.sgs-mega-panel .sgs-container')].find((c) => c.offsetParent && getComputedStyle(c).borderRadius === '18px' && /Food Service/.test(c.innerText))` }, hover: true, text: false, anchor: 'sectors-panel' },
		{ name: 'brands-panel', states: [ 'panel-brands' ], draft: { js: DPANEL }, live: { js: LPANEL }, text: false, inventory: true, props: [ 'padding-top' ] },
		{ name: 'brands-eyebrow', states: [ 'panel-brands' ], anchor: 'brands-panel', draft: inRoot( DPANEL, '^our brands$', 'div' ), live: inRoot( LPANEL, '^our brands$', 'p' ) },
		{ name: 'brands-aside', states: [ 'panel-brands' ], draft: { js: `() => { const p = (${ DPANEL })(); return p && p.firstElementChild && p.firstElementChild.children[1]; }` }, live: { js: `() => { const p = (${ LPANEL })(); return p && p.querySelector('.sgs-mega-aside'); }` }, text: false, props: [ 'border-left-width', 'border-left-color', 'justify-content', 'padding-left' ] },
		{ name: 'brands-cta', states: [ 'panel-brands' ], draft: inRoot( DPANEL, '^view all brands', 'a' ), live: inRoot( LPANEL, '^view all brands', 'a' ), hover: true },
		// Drawer
		{ name: 'drawer', states: [ 'drawer-open', 'drawer-about' ], draft: { js: DDRAWER }, live: { js: LDRAWER }, text: false, inventory: true, props: [ 'background-color' ] },
		{ name: 'drawer-close', states: [ 'drawer-open' ], draft: 'button[aria-label=Close]', live: 'dialog[open] .sgs-nav-drawer__close', text: false, anchor: 'drawer' },
		{ name: 'drawer-cta', states: [ 'drawer-open' ], draft: inRoot( DDRAWER, '^become a trade customer', 'a' ), live: inRoot( LDRAWER, '^become a trade customer', 'a' ), hover: true, anchor: 'drawer' },
		{ name: 'drawer-home', states: [ 'drawer-open' ], draft: inRoot( DDRAWER, '^home$', 'button' ), live: inRoot( LDRAWER, '^home$', 'a' ), hover: true, anchor: 'drawer' },
		{ name: 'drawer-home-rule', states: [ 'drawer-open' ], draft: { js: `() => { const b = (${ inRoot( DDRAWER, '^home$', 'button' ).js })(); return b && b.parentElement; }` }, live: inRoot( LDRAWER, '^home$', 'a' ), text: false, props: [ 'border-bottom-width', 'border-bottom-color' ] },
		{ name: 'drawer-about-caret', states: [ 'drawer-open' ], draft: { js: `() => { const b = (${ DACC.js })(); return b && b.querySelector('svg'); }` }, live: { js: `() => { const s = (${ LACC.js })(); return s && s.querySelector('svg'); }` }, text: false, props: [ 'opacity', 'transform' ] },
		{ name: 'drawer-linkedin', states: [ 'drawer-open' ], draft: inRoot( DDRAWER, '^in$', 'span' ), live: 'dialog[open] a[aria-label=LinkedIn]', text: false, anchor: 'drawer', anchorLeft: true },
		{ name: 'drawer-email', states: [ 'drawer-open' ], draft: 'a[aria-label=Email]', live: 'dialog[open] a[aria-label=Email]', text: false, anchor: 'drawer', anchorLeft: true },
		{ name: 'acc-label', states: [ 'drawer-about', 'drawer-tap-label' ], draft: DACC, live: LLABEL, props: [ 'color', 'font-size', 'font-weight' ] },
		{ name: 'acc-row-1', states: [ 'drawer-about' ], draft: inRoot( DDRAWER, '^01\\s*our story', 'a' ), live: inRoot( LDRAWER, '^01\\s*our story', 'div' ) },
		{ name: 'acc-tag', states: [ 'drawer-about' ], draft: inRoot( DDRAWER, '^since 1994$', 'span' ), live: inRoot( LDRAWER, '^since 1994$', 'span' ) },
	],
	review: {},
	accept: [],
};
