/**
 * No block.json may list a context key nothing reads. The three keys below
 * were declared with no consumer in any edit.js, render.php or view.js.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const DEAD_KEYS = [ 'sgs/formId', 'sgs/tabsOrientation', 'sgs/tabsStyle' ];
const BLOCKS_DIR = path.join( __dirname, '..', '..', 'src', 'blocks' );

describe( 'dead context keys', () => {
	const files = fs
		.readdirSync( BLOCKS_DIR )
		.map( ( slug ) => path.join( BLOCKS_DIR, slug, 'block.json' ) )
		.filter( ( file ) => fs.existsSync( file ) );

	test.each( DEAD_KEYS )( 'no block.json uses or provides %s', ( key ) => {
		const offenders = files.filter( ( file ) => {
			const json = JSON.parse( fs.readFileSync( file, 'utf8' ) );
			return (
				( json.usesContext || [] ).includes( key ) ||
				Object.prototype.hasOwnProperty.call( json.providesContext || {}, key )
			);
		} );
		expect( offenders.map( ( f ) => path.basename( path.dirname( f ) ) ) ).toEqual( [] );
	} );
} );
