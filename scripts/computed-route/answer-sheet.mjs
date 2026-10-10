#!/usr/bin/env node
// Answer-sheet scorer (Spec 47 route-accuracy R1).
//   node scripts/computed-route/answer-sheet.mjs --client <slug> --surface <s>[,<s>...] [--report <round report.json>]
//     [--triage <triage.json>] [--solve <solve-report.json>] [--sheet <answer-sheet.json>] [--baseline <file>]
//     [--write-baseline] [--detail]
// Defaults: the sheet is `sites/<client>/build/qa/answer-sheet.json`; the triage is `qa/triage/<surface>.json`, and the
// walk and solve report are the ones that triage names (`walk`, `report`). The baseline is
// `qa/answer-sheet-baseline.json`: the ids that passed when it was written. Prints, per surface, each label's pass count
// (false alarms per pattern) and the rows that fail. Exits 1 when a row that passed in the baseline fails now (a
// regression); rows that never passed are listed as known misses. `--write-baseline` records the current passes.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scoreSurface, baselineOf, regressions } from './lib/answer-sheet.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

function args( argv ) {
	const out = {};
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a.startsWith( '--' ) ) {
			const next = argv[ i + 1 ];
			out[ a.slice( 2 ) ] = next && ! next.startsWith( '--' ) ? argv[ ++i ] : true;
		}
	}
	return out;
}

const readJson = ( f ) => JSON.parse( fs.readFileSync( path.resolve( REPO, f ), 'utf8' ) );
const maybe = ( f ) => ( f && fs.existsSync( path.resolve( REPO, f ) ) ? readJson( f ) : null );

function runFor( qa, surface, a, single ) {
	const triageFile = ( single && a.triage ) || path.posix.join( qa, 'triage', `${ surface }.json` );
	const triage = maybe( triageFile );
	const reportFile = ( single && a.report ) || triage?.walk;
	const solveFile = ( single && a.solve ) || triage?.report;
	if ( triage && single && a.report && triage.walk && path.resolve( REPO, triage.walk ) !== path.resolve( REPO, a.report ) ) {
		console.warn( `note: ${ triageFile } was made from ${ triage.walk }, not ${ a.report }; its labels may not fit this walk` );
	}
	return { files: { report: reportFile ?? null, triage: triage ? triageFile : null, solve: solveFile ?? null }, report: maybe( reportFile ), triage, solve: maybe( solveFile ) };
}

function main() {
	const a = args( process.argv.slice( 2 ) );
	if ( ! a.client || ! a.surface ) {
		console.error( 'usage: answer-sheet.mjs --client <slug> --surface <s>[,<s>...] [--report f] [--triage f] [--solve f] [--sheet f] [--baseline f] [--write-baseline] [--detail]' );
		process.exit( 2 );
	}
	const qa = path.posix.join( 'sites', a.client, 'build', 'qa' );
	const sheet = readJson( a.sheet || path.posix.join( qa, 'answer-sheet.json' ) );
	const baselineFile = path.resolve( REPO, a.baseline || path.posix.join( qa, 'answer-sheet-baseline.json' ) );
	const baseline = fs.existsSync( baselineFile ) ? JSON.parse( fs.readFileSync( baselineFile, 'utf8' ) ) : {};
	const surfaces = String( a.surface ).split( ',' );
	let failed = 0;
	for ( const surface of surfaces ) {
		const run = runFor( qa, surface, a, 1 === surfaces.length );
		const score = scoreSurface( sheet, surface, run );
		console.log( `\n== ${ surface }  walk ${ run.files.report ?? '-' }\n   triage ${ run.files.triage ?? '-' }  solve ${ run.files.solve ?? '-' }` );
		for ( const [ k, t ] of Object.entries( score.tally ).sort() ) {
			const why = Object.entries( t.outcomes ).map( ( [ o, n ] ) => `${ o } ${ n }` ).join( ', ' );
			console.log( `   ${ k.padEnd( 18 ) } pass ${ t.pass }/${ t.pass + t.fail }${ t.notScored ? `  (not scored ${ t.notScored })` : '' }  [${ why }]` );
		}
		const lost = regressions( score, baseline[ surface ] );
		const misses = score.rows.filter( ( r ) => false === r.pass && ! lost.includes( r ) );
		for ( const r of lost ) {
			console.log( `   REGRESSION ${ r.id } (${ r.label }) now ${ r.outcome }` );
		}
		if ( a.detail ) {
			for ( const r of misses ) {
				console.log( `   known miss ${ r.id } (${ r.label }${ r.pattern ? ` p${ r.pattern }` : '' }) ${ r.outcome }` );
			}
		} else if ( misses.length ) {
			console.log( `   known misses ${ misses.length } (--detail lists them)` );
		}
		failed += lost.length;
		if ( a[ 'write-baseline' ] ) {
			baseline[ surface ] = { ...run.files, ...baselineOf( score ) };
		}
	}
	if ( a[ 'write-baseline' ] ) {
		fs.writeFileSync( baselineFile, JSON.stringify( baseline, null, '\t' ) + '\n' );
		console.log( `\nbaseline written: ${ path.relative( REPO, baselineFile ).split( path.sep ).join( '/' ) }` );
	}
	if ( failed ) {
		console.log( `\nFAIL: ${ failed } row(s) passed in the baseline and fail now` );
		process.exit( 1 );
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main();
}
