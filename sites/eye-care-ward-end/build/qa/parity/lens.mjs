// Parity config: the lens configurator pop-up on the Gucci Oversized Cat-Eye (eye-care-test
// product 76, photographed in the draft), walked through its four questions.
// Run: node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/lens.mjs
const D = '[aria-label="Add prescription lenses"]';
const L = 'dialog[open] .sgs-choice-flow';
const vis = 'const vis = (e) => e && e.offsetParent !== null;';
// The first visible option card of the current question.
const CARD = `(r) => { ${ vis } return [...r.querySelectorAll('button')].find((b) => vis(b) && ! b.closest('aside') && b.children.length >= 2 && b.querySelector('span span') && ! /add to bag|^close/i.test(b.textContent.trim())); }`;
// Word multiset of a text, for accepted-difference matchers.
const words = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim().toLowerCase().split( ' ' ).sort().join( ' ' );
const LCARD = `${ L } .sgs-choice-flow-question__option-button`;

// Picks an option on the draft (the card click advances) or on live (card, then Continue).
const choose = ( label ) => ( {
	draft: ( h ) => h.clickText( `^${ label }`, { within: D, tag: 'button' } ),
	live: async ( h ) => {
		await h.clickText( `^${ label }`, { within: L, tag: '.sgs-choice-flow-question__option-button', wait: 150 } );
		await h.click( `${ L } .sgs-choice-flow__continue` );
	},
} );

export default {
	name: 'lens',
	draft: {
		url: 'https://mintcream-lyrebird-224487.hostingersite.com/',
		open: async ( h ) => {
			await h.clickText( '^sunglasses$', { wait: 900 } );
			await h.clickText( '^oversized cat-eye$', { wait: 900 } );
			await h.clickText( '^add my prescription' );
			await h.waitFor( D );
		},
	},
	live: {
		url: 'https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/?cb={cb}',
		open: async ( h ) => {
			await h.clickText( '^add my prescription', { tag: 'a,button' } );
			await h.waitFor( L );
		},
	},
	states: [
		{ name: 'q1-use' },
		{ name: 'q2-thickness', ...choose( 'Distance' ) },
		{ name: 'q3-finish', ...choose( 'Thin' ) },
		{ name: 'q4-prescription', ...choose( 'Polarised' ) },
	],
	pairs: [
		{
			name: 'option-card', hover: true,
			draft: { within: D, js: CARD },
			live: LCARD,
			props: [ 'background-color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-radius', 'box-shadow' ],
		},
		...[ [ 'title', 'b.children[1].firstElementChild.firstElementChild', 'label' ], [ 'price', 'b.children[1].firstElementChild.children[1]', 'price' ],
			[ 'description', 'b.children[1].children[1]', 'description' ] ].map( ( [ part, draftPath, liveEl ] ) => ( {
			name: `option-${ part }`,
			states: [ 'q1-use', 'q2-thickness', 'q3-finish' ],
			draft: { within: D, js: `(r) => { const b = (${ CARD })(r); return b && ${ draftPath }; }` },
			live: `${ LCARD } .sgs-choice-flow-question__option-${ liveEl }`,
			box: [ 'h' ],
			props: [ 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-transform' ],
		} ) ),
		{
			name: 'option-band', text: false,
			states: [ 'q1-use', 'q2-thickness', 'q3-finish' ],
			draft: { within: D, js: `(r) => { const b = (${ CARD })(r); return b && b.firstElementChild; }` },
			live: `${ LCARD } .sgs-choice-flow-question__option-media`,
			props: [ 'background-color', 'border-radius' ],
		},
		{
			name: 'progress-fill', text: false,
			draft: { within: D, js: '(r) => r.children[1] && r.children[1].firstElementChild' },
			live: `${ L } .sgs-choice-flow__progress-fill`,
			props: [ 'background-color', 'height' ],
		},
		{
			name: 'close', hover: true,
			draft: { within: D, js: `(r) => [...r.querySelectorAll('button')].find((b) => /^close/i.test(b.textContent.trim()))` },
			live: `${ L } .sgs-choice-flow__chrome-close`,
		},
		{
			name: 'help-toggle', hover: true,
			states: [ 'q1-use', 'q2-thickness', 'q3-finish' ],
			draft: { within: D, js: `(r) => { ${ vis } return [...r.querySelectorAll('button')].find((b) => vis(b) && b.textContent.trim() === '?'); }` },
			live: `${ L } .sgs-info-toggle`,
		},
		{
			name: 'header-eyebrow', box: [ 'h' ],
			draft: { within: D, js: '(r) => r.firstElementChild.querySelector("span")' },
			live: `${ L } .sgs-choice-flow__chrome-eyebrow`,
		},
		{
			name: 'step-count', box: [ 'h' ],
			draft: { within: D, js: `(r) => { ${ vis } return [...r.querySelectorAll('p')].find((p) => vis(p) && /question|last bit/i.test(p.textContent)); }` },
			live: `${ L } .sgs-choice-flow__step-count`,
		},
		{
			name: 'stage-total', box: [ 'h' ],
			draft: { within: D, js: `(r) => [...r.querySelectorAll('aside span')].find((s) => /^£/.test(s.textContent.trim()) && parseFloat(getComputedStyle(s).fontSize) > 20)` },
			live: `${ L } .sgs-choice-flow__summary-total-value, ${ L } .sgs-choice-flow__summary-summary-total-value`,
		},
		{
			name: 'stage', box: [ 'w' ],
			draft: `${ D } aside`,
			live: `${ L } .sgs-choice-flow__summary`,
			props: [],
		},
	],
	accept: [
		{
			kind: 'text', reason: 'Pennies on every price (Bean 2026-09-25) and "Frame size 55" for the draft\'s "Size M" (Bean 2026-09-25)',
			when: ( d ) => words( d.draft ) === words( d.live.replace( /(£\d+)\.00/g, '$1' ).replace( /Frame size 55/g, 'Size M' ) ),
		},
		{ pair: 'close', kind: 'box', key: 'h', reason: 'Close keeps the 44px touch target; the draft\'s is 42px (Bean 2026-09-26)' },
		{ pair: 'option-card', state: 'q2-thickness', reason: '"Standard · 1.5" is pre-selected (Spec 43 D1), so its card shows the chosen fill, border and no hover lift' },
	],
};
