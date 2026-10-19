/**
 * Branded scrollbars: contract for theme/sgs-theme/assets/css/scrollbars.css and the blocks that read it (Spec 32 FR-32-26).
 *
 * Asserts that:
 *   - the `:where(*)` rule declares `scrollbar-color` from the two scope properties, so every scroller (and the page's own
 *     bar) takes the brand colours and a scope can override them by setting `--sgs-scrollbar-thumb` / `--sgs-scrollbar-track`;
 *   - the light and dark scopes set the thumb from the snapshot tokens `--wp--custom--scrollbar--thumb` and `--thumb-on-dark`;
 *   - `sgs-scrollbar-native` returns a scroller to the browser's own bar;
 *   - inner scrollers lose their arrow buttons (`:where(body *)::-webkit-scrollbar-button`);
 *   - the retired 35% ink mix and its `--sgs-nd-scrollbar-ink` property exist nowhere in the plugin or theme source;
 *   - the nav drawer paints its thumb from `--sgs-scrollbar-thumb` and keeps the arrow-free webkit parts by resetting
 *     `scrollbar-color` to `auto` where `::-webkit-scrollbar` is supported;
 *   - every `::-webkit-scrollbar { display: none }` has its `scrollbar-width: none` pair on the same element (Chrome 121+
 *     ignores the webkit parts once `scrollbar-color` is set, so the standard property is what keeps the bar hidden);
 *   - the theme enqueues the stylesheet synchronously and adds it to the editor, and theme.json carries the three defaults.
 * Each check also runs against a planted fault (negative control), so a check that cannot fail fails here.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const REPO = path.resolve( __dirname, '..', '..', '..', '..' );
const THEME = path.join( REPO, 'theme', 'sgs-theme' );
const PLUGIN = path.join( REPO, 'plugins', 'sgs-blocks' );
const SCROLLBARS_CSS = path.join( THEME, 'assets', 'css', 'scrollbars.css' );
const RETIRED_PROPERTY = [ '--sgs-nd', 'scrollbar-ink' ].join( '-' );

/**
 * Every file under a folder with one of the extensions, skipping build output and dependencies.
 *
 * @param {string}   dir        Folder to walk.
 * @param {string[]} extensions Extensions including the dot.
 * @return {string[]} Absolute paths.
 */
function filesUnder( dir, extensions ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		if ( [ 'node_modules', 'build', 'vendor' ].includes( entry.name ) ) {
			continue;
		}
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...filesUnder( full, extensions ) );
		} else if ( extensions.includes( path.extname( entry.name ) ) ) {
			out.push( full );
		}
	}
	return out;
}

/**
 * Declarations of the rules whose selector list holds the selector (after whitespace is collapsed).
 *
 * @param {string} css      Stylesheet source.
 * @param {string} selector One selector of the list.
 * @return {Object<string,string>} Property to value (the last write wins).
 */
function declarationsOf( css, selector ) {
	const found = {};
	postcss.parse( css ).walkRules( ( rule ) => {
		if ( ! rule.selectors.some( ( s ) => s.replace( /\s+/g, ' ' ).trim() === selector ) ) {
			return;
		}
		rule.walkDecls( ( decl ) => {
			found[ decl.prop ] = decl.value.replace( /\s+/g, ' ' );
		} );
	} );
	return found;
}

/**
 * The base selectors whose `::-webkit-scrollbar` is hidden with `display: none` but whose `scrollbar-width: none` is missing.
 *
 * @param {string} css Stylesheet source.
 * @return {string[]} Base selectors without the pair.
 */
function hiddenBarsWithoutPair( css ) {
	const unpaired = [];
	postcss.parse( css ).walkRules( ( rule ) => {
		const hides = rule.nodes.some( ( n ) => n.type === 'decl' && n.prop === 'display' && n.value === 'none' );
		if ( ! hides ) {
			return;
		}
		for ( const selector of rule.selectors ) {
			const normalised = selector.replace( /\s+/g, ' ' ).trim();
			if ( ! normalised.endsWith( '::-webkit-scrollbar' ) ) {
				continue;
			}
			const base = normalised.slice( 0, -'::-webkit-scrollbar'.length );
			if ( 'none' !== declarationsOf( css, base )[ 'scrollbar-width' ] ) {
				unpaired.push( base );
			}
		}
	} );
	return unpaired;
}

describe( 'scrollbars.css', () => {
	const css = fs.readFileSync( SCROLLBARS_CSS, 'utf8' );

	it( 'paints every scroller from the two scope properties through :where(*)', () => {
		const decls = declarationsOf( css, ':where(*)' );
		expect( decls[ 'scrollbar-color' ] ).toBe( 'var(--sgs-scrollbar-thumb) var(--sgs-scrollbar-track)' );
	} );

	it( 'also sets the colour on :root so the page bar takes it', () => {
		expect( declarationsOf( css, ':root' )[ 'scrollbar-color' ] ).toBe( 'var(--sgs-scrollbar-thumb) var(--sgs-scrollbar-track)' );
	} );

	it( 'reads the snapshot tokens for the light and dark scopes', () => {
		const light = declarationsOf( css, ':root' )[ '--sgs-scrollbar-thumb' ];
		expect( light ).toContain( 'var(--wp--custom--scrollbar--thumb,' );
		expect( declarationsOf( css, ':root' )[ '--sgs-scrollbar-track' ] ).toContain( 'var(--wp--custom--scrollbar--track,' );
		expect( declarationsOf( css, '.sgs-on-dark' )[ '--sgs-scrollbar-thumb' ] ).toContain( 'var(--wp--custom--scrollbar--thumb-on-dark,' );
	} );

	it( 'lets sgs-scrollbar-native return a scroller to the browser bar', () => {
		expect( declarationsOf( css, ':where(.sgs-scrollbar-native)' )[ 'scrollbar-color' ] ).toBe( 'auto' );
		expect( declarationsOf( css, ':where(.sgs-scrollbar-native *)' )[ 'scrollbar-color' ] ).toBe( 'auto' );
	} );

	it( 'removes the arrow buttons from inner scrollers only', () => {
		expect( declarationsOf( css, ':where(body *)::-webkit-scrollbar-button' ).display ).toBe( 'none' );
	} );

	it( 'negative control: a stylesheet without the rule reports nothing', () => {
		expect( declarationsOf( ':root{color:red}', ':where(*)' )[ 'scrollbar-color' ] ).toBeUndefined();
	} );
} );

describe( 'the retired drawer ink mix', () => {
	const sources = [
		...filesUnder( path.join( PLUGIN, 'src' ), [ '.css', '.php', '.js', '.json' ] ),
		...filesUnder( path.join( PLUGIN, 'includes' ), [ '.css', '.php', '.js', '.json' ] ),
		...filesUnder( THEME, [ '.css', '.php', '.js', '.json' ] ),
	];

	it( 'leaves the property in no source file', () => {
		const offenders = sources.filter( ( file ) => fs.readFileSync( file, 'utf8' ).includes( RETIRED_PROPERTY ) );
		expect( offenders ).toEqual( [] );
	} );

	it( 'leaves no 35% colour-mix on the drawer thumb', () => {
		const drawer = fs.readFileSync( path.join( PLUGIN, 'src', 'blocks', 'nav-drawer', 'style.css' ), 'utf8' );
		expect( drawer ).not.toMatch( /color-mix\([^)]*35%/ );
	} );
} );

describe( 'nav drawer scrollbar', () => {
	const css = fs.readFileSync( path.join( PLUGIN, 'src', 'blocks', 'nav-drawer', 'style.css' ), 'utf8' );

	it( 'paints the webkit thumb from the scope property', () => {
		const thumb = declarationsOf( css, '.wp-block-sgs-nav-drawer::-webkit-scrollbar-thumb' );
		expect( thumb[ 'background-color' ] ).toBe( 'var(--sgs-scrollbar-thumb)' );
	} );

	it( 'resets scrollbar-color to auto where the webkit parts exist, so Chrome keeps them', () => {
		let reset = null;
		postcss.parse( css ).walkAtRules( 'supports', ( at ) => {
			if ( at.params.replace( /\s+/g, ' ' ) === 'selector(::-webkit-scrollbar)' ) {
				reset = declarationsOf( at.toString(), '.wp-block-sgs-nav-drawer' );
			}
		} );
		expect( reset ).not.toBeNull();
		expect( reset[ 'scrollbar-color' ] ).toBe( 'auto' );
	} );
} );

describe( 'hidden scrollbars', () => {
	it( 'pair every ::-webkit-scrollbar display:none with scrollbar-width:none', () => {
		const files = [ ...filesUnder( path.join( PLUGIN, 'src' ), [ '.css' ] ), ...filesUnder( THEME, [ '.css' ] ) ];
		const unpaired = [];
		for ( const file of files ) {
			for ( const base of hiddenBarsWithoutPair( fs.readFileSync( file, 'utf8' ) ) ) {
				unpaired.push( `${ path.relative( REPO, file ) }: ${ base }` );
			}
		}
		expect( unpaired ).toEqual( [] );
	} );

	it( 'negative control: an unpaired hidden bar is found, a paired one is not', () => {
		expect( hiddenBarsWithoutPair( '.a::-webkit-scrollbar{display:none}' ) ).toEqual( [ '.a' ] );
		expect( hiddenBarsWithoutPair( '.a{scrollbar-width:none}.a::-webkit-scrollbar{display:none}' ) ).toEqual( [] );
	} );
} );

describe( 'theme wiring', () => {
	const functions = fs.readFileSync( path.join( THEME, 'functions.php' ), 'utf8' );
	const themeJson = JSON.parse( fs.readFileSync( path.join( THEME, 'theme.json' ), 'utf8' ) );

	it( 'enqueues the stylesheet on the frontend and in the editor', () => {
		expect( functions ).toContain( "get_theme_file_uri( 'assets/css/scrollbars.css' )" );
		expect( functions ).toContain( "add_editor_style( 'assets/css/scrollbars.css' )" );
	} );

	it( 'carries the three defaults in theme.json', () => {
		expect( themeJson.settings.custom.scrollbar ).toEqual( {
			thumb: 'var(--wp--preset--color--primary)',
			thumbOnDark: 'var(--wp--preset--color--accent)',
			track: 'transparent',
		} );
	} );
} );
