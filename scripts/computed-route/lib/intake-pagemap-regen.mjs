// `intake.mjs --page-map <client>` (Spec 48 FR-48-30): rebuilds only sites/<client>/build/page-map.json, offline, from
// the export (sites/<client>/handoff/) and the saved intake record, with no browser stage. The new proposal takes
// Bean's page-map review marks from build/intake/intake.json by row id (`page:<postType>:<slug>`: `drop` removes a
// row, `edit:<field>=<value>` sets a field), then the ids of the current map by row key (lib/site-build-map.mjs::rowKey),
// is validated against data/page-map.schema.json, and replaces the map; every added, removed or changed row is printed.
import fs from 'fs';
import path from 'path';
import { proposePageMap, pageMapProblems } from './intake-pagemap.mjs';
import { safeRowId } from './intake-review.mjs';
import { rowKey } from './site-build-map.mjs';
import { loadAjv } from './handoff.mjs';

const FIELDS = [ 'route', 'title', 'parent', 'template', 'postType', 'collection', 'menus', 'flags', 'parts', 'id' ];

// Bean's page-map marks in an intake record, by row id: Map( rowId -> mark ).
export function pageMapMarks( intake ) {
	return new Map( ( intake?.review || [] ).filter( ( r ) => 'page-map' === r.rowType && r.mark ).map( ( r ) => [ r.rowId, r.mark ] ) );
}

// The proposed rows with the marks applied: { rows, applied, unapplied } where `unapplied` lists each mark naming a row
// id the proposal no longer has.
export function applyMarks( proposed, marks ) {
	const seen = new Set();
	const rows = proposed.flatMap( ( row ) => {
		const id = safeRowId( `page:${ row.postType }:${ row.slug }` );
		const mark = marks.get( id );
		seen.add( id );
		if ( 'drop' === mark ) {
			return [];
		}
		const e = /^edit:([A-Za-z]+)=(.*)$/.exec( mark || '' );
		if ( ! e ) {
			return [ row ];
		}
		const value = [ 'parent', 'template' ].includes( e[ 1 ] ) && [ '', 'null' ].includes( e[ 2 ] ) ? null : e[ 2 ];
		return [ { ...row, [ e[ 1 ] ]: value } ];
	} );
	const unapplied = [ ...marks.keys() ].filter( ( id ) => ! seen.has( id ) && 'accept' !== marks.get( id ) );
	return { rows, applied: [ ...marks.keys() ].filter( ( id ) => seen.has( id ) ).length, unapplied };
}

// The rows with each current row's id carried by row key (a row whose key is new keeps id null).
export const carryIds = ( rows, current ) => {
	const ids = new Map( current.map( ( r ) => [ rowKey( r ), r.id ] ) );
	return rows.map( ( r ) => ( { ...r, id: ids.get( rowKey( r ) ) ?? null } ) );
};

// What changed between two maps, by row key: [ 'added <key>', 'removed <key>', '<key>: <field> <before> -> <after>' ].
export function mapChanges( before, after ) {
	const old = new Map( before.map( ( r ) => [ rowKey( r ), r ] ) );
	const now = new Map( after.map( ( r ) => [ rowKey( r ), r ] ) );
	const show = ( v ) => ( undefined === v ? '(none)' : JSON.stringify( v ) );
	const out = [];
	for ( const [ k, r ] of now ) {
		if ( ! old.has( k ) ) {
			out.push( `added ${ k } "${ r.title }"` );
			continue;
		}
		const was = old.get( k );
		FIELDS.filter( ( f ) => JSON.stringify( was[ f ] ?? null ) !== JSON.stringify( r[ f ] ?? null ) )
			.forEach( ( f ) => out.push( `${ k }: ${ f } ${ show( was[ f ] ) } -> ${ show( r[ f ] ) }` ) );
	}
	[ ...old.keys() ].filter( ( k ) => ! now.has( k ) ).forEach( ( k ) => out.push( `removed ${ k } "${ old.get( k ).title }"` ) );
	return out;
}

// Runs the regeneration for `o.client` under `o.repo`. Returns the exit code (1 when the export is missing or the new
// map does not validate; nothing is written then).
export function runPageMap( o, { log = ( l ) => process.stderr.write( `${ l }\n` ) } = {} ) {
	const say = ( l ) => log( `[intake --page-map] ${ l }` );
	const folder = path.join( o.repo, 'sites', o.client, 'handoff' );
	const file = path.join( o.repo, 'sites', o.client, 'build', 'page-map.json' );
	const intakeFile = path.join( o.repo, 'sites', o.client, 'build', 'intake', 'intake.json' );
	if ( ! fs.existsSync( folder ) ) {
		say( `${ path.relative( o.repo, folder ) } is missing` );
		return 1;
	}
	const current = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : [];
	const intake = fs.existsSync( intakeFile ) ? JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ) : null;
	const proposal = proposePageMap( { folder } );
	const marked = applyMarks( proposal.rows, pageMapMarks( intake ) );
	const rows = carryIds( marked.rows, current );
	const problems = pageMapProblems( rows, loadAjv() );
	if ( problems.length ) {
		say( `the regenerated map does not validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	const changes = mapChanges( current, rows );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( rows, null, 2 ) }\n` );
	say( `${ o.client }: ${ rows.length } rows (${ intake ? `${ marked.applied } review marks matched` : 'no intake record, no review marks' }); ${ changes.length } changes${ changes.length ? `:\n${ changes.map( ( c ) => `  - ${ c }` ).join( '\n' ) }` : '' }` );
	marked.unapplied.forEach( ( id ) => say( `review mark for ${ id } names no row of the new proposal (not applied)` ) );
	return 0;
}
