/**
 * check-extension-roster.js
 *
 * Fails when src/blocks/extensions/extension-roster.json drifts from the code it
 * describes. The roster feeds sgs-update-v2.py::_seed_extension_attr_rows, so a
 * drifted roster seeds the framework DB with settings no block can set, or omits
 * ones every block can.
 *
 * Three checks:
 *   1. Attribute names and types: the roster's attributes equal the `sgs*`
 *      attributes scripts/generate-extension-attributes.js::collectAttributes
 *      finds in the extension JS (the `fx*` attributes have their own seeder).
 *   2. Shape: every extension has a known rule mode, every attribute a type, and
 *      `requires` names an attribute of the same roster.
 *   3. Per-block gating: for every extension that check-universal-fit.js also
 *      models (matched by id), the roster rule and that file's appliesTo +
 *      hideExtensions agree on every block in src/blocks.
 *
 * Usage:
 *   node scripts/check-extension-roster.js          # exit 1 on drift
 *   require('./check-extension-roster').checkRoster() -> string[] of problems
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { collectAttributes } = require( './generate-extension-attributes' );
const { EXTENSIONS, readBlock } = require( './check-universal-fit' );

const ROOT = path.join( __dirname, '..' );
const ROSTER_FILE = path.join( ROOT, 'src', 'blocks', 'extensions', 'extension-roster.json' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const MODES = [ 'allowlist', 'universal', 'denylist', 'flag', 'named' ];
const TYPES = [ 'string', 'number', 'boolean', 'array', 'object' ];

/**
 * Whether a roster rule gives an sgs/* block the extension's attributes.
 * Mirrors the extension JS predicates; the python seeder has the same function.
 *
 * @param {Object} rule  Roster `rule`.
 * @param {Object} block check-universal-fit.js::readBlock() result.
 * @return {boolean}
 */
function rosterApplies( rule, block ) {
	const hidden = rule.hideSlug && block.hideExtensions.includes( rule.hideSlug );
	switch ( rule.mode ) {
		case 'allowlist':
			return block.enabledExtensions.includes( rule.enabledSlug ) && ( ! rule.requiresClassName || block.supportsClassName );
		case 'universal':
			return ! hidden && ( ! rule.requiresClassName || block.supportsClassName );
		case 'denylist':
			return ! hidden && block.name.startsWith( 'sgs/' );
		case 'flag':
			return Boolean( ( ( block.json.supports || {} ).sgs || {} )[ rule.flag ] );
		default:
			return false;
	}
}

function checkRoster( rosterFile = ROSTER_FILE ) {
	const problems = [];
	const roster = JSON.parse( fs.readFileSync( rosterFile, 'utf8' ) );
	const declared = new Map();
	const ids = new Set();

	for ( const ext of roster.extensions || [] ) {
		if ( ids.has( ext.id ) ) {
			problems.push( `extension id "${ ext.id }" appears twice` );
		}
		ids.add( ext.id );
		if ( ! MODES.includes( ext.rule?.mode ) ) {
			problems.push( `${ ext.id }: unknown rule mode "${ ext.rule?.mode }"` );
		}
		for ( const [ name, def ] of Object.entries( ext.attributes || {} ) ) {
			if ( ! /^sgs[A-Z]/.test( name ) ) {
				problems.push( `${ ext.id }.${ name }: roster attributes are sgs* only` );
			}
			if ( ! TYPES.includes( def.type ) ) {
				problems.push( `${ ext.id }.${ name }: type "${ def.type }" is not one of ${ TYPES.join( ', ' ) }` );
			}
			if ( declared.has( name ) ) {
				problems.push( `${ name } is declared by both ${ declared.get( name ).ext } and ${ ext.id }` );
			}
			declared.set( name, { ext: ext.id, type: def.type, def } );
		}
	}
	for ( const [ name, { ext, def } ] of declared ) {
		for ( const req of Object.keys( def.requires || {} ) ) {
			if ( ! declared.has( req ) ) {
				problems.push( `${ ext }.${ name }: requires "${ req }", which is not in the roster` );
			}
		}
	}

	// 1. Names and types against the extension JS.
	const found = new Map( [ ...collectAttributes() ].filter( ( [ n ] ) => n.startsWith( 'sgs' ) ) );
	for ( const [ name, type ] of found ) {
		if ( ! declared.has( name ) ) {
			problems.push( `${ name } (${ type }) is added by the extension JS but is missing from extension-roster.json` );
		} else if ( declared.get( name ).type !== type ) {
			problems.push( `${ name }: roster type ${ declared.get( name ).type } but the extension JS declares ${ type }` );
		}
	}
	for ( const name of declared.keys() ) {
		if ( ! found.has( name ) ) {
			problems.push( `${ name } is in extension-roster.json but no extension JS declares it` );
		}
	}

	// 3. Per-block gating against check-universal-fit.js.
	const byId = new Map( EXTENSIONS.map( ( e ) => [ e.id, e ] ) );
	const dirs = fs.readdirSync( BLOCKS_DIR ).filter( ( d ) => fs.existsSync( path.join( BLOCKS_DIR, d, 'block.json' ) ) );
	for ( const ext of roster.extensions || [] ) {
		const fit = byId.get( ext.id );
		if ( ! fit || 'named' === ext.rule.mode ) {
			continue;
		}
		const disagree = [];
		for ( const dir of dirs ) {
			const block = readBlock( `sgs/${ dir }`, null );
			if ( ! block || ! block.name.startsWith( 'sgs/' ) ) {
				continue;
			}
			const theirs = fit.appliesTo( block ) && ! ( fit.hideSlug && block.hideExtensions.includes( fit.hideSlug ) );
			if ( theirs !== rosterApplies( ext.rule, block ) ) {
				disagree.push( block.name );
			}
		}
		if ( disagree.length ) {
			problems.push( `${ ext.id }: roster rule and check-universal-fit.js disagree on ${ disagree.length } block(s): ${ disagree.slice( 0, 8 ).join( ', ' ) }` );
		}
	}
	return problems;
}

if ( require.main === module ) {
	const problems = checkRoster();
	if ( problems.length ) {
		process.stderr.write( `[check-extension-roster] FAIL, ${ problems.length } problem(s):\n  ${ problems.join( '\n  ' ) }\n` );
		process.exit( 1 );
	}
	process.stdout.write( '[check-extension-roster] OK, roster matches the extension JS and check-universal-fit.js.\n' );
}

module.exports = { checkRoster, rosterApplies };
