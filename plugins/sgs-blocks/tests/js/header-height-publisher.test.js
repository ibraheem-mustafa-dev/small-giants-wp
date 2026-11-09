/**
 * --sgs-header-height is inherited, so a write on :root restyles the whole page. The resting value is written to :root only when it rises,
 * flips to 0 or the viewport resizes; the live value reaches scroll-padding through a non-inheriting property and each consumer element directly.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const read = ( rel ) => fs.readFileSync( path.resolve( __dirname, '..', '..', rel ), 'utf8' );
const source = read( 'src/header-behaviours/view.js' );

test( 'the resting height is written to the root element only', () => {
	expect( source ).toContain( "document.documentElement.style.setProperty( '--sgs-header-height', Math.round( bottomEdge ) + 'px' )" );
	expect( source ).not.toMatch( /document\.body\.style\.setProperty\(\s*'--sgs-header-height'/ );
} );

test( 'a lower resting value is ignored while scrolled unless the publish is exact', () => {
	expect( source ).toMatch( /true !== exact &&\s*null !== published &&\s*edge > 0 &&\s*edge < published &&\s*window\.scrollY > 0/ );
	expect( source ).toMatch( /if \( edge === published \) \{\s*return;\s*\}/ );
} );

test( 'the live value goes to the root property and to every consumer element found from the stylesheets', () => {
	expect( source ).toContain( "setProperty( '--sgs-header-height-live', px )" );
	expect( source ).toContain( 'liveHeight.set( px )' );
	expect( source ).toContain( 'document.styleSheets' );
	expect( source ).toMatch( /el\.style\.setProperty\( '--sgs-header-height', value \)/ );
} );

test( 'both stylesheets register the live property non-inheriting and scroll-padding reads it', () => {
	for ( const rel of [ 'assets/css/header-behaviours.css', '../../theme/sgs-theme/assets/css/utilities.css' ] ) {
		const css = read( rel );
		expect( css ).toMatch( /@property --sgs-header-height-live \{\s*syntax: '\*';\s*inherits: false;\s*\}/ );
		expect( css ).toMatch( /scroll-padding-top: [^;]*var\(\s*--sgs-header-height-live/ );
	}
} );
