// Fixed tap floors that read a size setting through style.css: the nav-bar-menu burger and sub-toggle hit areas, the
// nav-drawer-menu accordion expander, the cart trigger with its size set to the old 24px default, and the per-tier flags of
// store-selector and theme-toggle. The custom properties are the ones the render code prints (run-nav-tap-floors-standalone.php,
// TapFloorsRenderTest.php); a fixed-size child stands in for the glyph.
const box = ( w, h ) => `<span style="display:block;width:${ w }px;height:${ h }px"></span>`;
const burger = ( rule ) =>
	`<style>${ rule }</style><div class="sgs-nav-bar-menu u1"><button class="sgs-nav-bar-menu__burger">${ box( 16, 16 ) }</button></div>`;
const subtoggle = ( rule ) =>
	`<style>*{box-sizing:border-box}${ rule }</style><div class="sgs-nav-bar-menu u1"><button class="sgs-nav-bar-menu__subtoggle">${ box( 12, 12 ) }</button></div>`;
const expander = ( rule, caret ) =>
	`<style>*{box-sizing:border-box}${ rule }</style><div class="sgs-nav-drawer-menu u1"><details class="sgs-nav-drawer-menu__accordion"><summary class="sgs-nav-drawer-menu__accordion-summary"><span class="sgs-nav-drawer-menu__caret">${ box( caret, caret ) }</span></summary></details></div>`;
const cart = ( vars ) =>
	`<div class="sgs-cart wp-block-sgs-cart sgs-cart--trigger-icon" style="${ vars }"><button type="button" class="sgs-cart__trigger"><span class="sgs-cart__icon"><svg viewBox="0 0 24 24"></svg></span></button></div>`;
const BURGER_SIZED = '.u1 .sgs-nav-bar-menu__burger{width:30px;height:30px;min-width:30px;min-height:30px;--sgs-burger-tap-min:0px;}';
const BURGER_DEFAULT = '.u1 .sgs-nav-bar-menu__burger{width:44px;height:44px;min-width:44px;min-height:44px;--sgs-burger-tap-min:0px;}';
const MOBILE = '@media(max-width:767px)';

export const CASES = [
	{
		name: 'nav-bar-menu burger sized 30px: the ::after hit area fits the set box',
		styles: [ 'nav-bar-menu' ],
		html: burger( BURGER_SIZED ),
		sel: '.sgs-nav-bar-menu__burger',
		pseudo: '::after',
		expect: { w: 30, h: 30 },
		sized: true,
	},
	{
		name: 'nav-bar-menu burger at the default 44px burgerSize: the hit area is 44px',
		styles: [ 'nav-bar-menu' ],
		html: burger( BURGER_DEFAULT ),
		sel: '.sgs-nav-bar-menu__burger',
		pseudo: '::after',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'nav-bar-menu sub-toggle with submenuCaretSize set: the ::before hit area fits the toggle box (6 gap + 12 glyph + 12 end pad)',
		styles: [ 'nav-bar-menu' ],
		html: subtoggle( '.u1{--sgs-nav-link-pad-end:12px;--sgs-nav-caret-gap:6px;--sgs-nav-caret-tap-min:0px;}' ),
		sel: '.sgs-nav-bar-menu__subtoggle',
		pseudo: '::before',
		expect: { w: 30, h: 12 },
		sized: true,
	},
	{
		name: 'nav-bar-menu sub-toggle with no caret size: the ::before hit area keeps 44px',
		styles: [ 'nav-bar-menu' ],
		html: subtoggle( '.u1{--sgs-nav-link-pad-end:12px;--sgs-nav-caret-gap:6px;}' ),
		sel: '.sgs-nav-bar-menu__subtoggle',
		pseudo: '::before',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'nav-drawer-menu expander with caretBoxSize 30px: the summary wraps the caret box',
		styles: [ 'nav-drawer-menu' ],
		html: expander( '.u1{--sgs-ndm-caret-tap-min:0px;}', 30 ),
		sel: '.sgs-nav-drawer-menu__accordion-summary',
		expect: { w: 30, h: 30 },
		sized: true,
	},
	{
		name: 'nav-drawer-menu expander with no caretBoxSize: the 44px floor stays',
		styles: [ 'nav-drawer-menu' ],
		html: expander( '', 30 ),
		sel: '.sgs-nav-drawer-menu__accordion-summary',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'cart icon trigger with iconSize set to 24: a set 24 lifts the floor like any other size',
		styles: [ 'cart' ],
		html: cart( '--sgs-cart-icon-size:24px;--sgs-cart-tap-min:0px' ),
		sel: '.sgs-cart__trigger',
		expect: { w: 24, h: 24 },
		sized: true,
	},
	{
		name: 'cart icon trigger with iconSize unset: only the size variable prints and the 44px floor stays',
		styles: [ 'cart' ],
		html: cart( '--sgs-cart-icon-size:24px' ),
		sel: '.sgs-cart__trigger',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'store-selector with a flag size set at mobile only: lifted at 375',
		styles: [ 'store-selector' ],
		html: `<style>${ MOBILE }{.u1{--sgs-ss-tap-min:0px;}}</style><div class="sgs-store-selector u1"><button class="sgs-store-selector__trigger" style="padding:0">${ box( 20, 14 ) }</button></div>`,
		sel: '.sgs-store-selector__trigger',
		widths: [ 375 ],
		expect: { w: 20, h: 14 },
		sized: true,
	},
	{
		name: 'store-selector with a flag size set at mobile only: the 44px floor stays at 768 and 1440',
		styles: [ 'store-selector' ],
		html: `<style>${ MOBILE }{.u1{--sgs-ss-tap-min:0px;}}</style><div class="sgs-store-selector u1"><button class="sgs-store-selector__trigger" style="padding:0">${ box( 20, 14 ) }</button></div>`,
		sel: '.sgs-store-selector__trigger',
		widths: [ 768, 1440 ],
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'theme-toggle with an icon size set at mobile only: lifted at 375',
		styles: [ 'theme-toggle' ],
		html: `<style>${ MOBILE }{.u1{--sgs-tt-tap-min:0px;}}</style><button class="sgs-theme-toggle sgs-dark-mode-toggle u1" style="padding:0;border:0">${ box( 20, 20 ) }</button>`,
		sel: '.sgs-theme-toggle',
		widths: [ 375 ],
		expect: { w: 20, h: 20 },
		sized: true,
	},
	{
		name: 'theme-toggle with an icon size set at mobile only: the 44px floor stays at 768 and 1440',
		styles: [ 'theme-toggle' ],
		html: `<style>${ MOBILE }{.u1{--sgs-tt-tap-min:0px;}}</style><button class="sgs-theme-toggle sgs-dark-mode-toggle u1" style="padding:0;border:0">${ box( 20, 20 ) }</button>`,
		sel: '.sgs-theme-toggle',
		widths: [ 768, 1440 ],
		expect: { w: 44, h: 44 },
		sized: false,
	},
];
