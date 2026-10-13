/**
 * The shared motion schema extract (Spec 38A): the editor bundles reach `generated-motion-defs.json` only through the
 * `@sgs/motion-defs` id, which the script config's dependency-extraction plugin maps to the `window.sgsMotionDefs`
 * global and the `sgs-motion-defs` handle; one entry (`motion-defs/index`) carries the JSON and PHP registers that
 * handle. Each assertion below fails if one side of that wiring drifts from the others.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const MOTION_DIR = path.join( PLUGIN, 'src', 'components', 'motion' );
const REQUEST = '@sgs/motion-defs';
const GLOBAL = 'sgsMotionDefs';
const HANDLE = 'sgs-motion-defs';

/**
 * Every .js file under `dir`, recursively.
 * @param {string} dir Folder to walk.
 */
function jsFiles( dir ) {
	return fs
		.readdirSync( dir, { withFileTypes: true } )
		.flatMap( ( entry ) => {
			const full = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				return jsFiles( full );
			}
			return /\.js$/.test( entry.name ) ? [ full ] : [];
		} );
}

/** The webpack configs, loaded with the cwd wp-scripts runs from. */
function loadConfigs() {
	const cwd = process.cwd();
	process.chdir( PLUGIN );
	try {
		process.argv.push( '--experimental-modules' );
		jest.isolateModules( () => {
			loadConfigs.result = require(
				path.join( PLUGIN, 'webpack.config.js' )
			);
		} );
	} finally {
		process.argv.splice(
			process.argv.indexOf( '--experimental-modules' ),
			1
		);
		process.chdir( cwd );
	}
	return Array.isArray( loadConfigs.result )
		? loadConfigs.result
		: [ loadConfigs.result ];
}

describe( 'the @sgs/motion-defs external', () => {
	const configs = loadConfigs();
	const scriptConfig = configs.find( ( c ) => c.output?.module !== true );
	const extraction = scriptConfig.plugins.find(
		( p ) => p?.constructor?.name === 'DependencyExtractionWebpackPlugin'
	);

	test( 'maps the id to the global and the handle', () => {
		expect( extraction.options.requestToExternal( REQUEST ) ).toBe(
			GLOBAL
		);
		expect( extraction.options.requestToHandle( REQUEST ) ).toBe( HANDLE );
	} );

	test( 'leaves every other request to the plugin defaults', () => {
		expect(
			extraction.options.requestToExternal( '@wordpress/blocks' )
		).toBeUndefined();
		expect(
			extraction.options.requestToHandle( '@wordpress/blocks' )
		).toBeUndefined();
		expect( extraction.options.useDefaults ).not.toBe( false );
	} );

	test( 'the script config keeps exactly one dependency-extraction plugin', () => {
		const count = scriptConfig.plugins.filter(
			( p ) =>
				p?.constructor?.name === 'DependencyExtractionWebpackPlugin'
		).length;
		expect( count ).toBe( 1 );
	} );

	test( 'the motion-defs entry builds the global from the generated JSON', () => {
		const entries = scriptConfig.entry();
		expect( entries[ 'motion-defs/index' ] ).toBe(
			path.join( MOTION_DIR, 'motion-defs-global.js' )
		);
		const source = fs.readFileSync(
			path.join( MOTION_DIR, 'motion-defs-global.js' ),
			'utf8'
		);
		expect( source ).toContain( "from './generated-motion-defs.json'" );
		expect( source ).toContain( `window.${ GLOBAL } = defs` );
	} );

	test( 'PHP registers the same handle from the built entry', () => {
		const php = fs.readFileSync(
			path.join( PLUGIN, 'includes', 'motion', 'motion-defs-script.php' ),
			'utf8'
		);
		expect( php ).toContain( `'${ HANDLE }'` );
		expect( php ).toContain( "'build/motion-defs/index.js'" );
		expect( php ).toContain( "'build/motion-defs/index.asset.php'" );
	} );
} );

describe( 'who imports the extract', () => {
	const files = jsFiles( path.join( PLUGIN, 'src' ) );
	const rel = ( f ) => path.relative( PLUGIN, f ).replace( /\\/g, '/' );

	test( 'only motion-defs-global.js imports the JSON', () => {
		const importers = files
			.filter( ( f ) =>
				/from\s+['"][^'"]*generated-motion-defs\.json['"]/.test(
					fs.readFileSync( f, 'utf8' )
				)
			)
			.map( rel );
		expect( importers ).toEqual( [
			'src/components/motion/motion-defs-global.js',
		] );
	} );

	test( 'only motion-defs.js imports the id', () => {
		const importers = files
			.filter( ( f ) =>
				fs.readFileSync( f, 'utf8' ).includes( `'${ REQUEST }'` )
			)
			.map( rel );
		expect( importers ).toEqual( [
			'src/components/motion/motion-defs.js',
		] );
	} );

	test( 'in Jest the id resolves to the generated JSON', () => {
		const viaModule =
			require( '../../src/components/motion/motion-defs' ).default;
		const json = require( '../../src/components/motion/generated-motion-defs.json' );
		expect( viaModule ).toBe( json );
		expect( viaModule.$defs.tokenReference ).toBeDefined();
	} );
} );
