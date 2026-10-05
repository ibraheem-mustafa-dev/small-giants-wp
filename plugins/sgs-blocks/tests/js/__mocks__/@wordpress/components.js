'use strict';
// Mock for @wordpress/components
// Components do NOT spread props onto DOM elements to avoid React unknown-prop warnings.

const React = require( 'react' );

/** Render only children in a div with a data-testid. */
const makeComponent = ( name ) => {
	const Comp = ( { children } ) =>
		React.createElement( 'div', { 'data-testid': name }, children );
	Comp.displayName = name;
	return Comp;
};

/** Minimal controlled text input — only passes standard HTML attrs. */
const makeInput = ( name ) => {
	const Input = ( { value, onChange } ) =>
		React.createElement( 'input', {
			'data-testid': name,
			value: value !== undefined ? String( value ) : '',
			onChange: ( e ) => onChange && onChange( e.target.value ),
		} );
	Input.displayName = name;
	return Input;
};

// A known component the list above does not name renders its children (a PascalCase export) and any other known
// helper is a no-op, so a block using a newer core component still mounts.
const KNOWN = require( './known-exports.json' )[ '@wordpress/components' ];
const named = {
	__esModule: true,
	PanelBody: makeComponent( 'PanelBody' ),
	PanelRow: makeComponent( 'PanelRow' ),
	SelectControl: makeComponent( 'SelectControl' ),
	TextControl: makeInput( 'TextControl' ),
	TextareaControl: makeInput( 'TextareaControl' ),
	ToggleControl: ( { checked, onChange } ) =>
		React.createElement( 'input', {
			type: 'checkbox',
			'data-testid': 'ToggleControl',
			defaultChecked: !! checked,
			onChange: ( e ) => onChange && onChange( e.target.checked ),
		} ),
	RangeControl: makeInput( 'RangeControl' ),
	Button: ( { children, onClick } ) =>
		React.createElement( 'button', { onClick }, children ),
	ButtonGroup: makeComponent( 'ButtonGroup' ),
	Placeholder: makeComponent( 'Placeholder' ),
	Spinner: () => React.createElement( 'span', { 'data-testid': 'Spinner' }, '…' ),
	Notice: makeComponent( 'Notice' ),
	Modal: makeComponent( 'Modal' ),
	ColorPalette: makeComponent( 'ColorPalette' ),
	ColorPicker: makeComponent( 'ColorPicker' ),
	BaseControl: makeComponent( 'BaseControl' ),
	CheckboxControl: makeComponent( 'CheckboxControl' ),
	RadioControl: makeComponent( 'RadioControl' ),
	FormTokenField: makeComponent( 'FormTokenField' ),
	ComboboxControl: makeComponent( 'ComboboxControl' ),
	__experimentalToggleGroupControl: makeComponent( '__experimentalToggleGroupControl' ),
	__experimentalToggleGroupControlOption: makeComponent( '__experimentalToggleGroupControlOption' ),
	__experimentalNumberControl: makeInput( '__experimentalNumberControl' ),
	__experimentalBoxControl: makeComponent( '__experimentalBoxControl' ),
	__experimentalBorderControl: makeComponent( '__experimentalBorderControl' ),
	__experimentalUnitControl: makeInput( '__experimentalUnitControl' ),
	__experimentalHeading: makeComponent( '__experimentalHeading' ),
	__experimentalSpacer: makeComponent( '__experimentalSpacer' ),
	__experimentalHStack: makeComponent( '__experimentalHStack' ),
	__experimentalVStack: makeComponent( '__experimentalVStack' ),
	__experimentalGrid: makeComponent( '__experimentalGrid' ),
	__experimentalText: makeComponent( '__experimentalText' ),
	ToolbarButton: makeComponent( 'ToolbarButton' ),
	ToolbarGroup: makeComponent( 'ToolbarGroup' ),
	Toolbar: makeComponent( 'Toolbar' ),
	DropdownMenu: makeComponent( 'DropdownMenu' ),
	MenuGroup: makeComponent( 'MenuGroup' ),
	MenuItem: makeComponent( 'MenuItem' ),
	Popover: makeComponent( 'Popover' ),
	Tooltip: makeComponent( 'Tooltip' ),
	InputControl: makeInput( 'InputControl' ),
	NumberControl: makeInput( 'NumberControl' ),
	UnitControl: makeInput( 'UnitControl' ),
	TabPanel: makeComponent( 'TabPanel' ),
	Card: makeComponent( 'Card' ),
	CardBody: makeComponent( 'CardBody' ),
	CardHeader: makeComponent( 'CardHeader' ),
	Flex: makeComponent( 'Flex' ),
	FlexItem: makeComponent( 'FlexItem' ),
	FlexBlock: makeComponent( 'FlexBlock' ),
	Icon: ( { icon: IconFn } ) =>
		React.createElement( 'span', { 'data-testid': 'Icon' } ),
	withNotices: jest.fn( ( WrappedComponent ) => WrappedComponent ),
	createSlotFill: jest.fn( () => ( {
		Fill: makeComponent( 'Fill' ),
		Slot: makeComponent( 'Slot' ),
	} ) ),
	SlotFillProvider: makeComponent( 'SlotFillProvider' ),
	NavigatorProvider: makeComponent( 'NavigatorProvider' ),
	NavigatorScreen: makeComponent( 'NavigatorScreen' ),
	NavigatorButton: makeComponent( 'NavigatorButton' ),
};
module.exports = new Proxy( named, {
	get: ( target, key ) => {
		// An ES-module shape, so Babel's interop reads names through this proxy instead of copying its own keys.
		if ( '__esModule' === key ) {
			return true;
		}
		if ( key in target || 'symbol' === typeof key || 'then' === key ) {
			return target[ key ];
		}
		// Only a name the plugin's source already imports (known-exports.json: each loads in the live editor) is
		// fabricated, so a misspelt or new import fails the test until it is checked and added to that list.
		if ( ! KNOWN.includes( key ) ) {
			return undefined;
		}
		return /^(__experimental|__unstable)?[A-Z]/.test( key ) ? ( target[ key ] = makeComponent( key ) ) : ( target[ key ] = () => undefined );
	},
} );

