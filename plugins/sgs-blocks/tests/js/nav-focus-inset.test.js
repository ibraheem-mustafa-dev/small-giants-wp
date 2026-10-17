/**
 * Navigation family hands its focus ring to the one focus system (focus plan Task 7; Spec 32 §14.5).
 *
 * Where the container clips (submenu panel, drawer accordion row, drill-down panel, store list) the ring must sit
 * inside, so the markup builders carry `sgs-focus--inset`; and the PHP emitter holds no bespoke focus rule.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.resolve( __dirname, '..', '..' );
const read = ( rel ) => fs.readFileSync( path.join( ROOT, rel ), 'utf8' );

describe( 'navigation focus: inset class on clipped items', () => {
	const markup = read( 'includes/nav-menu-markup.php' );

	test( 'bar and drawer submenu links carry sgs-focus--inset', () => {
		const anchors = markup.match( /<a class="sgs-nav-(?:bar|drawer)-menu__sublink[^"]*"/g ) || [];
		expect( anchors.length ).toBe( 2 );
		for ( const a of anchors ) {
			expect( a ).toContain( 'sgs-focus--inset' );
		}
	} );

	test( 'both submenu toggle buttons carry sgs-focus--inset', () => {
		const buttons = markup.match( /<button type="button" class="[^"]*sgs-nav-bar-menu__subtoggle[^"]*"/g ) || [];
		expect( buttons.length ).toBe( 2 );
		for ( const b of buttons ) {
			expect( b ).toContain( 'sgs-focus--inset' );
		}
	} );

	test( 'drawer accordion summary carries sgs-focus--inset', () => {
		expect( read( 'includes/nav-drawer-menu-items.php' ) ).toMatch(
			/\$summary_class\s*=\s*'sgs-nav-drawer-menu__accordion-summary sgs-focus--inset'/
		);
	} );

	test( 'drill-back button carries sgs-focus--inset', () => {
		expect( read( 'src/shared/effects/nav-drilldown.js' ) ).toContain(
			"backBtn.className = 'sgs-nav-drawer-menu__drill-back-btn sgs-focus--inset'"
		);
	} );

	test( 'store selector list links carry sgs-focus--inset', () => {
		expect( read( 'src/blocks/store-selector/render.php' ) ).toMatch(
			/<a class="sgs-focus--inset" href=/
		);
	} );
} );

describe( 'navigation focus: no bespoke focus rule in the submenu emitter', () => {
	test( 'nav-menu-submenu-link-css.php emits no :focus-visible outline', () => {
		const src = read( 'includes/nav-menu-submenu-link-css.php' );
		expect( src ).not.toMatch( /:focus-visible\{[^}]*outline/ );
	} );
} );
