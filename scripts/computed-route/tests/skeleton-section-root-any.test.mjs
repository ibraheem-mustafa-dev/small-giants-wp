// A section-root whose edit.js sets no allowedBlocks accepts any block, and the DB stores that as a NULL list
// (plugins/sgs-blocks/scripts/sgs-update-v2.py::_populate_allowed_blocks). The classifier keeps it as a candidate
// for a draft root instead of dropping it for having no list (skeleton-classify.mjs::makeClassifier, sectionRoots).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const loaded = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Example Co' } );
const withHero = ( accepts ) => ( { ...loaded, composition: { ...loaded.composition, 'sgs/hero': { ...loaded.composition[ 'sgs/hero' ], accepts } } } );

const box = { x: 0, y: 0, w: 1440, h: 400 };
const vis = { 375: true, 768: true, 1440: true };
const boxes = { 375: box, 768: box, 1440: box };
const el = ( id, parent, tag, words, depth ) => ( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box: boxes, visible: vis, display: 'block', flexDirection: 'row', screenshots: {} } );
const draft = [ el( 1, null, 'banner', '', 0 ), el( 2, 1, 'h1', 'Welcome to our practice', 1 ), el( 3, 1, 'p', 'Friendly local care for every family.', 1 ) ];
const rootRow = ( facts ) => proposeSkeleton( { inventory: { checks: {}, source: 'fixture', root: 'banner', generated: 'fixture', elements: draft }, facts, surface: 'page', surfaceKind: 'page', surfaceName: 'Home', db } )
	.proposal.rows.find( ( r ) => 'Root/1#0' === r.key );

test( 'MUST FAIL (a section-root with a NULL accepts list is still a candidate): sgs/hero accepting any block is scored for a section root', () => {
	const row = rootRow( withHero( null ) );
	assert.ok( JSON.stringify( row ).includes( 'sgs/hero' ), 'the hero stays a candidate' );
	assert.ok( JSON.stringify( row ).includes( 'accepting any block' ), 'the evidence says it accepts any block' );
} );

test( 'negative control: a section-root with a list is scored with that list', () => {
	const evidence = rootRow( withHero( [ 'sgs/media' ] ) ).candidates.find( ( c ) => 'sgs/hero' === c.block ).evidence;
	assert.ok( evidence.some( ( x ) => x.includes( 'accepting ["sgs/media"]' ) ) );
	assert.ok( ! evidence.some( ( x ) => x.includes( 'accepting any block' ) ) );
} );
