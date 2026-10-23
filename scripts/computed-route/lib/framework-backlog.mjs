// The cross-client framework backlog (Spec 48 FR-48-68): every F-class row of every client's gaps.json, merged into one
// file, .claude/reports/framework-backlog.json. A row is keyed by block, attribute and property, so the same gap seen on
// two clients is one row listing both, each with its surface, widths, state and gate evidence (carried through unchanged).
// The merger only adds and refreshes: a row closes through lib/backlog-recheck.mjs and then stays closed with its
// closing commit. A gaps.json row that is not a well-formed F-class row is refused and counted, never dropped silently.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OWNERS } from './gaps-file.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
export const BACKLOG_FILE = path.join( REPO, '.claude', 'reports', 'framework-backlog.json' );
export const SITES_DIR = path.join( REPO, 'sites' );

const text = ( v ) => 'string' === typeof v && '' !== v.trim();
const byText = ( a, b ) => ( a < b ? -1 : ( a > b ? 1 : 0 ) );

// The row a gap is filed under: its block, attribute (empty when the gap names none) and property.
export const backlogKey = ( r ) => `${ r.block }|${ r.attribute ?? '' }|${ r.property }`;

// The rows of one gaps.json; throws, naming the file, when it cannot be read or holds no rows array.
export function readGapsFile( file ) {
	let parsed;
	try {
		parsed = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `${ file } cannot be read: ${ String( e.message || e ).slice( 0, 120 ) }` );
	}
	if ( ! Array.isArray( parsed?.rows ) ) {
		throw new Error( `${ file } has no rows array` );
	}
	return parsed.rows;
}

// Every client's gaps.json under a sites folder: [ { client, file } ] sorted by client.
export function findGapsFiles( sitesDir ) {
	if ( ! fs.existsSync( sitesDir ) ) {
		throw new Error( `the sites folder ${ sitesDir } does not exist` );
	}
	return fs.readdirSync( sitesDir, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() )
		.map( ( d ) => ( { client: d.name, file: path.join( sitesDir, d.name, 'build', 'qa', 'gaps.json' ) } ) )
		.filter( ( f ) => fs.existsSync( f.file ) ).sort( ( a, b ) => byText( a.client, b.client ) );
}

// The backlog file; an empty backlog when there is none yet, a throw when it is not one.
export function readBacklog( file ) {
	if ( ! fs.existsSync( file ) ) {
		return { rows: [] };
	}
	let parsed;
	try {
		parsed = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `${ file } cannot be read: ${ String( e.message || e ).slice( 0, 120 ) }` );
	}
	if ( ! Array.isArray( parsed?.rows ) ) {
		throw new Error( `${ file } has no rows array` );
	}
	return parsed;
}

export function writeBacklog( file, backlog ) {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( backlog, null, 1 ) }\n` );
}

// Why a gaps.json row is not merged, or null when it is a well-formed F-class row: { kind: 'malformed' | 'non-F' | 'unkeyed', reason }.
function refusal( r ) {
	if ( ! r || 'object' !== typeof r || Array.isArray( r ) ) {
		return { kind: 'malformed', reason: 'the row is not an object' };
	}
	if ( ! text( r.id ) ) {
		return { kind: 'malformed', reason: 'the row has no id' };
	}
	if ( ! text( r.class ) || ! OWNERS[ r.class ] ) {
		return { kind: 'malformed', reason: `class ${ JSON.stringify( r.class ?? null ) } is not one of FR-48-65's` };
	}
	const isF = r.class.startsWith( 'F-' );
	if ( r.framework !== isF ) {
		return { kind: 'malformed', reason: `class ${ r.class } disagrees with its framework flag (${ JSON.stringify( r.framework ?? null ) })` };
	}
	if ( ! isF ) {
		return { kind: 'non-F', reason: 'non-F' };
	}
	if ( ! text( r.block ) || ! text( r.property ) ) {
		return { kind: 'unkeyed', reason: `an F-class row must name its block and property to be keyed (block ${ JSON.stringify( r.block ?? null ) }, property ${ JSON.stringify( r.property ?? null ) })` };
	}
	return null;
}

const entryOf = ( client, r, prior, mergedOn ) => ( {
	client, surface: r.surface ?? null, id: r.id, class: r.class, draftId: r.draftId ?? null, widths: r.widths ?? [], state: r.state ?? null, declared: r.declared ?? null,
	renderedDraft: r.renderedDraft ?? null, renderedLive: r.renderedLive ?? null, gates: r.gates ?? [], firstSeen: prior?.firstSeen ?? r.firstSeen ?? r.publishedOn ?? mergedOn,
	publishedOn: r.publishedOn ?? mergedOn,
} );

// Merges the sources ([ { client, file, rows } ]) into the backlog ({ rows }); returns { backlog, stats }, the input backlog untouched.
// A closed row is kept exactly as it is. An entry a source no longer publishes stays (only the re-check closes a row) and is counted.
export function mergeBacklog( { backlog, sources, mergedOn } ) {
	const rows = new Map( structuredClone( backlog.rows ).map( ( r ) => [ r.key, r ] ) );
	const stats = {
		clients: sources.map( ( s ) => s.client ).sort( byText ), rowsRead: 0, merged: 0, newRows: 0, updatedRows: 0, crossClientRows: 0, refusedNonF: 0, refusedMalformed: 0,
		refusedUnkeyed: 0, refused: [], keptClosed: 0, closedSeenAgain: [], unpublishedEntries: 0,
	};
	const touched = new Set();
	const created = new Set();
	const seen = new Set();
	for ( const { client, rows: gaps } of sources ) {
		for ( const g of gaps ) {
			stats.rowsRead++;
			const no = refusal( g );
			if ( no ) {
				stats[ { malformed: 'refusedMalformed', 'non-F': 'refusedNonF', unkeyed: 'refusedUnkeyed' }[ no.kind ] ]++;
				stats.refused.push( { client, id: g && 'object' === typeof g ? g.id ?? null : null, reason: no.reason } );
				continue;
			}
			stats.merged++;
			const key = backlogKey( g );
			let row = rows.get( key );
			if ( row?.status === 'closed' ) {
				stats.closedSeenAgain.includes( key ) || stats.closedSeenAgain.push( key );
				continue;
			}
			if ( ! row ) {
				row = { key, block: g.block, attribute: g.attribute ?? null, property: g.property, status: 'open', firstSeen: null, lastSeen: mergedOn, classes: [], clients: [], entries: [], lastRecheck: null, closed: null };
				rows.set( key, row );
				created.add( key );
			}
			const at = row.entries.findIndex( ( e ) => e.client === client && e.id === g.id );
			const entry = entryOf( client, g, row.entries[ at ], mergedOn );
			at < 0 ? row.entries.push( entry ) : ( row.entries[ at ] = entry );
			touched.add( key );
			seen.add( `${ key }\u0000${ client }\u0000${ g.id }` );
		}
	}
	for ( const key of touched ) {
		const row = rows.get( key );
		row.lastSeen = mergedOn;
		row.entries.sort( ( a, b ) => byText( a.client, b.client ) || byText( a.id, b.id ) );
		row.classes = [ ...new Set( row.entries.map( ( e ) => e.class ) ) ].sort( byText );
		row.clients = [ ...new Set( row.entries.map( ( e ) => e.client ) ) ].sort( byText );
		row.firstSeen ??= row.entries.map( ( e ) => e.firstSeen ).sort( byText )[ 0 ];
	}
	const read = new Set( stats.clients );
	for ( const row of rows.values() ) {
		'open' === row.status && ( stats.unpublishedEntries += row.entries.filter( ( e ) => read.has( e.client ) && ! seen.has( `${ row.key }\u0000${ e.client }\u0000${ e.id }` ) ).length );
	}
	stats.newRows = created.size;
	stats.updatedRows = touched.size - created.size;
	stats.keptClosed = stats.closedSeenAgain.length;
	const out = [ ...rows.values() ].sort( ( a, b ) => byText( a.key, b.key ) );
	stats.crossClientRows = out.filter( ( r ) => r.clients.length > 1 ).length;
	return { backlog: { rows: out }, stats };
}
