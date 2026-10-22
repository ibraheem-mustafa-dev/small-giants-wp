// Spec 48 FR-48-7: a served inventory's `Root/...` keys resolve to the fact record's keys through lib/key-space.mjs, by the
// runtime's host and data-dc-tpl identity and the copy index, so the record's rules apply to `skeleton.mjs propose` on a
// served draft. Each case is a MUST FAIL (tests/fixtures/key-space/mutations.json, tools/mutate.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { translateElement, translateInventory } from '../lib/key-space.mjs';
import { recordView } from '../lib/skeleton-record.mjs';

const ROOT = 'Site v2';
const rec = ( realParent = null ) => ( { template: { realParent, realTag: 'div', attrs: {}, style: { holes: [] }, membership: { scFor: [] } } } );
const record = { elements: { [ `${ ROOT }/39` ]: rec(), [ `${ ROOT }/47` ]: rec( `${ ROOT }/39` ), 'Nav/5': rec() }, surfaces: {} };
const el = ( key, template, tpl, extra = {} ) => ( { key, template, tpl, tag: 'div', attrs: {}, ...extra } );
const inventory = { elements: [ el( 'Root/39#0', 'Root', 39 ), el( 'Root/47#0', 'Root', 47 ), el( 'Root/47#3', 'Root', 47 ), el( 'Root>Nav@8#0/5#0', 'Nav', 5 ), el( 'Root/99#0', 'Root', 99 ) ] };

test( 'MUST FAIL a served Root key resolves to its record key and its intake-space instance key', () => {
	const t = translateElement( inventory.elements[ 0 ], ROOT );
	assert.equal( t.templateKey, `${ ROOT }/39` );
	assert.equal( t.instanceKey, `${ ROOT }/39#0` );
	const view = recordView( record, { rootComponent: ROOT } );
	assert.ok( view.has( inventory.elements[ 0 ] ) );
	assert.equal( view.entry( inventory.elements[ 1 ] ), record.elements[ `${ ROOT }/47` ] );
} );

test( 'MUST FAIL a copy inside a loop resolves to the same template and the right #copy', () => {
	const t = translateElement( inventory.elements[ 2 ], ROOT );
	assert.equal( t.templateKey, `${ ROOT }/47` );
	assert.equal( t.instanceKey, `${ ROOT }/47#3` );
	assert.equal( t.copy, 3 );
} );

test( 'MUST FAIL a nested import host keeps its own component and a served root key without an entry component is listed', () => {
	assert.equal( translateElement( inventory.elements[ 3 ], ROOT ).templateKey, 'Nav/5' );
	const none = translateElement( inventory.elements[ 0 ], null );
	assert.equal( none.templateKey, undefined );
	assert.match( none.reason, /entry component/ );
	const view = recordView( record, { rootComponent: null } );
	assert.equal( view.has( inventory.elements[ 0 ] ), false );
	assert.deepEqual( view.untranslated.map( ( u ) => u.key ), [ 'Root/39#0' ] );
} );

test( 'MUST FAIL an element with no identity, or a key that disagrees with its tpl, is listed and never guessed', () => {
	const r = translateInventory( { elements: [ el( 'Root/39#0', 'Root', 39 ), el( 'Root/40#0', 'Root', null ), el( 'Root/41#0', 'Root', 42 ), el( 'x', '', 3 ) ] }, ROOT, record );
	assert.deepEqual( Object.keys( r.byKey ), [ 'Root/39#0' ] );
	assert.deepEqual( r.untranslated.map( ( u ) => u.key ), [ 'Root/40#0', 'Root/41#0', 'x' ] );
	assert.match( r.untranslated[ 1 ].reason, /tpl 41 and the element tpl 42|tpl 41/ );
} );

test( 'MUST FAIL translateInventory resolves every node and lists the ones the record has no entry for', () => {
	const r = translateInventory( inventory, ROOT, record );
	assert.equal( Object.keys( r.byKey ).length, 5 );
	assert.deepEqual( r.untranslated, [] );
	assert.deepEqual( r.unrecorded, [ 'Root/99#0' ] );
	assert.equal( r.byKey[ 'Root/47#3' ].templateKey, `${ ROOT }/47` );
} );

test( 'MUST FAIL matching is by identity, never by text or class', () => {
	const decoy = el( 'Root/99#0', 'Root', 99, { allText: 'Home About', words: 'Home', attrs: { class: `${ ROOT }/39` } } );
	assert.equal( recordView( record, { rootComponent: ROOT } ).has( decoy ), false );
} );

// The wiring: proposeSkeleton hands the entry component to the record view, so a served inventory's nodes find their
// record entries and the proposal lists none as untranslated.
test( 'MUST FAIL proposeSkeleton on a served inventory translates every node and lists the untranslatable ones only without a root component', async () => {
	const { openDb } = await import( '../lib/db.mjs' );
	const { loadFacts } = await import( '../lib/skeleton-facts.mjs' );
	const { proposeSkeleton } = await import( '../lib/skeleton-propose.mjs' );
	const path = await import( 'path' );
	const { fileURLToPath } = await import( 'url' );
	const repo = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: 0, w: 100, h: 20 } ] ) );
	const full = ( key, parentKey, depth, tag, tpl ) => ( { key, parentKey, depth, tag, template: 'Root', tpl, attrs: {}, words: '', allText: '', membership: [], srcTag: tag, srcOwnText: '', snippet: `<${ tag } data-dc-tpl="${ tpl }"></${ tag }>`, box, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
	const inv = () => ( { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements: [ full( 'Root/1#0', null, 0, 'header', 1 ), full( 'Root/2#0', 'Root/1#0', 1, 'div', 2 ) ] } );
	const entry = ( n, tag, parent ) => ( { template: { key: `${ ROOT }/${ n }`, component: ROOT, n: String( n ), tag, realTag: tag, attrs: {}, style: { static: [], holes: [] }, pseudo: {}, holes: [], parent, realParent: parent, parentChain: [], membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: 1 }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );
	const factRecord = { schema: '1', client: 'fixture-client', elements: { [ `${ ROOT }/1` ]: entry( 1, 'header', null ), [ `${ ROOT }/2` ]: entry( 2, 'div', `${ ROOT }/1` ) }, surfaces: {} };
	const db = openDb();
	const run = ( rootComponent ) => proposeSkeleton( { inventory: inv(), facts: loadFacts( { db, client: 'fixture-client', repo } ), surface: 'fixture', surfaceKind: 'menu', surfaceName: 'F', db, factRecord, openers: {}, rootComponent } ).proposal;
	assert.deepEqual( run( ROOT ).recordUntranslated, [] );
	assert.deepEqual( run( null ).recordUntranslated.map( ( u ) => u.key ), [ 'Root/1#0', 'Root/2#0' ] );
} );
