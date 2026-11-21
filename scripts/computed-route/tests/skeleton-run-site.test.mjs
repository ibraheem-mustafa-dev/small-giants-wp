// The propose stage reads every per-site record for the site the run is aimed at (site-run's --site), never the site the
// surface entry in surfaces.json records: on 2026-11-21 a header re-clone on a scratch copy of the Eye Care mirror read the
// menu map's record for the mirror (which holds no menu items), so neither half of the split menu carried
// splitAfterItemId and both halves drew every item. skeleton.mjs::proposeSurface is called with a stub proposer that
// records what it is given; the menu map, the catalogue and the calibration cache are fixtures. No site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSlotMap, writePaint } from '../lib/cache.mjs';
import { READ_KEY } from '../lib/calibrate-props.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '../..' );
const CLIENT = 'eye-care-ward-end';
const ENTRY_SITE = 'acme-mirror';
const RUN_SITE = 'acme-copy';
const db = openDb();

// A temp repo with one header surface recorded on ENTRY_SITE, a menu map and a catalogue whose run-site records alone hold
// the header menu's items and the facet's attribute, and a cache where only RUN_SITE has sgs/text's default paint.
function fixture() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-run-site-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake', 'inventories' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	const inventory = fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { header: { site: ENTRY_SITE, intakeSurface: 'site-header' } } ) );
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'site-header': { id: 'S-1', kind: 'header', name: 'Header', inventory: {} } } } ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'header.inventory.json' ), inventory );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( { surfaces: {} } ) );
	fs.writeFileSync( path.join( build, 'menu-map.json' ), JSON.stringify( { sites: {
		[ ENTRY_SITE ]: { menus: { header: 30 } },
		[ RUN_SITE ]: { menus: { header: 31 }, items: { header: { Glasses: 'id:695', Help: 'id:129' } } },
	} } ) );
	fs.writeFileSync( path.join( build, 'catalogue.json' ), JSON.stringify( { sites: { [ RUN_SITE ]: { attributes: { colour: 7 } } } } ) );
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	const cache = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-run-site-cache-' ) );
	writeSlotMap( cache, 'sgs/text', { block: 'sgs/text', site: RUN_SITE, slotKey: 'k', readKey: READ_KEY, settings: {} } );
	writePaint( cache, RUN_SITE, 'sgs/text', { block: 'sgs/text', site: RUN_SITE, paintKey: 'pk', readKey: READ_KEY, elements: { '': { 1440: { color: 'red' } } } } );
	return { repo, cache };
}

// What the proposer was given, by a stub that proposes an empty skeleton (so the paint gate has nothing to check).
function given( opts ) {
	let seen = null;
	proposeSurface( { client: CLIENT, surface: 'header', db, ...opts, propose: ( a ) => ( seen = a, { skeleton: [], proposal: { counts: {}, rows: [] }, problems: [] } ) } );
	return seen;
}

test( 'MUST FAIL: a run aimed at another site reads that site\'s menu items, menu, catalogue and calibration', () => {
	const f = fixture();
	const a = given( { repo: f.repo, cache: f.cache, site: RUN_SITE } );
	assert.deepEqual( a.carried.items( 'header' ), { Glasses: 'id:695', Help: 'id:129' } );
	assert.equal( a.carried.menu( 'header' ), 31 );
	assert.deepEqual( a.carried.attribute( 'colour' ), { id: 7 } );
	assert.deepEqual( a.calKeys( 'sgs/text' ), [ '' ] );
	assert.deepEqual( a.calTags( 'sgs/text' ), { '': null } );
} );

test( 'negative control: a run naming no site reads the surface entry\'s records', () => {
	const f = fixture();
	const a = given( { repo: f.repo, cache: f.cache } );
	assert.deepEqual( a.carried.items( 'header' ), {} );
	assert.equal( a.carried.menu( 'header' ), 30 );
	assert.match( a.carried.attribute( 'colour' ).reason, /acme-mirror/ );
	assert.deepEqual( a.calKeys( 'sgs/text' ), [] );
} );
