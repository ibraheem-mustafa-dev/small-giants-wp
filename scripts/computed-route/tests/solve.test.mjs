// Proves R-47-9's regression guard: when a round makes rows worse, only the write whose calibrated side effects (or
// own property) explain a regressed row on its node is reverted and blocked; rows below that node pin nothing more,
// and a box-size row alone never blames every write on a node already explained. Also proves the walker state mapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { revertRegressions } from '../solve.mjs';
import { guardRound } from '../lib/guard.mjs';

const tree = () => [ { name: 'sgs/site-footer-row', attributes: { className: 'cr-ref-f-1', padding: { desktop: { top: '104px' } }, maxWidth: { desktop: '1440px' } }, innerBlocks: [
	{ name: 'sgs/heading', attributes: { className: 'cr-ref-f-2', margin: { desktop: { bottom: '4px' } } } } ] } ];
const run = ( rows ) => ( { runs: [ { state: 'opening', width: 375, pairs: { row: { diffs: rows.filter( ( r ) => 'row' === r.pair ) }, head: { diffs: rows.filter( ( r ) => 'head' === r.pair ) } } } ] } );
const writes = [
	{ round: 1, group: 'g-pad', ref: 'cr-ref-f-1', block: 'sgs/site-footer-row', attr: 'padding', prop: 'padding-top', before: null, after: {} },
	{ round: 1, group: 'g-max', ref: 'cr-ref-f-1', block: 'sgs/site-footer-row', attr: 'maxWidth', prop: 'max-width', before: null, after: {} },
	{ round: 1, group: 'g-mar', ref: 'cr-ref-f-2', block: 'sgs/heading', attr: 'margin', prop: 'margin-bottom', before: null, after: {} },
];
const cal = ( block ) => ( { 'sgs/site-footer-row': { settings: { maxWidth: { effects: [ '|margin-left', '|margin-right', '|width' ] }, padding: { effects: [] } } }, 'sgs/heading': { settings: { margin: { effects: [ '|width' ] } } } } )[ block ];
const before = run( [] );
const after = run( [
	{ pair: 'row', kind: 'style', key: 'margin-left', draft: '0px', live: '167.5px', ref: 'cr-ref-f-1', path: '' },
	{ pair: 'row', kind: 'box', key: 'h', draft: 425, live: 1973, ref: 'cr-ref-f-1', path: '' },
	{ pair: 'head', kind: 'style', key: 'width', draft: '335px', live: '0px', ref: 'cr-ref-f-2', path: '' },
] );

test( 'MUST FAIL TO OVER-REVERT: only the write whose side effect matches is reverted', () => {
	const t = tree();
	const blocked = new Map();
	const out = revertRegressions( before, after, t, structuredClone( writes ), blocked, cal );
	assert.deepEqual( out.map( ( w ) => w.attr ), [ 'maxWidth' ] );
	assert.equal( t[ 0 ].attributes.maxWidth, undefined );
	assert.deepEqual( t[ 0 ].attributes.padding, { desktop: { top: '104px' } } );
	assert.equal( blocked.get( 'g-max' ).gap, 'breaks-layout' );
} );

test( 'MUST FAIL TO OVER-REVERT: with nothing explaining the row, one suspect is tried, never every write', () => {
	const out = revertRegressions( before, after, tree(), structuredClone( writes ), new Map(), () => ( { settings: {} } ) );
	assert.equal( out.length, 1 );
	assert.equal( out[ 0 ].trial, true );
} );

// The pinpointing guard across rounds (lib/guard.mjs): a layout-mode setting is the first suspect; the next walk decides.
const node = () => [ { name: 'sgs/container', attributes: { className: 'cr-ref-h-1', layout: 'stack', padding: { desktop: { top: '4px', bottom: '6px' } } } } ];
const gw = () => [
	{ round: 1, group: 'g-pt', ref: 'cr-ref-h-1', block: 'sgs/container', attr: 'padding', prop: 'padding-top', before: null, after: { desktop: { top: '4px' } } },
	{ round: 1, group: 'g-pb', ref: 'cr-ref-h-1', block: 'sgs/container', attr: 'padding', prop: 'padding-bottom', before: { desktop: { top: '4px' } }, after: { desktop: { top: '4px', bottom: '6px' } } },
	{ round: 1, group: 'g-lay', ref: 'cr-ref-h-1', block: 'sgs/container', attr: 'layout', prop: 'display', before: null, after: 'stack' },
];
const discoveredLayout = () => ( { settings: {}, discovered: { layout: { display: { slots: [ '.sgs-container__inner' ], values: {} } } } } );
const regressed = run( [ { pair: 'row', kind: 'style', key: 'justify-content', draft: 'center', live: 'normal', ref: 'cr-ref-h-1', path: '' } ] );
const cleared = run( [] );

test( 'the layout-mode setting is tried first; when its undo clears the regression it is the only write reverted', () => {
	const t = node();
	const w = gw();
	const trials = new Map();
	const blocked = new Map();
	const r1 = guardRound( cleared, regressed, t, w, blocked, discoveredLayout, trials );
	assert.deepEqual( [ ...new Set( r1.map( ( x ) => x.attr ) ) ], [ 'layout' ] );
	assert.equal( t[ 0 ].attributes.layout, undefined );
	guardRound( cleared, cleared, t, w, blocked, discoveredLayout, trials );
	assert.equal( w.find( ( x ) => 'layout' === x.attr ).reverted, true );
	assert.ok( w.filter( ( x ) => 'padding' === x.attr ).every( ( x ) => ! x.reverted ) );
	assert.deepEqual( t[ 0 ].attributes.padding, { desktop: { top: '4px', bottom: '6px' } } );
} );

test( 'an innocent suspect is restored and the next suspect (the whole chained setting) is tried', () => {
	const t = node();
	const w = gw();
	const trials = new Map();
	guardRound( cleared, regressed, t, w, new Map(), discoveredLayout, trials );
	const r2 = guardRound( cleared, regressed, t, w, new Map(), discoveredLayout, trials );
	assert.equal( t[ 0 ].attributes.layout, 'stack' );
	assert.ok( r2.some( ( x ) => 'layout' === x.attr && x.restored ) );
	assert.equal( t[ 0 ].attributes.padding, undefined );
	assert.ok( w.filter( ( x ) => 'padding' === x.attr ).every( ( x ) => x.trial ) );
} );

test( 'no regression, no revert', () => {
	assert.equal( revertRegressions( before, before, tree(), structuredClone( writes ), new Map(), cal ).length, 0 );
} );

// A distance row on a node with no writes of its own (Contact, 2026-10-03): the subtext's margin write moved the name
// field, whose row carries the form card's ref. The write inside the anchor pair is the suspect.
const formTree = () => [ { name: 'sgs/container', attributes: { className: 'cr-ref-c-20' }, innerBlocks: [
	{ name: 'sgs/text', attributes: { className: 'cr-ref-c-22', margin: { mobile: { bottom: '22px' } } } } ] } ];
const fw = () => [ { round: 1, group: 'g-sub', ref: 'cr-ref-c-22', block: 'sgs/text', attr: 'margin', prop: 'margin-bottom', before: { mobile: { bottom: '0px' } }, after: { mobile: { bottom: '22px' } } } ];
const formRun = ( diffs ) => ( { runs: [ { state: 'opening', width: 375, pairs: {
	'form-subtext': { live: { trace: { ref: 'cr-ref-c-22' } }, diffs: [] },
	'field-name': { live: { trace: { ref: 'cr-ref-c-20' } }, diffs } } } ] } );
const movedField = formRun( [ { kind: 'box', key: 'y-from-form-subtext', draft: 45, live: 68, ref: 'cr-ref-c-20', path: '.sgs-form-field__input' } ] );

test( 'MUST FAIL TO MISS: a distance row on a node with no writes tries the write inside its anchor pair', () => {
	const t = formTree();
	const w = fw();
	const trials = new Map();
	const out = guardRound( formRun( [] ), movedField, t, w, new Map(), () => ( { settings: {} } ), trials );
	assert.deepEqual( out.map( ( x ) => x.ref ), [ 'cr-ref-c-22' ] );
	assert.deepEqual( t[ 0 ].innerBlocks[ 0 ].attributes.margin, { mobile: { bottom: '0px' } } );
	guardRound( formRun( [] ), formRun( [] ), t, w, new Map(), () => ( { settings: {} } ), trials );
	assert.equal( w[ 0 ].reverted, true );
} );

test( 'positive control: a distance row whose anchor pair holds no write reverts nothing', () => {
	const w = fw().map( ( x ) => ( { ...x, ref: 'cr-ref-c-99' } ) );
	assert.equal( guardRound( formRun( [] ), movedField, formTree(), w, new Map(), () => ( { settings: {} } ), new Map() ).length, 0 );
} );

// A row on a node with no writes on it or inside it (About, 2026-10-04): the page container's padding written as 0
// widened its child. The write on the nearest ancestor holding one is the suspect.
const padTree = () => [ { name: 'sgs/container', attributes: { className: 'cr-ref-a-0' }, innerBlocks: [
	{ name: 'sgs/container', attributes: { className: 'cr-ref-a-1', padding: { desktop: { left: '0px', right: '0px' } } }, innerBlocks: [
		{ name: 'sgs/heading', attributes: { className: 'cr-ref-a-2' } } ] } ] } ];
const pw = () => [
	{ round: 1, group: 'g-root', ref: 'cr-ref-a-0', block: 'sgs/container', attr: 'margin', prop: 'margin-top', before: undefined, after: { desktop: { top: '8px' } } },
	{ round: 1, group: 'g-pad', ref: 'cr-ref-a-1', block: 'sgs/container', attr: 'padding', prop: 'padding-left', before: { desktop: { left: '20px', right: '20px' } }, after: { desktop: { left: '0px', right: '0px' } } },
];
const padRun = ( diffs ) => ( { runs: [ { state: 'opening', width: 1440, pairs: { head: { live: { trace: { ref: 'cr-ref-a-2' } }, diffs } } } ] } );
const widened = padRun( [ { kind: 'box', key: 'width', draft: 1400, live: 1440, ref: 'cr-ref-a-2', path: '' } ] );

test( 'MUST FAIL TO MISS: a row on a node with no writes tries the nearest ancestor\'s write and reverts it', () => {
	const t = padTree();
	const w = pw();
	const trials = new Map();
	const out = guardRound( padRun( [] ), widened, t, w, new Map(), () => ( { settings: {} } ), trials );
	assert.deepEqual( out.map( ( x ) => x.ref ), [ 'cr-ref-a-1' ] );
	assert.deepEqual( t[ 0 ].innerBlocks[ 0 ].attributes.padding, { desktop: { left: '20px', right: '20px' } } );
	guardRound( padRun( [] ), padRun( [] ), t, w, new Map(), () => ( { settings: {} } ), trials );
	assert.equal( w[ 1 ].reverted, true );
	assert.ok( ! w[ 0 ].reverted );
} );

test( 'an innocent nearest ancestor is restored and the next ancestor out is tried', () => {
	const t = padTree();
	const w = pw();
	const trials = new Map();
	guardRound( padRun( [] ), widened, t, w, new Map(), () => ( { settings: {} } ), trials );
	const r2 = guardRound( padRun( [] ), widened, t, w, new Map(), () => ( { settings: {} } ), trials );
	assert.deepEqual( t[ 0 ].innerBlocks[ 0 ].attributes.padding, { desktop: { left: '0px', right: '0px' } } );
	assert.ok( r2.some( ( x ) => 'cr-ref-a-0' === x.ref && x.trial ) );
} );

test( 'positive control: no write on the node, inside it or on an ancestor reverts nothing', () => {
	const w = pw().map( ( x ) => ( { ...x, ref: 'cr-ref-z-9' } ) );
	assert.equal( guardRound( padRun( [] ), widened, padTree(), w, new Map(), () => ( { settings: {} } ), new Map() ).length, 0 );
} );

// Walker state mapping (Spec 47 §5 stage 3): rows are written only from walker states the surface maps to a setting
// state; a scrolled run's values never land in rest settings, and draft values come only from the group's own states.
import { writeRound } from '../solve.mjs';
import { writableGroups, draftValues } from '../lib/solve-rows.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const headCal = () => ( { elements: { '': {} }, settings: { fontSize: { slot: '', property: 'font-size' } } } );
const headTree = () => [ { name: 'sgs/heading', attributes: { className: 'cr-ref-h-1', content: 'Hi' } } ];
const pairRun = ( state, draftPx, rows ) => ( { state, width: 1440, pairs: { head: { draft: { styles: { 'font-size': draftPx } }, diffs: rows } } } );
const stateReport = () => ( { runs: [
	pairRun( 'opening', '18px', [] ),
	pairRun( 'scrolled', '15px', [ { kind: 'style', key: 'font-size', draft: '15px', live: '18px', ref: 'cr-ref-h-1', path: '' } ] ),
] } );

test( 'MUST FAIL TO WRITE: a row from an unmapped scrolled state produces no group and no write', () => {
	const t = headTree();
	const r = writeRound( stateReport(), t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: headCal } );
	assert.equal( r.writes.length, 0 );
	assert.equal( t[ 0 ].attributes.fontSize, undefined );
	assert.equal( writableGroups( stateReport(), { opening: null } ).unmappedState.length, 1 );
} );

test( 'positive control: the same row mapped to rest is written (so the case above is not vacuous)', () => {
	const r = writeRound( stateReport(), headTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null, scrolled: null }, calFor: headCal } );
	assert.equal( r.writes.length, 1 );
	assert.equal( r.writes[ 0 ].attr, 'fontSize' );
} );

test( 'a mapped scrolled row keys its group with that state and reads draft values only from that state', () => {
	const { groups } = writableGroups( stateReport(), { opening: null, scrolled: 'scrolled' } );
	assert.equal( groups.length, 1 );
	assert.equal( groups[ 0 ].state, 'scrolled' );
	assert.match( groups[ 0 ].key, /\|scrolled$/ );
	assert.deepEqual( draftValues( stateReport(), 'head', 'font-size', false, groups[ 0 ].walkerStates ).perWidth, { 1440: '15px' } );
	assert.deepEqual( draftValues( stateReport(), 'head', 'font-size', false ).perWidth, { 1440: '15px' } );
	assert.deepEqual( draftValues( stateReport(), 'head', 'font-size', false, [ 'opening' ] ).perWidth, { 1440: '18px' } );
} );

test( 'a hover row from a non-rest state is not writable', () => {
	const rep = { runs: [ pairRun( 'scrolled', '15px', [ { kind: 'hover', key: 'color', draft: 'rgb(0, 0, 0)', live: 'rgb(1, 1, 1)', ref: 'cr-ref-h-1', path: '' } ] ) ] };
	const out = writableGroups( rep, { scrolled: 'scrolled' } );
	assert.equal( out.groups.length, 0 );
	assert.equal( out.unmappedState.length, 1 );
} );

// Parallel widths (2026-10-04): each width walks in its own walker and the reports merge into one.
import { mergeReports, WIDTH_GROUPS } from '../solve.mjs';

test( 'every width is its own walker, and the merged report holds every run and every width\'s errors', () => {
	assert.deepEqual( WIDTH_GROUPS, [ [ 375 ], [ 768 ], [ 1440 ], [ 1920 ] ] );
	const merged = mergeReports( [ { config: 'x', runs: [ { width: 375 } ], errors: { 375: { live: [] } } }, { config: 'x', runs: [ { width: 768 }, { width: 768 } ], errors: { 768: { live: [ 'e' ] } } } ] );
	assert.equal( merged.config, 'x' );
	assert.deepEqual( merged.runs.map( ( r ) => r.width ), [ 375, 768, 768 ] );
	assert.deepEqual( merged.errors, { 375: { live: [] }, 768: { live: [ 'e' ] } } );
} );

test( 'MUST FAIL TO DROP: a width whose walk has no runs still keeps the other widths\' runs', () => {
	assert.equal( mergeReports( [ { runs: [] }, { runs: [ { width: 1440 } ] } ] ).runs.length, 1 );
} );

// F5: the whole page in distinct issues. Widths and states of one issue count once.
import { wholePage } from '../lib/solve-report.mjs';

test( 'one issue at four widths is one issue; a closed, a new, a labelled and an unexplained issue are told apart', () => {
	const row = ( pair, key, width, ref = `cr-ref-p-${ pair }` ) => ( { kind: 'style', key, draft: '1px', live: '2px', ref, path: '' , width } );
	const rep = ( rows ) => ( { runs: [ 375, 768, 1440, 1920 ].map( ( width ) => ( { state: 'opening', width, pairs: Object.fromEntries( rows.map( ( r ) => [ r.pair, { diffs: [ row( r.pair, r.key, width ) ] } ] ) ) } ) ) } );
	const before = rep( [ { pair: 'a', key: 'padding-top' }, { pair: 'b', key: 'gap' }, { pair: 'c', key: 'color' } ] );
	const after = rep( [ { pair: 'b', key: 'gap' }, { pair: 'c', key: 'color' }, { pair: 'd', key: 'margin-top' } ] );
	const classes = { missing: [ { ref: 'cr-ref-p-b', path: '', kind: 'style', key: 'gap' } ] };
	assert.deepEqual( wholePage( before, after, classes ), { before: 3, after: 3, closed: 1, new: 1, labelledGap: 1, unexplained: 2 } );
} );

test( 'MUST FAIL TO COUNT: accepted rows and non-visual kinds are not issues', () => {
	const r = { runs: [ { state: 'opening', width: 375, pairs: { a: { diffs: [ { kind: 'style', key: 'x', ref: 'r', accepted: 'decided' }, { kind: 'motion', key: 'y', ref: 'r' } ] } } } ] };
	assert.deepEqual( wholePage( r, r, {} ), { before: 0, after: 0, closed: 0, new: 0, labelledGap: 0, unexplained: 0 } );
} );

// A painted ground (About's credential column, 2026-10-04) is read from the draft's full-check extras, not its styles.
import { draftValues as dv } from '../lib/solve-rows.mjs';
test( 'MUST FAIL TO MISS: a painted-ground row takes its draft value from the draft snapshot\'s extras', () => {
	const report = { runs: [ { state: 'opening', width: 375, pairs: { col: { draft: { styles: { 'font-size': '16px' }, extras: { ground: 'rgba(230, 225, 218, 1)' } } } } } ] };
	assert.deepEqual( dv( report, 'col', 'painted-ground', false ).perWidth, { 375: 'rgba(230, 225, 218, 1)' } );
	assert.deepEqual( dv( report, 'col', 'background-color', false ).perWidth, {} );
} );

// A surface sharing its walker (the contact page and its embedded form post) is judged on its own blocks' rows and
// rows with no block (lib/solve-report.mjs::wholePage).
test( 'MUST FAIL TO COUNT: a neighbour surface\'s rows are not this surface\'s issues', () => {
	const rep = ( rows ) => ( { runs: [ { state: 'opening', width: 375, pairs: { p: { diffs: rows } } } ] } );
	const rows = [ { kind: 'style', key: 'gap', ref: 'cr-ref-contact-form-1', path: '' }, { kind: 'style', key: 'color', ref: 'cr-ref-contact-3', path: '' }, { kind: 'style', key: 'painted-ground', path: '' } ];
	assert.equal( wholePage( rep( [] ), rep( rows ), {}, 'cr-ref-contact-' ).after, 2 );
	assert.equal( wholePage( rep( [] ), rep( rows ), {}, 'cr-ref-contact-form-' ).after, 2 );
	assert.equal( wholePage( rep( [] ), rep( rows ), {} ).after, 3 );
} );

// Enclosing-block settings: a field's control styled by its form's setting.
const FIELD_PATH = '.sgs-form__inner > .sgs-form-field:nth-of-type(3) > .sgs-form-field__input';
const ownedFormTree = () => [ { name: 'sgs/form', attributes: { className: 'cr-ref-f-0' }, innerBlocks: [ { name: 'sgs/form-field-email', attributes: { className: 'cr-ref-f-2' } } ] } ];
const ownedFormCal = ( name ) => ( 'sgs/form' === name
	? { elements: { '.sgs-form__inner > .sgs-form-field:nth-of-type(1) > .sgs-form-field__input': {} }, settings: { padding: { slot: '.sgs-form__inner > .sgs-form-field:nth-of-type(1) > .sgs-form-field__input', property: 'padding' } } }
	: { elements: { '': {}, '.sgs-form-field__input': {} }, settings: {} } );
const fieldReport = ( owners ) => ( { runs: [ { state: 'opening', width: 1440, pairs: { email: { draft: { styles: { 'padding-top': '14px' } }, diffs: [
	{ kind: 'style', key: 'padding-top', draft: '14px', live: '12px', ref: 'cr-ref-f-2', path: '.sgs-form-field__input', ...( owners ? { owners } : {} ) } ] } } } ] } );

test( 'MUST FAIL: a row its own block cannot write resolves on the nearest enclosing block whose setting paints that element', () => {
	const t = ownedFormTree();
	const r = writeRound( fieldReport( [ { ref: 'cr-ref-f-0', block: 'sgs-form', path: FIELD_PATH } ] ), t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: ownedFormCal } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.ref, w.attr ] ), [ [ 'cr-ref-f-0', 'padding' ] ] );
	assert.equal( t[ 0 ].innerBlocks[ 0 ].attributes.padding, undefined );
	const alone = writeRound( fieldReport( null ), ownedFormTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: ownedFormCal } );
	assert.equal( alone.writes.length, 0 );
	assert.equal( Object.values( alone.gaps )[ 0 ].gap, 'no-setting' );
} );

test( 'MUST FAIL: an enclosing block\'s setting matches on the element\'s tag, so an input row never takes the textarea setting', () => {
	const INPUT = '.sgs-form__inner > .sgs-form-field:nth-of-type(1) > .sgs-form-field__input';
	const AREA = '.sgs-form__inner > .sgs-form-field:nth-of-type(2) > .sgs-form-field__input';
	const formCal = ( name ) => ( 'sgs/form' === name
		? { elements: { [ INPUT ]: { 1440: { _tag: 'input' } }, [ AREA ]: { 1440: { _tag: 'textarea' } } }, settings: {
			fieldMinHeight: { slot: INPUT, slots: [ INPUT ], property: 'min-height' },
			fieldTextareaMinHeight: { slot: AREA, slots: [ AREA ], property: 'min-height' } } }
		: { elements: { '': {}, '.sgs-form-field__input': {} }, settings: {} } );
	const report = { runs: [ { state: 'opening', width: 1440, pairs: { email: { draft: { styles: { 'min-height': '52px' } }, diffs: [
		{ kind: 'style', key: 'min-height', draft: '52px', live: '44px', ref: 'cr-ref-f-2', path: '.sgs-form-field__input',
			owners: [ { ref: 'cr-ref-f-0', block: 'sgs-form', path: '.sgs-form__inner > .sgs-form-field:nth-of-type(3) > .sgs-form-field__input', tag: 'input' } ] } ] } } } ] };
	const r = writeRound( report, ownedFormTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: formCal } );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'fieldMinHeight' ] );
} );
