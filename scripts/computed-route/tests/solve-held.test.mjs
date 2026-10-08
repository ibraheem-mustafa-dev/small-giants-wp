// Proves how Solve reports a row whose setting already holds the draft value but whose paint differs (the footer's
// 40px margin that painted 0px at desktop): it is a Hardcode that says what the tree holds, which widths fail and pass,
// and which rule wins on the page, not "Unresolved: not written". Negative controls keep each check from being vacuous.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeRound, heldGroups } from '../solve.mjs';
import { classify, widthPattern, heldReason } from '../lib/solve-rows.mjs';
import { explainCascade, describeCascade, propertyFamily, rowSelector } from '../lib/winning-rule.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const cal = () => ( { elements: { '': {} }, settings: { fontSize: { slot: '', property: 'font-size' } } } );
const tree = () => [ { name: 'sgs/heading', attributes: { className: 'cr-ref-h-1', content: 'Hi' } } ];
const row = { kind: 'style', key: 'font-size', draft: '15px', live: '18px', ref: 'cr-ref-h-1', path: '' };
const runAt = ( width, diffs ) => ( { state: 'opening', width, pairs: { head: { draft: { styles: { 'font-size': '15px' } }, diffs } } } );
const report = () => ( { runs: [ runAt( 375, [] ), runAt( 768, [] ), runAt( 1440, [ { ...row } ] ), runAt( 1920, [ { ...row } ] ) ] } );
const opts = { db, snapshot, log: [], stateMap: { opening: null }, calFor: cal };

test( 'a setting that already holds the draft value is recorded as held, not written', () => {
	const t = tree();
	const first = writeRound( report(), t, { ...opts, round: 1 } );
	assert.equal( first.writes.length, 1, 'the first round writes it' );
	assert.deepEqual( first.held, {}, 'a write is not a hold' );
	const second = writeRound( report(), t, { ...opts, round: 2 } );
	assert.equal( second.writes.length, 0, 'the second round has nothing left to write' );
	const keys = Object.keys( second.held );
	assert.equal( keys.length, 1 );
	assert.equal( second.held[ keys[ 0 ] ][ 0 ].attr, 'fontSize' );
	assert.equal( second.held[ keys[ 0 ] ][ 0 ].block, 'sgs/heading' );
} );

test( 'classify: a held group is a Hardcode that names what the tree holds and where it differs', () => {
	const t = tree();
	writeRound( report(), t, { ...opts, round: 1 } );
	const { held } = writeRound( report(), t, { ...opts, round: 2 } );
	const classes = classify( report(), { writes: [], gaps: {}, held, stateMap: { opening: null } } );
	assert.equal( classes.hardcode.length, 2, 'the 1440 and 1920 rows' );
	assert.equal( classes.unresolved.length, 0 );
	const x = classes.hardcode[ 0 ];
	assert.match( x.reason, /the tree already holds the draft value \(sgs\/heading fontSize = /);
	assert.match( x.reason, /the paint is "18px" where the draft is "15px"/ );
	assert.deepEqual( x.widths, { fails: [ 1440, 1920 ], matches: [ 375, 768 ] } );
} );

test( 'negative control: the same open rows with nothing held stay "Unresolved: not written"', () => {
	const classes = classify( report(), { writes: [], gaps: {}, held: {}, stateMap: { opening: null } } );
	assert.equal( classes.hardcode.length, 0 );
	assert.equal( classes.unresolved.length, 2 );
	assert.ok( classes.unresolved.every( ( r ) => 'not written' === r.reason ) );
} );

test( 'widthPattern reads the widths that fail and pass in the same state only', () => {
	const rep = { runs: [ runAt( 375, [] ), { ...runAt( 1440, [ { ...row } ] ), state: 'scrolled' }, runAt( 1440, [ { ...row } ] ) ] };
	assert.deepEqual( widthPattern( rep, { ...row, state: 'opening' } ), { fails: [ 1440 ], matches: [ 375 ] } );
	assert.equal( heldReason( [ { block: 'b', attr: 'a', value: 1 } ], row ).startsWith( 'the tree already holds' ), true );
} );

// The footer case, as Chrome's matched-rules read returns it: the block's own rule (0,1,0) first, core's full-width rule
// (0,2,0) after it, so the later, stronger rule wins.
const sel = ( text, a, b, c ) => ( { selectorList: { text, selectors: [ { text, specificity: { a, b, c } } ] } } );
const matched = () => ( { matchedCSSRules: [
	{ matchingSelectors: [ 0 ], rule: { ...sel( '.sgs-container-9cef4d54', 0, 1, 0 ), style: { styleSheetId: 's1', cssProperties: [ { name: 'margin-top', value: '40px' } ] } } },
	{ matchingSelectors: [ 0 ], rule: { ...sel( '.wp-site-blocks > .alignfull', 0, 2, 0 ), style: { styleSheetId: 's2', cssProperties: [ { name: 'margin-block-start', value: '0px' } ] } } },
] } );

test( 'explainCascade names the winning rule and the losing rule that carries the draft value', () => {
	const ex = explainCascade( matched(), 'margin-top', '40px', { s1: 'sgs-123.css', s2: 'core-blocks-critical.css' } );
	assert.equal( ex.winner.selector, '.wp-site-blocks > .alignfull' );
	assert.equal( ex.winner.specificity, '0,2,0' );
	assert.equal( ex.winner.source, 'core-blocks-critical.css' );
	assert.equal( ex.carrier.selector, '.sgs-container-9cef4d54' );
	assert.equal( ex.carrier.value, '40px' );
	assert.match( describeCascade( ex, 'margin-top' ), /winning rule `\.wp-site-blocks > \.alignfull` \(0,2,0\) in core-blocks-critical\.css sets margin-block-start: 0px; losing rule `\.sgs-container-9cef4d54` \(0,1,0\) in sgs-123\.css sets margin-top: 40px/ );
} );

test( 'negative control: an !important rule wins, and no rule carrying the draft value says so', () => {
	const m = matched();
	m.matchedCSSRules[ 0 ].rule.style.cssProperties[ 0 ].important = true;
	assert.equal( explainCascade( m, 'margin-top', '40px' ).winner.selector, '.sgs-container-9cef4d54' );
	const none = explainCascade( matched(), 'margin-top', '99px' );
	assert.equal( none.carrier, null );
	assert.match( describeCascade( none, 'margin-top' ), /no rule sets margin-top to the draft's value/ );
} );

test( 'the property family covers the logical longhand and the shorthands; the selector joins ref and path', () => {
	assert.deepEqual( propertyFamily( 'margin-top' ), [ 'margin-top', 'margin-block-start', 'margin-block', 'margin' ] );
	assert.deepEqual( propertyFamily( 'padding-left' ), [ 'padding-left', 'padding-inline-start', 'padding-inline', 'padding' ] );
	assert.deepEqual( propertyFamily( 'transition-duration' ), [ 'transition-duration', 'transition' ] );
	assert.deepEqual( propertyFamily( 'border-top-color' ), [ 'border-top-color', 'border-top', 'border-color', 'border' ] );
	assert.deepEqual( propertyFamily( 'row-gap' ), [ 'row-gap', 'gap' ] );
	assert.deepEqual( propertyFamily( 'color' ), [ 'color' ] );
	assert.match( describeCascade( explainCascade( { matchedCSSRules: [] }, 'color', '#000' ), 'color' ), /no matched rule sets color/, 'a property no rule sets still says so' );
	assert.equal( rowSelector( { ref: 'cr-ref-a-1', path: '' } ), '.cr-ref-a-1' );
	assert.equal( rowSelector( { ref: 'cr-ref-a-1', path: '.sgs-x__y > span' } ), '.cr-ref-a-1 > .sgs-x__y > span' );
} );

test( 'heldGroups reads on a copy: the tree is left as it was, and a group still to be written is not held', () => {
	const t = tree();
	const before = JSON.stringify( t );
	const out = heldGroups( report(), t, { ...opts, blocked: new Map() } );
	assert.equal( JSON.stringify( t ), before, 'nothing written to the real tree' );
	assert.deepEqual( out.held, {}, 'a value Solve would still write is not a hold' );
	writeRound( report(), t, { ...opts, round: 1 } );
	assert.equal( Object.keys( heldGroups( report(), t, { ...opts, blocked: new Map() } ).held ).length, 1, 'once the tree holds it, it is' );
} );

// P2-l: two open rows that resolve to one setting. The first writes it into the copy; the second must not read the copy's
// value as "the tree already holds it".
const rowTree = () => [ { name: 'sgs/site-footer-row', attributes: { className: 'cr-ref-r-1' } } ];
const gapDiff = ( key ) => ( { kind: 'style', key, draft: '10px', live: '32px', ref: 'cr-ref-r-1', path: '.sgs-container__inner' } );
const gapRun = ( width, keys ) => ( { state: 'opening', width, pairs: { row: { draft: { styles: Object.fromEntries( keys.map( ( k ) => [ k, '10px' ] ) ) }, diffs: keys.map( gapDiff ) } } } );
const gapReport = ( keys ) => ( { runs: [ 375, 768, 1440, 1920 ].map( ( w ) => gapRun( w, keys ) ) } );
const gapOpts = { db, snapshot, log: [], stateMap: { opening: null } };

test( 'two rows resolving to one setting: the tree holds neither, so nothing is held (P2-l)', () => {
	const t = rowTree();
	const { held, writes } = heldGroups( gapReport( [ 'gap', 'row-gap' ] ), t, gapOpts );
	assert.deepEqual( held, {}, 'the second row is not held' );
	assert.equal( writes.length, 2, 'both rows are writes' );
	assert.equal( t[ 0 ].attributes.gap, undefined, 'the real tree is untouched' );
} );

test( 'negative control: a tree that really holds the value still holds it for both rows (P2-l)', () => {
	const t = rowTree();
	t[ 0 ].attributes.gap = { mobile: '10px', tablet: '10px', desktop: '10px' };
	const { held, writes } = heldGroups( gapReport( [ 'gap', 'row-gap' ] ), t, gapOpts );
	assert.equal( Object.keys( held ).length, 2, 'both rows are held' );
	assert.equal( writes.length, 0 );
} );

test( 'two rows on one setting: the write round writes it once into the tree, the next round holds both (P2-l)', () => {
	const t = rowTree();
	const first = writeRound( gapReport( [ 'gap', 'row-gap' ] ), t, { ...gapOpts, round: 1 } );
	assert.equal( first.writes.length, 2, 'one entry per row' );
	assert.deepEqual( first.writes.map( ( w ) => w.before ), [ null, null ], 'both record the value before the round' );
	assert.deepEqual( first.writes[ 0 ].after, first.writes[ 1 ].after );
	const second = writeRound( gapReport( [ 'gap', 'row-gap' ] ), t, { ...gapOpts, round: 2 } );
	assert.equal( second.writes.length, 0 );
	assert.equal( Object.keys( second.held ).length, 2 );
} );
