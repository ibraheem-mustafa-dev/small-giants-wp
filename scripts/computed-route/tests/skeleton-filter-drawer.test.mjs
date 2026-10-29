// The shop filter's narrow-width open state (Spec 48 FR-48-61, lib/skeleton-filter-drawer.mjs, rules.filterDrawer): a surface of
// kind drawer whose root holds the catalogue's filter groups is the filter block's own overlay settings, never a second
// drawer (`sgs/nav-drawer`). Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs) and the committed Eye
// Care catalogue facets. Tests marked MUST FAIL fail on the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import fs from 'fs';
import os from 'os';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { proposalContext } from '../lib/skeleton-context.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const at = ( x, y, w, h ) => ( { x, y, w, h } );
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || { 375: at( 0, 0, 300, 100 ), 768: at( 0, 0, 300, 100 ), 1440: at( 0, 0, 300, 100 ) }, visible: x.visible || { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'aside', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const facet = ( slug, label ) => ( { field: slug, key: slug, label, slug, kind: 'value', terms: [ { name: label, swatch: null } ], wildcard: null, toggleLabel: null, axis: false, files: [ 'Store.dc.html' ] } );
const FILTERS = { facets: [ facet( 'shade', 'Shade' ), facet( 'kind', 'Kind' ), facet( 'fit', 'Fit' ) ], brands: [], categories: [] };
// The drawer: a root aside, a close button and a footer that show only when it is open, and two facet groups.
const drawer = ( rootBox, visible, labels = [ 'Shade', 'Kind' ] ) => [
	el( 'Root/1#0', null, 'aside', '', { depth: 0, box: rootBox, visible } ),
	el( 'Root/2#0', 'Root/1#0', 'button', 'Close', { depth: 1, visible: { 375: true, 768: true, 1440: false } } ),
	...labels.flatMap( ( l, i ) => [ el( `Root/${ 10 + i }#0`, 'Root/1#0', 'button', '', { depth: 1 } ), el( `Root/${ 20 + i }#0`, `Root/${ 10 + i }#0`, 'span', l, { depth: 2 } ) ] ),
	el( 'Root/30#0', 'Root/1#0', 'div', 'Show 4 frames', { depth: 1, visible: { 375: true, 768: true, 1440: false } } ),
];
const ALL = { 375: true, 768: true, 1440: true };
const FULL = { 375: at( 0, 0, 375, 900 ), 768: at( 0, 0, 768, 900 ), 1440: at( 52, 300, 270, 1300 ) };
const run = ( elements, surfaceKind = 'drawer', filters = FILTERS ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'rail', surfaceKind, surfaceName: 'Shop filter rail / drawer', filters, db } );
const nodes = ( tree ) => tree.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );

test( 'MUST FAIL: the filter drawer is the filter block with its overlay mode, one node, never the navigation drawer', () => {
	const { skeleton, proposal, problems } = run( drawer( FULL, ALL ) );
	assert.deepEqual( problems, [] );
	assert.equal( skeleton.length, 1 );
	assert.equal( skeleton[ 0 ].name, 'woocommerce/product-filters' );
	assert.deepEqual( skeleton[ 0 ].attributes, { overlayMode: 'mobile' }, 'a rail at 1440 and a drawer below it: the overlay on mobile' );
	assert.equal( skeleton[ 0 ].draftRef.tpl, 'Root/1#0', 'Fill reads the drawer root' );
	assert.equal( nodes( skeleton ).length, 1, 'no second static drawer: the draft\'s elements are absorbed' );
	assert.ok( ! nodes( skeleton ).some( ( n ) => 'sgs/nav-drawer' === n.name ) );
	assert.deepEqual( proposal.filterDrawer.facets, [ 'Shade', 'Kind' ] );
} );

test( 'MUST FAIL: what the overlay settings cannot carry (a full-viewport sheet, a sticky footer) is a missing feature on the root row, not a static copy', () => {
	const { proposal } = run( drawer( FULL, ALL ) );
	const root = proposal.rows.find( ( r ) => 'Root/1#0' === r.key );
	assert.equal( root.rule, 'filterDrawer' );
	assert.match( root.missingFeature.why, /covers the viewport at 375px/ );
	assert.ok( proposal.rows.filter( ( r ) => 'Root/1#0' !== r.key ).every( ( r ) => 'absorbed' === r.action || 'remove' === r.action ), 'every other element is absorbed' );
} );

test( 'MUST FAIL: a panel anchored to one side names its side; a drawer shown only below the rail width is always an overlay', () => {
	const left = run( drawer( { ...FULL, 375: at( 0, 0, 300, 900 ), 768: at( 0, 0, 300, 900 ) }, ALL ) ).skeleton[ 0 ];
	assert.deepEqual( left.attributes, { overlayMode: 'mobile', overlayPosition: 'left' } );
	const right = run( drawer( { ...FULL, 375: at( 75, 0, 300, 900 ), 768: at( 468, 0, 300, 900 ) }, ALL ) ).skeleton[ 0 ];
	assert.equal( right.attributes.overlayPosition, 'right' );
	assert.ok( ! run( drawer( { ...FULL, 375: at( 0, 0, 300, 900 ) }, ALL ) ).proposal.filterDrawer.notes.length, 'a side panel loses nothing' );
	const only = run( drawer( FULL, { 375: true, 768: true, 1440: false } ) ).skeleton[ 0 ];
	assert.equal( only.attributes.overlayMode, 'always' );
} );

test( 'negative control: a drawer with no filter groups stays the navigation drawer; a filter shown at 1440 only, a page, or no catalogue is not the filter drawer', () => {
	const nav = run( drawer( FULL, ALL, [ 'Home', 'About' ] ) );
	assert.equal( nav.skeleton[ 0 ].name, 'sgs/nav-drawer', 'labels no facet owns' );
	assert.equal( nav.proposal.filterDrawer, undefined );
	assert.equal( run( drawer( FULL, { 375: false, 768: false, 1440: true } ) ).proposal.filterDrawer, undefined, 'a rail with no open state is the page\'s rail' );
	assert.equal( run( drawer( FULL, ALL ), 'page' ).proposal.filterDrawer, undefined, 'only a drawer surface' );
	assert.equal( run( drawer( FULL, ALL ), 'drawer', null ).proposal.filterDrawer, undefined, 'no catalogue, no facets' );
	assert.equal( run( drawer( FULL, ALL, [ 'Shade' ] ) ).proposal.filterDrawer, undefined, 'one matching word is not a filter' );
	const hidden = drawer( FULL, ALL, [ 'Shade', 'Kind' ] );
	hidden.find( ( e ) => 'Root/21#0' === e.key ).visible = { 375: false, 768: false, 1440: false };
	assert.equal( run( hidden ).proposal.filterDrawer, undefined, 'a label the draft never shows is no label' );
} );

test( 'MUST FAIL: the proposal context of a run hands every surface the filter facets of the catalogue, so a drawer can be matched to them', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-ctx-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'acme', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'build', 'catalogue.json' ), JSON.stringify( { facets: FILTERS.facets, products: [], dropped: [] } ) );
	assert.deepEqual( proposalContext( { repo, client: 'acme', slug: 'rail', id: 'S-1', breakpoints: [] } ).filters.facets.map( ( f ) => f.label ), [ 'Shade', 'Kind', 'Fit' ] );
	assert.equal( proposalContext( { repo, client: 'none', slug: 'rail', id: 'S-1', breakpoints: [] } ).filters, null, 'a client with no catalogue has no filters' );
} );
