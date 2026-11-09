/**
 * --sgs-header-height is inherited, so every write restyles the whole page. The publisher writes it to :root only, skips an unchanged value,
 * and ignores a lower value while the page is scrolled (the header shrinking), so the shrink does not restyle the page.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const source = fs.readFileSync( path.resolve( __dirname, '..', '..', 'src/header-behaviours/view.js' ), 'utf8' );

test( 'the height is written to the root element only', () => {
	expect( source ).toContain( "document.documentElement.style.setProperty( '--sgs-header-height', value )" );
	expect( source ).not.toMatch( /document\.body\.style\.setProperty\(\s*'--sgs-header-height'/ );
} );

test( 'an unchanged value is not written', () => {
	expect( source ).toMatch( /if \( edge === published \) \{\s*return;\s*\}/ );
} );

test( 'a lower value is ignored while scrolled unless the publish is exact', () => {
	expect( source ).toMatch( /true !== exact &&\s*null !== published &&\s*edge > 0 &&\s*edge < published &&\s*window\.scrollY > 0/ );
	expect( source.match( /publishGated\( true \)/g ).length ).toBeGreaterThanOrEqual( 2 );
} );
