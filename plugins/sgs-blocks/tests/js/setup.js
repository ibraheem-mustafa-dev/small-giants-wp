/**
 * Jest test environment setup for SGS Blocks.
 *
 * Mocks all @wordpress/* packages that are treated as externals by webpack
 * (they're not installed as node_modules; they're expected to be provided by
 * the WordPress runtime on the page).  Without mocks the import()s in edit.js
 * files would throw MODULE_NOT_FOUND errors during tests.
 *
 * The @wordpress/jest-preset-default preset (jest-preset.js) already sets up
 * jsdom and style mocks.  This file adds the WordPress API mocks on top.
 */

// ─── React ────────────────────────────────────────────────────────────────────

// React is installed (via @wordpress/scripts / build pipeline) — import it so
// the global is available when we render components in tests.
const React = require( 'react' );
globalThis.React = React;

// ─── @wordpress/element ───────────────────────────────────────────────────────
// wp.element wraps React.  Return real React primitives so JSX works properly.
jest.mock( '@wordpress/element', () => {
	const React = require( 'react' );
	return {
		createElement: React.createElement,
		Component: React.Component,
		Fragment: React.Fragment,
		useState: React.useState,
		useEffect: React.useEffect,
		useRef: React.useRef,
		useMemo: React.useMemo,
		useCallback: React.useCallback,
		createContext: React.createContext,
		useContext: React.useContext,
		memo: React.memo,
		forwardRef: React.forwardRef,
		cloneElement: React.cloneElement,
		Children: React.Children,
		render: () => {},  // Legacy WP-specific render helper — not needed in tests.
	};
} );

// ─── @wordpress/i18n ─────────────────────────────────────────────────────────
// Translation functions: just return the first argument (the string itself).
jest.mock( '@wordpress/i18n', () => ( {
	__: ( str ) => str,
	_n: ( single, plural, n ) => ( n === 1 ? single : plural ),
	_x: ( str ) => str,
	_nx: ( single, plural, n ) => ( n === 1 ? single : plural ),
	sprintf: ( format, ...args ) => {
		// Very minimal sprintf: replaces %s, %d sequentially.
		let i = 0;
		return format.replace( /%[sd]/g, () => args[ i++ ] ?? '' );
	},
	isRTL: () => false,
} ) );

// ─── @wordpress/blocks ───────────────────────────────────────────────────────
jest.mock( '@wordpress/blocks', () => ( {
	registerBlockType: jest.fn(),
	unregisterBlockType: jest.fn(),
	getBlockType: jest.fn( () => null ),
	getBlockTypes: jest.fn( () => [] ),
	getBlockSupport: jest.fn( () => false ),
	hasBlockSupport: jest.fn( () => false ),
	getBlockAttributes: jest.fn( () => ( {} ) ),
	createBlock: jest.fn( ( name, attrs ) => ( { name, attributes: attrs, innerBlocks: [] } ) ),
	cloneBlock: jest.fn( ( block ) => ( { ...block } ) ),
	isReusableBlock: jest.fn( () => false ),
	isTemplatePart: jest.fn( () => false ),
	serialize: jest.fn( () => '' ),
	parse: jest.fn( () => [] ),
	rawHandler: jest.fn( () => [] ),
	getDefaultBlockName: jest.fn( () => 'core/paragraph' ),
	setDefaultBlockName: jest.fn(),
	getFreeformContentHandlerName: jest.fn( () => 'core/freeform' ),
	pasteHandler: jest.fn( () => [] ),
} ) );

// ─── @wordpress/block-editor ─────────────────────────────────────────────────
jest.mock( '@wordpress/block-editor', () => {
	const React = require( 'react' );

	/**
	 * Minimal pass-through component factory.
	 * Renders children wrapped in a <div data-testid={name}>.
	 */
	const makeComponent = ( name ) => ( { children, ...props } ) =>
		React.createElement( 'div', { 'data-testid': name, ...props }, children );

	/**
	 * useBlockProps hook: returns a plain props object suitable for spreading
	 * onto the block's edit root element.
	 */
	const useBlockProps = jest.fn( ( extra = {} ) => ( {
		className: 'wp-block-test ' + ( extra.className ?? '' ),
		...extra,
	} ) );
	useBlockProps.save = jest.fn( ( extra = {} ) => ( {
		className: 'wp-block-test ' + ( extra.className ?? '' ),
		...extra,
	} ) );

	/**
	 * useInnerBlocksProps: returns basic props for the inner-blocks container.
	 */
	const useInnerBlocksProps = jest.fn( ( outerProps = {}, innerProps = {} ) => ( {
		...outerProps,
		...innerProps,
		children: null,
	} ) );
	useInnerBlocksProps.save = jest.fn( ( props ) => props );

	return {
		// Hooks.
		useBlockProps,
		useInnerBlocksProps,
		useSelect: jest.fn( ( fn ) => fn( jest.fn( () => undefined ) ) ),
		useDispatch: jest.fn( () => ( {
			updateBlockAttributes: jest.fn(),
			insertBlocks: jest.fn(),
			removeBlock: jest.fn(),
			selectBlock: jest.fn(),
		} ) ),

		// Common editor UI components.
		InspectorControls: makeComponent( 'InspectorControls' ),
		BlockControls: makeComponent( 'BlockControls' ),
		RichText: makeComponent( 'RichText' ),
		MediaUpload: ( { render } ) => render( { open: jest.fn() } ),
		MediaUploadCheck: makeComponent( 'MediaUploadCheck' ),
		URLInput: makeComponent( 'URLInput' ),
		URLInputButton: makeComponent( 'URLInputButton' ),
		ColorPalette: makeComponent( 'ColorPalette' ),
		ColorPaletteControl: makeComponent( 'ColorPaletteControl' ),
		InnerBlocks: makeComponent( 'InnerBlocks' ),
		BlockIcon: makeComponent( 'BlockIcon' ),
		PanelColorSettings: makeComponent( 'PanelColorSettings' ),
		ContrastChecker: makeComponent( 'ContrastChecker' ),
		withColors: jest.fn( ( ...args ) => ( WrappedComponent ) => WrappedComponent ),
		getColorObjectByColorValue: jest.fn( () => null ),
		getColorObjectByAttributeValues: jest.fn( () => null ),
		useSetting: jest.fn( () => null ),
		store: { name: 'core/block-editor' },
	};
} );

// ─── @wordpress/components ───────────────────────────────────────────────────
jest.mock( '@wordpress/components', () => {
	const React = require( 'react' );

	const makeComponent = ( name ) => ( { children, ...props } ) =>
		React.createElement( 'div', { 'data-testid': name, ...props }, children );

	const makeInput = ( name ) => ( { value, onChange, ...rest } ) =>
		React.createElement( 'input', {
			'data-testid': name,
			value: value ?? '',
			onChange: ( e ) => onChange && onChange( e.target.value ),
			...rest,
		} );

	return {
		PanelBody: makeComponent( 'PanelBody' ),
		PanelRow: makeComponent( 'PanelRow' ),
		SelectControl: makeComponent( 'SelectControl' ),
		TextControl: makeInput( 'TextControl' ),
		TextareaControl: makeInput( 'TextareaControl' ),
		ToggleControl: ( { checked, onChange, label } ) =>
			React.createElement( 'input', {
				type: 'checkbox',
				'data-testid': 'ToggleControl',
				checked: !! checked,
				onChange: ( e ) => onChange && onChange( e.target.checked ),
				'aria-label': label,
			} ),
		RangeControl: makeInput( 'RangeControl' ),
		Button: ( { children, onClick, ...rest } ) =>
			React.createElement( 'button', { onClick, ...rest }, children ),
		Placeholder: makeComponent( 'Placeholder' ),
		Spinner: () => React.createElement( 'span', { 'data-testid': 'Spinner' }, '…' ),
		Notice: makeComponent( 'Notice' ),
		Modal: makeComponent( 'Modal' ),
		ColorPicker: makeComponent( 'ColorPicker' ),
		BaseControl: makeComponent( 'BaseControl' ),
		CheckboxControl: makeComponent( 'CheckboxControl' ),
		RadioControl: makeComponent( 'RadioControl' ),
		FormTokenField: makeComponent( 'FormTokenField' ),
		ComboboxControl: makeComponent( 'ComboboxControl' ),
		// Experimental components used in several blocks.
		__experimentalToggleGroupControl: makeComponent( '__experimentalToggleGroupControl' ),
		__experimentalToggleGroupControlOption: makeComponent( '__experimentalToggleGroupControlOption' ),
		__experimentalNumberControl: makeInput( '__experimentalNumberControl' ),
		__experimentalBoxControl: makeComponent( '__experimentalBoxControl' ),
		__experimentalBorderControl: makeComponent( '__experimentalBorderControl' ),
		__experimentalUnitControl: makeInput( '__experimentalUnitControl' ),
		// Toolbar.
		ToolbarButton: makeComponent( 'ToolbarButton' ),
		ToolbarGroup: makeComponent( 'ToolbarGroup' ),
		Toolbar: makeComponent( 'Toolbar' ),
		DropdownMenu: makeComponent( 'DropdownMenu' ),
		MenuGroup: makeComponent( 'MenuGroup' ),
		MenuItem: makeComponent( 'MenuItem' ),
		// Misc.
		withNotices: jest.fn( ( WrappedComponent ) => WrappedComponent ),
		withState: jest.fn( ( initial ) => ( WrappedComponent ) => WrappedComponent ),
		createSlotFill: jest.fn( () => ( {
			Fill: makeComponent( 'Fill' ),
			Slot: makeComponent( 'Slot' ),
		} ) ),
		SlotFillProvider: makeComponent( 'SlotFillProvider' ),
		Popover: makeComponent( 'Popover' ),
		Tooltip: makeComponent( 'Tooltip' ),
		NavigatorProvider: makeComponent( 'NavigatorProvider' ),
		NavigatorScreen: makeComponent( 'NavigatorScreen' ),
		NavigatorButton: makeComponent( 'NavigatorButton' ),
	};
} );

// ─── @wordpress/data ─────────────────────────────────────────────────────────
jest.mock( '@wordpress/data', () => ( {
	useSelect: jest.fn( ( fn ) => fn( jest.fn( () => undefined ) ) ),
	useDispatch: jest.fn( () => ( {} ) ),
	select: jest.fn( () => ( {} ) ),
	dispatch: jest.fn( () => ( {} ) ),
	withSelect: jest.fn( () => ( WrappedComponent ) => WrappedComponent ),
	withDispatch: jest.fn( () => ( WrappedComponent ) => WrappedComponent ),
	createRegistrySelector: jest.fn( ( fn ) => fn ),
	subscribe: jest.fn(),
	registerStore: jest.fn(),
	combineReducers: jest.fn( ( reducers ) => ( state = {}, action ) => state ),
} ) );

// ─── @wordpress/icons ────────────────────────────────────────────────────────
jest.mock( '@wordpress/icons', () => {
	const React = require( 'react' );
	const Icon = ( { icon } ) => React.createElement( 'span', { 'data-testid': 'wp-icon' } );
	return {
		__esModule: true,
		default: Icon,
		Icon,
		// Export a few commonly-used icon names as no-ops.
		layout: null,
		image: null,
		video: null,
		paragraph: null,
	};
} );

// ─── @wordpress/primitives ───────────────────────────────────────────────────
jest.mock( '@wordpress/primitives', () => {
	const React = require( 'react' );
	return {
		SVG: ( { children, ...props } ) => React.createElement( 'svg', props, children ),
		Path: ( props ) => React.createElement( 'path', props ),
		Circle: ( props ) => React.createElement( 'circle', props ),
		Rect: ( props ) => React.createElement( 'rect', props ),
	};
} );

// ─── Global wp object (not all tests need it, but some legacy code checks it) ─
globalThis.wp = {
	blocks: require( '@wordpress/blocks' ),
	element: require( '@wordpress/element' ),
	blockEditor: require( '@wordpress/block-editor' ),
	components: require( '@wordpress/components' ),
	i18n: require( '@wordpress/i18n' ),
	data: require( '@wordpress/data' ),
};
