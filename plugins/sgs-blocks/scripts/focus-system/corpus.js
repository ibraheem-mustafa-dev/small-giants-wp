'use strict';

/**
 * Corpus for check-focus-system.js: `git ls-files` filtered by config.INCLUDE and
 * config.EXCLUDE, plus the dumb wide enumeration the corpus control reconciles against.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const { INCLUDE, EXCLUDE, WIDTH_OK, WIDE_EXT_RE, RETIRED_TOKEN_RE } = require( './config.js' );

function gitFiles( root ) {
	const out = execFileSync( 'git', [ 'ls-files', '-z' ], { cwd: root, maxBuffer: 256 * 1024 * 1024 } );
	return out
		.toString( 'utf8' )
		.split( '\0' )
		.filter( Boolean )
		// A tracked file deleted in the working tree has nothing left to scan.
		.filter( ( rel ) => fs.existsSync( path.join( root, rel ) ) );
}

function kindOf( rel ) {
	if ( EXCLUDE.some( ( e ) => e.re.test( rel ) ) ) {
		return null;
	}
	const hit = INCLUDE.find( ( i ) => i.re.test( rel ) );
	return hit ? hit.kind : null;
}

/** @returns {string[]} repo-relative POSIX paths of the corpus, sorted. */
function listCorpus( root, tracked ) {
	return ( tracked || gitFiles( root ) ).filter( ( rel ) => null !== kindOf( rel ) ).sort();
}

/** Every tracked text source that mentions `:focus` or a retired token (the dumb enumeration). */
function listWide( root, tracked ) {
	const out = [];
	for ( const rel of tracked || gitFiles( root ) ) {
		if ( ! WIDE_EXT_RE.test( rel ) ) {
			continue;
		}
		let text;
		try {
			text = fs.readFileSync( path.join( root, rel ), 'utf8' );
		} catch ( err ) {
			continue;
		}
		RETIRED_TOKEN_RE.lastIndex = 0;
		if ( text.includes( ':focus' ) || RETIRED_TOKEN_RE.test( text ) ) {
			out.push( rel );
		}
	}
	RETIRED_TOKEN_RE.lastIndex = 0;
	return out.sort();
}

/**
 * Corpus width check: files in the wide list but not the corpus need a WIDTH_OK reason, and
 * every tracked EXCLUDE must still match a tracked file.
 *
 * @returns {{ failures: string[], outside: Object<string, number> }}
 */
function checkWidth( root ) {
	const tracked = gitFiles( root );
	const corpus = new Set( listCorpus( root, tracked ) );
	const failures = [];
	const outside = {};
	for ( const rel of listWide( root, tracked ) ) {
		if ( corpus.has( rel ) ) {
			continue;
		}
		const ok = WIDTH_OK.find( ( w ) => w.re.test( rel ) );
		if ( ! ok ) {
			failures.push( `wide enumeration: ${ rel } mentions :focus or a retired token, is outside the corpus and has no WIDTH_OK reason` );
			continue;
		}
		outside[ ok.reason ] = ( outside[ ok.reason ] || 0 ) + 1;
	}
	for ( const e of EXCLUDE ) {
		const matches = tracked.some( ( rel ) => e.re.test( rel ) );
		if ( e.tracked && ! matches ) {
			failures.push( `EXCLUDE ${ e.re } (${ e.reason }) matches no tracked file: the exclude is stale` );
		}
		if ( e.tracked && e.probe && ! tracked.some( ( rel ) => rel.startsWith( e.probe ) ) ) {
			failures.push( `EXCLUDE probe ${ e.probe } no longer exists in git ls-files` );
		}
	}
	return { failures, outside };
}

module.exports = { gitFiles, kindOf, listCorpus, listWide, checkWidth };
