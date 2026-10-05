// Proves triage (Session B1): a setting an extension provides is never labelled F (MUST FAIL); a box row that follows
// an open style row on its parent by the same amount is W, a consequence (MUST FAIL); a row nothing fits and the
// resolver finds no setting for is F, with the stylesheet rule that declares it; a mid-animation row and a used size
// are W; a value the tree can hold is T, and one the node already holds is F, a hardcode; a row from a walker state the
// surface maps to no setting state is W, unmapped-state, whatever its property (MUST FAIL), and never steals a key a
// Solve class already holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { triage, nameFits, rosterApplies, settingFits, canvasSettable } from '../lib/triage.mjs';

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

test( 'a database row with no css_property fits by name (max-width ↔ width), so the row is W', () => {
	const r = row( { key: 'max-width', draft: 'none', live: '100%' } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows: () => [ { attr_name: 'width', css_property: null, source: 'sgs' } ] } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'attribute' );
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

test( 'a fitting setting calibration measured not reaching the element never decides', () => {
	const r = row( { key: 'line-height', draft: '16px', live: '19.5px', path: '.sgs-field__button' } );
	const attrRows = () => [ { attr_name: 'lineHeight', css_property: 'line-height', css_element: 'wrapper', source: 'sgs' }, { attr_name: 'lineHeightUnit', css_property: null, source: 'sgs' } ];
	const calFor = () => ( { elements: { '': {}, '.sgs-field__button': {} }, settings: { lineHeight: { slot: '', slots: [ '' ], reaches: [ '', '.sgs-field__label' ] } } } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf( { attrRows, calFor } ) ).verdicts[ 0 ];
	assert.equal( v.class, 'F' );
	assert.equal( v.evidence.find( ( e ) => 'attribute' === e.check ).reaches, false );
} );

test( 'a mid-animation opacity row is W, transient', () => {
	const r = row( { key: 'opacity', draft: '0', live: '1', path: '' } );
	const v = run( { missing: [ r ] }, [ r ], ctxOf() ).verdicts[ 0 ];
	assert.equal( v.class, 'W' );
	assert.equal( v.decidedBy, 'transient' );
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
	assert.equal( v.decidedBy, 'attribute' );
} );
