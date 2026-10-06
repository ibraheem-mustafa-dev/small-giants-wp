// Block pairing for full coverage (plan .claude/plans/2026-10-04-spec47-full-coverage.md): a block's draft partner
// is kept only when it holds its words and nothing that belongs outside it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wordsByBlock, twinsByBlock, judgePairing, paddedPartner, configText, pairingState, liftExclusions, collectContext } from '../lib/pairs.mjs';

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
import { twinPlan, commonPath, wordMatch, choosePartner } from '../lib/pairs.mjs';

test( 'MUST FAIL TO TRUST: a word that occurs twice on the draft is a candidate set, not a fixed twin', () => {
	const words = [ { t: 'google', e: 1 }, { t: 'sketch', e: 1 }, { t: 'google', e: 7 }, { t: 'reviews', e: 8 } ];
	assert.deepEqual( twinPlan( [ 0, 3 ], words ), { sure: [ 8 ], repeated: [ [ 1, 7 ] ] } );
	assert.deepEqual( twinPlan( [ 3 ], words ), { sure: [ 8 ], repeated: [] } );
} );

test( 'a block of repeated words anchors on the common ancestor of its children\'s partners', () => {
	assert.equal( commonPath( [ 'body > main:nth-child(3) > form:nth-child(2) > div:nth-child(1)', 'body > main:nth-child(3) > form:nth-child(2) > div:nth-child(4)' ] ), 'body > main:nth-child(3) > form:nth-child(2)' );
	assert.equal( commonPath( [ null, undefined ] ), null );
	assert.equal( commonPath( [ 'body > a:nth-child(1)', 'body > b:nth-child(2)' ] ), null );
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

// Contact's form, 2026-10-04: the draft's controls carry placeholders only, the live ones names and ids too; a hidden
// honeypot never counts (lib/pairs-page.mjs::formControls); the partner is the wrapper nearest the block's size.
import { chooseControlPartner } from '../lib/pairs.mjs';

test( 'MUST FAIL TO MISS: a form-control block takes the draft wrapper nearest its size around the same control', () => {
	const chain = [ { path: 'input', box: { w: 400, h: 44 } }, { path: 'div.field', box: { w: 420, h: 70 } }, { path: 'div.row', box: { w: 860, h: 70 } } ];
	const r = chooseControlPartner( chain, { w: 418, h: 72 } );
	assert.equal( r.verdict.ok, true );
	assert.equal( r.partner.path, 'div.field' );
} );

test( 'positive control: no draft control, or none near the size, is left out with its reason', () => {
	assert.match( chooseControlPartner( null, { w: 400, h: 44 } ).verdict.why, /no draft control/ );
	assert.match( chooseControlPartner( [ { path: 'x', box: { w: 40, h: 10 } } ], { w: 400, h: 44 } ).verdict.why, /near its size/ );
} );

// Contact, 2026-10-04: the page container's draft partner was the unpadded element inside the padded <main> although
// the content boxes differ (the draft's columns are narrower), and Solve wrote its padding as 0 (the guard reverted it).
test( 'MUST FAIL TO KEEP: an unpadded partner climbs to its tight padded wrapper even when content boxes differ', () => {
	const live = { w: 1440, h: 900, content: { w: 1336, h: 692 } };
	const inner = { path: 'main > div', box: { w: 996, h: 600 }, content: { w: 996, h: 600 }, inside: [ 1 ] };
	const outer = { path: 'main', box: { w: 1100, h: 738 }, content: { w: 996, h: 600 }, inside: [ 1 ] };
	assert.equal( paddedPartner( [ inner, outer ], live ).path, 'main' );
	assert.equal( paddedPartner( [ inner, { ...outer, content: { w: 1100, h: 738 } } ], live ).path, 'main > div' );
	assert.equal( paddedPartner( [ inner, outer ], { w: 996, h: 600, content: { w: 996, h: 600 } } ).path, 'main > div' );
} );

// Contact's form, 2026-10-04: the draft has no element of its own for the form (its fields sit beside the heading in
// one card); it is paired as the group of its fields' partners, by box only.
import { chooseGroupPartner } from '../lib/pairs.mjs';

test( 'MUST FAIL TO KEEP: a block with no draft element of its own pairs as its children\'s group', () => {
	const kids = [ 'body > main > div:nth-child(2) > div:nth-child(3)', 'body > main > div:nth-child(2) > div:nth-child(4)' ];
	const r = chooseGroupPartner( kids, { w: 440, h: 300 }, { w: 450, h: 320 } );
	assert.equal( r.verdict.ok, true );
	assert.deepEqual( r.partner.group, { paths: kids } );
	assert.equal( r.partner.path, 'body > main > div:nth-child(2)' );
	const src = configText( 'contact.mjs', 'contact-form', [ { ref: 'cr-ref-contact-form-0', draft: r.partner.path, group: r.partner.group } ] );
	assert.match( src, /live: \{"group":\{"paths":\["\.cr-ref-contact-form-0"\]\}\}/ );
} );

test( 'positive control: one paired child, no group box, or a group far from the block\'s size is left out', () => {
	assert.equal( chooseGroupPartner( [ 'a', null ], { w: 1, h: 1 }, { w: 1, h: 1 } ).verdict.ok, false );
	assert.equal( chooseGroupPartner( [ 'a', 'b' ], null, { w: 1, h: 1 } ).verdict.ok, false );
	assert.match( chooseGroupPartner( [ 'body > a', 'body > b' ], { w: 100, h: 300 }, { w: 450, h: 320 } ).verdict.why, /wide/ );
} );

test( 'MUST FAIL: a control paired with the draft control itself is measured at the live block\'s control', () => {
	const src = configText( 'form.mjs', 'form', [ { ref: 'cr-ref-form-2', draft: 'body > form > input:nth-child(2)', liveControl: true }, { ref: 'cr-ref-form-3', draft: 'body > form > div:nth-child(3)' } ] );
	assert.match( src, /live: "\.cr-ref-form-2 :is\(input:not\(\[type=hidden\]\)/ );
	assert.match( src, /live: "\.cr-ref-form-3" \}/ );
} );

test( 'MUST FAIL: a hand pair on a control block moves to the block\'s control, even when it measured the block root', () => {
	const kept = [ { ref: 'cr-ref-form-2', draft: 'body > form > input:nth-child(2)', liveControl: true } ];
	for ( const liveIsRoot of [ false, true ] ) {
		const r = reconcileHandPairs( [ { name: 'field-email', draft: kept[ 0 ].draft, liveRef: 'cr-ref-form-2', liveIsRoot } ], kept );
		assert.match( r.retarget.get( 'field-email' ), /^\.cr-ref-form-2 :is\(input/ );
	}
} );

// A panel surface pairs with its walker state open on both sides; a missing or one-sided state is an error, never a
// silent rest read (which leaves every block of a closed panel out).
test( 'MUST FAIL: a panel state that is missing or opens one side only is refused; a two-sided state is returned', () => {
	const open = { name: 'drawer-open', draft: async () => {}, live: async () => {} };
	const cfg = { states: [ { name: 'closed' }, open, { name: 'draft-only', draft: async () => {} } ] };
	assert.equal( pairingState( cfg, null ), null );
	assert.equal( pairingState( cfg, 'drawer-open' ), open );
	assert.throws( () => pairingState( cfg, 'mega-shop' ), /no state "mega-shop"/ );
	assert.throws( () => pairingState( cfg, 'draft-only' ), /does not open both sides/ );
	assert.throws( () => pairingState( cfg, 'closed' ), /does not open both sides/ );
} );

// The phone drawer lives inside the header landmark the automatic check leaves out: its pairing found no words at all.
test( 'MUST FAIL: an excluded landmark holding the surface blocks is lifted; one that does not stays excluded', () => {
	const exclude = [ 'header', 'footer', '.sgs-site-header', { js: '() => null' } ];
	assert.deepEqual( liftExclusions( exclude, ( sel ) => [ 'header', '.sgs-site-header' ].includes( sel ) ), [ 'header', '.sgs-site-header' ] );
	assert.deepEqual( liftExclusions( exclude, () => false ), [] );
} );

// ---- Session C, lane L4 (2026-10-05) ----
import { rootFor, mergeWidthFinders, assertReachable, chooseMediaPartner, pairingStates } from '../lib/pairs.mjs';

// L4.2: the open live phone drawer is moved to <body> by store.js::reparentToBody, so the header root never holds its words.
test( 'MUST FAIL: a state with its own pairRoot walks that root; no state, or a state without one, keeps auto.root', () => {
	const cfg = { auto: { root: { draft: 'header', live: 'header.sgs-site-header' } }, pairRoot: { 'drawer-open': { live: '.sgs-nav-drawer[open]', draft: { js: '(r) => 1' } } } };
	const drawer = { name: 'drawer-open' };
	assert.equal( rootFor( cfg, 'live', drawer ), '.sgs-nav-drawer[open]' );
	assert.deepEqual( rootFor( cfg, 'draft', drawer ), { js: '(r) => 1' } );
	assert.equal( rootFor( cfg, 'live', null ), 'header.sgs-site-header' );
	assert.equal( rootFor( cfg, 'draft', { name: 'mega-shop' } ), 'header' );
	assert.equal( rootFor( { auto: {} }, 'live', drawer ), null );
	assert.equal( rootFor( { pairRoot: { s: { live: '.x' } } }, 'draft', { name: 's' } ), null );
} );

// L4.3: the draft rebuilds its layout per width, so a block's partner can be a different element at 375.
const WIDTHS = [ 1440, 768, 375, 1920 ];
const ownAt = ( map ) => ( sel, w ) => ( map[ w ] ?? null );
test( 'MUST FAIL: a block whose draft partner differs at 375 is kept with one joined finder that resolves to its own element at every width', () => {
	const per = { 1440: 'body > a:nth-child(1)', 768: 'body > a:nth-child(1)', 375: 'body > b:nth-child(2)', 1920: 'body > a:nth-child(1)' };
	const r = mergeWidthFinders( per, ownAt( per ), WIDTHS );
	assert.equal( r.ok, true );
	assert.equal( r.draft, 'body > b:nth-child(2), body > a:nth-child(1)' );
	assert.deepEqual( r.drafts, per );
} );

test( 'negative control: a joined finder that resolves to another element at some width, or a width with no partner, leaves the block out', () => {
	const per = { 1440: 'A', 768: 'A', 375: 'B', 1920: 'A' };
	const wrong = mergeWidthFinders( per, ( sel, w ) => ( 375 === w ? 'A' : per[ w ] ), WIDTHS );
	assert.equal( wrong.ok, false );
	assert.match( wrong.why, /375/ );
	const missing = mergeWidthFinders( { ...per, 375: null }, ownAt( per ), WIDTHS );
	assert.equal( missing.ok, false );
	assert.match( missing.why, /no partner at 375/ );
} );

test( 'positive control: one path at every width stays that path', () => {
	const per = { 1440: 'A', 768: 'A', 375: 'A', 1920: 'A' };
	assert.deepEqual( mergeWidthFinders( per, ownAt( per ), WIDTHS ), { ok: true, draft: 'A', drafts: per, why: null } );
} );

test( 'a kept pair with per-width drafts writes the joined paths into the generated config, for an element and a text run', () => {
	const drafts = { 1440: 'body > a', 768: 'body > a', 375: 'body > b', 1920: 'body > a' };
	const src = configText( 'shop.mjs', 'shop', [ { ref: 'cr-ref-shop-3', draft: 'body > a', drafts }, { ref: 'cr-ref-shop-4', draft: 'body > a', drafts, textRun: { direct: true, match: '(x)' } } ] );
	assert.match( src, /name: "gen-shop-3", text: false, structure: false, draft: "body > b, body > a", live: "\.cr-ref-shop-3"/ );
	assert.match( src, /draft: \{"textRun":\{"within":"body > b, body > a","direct":true/ );
} );

// L4.4: a hand pair's block is measured even when no generated pair exists for it (lenses cr-ref-lenses-28, hand pair choose-a-frame).
test( 'MUST FAIL: a hand pair on a block that is not kept is listed as measured, and the duplicate set is unchanged', () => {
	const r = reconcileHandPairs( [ { name: 'choose-a-frame', draft: 'body > main > button', liveRef: 'cr-ref-lenses-28', liveIsRoot: false }, { name: 'orphan', draft: null, liveRef: 'cr-ref-lenses-5', liveIsRoot: true }, { name: 'nolive', draft: 'body > p', liveRef: null, liveIsRoot: false } ], keptCol );
	assert.deepEqual( r.measured, [ 'cr-ref-lenses-28' ] );
	assert.equal( r.duplicate.size, 0 );
	assert.equal( r.retarget.size, 0 );
} );

test( 'positive control: a hand pair on a kept block is listed and still duplicates it; refs are listed once', () => {
	const r = reconcileHandPairs( [ { name: 'a', draft: keptCol[ 0 ].draft, liveRef: 'cr-ref-about-11', liveIsRoot: true }, { name: 'b', draft: 'body > x', liveRef: 'cr-ref-about-11', liveIsRoot: true } ], keptCol );
	assert.deepEqual( r.measured, [ 'cr-ref-about-11' ] );
	assert.deepEqual( [ ...r.duplicate ], [ 'cr-ref-about-11' ] );
} );

// L4.5: an empty report from an unreachable page must be a loud failure.
test( 'MUST FAIL: an empty URL, no blocks, a missing required element or a failed order notice is refused', () => {
	const ok = { url: 'https://x/confirmation/', blocks: 12, words: 40, requiresFound: null, notice: '' };
	assert.doesNotThrow( () => assertReachable( ok ) );
	assert.throws( () => assertReachable( { ...ok, url: '' } ), /no live url/i );
	assert.throws( () => assertReachable( { ...ok, blocks: 0 } ), /no blocks/i );
	assert.throws( () => assertReachable( { ...ok, requiresFound: false, requires: '.woocommerce-order-overview' } ), /woocommerce-order-overview/ );
	assert.throws( () => assertReachable( { ...ok, notice: 'Your order was cancelled.' } ), /cancelled/i );
	assert.throws( () => assertReachable( { ...ok, notice: 'Unfortunately your order cannot be processed' } ), /cannot be processed|failed/i );
	assert.doesNotThrow( () => assertReachable( { ...ok, requiresFound: true, requires: '.x', notice: 'Thank you. Your order has been received.' } ) );
} );

// L4.1 group C: a block with no painted words pairs by its media's place among the media of its paired ancestor.
test( 'MUST FAIL: a media-only block pairs with the draft media at the same place, and is left out when the counts differ', () => {
	const chain = [ { path: 'svg', box: { w: 28, h: 28 } }, { path: 'span', box: { w: 40, h: 40 } } ];
	const live = { kind: 'svg', index: 1, count: 3 };
	const ok = chooseMediaPartner( live, { count: 3, chain }, { w: 28, h: 28 } );
	assert.equal( ok.verdict.ok, true );
	assert.equal( ok.partner.path, 'svg' );
	const off = chooseMediaPartner( live, { count: 2, chain }, { w: 28, h: 28 } );
	assert.equal( off.verdict.ok, false );
	assert.match( off.verdict.why, /3 svg live against 2/ );
	assert.equal( chooseMediaPartner( live, { count: 3, chain: null }, { w: 28, h: 28 } ).verdict.ok, false );
	assert.equal( chooseMediaPartner( null, { count: 0, chain: null }, { w: 5, h: 5 } ).verdict.ok, false );
} );

// L4.1 group A: --state a,b,c pairs once per state, each pair scoped to its state.
test( 'MUST FAIL: --state a,b pairs each state scoped; one state or none stays unscoped; rest scopes to opening', () => {
	const mk = ( n ) => ( { name: n, draft: async () => {}, live: async () => {} } );
	const cfg = { states: [ { name: 'opening' }, mk( 'tab-details' ), mk( 'tab-sizing' ) ] };
	const two = pairingStates( cfg, 'tab-details,tab-sizing' );
	assert.deepEqual( two.map( ( s ) => [ s.state.name, s.scope ] ), [ [ 'tab-details', 'tab-details' ], [ 'tab-sizing', 'tab-sizing' ] ] );
	assert.deepEqual( pairingStates( cfg, 'tab-details' ).map( ( s ) => s.scope ), [ null ] );
	assert.deepEqual( pairingStates( cfg, null ), [ { state: null, scope: null } ] );
	const mixed = pairingStates( cfg, 'rest,tab-sizing' );
	assert.deepEqual( mixed.map( ( s ) => [ s.state?.name ?? null, s.scope ] ), [ [ null, 'opening' ], [ 'tab-sizing', 'tab-sizing' ] ] );
	assert.throws( () => pairingStates( cfg, 'tab-details,nope' ), /no state "nope"/ );
} );

test( 'a state-scoped pair is written with its states and a state-suffixed name', () => {
	const src = configText( 'product.mjs', 'product', [ { ref: 'cr-ref-product-9', draft: 'body > p', scope: 'tab-details' } ] );
	assert.match( src, /name: "gen-product-9-tab-details", states: \["tab-details"\], text: false/ );
} );

// Twin containment (lib/pair-scope.mjs::judgePairScope): a hand pair is a mispair when a matched word inside one
// element has its twin outside the other. Each case lists the word indices inside each pair element.
import { judgePairScope, MIN_CHECKED } from '../lib/pair-scope.mjs';

// A prescription step: draft words 0-8 are the step's number then its title (the draft's step holds both); live
// words 0-8 are the same words, the number being its own element beside the title.
const STEP = [ '1', 'pick', 'a', 'frame', 'then', 'add', 'my', 'prescription', 'now' ];
const stepMatches = STEP.map( ( _, i ) => [ i, i ] );
const scope = ( draftIn, liveIn, texts = STEP, matches = stepMatches ) => judgePairScope( { draftIn, liveIn, matches, dTexts: texts, lTexts: texts } );

test( 'MUST FAIL TO PASS: the draft step against live\'s title alone is refused, naming the stranded number', () => {
	const v = scope( [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ], [ 1, 2, 3, 4, 5, 6, 7, 8 ] );
	assert.equal( v.ok, false );
	assert.deepEqual( v.split, [ { word: '1', inside: 'draft' } ] );
	assert.match( v.why, /"1" \(inside the draft element only\)/ );
} );

test( 'MUST FAIL TO PASS: the same mispair the other way round (live holds the number, the draft element does not) is refused', () => {
	assert.equal( scope( [ 1, 2, 3, 4, 5, 6, 7, 8 ], [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ] ).ok, false );
} );

test( 'positive control: the corrected step, both elements holding number and title, passes', () => {
	const v = scope( [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ], [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ] );
	assert.deepEqual( v, { ok: true, checked: 9, split: [], why: null } );
} );

// Pairs a box-ratio gate would wrongly refuse: the size differs, the words do not.
test( 'NOT OVER-REFUSING: the phone link (91 wide against 109) holding the same words passes', () => {
	const t = [ 'call', 'us', 'on', '0121' ];
	assert.equal( scope( [ 0, 1, 2, 3 ], [ 0, 1, 2, 3 ], t, t.map( ( _, i ) => [ i, i ] ) ).ok, true );
} );

test( 'NOT OVER-REFUSING: the submit button (166 wide against 335) holding the same words passes', () => {
	const t = [ 'send', 'message' ];
	assert.equal( scope( [ 0, 1 ], [ 0, 1 ], t, [ [ 0, 0 ], [ 1, 1 ] ] ).ok, true );
} );

test( 'NOT OVER-REFUSING: an icon or image pair holding no words, and a pair of words with no twin, pass', () => {
	// A pair holding no words is reported as NOT JUDGED rather than as passed: there was nothing to judge, and
	// recording that honestly is what stops an unjudged pair being read as a clean one.
	const none = scope( [], [] );
	assert.equal( none.ok, true );
	assert.equal( none.judged, false );
	assert.equal( none.checked, 0 );
	assert.deepEqual( none.split, [] );
	const v = judgePairScope( { draftIn: [ 0, 1 ], liveIn: [ 0 ], matches: [ [ 0, 0 ] ], dTexts: [ 'shop', 'extra' ], lTexts: [ 'shop' ] } );
	assert.equal( v.ok, true );
} );

test( 'NOT OVER-REFUSING: a repeated word is not judged, because its twin may be another occurrence', () => {
	const t = [ 'add', 'to', 'basket', 'add', 'to', 'basket' ];
	const m = t.map( ( _, i ) => [ i, i ] );
	// The first pair's draft element holds words 0-2, live's holds 3-5: every word repeats, so none is a sure twin.
	assert.equal( judgePairScope( { draftIn: [ 0, 1, 2 ], liveIn: [ 3, 4, 5 ], matches: m, dTexts: t, lTexts: t } ).ok, true );
} );

// The gate refuses a surface's whole walk before a browser opens, so over-refusing is the expensive direction.
// Two real over-refusals on Eye Care's 17 surfaces drove these rules: 6 of 7 refused pairs declared `text: false`
// (shop's card-7 pairs the draft's made-up stars against live's "No reviews yet" by design), and the seventh split
// on a single incidental word. The floor is on the EVIDENCE BASE and never on how large a share splits, because the
// real about-step mispair this gate exists for splits only 1 of 9.
test( 'MUST FAIL TO REFUSE: a verdict needs more than one or two matched words', () => {
	const pair = ( n ) => ( {
		draftIn: Array.from( { length: n }, ( _, i ) => i ),
		liveIn: [],
		matches: Array.from( { length: n }, ( _, i ) => [ i, i ] ),
		dTexts: Array.from( { length: n }, ( _, i ) => `w${ i }` ),
		lTexts: Array.from( { length: n }, ( _, i ) => `w${ i }` ),
	} );
	// One and two matched words are not judged, however completely they split.
	for ( const n of [ 1, 2 ] ) {
		const v = judgePairScope( pair( n ) );
		assert.equal( v.ok, true, `${ n } matched word(s) must not refuse` );
		assert.equal( v.judged, false );
		assert.match( v.why, /too few/ );
	}
	// Red on revert: at the floor and above, a split still refuses, and the real mispair's 1-of-9 shape is caught.
	const three = judgePairScope( pair( MIN_CHECKED ) );
	assert.equal( three.ok, false, 'at MIN_CHECKED a split must still refuse' );
	assert.equal( MIN_CHECKED, 3 );

	const nine = {
		draftIn: [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ],
		liveIn: [ 1, 2, 3, 4, 5, 6, 7, 8 ],
		matches: Array.from( { length: 9 }, ( _, i ) => [ i, i ] ),
		dTexts: [ '1', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ],
		lTexts: [ '1', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ],
	};
	const real = judgePairScope( nine );
	assert.equal( real.ok, false, 'the about-step shape, 1 split of 9 checked, must still be refused' );
	assert.equal( real.checked, 9 );
	assert.equal( real.split.length, 1 );
} );

// --- The phone drawer's state opener, and the context a collector failure carries -------------------------
// mobile-menu could not be paired: pairs.mjs died with "the pair root for this state was not found on the page"
// at the 768 recheck. Proven cause, read live on both sides: the Menu button's rendered label is empty at 375
// and "Menu" from tablet up, and the opener matched it by text with '^$', so the click fired at 375 and matched
// nothing at 768, where clickText's `optional` swallowed the miss and left the drawer shut.

// resolveFinder's own rule: the pattern is tested, case-insensitively, against normalised innerText AND textContent.
const finds = ( pattern, { innerText, textContent } ) => {
	const re = new RegExp( pattern, 'i' );
	const norm = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim();
	return re.test( norm( innerText ) ) || re.test( norm( textContent ) );
};

// The two renderings of the SAME button, measured 2026-10-06 on the draft and on the live mirror.
const MENU_AT_375 = { innerText: '', textContent: 'Menu' };
const MENU_AT_768 = { innerText: 'Menu', textContent: 'Menu' };

test( 'MUST FAIL: the phone drawer opener matches the Menu button at every width it is shown', () => {
	const src = readFileSync( new URL( '../../../sites/eye-care-ward-end/build/qa/parity/header.mjs', import.meta.url ), 'utf8' );
	const open = src.match( /const openMenu = async[\s\S]*?\n};/ );
	assert.ok( open, 'header.mjs must still define openMenu' );
	const pattern = open[ 0 ].match( /clickText\(\s*'([^']+)'/ );
	assert.ok( pattern, 'openMenu must still click by a text pattern' );
	// Red on revert: '^$' passes the 375 case and fails this one.
	assert.ok( finds( pattern[ 1 ], MENU_AT_375 ), `${ pattern[ 1 ] } must match the button at 375 (label hidden)` );
	assert.ok( finds( pattern[ 1 ], MENU_AT_768 ), `${ pattern[ 1 ] } must match the button at 768 (label shown)` );
	// Not over-suppressing: a wider pattern that also swallowed the drawer's own close button, or the bag, would
	// open the wrong control and pair the wrong tree.
	assert.equal( finds( pattern[ 1 ], { innerText: 'Close menu', textContent: 'Close menu' } ), false, 'must not match the drawer close button' );
	assert.equal( finds( pattern[ 1 ], { innerText: 'Bag', textContent: 'Bag' } ), false, 'must not match the bag button' );
	assert.equal( finds( pattern[ 1 ], { innerText: 'Search', textContent: 'Search' } ), false, 'must not match search' );
} );

test( 'MUST FAIL: a collector failure names the side, width and state, and a non-root failure keeps its own text', () => {
	const root = '.sgs-nav-drawer[open]';
	const m = collectContext( { side: 'draft', width: 768, state: 'drawer-open', root, message: 'the pair root for this state was not found on the page' } );
	assert.match( m, /draft/ );
	assert.match( m, /768px/ );
	assert.match( m, /drawer-open/ );
	assert.match( m, /sgs-nav-drawer\[open\]/, 'the root that was missing must be named' );
	assert.match( m, /state opener that did not fire/, 'the cause that produced this must be named' );
	// Not over-suppressing: an unrelated failure must not be retold as a pair-root story, and must keep its text.
	const other = collectContext( { side: 'live', width: 375, state: null, root, message: 'Execution context was destroyed' } );
	assert.match( other, /live at 375px: Execution context was destroyed/ );
	assert.equal( /pair root|state opener/.test( other ), false, 'a non-root failure must not gain the root explanation' );
	assert.equal( /in state/.test( other ), false, 'a stateless run must not invent a state' );
} );

test( 'MUST FAIL: pairs.mjs routes both collectTagged calls through collectContext', () => {
	// A unit test cannot see a wiring gap: collectContext would pass its own tests while pairs.mjs still threw the
	// bare page error, and rootFor was in fact referenced before it was imported.
	const src = readFileSync( new URL( '../pairs.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /import \{[^}]*\bcollectContext\b[^}]*\} from '\.\/lib\/pairs\.mjs'/s, 'collectContext must be imported, not just referenced' );
	assert.match( src, /import \{[^}]*\brootFor\b[^}]*\} from '\.\/lib\/pairs\.mjs'/s, 'rootFor must be imported: it is read only on the error path' );
	assert.match( src, /throw new Error\( collectContext\(/, 'the collector failure must be rethrown through collectContext' );
	const direct = [ ...src.matchAll( /await collectTagged\(/g ) ];
	assert.equal( direct.length, 1, 'collectTagged must be called in exactly one place, inside the wrapper' );
	const wrapper = src.match( /const tagged = async[\s\S]*?\n\t\t\};/ );
	assert.ok( wrapper && /await collectTagged\(/.test( wrapper[ 0 ] ), 'that one call must sit inside the tagged() wrapper' );
	assert.match( src, /await tagged\( draft, 'draft' \)/ );
	assert.match( src, /await tagged\( live, 'live' \)/ );
} );
