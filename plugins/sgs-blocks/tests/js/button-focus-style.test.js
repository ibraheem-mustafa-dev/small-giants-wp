/**
 * sgs/button "Keyboard focus" (focusStyle): the inspector control in the Effects panel (Default, Contrast, Signature,
 * Signature disabled with its reason when the button's ::before is taken), the canvas class and host-border width,
 * and the editor twin of includes/helpers-button-focus.php. The PHP half is tests/php/ButtonFocusStyleTest.php.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

global.IS_REACT_ACT_ENVIRONMENT = true;

// The toggle group and its options render as real buttons so the test can read each option's label and state.
jest.mock( '../../src/components/primitives', () => {
	const R = require( 'react' );
	const actual = jest.requireActual( '../../src/components/primitives' );
	return {
		...actual,
		ToggleGroupControl: ( { label, help, value, children } ) =>
			R.createElement(
				'fieldset',
				{ 'data-testid': 'toggle-group', 'data-label': label, 'data-value': value },
				R.createElement( 'legend', null, label ),
				children,
				R.createElement( 'p', { 'data-testid': 'toggle-help' }, help )
			),
		ToggleGroupControlOption: ( { value, label, disabled } ) =>
			R.createElement( 'button', { type: 'button', value, disabled: !! disabled }, label ),
	};
} );

const { getBlockType } = require( '@wordpress/blocks' );
const Edit = require( '../../src/blocks/button/edit' ).default;
const {
	focusStyleClass,
	focusHostBorder,
	groupFocusHostBorder,
	GROUP_HOST_BORDER_PROPERTY,
	signatureRefusal,
	beforeSlotOwner,
} = require( '../../src/blocks/button/focus-style' );

const GRADIENT = 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)';
const motionWith = ( effect, key = 'root' ) => ( {
	elements: { [ key ]: { effects: [ { id: 'l1', effect, values: {} } ] } },
} );

let root;
let container;
afterEach( () => {
	if ( root ) {
		act( () => root.unmount() );
		container.remove();
		root = null;
	}
	getBlockType.mockImplementation( () => null );
} );

const mount = ( attributes ) => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
	act( () =>
		root.render(
			React.createElement( Edit, {
				attributes: { label: 'Go', ...attributes },
				setAttributes: jest.fn(),
				clientId: 'client-1',
				isSelected: true,
				name: 'sgs/button',
			} )
		)
	);
	return container;
};

const focusGroup = ( node ) =>
	[ ...node.querySelectorAll( '[data-testid="toggle-group"]' ) ].find(
		( group ) => group.dataset.label === 'Keyboard focus'
	);
const option = ( group, label ) =>
	[ ...group.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent === label );

describe( 'the Keyboard focus control', () => {
	it( 'offers Default, Contrast and Signature, labels of 12 characters or fewer', () => {
		const group = focusGroup( mount( {} ) );
		expect( group ).toBeTruthy();
		const labels = [ ...group.querySelectorAll( 'button' ) ].map( ( b ) => b.textContent );
		expect( labels ).toEqual( [ 'Default', 'Contrast', 'Signature' ] );
		labels.forEach( ( label ) => expect( label.length ).toBeLessThanOrEqual( 12 ) );
		expect( group.dataset.value ).toBe( 'default' );
		expect( option( group, 'Signature' ).disabled ).toBe( false );
		expect( group.querySelector( '[data-testid="toggle-help"]' ).textContent ).toBe(
			"Default uses the site's focus style. Contrast always uses the dark-and-light ring (use it on photos or busy grounds). Signature adds a slowly turning border in the site's colours; it stops for visitors who prefer less motion."
		);
	} );

	it( 'disables Signature with a reason when the border has a gradient', () => {
		const group = focusGroup( mount( { borderColourGradient: GRADIENT, focusStyle: 'signature' } ) );
		expect( option( group, 'Signature' ).disabled ).toBe( true );
		expect( option( group, 'Contrast' ).disabled ).toBe( false );
		expect( group.querySelector( '[data-testid="toggle-help"]' ).textContent ).toContain(
			'Signature is off while the border has a gradient'
		);
	} );

	it( 'disables Signature when a motion effect owns ::before', () => {
		const group = focusGroup( mount( { sgsMotion: motionWith( 'cursor-field' ) } ) );
		expect( option( group, 'Signature' ).disabled ).toBe( true );
		expect( group.querySelector( '[data-testid="toggle-help"]' ).textContent ).toContain( 'Cursor field' );
	} );

	it( 'gives the canvas button the class render.php prints, and none for a refused Signature', () => {
		expect( mount( { focusStyle: 'duotone' } ).querySelector( '.sgs-button' ).classList.contains( 'sgs-focus--duotone' ) ).toBe( true );
		act( () => root.unmount() );
		container.remove();
		root = null;
		expect( mount( { focusStyle: 'signature' } ).querySelector( '.sgs-button' ).classList.contains( 'sgs-focus--signature' ) ).toBe( true );
		act( () => root.unmount() );
		container.remove();
		root = null;
		const refused = mount( { focusStyle: 'signature', borderColourGradient: GRADIENT } ).querySelector( '.sgs-button' );
		expect( refused.classList.contains( 'sgs-focus--signature' ) ).toBe( false );
	} );
} );

describe( 'the editor twin of helpers-button-focus.php', () => {
	it( 'prints the class for each style', () => {
		expect( focusStyleClass( { focusStyle: 'signature' } ) ).toBe( 'sgs-focus--signature' );
		expect( focusStyleClass( { focusStyle: 'duotone' } ) ).toBe( 'sgs-focus--duotone' );
		expect( focusStyleClass( { focusStyle: 'duotone', borderColourGradient: GRADIENT } ) ).toBe( 'sgs-focus--duotone' );
	} );

	it( 'NEGATIVE CONTROL: Default, an unknown value and a refused Signature print nothing', () => {
		expect( focusStyleClass( {} ) ).toBe( '' );
		expect( focusStyleClass( { focusStyle: 'sparkle' } ) ).toBe( '' );
		expect( focusStyleClass( { focusStyle: 'signature', borderColourGradient: GRADIENT } ) ).toBe( '' );
		expect( focusStyleClass( { focusStyle: 'signature', sgsMotion: motionWith( 'wave-gradient' ) } ) ).toBe( '' );
	} );

	it( 'refuses only an effect that claims ::before, on the root or a wrapper part', () => {
		expect( beforeSlotOwner( motionWith( 'ripple' ) ) ).toBe( '' );
		expect( signatureRefusal( { sgsMotion: motionWith( 'ripple' ) } ) ).toBe( '' );
		expect( beforeSlotOwner( motionWith( 'cursor-field', 'icon' ) ) ).toBe( '' );
		getBlockType.mockImplementation( () => ( {
			supports: { sgs: { elements: { button: { isWrapper: true }, icon: {} } } },
		} ) );
		expect( beforeSlotOwner( motionWith( 'cursor-field', 'button' ) ) ).toBe( 'Cursor field' );
		expect( beforeSlotOwner( motionWith( 'cursor-field', 'icon' ) ) ).toBe( '' );
	} );

	it( 'gives the host border width like render.php', () => {
		const two = { top: '2px', right: '2px', bottom: '2px', left: '2px' };
		expect( focusHostBorder( { borderWidth: two } ) ).toBe( '2px' );
		expect( focusHostBorder( { borderWidth: { top: '1px', bottom: '3px' } } ) ).toBe( 'max(1px,0px,3px,0px)' );
		expect( focusHostBorder( { inheritStyle: 'outline' } ) ).toBe( 'var(--wp--custom--button-presets--outline--border-width,2px)' );
		expect( focusHostBorder( { inheritStyle: 'link' } ) ).toBe( '' );
		expect( focusHostBorder( { inheritStyle: 'primary', borderStyle: 'none' } ) ).toBe( '' );
		expect( focusHostBorder( { borderWidth: { top: '0', left: '0px' } } ) ).toBe( '' );
	} );

	it( 'a preset-less button reads the group default border through the group property', () => {
		expect( GROUP_HOST_BORDER_PROPERTY ).toBe( '--sgs-mb-btn-focus-host-border-default' );
		expect( focusHostBorder( { inheritStyle: 'custom' } ) ).toBe( `var(${ GROUP_HOST_BORDER_PROPERTY })` );
		expect( focusHostBorder( { inheritStyle: 'custom', borderWidth: { top: '1px', right: '1px', bottom: '1px', left: '1px' } } ) ).toBe( '1px' );
		expect( focusHostBorder( { inheritStyle: 'link' } ) ).toBe( '' );
	} );

	it( 'the group default border resolves to one length like the PHP helper', () => {
		const two = { top: '2px', right: '2px', bottom: '2px', left: '2px' };
		expect( groupFocusHostBorder( { childBtnBorderWidth: two } ) ).toBe( '2px' );
		expect( groupFocusHostBorder( { childBtnBorderWidth: { top: '2px', right: '0', bottom: '2px', left: '0' } } ) ).toBe( 'max(2px,0px,2px,0px)' );
		expect( groupFocusHostBorder( { childBtnBorderWidth: two, childBtnBorderStyle: 'none' } ) ).toBe( '' );
		expect( groupFocusHostBorder( { childBtnBorderWidth: {} } ) ).toBe( '' );
		expect( groupFocusHostBorder( {} ) ).toBe( '' );
	} );
} );
