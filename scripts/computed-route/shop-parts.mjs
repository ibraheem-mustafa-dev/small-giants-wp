#!/usr/bin/env node
// Spec 48 FR-48-60, FR-48-61, FR-48-62: maps a client's draft shop surfaces (buy box, filter, basket drawer) to their
// framework homes and prints the record; `--write` saves it as sites/<client>/build/shop-parts.json.
//   node scripts/computed-route/shop-parts.mjs <client> [--write]
// Reads the draft folder's surfaces.json and `.dc.html` files, the framework DB (read-only) for block settings, and the
// theme's part and archive template for the blocks they compose.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './lib/db.mjs';
import { readShopSurfaces } from './lib/shop-parts-read.mjs';
import { ShopPartsError, buildRecord, loadVocab, resolveVocab } from './lib/shop-parts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );

// Attribute names per block slug for every block a vocabulary entry names.
export function attrsFor( vocab ) {
	const db = openDb();
	try {
		const stmt = db.prepare( 'SELECT attr_name FROM block_attributes WHERE block_slug = ?' );
		const slugs = [ ...new Set( vocab.entries.filter( ( e ) => 'setting' === e.home.type ).map( ( e ) => e.home.block ) ) ];
		return Object.fromEntries( slugs.map( ( s ) => [ s, new Set( stmt.all( s ).map( ( r ) => r.attr_name ) ) ] ).filter( ( [ , set ] ) => set.size ) );
	} finally {
		db.close();
	}
}

export function themeFiles( vocab, repo = REPO ) {
	const files = {};
	for ( const e of vocab.entries ) {
		const f = e.home.file;
		if ( f && ! ( f in files ) && existsSync( path.join( repo, f ) ) ) {
			files[ f ] = readFileSync( path.join( repo, f ), 'utf8' );
		}
	}
	return files;
}

export function run( client, { repo = REPO } = {} ) {
	const draft = path.join( repo, 'sites', client, 'handoff' );
	if ( ! existsSync( path.join( draft, 'surfaces.json' ) ) ) {
		throw new ShopPartsError( `sites/${ client }/handoff/surfaces.json does not exist` );
	}
	const records = JSON.parse( readFileSync( path.join( draft, 'surfaces.json' ), 'utf8' ) ).records;
	const sources = Object.fromEntries( readdirSync( draft ).filter( ( f ) => f.endsWith( '.dc.html' ) ).map( ( f ) => [ f, readFileSync( path.join( draft, f ), 'utf8' ) ] ) );
	const raw = loadVocab();
	const vocab = resolveVocab( raw, { attrs: attrsFor( raw ), files: themeFiles( raw, repo ) } );
	return buildRecord( { client, surfaces: readShopSurfaces( { records, sources } ), vocab } );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const [ client ] = process.argv.slice( 2 ).filter( ( a ) => ! a.startsWith( '--' ) );
	if ( ! client ) {
		console.error( 'usage: shop-parts.mjs <client> [--write]' );
		process.exit( 2 );
	}
	try {
		const record = run( client );
		for ( const s of record.surfaces ) {
			console.log( `${ s.kind }: ${ s.problem || `${ s.units } units, ${ s.parts.length } parts (${ s.record }, ${ s.file })` }` );
			for ( const p of s.parts ) {
				console.log( `  ${ p.home.type.padEnd( 14 ) } ${ p.label } x${ p.units }${ p.write ? ` -> ${ JSON.stringify( p.write ) }` : '' }` );
			}
		}
		console.log( JSON.stringify( record.counts ) );
		if ( process.argv.includes( '--write' ) ) {
			const out = path.join( REPO, 'sites', client, 'build', 'shop-parts.json' );
			mkdirSync( path.dirname( out ), { recursive: true } );
			writeFileSync( out, `${ JSON.stringify( record, null, '\t' ) }\n` );
			console.log( `wrote ${ path.relative( REPO, out ) }` );
		} else {
			console.log( 'dry run: nothing written (--write saves sites/<client>/build/shop-parts.json)' );
		}
	} catch ( e ) {
		if ( ! ( e instanceof ShopPartsError ) ) {
			throw e;
		}
		console.error( e.message );
		process.exit( 1 );
	}
}
