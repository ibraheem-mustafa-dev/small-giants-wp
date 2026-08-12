'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md
// source=file evidence=live-read scripts/consistency/roster.json on 2026-08-03:
// { blocks: [...84 "sgs/x" strings...], _meta: { count: 84 } }, and
// src/blocks/ holds 84 directories each with block.json — roster and disk are
// reconciled AS OF THIS SESSION (the design doc's cited 83-vs-84 physics-canvas
// drift has since been closed by another track's roster regen). The scanner
// still reconciles on every run rather than trusting that fact (H3).
//
// ⛔ THE FIGURES ABOVE ARE THE 2026-08-03 READING AND ARE KEPT AS THE DATED
// RECORD — they are NOT current. Re-measured 2026-08-09 at a09226e8: roster.json
// _meta.count 83, blocks array 83, `ls src/blocks/*/block.json` 83, and this
// module's own _meta.denominator reports 83/83/83. The cause is a retired block,
// `sgs/content-collection`, deleted 2026-08-08 at 37ad3bb8 (D529: "Block count
// 84 -> 83") — NOT a counting convention. Note `ls -d src/blocks/*/` returns 84
// even now, because src/blocks/extensions/ holds no block.json and is not a
// block; that off-by-one is permanent and separate, and the "84 directories each
// with block.json" clause above was never quite right about it. Nothing here is
// behavioural — loadRosterRaw reads the file, never this comment (D543).

const fs = require( 'fs' );
const path = require( 'path' );
const { spawnSync } = require( 'child_process' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..', '..' );
const ROSTER_PATH = path.resolve( PLUGIN_ROOT, 'scripts', 'consistency', 'roster.json' );
const BUILD_ROSTER_PATH = path.resolve( PLUGIN_ROOT, 'scripts', 'consistency', 'build-roster.py' );
const BLOCKS_DIR = path.resolve( PLUGIN_ROOT, 'src', 'blocks' );

// GROUND-TRUTH: spec=task brief 2026-08-12 (roster-freshness gate) — nothing enforced that
// roster.json actually reflects the CURRENT DB state at the moment a standalone consumer
// (e.g. `npm run inspector-scan`) reads it. `prebuild` already regenerates roster.json fresh
// every build via `python scripts/consistency/build-roster.py`, but a standalone invocation
// of this scanner bypasses that chain entirely and can silently read a stale file left over
// from an earlier build or a DB write made mid-session (e.g. via /sgs-update). D523 (a
// flipped `surfaces.link` value) and the 2026-07-30 18-block false-positive WARN incident
// both went unnoticed via exactly this path.
//
// `build-roster.py --check` is the freshness gate: it re-queries the SAME DB columns the
// generator reads (a full payload recompute + compare — a strict superset of a hash/
// fingerprint check, since it also names what drifted) and is itself proven by its own
// `--self-test`. Shelling out to it here rather than re-deriving a JS-side check avoids a
// second, parallel definition of "fresh" that could drift from the generator's own
// definition — exactly the failure class this gate exists to close.
function checkRosterFreshness() {
	const result = spawnSync( 'python', [ BUILD_ROSTER_PATH, '--check' ], {
		encoding: 'utf8',
		cwd: PLUGIN_ROOT,
	} );
	if ( result.error ) {
		// python itself could not be spawned — every other prebuild/check script in this
		// project already depends on a working `python` on PATH, so this is not a NEW
		// dependency; report it plainly rather than silently skipping the freshness gate.
		return {
			fresh: false,
			message: `[inspector-scan] could not run the roster-freshness gate (python not runnable: ${ result.error.message }). ` +
				'Run `python scripts/consistency/build-roster.py --check` by hand to verify roster.json is current.',
		};
	}
	const output = `${ result.stdout || '' }${ result.stderr || '' }`.trim();
	if ( result.status !== 0 ) {
		return {
			fresh: false,
			message: `[inspector-scan] roster.json is STALE — ${ output || 'python scripts/consistency/build-roster.py --check exited ' + result.status }\n` +
				'  Run: python scripts/consistency/build-roster.py',
		};
	}
	return { fresh: true, message: output };
}

function loadRosterRaw() {
	if ( ! fs.existsSync( ROSTER_PATH ) ) {
		return { ok: false, reason: `roster.json not found at ${ ROSTER_PATH }`, blocks: [] };
	}
	let raw;
	try {
		raw = fs.readFileSync( ROSTER_PATH, 'utf8' );
	} catch ( e ) {
		return { ok: false, reason: `roster.json unreadable (${ e.message })`, blocks: [] };
	}
	let parsed;
	try {
		parsed = JSON.parse( raw );
	} catch ( e ) {
		// Malformed is NOT the same as absent (H2) — never silently degrade to {}.
		return {
			ok: false,
			reason: `roster.json is MALFORMED (${ e.message }) — this is not the same as "absent"; fix or regenerate it explicitly.`,
			blocks: [],
		};
	}
	const rawBlocks = parsed.blocks;
	const blocks = Array.isArray( rawBlocks )
		? rawBlocks
		: rawBlocks && typeof rawBlocks === 'object'
		? Object.keys( rawBlocks )
		: [];
	return {
		ok: true,
		reason: null,
		meta: parsed._meta || {},
		blocks,
		mtime: fs.statSync( ROSTER_PATH ).mtime,
	};
}

function slugTail( slug ) {
	return slug && slug.includes( '/' ) ? slug.split( '/' ).pop() : slug;
}

function scanDisk() {
	if ( ! fs.existsSync( BLOCKS_DIR ) ) return [];
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( name ) => {
			const full = path.join( BLOCKS_DIR, name );
			try {
				return fs.statSync( full ).isDirectory() && fs.existsSync( path.join( full, 'block.json' ) );
			} catch ( e ) {
				return false;
			}
		} )
		.sort();
}

/**
 * Reconciles roster.json against the real src/blocks directory. Returns the
 * UNION as `entries`, each tagged with provenance, plus explicit drift lists
 * for both directions — a block on disk absent from the roster is a
 * first-class finding, never a silent "0 findings" over the wrong denominator
 * (design §4.4, hazard H3).
 */
function reconcile() {
	const roster = loadRosterRaw();
	const disk = scanDisk();
	const diskSet = new Set( disk );

	// Roster ENTRIES kept as full objects (not just slug strings) so DB-derived
	// capability flags — e.g. `surfaces.animation`, consumed by rule
	// 17-reduced-motion-gate — survive reconciliation. Ported behaviour from
	// audit-inspector-conformance.js, which read `block.surfaces.animation`
	// directly off its roster.json block objects; the original reconcile()
	// dropped everything but the slug string, which would have silently
	// starved that rule of its DB signal (H10-shaped bug: a generated input
	// consumed by name only, with the rest of its payload discarded).
	const rosterObjs = roster.ok
		? roster.blocks.filter( ( b ) => b && typeof b === 'object' )
		: [];
	const rosterSlugs = roster.ok
		? roster.blocks
				.map( ( b ) => ( typeof b === 'string' ? b : b && ( b.slug || b.name ) ) )
				.filter( Boolean )
		: [];
	const rosterTailMap = new Map( rosterSlugs.map( ( s ) => [ slugTail( s ), s ] ) );
	const rosterTailSet = new Set( rosterTailMap.keys() );
	const rosterTailToObj = new Map( rosterObjs.map( ( o ) => [ slugTail( o.slug || o.name ), o ] ) );

	const onDiskNotInRoster = disk.filter( ( d ) => ! rosterTailSet.has( d ) );
	const inRosterNotOnDisk = rosterSlugs.filter( ( s ) => ! diskSet.has( slugTail( s ) ) );

	const union = new Map();
	for ( const d of disk ) {
		const robj = rosterTailToObj.get( d );
		union.set( d, {
			slug: rosterTailMap.get( d ) || `sgs/${ d }`,
			tail: d,
			inRoster: rosterTailSet.has( d ),
			onDisk: true,
			surfaces: robj ? robj.surfaces || null : null,
		} );
	}
	for ( const s of rosterSlugs ) {
		const tail = slugTail( s );
		if ( ! union.has( tail ) ) {
			const robj = rosterTailToObj.get( tail );
			union.set( tail, {
				slug: s,
				tail,
				inRoster: true,
				onDisk: diskSet.has( tail ),
				surfaces: robj ? robj.surfaces || null : null,
			} );
		}
	}

	return {
		roster,
		denominator: { roster: rosterSlugs.length, disk: disk.length, union: union.size },
		onDiskNotInRoster,
		inRosterNotOnDisk,
		entries: Array.from( union.values() ),
	};
}

module.exports = { reconcile, loadRosterRaw, scanDisk, slugTail, checkRosterFreshness, ROSTER_PATH, BLOCKS_DIR };
