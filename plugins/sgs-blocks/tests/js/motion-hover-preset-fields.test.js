/**
 * The Grayscale to colour and Border accent presets and their fields (Spec 38A §5.1, §10; FR-38A-7; plan M3.9 (b), (c)),
 * editor side: the two presets exist and stamp only hover-state values, the Fine-tune draws the rest grayscale beside the
 * hover grayscale and the accent line beside the ring (both left out, with the ring, on a shadowed element), and the
 * canvas emitter writes the rest grayscale plain and the hover grayscale minus it, and drops an invisible ring or
 * accent on its own. The PHP twin is `tests/php/MotionHoverPresetFieldsTest.php`; the canvas parity cases hold both.
 */
const presets = require( '../../scripts/data/motion-presets.json' ).presets;
const {
	HOVER_GROUPS,
	RING_KEYS,
	RING_REFUSAL_MESSAGE,
	fieldGroups,
} = require( '../../src/blocks/extensions/motion/hover/hover-fields' );
const {
	ringUnpainted,
	stripRing,
} = require( '../../src/blocks/extensions/motion/canvas/emit-ring' );
const {
	emitScopedCss,
} = require( '../../src/blocks/extensions/motion/canvas/emit-scoped-css' );

const preset = ( slug ) => presets.find( ( row ) => row.slug === slug );
const emit = ( values, attributes ) =>
	emitScopedCss(
		{ v: 1, elements: { root: { hover: { state: { values } } } } },
		{ blockName: 'sgs/text', elements: {}, root: '.sgs-m-test', attributes }
	);

describe( 'the two §5.1 presets', () => {
	it( 'Grayscale to colour rests grey and turns to colour on the medium duration', () => {
		expect( preset( 'hover-grayscale-to-colour' ) ).toMatchObject( {
			panel: 'hover',
			effect: null,
			kind: 'preset',
			label: 'Grayscale to colour',
			trigger: 'hover',
			target: 'part',
			values: { restGrayscale: 1, grayscale: 0, duration: 'token:duration.medium', easing: 'token:easing.ease-out' },
		} );
	} );
	it( 'Border accent draws a 3px accent-colour line on the fast duration', () => {
		expect( preset( 'hover-border-accent' ) ).toMatchObject( {
			panel: 'hover',
			effect: null,
			kind: 'preset',
			label: 'Border accent',
			trigger: 'hover',
			target: 'part',
			values: { accentWidth: 3, accentColour: 'accent', duration: 'token:duration.fast', easing: 'token:easing.ease-out' },
		} );
	} );
} );

describe( 'the Fine-tune fields', () => {
	const keysOf = ( groups, id ) => groups.find( ( g ) => g.id === id )?.fields.map( ( f ) => f.key ) || [];
	it( 'draws the rest grayscale in the filter group and the accent line beside the ring', () => {
		const groups = fieldGroups( 'HoverStateValues', HOVER_GROUPS );
		expect( keysOf( groups, 'look' ) ).toEqual( expect.arrayContaining( [ 'restGrayscale', 'grayscale' ] ) );
		expect( keysOf( groups, 'ring' ) ).toEqual( [ 'ringSpread', 'ringColour', 'accentWidth', 'accentColour' ] );
	} );
	it( 'leaves the ring and the accent out of a shadowed element and says why for both', () => {
		expect( RING_KEYS ).toEqual( [ 'ringSpread', 'ringColour', 'accentWidth', 'accentColour' ] );
		const ring = fieldGroups( 'HoverStateValues', HOVER_GROUPS, undefined, RING_KEYS ).find( ( g ) => g.id === 'ring' );
		expect( ring ).toMatchObject( { fields: [], refused: true } );
		expect( RING_REFUSAL_MESSAGE ).toContain( 'accent line' );
	} );
} );

describe( 'the canvas emitter', () => {
	it( 'writes the rest grayscale plain and the hover grayscale minus it, on the filter channel', () => {
		const out = emit( { restGrayscale: 1, grayscale: 0 } );
		expect( out.css ).toContain( '--sgs-gray-rest:1;' );
		expect( out.css ).toContain( '--sgs-mh-to-gray:calc(0 - 1);' );
		expect( out.plans[ 0 ].attrs[ 'data-sgs-mc' ] ).toContain( 'filter' );
	} );
	it( 'writes the accent line on the box-shadow channel', () => {
		const out = emit( { accentWidth: 3, accentColour: 'accent' } );
		expect( out.css ).toContain( '--sgs-mh-to-accent:3px;' );
		expect( out.css ).toContain( '--sgs-mh-to-accent-c:var(--wp--preset--color--accent, currentColor);' );
		expect( out.plans[ 0 ].attrs[ 'data-sgs-mc' ] ).toContain( 'box-shadow' );
	} );
	it( 'drops an invisible ring on its own and keeps a painting accent', () => {
		const state = { values: { ringSpread: 4, accentWidth: 3, accentColour: '#0A7EA8' } };
		expect( ringUnpainted( state ) ).toEqual( [ 'ringSpread', 'ringColour' ] );
		expect( stripRing( state, false ).values ).toEqual( { accentWidth: 3, accentColour: '#0A7EA8' } );
		expect( stripRing( state ).values ).toEqual( {} );
		const out = emit( state.values );
		expect( out.css ).not.toContain( '--sgs-mh-to-ring' );
		expect( out.css ).toContain( '--sgs-mh-to-accent:3px;' );
	} );
	it( 'drops the accent with the ring on a shadowed element', () => {
		const out = emitScopedCss(
			{ v: 1, elements: { root: { hover: { state: { values: { accentWidth: 3, accentColour: '#0A7EA8', translateY: -4 } } } } } },
			{
				blockName: 'sgs/text',
				elements: { box: { isWrapper: true, attrMap: { 'css:box-shadow': 'shadow' } } },
				root: '.sgs-m-test',
				attributes: { shadow: 'md' },
			}
		);
		expect( out.css ).not.toContain( '--sgs-mh-to-accent' );
		expect( out.css ).toContain( '--sgs-mh-to-ty:' );
		expect( out.dropped ).toEqual( [ expect.objectContaining( { id: 'ring-resting-shadow' } ) ] );
	} );
} );
