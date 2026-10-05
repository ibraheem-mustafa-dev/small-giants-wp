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

// A known component the list above does not name renders its children (a PascalCase export) and any other known
// helper is a no-op, so a block using a newer core component still mounts.
const KNOWN = require( './known-exports.json' )[ '@wordpress/block-editor' ];
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
// Compound members the plugin's source renders as `<Parent.Member>`; core ships each as a static property.
named.InnerBlocks.Content = makeComponent( 'InnerBlocks.Content' );
named.RichText.Content = makeComponent( 'RichText.Content' );
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

