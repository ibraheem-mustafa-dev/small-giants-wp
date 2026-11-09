/**
 * A scroll lock makes the page read as scrolled to the top. The header's shrink and row logic must not act on that, or the
 * shrunk header regrows behind a drawer or modal and shrinks again on close, moving the page.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const source = fs.readFileSync( path.resolve( __dirname, '..', '..', 'src/header-behaviours/view.js' ), 'utf8' );

test( 'one check names both page locks', () => {
	expect( source ).toContain( "document.body.hasAttribute( 'data-sgs-nav-scroll-y' )" );
	expect( source ).toContain( "document.body.classList.contains( 'sgs-modal-scroll-locked' )" );
} );

test( 'the header shrink tick and the row tick both hold for a lock', () => {
	expect( source.match( /isPageScrollLocked\(\)/g ).length ).toBeGreaterThanOrEqual( 2 );
	expect( source ).toMatch( /header\.hasAttribute\( 'data-sgs-drawer-grown' \) \|\| isPageScrollLocked\(\)/ );
	expect( source ).toMatch( /querySelector\( '\[data-sgs-drawer-grown\]' \) \|\| isPageScrollLocked\(\)/ );
} );
