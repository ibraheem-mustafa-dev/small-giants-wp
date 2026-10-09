/**
 * Brand registry parity (icon plan Phase A step 5): PHP and the editor read the same
 * includes/data/brand-registry.json and derive the same things from it. Runs the PHP side
 * (tests/php/fixtures/brand-registry-dump.php) and compares, value for value, with the JS twins: the registry as
 * read, each brand's D5 paint, the accessible-name chain and the length allowlist. Also asserts no shipped source
 * outside the registry carries the brand path or colour list.
 *
 * Negative control: 'a planted divergence is caught' feeds the comparison a changed paint and expects it to differ.
 */

const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

import { BRANDS, brandPaint, brandPaintHold, brandBySlug } from '../../src/utils/brand-registry';
import { accessibleName, iconLengthValue } from '../../src/blocks/icon/icon-state';
import { enabledIconSources } from '../../src/components/IconPicker/icon-data';

const PLUGIN = path.resolve( __dirname, '..', '..' );

const NAME_CASES = [
	{ ariaLabel: 'Mine', boundKey: 'phone', url: 'tel:1' },
	{ boundKey: 'socials.whatsapp', url: 'https://wa.me/1' },
	{ boundKey: 'address', url: 'https://maps.example' },
	{ glyph: 'instagram', url: 'https://instagram.com/x' },
	{ url: 'tel:+44121' },
	{ url: 'MAILTO:a@b.test' },
	{ url: 'https://www.example.test/a' },
	{ url: '/contact' },
	{ glyph: 'phone', url: '' },
];
const LENGTHS = [ '40px', 24, 24.5, '9999px', '99rem', '150%', '1.5em', 'x;}a{', '-1px', 'calc(1px)', 'var(--wp--preset--spacing--30)', 'var(--x)', '50', '' ];

let php;

beforeAll( () => {
	const input = path.join( os.tmpdir(), `sgs-brand-parity-${ process.pid }.json` );
	fs.writeFileSync( input, JSON.stringify( { names: NAME_CASES, lengths: LENGTHS } ) );
	try {
		php = JSON.parse( execFileSync( 'php', [ path.join( PLUGIN, 'tests/php/fixtures/brand-registry-dump.php' ), input ], { encoding: 'utf8' } ) );
	} finally {
		fs.unlinkSync( input );
	}
} );

const jsPaint = ( brand, fixed, mode = 'brand' ) => {
	const p = brandPaint( brand, fixed, mode );
	return {
		ground: p.ground,
		glyph: p.glyph,
		border: p.border,
		ground_hover: p.groundHover,
		glyph_hover: p.glyphHover,
		fixed: p.fixed,
		border_hover: p.borderHover,
		ring: p.ring,
		gradient: p.gradient,
	};
};

describe( 'brand registry parity', () => {
	it( 'both sides read the same entries in the same order', () => {
		expect( BRANDS.map( ( b ) => ( { slug: b.slug, label: b.label, siteInfoKey: b.siteInfoKey, autoLabel: b.autoLabel, colour: b.colour, logoGradient: b.logoGradient, groundGradient: b.groundGradient } ) ) ).toEqual( php.registry );
	} );

	it( 'every brand paints the same (D5)', () => {
		BRANDS.forEach( ( brand ) => {
			expect( jsPaint( brand, false ) ).toEqual( php.paint[ brand.slug ].plain );
			expect( jsPaint( brand, true ) ).toEqual( php.paint[ brand.slug ].fixed );
		} );
	} );

	it( 'every brand paints the same in logo-only mode', () => {
		BRANDS.forEach( ( brand ) => {
			expect( jsPaint( brand, false, 'brand-glyph' ) ).toEqual( php.paint[ brand.slug ].glyph );
			expect( jsPaint( brand, true, 'brand-glyph' ) ).toEqual( php.paint[ brand.slug ].glyphFixed );
		} );
		expect( jsPaint( brandBySlug( 'instagram' ), false, 'brand-glyph' ).gradient ).toMatch( /^linear-gradient\(/ );
	} );

	it( 'holding the brand colours on hover paints the same, and Instagram has its gradient ground', () => {
		BRANDS.forEach( ( brand ) => {
			const held = brandPaintHold( brandPaint( brand, false ) );
			expect( { ground_hover: held.groundHover, glyph_hover: held.glyphHover } ).toEqual( { ground_hover: php.paint[ brand.slug ].hold.ground_hover, glyph_hover: php.paint[ brand.slug ].hold.glyph_hover } );
			expect( held.groundHover ).toBe( held.ground );
		} );
		expect( brandBySlug( 'instagram' ).groundGradient ).toMatch( /^radial-gradient\(circle at 30% 107%, #FDF497 0%/ );
		expect( brandBySlug( 'whatsapp' ).groundGradient ).toBe( '' );
	} );

	it( 'a planted divergence is caught', () => {
		const whatsapp = brandBySlug( 'whatsapp' );
		const tampered = { ...jsPaint( whatsapp, false ), glyph: '#FFFFFF' };
		expect( tampered ).not.toEqual( php.paint.whatsapp.plain );
	} );

	it( 'the accessible-name chain matches', () => {
		const js = NAME_CASES.map( ( c ) => accessibleName( { ...c, glyphBrand: c.glyph ? brandBySlug( c.glyph ) : null } ).name );
		expect( js ).toEqual( php.names );
	} );

	it( 'the length allowlist matches', () => {
		expect( LENGTHS.map( ( v ) => iconLengthValue( v, 512, [] ) ) ).toEqual( php.lengths );
	} );

	it( 'no other shipped source copies the brand list', () => {
		const whatsappPath = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967';
		const offenders = [];
		const walk = ( dir ) => {
			for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
				const full = path.join( dir, entry.name );
				if ( entry.isDirectory() ) {
					walk( full );
				} else if ( /\.(js|php)$/.test( entry.name ) && fs.readFileSync( full, 'utf8' ).includes( whatsappPath ) ) {
					offenders.push( path.relative( PLUGIN, full ).replace( /\\/g, '/' ) );
				}
			}
		};
		walk( path.join( PLUGIN, 'src' ) );
		walk( path.join( PLUGIN, 'includes' ) );
		expect( offenders ).toEqual( [] );
	} );

	it( 'the Brands picker tab is opt-in', () => {
		expect( enabledIconSources().map( ( s ) => s.key ) ).not.toContain( 'brand' );
		expect( enabledIconSources( [ 'lucide', 'brand' ] ).map( ( s ) => s.key ) ).toEqual( [ 'lucide', 'brand' ] );
	} );
} );
