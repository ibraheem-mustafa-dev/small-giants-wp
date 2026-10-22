/**
 * A static label (floatingLabel off) takes none of the floating label's resting, focus or filled colour and type
 * rules: every floating selector in form/style.css names `:not(.sgs-form-field--static-label)`, inside `:where()` so
 * its specificity does not change.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync( join( __dirname, '../../src/blocks/form/style.css' ), 'utf8' );
const start = css.indexOf( 'Floating Labels (Feature #148)' );
const end = css.indexOf( '/* Floating-label placeholder management.' );
const section = css.slice( start, end );
const selectors = section
	.split( '{' )
	.slice( 0, -1 )
	.flatMap( ( chunk ) => chunk.split( '}' ).pop().split( ',' ) )
	.map( ( selector ) => selector.trim() )
	.filter( ( selector ) => /\.sgs-form-field--(text|email|phone|number|textarea)/.test( selector ) && selector.includes( '.sgs-form-field__label' ) );

test( 'the floating label section was found and holds label selectors', () => {
	expect( start ).toBeGreaterThan( 0 );
	expect( selectors.length ).toBeGreaterThan( 10 );
} );

test( 'every floating label selector excludes a static label at zero specificity', () => {
	const unguarded = selectors.filter( ( selector ) => ! selector.includes( ':where(:not(.sgs-form-field--static-label))' ) );
	expect( unguarded ).toEqual( [] );
} );
