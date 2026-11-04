'use strict';
/**
 * framework-db.js: the one answer to "which framework database does this process use?" (twin of framework_db.py).
 *
 * $SGS_FRAMEWORK_DB names a database copy; without it the first non-empty shared database under
 * ~/.claude/skills/sgs-wp-engine/ (then ~/.agents/...) is used. A script a reseed runs asks this module instead of
 * building the path itself; check-framework-db-resolver.py fails one that builds it by hand.
 */
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

const SKILL_DB = [ 'skills', 'sgs-wp-engine', 'sgs-framework.db' ];

function frameworkDbPath() {
	if ( process.env.SGS_FRAMEWORK_DB ) {
		return process.env.SGS_FRAMEWORK_DB;
	}
	for ( const root of [ '.claude', '.agents' ] ) {
		const candidate = path.join( os.homedir(), root, ...SKILL_DB );
		try {
			if ( fs.statSync( candidate ).size > 0 ) {
				return candidate;
			}
		} catch ( e ) {
			// not present under this root
		}
	}
	return path.join( os.homedir(), '.claude', ...SKILL_DB );
}

module.exports = { frameworkDbPath };
