#!/usr/bin/env node
// Static check of every mutation list under tests/ (lib/mutation-lists.mjs): each entry's find must occur exactly once in
// its target file, or tools/mutate.mjs skips it and leaves its test unproven.
//   node scripts/computed-route/tools/check-mutation-lists.mjs [--write-baseline]
// Prints each stale entry, marked `known` when data/mutation-list-stale-baseline.json names it and `NEW` when not, then each
// baseline entry that is no longer stale. Exit 0 when nothing is NEW and no baseline entry is fixed, 1 otherwise.
// --write-baseline rewrites the baseline to today's stale entries (for removing fixed lines after a sweep; never to hide a
// NEW one: re-aim it at the current code instead).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineOf, checkMutationLists, compareBaseline, problemLine } from '../lib/mutation-lists.mjs';

const ROUTE = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const BASELINE = join( ROUTE, 'data', 'mutation-list-stale-baseline.json' );

const { lists, problems } = checkMutationLists( ROUTE );
if ( process.argv.includes( '--write-baseline' ) ) {
	writeFileSync( BASELINE, `${ JSON.stringify( baselineOf( problems ), null, '\t' ) }\n` );
	console.log( `baseline written: ${ problems.length } stale entries in ${ new Set( problems.map( ( x ) => x.list ) ).size } of ${ lists.length } lists` );
	process.exit( 0 );
}
const baseline = JSON.parse( readFileSync( BASELINE, 'utf8' ) );
const { fresh, fixed } = compareBaseline( problems, baseline );
const isFresh = new Set( fresh );
problems.forEach( ( x ) => console.log( `${ isFresh.has( x ) ? 'NEW  ' : 'known' } ${ problemLine( x ) }` ) );
fixed.forEach( ( x ) => console.log( `FIXED ${ x.list }: "${ x.find.slice( 0, 80 ) }" is no longer stale; remove it from the baseline` ) );
console.log( `${ lists.length } lists, ${ problems.length } stale entries (${ fresh.length } new), ${ fixed.length } baseline entries fixed` );
process.exit( fresh.length || fixed.length ? 1 : 0 );
