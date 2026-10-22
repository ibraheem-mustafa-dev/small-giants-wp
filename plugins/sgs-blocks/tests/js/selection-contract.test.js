/**
 * Text selection colour: contract for theme/sgs-theme/assets/css/selection.css, inc/selection.php and the push guard
 * (Spec 32 FR-32-26a).
 *
 * Asserts that:
 *   - the stylesheet paints `::selection` from `--wp--custom--selection--background` and `--colour` with no fallback;
 *   - the theme enqueues it only through a gate that needs both keys set, and functions.php requires that file;
 *   - theme.json declares no selection default (an unset pair paints nothing);
 *   - the push guard refuses a half pair and accepts none or both (snapshot_selection_tokens.py).
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { spawnSync } = require( 'child_process' );

const REPO = path.resolve( __dirname, '..', '..', '..', '..' );
const THEME = path.join( REPO, 'theme', 'sgs-theme' );
const SCRIPTS = path.join( REPO, 'plugins', 'sgs-blocks', 'scripts' );

const read = ( ...parts ) => fs.readFileSync( path.join( ...parts ), 'utf8' );

/**
 * Run snapshot_selection_tokens against a snapshot and return its two answers.
 *
 * @param {Object} custom settings.custom of the snapshot.
 * @return {{incomplete: string[], problems: string[]}} The helper results.
 */
function check( custom ) {
	const code = [
		'import json, sys',
		'import snapshot_selection_tokens as st',
		'snap = json.loads(sys.argv[1])',
		'print(json.dumps({"incomplete": st.incomplete_selection_keys(snap), "problems": st.check_snapshot(snap)}))',
	].join( '\n' );
	const snapshot = JSON.stringify( {
		settings: {
			custom,
			color: { palette: [ { slug: 'a', color: '#ffffff' } ] },
		},
	} );
	const out = spawnSync( 'python', [ '-c', code, snapshot ], {
		cwd: SCRIPTS,
		encoding: 'utf8',
	} );
	expect( out.status ).toBe( 0 );
	return JSON.parse( out.stdout );
}

describe( 'selection stylesheet', () => {
	const css = read( THEME, 'assets', 'css', 'selection.css' );

	it( 'paints ::selection from the two snapshot tokens with no fallback', () => {
		expect( css ).toMatch( /::selection\s*\{[^}]*background:\s*var\(--wp--custom--selection--background\);/ );
		expect( css ).toMatch( /::selection\s*\{[^}]*color:\s*var\(--wp--custom--selection--colour\);/ );
	} );
} );

describe( 'selection enqueue', () => {
	const php = read( THEME, 'inc', 'selection.php' );

	it( 'is gated on both keys being set', () => {
		expect( php ).toContain( "array( 'background', 'colour' )" );
		expect( php ).toMatch( /if \( ! selection_colours_set\(\) \) \{\s*return;/ );
		expect( php ).toContain( 'assets/css/selection.css' );
	} );

	it( 'is required by functions.php', () => {
		expect( read( THEME, 'functions.php' ) ).toContain( "inc/selection.php'" );
	} );

	it( 'has no default in theme.json', () => {
		expect( JSON.parse( read( THEME, 'theme.json' ) ).settings.custom ).not.toHaveProperty( 'selection' );
	} );
} );

describe( 'push guard', () => {
	it( 'accepts neither key', () => {
		expect( check( {} ) ).toEqual( { incomplete: [], problems: [] } );
	} );

	it( 'accepts a readable pair', () => {
		expect( check( { selection: { background: '#000000', colour: '#ffffff' } } ).problems ).toEqual( [] );
	} );

	it( 'refuses a half pair', () => {
		expect( check( { selection: { background: '#000000' } } ).incomplete ).toEqual( [ 'colour' ] );
		expect( check( { selection: { colour: '#ffffff' } } ).incomplete ).toEqual( [ 'background' ] );
	} );

	it( 'refuses an unreadable pair', () => {
		const { problems } = check( { selection: { background: '#777777', colour: '#888888' } } );
		expect( problems.join() ).toMatch( /under 4\.5:1/ );
	} );
} );
