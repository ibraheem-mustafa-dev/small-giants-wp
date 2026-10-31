// Identification by elimination (Spec 48 §3.4, FR-48-6; plan F1 step B1, lib/skeleton-identity.mjs): the facts a draft region
// shows rule out the blocks that never show them (only a proven absence does), the facts few blocks share rank the
// survivors, a platform separates only a look-alike family, and a block's own parts beside it widen its placement.
// MUST FAIL cases on slices of the real saved inventories (tests/fixtures/skeleton-identity/*.json: each region's inventory
// subtree and its fact-record entries, read against the client's committed draft): Eye Care's product tab list is sgs/tabs
// and its trail sgs/breadcrumbs, Mama's product trail sgs/breadcrumbs, Mama's Help FAQ and Eye Care's "Good to know" an
// sgs/accordion beside the heading or count line their holder also holds, Eye Care's Google reviews region absorbs its
// summary and arrows, and Mama's review slider, whose cards name Trustpilot, is a review row naming the Trustpilot block.
// Negative controls on the same slices: category chips (aria-pressed), the account side tabs (aria-current), a frame-card
// grid with its link rows and swatch buttons, and a button row stay as they were. Synthetic planted-row cases: a tie and no
// survivor become review rows; an unknown never rules out; a platform word outside a family changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { proposeFixture } from './fixtures/fixture-facts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const fixture = ( name ) => JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'skeleton-identity', `${ name }.json` ), 'utf8' ) );
const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const flat = ( nodes ) => nodes.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );

// One slice proposed as a page surface with its real record, against the client's committed draft.
function propose( fix, { loops = null, edit = null, inventory = fix.inventory } = {} ) {
	const facts = loadFacts( { db, client: fix.client, repo: REPO } );
	facts.decisions = structuredClone( facts.decisions );
	edit && edit( facts.decisions.rules );
	const sources = { files: { [ fix.draft ]: hashOf( path.join( REPO, 'sites', fix.client, 'handoff', fix.draft ) ) } };
	return proposeSkeleton( { inventory, facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, rootComponent: fix.inventory.checks.rootName, loops, factRecord: { schema: '1', client: fix.client, elements: fix.record, surfaces: {}, sources } } );
}
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const nodeOf = ( r, name ) => flat( r.skeleton ).find( ( n ) => n.name === name ) ?? null;
const off = ( rules ) => delete rules.identity;

const EC = 'Eye Care Birmingham';
test( 'MUST FAIL: Eye Care\'s product tab list is sgs/tabs over its tabs and panel; its trail is sgs/breadcrumbs; its "Good to know" is an accordion beside its heading', () => {
	const fix = fixture( 'ec-product' );
	const r = propose( fix );
	const tabs = rowOf( r, `${ EC }/415#0` );
	assert.deepEqual( [ tabs.block, tabs.rule ], [ 'sgs/tabs', 'identity' ], 'the smallest element holding the tab list and the panel it shows is sgs/tabs' );
	assert.ok( tabs.confidence >= 0.7, 'one clear winner' );
	assert.match( tabs.reason, /renders-role tablist/ );
	assert.match( tabs.reason, /has-part panel/, 'the panel the tabs switch is read from the logic, the part only sgs/tabs draws among the tab-list blocks' );
	const node = nodeOf( r, 'sgs/tabs' );
	assert.deepEqual( node.innerBlocks.map( ( n ) => [ n.name, n.attributes.label ] ), [ [ 'sgs/tab', 'Description' ], [ 'sgs/tab', 'Details' ], [ 'sgs/tab', 'Sizing' ] ] );
	assert.ok( flat( node.innerBlocks[ 0 ].innerBlocks ).length >= 2, 'the panel shown at rest is the first tab\'s content' );
	assert.deepEqual( [ `${ EC }/416#0`, `${ EC }/418#0` ].map( ( k ) => rowOf( r, k ).action ), [ 'absorbed', 'absorbed' ] );
	assert.deepEqual( [ rowOf( r, `${ EC }/420#0` ).action, node.innerBlocks[ 0 ].innerBlocks.length ], [ null, 1 ], 'the panel is built as itself, its own rules applying, inside tab 1' );
	assert.equal( rowOf( r, `${ EC }/414#0` ).block, 'sgs/container', 'the section holding the tabs is not the tabs (not the smallest holder)' );
	const trail = rowOf( r, `${ EC }/334#0` );
	assert.deepEqual( [ trail.block, trail.rule ], [ 'sgs/breadcrumbs', 'identity' ] );
	assert.match( trail.reason, /accepts-value \// );
	assert.deepEqual( [ 335, 336, 339 ].map( ( n ) => rowOf( r, `${ EC }/${ n }#0` ).action ), [ 'absorbed', 'absorbed', 'absorbed' ], 'the trail draws its links and separators' );
	const acc = flat( r.skeleton ).find( ( n ) => 'sgs/accordion' === n.name );
	assert.ok( acc, 'Good to know is an accordion' );
	assert.equal( rowOf( r, `${ EC }/491#0` ).block, 'sgs/heading', 'its heading stays a heading beside the accordion' );
	assert.equal( acc.innerBlocks.length, 4 );
	assert.equal( acc.innerBlocks[ 0 ].attributes.title, 'Will prescription lenses work in these?', 'the title is the control\'s text beside its "+" glyph' );
	const before = propose( fix, { edit: off } );
	assert.equal( rowOf( before, `${ EC }/415#0` ).block, 'sgs/container', 'with the matcher off the tabs are a container' );
	assert.equal( rowOf( before, `${ EC }/334#0` ).block, 'sgs/container' );
} );

test( 'MUST FAIL: Mama\'s product trail is sgs/breadcrumbs', () => {
	const r = propose( fixture( 'mama-product' ) );
	assert.deepEqual( [ rowOf( r, 'Product/9#0' ).block, rowOf( r, 'Product/9#0' ).rule ], [ 'sgs/breadcrumbs', 'identity' ] );
	assert.equal( rowOf( r, 'Product/14#0' ).action, 'absorbed', 'the current page crumb is the trail\'s own' );
} );

test( 'MUST FAIL: Mama\'s Help FAQ is one sgs/accordion beside its count line; its category chips (aria-pressed) stay the option filter', () => {
	const r = propose( fixture( 'mama-help' ) );
	const acc = flat( r.skeleton ).find( ( n ) => 'sgs/accordion' === n.name );
	assert.ok( acc, 'the FAQ is an accordion' );
	assert.equal( acc.innerBlocks.length, 12 );
	assert.ok( acc.innerBlocks.every( ( n ) => 'sgs/accordion-item' === n.name && n.attributes.title ), 'every item has its question' );
	assert.equal( rowOf( r, 'Help/24#0' ).block, 'sgs/text', 'the count line stays beside the accordion' );
	assert.match( rowOf( r, 'Help/23#0' ).rowNote, /one sgs\/accordion beside its other content/ );
	const chips = rowOf( r, 'Help/19#0' );
	assert.deepEqual( [ chips.block, chips.rule ], [ 'sgs/option-picker', 'optionSetFilter' ], 'negative control: aria-pressed chips are not re-identified' );
} );

test( 'MUST FAIL: Eye Care\'s Google reviews block stands over its summary, its rail and its arrows', () => {
	const r = propose( fixture( 'ec-google' ) );
	const top = rowOf( r, `${ EC }/174#0` );
	assert.deepEqual( [ top.block, top.rule ], [ 'sgs/google-reviews', 'loopBlocks' ] );
	assert.match( top.reason, /platform google.*; at .*175#0/, 'the summary is its part by the platform it names' );
	assert.match( top.reason, /self-moving controls|shows-part arrow/, 'the arrows are its part by the track they scroll' );
	assert.deepEqual( [ 175, 179, 186, 189, 205, 208 ].map( ( n ) => rowOf( r, `${ EC }/${ n }#0` ).action ), Array( 6 ).fill( 'absorbed' ) );
	assert.equal( rowOf( r, `${ EC }/173#0` ).block, 'sgs/heading', 'the section heading is no part' );
	assert.equal( flat( r.skeleton ).filter( ( n ) => 'sgs/google-reviews' === n.name ).length, 1 );
	const before = propose( fixture( 'ec-google' ), { edit: off } );
	assert.equal( rowOf( before, `${ EC }/189#0` ).block, 'sgs/google-reviews', 'before: the block sat on the rail alone' );
	assert.equal( rowOf( before, `${ EC }/175#0` ).block, 'sgs/container', 'before: the summary was cloned outside it' );
} );

test( 'MUST FAIL: a review slider whose cards name Trustpilot is a review row naming the Trustpilot block; without the name it stays the slider', () => {
	const fix = fixture( 'mama-reviews' );
	const loops = { rows: [], brands: [], carousels: new Set( [ 'Home/222' ] ) };
	const r = propose( fix, { loops } );
	const row = rowOf( r, 'Home/222#0' );
	assert.equal( row.block, 'sgs/testimonial-slider', 'the standing rule keeps its block (never a silent swap)' );
	assert.ok( row.confidence < 0.7, 'the platform proves it wrong: a review row' );
	assert.match( row.reason, /names trustpilot .* the platform of sgs\/trustpilot-reviews/ );
	assert.ok( row.candidates.some( ( c ) => 'sgs/trustpilot-reviews' === c.block ), 'the Trustpilot block is a candidate' );
	const plain = { ...fix.inventory, elements: fix.inventory.elements.map( ( e ) => ( /trustpilot/i.test( `${ e.words } ${ e.attrs?.alt ?? '' } ${ e.attrs?.srcBasename ?? '' } ${ e.attrs?.href ?? '' }` ) ? { ...e, words: '', allText: '', attrs: {} } : e ) ) };
	const neutral = propose( fix, { loops, inventory: plain } );
	assert.equal( rowOf( neutral, 'Home/222#0' ).confidence, 1, 'negative control: no platform named, the slider stands' );
} );

test( 'negative controls: the account side tabs (aria-current), a frame-card grid with link rows and swatches, and a button row stay as they were', () => {
	for ( const [ name, keys ] of [ [ 'ec-account', [ `${ EC }/924#0`, `${ EC }/926#0` ] ], [ 'ec-cards', [ `${ EC }/539#0`, `${ EC }/541#0` ] ], [ 'ec-google', [ `${ EC }/185#0` ] ] ] ) {
		const fix = fixture( name );
		const now = propose( fix );
		const before = propose( fix, { edit: off } );
		const ids = now.proposal.rows.filter( ( x ) => 'identity' === x.rule || x.identity );
		assert.deepEqual( ids.filter( ( x ) => ! /174#0|175#0|18\d#0|20\d#0/.test( x.key ) ).map( ( x ) => x.key ), [], `${ name }: no row is re-identified` );
		for ( const k of keys.filter( ( x ) => rowOf( before, x ) && ! /185#0/.test( x ) ) ) {
			assert.deepEqual( [ rowOf( now, k ).block, rowOf( now, k ).action ], [ rowOf( before, k ).block, rowOf( before, k ).action ], `${ name } ${ k } keeps its block` );
		}
	}
} );

// ---- synthetic inventories with planted identity rows ----
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 40 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs, words, allText: x.all ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
// The facts with the identity table's rows replaced by `rows` ([ block, fact, value, state ]).
const planted = ( rows ) => {
	const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
	const q = facts.q;
	facts.q = ( sql, ...a ) => ( /FROM block_identity_facts/.test( sql ) ? rows.filter( ( r ) => ! /fact = 'platform'/.test( sql ) || 'platform' === r[ 1 ] ).map( ( [ block_slug, fact, value, state ] ) => ( /DISTINCT value/.test( sql ) ? { value } : { block_slug, fact, value, state } ) ) : q( sql, ...a ) );
	return facts;
};
const run = ( elements, facts ) => proposeFixture( { inventory: inv( elements ), facts, surface: 'test', surfaceKind: 'page', db } );
const TABLIST = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { attrs: { role: 'tablist' } } ),
	el( 'Root/3#0', 'Root/2#0', 'button', 'One', { depth: 2, attrs: { role: 'tab' }, box: place( 0, 100, 80 ) } ),
	el( 'Root/3#1', 'Root/2#0', 'button', 'Two', { depth: 2, attrs: { role: 'tab' }, box: place( 100, 100, 80 ) } ),
];
const ctxAll = ( block ) => [ 'any' ].map( ( v ) => [ block, 'context', v, 'yes' ] );

test( 'a tie the scoring cannot separate is a review row naming the leaders; one clear leader wins', () => {
	const rows = [ ...ctxAll( 'sgs/tabs' ), ...ctxAll( 'sgs/gallery' ), ...ctxAll( 'sgs/multi-button' ), ...[ 'sgs/tabs', 'sgs/gallery' ].flatMap( ( b ) => [ [ b, 'renders-role', 'tablist', 'yes' ], [ b, 'renders-role', 'tab', 'yes' ] ] ), [ 'sgs/multi-button', 'renders-role', 'tablist', 'no' ], [ 'sgs/button', 'renders-role', 'tablist', 'no' ], [ 'sgs/container', 'renders-role', 'tablist', 'unknown' ], ...Array.from( { length: 6 }, ( _, i ) => [ `sgs/other-${ i }`, 'renders-role', 'tablist', 'no' ] ) ];
	const r = run( TABLIST, planted( rows ) );
	const row = rowOf( r, 'Root/2#0' );
	assert.ok( row.confidence < 0.7, 'a tie is a review row' );
	assert.match( row.reason, /cannot separate sgs\/tabs, sgs\/gallery|cannot separate sgs\/gallery, sgs\/tabs/ );
	assert.match( row.reason, /sgs\/multi-button never shows renders-role tablist/, 'the scoring\'s own pick, ruled out by a proven no, is named' );
	const selected = TABLIST.map( ( e ) => ( 'button' === e.tag ? { ...e, attrs: { ...e.attrs, 'aria-selected': 'false' } } : e ) );
	const clear = run( selected, planted( [ ...rows, [ 'sgs/tabs', 'renders-aria', 'aria-selected', 'yes' ], [ 'sgs/gallery', 'renders-aria', 'aria-selected', 'unknown' ] ] ) );
	const won = rowOf( clear, 'Root/2#0' );
	assert.deepEqual( [ won.block, won.rule ], [ 'sgs/tabs', 'identity' ], 'one more fact shown by one block only: a clear winner' );
	assert.ok( won.confidence >= 0.7 );
} );

test( 'no survivor is a review row naming what ruled out each candidate; an unknown never rules out', () => {
	// A leaf whose proposed blocks hold no other block, so a proven no on each leaves none.
	const LEAF = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'p', 'Words of its own', { attrs: { role: 'tablist' } } ) ];
	const scoring = run( LEAF, ( () => {
		const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
		f.decisions = structuredClone( f.decisions );
		delete f.decisions.rules.identity;
		return f;
	} )() );
	const proposed = rowOf( scoring, 'Root/2#0' ).candidates.map( ( c ) => c.block );
	assert.ok( proposed.length, 'the scoring proposes blocks for the element' );
	const rows = [ ...proposed.flatMap( ( b ) => [ ...ctxAll( b ), [ b, 'renders-role', 'tablist', 'no' ] ] ), ...Array.from( { length: 4 }, ( _, i ) => [ `sgs/other-${ i }`, 'renders-role', 'tablist', 'no' ] ) ];
	const facts = planted( rows );
	const row = rowOf( run( LEAF, facts ), 'Root/2#0' );
	assert.equal( row.confidence, facts.decisions.rules.identity.reviewConfidence, 'no survivor is a review row' );
	assert.match( row.reason, /no block is left/ );
	assert.ok( row.reason.includes( `${ proposed[ 0 ] } never shows renders-role tablist` ), 'the reason names what ruled out each candidate' );
	const kept = rowOf( run( LEAF, planted( [ ...ctxAll( proposed[ 0 ] ), [ 'sgs/gallery', 'renders-role', 'tablist', 'no' ] ] ) ), 'Root/2#0' );
	assert.deepEqual( [ kept.block, kept.confidence ], [ proposed[ 0 ], rowOf( scoring, 'Root/2#0' ).confidence ], 'no row for the scoring\'s pick is unknown: it stays' );
} );

test( 'a platform named outside a look-alike family changes nothing', () => {
	const els = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'p', 'Find us on Google and Trustpilot' ) ];
	const real = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
	const r = run( els, real );
	const before = run( els, ( () => {
		const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
		f.decisions = structuredClone( f.decisions );
		delete f.decisions.rules.identity;
		return f;
	} )() );
	assert.deepEqual( [ rowOf( r, 'Root/2#0' ).block, rowOf( r, 'Root/2#0' ).confidence ], [ rowOf( before, 'Root/2#0' ).block, rowOf( before, 'Root/2#0' ).confidence ] );
} );

test( 'facts are meanings, never literal tags: a heading tag is heading, an href link is link, a generic element or inline formatting carries none', async () => {
	const { roleOf, tagRoles } = await import( '../lib/skeleton-identity-roles.mjs' );
	const at = ( attrs, parent = 'div', up = [] ) => ( { attr: ( e, n ) => attrs[ n ] ?? null, parentTag: () => parent, ancestorTags: () => up } );
	assert.deepEqual( roleOf( { tag: 'h3' }, at( {} ) ), { role: 'heading', explicit: false } );
	assert.deepEqual( roleOf( { tag: 'a' }, at( { href: '#' } ) ), { role: 'link', explicit: false } );
	assert.equal( roleOf( { tag: 'a' }, at( {} ) ), null, 'an anchor with no href is generic' );
	[ 'b', 'strong', 'em', 'i', 'span', 'div', 'p' ].forEach( ( tag ) => assert.equal( roleOf( { tag }, at( {} ) ), null, `${ tag } carries no meaning` ) );
	assert.deepEqual( roleOf( { tag: 'div' }, at( { role: 'tablist' } ) ), { role: 'tablist', explicit: true } );
	assert.equal( roleOf( { tag: 'img' }, at( { alt: '' } ) ), null, 'a decorative image is presentation' );
	assert.deepEqual( roleOf( { tag: 'li' }, at( {}, 'ul' ) ), { role: 'listitem', explicit: false } );
	assert.ok( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ].every( ( t ) => tagRoles.get( t )?.has( 'heading' ) ), 'a block that can print any heading tag can show heading' );
} );

test( 'MUST FAIL: a block that prints its inner blocks with no allowed list accepts any block whatever its container kind, so a missing fact never rules it out; a restricted block still is', async () => {
	const { makeIdentity } = await import( '../lib/skeleton-identity.mjs' );
	const { fixtureModel } = await import( './fixtures/fixture-facts.mjs' );
	const facts = planted( [ ...ctxAll( 'sgs/form-step' ), [ 'sgs/form-step', 'renders-role', 'tablist', 'no' ], [ 'sgs/multi-button', 'renders-role', 'tablist', 'no' ], [ 'sgs/button', 'renders-role', 'tablist', 'no' ] ] );
	const composition = facts.composition[ 'sgs/form-step' ];
	assert.deepEqual( [ composition.accepts, composition.container_kind ], [ null, 'layout' ], 'the case: no allowed list, a layout container kind' );
	const m = fixtureModel( inv( TABLIST ) );
	const id = makeIdentity( { m, facts, surface: { kind: 'page' } } );
	assert.equal( id.table.holds( 'sgs/form-step' ), 'any', 'its editor offers InnerBlocks and its render prints $content' );
	assert.equal( id.ruledOut( 'sgs/form-step', m.byKey[ 'Root/2#0' ] ), null, 'an accept-any block is never ruled out by a missing fact' );
	assert.match( id.ruledOut( 'sgs/multi-button', m.byKey[ 'Root/2#0' ] )?.why ?? '', /never shows renders-role tablist/, 'a restricted block (its allowed list) still is' );
} );

// ---- the kinds of value a region shows, and a placed block's named parts beside it ----
const real = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const lucide = ( key, parentKey, depth ) => ( { ...el( key, parentKey, 'svg', '', { depth, attrs: { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor' }, box: place( 0, 100, 18, 18 ) } ) } );

test( 'MUST FAIL: rows marked with emoji are the list block that accepts that kind of marker; an emoji never rules out a block with a text setting', () => {
	const rows = [ 0, 1, 2 ].flatMap( ( i ) => [
		el( `Root/3#${ i }`, 'Root/2#0', 'div', '', { depth: 2, attrs: { role: 'listitem' }, box: place( 0, 100 + i * 40 ) } ),
		el( `Root/4#${ i }`, `Root/3#${ i }`, 'span', '✓', { depth: 3, box: place( 0, 100 + i * 40, 16, 16 ) } ),
		el( `Root/5#${ i }`, `Root/3#${ i }`, 'span', `Benefit number ${ i + 1 } in words`, { depth: 3, box: place( 24, 100 + i * 40, 200, 20 ) } ),
	] );
	const LIST = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { attrs: { role: 'list' } } ), ...rows ];
	const r = run( LIST, real() );
	const row = rowOf( r, 'Root/2#0' );
	assert.deepEqual( [ row.block, row.rule ], [ 'sgs/icon-list', 'identity' ], 'a list whose markers are emoji is the block whose item icon accepts emoji' );
	assert.match( row.reason, /accepts-kind \*=icon:emoji/ );
	assert.notEqual( rowOf( r, 'Root/5#0' ).identity?.why ?? '', /accepts-kind/, 'the words beside the marker keep their text block' );
} );

test( 'MUST FAIL: a stroke-drawn icon beside words rules out a restricted block with no icon field (a review row), never an accept-any container', async () => {
	const ELS = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', 'Free delivery over £50', { all: 'Free delivery over £50' } ), lucide( 'Root/3#0', 'Root/2#0', 2 ) ];
	const { makeIdentity } = await import( '../lib/skeleton-identity.mjs' );
	const { fixtureModel } = await import( './fixtures/fixture-facts.mjs' );
	const m = fixtureModel( inv( ELS ) );
	const id = makeIdentity( { m, facts: real(), surface: { kind: 'page' } } );
	const at = m.byKey[ 'Root/2#0' ];
	assert.match( id.ruledOut( 'sgs/text', at )?.why ?? '', /accepts-kind \*=icon:lucide/, 'a text block holds no icon' );
	assert.equal( id.ruledOut( 'sgs/container', at ), null, 'an accept-any container is never ruled out' );
	assert.equal( id.ruledOut( 'sgs/icon', at ), null, 'the icon block, whose picker takes the icon library, stays' );
	const inButton = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'button', 'Next', { all: 'Next' } ), lucide( 'Root/3#0', 'Root/2#0', 2 ) ];
	const mb = fixtureModel( inv( inButton ) );
	assert.ok( ! [ ...makeIdentity( { m: mb, facts: real(), surface: { kind: 'page' } } ).region( mb.byKey[ 'Root/2#0' ] ).values() ].some( ( f ) => 'accepts-kind' === f.fact ), 'an icon inside a control is the control\'s own drawing, no value' );
} );

test( 'MUST FAIL: the Google reviews block names the summary parts it draws: stars, the 4.7 score, the review counts and both platform buttons', () => {
	const r = propose( fixture( 'ec-google' ) );
	const top = rowOf( r, `${ EC }/174#0` );
	assert.equal( top.block, 'sgs/google-reviews' );
	for ( const part of [ 'star', 'average', 'count', 'see-all', 'arrow' ] ) {
		assert.match( top.reason, new RegExp( `shows-part ${ part }` ), `the ${ part } part is read from the draft` );
	}
	assert.deepEqual( [ 181, 183, 184, 186, 187, 206, 208 ].map( ( n ) => rowOf( r, `${ EC }/${ n }#0` ).action ), Array( 7 ).fill( 'absorbed' ) );
} );

test( 'MUST FAIL: a testimonial slider draws its arrows and dots beside it; its section heading and the platform summary it has no part for stay', () => {
	const fix = fixture( 'mama-reviews' );
	const r = propose( fix, { loops: { rows: [], brands: [], carousels: new Set( [ 'Home/222' ] ) } } );
	assert.equal( rowOf( r, 'Home/222#0' ).block, 'sgs/testimonial-slider' );
	assert.deepEqual( [ 'Home/219#0', 'Home/220#0', 'Home/233#0', 'Home/235#0' ].map( ( k ) => [ rowOf( r, k ).action, rowOf( r, k ).into ?? null ] ).map( ( [ a ] ) => a ), Array( 4 ).fill( 'absorbed' ), 'the prev and next arrows and the one-per-slide dots are the slider\'s' );
	assert.match( rowOf( r, 'Home/219#0' ).reason, /shows-part (arrow|dot)/ );
	assert.equal( rowOf( r, 'Home/213#0' ).block, 'sgs/heading', 'the section heading stays' );
	assert.notEqual( rowOf( r, 'Home/214#0' ).action, 'absorbed', 'the Trustpilot score link is no part the slider draws' );
} );

test( 'negative control: a product card beside a review loop keeps its star rating and price', () => {
	const google = 'https://www.google.com/maps/reviews';
	const card = ( i ) => [
		el( `Root/11#${ i }`, 'Root/10#0', 'figure', '', { depth: 2, loop: 11, all: `★★★★★ Great service number ${ i } from a real customer who wrote at length about it`, box: place( i * 300, 200 ) } ),
		el( `Root/12#${ i }`, `Root/11#${ i }`, 'span', '★★★★★', { depth: 3, attrs: { 'aria-label': '5 out of 5' } } ),
		el( `Root/13#${ i }`, `Root/11#${ i }`, 'blockquote', `Great service number ${ i } from a real customer who wrote at length about it`, { depth: 3 } ),
		el( `Root/14#${ i }`, `Root/11#${ i }`, 'a', 'Read on Google', { depth: 3, attrs: { href: google } } ),
	];
	const loopEl = ( e ) => ( /Root\/1[1-4]#/.test( e.key ) ? { ...e, membership: [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: '11' } ] } : e );
	const ELS = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/9#0', 'Root/1#0', 'div', '' ), el( 'Root/10#0', 'Root/9#0', 'div', '', { depth: 1 } ), ...[ 0, 1, 2 ].flatMap( card ),
		el( 'Root/20#0', 'Root/9#0', 'a', '', { depth: 1, attrs: { href: '/product/x' } } ), el( 'Root/21#0', 'Root/20#0', 'span', '★★★★☆', { depth: 2, attrs: { 'aria-label': '4.2 out of 5' } } ), el( 'Root/22#0', 'Root/20#0', 'span', '£24.00', { depth: 2 } ) ].map( loopEl );
	const r = proposeFixture( { inventory: inv( ELS ), facts: real(), surface: 'test', surfaceKind: 'page', db } );
	assert.ok( [ 'Root/20#0', 'Root/21#0', 'Root/22#0' ].every( ( k ) => ! /^identity/.test( rowOf( r, k )?.rule ?? '' ) && rowOf( r, k )?.into !== 'Root/10#0' ), 'the card, its rating and its price are not the reviews block\'s parts' );
} );
