'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md
// source=file evidence=live-read scripts/consistency/roster.json on 2026-08-03:
// { blocks: [...84 "sgs/x" strings...], _meta: { count: 84 } }, and
// src/blocks/ holds 84 directories each with block.json — roster and disk are
// reconciled AS OF THIS SESSION (the design doc's cited 83-vs-84 physics-canvas
// drift has since been closed by another track's roster regen). The scanner
// still reconciles on every run rather than trusting that fact (H3).

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..', '..' );
const ROSTER_PATH = path.resolve( PLUGIN_ROOT, 'scripts', 'consistency', 'roster.json' );
const BLOCKS_DIR = path.resolve( PLUGIN_ROOT, 'src', 'blocks' );

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

	const rosterSlugs = roster.ok
		? roster.blocks
				.map( ( b ) => ( typeof b === 'string' ? b : b && ( b.slug || b.name ) ) )
				.filter( Boolean )
		: [];
	const rosterTailMap = new Map( rosterSlugs.map( ( s ) => [ slugTail( s ), s ] ) );
	const rosterTailSet = new Set( rosterTailMap.keys() );

	const onDiskNotInRoster = disk.filter( ( d ) => ! rosterTailSet.has( d ) );
	const inRosterNotOnDisk = rosterSlugs.filter( ( s ) => ! diskSet.has( slugTail( s ) ) );

	const union = new Map();
	for ( const d of disk ) {
		union.set( d, {
			slug: rosterTailMap.get( d ) || `sgs/${ d }`,
			tail: d,
			inRoster: rosterTailSet.has( d ),
			onDisk: true,
		} );
	}
	for ( const s of rosterSlugs ) {
		const tail = slugTail( s );
		if ( ! union.has( tail ) ) {
			union.set( tail, { slug: s, tail, inRoster: true, onDisk: diskSet.has( tail ) } );
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

module.exports = { reconcile, loadRosterRaw, scanDisk, slugTail, ROSTER_PATH, BLOCKS_DIR };
