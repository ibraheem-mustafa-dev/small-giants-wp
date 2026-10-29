// `intake.mjs --page-map <client>` (Spec 48 FR-48-30): rebuilds only sites/<client>/build/page-map.json, offline, from
// the export (sites/<client>/handoff/) and the saved intake record, with no browser stage. The new proposal takes
// Bean's page-map review marks from build/intake/intake.json by row id (`page:<postType>:<slug>`: `drop` removes a
// row, `edit:<field>=<value>` sets one of the EDITABLE fields), then the ids of the current map by row key
// (lib/site-build-map.mjs::rowKey), is validated against data/page-map.schema.json, and replaces the map; every added,
// removed or changed row is printed. A row of the current map holding a WordPress id that the new map would lose is
// refused unless Bean's review dropped it. The saved intake record takes the same proposal as its `pageMap` and review.md
// is rendered again from it (syncIntake), so `--apply-review` confirms the regenerated map, never the one it replaced.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, pageMapProblems } from './intake-pagemap.mjs';
import { safeRowId, renderReview } from './intake-review.mjs';
import { carryOver, withUnappliedMarks } from './intake-review-carry.mjs';
import { rowKey } from './site-build-map.mjs';
import { loadAjv, schemaProblems } from './handoff.mjs';

const SCHEMA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'intake.schema.json' );

const FIELDS = [ 'route', 'title', 'parent', 'template', 'postType', 'collection', 'menus', 'flags', 'parts', 'draftId', 'opens', 'id' ];
// The fields a review mark may edit.
export const EDITABLE = new Set( [ 'route', 'title', 'parent', 'template', 'slug', 'postType', 'collection' ] );
const rowIdOf = ( row ) => safeRowId( `page:${ row.postType }:${ row.slug }` );

// Bean's page-map marks in an intake record, by row id: Map( rowId -> mark ).
export function pageMapMarks( intake ) {
	return new Map( ( intake?.review || [] ).filter( ( r ) => 'page-map' === r.rowType && r.mark ).map( ( r ) => [ r.rowId, r.mark ] ) );
}

// The proposed rows with the marks applied: { rows, applied, unapplied, refused, lost } where `unapplied` lists each
// mark naming a row id the proposal no longer has, `refused` each edit of a field outside EDITABLE (not applied), and
// `lost` the parts each dropped row held ( { rowId, parts } ).
export function applyMarks( proposed, marks ) {
	const seen = new Set();
	const refused = [];
	const lost = [];
	const rows = proposed.flatMap( ( row ) => {
		const id = rowIdOf( row );
		const mark = marks.get( id );
		seen.add( id );
		if ( 'drop' === mark ) {
			if ( row.parts?.length ) {
				lost.push( { rowId: id, parts: row.parts } );
			}
			return [];
		}
		const e = /^edit:([A-Za-z]+)=(.*)$/.exec( mark || '' );
		if ( ! e ) {
			return [ row ];
		}
		if ( ! EDITABLE.has( e[ 1 ] ) ) {
			refused.push( `${ id }: ${ mark }` );
			return [ row ];
		}
		const value = [ 'parent', 'template' ].includes( e[ 1 ] ) && [ '', 'null' ].includes( e[ 2 ] ) ? null : e[ 2 ];
		return [ { ...row, [ e[ 1 ] ]: value } ];
	} );
	const unapplied = [ ...marks.keys() ].filter( ( id ) => ! seen.has( id ) && 'accept' !== marks.get( id ) );
	return { rows, applied: [ ...marks.keys() ].filter( ( id ) => seen.has( id ) ).length, unapplied, refused, lost };
}

// The current rows holding a WordPress id that the new map loses (its row key gone, or the id not carried), except
// those Bean's review dropped: [ '<key> (id <n>)' ].
export function lostIds( current, rows, marks ) {
	const now = new Map( rows.map( ( r ) => [ rowKey( r ), r.id ] ) );
	return current.filter( ( r ) => null !== r.id && undefined !== r.id && now.get( rowKey( r ) ) !== r.id && 'drop' !== marks.get( rowIdOf( r ) ) )
		.map( ( r ) => `${ rowKey( r ) } (id ${ r.id })` );
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

// The saved intake record with `proposal` (the regenerated rows before marks and ids) as its page map, and its review rows
// carried over as a re-run carries them (lib/intake-review-carry.mjs): review.md's marks not yet applied first, then every
// mark whose row is unchanged. Returns { record, problems, refused } (problems: what stops it validating; refused: the
// marks that reach no row). A palette-only record, or none, is { record: null }: it holds no page map.
export function syncIntake( intake, proposal, { reviewText = null, day } = {} ) {
	if ( ! intake || intake.paletteOnly || ! Array.isArray( intake.pageMap ) ) {
		return { record: null, problems: [], refused: [] };
	}
	const previous = null === reviewText ? intake : withUnappliedMarks( intake, reviewText, day ? { day } : {} ).intake;
	const record = { ...intake, pageMap: proposal };
	const carried = carryOver( previous, record );
	record.review = carried.review;
	const ajv = loadAjv();
	const problems = [ ...schemaProblems( ajv, SCHEMA, record ).map( ( p ) => `intake.json ${ p }` ), ...pageMapProblems( record.pageMap, ajv ).map( ( p ) => `page map ${ p }` ) ];
	return { record, problems, refused: carried.refused };
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
	const marks = pageMapMarks( intake );
	const marked = applyMarks( proposal.rows, marks );
	const rows = carryIds( marked.rows, current );
	const gone = lostIds( current, rows, marks );
	if ( gone.length ) {
		say( `the regenerated map loses rows that hold a WordPress id, nothing written (mark each \`drop\` in the review to remove it):\n${ gone.map( ( g ) => `  - ${ g }` ).join( '\n' ) }` );
		return 1;
	}
	const problems = pageMapProblems( rows, loadAjv() );
	if ( problems.length ) {
		say( `the regenerated map does not validate, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	const reviewFile = path.join( path.dirname( intakeFile ), 'review.md' );
	const hasReview = fs.existsSync( reviewFile );
	const synced = syncIntake( intake, proposal.rows, { reviewText: hasReview ? fs.readFileSync( reviewFile, 'utf8' ) : null, day: hasReview ? fs.statSync( reviewFile ).mtime.toISOString().slice( 0, 10 ) : undefined } );
	if ( synced.problems.length ) {
		say( `intake.json with the regenerated page map does not validate, nothing written:\n${ synced.problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	const changes = mapChanges( current, rows );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( rows, null, 2 ) }\n` );
	if ( synced.record ) {
		fs.writeFileSync( intakeFile, `${ JSON.stringify( synced.record, null, 1 ) }\n` );
		fs.writeFileSync( reviewFile, renderReview( synced.record ) );
		say( `${ path.relative( o.repo, intakeFile ) } takes the regenerated page map (${ proposal.rows.length } proposed rows) and review.md is rendered again from it` );
		synced.refused.forEach( ( r ) => say( `review: mark NOT carried: ${ r }` ) );
	}
	say( `${ o.client }: ${ rows.length } rows (${ intake ? `${ marked.applied } review marks matched` : 'no intake record, no review marks' }); ${ changes.length } changes${ changes.length ? `:\n${ changes.map( ( c ) => `  - ${ c }` ).join( '\n' ) }` : '' }` );
	marked.unapplied.forEach( ( id ) => say( `review mark for ${ id } names no row of the new proposal (not applied)` ) );
	marked.refused.forEach( ( m ) => say( `review mark ${ m } edits a field a mark may not set (only ${ [ ...EDITABLE ].join( ', ' ) }; not applied)` ) );
	marked.lost.forEach( ( l ) => say( `dropped row ${ l.rowId } held ${ l.parts.length } part(s), now in no row: ${ l.parts.map( ( p ) => `${ p.kind } "${ p.label }"` ).join( ', ' ) }` ) );
	return 0;
}
