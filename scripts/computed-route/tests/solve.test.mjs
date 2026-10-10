// Proves R-47-9's regression guard: when a round makes rows worse, only the write whose calibrated side effects (or
// own property) explain a regressed row on its node is reverted and blocked; rows below that node pin nothing more,
// and a box-size row alone never blames every write on a node already explained. Also proves the walker state mapping.
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
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

// A node's own height or width row (Lenses, 2026-10-07): the page container's padding write landed the draft's padding,
// yet the container's own h@375 read further from the draft (it sums every child and the draft's scroll reveal). The
// write's own rows (padding-top, padding-bottom, read on both sides) are the direct verdict: a setting whose own rows
// are closed after the round is no suspect for its node's own size, nor is a write inside the node that landed.
const lensTree = () => [ { name: 'sgs/container', attributes: { className: 'cr-ref-l-0', padding: { mobile: { top: '28px', bottom: '60px' } } }, innerBlocks: [
	{ name: 'sgs/text', attributes: { className: 'cr-ref-l-1', margin: { mobile: { bottom: '6px' } } } } ] } ];
const lw = () => [
	{ round: 1, group: 'cr-ref-l-0||padding-top|', ref: 'cr-ref-l-0', block: 'sgs/container', path: '', attr: 'padding', prop: 'padding-top', before: { mobile: { top: '56px', bottom: '56px' } }, after: { mobile: { top: '28px', bottom: '56px' } } },
	{ round: 1, group: 'cr-ref-l-0||padding-bottom|', ref: 'cr-ref-l-0', block: 'sgs/container', path: '', attr: 'padding', prop: 'padding-bottom', before: { mobile: { top: '28px', bottom: '56px' } }, after: { mobile: { top: '28px', bottom: '60px' } } },
	{ round: 1, group: 'cr-ref-l-1||margin-bottom|', ref: 'cr-ref-l-1', block: 'sgs/text', path: '', attr: 'margin', prop: 'margin-bottom', before: undefined, after: { mobile: { bottom: '6px' } } },
];
const lensRun = ( diffs ) => ( { runs: [ { state: 'opening', width: 375, pairs: { page: { live: { trace: { ref: 'cr-ref-l-0' } }, diffs } } } ] } );
const ownHeight = { kind: 'box', key: 'h', draft: 780, live: 684, ref: 'cr-ref-l-0', path: '' };

test( 'MUST FAIL TO MISJUDGE: a node\'s own height row never puts a landed write on trial', () => {
	const t = lensTree();
	const out = guardRound( lensRun( [] ), lensRun( [ ownHeight ] ), t, lw(), new Map(), () => ( { settings: {} } ), new Map() );
	assert.equal( out.length, 0 );
	assert.deepEqual( t[ 0 ].attributes.padding, { mobile: { top: '28px', bottom: '60px' } } );
	assert.deepEqual( t[ 0 ].innerBlocks[ 0 ].attributes.margin, { mobile: { bottom: '6px' } } );
} );

test( 'negative control: a write whose own row is still open stays a suspect for its node\'s own height', () => {
	const t = lensTree();
	const stillOpen = { kind: 'style', key: 'padding-top', draft: '28px', live: '56px', ref: 'cr-ref-l-0', path: '' };
	const out = guardRound( lensRun( [ stillOpen ] ), lensRun( [ ownHeight, stillOpen ] ), t, lw(), new Map(), () => ( { settings: {} } ), new Map() );
	assert.ok( out.length > 0 && out.every( ( x ) => 'cr-ref-l-0' === x.ref && x.trial ) );
	assert.deepEqual( t[ 0 ].attributes.padding, { mobile: { top: '56px', bottom: '56px' } } );
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
	// Both walker states now map to rest, so they must read one draft value (L8.8): the baseline reads the scrolled 15px.
	const agreed = { runs: [ pairRun( 'opening', '15px', [] ), stateReport().runs[ 1 ] ] };
	const r = writeRound( agreed, headTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null, scrolled: null }, calFor: headCal } );
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

// A walker state mapped to a setting state (product's accordion-open -> open, 2026-10-08) asks for a state setting
// only for what that state changes: the header's padding reads the same draft value open and closed, so the rest
// setting paints it, and demanding an `open` setting called it a missing feature.
const openState = { opening: null, 'accordion-open': 'open' };
const openRow = { kind: 'style', key: 'font-size', draft: '15px', live: '20px', ref: 'cr-ref-h-1', path: '' };

test( 'MUST FAIL: a group whose draft value is the same at rest and in the mapped state resolves at rest', () => {
	const rep = { runs: [ pairRun( 'opening', '15px', [] ), pairRun( 'accordion-open', '15px', [ { ...openRow } ] ) ] };
	const { groups, stateConflict } = writableGroups( rep, openState );
	assert.equal( stateConflict.length, 0 );
	assert.equal( groups.length, 1 );
	assert.equal( groups[ 0 ].state, null );
	assert.match( groups[ 0 ].key, /\|$/ );
} );

test( 'MUST FAIL: the same group is written through the rest setting', () => {
	const rep = { runs: [ pairRun( 'opening', '15px', [] ), pairRun( 'accordion-open', '15px', [ { ...openRow } ] ) ] };
	const r = writeRound( rep, headTree(), { db, snapshot, round: 1, log: [], stateMap: openState, calFor: headCal } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.state ] ), [ [ 'fontSize', null ] ] );
} );

test( 'MUST FAIL: an element read only in the mapped state (an accordion answer) resolves at rest', () => {
	const rep = { runs: [ { state: 'opening', width: 1440, pairs: {} }, pairRun( 'accordion-open', '15px', [ { ...openRow } ] ) ] };
	assert.equal( writableGroups( rep, openState ).groups[ 0 ].state, null );
} );

test( 'negative control: an open row and a rest row of one element merge into one rest group, never two writes', () => {
	const rep = { runs: [ pairRun( 'opening', '15px', [ { ...openRow } ] ), pairRun( 'accordion-open', '15px', [ { ...openRow } ] ) ] };
	const { groups } = writableGroups( rep, openState );
	assert.equal( groups.length, 1 );
	assert.deepEqual( groups[ 0 ].walkerStates.sort(), [ 'accordion-open', 'opening' ] );
	assert.equal( groups[ 0 ].rows.length, 2 );
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
import { wholePage, writeSolveReport } from '../lib/solve-report.mjs';

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

test( 'MUST FAIL: a second element wanting one part of a shared setting at another value in the same round is a conflict, not a write', () => {
	const INPUT = '.sgs-form__inner > .sgs-form-field:nth-of-type(1) > .sgs-form-field__input';
	const AREA = '.sgs-form__inner > .sgs-form-field:nth-of-type(2) > .sgs-form-field__input';
	const formCal = ( name ) => ( 'sgs/form' === name
		? { elements: { [ INPUT ]: { 1440: { _tag: 'input' } }, [ AREA ]: { 1440: { _tag: 'textarea' } } }, settings: { fieldPadding: { slot: INPUT, slots: [ INPUT, AREA ], property: 'padding' } } }
		: { elements: { '': {}, '.sgs-form-field__input': {} }, settings: {} } );
	const row = ( pair, ref, draft, tag ) => ( { kind: 'style', key: 'padding-top', draft, live: '12px', ref, path: '.sgs-form-field__input',
		owners: [ { ref: 'cr-ref-f-0', block: 'sgs-form', path: `.sgs-form__inner > .sgs-form-field:nth-of-type(${ 'input' === tag ? 1 : 2 }) > .sgs-form-field__input`, tag } ] } );
	const tree = () => [ { name: 'sgs/form', attributes: { className: 'cr-ref-f-0' }, innerBlocks: [ { name: 'sgs/form-field-text', attributes: { className: 'cr-ref-f-1' } }, { name: 'sgs/form-field-textarea', attributes: { className: 'cr-ref-f-2' } } ] } ];
	const report = ( areaDraft ) => ( { runs: [ { state: 'opening', width: 1440, pairs: {
		name: { draft: { styles: { 'padding-top': '0px' } }, diffs: [ row( 'name', 'cr-ref-f-1', '0px', 'input' ) ] },
		message: { draft: { styles: { 'padding-top': areaDraft } }, diffs: [ row( 'message', 'cr-ref-f-2', areaDraft, 'textarea' ) ] } } } ] } );
	const clash = writeRound( report( '14px' ), tree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: formCal } );
	assert.equal( clash.writes.length, 1 );
	assert.equal( Object.values( clash.gaps ).filter( ( x ) => 'conflict' === x.gap ).length, 1 );
	const agree = writeRound( report( '0px' ), tree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: formCal } );
	assert.equal( Object.values( agree.gaps ).filter( ( x ) => 'conflict' === x.gap ).length, 0 );
} );

import { solveLoop } from '../solve.mjs';
// A1: --rounds 0 is measure-only. Stub steps count what the loop calls.
const loopSteps = () => {
	const calls = { build: 0, walk: 0, write: 0 };
	return { calls, steps: {
		build: () => ( calls.build++, { ok: true } ),
		walk: async () => ( calls.walk++, { runs: [] } ),
		guard: () => [],
		write: () => ( calls.write++, { writes: [ { group: 'g' } ], gaps: {} } ),
		save: () => {},
		log: () => {},
	} };
};

test( 'MUST FAIL TO WRITE: rounds 0 builds and walks once and never calls the write round', async () => {
	const { calls, steps } = loopSteps();
	const out = await solveLoop( { maxRounds: 0, ...steps } );
	assert.deepEqual( calls, { build: 1, walk: 1, write: 0 } );
	assert.equal( out.rounds, 0 );
	assert.deepEqual( out.writes, [] );
} );

test( 'positive control: rounds 1 calls the write round once, then walks what it wrote', async () => {
	const { calls, steps } = loopSteps();
	await solveLoop( { maxRounds: 1, ...steps } );
	assert.deepEqual( calls, { build: 2, walk: 2, write: 1 } );
} );

// A trial still open when the walk cap is reached (Lenses, 2026-10-07: reported "unconfirmed: the run ended before the
// next walk") gets one settling walk, so the guard's verdict is proven or the setting restored, never left unconfirmed.
test( 'MUST FAIL TO LEAVE UNCONFIRMED: a trial open at the walk cap is settled by one more walk', async () => {
	const { calls, steps } = loopSteps();
	let pending = false;
	let settled = 0;
	const out = await solveLoop( { maxRounds: 1, ...steps,
		guard: () => ( pending = true, [ { trial: true } ] ),
		settle: () => ( pending ? ( settled++, pending = false, [ { reverted: true } ] ) : [] ),
		pending: () => pending,
	} );
	assert.equal( settled, 1 );
	assert.equal( calls.walk, 1 * 4 + 1 + 1 );
	assert.ok( out.report );
} );

test( 'positive control: no trial open at the end, no extra walk', async () => {
	const { calls, steps } = loopSteps();
	await solveLoop( { maxRounds: 1, ...steps, settle: () => [], pending: () => false } );
	assert.deepEqual( calls, { build: 2, walk: 2, write: 1 } );
} );

// B4 (plan archive/2026-10-04-eye-care-sweep-audit-fix.md): a ledgered row's target is Bean's decided value. Before, a drifted
// row kept the raw draft as Solve's target (draftValues read the draft snapshot), so the next Solve wrote the draft over
// the decision.
import { judgeDivergence } from '../../parity/lib/divergences.mjs';
const decision = [ { id: 'D-5', node: 'cr-ref-h-1', state: '*', property: 'font-size', expected: { value: '16px' }, reason: 'decided' } ];
const ledgered = ( live ) => {
	const row = { kind: 'style', key: 'font-size', draft: '18px', live, ref: 'cr-ref-h-1', path: '' };
	judgeDivergence( decision, { state: 'opening', width: 1440 }, row, 0.5 );
	return { runs: [ pairRun( 'opening', '18px', [ row ] ) ] };
};

test( 'MUST FAIL TO OVERWRITE A DECISION: a drifted value entry is written back to the decided value, not the draft', () => {
	const rep = ledgered( '20px' );
	assert.equal( rep.runs[ 0 ].pairs.head.diffs[ 0 ].draft, '16px', 'the row reads the decided value as plain text' );
	assert.deepEqual( draftValues( rep, 'head', 'font-size', false ).perWidth, { 1440: '16px' } );
	const t = headTree();
	const r = writeRound( rep, t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: headCal } );
	assert.equal( r.writes.length, 1 );
	assert.match( JSON.stringify( r.writes[ 0 ].after ), /16/ );
	assert.doesNotMatch( JSON.stringify( r.writes[ 0 ].after ), /18/ );
} );

test( 'MUST FAIL TO OVERWRITE A DECISION: at a width the entry accepts, a group written from another width targets the decided value', () => {
	const held = ledgered( '16px' ).runs[ 0 ];
	const other = pairRun( 'opening', '18px', [ { kind: 'style', key: 'font-size', draft: '18px', live: '20px', ref: 'cr-ref-h-1', path: '' } ] );
	other.width = 768;
	assert.ok( held.pairs.head.diffs[ 0 ].decided && 'D-5' === held.pairs.head.diffs[ 0 ].decided.id );
	assert.deepEqual( draftValues( { runs: [ held, other ] }, 'head', 'font-size', false ).perWidth, { 1440: '16px', 768: '18px' } );
} );

// L8.7: the write path and the classification read one set of calibrated paths. A row whose only evidence is a
// DISCOVERED slot (an enum setting with no css_property) must reach lib/resolve.mjs::resolveDiscovered, here as in triage.
import { resolveIssue } from '../lib/triage.mjs';
const DISC_PATH = '.sgs-fixture__inner';
const discCal = () => ( { elements: {}, settings: {}, discovered: { layout: { display: { slots: [ DISC_PATH ], values: { flex: { 375: 'flex', 768: 'flex', 1440: 'flex' } } } } } } );
const discTree = () => [ { name: 'sgs/fixture-block', attributes: { className: 'cr-ref-d-1' } } ];
const discRow = { kind: 'style', key: 'display', draft: 'flex', live: 'block', ref: 'cr-ref-d-1', path: DISC_PATH };
const discReport = () => ( { runs: [ 375, 768, 1440 ].map( ( width ) => ( { state: 'opening', width, pairs: { box: { draft: { styles: { display: 'flex' } }, diffs: [ discRow ] } } } ) ) } );

test( 'MUST FAIL: a row whose only calibrated evidence is a discovered slot is written, never gapped unmapped-element', () => {
	const t = discTree();
	const r = writeRound( discReport(), t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: discCal } );
	assert.deepEqual( Object.values( r.gaps ), [] );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'layout', 'flex' ] ] );
	assert.equal( t[ 0 ].attributes.layout, 'flex' );
} );

test( 'the write path and triage agree on the same discovered-slot row: both find the setting', () => {
	const res = resolveIssue( { key: 'k', rows: [ { ...discRow, pair: 'box', state: 'opening', width: 1440 } ] }, { db, snapshot, stateMap: { opening: null }, walk: discReport(), nodeFor: () => discTree()[ 0 ], calFor: discCal } );
	assert.deepEqual( res.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'layout', 'flex' ] ] );
} );

test( 'the negative control: a path no calibrated source names is still gapped unmapped-element', () => {
	const t = discTree();
	const rep = discReport();
	rep.runs.forEach( ( run ) => ( run.pairs.box.diffs = [ { ...discRow, path: '.sgs-fixture__elsewhere' } ] ) );
	const r = writeRound( rep, t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: discCal } );
	assert.equal( r.writes.length, 0 );
	assert.equal( Object.values( r.gaps )[ 0 ].gap, 'unmapped-element' );
} );

// L8.7 second half: the canvas flag, the row's ancestors and the element paths measured under them reach the hop.
const HOP_PANEL_PATH = '.sgs-mega-panel__content > .sgs-mega-group:nth-of-type(1)';
const hopTree = () => [ { name: 'sgs/mega-panel', attributes: { className: 'cr-ref-m-0' }, innerBlocks: [ { name: 'sgs/mega-group', attributes: { className: 'cr-ref-m-1' } } ] } ];
const hopRow = { kind: 'style', key: 'padding-top', draft: '26px', live: '0px', ref: 'cr-ref-m-1', path: '', owners: [ { ref: 'cr-ref-m-0', block: 'sgs-mega-panel', path: HOP_PANEL_PATH, tag: 'a' } ] };
const hopReport = () => ( { runs: [ { state: 'opening', width: 1440, pairs: { grp: { draft: { styles: { 'padding-top': '26px' } }, diffs: [ hopRow ] } } } ] } );
const hopCal = ( panelSettings = {} ) => ( name ) => ( 'sgs/mega-group' === name ? { elements: { '': {} }, settings: {} } : { elements: {}, settings: panelSettings } );

test( 'MUST FAIL: a row nothing on its own or its enclosing blocks can write reaches the ancestor hop with the canvas flag, its ancestors and their measured paths, and the hop\'s write is applied', () => {
	let seen = null;
	const t = hopTree();
	const ancestorHop = ( input, ctx ) => {
		seen = { input, ctx };
		return { writes: [ { attr: 'panelPadding', value: { desktop: { top: '26px' } }, merge: 'deep' } ], on: { ref: 'cr-ref-m-0', block: 'sgs/mega-panel', path: HOP_PANEL_PATH }, via: 'calibration', cite: { check: 'canvas-settable' } };
	};
	const r = writeRound( hopReport(), t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: hopCal(), canvas: true, ancestorHop } );
	assert.equal( seen.ctx.canvas, true );
	assert.deepEqual( seen.ctx.ancestors.map( ( a ) => [ a.ref, a.block, a.path, a.tag ] ), [ [ 'cr-ref-m-0', 'sgs/mega-panel', HOP_PANEL_PATH, 'a' ] ] );
	assert.deepEqual( seen.ctx.measuredSlots, [ HOP_PANEL_PATH ] );
	assert.equal( seen.input.block, 'sgs/mega-group' );
	assert.equal( seen.input.prop, 'padding-top' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.ref, w.block, w.attr ] ), [ [ 'cr-ref-m-0', 'sgs/mega-panel', 'panelPadding' ] ] );
	assert.deepEqual( t[ 0 ].attributes.panelPadding, { desktop: { top: '26px' } } );
	assert.equal( t[ 0 ].innerBlocks[ 0 ].attributes.panelPadding, undefined );
} );

test( 'MUST FAIL: the real hop, on a canvas, cites the block that can hold the row and the gap says canvas-settable; off a canvas it does not', () => {
	const on = writeRound( hopReport(), hopTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: hopCal( { panelPadding: { property: 'padding', slot: '', slots: [ '' ] } } ), canvas: true } );
	const g = Object.values( on.gaps )[ 0 ];
	assert.equal( on.writes.length, 0 );
	assert.equal( g.gap, 'no-setting' );
	assert.equal( g.canvasSettable, true );
	assert.equal( g.cite.setting, 'panelPadding' );
	const off = writeRound( hopReport(), hopTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: hopCal( { panelPadding: { property: 'padding', slot: '', slots: [ '' ] } } ), canvas: false } );
	assert.notEqual( Object.values( off.gaps )[ 0 ].canvasSettable, true );
} );

// L8.8: walker states that map to one setting state must agree on the draft value, or the group is refused. Before, the
// last run's value won and the route wrote it and reported success.
const conflictRun = ( state, draftPx, rows ) => ( { state, width: 1440, pairs: { head: { draft: { styles: { 'font-size': draftPx } }, diffs: rows } } } );
const fsRow = { kind: 'style', key: 'font-size', draft: '15px', live: '20px', ref: 'cr-ref-h-1', path: '' };

test( 'MUST FAIL: two walker states mapped to one setting state with different draft values at one width are refused and named, not written', () => {
	const rep = { runs: [ conflictRun( 'tab-one', '15px', [ { ...fsRow } ] ), conflictRun( 'tab-two', '18px', [ { ...fsRow, draft: '18px' } ] ) ] };
	const sm = { 'tab-one': null, 'tab-two': null };
	const t = headTree();
	const out = writableGroups( rep, sm );
	assert.equal( out.groups.length, 0 );
	assert.equal( out.stateConflict.length, 1 );
	const r = writeRound( rep, t, { db, snapshot, round: 1, log: [], stateMap: sm, calFor: headCal } );
	assert.equal( r.writes.length, 0 );
	assert.equal( t[ 0 ].attributes.fontSize, undefined );
	const gap = Object.values( r.gaps )[ 0 ];
	assert.equal( gap.gap, 'state-conflict' );
	assert.match( gap.detail, /tab-one/ );
	assert.match( gap.detail, /tab-two/ );
	assert.match( gap.detail, /15px/ );
	assert.match( gap.detail, /18px/ );
} );

test( 'MUST FAIL: a single named state colliding with the baseline state that maps to the same setting state is refused', () => {
	// Only reviews-next carries an open row; opening reads the same pair at another value and maps to rest as well.
	const rep = { runs: [ conflictRun( 'opening', '18px', [] ), conflictRun( 'reviews-next', '15px', [ { ...fsRow } ] ) ] };
	const sm = { opening: null, 'reviews-next': null };
	const r = writeRound( rep, headTree(), { db, snapshot, round: 1, log: [], stateMap: sm, calFor: headCal } );
	assert.equal( r.writes.length, 0 );
	assert.equal( Object.values( r.gaps )[ 0 ].gap, 'state-conflict' );
} );

test( 'the negative control: two walker states mapped to one setting state with the same draft value are still written', () => {
	const rep = { runs: [ conflictRun( 'tab-one', '15px', [ { ...fsRow } ] ), conflictRun( 'tab-two', '15px', [ { ...fsRow } ] ) ] };
	const sm = { 'tab-one': null, 'tab-two': null };
	assert.equal( writableGroups( rep, sm ).stateConflict.length, 0 );
	const r = writeRound( rep, headTree(), { db, snapshot, round: 1, log: [], stateMap: sm, calFor: headCal } );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'fontSize' ] );
	assert.deepEqual( r.gaps, {} );
} );

test( 'the negative control: states mapped to different setting states may differ, and so may different widths of one state', () => {
	const rep = { runs: [ conflictRun( 'opening', '18px', [] ), conflictRun( 'scrolled', '15px', [ { ...fsRow } ] ), { ...conflictRun( 'opening', '12px', [] ), width: 375 } ] };
	const out = writableGroups( rep, { opening: null, scrolled: 'scrolled' } );
	assert.equal( out.stateConflict.length, 0 );
	assert.equal( out.groups.length, 1 );
} );

// L8.1 to L8.3: text, presence and link-coverage rows. The walker stamps no ref, path or block on these rows
// (ref-trace.mjs::stampRefs stamps style, hover, box, tag, active and lines rows only), so the node comes from the
// pair's live trace, which exists wherever the live element does. A calibrated `text`, `presence` or `link` entry is the
// only thing that makes one writable; without it the row is a gap, never a silent success. A text row writes the draft's
// words and never a style value (R-47-4).
import { classify, handoverOf, HANDOVER_OWNERS } from '../lib/solve-rows.mjs';
const CTRACE = { ref: 'cr-ref-c-1', path: '', textPath: '.sgs-fixture__title' };
const cTree = () => [ { name: 'sgs/fixture-text', attributes: { className: 'cr-ref-c-1', title: 'Old', ctaUrl: '/old' } } ];
const cReport = ( rows, { widths = [ 375, 768, 1440 ], trace = CTRACE, styles = {} } = {} ) => ( { runs: widths.map( ( width ) => ( { state: 'opening', width, pairs: { ttl: { draft: { styles, text: '' }, live: { trace }, diffs: rows.map( ( x ) => ( { ...x } ) ) } } } ) ) } );
const cCal = ( extra = {} ) => () => ( { elements: { '': {}, '.sgs-fixture__title': {} }, settings: {}, ...extra } );
const cWrite = ( rep, calFor, over = {} ) => writeRound( rep, over.tree || cTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor, ...over } );
const TEXT = { kind: 'text', key: 'text', draft: 'Delivery & returns', live: 'Delivery and returns' };
const TEXT_CAL = { text: { title: { path: '.sgs-fixture__title', reachedAt: [ 375, 768, 1440 ] } } };

test( 'MUST FAIL: a text row with no ref of its own is written through the pair\'s live trace, as the draft\'s words, escaped', () => {
	const t = cTree();
	const r = cWrite( cReport( [ TEXT ] ), cCal( TEXT_CAL ), { tree: t } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.ref, w.attr, w.after ] ), [ [ 'cr-ref-c-1', 'title', 'Delivery &amp; returns' ] ] );
	assert.equal( t[ 0 ].attributes.title, 'Delivery &amp; returns' );
	assert.deepEqual( r.gaps, {} );
} );

test( 'the negative control: a text row with no calibrated text entry is a no-setting gap and writes nothing', () => {
	const t = cTree();
	const r = cWrite( cReport( [ TEXT ] ), cCal( { text: {} } ), { tree: t } );
	assert.equal( r.writes.length, 0 );
	assert.equal( t[ 0 ].attributes.title, 'Old' );
	assert.equal( Object.values( r.gaps )[ 0 ].gap, 'no-setting' );
	assert.equal( cWrite( cReport( [ TEXT ] ), cCal() ).writes.length, 0, 'a block with no text key at all is the same gap' );
} );

test( 'R-47-4 holds: a text row never writes a style value, even where a style setting is calibrated', () => {
	const r = cWrite( cReport( [ TEXT ] ), cCal( { settings: { fontSize: { slot: '.sgs-fixture__title', slots: [ '.sgs-fixture__title' ], property: 'font-size' } } } ) );
	assert.equal( r.writes.length, 0 );
} );

test( 'a text setting that did not reach the element at a measured width is unreached, and a capped or transformed read is refused', () => {
	assert.equal( Object.values( cWrite( cReport( [ TEXT ] ), cCal( { text: { title: { path: '.sgs-fixture__title', reachedAt: [ 1440 ] } } } ) ).gaps )[ 0 ].gap, 'unreached' );
	assert.equal( Object.values( cWrite( cReport( [ { ...TEXT, draft: 'x'.repeat( 400 ) } ] ), cCal( TEXT_CAL ) ).gaps )[ 0 ].gap, 'shape' );
	assert.equal( Object.values( cWrite( cReport( [ TEXT ], { styles: { 'text-transform': 'uppercase' } } ), cCal( TEXT_CAL ) ).gaps )[ 0 ].gap, 'shape' );
} );

const PRESENT = { kind: 'presence', key: 'element', draft: 'missing', live: 'present' };
const PTRACE = { ref: 'cr-ref-c-1', path: '.sgs-fixture__badge' };
const PRES_CAL = { presence: { hideBadge: { shows: [], hides: [ '.sgs-fixture__badge' ] }, 'layout=plain': { shows: [], hides: [ '.sgs-fixture__other' ] } } };

test( 'MUST FAIL: a presence row for an element live shows and the draft lacks is written through the setting whose calibrated presence hides it', () => {
	const t = cTree();
	const r = cWrite( cReport( [ PRESENT ], { trace: PTRACE } ), cCal( PRES_CAL ), { tree: t } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'hideBadge', true ] ] );
	assert.equal( t[ 0 ].attributes.hideBadge, true );
} );

test( 'a variant value whose calibrated presence hides the element is written as that value', () => {
	const cal = cCal( { presence: { 'layout=plain': { shows: [], hides: [ '.sgs-fixture__badge' ] } } } );
	assert.deepEqual( cWrite( cReport( [ PRESENT ], { trace: PTRACE } ), cal ).writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'layout', 'plain' ] ] );
} );

test( 'the negative control: a presence row with no calibrated presence entry for that element is a gap, never a write', () => {
	const t = cTree();
	const r = cWrite( cReport( [ PRESENT ], { trace: { ...PTRACE, path: '.sgs-fixture__unknown' } } ), cCal( PRES_CAL ), { tree: t } );
	assert.equal( r.writes.length, 0 );
	assert.deepEqual( t, cTree() );
	assert.equal( Object.values( r.gaps )[ 0 ].gap, 'no-setting' );
	assert.equal( cWrite( cReport( [ PRESENT ], { trace: PTRACE } ), cCal() ).writes.length, 0 );
} );

test( 'a presence row for an element the live page lacks has no node to name: it stays unwritten and is unattributed', () => {
	const rep = cReport( [ { kind: 'presence', key: 'element', draft: 'present', live: 'missing' } ], { trace: null } );
	assert.equal( cWrite( rep, cCal( PRES_CAL ) ).writes.length, 0 );
	assert.equal( writableGroups( rep, { opening: null } ).contentUnattributed.length, 3 );
} );

test( 'a presence row at only some widths is refused: a global toggle would change the other widths', () => {
	const rep = cReport( [ PRESENT ], { trace: PTRACE } );
	rep.runs[ 0 ].pairs.ttl.diffs = [];
	assert.equal( Object.values( cWrite( rep, cCal( PRES_CAL ) ).gaps )[ 0 ].gap, 'shape' );
} );

const LINK_EXTRA = { kind: 'auto', key: 'link-extra "Read more"', draft: 'plain', live: 'link' };
const LINK_CAL = { link: { ctaUrl: { path: '.sgs-fixture__title', attr: 'href' } } };

test( 'MUST FAIL: a link-extra row is written through the setting whose calibrated link is that element, clearing the link', () => {
	const t = cTree();
	const r = cWrite( cReport( [ LINK_EXTRA ] ), cCal( LINK_CAL ), { tree: t } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'ctaUrl', '' ] ] );
	assert.equal( t[ 0 ].attributes.ctaUrl, '' );
} );

test( 'the negative control: a link row with no calibrated link entry is a gap; a link-missing row has no target to write', () => {
	assert.equal( Object.values( cWrite( cReport( [ LINK_EXTRA ] ), cCal( { link: {} } ) ).gaps )[ 0 ].gap, 'no-setting' );
	const missing = cWrite( cReport( [ { ...LINK_EXTRA, key: 'link-missing "Read more"', draft: 'link', live: 'plain' } ] ), cCal( LINK_CAL ) );
	assert.equal( missing.writes.length, 0 );
	assert.equal( Object.values( missing.gaps )[ 0 ].gap, 'no-target' );
} );

test( 'an ordinary auto row is not a content row and is never written', () => {
	const rep = cReport( [ { kind: 'auto', key: 'words', draft: 'a', live: 'b' } ] );
	assert.equal( cWrite( rep, cCal( LINK_CAL ) ).writes.length, 0 );
	assert.equal( writableGroups( rep, { opening: null } ).content.length, 0 );
} );

// L8.4: the handover list. A row no block setting could hold because its content lives outside the tree.
const siteInfoOwner = ( node ) => ( 'sgs/fixture-text' === node.name ? 'site-info' : null );
const handed = ( ownerOf ) => {
	const rep = cReport( [ TEXT ] );
	const r = cWrite( rep, cCal( { text: {} } ), { ownerOf } );
	return { rep, r, classes: classify( rep, { writes: r.writes, gaps: r.gaps, stateMap: { opening: null } } ) };
};

test( 'MUST FAIL: a text row whose block reads its words from outside the tree is a handover with its owner and evidence row', () => {
	const { r, classes } = handed( siteInfoOwner );
	assert.equal( Object.values( r.gaps )[ 0 ].gap, 'handover' );
	const list = handoverOf( classes );
	assert.equal( list.length, 1 );
	assert.equal( list[ 0 ].owner, 'site-info' );
	assert.equal( list[ 0 ].row.kind, 'text' );
	assert.equal( list[ 0 ].row.draft, 'Delivery & returns' );
	assert.equal( classes.missing.length, 0 );
} );

test( 'the boundary: the same row on a block nothing says reads outside the tree is Missing setting, never handover', () => {
	const { classes } = handed( () => null );
	assert.deepEqual( handoverOf( classes ), [] );
	assert.deepEqual( classes.other.map( ( x ) => x.contentClass ), [ 'missing', 'missing', 'missing' ] );
} );

test( 'handover owners are the five the spec names, and an owner outside them is not trusted', () => {
	assert.deepEqual( [ ...HANDOVER_OWNERS ].sort(), [ 'behaviour', 'content-page', 'product-data', 'site-info', 'woocommerce-text' ] );
	assert.deepEqual( handoverOf( handed( () => 'made-up' ).classes ), [] );
	assert.equal( handoverOf( handed( () => 'woocommerce-text' ).classes )[ 0 ].owner, 'woocommerce-text' );
} );

test( 'a handover is listed once per distinct issue, whatever the widths, and a behaviour row the walker cannot drive is a handover', () => {
	const rep = cReport( [ TEXT, { kind: 'drive', key: 'tap .x', draft: 'opened', live: 'nothing' } ] );
	const r = cWrite( rep, cCal( { text: {} } ), { ownerOf: siteInfoOwner } );
	const list = handoverOf( classify( rep, { writes: r.writes, gaps: r.gaps, stateMap: { opening: null } } ) );
	assert.deepEqual( list.map( ( h ) => h.owner ).sort(), [ 'behaviour', 'site-info' ] );
	assert.deepEqual( list.find( ( h ) => 'site-info' === h.owner ).widths, [ 375, 768, 1440 ] );
} );

test( 'content rows widen what Solve writes without pulling box rows in: a box row stays derived, an unmapped state stays unmapped', () => {
	const rep = cReport( [ { kind: 'box', key: 'h', draft: 10, live: 20, ref: 'cr-ref-c-1', path: '' } ] );
	const out = writableGroups( rep, { opening: null } );
	assert.equal( out.box.length, 3 );
	assert.equal( out.content.length + out.groups.length, 0 );
	assert.equal( classify( rep, { writes: [], gaps: {}, stateMap: { opening: null } } ).derived.length, 3 );
	assert.equal( writableGroups( cReport( [ TEXT ] ), {} ).content.length, 0 );
	assert.equal( cWrite( cReport( [ TEXT ] ), cCal( TEXT_CAL ), { stateMap: {} } ).writes.length, 0 );
} );

import { outsideOwner } from '../solve.mjs';
test( 'MUST FAIL: a block\'s outside-the-tree owner is read from its render source, and a block with no such evidence has none', () => {
	const src = { 'sgs/a': 'Sgs_Site_Info::get( x )', 'sgs/b': "wc_get_template( 'x' )", 'sgs/c': 'wc_get_product( $id )', 'sgs/d': '<?php echo esc_html( $attributes["title"] );' };
	const owner = ( name, refs = {} ) => outsideOwner( { name, attributes: {} }, { refs, source: ( n ) => src[ n ] ?? null } );
	assert.deepEqual( [ 'sgs/a', 'sgs/b', 'sgs/c', 'sgs/d', 'sgs/none' ].map( ( n ) => owner( n ) ), [ 'site-info', 'woocommerce-text', 'product-data', null, null ] );
	assert.equal( outsideOwner( { name: 'core/template-part', attributes: { slug: 'x' } }, { source: () => null } ), 'content-page' );
} );

// L8.5: wholePage counts what lib/issue-classes.mjs::isIssue counts, link coverage included.
import { isIssue } from '../lib/issue-classes.mjs';
test( 'MUST FAIL TO COUNT: a link-missing row counts in wholePage exactly as it does under isIssue', () => {
	const rep = { runs: [ { state: 'opening', width: 375, pairs: { p: { diffs: [ { kind: 'auto', key: 'link-missing "x"', ref: 'r', path: '', draft: 'link', live: 'plain' }, { kind: 'auto', key: 'words', ref: 'r', path: '' } ] } } } ] };
	const rows = rep.runs[ 0 ].pairs.p.diffs;
	assert.equal( rows.filter( isIssue ).length, 1 );
	assert.equal( wholePage( { runs: [] }, rep, {} ).after, 1 );
	assert.equal( wholePage( rep, rep, {} ).before, 1 );
} );

test( 'the report writes its whole-page line for any surface, from the final walk against the first', () => {
	const before = { runs: [ { state: 'opening', width: 375, pairs: { p: { diffs: [ { kind: 'style', key: 'gap', ref: 'cr-ref-s-1', path: '', draft: '1px', live: '2px' } ] } } } ] };
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-solve-report-' ) );
	try {
		writeSolveReport( dir, { surface: 's', refsAdded: 0, rounds: 0, writes: [], wrong: [], gaps: {}, classes: { hardcode: [], missing: [], unresolved: [], derived: [], other: [] }, snaps: [], intended: 0, unmappedState: 0, handover: [], before, after: before } );
		assert.equal( JSON.parse( fs.readFileSync( path.join( dir, 'solve-report.json' ), 'utf8' ) ).wholePage.after, 1 );
		assert.match( fs.readFileSync( path.join( dir, 'solve-report.md' ), 'utf8' ), /\*\*Whole page/ );
		assert.deepEqual( JSON.parse( fs.readFileSync( path.join( dir, 'solve-report.json' ), 'utf8' ) ).handover, [] );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

// Wrong writes are judged per setting (one attribute on one node): a chained setting written for two properties is one
// verdict, not two (Lenses, 2026-10-07: the page container's padding, written for its top and its bottom, counted twice).
import { settingRatio } from '../solve.mjs';
test( 'MUST FAIL TO DOUBLE-COUNT: two writes to one setting are one wrong setting', () => {
	const all = [ ...lw(), { round: 1, group: 'g-x', ref: 'cr-ref-l-1', attr: 'gap', prop: 'row-gap' } ];
	assert.deepEqual( settingRatio( all.slice( 0, 2 ), all ), { wrong: 1, total: 3 } );
} );

// A border colour on an element whose draft border is 0px wide paints nothing: the draft's value is its text colour
// carried along by currentColor (D-65, D-66, D-88 to D-91). Solve leaves it as a not-painted gap instead of writing it.
import { unpaintedBorder } from '../solve.mjs';
const borderRun = ( width, style = 'solid' ) => ( { runs: [ 375, 1440 ].map( ( w ) => ( { state: 'opening', width: w, pairs: { phone: {
	draft: { styles: { 'border-top-width': width, 'border-top-style': style, 'border-top-color': 'rgb(20, 20, 20)' }, hover: { 'border-top-color': 'rgb(119, 113, 106)' } },
	diffs: [] } } } ) ) } );
const borderGroup = { pair: 'phone', prop: 'border-top-color', state: 'hover', walkerStates: [ 'opening' ], pseudo: null };

test( 'MUST FAIL TO WRITE PAINTLESS: a border colour whose draft border is 0px wide is a not-painted gap', () => {
	assert.equal( unpaintedBorder( borderRun( '0px', 'none' ), borderGroup )?.gap, 'not-painted' );
	assert.equal( unpaintedBorder( borderRun( '0px' ), borderGroup )?.gap, 'not-painted' );
} );

test( 'positive control: a painted draft border, or a non-border row, is written as before', () => {
	assert.equal( unpaintedBorder( borderRun( '1px' ), borderGroup ), null );
	assert.equal( unpaintedBorder( borderRun( '0px' ), { ...borderGroup, prop: 'color' } ), null );
} );

// QC council 2026-10-08 (rater A). A write placed on an owner node for a child's row (a form's field style) carries the
// child's group; it has landed only when that child row closed, never because the owner has no open row of its own.
test( 'MUST FAIL (QC A1): an owner write whose child row is still open is a suspect for the owner\'s own height', () => {
	const t = lensTree();
	const w = [ { round: 1, group: 'cr-ref-l-1|.child|padding-top|', ref: 'cr-ref-l-0', block: 'sgs/container', path: '.child', attr: 'fieldPadding', prop: 'padding-top', before: undefined, after: { desktop: { top: '4px' } } } ];
	const childOpen = { kind: 'style', key: 'padding-top', draft: '4px', live: '9px', ref: 'cr-ref-l-1', path: '.child' };
	const out = guardRound( lensRun( [ childOpen ] ), lensRun( [ ownHeight, childOpen ] ), t, w, new Map(), () => ( { settings: {} } ), new Map() );
	assert.ok( out.some( ( x ) => 'fieldPadding' === x.attr && x.trial ), 'the owner write is tried' );
} );

// A trial the settling walk finds innocent is restored; the tree then holds a write the last walk never measured, so one
// more walk follows (QC A3).
test( 'MUST FAIL (QC A3): a setting restored by the settling walk is walked once more', async () => {
	const { calls, steps } = loopSteps();
	let pending = false;
	const out = await solveLoop( { maxRounds: 1, ...steps,
		guard: () => ( pending = true, [ { trial: true } ] ),
		settle: () => ( pending = false, [ { restored: true } ] ),
		pending: () => pending,
	} );
	assert.equal( calls.walk, 1 * 4 + 1 + 2 );
	assert.ok( out.report );
} );

// A hover border colour is unpainted only when the draft has no border on that side in that state (QC A4): a border
// that appears on hover is painted.
test( 'MUST FAIL (QC A4): a border drawn only on hover is painted, so its hover colour is written', () => {
	const r = borderRun( '0px', 'none' );
	r.runs.forEach( ( run ) => Object.assign( run.pairs.phone.draft.hover, { 'border-top-width': '1px', 'border-top-style': 'solid' } ) );
	assert.equal( unpaintedBorder( r, borderGroup ), null );
} );

// R6 step 3: the trial judges each round's writes before the rebuild. A rejected setting goes back to its round-start
// value, its writes leave the round and every group that wrote it is blocked with the trial's reason.
import { applyVerdicts } from '../lib/trial.mjs';
const cardTree = () => [ { name: 'sgs/container', attributes: { className: 'cr-ref-home-9', padding: { top: '16px' } }, innerBlocks: [
	{ name: 'sgs/heading', attributes: { className: 'cr-ref-home-10', fontSize: '20px' }, innerBlocks: [] },
] } ];
const roundOf = () => {
	const start = cardTree();
	const tree = cardTree();
	tree[ 0 ].attributes.padding = { top: '32px' };
	tree[ 0 ].innerBlocks[ 0 ].attributes.fontSize = '24px';
	const writes = [
		{ round: 1, group: 'g-pad-top', ref: 'cr-ref-home-9', block: 'sgs/container', attr: 'padding', before: { top: '16px' }, after: { top: '32px' } },
		{ round: 1, group: 'g-pad-inner', ref: 'cr-ref-home-9', block: 'sgs/container', attr: 'padding', before: { top: '32px' }, after: { top: '32px' } },
		{ round: 1, group: 'g-font', ref: 'cr-ref-home-10', block: 'sgs/heading', attr: 'fontSize', before: '20px', after: '24px' },
	];
	return { start, tree, writes, gaps: {}, blocked: new Map() };
};

test( 'MUST FAIL TO WRITE A REJECT: a rejected card padding goes back to its round-start value, leaves the writes and blocks its group', () => {
	const r = roundOf();
	const out = applyVerdicts( { ...r, results: [ { ref: 'cr-ref-home-9', attr: 'padding', verdict: 'reject', delta: 12.5, worse: [ { width: 375, pair: 'card', by: 44 } ] } ] } );
	assert.deepEqual( r.tree[ 0 ].attributes.padding, { top: '16px' } );
	assert.ok( ! out.writes.some( ( w ) => 'padding' === w.attr ) );
	assert.equal( out.rejected.length, 2 );
	assert.equal( r.blocked.get( 'g-pad-top' ).gap, 'trial-reject' );
	assert.match( r.blocked.get( 'g-pad-top' ).detail, /card@375/ );
	assert.equal( out.gaps[ 'g-pad-top' ].gap, 'trial-reject' );
} );

test( 'MUST FAIL TO WRITE A REJECT: two groups that resolved to one rejected setting are both blocked, and the other setting stays', () => {
	const r = roundOf();
	const out = applyVerdicts( { ...r, results: [ { ref: 'cr-ref-home-9', attr: 'padding', verdict: 'reject', delta: 3, worse: [] } ] } );
	assert.ok( r.blocked.has( 'g-pad-top' ) && r.blocked.has( 'g-pad-inner' ) );
	assert.equal( r.tree[ 0 ].innerBlocks[ 0 ].attributes.fontSize, '24px' );
	assert.deepEqual( out.writes.map( ( w ) => w.group ), [ 'g-font' ] );
} );

test( 'a rejected setting the block did not hold at round start is removed, never left at the written value', () => {
	const r = roundOf();
	delete r.start[ 0 ].attributes.padding;
	applyVerdicts( { ...r, results: [ { ref: 'cr-ref-home-9', attr: 'padding', verdict: 'reject', delta: 3, worse: [] } ] } );
	assert.ok( ! Object.hasOwn( r.tree[ 0 ].attributes, 'padding' ) );
} );

test( 'negative control: keep, no-box-change, needs-rebuild, no-css and error leave the tree, the writes and blocked alone', () => {
	for ( const verdict of [ 'keep', 'no-box-change', 'needs-rebuild', 'no-css', 'error' ] ) {
		const r = roundOf();
		const tree = structuredClone( r.tree );
		const out = applyVerdicts( { ...r, results: [ { ref: 'cr-ref-home-9', attr: 'padding', verdict } ] } );
		assert.deepEqual( r.tree, tree, verdict );
		assert.equal( out.writes.length, 3, verdict );
		assert.equal( r.blocked.size, 0, verdict );
		assert.deepEqual( out.rejected, [], verdict );
	}
} );

test( 'MUST FAIL TO COUNT: an async write step (the trial runs inside it) has its writes counted and walked', async () => {
	const { calls, steps } = loopSteps();
	const out = await solveLoop( { maxRounds: 1, ...steps, write: async () => ( calls.write++, { writes: [ { group: 'g' } ], gaps: {} } ) } );
	assert.deepEqual( calls, { build: 2, walk: 2, write: 1 } );
	assert.equal( out.writes.length, 1 );
} );

// Open tool defect 5: a build that fails in round 1 left no walk, and the CLI then threw ENOENT reading
// round-1/report.json instead of reporting the failure.
test( 'MUST FAIL (defect 5): a failed round-1 build is reported with its round and error, and no walk runs', async () => {
	const { calls, steps } = loopSteps();
	const out = await solveLoop( { maxRounds: 1, ...steps, build: () => ( calls.build++, { ok: false, err: 'wp-build-page exited 1' } ) } );
	assert.deepEqual( out.buildFailed, { round: 1, err: 'wp-build-page exited 1' } );
	assert.equal( calls.walk, 0 );
	assert.equal( out.report, undefined );
} );

test( 'negative control: a run whose builds all pass reports no build failure', async () => {
	const { steps } = loopSteps();
	assert.equal( ( await solveLoop( { maxRounds: 1, ...steps } ) ).buildFailed, null );
} );
