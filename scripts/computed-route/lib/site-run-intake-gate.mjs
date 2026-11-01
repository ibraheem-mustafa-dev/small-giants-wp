// The site run's stage-1 gate (Spec 48 FR-48-17): a site run builds only from a stage 0 that is current and an intake
// review with every row marked, so a choice nobody confirmed (or a proposal the rules changed under a saved decision) never
// reaches a build. Pure checks; site-run.mjs::main reads the files and refuses on any problem.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { reviewRows, DEFAULTED } from './intake-review.mjs';

const FIRST = 5;

// The review rows of an intake record that carry no mark: { rowId, rowType }. A row type with a default (flag, not-a-defect)
// left blank is not one.
export function unmarkedRows( intake ) {
	const marks = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r.mark ] ) );
	return reviewRows( intake ).filter( ( r ) => ! DEFAULTED.includes( r.rowType ) && null == ( marks.get( r.rowId ) ?? null ) ).map( ( r ) => ( { rowId: r.rowId, rowType: r.rowType } ) );
}

// The sha256 of a handoff MANIFEST.json (line endings normalised to LF so a checkout's CRLF conversion does not change it), or null
// when the file is missing.
export function manifestSha256( file ) {
	return fs.existsSync( file ) ? crypto.createHash( 'sha256' ).update( fs.readFileSync( file, 'utf8' ).replace( /\r\n/g, '\n' ) ).digest( 'hex' ) : null;
}

// The problems that stop a site run, as sentences: [] when it may start. `manifestHash` is the sha256 of the current
// handoff/MANIFEST.json (null when the export has none); `baselineHash` is the `manifestSha256` that build/intake/calibration-baseline.json
// records (null when the baseline is missing or lacks the field). `baselineExists` tells those two nulls apart.
export function intakeGateProblems( { client, intake, manifestHash = null, baselineHash = null, baselineExists = false } ) {
	const out = [];
	if ( null !== manifestHash && manifestHash !== baselineHash ) {
		const why = ! baselineExists ? 'build/intake/calibration-baseline.json is missing' : null === baselineHash ? 'build/intake/calibration-baseline.json records no manifestSha256' : 'differs from the manifestSha256 in build/intake/calibration-baseline.json';
		out.push( `stage 0 is stale: sites/${ client }/handoff/MANIFEST.json ${ ! baselineExists || null === baselineHash ? 'is present but ' : '' }${ why }; run stage 0 again (node scripts/computed-route/stage0.mjs --client ${ client } --site <mirror>) and the intake after it` );
	}
	const open = unmarkedRows( intake );
	if ( open.length ) {
		out.push( `${ open.length } intake review rows have no mark (first ${ Math.min( FIRST, open.length ) }: ${ open.slice( 0, FIRST ).map( ( r ) => `${ r.rowId } [${ r.rowType }]` ).join( '; ' ) }); mark them in sites/${ client }/build/intake/review.md and run: node scripts/computed-route/intake.mjs --apply-review ${ client }` );
	}
	return out;
}

// intakeGateProblems over the client's files under `repo`.
export function intakeGateFor( repo, client, intake ) {
	const baselineFile = path.join( repo, 'sites', client, 'build', 'intake', 'calibration-baseline.json' );
	const baselineExists = fs.existsSync( baselineFile );
	let baselineHash = null;
	if ( baselineExists ) {
		try {
			const h = JSON.parse( fs.readFileSync( baselineFile, 'utf8' ) ).manifestSha256;
			baselineHash = 'string' === typeof h && h ? h : null;
		} catch {
			baselineHash = null;
		}
	}
	return intakeGateProblems( { client, intake, manifestHash: manifestSha256( path.join( repo, 'sites', client, 'handoff', 'MANIFEST.json' ) ), baselineHash, baselineExists } );
}
