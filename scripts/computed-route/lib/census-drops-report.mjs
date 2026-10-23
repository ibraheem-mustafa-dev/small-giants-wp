// The conservation drops of Fill runs as one markdown document: a status table of every run folder given, then, for the
// newest run of each client and surface that carries a read set, every dropped declared value grouped by block and property.
import fs from 'node:fs';
import path from 'node:path';
import { conservationRun, groupFailures } from './census-conservation.mjs';

const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' );
const table = ( head, rows ) => [ `| ${ head.join( ' | ' ) } |`, `|${ head.map( () => '---' ).join( '|' ) }|`, ...rows.map( ( r ) => `| ${ r.map( cell ).join( ' | ' ) } |` ), '' ];

// The status of one run folder: { dir, name, client, surface, status, reads, dropped, result }. A folder with no
// fill-report.json is `incomplete`, one with no reads.json is `no-read-set`; neither is counted clean.
export function runStatus( dir ) {
	const name = path.basename( dir );
	const reportFile = path.join( dir, 'fill-report.json' );
	if ( ! fs.existsSync( reportFile ) || ! fs.existsSync( path.join( dir, 'unmapped.json' ) ) ) {
		return { dir, name, client: null, surface: null, status: 'incomplete', reads: 0, dropped: 0, result: null };
	}
	const { client, surface } = JSON.parse( fs.readFileSync( reportFile, 'utf8' ) );
	const result = conservationRun( dir );
	return { dir, name, client, surface, status: result.status, reads: result.reads, dropped: result.failures.length, result };
}

// The newest checked run of each `client/surface` (run folder names sort by their timestamp).
export function newestChecked( runs ) {
	const by = new Map();
	for ( const r of runs.filter( ( x ) => 'checked' === x.status ).sort( ( a, b ) => a.name.localeCompare( b.name ) ) ) {
		by.set( `${ r.client }/${ r.surface }`, r );
	}
	return [ ...by.entries() ].sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) );
}

// dirs: Fill run folders; stamp: the date line. Returns the markdown.
export function dropsReport( dirs, stamp ) {
	const runs = dirs.map( runStatus );
	const L = [
		`# Fill conservation drops, ${ stamp }`, '',
		'Every property a draft declares on a paired part must end written, held or unwritten in the Fill run (`node scripts/computed-route/census.mjs <run dir> --check`, plan register R7). A row below ended in none of the three. The key is draft element, block, part, property and read width at the rest state; a write answers a read at the widths it states (a confirm record at its own width), a shorthand write answers the longhands it sets, an unwritten or held row carries no width and answers every width of its part and property, and a CSS-wide keyword read (how Chrome lists the longhands a shorthand leaves implied) is excluded and counted.', '',
		'A run folder saved before the check holds no `reads.json`, so what its draft declared is unknown: it is listed as `no-read-set`, never as clean. The read set of the newest run was saved afterwards by `node scripts/computed-route/census-reads.mjs <run dir> --allow-external`, which reads the draft again with the run\'s own skeleton, so a font or runtime that differs from the run\'s offline read can differ in a width-dependent value.', '',
		'## Run folders', '',
		...table( [ 'Run', 'Client / surface', 'Status', 'Declared reads', 'Dropped' ], runs.map( ( r ) => [ r.name, r.client ? `${ r.client } / ${ r.surface }` : '', r.status, 'checked' === r.status ? r.reads : '', 'checked' === r.status ? r.dropped : '' ] ) ),
	];
	for ( const [ key, run ] of newestChecked( runs ) ) {
		const groups = groupFailures( run.result.failures );
		L.push( `## ${ key }: ${ run.name }`, '', `${ run.dropped } of ${ run.reads } declared reads dropped (${ run.result.conserved } conserved, ${ run.result.excluded.cssWide } CSS-wide keyword reads excluded), in ${ groups.length } block and property groups.`, '' );
		for ( const block of [ ...new Set( groups.map( ( g ) => g.block ) ) ] ) {
			const mine = groups.filter( ( g ) => g.block === block );
			L.push( `### ${ block } (${ mine.reduce( ( n, g ) => n + g.count, 0 ) })`, '', ...table( [ 'Property', 'Draft id', 'Node', 'Part', 'Width', 'Declared' ], mine.flatMap( ( g ) => g.rows.map( ( f ) => [ f.property, f.draft, f.node, f.slot || '(root)', f.width, f.value ] ) ) ) );
		}
	}
	return L.join( '\n' );
}
