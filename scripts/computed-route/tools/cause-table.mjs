// The cause table: turns the cross-client census JSON (census-all.mjs --json --out <file>.json) into two CSVs for the dashboard.
//   node tools/cause-table.mjs <census.json> --out <dir> [--top 12]
// cause-classes.csv: class, meaning, owner, one column per client (the census's own client list), total. One row per FR-48-65 class.
// cause-mechanisms.csv: each class's largest signatures: class, block, property, state, tier, reason, owner_fr, one column per client, total, example.
// Meanings and owners come from data/census-classes.json `classes`. The census gives a group's rows per client and per class, not per
// client within a class, so a group spanning several classes is split by class share (apportion): whole numbers, the group's client
// totals and class totals both kept exactly, so every class total reconciles with the census. Exit 0, 1 when the totals do not reconcile, 2 usage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const CLASSES_FILE = path.join( HERE, '..', 'data', 'census-classes.json' );
export const TOP = 12;

// One CSV cell: quoted when it holds a comma, a quote or a line break, with quotes doubled.
export function csvCell( value ) {
	const text = String( value ?? '' );
	return /[",\r\n]/.test( text ) ? `"${ text.replace( /"/g, '""' ) }"` : text;
}

export const csvLine = ( cells ) => cells.map( csvCell ).join( ',' );

// Splits a group's rows into whole numbers per [class][client] whose row sums are the class counts and column sums the client
// counts: the proportional share, floored, then the leftover units go to the largest fractions where both margins still have room.
export function apportion( classCounts, clientCounts ) {
	const classes = Object.keys( classCounts );
	const clients = Object.keys( clientCounts );
	const total = classes.reduce( ( n, c ) => n + classCounts[ c ], 0 );
	const clientTotal = clients.reduce( ( n, k ) => n + clientCounts[ k ], 0 );
	if ( total !== clientTotal ) {
		throw new Error( `a group has ${ total } rows by class and ${ clientTotal } by client` );
	}
	const cells = classes.map( () => clients.map( () => 0 ) );
	const rowLeft = classes.map( ( c ) => classCounts[ c ] );
	const colLeft = clients.map( ( k ) => clientCounts[ k ] );
	const order = [];
	classes.forEach( ( c, i ) => clients.forEach( ( k, j ) => {
		const exact = ( classCounts[ c ] * clientCounts[ k ] ) / total;
		cells[ i ][ j ] = Math.floor( exact );
		rowLeft[ i ] -= cells[ i ][ j ];
		colLeft[ j ] -= cells[ i ][ j ];
		order.push( { i, j, frac: exact - Math.floor( exact ) } );
	} ) );
	order.sort( ( a, b ) => b.frac - a.frac || a.i - b.i || a.j - b.j );
	while ( rowLeft.some( ( n ) => n > 0 ) ) {
		for ( const { i, j } of order ) {
			if ( rowLeft[ i ] > 0 && colLeft[ j ] > 0 ) {
				cells[ i ][ j ]++;
				rowLeft[ i ]--;
				colLeft[ j ]--;
			}
		}
	}
	return Object.fromEntries( classes.map( ( c, i ) => [ c, Object.fromEntries( clients.map( ( k, j ) => [ k, cells[ i ][ j ] ] ).filter( ( [ , n ] ) => n > 0 ) ) ] ) );
}

const exampleOf = ( e ) => ( e ? `${ e.client } ${ e.surface } ${ e.element }: ${ e.draft } → ${ e.live }`.replace( /\s+/g, ' ' ) : '' );
const sum = ( o ) => Object.values( o ).reduce( ( a, b ) => a + b, 0 );

// Reads the census and the class table into { clients, classRows, mechanismRows, reconcile }; throws on a class the table does not
// name or a client the census list lacks.
export function buildTables( census, classTable, { top = TOP } = {} ) {
	const clients = census.clients;
	const emitted = new Set( [ ...Object.keys( census.classes.counts ), ...census.groups.flatMap( ( g ) => Object.keys( g.classes ) ), ...census.unclassified.map( ( r ) => r.gapClass ) ] );
	for ( const c of emitted ) {
		if ( ! classTable[ c ] ) {
			throw new Error( `the census emits class ${ c }, which data/census-classes.json "classes" does not name` );
		}
	}
	const perClass = Object.fromEntries( Object.keys( classTable ).map( ( c ) => [ c, { byClient: Object.fromEntries( clients.map( ( k ) => [ k, 0 ] ) ), signatures: [] } ] ) );
	const add = ( c, client, n ) => {
		if ( ! ( client in perClass[ c ].byClient ) ) {
			throw new Error( `client ${ client } is not in the census client list` );
		}
		perClass[ c ].byClient[ client ] += n;
	};
	for ( const g of census.groups ) {
		const split = apportion( g.classes, g.byClient );
		for ( const [ c, byClient ] of Object.entries( split ) ) {
			Object.entries( byClient ).forEach( ( [ client, n ] ) => add( c, client, n ) );
			perClass[ c ].signatures.push( { group: g, byClient, total: sum( byClient ) } );
		}
	}
	for ( const r of census.unclassified ) {
		add( r.gapClass, r.client, 1 );
	}
	const classRows = Object.entries( classTable ).map( ( [ c, def ] ) => ( { class: c, meaning: def.meaning, owner: def.owner, byClient: perClass[ c ].byClient, total: sum( perClass[ c ].byClient ) } ) );
	const mechanismRows = Object.keys( classTable ).flatMap( ( c ) => perClass[ c ].signatures
		.sort( ( a, b ) => b.total - a.total || a.group.signature.localeCompare( b.group.signature ) )
		.slice( 0, top )
		.map( ( s ) => ( { class: c, ...Object.fromEntries( [ 'block', 'property', 'state', 'tier', 'reason' ].map( ( p ) => [ p, s.group.parts[ p ] ] ) ), owner_fr: s.group.owner ?? '', byClient: Object.fromEntries( clients.map( ( k ) => [ k, s.byClient[ k ] ?? 0 ] ) ), total: s.total, example: exampleOf( s.group.examples?.[ 0 ] ) } ) ) );
	return { clients, classRows, mechanismRows, reconcile: classRows.map( ( r ) => ( { class: r.class, table: r.total, census: census.classes.counts[ r.class ] ?? 0 } ) ) };
}

export function classesCsv( { clients, classRows } ) {
	return [ csvLine( [ 'class', 'meaning', 'owner', ...clients, 'total' ] ), ...classRows.map( ( r ) => csvLine( [ r.class, r.meaning, r.owner, ...clients.map( ( k ) => r.byClient[ k ] ), r.total ] ) ) ].join( '\n' ) + '\n';
}

export function mechanismsCsv( { clients, mechanismRows } ) {
	return [ csvLine( [ 'class', 'block', 'property', 'state', 'tier', 'reason', 'owner_fr', ...clients, 'total', 'example' ] ), ...mechanismRows.map( ( r ) => csvLine( [ r.class, r.block, r.property, r.state, r.tier, r.reason, r.owner_fr, ...clients.map( ( k ) => r.byClient[ k ] ), r.total, r.example ] ) ) ].join( '\n' ) + '\n';
}

// Reads the census file, writes both CSVs into `out` and returns the tables; throws when a class total differs from the census's.
export function causeTable( censusFile, out, { top = TOP, classesFile = CLASSES_FILE } = {} ) {
	const census = JSON.parse( fs.readFileSync( censusFile, 'utf8' ) );
	const tables = buildTables( census, JSON.parse( fs.readFileSync( classesFile, 'utf8' ) ).classes, { top } );
	const bad = tables.reconcile.filter( ( r ) => r.table !== r.census );
	if ( bad.length ) {
		throw new Error( `class totals do not reconcile with the census: ${ bad.map( ( r ) => `${ r.class } ${ r.table } vs ${ r.census }` ).join( ', ' ) }` );
	}
	fs.mkdirSync( out, { recursive: true } );
	fs.writeFileSync( path.join( out, 'cause-classes.csv' ), classesCsv( tables ) );
	fs.writeFileSync( path.join( out, 'cause-mechanisms.csv' ), mechanismsCsv( tables ) );
	return tables;
}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {
	const args = process.argv.slice( 2 );
	const flag = ( n ) => ( args.includes( n ) ? args[ args.indexOf( n ) + 1 ] : null );
	const file = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! [ '--out', '--top' ].includes( args[ i - 1 ] ) );
	if ( ! file || ! flag( '--out' ) || args.some( ( a ) => a.startsWith( '--' ) && ! [ '--out', '--top' ].includes( a ) ) ) {
		console.error( 'usage: node tools/cause-table.mjs <census.json> --out <dir> [--top 12]' );
		process.exit( 2 );
	}
	try {
		const t = causeTable( file, path.resolve( flag( '--out' ) ), { top: Number( flag( '--top' ) ?? TOP ) } );
		console.log( `${ t.classRows.length } classes, ${ t.mechanismRows.length } mechanism rows, ${ t.reconcile.reduce( ( n, r ) => n + r.table, 0 ) } census rows` );
	} catch ( e ) {
		console.error( e.message );
		process.exit( 1 );
	}
}
