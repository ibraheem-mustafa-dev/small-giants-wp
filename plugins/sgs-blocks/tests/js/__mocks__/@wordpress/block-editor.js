'use strict';
// Mock for @wordpress/block-editor
// Exports functions/components that are webpack externals in the SGS Blocks build.

const React = require( 'react' );

/**
 * Simple pass-through container that renders only children.
 * Does NOT spread props onto the DOM element to avoid React unknown-prop warnings.
 */
const makeComponent = ( name ) => {
	const Comp = ( { children } ) =>
		React.createElement( 'div', { 'data-testid': name }, children );
	Comp.displayName = name;
	return Comp;
};

const useBlockProps = jest.fn( ( extra ) => ( {
	className: 'wp-block ' + ( ( extra && extra.className ) || '' ),
} ) );
useBlockProps.save = jest.fn( ( extra ) => ( {
	className: 'wp-block ' + ( ( extra && extra.className ) || '' ),
} ) );

const useInnerBlocksProps = jest.fn( () => ( { children: null } ) );
useInnerBlocksProps.save = jest.fn( ( props ) => props );

module.exports = {
	__esModule: true,
	useBlockProps,
	useInnerBlocksProps,
	useSelect: jest.fn( ( fn ) => fn ? fn( jest.fn( () => undefined ) ) : undefined ),
	useDispatch: jest.fn( () => ( {
		updateBlockAttributes: jest.fn(),
		insertBlocks: jest.fn(),
		removeBlock: jest.fn(),
		selectBlock: jest.fn(),
	} ) ),
	InspectorControls: makeComponent( 'InspectorControls' ),
	BlockControls: makeComponent( 'BlockControls' ),
	RichText: makeComponent( 'RichText' ),
	MediaUpload: ( { render } ) =>
		React.createElement( 'div', { 'data-testid': 'MediaUpload' },
			render ? render( { open: jest.fn() } ) : null ),
	MediaUploadCheck: makeComponent( 'MediaUploadCheck' ),
	URLInput: makeComponent( 'URLInput' ),
	URLInputButton: makeComponent( 'URLInputButton' ),
	ColorPalette: makeComponent( 'ColorPalette' ),
	ColorPaletteControl: makeComponent( 'ColorPaletteControl' ),
	InnerBlocks: makeComponent( 'InnerBlocks' ),
	BlockIcon: makeComponent( 'BlockIcon' ),
	PanelColorSettings: makeComponent( 'PanelColorSettings' ),
	ContrastChecker: makeComponent( 'ContrastChecker' ),
	withColors: jest.fn( () => ( WrappedComponent ) => WrappedComponent ),
	getColorObjectByColorValue: jest.fn( () => null ),
	getColorObjectByAttributeValues: jest.fn( () => null ),
	useSetting: jest.fn( () => [] ),
	store: { name: 'core/block-editor' },
};
