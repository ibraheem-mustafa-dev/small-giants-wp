// A client's delivery map (sites/<client>/build/qa/delivery-map.json): one key for every coverage id the client's
// intake review names, every active record of its handoff animations.json and every state of its surfaces.json, each
// owned by a unit of the plan the map names, or marked done or accepted. `mapProblems` is the check: a missing,
// duplicated or unknown key, a unit the plan does not hold, a done commit that does not exist, and a coverage key whose
// mark disagrees with the coverage map (an open key whose entry is covered or excluded, a done key still a gap).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { REPO } from './capabilities.mjs';
import { reviewCoverageIds } from './coverage-register.mjs';
import { statusOf } from './clone-coverage.mjs';

export const PRIOR = 'prior';

// The map file's path for a client.
export function mapPath( client, root = REPO ) {
	return path.join( root, 'sites', client, 'build', 'qa', 'delivery-map.json' );
}

function readJson( file ) {
	return JSON.parse( fs.readFileSync( file, 'utf8' ) );
}

// Every key the map must hold for a client, as a sorted list: `coverage:<id>`, `animation:<id>`, `state:<surface>:<name>`.
export function expectedKeys( client, root = REPO ) {
	const site = path.join( root, 'sites', client );
	const keys = new Set();
	const review = path.join( site, 'build', 'intake', 'review.md' );
	if ( fs.existsSync( review ) ) {
		for ( const id of reviewCoverageIds( fs.readFileSync( review, 'utf8' ) ) ) {
			keys.add( `coverage:${ id }` );
		}
	}
	const anim = path.join( site, 'handoff', 'animations.json' );
	if ( fs.existsSync( anim ) ) {
		for ( const r of readJson( anim ).records || [] ) {
			if ( 'active' === r.status ) {
				keys.add( `animation:${ r.id }` );
			}
		}
	}
	const surf = path.join( site, 'handoff', 'surfaces.json' );
	if ( fs.existsSync( surf ) ) {
		for ( const s of readJson( surf ).records || [] ) {
			for ( const st of s.states || [] ) {
				keys.add( `state:${ s.id }:${ st.name }` );
			}
		}
	}
	return [ ...keys ].sort();
}

// The unit ids of a plan: the first cell of each row of its work table (`| U13a Heritage track | ...`).
export function planUnits( markdown ) {
	return new Set( [ ...String( markdown ).matchAll( /^\| (U\d+[a-z]?) /gm ) ].map( ( m ) => m[ 1 ] ) );
}

// The keys of the map's `keys` object that occur more than once in its raw text (JSON.parse keeps only the last).
export function duplicateKeys( raw ) {
	const block = raw.slice( raw.indexOf( '"keys"' ) );
	const seen = new Map();
	for ( const m of block.matchAll( /"((?:[^"\\]|\\.)*)"\s*:/g ) ) {
		seen.set( m[ 1 ], ( seen.get( m[ 1 ] ) || 0 ) + 1 );
	}
	seen.delete( 'keys' );
	seen.delete( 'done' );
	seen.delete( 'accepted' );
	seen.delete( 'unit' );
	return [ ...seen ].filter( ( [ , n ] ) => n > 1 ).map( ( [ k ] ) => k );
}

// Whether a commit exists in the repo.
export function commitExists( hash, root = REPO ) {
	return 0 === spawnSync( 'git', [ 'cat-file', '-e', `${ hash }^{commit}` ], { cwd: root } ).status;
}

// Every reason the map is wrong, as sentences; empty when it is right. A value is a unit id ("U14"), { done: <commit or
// "prior">, unit } or { accepted: <reason>, unit }; "prior" is allowed only for a coverage key whose entry is covered.
export function mapProblems( { raw, expected, units, coverage, hasCommit } ) {
	const problems = [];
	let map;
	try {
		map = JSON.parse( raw );
	} catch ( e ) {
		return [ `the map is not valid JSON: ${ e.message }` ];
	}
	const keys = map.keys || {};
	for ( const k of duplicateKeys( raw ) ) {
		problems.push( `${ k }: listed more than once` );
	}
	const want = new Set( expected );
	for ( const k of expected ) {
		if ( ! ( k in keys ) ) {
			problems.push( `${ k }: missing (name the unit that owns it)` );
		}
	}
	const entries = coverage.entries || {};
	for ( const [ k, v ] of Object.entries( keys ) ) {
		if ( ! want.has( k ) ) {
			problems.push( `${ k }: not a coverage id the review names, an active animation record or a surface state` );
			continue;
		}
		const unit = 'string' === typeof v ? v : v?.unit;
		if ( ! units.has( unit ) ) {
			problems.push( `${ k }: unit ${ JSON.stringify( unit ) } is not in the plan's work table` );
		}
		const status = k.startsWith( 'coverage:' ) ? statusOf( entries[ k.slice( 'coverage:'.length ) ] ) : null;
		if ( 'string' === typeof v ) {
			if ( status && 'gap' !== status ) {
				problems.push( `${ k }: the coverage map has it ${ status }; mark it done or accepted` );
			}
			continue;
		}
		if ( v?.done ) {
			if ( PRIOR === v.done ) {
				if ( 'covered' !== status ) {
					problems.push( `${ k }: "prior" is only for a coverage id already covered` );
				}
			} else if ( ! hasCommit( v.done ) ) {
				problems.push( `${ k }: done commit ${ v.done } does not exist` );
			}
			if ( 'gap' === status ) {
				problems.push( `${ k }: marked done but the coverage map still has it as a gap` );
			}
		} else if ( v?.accepted ) {
			if ( ! String( v.accepted ).trim() ) {
				problems.push( `${ k }: an accepted key needs its reason` );
			}
		} else {
			problems.push( `${ k }: a value is a unit id, { done, unit } or { accepted, unit }` );
		}
	}
	return problems;
}
