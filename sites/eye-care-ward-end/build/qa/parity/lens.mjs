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

// The draft's bordered panel holding a text (the note, the typed boxes): the nearest bordered ancestor.
const panelOf = ( re ) => `(r) => { ${ vis } let e = [...r.querySelectorAll('p,div,span,label')].find((x) => vis(x) && ${ re }.test(x.textContent.trim()) && ! x.querySelector('p,div')); while (e && e !== r && getComputedStyle(e).borderTopWidth === '0px') e = e.parentElement; return e && e !== r ? e : null; }`;
// Picks a Q4 answer on both sides: the last question opens its panel on the same screen.
const pickRx = ( label ) => ( {
	draft: ( h ) => h.clickText( `^${ label }`, { within: D, tag: 'button' } ),
	live: ( h ) => h.clickText( `^${ label }`, { within: L, tag: '.sgs-choice-flow-question__option-button', wait: 600 } ),
} );

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
	// The pop-up is a modal over the product page: scrolling the window moves nothing in it.
	autoScroll: false,
	auto: { normalise: [ { side: 'live', from: /^(\+?£[\d,]+)\.00$/, to: '$1', reason: 'Pennies on every price in the lens pop-up, product page, cart and checkout (Bean 2026-09-25)' } ] },
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
		{ name: 'q4-upload', ...pickRx( 'Upload a photo' ) },
		{ name: 'q4-type', ...pickRx( 'Type it in' ) },
	],
	pairs: [
		{
			name: 'option-card', hover: true,
			draft: { within: D, js: CARD },
			live: LCARD,
			props: [ 'background-color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-radius', 'box-shadow', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ],
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
		// The last question's text cards: Send it later's description beside its badge.
		{
			name: 'rx-later-desc', states: [ 'q4-prescription' ], box: [ 'h' ],
			draft: { within: D, text: '^Order now and I', tag: 'span,p,div' },
			live: `${ LCARD } .sgs-choice-flow-question__option-description`,
			props: [ 'font-family', 'font-size', 'font-weight', 'line-height', 'color' ],
		},
		// The last question's panels under the options, each measured from the first option card.
		{
			name: 'rx-note', states: [ 'q4-prescription' ], anchor: 'option-card',
			draft: { within: D, js: panelOf( '/^Perfect/' ) },
			live: `${ L } .sgs-choice-flow__step--inline .sgs-choice-flow-result`,
			props: [ 'background-color', 'border-top-width', 'border-top-color', 'padding-top', 'padding-left' ],
		},
		{
			name: 'rx-upload', states: [ 'q4-upload' ], anchor: 'option-card', text: false,
			draft: { within: D, js: `(r) => { ${ vis } return [...r.querySelectorAll('*')].find((x) => vis(x) && getComputedStyle(x).borderTopStyle === 'dashed'); }` },
			live: `${ L } .sgs-form-field__file-label`,
			props: [ 'border-top-style', 'border-top-color', 'background-color' ],
		},
		{
			name: 'rx-typed', states: [ 'q4-type' ], anchor: 'option-card', text: false,
			draft: { within: D, js: panelOf( '/^Copy the numbers/' ) },
			live: `${ L } .sgs-choice-flow__step--inline`,
			props: [ 'background-color', 'border-top-width', 'border-top-color', 'padding-top', 'padding-left' ],
		},
		{
			name: 'add-to-bag', states: [ 'q4-prescription', 'q4-upload', 'q4-type' ], hover: true,
			draft: { within: D, js: `(r) => { ${ vis } return [...r.querySelectorAll('button')].find((b) => vis(b) && /^add to bag/i.test(b.textContent.trim())); }` },
			live: `${ L } .sgs-choice-flow__add-to-basket`,
		},
		{
			name: 'back', hover: true,
			draft: { within: D, js: `(r) => { ${ vis } return [...r.querySelectorAll('button')].find((b) => vis(b) && /^back$/i.test(b.textContent.trim())); }` },
			live: `${ L } .sgs-choice-flow__nav-back`,
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
	// Screenshot review, region by region (header chrome aside); written after looking at each shot, 2026-09-28.
	review: {
		'q1-use@1440': 'Header, progress (a quarter), stage (photo, Frame £289, Lenses not chosen yet, total), four picture cards two across with prices and ? toggles, skip link. Live adds its Continue button (the flow’s continue model); prices carry pennies (Bean).',
		'q1-use@768': 'Header and step name, stage with the WhatsApp card, question and intro, four cards two across (No prescription wraps its title in live’s narrower column), skip link and Continue in the footer.',
		'q1-use@375': 'Header, slim stage row (thumbnail, name, total), Question 1 of 3, intro, first picture card full width with ? toggle; live’s Continue sits at the right of the footer at its own width.',
		'q2-thickness@1440': 'Stage lists Frame and Distance lenses, question and intro, four lens-edge cards; Standard pre-selected with its chosen border and the Most people pick this badge (Spec 43 D1), Back and Continue in the footer.',
		'q2-thickness@768': 'Stage with three lines and total, question wrapping over two lines on both, cards two across with the badge on Standard (pre-selected on live), Back and Continue in one footer row.',
		'q2-thickness@375': 'Slim stage row, question over two lines, the Standard card full width with its badge (pre-selected on live), Back at the left and Continue at the right of the footer.',
		'q3-finish@1440': 'Stage with Frame, Distance lenses, Thin 1.6 and the total, What finish? with four photo cards, prices on the right of each title, Back and Continue in the footer.',
		'q3-finish@768': 'Stage, question and intro, the four finish cards two across with their photos and prices, the WhatsApp help card under the total, Back and Continue in one footer row.',
		'q3-finish@375': 'Stage row scrolled under the header on both (live 28px further, accepted), Question 3 of 3, the Tinted card full width, Back and Continue in one footer row.',
		'q4-prescription@1440': 'Last question: three text cards (Send it later chosen, Easiest badge beside title and text), the WhatsApp note panel under them, stage Prescription Sending it later, Add to bag £418 in the footer.',
		'q4-prescription@768': 'Three narrow text cards, Send it later’s text wrapping under its Easiest badge inside the card on both, the note panel under the options, Add to bag with the total in the footer beside Back.',
		'q4-prescription@375': 'Stage row with total, the three text cards full width with the Easiest badge on Send it later, Back and Add to bag in one footer row with the button at its own width; the note panel sits below the fold on both.',
		'q4-upload@1440': 'Upload a photo chosen: the dashed panel under the options with the prompt, the help line and CHOOSE FILE on both; stage Prescription Photo uploaded; Add to bag in the footer.',
		'q4-upload@768': 'The upload panel under the three cards (help line over two lines, CHOOSE FILE centred), stage line Photo uploaded, Add to bag £418 beside Back.',
		'q4-upload@375': 'Upload a photo chosen, the dashed panel starting below the options at the fold on both, Back and Add to bag in one footer row.',
		'q4-type@1440': 'Type it in chosen: the table panel with SPH, CYL and AXIS headings, R and L rows and example values, the note under it; live’s boxes use the site’s off-white input fill where the draft’s are white. Add to bag in the footer.',
		'q4-type@768': 'The prescription table under the options, three boxes across in two rows with R and L in the gutter and the note under the whole table, stage Prescription Entered online, Add to bag beside Back.',
		'q4-type@375': 'Type it in chosen, the table panel starting at the fold with its SPH, CYL and AXIS headings on both (full panel checked on its own shot: three boxes across, example values whole), Back and Add to bag in one row.',
	},
	accept: [
		{
			kind: 'text', reason: 'Pennies on every price (Bean 2026-09-25), "Frame size 55" for the draft\'s "Size M" (Bean 2026-09-25), and live\'s typographic apostrophe',
			when: ( d ) => words( d.draft ) === words( d.live.replace( /(£\d+)\.00/g, '$1' ).replace( /Frame size 55/g, 'Size M' ).replace( /’/g, "'" ) ),
		},
		{ pair: 'close', kind: 'box', key: 'h', reason: 'Close keeps the 44px touch target; the draft\'s is 42px (Bean 2026-09-26)' },
		{ pair: 'option-card', state: 'q2-thickness', reason: '"Standard · 1.5" is pre-selected (Spec 43 D1), so its card shows the chosen fill, border and no hover lift' },
		{ pair: 'option-title', state: 'q2-thickness', width: 768, kind: 'box', reason: 'The pre-selected card’s 2px border (Spec 43 D1) leaves "Standard · 1.5" 2px short of one line at 768' },
		{ pair: 'stage', state: 'q2-thickness', kind: 'text', reason: 'A pre-selected default shows on the stage once its question is reached (Bean 2026-09-26)' },
		{ pair: 'option-card', kind: 'style', when: ( d ) => /^padding-/.test( d.key ), reason: 'Same box, other element: the draft pads the card’s text span, live pads the card and pulls the picture band out to the edges' },
		{ pair: 'close', kind: 'style', key: 'justify-content', reason: 'No effect: the button is as wide as its content' },
		{ pair: 'option-band', state: 'q3-finish', reason: 'The frame photo covers the whole band on both sides' },
		...[ 'q4-prescription', 'q4-upload', 'q4-type' ].map( ( state ) => ( { pair: 'option-card', state, kind: 'motion', key: 'transition', reason: 'Declaration only: neither side’s text cards cast a hover shadow' } ) ),
		{ pair: 'help-toggle', kind: 'style', when: ( d ) => /^padding-|^line-height$/.test( d.key ), reason: 'No visible effect: the glyph is centred in a fixed 30px disc on both sides' },
		{ pair: 'help-toggle', kind: 'motion', key: 'transition', reason: 'Accepted (Bean 2026-09-27): the draft snaps the glyph colour on hover while the fill fades; live fades both' },
		{ pair: 'help-toggle', kind: 'hover', key: 'color', reason: 'Accepted (Bean 2026-09-27): hover glyph is the palette’s text-inverse #FAF8F5, the draft’s pure white' },
		...[ 'q4-prescription', 'q4-upload', 'q4-type' ].map( ( state ) => ( { pair: 'stage', state, width: 375, kind: 'text', reason: 'Accepted (Bean 2026-09-27): the draft’s 72px thumbnail shows a clipped "POLARIS" label; live keeps the thumbnail clean' } ) ),
		// The opened panel's fade runs on the step that holds the note card and the drop zone (rx-typed, the step
		// itself, measures the same 0.3s opacity fade as the draft).
		...[ 'rx-note', 'rx-upload' ].map( ( pair ) => ( {
			pair, kind: 'motion', reason: 'The same 0.3s fade-in, run by the opened step that holds this card (measured equal on rx-typed); the drop zone’s own border transition is its hover', when: ( d ) => [ 'keyframes', 'animation', 'running-after-action', 'transition' ].includes( d.key ),
		} ) ),
		{ pair: 'rx-typed', kind: 'style', key: 'padding-left', reason: 'The boxes start 52px in on both: the draft sets R and L in a table column inside 20px, live in a 32px gutter after 20px' },
		{ pair: 'back', kind: 'style', notPainted: true, reason: 'The same text button: live centres its label with flex and a 6px gap for an icon it does not show, the draft with block text', when: ( d ) => [ 'display', 'column-gap', 'row-gap', 'align-items' ].includes( d.key ) },
		{ pair: 'rx-upload', kind: 'style', key: 'border-top-color', reason: 'The nearest palette border, border-strong #D8D2C8, for the draft’s #C9C2B8 (not an Eye Care palette colour)' },
		{ pair: 'add-to-bag', kind: 'hover', key: 'color', reason: 'The site’s primary button preset hover text, white, against the draft’s #FAF8F5 (as the help toggle, Bean 2026-09-27)' },
		// 375: both stage bars scroll with the page; the flow's own scroll to the question after Continue lands 28px further
		// than the draft's (checked on the shots), which moves the row mates of the header and the stage.
		...[ 'q3-finish', 'q4-prescription', 'q4-upload', 'q4-type' ].flatMap( ( state ) => [ 'close', 'header-eyebrow', 'stage', 'stage-total' ].map( ( pair ) => ( {
			state, width: 375, pair, kind: 'structure', key: 'row', reason: 'Both stage bars scroll with the page; live’s scroll to the question after Continue lands 28px further, so the stage’s row mates differ (checked on the shots)',
		} ) ) ),
		// The footer's Add to bag is the site's primary button preset, as every primary button on the site.
		{ pair: 'add-to-bag', reason: 'The site’s primary button preset (28px sides, as every primary button on the site) against the draft’s 26px; the width also carries the pennies (Bean 2026-09-25)', when: ( d ) => [ 'padding-left', 'padding-right', 'w' ].includes( d.key ) },
		{ pair: 'add-to-bag', kind: 'style', notPainted: true, reason: 'The same button: a 0px border has no style to paint; live spaces the total with a 14px margin, the draft with a 14px flex gap', when: ( d ) => [ 'border-top-style', 'column-gap', 'row-gap', 'justify-content' ].includes( d.key ) },
		{ pair: 'add-to-bag', kind: 'motion', key: 'transition', reason: 'The same 0.2s fill change: live lists background-color with border and text colour (which do not change here) where the draft writes background' },
		// The automatic check (GAP-CHECKLIST section 12): the differences Bean has already decided, row by row.
		{ pair: '(auto)', reason: 'Accepted (Bean 2026-09-25): "Frame size 55" for the draft’s "Size M" on the stage', when: ( d ) => ( ( d ) => /^text-missing "(size )?m"$|^text-extra "(frame|55|frame size 55)"$|^moved "(·|size|frame) → (size|frame|total)/.test( d.key ) )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
		{ pair: '(auto)', reason: 'The footer’s Add to bag is the site’s primary button preset and carries the pennies (Bean 2026-09-25), so it starts further left beside Back', when: ( d ) => ( ( d ) => /^moved "back → add to bag/.test( d.key ) && d.draft.split( ',' )[ 1 ] === d.live.split( ',' )[ 1 ] && Math.abs( Number( d.draft.split( ',' )[ 0 ] ) - Number( d.live.split( ',' )[ 0 ] ) ) <= 40 )( { ...d, key: d.key.replace( / #\d+$/, '' ) } ) },
	],
};
