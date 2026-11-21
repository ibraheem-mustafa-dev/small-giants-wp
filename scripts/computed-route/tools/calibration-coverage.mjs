#!/usr/bin/env node
// Lists every block setting that could paint or change its block and has no usable calibration reading, each with one
// reason (lib/calibration-coverage.mjs::REASONS), ranked by the draft rows that hit it; the drift between each block's
// declarations and its measurements; and where calibration caches disagree on one setting. Reads files only: the
// framework database (read-only), block.json files and calibration caches. No browser, no site.
//   node scripts/computed-route/tools/calibration-coverage.mjs --caches <dir>[,<dir>...] [--db <file>] [--src <blocks dir>]
//        [--gaps <gaps.json>] [--list <list.json>] [--motion <rows.json>] [--out <folder>] [--json] [--top <n>]
//   --caches: calibration cache folders (scripts/computed-route/cache of any worktree); the freshest slot map of each
//     block (by `measured`) is the one judged, every other one, and each `<block>.refused.json` candidate, is compared
//     with it. --gaps: a gap census (groups written-as-css, unmapped, refused: rows by block, part and property, every
//     surface it lists); --list: a paint-conservation list (rows of class host-unread on the gap census's surfaces, by host
//     block and look); --motion: the state-transitions detector's rows.json (unwritten state properties by block and
//     trigger). --out writes coverage.json there.
// Exit 0 always: the list is a report.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { coverage, summarise } from '../lib/calibration-coverage.mjs';
import { PRESENCE_ROLES } from '../lib/calibrate-content.mjs';
import { DB_PATH } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// Every observation of every block in the cache folders: { block: [ { wt, site, measured, map, candidate } ] }.
// `drawn` is every element path of the block's default paints in the folder's site subfolders.
export function readObservations( dirs ) {
	const out = {};
	for ( const dir of dirs ) {
		const wt = path.resolve( dir ).split( path.sep ).slice( -4, -3 )[ 0 ] || dir;
		const drawn = {};
		for ( const sub of fs.readdirSync( dir, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() ) ) {
			for ( const f of fs.readdirSync( path.join( dir, sub.name ) ).filter( ( n ) => n.endsWith( '.paint.json' ) ) ) {
				const p = readJson( path.join( dir, sub.name, f ) );
				p?.block && Object.keys( p.elements || {} ).forEach( ( e ) => ( drawn[ p.block ] ??= new Set() ).add( e ) );
			}
		}
		for ( const f of fs.readdirSync( dir ).filter( ( n ) => /^[a-z0-9-]+(\.refused)?\.json$/.test( n ) ) ) {
			const map = readJson( path.join( dir, f ) );
			if ( map?.block && map.settings ) {
				( out[ map.block ] ??= [] ).push( { wt, site: map.site, measured: map.measured, map, candidate: f.endsWith( '.refused.json' ), drawn: [ ...( drawn[ map.block ] || [] ) ] } );
			}
		}
	}
	return out;
}

// The draft rows the holes are ranked by, from the three optional files.
export function readDraftRows( { gaps, list, motion } ) {
	const out = [];
	let surfaces = null;
	if ( gaps ) {
		const g = readJson( gaps );
		surfaces = new Set( Object.entries( g.surfaces || {} ).flatMap( ( [ client, list ] ) => list.map( ( [ s ] ) => `${ client }/${ s }` ) ) );
		const best = new Map();
		for ( const group of [ 'written-as-css', 'unmapped', 'refused' ] ) {
			for ( const r of g.groups?.[ group ] || [] ) {
				const k = `${ r.block }|${ r.part }|${ r.property }`;
				best.set( k, Math.max( best.get( k ) || 0, r.rows ) );
			}
		}
		for ( const [ k, rows ] of best ) {
			const [ block, part, property ] = k.split( '|' );
			out.push( { source: 'gaps', block, part, property, state: null, rows } );
		}
	}
	if ( list ) {
		for ( const r of readJson( list ).rows || [] ) {
			if ( 'host-unread' === r.class && r.hostBlock && ( ! surfaces || surfaces.has( `${ r.client }/${ r.surface }` ) ) ) {
				Object.keys( r.looks || {} ).forEach( ( look ) => out.push( { source: 'list', block: r.hostBlock, part: null, look, state: null, rows: 1 } ) );
			}
		}
	}
	if ( motion ) {
		for ( const r of readJson( motion ).rows || [] ) {
			for ( const p of r.properties || [] ) {
				[ 'none', 'setting' ].includes( p.verdict ) && out.push( { source: 'motion', block: r.block, part: null, property: p.property, state: r.trigger, rows: 1 } );
			}
		}
	}
	return out;
}

// The framework database's rows and role classes, opened read-only.
export function readDb( file ) {
	const db = new DatabaseSync( file, { readOnly: true } );
	const rows = db.prepare( 'SELECT block_slug, attr_name, attr_type, default_value, enum_values, is_responsive, role, css_property, css_element, css_state, css_tier, tier_shape, source FROM block_attributes' ).all().map( ( r ) => ( { ...r } ) );
	const roles = Object.fromEntries( db.prepare( 'SELECT role_name, classification FROM roles' ).all().map( ( r ) => [ r.role_name, r.classification ] ) );
	const unitSuffixes = db.prepare( "SELECT suffix FROM modifier_suffixes WHERE kind = 'unit'" ).all().map( ( r ) => r.suffix );
	db.close();
	return { rows, roles, unitSuffixes };
}

// Every block's block.json elements under the blocks folder: { 'sgs/<dir>': elements }.
export function readElements( src ) {
	const out = {};
	for ( const d of fs.readdirSync( src ) ) {
		const f = path.join( src, d, 'block.json' );
		if ( fs.existsSync( f ) ) {
			const j = readJson( f );
			j.name && ( out[ j.name ] = j.supports?.sgs?.elements || {} );
		}
	}
	return out;
}

function main( argv ) {
	const arg = ( name ) => {
		const i = argv.indexOf( name );
		return i >= 0 ? argv[ i + 1 ] : null;
	};
	const caches = ( arg( '--caches' ) || path.join( HERE, '..', 'cache' ) ).split( ',' );
	const { rows, roles, unitSuffixes } = readDb( arg( '--db' ) || DB_PATH );
	const elementsOf = readElements( arg( '--src' ) || path.resolve( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' ) );
	const fixtures = readJson( arg( '--fixtures' ) || path.join( HERE, '..', 'calibration-fixtures.json' ) );
	const observations = readObservations( caches );
	const draftRows = readDraftRows( { gaps: arg( '--gaps' ), list: arg( '--list' ), motion: arg( '--motion' ) } );
	const result = coverage( { rows, roles, elementsOf, observations, presenceRoles: PRESENCE_ROLES, unitSuffixes, fixtures, draftRows } );
	const summary = summarise( result );
	const out = arg( '--out' );
	if ( out ) {
		fs.mkdirSync( out, { recursive: true } );
		fs.writeFileSync( path.join( out, 'coverage.json' ), JSON.stringify( { summary, ...result, settings: undefined }, null, 1 ) );
	}
	if ( argv.includes( '--json' ) ) {
		console.log( JSON.stringify( { summary, holes: result.holes, drift: result.drift, disagreements: result.disagreements }, null, 1 ) );
		return;
	}
	console.log( `settings checked ${ summary.checked }, usable ${ summary.usable }, without ${ summary.holes } (other ${ ( summary.otherShare * 100 ).toFixed( 1 ) }%); set apart: ${ result.apart.companion } unit companions, ${ result.apart.customCss } custom CSS` );
	for ( const [ reason, e ] of Object.entries( summary.byReason ).sort( ( a, b ) => b[ 1 ].settings - a[ 1 ].settings ) ) {
		console.log( `  ${ reason.padEnd( 20 ) } ${ String( e.settings ).padStart( 5 ) } settings, ${ e.hits } draft rows ${ JSON.stringify( e.details ) }` );
	}
	console.log( `drift ${ JSON.stringify( summary.driftByKind ) }; disagreements ${ result.disagreements.length }` );
	const top = Number( arg( '--top' ) || 20 );
	result.holes.slice( 0, top ).forEach( ( h ) => console.log( `  ${ String( h.hits.rows ).padStart( 4 ) } ${ h.block } ${ h.setting } ${ h.reason }${ h.detail ? ` (${ h.detail })` : '' }` ) );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) );
}
