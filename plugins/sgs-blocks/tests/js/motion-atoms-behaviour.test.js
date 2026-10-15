/**
 * Motion non-value atoms (Spec 38A FR-38A-54, FR-38A-6, FR-38A-24): the target picker lists a block's declared parts
 * plus root, the trigger picker offers the panel's triggers filtered by the effect, the intensity picker re-stamps a
 * layer from its three preset rows, Replay plays once per press, and the stagger helper writes the FR-38A-24 delays.
 * The shared stand-ins are in `motion-atoms-harness.js`.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { setText, click } = require( './motion-atoms-harness' );
const { choiceOptions, pickChoice } = require( './motion-choice-helpers' );

const h = React.createElement;

const { registerBlockType } = require( '@wordpress/blocks' );
const {
	TargetPicker,
	targetOptions,
	TriggerPicker,
	triggersFor,
	IntensityPicker,
	intensityRowsFor,
	restampLayer,
	ReplayButton,
	StaggerHelper,
} = require( '../../src/components/motion' );
const presetFile = require( '../../src/components/motion/generated-motion-presets.json' );
const defs = require( '../../src/components/motion/generated-motion-defs.json' );
const fxMeta = require( '../../src/blocks/extensions/generated-fx-effect-meta.json' );

const quoteBlock = JSON.parse(
	fs.readFileSync( path.join( __dirname, '..', '..', 'src', 'blocks', 'quote', 'block.json' ), 'utf8' )
);

let container;
let root;
beforeEach( () => {
	global.__motionDevice = 'Desktop';
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
} );
afterEach( () => {
	act( () => root.unmount() );
	container.remove();
} );

const q = ( selector ) => container.querySelector( selector );
const field = ( tag, label ) => q( `${ tag }[aria-label="${ label }"]` );
const alertText = () => q( '[role="alert"]' )?.textContent || '';
const buttonNamed = ( text ) => [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === text );

/** The option values a choice shows, whether it rendered as a segmented group or a select. */
const shownOptions = ( label ) => choiceOptions( container, label ).map( ( option ) => option.value );

/** Mounts an atom over controlled state; returns what it emitted. */
function mount( Atom, props, initial ) {
	const emitted = [];
	function Harness() {
		const [ value, setValue ] = React.useState( initial );
		return h( Atom, {
			...props,
			value,
			onChange: ( next ) => {
				emitted.push( next );
				setValue( next );
			},
		} );
	}
	act( () => root.render( h( Harness ) ) );
	return emitted;
}

describe( 'the target picker', () => {
	it( 'for sgs/quote lists root plus exactly the parts the block declares as targets', () => {
		const elements = quoteBlock.supports.sgs.elements;
		// A wrapper part (`isWrapper`) is the root under another name, so it is not offered a second time.
		const declared = Object.keys( elements ).filter( ( key ) => elements[ key ].motion !== false && elements[ key ].isWrapper !== true );
		const excluded = Object.keys( elements ).filter( ( key ) => elements[ key ].motion === false );
		expect( declared.length ).toBeGreaterThan( 0 );
		// A part marked `"motion": false` (Spec 38A §6.2) is never offered.
		expect( excluded.length ).toBeGreaterThan( 0 );
		expect( targetOptions( quoteBlock.supports.sgs.elements ).map( ( o ) => o.value ) ).toEqual( [ 'root', ...declared ] );
		mount( TargetPicker, { elements: quoteBlock.supports.sgs.elements }, 'root' );
		expect( shownOptions( 'Animate' ) ).toEqual( [ 'root', ...declared ] );
	} );

	it( 'reads the parts from the registered block when given a block name', () => {
		registerBlockType( 'sgs/picker-fixture', {
			attributes: {},
			supports: { sgs: { elements: { title: { label: 'Title', order: 2 }, icon: { label: 'Icon', order: 1 } } } },
		} );
		mount( TargetPicker, { blockName: 'sgs/picker-fixture' }, undefined );
		expect( shownOptions( 'Animate' ) ).toEqual( [ 'root', 'icon', 'title' ] );
	} );

	it( 'a block that declares no parts offers the whole block only', () => {
		expect( targetOptions( undefined ).map( ( o ) => o.value ) ).toEqual( [ 'root' ] );
	} );

	it( 'choosing a part reports its key, and an unset value reads as root', () => {
		const emitted = mount( TargetPicker, { elements: { title: { label: 'Title', order: 1 } } }, undefined );
		pickChoice( container, 'Animate', 'title' );
		expect( emitted ).toEqual( [ 'title' ] );
	} );

	it( 'shows a custom target the cloning tool wrote, without offering to create one', () => {
		mount( TargetPicker, { elements: {} }, 'custom:1' );
		expect( container.textContent ).toContain( 'Custom target' );
		mount( TargetPicker, { elements: {} }, 'root' );
		expect( container.textContent ).not.toContain( 'Custom target' );
	} );
} );

describe( 'the trigger picker', () => {
	it( 'offers exactly the panel triggers of the schema', () => {
		expect( triggersFor( { panel: 'hover' } ) ).toEqual( [ 'hover' ] );
		expect( triggersFor( { panel: 'entrance', states: [ 'added' ] } ) ).toEqual( [ 'load', 'scroll', 'open', 'state' ] );
		expect( triggersFor( { panel: 'effects' } ) ).toEqual( [ 'load', 'visible', 'scroll', 'hover', 'pointerdown', 'click' ] );
	} );

	it( 'drops state when the block declares no state, and anything excluded', () => {
		expect( triggersFor( { panel: 'entrance' } ) ).toEqual( [ 'load', 'scroll', 'open' ] );
		expect( triggersFor( { panel: 'entrance', exclude: [ 'open' ] } ) ).toEqual( [ 'load', 'scroll' ] );
	} );

	it( 'is filtered by the effect fx_effects.triggers', () => {
		const cursor = fxMeta[ 'cursor-field' ].triggers;
		expect( triggersFor( { panel: 'effects', effectTriggers: cursor } ) ).toEqual( cursor );
		expect( triggersFor( { panel: 'effects', effectTriggers: [ 'click', 'load', 'swipe' ] } ) ).toEqual( [ 'load', 'click' ] );
	} );

	it( 'renders those triggers and reports the choice', () => {
		const emitted = mount( TriggerPicker, { panel: 'entrance', effectTriggers: [ 'load', 'scroll' ] }, 'scroll' );
		expect( shownOptions( 'Start when' ) ).toEqual( [ 'load', 'scroll' ] );
		pickChoice( container, 'Start when', 'load' );
		expect( emitted ).toEqual( [ 'load' ] );
	} );

	it( 'a panel with no trigger to choose renders nothing', () => {
		mount( TriggerPicker, { panel: 'effects', effectTriggers: [ 'swipe' ] }, undefined );
		expect( container.textContent ).toBe( '' );
	} );

	it( 'choosing the state trigger shows the block states', () => {
		const props = { panel: 'entrance', states: [ 'added', 'removed' ], state: 'added', onStateChange: () => {} };
		mount( TriggerPicker, props, 'state' );
		expect( container.textContent ).toContain( 'Added' );
		expect( container.textContent ).toContain( 'Removed' );
	} );
} );

describe( 'the intensity picker', () => {
	const rowsOf = ( family ) =>
		Object.fromEntries(
			presetFile.presets.filter( ( p ) => p.kind === 'intensity' && p.family === family ).map( ( p ) => [ p.intensity, p ] )
		);

	it( 'finds the three rows of a family and none for a family without them', () => {
		expect( Object.keys( intensityRowsFor( 'hover-lift' ) ) ).toEqual( [ 'subtle', 'standard', 'bold' ] );
		expect( intensityRowsFor( 'entrance-fade-in' ) ).toBeNull();
	} );

	it( 're-stamps the layer from each of the three preset rows', () => {
		const rows = rowsOf( 'hover-lift' );
		[ 'subtle', 'standard', 'bold' ].forEach( ( name ) => {
			const layer = restampLayer( 'hover-lift', name, { duration: 'token:duration.fast', translateY: 'x' } );
			expect( layer.intensity ).toBe( name );
			expect( layer.values.translateY ).toBe( rows[ name ].values.translateY );
			expect( layer.values.duration ).toBe( 'token:duration.fast' );
		} );
		expect( rows.subtle.values.translateY ).not.toBe( rows.bold.values.translateY );
	} );

	it( 'keeps a value the client customised, and merges nested objects', () => {
		const kept = restampLayer( 'hover-lift', 'bold', { translateY: '-12px' }, [ 'values.translateY' ] );
		expect( kept.values.translateY ).toBe( '-12px' );
		const nested = restampLayer( 'split-reveal', 'bold', { from: { opacity: 0, translateY: '0.6em' } } );
		expect( nested.values.from ).toEqual( { opacity: 0, translateY: rowsOf( 'split-reveal' ).bold.values.from.translateY } );
	} );

	it( 'renders the three choices and reports the re-stamped layer', () => {
		const emitted = [];
		act( () =>
			root.render(
				h( IntensityPicker, {
					family: 'hover-lift',
					value: 'standard',
					values: { duration: 'token:duration.fast' },
					onChange: ( layer ) => emitted.push( layer ),
				} )
			)
		);
		expect( shownOptions( 'Intensity' ) ).toEqual( [ 'subtle', 'standard', 'bold' ] );
		pickChoice( container, 'Intensity', 'bold' );
		expect( emitted ).toEqual( [
			{ intensity: 'bold', values: { duration: 'token:duration.fast', translateY: rowsOf( 'hover-lift' ).bold.values.translateY } },
		] );
	} );

	it( 'renders nothing for a family without intensity rows', () => {
		act( () => root.render( h( IntensityPicker, { family: 'entrance-fade-in', onChange: () => {} } ) ) );
		expect( container.textContent ).toBe( '' );
	} );
} );

describe( 'the replay button', () => {
	it( 'plays once per press: a second press while playing is ignored, and a later one plays again', async () => {
		let finish;
		const onReplay = jest.fn( () => new Promise( ( resolve ) => ( finish = resolve ) ) );
		act( () => root.render( h( ReplayButton, { onReplay } ) ) );
		click( buttonNamed( 'Replay' ) );
		click( buttonNamed( 'Replay' ) );
		expect( onReplay ).toHaveBeenCalledTimes( 1 );
		expect( buttonNamed( 'Replay' ).getAttribute( 'aria-busy' ) ).toBe( 'true' );
		await act( async () => finish() );
		click( buttonNamed( 'Replay' ) );
		expect( onReplay ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'does nothing when disabled', () => {
		const onReplay = jest.fn();
		act( () => root.render( h( ReplayButton, { onReplay, disabled: true } ) ) );
		click( buttonNamed( 'Replay' ) );
		expect( onReplay ).not.toHaveBeenCalled();
	} );
} );

describe( 'the stagger helper', () => {
	const write = jest.fn();
	beforeEach( () => write.mockClear() );
	const helper = ( props, initial ) =>
		mount( StaggerHelper, { childCount: 6, columns: 3, onWriteDelays: write, ...props }, initial );
	const written = () => write.mock.calls[ 0 ][ 0 ];

	it( 'previews and writes 0, 80, 160, 0, 80, 160 for 3 columns by 6 children at step 80', () => {
		helper( {}, { step: 80 } );
		expect( q( '.sgs-motion-atom__preview' ).textContent ).toContain( '0, 80, 160, 0, 80, 160' );
		click( buttonNamed( 'Write delays' ) );
		expect( write ).toHaveBeenCalledTimes( 1 );
		expect( written() ).toEqual( [ 0, 80, 160, 0, 80, 160 ] );
	} );

	it( 'a start offset of 40 writes 40, 120, 200, 40, 120, 200', () => {
		const emitted = helper( {}, { step: 80 } );
		setText( field( 'input', 'Start offset (ms)' ), '40' );
		expect( emitted.at( -1 ) ).toEqual( { step: 80, offset: 40 } );
		click( buttonNamed( 'Write delays' ) );
		expect( written() ).toEqual( [ 40, 120, 200, 40, 120, 200 ] );
	} );

	it( 'a single column of four with offset 50 and step 50 writes 50, 100, 150, 200 and hides the row restart', () => {
		helper( { childCount: 4, columns: null }, { offset: 50, step: 50 } );
		expect( field( 'input', 'Restart each visual row' ) ).toBeNull();
		click( buttonNamed( 'Write delays' ) );
		expect( written() ).toEqual( [ 50, 100, 150, 200 ] );
	} );

	it( 'the cap, counted with the offset, clips the written delays', () => {
		helper( { childCount: 6, columns: null }, { offset: 50, step: 100, cap: 300 } );
		click( buttonNamed( 'Write delays' ) );
		expect( written() ).toEqual( [ 50, 150, 250, 300, 300, 300 ] );
	} );

	it( 'turning the row restart off runs the ladder on', () => {
		const emitted = helper( {}, { step: 80 } );
		click( field( 'input', 'Restart each visual row' ) );
		expect( emitted.at( -1 ).perRow ).toBe( false );
		click( buttonNamed( 'Write delays' ) );
		expect( written() ).toEqual( [ 0, 80, 160, 240, 320, 400 ] );
	} );

	it( 'offers the orders the schema lists, and Reverse writes the reversed rows', () => {
		const emitted = helper( {}, { step: 80 } );
		expect( shownOptions( 'Order' ) ).toEqual( defs.$defs.Stagger.properties.order.enum );
		pickChoice( container, 'Order', 'reverse' );
		expect( emitted.at( -1 ).order ).toBe( 'reverse' );
		click( buttonNamed( 'Write delays' ) );
		expect( written() ).toEqual( [ 160, 80, 0, 160, 80, 0 ] );
	} );

	it( 'refuses an offset outside the schema range and saves nothing', () => {
		const emitted = helper( {}, { step: 80 } );
		setText( field( 'input', 'Start offset (ms)' ), '99999' );
		expect( alertText() ).toContain( 'Not saved' );
		expect( emitted ).toEqual( [] );
	} );

	it( 'with no children there is nothing to write', () => {
		helper( { childCount: 0 }, { step: 80 } );
		expect( buttonNamed( 'Write delays' ).disabled ).toBe( true );
	} );

	it( 'a planted wrong delay fails (MUST FAIL control)', () => {
		helper( {}, { step: 80 } );
		click( buttonNamed( 'Write delays' ) );
		expect( () => expect( written() ).toEqual( [ 0, 80, 160, 240, 320, 400 ] ) ).toThrow();
	} );
} );
