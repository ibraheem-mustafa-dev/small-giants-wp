/**
 * Declared spacing defaults (`block.json::supports.sgs.spacingDefaults`).
 *
 * 1. `spacingDefaultsFor()` reads a block's declaration for one attribute and nothing else.
 * 2. Every block that declares a default paints that same preset from its stylesheet: for each declared side, the
 *    element's base rule in `style.css` reads `var(--wp--preset--spacing--<slug>, <fallback>)` with the declared slug,
 *    and every preset read there carries a fallback, so the shorthand the build folds the sides into stays valid on a
 *    scale without that slug.
 *
 * Negative control: `stylesheetSides()` run on a rule whose side names a different preset, or a bare length, reports
 * that side's slug as different or null, which fails the parity assertion.
 */

jest.mock( '@wordpress/blocks', () => ( { getBlockType: jest.fn() } ) );

const fs = require( 'fs' );
const path = require( 'path' );
const { getBlockType } = require( '@wordpress/blocks' );
const { spacingDefaultsFor } = require( '../../src/utils/spacing-defaults' );

const BLOCKS = path.join( __dirname, '..', '..', 'src', 'blocks' );
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const PRESET = /^var\(\s*--wp--preset--spacing--([\w-]+)\s*(,[^)]*)?\)$/;

describe( 'spacingDefaultsFor', () => {
	afterEach( () => getBlockType.mockReset() );

	it( 'returns the declared sides for the attribute', () => {
		getBlockType.mockReturnValue( {
			supports: { sgs: { spacingDefaults: { pad: { top: 'var(--wp--preset--spacing--30)', left: '' } } } },
		} );
		expect( spacingDefaultsFor( 'sgs/x', 'pad' ) ).toEqual( { top: 'var(--wp--preset--spacing--30)' } );
		expect( getBlockType ).toHaveBeenCalledWith( 'sgs/x' );
	} );

	it( 'returns {} for an undeclared attribute, an unknown block or a malformed entry', () => {
		getBlockType.mockReturnValue( { supports: { sgs: { spacingDefaults: { pad: [ 'x' ] } } } } );
		expect( spacingDefaultsFor( 'sgs/x', 'other' ) ).toEqual( {} );
		expect( spacingDefaultsFor( 'sgs/x', 'pad' ) ).toEqual( {} );
		getBlockType.mockReturnValue( undefined );
		expect( spacingDefaultsFor( 'sgs/missing', 'pad' ) ).toEqual( {} );
	} );
} );

const kebab = ( name ) => name.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();

/** Split a value on top-level whitespace (a var() with a fallback stays one token). */
function tokens( value ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of value.trim() ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( /\s/.test( ch ) && 0 === depth ) {
			if ( cur ) {
				out.push( cur );
			}
			cur = '';
		} else {
			cur += ch;
		}
	}
	if ( cur ) {
		out.push( cur );
	}
	return out;
}

/**
 * The side values a base (not media-conditional) rule ending in `.className` gives `family`.
 *
 * @param {string} css       Stylesheet source.
 * @param {string} className Element class without the dot.
 * @param {string} family    'padding' or 'margin'.
 * @return {Object} `{ side: value }`.
 */
function stylesheetSides( css, className, family ) {
	const sides = {};
	const clean = css.replace( /\/\*[\s\S]*?\*\//g, '' );
	const rule = /([^{}]+)\{([^{}]*)\}/g;
	let match;
	while ( ( match = rule.exec( clean ) ) ) {
		const selectors = match[ 1 ].split( ',' ).map( ( s ) => s.trim() );
		if ( ! selectors.some( ( s ) => new RegExp( `\\.${ className }$` ).test( s ) ) ) {
			continue;
		}
		match[ 2 ].split( ';' ).forEach( ( decl ) => {
			const at = decl.indexOf( ':' );
			if ( at < 0 ) {
				return;
			}
			const prop = decl.slice( 0, at ).trim();
			const value = decl.slice( at + 1 ).trim();
			if ( prop === family ) {
				const t = tokens( value );
				const [ top, right = top, bottom = top, left = right ] = t;
				Object.assign( sides, { top, right, bottom, left } );
			} else if ( prop.startsWith( `${ family }-` ) && SIDES.includes( prop.slice( family.length + 1 ) ) ) {
				sides[ prop.slice( family.length + 1 ) ] = value;
			}
		} );
	}
	return sides;
}

const declaring = fs
	.readdirSync( BLOCKS )
	.map( ( dir ) => [ dir, path.join( BLOCKS, dir, 'block.json' ) ] )
	.filter( ( [ , file ] ) => fs.existsSync( file ) )
	.map( ( [ dir, file ] ) => [ dir, JSON.parse( fs.readFileSync( file, 'utf8' ) ) ] )
	.filter( ( [ , json ] ) => json.supports?.sgs?.spacingDefaults );

const cases = [];
declaring.forEach( ( [ dir, json ] ) => {
	const elements = json.supports.sgs.elements ?? {};
	Object.entries( json.supports.sgs.spacingDefaults ).forEach( ( [ attr, sides ] ) => {
		const [ elementKey, element ] =
			Object.entries( elements ).find( ( [ , el ] ) =>
				Object.entries( el.attrMap ?? {} ).some( ( [ k, v ] ) => v === attr && /^css:(padding|margin)$/.test( k ) )
			) ?? [];
		const family = Object.entries( element?.attrMap ?? {} ).find( ( [ , v ] ) => v === attr )?.[ 0 ].slice( 4 );
		Object.entries( sides ).forEach( ( [ side, value ] ) => {
			cases.push( [ `${ dir }.${ attr }.${ side }`, dir, elementKey, family, side, value ] );
		} );
	} );
} );

describe( 'a declared default is the preset the stylesheet paints', () => {
	it( 'at least one block declares a default (sgs/cart)', () => {
		expect( declaring.map( ( [ dir ] ) => dir ) ).toContain( 'cart' );
	} );

	it.each( cases )( '%s', ( label, dir, elementKey, family, side, value ) => {
		expect( elementKey ).toBeDefined();
		const declared = value.match( /^var\(\s*--wp--preset--spacing--([\w-]+)\s*\)$/ );
		expect( declared ).not.toBeNull();
		const css = fs.readFileSync( path.join( BLOCKS, dir, 'style.css' ), 'utf8' );
		const painted = stylesheetSides( css, `sgs-${ dir }__${ kebab( elementKey ) }`, family )[ side ] ?? '';
		const preset = painted.match( PRESET );
		expect( preset?.[ 1 ] ).toBe( declared[ 1 ] );
		// A fallback on every preset read keeps the folded shorthand valid where the scale lacks the slug.
		expect( preset?.[ 2 ] ).toMatch( /^,\s*\S+/ );
	} );

	it( 'negative control: a different preset, a bare preset or a length on the side is caught', () => {
		const css = '.x .sgs-a__b { padding: var(--wp--preset--spacing--30, 1rem) 20px; padding-bottom: var(--wp--preset--spacing--40); }';
		const sides = stylesheetSides( css, 'sgs-a__b', 'padding' );
		expect( sides.top.match( PRESET )[ 1 ] ).toBe( '30' );
		expect( sides.top.match( PRESET )[ 1 ] ).not.toBe( '40' );
		expect( sides.right.match( PRESET ) ).toBeNull();
		expect( sides.bottom.match( PRESET )[ 2 ] ).toBeUndefined();
	} );
} );
