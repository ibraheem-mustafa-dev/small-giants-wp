/**
 * The text and SVG part kinds (Spec 38A §5.4 "Part (text)", "Part (SVG)"; FR-38A-9; plan M3.6 (b)): an effect whose
 * schema entry names `x-part-kinds` is offered and accepted on a declared part only when that part's `block.json`
 * declaration carries the matching `"text": true` or `"svg": true` marker; the block root takes every kind, its block's
 * registry row deciding those effects there. Both readers, the Effects panel list (`effectOptions`) and the layer
 * operations shared with the Entrance and reveal panel's text and SVG list (`effectsForTarget`), apply it.
 */
const schema = require( '../../schemas/motion.schema.json' );
const {
	effectOptions,
} = require( '../../src/blocks/extensions/motion/effect-options' );
const {
	effectsForTarget,
	kindsFit,
} = require( '../../src/blocks/extensions/motion/layers/refusal-match' );
const {
	effectsForList,
} = require( '../../src/blocks/extensions/motion/layers/layer-lists' );
const {
	addLayer,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );

const TEXT_LIST = 'entrance.text';
const elementsOf = ( slug ) =>
	require( `../../src/blocks/${ slug }/block.json` ).supports.sgs.elements;

describe( 'the schema names the kind of each text and SVG effect', () => {
	it( 'marks split reveal and scramble as text, and draw, morph, motion path and the SVG loop as SVG', () => {
		const kinds = Object.fromEntries(
			Object.entries( schema[ 'x-sgs-effects' ] )
				.filter( ( [ , entry ] ) => entry[ 'x-part-kinds' ] )
				.map( ( [ slug, entry ] ) => [ slug, entry[ 'x-part-kinds' ] ] )
		);
		expect( kinds ).toEqual( {
			'split-reveal': [ 'text' ],
			scramble: [ 'text' ],
			draw: [ 'svg' ],
			morph: [ 'svg' ],
			'motion-path': [ 'svg' ],
			'svg-loop': [ 'svg' ],
		} );
	} );
} );

describe( 'kindsFit', () => {
	const elements = {
		title: { text: true },
		logo: { svg: true },
		box: {},
		layer: { surface: true, svg: true },
	};
	it( 'lets a kinded effect onto a part with the matching marker only', () => {
		expect( kindsFit( 'split-reveal', 'title', elements ) ).toBe( true );
		expect( kindsFit( 'split-reveal', 'logo', elements ) ).toBe( false );
		expect( kindsFit( 'split-reveal', 'box', elements ) ).toBe( false );
		expect( kindsFit( 'draw', 'logo', elements ) ).toBe( true );
		expect( kindsFit( 'draw', 'title', elements ) ).toBe( false );
		expect( kindsFit( 'svg-loop', 'layer', elements ) ).toBe( true );
	} );
	it( 'lets every kind onto the root, and any part take an effect with no kind', () => {
		expect( kindsFit( 'split-reveal', 'root', elements ) ).toBe( true );
		expect( kindsFit( 'draw', 'root', elements ) ).toBe( true );
		expect( kindsFit( 'scrub', 'box', elements ) ).toBe( true );
		expect( kindsFit( 'parallax', 'title', elements ) ).toBe( true );
	} );
	it( 'refuses a kinded effect on a part when the declarations are unknown or the marker is not true', () => {
		expect( kindsFit( 'split-reveal', 'title', null ) ).toBe( false );
		expect( kindsFit( 'split-reveal', 'title', { title: { text: 'yes' } } ) ).toBe( false );
	} );
	it( 'lets every kind onto a custom target, whose selector the author chose (the server has no kind check)', () => {
		[ 'split-reveal', 'scramble', 'draw', 'morph', 'motion-path', 'svg-loop' ].forEach( ( effect ) => {
			expect( kindsFit( effect, 'custom:0', {} ) ).toBe( true );
			expect( kindsFit( effect, 'custom:1', elements ) ).toBe( true );
			expect( kindsFit( effect, 'custom:2', null ) ).toBe( true );
		} );
	} );
} );

describe( 'the Entrance and reveal text and SVG list on real block.json parts', () => {
	it( 'offers split reveal and scramble on a marked text part, and not draw', () => {
		const elements = elementsOf( 'team-member' );
		expect( elements.name.text ).toBe( true );
		const offered = effectsForTarget( effectsForList( TEXT_LIST ), 'name', elements );
		expect( offered ).toEqual( expect.arrayContaining( [ 'split-reveal', 'scramble' ] ) );
		expect( offered ).not.toContain( 'draw' );
	} );
	it( 'offers no text or SVG effect on an unmarked part (a kindless effect such as curtain stays)', () => {
		const elements = elementsOf( 'team-member' );
		expect( elements.social.text ).toBeUndefined();
		const offered = effectsForTarget( effectsForList( TEXT_LIST ), 'social', elements );
		[ 'split-reveal', 'scramble', 'draw' ].forEach( ( effect ) => expect( offered ).not.toContain( effect ) );
		expect( offered ).toContain( 'curtain' );
	} );
	it( 'offers draw on a marked SVG part, and not split reveal', () => {
		const elements = elementsOf( 'google-reviews' );
		expect( elements.star.svg ).toBe( true );
		const offered = effectsForTarget( effectsForList( TEXT_LIST ), 'star', elements );
		expect( offered ).toContain( 'draw' );
		expect( offered ).not.toContain( 'split-reveal' );
	} );
	it( 'offers every text and SVG effect on the root of a block whose root is its text', () => {
		const offered = effectsForTarget( effectsForList( TEXT_LIST ), 'root', elementsOf( 'heading' ) );
		expect( offered ).toEqual( expect.arrayContaining( [ 'split-reveal', 'scramble', 'draw' ] ) );
	} );
	it( 'refuses to add a text effect on an unmarked part', () => {
		const elements = elementsOf( 'team-member' );
		expect( addLayer( undefined, 'social', TEXT_LIST, { effect: 'split-reveal', elements } ).invalid ).toBeTruthy();
		expect( addLayer( undefined, 'name', TEXT_LIST, { effect: 'split-reveal', elements } ).motion ).toBeDefined();
	} );
} );

describe( 'the Effects panel list on real block.json parts', () => {
	it( 'offers the SVG loop and draw on the background SVG layer, and neither on the background image', () => {
		const elements = elementsOf( 'hero' );
		expect( elements[ 'svg-bg' ].svg ).toBe( true );
		const layer = effectOptions( 'sgs/hero', 'svg-bg', elements );
		expect( layer ).toEqual( expect.arrayContaining( [ 'svg-loop', 'draw', 'ken-burns' ] ) );
		const image = effectOptions( 'sgs/hero', 'background', elements );
		expect( image ).toContain( 'ken-burns' );
		expect( image ).not.toContain( 'svg-loop' );
		expect( image ).not.toContain( 'draw' );
	} );
	it( 'offers morph and motion path on no unmarked part, while the root keeps them', () => {
		const elements = elementsOf( 'container' );
		expect( effectOptions( 'sgs/container', 'inner', elements ) ).not.toContain( 'morph' );
		expect( effectOptions( 'sgs/container', 'inner', elements ) ).not.toContain( 'motion-path' );
		expect( effectOptions( 'sgs/container', 'root', elements ) ).toEqual(
			expect.arrayContaining( [ 'morph', 'motion-path' ] )
		);
	} );
} );
