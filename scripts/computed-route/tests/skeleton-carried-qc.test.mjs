// Wave 2 QC fixes for the carried ids (each MUST FAIL when its rule breaks): a logo's tag and attributes come from the
// fact record, never the snippet; a media-map entry is matched by the draft file's sha256, never a path tail; a carry the
// build could not make is reported on the row and in the proposal's problems.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { carriedIds, logoFile, mediaEntry } from '../lib/skeleton-carried.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const sha = ( s ) => crypto.createHash( 'sha256' ).update( s ).digest( 'hex' );
const maps = new Map( [ [ 'wide', [ 'assets/wide.svg' ] ], [ 'square', [ 'assets/square.svg' ] ] ] );

test( 'MUST FAIL: the logo element\'s tag and attributes are the fact record\'s, not a regex over its snippet', () => {
	const view = ( tag, attrs ) => ( { entry: () => ( { template: { realTag: tag, attrs } } ) } );
	// The snippet names the other variant: reading it would pick the wrong file.
	const el = { tag: 'div', attrs: {}, snippet: '<x-logo variant="square"></x-logo>' };
	assert.equal( logoFile( { e: el, maps, view: view( 'x-logo', { variant: 'wide', 'aria-label': 'Logo' } ) } ), 'assets/wide.svg' );
	assert.equal( logoFile( { e: el, maps, view: view( 'x-logo', { variant: '{{ v }}' } ) } ), null, 'a bound value names no file' );
	// The record says the element is an img: its src is the record's literal, else the rendered value of a binding.
	assert.equal( logoFile( { e: { tag: 'div', attrs: {} }, maps, view: view( 'img', { src: './assets/wide.svg' } ) } ), 'assets/wide.svg' );
	assert.equal( logoFile( { e: { tag: 'img', attrs: { src: './assets/square.svg' } }, maps, view: view( 'img', { src: '{{ s }}' } ) } ), 'assets/square.svg' );
	assert.equal( logoFile( { e: { tag: 'img', attrs: { src: './assets/wide.svg' } }, maps, view: view( 'x-logo', {} ) } ), null, 'the record\'s tag decides, not the rendered one' );
} );

test( 'MUST FAIL: an element of a served inventory (root host `Root`) is read from the entry draft\'s record entry', () => {
	const rec = { template: { realTag: 'x-logo', attrs: { variant: 'square' } } };
	const view = { entry: () => null, elements: { 'Page/7': rec } };
	const e = { tag: 'x-logo', template: 'Root', tpl: 7, attrs: {} };
	assert.equal( logoFile( { e, maps, view, rootComponent: 'Page' } ), 'assets/square.svg' );
	assert.equal( logoFile( { e, maps, view } ), null, 'without the entry draft the element has no record entry' );
} );

function repoWith( files ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'carried-qc-' ) );
	const folder = path.join( repo, 'sites', 'c', 'handoff' );
	fs.mkdirSync( path.join( folder, 'assets' ), { recursive: true } );
	fs.writeFileSync( path.join( folder, 'assets', 'wide.svg' ), '<svg>wide</svg>' );
	return { repo, folder, map: { sites: { t: { files } } } };
}

test( 'MUST FAIL: a media-map entry is matched by the file\'s sha256 alone; a path that merely ends the same way is not a match', () => {
	const own = repoWith( [ { asset: 'elsewhere/wide.svg', sha256: sha( '<svg>wide</svg>' ), id: 5 } ] );
	assert.deepEqual( mediaEntry( { map: own.map, site: 't', repo: own.repo, folder: own.folder, file: 'assets/wide.svg' } ), { id: 5, asset: 'elsewhere/wide.svg' } );
	const tail = repoWith( [ { asset: 'sites/c/handoff/assets/wide.svg', sha256: sha( '<svg>other bytes</svg>' ), id: 6 } ] );
	assert.match( mediaEntry( { map: tail.map, site: 't', repo: tail.repo, folder: tail.folder, file: 'assets/wide.svg' } ).reason, /not in the media map/ );
} );

test( 'MUST FAIL: carriedIds().logo reads the element through the view it is given', () => {
	const own = repoWith( [ { asset: 'sites/c/handoff/assets/wide.svg', sha256: sha( '<svg>wide</svg>' ), id: 11 } ] );
	fs.writeFileSync( path.join( own.folder, 'logo.js' ), "const SRC = { wide: './assets/wide.svg' };\n" );
	fs.mkdirSync( path.join( own.repo, 'sites', 'c', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( own.repo, 'sites', 'c', 'build', 'media-map.json' ), JSON.stringify( own.map ) );
	const c = carriedIds( { repo: own.repo, client: 'c', site: 't' } );
	const view = { entry: () => ( { template: { realTag: 'x-logo', attrs: { variant: 'wide' } } } ) };
	assert.deepEqual( c.logo( { tag: 'div', attrs: {} }, view ), { id: 11, asset: 'sites/c/handoff/assets/wide.svg' } );
	assert.equal( c.logo( { tag: 'div', attrs: {} } ), null );
} );

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const inventory = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', 'eye-care-ward-end', 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Eye Care Birmingham' } );
const propose = ( o = {} ) => proposeSkeleton( { inventory, facts, surface: 'footer', db, ...o } );

test( 'MUST FAIL: a logo the build could not carry (no media entry, several attachments) is reported on its row and in the proposal\'s problems', () => {
	const none = propose( { carried: { logo: () => ( { reason: 'a.svg (sha256 abcd1234) is not in the media map for t' } ), menu: () => null } } );
	const row = none.proposal.rows.find( ( x ) => 'sgs/responsive-logo' === x.block );
	assert.match( row.carriedMissing[ 0 ], /no logoId is carried: a\.svg .* is not in the media map/ );
	assert.ok( none.problems.some( ( p ) => /no logoId is carried: a\.svg/.test( p ) ) );
	assert.ok( none.proposal.problems.some( ( p ) => /no logoId is carried/.test( p ) ) );
	const many = propose( { carried: { logo: () => ( { reason: 'a.svg matches different attachments (1, 2)' } ), menu: () => null } } );
	assert.ok( many.problems.some( ( p ) => /different attachments \(1, 2\)/.test( p ) ) );
	const fine = propose( { carried: { logo: () => null, menu: () => null } } );
	assert.ok( ! fine.problems.some( ( p ) => /no logoId is carried/.test( p ) ) );
} );
