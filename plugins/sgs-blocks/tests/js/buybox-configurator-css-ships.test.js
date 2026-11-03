/**
 * The Pick a set rules must reach the front end: wp-scripts puts `style.css` (and what it @imports) in
 * style-index.css, which the front end loads, and every other import in index.css, which only the editor loads.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join( __dirname, '../../src/blocks/buybox' );
const BUILD = path.join( __dirname, '../../build/blocks/buybox/style-index.css' );

describe( 'buybox configurator stylesheet', () => {
	test( 'style.css imports it and index.js does not (an index.js import ships to the editor only)', () => {
		expect( fs.readFileSync( path.join( SRC, 'style.css' ), 'utf8' ) ).toMatch( /@import\s+"\.\/configurator\.css";/ );
		expect( fs.readFileSync( path.join( SRC, 'index.js' ), 'utf8' ) ).not.toMatch( /configurator\.css/ );
	} );

	( fs.existsSync( BUILD ) ? test : test.skip )( 'the built front-end stylesheet carries the configurator rules', () => {
		const css = fs.readFileSync( BUILD, 'utf8' );
		expect( css ).toContain( 'sgs-buybox-pick__option' );
		expect( css ).toContain( 'sgs-buybox-pick__preview-box' );
	} );
} );
