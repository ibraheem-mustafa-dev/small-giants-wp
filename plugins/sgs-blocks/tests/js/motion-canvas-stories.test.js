/**
 * The canvas stories (Spec 38A §11, M3.6): `includes/motion/data/canvas-stories.json`, which tells
 * `class-sgs-motion-story-styles.php` which effect stylesheets the editor canvas needs, has one entry per story file
 * under `src/blocks/extensions/motion/stories/` and one story file per entry, and `stories/index.js` reads the same list.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const manifest = require( '../../includes/motion/data/canvas-stories.json' );
const {
	canvasStories,
} = require( '../../src/blocks/extensions/motion/stories' );

describe( 'the canvas stories', () => {
	it( 'has one manifest entry per story file and one story file per entry', () => {
		const dir = path.join( __dirname, '../../src/blocks/extensions/motion/stories' );
		const files = fs
			.readdirSync( dir )
			.filter( ( name ) => name.endsWith( '.js' ) && name !== 'index.js' )
			.map( ( name ) => name.replace( /\.js$/, '' ) )
			.sort();
		expect( Object.keys( manifest.stories ).sort() ).toEqual( files );
		expect( [ ...canvasStories() ].sort() ).toEqual( files );
	} );

	it( 'marks each story with a boolean stylesheet need', () => {
		Object.entries( manifest.stories ).forEach( ( [ effect, story ] ) =>
			expect( [ effect, typeof story.stylesheet ] ).toEqual( [ effect, 'boolean' ] )
		);
	} );
} );
