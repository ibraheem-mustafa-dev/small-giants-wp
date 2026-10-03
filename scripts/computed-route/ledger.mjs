#!/usr/bin/env node
// Divergence ledger command (FR-47-5).
//   node scripts/computed-route/ledger.mjs accept <report.json> <row id> --ledger <divergences.json> --scope <surface> --reason "..."
//   node scripts/computed-route/ledger.mjs stale <report.json> --ledger <divergences.json> [--tree <tree.json>]
// accept writes the entry with today's date; stale exits 1 while any entry is stale.
import fs from 'fs';
import { load, save, entryFromRow, stale, measurements } from './lib/ledger.mjs';
import { readTree, walk, refOf } from './lib/tree.mjs';

const argv = process.argv.slice( 2 );
const flag = ( name ) => {
	const i = argv.indexOf( name );
	return i === -1 ? null : argv[ i + 1 ];
};
const [ cmd, reportFile, rowId ] = argv;
const ledgerFile = flag( '--ledger' );
if ( ! [ 'accept', 'stale' ].includes( cmd ) || ! reportFile || ! ledgerFile ) {
	console.error( 'Usage: ledger.mjs accept <report.json> <row id> --ledger <file> --scope <surface> --reason "..." | stale <report.json> --ledger <file> [--tree <tree>]' );
	process.exit( 2 );
}
const report = JSON.parse( fs.readFileSync( reportFile, 'utf8' ) );
const entries = load( ledgerFile );

if ( 'accept' === cmd ) {
	const reason = flag( '--reason' );
	if ( ! reason || reason.length < 10 ) {
		console.error( 'accept needs --reason with a real reason' );
		process.exit( 2 );
	}
	const entry = entryFromRow( report, rowId, { reason, scope: flag( '--scope' ) || 'site', entries } );
	save( ledgerFile, [ ...entries, entry ] );
	console.log( `${ entry.id } added: ${ entry.node } ${ entry.property } @ ${ entry.widths.join( ',' ) } = ${ entry.expected.value }` );
} else {
	let refs = null;
	if ( flag( '--tree' ) ) {
		refs = new Set();
		walk( readTree( flag( '--tree' ) ), ( n ) => refOf( n ) && refs.add( refOf( n ) ) );
	}
	const found = stale( entries, { refs, rows: measurements( report ) } );
	found.forEach( ( s ) => console.log( `stale ${ s.id }: ${ s.why }` ) );
	console.log( `${ found.length } stale of ${ entries.length }` );
	process.exit( found.length ? 1 : 0 );
}
