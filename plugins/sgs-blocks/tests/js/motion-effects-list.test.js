/**
 * The effect list of the Effects panel (Spec 38A §5.3; FR-38A-9, FR-38A-11): the list for a block and target equals
 * the generated meta filtered by panels, scope and requires (the qualifying-blocks map) and target level, and never
 * offers a site-level row; a part marked `"surface": true` takes surface effects; and an effect with `x-part-kinds`
 * reaches a part only through its kind marker (motion-part-kinds.test.js covers the kinds).
 */
const defs = require( '../../src/components/motion/generated-motion-defs.json' );
const meta = require( '../../src/blocks/extensions/generated-fx-effect-meta.json' );
const qualifying = require( '../../src/blocks/extensions/generated-fx-qualifying-blocks.json' );
const schema = require( '../../schemas/motion.schema.json' );
const {
	EFFECTS_LIST,
	effectOptions,
	effectTriggers,
} = require( '../../src/blocks/extensions/motion/effect-options' );
const {
	addLayer,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );

const DEFS = defs.$defs;
const LEVELS = { root: [ 'block', 'surface', 'part' ], part: [ 'part' ] };

// The oracle, written from the data and not from effect-options.js: the effects list's schema slugs whose meta row
// lists the Effects panel, which the block qualifies for, whose target level the target offers, and, on a part with no
// kind marker, which name no part kind in the schema.
const expectedList = ( blockName, levels ) =>
	DEFS.EffectLayer.properties.effect.enum.filter(
		( effect ) =>
			meta[ effect ]?.panels.includes( 'effects' ) &&
			( qualifying[ blockName ] || [] ).includes( effect ) &&
			meta[ effect ].target_level.some( ( level ) => levels.includes( level ) ) &&
			( levels === LEVELS.root || ! schema[ 'x-sgs-effects' ][ effect ]?.[ 'x-part-kinds' ] )
	);

describe( 'the effect list for a block and target', () => {
	const cases = [
		[ 'sgs/container', 'root', LEVELS.root ],
		[ 'sgs/container', 'inner', LEVELS.part ],
		[ 'sgs/hero', 'root', LEVELS.root ],
		[ 'sgs/hero', 'media', LEVELS.part ],
		[ 'sgs/button', 'root', LEVELS.root ],
		[ 'sgs/button', 'icon', LEVELS.part ],
	];
	it.each( cases )(
		'%s on %s equals the meta filtered by panels, scope, requires and target level',
		( blockName, target, levels ) => {
			const list = effectOptions( blockName, target );
			expect( list ).toEqual( expectedList( blockName, levels ) );
			expect( list.length ).toBeGreaterThan( 0 );
			expect( list ).not.toContain( 'scroll-smoother' );
			expect( list ).not.toContain( 'page-transitions' );
		}
	);

	it( 'offers the facts the registry states, and nothing a site-level or hover-only row owns', () => {
		expect( effectOptions( 'sgs/container', 'root' ) ).toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/container', 'inner' ) ).not.toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/button', 'root' ) ).not.toContain( 'ken-burns' );
		expect( effectOptions( 'sgs/button', 'root' ) ).not.toContain( 'magnet' );
		expect( meta[ 'scroll-smoother' ].panels ).toEqual( [] );
		expect( qualifying[ 'sgs/button' ] ).toContain( 'magnet' );
	} );

	it( 'drops an effect whose meta row does not list the Effects panel, whatever in_picker says', () => {
		let isolated;
		jest.isolateModules( () => {
			jest.doMock( '../../src/blocks/extensions/generated-fx-effect-meta.json', () => ( {
				...meta,
				parallax: { ...meta.parallax, panels: [ 'hover' ], in_picker: true },
				'ken-burns': { ...meta[ 'ken-burns' ], in_picker: false },
			} ) );
			isolated = require( '../../src/blocks/extensions/motion/effect-options' );
		} );
		const list = isolated.effectOptions( 'sgs/container', 'root' );
		expect( effectOptions( 'sgs/container', 'root' ) ).toContain( 'parallax' );
		expect( list ).not.toContain( 'parallax' );
		expect( list ).toContain( 'ken-burns' );
	} );

	it( 'offers nothing to a block the qualifying map does not name', () => {
		expect( effectOptions( 'sgs/not-a-block', 'root' ) ).toEqual( [] );
	} );

	it( 'carries each effect target level exactly as the schema declares it', () => {
		Object.entries( schema[ 'x-sgs-effects' ] ).forEach( ( [ slug, entry ] ) => {
			if ( meta[ slug ] ) {
				expect( [ slug, meta[ slug ].target_level ] ).toEqual( [
					slug,
					entry[ 'x-target-level' ],
				] );
			}
		} );
		expect( meta[ 'scroll-smoother' ].target_level ).toEqual( [] );
	} );

	it( 'offers the effect registry triggers', () => {
		expect( effectTriggers( 'ripple' ) ).toEqual( [ 'pointerdown', 'click' ] );
		expect( effectTriggers( 'not-an-effect' ) ).toEqual( [] );
	} );
} );

describe( 'a part marked as a surface', () => {
	const marked = { background: { label: 'Background image', surface: true } };
	it( 'takes surface effects once its declaration carries the marker', () => {
		expect( effectOptions( 'sgs/container', 'background', marked ) ).toContain( 'ken-burns' );
		expect(
			addLayer( undefined, 'background', EFFECTS_LIST, {
				effect: 'ken-burns',
				elements: marked,
			} ).motion
		).toBeDefined();
	} );
	it( 'takes none without the marker, while the root still does', () => {
		expect( effectOptions( 'sgs/container', 'background', { background: {} } ) ).not.toContain( 'ken-burns' );
		expect(
			addLayer( undefined, 'background', EFFECTS_LIST, { effect: 'ken-burns' } ).invalid
		).toBeTruthy();
		expect( effectOptions( 'sgs/container', 'root' ) ).toContain( 'ken-burns' );
	} );
} );

describe( 'the declared parts of real block.json files', () => {
	const elementsOf = ( slug ) =>
		require( `../../src/blocks/${ slug }/block.json` ).supports.sgs.elements;
	it( 'offers Ken Burns on the background image of sgs/container and sgs/hero', () => {
		[ 'container', 'hero' ].forEach( ( slug ) => {
			const elements = elementsOf( slug );
			expect( elements.background.surface ).toBe( true );
			expect( effectOptions( `sgs/${ slug }`, 'background', elements ) ).toContain( 'ken-burns' );
		} );
	} );
	it( 'offers no surface effect on a text part of the same block', () => {
		const elements = elementsOf( 'hero' );
		expect( elements.headline.surface ).toBeUndefined();
		expect( effectOptions( 'sgs/hero', 'headline', elements ) ).not.toContain( 'ken-burns' );
	} );
} );
