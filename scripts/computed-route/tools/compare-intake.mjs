#!/usr/bin/env node
// Compares two intake runs of one export (Spec 48 FR-48-28: identical input gives identical output), for proving a
// speed change byte-identical against its reference run (INTAKE_POOL=1 INTAKE_SKIP_QUIET=0).
//   node scripts/computed-route/tools/compare-intake.mjs <a/intake.json> <b/intake.json> [<a/review.md> <b/review.md>]
// Each intake.json is compared with exactly these fields removed, none of which is content the run read:
//   - takenOn: the wall-clock instant the run wrote the record;
//   - review[].carriedFrom: the previous record's takenOn, copied onto a mark carried over from it.
// Each review.md is compared with the record's takenOn in its "Taken on <instant>;" line replaced by a placeholder.
// Prints the sha256 of each normalised file and the first differing path; exit 0 identical, 1 different, 2 usage.
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { pathToFileURL } from 'url';

export const EXCLUDED = [ 'takenOn', 'review[].carriedFrom' ];

// The record without the excluded fields, serialised as intake.mjs writes it.
export function normaliseIntake( record ) {
	const { takenOn, review, ...rest } = record;
	void takenOn;
	const out = { ...rest };
	if ( Array.isArray( review ) ) {
		out.review = review.map( ( { carriedFrom, ...r } ) => ( void carriedFrom, r ) );
	}
	return `${ JSON.stringify( out, null, 1 ) }\n`;
}

// review.md with the record's takenOn replaced in its "Taken on" line.
export const normaliseReview = ( md, takenOn ) => md.replace( `Taken on ${ takenOn };`, 'Taken on <takenOn>;' );

// The first path at which two JSON values differ, or null.
export function firstDifference( a, b, at = '$' ) {
	if ( Object.is( a, b ) ) {
		return null;
	}
	if ( typeof a !== typeof b || null === a || null === b || 'object' !== typeof a || Array.isArray( a ) !== Array.isArray( b ) ) {
		return at;
	}
	if ( Array.isArray( a ) ) {
		for ( let i = 0; i < Math.max( a.length, b.length ); i++ ) {
			const d = firstDifference( a[ i ], b[ i ], `${ at }[${ i }]` );
			if ( d ) {
				return d;
			}
		}
		return null;
	}
	for ( const k of [ ...new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] ) ] ) {
		const d = firstDifference( a[ k ], b[ k ], `${ at }.${ k }` );
		if ( d ) {
			return d;
		}
	}
	const ka = Object.keys( a ).join( '\u0000' );
	return ka === Object.keys( b ).join( '\u0000' ) ? null : `${ at } (key order)`;
}

const sha = ( s ) => crypto.createHash( 'sha256' ).update( s ).digest( 'hex' );

// { same, lines: [ report lines ] } for two intake.json files and, optionally, their review.md files.
export function compareIntake( [ ia, ib, ra, rb ] ) {
	const A = JSON.parse( fs.readFileSync( ia, 'utf8' ) );
	const B = JSON.parse( fs.readFileSync( ib, 'utf8' ) );
	const na = normaliseIntake( A );
	const nb = normaliseIntake( B );
	const lines = [ `excluded fields: ${ EXCLUDED.join( ', ' ) }`, `intake.json a ${ sha( na ) }`, `intake.json b ${ sha( nb ) }` ];
	let same = na === nb;
	if ( ! same ) {
		lines.push( `intake.json differs first at ${ firstDifference( JSON.parse( na ), JSON.parse( nb ) ) ?? '(serialisation only)' }` );
	}
	if ( ra && rb ) {
		const ma = normaliseReview( fs.readFileSync( ra, 'utf8' ), A.takenOn );
		const mb = normaliseReview( fs.readFileSync( rb, 'utf8' ), B.takenOn );
		lines.push( `review.md a ${ sha( ma ) }`, `review.md b ${ sha( mb ) }` );
		if ( ma !== mb ) {
			same = false;
			const la = ma.split( '\n' );
			const lb = mb.split( '\n' );
			const i = la.findIndex( ( l, k ) => l !== lb[ k ] );
			lines.push( `review.md differs first at line ${ ( i < 0 ? la.length : i ) + 1 }` );
		}
	}
	lines.push( same ? 'IDENTICAL' : 'DIFFERENT' );
	return { same, lines };
}

const isMain = Boolean( process.argv[ 1 ] ) && pathToFileURL( path.resolve( process.argv[ 1 ] ) ).href === import.meta.url;
if ( isMain ) {
	const args = process.argv.slice( 2 );
	if ( ! [ 2, 4 ].includes( args.length ) ) {
		process.stderr.write( 'usage: compare-intake.mjs <a/intake.json> <b/intake.json> [<a/review.md> <b/review.md>]\n' );
		process.exit( 2 );
	}
	const r = compareIntake( args );
	process.stdout.write( `${ r.lines.join( '\n' ) }\n` );
	process.exit( r.same ? 0 : 1 );
}
