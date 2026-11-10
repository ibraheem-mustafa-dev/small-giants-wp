'use strict';
/**
 * framework-db.js: the one answer to "which framework database does this process use?" (twin of framework_db.py).
 *
 * $SGS_FRAMEWORK_DB names a database copy; without it the first non-empty shared database under
 * ~/.claude/skills/sgs-wp-engine/ is used. A script asks this module for the database and the
 * skill folders instead of building a path under ~/.claude or ~/.agents itself; check-framework-db-resolver.py fails
 * one that does.
 */
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

const SKILL_ROOTS = [ '.claude' ];
const FRAMEWORK_SKILL = 'sgs-wp-engine';
const SKILL_DB = [ 'skills', FRAMEWORK_SKILL, 'sgs-framework.db' ];

function sharedFrameworkDbPath() {
	for ( const root of SKILL_ROOTS ) {
		const candidate = path.join( os.homedir(), root, ...SKILL_DB );
		try {
			if ( fs.statSync( candidate ).size > 0 ) {
				return candidate;
			}
		} catch ( e ) {
			// not present under this root
		}
	}
	return path.join( os.homedir(), SKILL_ROOTS[ 0 ], ...SKILL_DB );
}

function frameworkDbPath() {
	if ( process.env.SGS_FRAMEWORK_DB ) {
		return process.env.SGS_FRAMEWORK_DB;
	}
	return sharedFrameworkDbPath();
}

/** One skill's folder: ~/.claude/skills/<name>, . */
function skillDir( name = FRAMEWORK_SKILL ) {
	for ( const root of SKILL_ROOTS ) {
		const candidate = path.join( os.homedir(), root, 'skills', name );
		try {
			if ( fs.statSync( candidate ).isDirectory() ) {
				return candidate;
			}
		} catch ( e ) {
			// not present under this root
		}
	}
	return path.join( os.homedir(), SKILL_ROOTS[ 0 ], 'skills', name );
}

module.exports = { frameworkDbPath, sharedFrameworkDbPath, skillDir };
