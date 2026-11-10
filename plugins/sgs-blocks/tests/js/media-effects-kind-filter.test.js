/**
 * Spec 49 §10.1, FR-49-40, AC-19: the Effects list for an adopted media or background part filters by the kind shown
 * on each device, and a layer is scoped to the devices whose kind it fits.
 */
jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );

const { effectOptions } = require( '../../src/blocks/extensions/motion/effect-options' );
const {
	devicesFor,
	deviceNote,
	effectFitsKind,
	offTiersFor,
	partAvailable,
} = require( '../../src/components/motion/kind-fit.js' );
const { targetOptions } = require( '../../src/components/motion/TargetPicker' );
const { addLayer } = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const { kindsByDeviceFor, slotEntryFor } = require( '../../src/components/motion/use-part-kinds.js' );

const PART = { label: 'Background', surface: true, availableWhen: { slot: 'background', kinds: [ 'image' ] } };
const ELEMENTS = { background: PART };
const photoThenVideo = { desktop: 'image', tablet: 'image', mobile: 'video' };
const allPhoto = { desktop: 'image', tablet: 'image', mobile: 'image' };
const allVideo = { desktop: 'video', tablet: 'video', mobile: 'video' };
const allSvg = { desktop: 'svg', tablet: 'svg', mobile: 'svg' };

describe( 'effect fit by kind', () => {
	it( 'Ken Burns and surface treatment need an image, SVG effects need an SVG, text effects fit no media kind', () => {
		expect( effectFitsKind( 'ken-burns', 'image' ) ).toBe( true );
		expect( effectFitsKind( 'ken-burns', 'video' ) ).toBe( false );
		expect( effectFitsKind( 'surface-treatment', 'video' ) ).toBe( false );
		expect( effectFitsKind( 'svg-loop', 'svg' ) ).toBe( true );
		expect( effectFitsKind( 'svg-loop', 'image' ) ).toBe( false );
		expect( effectFitsKind( 'scramble', 'image' ) ).toBe( false );
		expect( effectFitsKind( 'parallax', 'video' ) ).toBe( true );
		expect( effectFitsKind( 'parallax', 'embed' ) ).toBe( true );
	} );
} );

describe( 'the effect list per device', () => {
	it( 'a photo on Desktop and video on Mobile lists Ken Burns; all video does not; the list differs by device', () => {
		const photo = effectOptions( 'sgs/container', 'background', ELEMENTS, allPhoto );
		const mixed = effectOptions( 'sgs/container', 'background', ELEMENTS, photoThenVideo );
		const video = effectOptions( 'sgs/container', 'background', ELEMENTS, allVideo );
		expect( photo ).toContain( 'ken-burns' );
		expect( mixed ).toContain( 'ken-burns' );
		expect( video ).not.toContain( 'ken-burns' );
		expect( video ).toContain( 'parallax' );
		expect( video.length ).toBeLessThan( photo.length );
	} );

	it( 'an SVG on every device lists only effects that fit an SVG', () => {
		const list = effectOptions( 'sgs/container', 'background', ELEMENTS, allSvg );
		expect( list ).not.toContain( 'ken-burns' );
		expect( list.every( ( effect ) => effectFitsKind( effect, 'svg' ) ) ).toBe( true );
	} );

	it( 'a part with no availableWhen keeps its list exactly', () => {
		const plain = { background: { label: 'Background', surface: true } };
		expect( effectOptions( 'sgs/container', 'background', plain, photoThenVideo ) ).toEqual(
			effectOptions( 'sgs/container', 'background', plain )
		);
	} );
} );

describe( 'per-device scoping (FR-49-40)', () => {
	it( 'names the devices an effect fits and switches it off on the rest', () => {
		expect( devicesFor( 'ken-burns', photoThenVideo ) ).toEqual( [ 'desktop', 'tablet' ] );
		expect( offTiersFor( 'ken-burns', photoThenVideo ) ).toEqual( [ 'mobile' ] );
		expect( deviceNote( 'ken-burns', photoThenVideo ) ).toBe( 'Desktop and tablet; the phone shows a video.' );
		expect( offTiersFor( 'parallax', photoThenVideo ) ).toEqual( [] );
		expect( deviceNote( 'parallax', photoThenVideo ) ).toBe( '' );
	} );

	it( 'a new layer on the part is written with its off tiers', () => {
		const result = addLayer( undefined, 'background', 'effects', {
			effect: 'ken-burns',
			elements: ELEMENTS,
			off: offTiersFor( 'ken-burns', photoThenVideo ),
		} );
		expect( result.layer.off ).toEqual( [ 'mobile' ] );
		expect( result.motion.elements.background.effects[ 0 ].off ).toEqual( [ 'mobile' ] );
	} );

	it( 'a layer with no off request carries none', () => {
		const result = addLayer( undefined, 'background', 'effects', { effect: 'parallax', elements: ELEMENTS } );
		expect( result.layer.off ).toBeUndefined();
	} );
} );

describe( 'targets by availableWhen', () => {
	const parts = {
		background: PART,
		'background-video': { label: 'Background video', surface: true, availableWhen: { slot: 'background', kinds: [ 'video' ] } },
		'svg-bg': { label: 'SVG', surface: true, availableWhen: { slot: 'background', kinds: [ 'svg' ] } },
		inner: { label: 'Inner' },
	};
	const values = ( kinds ) => targetOptions( parts, [], () => kinds ).map( ( o ) => o.value );

	it( 'lists only the parts the shown kinds make available, and keeps parts with no predicate', () => {
		expect( values( allPhoto ) ).toEqual( [ 'root', 'background', 'inner' ] );
		expect( values( photoThenVideo ) ).toEqual( [ 'root', 'background', 'background-video', 'inner' ] );
		expect( values( allSvg ) ).toEqual( [ 'root', 'svg-bg', 'inner' ] );
	} );

	it( 'a part holding a layer stays listed', () => {
		const held = targetOptions( parts, [ 'svg-bg' ], () => allVideo ).map( ( o ) => o.value );
		expect( held ).toContain( 'svg-bg' );
	} );

	it( 'partAvailable is true for a part with no predicate', () => {
		expect( partAvailable( { label: 'x' }, allVideo ) ).toBe( true );
	} );
} );

describe( 'the kind on each device from the block', () => {
	const entry = { prefix: 'background', kinds: [ 'image', 'video' ], context: 'background' };

	it( 'reads each device from the stored source', () => {
		const attributes = {
			backgroundSource: { desktop: { kind: 'image', id: 1 }, mobile: { kind: 'video', id: 2 } },
		};
		const kinds = kindsByDeviceFor( attributes, entry );
		expect( kinds.desktop ).toBe( 'image' );
		expect( kinds.mobile ).toBe( 'video' );
	} );

	it( 'finds the slot entry a part names, or null', () => {
		const supports = { mediaElements: [ entry ] };
		expect( slotEntryFor( supports, PART ) ).toBe( entry );
		expect( slotEntryFor( supports, { label: 'x' } ) ).toBeNull();
		expect( slotEntryFor( supports, { availableWhen: { slot: 'other', kinds: [] } } ) ).toBeNull();
	} );
} );
