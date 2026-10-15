/**
 * The inspector's refusals (Spec 38A §5, §5.2, §10; FR-38A-10): adding a layer the schema refuses returns the
 * schema's exact text and writes nothing; each refusal sits beside a positive case so the check is not vacuous.
 * The expected texts are read from `x-sgs-refusals` and pinned to the spec's wording.
 */
const schema = require( '../../schemas/motion.schema.json' );
const {
	addLayer,
	updateLayer,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const {
	elementRefusals,
} = require( '../../src/blocks/extensions/motion/layers/refusals' );

const RULES = [
	...schema[ 'x-sgs-refusals' ].pairs,
	...schema[ 'x-sgs-refusals' ].limits,
];
const ruleText = ( id ) => RULES.find( ( rule ) => rule.id === id ).text;

const ok = ( result ) => {
	expect( result.refusal ).toBeUndefined();
	expect( result.motion ).toBeDefined();
	return result.motion;
};

describe( 'one effect slug per element per list', () => {
	const MAGNET_TEXT =
		'Magnet is already on this element; change its values instead.';

	it( 'quotes the spec text in the schema', () => {
		expect(
			ruleText( 'unique-effect' ).replace( '<Effect>', 'Magnet' )
		).toBe( MAGNET_TEXT );
	} );

	it( 'adds a magnet, a sheen beside it and a magnet on another part', () => {
		let motion = ok(
			addLayer( undefined, 'root', 'hover.effects', { effect: 'magnet' } )
		);
		motion = ok(
			addLayer( motion, 'root', 'hover.effects', { effect: 'sheen' } )
		);
		motion = ok(
			addLayer( motion, 'media', 'hover.effects', { effect: 'magnet' } )
		);
		expect( Object.keys( motion.elements ) ).toEqual( [ 'root', 'media' ] );
	} );

	it( 'refuses a second magnet on the same element with the exact text and writes nothing', () => {
		const motion = ok(
			addLayer( undefined, 'root', 'hover.effects', { effect: 'magnet' } )
		);
		const result = addLayer( motion, 'root', 'hover.effects', {
			effect: 'magnet',
		} );
		expect( result ).toEqual( { refusal: MAGNET_TEXT } );
	} );
} );

describe( 'split reveal and scramble on one part (§5.2)', () => {
	const TEXT =
		'Split reveal and Scramble both rewrite this text; keep one of them.';

	it( 'quotes the spec text in the schema', () => {
		expect( ruleText( 'text-rewrite-entrance' ) ).toBe( TEXT );
		expect( ruleText( 'text-rewrite-hover' ) ).toBe( TEXT );
	} );

	it( 'adds split reveal, draw on another part, and scramble on a third', () => {
		// A part is text or SVG, so draw sits on its own part (two scroll-driven text effects share scroll settings).
		let motion = ok(
			addLayer( undefined, 'title', 'entrance.text', {
				effect: 'split-reveal',
			} )
		);
		motion = ok(
			addLayer( motion, 'icon', 'entrance.text', { effect: 'draw' } )
		);
		ok(
			addLayer( motion, 'subtitle', 'entrance.text', {
				effect: 'scramble',
			} )
		);
	} );

	it( 'refuses scramble beside split reveal with the §5.2 text', () => {
		const motion = ok(
			addLayer( undefined, 'title', 'entrance.text', {
				effect: 'split-reveal',
			} )
		);
		expect(
			addLayer( motion, 'title', 'entrance.text', { effect: 'scramble' } )
		).toEqual( {
			refusal: TEXT,
		} );
	} );

	it( 'allows an effects-panel scramble on load, and refuses switching it to hover', () => {
		let motion = ok(
			addLayer( undefined, 'title', 'entrance.text', {
				effect: 'split-reveal',
			} )
		);
		const added = addLayer( motion, 'title', 'effects', {
			effect: 'scramble',
		} );
		motion = ok( added );
		const onLoad = updateLayer(
			motion,
			'title',
			'effects',
			added.layer.id,
			{
				...added.layer,
				trigger: 'load',
			}
		);
		expect( onLoad.motion ).toBeDefined();
		const hovered = updateLayer(
			motion,
			'title',
			'effects',
			added.layer.id,
			{
				...added.layer,
				trigger: 'hover',
			}
		);
		expect( hovered ).toEqual( { refusal: TEXT } );
	} );
} );

describe( 'a third injected layer (§10)', () => {
	const TEXT =
		'This element already has two motion layers (Sheen, Glare). Remove one to add Cursor field ring.';

	const twoInjected = () => {
		let motion = ok(
			addLayer( undefined, 'root', 'hover.effects', { effect: 'sheen' } )
		);
		motion = ok(
			addLayer( motion, 'root', 'hover.effects', { effect: 'glare' } )
		);
		return motion;
	};

	it( 'quotes the spec text in the schema', () => {
		expect(
			ruleText( 'injected-layers' )
				.replace( '<a>', 'Sheen' )
				.replace( '<b>', 'Glare' )
				.replace( '<c>', 'Cursor field ring' )
		).toBe( TEXT );
	} );

	it( 'allows two injected layers and a cursor field without its ring', () => {
		const motion = twoInjected();
		const added = addLayer( motion, 'root', 'effects', {
			effect: 'cursor-field',
		} );
		ok( added );
		expect( added.layer.values.ring ).toBeUndefined();
		expect( elementRefusals( added.motion.elements.root ) ).toEqual( [] );
	} );

	it( 'refuses turning on the cursor field ring as a third injected layer', () => {
		const added = addLayer( twoInjected(), 'root', 'effects', {
			effect: 'cursor-field',
		} );
		const result = updateLayer(
			added.motion,
			'root',
			'effects',
			added.layer.id,
			{
				...added.layer,
				values: { ...added.layer.values, ring: true },
			}
		);
		expect( result ).toEqual( { refusal: TEXT } );
	} );

	it( 'refuses adding a third injected layer and names the added one as the layer to drop', () => {
		let motion = ok(
			addLayer( undefined, 'root', 'hover.effects', { effect: 'sheen' } )
		);
		const cursor = addLayer( motion, 'root', 'effects', {
			effect: 'cursor-field',
		} );
		motion = ok(
			updateLayer( cursor.motion, 'root', 'effects', cursor.layer.id, {
				...cursor.layer,
				values: { ...cursor.layer.values, ring: true },
			} )
		);
		const named = ruleText( 'injected-layers' )
			.replace( '<a>', 'Sheen' )
			.replace( '<b>', 'Cursor field ring' )
			.replace( '<c>', 'Glare' );
		expect( named ).toBe(
			'This element already has two motion layers (Sheen, Cursor field ring). Remove one to add Glare.'
		);
		expect(
			addLayer( motion, 'root', 'hover.effects', { effect: 'glare' } )
		).toEqual( {
			refusal: named,
		} );
	} );
} );
