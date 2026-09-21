/**
 * Tests for mergeSgsIcons(): the editor picker must agree with the generator
 * (scripts/generate-icons.js) about which library slugs are reserved.
 *
 * The picker used `slug in lucide.map`, which walks the prototype chain: a library slug
 * such as `constructor` looked "already a Lucide icon" and was dropped from the picker
 * while the frontend rendered it. The generator now refuses those names outright, so this
 * is defence in depth; the test pins the own-property semantics so the two cannot diverge.
 */

import { mergeSgsIcons, SGS_CATEGORY_KEY, withSgsCategory } from '../../src/components/IconPicker/sgs-group';

const SVG = '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>';

describe( 'mergeSgsIcons', () => {
	const lucide = { map: { check: SVG, truck: SVG }, tags: { check: [ 'tick' ], truck: [] } };

	it( 'adds a library slug and tags it', () => {
		const out = mergeSgsIcons( lucide, { 'shield-tick': SVG } );
		expect( out.sgsNames ).toEqual( [ 'shield-tick' ] );
		expect( out.map[ 'shield-tick' ] ).toBe( SVG );
		expect( out.tags[ 'shield-tick' ] ).toEqual( [ 'sgs' ] );
		expect( out.names ).toContain( 'shield-tick' );
	} );

	it( 'keeps Lucide names reserved (own-property collision)', () => {
		const out = mergeSgsIcons( lucide, { check: '<svg>library</svg>' } );
		expect( out.sgsNames ).toEqual( [] );
		expect( out.map.check ).toBe( SVG );
	} );

	it.each( [ 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString' ] )(
		'a library slug named after an Object.prototype member (%s) is not mistaken for a Lucide icon',
		( slug ) => {
			const out = mergeSgsIcons( lucide, { [ slug ]: SVG } );
			expect( out.sgsNames ).toEqual( [ slug ] );
			expect( Object.prototype.hasOwnProperty.call( out.map, slug ) ).toBe( true );
			expect( out.map[ slug ] ).toBe( SVG );
		}
	);

	it( 'skips __proto__ (it can never be a plain map key) without polluting the map', () => {
		const lib = JSON.parse( '{"__proto__": "<svg/>", "ok-icon": "<svg/>"}' );
		const out = mergeSgsIcons( lucide, lib );
		expect( out.sgsNames ).toEqual( [ 'ok-icon' ] );
		expect( Object.getPrototypeOf( out.map ) ).toBe( Object.prototype );
	} );

	it( 'ignores non-string values and non-object libraries', () => {
		expect( mergeSgsIcons( lucide, { bad: 1 } ).sgsNames ).toEqual( [] );
		expect( mergeSgsIcons( lucide, null ).sgsNames ).toEqual( [] );
		expect( mergeSgsIcons( lucide, [ SVG ] ).sgsNames ).toEqual( [] );
	} );

	it( 'does not mutate the Lucide dataset', () => {
		mergeSgsIcons( lucide, { 'shield-tick': SVG } );
		expect( Object.keys( lucide.map ) ).toEqual( [ 'check', 'truck' ] );
	} );
} );

describe( 'withSgsCategory', () => {
	it( 'adds the SGS group after All only when the library is not empty', () => {
		const cats = [ { key: 'all', label: 'All', names: [] }, { key: 'arrows', label: 'Arrows', names: [] } ];
		expect( withSgsCategory( cats, [] ) ).toBe( cats );
		const out = withSgsCategory( cats, [ 'shield-tick' ] );
		expect( out[ 1 ].key ).toBe( SGS_CATEGORY_KEY );
	} );
} );
