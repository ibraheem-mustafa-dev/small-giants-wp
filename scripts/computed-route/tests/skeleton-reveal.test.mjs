// Reveal states of a draft surface (lib/reveal-merge.mjs, lib/skeleton-reveal.mjs, lib/refresh-pairs.mjs): content a draft shows
// only after a click joins the inventory with the state that shows it, the opening state's records stay as they are, and a
// surface with no hidden state gives back its inventory unchanged (the negative control).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mergeRevealRecords, withRevealed, toggleStates, splitMerged, holdsAll, recId, revealId } from '../lib/reveal-merge.mjs';
import { discoverReveals, readReveals, discoverNested, MAX_NESTED } from '../lib/skeleton-reveal.mjs';
import { refreshPairs } from '../lib/refresh-pairs.mjs';
import { pairsReport } from '../lib/apply-targets.mjs';
import { revealGroups } from '../lib/apply-reveal-read.mjs';

const rec = ( key, tag, words, parentKey = null, extra = {} ) => ( { key, tag, words, allText: words, parentKey, depth: 0, ...extra } );

test( 'toggleStates merges the toggles of one keyed map into one state and keeps scalar toggles apart', () => {
	const t = ( k, after ) => ( { label: k, deltas: [ { component: 'Root', key: 'open', before: {}, after } ], added: [ `Root/9|div|a ${ k }` ], removed: 0 } );
	const step = { label: 'next', deltas: [ { component: 'Form', key: 'step', before: 0, after: 1 } ], added: [ 'Form/5|div|two' ], removed: 0 };
	const hides = { label: 'swap', deltas: [ { component: 'Root', key: 'tab', before: 'a', after: 'b' } ], added: [ 'Root/3|div|b' ], removed: 2 };
	const shows = { label: 'nothing', deltas: [ { component: 'Root', key: 'hover', before: 0, after: 1 } ], added: [], removed: 0 };
	const states = toggleStates( [ t( 'x', { x: true } ), t( 'y', { y: true } ), step, hides, shows ] );
	assert.equal( states.length, 2 );
	assert.deepEqual( states[ 0 ], { component: 'Form', keys: { step: 1 }, covers: [ 2 ], merged: false } );
	assert.deepEqual( states[ 1 ], { component: 'Root', keys: { open: { x: true, y: true } }, covers: [ 0, 1 ], merged: true } );
	const toggles = [ t( 'x', { x: true } ), t( 'y', { y: true } ) ];
	assert.deepEqual( splitMerged( states[ 1 ], toggles ).map( ( s ) => s.keys ), [ { open: { x: true } }, { open: { y: true } } ] );
} );

test( 'holdsAll needs every toggle\'s new elements in the merged read, counted', () => {
	const toggles = [ { added: [ 'a', 'b' ] }, { added: [ 'a' ] } ];
	assert.equal( holdsAll( { opening: { a: 1 }, merged: { a: 3, b: 1 }, toggles, covers: [ 0, 1 ] } ), true );
	assert.equal( holdsAll( { opening: { a: 1 }, merged: { a: 2, b: 1 }, toggles, covers: [ 0, 1 ] } ), false );
} );

test( 'mergeRevealRecords places each new element after its predecessor and leaves the opening records as they were', () => {
	const base = [ rec( 'R/1#0', 'div', '' ), rec( 'R/2#0', 'button', 'Q1', 'R/1#0' ), rec( 'R/2#1', 'button', 'Q2', 'R/1#0' ) ];
	const open = { component: 'R', keys: { open: { a: true } } };
	const records = [ rec( 'R/1#0', 'div', '' ), rec( 'R/2#0', 'button', 'Q1', 'R/1#0' ), rec( 'R/3#0', 'div', 'A1', 'R/1#0' ), rec( 'R/2#1', 'button', 'Q2', 'R/1#0' ), rec( 'R/3#1', 'div', 'A2', 'R/1#0' ) ];
	const out = mergeRevealRecords( base, [ { reveal: open, records } ] );
	assert.deepEqual( out.map( ( r ) => r.key ), [ 'R/1#0', 'R/2#0', 'R/3#0', 'R/2#1', 'R/3#1' ] );
	assert.ok( base.every( ( b ) => out.includes( b ) ), 'the opening records are the same objects' );
	assert.deepEqual( out.filter( ( r ) => r.reveal ).map( ( r ) => r.words ), [ 'A1', 'A2' ] );
	assert.equal( new Set( out.map( recId ) ).size, out.length );
} );

test( 'the same key naming different elements in two states stays two records, and an element both states show is kept once', () => {
	const base = [ rec( 'F/1#0', 'div', '' ), rec( 'F/2#0', 'label', 'Name', 'F/1#0' ) ];
	const s1 = { component: 'F', keys: { step: 1 } };
	const s2 = { component: 'F', keys: { step: 2 } };
	const shared = rec( 'F/9#0', 'button', 'Back', 'F/1#0' );
	const out = mergeRevealRecords( base, [
		{ reveal: s1, records: [ rec( 'F/1#0', 'div', '' ), rec( 'F/2#0', 'label', 'Email', 'F/1#0' ), shared ] },
		{ reveal: s2, records: [ rec( 'F/1#0', 'div', '' ), rec( 'F/2#0', 'label', 'Phone', 'F/1#0' ), shared ] },
	] );
	assert.deepEqual( out.map( ( r ) => `${ r.words }@${ r.reveal ? r.reveal.keys.step : 0 }` ), [ '@0', 'Email@1', 'Back@1', 'Phone@2', 'Name@0' ] );
	assert.notEqual( revealId( s1 ), revealId( s2 ) );
	assert.equal( new Set( out.map( recId ) ).size, out.length );
} );

test( 'a step that replaces the one before keeps a field whose key, tag and text match the field that held it', () => {
	const field = ( label, extra = {} ) => [ rec( 'F/2#0', 'div', '', 'F/1#0', { allText: label, ...extra } ), rec( 'F/3#0', 'label', label, 'F/2#0' ), rec( 'F/4#0', 'input', '', 'F/2#0', { allText: '' } ) ];
	const base = [ rec( 'F/1#0', 'div', '', null, { allText: 'A' } ), ...field( 'A' ) ];
	const step = { component: 'F', keys: { step: 1 } };
	const out = mergeRevealRecords( base, [ { reveal: step, records: [ rec( 'F/1#0', 'div', '', null, { allText: 'B' } ), ...field( 'B' ) ] } ] );
	assert.deepEqual( out.filter( ( r ) => r.reveal ).map( ( r ) => `${ r.key } ${ r.tag } ${ r.words }` ), [ 'F/1#0 div ', 'F/2#0 div ', 'F/3#0 label B', 'F/4#0 input ' ] );
	assert.ok( out.filter( ( r ) => r.reveal ).every( ( r ) => 'string' === typeof r.after || null === r.after ) );
} );

test( 'withRevealed puts the revealed records back after the record each names, leaving elements as they are', () => {
	const base = [ rec( 'R/1#0', 'div', '' ), rec( 'R/2#0', 'button', 'Q1', 'R/1#0' ), rec( 'R/2#1', 'button', 'Q2', 'R/1#0' ) ];
	const records = [ rec( 'R/1#0', 'div', '' ), rec( 'R/2#0', 'button', 'Q1', 'R/1#0' ), rec( 'R/3#0', 'div', 'A1', 'R/1#0' ), rec( 'R/2#1', 'button', 'Q2', 'R/1#0' ), rec( 'R/3#1', 'div', 'A2', 'R/1#0' ) ];
	const merged = mergeRevealRecords( base, [ { reveal: { component: 'R', keys: { a: 1 } }, records } ] );
	const inventory = { elements: merged.filter( ( r ) => ! r.reveal ), revealed: merged.filter( ( r ) => r.reveal ) };
	assert.deepEqual( withRevealed( inventory ).map( recId ), merged.map( recId ) );
	assert.deepEqual( inventory.elements, base );
	assert.deepEqual( withRevealed( { elements: base } ), base );
} );

test( 'negative control: no state read gives the inventory back unchanged', () => {
	const base = [ rec( 'R/1#0', 'div', '' ), rec( 'R/2#0', 'p', 'Text', 'R/1#0' ) ];
	assert.deepEqual( mergeRevealRecords( base, [] ), base );
	assert.deepEqual( mergeRevealRecords( base, [ { reveal: { component: 'R', keys: { a: 1 } }, records: base.map( ( r ) => ( { ...r } ) ) } ] ), base );
} );

test( 'refreshPairs pairs an accordion item to its wrapper and its answer to the element only an open state shows', () => {
	const open = { component: 'R', keys: { open: { a: true } } };
	const elements = [
		rec( 'R/10#0', 'div', '' ), rec( 'R/11#0', 'button', 'Who can apply?', 'R/10#0' ),
		{ ...rec( 'R/12#0', 'div', 'Any trade business.', 'R/10#0' ), reveal: open },
	];
	const blocks = [ { ref: 'i0', block: 'sgs/accordion-item', attrs: { title: 'Who can apply?' } }, { ref: 't0', block: 'sgs/text', attrs: { text: 'Any trade business.' } } ];
	const { pairs, unpaired } = refreshPairs( { blocks, elements } );
	assert.deepEqual( unpaired, {} );
	assert.deepEqual( pairs.i0, { tpl: 'R/10#0', how: 'item "who can apply?"' } );
	assert.deepEqual( pairs.t0.reveal, open );
	assert.equal( pairs.t0.tpl, 'R/12#0' );
	const without = refreshPairs( { blocks, elements: elements.slice( 0, 2 ) } );
	assert.match( without.unpaired.t0, /no unclaimed draft text/, 'without the state the answer has no element' );
} );

test( 'refreshPairs keeps two form steps apart when their elements share a key', () => {
	const s1 = { component: 'F', keys: { step: 1 } };
	const s2 = { component: 'F', keys: { step: 2 } };
	const elements = [
		rec( 'F/1#0', 'div', '' ),
		{ ...rec( 'F/2#0', 'label', 'Email', 'F/1#0' ), reveal: s1 }, { ...rec( 'F/3#0', 'input', '', 'F/1#0' ), reveal: s1 },
		{ ...rec( 'F/2#0', 'label', 'Phone', 'F/1#0' ), reveal: s2 }, { ...rec( 'F/3#0', 'input', '', 'F/1#0' ), reveal: s2 },
	];
	const blocks = [ { ref: 'a', block: 'sgs/form-field-text', attrs: { label: 'Email' } }, { ref: 'b', block: 'sgs/form-field-text', attrs: { label: 'Phone' } } ];
	const { pairs, unpaired } = refreshPairs( { blocks, elements } );
	assert.deepEqual( unpaired, {} );
	assert.deepEqual( [ pairs.a.reveal, pairs.b.reveal ], [ s1, s2 ] );
	assert.deepEqual( [ pairs.a.tpl, pairs.b.tpl ], [ 'F/3#0', 'F/3#0' ], 'each field is its control, in its own state' );
} );

test( 'refreshPairs pairs a heading the draft draws as a div, and finds a repeated text listed before the last match', () => {
	const elements = [ rec( 'R/1#0', 'span', 'Checklist' ), rec( 'R/2#0', 'div', 'Styled title' ), rec( 'R/3#0', 'div', 'Checklist' ) ];
	const blocks = [
		{ ref: 'h', block: 'sgs/heading', attrs: { content: 'Styled title' } },
		{ ref: 'a', block: 'sgs/text', attrs: { text: 'Checklist' } },
		{ ref: 'b', block: 'sgs/text', attrs: { text: 'Checklist' } },
		{ ref: 'c', block: 'sgs/text', attrs: { text: 'Checklist' } },
	];
	const { pairs, unpaired } = refreshPairs( { blocks, elements } );
	assert.equal( pairs.h.tpl, 'R/2#0' );
	assert.deepEqual( [ pairs.a.tpl, pairs.b.tpl ], [ 'R/1#0', 'R/3#0' ] );
	assert.match( unpaired.c, /no unclaimed draft text/, 'a third block has no element left' );
} );

test( 'pairsReport carries reveal into the applier pairs, and revealGroups reads each state once', () => {
	const open = { component: 'R', keys: { open: { a: true } } };
	const refreshed = { pairs: { t0: { tpl: 'R/12#0', reveal: open }, t1: { tpl: 'R/12#1', reveal: open }, p0: { tpl: 'R/10#0' } }, unpaired: {} };
	const { pairs } = pairsReport( { pairs: [] }, {}, refreshed );
	assert.deepEqual( pairs.find( ( p ) => 't0' === p.ref ).reveal, open );
	assert.equal( pairs.find( ( p ) => 'p0' === p.ref ).reveal, undefined );
	const groups = revealGroups( pairs );
	assert.equal( groups.length, 1 );
	assert.deepEqual( groups[ 0 ].pairs.map( ( p ) => p.ref ), [ 't0', 't1' ] );
} );

test( 'pairsReport drops an old pair whose ref the refreshed file does not name', () => {
	const cfg = { pairs: [ { live: '.cr-ref-gone', draft: { tpl: 'R/1#0' } }, { live: '.cr-ref-kept', draft: { tpl: 'R/2#0' } } ] };
	const { pairs, stale } = pairsReport( cfg, {}, { pairs: { 'cr-ref-kept': { tpl: 'R/2#0' } }, unpaired: {} } );
	assert.deepEqual( pairs.map( ( p ) => p.ref ), [ 'cr-ref-kept' ] );
	assert.deepEqual( stale, [ 'cr-ref-gone' ] );
	assert.deepEqual( pairsReport( cfg, {}, null ).pairs.map( ( p ) => p.ref ), [ 'cr-ref-gone', 'cr-ref-kept' ], 'without a refreshed file every old pair stays' );
} );

// A page that stands in for the draft runtime: a host carrying a logic object the way the runtime's fibers do, and elements
// with `data-dc-tpl` and a React `onClick` prop, redrawn when the logic's state changes.
const PAGE = ( { toggles } ) => `<!doctype html><html><body><div class="sc-host" data-sc-name="Root"><main id="surface"></main></div><script>
const host = document.querySelector('.sc-host');
const main = document.getElementById('surface');
const logic = { state: { open: {}, step: 0 }, setState(p) { Object.assign(this.state, p); draw(); } };
host['__reactFiber$t'] = { stateNode: { logic, __name: 'Root' }, return: null };
const el = (tag, tpl, text, onClick) => { const e = document.createElement(tag); e.setAttribute('data-dc-tpl', tpl); e.textContent = text; if (onClick) { e['__reactProps$t'] = { onClick }; e.addEventListener('click', onClick); } return e; };
function draw() {
  main.replaceChildren();
  main.setAttribute('data-dc-tpl', '1');
  main.append(el('h1', '2', 'Heading'));
  if (${ toggles }) {
    ['One', 'Two', 'Three'].forEach((q, i) => {
      const wrap = el('div', '10', '');
      wrap.append(el('button', '11', q, () => logic.setState({ open: { ...logic.state.open, [i]: !logic.state.open[i] } })));
      if (logic.state.open[i]) wrap.append(el('div', '12', 'Answer ' + q));
      main.append(wrap);
    });
  }
  main.append(el('p', '20', 'Step ' + (logic.state.step + 1)));
}
draw();
</script></body></html>`;

let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

const recordsOf = ( page ) => page.evaluate( () => [ ...document.querySelectorAll( '#surface, #surface [data-dc-tpl]' ) ].map( ( e ) => ( { key: `Root/${ e.dataset.dcTpl }#${ [ ...document.querySelectorAll( `[data-dc-tpl="${ e.dataset.dcTpl }"]` ) ].indexOf( e ) }`, tag: e.tagName.toLowerCase(), words: e.childElementCount ? '' : e.textContent, allText: e.textContent, parentKey: null } ) ) );

test( 'discoverReveals finds the keyed open map and a record state, and readReveals adds only what they show', async () => {
	const page = await browser.newPage();
	await page.setContent( PAGE( { toggles: true } ) );
	const records = [ { dc: 'Root', states: [ { name: 'second step', state_keys: { step: 1 }, how_to_reach: 'setState({ step: 1 })' }, { name: 'bogus', state_keys: { notAKey: true }, how_to_reach: 'setState({ notAKey: true })' } ] } ];
	const states = await discoverReveals( page, { root: '#surface', records } );
	assert.deepEqual( states.map( ( s ) => [ s.source, s.keys ] ), [ [ 'toggle', { open: { 0: true, 1: true, 2: true } } ], [ 'record', { step: 1 } ] ] );
	assert.equal( await page.evaluate( () => JSON.stringify( [ document.querySelectorAll( '[data-dc-tpl="12"]' ).length, document.querySelector( '[data-dc-tpl="20"]' ).textContent ] ) ), '[0,"Step 1"]', 'the page is back in its opening state' );
	const base = await recordsOf( page );
	const merged = await readReveals( { page, states, read: () => recordsOf( page ), base } );
	assert.deepEqual( merged.filter( ( r ) => r.reveal && r.words ).map( ( r ) => r.words ), [ 'Answer One', 'Answer Two', 'Answer Three', 'Step 2' ] );
	assert.ok( base.every( ( b ) => merged.includes( b ) ) );
	await page.close();
} );

test( 'negative control: a surface with no hidden state gives no state and the same records', async () => {
	const page = await browser.newPage();
	await page.setContent( PAGE( { toggles: false } ) );
	const states = await discoverReveals( page, { root: '#surface', records: [] } );
	assert.deepEqual( states, [] );
	const base = await recordsOf( page );
	assert.equal( await readReveals( { page, states, read: () => recordsOf( page ), base } ), base );
	await page.close();
} );

// A form-like page: step 1 has a checkbox button ("Deliver here") that shows an address block, a chip row where every chip adds the
// same mark, a tick that goes away when the box is cleared, and a "Next" button that changes the step (not a refinement).
const FORM_PAGE = `<!doctype html><html><body><div class="sc-host" data-sc-name="Root"><main id="surface"></main></div><script>
const host = document.querySelector('.sc-host');
const main = document.getElementById('surface');
const logic = { state: { step: 0, same: true, chip: null, hide: false }, setState(p) { Object.assign(this.state, p); draw(); } };
host['__reactFiber$t'] = { stateNode: { logic, __name: 'Root' }, return: null };
const el = (tag, tpl, text, onClick) => { const e = document.createElement(tag); e.setAttribute('data-dc-tpl', tpl); e.textContent = text; if (onClick) { e['__reactProps$t'] = { onClick }; e.addEventListener('click', onClick); } return e; };
function draw() {
  main.replaceChildren();
  main.setAttribute('data-dc-tpl', '1');
  main.append(el('h1', '2', 'Form'));
  if (logic.state.step === 1) {
    main.append(el('h2', '3', 'Premises'));
    const box = el('button', '4', 'Deliver here', () => logic.setState({ same: !logic.state.same }));
    if (logic.state.same) box.append(el('svg', '6', ''));
    main.append(box);
    if (!logic.state.same) { main.append(el('h3', '7', 'Delivery address')); main.append(el('label', '8', 'Delivery postcode')); }
    ['A', 'B'].forEach((c) => { main.append(el('button', '9', 'Chip ' + c, () => logic.setState({ chip: c }))); });
    if (logic.state.chip) main.append(el('span', '10', 'selected'));
    main.append(el('button', '11', 'Next', () => logic.setState({ step: 2 })));
    main.append(el('button', '12', 'Swap', () => logic.setState({ hide: true })));
    if (!logic.state.hide) main.append(el('p', '13', 'Shown until swapped'));
    else main.append(el('p', '14', 'Swapped in'));
  }
}
draw();
</script></body></html>`;

test( 'discoverNested finds a choice inside a state (a checkbox whose tick goes away shows an address block), once per added elements, and never repeats a parent\'s own key', async () => {
	const page = await browser.newPage();
	await page.setContent( FORM_PAGE );
	const parents = [ { component: 'Root', keys: { step: 1 }, covers: [], merged: false, source: 'record' } ];
	const found = await discoverNested( page, { root: '#surface', parents, seen: new Set( [ JSON.stringify( [ 'Root', { step: 1 } ] ) ] ), settle: () => page.waitForTimeout( 60 ) } );
	// The checkbox (the drawn tick goes away: not content hidden) and the chips (both add the same mark: one state) are kept; Next
	// sets the parent's own key and Swap hides a paragraph, so neither is.
	assert.deepEqual( found.map( ( s ) => s.keys ), [ { step: 1, same: false }, { step: 1, chip: 'A' } ] );
	assert.ok( found.every( ( s ) => 'nested' === s.source ) );
	assert.equal( await page.evaluate( () => document.querySelectorAll( '[data-dc-tpl]' ).length ), 2, 'the page is back in its opening state (the heading and the root)' );
	await page.close();
} );

test( 'negative control: nested discovery is bounded and a surface with no parent state gives nothing', async () => {
	const page = await browser.newPage();
	await page.setContent( FORM_PAGE );
	assert.deepEqual( await discoverNested( page, { root: '#surface', parents: [], seen: new Set(), settle: () => {} } ), [] );
	// A parent whose controls change nothing new (the opening state has none): no nested state.
	const none = await discoverNested( page, { root: '#surface', parents: [ { component: 'Root', keys: { step: 0 } } ], seen: new Set(), settle: () => page.waitForTimeout( 60 ) } );
	assert.deepEqual( none, [] );
	assert.ok( MAX_NESTED > 0 && Number.isInteger( MAX_NESTED ) );
	await page.close();
} );

test( 'mergeRevealRecords keeps only what a nested state adds over its parent, though text under shared wrappers grew', () => {
	const rec = ( key, tag, words, allText, parentKey ) => ( { key, tag, words, allText, parentKey } );
	const base = [ rec( 'k/root', 'div', '', 'Top', null ), rec( 'k/h', 'h1', 'Top', 'Top', 'k/root' ), rec( 'k/old', 'p', 'Old', 'Old', 'k/root' ) ];
	const stepRead = [ rec( 'k/root', 'div', '', 'Top Step', null ), rec( 'k/h', 'h1', 'Top', 'Top', 'k/root' ), rec( 'k/step', 'div', '', 'Step', 'k/root' ), rec( 'k/s', 'p', 'Step', 'Step', 'k/step' ) ];
	const nestedRead = [ rec( 'k/root', 'div', '', 'Top Step More', null ), rec( 'k/h', 'h1', 'Top', 'Top', 'k/root' ), rec( 'k/step', 'div', '', 'Step More', 'k/root' ), rec( 'k/s', 'p', 'Step', 'Step', 'k/step' ), rec( 'k/n', 'label', 'More', 'More', 'k/step' ) ];
	const parent = { component: 'F', keys: { step: 1 } };
	const child = { component: 'F', keys: { step: 1, more: true } };
	const merged = mergeRevealRecords( base, [ { reveal: parent, records: stepRead }, { reveal: child, records: nestedRead, of: revealId( parent ) } ] );
	assert.deepEqual( merged.filter( ( r ) => r.reveal && revealId( r.reveal ) === revealId( child ) ).map( ( r ) => r.key ), [ 'k/n' ], 'only the new label is the nested state\'s' );
	assert.deepEqual( merged.filter( ( r ) => r.reveal && revealId( r.reveal ) === revealId( parent ) ).map( ( r ) => r.key ), [ 'k/root', 'k/h', 'k/step', 'k/s' ] );
	// Negative control: the reads replace the opening step's content, so without `of` the wrappers whose text grew are new elements of the second state.
	const plain = mergeRevealRecords( base, [ { reveal: parent, records: stepRead }, { reveal: child, records: nestedRead } ] );
	assert.ok( plain.filter( ( r ) => r.reveal && revealId( r.reveal ) === revealId( child ) ).length > 1 );
} );

test( 'a nested state keeps an element whose key was renumbered under a new parent, and drops the one under the same parent', () => {
	const rec = ( key, tag, words, allText, parentKey ) => ( { key, tag, words, allText, parentKey } );
	const base = [ rec( 'k/root', 'div', '', '', null ) ];
	const parent = { component: 'F', keys: { step: 3 } };
	const stepRead = [ rec( 'k/root', 'div', '', '', null ), rec( 'k/w1', 'div', '', '', 'k/root' ), rec( 'k/i', 'input', '', '', 'k/w1' ) ];
	// The nested state adds a second field: its wrapper is new and its input is again the first copy of the input template.
	const nestedRead = [ rec( 'k/root', 'div', '', '', null ), rec( 'k/w1', 'div', '', '', 'k/root' ), rec( 'k/i', 'input', '', '', 'k/w1' ), rec( 'k/w2', 'div', '', '', 'k/root' ), rec( 'k/i', 'input', '', '', 'k/w2' ) ];
	const merged = mergeRevealRecords( base, [ { reveal: parent, records: stepRead }, { reveal: { component: 'F', keys: { step: 3, more: true } }, records: nestedRead, of: revealId( parent ) } ] );
	const mine = merged.filter( ( r ) => r.reveal && revealId( r.reveal ) === revealId( { component: 'F', keys: { step: 3, more: true } } ) );
	assert.deepEqual( mine.map( ( r ) => [ r.key, r.parentKey ] ), [ [ 'k/w2', 'k/root' ], [ 'k/i', 'k/w2' ] ] );
} );
