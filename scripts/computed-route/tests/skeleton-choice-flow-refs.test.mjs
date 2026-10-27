// The draft elements a choice flow's nodes read (Spec 48 FR-48-6, rules.choiceFlow.slots; lib/skeleton-choice-flow-refs.mjs):
// every node made from a rendered draft element carries it (draftRef), and the flow's and each question's own pieces are
// draftSlots at the calibrated slot of the setting the rule names. Tests marked MUST FAIL fail on the writer that linked only
// the question containers; each carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import { attrsFor } from '../lib/db.mjs';
import { E, R0, R01, FLOW, run, db } from './fixtures/choice-flow-fixture.mjs';

// FLOW with the pieces the flow root reads drawn: an eyebrow in the header, a help toggle beside each option button, Continue
// and Back in the footer beside Add to bag, the summary's help note (its words in one inner box) shown again under the
// questions (its words in one inner box too), and the second question (with its two panels) rendered, its upload panel's field
// a text input.
const RENDER = new Set( [ 26, 27, 28, 29, 34, 35, 36, 38, 39, 40 ] );
const DRAWN = [
	...FLOW.map( ( x ) => ( RENDER.has( x.n ) ? { ...x, rendered: R0 } : [ 31, 32 ].includes( x.n ) ? { ...x, rendered: R01 } : x ) ).map( ( x ) => ( 40 === x.n ? { ...x, attrs: { type: 'text' } } : [ 8, 9 ].includes( x.n ) ? { ...x, parent: 59 } : x ) ),
	E( 52, 'span', 2, { text: [ 'Step one' ], rendered: R0 } ),
	E( 53, 'button', 18, { words: '?', click: 'o.help', rendered: R01 } ),
	E( 54, 'button', 41, { words: 'Continue', click: 'goNext', rendered: R0 } ),
	E( 55, 'button', 41, { words: 'Back', click: 'goBack', rendered: R0 } ),
	E( 56, 'a', 10, { attrs: { href: 'https://example.com/help' }, rendered: R0 } ),
	E( 57, 'span', 56, { rendered: R0 } ),
	E( 58, 'span', 57, { words: 'Need a hand?', rendered: R0 } ),
	E( 60, 'span', 57, { words: 'Message us any time.', rendered: R0 } ),
	E( 59, 'span', 7, { rendered: R0 } ),
];
const SLOT = ( s ) => ( { slot: s, slots: [ s ] } );
const INPUT = '.sgs-form__inner > .sgs-form-field:nth-of-type(2) > .sgs-form-field__input';
const CAL = {
	'sgs/choice-flow': { headerLogoHeight: SLOT( '.logo' ), headerEyebrowColour: SLOT( '.eyebrow' ), backColourBackground: SLOT( '.back' ), flexWrap: SLOT( '.actions' ), summaryNoteColour: SLOT( '.note' ), stageNoteBorderColour: SLOT( '.copy' ), infoToggleColour: SLOT( '.help' ) },
	'sgs/choice-flow-question': { questionFontWeight: SLOT( '.title' ), introWidth: SLOT( '.intro' ), optionDescriptionFontSize: SLOT( '.desc' ) },
	'sgs/form': Object.fromEntries( attrsFor( db, 'sgs/form' ).filter( ( r ) => 'field-input' === r.css_element ).map( ( r ) => [ r.attr_name, SLOT( INPUT ) ] ) ),
};
const calKeys = ( b ) => ( 'sgs/form-field-text' === b ? [ '.sgs-form-field__input' ] : [] );
const tpl = ( n, c = 0 ) => ( { tpl: `Root/${ n }#${ c }` } );

test( 'MUST FAIL: the flow root reads its own pieces and each question its heading, intro and first option description', () => {
	const { skeleton, proposal, problems } = run( DRAWN, { calSettings: ( b ) => CAL[ b ] || {}, calKeys } );
	assert.deepEqual( problems, [] );
	const [ flow ] = skeleton;
	assert.deepEqual( flow.draftRef, tpl( 1 ) );
	assert.deepEqual( flow.draftSlots, { '.logo': tpl( 3 ), '.eyebrow': tpl( 52 ), '.back': tpl( 55 ), '.actions': tpl( 41 ), '.note': tpl( 7 ), '.copy': tpl( 56 ), '.help': tpl( 53 ) } );
	assert.deepEqual( proposal.rows.find( ( r ) => 'Root/1#0' === r.key ).slots, flow.draftSlots, 'the root row lists the slots the node carries' );
	const [ s1, s2, s3, s4 ] = flow.innerBlocks;
	assert.deepEqual( s1.innerBlocks[ 0 ].draftSlots, { '.title': tpl( 14 ), '.intro': tpl( 15 ), '.desc': tpl( 22 ) } );
	assert.deepEqual( s2.innerBlocks[ 0 ].draftRef, tpl( 26 ), 'a rendered later question reads its container' );
	assert.deepEqual( s2.innerBlocks[ 0 ].draftSlots, { '.title': tpl( 28 ) } );
	// The draft draws a question's step and its question as one element, which the question takes: one element, one node.
	assert.equal( s1.draftRef, undefined );
	assert.equal( s2.draftRef, undefined );
	// A panel's step reads the panel's own element; its field reads its control, also the field's input part.
	assert.deepEqual( s3.draftRef, tpl( 34 ) );
	assert.deepEqual( s4.draftRef, tpl( 38 ) );
	const field = s4.innerBlocks[ 0 ];
	assert.equal( field.name, 'sgs/form-field-text' );
	assert.deepEqual( [ field.draftRef, field.draftSlots ], [ tpl( 40 ), { '.sgs-form-field__input': tpl( 40 ) } ] );
	assert.equal( s3.innerBlocks[ 0 ].draftRef, undefined, 'a panel\'s result shares the panel\'s element, which its step takes' );
	assert.ok( [ flow, ...flow.innerBlocks ].every( ( n ) => ! n.draftFingerprint || n.draftRef ), 'a fingerprint goes only with a draftRef' );
} );

test( 'MUST FAIL: a piece whose setting the calibration lacks gets no slot and a note; an unrendered step reads nothing', () => {
	const cal = { ...CAL, 'sgs/choice-flow': { ...CAL[ 'sgs/choice-flow' ], flexWrap: undefined } };
	const r = run( DRAWN, { calSettings: ( b ) => cal[ b ] || {}, calKeys } );
	assert.equal( r.skeleton[ 0 ].draftSlots[ '.actions' ], undefined );
	assert.ok( r.proposal.rows.find( ( x ) => 'Root/1#0' === x.key ).slotNotes.some( ( n ) => /no slot for flexWrap.*actions \(Root\/41#0\)/.test( n ) ) );
	// Control: FLOW as drawn shows only the first question, so the later steps, their fields and results read nothing.
	const plain = run( FLOW, { calSettings: ( b ) => CAL[ b ] || {}, calKeys } ).skeleton[ 0 ];
	assert.deepEqual( plain.innerBlocks.slice( 1 ).flatMap( ( s ) => [ s, ...s.innerBlocks ] ).filter( ( n ) => undefined !== n.draftRef ), [] );
	assert.deepEqual( Object.keys( plain.draftSlots ), [ '.logo', '.note' ], 'no eyebrow, Back, Continue box or help toggle in FLOW' );
	// Control: with no calibration at all no slot is given, and the containers still read.
	const bare = run( DRAWN ).skeleton[ 0 ];
	assert.equal( bare.draftSlots, undefined );
	assert.deepEqual( bare.innerBlocks[ 0 ].innerBlocks[ 0 ].draftRef, tpl( 12 ) );
} );
