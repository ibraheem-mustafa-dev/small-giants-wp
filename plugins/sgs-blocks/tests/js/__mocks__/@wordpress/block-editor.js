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

// Any component the list above does not name renders its children (a PascalCase export), and any other
// helper is a no-op, so a block using a newer core component still mounts.
const named = {
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
	// useSettings( ...paths ) returns one resolved value per path. SGS shared
	// controls call useSettings( 'color.palette' ) / ( 'spacing.spacingSizes' )
	// and destructure the first element, so return an array whose first entry is
	// an empty list (safe for .map()).
	useSettings: jest.fn( () => [ [] ] ),
	store: { name: 'core/block-editor' },
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
		return /^(__experimental|__unstable)?[A-Z]/.test( key ) ? ( target[ key ] = makeComponent( key ) ) : ( target[ key ] = () => undefined );
	},
} );

