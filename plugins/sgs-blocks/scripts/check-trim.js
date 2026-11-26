/**
 * check-trim.js
 *
 * Fails when a block's trim list names a control that does not exist.
 *
 * A block leaves controls out of a shared panel by listing them in
 * `supports.sgs.trim` (src/blocks/<block>/block.json), read in the editor through
 * `src/blocks/extensions/hide-extensions.js::isTrimmed`. The controls a panel offers
 * are listed in `src/blocks/extensions/trim-controls.json`, one row per panel
 * (`file` = the panel's source, `controls` = its trimmable slugs, `<panel>.<control>`).
 *
 * Two checks:
 *   1. Every entry of every block's trim list is a control in the registry (a typo, a
 *      retired control or a slug of a panel that has no registry row all fail), and is
 *      a string, listed once.
 *   2. Every registry control appears as a quoted string in its panel's source file, so
 *      a control removed from the panel cannot stay in the registry and keep blessing
 *      entries that no longer do anything.
 *
 * Usage:
 *   node scripts/check-trim.js            # exit 1 on a problem
 *   node scripts/check-trim.js --self-test
 *   require('./check-trim').checkTrim(opts) -> string[] of problems
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const REGISTRY_FILE = path.join( BLOCKS_DIR, 'extensions', 'trim-controls.json' );

/**
 * @param {string} file Path to a JSON file.
 * @return {Object} Parsed JSON.
 */
function readJson( file ) {
	return JSON.parse( fs.readFileSync( file, 'utf8' ) );
}

/**
 * The trim list of every block that opts in, keyed by block folder name.
 *
 * @param {string} blocksDir The blocks folder.
 * @return {Object<string, *>} Folder name to its raw `supports.sgs.trim` value.
 */
function collectTrimLists( blocksDir ) {
	const lists = {};
	for ( const entry of fs.readdirSync( blocksDir, { withFileTypes: true } ) ) {
		if ( ! entry.isDirectory() ) {
			continue;
		}
		const file = path.join( blocksDir, entry.name, 'block.json' );
		if ( ! fs.existsSync( file ) ) {
			continue;
		}
		const sgs = readJson( file )?.supports?.sgs;
		if ( sgs && Object.prototype.hasOwnProperty.call( sgs, 'trim' ) ) {
			lists[ entry.name ] = sgs.trim;
		}
	}
	return lists;
}

/**
 * @param {Object}  [opts]
 * @param {string}  [opts.blocksDir]    The blocks folder.
 * @param {Object}  [opts.registry]     The parsed registry.
 * @param {string}  [opts.root]         Folder the registry's `file` paths are relative to.
 * @param {Object}  [opts.lists]        Trim lists keyed by block, instead of reading the folders.
 * @return {string[]} One line per problem; empty when the trim lists are sound.
 */
function checkTrim( opts = {} ) {
	const root = opts.root || ROOT;
	const registry = opts.registry || readJson( REGISTRY_FILE );
	const lists = opts.lists || collectTrimLists( opts.blocksDir || BLOCKS_DIR );
	const problems = [];

	const real = new Set();
	for ( const [ panel, row ] of Object.entries( registry ) ) {
		if ( panel.startsWith( '_' ) ) {
			continue;
		}
		const source = path.join( root, row.file || '' );
		const text = fs.existsSync( source ) ? fs.readFileSync( source, 'utf8' ) : null;
		if ( null === text ) {
			problems.push( `registry row "${ panel }": file ${ row.file } does not exist` );
		}
		for ( const slug of row.controls || [] ) {
			if ( ! slug.startsWith( panel + '.' ) ) {
				problems.push( `registry row "${ panel }": slug "${ slug }" is not prefixed "${ panel }."` );
			}
			real.add( slug );
			if ( null !== text && ! ( text.includes( `'${ slug }'` ) || text.includes( `"${ slug }"` ) ) ) {
				problems.push( `registry row "${ panel }": ${ row.file } never names '${ slug }', so the control no longer exists there` );
			}
		}
	}

	for ( const [ block, list ] of Object.entries( lists ) ) {
		if ( ! Array.isArray( list ) ) {
			problems.push( `${ block }: supports.sgs.trim must be an array of control slugs` );
			continue;
		}
		const seen = new Set();
		for ( const slug of list ) {
			if ( 'string' !== typeof slug || ! real.has( slug ) ) {
				problems.push( `${ block }: supports.sgs.trim names "${ slug }", which is no control listed in trim-controls.json` );
			} else if ( seen.has( slug ) ) {
				problems.push( `${ block }: supports.sgs.trim lists "${ slug }" twice` );
			}
			seen.add( slug );
		}
	}

	return problems;
}

/**
 * The checker must fail on each bad shape; run before trusting a pass.
 *
 * @return {string[]} Problems with the checker itself (empty when it is sound).
 */
function selfTest() {
	const registry = {
		layout: { file: 'src/blocks/extensions/trim-controls.json', controls: [ 'layout.default' ] },
	};
	// The registry file itself stands in for a panel source that names the slug as a quoted string.
	const named = { ...registry, layout: { ...registry.layout, controls: [ 'layout.default' ] } };
	const fails = [];
	const expectProblems = ( label, opts, wantCount ) => {
		const got = checkTrim( { root: ROOT, registry: named, lists: {}, ...opts } );
		if ( got.length !== wantCount ) {
			fails.push( `${ label }: wanted ${ wantCount } problem(s), got ${ got.length } (${ got.join( ' | ' ) })` );
		}
	};
	expectProblems( 'a real entry passes', { lists: { a: [ 'layout.default' ] } }, 0 );
	expectProblems( 'an unknown control fails', { lists: { a: [ 'layout.nope' ] } }, 1 );
	expectProblems( 'a panel with no row fails', { lists: { a: [ 'separators.x' ] } }, 1 );
	expectProblems( 'a duplicate fails', { lists: { a: [ 'layout.default', 'layout.default' ] } }, 1 );
	expectProblems( 'a non-array fails', { lists: { a: 'layout.default' } }, 1 );
	expectProblems(
		'a registry control the panel file never names fails',
		{ registry: { layout: { file: 'src/blocks/extensions/trim-controls.json', controls: [ 'layout.gone' ] } } },
		1
	);
	expectProblems(
		'a registry row whose file is missing fails',
		{ registry: { layout: { file: 'src/missing.js', controls: [] } } },
		1
	);
	return fails;
}

module.exports = { checkTrim, collectTrimLists, selfTest };

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		const fails = selfTest();
		if ( fails.length ) {
			console.error( 'check-trim self-test FAILED:\n' + fails.join( '\n' ) );
			process.exit( 1 );
		}
		console.log( 'check-trim self-test passed (7 cases).' );
	} else {
		const problems = checkTrim();
		if ( problems.length ) {
			console.error( 'check-trim: ' + problems.length + ' problem(s):\n' + problems.join( '\n' ) );
			process.exit( 1 );
		}
		console.log( 'check-trim: every trim entry names a real control.' );
	}
}
