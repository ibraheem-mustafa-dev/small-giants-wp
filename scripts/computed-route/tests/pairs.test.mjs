// Block pairing for full coverage (plan .claude/plans/2026-10-04-spec47-full-coverage.md): a block's draft partner
// is kept only when it holds its words and nothing that belongs outside it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { wordsByBlock, twinsByBlock, judgePairing, paddedPartner, configText } from '../lib/pairs.mjs';

// Live words 0-3: 0-1 in a heading (ref h) inside a section (ref s), 2-3 in a text (ref t) inside the same section.
const liveRefs = [ [ 'h', 's' ], [ 'h', 's' ], [ 't', 's' ], [ 't', 's' ] ];
const blocks = wordsByBlock( liveRefs );
const matches = [ [ 10, 0 ], [ 11, 1 ], [ 12, 2 ], [ 13, 3 ] ];
const twins = twinsByBlock( matches, blocks );
const ofDraft = new Map( matches.map( ( [ d, l ] ) => [ d, liveRefs[ l ] ] ) );

test( 'a block holds every word inside it, nested blocks included, and its words\' draft twins', () => {
	assert.deepEqual( blocks.get( 's' ), [ 0, 1, 2, 3 ] );
	assert.deepEqual( twins.get( 'h' ), { live: [ 0, 1 ], draft: [ 10, 11 ] } );
} );

test( 'a partner holding exactly the block\'s words, at a similar size, is kept', () => {
	assert.deepEqual( judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 400, h: 40 } }, { inside: [ 10, 11 ], box: { w: 420, h: 38 } }, ofDraft ), { ok: true, why: null } );
	assert.equal( judgePairing( { ref: 's', ...twins.get( 's' ), liveBox: { w: 800, h: 300 } }, { inside: [ 10, 11, 12, 13 ], box: { w: 820, h: 280 } }, ofDraft ).ok, true );
} );

test( 'MUST FAIL TO KEEP: a partner that also holds another block\'s words is left out', () => {
	const v = judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 400, h: 40 } }, { inside: [ 10, 11, 12 ], box: { w: 420, h: 38 } }, ofDraft );
	assert.equal( v.ok, false );
	assert.match( v.why, /belong outside this block/ );
} );

test( 'MUST FAIL TO KEEP: too few matched words, or a box far from the block\'s, is left out', () => {
	assert.equal( judgePairing( { ref: 'h', live: [ 0, 1, 5, 6, 7 ], draft: [ 10 ], liveBox: { w: 400, h: 40 } }, { inside: [ 10 ], box: { w: 400, h: 40 } }, ofDraft ).ok, false );
	assert.equal( judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 400, h: 40 } }, { inside: [ 10, 11 ], box: { w: 1200, h: 40 } }, ofDraft ).ok, false );
} );

// About, 2026-10-04 (measured at 1440): the page container (live 1100x742, padding 104px 52px, content 996x534) was
// paired with the draft's unpadded 996x534 element inside a padded <main> (1100x672, padding 48px 52px 90px), and
// Solve wrote the container's padding as 0. The draft's vertical padding really differs (Solve's job to close).
const padLive = { w: 1100, h: 742, content: { w: 996, h: 534 } };
const padInner = { path: 'body > main:nth-child(3) > div:nth-child(1)', box: { w: 996, h: 534 }, content: { w: 996, h: 534 }, inside: [ 10, 11 ] };
const padOuter = { path: 'body > main:nth-child(3)', box: { w: 1100, h: 672 }, content: { w: 996, h: 534 }, inside: [ 10, 11 ] };
const page = { path: 'body > div:nth-child(1)', box: { w: 1440, h: 1257 }, content: { w: 1440, h: 1257 }, inside: [ 10, 11 ] };

test( 'MUST FAIL TO KEEP: a partner with no padding where the block holds padding, content boxes matching, is left out', () => {
	const v = judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: padLive }, padInner, ofDraft );
	assert.equal( v.ok, false );
	assert.match( v.why, /padding sits on a draft ancestor/ );
} );

test( 'the partner climbs through unpadded same-size wrappers to the nearest ancestor holding padding, and is kept', () => {
	const wrap = { ...padInner, path: 'body > main:nth-child(3) > div:nth-child(1) > div:nth-child(1)' };
	const p = paddedPartner( [ wrap, padInner, padOuter, page ], padLive );
	assert.equal( p.path, padOuter.path );
	assert.deepEqual( judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: padLive }, p, ofDraft ), { ok: true, why: null } );
} );

test( 'positive control: a padded partner, an unpadded block, or no padded wrapper leaves the partner where it is', () => {
	assert.equal( paddedPartner( [ padOuter, page ], padLive ).path, padOuter.path );
	assert.equal( paddedPartner( [ padInner, padOuter ], { w: 996, h: 534, content: { w: 996, h: 534 } } ).path, padInner.path );
	assert.equal( paddedPartner( [ padInner, page ], padLive ).path, padInner.path );
	assert.equal( judgePairing( { ref: 'h', ...twins.get( 'h' ), liveBox: { w: 996, h: 534, content: { w: 996, h: 534 } } }, padInner, ofDraft ).ok, true );
} );

test( 'the generated config keeps the hand config and adds one ref-finder pair per kept block', () => {
	const src = configText( 'about.mjs', 'about', [ { ref: 'cr-ref-about-0', draft: 'body > main:nth-child(2)' } ] );
	assert.match( src, /import base from '\.\/about\.mjs';/ );
	assert.match( src, /name: "gen-about-0", text: false, structure: false, draft: "body > main:nth-child\(2\)", live: "\.cr-ref-about-0"/ );
	assert.match( src, /refPrefix: base\.refPrefix/ );
} );

// About, 2026-10-04: the hand pair `credential-stack` measured the draft's bordered column (the element the column
// block was paired with) against the block's inner band, which paints none of its border or ground.
import { reconcileHandPairs } from '../lib/pairs.mjs';
const keptCol = [ { ref: 'cr-ref-about-11', draft: 'body > main:nth-child(1) > div:nth-child(2)' }, { ref: 'cr-ref-about-12', draft: 'body > main:nth-child(1) > div:nth-child(2) > div:nth-child(1)' } ];

test( 'MUST FAIL TO KEEP: a hand pair measuring a paired block\'s draft element inside the block moves to the block root', () => {
	const r = reconcileHandPairs( [ { name: 'credential-stack', draft: keptCol[ 0 ].draft, liveRef: 'cr-ref-about-11', liveIsRoot: false } ], keptCol );
	assert.deepEqual( [ ...r.retarget ], [ [ 'credential-stack', '.cr-ref-about-11' ] ] );
	assert.deepEqual( [ ...r.duplicate ], [ 'cr-ref-about-11' ] );
	const src = configText( 'about.mjs', 'about', [ keptCol[ 1 ] ], r.retarget );
	assert.match( src, /const moved = \{"credential-stack":"\.cr-ref-about-11"\};/ );
} );

test( 'positive control: a hand pair on the root, on another draft element or another block is not moved', () => {
	const root = reconcileHandPairs( [ { name: 'a', draft: keptCol[ 0 ].draft, liveRef: 'cr-ref-about-11', liveIsRoot: true } ], keptCol );
	assert.equal( root.retarget.size, 0 );
	assert.deepEqual( [ ...root.duplicate ], [ 'cr-ref-about-11' ] );
	const other = reconcileHandPairs( [ { name: 'b', draft: 'body > div:nth-child(9)', liveRef: 'cr-ref-about-11', liveIsRoot: false }, { name: 'c', draft: keptCol[ 0 ].draft, liveRef: 'cr-ref-about-12', liveIsRoot: false }, { name: 'd', draft: null, liveRef: null, liveIsRoot: false } ], keptCol );
	assert.equal( other.retarget.size, 0 );
	assert.equal( other.duplicate.size, 0 );
} );

// Contact, 2026-10-04: repeated draft words, bare-text values beside their labels, an inline number against a block.
import { twinPlan, parentRef, wordMatch, choosePartner } from '../lib/pairs.mjs';

test( 'MUST FAIL TO TRUST: a word that occurs twice on the draft is a candidate set, not a fixed twin', () => {
	const words = [ { t: 'google', e: 1 }, { t: 'sketch', e: 1 }, { t: 'google', e: 7 }, { t: 'reviews', e: 8 } ];
	assert.deepEqual( twinPlan( [ 0, 3 ], words ), { sure: [ 8 ], repeated: [ [ 1, 7 ] ] } );
	assert.deepEqual( twinPlan( [ 3 ], words ), { sure: [ 8 ], repeated: [] } );
} );

test( 'a block\'s parent is the next ref out around its words', () => {
	assert.equal( parentRef( 'c-28', [ [ 'c-31', 'c-30' ], [ 'c-28', 'c-27', 'c-26' ] ] ), 'c-27' );
	assert.equal( parentRef( 'c-0', [ [ 'c-0' ] ] ), null );
} );

test( 'a word match finds whole words only', () => {
	const re = new RegExp( wordMatch( [ 'mon', 'sat' ] ), 'iu' );
	assert.ok( re.test( 'Mon–Sat 9.30–17.30' ) );
	assert.ok( ! re.test( 'Collections by arrangement' ) );
	assert.equal( wordMatch( [] ), null );
} );

const ofDraftC = new Map( [ [ 20, [ 'e', 'card' ] ], [ 21, [ 'v', 'card' ] ] ] );
const valueBlock = ( run ) => ( { ref: 'v', live: [ 1 ], draft: [ 21 ], liveBox: { w: 249, h: 29, content: { w: 249, h: 29 }, run } } );

test( 'MUST FAIL TO KEEP: a value sharing its draft element with a label is paired as its own text run', () => {
	const chain = [ { path: 'body > div:nth-child(2)', box: { w: 236, h: 46 }, content: { w: 236, h: 46 }, inside: [ 20, 21 ], own: true, run: { w: 230, h: 19 } } ];
	const r = choosePartner( chain, valueBlock( { w: 232, h: 20 } ), ofDraftC );
	assert.equal( r.verdict.ok, true );
	assert.deepEqual( r.partner.textRun, { direct: true } );
	assert.deepEqual( r.partner.inside, [ 21 ] );
} );

test( 'MUST FAIL TO KEEP: an inline number against a block is paired by its text', () => {
	const chain = [ { path: 'body > span:nth-child(1)', box: { w: 91, h: 19 }, content: { w: 91, h: 19 }, inside: [ 21 ], own: false, run: { w: 91, h: 19 } } ];
	const r = choosePartner( chain, valueBlock( { w: 92, h: 20 } ), ofDraftC );
	assert.equal( r.verdict.ok, true );
	assert.deepEqual( r.partner.textRun, { direct: false } );
} );

test( 'positive control: a run is not used when the element passes, when foreign words are not the element\'s own text, or when no live run exists', () => {
	const ok = [ { path: 'p', box: { w: 240, h: 30 }, content: { w: 240, h: 30 }, inside: [ 21 ], own: true, run: { w: 230, h: 19 } } ];
	assert.equal( choosePartner( ok, valueBlock( { w: 232, h: 20 } ), ofDraftC ).partner.textRun, undefined );
	const nested = [ { path: 'd', box: { w: 236, h: 46 }, content: { w: 236, h: 46 }, inside: [ 20, 21 ], own: false, run: { w: 230, h: 19 } } ];
	assert.equal( choosePartner( nested, valueBlock( { w: 232, h: 20 } ), ofDraftC ).verdict.ok, false );
	assert.equal( choosePartner( [ { ...nested[ 0 ], own: true } ], valueBlock( null ), ofDraftC ).verdict.ok, false );
} );

test( 'a text-run pair measures the run on both sides in the generated config', () => {
	const src = configText( 'contact.mjs', 'contact', [ { ref: 'cr-ref-contact-12', draft: 'body > div:nth-child(2)', textRun: { direct: true, match: '(x)' } } ] );
	assert.match( src, /draft: \{"textRun":\{"within":"body > div:nth-child\(2\)","direct":true,"match":"\(x\)"\}\}/ );
	assert.match( src, /live: \{"textRun":\{"within":"\.cr-ref-contact-12","direct":false,"match":"\(x\)"\}\}/ );
} );
