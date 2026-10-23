// Solve's crash report (Spec 48 FR-48-5): a write-ahead record of every setting written since the last judged walk. It is
// written before the tree file is saved and cleared once a walk has judged those writes, so a run that stops early for any
// reason (a thrown error, a host failure, a time-out, a killed process) leaves it naming exactly the writes no walk judged.
// The next run reads it first, measures the tree that holds those writes, and lets the guard judge them against the walk
// they were computed from before it writes anything else (solve.mjs::solveLoop's `resume`).
import fs from 'fs';
import path from 'path';

// One journal per surface, outside any run folder, so the next run finds it.
export const journalFile = ( buildDir, surface ) => path.join( buildDir, 'qa', 'solve', surface, 'unjudged.json' );

// The fields a later guard needs from a write (lib/guard.mjs reads ref, block, attr, prop, before, after, group, rows).
const slimWrite = ( w ) => ( { round: w.round, group: w.group, ref: w.ref, block: w.block, path: w.path, prop: w.prop, state: w.state ?? null, attr: w.attr, before: w.before ?? null, after: w.after ?? null, rows: w.rows || [], unjudged: true, ...( w.trial ? { trial: true } : {} ), ...( w.reverted ? { reverted: true } : {} ) } );

// Records the unjudged writes (an empty list clears the record). base: the walker report file the writes were computed
// from (the guard's baseline); stopped: why the run ended early, when it did. Written whole, synchronously.
export function writeJournal( file, { surface, runDir = null, round, base = null, writes, stopped = null } ) {
	if ( ! writes.length && ! stopped ) {
		clearJournal( file );
		return null;
	}
	const record = { surface, runDir, round, base, at: new Date().toISOString(), stopped, writes: writes.map( slimWrite ) };
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	const tmp = `${ file }.tmp`;
	fs.writeFileSync( tmp, `${ JSON.stringify( record, null, 2 ) }\n` );
	fs.renameSync( tmp, file );
	return record;
}

// Adds the reason a run stopped to the standing record (a run with no unjudged writes leaves none).
export function markStopped( file, stopped ) {
	const record = readJournal( file );
	return record ? writeJournal( file, { ...record, stopped } ) : null;
}

export function clearJournal( file ) {
	fs.rmSync( file, { force: true } );
}

// The standing record, or null.
export function readJournal( file ) {
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
}

// What the next run resumes from: { prev: the base report, lastWrites, note } or null when there is no record. A record
// whose base report is gone cannot be judged by the guard; its writes are returned with no base and the note says so.
export function resumeFrom( record ) {
	if ( ! record?.writes?.length ) {
		return null;
	}
	const prev = record.base && fs.existsSync( record.base ) ? JSON.parse( fs.readFileSync( record.base, 'utf8' ) ) : null;
	const settings = new Set( record.writes.map( ( w ) => `${ w.ref }|${ w.attr }` ) ).size;
	const why = record.stopped ? ` (stopped: ${ record.stopped })` : '';
	return { prev, lastWrites: record.writes, note: prev
		? `the last run left ${ settings } unjudged setting(s) from round ${ record.round }${ why }: the first walk judges them before any write`
		: `the last run left ${ settings } unjudged setting(s)${ why }, but its base report ${ record.base || '(none)' } is gone, so the guard cannot judge them` };
}
