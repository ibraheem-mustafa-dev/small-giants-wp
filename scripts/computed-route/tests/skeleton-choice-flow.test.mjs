// rules.choiceFlow (Spec 48 FR-48-6; Spec 43) and rules.blockOwnedPart (plan 2026-10-23-cloning-tool-completion S5): a surface the
// page map holds as an sgs_choice_flow row is the sgs/choice-flow family composed from the fact record, whatever its surfaces.json
// kind; a surface the page map holds as a block-owned part of the cart row is sgs/cart, never the navigation drawer. Synthetic
// inventories and fact records in the readers' shapes. Tests marked MUST FAIL fail on the skeleton writer before the rules; each
// carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { parseTagId, surfaceRole } from '../lib/skeleton-surface-role.mjs';
import { E, R0, R01, FLOW, FLOW_ROW, run, names, facts } from './fixtures/choice-flow-fixture.mjs';

test( 'MUST FAIL: a choice-flow surface is sgs/choice-flow with one step per question, its options read from the record, and the panels a question opens', () => {
	const { skeleton, problems } = run( FLOW );
	assert.deepEqual( problems, [] );
	const [ flow ] = skeleton;
	assert.equal( flow.name, 'sgs/choice-flow' );
	assert.deepEqual( flow.innerBlocks.map( ( s ) => [ s.name, s.attributes.label, s.innerBlocks.map( ( k ) => k.name ) ] ), [
		[ 'sgs/form-step', 'Pick a size', [ 'sgs/choice-flow-question' ] ],
		[ 'sgs/form-step', 'How to send it', [ 'sgs/choice-flow-question' ] ],
		[ 'sgs/form-step', 'How to send it', [ 'sgs/choice-flow-result' ] ],
		[ 'sgs/form-step', 'How to send it', [ 'sgs/form-field-file', 'sgs/choice-flow-result' ] ],
	] );
	const q1 = flow.innerBlocks[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( q1.attributes, { question: 'Pick a size', intro: 'Sizes run small.', options: [ { label: 'Small', value: 'small', description: 'Snug fit', helpText: 'Small help' }, { label: 'Large', value: 'large', description: 'Roomy fit', helpText: 'Large help' } ] } );
	assert.deepEqual( q1.draftRef, { tpl: 'Root/12#0' }, 'the rendered question reads the draft at its container' );
	const q2 = flow.innerBlocks[ 1 ].innerBlocks[ 0 ];
	assert.equal( q2.draftRef, undefined, 'a step the page never showed has no draftRef' );
	assert.deepEqual( q2.attributes, { question: 'How to send it', eyebrow: 'Almost done', options: [ { label: 'Later', value: 'later', nextStepId: '2' }, { label: 'Upload', value: 'upload', nextStepId: '3' } ], showNextStepInline: true } );
	assert.deepEqual( flow.innerBlocks[ 2 ].innerBlocks[ 0 ].attributes, { heading: 'We will remind you.', body: 'Nothing is charged twice.', action: 'add-to-bag', addToBasketLabel: 'Add to bag', buttonShowsTotal: true } );
	assert.deepEqual( flow.innerBlocks[ 3 ].innerBlocks[ 0 ].attributes, { label: 'Drop it here' } );
	assert.deepEqual( flow.innerBlocks[ 3 ].innerBlocks[ 1 ].attributes, { heading: '', action: 'add-to-bag', addToBasketLabel: 'Add to bag', buttonShowsTotal: true }, 'a field panel\'s words label its field, never head its result' );
	assert.ok( ! names( skeleton ).includes( 'sgs/form' ), 'the form passes never wrap the flow\'s fields, even with a form schema in the logic' );
	assert.deepEqual( flow.attributes, { flowLayout: 'showcase', stepCountLabel: 'Question', showHeader: true, closeStyle: 'text', closeLabel: 'Close', skipLabel: 'Skip it', skipPrompt: 'Frame only?', skipAddsToBag: true, showPricePanel: true, summaryPosition: 'start', stageNote: 'Need a hand?', stageNoteLink: { url: 'https://example.com/help', text: 'Message us any time.', source: 'url' } } );
	assert.ok( flow.handover.some( ( h ) => 'product-data' === h.owner && h.detail.includes( '+£5' ) ), 'the option prices are handed to the add-on price list' );
	assert.ok( flow.handover.some( ( h ) => 'site-info' === h.owner && h.detail.includes( 'headerLogo' ) ), 'the header logo is handed over' );
	// Negative control: with no page-map row the surface is never a choice flow.
	assert.ok( ! names( run( FLOW, { pageMap: [] } ).skeleton ).some( ( n ) => n.startsWith( 'sgs/choice-flow' ) ) );
} );

test( 'MUST FAIL: the flow\'s rows: covered pieces name what draws them, a control the family cannot hold is a gap row', () => {
	const { proposal, skeleton } = run( FLOW );
	const row = ( k ) => proposal.rows.find( ( r ) => r.key === k );
	assert.equal( row( 'Root/1#0' ).block, 'sgs/choice-flow' );
	assert.equal( row( 'Root/1#0' ).rule, 'choiceFlow' );
	assert.notEqual( row( 'Root/47#0' ).rule, 'choiceFlow', 'the stray line is built by the ordinary rules beside the flow' );
	assert.equal( skeleton.at( -1 ).name, 'sgs/container', 'the stray line and its span sit after the flow' );
	assert.equal( row( 'Root/20#1' ).action, 'absorbed' );
	assert.match( row( 'Root/20#1' ).reason, /question 1 "Pick a size"/ );
	assert.match( row( 'Root/8#0' ).reason, /summary/ );
	assert.match( row( 'Root/43#0' ).reason, /skip/ );
	assert.match( row( 'Root/45#0' ).reason, /flow footer/, 'the add-to-bag button sits in the footer bar the flow draws' );
	// A loop of buttons whose handler does not bind the item is no question: its buttons are gap rows.
	assert.deepEqual( proposal.rows.filter( ( r ) => 'unresolved' === r.action ).map( ( r ) => r.key ), [ 'Root/51#0', 'Root/51#1' ] );
	assert.deepEqual( proposal.choiceFlow, { steps: 4, questions: 2, results: 2, notes: [] } );
} );

test( 'MUST FAIL: the choice-flow rule wins over the form rule on a surface of kind form; without the row it stays sgs/form', () => {
	const asForm = [ E( 1, 'form', null, { rendered: R0 } ), ...FLOW.slice( 1 ) ];
	const flow = run( asForm, { kind: 'form' } );
	assert.equal( flow.skeleton[ 0 ].name, 'sgs/choice-flow' );
	assert.ok( ! names( flow.skeleton ).includes( 'sgs/form' ), 'no form host wraps the panel\'s field' );
	assert.equal( run( asForm, { kind: 'form', pageMap: [] } ).skeleton[ 0 ].name, 'sgs/form' );
} );

test( 'MUST FAIL: a row of chips with its label just before it is a question worded by that label; a compact flow on a page', () => {
	const chips = [
		E( 1, 'section', null, { rendered: R0 } ),
		E( 2, 'h2', 1, { words: 'Find a gift', rendered: R0 } ),
		E( 3, 'div', 1, { words: 'The moment', rendered: R0 } ),
		E( 4, 'div', 1, { rendered: R0 } ),
		E( 5, 'sc-for', 4, { items: 2, as: 'o' } ),
		E( 6, 'button', 5, { click: 'o.pick', text: [ 'Birthday', 'Thank you' ], rendered: R01 } ),
		E( 7, 'div', 1, { words: 'Budget', rendered: R0 } ),
		E( 8, 'div', 1, { rendered: R0 } ),
		E( 9, 'sc-for', 8, { items: 2, as: 'o' } ),
		E( 10, 'button', 9, { click: 'o.pick', text: [ 'Under 20', 'Over 20' ], rendered: R01 } ),
	];
	const { skeleton, proposal } = run( chips, { kind: 'form' } );
	const [ flow ] = skeleton;
	assert.deepEqual( flow.attributes, { flowLayout: 'compact', title: 'Find a gift' } );
	assert.deepEqual( flow.innerBlocks.map( ( s ) => [ s.innerBlocks[ 0 ].attributes.question, s.innerBlocks[ 0 ].attributes.options.map( ( x ) => x.label ) ] ), [ [ 'The moment', [ 'Birthday', 'Thank you' ] ], [ 'Budget', [ 'Under 20', 'Over 20' ] ] ] );
	assert.deepEqual( proposal.rows.filter( ( r ) => 'unresolved' === r.action ), [], 'the labels are the questions\' words, never gap rows' );
} );

test( 'MUST FAIL: a condition before the options is question text, a price-first option keeps its name, a skip mention inside a button is no skip link', () => {
	const edge = [
		E( 1, 'section', null, { rendered: R0 } ),
		E( 2, 'div', 1, { rendered: R0 } ),
		E( 3, 'h3', 2, { words: 'Pick one', rendered: R0 } ),
		E( 4, 'sc-if', 2, { attrs: { value: '{{ hint }}' } } ),
		E( 5, 'p', 4, { words: 'Most pick the first.', rendered: R0 } ),
		E( 6, 'div', 2, { rendered: R0 } ),
		E( 7, 'sc-for', 6, { items: 2, as: 'o' } ),
		E( 8, 'button', 7, { click: 'o.pick', rendered: R01 } ),
		E( 9, 'span', 8, { text: [ '£5', '£9' ], rendered: R01 } ),
		E( 10, 'span', 8, { text: [ 'Small', 'Large' ], rendered: R01 } ),
		E( 11, 'img', 1, { attrs: { src: 'x.png', alt: '' }, rendered: R0 } ),
		E( 12, 'div', 1, { rendered: R0 } ),
		E( 13, 'sc-for', 12, { items: 2, as: 'o' } ),
		E( 14, 'button', 13, { click: 'o.pick', text: [ 'Weekly', 'Monthly' ], rendered: R01 } ),
		E( 15, 'button', 1, { click: 'pickPlan', rendered: R0 } ),
		E( 16, 'span', 15, { words: 'Skip, swap or cancel', rendered: R0 } ),
	];
	const { skeleton, proposal } = run( edge, { kind: 'form' } );
	const [ flow ] = skeleton;
	assert.equal( flow.innerBlocks.length, 2, 'a condition before the options opens no step' );
	assert.deepEqual( flow.innerBlocks[ 0 ].innerBlocks[ 0 ].attributes, { question: 'Pick one', intro: 'Most pick the first.', options: [ { label: 'Small', value: 'small' }, { label: 'Large', value: 'large' } ] } );
	assert.equal( flow.attributes.skipLabel, undefined, 'a button holding a skip mention in its text is no skip link' );
	assert.doesNotMatch( proposal.rows.find( ( r ) => 'Root/11#0' === r.key ).reason, /question/, 'a wordless sibling never leads a question' );
	assert.match( proposal.choiceFlow.notes.join( ' ' ), /question 2 \(Root\/12\) has no words/ );
} );

test( 'MUST FAIL: a question\'s container never climbs past another control', () => {
	const wrap = [
		E( 1, 'section', null, { rendered: R0 } ),
		E( 2, 'div', 1, { rendered: R0 } ),
		E( 3, 'div', 2, { words: 'Size', rendered: R0 } ),
		E( 4, 'div', 2, { rendered: R0 } ),
		E( 5, 'sc-for', 4, { items: 2, as: 'o' } ),
		E( 6, 'button', 5, { click: 'o.pick', text: [ 'S', 'M' ], rendered: R01 } ),
		E( 7, 'button', 2, { words: 'Reset', click: 'resetAll', rendered: R0 } ),
	];
	const { skeleton, proposal } = run( wrap, { kind: 'form' } );
	assert.deepEqual( skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ].attributes, { question: 'Size', options: [ { label: 'S', value: 's' }, { label: 'M', value: 'm' } ] } );
	assert.deepEqual( proposal.rows.filter( ( r ) => 'unresolved' === r.action ).map( ( r ) => r.key ), [ 'Root/7#0' ], 'the other control is a gap row, never the question\'s intro' );
} );

test( 'MUST FAIL: options are listed only when the loop recorded one value per item; otherwise a note says why', () => {
	const dup = FLOW.map( ( x ) => ( 20 === x.n ? { ...x, text: [ 'Same' ] } : x ) );
	const { skeleton, proposal } = run( dup );
	assert.deepEqual( skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ].attributes.options, [] );
	assert.match( proposal.choiceFlow.notes.join( ' ' ), /question 1 "Pick a size".*not listed/ );
	assert.ok( skeleton[ 0 ].handover.some( ( h ) => 'content-page' === h.owner && /question 1 "Pick a size".*not listed/.test( h.detail ) ), 'an unreadable option list is a visible hand-over row' );
	// Control: the aligned loop lists both.
	assert.equal( run( FLOW ).skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ].attributes.options.length, 2 );
} );

// A compact flow on a page: a heading group (kicker, heading, intro) above two questions; beside them a card with a live line
// naming the picks, a pair of pressable buttons choosing how to buy (the first, pressed, reveals a frequency question), an
// add-to-basket button and a note under it.
const CANVAS = [
	E( 1, 'section', null, { rendered: R0 } ),
	E( 2, 'div', 1, { rendered: R0 } ),
	E( 3, 'div', 2, { rendered: R0 } ),
	E( 4, 'div', 3, { rendered: R0 } ),
	E( 5, 'div', 4, { words: 'made your way', rendered: R0 } ),
	E( 6, 'h2', 4, { words: 'Build a box', rendered: R0 } ),
	E( 7, 'p', 4, { words: 'Pick what you like and we pack it.', rendered: R0 } ),
	E( 8, 'div', 3, { rendered: R0 } ),
	E( 9, 'div', 8, { words: '1 · Base', rendered: R0 } ),
	E( 10, 'div', 8, { rendered: R0 } ),
	E( 11, 'sc-for', 10, { items: 2, as: 'o' } ),
	E( 12, 'button', 11, { click: 'o.pick', text: [ 'Oat', 'Rye' ], rendered: R01 } ),
	E( 13, 'div', 3, { rendered: R0 } ),
	E( 14, 'div', 13, { words: '2 · Topping', rendered: R0 } ),
	E( 15, 'div', 13, { rendered: R0 } ),
	E( 16, 'sc-for', 15, { items: 2, as: 'o' } ),
	E( 17, 'button', 16, { click: 'o.pick', text: [ 'Seeds', 'Nuts' ], rendered: R01 } ),
	E( 18, 'div', 2, { rendered: R0 } ),
	E( 19, 'div', 18, { rendered: R0 } ),
	E( 20, 'div', 19, { attrs: { role: 'img' }, rendered: R0 } ),
	E( 21, 'div', 19, { text: [ 'Oat with seeds' ], rendered: R0 } ),
	E( 22, 'div', 18, { rendered: R0 } ),
	E( 23, 'button', 22, { click: 'pickRepeat', pressed: true, rendered: R0 } ),
	E( 24, 'span', 23, { words: 'Repeat order', rendered: R0 } ),
	E( 25, 'span', 23, { words: 'Pause any time', rendered: R0 } ),
	E( 26, 'span', 23, { text: [ '£9.00' ], rendered: R0 } ),
	E( 27, 'sc-if', 22, { attrs: { value: '{{ is23 }}' } } ),
	E( 28, 'div', 27, { rendered: R0 } ),
	E( 29, 'sc-for', 28, { items: 2, as: 'f' } ),
	E( 30, 'button', 29, { click: 'f.pick', text: [ 'Weekly', 'Monthly' ], rendered: R01 } ),
	E( 31, 'button', 22, { click: 'pickOnce', pressed: false, rendered: R0 } ),
	E( 32, 'span', 31, { words: 'Just once', rendered: R0 } ),
	E( 33, 'button', 18, { click: 'addIt', words: 'Add to basket', rendered: R0 } ),
	E( 34, 'div', 18, { words: 'Ships in two days', rendered: R0 } ),
];
const canvasRun = ( list ) => run( list, { kind: 'form' } );
const without = ( list, ...ns ) => list.filter( ( x ) => ! ns.includes( x.n ) );
const gapKeys = ( proposal ) => proposal.rows.filter( ( r ) => 'unresolved' === r.action ).map( ( r ) => r.key );

test( 'MUST FAIL: a live line naming the picks of two questions is the flow summary and the note after the last control its stage note', () => {
	const { skeleton, proposal } = canvasRun( CANVAS );
	const flow = skeleton.find( ( n ) => 'sgs/choice-flow' === n.name );
	assert.equal( flow.attributes.showPricePanel, true );
	assert.equal( flow.attributes.summaryPosition, 'end', 'the summary sits after the questions in the document' );
	assert.equal( flow.attributes.stageNote, 'Ships in two days' );
	const row = ( k ) => proposal.rows.find( ( r ) => r.key === k );
	assert.match( row( 'Root/21#0' ).reason, /the flow summary/ );
	assert.match( row( 'Root/19#0' ).reason, /the flow summary/, 'the card holding the live line is the summary panel' );
	assert.match( row( 'Root/34#0' ).reason, /stageNote/ );
	// Negative controls: a live line naming one question's picks is no summary, and with no summary panel the note is no stage note.
	const one = canvasRun( CANVAS.map( ( x ) => ( 21 === x.n ? { ...x, text: [ 'Oat only' ] } : x ) ) ).skeleton.find( ( n ) => 'sgs/choice-flow' === n.name );
	assert.equal( one.attributes.showPricePanel, undefined );
	assert.equal( one.attributes.stageNote, undefined );
	// A note before the last control is no stage note.
	const early = canvasRun( [ ...without( CANVAS, 34 ), E( 34, 'div', 18, { words: 'Ships in two days', rendered: R0 } ), E( 35, 'button', 18, { click: 'shareIt', words: 'Share', rendered: R0 } ) ] ).skeleton.find( ( n ) => 'sgs/choice-flow' === n.name );
	assert.equal( early.attributes.stageNote, undefined );
	// A label of digits alone names nothing: with the second question's options numbers, the line names one question.
	const digits = CANVAS.map( ( x ) => ( 17 === x.n ? { ...x, text: [ '8', '20' ] } : 21 === x.n ? { ...x, text: [ '20 Oat' ] } : x ) );
	assert.equal( canvasRun( digits ).skeleton.find( ( n ) => 'sgs/choice-flow' === n.name ).attributes.showPricePanel, undefined );
} );

test( 'MUST FAIL: pressable buttons choosing one of two are a question whose revealing option opens the revealed question as its step', () => {
	const { skeleton, proposal } = canvasRun( CANVAS );
	const flow = skeleton.find( ( n ) => 'sgs/choice-flow' === n.name );
	const steps = flow.innerBlocks.map( ( s ) => s.innerBlocks.map( ( k ) => [ k.name, k.attributes.question ?? k.attributes.action ] ) );
	assert.deepEqual( steps, [
		[ [ 'sgs/choice-flow-question', 'Base' ] ],
		[ [ 'sgs/choice-flow-question', 'Topping' ] ],
		[ [ 'sgs/choice-flow-question', '' ] ],
		[ [ 'sgs/choice-flow-question', '' ] ],
		[ [ 'sgs/choice-flow-result', 'add-to-bag' ] ],
	] );
	assert.deepEqual( flow.innerBlocks[ 2 ].innerBlocks[ 0 ].attributes, { question: '', options: [ { label: 'Repeat order', value: 'repeat-order', description: 'Pause any time', isDefault: true, nextStepId: '3' }, { label: 'Just once', value: 'just-once', nextStepId: '4' } ], showNextStepInline: true } );
	assert.deepEqual( flow.innerBlocks[ 3 ].innerBlocks[ 0 ].attributes.options.map( ( o ) => o.label ), [ 'Weekly', 'Monthly' ] );
	assert.ok( flow.handover.some( ( h ) => 'product-data' === h.owner && h.detail.includes( '£9.00' ) ), 'the buttons\' prices are handed over' );
	const row = ( k ) => proposal.rows.find( ( r ) => r.key === k );
	assert.match( row( 'Root/23#0' ).reason, /sgs\/choice-flow-question/ );
	assert.match( row( 'Root/31#0' ).reason, /sgs\/choice-flow-question/ );
	// Negative controls: buttons with no pressed state, or a lone pressable button, are no question: they stay gap rows.
	const plain = canvasRun( CANVAS.map( ( x ) => ( [ 23, 31 ].includes( x.n ) ? { ...x, pressed: undefined } : x ) ) );
	assert.deepEqual( gapKeys( plain.proposal ), [ 'Root/23#0', 'Root/31#0' ] );
	const lone = canvasRun( without( CANVAS, 31, 32 ) );
	assert.deepEqual( gapKeys( lone.proposal ), [ 'Root/23#0' ] );
	// Two pressable buttons inside a loop item are no choice of how to buy: they stay gap rows.
	const looped = canvasRun( [ ...CANVAS, E( 40, 'div', 3, { rendered: R0 } ), E( 41, 'sc-for', 40, { items: 2, as: 'r' } ), E( 42, 'div', 41, { rendered: R01 } ), E( 43, 'button', 42, { click: 'voteUp', pressed: false, words: 'Up', rendered: R01 } ), E( 44, 'button', 42, { click: 'voteDown', pressed: false, words: 'Down', rendered: R01 } ) ] );
	assert.deepEqual( gapKeys( looped.proposal ), [ 'Root/43#0', 'Root/44#0', 'Root/43#1', 'Root/44#1' ] );
	// The choice sits where its buttons sit: a question after it in the document is a later step, the one its other option reaches.
	const moved = canvasRun( [ ...CANVAS, E( 40, 'div', 18, { rendered: R0 } ), E( 41, 'div', 40, { words: '3 · Extras', rendered: R0 } ), E( 42, 'div', 40, { rendered: R0 } ), E( 43, 'sc-for', 42, { items: 2, as: 'o' } ), E( 44, 'button', 43, { click: 'o.pick', text: [ 'Jam', 'Honey' ], rendered: R01 } ) ] );
	const movedFlow = moved.skeleton.find( ( n ) => 'sgs/choice-flow' === n.name );
	assert.deepEqual( movedFlow.innerBlocks.map( ( st ) => st.attributes.label ), [ 'Base', 'Topping', '', '', 'Extras', '' ] );
	assert.deepEqual( movedFlow.innerBlocks[ 2 ].innerBlocks[ 0 ].attributes.options.map( ( o ) => o.nextStepId ), [ '3', '4' ] );
	// An option going past the revealed step with no step after it has no next step, and a note says so.
	const ends = canvasRun( without( CANVAS, 33 ) );
	const endsFlow = ends.skeleton.find( ( n ) => 'sgs/choice-flow' === n.name );
	assert.deepEqual( endsFlow.innerBlocks[ 2 ].innerBlocks[ 0 ].attributes.options.map( ( o ) => o.nextStepId ), [ '3', undefined ] );
	assert.match( ends.proposal.choiceFlow.notes.join( ' ' ), /"Just once" goes past the step another option opens/ );
} );

test( 'MUST FAIL: words outside the steps are ordinary blocks beside the flow in its post, before or after it by document order', () => {
	const { skeleton, proposal } = canvasRun( CANVAS );
	assert.deepEqual( skeleton.map( ( n ) => n.name ), [ 'sgs/container', 'sgs/choice-flow' ], 'the heading group sits before the flow' );
	assert.deepEqual( names( [ skeleton[ 0 ] ] ), [ 'sgs/container', 'sgs/text', 'sgs/heading', 'sgs/text' ] );
	assert.equal( skeleton[ 1 ].attributes.title, undefined, 'a heading with words around it is no flow title' );
	assert.deepEqual( gapKeys( proposal ), [] );
	for ( const k of [ 'Root/4#0', 'Root/5#0', 'Root/6#0', 'Root/7#0' ] ) {
		const r = proposal.rows.find( ( x ) => x.key === k );
		assert.notEqual( r.rule, 'choiceFlow', `${ k } is built by the ordinary rules` );
		assert.equal( r.into, undefined );
	}
	assert.equal( proposal.rows.filter( ( r ) => 'Root/6#0' === r.key ).length, 1, 'one row per element' );
	const at = ( k ) => proposal.rows.findIndex( ( r ) => r.key === k );
	assert.ok( at( 'Root/3#0' ) < at( 'Root/4#0' ) && at( 'Root/7#0' ) < at( 'Root/8#0' ), 'the rebuilt rows keep their place in the row book' );
	// A line after the questions with no summary panel to hold it goes after the flow.
	const after = canvasRun( CANVAS.map( ( x ) => ( 21 === x.n ? { ...x, text: [ 'Oat only' ] } : x ) ) ).skeleton;
	assert.deepEqual( after.map( ( n ) => n.name ), [ 'sgs/container', 'sgs/choice-flow', 'sgs/container', 'sgs/text' ], 'the card holding the line, then the note' );
	// Negative controls: a heading on its own is the flow title; no page-map row, no flow and no siblings.
	const lone = canvasRun( without( CANVAS, 5, 7 ) ).skeleton;
	assert.deepEqual( lone.map( ( n ) => n.name ), [ 'sgs/choice-flow' ] );
	assert.equal( lone[ 0 ].attributes.title, 'Build a box' );
	assert.ok( ! run( CANVAS, { kind: 'form', pageMap: [] } ).skeleton.some( ( n ) => 'sgs/choice-flow' === n.name ) );
} );

test( 'MUST FAIL: only a control none of the flow\'s settings, questions or canvas can hold stays a gap row', () => {
	const extra = [ ...CANVAS, E( 35, 'div', 3, { rendered: R0 } ), E( 36, 'span', 35, { words: 'Tell a friend', rendered: R0 } ), E( 37, 'button', 35, { click: 'shareIt', words: 'Share', rendered: R0 } ) ];
	const { skeleton, proposal } = canvasRun( extra );
	assert.deepEqual( gapKeys( proposal ), [ 'Root/36#0', 'Root/37#0' ], 'a text beside a control stays with it as a gap, never moved apart' );
	assert.deepEqual( skeleton.map( ( n ) => n.name ), [ 'sgs/container', 'sgs/choice-flow', 'sgs/text' ], 'a note before the last control is a block after the flow, no stage note' );
	assert.equal( skeleton[ 1 ].attributes.stageNote, undefined );
	// Control: without the share control its words are a block after the flow (beside the note, so neither is the stage note).
	const words = canvasRun( without( extra, 37 ) );
	assert.deepEqual( gapKeys( words.proposal ), [] );
	assert.deepEqual( words.skeleton.map( ( n ) => [ n.name, n.draftRef?.tpl ] ), [ [ 'sgs/container', 'Root/4#0' ], [ 'sgs/choice-flow', 'Root/1#0' ], [ 'sgs/container', 'Root/35#0' ], [ 'sgs/text', 'Root/34#0' ] ], 'in document order: the first column, then the second' );
} );

// The header's basket drawer: a page-map cart row holds it as a block-owned part.
const DRAWER = [
	E( 1, 'aside', null, { attrs: { 'aria-label': 'Basket' }, rendered: R0 } ),
	E( 2, 'div', 1, { words: 'Your basket', rendered: R0 } ),
	E( 3, 'button', 1, { words: '×', click: 'closeBasket', rendered: R0 } ),
];
const CART = { slug: 'cart', postType: 'page', template: 'cart', parts: [ { kind: 'drawer', label: 'Basket', owner: 'block', draftId: 'Root.dc.html:9:3 <aside aria-label="Basket">' } ] };

test( 'MUST FAIL: a drawer the page map holds as the cart row\'s block-owned part is sgs/cart in drawer mode, never sgs/nav-drawer', () => {
	const r = run( DRAWER, { kind: 'drawer', pageMap: [ CART ] } );
	assert.deepEqual( r.skeleton.map( ( n ) => [ n.name, n.attributes, n.innerBlocks.length ] ), [ [ 'sgs/cart', { displayMode: 'drawer' }, 0 ] ] );
	assert.ok( r.proposal.rows.slice( 1 ).every( ( x ) => 'absorbed' === x.action && 'blockOwnedPart' === x.rule ) );
	assert.deepEqual( r.proposal.surfaceRole, { role: 'blockPart', row: 'cart', part: 'Basket' } );
	// Negative controls: no page map keeps the drawer rule; a header holding the same element is never the part.
	assert.equal( run( DRAWER, { kind: 'drawer', pageMap: [] } ).skeleton[ 0 ].name, 'sgs/nav-drawer' );
	assert.notEqual( run( DRAWER, { kind: 'header', pageMap: [ CART ] } ).skeleton[ 0 ].name, 'sgs/cart' );
	const elsewhere = { ...CART, parts: [ { ...CART.parts[ 0 ], draftId: 'Root.dc.html:9:3 <aside aria-label="Filters">' } ] };
	assert.equal( run( DRAWER, { kind: 'drawer', pageMap: [ elsewhere ] } ).skeleton[ 0 ].name, 'sgs/nav-drawer', 'a part naming another aria-label is another surface' );
	// A part of a row whose template names no owning block leaves the root to the scoring, still never the navigation drawer.
	const other = run( DRAWER, { kind: 'drawer', pageMap: [ { ...CART, template: 'page' } ] } ).skeleton[ 0 ].name;
	assert.notEqual( other, 'sgs/nav-drawer' );
	assert.notEqual( other, 'sgs/cart' );
} );

test( 'surfaceRole and parseTagId read the page map, never a name', () => {
	assert.deepEqual( parseTagId( 'Root.dc.html:9:3 <aside aria-label="Basket">' ), { component: 'Root', tag: 'aside', ariaLabel: 'Basket' } );
	assert.deepEqual( parseTagId( 'Root.dc.html:9:3 <div>' ), { component: 'Root', tag: 'div', ariaLabel: null } );
	assert.equal( parseTagId( 'surfaces.json S-01' ), null );
	assert.equal( surfaceRole( { pageMap: [ FLOW_ROW ], id: 'S-10' } ), null, 'another surface\'s row is not this one\'s' );
	assert.equal( surfaceRole( { pageMap: [ { ...FLOW_ROW, postType: 'sgs_modal' } ], id: 'S-09' } ), null );
	assert.equal( surfaceRole( { pageMap: [ FLOW_ROW ], id: 'S-09' } ).role, 'choiceFlow' );
} );

test( 'decisionsProblems refuses a choiceFlow or blockOwnedPart entry naming no block or an unknown one', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	assert.ok( decisionsProblems( facts( ( r ) => delete r.choiceFlow.question ) ).some( ( p ) => /rules\.choiceFlow must name/.test( p ) ) );
	assert.ok( decisionsProblems( facts( ( r ) => ( r.blockOwnedPart.byTemplate.cart.block = 'sgs/no-such-block' ) ) ).some( ( p ) => /blockOwnedPart\.byTemplate\.cart/.test( p ) ) );
} );
