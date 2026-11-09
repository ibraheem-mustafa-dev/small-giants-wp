import { resolvedCssValue } from '../../src/utils/resolved-css-value';
import {
	spacingVar,
	shadowVar,
	fontSizeVar,
	borderRadiusVar,
	transitionVar,
	gapVar,
	colourVar,
} from '../../src/utils/tokens';
import { fontFamilyCssValue, typographyPreviewStyle } from '../../src/utils/typography-preview';

const RESOLVED = [
	'var(--wp--preset--font-size--hero)',
	'var(--sgs-x, 1rem)',
	'calc(1rem + 2px)',
	'min(2rem, 5vw)',
	'max(2rem, 5vw)',
	'clamp(1rem, 2vw + 0.5rem, 3rem)',
	'CLAMP(1rem, 2vw, 3rem)',
	'clamp(1rem, calc(2vw + 1px), min(3rem, 9vw))',
];

const HOSTILE = [
	'var(--x);}body{color:red}',
	'calc(1px) ; color:red',
	'var(--x)<script>',
	'clamp(1px,2px,3px){}',
	'calc(1px) trailing',
	'calc(1px',
	'var(--x) var(--y)',
	'calc(}body{color:red)',
	'var(--x)/* c */',
	'min(url(x), 1px)',
	'calc(1px)' + String.fromCharCode( 92 ),
];

describe( 'resolvedCssValue', () => {
	it.each( RESOLVED )( 'accepts %s', ( value ) => {
		expect( resolvedCssValue( value ) ).toBe( value );
		expect( resolvedCssValue( `  ${ value }  ` ) ).toBe( value );
	} );

	it.each( HOSTILE )( 'negative control: rejects %s', ( value ) => {
		expect( resolvedCssValue( value ) ).toBe( '' );
	} );

	it.each( [ '', 'hero', '16px', '#fff', 'url(x)', null, undefined, 12, {} ] )(
		'refuses a non-function value %p',
		( value ) => {
			expect( resolvedCssValue( value ) ).toBe( '' );
		}
	);
} );

// The contract: every preview token resolver this predicate covers.
const RESOLVERS = {
	spacingVar,
	shadowVar,
	fontSizeVar,
	borderRadiusVar,
	transitionVar,
	gapVar,
	colourVar,
	fontFamilyCssValue,
};

describe( 'token resolvers keep a resolved value', () => {
	for ( const [ name, fn ] of Object.entries( RESOLVERS ) ) {
		it( `${ name } passes var() and calc() unchanged`, () => {
			expect( fn( 'var(--wp--preset--font-size--hero)' ) ).toBe( 'var(--wp--preset--font-size--hero)' );
			if ( 'colourVar' !== name && 'fontFamilyCssValue' !== name ) {
				expect( fn( 'calc(1rem + 2px)' ) ).toBe( 'calc(1rem + 2px)' );
			}
		} );
	}

	it.each( [ 'spacingVar', 'shadowVar', 'fontSizeVar', 'borderRadiusVar', 'transitionVar' ] )(
		'%s never emits a hostile value',
		( name ) => {
			for ( const value of HOSTILE ) {
				expect( RESOLVERS[ name ]( value ) ).toBeUndefined();
			}
		}
	);

	it( 'slugs still wrap', () => {
		expect( fontSizeVar( 'hero' ) ).toBe( 'var(--wp--preset--font-size--hero)' );
		expect( spacingVar( '40' ) ).toBe( 'var(--wp--preset--spacing--40)' );
		expect( shadowVar( 'soft' ) ).toBe( 'var(--wp--preset--shadow--soft)' );
		expect( borderRadiusVar( 'medium' ) ).toBe( 'var(--wp--custom--border-radius--medium)' );
		expect( transitionVar( 'fast' ) ).toBe( 'var(--wp--custom--transition--fast)' );
		expect( fontSizeVar( '' ) ).toBeUndefined();
	} );

	it( 'typography preview keeps a var() size and a slug size', () => {
		expect( typographyPreviewStyle( { fontSize: 'var(--wp--preset--font-size--hero)' } ).fontSize ).toBe(
			'var(--wp--preset--font-size--hero)'
		);
		expect( typographyPreviewStyle( { fontSize: 'hero' } ).fontSize ).toBe( 'var(--wp--preset--font-size--hero)' );
	} );
} );

describe( 'the font size picker stores a preset per device', () => {
	const source = require( 'fs' ).readFileSync(
		require( 'path' ).join( __dirname, '../../src/components/TypographyControls.js' ),
		'utf8'
	);

	it( 'writes the chosen preset to the active device only', () => {
		expect( source ).toContain( 'onPreset: ( slug ) => setOwnValue( slug || undefined )' );
		expect( source ).toContain( 'onPreset: ( slug ) => onFontSizePresetChange( slug, breakpoint )' );
		expect( source ).not.toContain( 'makeResponsive( { desktop: slug } )' );
	} );

	it( 'reads a stored font-size preset var back as that preset', () => {
		expect( source ).toContain( 'FONT_SIZE_PRESET_VAR.exec' );
	} );
} );
