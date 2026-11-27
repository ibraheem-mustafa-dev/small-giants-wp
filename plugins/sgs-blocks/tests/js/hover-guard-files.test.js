/**
 * The touch hover guard rewrites the stylesheet WordPress actually serves for each block: block.json names
 * `style-index.css` (webpack's output), while copy-built-styles.js also writes a `style.css` copy.
 */
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const { findStyleCssFiles } = require( '../../scripts/hover-guard/run-transform.js' );
const { handWrittenStylesheets } = require( '../../scripts/hover-guard/sources.js' );
const { transformCss, auditCss } = require( '../../scripts/hover-guard/transform.js' );

describe( 'hover-guard findStyleCssFiles', () => {
	it( 'collects style-index.css, style.css and their rtl twins in every block folder', () => {
		const base = fs.mkdtempSync( path.join( os.tmpdir(), 'hover-guard-' ) );
		const block = path.join( base, 'buybox' );
		fs.mkdirSync( block );
		for ( const name of [ 'style-index.css', 'style.css', 'style-index-rtl.css', 'style-rtl.css', 'index.css' ] ) {
			fs.writeFileSync( path.join( block, name ), 'a:hover{transform:none}' );
		}
		const found = findStyleCssFiles( base ).map( ( f ) => path.basename( f ) ).sort();
		fs.rmSync( base, { recursive: true, force: true } );
		expect( found ).toEqual( [ 'style-index-rtl.css', 'style-index.css', 'style-rtl.css', 'style.css' ] );
	} );
} );

describe( 'hover-guard handWrittenStylesheets', () => {
	it( 'covers every hand-written stylesheet under the plugin and theme assets, at any depth', () => {
		const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'hover-guard-src-' ) );
		const write = ( rel ) => {
			const file = path.join( repo, rel );
			fs.mkdirSync( path.dirname( file ), { recursive: true } );
			fs.writeFileSync( file, 'a{color:red}' );
		};
		[
			'plugins/sgs-blocks/assets/css/motion.css',
			'plugins/sgs-blocks/assets/toast/toast.css',
			'plugins/sgs-blocks/assets/floating-ui/floating-ui.css',
			'plugins/sgs-blocks/assets/deep/er/still.css',
			'plugins/sgs-blocks/assets/css/motion.min.css',
			'plugins/sgs-blocks/assets/vendor/lib/lib.css',
			'plugins/sgs-blocks/assets/admin/screen.css',
			'theme/sgs-theme/assets/css/focus.css',
			'theme/sgs-theme/assets/later/new.css',
			'theme/sgs-theme/style.css',
		].forEach( write );
		const found = handWrittenStylesheets( repo ).map( ( f ) => path.relative( repo, f ).split( path.sep ).join( '/' ) ).sort();
		fs.rmSync( repo, { recursive: true, force: true } );
		expect( found ).toEqual( [
			'plugins/sgs-blocks/assets/css/motion.css',
			'plugins/sgs-blocks/assets/deep/er/still.css',
			'plugins/sgs-blocks/assets/floating-ui/floating-ui.css',
			'plugins/sgs-blocks/assets/toast/toast.css',
			'theme/sgs-theme/assets/css/focus.css',
			'theme/sgs-theme/assets/later/new.css',
			'theme/sgs-theme/style.css',
		] );
	} );

	it( 'reaches toast.css and floating-ui.css, and every repo stylesheet already follows the contract', () => {
		const files = handWrittenStylesheets();
		const names = files.map( ( f ) => path.relative( path.resolve( __dirname, '../../../..' ), f ).split( path.sep ).join( '/' ) );
		expect( names ).toContain( 'plugins/sgs-blocks/assets/toast/toast.css' );
		expect( names ).toContain( 'plugins/sgs-blocks/assets/floating-ui/floating-ui.css' );
		for ( const file of files ) {
			const css = fs.readFileSync( file, 'utf8' );
			expect( auditCss( css, file ).findings ).toEqual( [] );
			expect( transformCss( css, file ).css ).toBe( css );
		}
	} );
} );
