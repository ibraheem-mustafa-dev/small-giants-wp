/**
 * The "Bouncy spring" easing token must read as a bounce: one clear overshoot, one smaller swing back, and a clean
 * finish. Client snapshots copy the token, so none may keep a copy of the weak curve.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.resolve( __dirname, '../../../..' );
const WEAK_CURVE_START = 'linear(0, 0.087, 0.283, 0.511';

const curveStops = ( css ) =>
	css
		.replace( /^linear\(|\)$/g, '' )
		.split( ',' )
		.map( ( stop ) => parseFloat( stop ) );

const themeJson = JSON.parse( fs.readFileSync( path.join( ROOT, 'theme/sgs-theme/theme.json' ), 'utf8' ) );
const stops = curveStops( themeJson.settings.custom.easing[ 'spring-bouncy' ] );

describe( 'easing.spring-bouncy', () => {
	test( 'starts at 0 and finishes at 1', () => {
		expect( stops[ 0 ] ).toBe( 0 );
		expect( stops[ stops.length - 1 ] ).toBe( 1 );
	} );

	test( 'overshoots by about a fifth of the distance, the top of the Spec 38A band', () => {
		const peak = Math.max( ...stops );
		expect( peak ).toBeGreaterThanOrEqual( 1.18 );
		expect( peak ).toBeLessThanOrEqual( 1.2 );
	} );

	test( 'swings back below the end point once, by less than it overshot', () => {
		const peakAt = stops.indexOf( Math.max( ...stops ) );
		const trough = Math.min( ...stops.slice( peakAt ) );
		expect( trough ).toBeLessThan( 0.97 );
		expect( 1 - trough ).toBeLessThan( Math.max( ...stops ) - 1 );
	} );

	test( 'no client snapshot keeps the weak curve', () => {
		const sites = fs.readdirSync( path.join( ROOT, 'sites' ) );
		const stale = [];
		sites.forEach( ( site ) => {
			const dir = path.join( ROOT, 'sites', site );
			if ( ! fs.statSync( dir ).isDirectory() ) {
				return;
			}
			fs.readdirSync( dir )
				.filter( ( name ) => /^theme-snapshot.*\.json$/.test( name ) )
				.forEach( ( name ) => {
					if ( fs.readFileSync( path.join( dir, name ), 'utf8' ).includes( WEAK_CURVE_START ) ) {
						stale.push( `${ site }/${ name }` );
					}
				} );
		} );
		expect( stale ).toEqual( [] );
	} );
} );
