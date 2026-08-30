#!/usr/bin/env node
/**
 * Single source of truth for the SVG sanitiser allowlist, PHP -> JS.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three editor sites and four shared-component sites inject operator-supplied
 * SVG with `dangerouslySetInnerHTML` and NO client-side sanitiser, while the
 * server runs `wp_kses()` with a strict allowlist. A Contributor can therefore
 * store markup that never reaches the front end but DOES execute in an admin's
 * browser the moment they open the post - a privilege escalation.
 *
 * Closing that needs the same allowlist on both sides. Maintaining two copies
 * by hand guarantees they drift, and a drifted sanitiser is worse than none:
 * it reads as protection while admitting whatever the copy forgot.
 *
 * So the PHP list is THE source and this script generates the JS from it, by
 * EXECUTING the real function rather than parsing its source. A regex over PHP
 * would re-implement the thing it is checking; running it cannot disagree with
 * itself.
 *
 * OUTPUT: src/utils/svg-allowlist.generated.js  (never hand-edit)
 *
 * USAGE
 *   node scripts/generate-svg-allowlist.js            # write
 *   node scripts/generate-svg-allowlist.js --check    # gate: fail if stale
 *   node scripts/generate-svg-allowlist.js --self-test
 *
 * ⛔ The `--check` mode MUST stay wired into scripts/gates.json. Its sibling
 * `generate-extension-attributes.js` shipped with a `--check` that was wired
 * into nothing for months while a doc claimed it was gated - the generated file
 * could not go stale only because the WRITE ran on every build. That is luck,
 * not a gate. This one is registered in both places.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const PLUGIN_DIR = path.resolve( __dirname, '..' );
const OUT_FILE = path.join(
	PLUGIN_DIR,
	'src',
	'utils',
	'svg-allowlist.generated.js'
);
const PHP_HELPER = path.join( PLUGIN_DIR, 'includes', 'helpers-svg-kses.php' );

/**
 * Execute the real PHP function and return its allowlist.
 *
 * Deliberately runs the function instead of parsing the file. `helpers-svg-kses.php`
 * builds its map with `array_merge( $core_attrs, ... )` per tag, so a source
 * regex would have to reimplement that composition - and would then be capable
 * of disagreeing with the thing it exists to mirror.
 *
 * @return {Object} tag -> { attr: true }
 */
function readAllowlistFromPhp() {
	const code = [
		'define("ABSPATH", ' + JSON.stringify( PLUGIN_DIR + path.sep ) + ');',
		'require ' + JSON.stringify( PHP_HELPER ) + ';',
		'echo json_encode( sgs_svg_kses_allowed_tags() );',
	].join( ' ' );

	const out = execFileSync( 'php', [ '-r', code ], {
		encoding: 'utf8',
		maxBuffer: 8 * 1024 * 1024,
	} );

	const parsed = JSON.parse( out );
	if ( ! parsed || typeof parsed !== 'object' || ! parsed.svg ) {
		throw new Error(
			'PHP returned no usable allowlist (missing <svg>) - refusing to ' +
				'generate. A truncated allowlist would silently WIDEN the ' +
				'sanitiser by omitting tags it should reject.'
		);
	}
	return parsed;
}

/**
 * Render the JS module. Tags and attributes are lower-cased for comparison
 * because the DOM reports them lower-case, while the PHP list carries a few
 * camelCase spellings (viewBox, attributeName) for markup that uses them.
 *
 * @param {Object} allow tag -> attrs map from PHP.
 * @return {string} module source.
 */
function render( allow ) {
	const tags = Object.keys( allow ).sort();
	const lines = tags.map( ( tag ) => {
		const attrs = Object.keys( allow[ tag ] )
			.map( ( a ) => a.toLowerCase() )
			.filter( ( a, i, arr ) => arr.indexOf( a ) === i )
			.sort();
		return (
			'\t' +
			JSON.stringify( tag.toLowerCase() ) +
			': [ ' +
			attrs.map( ( a ) => JSON.stringify( a ) ).join( ', ' ) +
			' ],'
		);
	} );

	return `/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: includes/helpers-svg-kses.php :: sgs_svg_kses_allowed_tags()
 * Regenerate: node scripts/generate-svg-allowlist.js
 * Gate: node scripts/generate-svg-allowlist.js --check
 *
 * The SVG allowlist the SERVER enforces via wp_kses(), mirrored for the editor
 * so operator-supplied SVG is sanitised before it is ever mounted with
 * dangerouslySetInnerHTML. Editing this file by hand makes the two sides
 * disagree, which is worse than having no client sanitiser at all: it reads as
 * protection while admitting whatever the edit forgot.
 *
 * Tags and attribute names are lower-cased - the DOM reports them that way.
 */

/* eslint-disable */
export const SVG_ALLOWLIST = {
${ lines.join( '\n' ) }
};

export const SVG_ALLOWED_TAGS = Object.keys( SVG_ALLOWLIST );
`;
}

function selfTest() {
	const fails = [];
	const ck = ( name, cond ) => {
		if ( ! cond ) {
			fails.push( name );
		}
	};

	const allow = readAllowlistFromPhp();

	// POSITIVE - the list is real and carries what the server admits.
	ck( 'has <svg>', !! allow.svg );
	ck( 'has <path>', !! allow.path );
	ck( 'has <animate> (carried from the narrow list)', !! allow.animate );
	ck( 'has gradients', !! allow.lineargradient && !! allow.stop );
	ck( 'has <title>/<desc>', !! allow.title && !! allow.desc );

	// NEGATIVE - the invariants. If any of these flips, the sanitiser would
	// start admitting the very thing it exists to strip.
	ck( 'rejects <script>', ! allow.script );
	ck( 'rejects <foreignObject>', ! allow.foreignobject && ! allow.foreignObject );
	ck( 'rejects <style>', ! allow.style );
	ck( '<a> carries no href', ! ( allow.a && ( allow.a.href || allow.a[ 'xlink:href' ] ) ) );

	let onStar = 0;
	Object.keys( allow ).forEach( ( t ) =>
		Object.keys( allow[ t ] ).forEach( ( a ) => {
			if ( a.toLowerCase().startsWith( 'on' ) ) {
				onStar++;
			}
		} )
	);
	ck( 'no on* attribute anywhere', onStar === 0 );

	// The renderer must not silently drop tags.
	const out = render( allow );
	ck(
		'render() emits every tag',
		Object.keys( allow ).every( ( t ) =>
			out.includes( JSON.stringify( t.toLowerCase() ) + ':' )
		)
	);

	fails.forEach( ( f ) => process.stdout.write( `  FAIL ${ f }\n` ) );
	const total = 11;
	process.stdout.write(
		`\n${ fails.length ? 'FAIL' : 'PASS' } - ${ total - fails.length }/${ total } assertions\n`
	);
	return fails.length ? 1 : 0;
}

function main() {
	const check = process.argv.includes( '--check' );
	if ( process.argv.includes( '--self-test' ) ) {
		return selfTest();
	}

	const js = render( readAllowlistFromPhp() );

	if ( check ) {
		const current = fs.existsSync( OUT_FILE )
			? fs.readFileSync( OUT_FILE, 'utf8' )
			: '';
		if ( current !== js ) {
			process.stderr.write(
				'[generate-svg-allowlist] STALE: src/utils/svg-allowlist.generated.js ' +
					'does not match includes/helpers-svg-kses.php.\n' +
					'The editor sanitiser and the server allowlist have DIVERGED. ' +
					'Run: node scripts/generate-svg-allowlist.js\n'
			);
			return 1;
		}
		process.stdout.write( '[generate-svg-allowlist] OK - JS mirrors PHP.\n' );
		return 0;
	}

	fs.writeFileSync( OUT_FILE, js, 'utf8' );
	process.stdout.write(
		`[generate-svg-allowlist] wrote ${ path.relative( PLUGIN_DIR, OUT_FILE ) }\n`
	);
	return 0;
}

if ( require.main === module ) {
	process.exit( main() );
}

module.exports = { readAllowlistFromPhp, render };
