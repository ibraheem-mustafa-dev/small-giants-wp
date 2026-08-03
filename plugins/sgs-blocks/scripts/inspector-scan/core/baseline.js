'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.7
// source=spec evidence=hybrid baseline shape (keyed identity + mandatory human
// reason) is the design's explicit synthesis of the two shapes found in the
// existing enforcers (check-dead-controls.js keyed-list vs
// audit-inspector-conformance.js nested-reason-map).

const fs = require( 'fs' );
const path = require( 'path' );

const BASELINE_DIR = path.resolve( __dirname, '..', 'baselines' );

// Matches check-control-ux.js's auto-generated seed template shape (and close
// variants) — a reason that is just a restatement of "this was seeded" is not
// a reason (hazard H9).
const SEED_TEMPLATE_RE = /^seeded on \d{4}-\d{2}-\d{2}\.?$/i;
const MIN_REASON_LENGTH = 12;

function baselinePath( ruleId, opts = {} ) {
	const dir = opts.baselineDir || BASELINE_DIR;
	return path.join( dir, `${ ruleId }.json` );
}

function loadBaseline( ruleId, opts = {} ) {
	const p = baselinePath( ruleId, opts );
	if ( ! fs.existsSync( p ) ) {
		return { _meta: { rule: ruleId, ruleVersion: 1 }, entries: [] };
	}
	let raw;
	try {
		raw = fs.readFileSync( p, 'utf8' );
	} catch ( e ) {
		throw new Error(
			`[inspector-scan] baseline file unreadable for rule "${ ruleId }": ${ p } (${ e.message })`
		);
	}
	let parsed;
	try {
		parsed = JSON.parse( raw );
	} catch ( e ) {
		// Malformed is NOT absent (H2). A corrupted baseline must never silently
		// degrade to "no exceptions" — that would un-suppress everything at best
		// and, worse, mask the corruption itself.
		throw new Error(
			`[inspector-scan] baseline file for rule "${ ruleId }" is MALFORMED: ${ p } (${ e.message }). ` +
				'Fix or explicitly delete it — do not let a parse failure degrade silently to an empty baseline.'
		);
	}
	if ( ! parsed || ! Array.isArray( parsed.entries ) ) {
		throw new Error(
			`[inspector-scan] baseline file for rule "${ ruleId }" has no 'entries' array: ${ p }`
		);
	}
	return parsed;
}

function hasRealReason( reason ) {
	const trimmed = ( reason || '' ).trim();
	if ( trimmed.length < MIN_REASON_LENGTH ) return false;
	if ( SEED_TEMPLATE_RE.test( trimmed ) ) return false;
	return true;
}

/**
 * Applies a rule's baseline to its findings. A matched entry with a REAL
 * reason is marked BASELINED (suppressed from gating). A matched entry with
 * no reason, or only the auto-seed-template reason, does NOT suppress —
 * instead it produces an additional `baseline-reason-missing` finding so a
 * bulk `--update-baseline` can never silently absorb a backlog (hazard H9).
 * An expired entry likewise stops suppressing and is re-surfaced.
 */
function applyBaseline( ruleId, findings, opts = {} ) {
	const baseline = loadBaseline( ruleId, opts );
	const byKey = new Map( baseline.entries.map( ( e ) => [ e.key, e ] ) );
	const extra = [];

	const out = findings.map( ( f ) => {
		const entry = byKey.get( f.key );
		if ( ! entry ) return f;

		if ( ! hasRealReason( entry.reason ) ) {
			extra.push( {
				...f,
				detail: `baseline-reason-missing: the baseline entry for key "${ f.key }" has no (or only an auto-seed-template) human-written reason.`,
				fix: `Edit baselines/${ ruleId }.json and write a real, specific reason for key ${ f.key }, or delete the entry so the underlying finding surfaces normally.`,
				status: 'FLAGGED',
				key: `${ f.key }|baseline-reason-missing`,
			} );
			return f; // original finding stays FLAGGED — an unreasoned entry suppresses nothing
		}

		if ( entry.expires ) {
			const expiry = new Date( entry.expires );
			if ( ! Number.isNaN( expiry.getTime() ) && expiry.getTime() < Date.now() ) {
				extra.push( {
					...f,
					detail: `baseline-entry-expired: the baseline entry for key "${ f.key }" expired on ${ entry.expires }.`,
					fix: `Re-review key ${ f.key } in baselines/${ ruleId }.json — fix the underlying issue, or extend 'expires' with a fresh reason.`,
					status: 'FLAGGED',
					key: `${ f.key }|baseline-expired`,
				} );
				return f;
			}
		}

		return { ...f, status: 'BASELINED' };
	} );

	return out.concat( extra );
}

/**
 * Per-rule, explicit only — there is no global `--seed`. Every addition is
 * written with the auto-seed-template reason, which `applyBaseline` refuses
 * to treat as suppressing (see `hasRealReason`) — a human MUST come back and
 * write a real reason before the entry does anything. This is what closes H9
 * ("mass-accept baseline seeding with no reason recorded").
 */
function updateBaseline( ruleId, findings, opts = {} ) {
	const existing = loadBaseline( ruleId, opts );
	const seenKeys = new Set( existing.entries.map( ( e ) => e.key ) );
	const today = new Date().toISOString().slice( 0, 10 );
	const additions = findings
		.filter( ( f ) => ! seenKeys.has( f.key ) )
		.map( ( f ) => ( {
			key: f.key,
			reason: `seeded on ${ today }`,
			seededAt: today,
			expires: null,
		} ) );

	const merged = {
		_meta: { ...existing._meta, rule: ruleId, updated: today },
		entries: existing.entries.concat( additions ),
	};
	const dir = opts.baselineDir || BASELINE_DIR;
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( baselinePath( ruleId, opts ), JSON.stringify( merged, null, 2 ) + '\n' );
	return additions.length;
}

module.exports = {
	loadBaseline,
	applyBaseline,
	updateBaseline,
	baselinePath,
	hasRealReason,
	BASELINE_DIR,
};
