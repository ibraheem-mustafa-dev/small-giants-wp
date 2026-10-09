// Proves triage (Session B1): a setting an extension provides is never labelled F (MUST FAIL); a box row that follows
// an open style row on its parent by the same amount is W, a consequence (MUST FAIL); a row nothing fits and the
// resolver finds no setting for is F, with the stylesheet rule that declares it; a mid-animation row and a used size
// are W; a value the tree can hold is T, and one the node already holds is F, a hardcode; a row from a walker state the
// surface maps to no setting state is W, unmapped-state, whatever its property (MUST FAIL), and never steals a key a
// Solve class already holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { triage, nameFits, rosterApplies, settingFits, canvasSettable } from '../lib/triage.mjs';
import { withInnerRootAliases } from '../solve.mjs';

const row = ( over = {} ) => ( { kind: 'style', key: 'margin-top', draft: '10px', live: '0px', ref: 'cr-ref-s-1', path: '.sgs-field__input', owners: [], pair: 'field', state: 'rest', width: 375, accepted: null, ...over } );
// A walker report: one run per width, each pair with its draft snapshot and its open rows.
const walkOf = ( rows, drafts = {} ) => {
	const runs = {};
	for ( const r of rows ) {
		const run = ( runs[ r.width ] ||= { state: 'rest', width: r.width, pairs: {} } );
		( run.pairs[ r.pair ] ||= { draft: drafts[ r.pair ] || { styles: {} }, live: { trace: { ref: r.ref } }, diffs: [] } ).diffs.push( r );
	}
	return { runs: Object.values( runs ) };
};
const reportOf = ( classes ) => ( { classes: { hardcode: [], missing: [], unresolved: [], derived: [], other: [], ...classes }, gaps: {}, writes: [] } );
const ctxOf = ( over = {} ) => ( {
	stateMap: { rest: null },
	nodeFor: ( ref ) => ( { 'cr-ref-s-1': { name: 'sgs/field-textarea', attributes: {} }, 'cr-ref-s-2': { name: 'sgs/card', attributes: {} } }[ ref ] || null ),
	ancestorsOf: ( ref ) => ( 'cr-ref-s-2' === ref ? [ 'cr-ref-s-1' ] : [] ),
	attrRows: () => [ { attr_name: 'rows', css_property: null, source: 'sgs' }, { attr_name: 'label', css_property: null, source: 'sgs' } ],
	roster: [],
	supportsFor: () => ( {} ),
	calFor: () => null,
	readSource: () => null,
	resolver: () => ( { gap: 'no-setting', detail: 'no setting' } ),
	...over,
} );
const run = ( classes, rows, ctx, drafts ) => triage( reportOf( classes ), walkOf( rows, drafts ), 's', ctx );

test( 'MUST FAIL: a textarea width an extension setting provides is never labelled F', () => {
	const r = row( { key: 'max-width', draft: 'none', live: '100%' } );
	const roster = [ { id: 'fieldSizing', rule: { mode: 'flag', flag: 'fieldSizing' }, attributes: { sgsFieldMaxWidth: { css_property: 'max-width', css_element: 'input' }, sgsFieldTone: { css_property: 'color' } } } ];
	const { verdicts } = run( { missing: [ r ] }, [ r ], ctxOf( { roster, supportsFor: () => ( { sgs: { fieldSizing: true } } ) } ) );
	assert.equal( verdicts.length, 1 );
	assert.notEqual( verdicts[ 0 ].class, 'F' );
	assert.equal( verdicts[ 0 ].class, 'W' );
	assert.equal( verdicts[ 0 ].decidedBy, 'extension' );
	assert.deepEqual( verdicts[ 0 ].evidence.filter( ( e ) => 'extension' === e.check ).map( ( e ) => e.setting ), [ 'sgsFieldMaxWidth' ] );
} );

test( 'an extension the block does not opt into fits nothing', () => {
	const ext = { id: 'x', rule: { mode: 'allowlist', enabledSlug: 'x', requiresClassName: true } };
	assert.equal( rosterApplies( ext, 'sgs/a', { sgs: { enabledExtensions: [ 'x' ] } } ), true );
	assert.equal( rosterApplies( ext, 'sgs/a', { sgs: { enabledExtensions: [ 'x' ] }, className: false } ), false );
	assert.equal( rosterApplies( ext, 'sgs/a', {} ), false );
	assert.equal( rosterApplies( { rule: { mode: 'universal', hideSlug: 'p' } }, 'sgs/a', { sgs: { hideExtensions: [ 'p' ] } } ), false );
} );

test( 'MUST FAIL: a box row following an open style row on its parent by the same amount is W, a consequence', () => {
	const parent = row( { key: 'padding-top', draft: '24px', live: '0px', ref: 'cr-ref-s-1', path: '', pair: 'section' } );
	const box = row( { kind: 'box', key: 'y', draft: 100, live: 76, ref: 'cr-ref-s-2', path: '', pair: 'card' } );
	const { verdicts } = run( { missing: [ parent ], derived: [ box ] }, [ parent, box ] , ctxOf() );
	const v = verdicts.find( ( x ) => 'box' === x.kind );
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'consequence' );
	assert.equal( v.evidence[ 0 ].parent, 'cr-ref-s-1||style|padding-top' );
	assert.equal( v.evidence[ 0 ].relation, 'ancestor' );
	assert.equal( v.evidence[ 0 ].match, 'same-delta' );
} );

test( 'a box row nothing open explains stays unexplained (U), never W', () => {
	const parent = row( { key: 'color', draft: '#000', live: '#111', ref: 'cr-ref-s-1', path: '', pair: 'section' } );
	const box = row( { kind: 'box', key: 'y', draft: 100, live: 76, ref: 'cr-ref-s-2', path: '', pair: 'card' } );
	const v = run( { missing: [ parent ], derived: [ box ] }, [ parent, box ], ctxOf() ).verdicts.find( ( x ) => 'box' === x.kind );
	assert.equal( v.class, 'U' );
} );

test( 'positive control: no fitting setting anywhere and the resolver finds none is F, with the rule declaring it', () => {
	const r = row();
	const css = '/* field */\n.sgs-field__input { margin-top: 0; color: red; }\n@media (min-width: 600px) { .sgs-field__input--wide { margin-top: 4px; } }\n.sgs-other { margin-top: 2px; }';
	const php = '<?php $rows = $attributes[\'rows\'];';
	const ctx = ctxOf( { readSource: ( slug, file ) => ( 'field-textarea' === slug ? { 'style.css': css, 'render.php': php }[ file ] : null ) } );
	const { verdicts, counts } = run( { missing: [ r ] }, [ r ], ctx );
	assert.equal( verdicts[ 0 ].class, 'F' );
	assert.equal( verdicts[ 0 ].decidedBy, 'no-setting' );
	assert.equal( counts.F, 1 );
	assert.deepEqual( verdicts[ 0 ].source.rules.map( ( x ) => x.selector ), [ '.sgs-field__input' ] );
	assert.deepEqual( verdicts[ 0 ].source.render[ 0 ].mentions, [] );
	assert.ok( verdicts[ 0 ].source.render[ 0 ].absent.includes( 'marginTop' ) );
} );

test( 'a database row with no css_property fits by name (max-width ↔ width), so the row is W (uncalibrated: no calibration measured it)', () => {
	const r = row( { key: 'max-width', draft: 'none', live: '100%' } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows: () => [ { attr_name: 'width', css_property: null, source: 'sgs' } ] } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'uncalibrated-fit' );
	assert.equal( nameFits( 'max-width', 'contentWidth' ), true );
	assert.equal( nameFits( 'max-width', 'borderWidth' ), false );
	assert.equal( nameFits( 'padding-top', 'fieldPadding' ), true );
	assert.equal( nameFits( 'transform', 'textTransform' ), false );
	assert.equal( nameFits( 'height', 'lineHeight' ), false );
	assert.equal( nameFits( 'color', 'fieldTextColour' ), true );
} );

test( 'an enum setting calibration saw paint the property on the element is a fitting setting, so the row is W', () => {
	const r = row( { key: 'align-items', draft: 'normal', live: 'flex-start', path: '' } );
	const calFor = () => ( { discovered: { layout: { 'align-items': { slots: [ '' ], values: { list: { 768: 'stretch' } } } } } } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { calFor, resolver: () => ( { gap: 'no-setting', detail: 'none' } ) } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.deepEqual( v.evidence.find( ( e ) => 'discovered' === e.check ), { check: 'discovered', block: 'sgs/field-textarea', setting: 'layout', values: [ 'list' ] } );
} );

// A setting whose name fits but that calibration never measured (Contact 2026-10-08: sgs/text firstLetterColour, which
// paints ::first-letter, "fitting" a link's hover colour): its reach is unknown, so the row is labelled for what it is.
test( 'MUST FAIL: a name-fitting setting calibration never measured decides W as uncalibrated-fit, never attribute', () => {
	const r = row( { kind: 'hover', key: 'color', draft: 'rgb(31, 107, 92)', live: 'rgb(20, 20, 20)', path: 'a' } );
	const attrRows = () => [ { attr_name: 'firstLetterColour', css_property: 'color', css_element: 'first-letter', source: 'sgs' } ];
	const calFor = () => ( { elements: { '': {} }, settings: { textColour: { slot: '', slots: [ '' ] } } } );
	const v = run( { unresolved: [ r ] }, [ r ], ctxOf( { attrRows, calFor, stateMap: { rest: null } } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'uncalibrated-fit' );
} );

test( 'positive control: a fitting setting calibration measured reaching the element decides W as attribute', () => {
	const r = row( { key: 'line-height', draft: '16px', live: '19.5px', path: '.sgs-field__button' } );
	const attrRows = () => [ { attr_name: 'lineHeight', css_property: 'line-height', css_element: 'wrapper', source: 'sgs' } ];
	const calFor = () => ( { elements: { '': {}, '.sgs-field__button': {} }, settings: { lineHeight: { slot: '', slots: [ '' ], reaches: [ '', '.sgs-field__button' ] } } } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows, calFor } ) ).verdicts[ 0 ];
	assert.equal( v.decidedBy, 'attribute' );
} );

test( 'a fitting setting calibration measured not reaching the element never decides', () => {
	const r = row( { key: 'line-height', draft: '16px', live: '19.5px', path: '.sgs-field__button' } );
	const attrRows = () => [ { attr_name: 'lineHeight', css_property: 'line-height', css_element: 'wrapper', source: 'sgs' }, { attr_name: 'lineHeightUnit', css_property: null, source: 'sgs' } ];
	const calFor = () => ( { elements: { '': {}, '.sgs-field__button': {} }, settings: { lineHeight: { slot: '', slots: [ '' ], reaches: [ '', '.sgs-field__label' ] } } } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows, calFor } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'F' );
	assert.equal( v.evidence.find( ( e ) => 'attribute' === e.check ).reaches, false );
} );

// P3d: a start-value shape is transient only when the SAME side's snapshot shows an animation in flight (the walker's
// `running` list, and its keyframes when recorded). A resting opacity of 0.75 has the same shape and is a real difference.
const animWalk = ( r, { draft = {}, live = {} } = {} ) => ( { runs: [ { state: r.state, width: r.width, pairs: { [ r.pair ]: {
	draft: { styles: {}, running: [], keyframes: 'none', ...draft }, live: { trace: { ref: r.ref }, running: [], keyframes: 'none', ...live }, diffs: [ r ] } } } ] } );
const runAnim = ( r, snaps ) => triage( reportOf( { missing: [ r ] } ), animWalk( r, snaps ), 's', ctxOf() ).verdicts[ 0 ];

test( 'a mid-animation opacity row is W, transient: the side at the start value is running an animation that animates opacity', () => {
	const r = row( { key: 'opacity', draft: '0', live: '1', path: '' } );
	const v = runAnim( r, { draft: { running: [ 'animation 500ms linear' ], keyframes: '0%{opacity:0}100%{opacity:1}' } } );
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'transient' );
} );

test( 'MUST FAIL: a resting opacity of 0.75 on an element running no animation is reported, never classed transient', () => {
	const r = row( { key: 'opacity', draft: '0.75', live: '1', path: '' } );
	const v = runAnim( r, {} );
	assert.notEqual( v.decidedBy, 'transient' );
	assert.ok( ! v.evidence.some( ( e ) => 'transient' === e.check ) );
	assert.equal( v.class, 'F' );
	assert.equal( v.decidedBy, 'no-setting' );
} );

test( 'a start-value shape on one side is not excused by an animation running on the OTHER side', () => {
	const r = row( { key: 'opacity', draft: '0.75', live: '1', path: '' } );
	const v = runAnim( r, { live: { running: [ 'animation 500ms linear' ], keyframes: '0%{opacity:0}100%{opacity:1}' } } );
	assert.ok( ! v.evidence.some( ( e ) => 'transient' === e.check ) );
	assert.equal( v.class, 'F' );
} );

test( 'an animation that animates another property does not excuse an opacity row, but a transform one is transient', () => {
	const slide = { running: [ 'animation 500ms linear' ], keyframes: '0%{transform:translateY(18px)}100%{transform:none}' };
	const op = row( { key: 'opacity', draft: '0.75', live: '1', path: '' } );
	assert.ok( ! runAnim( op, { draft: slide } ).evidence.some( ( e ) => 'transient' === e.check ) );
	const tr = row( { key: 'transform', draft: 'matrix(1, 0, 0, 1, 0, 18)', live: 'none', path: '' } );
	assert.equal( runAnim( tr, { draft: slide } ).decidedBy, 'transient' );
} );

test( 'a width the draft never declares is W, a used value; a declared one the tree can hold is T', () => {
	const r = row( { key: 'width', draft: '243px', live: '240px' } );
	const used = run( { unresolved: [ r ] }, [ r ], ctxOf() ).verdicts[ 0 ];
	assert.equal( used.class, 'W' );
	assert.equal( used.decidedBy, 'used-value' );
	const resolver = ( input ) => ( { writes: [ { attr: 'width', value: input.perWidth[ 375 ], merge: 'replace' } ] } );
	const declared = run( { unresolved: [ r ] }, [ r ], ctxOf( { resolver } ), { field: { styles: { width: '243px' }, declared: { width: '50%' } } } ).verdicts[ 0 ];
	assert.equal( declared.class, 'T' );
	assert.deepEqual( declared.evidence.find( ( e ) => 'resolver' === e.check ).wouldWrite, [ 'width' ] );
} );

test( 'a value the node already holds while paint differs is F, a hardcode', () => {
	const r = row( { key: 'gap', draft: '0px', live: '16px', path: '' } );
	const nodeFor = ( ref ) => ( 'cr-ref-s-1' === ref ? { name: 'sgs/box', attributes: { gap: { desktop: '0px' } } } : null );
	const resolver = () => ( { writes: [ { attr: 'gap', value: { desktop: '0px' }, merge: 'deep' } ] } );
	const v = run( { hardcode: [ r ] }, [ r ], ctxOf( { nodeFor, resolver } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'F' );
	assert.equal( v.decidedBy, 'hardcode' );
	assert.ok( v.source );
} );

test( 'MUST FAIL: a box row from an unmapped walker state is W, unmapped-state, not U', () => {
	// Without the unmapped-state class this box row falls through to U, box-unexplained: nothing explains it, because the
	// state it was measured in is mapped to no setting state, so no parent row of that state is open to follow.
	const r = row( { kind: 'box', key: 'h', draft: 220, live: 180, ref: 'cr-ref-s-2', path: '', pair: 'card', state: 'filters-open', reason: 'unmapped-state filters-open' } );
	const { verdicts, counts } = run( { other: [ r ] }, [ r ], ctxOf() );
	assert.equal( verdicts.length, 1 );
	assert.notEqual( verdicts[ 0 ].class, 'U' );
	assert.equal( verdicts[ 0 ].class, 'W' );
	assert.equal( verdicts[ 0 ].decidedBy, 'unmapped-state' );
	assert.equal( counts.U, 0 );
	const ev = verdicts[ 0 ].evidence[ 0 ];
	assert.equal( ev.check, 'unmapped-state' );
	assert.deepEqual( ev.states, [ 'filters-open' ] );
	assert.deepEqual( ev.mappedStates, [ 'rest' ] );
} );

test( 'a style row from an unmapped walker state is W, unmapped-state, and never reaches the resolver', () => {
	const r = row( { key: 'gap', draft: '24px', live: '16px', state: 'panel-after-click', reason: 'unmapped-state panel-after-click' } );
	let asked = 0;
	const { verdicts } = run( { other: [ r ] }, [ r ], ctxOf( { resolver: () => ( asked++, { gap: 'no-setting', detail: 'no setting' } ) } ) );
	assert.equal( verdicts[ 0 ].class, 'W' );
	assert.equal( verdicts[ 0 ].decidedBy, 'unmapped-state' );
	assert.equal( asked, 0, 'an unmapped state cannot prove or disprove a setting, so the resolver is never asked' );
} );

test( 'an unmapped-state row never steals a key a Solve class already holds', () => {
	// The same element and property, open at rest and again in an unmapped state: one issue, under the Solve class, as
	// the sweep counts it (lib/sweep.mjs::issueRows).
	const rest = row( { key: 'gap', draft: '24px', live: '16px' } );
	const open = row( { key: 'gap', draft: '24px', live: '16px', state: 'filters-open', reason: 'unmapped-state filters-open' } );
	const { verdicts } = run( { unresolved: [ rest ], other: [ open ] }, [ rest, open ], ctxOf() );
	assert.equal( verdicts.length, 1 );
	assert.equal( verdicts[ 0 ].solveClass, 'unresolved' );
	assert.notEqual( verdicts[ 0 ].decidedBy, 'unmapped-state' );
} );

test( 'a non-visual row in `other` is not an issue', () => {
	// `motion`, not `text`: a text row is page content and is counted by design (lib/issue-classes.mjs::CONTENT_KINDS).
	const r = row( { kind: 'motion', key: 'transition-duration', state: 'filters-open', reason: 'unmapped-state filters-open' } );
	const { verdicts } = run( { other: [ r ] }, [ r ], ctxOf() );
	assert.equal( verdicts.length, 0 );
} );

// L6 handoff 1. A content row (text, presence, or a link the other side does not carry) is an open issue on the page,
// but no walker state is unmapped for it: filing it under `unmapped-state` published the evidence "the surface maps no
// setting state to this walker state", which is simply false of a row whose state IS mapped.
test( 'MUST FAIL: a content row is its own class, never unmapped-state, and its evidence is true of it', () => {
	const text = row( { kind: 'text', key: 'text', draft: 'Book an eye test', live: 'Book a test', path: '' } );
	const presence = row( { kind: 'presence', key: 'presence', draft: 'present', live: 'absent', path: '', pair: 'badge' } );
	const { verdicts, counts } = run( { other: [ text, presence ] }, [ text, presence ], ctxOf() );
	assert.equal( verdicts.length, 2 );
	for ( const v of verdicts ) {
		assert.equal( v.class, 'W' );
		assert.equal( v.decidedBy, 'content' );
		assert.equal( v.solveClass, 'content' );
		assert.equal( v.evidence[ 0 ].check, 'content' );
		assert.ok( ! v.evidence.some( ( e ) => 'unmapped-state' === e.check ), 'no content row carries unmapped-state evidence' );
	}
	assert.equal( counts.W, 2 );
	assert.equal( counts.F + counts.T + counts.U, 0 );
} );

test( 'a link-coverage row counts as content, and an ordinary `auto` word row does not count at all', () => {
	const missing = row( { kind: 'auto', key: 'link-missing:/eye-tests', path: '' } );
	const word = row( { kind: 'auto', key: 'word-3', path: '' } );
	assert.equal( run( { other: [ missing ] }, [ missing ], ctxOf() ).verdicts.length, 1 );
	assert.equal( run( { other: [ missing ] }, [ missing ], ctxOf() ).verdicts[ 0 ].decidedBy, 'content' );
	assert.equal( run( { other: [ word ] }, [ word ], ctxOf() ).verdicts.length, 0 );
} );

test( 'a content row never steals a key a Solve class already holds', () => {
	const held = row( { kind: 'text', key: 'text', path: '' } );
	const { verdicts } = run( { unresolved: [ held ], other: [ held ] }, [ held ], ctxOf() );
	assert.equal( verdicts.length, 1 );
	assert.equal( verdicts[ 0 ].solveClass, 'unresolved' );
} );

// ── FR-47-8 / R-47-12, canvas awareness, the triage half (L1.5) ──────────────────────────────────────────────────────
// The real mega-lenses mega-group padding row (sites/eye-care-ward-end/build/qa/solve/mega-lenses, 2026-10-05): row
// cr-ref-mega-lenses-1 on sgs/mega-group, path "", padding-top 26px against 0px, owner cr-ref-mega-lenses-0 =
// sgs/mega-panel. mega-lenses is `canvas: true` with states { "mega-lenses": null }. sgs/mega-group declares no
// padding setting; sgs/mega-panel declares panelPadding (css_property "padding", box family panelPadding).
const megaRow = ( over = {} ) => ( { kind: 'style', key: 'padding-top', draft: '26px', live: '0px', ref: 'cr-ref-mega-lenses-1', path: '', pair: 'lenses-card-single',
	owners: [ { ref: 'cr-ref-mega-lenses-0', block: 'sgs-mega-panel', path: '.sgs-mega-panel__content > .sgs-mega-group:nth-of-type(1)', tag: 'a' } ],
	state: 'mega-lenses', width: 1440, accepted: null, ...over } );
const runMega = ( classes, rows, ctx ) => triage( reportOf( classes ), walkOf( rows ), 'mega-lenses', ctx );
const megaCtx = ( canvas ) => ctxOf( {
	stateMap: { 'mega-lenses': null },
	canvas,
	nodeFor: ( ref ) => ( { 'cr-ref-mega-lenses-1': { name: 'sgs/mega-group', attributes: {} }, 'cr-ref-mega-lenses-0': { name: 'sgs/mega-panel', attributes: {} } }[ ref ] || null ),
	attrRows: ( block ) => ( 'sgs/mega-panel' === block
		? [ { attr_name: 'panelPadding', css_property: 'padding', css_element: 'wrapper', css_state: null, source: 'sgs' } ]
		: [] ),
	canvasBlocks: () => [ { ref: 'cr-ref-mega-lenses-0', name: 'sgs/mega-panel' }, { ref: 'cr-ref-mega-lenses-1', name: 'sgs/mega-group' } ],
	// The resolver and the ancestor hop both exhaust: the panel's calibration paints the panel root, not the group.
	resolver: () => ( { gap: 'no-setting', detail: 'sgs/mega-group has no setting for padding-top' } ),
	ancestorHop: () => null,
} );

test( 'MUST FAIL: on a canvas, a row a block already in that tree declares is W / canvas-settable, citing it', () => {
	const r = megaRow();
	const { verdicts, counts } = runMega( { unresolved: [ r ] }, [ r ], megaCtx( true ) );
	assert.equal( verdicts.length, 1 );
	assert.notEqual( verdicts[ 0 ].class, 'F' );
	assert.equal( verdicts[ 0 ].class, 'W' );
	assert.equal( verdicts[ 0 ].decidedBy, 'canvas-settable' );
	const cite = verdicts[ 0 ].evidence.find( ( e ) => 'canvas-settable' === e.check );
	assert.equal( cite.block, 'sgs/mega-panel' );
	assert.equal( cite.setting, 'panelPadding' );
	assert.equal( cite.where, 'ancestor' );
	assert.equal( counts.F, 0 );
} );

test( 'the negative control: with the canvas flag off, the same row classes F / no-setting', () => {
	const r = megaRow();
	const { verdicts, counts } = runMega( { unresolved: [ r ] }, [ r ], megaCtx( false ) );
	assert.equal( verdicts[ 0 ].class, 'F' );
	assert.equal( verdicts[ 0 ].decidedBy, 'no-setting' );
	assert.equal( counts.F, 1 );
	assert.ok( ! verdicts[ 0 ].evidence.some( ( e ) => 'canvas-settable' === e.check ), 'off a canvas, canvasSettable is never consulted' );
} );

test( 'a canvas sibling that declares the property is cited even when it is no ancestor of the row', () => {
	const r = megaRow( { owners: [] } );
	const v = runMega( { unresolved: [ r ] }, [ r ], megaCtx( true ) ).verdicts[ 0 ];
	assert.equal( v.decidedBy, 'canvas-settable' );
	assert.equal( v.evidence.find( ( e ) => 'canvas-settable' === e.check ).where, 'sibling' );
} );

test( 'MUST REFUSE THE CITATION: a block declaring the property in another state is never cited', () => {
	// A hover-state row against a resting declaration: citing it would claim a setting can hold a value it cannot.
	const r = megaRow( { kind: 'hover' } );
	const v = runMega( { unresolved: [ r ] }, [ r ], megaCtx( true ) ).verdicts[ 0 ];
	assert.ok( ! v.evidence.some( ( e ) => 'canvas-settable' === e.check ) );
	assert.equal( v.class, 'F' );
} );

// L1.2's half of settingFits: sgs/container::columns carries css_property "grid-template-columns:count", a modifier of
// a real property. Both product.json fits depend on it (2026-10-05 triage: two sgs/container grid-template-columns
// verdicts cite it), and a blanket strip of everything after the colon would also make "anim:duration" an unmatchable
// "anim".
test( 'MUST FAIL: a modifier row fits its property, and a pseudo-namespaced row fits what its leaf names', () => {
	assert.equal( settingFits( 'columns', { css_property: 'grid-template-columns:count' }, 'grid-template-columns' ), true );
	assert.equal( settingFits( 'sgsAnimationDuration', { css_property: 'anim:duration' }, 'animation-duration' ), true );
	assert.equal( settingFits( 'sgsAnimationEasing', { css_property: 'anim:easing' }, 'animation-timing-function' ), true );
	// And neither reading invents a fit: no stored value fits a property nothing names.
	assert.equal( settingFits( 'sgsAnimationDuration', { css_property: 'anim:duration' }, 'mask-composite' ), false );
	assert.equal( settingFits( 'sgsScrollPin', { css_property: 'fx:pin' }, 'position' ), false );
	const r = row( { key: 'grid-template-columns', draft: '1fr 1fr', live: 'none', path: '' } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows: () => [ { attr_name: 'columns', css_property: 'grid-template-columns:count', source: 'sgs' } ] } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'uncalibrated-fit' );
	assert.equal( v.evidence.find( ( e ) => 'attribute' === e.check ).setting, 'columns' );
} );

// L8.9: resolveIssue hands the ancestor hop the element paths it measured an open row of the row's property on
// (ctx.measuredSlots). Without them reachedDescendants counts none, so the hop's write branch can never run.
import { openDb } from '../lib/db.mjs';
const hopDb = openDb();
const HOP_PATHS = [ '.sgs-container__inner > h3', '.sgs-container__inner > p' ];
const hopRow = ( over = {} ) => row( { key: 'color', draft: 'rgb(138, 130, 120)', live: 'rgb(0, 0, 0)', ref: 'cr-ref-s-1', path: '', pair: 'head',
	owners: [ { ref: 'cr-ref-s-2', block: 'sgs-container', path: HOP_PATHS[ 0 ], tag: 'h3' } ], ...over } );
const hopNodes = { 'cr-ref-s-1': { name: 'sgs/heading', attributes: {} }, 'cr-ref-s-3': { name: 'sgs/heading', attributes: {} }, 'cr-ref-s-2': { name: 'sgs/container', attributes: {} } };
const hopCtx = ( over = {} ) => ctxOf( {
	db: hopDb,
	snapshot: { palette: [], spacing: [], fontSizes: [] },
	canvas: true,
	nodeFor: ( ref ) => hopNodes[ ref ] || null,
	calFor: ( block ) => ( 'sgs/container' === block ? { settings: { textColour: { property: 'color', slot: '', slots: [ '' ], reaches: [ '', ...HOP_PATHS ] } } } : null ),
	...over,
} );

test( 'MUST FAIL: the ancestor hop is given the element paths measured under its ancestors', () => {
	let seen = null;
	const r = hopRow();
	run( { unresolved: [ r ] }, [ r ], hopCtx( { ancestorHop: ( input, ctx ) => ( seen = ctx, null ) } ) );
	assert.deepEqual( seen.measuredSlots, [ HOP_PATHS[ 0 ] ] );
} );

test( 'MUST FAIL: with measuredSlots supplied the real hop writes the one-descendant ancestor setting, so the row is T', () => {
	const r = hopRow();
	const v = run( { unresolved: [ r ] }, [ r ], hopCtx(), { head: { styles: { color: 'rgb(138, 130, 120)' } } } ).verdicts[ 0 ];
	assert.equal( v.class, 'T' );
	assert.equal( v.decidedBy, 'resolver-writes' );
	assert.deepEqual( v.evidence.find( ( e ) => 'resolver' === e.check ).wouldWrite, [ 'textColour' ] );
} );

test( 'the negative control: two measured descendants under that ancestor refuse the write (R-47-5), so the row stays W with no write', () => {
	const a = hopRow();
	const b = hopRow( { pair: 'para', ref: 'cr-ref-s-3', owners: [ { ref: 'cr-ref-s-2', block: 'sgs-container', path: HOP_PATHS[ 1 ], tag: 'p' } ] } );
	const v = run( { unresolved: [ a, b ] }, [ a, b ], hopCtx(), { head: { styles: { color: 'rgb(138, 130, 120)' } }, para: { styles: { color: 'rgb(138, 130, 120)' } } } ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'enclosing' );
	assert.equal( v.evidence.find( ( e ) => 'resolver' === e.check ).wouldWrite, undefined );
} );

// R1: a control is credited with a row only when the selector it emits to can match the row's element. The emission is
// read from the PHP that writes it, here the real background-zoom helper.
import fs from 'node:fs';
import { helperIndex } from '../lib/triage-source.mjs';
const ZOOM_PHP = new URL( '../../../plugins/sgs-blocks/includes/container-bg-hover-zoom.php', import.meta.url );
const zoomHelpers = () => helperIndex( [ { file: 'includes/container-bg-hover-zoom.php', text: fs.readFileSync( ZOOM_PHP, 'utf8' ) } ] );
const ZOOM_ROWS = [
	{ attr_name: 'bgHoverZoomDuration', css_property: 'transition-duration', css_element: null, css_state: null, source: 'sgs' },
	{ attr_name: 'bgHoverZoomEasing', css_property: 'transition-timing-function', css_element: null, css_state: null, source: 'sgs' },
	{ attr_name: 'bgHoverZoomScale', css_property: 'transform', css_element: null, css_state: null, source: 'sgs' },
];
const zoomRow = ( key, path, over = {} ) => row( { key, draft: '0.35s', live: '0s', path, ref: 'cr-ref-s-1', pair: 'field',
	owners: [ { ref: 'cr-ref-s-2', block: 'sgs-container', path, tag: 'div' } ], ...over } );
const zoomCtx = ( over = {} ) => ctxOf( {
	canvas: true,
	nodeFor: ( ref ) => ( { 'cr-ref-s-1': { name: 'sgs/form-field-text', attributes: {} }, 'cr-ref-s-2': { name: 'sgs/container', attributes: {} } }[ ref ] || null ),
	attrRows: ( block ) => ( 'sgs/container' === block ? ZOOM_ROWS : [] ),
	canvasBlocks: () => [ { ref: 'cr-ref-s-2', name: 'sgs/container' } ],
	helpers: zoomHelpers(),
	ancestorHop: () => null,
	...over,
} );
const runZoom = ( r, ctx = zoomCtx() ) => triage( reportOf( { unresolved: [ r ] } ), walkOf( [ r ] ), 's', ctx ).verdicts[ 0 ];
const scaleOver = { draft: 'scale(1.05)', live: 'none' };

test( 'MUST FAIL: a bgHoverZoom control is never credited with a form input, which its emission selector cannot match', () => {
	for ( const key of [ 'transition-duration', 'transition-timing-function', 'transform' ] ) {
		const v = runZoom( zoomRow( key, '.sgs-form-field__input', 'transform' === key ? scaleOver : {} ) );
		assert.ok( ! v.evidence.some( ( e ) => 'canvas-settable' === e.check ), `${ key }: no citation` );
		assert.equal( v.class, 'F', key );
		assert.equal( v.decidedBy, 'no-setting', key );
	}
} );

test( 'not over-suppressing: the same controls ARE credited with the background layer they paint, .sgs-container__image-bg', () => {
	for ( const [ key, attr ] of [ [ 'transition-duration', 'bgHoverZoomDuration' ], [ 'transition-timing-function', 'bgHoverZoomEasing' ], [ 'transform', 'bgHoverZoomScale' ] ] ) {
		const v = runZoom( zoomRow( key, '.sgs-container__image-bg', 'transform' === key ? scaleOver : {} ) );
		assert.equal( v.class, 'W', key );
		assert.equal( v.decidedBy, 'canvas-settable', key );
		assert.equal( v.evidence.find( ( e ) => 'canvas-settable' === e.check ).setting, attr );
	}
} );

test( 'not over-suppressing: a control whose emission the source does not name keeps its property-name credit', () => {
	const v = runZoom( zoomRow( 'transition-duration', '.sgs-form-field__input' ), zoomCtx( { helpers: helperIndex( [] ) } ) );
	assert.equal( v.decidedBy, 'canvas-settable' );
} );

test( 'ctx.emissionFor names the emission selectors and decides before the source does', () => {
	const none = runZoom( zoomRow( 'transition-duration', '.sgs-form-field__input' ), zoomCtx( { helpers: helperIndex( [] ), emissionFor: () => [ '.uid > .sgs-container__image-bg' ] } ) );
	assert.equal( none.class, 'F' );
	const hit = runZoom( zoomRow( 'transition-duration', '.sgs-form-field__input' ), zoomCtx( { emissionFor: () => [ '.uid .sgs-form-field__input' ] } ) );
	assert.equal( hit.decidedBy, 'canvas-settable' );
} );

test( 'the resolver hop citation is held to the same emission selector', () => {
	const hop = () => ( { gap: 'canvas-settable', detail: 'cited', cite: { check: 'canvas-settable', ref: 'cr-ref-s-2', block: 'sgs/container', setting: 'bgHoverZoomDuration', property: 'transition-duration', via: 'declared' } } );
	const bare = { attrRows: () => [], canvasBlocks: () => [], ancestorHop: hop };
	const refused = runZoom( zoomRow( 'transition-duration', '.sgs-form-field__input' ), zoomCtx( bare ) );
	assert.equal( refused.class, 'F' );
	assert.ok( ! refused.evidence.some( ( e ) => 'canvas-settable' === e.check ) );
	const credited = runZoom( zoomRow( 'transition-duration', '.sgs-container__image-bg' ), zoomCtx( bare ) );
	assert.equal( credited.decidedBy, 'canvas-settable' );
} );

// ctx.measuredReach: a live measurement (confirm-canvas.mjs) decides a citation before the source gate does.
import { measuredReachFrom, reachabilityVerified } from '../lib/triage.mjs';

test( 'MUST FAIL ON REVERT: a citation measured unreachable is refused even where the source credits it', () => {
	const r = zoomRow( 'transition-duration', '.sgs-container__image-bg' );
	assert.equal( runZoom( r ).decidedBy, 'canvas-settable', 'the control: the source alone credits this citation' );
	const refuted = measuredReachFrom( [ { block: 'sgs/container', setting: 'bgHoverZoomDuration', property: 'transition-duration', verdict: 'NO-RULE', sheets: { skipped: 0 } } ] );
	const v = runZoom( r, zoomCtx( { measuredReach: refuted } ) );
	assert.equal( v.class, 'F' );
	assert.equal( v.decidedBy, 'no-setting' );
} );

test( 'not over-suppressing: an unmeasured citation still fails open, and a measured one is recorded as tested', () => {
	const none = measuredReachFrom( [] );
	const v = runZoom( zoomRow( 'transition-duration', '.sgs-form-field__input' ), zoomCtx( { helpers: helperIndex( [] ), measuredReach: none } ) );
	assert.equal( v.decidedBy, 'canvas-settable', 'no measurement and no readable source: the deliberate fail-open holds' );
	const issue = { rows: [ { key: 'transition-duration', path: '.sgs-form-field__input', ref: 'cr-ref-s-1' } ] };
	const cite = { block: 'sgs/container', setting: 'bgHoverZoomDuration' };
	const refuted = measuredReachFrom( [ { block: 'sgs/container', setting: 'bgHoverZoomDuration', property: 'transition-duration', verdict: 'REFUTED', sheets: { skipped: 0 } } ] );
	assert.equal( reachabilityVerified( cite, issue, { helpers: helperIndex( [] ), measuredReach: refuted } ), true );
	assert.equal( reachabilityVerified( cite, issue, { helpers: helperIndex( [] ), measuredReach: none } ), false );
} );

test( 'measuredReachFrom trusts only a clean refutation: CONFIRMED, ABSENT and a read that skipped a sheet answer nothing', () => {
	const rec = ( verdict, skipped = 0 ) => ( { block: 'sgs/x', setting: 's', property: 'width', verdict, sheets: { skipped } } );
	assert.equal( measuredReachFrom( [ rec( 'REFUTED' ) ] )( 'sgs/x', 's', 'width' ), false );
	assert.equal( measuredReachFrom( [ rec( 'NO-RULE' ) ] )( 'sgs/x', 's', 'width' ), false );
	assert.equal( measuredReachFrom( [ rec( 'REFUTED', 1 ) ] )( 'sgs/x', 's', 'width' ), undefined, 'a skipped sheet may hold the cited rule' );
	assert.equal( measuredReachFrom( [ rec( 'CONFIRMED' ) ] )( 'sgs/x', 's', 'width' ), undefined, 'not refuted is not proven' );
	assert.equal( measuredReachFrom( [ rec( 'ABSENT' ) ] )( 'sgs/x', 's', 'width' ), undefined );
	assert.equal( measuredReachFrom( [ rec( 'REFUTED' ) ] )( 'sgs/x', 's', 'height' ), undefined, 'keyed on block, setting AND property' );
	assert.equal( measuredReachFrom( null )( 'sgs/x', 's', 'width' ), undefined );
} );

// A unit test cannot see a wiring gap: runTriage, the only production ctx builder, must pass the lookup in.
test( 'MUST FAIL ON REVERT (wiring): triage.mjs::runTriage builds ctx.measuredReach from the client\'s canvas-confirm.json', () => {
	const src = fs.readFileSync( new URL( '../triage.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /measuredReachFrom\(\s*fs\.existsSync\(\s*confirmFile\s*\)/ );
	assert.match( src, /canvas-confirm\.json/ );
	const ctxBody = src.slice( src.indexOf( 'const ctx = {' ), src.indexOf( 'const result = triage(' ) );
	assert.match( ctxBody, /^\s*measuredReach,\s*$/m, 'the ctx object carries measuredReach' );
} );

// A row whose live value is empty at every width has no live element behind it (the walker never found one).
const noLive = ( key, draft ) => [ 375, 768, 1440, 1920 ].map( ( width ) => row( { key, draft, live: null, width, reason: 'not written' } ) );

test( 'MUST FAIL ON REVERT: rows with a null live value at every width are W, no-live-element, before any setting lookup', () => {
	const rows = [ ...noLive( 'opacity', '0.5' ), ...noLive( 'row-gap', '8px' ) ];
	let asked = 0;
	const { verdicts } = run( { missing: rows }, rows, ctxOf( { resolver: () => ( asked++, { gap: 'no-setting', detail: 'none' } ) } ) );
	assert.equal( verdicts.length, 2 );
	for ( const v of verdicts ) {
		assert.equal( v.class, 'W' );
		assert.equal( v.decidedBy, 'no-live-element' );
		assert.deepEqual( v.evidence[ 0 ], { check: 'no-live-element', detail: '4 rows, live value empty at every width: the walker found no live element' } );
	}
	assert.equal( asked, 0 );
} );

test( 'not over-suppressing: one row with a live value keeps the ordinary classification', () => {
	const rows = noLive( 'opacity', '0.5' );
	rows[ 2 ] = { ...rows[ 2 ], live: '1' };
	const v = run( { missing: rows }, rows, ctxOf() ).verdicts[ 0 ];
	assert.equal( v.class, 'F' );
	assert.equal( v.decidedBy, 'no-setting' );
} );

// A row whose draft side the walker never read (mega-brands' button paired with the draft's inner text span, whose padding
// sits on its outer link; Solve classes it `unmeasured-side`, 2026-10-08 report): the node "holding" the resolver's write
// proves nothing, because there is no draft value to hold.
const unreadDraft = ( draft = [ undefined, undefined ] ) => [ 1440, 1920 ].map( ( width, i ) => row( { key: 'padding-top', draft: draft[ i ], live: '5px', path: '', width,
	reason: 'unmeasured-side: the draft padding-top was not read (the draft element carries no value for it)' } ) );
const buttonHolding = () => ( {
	nodeFor: ( ref ) => ( 'cr-ref-s-1' === ref ? { name: 'sgs/button', attributes: { padding: { desktop: { top: '5px' } } } } : null ),
	resolver: () => ( { writes: [ { attr: 'padding', value: { desktop: { top: '5px' } }, merge: 'deep' } ] } ),
} );

test( 'MUST FAIL: rows whose draft side was never read are W, unmeasured-side, never F hardcode', () => {
	const rows = unreadDraft();
	const v = run( { unresolved: rows }, rows, ctxOf( buttonHolding() ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'unmeasured-side' );
	assert.deepEqual( v.evidence[ 0 ], { check: 'unmeasured-side', sides: [ 'draft' ], detail: '2 rows, the draft value was never read at any width: no paint is compared' } );
} );

test( 'negative control: the same rows with one draft value read keep the ordinary verdict (F hardcode)', () => {
	const rows = unreadDraft( [ undefined, '5px' ] );
	const v = run( { hardcode: rows }, rows, ctxOf( buttonHolding() ) ).verdicts[ 0 ];
	assert.equal( v.class, 'F' );
	assert.equal( v.decidedBy, 'hardcode' );
} );

// One element measured from several blocks (mega-brands 2026-10-08): a heading's own row, and the same h3 read as the text
// carrier of an enclosing block's pair, stamped on that block with its path to the h3 (its owner frame).
const H3_IN_MENU = '.sgs-nav-bar-menu__mega > .sgs-mega-panel > .sgs-mega-group > .sgs-container > .sgs-container__inner > h3:nth-of-type(1)';
const ownH3 = () => row( { key: 'line-height', draft: '17.25px', live: '11.5px', ref: 'cr-ref-s-1', path: '', pair: 'gen-heading',
	owners: [ { ref: 'cr-ref-s-2', path: H3_IN_MENU, tag: 'h3' } ] } );
const echoH3 = () => row( { key: 'line-height', draft: '17.25px', live: '11.5px', ref: 'cr-ref-s-2', path: H3_IN_MENU, pair: 'nav-item' } );
const menuCtx = () => ctxOf( { ancestorsOf: ( ref ) => ( 'cr-ref-s-1' === ref ? [ 'cr-ref-s-2' ] : [] ), ancestorHop: () => null } );

test( 'MUST FAIL: an element\'s own row is never explained by an enclosing block\'s reading of the same element', () => {
	const own = ownH3();
	const echo = echoH3();
	const { verdicts } = run( { unresolved: [ own, echo ] }, [ own, echo ], menuCtx() );
	const v = verdicts.find( ( x ) => 'cr-ref-s-1' === x.ref );
	assert.notEqual( v.decidedBy, 'consequence' );
	assert.equal( v.class, 'F' );
} );

test( 'MUST FAIL: the enclosing block\'s reading of the element follows the element\'s own row, as the same element', () => {
	const own = ownH3();
	const echo = echoH3();
	const { verdicts } = run( { unresolved: [ own, echo ] }, [ own, echo ], menuCtx() );
	const v = verdicts.find( ( x ) => 'cr-ref-s-2' === x.ref );
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'same-element' );
	const e = v.evidence.find( ( x ) => 'consequence' === x.check );
	assert.equal( e.parent, 'cr-ref-s-1||style|line-height' );
	assert.equal( e.match, 'same-element' );
} );

test( 'negative control: an ancestor\'s row on its OWN element still explains the child\'s inherited value', () => {
	const own = ownH3();
	const parent = row( { key: 'line-height', draft: '17.25px', live: '11.5px', ref: 'cr-ref-s-2', path: '', pair: 'menu-root' } );
	const { verdicts } = run( { unresolved: [ own, parent ] }, [ own, parent ], menuCtx() );
	const v = verdicts.find( ( x ) => 'cr-ref-s-1' === x.ref );
	assert.equal( v.decidedBy, 'consequence' );
	assert.equal( v.evidence.find( ( x ) => 'consequence' === x.check ).relation, 'ancestor' );
} );

test( 'negative control: a reading of the same element whose values differ (another draft partner) is not the same issue', () => {
	const own = ownH3();
	const echo = { ...echoH3(), draft: '20px' };
	const { verdicts } = run( { unresolved: [ own, echo ] }, [ own, echo ], menuCtx() );
	assert.notEqual( verdicts.find( ( x ) => 'cr-ref-s-2' === x.ref ).decidedBy, 'same-element' );
} );

// A row that follows a difference Bean accepted (Contact 2026-10-08: the card after the map is placed by the embedded
// map D-16 accepts in full; product: a button's hover lift is the site-wide lift D-71 accepts on its ancestor).
const D16 = { id: 'D-16', scope: 's', node: 'cr-ref-s-3', state: '*', property: '*', expected: { rule: 'bean-choice' }, reason: 'map', register: [ '132' ] };
const mapRow = ( over = {} ) => row( { kind: 'box', key: 'h', draft: 76, live: 490, ref: 'cr-ref-s-3', path: '', pair: 'map', accepted: 'D-16 (bean-choice): map', decided: { id: 'D-16', rule: 'bean-choice' }, ...over } );
const afterMap = () => row( { kind: 'box', key: 'y-after-map', draft: 1637, live: 1746, ref: 'cr-ref-s-1', path: '', pair: 'card' } );

test( 'MUST FAIL: a row placed after a node a ledger entry accepts in full is L, citing the entry', () => {
	const r = afterMap();
	const { verdicts, counts } = run( { derived: [ r ] }, [ r, mapRow() ], ctxOf( { ledger: [ D16 ] } ) );
	assert.equal( verdicts[ 0 ].class, 'L' );
	assert.equal( verdicts[ 0 ].decidedBy, 'ledger-consequence' );
	assert.equal( verdicts[ 0 ].evidence[ 0 ].entry, 'D-16' );
	assert.equal( counts.L, 1 );
} );

test( 'MUST FAIL: a hover row matching a ledger-accepted row on its ancestor is L, citing that entry', () => {
	const lift = 'matrix(1, 0, 0, 1, 0, -3)';
	const parent = row( { kind: 'hover', key: 'transform', draft: lift, live: 'none', ref: 'cr-ref-s-1', path: '', pair: 'buybox', accepted: 'D-71 (value)', decided: { id: 'D-71', value: lift } } );
	const r = row( { kind: 'hover', key: 'transform', draft: lift, live: 'none', ref: 'cr-ref-s-2', path: '', pair: 'button' } );
	const v = run( { unresolved: [ r ] }, [ r, parent ], ctxOf( { ledger: [] } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'L' );
	assert.equal( v.evidence[ 0 ].entry, 'D-71' );
} );

test( 'negative control: a parent accepted by a walker rule (no ledger entry) and matched only as a layout row stays U', () => {
	const r = afterMap();
	const walkerAccept = mapRow( { kind: 'style', key: 'align-items', draft: 'normal', live: 'center', accepted: 'Layout property on an element whose painted box and content match', decided: undefined } );
	const v = run( { derived: [ r ] }, [ r, walkerAccept ], ctxOf( { ledger: [] } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'U' );
} );

// A pair comparing two elements of very different size (shop 2026-10-08: the draft's 77px "Filter" header row against
// the live 812px filter dialog): the walker measured the wrong draft element, so no setting is judged through it.
const sizedWalk = ( r, dBox, lBox, dText = 'Filter', lText = 'Filter Women Men Style Colour Clear all' ) => ( { runs: [ { state: r.state, width: r.width, pairs: { [ r.pair ]: { draft: { styles: {}, box: dBox, text: dText }, live: { trace: { ref: r.ref }, box: lBox, text: lText }, diffs: [ r ] } } } ] } );

test( 'negative control: a 44px tap area around the same words (Contact phone link, 19px against 44px) is not mispaired', () => {
	const r = row( { key: 'padding-top', draft: '0px', live: '7.5px', path: '' } );
	const v = triage( reportOf( { missing: [ r ] } ), sizedWalk( r, { w: 91, h: 19 }, { w: 109, h: 44 }, '0121 000 0000', '0121 000 0000' ), 's', ctxOf() ).verdicts[ 0 ];
	assert.notEqual( v.decidedBy, 'mispaired' );
} );

test( 'MUST FAIL: a row whose pair boxes differ more than twice in size is W, mispaired, before any setting lookup', () => {
	const r = row( { key: 'padding-top', draft: '20px', live: '0px', path: '' } );
	let asked = 0;
	const ctx = ctxOf( { resolver: () => ( asked++, { gap: 'no-setting', detail: 'none' } ) } );
	const v = triage( reportOf( { missing: [ r ] } ), sizedWalk( r, { w: 375, h: 77 }, { w: 375, h: 812 } ), 's', ctx ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'mispaired' );
	assert.equal( asked, 0 );
} );

test( 'negative control: a pair within twice its twin\'s size keeps the ordinary verdict', () => {
	const r = row( { key: 'padding-top', draft: '20px', live: '0px', path: '' } );
	const v = triage( reportOf( { missing: [ r ] } ), sizedWalk( r, { w: 375, h: 166 }, { w: 375, h: 151 } ), 's', ctxOf() ).verdicts[ 0 ];
	assert.equal( v.class, 'F' );
} );

// A block that wraps its own root only in some modes: calibrated wrapped (a heading on), measured on a page unwrapped.
const wrappedCal = () => ( {
	elements: { '': {}, '.sgs-field-textarea': {}, '.sgs-field-textarea > .sgs-field__item:nth-of-type(1) > .sgs-field__text': {} },
	settings: { textLineHeight: { slot: '.sgs-field-textarea > .sgs-field__item:nth-of-type(1) > .sgs-field__text', slots: [ '.sgs-field-textarea > .sgs-field__item:nth-of-type(1) > .sgs-field__text' ],
		reaches: [ '.sgs-field-textarea > .sgs-field__item:nth-of-type(1) > .sgs-field__text', '.sgs-field-textarea > .sgs-field__item:nth-of-type(2) > .sgs-field__text' ] } },
} );
const unwrappedRow = () => row( { key: 'line-height', draft: '18px', live: '21.75px', path: '.sgs-field__item:nth-of-type(1) > .sgs-field__text' } );
const textLh = () => [ { attr_name: 'textLineHeight', css_property: 'line-height', css_element: 'text', source: 'sgs' } ];

test( 'MUST FAIL ON REVERT: a setting calibrated on a wrapped instance reaches the same element on an unwrapped page', () => {
	const r = unwrappedRow();
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows: textLh, calFor: ( b ) => withInnerRootAliases( wrappedCal(), b ) } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'attribute' );
	assert.equal( v.evidence.find( ( e ) => 'attribute' === e.check ).reaches, true );
} );

test( 'control: the raw wrapped calibration does not reach the unwrapped row (the defect the aliases close)', () => {
	const r = unwrappedRow();
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows: textLh, calFor: () => wrappedCal() } ) ).verdicts[ 0 ];
	assert.notEqual( v.decidedBy, 'attribute' );
	assert.equal( v.evidence.find( ( e ) => 'attribute' === e.check ).reaches, false );
	assert.equal( v.evidence.find( ( e ) => 'resolver' === e.check ).gap, 'unmapped-element' );
} );

test( 'aliases are added beside the measured paths, and a calibration without the inner root is returned unchanged', () => {
	const cal = withInnerRootAliases( wrappedCal(), 'sgs/field-textarea' );
	assert.deepEqual( cal.settings.textLineHeight.reaches, [ '.sgs-field-textarea > .sgs-field__item:nth-of-type(1) > .sgs-field__text', '.sgs-field-textarea > .sgs-field__item:nth-of-type(2) > .sgs-field__text',
		'.sgs-field__item:nth-of-type(1) > .sgs-field__text', '.sgs-field__item:nth-of-type(2) > .sgs-field__text' ] );
	assert.ok( Object.hasOwn( cal.elements, '.sgs-field__item:nth-of-type(1) > .sgs-field__text' ) );
	// A nested block of the same kind (a container inside a container) is not an inner root: no `.sgs-container` element.
	const nested = { elements: { '': {}, '.sgs-container__inner > .sgs-container': {} }, settings: { gap: { slot: '.sgs-container > .x', slots: [ '.sgs-container > .x' ] } } };
	assert.equal( withInnerRootAliases( nested, 'sgs/container' ), nested );
	assert.equal( withInnerRootAliases( null, 'sgs/container' ), null );
} );
