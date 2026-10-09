/**
 * Icon hover-move, motion and shadow parity: PHP (includes/helpers-icon-motion.php, through
 * tests/php/fixtures/icon-motion-dump.php) and the editor twin (src/blocks/icon/icon-motion.js) derive the same custom
 * properties from the same stored attributes, for an icon and for a social-icons row.
 *
 * Negative control: 'a planted divergence is caught' feeds the comparison a changed value and expects it to differ.
 */

const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );

import { ICON_MOTION_NAMES, ROW_MOTION_NAMES, iconMotionStyle, iconShadowStyle } from '../../src/blocks/icon/icon-motion';

const SHADOW_BASE = { '--sgs-icon': 'boxShadow', '--sgs-si': 'childIconBoxShadow' };

const PLUGIN = path.resolve( __dirname, '..', '..' );

const ICON_CASES = [
	{ offsetXHover: -2, offsetYHover: -3, iconRotateHover: -8, transitionDuration: 350, paintDuration: 250, transitionEasing: 'spring' },
	{ offsetXHover: 999, offsetYHover: -999, iconRotateHover: 900 },
	{ transitionEasing: 'custom', transitionEasingCustom: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
	{ transitionEasing: 'custom', transitionEasingCustom: 'url(x);position:fixed' },
	{ boxShadow: '3px 3px 0 0', boxShadowColour: '#3A2A22', boxShadowHover: '5px 5px 0 0' },
	{ boxShadowHover: '0 10px 20px -6px', boxShadowColour: '#000000 45%' },
	{ boxShadow: '2px 2px 0 0', boxShadowColour: '#112233', shadowLiftOnHover: false },
	{ boxShadow: 'hard-sm', shadowLiftOnHover: false },
	{},
];
const ROW_CASES = [
	{ childIconOffsetXHover: -2, childIconOffsetYHover: -2, childIconRotateHover: -8, childIconTransitionDuration: 200, childIconPaintDuration: 200 },
	{ childIconBoxShadow: '3px 3px 0 0', childIconBoxShadowColour: 'site', childIconBoxShadowHover: '5px 5px 0 0' },
	{ childIconBoxShadow: '4px 4px 0 0', childIconBoxShadowColour: '#112233 60%', childIconShadowLiftOnHover: false },
	{},
];

const cases = [
	...ICON_CASES.map( ( attributes ) => ( { attributes, prefix: '--sgs-icon', names: { ...ICON_MOTION_NAMES, shadow: 'boxShadow' }, pin: true } ) ),
	...ROW_CASES.map( ( attributes ) => ( { attributes, prefix: '--sgs-si', names: { ...ROW_MOTION_NAMES, shadow: 'childIconBoxShadow' }, pin: false } ) ),
];

let php;

beforeAll( () => {
	const input = path.join( os.tmpdir(), `sgs-icon-motion-${ process.pid }.json` );
	fs.writeFileSync( input, JSON.stringify( cases ) );
	try {
		php = JSON.parse( execFileSync( 'php', [ path.join( PLUGIN, 'tests/php/fixtures/icon-motion-dump.php' ), input ], { encoding: 'utf8' } ) );
	} finally {
		fs.unlinkSync( input );
	}
} );

const jsVars = ( c ) => {
	const style = {
		...iconMotionStyle( c.attributes, c.names, c.prefix ),
		...iconShadowStyle(
			{
				shadow: c.attributes[ SHADOW_BASE[ c.prefix ] ],
				colour: c.attributes[ SHADOW_BASE[ c.prefix ] + 'Colour' ],
				hover: c.attributes[ SHADOW_BASE[ c.prefix ] + 'Hover' ],
				hoverColour: c.attributes[ SHADOW_BASE[ c.prefix ] + 'ColourHover' ],
				lift: c.attributes[ c.names.lift ],
			},
			c.prefix,
			{ pinHover: c.pin }
		),
	};
	return Object.fromEntries( Object.entries( style ).sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ).map( ( [ k, v ] ) => [ k, String( v ) ] ) );
};

describe( 'icon motion parity', () => {
	it( 'both sides print the same custom properties for every case', () => {
		cases.forEach( ( c, i ) => {
			expect( jsVars( c ) ).toEqual( php[ i ] );
		} );
	} );

	it( 'a planted divergence is caught', () => {
		const tampered = { ...jsVars( cases[ 0 ] ), '--sgs-icon-hover-x': '-3px' };
		expect( tampered ).not.toEqual( php[ 0 ] );
	} );

	it( 'an untouched icon and an untouched row print nothing', () => {
		expect( jsVars( cases[ ICON_CASES.length - 1 ] ) ).toEqual( {} );
		expect( jsVars( cases[ cases.length - 1 ] ) ).toEqual( {} );
	} );
} );
