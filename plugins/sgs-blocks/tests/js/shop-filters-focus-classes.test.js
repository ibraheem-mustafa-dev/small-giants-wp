/**
 * Shop filter controls hand their keyboard focus ring to the focus system (focus plan §2.1 decisions 8 and 9):
 *   - the boolean switch's hidden checkbox carries `sgs-focus-source` and its visible track `sgs-focus-proxy`,
 *     the track being the checkbox's NEXT sibling so the adjacent-sibling arm in focus.css matches;
 *   - each segmented-row button carries `sgs-focus--inset` (the row clips an outside ring).
 */

const fs = require( 'fs' );
const path = require( 'path' );

const JS_DIR = path.resolve( __dirname, '..', '..', '..', '..', 'theme', 'sgs-theme', 'assets', 'js' );

function runScript( file ) {
	const src = fs.readFileSync( path.join( JS_DIR, file ), 'utf8' );
	// eslint-disable-next-line no-new-func
	new Function( src )();
}

function buildDialog( inner ) {
	document.body.innerHTML = '<dialog id="sgs-shop-filters">' + inner + '</dialog>';
}

describe( 'shop filter focus classes', () => {
	afterEach( () => {
		document.body.innerHTML = '';
		delete window.sgsShopFilters;
	} );

	test( 'boolean switch: hidden input is a focus source, the track its adjacent proxy', () => {
		window.sgsShopFilters = { booleanFilter: { param: 'filter_x', term: 'yes', label: 'Polarised only' } };
		buildDialog( '<div class="sgs-shop-filters__scroll"></div>' );
		runScript( 'sgs-shop-filters-extras.js' );

		const input = document.querySelector( '.sgs-shop-filters__bool-filter-input' );
		const track = document.querySelector( '.sgs-shop-filters__bool-filter-switch' );
		expect( input ).not.toBeNull();
		expect( input.classList.contains( 'sgs-focus-source' ) ).toBe( true );
		expect( track.classList.contains( 'sgs-focus-proxy' ) ).toBe( true );
		expect( input.nextElementSibling ).toBe( track );
	} );

	test( 'segmented row: every segment carries sgs-focus--inset', () => {
		buildDialog(
			'<details class="sgs-shop-filters__group">' +
				'<summary class="sgs-shop-filters__group-summary">Brand</summary>' +
				'<h3 class="sgs-shop-filters__group-heading sgs-filter-segmented">Brand</h3>' +
				'<ul><li class="wc-block-product-filter-chips__item" id="attribute/brand-a"><button class="c" value="a" aria-label="A"></button></li></ul>' +
			'</details>'
		);
		// The group is `.sgs-shop-filters__group`; the chips list sits inside it.
		const group = document.querySelector( '.sgs-shop-filters__group' );
		const chip = group.querySelector( '.wc-block-product-filter-chips__item' );
		chip.value = 'a';
		runScript( 'sgs-shop-filters-groups.js' );

		const segments = document.querySelectorAll( '.sgs-shop-filters__segment' );
		expect( segments.length ).toBeGreaterThan( 0 );
		segments.forEach( ( s ) => expect( s.classList.contains( 'sgs-focus--inset' ) ).toBe( true ) );
	} );
} );
