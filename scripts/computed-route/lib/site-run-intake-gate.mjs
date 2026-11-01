// The site run's stage-1 gate (Spec 48 FR-48-17): a site run builds only from a stage 0 that is current and an intake
// review with every row marked, so a choice nobody confirmed (or a proposal the rules changed under a saved decision) never
// reaches a build. Pure checks; site-run.mjs::main reads the files and refuses on any problem.

import fs from 'fs';
import path from 'path';
import { reviewRows, DEFAULTED } from './intake-review.mjs';

const FIRST = 5;

// The review rows of an intake record that carry no mark: { rowId, rowType }. A row type with a default (flag, not-a-defect)
// left blank is not one.
export function unmarkedRows( intake ) {
	const marks = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r.mark ] ) );
	return reviewRows( intake ).filter( ( r ) => ! DEFAULTED.includes( r.rowType ) && null == ( marks.get( r.rowId ) ?? null ) ).map( ( r ) => ( { rowId: r.rowId, rowType: r.rowType } ) );
}

// The problems that stop a site run, as sentences: [] when it may start. `manifestMs` and `baselineMs` are the modified
// times (ms) of handoff/MANIFEST.json and build/intake/calibration-baseline.json, null for a file that is missing.
export function intakeGateProblems( { client, intake, manifestMs = null, baselineMs = null } ) {
	const out = [];
	if ( null !== manifestMs && ( null === baselineMs || manifestMs > baselineMs ) ) {
		out.push( `stage 0 is stale: sites/${ client }/handoff/MANIFEST.json is ${ null === baselineMs ? 'present but build/intake/calibration-baseline.json is missing' : 'newer than build/intake/calibration-baseline.json' }; run stage 0 again (scripts/computed-route/stage0.mjs ${ client }) and the intake after it` );
	}
	const open = unmarkedRows( intake );
	if ( open.length ) {
		out.push( `${ open.length } intake review rows have no mark (first ${ Math.min( FIRST, open.length ) }: ${ open.slice( 0, FIRST ).map( ( r ) => `${ r.rowId } [${ r.rowType }]` ).join( '; ' ) }); mark them in sites/${ client }/build/intake/review.md and run: node scripts/computed-route/intake.mjs --apply-review ${ client }` );
	}
	return out;
}

// intakeGateProblems over the client's files under `repo`.
export function intakeGateFor( repo, client, intake ) {
	const mtime = ( file ) => ( fs.existsSync( file ) ? fs.statSync( file ).mtimeMs : null );
	return intakeGateProblems( { client, intake, manifestMs: mtime( path.join( repo, 'sites', client, 'handoff', 'MANIFEST.json' ) ), baselineMs: mtime( path.join( repo, 'sites', client, 'build', 'intake', 'calibration-baseline.json' ) ) } );
}
