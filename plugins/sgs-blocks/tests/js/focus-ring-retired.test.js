/**
 * The per-block "Focus ring" toggle (sgsFocusRing) is retired: the unified focus system
 * (theme/sgs-theme/assets/css/focus.css) rings every focusable element on its own.
 * These assertions fail while any trace of the toggle, its class or its default survives.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.join( __dirname, '..', '..' );
const read = ( rel ) => fs.readFileSync( path.join( root, rel ), 'utf8' );

describe( 'sgsFocusRing is retired', () => {
	it( 'is not in the extension roster', () => {
		const roster = JSON.parse( read( 'src/blocks/extensions/extension-roster.json' ) );
		expect( JSON.stringify( roster ) ).not.toContain( 'sgsFocusRing' );
	} );

	it( 'has no control, attribute or default in the hover-effects extension', () => {
		const files = [
			'src/blocks/extensions/hover-effects/attributes.js',
			'src/blocks/extensions/hover-effects/index.js',
			'src/blocks/extensions/hover-effects/resolve.js',
			'src/blocks/extensions/hover-effects/panels/HoverPanel.js',
		];
		files.forEach( ( file ) => {
			const src = read( file );
			expect( { file, hit: /sgsFocusRing|focusRing/.test( src ) } ).toEqual( { file, hit: false } );
		} );
		expect( read( 'src/blocks/extensions/hover-effects/panels/HoverPanel.js' ) ).not.toContain( 'focus ring' );
	} );

	it( 'is not declared as a hoverDefaults entry by any block', () => {
		const blocksDir = path.join( root, 'src', 'blocks' );
		const offenders = fs
			.readdirSync( blocksDir )
			.map( ( dir ) => path.join( blocksDir, dir, 'block.json' ) )
			.filter( ( file ) => fs.existsSync( file ) )
			.filter( ( file ) => {
				const json = JSON.parse( fs.readFileSync( file, 'utf8' ) );
				return Object.prototype.hasOwnProperty.call( json?.supports?.sgs?.hoverDefaults ?? {}, 'focusRing' );
			} )
			.map( ( file ) => path.relative( root, file ) );
		expect( offenders ).toEqual( [] );
	} );

	it( 'leaves no sgs-has-focus-ring class in the stylesheet or the PHP class builder', () => {
		expect( read( 'assets/css/extensions.css' ) ).not.toContain( 'sgs-has-focus-ring' );
		expect( read( 'includes/hover-effects/classes.php' ) ).not.toContain( 'sgs-has-focus-ring' );
		expect( read( 'includes/hover-effects/hover-effects.php' ) ).not.toContain( 'sgsFocusRing' );
	} );
} );
