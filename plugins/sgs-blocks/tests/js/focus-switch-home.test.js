/**
 * The "Keyboard focus" switch is one block-wide row, not a panel (Bean, 2026-11-25). It is the LAST row of the Hover panel
 * for a block with motion, and sits in WordPress's Advanced section (`InspectorAdvancedControls`) for a block with hover
 * colours and no Hover panel (Bean, 2026-11-26); a block with neither draws nothing.
 * `blocks/extensions/focus-rests.js::withFocusRestsControl` fills the slot (`components/SgsBlockWideRows.js`) or the
 * Advanced section; the Hover panel draws the slot at its foot.
 */
// The shared components mock has a Slot and a Fill that do not connect, so this test supplies a small working pair:
// a Fill registers its children in a store keyed by the slot's name, and a Slot draws what is registered.
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const stores = {};
	const storeFor = ( name ) => {
		stores[ name ] = stores[ name ] || { items: new Map(), listeners: new Set() };
		return stores[ name ];
	};
	let nextId = 0;
	return {
		createSlotFill: ( name ) => ( {
			Fill: ( { children } ) => {
				const store = storeFor( name );
				const id = R.useRef( nextId++ );
				R.useLayoutEffect( () => {
					store.items.set( id.current, children );
					store.listeners.forEach( ( l ) => l() );
				} );
				R.useLayoutEffect(
					() => () => {
						store.items.delete( id.current );
						store.listeners.forEach( ( l ) => l() );
					},
					[ store ]
				);
				return null;
			},
			Slot: () => {
				const store = storeFor( name );
				const [ , tick ] = R.useState( 0 );
				R.useLayoutEffect( () => {
					const l = () => tick( ( n ) => n + 1 );
					store.listeners.add( l );
					l();
					return () => store.listeners.delete( l );
				}, [ store ] );
				return R.createElement( 'div', { 'data-slot': name }, [ ...store.items.values() ].map( ( c, i ) => R.createElement( R.Fragment, { key: i }, c ) ) );
			},
		} ),
		SlotFillProvider: ( { children } ) => children,
		ToggleControl: ( { label, checked, onChange } ) =>
			R.createElement( 'input', {
				type: 'checkbox',
				'aria-label': label,
				checked,
				onChange: ( e ) => onChange( e.target.checked ),
			} ),
		PanelBody: ( { title, children } ) => R.createElement( 'section', { 'data-panel': title }, R.createElement( 'h2', null, title ), children ),
		BaseControl: { VisualLabel: ( { children } ) => R.createElement( 'span', null, children ) },
	};
} );
jest.mock( '@wordpress/block-editor', () => ( {
	InspectorControls: ( { children } ) => children,
	InspectorAdvancedControls: ( { children } ) => require( 'react' ).createElement( 'section', { 'data-panel': 'Advanced' }, children ),
} ) );
jest.mock( '../../src/components/DesignTokenPicker', () => ( { __esModule: true, default: ( { label } ) => require( 'react' ).createElement( 'i', { 'data-colour': label } ) } ) );
jest.mock( '../../src/components/GradientCapableColourControl', () => ( { __esModule: true, default: ( { label } ) => require( 'react' ).createElement( 'i', { 'data-colour': label } ) } ) );
jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: ( name ) => ( 'sgs/unlisted-motion' === name ? { supports: { sgs: { motion: {} } } } : { supports: {} } ),
} ) );

const React = require( 'react' );
const { act } = React;
const { createRoot } = require( 'react-dom/client' );
const { applyFilters } = require( '@wordpress/hooks' );
const { SlotFillProvider } = require( '@wordpress/components' );
require( '../../src/blocks/extensions/focus-rests' );
const { focusSwitchHome } = require( '../../src/blocks/extensions/focus-rests' );
const { SgsBlockWideRowsSlot } = require( '../../src/components/SgsBlockWideRows' );

global.IS_REACT_ACT_ENVIRONMENT = true;
const h = React.createElement;
const LABEL = 'Keyboard focus keeps the resting look';
let host;
let root;

// A stand-in for HoverPanel: the target picker's place, a later control, then the slot as the last child.
const HoverTop = () => h( 'section', { 'data-panel': 'Hover' }, h( 'select', { 'aria-label': 'Hover state' } ), h( 'input', { 'aria-label': 'Fine-tune', type: 'text' } ), h( SgsBlockWideRowsSlot, { home: 'hover' } ) );

function mount( name, { selected = true, setAttributes = () => {}, checked = false, panels = [ 'hover' ] } = {} ) {
	const Wrapped = applyFilters( 'editor.BlockEdit', () => h( 'div', { className: 'edit' } ) );
	host = document.createElement( 'div' );
	document.body.appendChild( host );
	root = createRoot( host );
	act( () => {
		root.render(
			h(
				SlotFillProvider,
				null,
				h( Wrapped, { name, isSelected: selected, attributes: { sgsFocusRests: checked }, setAttributes } ),
				panels.includes( 'hover' ) ? h( HoverTop ) : null
			)
		);
	} );
}
afterEach( () => {
	act( () => root.unmount() );
	host.remove();
} );

const row = () => host.querySelector( `input[aria-label="${ LABEL }"]` );
const inPanel = ( title ) => host.querySelector( `[data-panel="${ title }"] input[aria-label="${ LABEL }"]` );

describe( 'the Keyboard focus row', () => {
	it( 'is the last row of the Hover panel, after the next control, for a block with motion', () => {
		mount( 'sgs/hero' );
		expect( inPanel( 'Hover' ) ).not.toBeNull();
		const select = host.querySelector( 'select[aria-label="Hover state"]' );
		const fineTune = host.querySelector( 'input[aria-label="Fine-tune"]' );
		// eslint-disable-next-line no-bitwise
		expect( row().compareDocumentPosition( select ) & Node.DOCUMENT_POSITION_PRECEDING ).toBeTruthy();
		// eslint-disable-next-line no-bitwise
		expect( row().compareDocumentPosition( fineTune ) & Node.DOCUMENT_POSITION_PRECEDING ).toBeTruthy();
		expect( host.querySelectorAll( `input[aria-label="${ LABEL }"]` ) ).toHaveLength( 1 );
	} );

	it( 'sits in the Advanced section, not the Hover panel, for a block with hover colours and no motion', () => {
		mount( 'sgs/tab' );
		expect( inPanel( 'Advanced' ) ).not.toBeNull();
		expect( inPanel( 'Hover' ) ).toBeNull();
	} );

	it( 'is not drawn for a block with no hover value', () => {
		mount( 'sgs/gift-order' );
		expect( row() ).toBeNull();
	} );

	it( 'is not drawn for a block that is not selected', () => {
		mount( 'sgs/hero', { selected: false } );
		expect( row() ).toBeNull();
	} );

	it( 'draws no panel titled Keyboard focus', () => {
		mount( 'sgs/hero' );
		expect( host.querySelector( '[data-panel="Keyboard focus"]' ) ).toBeNull();
		expect( host.textContent ).not.toMatch( /^Keyboard focus$/m );
	} );

	it( 'reads the saved value and writes sgsFocusRests', () => {
		const setAttributes = jest.fn();
		mount( 'sgs/hero', { setAttributes, checked: true } );
		expect( row().checked ).toBe( true );
		act( () => row().click() );
		expect( setAttributes ).toHaveBeenCalledWith( { sgsFocusRests: false } );
	} );

	it( 'a Hover panel with no filler draws an empty slot', () => {
		mount( 'sgs/gift-order' );
		expect( host.querySelectorAll( 'input[type="checkbox"]' ) ).toHaveLength( 0 );
	} );

	it( 'holds more than one row in one slot', () => {
		const { SgsBlockWideRowsFill } = require( '../../src/components/SgsBlockWideRows' );
		host = document.createElement( 'div' );
		document.body.appendChild( host );
		root = createRoot( host );
		act( () => {
			root.render(
				h(
					SlotFillProvider,
					null,
					h( SgsBlockWideRowsFill, { home: 'hover' }, h( 'p', { id: 'one' }, 'one' ) ),
					h( SgsBlockWideRowsFill, { home: 'hover' }, h( 'p', { id: 'two' }, 'two' ) ),
					h( HoverTop )
				)
			);
		} );
		expect( host.querySelector( '#one' ) ).not.toBeNull();
		expect( host.querySelector( '#two' ) ).not.toBeNull();
	} );
} );

describe( 'focusSwitchHome()', () => {
	it( 'reads the data, and falls back on the motion declaration for an unlisted block', () => {
		expect( focusSwitchHome( 'sgs/hero' ) ).toBe( 'hover' );
		expect( focusSwitchHome( 'sgs/tab' ) ).toBe( 'advanced' );
		expect( focusSwitchHome( 'sgs/notice-message' ) ).toBe( '' );
		expect( focusSwitchHome( 'sgs/unlisted-motion' ) ).toBe( 'hover' );
		expect( focusSwitchHome( 'sgs/unlisted-plain' ) ).toBe( '' );
	} );
} );
