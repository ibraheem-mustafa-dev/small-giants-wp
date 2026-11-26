/**
 * The footer credit ("Website by ...", displayType "attribution") shows its hover look while a finger is pressed on
 * it. By default the build's hover guard gives the `:hover` member a `.sgs-pressed` touch half; on a site set to "Off on
 * touch screens" the guarded `:hover` member is off while the page is touched, and the unguarded `:active` member (and
 * its pressed twin) is the press look (Spec 38A FR-38A-17).
 */
const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );
const { transformCss, SGS_HOVER_NOT_TOUCH } = require( '../../scripts/hover-guard/transform.js' );

const CSS = fs.readFileSync( path.join( __dirname, '../../src/blocks/business-info/style.css' ), 'utf8' );
const LINK = '.sgs-business-attribution .sgs-business-info__link';

/** Selector members of every rule whose declarations include `prop: value`, after the build's hover guard ran. */
function guardedMembers( prop, value ) {
	const { css } = transformCss( CSS, 'business-info/style.css' );
	const members = [];
	postcss.parse( css ).walkRules( ( rule ) => {
		if ( rule.parent && rule.parent.type === 'atrule' ) {
			return;
		}
		let has = false;
		rule.walkDecls( prop, ( d ) => {
			if ( d.value.replace( /\s+/g, ' ' ) === value ) {
				has = true;
			}
		} );
		if ( has ) {
			members.push( ...rule.selectors );
		}
	} );
	return members;
}

describe.each( [
	[ 'text sweep', 'background-position', '0 0', LINK + ':active' ],
	[ 'underline sweep', 'transform', 'scaleX(1)', LINK + ':active::after' ],
] )( 'attribution credit %s on touch', ( name, prop, value, target ) => {
	it( 'has an unguarded :active member that shows the look under the guard', () => {
		const members = guardedMembers( prop, value );
		const active = members.filter( ( m ) => m.includes( ':active' ) );
		expect( active ).toHaveLength( 1 );
		expect( active[ 0 ].startsWith( SGS_HOVER_NOT_TOUCH ) ).toBe( false );
		expect( active[ 0 ] ).toBe( target );
	} );

	it( 'keeps :hover inside the touch guard with its pressed half, and :focus-visible outside it', () => {
		const members = guardedMembers( prop, value );
		const hover = members.filter( ( m ) => m.includes( ':hover' ) );
		expect( hover ).toHaveLength( 1 );
		expect( hover[ 0 ].startsWith( SGS_HOVER_NOT_TOUCH ) ).toBe( true );
		expect( members ).toContain( target.replace( ':active', '.sgs-pressed' ) );
		const focus = members.filter( ( m ) => m.includes( ':focus-visible' ) );
		expect( focus ).toHaveLength( 1 );
		expect( focus[ 0 ].startsWith( SGS_HOVER_NOT_TOUCH ) ).toBe( false );
	} );
} );
